/**
 * Tipi e contratti per la Diagnostica Hardware Nativa Avanzata (Tranche 7)
 * - Device / Driver Fault Detection (CM_Get_DevNode_Status)
 * - Memory Commit Diagnostics (GetPerformanceInfo)
 * - Power Architecture Detection (GetSystemPowerStatus)
 */

import { MetricAvailability } from './monitoring';
import type { HealthAffectedArea } from './health';
import type { TuningProfile } from './tuning';
import type { DiskSmartHealth } from './windowsTools';

export type DeviceProblemSeverity = 'info' | 'attention' | 'warning' | 'critical';

export interface DeviceProblemFact {
  deviceId: string;
  friendlyName?: string | null;
  problemCode: number;
  problemLabel: string;
  problemDescription: string;
  statusFlags: number;
  severity: DeviceProblemSeverity;
}

export interface DeviceProblemsFact {
  availability: MetricAvailability;
  source: string;
  totalDevicesScanned: number;
  problemCount: number;
  devicesWithProblems: DeviceProblemFact[];
  errorDetails?: string | null;
}

export interface MemoryCommitSnapshot {
  availability: MetricAvailability;
  source: string;
  commitTotalBytes: number;
  commitLimitBytes: number;
  commitPeakBytes: number;
  physicalTotalBytes: number;
  physicalAvailableBytes: number;
  systemCacheBytes: number;
  kernelPagedBytes: number;
  kernelNonpagedBytes: number;
  processCount: number;
  threadCount: number;
  commitUtilizationPercent: number;
  physicalUtilizationPercent: number;
  errorDetails?: string | null;
}

export type PowerArchitecture = 'desktop_like' | 'battery_capable' | 'unknown';

export interface PowerStatusSnapshot {
  availability: MetricAvailability;
  source: string;
  acLineStatus: number; // 0 = offline (battery), 1 = online (AC), 255 = unknown
  batteryFlag: number;  // 1=High, 2=Low, 4=Critical, 8=Charging, 128=No battery, 255=Unknown
  batteryLifePercent: number | null;
  batterySaverActive: boolean;
  hasSystemBattery: boolean;
  isOnAC: boolean | null;
  isOnBattery: boolean | null;
  powerArchitecture: PowerArchitecture;
  errorDetails?: string | null;
}

/**
 * Tipi e contratti per Native Event Log Facts (Tranche 8A)
 * - Provider allowlist: Microsoft-Windows-WHEA-Logger, Microsoft-Windows-Kernel-Power, disk, Ntfs, Display
 * - Query server-side con wevtapi.dll (System Channel, 168h default, cap 50 con sentinel probe)
 * - Solo Native Facts minimizzati senza classificazione diagnostica/severity preventiva
 */

export type EventLogChannel = 'System' | 'Application';

export type EventLogPayload =
  | {
      type: 'kernelPower';
      bugcheckCode: number;
      bugcheckParameter1?: string | null;
      powerButtonTimestamp: number;
      sleepInProgress?: number | null;
      connectedStandbyInProgress?: boolean | null;
    }
  | {
      type: 'whea';
      errorSource?: number | null;
      mcaBank?: number | null;
      mcaStatus?: string | null;
      errorType?: number | null;
      rawDataLength?: number | null;
    }
  | {
      type: 'disk';
      deviceName?: string | null;
      ioStatus?: string | null;
    }
  | {
      type: 'ntfs';
      volumeId?: string | null;
      volumeName?: string | null;
      repairHint?: string | null;
    }
  | {
      type: 'display';
      driverName?: string | null;
    }
  | {
      type: 'generic';
      dataSummary?: string | null;
    };

export interface EventLogNativeFact {
  channel: string;
  provider: string;
  eventId: number;
  level: number;                 // Livello nativo Windows (1=Crit, 2=Err, 3=Warn, 4=Info)
  timestamp: string;             // ISO 8601
  recordId: number;              // ID progressivo per deduplicazione
  targetContext?: string | null; // Contesto minimizzato (dispositivo, volume, driver)
  payload?: EventLogPayload | null;
}

export interface EventLogDiagnosticsSnapshot {
  availability: MetricAvailability;
  source: string;                // "Wevtapi_SystemLog"
  queryTimeWindowHours: number;  // Default: 168 (7 giorni)
  maxEventsCap: number;          // Default: 50
  returnedEventCount: number;    // Numero effettivo eventi estratti
  truncated: boolean;            // true = hit del cap con sentinel (campionamento parziale)
  events: EventLogNativeFact[];
  errorDetails?: string | null;
}

