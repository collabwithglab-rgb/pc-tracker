# Audit Diagnostica Profonda & Espansione Ottimizzazioni (Tranche 5 & 6)
> **Memoria Tecnica Permanente di Valutazione e Design**  
> Data di redazione: 28 Settembre 2026  
> Riferimento: PC Care Center / Smart Maintenance Engine

---

## 1. Decisione Notifiche Windows Native (Tranche 5)

### Esito del Decision Gate: **OPTION 1 — KEEP IN-APP ONLY**

#### Motivazioni Tecniche ed Architetturali:
1. **Assenza di Meccanismi Background Nativi Zero-Overhead**:  
   Su Windows, per un'applicazione desktop Win32 tradizionale distribuita tramite installer NSIS (`installMode: "currentUser"`), non esiste un trigger nativo a processo terminato senza introdurre:
   - Un processo daemon / helper residente all'avvio di Windows (`HKCU\Run` o System Tray), consumando 40–80 MB di RAM perennemente;
   - Un task pianificato in *Utilità di Pianificazione* (Windows Task Scheduler), soggetto a blocchi delle policy di risparmio energetico e sospensione;
   - Servizi Windows con elevazione amministrativa.
2. **Barriera dello Storage (IndexedDB come Single Source of Truth)**:  
   L'intero stato dell'applicazione (componenti, diario di manutenzione, storico esecuzioni, impostazioni scheduler, snooze dell'utente) risiede **esclusivamente su IndexedDB** nell'ambiente Chromium di WebView2. Un processo esterno in Rust non può accedere a IndexedDB senza avviare una WebView2 headless (consumando 150–250 MB di RAM per ogni check) o duplicare lo storage violando la Regola 1 di `GEMINI.md`.
3. **Pianificazione Nativa WinRT Drop-Window (5 Minuti)**:  
   Le `ScheduledToastNotification` di Windows scartano silenziosamente la notifica se il computer è spento, in sospensione o in ibernazione durante la finestra di consegna prefissata (~5 minuti). Inoltre, i payload pre-generati statici rischierebbero di mostrare avvisi ormai obsoleti se l'utente ha già eseguito la manutenzione.
4. **Valore Utente Ottimale In-App**:  
   Le notifiche toast mentre l'utente gioca o lavora sono percepite come invadenti (nagware/slop). Il momento perfetto per presentare i promemoria è quando l'utente apre PC Tracker: la sezione *"Prossimi Promemoria"* in `CareOverviewTab` espone fino a 3 reminder ordinati per urgenza, con spiegazione trasparente, tasti di azione a 1-click e snooze persistente.

---

## 2. Mappa Completa della Telemetria Attuale (Tranche 6)

| Area | Metrica | Fonte | Modalità | Affidabilità | Disponibilità Hardware | Permission Required | Health Engine? | Opt Engine? | Potenziale Diagnostico Attuale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPU** | Carico (%) | `Win32_GetSystemTimes` | Live (50ms–30s delta) | Massima | Universale (qualsiasi CPU x86/x64) | Standard (User) | Sì (canale `cpu_load`) | No | Rileva saturazione istantanea del processore |
| **CPU** | Core Logici | `available_parallelism` / Registry | Statico | Massima | Universale | Standard (User) | Info | No | Topologia di base del calcolo |
| **CPU** | Frequenza Base (MHz) | `HKLM\...\CentralProcessor\0\~MHz` | Statico | Alta | Universale | Standard (User) | Info | No | Frequenza di targa da specifica ACPI |
| **CPU** | Temperatura Package (°C) | Non implementato (`unsupported`) | N/D | N/D | Richiede driver ring-0 | Richiede Kernel Driver | Solo Coverage (`unsupported`) | No | Etichettato come non supportato senza ring-0 |
| **CPU** | Consumo Energetico (W) | Non implementato (`unsupported`) | N/D | N/D | Richiede driver ring-0 | Richiede Kernel Driver | Solo Coverage (`unsupported`) | No | Etichettato come non supportato senza ring-0 |
| **RAM** | RAM Totale (Bytes) | `GlobalMemoryStatusEx` (`ullTotalPhys`) | Live | Massima | Universale | Standard (User) | Sì | Sì | Dimensione fisica installata |
| **RAM** | RAM Disponibile/Usata | `GlobalMemoryStatusEx` (`ullAvailPhys`) | Live | Massima | Universale | Standard (User) | Sì (soglie 85%/92%) | Sì (triage >90%) | Pressione memoria fisica istantanea |
| **GPU** | Riconoscimento Display | Registry Video Class `{4d36e968...}` | Statico/Live | Alta | Universale (NVIDIA, AMD, Intel) | Standard (User) | Sì | Sì | Identificazione scheda primaria/discreta e vendor |
| **GPU** | VRAM Nominale (Bytes) | Registry `qwMemorySize` | Statico | Media | Discreta/Integrata | Standard (User) | Info | No | Dimensione della memoria video dedicata |
| **GPU** | Carico 3D (%) | `NVML` (`nvmlDeviceGetUtilizationRates`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Sì | No | Saturazione motore grafico |
| **GPU** | VRAM Usata/Percentuale | `NVML` (`nvmlDeviceGetMemoryInfo`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Sì | No | Saturazione memoria grafica sotto carico |
| **GPU** | Temperatura Core (°C) | `NVML` (`nvmlDeviceGetTemperature`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Sì (soglie 83°/88°) | Sì (vs baseline) | Rilevamento surriscaldamento GPU |
| **GPU** | Temperatura Hotspot (°C)| Non implementato (`unsupported`) | N/D | N/D | Richiede API vendor private | Vendor Private | Solo Coverage | No | Hotspot junction temp |
| **GPU** | Clock Core / Memory | `NVML` (`nvmlDeviceGetClockInfo`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Info | No | Frequenze operative 3D correnti |
| **GPU** | Consumo Elettrico (W) | `NVML` (`nvmlDeviceGetPowerUsage`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Info | No | Assorbimento scheda in tempo reale |
| **GPU** | Velocità Ventole (%) | `NVML` (`nvmlDeviceGetFanSpeed`) | Live | Massima | Solo NVIDIA GeForce/RTX | Standard (User) | Info | No | Regime di rotazione del dissipatore |
| **STORAGE** | Lettere, Etichette, FS | `GetLogicalDriveStringsW` + `GetVolumeInfo` | Live | Massima | Universale (NTFS, FAT32, exFAT) | Standard (User) | Sì | Sì | Mappa volumi montati |
| **STORAGE** | Spazio Totale / Libero | `GetDiskFreeSpaceExW` | Live | Massima | Universale | Standard (User) | Sì (soglie 85%/92%) | Sì (pulizia >82%) | Saturazione partizioni e unità di sistema C: |
| **STORAGE** | Identificazione SSD / TRIM | `scan_storage_volumes` (PowerShell) | On-Demand | Alta | Windows 10/11 Storage API | Standard (User) | Sì | Sì (TRIM >30gg) | Distinzione SSD/HDD e supporto comandi ReTrim |
| **STORAGE** | S.M.A.R.T. Wear & Errori | `Get-StorageReliabilityCounter` | On-Demand | Media-Alta | NVMe / SATA compatibili | UAC Elevation (spesso richiesta) | Sì (critico se usura>90% o I/O err) | Sì (CHKDSK se errori) | Salute fisica unità e contatori usura celle |
| **STORAGE** | Cestino di Windows | `SHQueryRecycleBinW` | On-Demand | Massima | Universale | Standard (User) | Sì | Sì (>500MB / >50 file) | Spazio recuperabile trattenuto dai file eliminati |
| **WINDOWS** | Versione OS & Build | `SOFTWARE\Microsoft\Windows NT\CurrentVersion` | Statico | Massima | Universale | Standard (User) | Info | Info | Identificazione precisa release e major build |
| **WINDOWS** | Uptime di Sistema | `GetTickCount64()` | Live | Massima | Universale | Standard (User) | Info | No | Tempo di accensione continua dall'ultimo avvio |
| **WINDOWS** | Integrità File (SFC) | `sfc /verifyonly` | On-Demand | Massima | Universale | UAC Elevation | Sì (corrupted/clean) | Sì (sfc /scannow) | Integrità hash dei file protetti di Windows |
| **WINDOWS** | Component Store (WinSxS)| Registro storico manutenzione | Storico | Alta | Universale | Standard (lettura) | No | Sì (>60gg + C:>80%) | Accumulo pacchetti obsoleti post-aggiornamenti |
| **WINDOWS** | WinGet Packages | `winget upgrade --include-unknown` | On-Demand | Alta | Win10/11 con App Installer | Standard (User) | Info | Sì (aggiornamenti) | Pacchetti software e runtime da aggiornare |
| **SICUREZZA** | Secure Boot | Registry UEFI Environment | On-Demand | Massima | Motherboard UEFI | Standard (User) | Sì (warning se off) | Sì (guida BIOS) | Protezione firmware contro bootkit |
| **SICUREZZA** | TPM 2.0 Presente/Ready | WMI `Win32_Tpm` | On-Demand | Massima | Piattaforme con chip fTPM/dTPM | Standard / Admin | Sì (warning se assente) | No | Supporto crittografico BitLocker e Hello |
| **SICUREZZA** | VBS & HVCI (Memory Int)| Registry DeviceGuard | On-Demand | Alta | Windows 10/11 Virtualization | Standard (User) | Sì (info se off) | No | Isolamento processi kernel via hypervisor |
| **SICUREZZA** | Custom Hosts Entries | Lettura `drivers\etc\hosts` | On-Demand | Massima | File system Windows | Standard (User) | Sì (>10 regole) | No | Rilevamento anomalie risoluzione nomi locali |
| **POWER** | Ibernazione Abilitata/Dim | `powercfg /availablesleepstates` + hiberfil.sys | On-Demand | Massima | Universale | Standard (User) | Info | No | Stato file ibernazione e spazio disco impegnato |
| **POWER** | Schema Prestazioni | `powercfg /getactivescheme` | On-Demand | Massima | Universale | UAC Elevation (per sblocco) | No | Sì (per utenti tuning) | Schema energetico Windows attivo |

---

## 3. Classificazione delle Lacune Diagnostiche

### Priorità P0 (Manca per una diagnosi fondamentale di stabilità hardware/sistema)
1. **Device / Driver Fault Detection**:  
   Rilevamento periferiche in crash o con driver mancante (`CM_Get_DevNode_Status` in `CfgMgr32.dll` con codici errore Code 10, Code 43, Code 28). Attualmente Windows sa se una scheda o un controller ha fallito l'avvio, ma PC Tracker non interroga questa API.
2. **CPU Throttling Frequenziale & Power Capping**:  
   Rilevamento del calo delle frequenze sotto carico sostenuto (`CallNtPowerInformation` in `powrprof.dll`). Permette di identificare il thermal o power throttling senza dover ricorrere a driver ring-0.
3. **Diagnostica Pressione Memoria Reale (Commit vs RAM Fisica)**:  
   Uso di `GetPerformanceInfo` in `psapi.dll` per monitorare `CommitTotal`, `CommitLimit` e l'uso effettivo del file di paging, distinguendo il carico fisiologico da un memory leak o saturazione swap.

### Priorità P1 (Valore diagnostico elevato per la cura continuativa)
1. **Inventario Software in Avvio Automatico**:  
   Lettura delle chiavi di registro `Run` e `StartupApproved\Run` per quantificare e mostrare i programmi in avvio senza fungere da debloater arbitrario.
2. **Riconoscimento Architettura Desktop vs Laptop a Batteria**:  
   Uso di `GetSystemPowerStatus` per evitare raccomandazioni incompatibili (es. attivare "Ultimate Performance" o disattivare ibernazione su un portatile a batteria).
3. **Verifica Latenza e Packet Loss On-Demand**:  
   Test rapido ICMP Echo (5 ping nativi) attivabile dall'utente per diagnosticare instabilità di rete senza monitoraggio continuo.
4. **Verifica Stato e Cronologia Windows Update**:  
   Interrogazione dell'interfaccia COM `UpdateSession` (WUAPI) per identificare patch di sicurezza pendenti o fallite.

### Priorità P2 (Valore utile secondario / parità vendor)
1. **Telemetria GPU AMD Radeon via ADL/ADLX**:  
   Caricamento dinamico di `atiadlxx.dll` in Rust per offrire agli utenti Radeon le stesse metriche attive per NVIDIA (temp core, utilization, VRAM, clock, fan).
2. **Velocità Link e Segnale Wi-Fi**:  
   Interrogazione di `GetAdaptersAddresses` (link speed) e `WlanGetNetworkBssList` (RSSI segnale Wi-Fi).

### Priorità P3 (Interessante ma non prioritario / differibile)
1. **Telemetria GPU Intel Arc via LevelZero / OneAPI**.
2. **Tracciamento processi per-applicazione continuo in memoria**.
3. **Sensori proprietari alimentatori USB (iCUE / CAM)**.

---

## 4. Blacklist Ufficiale Anti-Snake-Oil

PC Tracker **esclude categoricamente** le seguenti pratiche ingannevoli:
- ❌ **Registry Cleaners**: La rimozione di chiavi orfane non accelera il sistema ed è la prima causa di corruzione di Windows Update e Office.
- ❌ **RAM Boosters / Empty Working Set**: Forzare lo svuotamento della RAM scrive la memoria attiva nel pagefile su disco, provocando gravi micro-stuttering quando i dati vengono ricaricati.
- ❌ **Game Boosters con promesse di FPS**: Nessuna ottimizzazione software può superare i limiti fisici dell'hardware.
- ❌ **Disabilitazione automatica dei servizi di sistema**: Disattivare telemetria o servizi Windows a tappeto rompe lo Store, Xbox Live e le dipendenze di sicurezza.
- ❌ **Modifiche di rete arbitrarie (TCP Optimizer / no-Nagle a caso)**.
- ❌ **Driver updaters di terze parti** (fonti solo Windows Update o siti ufficiali dei vendor).
- ❌ **Overclock / Undervolt / Modifiche BIOS automatiche** da software.

---

## 5. Piano di Implementazione a Tranche Progressive

```
[ TRANCHE 6 — Completata: Audit & Progettazione Architetturale ]
       │
       ▼
[ TRANCHE 7 — Core Hardware Faults, Commit Memory & Power Architecture ]
       │  • CfgMgr32: Rilevamento periferiche e driver in errore (Code 10/43/28)
       │  • PSAPI: Commit Charge, Commit Limit e pressione memoria virtuale
       │  • Power Status: Riconoscimento Desktop vs Laptop a batteria
       │  • Health Engine: Nuovi findings deterministici per periferiche e memoria
       │  • Optimization Engine: Triage guasto periferica e contestualizzazione power
       │
       ▼
[ TRANCHE 8 — Startup Intelligence & Network Diagnostics ]
       │  • Startup Apps Registry Audit (Run & StartupApproved)
       │  • Test latenza ICMP on-demand (zero polling continuo)
       │  • Nuove raccomandazioni motivate di avvio e connettività
       │
       ▼
[ TRANCHE 9 — AMD GPU Telemetry Expansion (ADL/ADLX) ]
          • Caricamento dinamico atiadlxx.dll per parità di telemetria su GPU Radeon
```
