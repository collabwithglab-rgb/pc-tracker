# TRANCHE 8 — AUDIT & DESIGN HARDENING
## Windows Service Diagnostics & Event Log Correlation

> **Stato:** AUDIT & DESIGN CONSOLIDATI — PRONTO PER L'IMPLEMENTAZIONE  
> **Data:** 28 Settembre 2026  
> **Baseline di Riferimento:** v3.1.0 | 820/820 test passati | TypeScript strict 0 errori | Vite build OK | Privacy audit OK  
> **Ruolo del Documento:** Fonte tecnica primaria e memoria permanente per l'esecuzione ordinata della Tranche 8 nelle sue sotto-tranche (8A -> 8E).

---

## 1. PRINCIPI FONDAMENTALI DI PROGETTO

1. **Local-First & On-Demand (Zero Demoni, Zero Background Polling):**
   Nessun demone residente, nessun background watcher, nessuna subscription permanente a eventi (`EvtSubscribe` NON utilizzato). L'acquisizione avviene esclusivamente su richiesta esplicita dell'utente ("Riesamina Sistema") o all'apertura del modulo Care Center.
2. **Distinzione Rigorosa tra Livelli Semantici:**
   $$\text{FACT} \neq \text{ANOMALIA} \neq \text{HEALTH FINDING} \neq \text{RECOMMENDATION}$$
   Uno stato `STOPPED` su un servizio demand-started non è un problema; un singolo errore in un log non è un guasto hardware; una correlazione temporale non è una prova di causalità.
3. **Correlazione $\neq$ Causalità:**
   Il motore formula relazioni verificabili di convergenza (*"Il codice di errore 43 sulla GPU è compatibile con i 3 crash del driver grafico registrati"*), mai affermazioni apodittiche non dimostrabili (*"Il driver ha rotto la GPU"*).
4. **Determinismo nel Dominio:**
   Nessuna invocazione a `Date.now()` nei domain engine. Finestre temporali e distanze sono calcolate tramite parametro esplicito `referenceDate` per garantire test unitari riproducibili al 100%.
5. **Minimizzazione dei Dati & Privacy Totale:**
   Nessun dump raw degli Event Log salvato in IndexedDB; nessun dato log incluso nei backup JSON; eliminazione sistematica di PII e percorsi file utente.

---

## 2. RECEPIMENTO DEI CORRETTIVI DI DESIGN HARDENING

### 2.1 Event Log Truncation (Cap $\neq$ Saturazione Diagnostica)
- Il tetto di 50 eventi è un **cap implementativo di salvaguardia** della memoria e dell'IPC, non un indicatore che la diagnosi sia satura.
- **Campi obbligatori:**
  - `truncated: boolean`
  - `returnedEventCount: number`
- **Comportamento:**
  - Se `truncated === false`: risultato completo entro la finestra temporale.
  - Se `truncated === true`: campionamento parziale limitato agli ultimi 50 record più recenti.
  - **Regola UI/Domain:** Vietato presentare `returnedEventCount` come totale reale quando `truncated === true`. La UI mostra: *"Almeno 50 eventi rilevati (campionamento limitato ai più recenti)"*.

### 2.2 Disk Event 51 (Disaccoppiamento da "Bad Block")
- `disk` Event 51 indica un errore I/O o di paging (`device_io_paging_error`), spesso transitorio o legato a timeout del bus/coda I/O.
- Non viene classificato come "bad block" (riservato invece a `disk` Event 7: `bad_block_detected`).
- Severity contestuale: un Event 51 isolato sotto carico non genera allarmi critici; la severità sale ad `ATTENTION` o `WARNING` solo se ripetuto o correlato a contatori SMART di settore difettoso.

### 2.3 NTFS Event 98 (Assenza di "Corruzione Confermata")
- Non usare wording equivalente a *"filesystem corruption confirmed"*.
- Semantica: `filesystem_integrity_issue` con distinzione:
  - `online_scan_recommended` (Event 98 / Spot Fix in linea).
  - `offline_repair_required` (Event 55 con corruzione offline non riparabile a caldo).

### 2.4 WHEA (Decodifica Contestuale Multi-Livello vs Severità Fissa)
- La severità è funzione pura di `(Provider, EventID, ErrorType, Ripetizioni)`:
  - **Event 17 (PCIe Corrected Error):** `ATTENTION` se isolato; `WARNING` solo se ripetuto ad alta frequenza (> 10 eventi).
  - **Event 18 (Uncorrected MCE):** `CRITICAL` (errore hardware fatale/non corretto su core CPU o cache).
  - **Event 19 (Corrected MCE):** `ATTENTION` se singolo; `WARNING` se frequente (instabilità da undervolt o degrado silicio).
  - **Event 47 (Corrected Memory Error):** `ATTENTION` / `WARNING` in base alle occorrenze su RAM ECC.

