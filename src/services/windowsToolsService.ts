import {
  WindowsToolResult,
  VolumeDriveInfo,
  RecycleBinInfo,
  HibernateStatus,
  TrimConfigStatus,
  ScanNowResult,
} from '../types/windowsTools';
import { isDesktopApp } from './desktopService';
import { evaluateScanNowRecommendations } from '../domain/windowsToolsEngine';

/**
 * Fallback realistico per ambiente Web o Vitest
 */
const MOCK_VOLUMES: VolumeDriveInfo[] = [
  {
    driveLetter: 'C:',
    label: 'Windows 11',
    fileSystem: 'NTFS',
    totalBytes: 1999386984448, // 2 TB
    freeBytes: 1145930825728,  // 1.14 TB
    isSSD: true,
    mediaType: 'SSD',
    busType: 'NVMe',
    friendlyName: 'Samsung SSD 990 PRO 2TB',
    healthStatus: 'Healthy',
    operationalStatus: 'OK',
    trimSupported: true,
  },
  {
    driveLetter: 'D:',
    label: 'Storage & Giochi',
    fileSystem: 'NTFS',
    totalBytes: 1000187359232, // 1 TB
    freeBytes: 822894436352,   // 822 GB
    isSSD: true,
    mediaType: 'SSD',
    busType: 'NVMe',
    friendlyName: 'Crucial P3 Plus 1TB SSD',
    healthStatus: 'Healthy',
    operationalStatus: 'OK',
    trimSupported: true,
  },
];

const MOCK_RECYCLE_BIN: RecycleBinInfo = {
  itemCount: 28,
  totalSizeBytes: 1024 * 1024 * 340, // ~340 MB
};

const MOCK_HIBERNATE: HibernateStatus = {
  enabled: false,
  fileSizeGb: undefined,
  canToggle: true,
  details: 'Lo spazio su disco dedicato ad hiberfil.sys è stato liberato.',
};

/**
 * Verifica se PC Tracker è in esecuzione con privilegi amministrativi (UAC).
 */
export async function checkSystemElevation(): Promise<boolean> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('check_system_elevation');
    } catch (err) {
      console.warn('check_system_elevation fallback:', err);
    }
  }
  return false;
}

/**
 * Esegue la scansione dei volumi di archiviazione locali (Read-Only, non richiede elevazione).
 */
export async function scanStorageVolumes(): Promise<WindowsToolResult<VolumeDriveInfo[]>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<VolumeDriveInfo[]>>('scan_storage_volumes');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore scansione volumi nativa: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Rilevati 2 volumi di archiviazione (Modalità Web simulata).',
    data: MOCK_VOLUMES,
    durationMs: 120,
    requiresElevation: false,
  };
}

/**
 * Interroga lo stato della configurazione TRIM di Windows a livello globale (Read-Only).
 */
export async function queryTrimConfiguration(): Promise<WindowsToolResult<TrimConfigStatus>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<TrimConfigStatus>>('query_trim_config');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore verifica configurazione TRIM: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'TRIM Windows è abilitato a livello di sistema operativo.',
    details: 'NTFS DisableDeleteNotify = 0  (Allows TRIM operations to be sent to the storage device)',
    data: {
      enabled: true,
      details: 'NTFS DisableDeleteNotify = 0',
    },
    durationMs: 45,
    requiresElevation: false,
  };
}

/**
 * Esegue l'ottimizzazione TRIM mirata su uno specifico volume SSD (es. "C:").
 * Richiede elevazione UAC Windows.
 */
export async function runSsdTrim(driveLetter: string): Promise<WindowsToolResult<string>> {
  const cleanLetter = driveLetter.replace(':', '').trim().toUpperCase();
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('run_ssd_trim', { driveLetter: cleanLetter });
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore esecuzione TRIM: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `Ottimizzazione TRIM completata con successo sull'unità ${cleanLetter}: (simulata in ambiente web)`,
    details: `Inviati comandi ReTrim al controller SSD per l'unità ${cleanLetter}:.`,
    data: `TRIM ${cleanLetter}: completato`,
    durationMs: 1250,
    requiresElevation: true,
  };
}

/**
 * Interroga lo stato e l'occupazione del Cestino di Windows (Read-Only).
 */
export async function queryRecycleBin(): Promise<WindowsToolResult<RecycleBinInfo>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<RecycleBinInfo>>('query_recycle_bin');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore interrogazione Cestino: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `Il Cestino contiene ${MOCK_RECYCLE_BIN.itemCount} elementi (${(MOCK_RECYCLE_BIN.totalSizeBytes / (1024 * 1024)).toFixed(0)} MB).`,
    data: MOCK_RECYCLE_BIN,
    durationMs: 80,
    requiresElevation: false,
  };
}

/**
 * Svuota il Cestino di Windows (operazione utente).
 */
export async function emptyRecycleBin(driveLetter?: string): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('empty_recycle_bin', { driveLetter: driveLetter || null });
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore svuotamento Cestino: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Cestino di Windows svuotato con successo.',
    details: 'Tutti gli elementi rimossi sono stati eliminati definitivamente.',
    durationMs: 420,
    requiresElevation: false,
  };
}

