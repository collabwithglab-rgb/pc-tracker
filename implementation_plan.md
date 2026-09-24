# IMPLEMENTATION PLAN — TRANCHE 1: NATIVE MONITORING FOUNDATION

> **Ambito:** PC Care Center — Tranche 1  
> **Obiettivo:** Creare il layer nativo di monitoraggio Windows aggregato (`get_monitoring_snapshot`), il contratto TypeScript `MonitoringSnapshot` e il service adapter `monitoringService.ts` con gestione rigorosa di availability, zero polling UI, zero database, zero mock fasulli.

---

## 1. ARCHITETTURA NATIVA ED IPC

```
┌───────────────────────────────────────────────────────────┐
│                     FRONTEND / TYPESCRIPT                 │
│                                                           │
│  src/types/monitoring.ts         src/services/            │
│  (Contratto Typed Snapshot)      monitoringService.ts     │
│                                           │               │
│                                           ▼               │
│                           invoke('get_monitoring_snapshot')│
└───────────────────────────────────────────┬───────────────┘
                                            │ Single IPC Batch
                                            ▼
┌───────────────────────────────────────────────────────────┐
│                     BACKEND NATIVO (RUST)                 │
│                                                           │
│  src-tauri/src/lib.rs ──► registra get_monitoring_snapshot │
│                                  │                        │
│                                  ▼                        │
│  src-tauri/src/monitoring.rs                             │
│  ├── cpu_monitor     (Win32 GetSystemTimes + Registry)    │
│  ├── memory_monitor  (Win32 GlobalMemoryStatusEx)         │
│  ├── gpu_monitor     (D3DKMT / DXGI + Dynamic NVML)       │
│  ├── storage_monitor (Win32 GetDiskFreeSpaceExW)          │
│  └── system_monitor  (Win32 GetTickCount64 + Registry)    │
│                                  │                        │
│                                  ▼                        │
│  Ritorna struct MonitoringSnapshot aggregata in camelCase │
└───────────────────────────────────────────────────────────┘
```

- **Singola chiamata batch IPC:** Unica invocazione `get_monitoring_snapshot()`. Nessun micro-polling separato per CPU, GPU, RAM, Dischi.
- **Nessun thread residente o timer permanente:** La chiamata viene eseguita on-demand su richiesta dell'adapter.
- **Web / Non-Tauri fallback:** In ambiente browser o test, il service restituisce uno stato esplicito `unsupported` / `unavailable`, senza inventare percentuali di carico CPU o temperature fittizie.

---

## 2. SORGENTI WINDOWS UTILIZZATE

1. **CPU:**
   - **Utilizzo:** Win32 `GetSystemTimes` (kernel32.dll). Utilizza una struttura statica thread-safe (`Mutex<Option<CpuMeasurement>>`) che memorizza timestamp e tempi `Idle`, `Kernel`, `User` della misurazione precedente. Se non è presente una misurazione precedente (primo avvio), esegue un delta controllato di 60 ms.
   - **Socket / Core logici:** Win32 `GetActiveProcessorCount` o lettura dal registro `HARDWARE\DESCRIPTION\System\CentralProcessor`.
   - **Frequenza Base:** Registro `HARDWARE\DESCRIPTION\System\CentralProcessor\0\~MHz`.
2. **Memoria RAM:**
   - **Totale, Usata, Libera, % Carico:** Win32 `GlobalMemoryStatusEx`. Già comprovata in `hardware.rs`, sub-millisecondo, zero overhead.
3. **GPU:**
   - **Rilevamento e VRAM:** Enumerazione adapter e lettura memoria dedicata/condivisa tramite Registry / D3DKMT.
   - **Telemetria Deep NVIDIA (NVML dinamico):** Caricamento a runtime di `nvml.dll` (System32 / DriverStore) senza dipendenza statica a tempo di compilazione. Se presente, interroga:
     - `nvmlDeviceGetUtilizationRates` (GPU % e Memory %)
     - `nvmlDeviceGetTemperature` (NVML_TEMPERATURE_GPU)
     - `nvmlDeviceGetClockInfo` (NVML_CLOCK_GRAPHICS, NVML_CLOCK_MEM)
     - `nvmlDeviceGetPowerUsage` (milliWatt $\rightarrow$ Watt)
     - `nvmlDeviceGetFanSpeed` (% RPM)
   - **GPU AMD:** Se NVML è assente e la scheda è AMD, il sistema degrada elegantemente: utilization/VRAM da D3DKMT/Registry e metriche termiche contrassegnate come `unavailable` con reason `"vendor_driver_library_not_found"`.
