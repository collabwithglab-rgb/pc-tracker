# PC CARE CENTER — ARCHITETTURA TECNICA
## Monitoraggio, Analisi di Salute, Motore di Ottimizzazione e Raccomandazioni Hardware

> **DOCUMENTO DI AUDIT PRE-IMPLEMENTATIVO E SPECIFICA ARCHITETTURALE**  
> **Stato Baseline:** v0.3.0 | 584/584 test unitari | TypeScript strict: 0 errori | Vite build: OK | Privacy audit: OK  
> **Ruolo del Documento:** Guida e fonte primaria di verità per l'evoluzione di PC Tracker verso un vero **PC Control Center** unificato.  
> **Vincolo di Fase:** Nessuna modifica al codice applicativo o al database; sola definizione progettuale e audit.

---

## 1. CURRENT STATE

### 1.1 Baseline Verificata e Architettura Esistente
PC Tracker si trova attualmente a uno stato architetturale solido e maturo, convalidato da 584 test automatizzati distribuiti su 58 file di test:
- **Core Storage:** IndexedDB (`pc-tracker-db`, `schemaVersion: 1`) è l'**unica fonte di verità** locale per componenti, eventi, upgrade, checkpoint, ricevute, log di manutenzione e profili di tuning. Nessuna duplicazione di stato critico su `localStorage`.
- **Desktop Shell:** Applicazione desktop Windows basata su [Tauri v2](https://tauri.app/) e Rust (`pc-tracker-lib`), con plugin ufficiali per dialoghi di sistema, filesystem sandboxed, auto-aggiornamenti firmati con Minisign e gestione processi.
- **Tipizzazione e Logica Pura:** TypeScript in modalità strict al 100%. L'intera logica di dominio (finanze, ciclo di vita, time travel, power budget, verifica checkpoint, calcolo scadenze manutenzione, tuning journal) è isolata in motori puri (`src/domain/`) completamente disaccoppiati dalla UI.
- **Interfaccia Utente:** Vanilla CSS nativo con variabili tematiche Dark Enthusiast, micro-interazioni curate, Command Palette accessibile via tastiera (`Ctrl+K`), visualizzatore Time Travel e sezioni dedicate.

### 1.2 Funzionalità Native Windows Già Implementate
Il layer Rust in `src-tauri/src/` possiede già due moduli avanzati che forniscono solide fondamenta:
1. **`hardware.rs` (`detect_hardware`):**
   - Interroga nativamente il Registro di Windows (`HKLM\HARDWARE\DESCRIPTION\System`) e le API Win32 (`GlobalMemoryStatusEx`) per rilevare istantaneamente CPU (brand, modello, frequenza base, socket logici), Scheda Madre (brand, modello, versione/data BIOS), RAM totale installata, GPU dedicata vs integrata con quantitativo VRAM dedicato, e unità disco fisiche discriminando bus NVMe vs SATA.
   - **Zero overhead:** esecuzione < 2 ms, zero processi esterni avviati, zero privilegi amministrativi richiesti.
2. **`windows_tools.rs` (`windows_tools::*`):**
   - Rilevamento token di elevazione UAC (`is_current_process_elevated` via `OpenProcessToken`).
   - Scansione volumi e dischi fisici (`Get-Volume`, `Get-PhysicalDisk`).
   - Supporto e stato comando TRIM su SSD.
   - Controllo e svuotamento Cestino Windows (`SHEmptyRecycleBinW`).
   - Query e switch stato Ibernazione (`powercfg /hibernate`).
   - Verifica non-distruttiva file di sistema (`sfc.exe /verifyonly`).
   - Scansione sola lettura integrità NTFS (`chkdsk.exe <Drive>: /scan`).
   - Creazione punti di ripristino di sistema (`Checkpoint-Computer`).
   - Audit di sicurezza hardware/kernel (Secure Boot, TPM 2.0, VBS, HVCI, file hosts).
   - Lettura S.M.A.R.T. e contatori di affidabilità dischi (`Get-StorageReliabilityCounter` con temperatura Celsius, % usura, errori I/O, ore di accensione).
   - Sblocco schema Prestazioni Eccellenti (*Ultimate Performance*).
   - Pulizia sicura cache DirectX e Shader GPU (NVIDIA, AMD, Microsoft).
   - Pulizia WinSxS Component Store (`DISM.exe /Online /Cleanup-Image /StartComponentCleanup`).
   - Riavvio diretto nel firmware BIOS/UEFI (`shutdown.exe /r /fw /t 0`).
   - Verifica aggiornamenti software disponibili via WinGet CLI.

### 1.3 Cosa Manca Oggi
Sebbene gli strumenti di diagnostica e le azioni Windows siano già ampiamente presenti, l'applicazione attualmente li tratta come **operazioni puntuali on-demand** azionate manualmente dall'utente. Manca:
1. Un layer di **monitoraggio continuo e leggero** (CPU, GPU, RAM, Storage in tempo reale).
2. Un **Health Engine deterministico** capace di correlare fatti e individuare anomalie sistematiche.
3. Un **Optimization Engine trasparente** che valuti lo stato dell'hardware, del sistema operativo e delle preferenze utente per generare raccomandazioni motivate.
4. La connessione tra le osservazioni live e la **Personal Baseline** (i profili di tuning e la storia del rig reale).

---

## 2. PRODUCT VISION

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PC CONTROL CENTER                               │
│                                                                        │
│   HARDWARE IDENTITY ─── LIFECYCLE ─── FINANCE ─── TIME TRAVEL          │
│            ▲                    ▲                  ▲                   │
│            │                    │                  │                   │
│   MONITORING ─────────► HEALTH ANALYSIS ───► OPTIMIZATIONS             │
│   (Live Telemetry)      (Deterministic)     (Safe Recommendations)     │
│            │                    │                  │                   │
│            ▼                    ▼                  ▼                   │
│   PERSONAL BASELINE ─── TUNING JOURNAL ───► WINDOWS ACTIONS            │
│   (Known Good State)   (Daily Profiles)    (Explicit Verification)     │
└────────────────────────────────────────────────────────────────────────┘
```

PC Tracker non è un banale clone di HWiNFO64 (iper-specializzato in centinaia di sensori istantanei senza memoria storica) né un clone di CCleaner (focalizzato su pulizie aggressive o ottimizzazioni opache e rischiose).

La visione è un **PC Control Center integrato**, pensato per l'appassionato hardware, che risponde alle domande più importanti:
- *Come si comporta il mio PC oggi rispetto a quando l'ho assemblato o quando ho validato il mio profilo di undervolt?*
- *Le temperature attuali della GPU sotto carico sono coerenti con la pasta termica applicata 8 mesi fa o indicano degrado termico?*
- *Il mio SSD di sistema è prossimo al degrado delle prestazioni (spazio > 85%, TRIM non eseguito, celle usurate)?*
- *Quali servizi di avvio o impostazioni Windows stanno degradando l'esperienza senza che io me ne sia accorto?*
- *Qual è l'azione corretta e sicura da eseguire, con quale rischio e come posso ripristinare lo stato precedente?*

---

## 3. MONITORING SOURCES — AUDIT DETTAGLIATO DELLE API WINDOWS

Nel contesto Windows 10/11 x64, la lettura dei sensori e delle metriche di sistema presenta livelli di complessità e privilegi asimmetrici. La tabella e l'analisi sottostante stabiliscono le sorgenti ufficiali per ciascun sottosistema.

### 3.1 Tabella Sinottica delle Fonti di Monitoraggio

| Metrica | Sorgente Primaria Windows | Affidabilità | Frequenza Ragionevole | Costo CPU | Privilegi Richiesti | Compatibilità | Note & Limitazioni Hardware |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPU: Utilizzo Totale** | Win32 `GetSystemTimes` (kernel32) | Massima (100%) | 1.5s - 2.0s | < 0.01% | Nessuno (User) | Win 10/11 x64 | Formula differenziale `(Idle2 - Idle1) / (Total2 - Total1)`. Istantaneo. |
| **CPU: Frequenza Live** | PDH Counter `\Processor Information(_Total)\Processor Frequency` | Alta | 2.0s - 3.0s | ~ 0.05% | Nessuno (User) | Win 10/11 x64 | Rappresenta la frequenza effettiva media istantanea (MHz). |
| **CPU: Temperatura Package** | WMI ACPI (`MSAcpi_ThermalZoneTemperature`) o libreria sensori | Bassa / Condizionata | 3.0s - 5.0s | ~ 0.2% | Nessuno / Ring-0 | Variabile | **Criticità:** su schede madri desktop enthusiast ACPI espone spesso valori fittizi. MSR (`IA32_THERM_STATUS`, AMD `Tctl`) richiedono driver kernel. |
| **CPU: Package Power (W)** | PDH `\Energy Meter` o RAPL MSR | Media / Bassa | 3.0s - 5.0s | ~ 0.1% | Admin (su Win 11) | Win 11 (PDH) | Senza driver ring-0, la stima energetica software è parziale o richiede Windows 11 Energy Estimation. |
| **CPU: Core/Thread Topo** | Win32 `GetLogicalProcessorInformationEx` | Massima (100%) | Snapshot (Avvio) | 0.00% | Nessuno (User) | Win 10/11 x64 | P-Core vs E-Core (Intel 12th+), nodi NUMA, cache L2/L3. |
| **GPU: Utilizzo 3D/Compute** | Win32 D3DKMT (`D3DKMTQueryStatistics`) | Massima (100%) | 1.5s - 2.0s | < 0.05% | Nessuno (User) | Win 10/11 x64 | API nativa del kernel DirectX Graphics. Universale per NVIDIA, AMD e Intel. |
| **GPU: VRAM Usata/Totale** | Win32 D3DKMT / DXGI Adapter Memory | Massima (100%) | 1.5s - 2.0s | < 0.02% | Nessuno (User) | Win 10/11 x64 | Distingue memoria locale dedicata da memoria condivisa di sistema. |
| **GPU: Temp, Clock, Power, Fan (NVIDIA)** | `NVML` (`nvml.dll` dynamically linked) | Massima (100%) | 1.5s - 2.0s | < 0.02% | Nessuno (User) | Win 10/11 x64 | DLL ufficiale NVIDIA presente in ogni installazione driver GeForce. Zero processi esterni. |
| **GPU: Temp, Clock, Power, Fan (AMD)** | `AMD ADL` (`atiadlxx.dll` dynamically linked) | Alta | 1.5s - 2.0s | < 0.03% | Nessuno (User) | Win 10/11 x64 | Libreria ufficiale driver AMD Radeon Software. |
| **RAM: Totale, Usata, Libera** | Win32 `GlobalMemoryStatusEx` | Massima (100%) | 1.5s - 2.0s | < 0.001% | Nessuno (User) | Win 10/11 x64 | Già testata e presente in `hardware.rs`. Esecuzione nanosecondaria. |
| **Storage: Capacità, Libero** | Win32 `GetDiskFreeSpaceExW` | Massima (100%) | 10s - 30s | < 0.001% | Nessuno (User) | Win 10/11 x64 | Lettura per lettera di unità. Istantaneo e privo di overhead. |
| **Storage: S.M.A.R.T. & Temp** | Storage Reliability Counter (`DeviceIoControl`) | Alta | Snapshot / 60s | ~ 0.1% | Nessuno (User) | Win 10/11 x64 | Temperatura SSD, % usura NVMe/SATA, ore accensione, errori I/O. |
| **Storage: Attività I/O Live** | PDH `\PhysicalDisk(_Total)\% Disk Time` | Alta | 2.0s | < 0.05% | Nessuno (User) | Win 10/11 x64 | Percentuale di tempo in cui il sottosistema disco gestisce richieste I/O. |
| **System: Uptime** | Win32 `GetTickCount64()` | Massima (100%) | 10s - 60s | 0.00% | Nessuno (User) | Win 10/11 x64 | Millisecondi trascorsi dall'avvio del sistema. |
| **System: Schema Energetico** | Win32 `PowerGetActiveScheme` (powrprof.dll) | Massima (100%) | On-demand / 10s | < 0.01% | Nessuno (User) | Win 10/11 x64 | Rileva GUID e nome (es. Bilanciato, Prestazioni elevate, Ultimate). |
| **System: App all'Avvio** | Registro Run keys + StartupApproved | Alta | On-demand / Avvio | ~ 0.05% | Nessuno (User) | Win 10/11 x64 | Rileva app abilitate/disabilitate in avvio automatico. |
| **System: Driver GPU** | Registro Display Class | Massima (100%) | Snapshot / Avvio | < 0.01% | Nessuno (User) | Win 10/11 x64 | Versione esatta e data rilascio driver grafico. |
| **System: Aggiornamenti WinGet** | CLI `winget upgrade` | Alta | On-demand | Alto (~3-5s) | Nessuno (User) | Win 10/11 x64 | Eseguito SOLO su richiesta esplicita o scansione programmata. |
| **Network: Throughput I/O** | Win32 `GetIfTable2` (iphlpapi.dll) | Alta | 2.0s (se attivo) | < 0.02% | Nessuno (User) | Win 10/11 x64 | Byte/s inviati/ricevuti. **Escluso dal polling live base** per evitare dati decorativi. |

### 3.2 Analisi Critica: Il Caso della Temperatura CPU
Su Windows, l'accesso ai registri MSR della CPU (`Model-Specific Registers`) come `IA32_THERM_STATUS` (Intel Digital Thermal Sensor) o i registri SMN (AMD `Tctl`/`Tdie`) non è consentito da user-space per ragioni di sicurezza dell'architettura NT. Strumenti come HWMonitor o CoreTemp installano ed eseguono un **driver kernel-mode non firmato o legacy (es. WinRing0, InpOut32)**.
- **Rischio Architetturale:** Integrare un driver ring-0 comporterebbe conflitti con le policy di isolamento del kernel Windows 11 (HVCI / Memory Integrity), rischi di crash BSOD, e possibili falsi positivi con i sistemi Anti-Cheat dei videogiochi (es. Riot Vanguard, Easy Anti-Cheat).
- **Decisione Progettuale PC Tracker:**  
  1. *Livello 1 (Sicuro / Zero Driver):* Utilizzare D3DKMT per GPU, NVML per temperature/frequenze/power GPU NVIDIA, ADL per AMD GPU, e Storage Management per temperature dischi SSD NVMe.  
  2. *Livello 2 (CPU):* Interrogare le interfacce WMI/ACPI o contatori ETW di Windows quando disponibili; se la temperatura CPU non è esposta in modo affidabile senza driver kernel, l'applicazione deve mostrare chiaramente lo stato `"Non disponibile nativamente senza driver privilegiato"` invece di inventare o stimare valori fasulli.

---

## 4. LIVE VS SNAPSHOT STRATEGY

Un'applicazione per appassionati di hardware non deve mai diventare un sovraccarico per il sistema che si prefigge di monitorare. La strategia di campionamento è rigorosamente suddivisa in 5 classi operative:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   POLITICA DEI 5 LIVELLI OPERATIVI                    │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Livello           │ Cadenza           │ Metriche Coinvolte             │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Tier A: Live      │ 2.0 secondi       │ CPU load, GPU load, VRAM,      │
│                   │ (solo con focus)  │ RAM usata/libera               │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Tier B: Slow      │ 15.0 - 30.0 sec   │ GPU temp/fan/W, Storage I/O %, │
│                   │                   │ Power Plan attivo, Uptime      │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Tier C: On-Demand │ Solo su azione    │ S.M.A.R.T. SSD, SFC/CHKDSK,    │
│                   │ o apertura tab    │ WinGet, App Avvio, Sec Audit   │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Tier D: Storico   │ Fine sessione /   │ Min/Max/Avg delle sessioni     │
│                   │ Checkpoint        │ di stress o profili di tuning  │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Tier E: Esclusi   │ MAI (Vietati)     │ Polling a 100ms, scritture     │
│                   │                   │ continue su disco, micro-flussi│
└───────────────────┴───────────────────┴────────────────────────────────┘
```

### 4.1 Meccanismo di Risparmio Energetico (Smart Pause)
- **Finestra con Focus:** Polling Tier A a 2000 ms, Tier B a 15000 ms.
- **Finestra Ridotta a Icona o Non a Fuoco:** Il polling Tier A viene **immediatamente sospeso** (0 invocazioni IPC, 0% CPU overhead).
- **Tab Inattiva:** Se l'utente sta consultando l'Archivio o la Wiki, il monitoraggio hardware non effettua chiamate native.

---

## 5. MONITORING DATA MODEL

### 5.1 Tassonomia Epistemologica dei Dati Hardware
Nel modello concettuale di PC Tracker è fondamentale evitare qualsiasi ambiguità semantica tra ciò che è dichiarato, ciò che è stimato e ciò che è misurato:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  DECLARED    │     │  ESTIMATED   │     │   OBSERVED   │     │   MEASURED   │
├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────────┤
│ Specifiche   │     │ Modelli di   │     │ Configuraz.  │     │ Telemetria   │
│ di targa     │     │ calcolo      │     │ rilevata nel │     │ dinamica     │
│ costruttore  │     │ euristiche   │     │ sistema OS   │     │ in tempo     │
│              │     │              │     │              │     │ reale        │
│ Es:          │     │ Es:          │     │ Es:          │     │ Es:          │
│ - TDP 250W   │     │ - Peak Load  │     │ - Power Plan │     │ - GPU: 68°C  │
│ - PSU 850W   │     │   Rig Power  │     │   Attivo     │     │ - CPU: 14%   │
│ - Base Clock │     │   Budget     │     │ - Driver ver │     │ - VRAM: 7.2GB│
│   3.4 GHz    │     │ - Headroom   │     │ - Tuning     │     │ - NVML Power:│
│ - VRAM 16GB  │     │   Watt       │     │   Daily      │     │   182 W      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 5.2 Nuovi Tipi TypeScript Concettuali (Senza Migrazione DB)

```typescript
// src/types/monitoring.ts (Bozza di Progetto)

export type TelemetryDataTier = 'DECLARED' | 'ESTIMATED' | 'OBSERVED' | 'MEASURED';

export interface TelemetryMetric<T> {
  value: T;
  tier: TelemetryDataTier;
  unit: string;
  source: string;              // es. "Win32_GetSystemTimes", "NVML", "D3DKMT", "Registry"
  confidence: 'HIGH' | 'MEDIUM' | 'ESTIMATED' | 'UNAVAILABLE';
  sampledAt: string;           // Timestamp ISO
}

export interface CpuLiveTelemetry {
  utilizationPercent: TelemetryMetric<number>;
  currentFrequencyMhz?: TelemetryMetric<number>;
  packageTemperatureCelsius?: TelemetryMetric<number>;
  packagePowerWatts?: TelemetryMetric<number>;
  coreCount: number;
  threadCount: number;
}

export interface GpuLiveTelemetry {
  deviceId: string;
  name: string;
  utilizationPercent: TelemetryMetric<number>;
  vramUsedBytes: TelemetryMetric<number>;
  vramTotalBytes: TelemetryMetric<number>;
  coreTemperatureCelsius?: TelemetryMetric<number>;
  hotspotTemperatureCelsius?: TelemetryMetric<number>;
  coreClockMhz?: TelemetryMetric<number>;
  memoryClockMhz?: TelemetryMetric<number>;
  powerWatts?: TelemetryMetric<number>;
  fanSpeedPercent?: TelemetryMetric<number>;
}

export interface RamLiveTelemetry {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  utilizationPercent: number;
}

export interface StorageLiveTelemetry {
  drives: {
    driveLetter: string;
    label: string;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    utilizationPercent: number;
    temperatureCelsius?: number;
    activityPercent?: number;
  }[];
}

export interface SystemObservedState {
  osVersion: string;
  osBuild: string;
  uptimeSeconds: number;
  activePowerPlan: {
    guid: string;
    name: string;
  };
  gpuDriverVersion?: string;
  gpuDriverDate?: string;
  pendingWinGetUpdatesCount?: number;
}

export interface MonitoringSnapshot {
  timestamp: string;
  cpu: CpuLiveTelemetry;
  gpu: GpuLiveTelemetry[];
  ram: RamLiveTelemetry;
  storage: StorageLiveTelemetry;
  system: SystemObservedState;
}
```

---

## 6. MONITORING STORE & POLITICA DI RETENTION

### 6.1 Separazione tra Memoria Volatile e IndexedDB
Uno dei principi cardine stabiliti in `GEMINI.md` è l'assoluto divieto di intasare IndexedDB con migliaia di campioni al secondo.
- **Live State (Volatile / React State):**
  L'ultimo `MonitoringSnapshot` e una finestra circolare degli ultimi **30 campioni** (1 minuto di dati live a intervalli di 2s) risiedono **esclusivamente nella memoria RAM volatile** di JavaScript. All'uscita dall'applicazione o al cambio pagina, questa memoria viene rilasciata.
- **Persistenza Selettiva su IndexedDB:**
  I dati di monitoraggio vengono memorizzati in IndexedDB **solamente quando rappresentano un evento esplicito ad alto valore**:
  1. *Benchmark / Sessione di Tuning:* Salvataggio esplicito di un `TuningProfile` con temperature di Idle e Load registrate dall'utente.
  2. *Checkpoint Storico:* Salvataggio della fotografia del Rig con le metriche di sistema rilevate alla creazione.
  3. *Audit Log / Registro Interventi:* Annotazione di un'operazione di pulizia o manutenzione.

---

## 7. HEALTH ENGINE — CERVELLO DETERMINISTICO DEL SISTEMA

L'Health Engine è una funzione pura TypeScript (`src/domain/healthEngine.ts`) priva di dipendenze dalla UI o da effetti collaterali.

### 7.1 Firme di Dominio e Modello di Finding

```typescript
export type HealthSeverity = 'INFO' | 'GOOD' | 'ATTENTION' | 'WARNING' | 'CRITICAL';

export type HealthAffectedArea = 'cpu' | 'gpu' | 'ram' | 'storage' | 'system' | 'security' | 'thermal';

export interface HealthFinding {
  id: string;                      // Identificativo univoco deterministico
  severity: HealthSeverity;
  area: HealthAffectedArea;
  title: string;
  evidence: string;                // Fatto oggettivo misurato
  explanation: string;            // Perché questo fatto è rilevante
  confidence: 'HIGH' | 'MEDIUM';
  recommendedActionId?: string;    // Collegamento all'Action Catalog
}

export interface SystemFacts {
  monitoring: MonitoringSnapshot;
  smartDisks: DiskSmartHealth[];
  securityAudit?: SecurityAuditData;
  systemFilesStatus?: string;
  drivesInfo: VolumeDriveInfo[];
  personalBaseline?: PersonalHardwareBaseline;
}

export function evaluateSystemHealth(facts: SystemFacts): HealthFinding[];
```

### 7.2 Regole Deterministiche Esemplificative
1. **Integrità Disco SSD (Critica):**
   - *Condizione:* `DiskSmartHealth.readErrorsTotal > 0 || DiskSmartHealth.writeErrorsTotal > 0 || DiskSmartHealth.wearPercentage >= 90`
   - *Severità:* `CRITICAL`
   - *Evidence:* "Rilevati 14 errori I/O e livello di usura celle SSD al 92% sull'unità C:."
   - *Spiegazione:* "La memoria NAND flash sta esaurendo i cicli di riscrittura o presenta blocchi danneggiati. Rischio concreto di corruzione dati."
2. **Saturazione Spazio di Sistema (Warning):**
   - *Condizione:* Volume C: con percentuale occupata > 88% e spazio residuo < 25 GB.
   - *Severità:* `WARNING`
   - *Evidence:* "Unità C: occupata al 91% (18.4 GB disponibili)."
   - *Spiegazione:* "Windows e i giochi moderni richiedono spazio per il file di paging, il dump del kernel e la cache temporanea. Prestazioni di scrittura degradate."
3. **Pressione Memoria RAM (Attention):**
   - *Condizione:* `ram.utilizationPercent > 85%` per più di 15 secondi consecutivi con swap attivo.
   - *Severità:* `ATTENTION`
   - *Evidence:* "Memoria RAM occupata all'88% (28.2 GB / 32.0 GB)."
   - *Spiegazione:* "La memoria libera è ridotta. Il sistema operativo potrebbe avviare il paging su disco provocando micro-stuttering."

---

## 8. OPTIMIZATION ENGINE — MOTORE DELLE RACCOMANDAZIONI

L'Optimization Engine (`src/domain/optimizationEngine.ts`) trasforma i `HealthFinding` e i fatti storici del PC in **raccomandazioni propositive, motivate e trasparenti**.

```typescript
export type OptimizationRisk = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

export type ActionAvailability =
  | 'AUTOMATED_SAFE'      // Azionabile in 1-click dall'app in user-space
  | 'ASSISTED_UAC'         // Richiede autorizzazione esplicita UAC
  | 'MANUAL_GUIDED'       // Istruzioni dettagliate passo-passo
  | 'EXTERNAL_LINK';      // Portale driver produttore o supporto

export type RollbackAvailability =
  | 'AUTOMATIC'           // L'app può ripristinare il valore originale
  | 'MANUAL_RESTORE'      // Possibile tramite punto di ripristino creato
  | 'NOT_APPLICABLE';     // Operazione di sola lettura o pulizia irreversibile ma innocua

export interface OptimizationRecommendation {
  id: string;
  title: string;
  category: 'storage' | 'maintenance' | 'system' | 'performance' | 'security' | 'thermal';
  reason: string;
  evidence: string;
  expectedBenefit: string;
  risk: OptimizationRisk;
  confidence: 'HIGH' | 'MEDIUM';
  actionAvailability: ActionAvailability;
  rollbackAvailability: RollbackAvailability;
  actionId?: string;
  toolParameters?: Record<string, unknown>;
}
```

### 8.1 Esempi di Raccomandazioni Generate dal Motore
- **SSD TRIM Mancante:** Rilevato SSD NVMe con supporto TRIM ma non ottimizzato negli ultimi 30 giorni $\rightarrow$ Raccomanda esecuzione TRIM non-distruttivo (Rischio: `NONE`, Azione: `AUTOMATED_SAFE`).
- **Punto di Ripristino Assente:** Nessun punto di ripristino Windows creato negli ultimi 14 giorni $\rightarrow$ Raccomanda creazione Safety Point prima di qualsiasi installazione o tweak (Rischio: `NONE`, Azione: `ASSISTED_UAC`).
- **Cache Shader Sovradimensionata:** File di cache DirectX/GPU accumulati > 1.5 GB dopo aggiornamento driver grafico $\rightarrow$ Raccomanda pulizia mirata cache compilata per evitare conflitti grafici (Rischio: `LOW`, Azione: `AUTOMATED_SAFE`).
- **Schema Energetico Incoerente:** Utente ha registrato un profilo Gaming Daily ma lo schema attivo di Windows è "Risparmio Energia" $\rightarrow$ Raccomanda attivazione schema Bilanciato o Prestazioni (Rischio: `LOW`, Azione: `ASSISTED_UAC`).

---

## 9. BASELINE PERSONALIZZATA (KNOWN GOOD STATE)

Le soglie generiche e statiche (es. *"temperatura > 80°C = pericolo"*) sono errate: una CPU Intel di 14a generazione a 85°C sotto Cinebench è nella norma operativa, mentre una GPU undervoltata che raggiunge 85°C indica un problema evidente di dissipazione o airflow.

PC Tracker possiede un vantaggio strutturale unico rispetto ad altri tool: **conosce l'hardware dell'utente, la data dell'ultimo cambio pasta termica e i profili di tuning stabili salvati nel database**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MODELLO PERSONAL BASELINE                            │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Profilo Tuning "Daily" Registrato:                                  │
│    - Componente: GPU RTX 4080                                          │
│    - Undervolt: 950 mV @ 2760 MHz                                      │
│    - Temperatura Registrata a Pieno Carico: 68°C                      │
│    - Data Test Stabilità: 15 Novembre 2024                             │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Telemetria Live Osservata Oggi:                                     │
│    - Utilizzo GPU: 99%                                                 │
│    - Temperatura Attuale: 77°C                                         │
│    - Deltas: +9°C rispetto al riferimento "Daily"                      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Analisi e Spiegazione dell'Health Engine:                           │
│    "La tua GPU sta operando a 77°C a pieno carico, ovvero 9°C sopra   │
│     il valore di riferimento registrato nel profilo Daily (68°C).      │
│     L'ultimo intervento di pulizia filtri risale a 180 giorni fa.      │
│     Consigliamo: ispezione filtri antipolvere e verifica ventole."     │
└────────────────────────────────────────────────────────────────────────┘
```

Se l'utente non ha ancora registrato un profilo Daily, il sistema utilizza soglie prudenti di sicurezza standard e invita l'utente a registrare la sua prima configurazione di riferimento.

---

## 10. CATALOGO DELLE OPERAZIONI WINDOWS (WINDOWS ACTION CATALOG)

Il catalogo analizza tutte le operazioni implementabili o già predisposte, classificandone meticolosamente impatto, privilegi e sicurezza.

| Feature | Tipo | Sola Lettura? | Mutante? | Elevazione UAC? | Rischio | Valore Utente | Rollback | API / Sorgente | Complessità |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SFC Scan** | Integrità File | Sì | No | Sì | `NONE` | Alto (rileva file OS corrotti) | Non necessario | `sfc.exe /verifyonly` | Bassa |
| **SFC Repair** | Riparazione File | No | Sì | Sì | `LOW` | Alto (ripristina file originali) | Tramite Restore Point | `sfc.exe /scannow` | Media |
| **CHKDSK Scan** | File System | Sì | No | Sì | `NONE` | Alto (verifica integrità NTFS) | Non necessario | `chkdsk.exe C: /scan` | Bassa |
| **DISM Cleanup** | Pulizia WinSxS | No | Sì | Sì | `LOW` | Alto (recupera 2-8 GB di sistema) | Non necessario | `DISM /StartComponentCleanup` | Media |
| **SSD TRIM** | Manutenzione SSD | No | Sì | Sì | `NONE` | Alto (preserva velocità scrittura) | Non applicabile | `Optimize-Volume -ReTrim` | Bassa |
| **DNS Flush** | Rete | No | Sì | No | `NONE` | Medio (risolve errori risoluzione) | Non applicabile | `ipconfig /flushdns` | Minima |
| **Shader Cache** | Pulizia Grafica | No | Sì | No | `LOW` | Alto (risolve stuttering texture) | Rigenerata dai giochi | Purge cartelle AppData | Bassa |
| **File Temporanei** | Spazio Disco | No | Sì | No/Sì | `LOW` | Medio (libera spazio C:) | Non necessario | `cleanmgr.exe` nativo | Bassa |
| **Restore Point** | Sicurezza | No | Sì | Sì | `NONE` | Fondamentale (ancora di salvataggio) | Punto ripristino | `Checkpoint-Computer` | Media |
| **Power Plan** | Configurazione | No | Sì | Sì | `LOW` | Medio (ottimizza clock e consumi) | Seleziona piano prec. | `PowerSetActiveScheme` | Bassa |
| **Startup Apps** | Ottimizzazione | No | Sì | No/Sì | `LOW` | Alto (riduce tempo di boot) | Riabilitazione 1-click | Registry StartupApproval | Media |
| **GPU Driver Audit**| Verifica Info | Sì | No | No | `NONE` | Alto (identifica driver obsoleti) | Non applicabile | Registry Display Class | Bassa |
| **WinGet Updates** | Aggiornamenti | Sì | No | No | `NONE` | Alto (catalogo software da aggiornare)| Non applicabile | `winget upgrade` CLI | Media |
| **S.M.A.R.T. Audit**| Diagnostica | Sì | No | No | `NONE` | Fondamentale (prevenzione guasti) | Non applicabile | `StorageReliabilityCounter` | Bassa |
| **UEFI Reboot** | Sistema | No | Sì | Sì | `MODERATE` | Alto (accesso rapido firmware) | Riavvio normale | `shutdown.exe /r /fw /t 0` | Bassa |

---

## 11. RECOMMENDATION SAFETY MODEL (ZERO REGISTRY CLEANER, ZERO AI-SLOP)

PC Tracker adotta un codice deontologico di massima sicurezza per le raccomandazioni e le azioni di sistema.

### 11.1 Classificazione dei Livelli di Sicurezza
1. **Class 1: READ ONLY (Informativo):**  
   Nessuna modifica, zero privilegi amministrativi, zero rischio. Es. Scansione volumi, lettura SMART, audit di sicurezza, verifica driver.
2. **Class 2: LOW RISK ACTION (Manutenzione Sicura):**  
   Operazioni standard e idempotenti supportate ufficialmente dal sistema operativo. Es. TRIM su SSD, svuotamento Cestino, pulizia cache shader, creazione di un Punto di Ripristino.
3. **Class 3: SYSTEM ACTION (Modifica Impostazioni):**  
   Richiede elevazione UAC esplicita e conferma dell'utente. Mostra chiaramente cosa viene modificato e come ripristinare lo stato. Es. Switch schema energetico, disattivazione app in avvio automatico.
4. **Class 4: HIGH IMPACT ACTION (Azione di Ripristino Profondo):**  
   Richiede conferma rinforzata con dialogo modale dedicato. L'app verifica automaticamente la presenza o propone la creazione immediata di un **Punto di Ripristino di sicurezza** prima di procedere. Es. Riavvio UEFI, riparazione SFC /scannow.

### 11.2 Cosa è TASSATIVAMENTE VIETATO
- ❌ **NO Registry Cleaner:** La pulizia casuale del registro di Windows è una pratica obsoleta, sconsigliata da Microsoft, che non porta benefici prestazionali e rischia di corrompere chiavi COM/OLE.
- ❌ **NO "RAM Booster" / Ottimizzatori di Memoria:** Svuotare forzatamente il working set della memoria RAM costringe Windows a ricaricare i dati dal disco di swap, provocando gravi rallentamenti.
- ❌ **NO Debloat Automatici o Script Indiscriminati:** Vietato disabilitare servizi di sistema in blocco (es. Windows Update, telemetria Defender, spooler di stampa) che causerebbero rotture a catena.
- ❌ **NO Download o Esecuzione di Script Remoti:** Nessun eseguibile o file `.bat`/`.ps1` esterno viene scaricato o eseguito. Tutte le istruzioni native sono pre-compilate in Rust o utilizzano comandi Windows certificati.

---

## 12. ARCHITETTURA DI FLUSSO DATI UNIFICATA

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHITETTURA DI SISTEMA                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. NATIVE LAYER (Rust / Tauri v2)                                      │
│    - Win32 APIs (GetSystemTimes, GlobalMemoryStatusEx, D3DKMT, Reg)    │
│    - Hardware vendor libraries (NVML, ADL dinamiche)                   │
│    - Storage Management (DeviceIoControl, ReliabilityCounter)          │
│    - Execution Broker (UAC handling con ExitCode 1223 cancellation)    │
│                                  │                                     │
│                                  ▼                                     │
│ 2. ADAPTER LAYER (TypeScript Service)                                  │
│    - `monitoringService.ts`: Gestione polling rate, pause on blur       │
│    - `windowsToolsService.ts`: Invocazione sicura Tauri commands       │
│                                  │                                     │
│                                  ▼                                     │
│ 3. MEMORIA VOLATILE (React Live Hook / Context)                        │
│    - `MonitoringSnapshot` istantaneo                                   │
│    - Buffer circolare ultimi 30 campioni (60 secondi)                  │
│                                  │                                     │
│                                  ▼                                     │
│ 4. DOMAIN ENGINES (Funzioni Pure TypeScript)                          │
│    ┌───────────────────────────┐      ┌───────────────────────────┐    │
│    │     healthEngine.ts       │      │   optimizationEngine.ts   │    │
│    │  (Fatti ──► HealthFinding)│      │(Findings ──► Recommends)  │    │
│    └───────────────────────────┘      └───────────────────────────┘    │
│                  ▲                                  ▲                  │
│                  └───────────┬──────────────────────┘                  │
│                              │                                         │
│ 5. HISTORICAL SOURCE OF TRUTH (IndexedDB)                              │
│    - Componenti, Eventi, Tuning Profiles (Daily), Manutenzione         │
│                                                                        │
│                                  │                                     │
│                                  ▼                                     │
│ 6. PRESENTATION LAYER (Vanilla CSS / React)                            │
│    - PC Care Center Page (Panoramica, Monitor, Cura, Strumenti)        │
│    - Dashboard Widget sintetico                                        │
│    - Command Palette (Ctrl+K) Shortcuts                                │
│                                  │                                     │
│                                  ▼                                     │
│ 7. SAFETY & CONFIRMATION BROKER (UI Modal)                             │
│    - Spiegazione, Rischio, UAC warning, Backup/Restore prompt          │
│                                  │                                     │
│                                  ▼                                     │
│ 8. NATIVE EXECUTION & VERIFICATION                                     │
│    - Esecuzione azione ──► Ricezione Output ──► Re-scan diagnostico    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. PC CARE CENTER UX / ARCHITETTURA DELL'INFORMAZIONE

Per rispettare rigorosamente il principio **"Less, but Better"** sancito in `GEMINI.md`, evitiamo di sovraccaricare l'utente con 7 tab o 40 card caotiche.

La sezione **Cura del PC** viene organizzata in una struttura snella a **4 Tab Coerenti**:

```
[ Cura del PC ]
  ├── 1. Panoramica & Salute     (Overview, Punteggio/Stato Vitals, Raccomandazioni Attive)
  ├── 2. Monitoraggio Live       (Card Telemetria Live CPU/GPU/RAM/Disco con sparklines leggere)
  ├── 3. Registro Manutenzione   (Storico interventi fisici, pasta termica, pulizia filtri)
  └── 4. Strumenti & Tuning      (Diagnostica Windows, TRIM, Ripristino, Profili di Tuning)
```

### 13.1 Dettaglio delle Viste
1. **Panoramica & Salute:**
   - Visualizza lo stato di salute sintetico (badge verde "Sistema Ottimale", ambra "Monitorare", o rubino "Attenzione").
   - Elenco compatto dei `HealthFinding` attivi con pulsante rapido *"Risolvi"* o *"Dettagli"*.
   - Sezione *"Consigliati per te"* con le raccomandazioni a massimo beneficio e minimo rischio.
2. **Monitoraggio Live:**
   - 4 card eleganti (CPU, GPU, RAM, Storage) con barre di utilizzo, temperature, frequenze e raffronto immediato con la *Personal Baseline*.
   - Micro-grafici sparkline a basso impatto visivo e computazionale.
3. **Registro Manutenzione:**
   - L'attuale registro interventi (`registro`), scadenze periodiche e calcolo automatico dei giorni trascorsi dall'ultima pulizia o sostituzione pasta termica.
4. **Strumenti & Tuning:**
   - Unificazione intelligente degli attuali tab `windows` e `tuning`: strumenti diagnostici di sistema (SFC, TRIM, Cestino, Restore Points) affiancati al giornale dei profili di overclock/undervolt.

---

## 14. INTEGRAZIONE CON LA DASHBOARD PRINCIPALE

La Dashboard principale di PC Tracker deve rimanere il punto d'ingresso privilegiato per l'hardware e la finanza personale del PC. **Non deve essere trasformata in un task manager pesante**.

Sulla Dashboard arrivano esclusivamente **segnali sintetici ad alto valore**:
- **Widget "Salute & Cura":** Un badge o card compatta accanto al Power Budget che riporta:
  - *Stato generale:* ad es. `1 Avviso di Manutenzione` o `Salute Sistema Ottima`.
  - *Scadenza imminente:* ad es. `Pulizia filtri consigliata tra 5 giorni`.
  - *Allerta spazio:* se l'unità di sistema C: supera l'85% di riempimento.
  - *Raccomandazione in evidenza:* ad es. `Punto di ripristino consigliato`.
- Cliccando sul widget, l'utente viene reindirizzato direttamente alla scheda pertinente in **Cura del PC**.

---

## 15. INTEGRAZIONE COMMAND PALETTE (CTRL+K)

Nel registro comandi `commandRegistry.ts` vengono predisposti i seguenti comandi cercabili:

### Navigazione
- `nav-care-overview`: *"Cura del PC: Panoramica & Salute"* (`keywords: salute, stato, vitals, problemi`)
- `nav-care-monitoring`: *"Cura del PC: Monitoraggio Live"* (`keywords: telemetria, sensori, temperature, carico, cpu, gpu, ram`)
- `nav-care-maintenance`: *"Cura del PC: Registro Manutenzione"* (`keywords: pasta termica, pulizia filtri, storico cura`)
- `nav-care-tools`: *"Cura del PC: Strumenti Windows & Tuning"* (`keywords: sfc, chkdsk, trim, tuning, restore point`)

### Azioni Rapide
- `action-health-scan`: *"Avvia Scansione Salute Sistema"* (`subtitle: Verifica non-distruttiva stato dischi, file e sicurezza`)
- `action-create-restore-point`: *"Crea Punto di Ripristino Windows"* (`subtitle: Salva uno snapshot di sicurezza del sistema`)
- `action-run-trim`: *"Esegui Ottimizzazione TRIM SSD"* (`subtitle: Invia comando TRIM alle unità SSD supportate`)
- `action-clean-shader-cache`: *"Pulisci Shader Cache GPU"* (`subtitle: Rimuove cache DirectX e driver per risolvere stuttering`)
- `action-reboot-uefi`: *"Riavvia nel BIOS/UEFI"* (`subtitle: Riavvia il computer direttamente nel firmware della scheda madre`)

---

## 16. PERFORMANCE & RESOURCE BUDGET

L'applicazione deve rispettare rigorosi limiti di consumo delle risorse per garantire che la sua presenza in background sia impercettibile per l'utente, anche durante sessioni di gaming competitivo o rendering:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     BUDGET DI RISORSE VINCOLANTE                       │
├─────────────────────────┬──────────────────────────────────────────────┤
│ Metrica                 │ Obiettivo Massimo Accettabile                │
├─────────────────────────┼──────────────────────────────────────────────┤
│ CPU Overhead (Attiva)   │ < 0.2% CPU media (su CPU quad-core o sup.)   │
│ CPU Overhead (Ridotta)  │ 0.00% (polling live sospeso al 100%)         │
│ Memoria RAM Aggiuntiva  │ < 25 MB (frontend React + backend Tauri)     │
│ Chiamate IPC Rust       │ 1 singola chiamata batch ogni 2.0 secondi     │
│ Scritture su Disco      │ 0 scritture/sec durante il monitoraggio      │
│ Tempo di Avvio (Cold)   │ < 60 ms aggiuntivi per il layer monitoraggio │
└─────────────────────────┴──────────────────────────────────────────────┘
```

### Regole Tecniche per il Rispetto del Budget:
1. **Zero IPC Spamming:** È vietato invocare comandi separati per CPU, GPU, RAM e Dischi. Il backend Tauri deve esporre un'unica funzione `get_monitoring_snapshot()` che raccoglie tutte le metriche Tier A in un'unica struct serializzata.
2. **Uso Esclusivo di API C Native:** Nel ciclo continuo a 2s è vietato avviare processi esterni PowerShell (`powershell.exe`). Il polling continuo deve utilizzare esclusivamente chiamate Win32 (`GetSystemTimes`, `GlobalMemoryStatusEx`, `D3DKMT`, `NVML`). PowerShell viene utilizzato solo per azioni on-demand (Tier C) o elevazione UAC.
3. **Debounce e RequestAnimationFrame:** Gli aggiornamenti della UI nel browser non devono saturare il thread di rendering di React.

---

## 17. PRIVACY & LOCAL-FIRST

In linea con la filosofia fondante di PC Tracker e le regole del privacy audit (`npm run audit:privacy`):
1. **100% Locale:** Tutte le metriche di telemetria, le specifiche hardware, gli eventi e i risultati di diagnostica risiedono esclusivamente nella RAM volatile del PC o nel database locale IndexedDB.
2. **Zero Telemetria Esterna:** Nessun dato, né anonimizzato né aggregato, viene trasmesso all'esterno.
3. **Isolamento di Rete:** L'applicazione non contatta server remoti per il monitoraggio. Le uniche chiamate di rete esterne possibili nell'intero software sono il controllo manuale degli aggiornamenti dell'app via GitHub Releases (già implementato e trasparente) e l'interrogazione locale di WinGet tramite CLI locale di Windows.

---

## 18. FUTURE AI ADVISOR (ARCHITETTURA PREDISPOSTA E DISACCOPPIATA)

Sebbene in questa fase **non sia implementata alcuna intelligenza artificiale**, l'architettura è progettata in modo tale che, in futuro, un assistente locale (es. modello on-device tramite WebLLM, ONNX Runtime o API opzionale) possa operare come **consulente esplicativo senza accesso diretto o incontrollato al sistema**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     PIPELINE PER IL FUTURE AI ADVISOR                  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. SYSTEM FACTS (Dati Strutturati Sanitizzati)                         │
│    - Componenti montati (CPU, GPU, RAM, Storage)                       │
│    - Snapshot di monitoraggio attuale                                  │
│    - Health Findings deterministici calcolati dall'Health Engine       │
│    - Profilo di Personal Baseline registrato                           │
│                                  │                                     │
│                                  ▼                                     │
│ 2. DETERMINISTIC ENGINE (Cervello Logico Oggettivo)                    │
│    - Nessuna allucinazione: lo stato del PC è calcolato dalle formule  │
│    - Le raccomandazioni sono generate dal catalogo formale             │
│                                  │                                     │
│                                  ▼                                     │
│ 3. AI EXPLANATION LAYER (Opzionale / Solo Testuale)                   │
│    - Riceve: `{ hardware, facts, findings, recommendations }`         │
│    - Genera: spiegazione in italiano naturale, chiara e comprensibile │
│    - L'AI NON può modificare dati, eseguire comandi o toccare il DB   │
│                                  │                                     │
│                                  ▼                                     │
│ 4. HUMAN APPROVAL (Controllo Totale dell'Utente)                       │
│    - L'utente legge la spiegazione e preme l'azione se lo desidera     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 19. ROADMAP DI IMPLEMENTAZIONE A TRANCHE VERIFICABILI

In accordo con il Modello a 3 Livelli di `GEMINI.md`, l'implementazione del PC Care Center avverrà attraverso **tranche contenute, testabili in isolamento e sicure**:

### Tranche 1: Native Monitoring Engine (Rust / Tauri)
- Creazione del modulo `src-tauri/src/monitoring.rs` integrato in `lib.rs`.
- Implementazione delle funzioni Win32 native per telemetria CPU (`GetSystemTimes`), RAM (`GlobalMemoryStatusEx`), GPU (`D3DKMTQueryStatistics` universale + aggancio dinamico opzionale `nvml.dll`).
- Comando Tauri atomico: `get_monitoring_snapshot()`.
- Test unitari Rust per serializzazione e gestione fallback su macchine prive di GPU dedicata.
- *Commit locale Livello 1.*

### Tranche 2: Domain Health Engine & Tipi di Dominio
- Creazione di `src/types/monitoring.ts` e `src/types/health.ts`.
- Implementazione del motore puro deterministico `src/domain/healthEngine.ts`.
- Suite completa di test unitari Vitest (`src/domain/__tests__/healthEngine.test.ts`) con copertura di tutti i rami di severità (INFO, GOOD, ATTENTION, WARNING, CRITICAL) e simulazione anomalie.
- *Commit locale Livello 1.*

### Tranche 3: Optimization Engine & Personal Baseline
- Implementazione del motore puro `src/domain/optimizationEngine.ts` con catalogo delle raccomandazioni e matrice di rischio/rollback.
- Integrazione della logica di confronto `Personal Baseline` con i `tuningProfiles` del database.
- Suite completa di test unitari Vitest (`src/domain/__tests__/optimizationEngine.test.ts`).
- *Commit locale Livello 1.*

### Tranche 4: State Service & PC Care Center UI
- Implementazione di `src/services/monitoringService.ts` con gestione ciclo di polling, Smart Pause on blur e buffer volatile a 30 campioni.
- Riorganizzazione della pagina `MaintenancePage.tsx` verso l'architettura unificata **Cura del PC** (4 tab: Panoramica & Salute, Monitoraggio Live, Registro Manutenzione, Strumenti & Tuning).
- Realizzazione delle card di monitoraggio con Vanilla CSS nativo conforme al tema Dark Enthusiast.
- *Commit locale Livello 1.*

### Tranche 5: Dashboard Signals, Command Palette & Hardening Finale
- Integrazione del widget sintetico "Stato di Salute & Cura" nella `DashboardPage.tsx`.
- Espansione dei comandi in `commandRegistry.ts` per l'apertura rapida delle nuove sezioni e l'avvio della diagnostica.
- Verifica del budget prestazionale reale con profiler browser.
- Verifica strict TypeScript (`tsc --noEmit`), suite test completa, audit di privacy e sincronizzazione finale.

---

## 20. RISCHI ARCHITETTURALI E LIMITI OPERATIVI

I seguenti rischi tecnici derivano direttamente dalla natura di Windows e dall'architettura del repository:
1. **Assenza di Sensori CPU Package senza Driver Kernel:**  
   Come evidenziato nell'audit delle API, Windows non offre una via universale unprivileged per la temperatura dei core CPU.  
   *Mitigazione:* Riconoscere questa realtà con trasparenza architetturale; mostrare solo i dati certi (carico, frequenza, RAM, GPU, dischi) ed evitare driver kernel non certificati che metterebbero a repentaglio la stabilità del sistema e la compatibilità anti-cheat.
2. **Overhead di Avvio di PowerShell per Polling Rapido:**  
   Tentare di eseguire script PowerShell ogni 2 secondi causerebbe picchi continui di CPU (300 ms per avviare `powershell.exe`).  
   *Mitigazione:* Divieto assoluto di usare PowerShell nel Tier A (Live). Solo Win32 API native compilate in Rust.
3. **Discrepanza tra Stato Effettivo e Cache Utente:**  
   Se l'utente esegue un'operazione mutante (es. disabilita un'app all'avvio) dall'esterno dell'app, lo stato dell'app potrebbe risultare disallineato.  
   *Mitigazione:* Tutte le raccomandazioni e i finding vengono ricalcolati sui dati freschi al momento dell'ispezione, con timestamp esplicito di rilevamento.
4. **Resistenza dell'Utente al Prompt UAC (Cancel 1223):**  
   Quando un'azione richiede privilegi elevati e l'utente rifiuta il controllo dell'account utente, il sistema deve gestire la cancellazione senza crash o blocchi UI.  
   *Mitigazione:* Il broker nativo in `windows_tools.rs` intercetta già nativamente l'errore `1223 (ERROR_CANCELLED)` e restituisce uno stato pulito `'cancelled'`, già gestito nel frontend.

---

## 21. VERDETTO FINALE

### Cosa è Già Pronto:
- Il 100% dell'architettura di base (Vite, React 18, TypeScript strict, Vanilla CSS, IndexedDB v1).
- Un catalogo ricco di oltre 15 comandi diagnostici e azioni native Windows in `windows_tools.rs`.
- Il rilevamento istantaneo dell'anagrafica hardware (CPU, Motherboard, GPU, RAM, Dischi) in `hardware.rs`.
- I motori per profili di tuning e registro interventi di manutenzione.
- 584 test unitari completamente verdi.

### Cosa Manca:
- Il modulo Rust di telemetria live continua batch (`monitoring.rs`).
- I motori puri TypeScript `healthEngine.ts` e `optimizationEngine.ts` con relativi test unitari.
- Il service di gestione polling con Smart Pause e la relativa UI a 4 schede per il PC Care Center.

### Prossimo Step Concreto Consigliato:
Avviare la **Tranche 1**, focalizzandosi esclusivamente sulla creazione del modulo nativo Rust di telemetria (`monitoring.rs`) per fornire alla UI uno snapshot aggregato e ultra-leggero di CPU, GPU, RAM e Storage a zero privilegi e zero overhead.
