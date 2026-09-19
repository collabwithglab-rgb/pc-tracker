import React, { useState, useMemo } from 'react';
import { usePCStore } from '../../store';
import {
  COMPONENT_CATEGORY_LABELS,
  ComponentDiffStatus,
} from '../../types';
import {
  normalizeCurrentRig,
  normalizeCheckpoint,
  compareRigs,
} from '../../domain/rigComparisonEngine';
import { formatDate } from '../../utils';
import { HardwareIconBadge } from '../common/ComponentIcon';
import {
  GitCompare,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle2,
  Zap,
  DollarSign,
  Package,
  X,
} from 'lucide-react';

interface RigComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceA?: string; // 'current' o 'checkpoint-{id}'
  initialSourceB?: string;
  onOpenComponentDetail?: (id: string) => void;
}

export const RigComparisonModal: React.FC<RigComparisonModalProps> = ({
  isOpen,
  onClose,
  initialSourceA,
  initialSourceB,
  onOpenComponentDetail,
}) => {
  const { components, events, checkpoints, getInstalledComponents, getComponentComputed } = usePCStore();

  // Opzioni disponibili per la selezione
  const sourceOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string; date?: string }> = [
      { id: 'current', label: 'Il Mio PC Attuale' },
    ];

    // Checkpoint salvati
    checkpoints.forEach((chk) => {
      opts.push({
        id: `checkpoint-${chk.id}`,
        label: `Checkpoint: ${chk.name}`,
        date: chk.referenceDate,
      });
    });

    return opts;
  }, [checkpoints]);

  // Selezioni A e B
  const [sourceA, setSourceA] = useState<string>(() => {
    if (initialSourceA) return initialSourceA;
    if (checkpoints.length > 0) return `checkpoint-${checkpoints[0].id}`;
    return 'current';
  });

  const [sourceB, setSourceB] = useState<string>(() => {
    if (initialSourceB) return initialSourceB;
    return 'current';
  });

  // Sincronizza lo stato quando la modale viene aperta con sorgenti specifiche
  React.useEffect(() => {
    if (isOpen) {
      if (initialSourceA) {
        setSourceA(initialSourceA);
      } else if (checkpoints.length > 0) {
        setSourceA(`checkpoint-${checkpoints[0].id}`);
      } else {
        setSourceA('current');
      }

      if (initialSourceB) {
        setSourceB(initialSourceB);
      } else {
        setSourceB('current');
      }
    }
  }, [isOpen, initialSourceA, initialSourceB, checkpoints]);

  // Filtro stato elementi
  const [activeFilter, setActiveFilter] = useState<'all' | 'replaced' | 'added_removed' | 'unchanged'>('all');

  // Risoluzione e normalizzazione delle due configurazioni
  const normalizedA = useMemo(() => {
    if (sourceA === 'current') {
      return {
        title: 'Il Mio PC Attuale',
        items: normalizeCurrentRig(getInstalledComponents(), events, getComponentComputed),
      };
    }
    if (sourceA.startsWith('checkpoint-')) {
      const chkId = sourceA.replace('checkpoint-', '');
      const chk = checkpoints.find((c) => c.id === chkId);
      if (chk) {
        return {
          title: `Checkpoint: ${chk.name}`,
          date: chk.referenceDate,
          items: normalizeCheckpoint(chk, components),
        };
      }
    }
    return {
      title: 'Configurazione A',
      items: [],
    };
  }, [sourceA, getInstalledComponents, events, getComponentComputed, checkpoints, components]);

  const normalizedB = useMemo(() => {
    if (sourceB === 'current') {
      return {
        title: 'Il Mio PC Attuale',
        items: normalizeCurrentRig(getInstalledComponents(), events, getComponentComputed),
      };
    }
    if (sourceB.startsWith('checkpoint-')) {
      const chkId = sourceB.replace('checkpoint-', '');
      const chk = checkpoints.find((c) => c.id === chkId);
      if (chk) {
        return {
          title: `Checkpoint: ${chk.name}`,
          date: chk.referenceDate,
          items: normalizeCheckpoint(chk, components),
        };
      }
    }
    return {
      title: 'Configurazione B',
      items: [],
    };
  }, [sourceB, getInstalledComponents, events, getComponentComputed, checkpoints, components]);

  // Esecuzione calcolo puro di confronto
  const comparison = useMemo(() => {
    return compareRigs(
      normalizedA.items,
      normalizedB.items,
      normalizedA.title,
      normalizedB.title,
      normalizedA.date,
      normalizedB.date
    );
  }, [normalizedA, normalizedB]);

  // Chiusura accessibile con tasto Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Inversione delle sorgenti A e B
  const handleSwap = () => {
    const temp = sourceA;
    setSourceA(sourceB);
    setSourceB(temp);
  };

  // Filtraggio delle righe di diff
  const filteredEntries = comparison.entries.filter((entry) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'replaced') return entry.status === 'replaced';
    if (activeFilter === 'added_removed') return entry.status === 'added' || entry.status === 'removed';
    if (activeFilter === 'unchanged') return entry.status === 'unchanged';
    return true;
  });

  const getStatusBadge = (status: ComponentDiffStatus) => {
    switch (status) {
      case 'replaced':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            Sostituito
          </span>
        );
      case 'added':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            + Aggiunto
          </span>
        );
      case 'removed':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-ruby)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            - Rimosso
          </span>
        );
      case 'unchanged':
      default:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            Invariato
          </span>
        );
    }
  };

  return (
    <div
      className="modal-overlay"
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Confronto Configurazioni Hardware"
    >
      <div
        className="modal-dialog animate-slide-up"
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modale */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.iconCircle}>
              <GitCompare size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={styles.title}>Confronto Configurazioni Hardware</h2>
              <p style={styles.subtitle}>
                Analisi differenziale punto a punto, variazione di spesa storica e delta Power Budget
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" style={styles.closeBtn} title="Chiudi (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Selettori Configurazioni A e B con Tasto Inverti */}
        <div style={styles.selectorBar}>
          <div style={styles.selectorGroup}>
            <label style={styles.selectorLabel}>Configurazione A (Baseline)</label>
            <select
              value={sourceA}
              onChange={(e) => setSourceA(e.target.value)}
              className="form-select"
              style={styles.selectInput}
            >
              {sourceOptions.map((opt) => (
                <option key={`a-${opt.id}`} value={opt.id}>
                  {opt.label} {opt.date ? `(${formatDate(opt.date)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            className="btn btn-secondary micro-press"
            style={styles.swapBtn}
            title="Inverti Configurazione A e B"
          >
            <ArrowRightLeft size={16} />
            <span style={{ fontSize: '11.5px', marginLeft: 4 }}>Inverti</span>
          </button>

          <div style={styles.selectorGroup}>
            <label style={styles.selectorLabel}>Configurazione B (Confronto)</label>
            <select
              value={sourceB}
              onChange={(e) => setSourceB(e.target.value)}
              className="form-select"
              style={styles.selectInput}
            >
              {sourceOptions.map((opt) => (
                <option key={`b-${opt.id}`} value={opt.id}>
                  {opt.label} {opt.date ? `(${formatDate(opt.date)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Delta Cards */}
        <div style={styles.kpiContainer}>
          {/* Card Spesa Totale */}
          <div className="stat-card" style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>Costo di Acquisto Storico</span>
              <DollarSign size={16} color="var(--accent-emerald)" />
            </div>
            <div style={styles.kpiValues}>
              <span className="font-mono" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                €{comparison.summary.costA.toFixed(2)}
              </span>
              <ArrowRight size={14} color="var(--text-tertiary)" />
              <span className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                €{comparison.summary.costB.toFixed(2)}
              </span>
            </div>
            <div style={styles.kpiDelta}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color:
                    comparison.summary.deltaCost > 0
                      ? 'var(--accent-ruby)'
                      : comparison.summary.deltaCost < 0
                      ? 'var(--accent-emerald)'
                      : 'var(--text-muted)',
                }}
              >
                {comparison.summary.deltaCost > 0 ? `+€${comparison.summary.deltaCost.toFixed(2)}` : comparison.summary.deltaCost < 0 ? `-€${Math.abs(comparison.summary.deltaCost).toFixed(2)}` : '€0.00'}
                {comparison.summary.deltaCostPercent !== null && ` (${comparison.summary.deltaCostPercent > 0 ? `+${comparison.summary.deltaCostPercent}%` : `${comparison.summary.deltaCostPercent}%`})`}
              </span>
            </div>
          </div>

          {/* Card Numero Componenti */}
          <div className="stat-card" style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>Componenti Montati</span>
              <Package size={16} color="var(--accent-primary)" />
            </div>
            <div style={styles.kpiValues}>
              <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                {comparison.summary.countA}
              </span>
              <ArrowRight size={14} color="var(--text-tertiary)" />
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {comparison.summary.countB}
              </span>
            </div>
            <div style={styles.kpiDelta}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {comparison.summary.deltaCount > 0 ? `+${comparison.summary.deltaCount} pezzi` : comparison.summary.deltaCount < 0 ? `${comparison.summary.deltaCount} pezzi` : 'Nessuna variazione'}
              </span>
            </div>
          </div>

          {/* Card Power Budget */}
          <div className="stat-card" style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiTitle}>Assorbimento Stimato (W)</span>
              <Zap size={16} color="var(--accent-amber)" />
            </div>
            <div style={styles.kpiValues}>
              <span className="font-mono" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                {comparison.summary.wattsA !== null ? `${comparison.summary.wattsA} W` : 'N/D'}
              </span>
              <ArrowRight size={14} color="var(--text-tertiary)" />
              <span className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {comparison.summary.wattsB !== null ? `${comparison.summary.wattsB} W` : 'N/D'}
              </span>
            </div>
            <div style={styles.kpiDelta}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color:
                    comparison.summary.deltaWatts !== null && comparison.summary.deltaWatts > 0
                      ? 'var(--accent-amber)'
                      : comparison.summary.deltaWatts !== null && comparison.summary.deltaWatts < 0
                      ? 'var(--accent-emerald)'
                      : 'var(--text-muted)',
                }}
              >
                {comparison.summary.deltaWatts !== null
                  ? comparison.summary.deltaWatts > 0
                    ? `+${comparison.summary.deltaWatts} W`
                    : comparison.summary.deltaWatts < 0
                    ? `${comparison.summary.deltaWatts} W`
                    : '0 W'
                  : 'Dati parziali'}
              </span>
            </div>
          </div>
        </div>

        {/* Barra Filtri Diff */}
        <div style={styles.filterBar}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveFilter('all')}
              className={`btn btn-secondary ${activeFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Tutti ({comparison.entries.length})
            </button>
            <button
              onClick={() => setActiveFilter('replaced')}
              className={`btn btn-secondary ${activeFilter === 'replaced' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Sostituiti ({comparison.summary.replacedCount})
            </button>
            <button
              onClick={() => setActiveFilter('added_removed')}
              className={`btn btn-secondary ${activeFilter === 'added_removed' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Aggiunti / Rimossi ({comparison.summary.addedCount + comparison.summary.removedCount})
            </button>
            <button
              onClick={() => setActiveFilter('unchanged')}
              className={`btn btn-secondary ${activeFilter === 'unchanged' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Invariati ({comparison.summary.unchangedCount})
            </button>
          </div>
        </div>

        {/* Tabella Comparativa Hardware */}
        <div style={styles.body}>
          {filteredEntries.length === 0 ? (
            <div style={styles.emptyNotice}>
              <CheckCircle2 size={24} color="var(--accent-primary)" />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 8 }}>
                Nessun elemento corrisponde al filtro selezionato.
              </p>
            </div>
          ) : (
            <div style={styles.diffTable}>
              {filteredEntries.map((entry, idx) => {
                const catLabel = COMPONENT_CATEGORY_LABELS[entry.category] || entry.category;

                return (
                  <div key={`entry-${idx}`} className="card" style={styles.diffRow}>
                    {/* Intestazione Categoria e Status */}
                    <div style={styles.rowCategoryBox}>
                      <HardwareIconBadge category={entry.category} size={15} />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {catLabel}
                      </span>
                      {getStatusBadge(entry.status)}
                    </div>

                    {/* Confronto Prima -> Dopo */}
                    <div style={styles.rowComparisonBox}>
                      {/* Configurazione A */}
                      <div style={styles.itemBox}>
                        {entry.oldComponent ? (
                          <>
                            <span
                              onClick={() => {
                                if (onOpenComponentDetail && entry.oldComponent?.componentId) {
                                  onOpenComponentDetail(entry.oldComponent.componentId);
                                  onClose();
                                }
                              }}
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: entry.status === 'removed' ? 'var(--accent-ruby)' : 'var(--text-primary)',
                                textDecoration: entry.status === 'replaced' ? 'line-through' : 'none',
                                opacity: entry.status === 'replaced' ? 0.75 : 1,
                                cursor: onOpenComponentDetail ? 'pointer' : 'default',
                              }}
                              title={onOpenComponentDetail ? 'Clicca per aprire la scheda di questo componente' : undefined}
                            >
                              {entry.oldComponent.name}
                            </span>
                            <div style={styles.itemMetaRow}>
                              {entry.oldComponent.purchasePrice !== undefined && (
                                <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  €{entry.oldComponent.purchasePrice.toFixed(2)}
                                </span>
                              )}
                              {entry.oldComponent.slotOrLocation && (
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  • {entry.oldComponent.slotOrLocation}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            Non presente in A
                          </span>
                        )}
                      </div>

                      {/* Freccia */}
                      <div style={styles.arrowBox}>
                        <ArrowRight size={16} color="var(--text-tertiary)" />
                      </div>

                      {/* Configurazione B */}
                      <div style={styles.itemBox}>
                        {entry.newComponent ? (
                          <>
                            <span
                              onClick={() => {
                                if (onOpenComponentDetail && entry.newComponent?.componentId) {
                                  onOpenComponentDetail(entry.newComponent.componentId);
                                  onClose();
                                }
                              }}
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: entry.status === 'added' ? 'var(--accent-emerald)' : 'var(--text-primary)',
                                cursor: onOpenComponentDetail ? 'pointer' : 'default',
                              }}
                              title={onOpenComponentDetail ? 'Clicca per aprire la scheda di questo componente' : undefined}
                            >
                              {entry.newComponent.name}
                            </span>
                            <div style={styles.itemMetaRow}>
                              {entry.newComponent.purchasePrice !== undefined && (
                                <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  €{entry.newComponent.purchasePrice.toFixed(2)}
                                </span>
                              )}
                              {entry.newComponent.slotOrLocation && (
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  • {entry.newComponent.slotOrLocation}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            Non presente in B
                          </span>
                        )}
                      </div>

                      {/* Delta Riquadro Destro */}
                      <div style={styles.deltaBox}>
                        {entry.priceDifference !== undefined && entry.priceDifference !== 0 && (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: entry.priceDifference > 0 ? 'var(--accent-ruby)' : 'var(--accent-emerald)',
                            }}
                          >
                            {entry.priceDifference > 0 ? `+€${entry.priceDifference.toFixed(2)}` : `-€${Math.abs(entry.priceDifference).toFixed(2)}`}
                          </span>
                        )}
                        {entry.wattsDifference !== null && entry.wattsDifference !== undefined && entry.wattsDifference !== 0 && (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: '11px',
                              color: entry.wattsDifference > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                            }}
                          >
                            {entry.wattsDifference > 0 ? `+${entry.wattsDifference}W` : `${entry.wattsDifference}W`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Confronto deterministico calcolato in memoria • Zero scritture nel database
          </span>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 16px' }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-overlay)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '24px',
  },
  dialog: {
    width: '100%',
    maxWidth: '960px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-modal)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
    outline: 'none',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-surface)',
  },
  iconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent-primary-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  closeBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBar: {
    padding: '14px 24px',
    backgroundColor: 'var(--bg-surface-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
  },
  selectorGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  selectorLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  selectInput: {
    fontSize: '13.5px',
    padding: '7px 10px',
  },
  swapBtn: {
    padding: '7px 12px',
    marginBottom: '1px',
  },
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '14px 24px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  kpiCard: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  kpiValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  kpiDelta: {
    marginTop: '2px',
  },
  filterBar: {
    padding: '10px 24px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  body: {
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  diffTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  diffRow: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rowCategoryBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '8px',
  },
  rowComparisonBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  itemBox: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  arrowBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deltaBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
    minWidth: '90px',
    flexShrink: 0,
  },
  emptyNotice: {
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: '12px 24px',
    backgroundColor: 'var(--bg-surface)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};