4. **Storage:**
   - **Volumi Fixed:** Win32 `GetLogicalDriveStringsW` filtrando `DRIVE_FIXED`.
   - **Spazio Totale, Usato, Libero:** Win32 `GetDiskFreeSpaceExW`. Sub-millisecondo, unprivileged.
   - **Label e File System:** Win32 `GetVolumeInformationW`.
5. **System:**
   - **Uptime:** Win32 `GetTickCount64()`.
   - **OS Version & Build:** Registro `SOFTWARE\Microsoft\Windows NT\CurrentVersion` (`ProductName`, `DisplayVersion`, `CurrentBuildNumber`).

---

## 3. METRICHE SUPPORTATE (MVP AFFIDABILE)

| Sottosistema | Metrica | Tipo | Unità | Sorgente |
| :--- | :--- | :--- | :--- | :--- |
| **CPU** | `utilizationPercent` | number | % | Win32 `GetSystemTimes` |
| **CPU** | `logicalProcessorCount` | number | conteggio | Win32 System Info |
| **CPU** | `baseFrequencyMhz` | number | MHz | Win32 Registry |
| **RAM** | `totalBytes` | number | bytes | Win32 `GlobalMemoryStatusEx` |
| **RAM** | `usedBytes` | number | bytes | Win32 `GlobalMemoryStatusEx` |
| **RAM** | `availableBytes` | number | bytes | Win32 `GlobalMemoryStatusEx` |
| **RAM** | `utilizationPercent` | number | % | Win32 `GlobalMemoryStatusEx` |
| **GPU** | `name`, `vendor`, `isDiscrete` | string, bool | - | Win32 Registry / Adapter Enum |
| **GPU** | `vramTotalBytes`, `vramUsedBytes` | number | bytes | Registry / NVML / D3DKMT |
| **GPU** | `vramUtilizationPercent` | number | % | Calcolato (Used / Total * 100) |
| **GPU (NVML)**| `coreTemperatureCelsius` | number | °C | `nvmlDeviceGetTemperature` |
| **GPU (NVML)**| `coreClockMhz`, `memoryClockMhz` | number | MHz | `nvmlDeviceGetClockInfo` |
| **GPU (NVML)**| `powerWatts` | number | W | `nvmlDeviceGetPowerUsage` |
| **GPU (NVML)**| `fanSpeedPercent` | number | % | `nvmlDeviceGetFanSpeed` |
| **Storage** | `driveLetter`, `label`, `fileSystem` | string | - | Win32 `GetVolumeInformationW` |
| **Storage** | `totalBytes`, `usedBytes`, `freeBytes` | number | bytes | Win32 `GetDiskFreeSpaceExW` |
| **Storage** | `utilizationPercent` | number | % | Calcolato (Used / Total * 100) |
| **System** | `osVersion`, `osBuild` | string | - | Win32 Registry `CurrentVersion` |
| **System** | `uptimeSeconds` | number | s | Win32 `GetTickCount64` |

---

## 4. METRICHE OPZIONALI E NON DISPONIBILI (GRACEFUL DEGRADATION)

- **CPU Package Temperature:** Contrassegnata come `availability: "unsupported"`, reason: `"requires_kernel_driver"`. Nessun valore fittizio.
- **CPU Package Power:** Contrassegnata come `availability: "unsupported"`.
- **GPU Hotspot Temperature:** Se supportata da NVML viene popolata; in caso contrario `availability: "unavailable"`.
- **GPU Clocks / Power / Fan su GPU Integrate o AMD senza ADL:** Contrassegnate come `availability: "unavailable"`, reason: `"vendor_telemetry_source_unavailable"`.

---

