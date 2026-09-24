/**
 * Service Adapter per il Monitoraggio Hardware Nativo (PC Care Center - Tranche 1)
 * 
 * Fornisce accesso al comando Tauri batch `get_monitoring_snapshot` su Windows,
 * con fallback esplicito e non simulato in ambiente Web / browser.
 */

import { isDesktopApp } from './desktopService';
import {
  MonitoringSnapshot,
  MetricValue,
  GpuMonitoringData,
} from '../types/monitoring';

export const UNSUPPORTED_WEB_SNAPSHOT: MonitoringSnapshot = {
  timestamp: new Date().toISOString(),
  status: 'unsupported',
  cpu: {
    utilizationPercent: {
      value: null,
      availability: 'unsupported',
      unit: '%',
      source: 'Web_Browser',
      reason: 'Live Windows hardware monitoring is only available when running in the Tauri desktop app.',
    },
    logicalProcessorCount: 0,
    baseFrequencyMhz: {
      value: null,
      availability: 'unsupported',
      unit: 'MHz',
      source: 'Web_Browser',
      reason: 'Requires native desktop environment.',
    },
    packageTemperatureCelsius: {
      value: null,
      availability: 'unsupported',
      unit: '°C',
      source: 'Web_Browser',
      reason: 'Requires native desktop environment.',
    },
    packagePowerWatts: {
      value: null,
      availability: 'unsupported',
      unit: 'W',
      source: 'Web_Browser',
      reason: 'Requires native desktop environment.',
    },
  },
  memory: {
    totalBytes: 0,
    usedBytes: 0,
    availableBytes: 0,
    utilizationPercent: 0,
  },
  gpus: [],
  storage: [],
  system: {
    osVersion: 'Web Browser Environment',
    osBuild: 'N/A',
    uptimeSeconds: 0,
  },
};

/**
 * Interroga il backend Tauri per ottenere una fotografia aggregata ed istantanea
 * della telemetria hardware e del sistema Windows.
 * 
 * In ambiente Web/Browser: restituisce uno stato esplicito `unsupported` con valori `null`,
 * senza inventare numeri casuali o simulare carichi hardware fittizi.
 */
export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const snapshot = await invoke<MonitoringSnapshot>('get_monitoring_snapshot');
      if (snapshot && typeof snapshot === 'object') {
        return snapshot;
      }
    } catch (err) {
      console.warn('Errore durante l\'invocazione di get_monitoring_snapshot:', err);
      return {
        ...UNSUPPORTED_WEB_SNAPSHOT,
        status: 'error',
        timestamp: new Date().toISOString(),
        cpu: {
          ...UNSUPPORTED_WEB_SNAPSHOT.cpu,
          utilizationPercent: {
            value: null,
            availability: 'error',
            source: 'Tauri_Invoke',
            reason: (err as Error)?.message || 'Tauri invoke failed',
          },
        },
      };
    }
  }

  // Ambiente Web / Test: fallback esplicito non simulato
  return {
    ...UNSUPPORTED_WEB_SNAPSHOT,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Type-guard che verifica se un valore telemetrico è effettivamente disponibile e valorizzato.
 * Se availability !== 'available' o il valore è null/undefined, restituisce false.
 */
export function isMetricAvailable<T>(
  metric?: MetricValue<T> | null
): metric is MetricValue<T> & { value: T } {
  return (
    metric !== null &&
    metric !== undefined &&
    metric.availability === 'available' &&
    metric.value !== null &&
    metric.value !== undefined
  );
}

/**
 * Formatta un valore metrico con la sua eventuale unità di misura.
 * Se il valore non è disponibile, restituisce `fallbackText` (default: 'N/D').
 */
export function formatMetricValue<T>(
  metric?: MetricValue<T> | null,
  fallbackText: string = 'N/D'
): string {
  if (!isMetricAvailable(metric)) {
    return fallbackText;
  }
  const unitSuffix = metric.unit ? ` ${metric.unit}` : '';
  return `${metric.value}${unitSuffix}`;
}

/**
 * Estrae un riassunto dei segnali principali dello snapshot.
 */
export function extractSnapshotVitals(snapshot: MonitoringSnapshot): {
  isSupported: boolean;
  cpuUtilization: number | null;
  memoryUtilization: number;
  primaryGpu: GpuMonitoringData | null;
  fixedStorageCount: number;
} {
  const isSupported = snapshot.status !== 'unsupported';
  const cpuUtilization = isMetricAvailable(snapshot.cpu.utilizationPercent)
    ? snapshot.cpu.utilizationPercent.value
    : null;
  const memoryUtilization = snapshot.memory.totalBytes > 0
    ? snapshot.memory.utilizationPercent
    : 0;
  const primaryGpu = snapshot.gpus.length > 0 ? snapshot.gpus[0] : null;

  return {
    isSupported,
    cpuUtilization,
    memoryUtilization,
    primaryGpu,
    fixedStorageCount: snapshot.storage.length,
  };
}