/**
 * Tipi e contratti per Native Windows Service Facts (Tranche 8B)
 * - Interrogazione FFI mirata su SCM via advapi32.dll
 * - Catalogo esatto di 6 servizi: EventLog, Winmgmt, wuauserv, TrustedInstaller, VSS, WinDefend
 * - Fatti nativi puri senza interpretazione preventiva di health o anomalie
 */

export type WindowsServiceOperationalModel = 'always_running' | 'on_demand' | 'contextual';

export type WindowsServiceState =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'start_pending'
  | 'stop_pending'
  | 'continue_pending'
  | 'pause_pending'
  | 'unknown';

export type WindowsServiceStartType =
  | 'auto'
  | 'auto_delayed'
  | 'demand'
  | 'disabled'
  | 'boot'
  | 'system'
  | 'unknown';

export interface WindowsServiceNativeFact {
  serviceName: string;
  displayName: string;
  operationalModel: WindowsServiceOperationalModel;
  currentState: WindowsServiceState;
  startType: WindowsServiceStartType;
  win32ExitCode: number;
  serviceSpecificExitCode?: number | null;
  processId?: number | null;
}

export interface WindowsServicesSnapshot {
  availability: MetricAvailability;
  source: string;                // "Advapi32_SCM"
  scannedAt: string;             // ISO 8601
  catalogCount: number;          // 6
  services: WindowsServiceNativeFact[];
  errorDetails?: string | null;
}

export type DiagnosticsSnapshotStatus = 'success' | 'partial' | 'unsupported' | 'error';

export interface SystemDiagnosticsSnapshot {
  timestamp: string;
  status: DiagnosticsSnapshotStatus;
  deviceProblems: DeviceProblemsFact;
  memoryCommit: MemoryCommitSnapshot;
  powerStatus: PowerStatusSnapshot;
  eventLog?: EventLogDiagnosticsSnapshot;
  systemServices?: WindowsServicesSnapshot;
  collectionDurationMs: number;
}

/**
 * Logica di capping e sentinel probe per Event Log (Rule Tranche 8A.3).
 * Se raccolti == maxCap e il sentinel esiste, truncated = true e il sentinel viene scartato.
 */
export function applyEventCapAndSentinel<T>(
  collected: T[],
  hasSentinel: boolean,
  maxCap = 50
): {
  events: T[];
  returnedEventCount: number;
  truncated: boolean;
} {
  if (collected.length > maxCap) {
    const events = collected.slice(0, maxCap);
    return {
      events,
      returnedEventCount: events.length,
      truncated: true,
    };
  }

  if (collected.length === maxCap && hasSentinel) {
    return {
      events: collected,
      returnedEventCount: collected.length,
      truncated: true,
    };
  }

  return {
    events: collected,
    returnedEventCount: collected.length,
    truncated: false,
  };
}

/**
 * Mappatura pura ufficiale dei Problem Code Windows (CM_PROB_*)
 * Rispetta la Rule A.2: codici tecnici ufficiali ed etichette trasparenti senza inventare cause.
 */