## 5. AVAILABILITY MODEL (ZERO VALORI FITTIZI)

Ogni campo telemetrico dinamico opzionale è incapsulato in un contratto typed:

```typescript
export type MetricAvailability =
  | 'available'          // Dato misurato presente ed affidabile
  | 'unavailable'        // Sensore/fonte momentaneamente o permanentemente non disponibile
  | 'unsupported'        // Non supportato dall'OS/hardware senza privilegi speciali (es. CPU temp)
  | 'permission_error'   // Richiede privilegi non concessi
  | 'error';             // Errore durante l'interrogazione

export interface MetricValue<T> {
  value: T | null;
  availability: MetricAvailability;
  unit?: string;
  source: string;
  reason?: string;
}
```

Regola tassativa: non viene mai restituito `0`, `-1`, `999` o `NaN` per indicare assenza di dato. Se `availability !== 'available'`, `value` è `null`.

---

## 6. IPC CONTRACT

```typescript
export interface MonitoringSnapshot {
  timestamp: string;               // ISO 8601
  status: 'success' | 'partial' | 'unsupported';
  cpu: {
    utilizationPercent: MetricValue<number>;
    logicalProcessorCount: number;
    baseFrequencyMhz: MetricValue<number>;
    packageTemperatureCelsius: MetricValue<number>;
    packagePowerWatts: MetricValue<number>;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    utilizationPercent: number;
  };
  gpus: Array<{
    id: string;
    name: string;
    vendor: string;
    isDiscrete: boolean;
    utilizationPercent: MetricValue<number>;
    vramTotalBytes: MetricValue<number>;
    vramUsedBytes: MetricValue<number>;
    vramUtilizationPercent: MetricValue<number>;
    coreTemperatureCelsius: MetricValue<number>;
    hotspotTemperatureCelsius: MetricValue<number>;
    coreClockMhz: MetricValue<number>;
    memoryClockMhz: MetricValue<number>;
    powerWatts: MetricValue<number>;
    fanSpeedPercent: MetricValue<number>;
  }>;
  storage: Array<{
    driveLetter: string;
    label: string;
    fileSystem: string;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    utilizationPercent: number;
  }>;
  system: {
    osVersion: string;
    osBuild: string;
    uptimeSeconds: number;
  };
}
```

Serde serializza tutti i campi Rust con `#[serde(rename_all = "camelCase")]` per garantire perfetta corrispondenza con il frontend TypeScript.

---

## 7. ERROR HANDLING

- Se `nvml.dll` fallisce il caricamento o `nvmlInit` ritorna errore, l'errore viene catturato e registrato nel campo `reason` delle sole metriche GPU interessate; RAM, CPU e Dischi continuano a essere rilevati.
- Se un volume disco non risponde, viene escluso o registrato senza interrompere gli altri dischi.
- `get_monitoring_snapshot` ritorna sempre `Ok(MonitoringSnapshot)` strutturato con `status: 'success'` o `status: 'partial'`.

---

## 8. TEST STRATEGY

1. **Test TypeScript (`src/services/__tests__/monitoringService.test.ts`):**
   - Verifica comportamento in ambiente Web / non-Tauri (ritorna `status: 'unsupported'`, `value: null`, zero mock numerici).
   - Validazione del contratto di parsing di uno snapshot reale.
   - Verifica conformità dell'availability model (gestione `unsupported`, `unavailable`, `available`).
   - Calcolo coerente percentuali VRAM e Storage.
2. **Verifica Rust (`cargo check`):**
   - Compilazione nativa del modulo `monitoring.rs` in `src-tauri`.
3. **Verifica Reale su Windows:**
   - Esecuzione dello script di test o invocazione diretta su Windows per verificare che CPU, RAM, GPU, Dischi e Sistema vengano rilevati correttamente sull'hardware locale.
4. **Verifiche di Regressione:**
   - `npm test -- --run` (584 test preesistenti + nuovi test monitoring).
   - `npx tsc --noEmit` (zero errori di tipo).
   - `npm run build` (build Vite + tsc OK).
   - `npm run audit:privacy` (nessuna fuga di dati personali o telemetria).
