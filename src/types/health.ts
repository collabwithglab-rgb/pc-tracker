/**
 * Tipi per l'Health Engine e l'Audit di Sistema (PC Care Center - Tranche 2)
 */

import { MonitoringSnapshot } from './monitoring';
import { VolumeDriveInfo, DiskSmartHealth, SecurityAuditData } from './windowsTools';
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
}

export interface AreaHealthSummary {
  status: 'healthy' | 'attention' | 'warning' | 'critical';
  findingsCount: number;
}

export interface SystemHealthReport {
  evaluatedAt: string;
  overallStatus: 'healthy' | 'attention' | 'warning' | 'critical';
  healthScore: number;             // Punteggio sintetico da 0 a 100
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
