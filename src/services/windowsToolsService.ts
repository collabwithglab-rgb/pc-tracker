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
  StartupAppsSnapshot,
  NetworkDiagnosticsResult,
  WindowsUpdateStatus,
  DisplayDiagnosticsSnapshot,
  AudioDiagnosticsSnapshot,
  NetworkAdapterSnapshot,
  WifiSignalSnapshot,
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
export async function getStorageSmartHealth(elevate = false): Promise<WindowsToolResult<DiskSmartHealth[]>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<DiskSmartHealth[]>>('get_storage_smart_health', { elevate });
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
    data: MOCK_SMART_HEALTH.map((d) => ({
      ...d,
      smartStatus: 'available',
    })),
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

export const MOCK_STARTUP_APPS: StartupAppsSnapshot = {
  availability: 'available',
  source: 'windows_registry_run (web mock)',
  totalApps: 5,
  enabledCount: 3,
  disabledCount: 2,
  apps: [
    {
      name: 'Discord',
      command: 'C:\\Users\\Peppe\\AppData\\Local\\Discord\\app.exe',
      scope: 'current_user',
      enabled: true,
      impact: 'high',
      rawStatusHex: '02 00 00 00',
    },
    {
      name: 'Steam',
      command: '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent',
      scope: 'current_user',
      enabled: true,
      impact: 'high',
      rawStatusHex: '02 00 00 00',
    },
    {
      name: 'Realtek Audio',
      command: 'C:\\Program Files\\Realtek\\Audio\\RtkNGUI64.exe -s',
      scope: 'local_machine',
      enabled: true,
      impact: 'low',
      rawStatusHex: '02 00 00 00',
    },
    {
      name: 'Spotify',
      command: 'C:\\Users\\Peppe\\AppData\\Roaming\\Spotify\\Spotify.exe --autostart',
      scope: 'current_user',
      enabled: false,
      impact: 'high',
      rawStatusHex: '03 00 00 00',
    },
    {
      name: 'EpicGamesLauncher',
      command: '"C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe" -silent',
      scope: 'local_machine_wow64',
      enabled: false,
      impact: 'high',
      rawStatusHex: '03 00 00 00',
    },
  ],
  errorDetails: null,
};

export const MOCK_WINDOWS_UPDATE_STATUS: WindowsUpdateStatus = {
  availability: 'available',
  source: 'windows_registry_update_flags (web mock)',
  rebootPending: false,
  rebootSources: [],
  lastCheckTime: '2026-10-02 18:30:00',
  lastInstallTime: '2026-10-01 10:15:00',
  pendingFileRenameCount: 0,
  details: null,
};

export const MOCK_NETWORK_DIAGNOSTICS: NetworkDiagnosticsResult = {
  targetHost: '1.1.1.1',
  sentPackets: 4,
  receivedPackets: 4,
  packetLossPercent: 0,
  rttMinMs: 11.2,
  rttMaxMs: 14.8,
  rttAvgMs: 12.6,
  jitterMs: 1.8,
  qualityRating: 'optimal',
  rawSamples: [11.2, 12.5, 14.8, 12.0],
  status: 'success',
  errorDetails: null,
  executionTimeMs: 140,
};

/**
 * Interroga le applicazioni con avvio automatico nel registro di Windows (HKCU, HKLM, WOW6432Node).
 */
export async function queryStartupApps(): Promise<StartupAppsSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<StartupAppsSnapshot>('query_startup_apps');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        totalApps: 0,
        enabledCount: 0,
        disabledCount: 0,
        apps: [],
        errorDetails: (err as Error).message,
      };
    }
  }

  return MOCK_STARTUP_APPS;
}

/**
 * Apre l'interfaccia nativa delle impostazioni Windows per le app di avvio.
 */
