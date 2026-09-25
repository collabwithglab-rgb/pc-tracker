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
} from 'lucide-react';
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
} from '../../types/optimization';
import {
  evaluateSystemHealth,
} from '../../domain/healthEngine';
import {
  generateOptimizationRecommendations,
} from '../../domain/optimizationEngine';
import {
  runSsdTrim,
  openDiskCleanup,
  createRestorePoint,
  verifySystemFiles,
  cleanGpuShaderCache,
  enableUltimatePerformance,
} from '../../services/windowsToolsService';
import { Modal } from '../common/Modal';

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
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [showCoverageDetails, setShowCoverageDetails] = useState(false);
  const [confirmingRec, setConfirmingRec] = useState<OptimizationRecommendation | null>(null);

  // Valutazione pura e deterministica della salute
  const healthReport: SystemHealthReport = useMemo(() => {
    return evaluateSystemHealth(facts);
  }, [facts]);

  // Generazione raccomandazioni motivate di ottimizzazione
  const optReport: OptimizationReport = useMemo(() => {
    return generateOptimizationRecommendations(facts, healthReport);
  }, [facts, healthReport]);

  const notify = (type: 'success' | 'warning' | 'error' | 'info', msg: string) => {
    onShowNotification?.(type === 'success' ? 'success' : 'error', msg);
  };

  // Click su azione consigliata: se mutante (USER_CONFIRMED), richiede conferma esplicita
  const handleActionClick = (rec: OptimizationRecommendation) => {
    if (rec.actionAvailability === 'USER_CONFIRMED') {
      setConfirmingRec(rec);
      return;
    }
    handleExecuteAction(rec);
  };

  // Esecuzione diretta dell'azione consigliata
  const handleExecuteAction = async (rec: OptimizationRecommendation) => {
    setExecutingActionId(rec.id);
    try {
      if (rec.actionId === 'run-trim') {
        const letter = (rec.parameters?.driveLetter as string) || 'C';
        const res = await runSsdTrim(letter);
        if (res.status === 'success') {
          notify('success', `Ottimizzazione TRIM completata con successo su unità ${letter}:`);
        } else {
          notify('warning', res.message || 'Ottimizzazione TRIM completata con avvisi.');
        }
      } else if (rec.actionId === 'open-cleanmgr') {
        const res = await openDiskCleanup();
        if (res.status === 'success') {
          notify('success', 'Utility Pulizia Disco di Windows avviata.');
        } else {
          notify('error', res.message || 'Impossibile avviare Pulizia Disco.');
        }
      } else if (rec.actionId === 'create-restore-point') {
        const res = await createRestorePoint('PC Care Center - Salvaguardia Sistema');
        if (res.status === 'success') {
          notify('success', 'Punto di Ripristino di sicurezza creato con successo.');
        } else if (res.status === 'cancelled') {
          notify('info', 'Creazione annullata dall\'utente al prompt UAC.');
        } else {
          notify('warning', res.message || 'Verifica lo stato di Protezione Sistema.');
        }
      } else if (rec.actionId === 'sfc-repair') {
        notify('info', 'Avvio scansione ed analisi file protetti di Windows...');
        const res = await verifySystemFiles();
        if (res.status === 'success') {
          notify('success', 'Riparazione completata: ' + res.message);
        } else {
          notify('warning', res.message || 'Scansione completata con esito da verificare.');
        }
      } else if (rec.actionId === 'clean-shader-cache') {
        const res = await cleanGpuShaderCache();
        if (res.status === 'success') {
          notify('success', `Shader Cache DirectX/GPU pulita (${res.message}).`);
        } else {
          notify('warning', res.message || 'Pulizia shader cache completata.');
        }
      } else if (rec.actionId === 'enable-ultimate-performance') {
        const res = await enableUltimatePerformance();
        if (res.status === 'success') {
          notify('success', 'Schema Prestazioni Eccellenti attivato in Windows.');
        } else {
          notify('warning', res.message || 'Schema non applicato.');
        }
      } else if (rec.actionId === 'clean-filters' || rec.actionId === 'apply-thermal-paste') {
        onSwitchTab?.('registro');
      } else if (rec.actionId === 'reboot-uefi') {
        onSwitchTab?.('windows');
      } else {
        notify('info', `Azione guidata: ${rec.title}`);
      }

      onRefreshFacts?.();
    } catch (err) {
      console.error('Errore durante l\'esecuzione dell\'azione:', err);
      notify('error', 'Si è verificato un errore durante l\'operazione.');
    } finally {
      setExecutingActionId(null);
      setConfirmingRec(null);
    }
  };

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
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

      {/* 3. RACCOMANDAZIONI MOTIVATE DI OTTIMIZZAZIONE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
              Ottimizzazioni Consigliate ({optReport.totalCount})
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Priorità deterministica trasparente
          </span>
        </div>

        {optReport.recommendations.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto var(--space-sm)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Nessuna Ottimizzazione Necessaria</div>
            <div style={{ fontSize: '0.85rem', marginTop: 'var(--space-xs)' }}>
              Il tuo PC è aggiornato, le unità SSD sono ottimizzate e non risultano anomalie o file di sistema danneggiati.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {optReport.recommendations.map((rec) => (
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    {getRiskBadge(rec.risk)}
                    {getActionAvailabilityBadge(rec.actionAvailability)}
                  </div>
                </div>

                <div className="care-rec-details-box" style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)', margin: 'var(--space-sm) 0', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '100px' }}>Fatto Rilevato:</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{rec.evidence}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <span style={{ color: 'var(--accent-emerald)', minWidth: '100px' }}>Beneficio:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{rec.expectedBenefit}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Rollback: <strong style={{ color: 'var(--text-secondary)' }}>{rec.rollbackAvailability}</strong>
                  </div>

                  {rec.actionId && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleActionClick(rec)}
                      disabled={executingActionId === rec.id}
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
                            {rec.actionAvailability === 'MANUAL' || rec.actionAvailability === 'MANUAL_GUIDED'
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

      {/* 4. AUDIT & FINDINGS DETTAGLIATI */}
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
                  {getSeverityBadge(f.severity)}
                </div>

                <h4 style={{ margin: '0 0 var(--space-2xs)', fontSize: '0.95rem', fontWeight: 600 }}>
                  {f.title}
                </h4>

                <p style={{ margin: '0 0 var(--space-xs)', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {f.explanation}
                </p>
              </div>

              <div style={{ paddingTop: 'var(--space-xs)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Evidenza:</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{f.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MODALE DI CONFERMA SICUREZZA PER AZIONI MUTANTI (USER_CONFIRMED) */}
      {confirmingRec && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmingRec(null)}
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

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ marginBottom: '4px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Evidenza rilevata: </strong>
                <span>{confirmingRec.evidence}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-emerald)' }}>Beneficio atteso: </strong>
                <span>{confirmingRec.expectedBenefit}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmingRec(null)}
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
    </div>
  );
};