/**
 * Interroga lo stato dell'ibernazione Windows (Read-Only).
 */
export async function getHibernateStatus(): Promise<WindowsToolResult<HibernateStatus>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<HibernateStatus>>('get_hibernate_status');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore interrogazione ibernazione: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'L\'ibernazione di Windows è disattivata.',
    details: MOCK_HIBERNATE.details,
    data: MOCK_HIBERNATE,
    durationMs: 15,
    requiresElevation: false,
  };
}

/**
 * Abilita o disabilita l'ibernazione Windows (powercfg /hibernate on|off).
 * Richiede elevazione UAC.
 */
export async function setHibernateEnabled(enabled: boolean): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('set_hibernate_enabled', { enabled });
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore modifica ibernazione: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: enabled
      ? 'Ibernazione di Windows abilitata con successo (simulato).'
      : 'Ibernazione di Windows disabilitata con successo (simulato).',
    durationMs: 650,
    requiresElevation: true,
  };
}

/**
 * Avvia lo strumento nativo di sistema Pulizia Disco di Windows (cleanmgr.exe).
 */
export async function openDiskCleanup(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('open_disk_cleanup');
    } catch (err) {
      return {
        status: 'failed',
        message: `Impossibile avviare Pulizia disco: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Strumento Pulizia disco di Windows avviato con successo.',
    details: 'In ambiente web, apri manualmente cleanmgr da Windows (Win+R -> cleanmgr).',
    durationMs: 50,
    requiresElevation: false,
  };
}

/**
 * Esegue la verifica non distruttiva dei file di sistema Windows (sfc /verifyonly).
 */
export async function verifySystemFiles(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('verify_system_files');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore durante la verifica file di sistema: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Nessuna violazione di integrità rilevata nei file di sistema Windows (simulato).',
    details: 'Protezione risorse di Windows: nessuna violazione di integrità riscontrata.',
    durationMs: 2100,
    requiresElevation: true,
  };
}

/**
 * Esegue una scansione online non distruttiva del file system (chkdsk <Drive>: /scan).
 */
export async function checkDiskReadonly(driveLetter: string): Promise<WindowsToolResult<string>> {
  const clean = driveLetter.replace(':', '').trim().toUpperCase();
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('check_disk_readonly', { driveLetter: clean });
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore scansione file system: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `File system del volume ${clean}: integro, nessuna anomalia rilevata.`,
    details: 'Scansione online del file system completata. Nessun settore danneggiato o corruzione di indice riscontrata.',
    durationMs: 1800,
    requiresElevation: true,
  };
}

/**
 * Esegue la diagnosi complessiva non distruttiva SCAN NOW:
 * 1. Scansione volumi e spazio disco
 * 2. Stato globale TRIM Windows
 * 3. Stato Cestino
 * 4. Stato Ibernazione
 * 5. Generazione raccomandazioni tecniche oggettive
 */
export async function executeDiagnosticScanNow(): Promise<ScanNowResult> {
  const [volumesRes, trimRes, binRes, hiberRes] = await Promise.all([
    scanStorageVolumes(),
    queryTrimConfiguration(),
    queryRecycleBin(),
    getHibernateStatus(),
  ]);

  const drives = volumesRes.data || [];
  const trimEnabled = trimRes.data?.enabled ?? true;
  const recycleBin = binRes.data || { itemCount: 0, totalSizeBytes: 0 };
  const hibernate = hiberRes.data || { enabled: false, canToggle: true };

  // Verifica se tutti i volumi hanno stato operativo sano
  const drivesChecked = drives.map((d) => ({
    driveLetter: d.driveLetter,
    healthStatus: d.healthStatus || 'Healthy',
    operationalStatus: d.operationalStatus || 'OK',
  }));
  const allHealthy = drivesChecked.every(
    (d) => d.healthStatus.toLowerCase().includes('healthy') && d.operationalStatus.toLowerCase().includes('ok')
  );

  const partialScan: Partial<ScanNowResult> = {
    drives,
    recycleBin,
    systemFilesStatus: 'not_tested',
  };

  const recommendations = evaluateScanNowRecommendations(partialScan);

  const overallStatus = recommendations.some((r) => r.actionType === 'open_cleanmgr' || r.actionType === 'sfc_scan')
    ? 'warning'
    : 'healthy';

  return {
    scannedAt: new Date().toISOString(),
    overallStatus,
    drives,
    trimConfiguration: {
      enabled: trimEnabled,
      details: trimRes.details || trimRes.message,
    },
    fileSystemHealth: {
      healthy: allHealthy,
      drivesChecked,
      details: allHealthy
        ? 'Tutti i volumi di archiviazione risultano operativi e in stato integro.'
        : 'Rilevati volumi con stato operativo da verificare.',
    },
    systemFilesStatus: 'not_tested',
    systemFilesMessage: 'Verifica manuale disponibile nella scheda Windows Tools.',
    imageHealthStatus: 'not_tested',
    hibernate,
    recycleBin,
    recommendedActions: recommendations,
  };
}