export async function openStartupSettings(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('open_startup_settings');
    } catch (err) {
      return {
        status: 'failed',
        message: `Error opening Windows Settings: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  return {
    status: 'success',
    message: 'Windows startup settings opened (simulated)',
    details: 'Native settings opened safely',
    data: 'ms-settings:startupapps',
    durationMs: 300,
    requiresElevation: false,
  };
}

/**
 * Esegue il test ICMP Echo (ping) verso il target host on-demand.
 */
export async function runNetworkDiagnostics(target?: string): Promise<NetworkDiagnosticsResult> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<NetworkDiagnosticsResult>('run_network_diagnostics', {
        target: target || null,
      });
    } catch (err) {
      const host = target || '1.1.1.1';
      return {
        targetHost: host,
        sentPackets: 4,
        receivedPackets: 0,
        packetLossPercent: 100,
        qualityRating: 'offline',
        rawSamples: [],
        status: 'error',
        errorDetails: (err as Error).message,
        executionTimeMs: 0,
      };
    }
  }

  const host = target || '1.1.1.1';
  return {
    ...MOCK_NETWORK_DIAGNOSTICS,
    targetHost: host,
  };
}

/**
 * Interroga lo stato di Windows Update e rileva eventuali flag di riavvio pendente.
 */
export async function queryWindowsUpdateStatus(): Promise<WindowsUpdateStatus> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsUpdateStatus>('query_windows_update_status');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        rebootPending: false,
        rebootSources: [],
        lastCheckTime: null,
        lastInstallTime: null,
        pendingFileRenameCount: 0,
        details: (err as Error).message,
      };
    }
  }

  return MOCK_WINDOWS_UPDATE_STATUS;
}

export const MOCK_DISPLAY_DIAGNOSTICS: DisplayDiagnosticsSnapshot = {
  availability: 'available',
  source: 'win32_enum_display_mock',
  totalMonitors: 1,
  monitors: [
    {
      id: '\\\\.\\DISPLAY1',
      monitorName: 'LG UltraGear 27GP850 (QHD Nano IPS)',
      adapterName: '\\\\.\\DISPLAY1',
      currentResolution: { width: 2560, height: 1440 },
      currentRefreshRate: 165,
      maxSupportedRefreshRate: 165,
      supportedRefreshRates: [60, 100, 120, 144, 165],
      bitsPerPixel: 32,
      orientation: 'landscape',
      isPrimary: true,
      virtualBounds: { x: 0, y: 0, width: 2560, height: 1440 },
      dpiScalePercent: 100,
      isRefreshRateLimited: false,
    },
  ],
  hasHighRefreshRateMismatch: false,
  hasMixedRefreshRates: false,
  errorDetails: null,
};

export const MOCK_AUDIO_DIAGNOSTICS: AudioDiagnosticsSnapshot = {
  availability: 'available',
  source: 'win32_audio_engine_mock',
  defaultDeviceName: 'Altoparlanti (Realtek High Definition Audio)',
  defaultSampleRateHz: 48000,
  defaultBitDepth: 24,
  defaultChannels: 2,
  devices: [
    {
      id: '{0.0.0.00000000}.{mock_realtek}',
      name: 'Altoparlanti (Realtek High Definition Audio)',
      isDefault: true,
      state: 'active',
      sampleRateHz: 48000,
      bitDepth: 24,
      channels: 2,
      driverName: 'Realtek High Definition Audio',
    },
    {
      id: '{0.0.0.00000000}.{mock_monitor}',
      name: 'MSI MP243X (NVIDIA High Definition Audio)',
      isDefault: false,
      state: 'active',
      sampleRateHz: 48000,
      bitDepth: 16,
      channels: 2,
      driverName: 'NVIDIA High Definition Audio',
    },
  ],
  audioServiceRunning: true,
  audioEndpointBuilderRunning: true,
  engineStatus: 'optimal',
  glitchOrIssueDetected: false,
  issueSummary: 'All audio endpoints and services operational (Studio/HD 48.0 kHz 24-bit).',
  errorDetails: null,
};

export const MOCK_NETWORK_ADAPTER_SNAPSHOT: NetworkAdapterSnapshot = {
  availability: 'available',
  source: 'win32_iphelper_mock',
  adapterName: 'Ethernet',
  description: 'Realtek Gaming 2.5GbE Family Controller',
  adapterType: 'ethernet',
  status: 'connected',
  linkSpeedMbps: 1000,
  maxSpeedMbps: 2500,
  isLinkSpeedDowngraded: false,
  ipv4: '192.168.1.17',
  ipv6: 'fe80::f0ad:c08c:4d7a:925c',
  gateway: '192.168.1.1',
  macAddress: 'D8:43:AE:14:6A:DF',
  dhcpEnabled: true,
  errorDetails: null,
};

export const MOCK_WIFI_SIGNAL_SNAPSHOT: WifiSignalSnapshot = {
  availability: 'available',
  source: 'win32_wlanapi_mock',
  isConnected: true,
  ssid: 'Fastweb_Home_5G',
  bssid: 'A4:91:B1:22:33:44',
  signalQualityPercent: 88,
  rssiDbm: -56,
  band: '5GHz',
  standard: 'Wi-Fi 6',
  channel: 36,
  errorDetails: null,
};

/**
 * Interroga lo stato dei monitor connessi, risoluzione, frequenze supportate e scaling DPI.
 */
export async function queryDisplayDiagnostics(): Promise<DisplayDiagnosticsSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<DisplayDiagnosticsSnapshot>('query_display_diagnostics');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        totalMonitors: 0,
        monitors: [],
        hasHighRefreshRateMismatch: false,
        hasMixedRefreshRates: false,
        errorDetails: (err as Error).message,
      };
    }
  }

  return MOCK_DISPLAY_DIAGNOSTICS;
}

/**
 * Interroga gli endpoint audio multimediali, sample rate, bit depth e stato dei servizi audio Windows.
 */
export async function detectAudioGlitchesOrStatus(): Promise<AudioDiagnosticsSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<AudioDiagnosticsSnapshot>('detect_audio_glitches_or_status');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        defaultDeviceName: null,
        defaultSampleRateHz: null,
        defaultBitDepth: null,
        defaultChannels: null,
        devices: [],
        audioServiceRunning: false,
        audioEndpointBuilderRunning: false,
        engineStatus: 'issues_detected',
        glitchOrIssueDetected: true,
        issueSummary: 'Unable to query Windows audio engine.',
        errorDetails: (err as Error).message,
      };
    }
  }

  return MOCK_AUDIO_DIAGNOSTICS;
}

/**
 * Apre l'interfaccia nativa delle impostazioni schermo avanzate di Windows.
 */
export async function openDisplaySettings(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('open_display_settings');
    } catch (err) {
      return {
        status: 'failed',
        message: `Error opening Windows Display Settings: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  return {
    status: 'success',
    message: 'Windows Display Settings opened (simulated)',
    details: 'Native advanced display settings opened safely',
    data: 'ms-settings:display-advanced',
    durationMs: 300,
    requiresElevation: false,
  };
}

/**
 * Apre l'interfaccia nativa delle impostazioni audio di Windows.
 */
export async function openSoundSettings(): Promise<WindowsToolResult<string>> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WindowsToolResult<string>>('open_sound_settings');
    } catch (err) {
      return {
        status: 'failed',
        message: `Error opening Windows Sound Settings: ${(err as Error).message}`,
        durationMs: 0,
        requiresElevation: false,
      };
    }
  }

  return {
    status: 'success',
    message: 'Windows Sound Settings opened (simulated)',
    details: 'Native sound settings opened safely',
    data: 'ms-settings:sound',
    durationMs: 300,
    requiresElevation: false,
  };
}

