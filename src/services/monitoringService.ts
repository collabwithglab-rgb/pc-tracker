/**
 * Service Adapter per il Monitoraggio Hardware Nativo (PC Care Center - Tranche 1)
 * 
 * Fornisce accesso al comando Tauri batch `get_monitoring_snapshot` su Windows,
 * con fallback esplicito e non simulato in ambiente Web / browser.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

// ---------------------------------------------------------------------------
// CIRCULAR BUFFER (30 CAMPIONI VOLATILI IN MEMORIA)
// ---------------------------------------------------------------------------

const MAX_BUFFER_SIZE = 30;
const snapshotBuffer: MonitoringSnapshot[] = [];

/**
 * Restituisce una copia immutabile dei campioni memorizzati nel buffer volatile.
 */
export function getSnapshotBuffer(): readonly MonitoringSnapshot[] {
  return [...snapshotBuffer];
}

/**
 * Azzera il buffer volatile (utile per test o cambio sessione).
 */
export function clearSnapshotBuffer(): void {
  snapshotBuffer.length = 0;
}

/**
 * Inserisce un nuovo snapshot nel buffer circolare mantenendo la dimensione massima a 30.
 */
export function pushToSnapshotBuffer(snapshot: MonitoringSnapshot): void {
  if (snapshotBuffer.length >= MAX_BUFFER_SIZE) {
    snapshotBuffer.shift();
  }
  snapshotBuffer.push(snapshot);
}

// ---------------------------------------------------------------------------
// LIVE POLLING SERVICE CON SMART PAUSE (ON BLUR / HIDDEN)
// ---------------------------------------------------------------------------

export type LiveMonitoringCallback = (
  snapshot: MonitoringSnapshot,
  meta: { isSmartPaused: boolean; bufferLength: number }
) => void;

export interface LiveMonitoringOptions {
  intervalMs?: number;
  enableSmartPause?: boolean;
}

/**
 * Avvia il ciclo di polling live della telemetria hardware.
 * Integra la logica di Smart Pause: quando la finestra dell'applicazione
 * è in background o minimizzata, il polling si arresta azzerando l'overhead CPU.
 */
export function startLiveMonitoring(
  callback: LiveMonitoringCallback,
  options?: LiveMonitoringOptions
): () => void {
  const intervalMs = options?.intervalMs ?? 2000;
  const enableSmartPause = options?.enableSmartPause ?? true;

  let timerId: ReturnType<typeof setInterval> | null = null;
  let isWindowFocused = typeof document !== 'undefined' ? !document.hidden : true;
  let isSmartPaused = false;
  let isActive = true;

  const poll = async () => {
    if (!isActive) return;

    if (enableSmartPause && !isWindowFocused) {
      if (!isSmartPaused) {
        isSmartPaused = true;
        const lastSnapshot = snapshotBuffer[snapshotBuffer.length - 1] || UNSUPPORTED_WEB_SNAPSHOT;
        callback(lastSnapshot, { isSmartPaused: true, bufferLength: snapshotBuffer.length });
      }
      return;
    }

    isSmartPaused = false;
    const snapshot = await getMonitoringSnapshot();
    if (!isActive) return;

    pushToSnapshotBuffer(snapshot);
    callback(snapshot, { isSmartPaused: false, bufferLength: snapshotBuffer.length });
  };

  const handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    const isVisible = !document.hidden;
    isWindowFocused = isVisible;
    if (isVisible && isActive) {
      poll();
    }
  };

  const handleFocus = () => {
    isWindowFocused = true;
    if (isActive) poll();
  };

  const handleBlur = () => {
    isWindowFocused = false;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Esecuzione immediata primo tick
  poll();
  timerId = setInterval(poll, intervalMs);

  return () => {
    isActive = false;
    if (timerId !== null) clearInterval(timerId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

// ---------------------------------------------------------------------------
// REACT HOOK: useLiveMonitoring
// ---------------------------------------------------------------------------

export interface UseLiveMonitoringResult {
  currentSnapshot: MonitoringSnapshot | null;
  snapshots: readonly MonitoringSnapshot[];
  isSmartPaused: boolean;
  isSupported: boolean;
  isPolling: boolean;
  pause: () => void;
  resume: () => void;
  refreshNow: () => Promise<void>;
}

export function useLiveMonitoring(
  options?: { enabled?: boolean; intervalMs?: number }
): UseLiveMonitoringResult {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 2000;

  const [currentSnapshot, setCurrentSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [snapshots, setSnapshots] = useState<readonly MonitoringSnapshot[]>([]);
  const [isSmartPaused, setIsSmartPaused] = useState<boolean>(false);
  const [isPausedManually, setIsPausedManually] = useState<boolean>(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  const refreshNow = useCallback(async () => {
    const snapshot = await getMonitoringSnapshot();
    pushToSnapshotBuffer(snapshot);
    setCurrentSnapshot(snapshot);
    setSnapshots(getSnapshotBuffer());
  }, []);

  const pause = useCallback(() => {
    setIsPausedManually(true);
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setIsPausedManually(false);
  }, []);

  useEffect(() => {
    if (!enabled || isPausedManually) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    const stop = startLiveMonitoring(
      (snapshot, meta) => {
        setCurrentSnapshot(snapshot);
        setIsSmartPaused(meta.isSmartPaused);
        setSnapshots(getSnapshotBuffer());
      },
      { intervalMs, enableSmartPause: true }
    );

    cleanupRef.current = stop;

    return () => {
      stop();
      cleanupRef.current = null;
    };
  }, [enabled, isPausedManually, intervalMs]);

  const isSupported = currentSnapshot ? currentSnapshot.status !== 'unsupported' : true;

  return {
    currentSnapshot,
    snapshots,
    isSmartPaused,
    isSupported,
    isPolling: enabled && !isPausedManually && !isSmartPaused,
    pause,
    resume,
    refreshNow,
  };
}
