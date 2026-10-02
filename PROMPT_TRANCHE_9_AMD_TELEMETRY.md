# PROMPT PER CHATGPT: DESIGN HARDENING & PIANO DI IMPLEMENTAZIONE TRANCHE 9
## Deep AMD Radeon GPU Telemetry via Dynamic ADL/ADLX FFI & Telemetric Parity
> **Progetto:** PC Hardware & Upgrade Tracker + PC Care Center (Tauri v2 + Rust + React 18 + TypeScript strict + Vanilla CSS + IndexedDB)  
> **Stato:** AUDIT & DESIGN SPECIFICATION — TRANCHE 9  
> **Baseline:** v3.1.0+ | 994/994 test passati | TypeScript strict 0 errori | Build Vite OK | Privacy Audit OK | Git Clean  

---

## ISTRUZIONI PER CHATGPT
Agisci come **Principal Rust & Windows Systems Engineer**. Ti viene richiesto di formulare il **piano di implementazione definitivo e l'architettura tecnica per la Tranche 9**, che estende la telemetria live del **PC Care Center** alle GPU **AMD Radeon** per raggiungere la parità funzionale completa con l'attuale implementazione NVIDIA NVML.

---

## 1. CONTESTO ATTUALE: COME FUNZIONA NVIDIA NVML NEL PROGETTO
In `src-tauri/src/monitoring.rs`, l'applicazione estrae telemetria dalle GPU NVIDIA tramite caricamento dinamico a runtime:
- **Caricamento Safe con `LoadLibraryA` & `GetProcAddress`**:
  - Nessun link a tempo di compilazione; ricerca in `["nvml.dll\0", "C:\\Windows\\System32\\nvml.dll\0"]`.
  - Se la DLL manca (PC con AMD/Intel), l'interrogazione fallisce silenziosamente in `< 1 ms` e restituisce `nvml_dll_not_found` senza crash.
- **Metriche estratte in memoria**:
  - Carico GPU (`nvmlDeviceGetUtilizationRates`)
  - VRAM totale, usata e percentuale (`nvmlDeviceGetMemoryInfo`)
  - Temperatura Core GPU (`nvmlDeviceGetTemperature`)
  - Clock Core e Clock Memoria (`nvmlDeviceGetClockInfo`)
  - Assorbimento Elettrico in Watt (`nvmlDeviceGetPowerUsage`)
  - Velocità Ventole in % (`nvmlDeviceGetFanSpeed`)
- **Fusione nel Canale Hardware**:
  - I dati di telemetria profonda vengono fusi con l'anagrafica video estratta dal Registro di Windows (`HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}`).

---

## 2. OBIETTIVO DI TRANCHE 9: AMD RADEON TELEMETRIC PARITY

Offrire agli utenti con schede video AMD Radeon (RDNA 1, RDNA 2, RDNA 3, RDNA 4 e architetture legacy Polaris/Vega) la stessa ricchezza informativa e diagnostica, senza installare demoni esterni, driver ring-0 o residenti in background.

### 2.1 Sfide Tecniche Specifiche per AMD su Windows:
1. **Libreria C Nativa ADL (AMD Display Library)**:
   - File target: `atiadlxx.dll` (per processi a 64-bit) e `atiadlxy.dll` (per 32-bit).
   - Inizializzazione: `ADL_Main_Control_Create(ADL_MAIN_MALLOC_CALLBACK, 1)` con custom memory allocator callback (`std::alloc::alloc` o wrapper C `malloc`).
   - Ciclo di vita: enumerazione adattatori (`ADL_Adapter_NumberOfAdapters_Get`, `ADL_Adapter_AdapterInfo_Get`), selezione dell'adattatore primario/attivo, deallocazione con `ADL_Main_Control_Destroy`.
2. **API Sensori per Generazioni Multiple (Overdrive 5 / 6 / N / PMLog)**:
   - *Legacy Overdrive (GCN / Polaris)*: `ADL_Overdrive5_Temperature_Get`, `ADL_Overdrive5_CurrentActivity_Get`, `ADL_Overdrive5_FanSpeed_Get`.
   - *Modern Overdrive (RDNA / RDNA2 / RDNA3)*: `ADL2_New_QueryPMLogData_Get` o `ADL2_OverdriveN_SystemClocksX2_Get` / `ADL2_OverdriveN_Temperature_Get`.
   - Distinzione tra Temperatura Core (Edge) e Temperatura Hotspot / Junction (tipica e fondamentale sulle architetture AMD RDNA, dove il throttling termico interviene a 110°C sulla giunzione).
