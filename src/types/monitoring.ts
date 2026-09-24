/**
 * Tipi e contratti per il Monitoraggio Hardware Nativo di Windows (PC Care Center - Tranche 1)
 */

export type MetricAvailability =
  | 'available'          // Dato misurato presente ed affidabile
  | 'unavailable'        // Sensore/fonte momentaneamente o permanentemente non disponibile
  | 'unsupported'        // Non supportato dall'OS/hardware senza privilegi speciali (es. CPU temp senza driver kernel)
  | 'permission_error'   // Richiede privilegi non concessi
  | 'error';             // Errore durante l'interrogazione

/**
 * Rappresenta un singolo valore telemetrico con metadati di affidabilità ed origine.
 * Se availability !== 'available', value DEVE essere null. Mai valori fittizi (-1, 0, 999, NaN).
 */
export interface MetricValue<T> {
  value: T | null;
  availability: MetricAvailability;
  unit?: string;
  source: string;
  reason?: string;
}

export interface CpuMonitoringData {
  utilizationPercent: MetricValue<number>;
  logicalProcessorCount: number;
  baseFrequencyMhz: MetricValue<number>;
  packageTemperatureCelsius: MetricValue<number>;
  packagePowerWatts: MetricValue<number>;
}

export interface MemoryMonitoringData {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  utilizationPercent: number;
}

export interface GpuMonitoringData {
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
}

export interface StorageVolumeMonitoringData {
  driveLetter: string;
  label: string;
  fileSystem: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  utilizationPercent: number;
}

export interface SystemMonitoringData {
  osVersion: string;
  osBuild: string;
  uptimeSeconds: number;
}

export type SnapshotStatus = 'success' | 'partial' | 'unsupported' | 'error';

/**
 * Fotografia aggregata dello stato istantaneo del sistema.
 * Generata da una singola chiamata batch nativa get_monitoring_snapshot().
 */
export interface MonitoringSnapshot {
  timestamp: string;               // ISO 8601
  status: SnapshotStatus;
  cpu: CpuMonitoringData;
  memory: MemoryMonitoringData;
  gpus: GpuMonitoringData[];
  storage: StorageVolumeMonitoringData[];
  system: SystemMonitoringData;
}
