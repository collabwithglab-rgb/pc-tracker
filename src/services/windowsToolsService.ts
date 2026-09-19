import {
  WindowsToolResult,
  VolumeDriveInfo,
  RecycleBinInfo,
  HibernateStatus,
  TrimConfigStatus,
  ScanNowResult,
  SecurityAuditData,
  DiskSmartHealth,
  ShaderCacheCleanResult,
  WinGetUpdateItem,
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

const MOCK_SECURITY_AUDIT: SecurityAuditData = {
  secureBootEnabled: true,
  tpmPresent: true,
  tpmReady: true,
  vbsRunning: true,
  hvciRunning: true,
  hostsFileClean: true,
  hostsCustomEntriesCount: 0,
  details: 'Configurazione di sicurezza kernel e bootloader ottimale.',
};

const MOCK_SMART_HEALTH: DiskSmartHealth[] = [
  {
    deviceId: '0',
    friendlyName: 'Samsung SSD 990 PRO 2TB',
    mediaType: 'SSD',
    temperatureCelsius: 41,
    wearPercentage: 3,
    readErrorsTotal: 0,
    writeErrorsTotal: 0,
    powerOnHours: 2450,
    healthStatus: 'Healthy',
  },
  {
    deviceId: '1',
    friendlyName: 'Crucial P3 Plus 1TB SSD',
    mediaType: 'SSD',
    temperatureCelsius: 38,
    wearPercentage: 1,
    readErrorsTotal: 0,
    writeErrorsTotal: 0,
    powerOnHours: 1200,
    healthStatus: 'Healthy',
  },
];

const MOCK_SHADER_CACHE: ShaderCacheCleanResult = {
  filesRemoved: 142,
  bytesFreed: 1024 * 1024 * 380, // ~380 MB
  details: 'Rimossi 142 file di cache temporanea DirectX/GPU.',
};

const MOCK_WINGET_UPDATES: WinGetUpdateItem[] = [
  {
    name: 'Microsoft Visual C++ 2015-2022 Redistributable (x64)',
    id: 'Microsoft.VCRedist.2015+.x64',
    installedVersion: '14.40.33810.0',
    availableVersion: '14.42.34433.0',
  },
  {
    name: '7-Zip',
    id: '7zip.7zip',
    installedVersion: '24.08',
    availableVersion: '24.09',
  },
];

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

/**
 * Crea un punto di ripristino di sistema 1-click prima di qualsiasi modifica.
 */
export async function createRestorePoint(description?: string): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('create_restore_point', {
        description: description || null,
      });
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore creazione punto di ripristino: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  const pointName = description || 'PC Tracker Pre-Tweak Safety Point';
  return {
    status: 'success',
    message: `Punto di ripristino '${pointName}' creato con successo (simulato).`,
    details: 'Snapshot del registro di sistema e dei file critici salvato nel catalogo Ripristino configurazione di sistema.',
    data: pointName,
    durationMs: 1450,
    requiresElevation: true,
  };
}

/**
 * Esegue l'audit rapido di sicurezza e integrità kernel (Secure Boot, TPM, VBS, HVCI, Hosts).
 */
export async function querySecurityAudit(): Promise<WindowsToolResult<SecurityAuditData>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<SecurityAuditData>>('query_security_audit');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore audit sicurezza: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Audit sicurezza di sistema completato (simulato).',
    data: MOCK_SECURITY_AUDIT,
    durationMs: 160,
    requiresElevation: false,
  };
}

/**
 * Interroga lo stato di salute S.M.A.R.T. e i contatori di affidabilità dei dischi fisici.
 */
export async function getStorageSmartHealth(): Promise<WindowsToolResult<DiskSmartHealth[]>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<DiskSmartHealth[]>>('get_storage_smart_health');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore interrogazione S.M.A.R.T.: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `Rilevati dati S.M.A.R.T. per ${MOCK_SMART_HEALTH.length} dischi fisici (simulato).`,
    data: MOCK_SMART_HEALTH,
    durationMs: 240,
    requiresElevation: false,
  };
}

/**
 * Sblocca e attiva lo schema energetico Prestazioni Eccellenti (Ultimate Performance).
 */
export async function enableUltimatePerformance(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('enable_ultimate_performance');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore sblocco Ultimate Performance: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Schema Prestazioni Eccellenti (Ultimate Performance) sbloccato e attivato con successo (simulato).',
    details: 'GUID schema: e9a42b02-d5df-448d-aa00-03f14749eb61 attivato.',
    data: 'e9a42b02-d5df-448d-aa00-03f14749eb61',
    durationMs: 400,
    requiresElevation: true,
  };
}

/**
 * Pulisce in sicurezza le cache shader DirectX e GPU di sistema.
 */
export async function cleanGpuShaderCache(): Promise<WindowsToolResult<ShaderCacheCleanResult>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<ShaderCacheCleanResult>>('clean_gpu_shader_cache');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore pulizia cache shader: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `Pulizia Shader Cache GPU completata: ${MOCK_SHADER_CACHE.filesRemoved} file rimossi (380 MB liberati).`,
    data: MOCK_SHADER_CACHE,
    durationMs: 580,
    requiresElevation: false,
  };
}

/**
 * Esegue la pulizia profonda del repository pacchetti Windows WinSxS Component Store.
 */
export async function cleanComponentStore(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('clean_component_store');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore pulizia WinSxS Component Store: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Pulizia repository WinSxS Component Store completata con successo (simulato).',
    details: 'Operazione DISM /Online /Cleanup-Image /StartComponentCleanup completata. Recuperati file di backup obsoleti.',
    durationMs: 3200,
    requiresElevation: true,
  };
}

/**
 * Riavvia il computer direttamente nel firmware BIOS/UEFI.
 */
export async function rebootToUefi(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('reboot_to_uefi');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore riavvio UEFI: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: true,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: 'Comando riavvio diretto nel BIOS/UEFI inviato (simulato in ambiente web).',
    details: 'Eseguito shutdown.exe /r /fw /t 0 con privilegi amministrativi.',
    data: 'reboot_uefi',
    durationMs: 800,
    requiresElevation: true,
  };
}

/**
 * Controlla la presenza di aggiornamenti software disponibili tramite WinGet.
 */
export async function checkWinGetUpdates(): Promise<WindowsToolResult<WinGetUpdateItem[]>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<WinGetUpdateItem[]>>('check_winget_updates');
    } catch (err) {
      return {
        status: 'failed',
        message: `Errore interrogazione WinGet: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  // Web fallback
  return {
    status: 'success',
    message: `Rilevati ${MOCK_WINGET_UPDATES.length} aggiornamenti software disponibili con WinGet.`,
    data: MOCK_WINGET_UPDATES,
    durationMs: 920,
    requiresElevation: false,
  };
}