3. **Robustezza & Crash Prevention**:
   - Zero panic o access violation se l'utente possiede una scheda AMD con driver generici Microsoft Basic Display Adapter o senza Adrenalin Software installato.
   - Timeout safe sull'interrogazione (< 5 ms per frame di monitoring).

---

## 3. COSA DEVE PRODURRE CHATGPT NELLA RISPOSTA

Struttura la tua risposta in 6 sezioni tecniche esaustive:

### SEZIONE 1 — ARCHITETTURA FFI RUST IN `src-tauri/src/monitoring.rs`
1. Firma esatta delle struct C necessarie per ADL (`AdapterInfo`, `ADLTemperature`, `ADLFanSpeedValue`, `ADLPMActivity`, eventuale `ADLPMLogDataOutput`).
2. Implementazione della callback `ADL_MAIN_MALLOC_CALLBACK` compatibile con l'allocatore globale di Rust.
3. Funzione pura `query_adl_gpus() -> Result<Vec<AdlTelemetry>, String>`:
   - Percorsi di probing DLL (`atiadlxx.dll`, `System32\atiadlxx.dll`).
   - Caricamento dinamico tramite Win32 `LoadLibraryA` / `GetProcAddress`.
   - Loop di estrazione su adapter attivi (scartando display virtuali o duplicati).
   - Chiusura garantita e pulita con `ADL_Main_Control_Destroy`.

### SEZIONE 2 — SENSOR RETRIEVAL & UNIFICAZIONE METRICHE
1. Mappatura deterministica delle metriche AMD sul modello `GpuTelemetry` condiviso:
   - `utilization`: % attività core motore grafico.
   - `vram`: memoria dedicata totale, usata e %.
   - `temperature_c`: temperatura core edge (°C).
   - `hotspot_temp_c`: temperatura junction hotspot (°C) se disponibile.
   - `core_clock_mhz` & `memory_clock_mhz`.
   - `power_watts`: assorbimento GPU (TGP / ASIC power).
   - `fan_speed_pct` e/o RPM.
2. Strategia di fallback se `ADL2_New_QueryPMLogData_Get` fallisce su schede più vecchie o driver minimali (fallback pulito su Overdrive 5/6 o telemetria di base).

### SEZIONE 3 — INTEGRAZIONE CON HEALTH ENGINE (`src/domain/healthEngine.ts`)
1. Adattamento delle regole termiche per GPU AMD:
   - Core Temp: Warning a >85°C, Critical a >92°C.
   - Hotspot/Junction Temp (specifico RDNA): Warning a >100°C, Critical a >110°C (pre-throttling termico).
2. Distinzione vendor AMD nel testo del finding (senza presunzione causale, coerente con le regole anti-slop di `GEMINI.md`).

### SEZIONE 4 — OTTIMIZZAZIONI & RECUPERO DRIVER (`src/domain/optimizationEngine.ts`)
1. Gestione correlazioni con eventi Display 4101 (TDR) o timeout del driver AMD (`amdkmdag`).
2. Raccomandazione `opt-clean-shader-cache` per directory cache shader AMD (`%LOCALAPPDATA%\AMD\DxCache` / `D3DSCache`).

### SEZIONE 5 — TEST MATRIX & PIANO DI VALIDAZIONE
1. File di test da aggiornare o creare:
   - Unit test Rust (simulazione presenza/assenza DLL).
   - Test TypeScript (`monitoringService.test.ts`, `healthEngine.test.ts`, `careDiagnosticsUI.test.ts`).
2. Garanzia di continuità: zero regressioni sui 994 test esistenti e rispetto rigoroso del tempo di compilazione.

### SEZIONE 6 — PIANO IN SOTTO-TRANCHE (ROADMAP OPERATIVA)
Definire la suddivisione esecutiva consigliata (es. 9A FFI ADL Rust -> 9B Sensor Normalization -> 9C Health & Hotspot Engine -> 9D UI & Verification).