### 2.5 Kernel-Power 41 (Semantica "Unclean Reboot", Zero Causalità Automatica)
- Semantica: `unexpected_unclean_reboot_detected`.
- Non indica automaticamente BSOD (richiede `BugcheckCode != 0`), né guasto PSU, né guasto hardware.
- Spiegazione sobria: interruzione di alimentazione esterna, pressione pulsante di spegnimento forzato, freeze o crash.

### 2.6 Classificazione Rigorosa delle Dichiarazioni Prestazionali
- **target:** obiettivo di progetto pre-implementazione (es. tempo totale snapshot combinato < 20 ms).
- **estimate:** stima analitica basata sulle specifiche API (es. query SCM < 2 ms, query Wevtapi XPath < 12 ms, buffer Rust < 300 KB).
- **measured:** valore empiricamente verificato con benchmark `Instant::now()` su hardware reale. (Zero processi esterni spawnati è attualmente l'unica metrica promossa a **measured**).

### 2.7 Modello dei Servizi a 3 Classi Contestuali
Nessun servizio viene valutato solo tramite `currentState`:
1. `always_running` (`EventLog`, `RpcSs`, `Winmgmt`): se `STOPPED` $\rightarrow$ anomalia (`WARNING`/`CRITICAL`).
2. `on_demand` (`wuauserv`, `TrustedInstaller`, `VSS`): `STOPPED` è il normale stato a riposo. Anomalia solo se `startType == DISABLED` o `exitCode != 0`.
3. `contextual` (`WinDefend`): `STOPPED` è fisiologico se è presente un antivirus di terze parti registrato in Windows Security Center.

---

## 3. ARCHITETTURA E CONTRATTI DATI DEFINITIVI

### 3.1 Contratto Event Log Nativo (`src/types/diagnostics.ts`)
```typescript
export type EventLogChannel = 'System' | 'Application';

export type EventDiagnosticSeverity = 'info' | 'attention' | 'warning' | 'critical';

export type WheaErrorClassification =
  | 'uncorrected_mce'        // Event 18: Errore fatale/non corretto CPU/bus
  | 'corrected_mce'          // Event 19: Errore corretto CPU/cache
  | 'corrected_pcie'         // Event 17: Errore bus PCIe corretto
  | 'corrected_memory'       // Event 47: Errore memoria ECC corretto
  | 'unknown_whea';

export type StorageErrorClassification =
  | 'bad_block_detected'        // disk Event 7
  | 'device_io_paging_error'   // disk Event 51
  | 'controller_error'         // disk/stornvme Event 11
  | 'filesystem_integrity_issue'; // Ntfs Event 55 / 98

export type NtfsIntegrityState =
  | 'online_scan_recommended'    // Event 98 / Spot fix
  | 'offline_repair_required'    // Event 55 / Corruzione offline
  | 'none';

export interface RawDiagnosticEventFact {
  channel: EventLogChannel;
  provider: string;
  eventId: number;
  level: number;                 // Livello nativo Windows (1=Crit, 2=Err, 3=Warn, 4=Info)
  timestamp: string;             // ISO 8601
  severity: EventDiagnosticSeverity;
  classificationCategory:
    | 'whea'
    | 'kernel_power'
    | 'storage'
    | 'display_tdr'
    | 'service_control_manager'
    | 'unknown';
  specificClassification?: string;
  targetContext?: string;        // Lettera disco, PCI bus ID, o nome driver
  recordId: number;              // ID progressivo per deduplicazione
}

export interface EventLogDiagnosticsSnapshot {
  availability: MetricAvailability;
  source: string;                // "Wevtapi_SystemLog"
  queryTimeWindowHours: number;  // Default: 168 (7 giorni)
  maxEventsCap: number;          // Default: 50
  returnedEventCount: number;    // Numero effettivo eventi estratti
  truncated: boolean;            // true = hit del cap (campionamento parziale); false = query esaustiva
  events: RawDiagnosticEventFact[];
  errorDetails?: string | null;
}
```

### 3.2 Contratto Servizi Windows Nativo (`src/types/diagnostics.ts`)
```typescript
export type WindowsServiceOperationalModel = 'always_running' | 'on_demand' | 'contextual';

export type WindowsServiceState =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'start_pending'
  | 'stop_pending'
  | 'unknown';

export type WindowsServiceStartType =
  | 'auto'
  | 'auto_delayed'
  | 'demand'
  | 'disabled'
  | 'boot'
  | 'system'
  | 'unknown';

export interface WindowsServiceFact {
  serviceName: string;            // es. "wuauserv", "EventLog"
  displayName: string;            // es. "Windows Update", "Windows Event Log"
  operationalModel: WindowsServiceOperationalModel;
  currentState: WindowsServiceState;
  startType: WindowsServiceStartType;
  exitCode: number;               // 0 = successo; != 0 = errore Win32
  isProblematic: boolean;         // Valutazione pura multi-parametro
  problemReason?: string;         // Spiegazione oggettiva dell'anomalia
}

export interface WindowsServicesSnapshot {
  availability: MetricAvailability;
  source: string;                 // "Advapi32_SCM"
  scannedAt: string;
  totalCatalogServices: number;
  problematicServiceCount: number;
  services: WindowsServiceFact[];
  errorDetails?: string | null;
}
```

### 3.3 Contratto Deduplicazione ed Aggregazione (`src/types/diagnostics.ts`)
```typescript
export interface AggregatedDiagnosticGroup {
  groupKey: string;               // provider::eventId::targetContext
  provider: string;
  eventId: number;
  severity: EventDiagnosticSeverity;
  occurrenceCount: number;
  isTruncatedSample: boolean;     // Ereditato da snapshot.truncated
  firstSeen: string;              // ISO timestamp
  lastSeen: string;               // ISO timestamp
  targetContext?: string;
  technicalDescription: string;   // Descrizione controllata senza PII
}
```

### 3.4 Contratto Correlazione Hardware (`src/types/diagnostics.ts`)
```typescript
export type CorrelationStrength =
  | 'DIRECT_MATCH'     // Stesso hardware id, stesso driver, stesso failure code
  | 'RELATED_SIGNAL'   // Stesso sottosistema o tuning profile correlato nel lasso temporale
  | 'WEAK_CONTEXT'     // Segnale compatibile ma privo di legame provato
  | 'NO_CORRELATION';  // Eventi indipendenti

export interface DiagnosticCorrelation {
  id: string;
  strength: CorrelationStrength;
  affectedArea: HealthAffectedArea;
  title: string;
  hardwareEvidence: string;
  eventEvidence: string;
  explanation: string;            // Formula trasparente e non causale
  recommendedActionId?: string;
}
```

---

## 4. PIANO OPERATIVO IN 5 SOTTO-TRANCHE

### 8A — Native Event Log Facts Provider
- **Obiettivo:** Estrazione FFI nativa via `wevtapi.dll` (System Log, query XPath pre-compilata, cap a 50 record, gestione `truncated`).
- **File coinvolti:** `src-tauri/src/diagnostics.rs`, `src-tauri/src/lib.rs`, `src/types/diagnostics.ts`, `src/services/diagnosticsService.ts`.
- **Criterio di Completamento:** 820 test + nuovi test unitari nativi e di fallback web verdi; `truncated` flag correttamente impostato; tempo di esecuzione misurato < 20 ms; commit locale Tranche 8A (senza push).

### 8B — Native Windows Service Facts Provider
- **Obiettivo:** Interrogazione FFI mirata su SCM via `advapi32.dll` per 6 servizi chiave (`EventLog`, `Winmgmt`, `wuauserv`, `TrustedInstaller`, `VSS`, `WinDefend`).
- **File coinvolti:** `src-tauri/src/diagnostics.rs`, `src/types/diagnostics.ts`, `src/services/diagnosticsService.ts`.
- **Criterio di Completamento:** Modello a 3 classi verificato; zero falsi positivi su `wuauserv` e `TrustedInstaller` a riposo; commit locale Tranche 8B (senza push).

### 8C — Pure Domain Correlation & Deduplication Engine
- **Obiettivo:** Creazione di `src/domain/diagnosticCorrelationEngine.ts` per l'aggregazione pura degli eventi e il calcolo deterministico delle correlazioni (GPU TDR, Storage bad block, CPU undervolt vs WHEA).
- **File coinvolti:** `src/domain/diagnosticCorrelationEngine.ts`, `src/domain/__tests__/diagnosticCorrelationEngine.test.ts`.
- **Criterio di Completamento:** 100% deterministico senza `Date.now()`; 50 eventi identici raggruppati in 1; commit locale Tranche 8C (senza push).

### 8D — Health & Optimization Integration
- **Obiettivo:** Estensione della Diagnostic Coverage da 13 a 15 canali (`system_events`, `system_services`). Generazione finding trasparenti e raccomandazioni motivate.
- **File coinvolti:** `src/domain/healthEngine.ts`, `src/domain/optimizationEngine.ts`, `src/types/health.ts`, test correlati.
- **Criterio di Completamento:** Coverage 15 canali; score health isolato e non penalizzato se non supportato; commit locale Tranche 8D (senza push).

### 8E — UI Presentation & Browser Verification
- **Obiettivo:** Visualizzazione sobria e chiara dei fatti correlati in `CareOverviewTab.tsx` e `MaintenancePage.tsx` senza design ansiogeno.
- **File coinvolti:** `src/components/maintenance/CareOverviewTab.tsx`, `src/pages/MaintenancePage.tsx`, test UI.
- **Criterio di Completamento:** Verifica browser reale; Privacy Audit superato al 100%; consolidamento Livello 2 (`git push origin main`).