export function mapProblemCode(code: number): {
  label: string;
  description: string;
  severity: DeviceProblemSeverity;
} {
  switch (code) {
    case 1:
      return {
        label: 'CM_PROB_NOT_CONFIGURED (Codice 1)',
        description: 'Il dispositivo non è configurato correttamente in Windows.',
        severity: 'attention',
      };
    case 3:
      return {
        label: 'CM_PROB_OUT_OF_DEF_PARAMS (Codice 3)',
        description: 'Driver per il dispositivo non installato o parametri di configurazione non validi.',
        severity: 'attention',
      };
    case 10:
      return {
        label: 'CM_PROB_FAILED_START (Codice 10)',
        description: 'Il dispositivo non può avviarsi (Codice 10). Possibile malfunzionamento del firmware o driver non aggiornato.',
        severity: 'warning',
      };
    case 12:
      return {
        label: 'CM_PROB_NORMAL_CONFLICT (Codice 12)',
        description: 'Conflitto di risorse I/O o IRQ con un altro dispositivo hardware.',
        severity: 'warning',
      };
    case 14:
      return {
        label: 'CM_PROB_NEED_RESTART (Codice 14)',
        description: 'Il dispositivo richiede il riavvio del computer per funzionare.',
        severity: 'attention',
      };
    case 18:
      return {
        label: 'CM_PROB_REINSTALL (Codice 18)',
        description: 'I driver per questo dispositivo devono essere reinstallati.',
        severity: 'warning',
      };
    case 19:
      return {
        label: 'CM_PROB_REGISTRY_ERROR (Codice 19)',
        description: 'Informazioni del dispositivo nel Registro di Windows incomplete o danneggiate.',
        severity: 'warning',
      };
    case 21:
      return {
        label: 'CM_PROB_WILL_BE_REMOVED (Codice 21)',
        description: 'Windows sta completando la rimozione del dispositivo.',
        severity: 'info',
      };
    case 22:
      return {
        label: 'CM_PROB_DISABLED (Codice 22)',
        description: 'Il dispositivo è disabilitato in Gestione Dispositivi o disattivato dal sistema.',
        severity: 'info',
      };
    case 24:
      return {
        label: 'CM_PROB_DEVLOADER_NOT_READY (Codice 24)',
        description: 'Il dispositivo non risponde correttamente o non sono presenti tutti i driver necessari.',
        severity: 'warning',
      };
    case 28:
      return {
        label: 'CM_PROB_NOT_INITIALIZED (Codice 28)',
        description: 'I driver per questo dispositivo non sono installati.',
        severity: 'attention',
      };
    case 29:
      return {
        label: 'CM_PROB_FAILED_FILTER (Codice 29)',
        description: 'Impossibile caricare un driver di filtro associato al dispositivo.',
        severity: 'warning',
      };
    case 31:
      return {
        label: 'CM_PROB_FAILED_ADD (Codice 31)',
        description: 'Windows non riesce a caricare i driver necessari per questo hardware.',
        severity: 'warning',
      };
    case 32:
      return {
        label: 'CM_PROB_DISABLED_SERVICE (Codice 32)',
        description: 'Il servizio o driver associato al dispositivo è disabilitato nel sistema.',
        severity: 'attention',
      };
    case 37:
      return {
        label: 'CM_PROB_FAILED_DRIVER_ENTRY (Codice 37)',
        description: 'Inizializzazione del driver fallita (DriverEntry ha restituito un codice di errore).',
        severity: 'warning',
      };
    case 38:
      return {
        label: 'CM_PROB_DRIVER_FAILED_LOAD (Codice 38)',
        description: 'Impossibile caricare il driver: una versione precedente è ancora caricata in memoria.',
        severity: 'warning',
      };
    case 39:
      return {
        label: 'CM_PROB_FAILED_DRIVER_LOAD (Codice 39)',
        description: 'Impossibile caricare il driver di periferica: file del driver mancante o danneggiato.',
        severity: 'warning',
      };
    case 41:
      return {
        label: 'CM_PROB_DRIVER_LOAD_ERROR (Codice 41)',
        description: 'Driver caricato con successo ma si è verificato un errore dell\'interfaccia o controller.',
        severity: 'warning',
      };
    case 43:
      return {
        label: 'CM_PROB_FAILED_POST (Codice 43)',
        description: 'Il dispositivo ha segnalato un problema ed è stato arrestato da Windows (Codice 43). Tipico di guasto GPU, controller o firmware.',
        severity: 'critical',
      };
    case 44:
      return {
        label: 'CM_PROB_RESOURCE_LACK (Codice 44)',
        description: 'Risorse di sistema insufficienti per allocare il dispositivo hardware.',
        severity: 'warning',
      };
    case 45:
      return {
        label: 'CM_PROB_HARDWARE_NOT_PRESENT (Codice 45)',
        description: 'Dispositivo attualmente non collegato fisicamente al computer (disconnesso).',
        severity: 'info',
      };
    case 47:
      return {
        label: 'CM_PROB_WAITING_ON_CHILDREN (Codice 47)',
        description: 'Il dispositivo è in attesa dell\'avvio di un dispositivo secondario.',
        severity: 'info',
      };
    case 48:
      return {
        label: 'CM_PROB_CALL_TO_FAILURE (Codice 48)',
        description: 'Il software del dispositivo è stato bloccato da Windows per problemi noti di stabilità.',
        severity: 'warning',
      };
    case 51:
      return {
        label: 'CM_PROB_DEPENDENT_FAILED (Codice 51)',
        description: 'Il dispositivo non si avvia perché un componente da cui dipende ha fallito.',
        severity: 'warning',
      };
    case 52:
      return {
        label: 'CM_PROB_CANNOT_VERIFY_SIGNATURE (Codice 52)',
        description: 'Windows non può verificare la firma digitale per i driver richiesti (driver non firmato).',
        severity: 'warning',
      };
    case 54:
      return {
        label: 'CM_PROB_FAILED_INSTALL (Codice 54)',
        description: 'Installazione del dispositivo incompleta o non riuscita.',
        severity: 'attention',
      };
    default:
      return {
        label: `Codice dispositivo Windows ${code}`,
        description: `Windows ha segnalato uno stato anomalo con codice ${code} per questa periferica.`,
        severity: 'attention',
      };
  }
}

