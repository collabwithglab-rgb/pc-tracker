import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  History,
  Trash2,
  Clock,
  Calendar,
  Wrench,
  Cpu,
  Zap,
  Battery,
  FileText,
  Terminal,
  Activity,
  Download,
} from 'lucide-react';
import { downloadCareHealthReport } from '../../domain/careReportExportEngine';
import { useTranslation, getBcp47 } from '../../locales';
import { SystemDiagnosticsSnapshot } from '../../types/diagnostics';
import { EventLogInspectionModal } from './EventLogInspectionModal';
import { WindowsServicesInspectionModal } from './WindowsServicesInspectionModal';
import {
  SystemFactsInput,
  SystemHealthReport,
  HealthSeverity,
} from '../../types/health';
import {
  OptimizationRecommendation,
  OptimizationReport,
  OptimizationRisk,
  ActionAvailability,
  OptimizationExecutionRecord,
  OptimizationOutcome,
  MaintenanceReminder,
  ReminderType,
  ReminderUrgency,
} from '../../types';
import { formatDate } from '../../utils';
import {
  evaluateSystemHealth,
} from '../../domain/healthEngine';
import {
  generateOptimizationRecommendations,
} from '../../domain/optimizationEngine';
import {
  getOutcomeBadgeClass,
  getOutcomeLabel,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
} from '../../domain/optimizationHistoryEngine';
import {
  executeOptimizationWorkflow,
  recordCancelledOptimization,
} from '../../services/optimizationExecutionService';
import { usePCStore } from '../../store';
import { Modal } from '../common/Modal';
import { OptimizationHistoryModal } from './OptimizationHistoryModal';

const DEMO_DIAGNOSTICS_SNAPSHOT: SystemDiagnosticsSnapshot = {
  timestamp: new Date().toISOString(),
  status: 'success',
  collectionDurationMs: 6,
  deviceProblems: {
    availability: 'available',
    source: 'CM_Get_DevNode_Status',
    totalDevicesScanned: 219,
    problemCount: 0,
    devicesWithProblems: [],
  },
  memoryCommit: {
    availability: 'available',
    source: 'GetPerformanceInfo',
    commitTotalBytes: 14_200_000_000,
    commitLimitBytes: 36_000_000_000,
    commitPeakBytes: 21_000_000_000,
    physicalTotalBytes: 34_359_738_368,
    physicalAvailableBytes: 22_548_578_304,
    systemCacheBytes: 6_442_450_944,
    kernelPagedBytes: 480_000_000,
    kernelNonpagedBytes: 350_000_000,
    processCount: 168,
    threadCount: 2450,
    commitUtilizationPercent: 39,
    physicalUtilizationPercent: 34,
  },
  powerStatus: {
    availability: 'available',
    source: 'GetSystemPowerStatus',
    acLineStatus: 1,
    batteryFlag: 128,
    batteryLifePercent: null,
    batterySaverActive: false,
    hasSystemBattery: false,
    isOnAC: true,
    isOnBattery: false,
    powerArchitecture: 'desktop_like',
  },
  eventLog: {
    availability: 'available',
    source: 'Wevtapi_SystemLog',
    queryTimeWindowHours: 168,
    maxEventsCap: 50,
    returnedEventCount: 0,
    truncated: false,
    events: [],
  },
  systemServices: {
    availability: 'available',
    source: 'Advapi32_SCM',
    scannedAt: new Date().toISOString(),
    catalogCount: 6,
    services: [
      {
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        currentState: 'running',
        startType: 'auto',
        win32ExitCode: 0,
        processId: 1044,
      },
      {
        serviceName: 'Winmgmt',
        displayName: 'Windows Management Instrumentation',
        operationalModel: 'always_running',
        currentState: 'running',
        startType: 'auto',
        win32ExitCode: 0,
        processId: 1820,
      },
      {
        serviceName: 'wuauserv',
        displayName: 'Windows Update',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      },
      {
        serviceName: 'TrustedInstaller',
        displayName: 'Windows Modules Installer',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      },
      {
        serviceName: 'VSS',
        displayName: 'Volume Shadow Copy',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      },
      {
        serviceName: 'WinDefend',
        displayName: 'Microsoft Defender Antivirus Service',
        operationalModel: 'contextual',
        currentState: 'running',
        startType: 'auto',
        win32ExitCode: 0,
        processId: 3412,
      },
    ],
  },
};

interface CareOverviewTabProps {
  facts: SystemFactsInput;
  onRefreshFacts?: () => void;
  onSwitchTab?: (tab: 'live' | 'registro' | 'windows' | 'tuning') => void;
  onOpenWikiArticle?: (articleId: string) => void;
  onShowNotification?: (type: 'success' | 'error', message: string) => void;
}

