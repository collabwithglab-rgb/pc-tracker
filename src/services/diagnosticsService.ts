/**
 * Service Adapter per la Diagnostica di Sistema Nativa (Tranche 7)
 * 
 * Interroga il comando batch Tauri `get_system_diagnostics_snapshot` su Windows,
 * con fallback trasparente ed esplicito in ambiente Web / browser.
 */

import { isDesktopApp } from './desktopService';
import { SystemDiagnosticsSnapshot } from '../types/diagnostics';

export const UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT: SystemDiagnosticsSnapshot = {
  timestamp: new Date().toISOString(),
  status: 'unsupported',
  deviceProblems: {
    availability: 'unsupported',
    source: 'CM_Get_DevNode_Status',
    totalDevicesScanned: 0,
    problemCount: 0,
    devicesWithProblems: [],
    errorDetails: 'Device fault diagnostics require Windows desktop application environment.',
  },
  memoryCommit: {
    availability: 'unsupported',
    source: 'GetPerformanceInfo',
    commitTotalBytes: 0,
    commitLimitBytes: 0,
    commitPeakBytes: 0,
    physicalTotalBytes: 0,
    physicalAvailableBytes: 0,
    systemCacheBytes: 0,
    kernelPagedBytes: 0,
    kernelNonpagedBytes: 0,
    processCount: 0,
    threadCount: 0,
    commitUtilizationPercent: 0,
    physicalUtilizationPercent: 0,
    errorDetails: 'Memory commit performance info requires Windows desktop application environment.',
  },
  powerStatus: {
    availability: 'unsupported',
    source: 'GetSystemPowerStatus',
    acLineStatus: 255,
    batteryFlag: 255,
    batteryLifePercent: null,
    batterySaverActive: false,
    hasSystemBattery: false,
    isOnAC: null,
    isOnBattery: null,
    powerArchitecture: 'unknown',
    errorDetails: 'Power status architecture facts require Windows desktop application environment.',
  },
  eventLog: {
    availability: 'unsupported',
    source: 'Wevtapi_SystemLog',
    queryTimeWindowHours: 168,
    maxEventsCap: 50,
    returnedEventCount: 0,
    truncated: false,
    events: [],
    errorDetails: 'Event Log diagnostics require Windows desktop application environment.',
  },
  systemServices: {
    availability: 'unsupported',
    source: 'Advapi32_SCM',
    scannedAt: new Date().toISOString(),
    catalogCount: 6,
    services: [],
    errorDetails: 'Windows Services diagnostics require Windows desktop application environment.',
  },
  collectionDurationMs: 0,
};

/**
 * Interroga il backend Tauri per ottenere una fotografia diagnostica batch di:
 * 1. Device & Driver Problem Status (CM_Get_DevNode_Status)
 * 2. Memory Commit & Physical RAM (GetPerformanceInfo)
 * 3. Power Architecture & Battery State (GetSystemPowerStatus)
 * 4. Native Event Log Facts (Wevtapi_SystemLog)
 * 5. Native Windows Services Facts (Advapi32_SCM)
 */
export async function getSystemDiagnosticsSnapshot(): Promise<SystemDiagnosticsSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const snapshot = await invoke<SystemDiagnosticsSnapshot>('get_system_diagnostics_snapshot');
      if (snapshot && typeof snapshot === 'object') {
        return snapshot;
      }
    } catch (err) {
      console.warn('Errore durante l\'invocazione di get_system_diagnostics_snapshot:', err);
      return {
        ...UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT,
        status: 'error',
        timestamp: new Date().toISOString(),
        deviceProblems: {
          ...UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.deviceProblems,
          availability: 'error',
          errorDetails: (err as Error)?.message || 'Tauri invoke failed',
        },
        memoryCommit: {
          ...UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.memoryCommit,
          availability: 'error',
          errorDetails: (err as Error)?.message || 'Tauri invoke failed',
        },
        powerStatus: {
          ...UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.powerStatus,
          availability: 'error',
          errorDetails: (err as Error)?.message || 'Tauri invoke failed',
        },
        eventLog: {
          availability: 'error',
          source: 'Wevtapi_SystemLog',
          queryTimeWindowHours: 168,
          maxEventsCap: 50,
          returnedEventCount: 0,
          truncated: false,
          events: [],
          errorDetails: (err as Error)?.message || 'Tauri invoke failed',
        },
        systemServices: {
          availability: 'error',
          source: 'Advapi32_SCM',
          scannedAt: new Date().toISOString(),
          catalogCount: 6,
          services: [],
          errorDetails: (err as Error)?.message || 'Tauri invoke failed',
        },
      };
    }
  }

  // Ambiente Web / Test: fallback esplicito non simulato
  return {
    ...UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT,
    timestamp: new Date().toISOString(),
  };
}