export interface CommitPressureAssessment {
  level: 'NORMAL' | 'ELEVATED' | 'SUSTAINED_PRESSURE';
  averageCommitUtilization: number;
  averagePhysicalUtilization: number;
  sampleCount: number;
  isSustained: boolean;
  details: string;
}

/**
 * Valuta la pressione sulla memoria di commit consumando uno o più campioni temporali (Rule B.2, B.3).
 * Distingue picchi isolati da pressione prolungata senza urlare "OOM imminente".
 */
export function evaluateCommitPressure(
  snapshots: MemoryCommitSnapshot[]
): CommitPressureAssessment {
  const valid = snapshots.filter(
    (s) => s.availability === 'available' && s.commitLimitBytes > 0
  );

  if (valid.length === 0) {
    return {
      level: 'NORMAL',
      averageCommitUtilization: 0,
      averagePhysicalUtilization: 0,
      sampleCount: 0,
      isSustained: false,
      details: 'Nessun campione di commit disponibile per l\'analisi.',
    };
  }

  const sumCommit = valid.reduce((acc, s) => acc + s.commitUtilizationPercent, 0);
  const sumPhys = valid.reduce((acc, s) => acc + s.physicalUtilizationPercent, 0);
  const avgCommit = Math.round((sumCommit / valid.length) * 10) / 10;
  const avgPhys = Math.round((sumPhys / valid.length) * 10) / 10;

  // Pressione sostenuta: almeno 2 campioni sopra l'88% di commit E oltre l'80% di RAM fisica
  const highSamples = valid.filter(
    (s) => s.commitUtilizationPercent >= 88 && s.physicalUtilizationPercent >= 80
  );

  if (valid.length >= 2 && highSamples.length === valid.length) {
    return {
      level: 'SUSTAINED_PRESSURE',
      averageCommitUtilization: avgCommit,
      averagePhysicalUtilization: avgPhys,
      sampleCount: valid.length,
      isSustained: true,
      details: `Pressione sostenuta su memoria commit (${avgCommit}%) e RAM fisica (${avgPhys}%) rilevata su ${valid.length} campioni consecutivi.`,
    };
  }

  if (avgCommit >= 85 || (valid[valid.length - 1].commitUtilizationPercent >= 90)) {
    return {
      level: 'ELEVATED',
      averageCommitUtilization: avgCommit,
      averagePhysicalUtilization: avgPhys,
      sampleCount: valid.length,
      isSustained: false,
      details: `Utilizzo elevato di memoria commit rilevato (${avgCommit}% medio). RAM fisica al ${avgPhys}%.`,
    };
  }

  return {
    level: 'NORMAL',
    averageCommitUtilization: avgCommit,
    averagePhysicalUtilization: avgPhys,
    sampleCount: valid.length,
    isSustained: false,
    details: `Utilizzo della memoria di commit nella norma (${avgCommit}% medio su ${valid.length} campioni).`,
  };
}

/**
 * Catalogo mirato di 6 servizi Windows chiave per la salute di sistema (Tranche 8B)
 */
export interface WindowsServiceCatalogItem {
  serviceName: string;
  fallbackDisplayName: string;
  operationalModel: WindowsServiceOperationalModel;
}