export const CareOverviewTab: React.FC<CareOverviewTabProps> = ({
  facts,
  onRefreshFacts,
  onSwitchTab,
  onOpenWikiArticle: _onOpenWikiArticle,
  onShowNotification,
}) => {
  const { t, currentLocale } = useTranslation();
  const bcp47 = getBcp47(currentLocale);
  const {
    optimizationHistory,
    recordOptimizationExecution,
    deleteOptimizationExecution,
    clearOptimizationHistory,
    maintenanceReminders: storeReminders,
    computeMaintenanceReminders,
    setReminderSnooze,
    settings,
  } = usePCStore();

  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [showCoverageDetails, setShowCoverageDetails] = useState(false);
  const [confirmingRec, setConfirmingRec] = useState<OptimizationRecommendation | null>(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<OptimizationExecutionRecord | null>(null);
  const [historyFilter, setHistoryFilter] = useState<OptimizationOutcome | 'ALL'>('ALL');
  const [recViewFilter, setRecViewFilter] = useState<'actionable' | 'resolved'>('actionable');
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);
  const [isEventLogModalOpen, setIsEventLogModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [showDemoDiagnostics, setShowDemoDiagnostics] = useState(false);

  // Snapshot diagnostico attivo (nativo Windows o anteprima web opzionale)
  const activeDiagnostics = useMemo(() => {
    if (facts.diagnostics && facts.diagnostics.status !== 'unsupported') {
      return facts.diagnostics;
    }
    if (showDemoDiagnostics) {
      return DEMO_DIAGNOSTICS_SNAPSHOT;
    }
    return null;
  }, [facts.diagnostics, showDemoDiagnostics]);

  // Valutazione pura e deterministica della salute
  const healthReport: SystemHealthReport = useMemo(() => {
    return evaluateSystemHealth(facts);
  }, [facts]);

  // Generazione raccomandazioni motivate di ottimizzazione con memoria storica e ciclo di vita
  const optReport: OptimizationReport = useMemo(() => {
    return generateOptimizationRecommendations(facts, healthReport, optimizationHistory);
  }, [facts, healthReport, optimizationHistory]);

  // Raccomandazioni complessive (attive + risolte/in cooldown) per calcolo deterministico dello scheduler
  const allRecommendations = useMemo(() => [
    ...(optReport.recommendations || []),
    ...(optReport.resolvedOrCooldownRecommendations || []),
  ], [optReport]);

  // Promemoria derivati direttamente dallo Scheduler Engine tramite PCContext
  const maintenanceReminders = useMemo(() => {
    if (typeof computeMaintenanceReminders === 'function' && (allRecommendations.length > 0 || facts)) {
      const computed = computeMaintenanceReminders(allRecommendations, facts);
      if (computed.length > 0 || !storeReminders?.length) {
        return computed;
      }
    }
    return storeReminders || [];
  }, [computeMaintenanceReminders, allRecommendations, facts, storeReminders]);

  // Visualizzazione sobria con tetto a massimo 3 elementi preservando l'ordine del motore
  const displayedReminders = useMemo(() => {
    return showAllReminders ? maintenanceReminders : maintenanceReminders.slice(0, 3);
  }, [showAllReminders, maintenanceReminders]);

  const notify = (type: 'success' | 'warning' | 'error' | 'info', msg: string) => {
    onShowNotification?.(type === 'success' ? 'success' : 'error', msg);
  };

  const handleExportReport = (format: 'markdown' | 'json' = 'markdown') => {
    try {
      downloadCareHealthReport(healthReport, facts, optReport.recommendations, format, currentLocale);
      notify('success', t('care_export_report_success'));
    } catch (err) {
      notify('error', `Errore durante l'esportazione: ${(err as Error).message}`);
    }
  };

  // Click su azione del promemoria: delega al target rec (con confirmation flow se necessario), a history o al registro
  const handleReminderAction = (reminder: MaintenanceReminder) => {
    if (reminder.recommendationId) {
      const targetRec = allRecommendations.find((r) => r.id === reminder.recommendationId);
      if (targetRec) {
        handleActionClick(targetRec);
        return;
      }
    }

    if (reminder.type === 'VERIFICATION_REMINDER') {
      if (reminder.executionRecordId) {
        const histRecord = optimizationHistory.find((r) => r.id === reminder.executionRecordId);
        if (histRecord) {
          setSelectedHistoryRecord(histRecord);
          return;
        }
      }
      onSwitchTab?.('registro');
      return;
    }

    if (reminder.type === 'MAINTENANCE_REMINDER') {
      onSwitchTab?.('registro');
      return;
    }
  };

  const getReminderActionLabel = (reminder: MaintenanceReminder): string | null => {
    if (reminder.type === 'VERIFICATION_REMINDER') {
      return 'Verifica';
    }
    if (reminder.type === 'MAINTENANCE_REMINDER') {
      return 'Apri Registro';
    }
    if (reminder.recommendationId) {
      const targetRec = allRecommendations.find((r) => r.id === reminder.recommendationId);
      if (targetRec) {
        if (targetRec.actionAvailability === 'MANUAL' || targetRec.actionAvailability === 'MANUAL_GUIDED') {
          return 'Apri Guida';
        }
        if (reminder.type === 'CONDITION_RECHECK') {
          return 'Rivedi';
        }
        return 'Esegui ora';
      }
      return 'Esegui ora';
    }
    return null;
  };

  // Snooze discreto di 7 giorni: delega al PCContext, persistito su IndexedDB e ricalcolato dal domain engine
  const handleSnooze = async (reminder: MaintenanceReminder, days: number = 7) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const snoozedUntil = targetDate.toISOString().slice(0, 10);
      await setReminderSnooze(reminder.id, snoozedUntil);
      notify('success', 'Promemoria posticipato di 7 giorni.');
    } catch (err) {
      console.error('Errore durante lo snooze del promemoria:', err);
      notify('error', 'Impossibile posticipare il promemoria.');
    }
  };

  const getReminderUrgencyBadge = (urgency: ReminderUrgency) => {
    switch (urgency) {
      case 'overdue':
        return <span className="badge badge-ruby">Scaduto</span>;
      case 'condition_active':
        return <span className="badge badge-amber">Anomalia Attiva</span>;
      case 'verification_pending':
        return <span className="badge badge-cyan">Verifica in Sospeso</span>;
      case 'action_required':
        return <span className="badge badge-cyan">Consigliato Ora</span>;
      case 'due_soon':
        return <span className="badge badge-subtle" style={{ color: 'var(--accent-amber)' }}>Imminente</span>;
      case 'upcoming':
      default:
        return <span className="badge badge-subtle">Programmato</span>;
    }
  };

  const getReminderAccentBorder = (urgency: ReminderUrgency) => {
    switch (urgency) {
      case 'overdue':
        return '3px solid var(--accent-ruby)';
      case 'condition_active':
        return '3px solid var(--accent-amber)';
      case 'verification_pending':
        return '3px solid var(--accent-cyan)';
      case 'action_required':
        return '3px solid var(--accent-cyan)';
      case 'due_soon':
        return '3px solid var(--accent-amber)';
      case 'upcoming':
      default:
        return '3px solid var(--border-subtle)';
    }
  };

  const getReminderIcon = (type: ReminderType) => {
    switch (type) {
      case 'PERIODIC_REMINDER':
        return <Clock size={16} color="var(--accent-cyan)" />;
      case 'MAINTENANCE_REMINDER':
        return <Wrench size={16} color="var(--accent-amber)" />;
      case 'VERIFICATION_REMINDER':
        return <CheckCircle2 size={16} color="var(--accent-cyan)" />;
      case 'CONDITION_RECHECK':
        return <AlertTriangle size={16} color="var(--accent-amber)" />;
      default:
        return <Clock size={16} color="var(--text-muted)" />;
    }
  };

  const getReminderTemporalText = (reminder: MaintenanceReminder) => {
    if (reminder.daysRemaining !== undefined) {
      if (reminder.daysRemaining < 0) {
        const overdueDays = Math.abs(reminder.daysRemaining);
        return `Scaduto da ${overdueDays} ${overdueDays === 1 ? 'giorno' : 'giorni'}`;
      }
      if (reminder.daysRemaining === 0) {
        return 'Scadenza oggi';
      }
      return `Tra ${reminder.daysRemaining} ${reminder.daysRemaining === 1 ? 'giorno' : 'giorni'}`;
    }
    if (reminder.dueDate) {
      return `Scadenza: ${formatDate(reminder.dueDate, settings.dateFormat)}`;
    }
    if (reminder.type === 'VERIFICATION_REMINDER') {
      return 'Verifica in sospeso';
    }
    if (reminder.type === 'CONDITION_RECHECK') {
      return 'Persistente dopo intervento';
    }
    return 'In programma';
  };

  // Click su azione consigliata: se mutante (USER_CONFIRMED), richiede conferma esplicita
  const handleActionClick = (rec: OptimizationRecommendation) => {
    if (rec.actionAvailability === 'USER_CONFIRMED') {
      setConfirmingRec(rec);
      return;
    }
    handleExecuteAction(rec);
  };

  // Esecuzione diretta dell'azione consigliata con tracciamento storico centralizzato
  const handleExecuteAction = async (rec: OptimizationRecommendation) => {
    setExecutingActionId(rec.id);
    try {
      const res = await executeOptimizationWorkflow({
        recommendation: rec,
        facts,
        recordExecution: recordOptimizationExecution,
        onRefreshFacts,
        onSwitchTab,
      });
      notify(res.notification.type, res.notification.message);
    } catch (err) {
      console.error('Errore durante l\'esecuzione dell\'azione:', err);
      notify('error', 'Si è verificato un errore durante l\'operazione.');
    } finally {
      setExecutingActionId(null);
      setConfirmingRec(null);
    }
  };

  // Annullamento esplicito dal prompt di conferma (USER_CONFIRMED)
  const handleCancelConfirmation = async () => {
    if (confirmingRec) {
      try {
        await recordCancelledOptimization(
          confirmingRec,
          'Operazione annullata dall\'utente al prompt di conferma',
          recordOptimizationExecution
        );
        notify('info', `Operazione annullata: ${confirmingRec.title}`);
      } catch (err) {
        console.error('Errore durante la registrazione dell\'annullamento:', err);
      }
      setConfirmingRec(null);
    }
  };

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'ALL') return optimizationHistory;
    return optimizationHistory.filter((r) => r.outcome === historyFilter);
  }, [optimizationHistory, historyFilter]);

  const historyCounts = useMemo(() => {
    return {
      all: optimizationHistory.length,
      success: optimizationHistory.filter((r) => r.outcome === 'success').length,
      cancelled: optimizationHistory.filter((r) => r.outcome === 'cancelled').length,
      failed: optimizationHistory.filter((r) => r.outcome === 'failed').length,
    };
  }, [optimizationHistory]);

  // Badge stile per severità finding
  const getSeverityBadge = (severity: HealthSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="badge badge-ruby"><AlertCircle size={12} /> Critico</span>;
      case 'WARNING':
        return <span className="badge badge-amber"><AlertTriangle size={12} /> Attenzione</span>;
      case 'ATTENTION':
        return <span className="badge badge-cyan"><Info size={12} /> Nota</span>;
      case 'GOOD':
        return <span className="badge badge-emerald"><CheckCircle2 size={12} /> Ottimale</span>;
      case 'INFO':
      default:
        return <span className="badge badge-subtle"><Info size={12} /> Info</span>;
    }
  };

  // Badge stile per livello rischio raccomandazione
  const getRiskBadge = (risk: OptimizationRisk) => {
    switch (risk) {
      case 'NONE':
        return <span className="badge badge-emerald" title="Zero rischi: operazione di sola lettura o manutenzione ufficiale non distruttiva">Rischio: Nullo</span>;
      case 'LOW':
        return <span className="badge badge-cyan" title="Basso rischio: file temporanei ricreabili o schemi Windows standard">Rischio: Basso</span>;
      case 'MODERATE':
        return <span className="badge badge-amber" title="Rischio moderato: consigliato punto di ripristino">Rischio: Moderato</span>;
      case 'HIGH':
        return <span className="badge badge-ruby" title="Alto rischio: richiede attenzione o intervento manuale">Rischio: Elevato</span>;
    }
  };

  // Badge stato di eleggibilità e ciclo di vita (Tranche 5)
  const getEligibilityBadge = (rec: OptimizationRecommendation) => {
    switch (rec.eligibility) {
      case 'RECURRING_ACTIVE':
        return (
          <span className="badge badge-amber" title={rec.historyExplanation} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}>
            <AlertTriangle size={11} />
            <span>Condizione ancora attiva</span>
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="badge badge-cyan" title={rec.historyExplanation} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}>
            <Clock size={11} />
            <span>Verifica in attesa</span>
          </span>
        );
      case 'COOLDOWN':
        return (
          <span className="badge badge-subtle" title={rec.historyExplanation} style={{ fontSize: '0.72rem' }}>
            In riposo ({rec.cooldownRemainingDays ? `${rec.cooldownRemainingDays} gg` : 'cooldown'})
          </span>
        );
      case 'ALREADY_RESOLVED':
        return (
          <span className="badge badge-emerald" title={rec.historyExplanation} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}>
            <CheckCircle2 size={11} />
            <span>Risolta</span>
          </span>
        );
      case 'ELIGIBLE':
      default:
        if (rec.executionCount && rec.executionCount > 0) {
          return (
            <span className="badge badge-subtle" title={rec.historyExplanation} style={{ fontSize: '0.72rem' }}>
              Nuovamente eleggibile
            </span>
          );
        }
        return (
          <span className="badge badge-subtle" style={{ fontSize: '0.72rem' }}>
            Nuova
          </span>
        );
    }
  };

  // Badge disponibilità azione con semantica a 5 livelli
  const getActionAvailabilityBadge = (avail: ActionAvailability) => {
    switch (avail) {
      case 'READ_ONLY':
        return <span className="care-avail-badge" style={{ backgroundColor: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-secondary)', border: '1px solid rgba(100, 116, 139, 0.3)' }}>Read-only</span>;
      case 'ONE_CLICK':
      case 'AUTOMATED_SAFE':
        return <span className="care-avail-badge avail-auto">1-Click</span>;
      case 'USER_CONFIRMED':
        return <span className="care-avail-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>User-confirmed</span>;
      case 'ASSISTED':
      case 'ASSISTED_UAC':
        return <span className="care-avail-badge avail-uac">Assistito (UAC)</span>;
      case 'MANUAL':
      case 'MANUAL_GUIDED':
        return <span className="care-avail-badge avail-manual">Manuale / Guidato</span>;
      default:
        return null;
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'score-healthy';
    if (score >= 75) return 'score-attention';
    if (score >= 50) return 'score-warning';
    return 'score-critical';
  };

  const displayedRecommendations = useMemo(() => {
    if (recViewFilter === 'actionable') {
      return optReport.recommendations;
    }
    return optReport.resolvedOrCooldownRecommendations || [];
  }, [recViewFilter, optReport]);


  return (
    <div className="care-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* 1. HERO BANNER: HEALTH SCORE & STATUS */}
      <div className="card care-hero-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
          <div className={`care-score-ring ${getScoreColorClass(healthReport.healthScore)}`}>
            <span className="care-score-number">{healthReport.healthScore}</span>
            <span className="care-score-max">/100</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>
                {healthReport.healthScore >= 90 ? 'Stato del Sistema Ottimale' :
                 healthReport.healthScore >= 75 ? 'Sistema in Buono Stato' :
                 healthReport.healthScore >= 50 ? 'Interventi Consigliati' : 'Attenzione Richiesta'}
              </h2>
              {healthReport.overallStatus === 'healthy' && <span className="badge badge-emerald">Salute OK</span>}
              {healthReport.overallStatus === 'attention' && <span className="badge badge-cyan">In Osservazione</span>}
              {healthReport.overallStatus === 'warning' && <span className="badge badge-amber">Avviso</span>}
              {healthReport.overallStatus === 'critical' && <span className="badge badge-ruby">Critico</span>}
            </div>

            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '580px', lineHeight: 1.5 }}>
              Valutazione obiettiva basata sulla telemetria nativa di Windows, stato S.M.A.R.T. dei dischi, profilo di raffreddamento e registro di manutenzione fisica.
            </p>

            {/* SEPARATED DIAGNOSTIC COVERAGE INDICATOR */}
            {healthReport.diagnosticCoverage && (
              <div style={{ marginTop: 'var(--space-xs)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Copertura Diagnostica:</span>
                  <span
                    className={`badge ${
                      healthReport.diagnosticCoverage.level === 'full'
                        ? 'badge-emerald'
                        : healthReport.diagnosticCoverage.level === 'partial'
                        ? 'badge-cyan'
                        : 'badge-amber'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                  >
                    {healthReport.diagnosticCoverage.level === 'full' ? 'Completa' : healthReport.diagnosticCoverage.level === 'partial' ? 'Parziale' : 'Minima'} ({healthReport.diagnosticCoverage.availableChannels}/{healthReport.diagnosticCoverage.totalChannels} attivi)
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setShowCoverageDetails(!showCoverageDetails)}
                    style={{ fontSize: '0.72rem', textDecoration: 'underline', padding: '1px 6px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                  >
                    {showCoverageDetails ? (
                      <>
                        <span>Nascondi canali</span>
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        <span>Dettaglio canali ({healthReport.diagnosticCoverage.availableChannels}/{healthReport.diagnosticCoverage.totalChannels})</span>
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4, maxWidth: '640px' }}>
                  <em>"Nessuna anomalia rilevata" non significa che tutti i sensori siano presenti o disponibili. Le metriche non supportate dall'OS senza driver dedicati non penalizzano lo Health Score.</em>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleExportReport('markdown')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            title={t('care_export_report_desc')}
          >
            <Download size={14} color="var(--accent-primary)" />
            <span>{t('care_export_report_btn')}</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleExportReport('json')}
            style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}
            title="Esporta JSON diagnostico grezzo"
          >
            JSON
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefreshFacts}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
          >
            <RefreshCw size={14} />
            <span>Riesamina Sistema</span>
          </button>
        </div>
      </div>

      {/* DROPDOWN DETTAGLIO COPERTURA CANALI DIAGNOSTICI */}
      {showCoverageDetails && healthReport.diagnosticCoverage && (
        <div className="card" style={{ padding: 'var(--space-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
            Canali Diagnostici di Sistema ({healthReport.diagnosticCoverage.availableChannels}/{healthReport.diagnosticCoverage.totalChannels} disponibili)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-xs)' }}>
            {healthReport.diagnosticCoverage.channels.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.label}
                  </span>
                  {c.details && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.details}
                    </span>
                  )}
                </div>
                <span
                  className={`badge ${
                    c.status === 'available'
                      ? 'badge-emerald'
                      : c.status === 'permission_required'
                      ? 'badge-amber'
                      : c.status === 'not_detected'
                      ? 'badge-subtle'
                      : 'badge-cyan'
                  }`}
                  style={{ fontSize: '0.68rem', padding: '1px 6px', flexShrink: 0 }}
                >
                  {c.status === 'available'
                    ? 'Attivo'
                    : c.status === 'permission_required'
                    ? 'Richiede UAC'
                    : c.status === 'unsupported'
                    ? 'Non supportato'
                    : c.status === 'not_detected'
                    ? 'Non presente'
                    : 'Non disponibile'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STATS SUMMARY PILLS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="stat-icon-badge" style={{ backgroundColor: 'var(--accent-ruby-subtle)', color: 'var(--accent-ruby)' }}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{healthReport.summary.criticalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critici</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="stat-icon-badge" style={{ backgroundColor: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{healthReport.summary.warningCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avvisi</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="stat-icon-badge" style={{ backgroundColor: 'var(--accent-cyan-subtle)', color: 'var(--accent-cyan)' }}>
            <Info size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{healthReport.summary.attentionCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note Attive</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <div className="stat-icon-badge" style={{ backgroundColor: 'var(--accent-emerald-subtle)', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{healthReport.summary.goodCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ottimali</div>
          </div>
        </div>
      </div>

      {/* 2.3 DIAGNOSTICA NATIVA DI SISTEMA (5 CANALI: DRIVER, COMMIT, POWER, EVENT LOG, SERVIZI) */}
      {activeDiagnostics ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {showDemoDiagnostics && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '0.78rem',
              }}
            >
              <span style={{ color: 'var(--accent-cyan)' }}>
                ℹ️ Anteprima Dimostrativa Web: visualizzazione simulata dei fatti nativi catturati da Rust in ambiente Desktop.
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowDemoDiagnostics(false)}
                style={{ fontSize: '0.72rem', padding: '1px 6px' }}
              >
                Nascondi anteprima
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {/* Card 1: Periferiche e Driver Hardware */}
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Periferiche & Driver
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      activeDiagnostics.deviceProblems.problemCount === 0 ? 'badge-emerald' : 'badge-amber'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {activeDiagnostics.deviceProblems.problemCount === 0
                      ? '0 Problemi'
                      : `${activeDiagnostics.deviceProblems.problemCount} Problemi`}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {activeDiagnostics.deviceProblems.problemCount === 0 ? (
                    <span>Tutti i {activeDiagnostics.deviceProblems.totalDevicesScanned} nodi hardware operano nominalmente senza codici errore Windows.</span>
                  ) : (
                    <span>
                      Rilevati codici di errore in {activeDiagnostics.deviceProblems.problemCount} periferiche su {activeDiagnostics.deviceProblems.totalDevicesScanned} scansionate.
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                Fonte: CM_Get_DevNode_Status • Windows CfgMgr
              </div>
            </div>

            {/* Card 2: Spazio di Commit e Paging */}
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Spazio di Commit
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      activeDiagnostics.memoryCommit.commitUtilizationPercent >= 88
                        ? 'badge-amber'
                        : 'badge-emerald'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {activeDiagnostics.memoryCommit.commitUtilizationPercent}% Allocato
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {(activeDiagnostics.memoryCommit.commitTotalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </strong>{' '}
                    / {(activeDiagnostics.memoryCommit.commitLimitBytes / (1024 * 1024 * 1024)).toFixed(1)} GB limite
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    RAM libera: {(activeDiagnostics.memoryCommit.physicalAvailableBytes / (1024 * 1024 * 1024)).toFixed(1)} GB • Cache: {(activeDiagnostics.memoryCommit.systemCacheBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                Fonte: GetPerformanceInfo • Memoria virtuale protetta
              </div>
            </div>

            {/* Card 3: Architettura Energetica */}
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeDiagnostics.powerStatus.hasSystemBattery ? (
                      <Battery size={16} color="var(--accent-primary)" />
                    ) : (
                      <Zap size={16} color="var(--accent-primary)" />
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Alimentazione
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      activeDiagnostics.powerStatus.isOnBattery ? 'badge-amber' : 'badge-cyan'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {activeDiagnostics.powerStatus.isOnBattery ? 'Batteria' : 'Rete AC'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <div>
                    {activeDiagnostics.powerStatus.powerArchitecture === 'desktop_like'
                      ? 'Desktop Fisso (Rete Elettrica AC)'
                      : activeDiagnostics.powerStatus.isOnBattery
                      ? `Portatile su Batteria (${activeDiagnostics.powerStatus.batteryLifePercent ?? 'N/D'}%)`
                      : 'Portatile Collegato ad Alimentazione AC'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {activeDiagnostics.powerStatus.batterySaverActive
                      ? 'Risparmio batteria Windows: Attivo'
                      : 'Profilo energetico standard Windows'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                Fonte: GetSystemPowerStatus • Architettura operativa
              </div>
            </div>

            {/* Card 4: Eventi Kernel & Driver (Tranche 8A & 8E) */}
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Eventi Kernel & Driver
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      !activeDiagnostics.eventLog || activeDiagnostics.eventLog.returnedEventCount === 0
                        ? 'badge-emerald'
                        : activeDiagnostics.eventLog.truncated
                        ? 'badge-amber'
                        : 'badge-cyan'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {!activeDiagnostics.eventLog || activeDiagnostics.eventLog.returnedEventCount === 0
                      ? '0 Segnalazioni'
                      : activeDiagnostics.eventLog.truncated
                      ? '50+ (Cap Raggiunto)'
                      : `${activeDiagnostics.eventLog.returnedEventCount} Eventi`}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {activeDiagnostics.eventLog?.truncated ? (
                    <span style={{ color: 'var(--accent-amber)' }}>
                      Almeno 50 eventi rilevati (campionamento limitato ai più recenti)
                    </span>
                  ) : !activeDiagnostics.eventLog || activeDiagnostics.eventLog.returnedEventCount === 0 ? (
                    <span>Nessun evento critico registrato nel canale System negli ultimi 7 giorni (WHEA, Kernel-Power, Disk, NTFS, Display TDR).</span>
                  ) : (
                    <span>Rilevati {activeDiagnostics.eventLog.returnedEventCount} eventi diagnostici analizzati negli ultimi 7 giorni.</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Fonte: Wevtapi_SystemLog • Canale System (168h)
                </span>
                {activeDiagnostics.eventLog && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setIsEventLogModalOpen(true)}
                    style={{ fontSize: '0.72rem', padding: '1px 6px', color: 'var(--accent-primary)' }}
                  >
                    Ispeziona Log
                  </button>
                )}
              </div>
            </div>

            {/* Card 5: Servizi di Sistema SCM (Tranche 8B & 8E) */}
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Servizi di Sistema (SCM)
                    </span>
                  </div>
                  {(() => {
                    const problematicCount = activeDiagnostics.systemServices?.services?.filter((s) => {
                      if (s.operationalModel === 'always_running' && s.currentState !== 'running') return true;
                      if (s.startType === 'disabled' && s.operationalModel !== 'contextual') return true;
                      if (s.win32ExitCode !== 0) return true;
                      return false;
                    }).length ?? 0;

                    return (
                      <span
                        className={`badge ${problematicCount === 0 ? 'badge-emerald' : 'badge-amber'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {problematicCount === 0 ? '6/6 Regolari' : `${problematicCount} con Anomalie`}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {(() => {
                    const problematic = activeDiagnostics.systemServices?.services?.filter((s) => {
                      if (s.operationalModel === 'always_running' && s.currentState !== 'running') return true;
                      if (s.startType === 'disabled' && s.operationalModel !== 'contextual') return true;
                      if (s.win32ExitCode !== 0) return true;
                      return false;
                    }) ?? [];

                    if (problematic.length === 0) {
                      return <span>Modello a 3 classi: servizi essenziali attivi; servizi on-demand a riposo considerati fisiologici.</span>;
                    }
                    return (
                      <span>
                        Rilevata anomalia in {problematic.map((p) => p.displayName).join(', ')}.
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Fonte: Advapi32_SCM • Catalogo 6 Servizi
                </span>
                {activeDiagnostics.systemServices && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setIsServicesModalOpen(true)}
                    style={{ fontSize: '0.72rem', padding: '1px 6px', color: 'var(--accent-primary)' }}
                  >
                    Stato Servizi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: 'var(--space-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Terminal size={18} color="var(--accent-primary)" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Diagnostica Nativa di Sistema (Hardware, Memoria, Event Log & Servizi SCM)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Rilevata con zero processi esterni nell'applicazione Desktop Windows nativa di PC Tracker.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setShowDemoDiagnostics(true)}
            style={{ fontSize: '0.75rem' }}
          >
            Attiva Anteprima Diagnostica
          </button>
        </div>
      )}

      {/* 2.5 PROSSIMI PROMEMORIA (SMART MAINTENANCE SCHEDULER) */}
      <div className="care-reminders-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Calendar size={18} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
              Prossimi Promemoria {maintenanceReminders.length > 0 && `(${maintenanceReminders.length})`}
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Scheduler intelligente attivo
          </span>
        </div>

        {maintenanceReminders.length === 0 ? (
          <div className="care-reminders-empty">
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
            <span>Nessun promemoria di manutenzione imminente</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {displayedReminders.map((reminder) => {
              const targetRec = reminder.recommendationId
                ? allRecommendations.find((r) => r.id === reminder.recommendationId)
                : undefined;
              const histRecord = reminder.executionRecordId
                ? optimizationHistory.find((r) => r.id === reminder.executionRecordId)
                : undefined;
              const actionLabel = getReminderActionLabel(reminder);
              const isExpanded = expandedReminderId === reminder.id;
              const isActionExecuting = targetRec && executingActionId === targetRec.id;

              return (
                <div
                  key={reminder.id}
                  className="card care-reminder-card"
                  style={{
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    borderLeft: getReminderAccentBorder(reminder.urgency),
                  }}
                >
                  {/* Riga Superiore: Titolo, Icona, Urgenza, Target, Scadenza */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-input)',
                          flexShrink: 0,
                        }}
                      >
                        {getReminderIcon(reminder.type)}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {reminder.title}
                      </h4>
                      {getReminderUrgencyBadge(reminder.urgency)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {reminder.target && (
                        <span className="category-chip" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                          {reminder.target}
                        </span>
                      )}
                      <span>· {getReminderTemporalText(reminder)}</span>
                    </div>
                  </div>

                  {/* Descrizione / Spiegazione */}
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {reminder.explanation || reminder.description}
                  </p>

                  {/* Riga Inferiore: Dettagli (sx) e Azioni/Snooze (dx) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-xs)', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setExpandedReminderId((prev) => (prev === reminder.id ? null : reminder.id))}
                      aria-expanded={isExpanded}
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}
                    >
                      <span>{isExpanded ? 'Nascondi dettagli' : 'Dettagli'}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleSnooze(reminder, 7)}
                        title="Posticipa questo promemoria di 7 giorni"
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '2px 8px' }}
                      >
                        Posticipa (7gg)
                      </button>

                      {actionLabel && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleReminderAction(reminder)}
                          disabled={isActionExecuting}
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 10px',
                            fontWeight: 600,
                            borderColor: 'var(--accent-primary-border)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {isActionExecuting ? 'In esecuzione...' : actionLabel}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pannello Dettaglio Espandibile */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 'var(--space-2xs)',
                        padding: 'var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Perché: </strong>
                        <span>{reminder.explanation}</span>
                      </div>
                      {targetRec?.evidence && (
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Evidenza rilevata: </strong>
                          <span>{targetRec.evidence}</span>
                        </div>
                      )}
                      {reminder.dueDate && (
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Scadenza: </strong>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(reminder.dueDate, settings.dateFormat)}</span>
                        </div>
                      )}
                      {(targetRec?.lastExecution || histRecord) && (
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Ultima esecuzione: </strong>
                          <span>
                            {(targetRec?.lastExecution || histRecord)?.timestampCompleted
                              ? formatDate((targetRec?.lastExecution || histRecord)!.timestampCompleted!.slice(0, 10), settings.dateFormat)
                              : 'Recente'}{' '}
                            ({(targetRec?.lastExecution || histRecord)?.outcome === 'success' ? 'Completata con successo' : 'Esito registrato'})
                          </span>
                        </div>
                      )}
                      {targetRec?.actionDescription && (
                        <div>
                          <strong style={{ color: 'var(--accent-cyan)' }}>Azione di sistema: </strong>
                          <span>{targetRec.actionDescription}</span>
                        </div>
                      )}
                      {(targetRec?.verificationMethod || histRecord?.verificationMethod) && (
                        <div>
                          <strong style={{ color: 'var(--text-muted)' }}>Verifica di efficacia: </strong>
                          <span style={{ fontStyle: 'italic' }}>{targetRec?.verificationMethod || histRecord?.verificationMethod}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {maintenanceReminders.length > 3 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowAllReminders(!showAllReminders)}
                style={{
                  alignSelf: 'flex-start',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                }}
              >
                <span>{showAllReminders ? 'Mostra meno' : `Mostra tutti (${maintenanceReminders.length})`}</span>
                {showAllReminders ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. RACCOMANDAZIONI MOTIVATE DI OTTIMIZZAZIONE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
              Ottimizzazioni Consigliate ({optReport.totalCount})
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            {/* View filter: Da applicare vs In Cooldown / Risolte */}
            {optReport.resolvedOrCooldownRecommendations && optReport.resolvedOrCooldownRecommendations.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    backgroundColor: recViewFilter === 'actionable' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: recViewFilter === 'actionable' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: 'none',
                  }}
                  onClick={() => setRecViewFilter('actionable')}
                >
                  Da applicare ({optReport.totalCount})
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    backgroundColor: recViewFilter === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: recViewFilter === 'resolved' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    border: 'none',
                  }}
                  onClick={() => setRecViewFilter('resolved')}
                >
                  In Cooldown / Risolte ({optReport.resolvedOrCooldownRecommendations.length})
                </button>
              </div>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Memoria deterministica attiva
            </span>
          </div>
        </div>

        {displayedRecommendations.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto var(--space-sm)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {recViewFilter === 'actionable'
                ? 'Nessuna Ottimizzazione Necessaria'
                : 'Nessuna Ottimizzazione in Cooldown'}
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: 'var(--space-xs)', maxWidth: '520px', margin: 'var(--space-xs) auto 0' }}>
              {recViewFilter === 'actionable' ? (
                <>
                  Il tuo PC è aggiornato, le unità SSD sono ottimizzate e non risultano anomalie o file di sistema danneggiati.
                  {optReport.resolvedOrCooldownRecommendations && optReport.resolvedOrCooldownRecommendations.length > 0 && (
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {optReport.resolvedOrCooldownRecommendations.length} ottimizzazioni sono attualmente in periodo di riposo (cooldown) o già verificate con successo.{' '}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setRecViewFilter('resolved')}
                        style={{ fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--accent-cyan)', padding: 0 }}
                      >
                        Visualizza interventi in cooldown
                      </button>
                    </div>
                  )}
                </>
              ) : (
                'Tutte le ottimizzazioni disponibili sono attualmente eleggibili o non risultano interventi recenti in pausa.'
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {displayedRecommendations.map((rec) => (
              <div key={rec.id} className="card care-rec-card" style={{ padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-2xs)' }}>
                      <span className="care-category-tag">{rec.category.toUpperCase()}</span>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec.title}
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {rec.reason}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {getEligibilityBadge(rec)}
                    {getRiskBadge(rec.risk)}
                    {getActionAvailabilityBadge(rec.actionAvailability)}
                  </div>
                </div>

                <div className="care-rec-details-box" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)', margin: 'var(--space-sm) 0', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '110px' }}>Fatto Rilevato:</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{rec.evidence}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)' }}>
                    <span style={{ color: 'var(--accent-emerald)', minWidth: '110px' }}>Beneficio:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{rec.expectedBenefit}</span>
                  </div>

                  {/* Contesto Storico e Memoria del Ciclo di Vita (Tranche 5) */}
                  {rec.historyExplanation && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)' }}>
                      <span style={{
                        color: rec.eligibility === 'RECURRING_ACTIVE'
                          ? 'var(--accent-amber)'
                          : rec.eligibility === 'PENDING_VERIFICATION'
                          ? 'var(--accent-cyan)'
                          : 'var(--text-muted)',
                        minWidth: '110px',
                        fontWeight: rec.eligibility === 'RECURRING_ACTIVE' ? 600 : 400
                      }}>
                        Memoria Storica:
                      </span>
                      <span style={{
                        color: rec.eligibility === 'RECURRING_ACTIVE'
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
                        lineHeight: 1.4
                      }}>
                        {rec.historyExplanation}
                      </span>
                    </div>
                  )}

                  {rec.lastExecution && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: rec.actionDescription ? 'var(--space-2xs)' : '0' }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: '110px' }}>Ultima Azione:</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {new Date(rec.lastExecution.timestampCompleted || rec.lastExecution.timestampStarted).toLocaleDateString(bcp47, { day: '2-digit', month: '2-digit', year: 'numeric' })} ore {new Date(rec.lastExecution.timestampCompleted || rec.lastExecution.timestampStarted).toLocaleTimeString(bcp47, { hour: '2-digit', minute: '2-digit' })} ({getOutcomeLabel(rec.lastExecution.outcome)})
                      </span>
                    </div>
                  )}

                  {rec.actionDescription && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: rec.verificationMethod ? 'var(--space-2xs)' : '0' }}>
                      <span style={{ color: 'var(--accent-cyan)', minWidth: '110px' }}>Azione:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{rec.actionDescription}</span>
                    </div>
                  )}
                  {rec.verificationMethod && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: '110px' }}>Verifica:</span>
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{rec.verificationMethod}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Rollback: <strong style={{ color: 'var(--text-secondary)' }}>{rec.rollbackAvailability}</strong>
                  </div>

                  {rec.actionId && (
                    <button
                      className={`btn ${rec.eligibility === 'RECURRING_ACTIVE' ? 'btn-primary' : rec.eligibility === 'COOLDOWN' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleActionClick(rec)}
                      disabled={executingActionId === rec.id || rec.eligibility === 'COOLDOWN'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
                    >
                      {executingActionId === rec.id ? (
                        <>
                          <RefreshCw size={13} className="spin" />
                          <span>Esecuzione in corso...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight size={13} />
                          <span>
                            {rec.eligibility === 'RECURRING_ACTIVE'
                              ? 'Riprova Ottimizzazione'
                              : rec.eligibility === 'PENDING_VERIFICATION'
                              ? 'Verifica o Riesamina'
                              : rec.eligibility === 'COOLDOWN'
                              ? `In Pausa (${rec.cooldownRemainingDays ? `${rec.cooldownRemainingDays} gg` : 'cooldown'})`
                              : rec.actionAvailability === 'MANUAL' || rec.actionAvailability === 'MANUAL_GUIDED'
                              ? 'Apri Sezione'
                              : rec.actionAvailability === 'USER_CONFIRMED'
                              ? 'Richiedi Conferma'
                              : 'Applica Ottimizzazione'}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* 4. STORICO DELLE OTTIMIZZAZIONI ESEGUITE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <History size={18} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
              Storico Ottimizzazioni ({optimizationHistory.length})
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            {/* Filtri Esito */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-xs"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  backgroundColor: historyFilter === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: historyFilter === 'ALL' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: 'none',
                }}
                onClick={() => setHistoryFilter('ALL')}
              >
                Tutti ({historyCounts.all})
              </button>
              <button
                type="button"
                className="btn btn-xs"
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  backgroundColor: historyFilter === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: historyFilter === 'success' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  border: 'none',
                }}
                onClick={() => setHistoryFilter('success')}
              >
                Riuscite ({historyCounts.success})
              </button>
              {historyCounts.cancelled > 0 && (
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    backgroundColor: historyFilter === 'cancelled' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    color: historyFilter === 'cancelled' ? 'var(--accent-amber)' : 'var(--text-muted)',
                    border: 'none',
                  }}
                  onClick={() => setHistoryFilter('cancelled')}
                >
                  Annullate ({historyCounts.cancelled})
                </button>
              )}
              {historyCounts.failed > 0 && (
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    backgroundColor: historyFilter === 'failed' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                    color: historyFilter === 'failed' ? 'var(--accent-ruby)' : 'var(--text-muted)',
                    border: 'none',
                  }}
                  onClick={() => setHistoryFilter('failed')}
                >
                  Fallite ({historyCounts.failed})
                </button>
              )}
            </div>

            {optimizationHistory.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                onClick={() => {
                  if (window.confirm('Sei sicuro di voler azzerare lo storico delle ottimizzazioni registrate?')) {
                    clearOptimizationHistory();
                  }
                }}
                title="Azzera lo storico registrato"
              >
                <Trash2 size={12} style={{ marginRight: '4px' }} /> Azzera
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <History size={24} color="var(--text-muted)" style={{ margin: '0 auto var(--space-xs)' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Nessuna ottimizzazione registrata
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Le raccomandazioni eseguite o annullate verranno salvate qui con il confronto oggettivo prima/dopo e l'esito della verifica.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {filteredHistory.map((rec) => {
              const beforeSummary = typeof rec.evidenceBefore === 'object' && rec.evidenceBefore !== null
                ? rec.evidenceBefore.summary
                : rec.evidenceBefore;
              const afterSummary = typeof rec.evidenceAfter === 'object' && rec.evidenceAfter !== null
                ? rec.evidenceAfter.summary
                : rec.evidenceAfter;

              return (
                <div
                  key={rec.id}
                  className="card"
                  onClick={() => setSelectedHistoryRecord(rec)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(rec.timestampStarted).toLocaleDateString(bcp47, { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(rec.timestampStarted).toLocaleTimeString(bcp47, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {rec.recommendationTitle}
                      </span>
                      {rec.target && (
                        <span className="badge badge-subtle" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                          {rec.target}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <span className={`badge ${getOutcomeBadgeClass(rec.outcome)}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {getOutcomeLabel(rec.outcome)}
                      </span>
                      <span className={`badge ${getVerificationStatusBadgeClass(rec.verificationStatus)}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        Verifica: {getVerificationStatusLabel(rec.verificationStatus)}
                      </span>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {beforeSummary && afterSummary ? (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Prima:</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{beforeSummary}</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>→</span>
                          <span style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                            {afterSummary}
                          </span>
                        </>
                      ) : (
                        <span>{rec.actionDescription}</span>
                      )}
                    </div>

                    {rec.metricsDelta?.description && (
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0, marginLeft: 'var(--space-sm)' }}>
                        {rec.metricsDelta.description}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AUDIT & FINDINGS DETTAGLIATI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Layers size={18} color="var(--accent-amber)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
              Dettaglio Verifiche di Salute ({healthReport.findings.length})
            </h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
          {healthReport.findings.map((f) => (
            <div key={f.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.area}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {f.metadata?.isTruncatedSample === true && (
                      <span className="care-truncation-pill" title="Campionamento limitato ai più recenti">
                        Campione limitato
                      </span>
                    )}
                    {getSeverityBadge(f.severity)}
                  </div>
                </div>

                <h4 style={{ margin: '0 0 var(--space-2xs)', fontSize: '0.95rem', fontWeight: 600 }}>
                  {f.title}
                </h4>

                <p style={{ margin: '0 0 var(--space-xs)', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {f.explanation}
                </p>

                {/* Correlazioni Diagnostiche (Tranche 8D-3 & 8E) */}
                {f.correlations && f.correlations.length > 0 && (
                  <div className="care-correlations-container">
                    {f.correlations.map((c) => (
                      <div key={c.correlationId} className="care-correlation-card">
                        <div className="care-correlation-header">
                          <span className="care-correlation-title">{c.title}</span>
                          <span className={`badge ${
                            c.strength === 'DIRECT_MATCH' ? 'badge-danger' :
                            c.strength === 'RELATED_SIGNAL' ? 'badge-warning' : 'badge-neutral'
                          }`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            {c.strength}
                          </span>
                        </div>
                        <div className="care-correlation-explanation">
                          {c.explanation}
                        </div>
                        <div className="care-correlation-evidence-grid">
                          <div className="care-correlation-evidence-item">
                            <span className="care-correlation-evidence-label">Evidenza Hardware</span>
                            <span className="care-correlation-evidence-val">{c.hardwareEvidence}</span>
                          </div>
                          <div className="care-correlation-evidence-item">
                            <span className="care-correlation-evidence-label">Evidenza Event Log</span>
                            <span className="care-correlation-evidence-val">{c.eventEvidence}</span>
                          </div>
                        </div>

                        {/* Preservazione Segnale Assorbito (Zero Data Loss) */}
                        {c.absorbedFinding && (
                          <div className="care-absorbed-box">
                            <div className="care-absorbed-header">
                              <span>Segnale Correlato Assorbito</span>
                              {getSeverityBadge(c.absorbedFinding.originalSeverity)}
                            </div>
                            <div className="care-absorbed-title">{c.absorbedFinding.title}</div>
                            <div className="care-absorbed-details">
                              {c.absorbedFinding.explanation}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              Evidenza: {c.absorbedFinding.evidence}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ paddingTop: 'var(--space-xs)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xs)' }}>
                <span>Evidenza:</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right', marginLeft: 'var(--space-xs)' }}>{f.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. MODALE DI CONFERMA SICUREZZA PER AZIONI MUTANTI (USER_CONFIRMED) */}
      {confirmingRec && (
        <Modal
          isOpen={true}
          onClose={handleCancelConfirmation}
          title="Conferma Operazione di Ottimizzazione"
          subtitle="Azione mutante con richiesta di conferma esplicita"
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', padding: 'var(--space-sm)', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <ShieldAlert size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{confirmingRec.title}</strong>
                <p style={{ margin: '4px 0 0' }}>{confirmingRec.reason}</p>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Evidenza rilevata: </strong>
                <span>{confirmingRec.evidence}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-emerald)' }}>Beneficio atteso: </strong>
                <span>{confirmingRec.expectedBenefit}</span>
              </div>
              {confirmingRec.actionDescription && (
                <div>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Cosa verrà fatto: </strong>
                  <span>{confirmingRec.actionDescription}</span>
                </div>
              )}
              {confirmingRec.verificationMethod && (
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Come verrà verificato: </strong>
                  <span style={{ fontStyle: 'italic' }}>{confirmingRec.verificationMethod}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCancelConfirmation}
                disabled={executingActionId === confirmingRec.id}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleExecuteAction(confirmingRec)}
                disabled={executingActionId === confirmingRec.id}
                style={{ backgroundColor: 'var(--accent-amber)', color: '#000', fontWeight: 600 }}
              >
                {executingActionId === confirmingRec.id ? 'Esecuzione...' : 'Conferma ed Esegui'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. MODALE DI DETTAGLIO RECORD STORICO OTTIMIZZAZIONE */}
      {selectedHistoryRecord && (
        <OptimizationHistoryModal
          record={selectedHistoryRecord}
          onClose={() => setSelectedHistoryRecord(null)}
          onDeleteRecord={(id) => deleteOptimizationExecution(id)}
        />
      )}

      {/* 8. MODALE ISPEZIONE EVENT LOG WINDOWS */}
      <EventLogInspectionModal
        isOpen={isEventLogModalOpen}
        onClose={() => setIsEventLogModalOpen(false)}
        eventLogSnapshot={activeDiagnostics?.eventLog}
        referenceDate={facts.referenceDate}
      />

      {/* 9. MODALE STATO SERVIZI WINDOWS SCM */}
      <WindowsServicesInspectionModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        servicesSnapshot={activeDiagnostics?.systemServices}
      />
    </div>
  );
};