/**
 * Interroga i dettagli della scheda di rete attiva (Ethernet / Wi-Fi), link speed e configurazione IP.
 */
export async function queryNetworkAdapterDetails(): Promise<NetworkAdapterSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<NetworkAdapterSnapshot>('query_network_adapter_details');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        adapterName: 'Network Adapter',
        description: 'Unknown Adapter',
        adapterType: 'ethernet',
        status: 'unknown',
        linkSpeedMbps: 0,
        maxSpeedMbps: null,
        isLinkSpeedDowngraded: false,
        ipv4: null,
        ipv6: null,
        gateway: null,
        macAddress: null,
        dhcpEnabled: true,
        errorDetails: (err as Error).message,
      };
    }
  }

  return MOCK_NETWORK_ADAPTER_SNAPSHOT;
}

/**
 * Interroga le metriche del segnale Wi-Fi (SSID, qualità %, RSSI, banda, standard Wi-Fi).
 */
export async function queryWifiSignalMetrics(): Promise<WifiSignalSnapshot> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<WifiSignalSnapshot>('query_wifi_signal_metrics');
    } catch (err) {
      return {
        availability: 'error',
        source: 'tauri_error',
        isConnected: false,
        ssid: null,
        bssid: null,
        signalQualityPercent: 0,
        rssiDbm: -100,
        band: 'unknown',
        standard: 'unknown',
        channel: null,
        errorDetails: (err as Error).message,
      };
    }
  }

  return MOCK_WIFI_SIGNAL_SNAPSHOT;
}