export const WINDOWS_SERVICES_CATALOG: readonly WindowsServiceCatalogItem[] = [
  {
    serviceName: 'EventLog',
    fallbackDisplayName: 'Windows Event Log',
    operationalModel: 'always_running',
  },
  {
    serviceName: 'Winmgmt',
    fallbackDisplayName: 'Windows Management Instrumentation',
    operationalModel: 'always_running',
  },
  {
    serviceName: 'wuauserv',
    fallbackDisplayName: 'Windows Update',
    operationalModel: 'on_demand',
  },
  {
    serviceName: 'TrustedInstaller',
    fallbackDisplayName: 'Windows Modules Installer',
    operationalModel: 'on_demand',
  },
  {
    serviceName: 'VSS',
    fallbackDisplayName: 'Volume Shadow Copy',
    operationalModel: 'on_demand',
  },
  {
    serviceName: 'WinDefend',
    fallbackDisplayName: 'Microsoft Defender Antivirus Service',
    operationalModel: 'contextual',
  },
] as const;

/**
 * Mappatura pura dello stato del servizio Windows (SERVICE_STATUS.dwCurrentState)
 */
export function mapServiceState(stateCode: number): WindowsServiceState {
  switch (stateCode) {
    case 1:
      return 'stopped';
    case 2:
      return 'start_pending';
    case 3:
      return 'stop_pending';
    case 4:
      return 'running';
    case 5:
      return 'continue_pending';
    case 6:
      return 'pause_pending';
    case 7:
      return 'paused';
    default:
      return 'unknown';
  }
}

/**
 * Mappatura pura del tipo di avvio (QUERY_SERVICE_CONFIG.dwStartType)
 */
export function mapServiceStartType(startTypeCode: number, isDelayed = false): WindowsServiceStartType {
  switch (startTypeCode) {
    case 0:
      return 'boot';
    case 1:
      return 'system';
    case 2:
      return isDelayed ? 'auto_delayed' : 'auto';
    case 3:
      return 'demand';
    case 4:
      return 'disabled';
    default:
      return 'unknown';
  }
}

/**
 * Costruttore puro del Native Fact per un servizio Windows.
 * Applica rigorosamente le regole:
 * - processId è valorizzato SOLO se currentState === 'running' e rawProcessId > 0 (Rule 3 & Test J)
 * - serviceSpecificExitCode è valorizzato se win32ExitCode === 1066 o se rawSpecificExitCode !== 0
 */
export function createServiceFact(params: {
  serviceName: string;
  displayName: string;
  operationalModel: WindowsServiceOperationalModel;
  rawState: number;
  rawStartType: number;
  isDelayed?: boolean;
  win32ExitCode: number;
  rawSpecificExitCode?: number;
  rawProcessId?: number;
}): WindowsServiceNativeFact {
  const currentState = mapServiceState(params.rawState);
  const startType = mapServiceStartType(params.rawStartType, params.isDelayed ?? false);

  const processId =
    currentState === 'running' && (params.rawProcessId ?? 0) > 0
      ? params.rawProcessId!
      : null;

  const serviceSpecificExitCode =
    params.win32ExitCode === 1066 || (params.rawSpecificExitCode ?? 0) !== 0
      ? (params.rawSpecificExitCode ?? null)
      : null;

  return {
    serviceName: params.serviceName,
    displayName: params.displayName,
    operationalModel: params.operationalModel,
    currentState,
    startType,
    win32ExitCode: params.win32ExitCode,
    serviceSpecificExitCode,
    processId,
  };
}

/**
 * Tipi e contratti per la Correlazione Diagnostica Pura (Tranche 8C)
 * - Rilevamento correlazioni pure e deterministiche tra Native Facts
 * - Zero causalità dichiarata ("evidenze convergenti", "segnali correlati", "coincidenza temporale")
 * - Distinzione rigorosa tra DIRECT_MATCH, RELATED_SIGNAL e WEAK_CONTEXT
 */

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

export interface DiagnosticCorrelationInput {
  deviceProblems?: DeviceProblemsFact | null;
  deviceFaults?: DeviceProblemFact[] | null;
  eventLog?: EventLogDiagnosticsSnapshot | null;
  events?: EventLogNativeFact[] | null;
  services?: WindowsServicesSnapshot | null;
  serviceFacts?: WindowsServiceNativeFact[] | null;
  tuningProfiles?: TuningProfile[] | null;
  smartDisks?: DiskSmartHealth[] | null;
  powerStatus?: PowerStatusSnapshot | null;
}

