import { ScanNowResult } from '../types/windowsTools';

/**
 * Converte byte in formato leggibile standard (B, KB, MB, GB, TB) con precisione a 1 decimale.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
  return `${formatted} ${sizes[i]}`;
}

/**
 * Calcola la percentuale di spazio occupato di un'unità disco (da 0 a 100%).
 */
export function computeDriveUsagePercentage(freeBytes: number, totalBytes: number): number {
  if (totalBytes <= 0 || isNaN(totalBytes) || isNaN(freeBytes)) return 0;
  const used = totalBytes - freeBytes;
  const pct = (used / totalBytes) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/**
 * Formatta la durata di esecuzione in secondi o millisecondi (es. "4,2 s" o "350 ms").
 */
export function formatDurationMs(ms: number): string {
  if (isNaN(ms) || ms < 0) return '0 ms';
  if (ms >= 1000) {
    const sec = ms / 1000;
    return `${sec.toFixed(1).replace('.', ',')} s`;
  }
  return `${Math.round(ms)} ms`;
}

/**
 * Valuta obiettivamente lo stato dei controlli diagnostici non distruttivi e restituisce
 * le eventuali azioni consigliate all'utente (senza mai applicare nulla in automatico).
 */
export function evaluateScanNowRecommendations(
  scan: Partial<ScanNowResult>
): ScanNowResult['recommendedActions'] {
  const actions: ScanNowResult['recommendedActions'] = [];

  // 1. Controllo volumi SSD compatibili per TRIM
  if (scan.drives && scan.drives.length > 0) {
    const ssdDrives = scan.drives.filter((d) => d.isSSD && d.trimSupported);
    for (const d of ssdDrives) {
      actions.push({
        id: `trim-${d.driveLetter}`,
        title: `Esegui TRIM su unità ${d.driveLetter}`,
        description: `Invia il comando TRIM per informare il controller SSD (${d.friendlyName || d.driveLetter}) dei blocchi non più utilizzati.`,
        actionType: 'trim',
        driveLetter: d.driveLetter,
      });
    }
  }

  // 2. Controllo Cestino di Windows
  if (scan.recycleBin && scan.recycleBin.totalSizeBytes > 1024 * 1024 * 50) {
    // Più di 50 MB nel cestino
    actions.push({
      id: 'clean-recycle-bin',
      title: 'Svuota Cestino di Windows',
      description: `Nel Cestino sono presenti ${formatBytes(scan.recycleBin.totalSizeBytes)} (${scan.recycleBin.itemCount} elementi) che possono essere eliminati definitivamente.`,
      actionType: 'clean_recycle_bin',
    });
  }

  // 3. Pulizia Disco nativa Windows (se poco spazio sul disco di sistema C:)
  if (scan.drives) {
    const cDrive = scan.drives.find((d) => d.driveLetter.toUpperCase().startsWith('C'));
    if (cDrive && computeDriveUsagePercentage(cDrive.freeBytes, cDrive.totalBytes) > 85) {
      actions.push({
        id: 'open-cleanmgr',
        title: 'Apri Pulizia disco di Windows',
        description: `L'unità di sistema C: è occupata per più dell'85%. Avvia Pulizia disco nativa per liberare spazio.`,
        actionType: 'open_cleanmgr',
        driveLetter: 'C:',
      });
    }
  }

  // 4. File di sistema Windows
  if (scan.systemFilesStatus === 'corrupted') {
    actions.push({
      id: 'sfc-repair-notice',
      title: 'Anomalie rilevate nei file di sistema Windows',
      description: 'La verifica non-distruttiva ha riscontrato file di sistema danneggiati. Si consiglia una verifica approfondita.',
      actionType: 'sfc_scan',
    });
  }

  return actions;
}

/**
 * Classifica lo stato di salute di un'unità fisica basandosi su parametri S.M.A.R.T. e contatori di affidabilità.
 */
export function classifyDiskHealth(smart: import('../types/windowsTools').DiskSmartHealth): {
  status: 'healthy' | 'warning' | 'critical';
  label: string;
  badgeClass: string;
} {
  const isHealthyStr = (smart.healthStatus || '').toLowerCase().includes('healthy');
  const hasErrors = smart.readErrorsTotal > 0 || smart.writeErrorsTotal > 0;
  const isOverheating = smart.temperatureCelsius !== undefined && smart.temperatureCelsius >= 70;
  const isHighWear = smart.wearPercentage !== undefined && smart.wearPercentage >= 80;
  const isCriticalWear = smart.wearPercentage !== undefined && smart.wearPercentage >= 95;

  if (!isHealthyStr || isCriticalWear) {
    return {
      status: 'critical',
      label: 'Attenzione Critica',
      badgeClass: 'badge-ruby',
    };
  }

  if (hasErrors || isOverheating || isHighWear) {
    return {
      status: 'warning',
      label: 'Monitorare',
      badgeClass: 'badge-amber',
    };
  }

  return {
    status: 'healthy',
    label: 'Ottimo / Integro',
    badgeClass: 'badge-emerald',
  };
}

/**
 * Formatta la temperatura in gradi Celsius o restituisce 'N/D'.
 */
export function formatTemperatureCelsius(temp?: number): string {
  if (temp === undefined || isNaN(temp)) return 'N/D';
  return `${Math.round(temp)}°C`;
}

/**
 * Formatta la percentuale di usura (Wear) riportata dal controller SSD.
 */
export function formatWearPercentage(wear?: number): string {
  if (wear === undefined || isNaN(wear)) return 'N/D';
  const remaining = Math.max(0, 100 - wear);
  return `${wear}% consumato (${remaining}% vita residua)`;
}

/**
 * Valuta l'audit di sicurezza e kernel restituendo un punteggio e le eventuali raccomandazioni.
 */
export function evaluateSecurityAuditStatus(audit: import('../types/windowsTools').SecurityAuditData): {
  isOptimal: boolean;
  score: number;
  maxScore: number;
  recommendations: string[];
} {
  let score = 0;
  const maxScore = 5;
  const recommendations: string[] = [];

  if (audit.secureBootEnabled) {
    score += 1;
  } else {
    recommendations.push('Secure Boot non attivo: abilitalo nel BIOS UEFI per proteggere il bootloader.');
  }

  if (audit.tpmPresent && audit.tpmReady) {
    score += 1;
  } else {
    recommendations.push('Modulo TPM 2.0 assente o non pronto: richiesto per sicurezza Windows 11 e BitLocker.');
  }

  if (audit.vbsRunning) {
    score += 1;
  } else {
    recommendations.push('Virtualization-Based Security (VBS) non attiva: abilitala per isolamento kernel hardware.');
  }

  if (audit.hvciRunning) {
    score += 1;
  } else {
    recommendations.push('Integrità Memoria (HVCI) non attiva: protegge il kernel da iniezioni di codice nocivo.');
  }

  if (audit.hostsFileClean) {
    score += 1;
  } else {
    recommendations.push(`File hosts contiene ${audit.hostsCustomEntriesCount} regole custom: verifica che non vi siano dirottamenti.`);
  }

  return {
    isOptimal: score === maxScore,
    score,
    maxScore,
    recommendations,
  };
}
