/**
 * Tipi per l'Health Engine deterministico e diagnostico basato su regole (PC Care Center)
 */

import { MonitoringSnapshot } from './monitoring';
import {
  VolumeDriveInfo,
  DiskSmartHealth,
  SecurityAuditData,
  RecycleBinInfo,
  WinGetUpdateItem,
} from './windowsTools';
import { MaintenanceEntry } from './maintenance';
import { TuningProfile } from './tuning';
import { Component } from './component';

export type HealthSeverity = 'INFO' | 'GOOD' | 'ATTENTION' | 'WARNING' | 'CRITICAL';

export type HealthAffectedArea =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'thermal'
  | 'maintenance'
  | 'system'
  | 'security';

export interface HealthFinding {
  id: string;                      // Identificativo univoco e deterministico
  severity: HealthSeverity;
  area: HealthAffectedArea;
  title: string;
  evidence: string;                // Fatto oggettivo misurato
  explanation: string;            // Spiegazione trasparente del contesto
  confidence: 'HIGH' | 'MEDIUM';
  recommendedActionId?: string;    // Riferimento all'azione raccomandata
  metadata?: Record<string, string | number | boolean>;
}

export interface SystemFactsInput {
  monitoring?: MonitoringSnapshot | null;
  drives?: VolumeDriveInfo[];
  smartDisks?: DiskSmartHealth[];
  securityAudit?: SecurityAuditData | null;
  systemFilesStatus?: 'clean' | 'corrupted' | 'requires_elevation' | 'skipped' | 'not_tested';
  maintenanceEntries?: MaintenanceEntry[];
  tuningProfiles?: TuningProfile[];
  currentRigComponents?: Component[];
  referenceDate?: string;          // Data ISO opzionale per test deterministici
  recycleBin?: RecycleBinInfo | null;
  wingetUpdates?: WinGetUpdateItem[] | null;
}

export interface AreaHealthSummary {
  status: 'healthy' | 'attention' | 'warning' | 'critical';
  findingsCount: number;
}

/**
 * Stato del singolo canale/sensore diagnostico
 */
export type DiagnosticChannelStatus =
  | 'available'             // Sensore attivo e dato misurato affidabile
  | 'unavailable'           // Sensore al momento non disponibile o fallito
  | 'unsupported'           // Non supportato dall'OS/hardware o richiede driver ad hoc
  | 'permission_required'   // Richiede privilegi elevati (es. UAC Windows)
  | 'not_detected'          // Hardware non presente (es. GPU assente)
  | 'error';                // Errore durante l'interrogazione del canale

export interface DiagnosticChannel {
  id: string;
  label: string;
  area: HealthAffectedArea;
  status: DiagnosticChannelStatus;
  source?: string;
  details?: string;
}

export type DiagnosticCoverageLevel = 'full' | 'partial' | 'minimal';

/**
 * Copertura Diagnostica del Sistema:
 * Valuta obiettivamente quanti sensori e canali diagnostici sono attivi.
 * INDIPENDENTE dallo Health Score: metriche unavailable/unsupported non penalizzano lo score.
 */
export interface DiagnosticCoverage {
  level: DiagnosticCoverageLevel;
  percentage: number;               // 0 - 100%
  totalChannels: number;
  availableChannels: number;
  channels: DiagnosticChannel[];
  summary: string;
  hasHardwareGaps: boolean;         // true se ci sono canali non coperti
}

export interface SystemHealthReport {
  evaluatedAt: string;
  overallStatus: 'healthy' | 'attention' | 'warning' | 'critical';
  healthScore: number;             // Punteggio sintetico da 0 a 100
  diagnosticCoverage?: DiagnosticCoverage; // Livello di copertura diagnostica dei sensori
  summary: {
    criticalCount: number;
    warningCount: number;
    attentionCount: number;
    goodCount: number;
    infoCount: number;
  };
  findings: HealthFinding[];
  areaBreakdown: Record<HealthAffectedArea, AreaHealthSummary>;
}

