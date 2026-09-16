import React, { useState, useMemo, useEffect } from 'react';
import { usePCStore } from '../store';
import {
  ComponentCategory,
  ComponentEvent,
  Checkpoint,
  TemporalPosition,
  TemporalBoundary,
  COMPONENT_CATEGORY_LABELS,
} from '../types';
import {
  getTimelineBounds,
  getTimelineEvents,
  getConfigurationAtPosition,
  getRigSummaryAtPosition,
  getStateAtCheckpoint,
  compareCheckpointToReconstruction,
  sortCheckpointsChronologically,
} from '../domain';
import { formatDate } from '../utils';
import { CheckpointModal, CheckpointEditModal } from '../components/checkpoint';
import {
  History,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  AlertTriangle,
  Sparkles,
  Layers,
  Cpu,
  Zap,
  Box,
  HardDrive,
  Fan,
  Trash2,
  Edit3,
  Package,
} from 'lucide-react';

export const TimeTravelPage: React.FC = () => {
  const { components, events, checkpoints, deleteCheckpoint } = usePCStore();

  // Calcola estremi ed eventi della timeline
  const bounds = useMemo(() => getTimelineBounds(events), [events]);
  const sortedEvents = useMemo(() => getTimelineEvents(events), [events]);

  // Date discrete che contengono almeno un evento storico o un Checkpoint (Milestones)
  const milestoneDates = useMemo(() => {
    const set = new Set<string>();
    sortedEvents.forEach((e) => set.add(e.date));
    checkpoints.forEach((c) => set.add(c.referenceDate));
    return Array.from(set).sort();
  }, [sortedEvents, checkpoints]);

  // Posizione temporale attiva
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [anchorEventId, setAnchorEventId] = useState<string | null>(null);
  const [boundary, setBoundary] = useState<TemporalBoundary>('end_of_day');

  // Checkpoint attivo selezionato e modalità vista (Fotografia vs Ricostruzione)
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [viewMode, setViewMode] = useState<'reconstruction' | 'checkpoint_snapshot'>('reconstruction');

  // Modali
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [checkpointToEdit, setCheckpointToEdit] = useState<Checkpoint | null>(null);
  const [isCheckpointListOpen, setIsCheckpointListOpen] = useState<boolean>(false);

  // Inizializza la data alla più recente disponibile (o a oggi se non ci sono eventi)
  useEffect(() => {
    if (milestoneDates.length > 0 && !selectedDate) {
      const latest = milestoneDates[milestoneDates.length - 1];
      setSelectedDate(latest);
      setBoundary('end_of_day');
      setAnchorEventId(null);
    } else if (milestoneDates.length === 0 && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [milestoneDates, selectedDate]);

  // Posizione temporale corrente passata al motore
  const currentPosition: TemporalPosition = useMemo(() => {
    return {
      date: selectedDate || new Date().toISOString().split('T')[0],
      anchorEventId: anchorEventId || null,
      boundary: boundary,
    };
  }, [selectedDate, anchorEventId, boundary]);

  // Eventi occorsi nella data selezionata (ordine ordinale deterministico, NESSUN orario inventato)
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return sortedEvents.filter((e) => e.date === selectedDate);
  }, [sortedEvents, selectedDate]);

  // Configurazione dinamica ricostruita dagli eventi tramite historyEngine
  const reconstructedRig = useMemo(() => {
    return getConfigurationAtPosition(components, events, currentPosition);
  }, [components, events, currentPosition]);

  // Riepilogo economico e statistico della configurazione al punto temporale
  const rigSummary = useMemo(() => {
    return getRigSummaryAtPosition(components, events, currentPosition);
  }, [components, events, currentPosition]);

  // Se c'è un checkpoint attivo, calcola la discrepanza informativa (senza mutare il checkpoint)
  const checkpointDiscrepancy = useMemo(() => {
    if (!activeCheckpoint) return null;
    return compareCheckpointToReconstruction(activeCheckpoint, components, events);
  }, [activeCheckpoint, components, events]);

  // Componenti da visualizzare (Fotografia congelata vs Ricostruzione)
  const displayedComponents = useMemo(() => {
    if (activeCheckpoint && viewMode === 'checkpoint_snapshot') {
      const state = getStateAtCheckpoint(activeCheckpoint);
      return state.components;
    }
    return reconstructedRig.map((c) => {
      // Ricava l'ultimo alloggiamento noto
      const compEvents = sortedEvents.filter((e) => e.componentId === c.id && e.date <= currentPosition.date);
      const latestInstall = [...compEvents].reverse().find((e) => e.type === 'INSTALL');
      const purchase = compEvents.find((e) => e.type === 'PURCHASE');
      return {
        id: c.id,
        name: c.name,
        brand: c.brand || '',
        model: c.model || '',
        category: c.category,
        slotOrLocation: latestInstall && 'slotOrLocation' in latestInstall ? latestInstall.slotOrLocation : undefined,
        purchasePrice: purchase && 'price' in purchase ? purchase.price : undefined,
      };
    });
  }, [activeCheckpoint, viewMode, reconstructedRig, sortedEvents, currentPosition]);

  // Checkpoint ordinati per la sezione di gestione
  const sortedCheckpoints = useMemo(() => {
    return sortCheckpointsChronologically(checkpoints, events);
  }, [checkpoints, events]);

  // Checkpoint che appartengono alla data attualmente visualizzata
  const checkpointsOnSelectedDate = useMemo(() => {
    return checkpoints.filter((cp) => cp.referenceDate === selectedDate);
  }, [checkpoints, selectedDate]);

  // Indice corrente tra le milestones
  const currentMilestoneIndex = useMemo(() => {
    return milestoneDates.indexOf(selectedDate);
  }, [milestoneDates, selectedDate]);

  // Navigazione tra le date
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setBoundary('end_of_day');
    setAnchorEventId(null);
    setActiveCheckpoint(null);
    setViewMode('reconstruction');
  };

  const handlePrevDate = () => {
    if (currentMilestoneIndex > 0) {
      handleSelectDate(milestoneDates[currentMilestoneIndex - 1]);
    }
  };

  const handleNextDate = () => {
    if (currentMilestoneIndex !== -1 && currentMilestoneIndex < milestoneDates.length - 1) {
      handleSelectDate(milestoneDates[currentMilestoneIndex + 1]);
    }
  };

  const handleJumpToEarliest = () => {
    if (milestoneDates.length > 0) {
      handleSelectDate(milestoneDates[0]);
    }
  };

  const handleJumpToLatest = () => {
    if (milestoneDates.length > 0) {
      handleSelectDate(milestoneDates[milestoneDates.length - 1]);
    }
  };

  // Navigazione infra-giornaliera deterministica
  const handleSelectStartOfDay = () => {
    setBoundary('start_of_day');
    setAnchorEventId(null);
    setViewMode('reconstruction');
  };

  const handleSelectEndOfDay = () => {
    setBoundary('end_of_day');
    setAnchorEventId(null);
    setViewMode('reconstruction');
  };

  const handleSelectBeforeEvent = (eventId: string) => {
    setAnchorEventId(eventId);
    setBoundary('before_event');
    setViewMode('reconstruction');
  };

  const handleSelectAfterEvent = (eventId: string) => {
    setAnchorEventId(eventId);
    setBoundary('after_event');
    setViewMode('reconstruction');
  };

  // Apertura di un Checkpoint
  const handleOpenCheckpoint = (cp: Checkpoint) => {
    setSelectedDate(cp.referenceDate);
    setAnchorEventId(cp.anchorEventId || null);
    setBoundary(cp.anchorEventId ? 'after_event' : 'end_of_day');
    setActiveCheckpoint(cp);
    setViewMode('checkpoint_snapshot');
  };

  // Eliminazione checkpoint
  const handleDeleteCheckpointClick = async (cp: Checkpoint) => {
    if (window.confirm(`Sei sicuro di voler eliminare il checkpoint "${cp.name}"? L'eliminazione non modificherà componenti o eventi storici.`)) {
      if (activeCheckpoint?.id === cp.id) {
        setActiveCheckpoint(null);
        setViewMode('reconstruction');
      }
      await deleteCheckpoint(cp.id);
    }
  };

  // Categoria -> Icona
  const getCategoryIcon = (category: ComponentCategory) => {
    switch (category) {
      case 'cpu':
        return <Cpu size={15} color="var(--accent-primary)" />;
      case 'gpu':
        return <Zap size={15} color="var(--accent-primary)" />;
      case 'motherboard':
        return <Layers size={15} color="var(--accent-primary)" />;
      case 'ram':
        return <Box size={15} color="var(--accent-primary)" />;
      case 'storage':
        return <HardDrive size={15} color="var(--accent-primary)" />;
      case 'cooling':
        return <Fan size={15} color="var(--accent-primary)" />;
      default:
        return <Package size={15} color="var(--text-secondary)" />;
    }
  };

  // Helper etichetta tipo evento
  const getEventLabel = (type: ComponentEvent['type']) => {
    switch (type) {
      case 'PURCHASE':
        return 'ACQUISTO';
      case 'INSTALL':
        return 'MONTAGGIO';
      case 'UNINSTALL':
        return 'SMONTAGGIO';
      case 'SALE':
        return 'VENDITA';
      case 'EXTRA_EXPENSE':
        return 'SPESA EXTRA';
      case 'GIFT':
        return 'DONAZIONE';
      case 'DISPOSAL':
        return 'SMALTIMENTO';
      default:
        return type;
    }
  };

  // Descrizione posizione temporale
  const getPositionDescription = () => {
    if (boundary === 'start_of_day') {
      return 'Inizio giornata (prima di qualsiasi evento del giorno)';
    }
    if (boundary === 'end_of_day') {
      return 'Fine giornata (tutti gli eventi del giorno inclusi)';
    }
    if (anchorEventId) {
      const idx = dayEvents.findIndex((e) => e.id === anchorEventId);
      const ev = dayEvents[idx];
      const ord = idx !== -1 ? String(idx + 1).padStart(2, '0') : '';
      if (boundary === 'before_event') {
        return `Subito prima dell'evento #${ord} (${ev ? getEventLabel(ev.type) : ''})`;
      }
      return `Subito dopo l'evento #${ord} (${ev ? getEventLabel(ev.type) : ''})`;
    }
    return 'Posizione standard';
  };

  // Empty State Assoluto (0 componenti e 0 eventi)
  if (components.length === 0 && events.length === 0) {
    return (
      <div className="animate-slide-up" style={styles.emptyStateCard}>
        <div style={styles.emptyStateIcon}>
          <History size={36} color="var(--text-muted)" />
        </div>
        <h2 style={styles.emptyStateTitle}>Nessun Evento Storico Registrato</h2>
        <p style={styles.emptyStateText}>
          Non sono ancora presenti eventi o acquisti nella cronologia del PC. Aggiungi il tuo primo componente o registra un acquisto per esplorare la macchina indietro nel tempo.
        </p>
      </div>
    );
  }

  return (
    <div className="time-travel-container animate-fade-in">
      {/* 1. Header Principale Time Travel */}
      <div className="time-travel-header-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={19} color="var(--accent-primary)" />
            <h2 style={styles.headerTitle}>Time Travel</h2>
            <span style={styles.historicalBadge}>NAVIGAZIONE STORICA</span>
          </div>
          <p style={styles.headerSubtitle}>
            Stai guardando il tuo PC nel passato. La configurazione e i costi riflettono fedelmente lo stato alla posizione temporale selezionata.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsCheckpointListOpen(!isCheckpointListOpen)}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '7px 14px' }}
            title="Visualizza e gestisci tutti i checkpoint salvati"
          >
            <Bookmark size={15} color="var(--accent-amber)" />
            <span>Checkpoint ({checkpoints.length})</span>
          </button>

          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '7px 14px' }}
            title="Salva esattamente la configurazione visualizzata come checkpoint immutabile"
          >
            <Sparkles size={15} />
            <span>Salva configurazione</span>
          </button>
        </div>
      </div>

      {/* 2. Barra di Controllo Temporale & Navigazione Milestones */}
      <div className="time-travel-controls-bar">
        <div className="time-travel-nav-row">
          {/* Pulsanti Salto Rapido ed Indietro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleJumpToEarliest}
              className="btn btn-secondary"
              disabled={currentMilestoneIndex === 0}
              title="Salta alla prima data registrata (Origine)"
              style={styles.navBtn}
            >
              <ChevronsLeft size={16} />
              <span className="hide-mobile">Origine</span>
            </button>
            <button
              onClick={handlePrevDate}
              className="btn btn-secondary"
              disabled={currentMilestoneIndex <= 0}
              title="Data storica precedente"
              style={styles.navBtn}
            >
              <ChevronLeft size={16} />
              <span>Data Prec</span>
            </button>
          </div>

          {/* Selettore Diretto di Data & Data Picker Nativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} color="var(--accent-primary)" />
            <span style={styles.datePickerLabel}>Data visualizzata:</span>
            <input
              type="date"
              className="form-input font-mono"
              value={selectedDate}
              min={bounds.minDate || undefined}
              max={bounds.maxDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => handleSelectDate(e.target.value)}
              style={styles.dateInput}
              aria-label="Seleziona data della cronologia"
            />
          </div>

          {/* Pulsanti Successivo e Più Recente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleNextDate}
              className="btn btn-secondary"
              disabled={currentMilestoneIndex === -1 || currentMilestoneIndex >= milestoneDates.length - 1}
              title="Data storica successiva"
              style={styles.navBtn}
            >
              <span>Data Succ</span>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={handleJumpToLatest}
              className="btn btn-secondary"
              disabled={currentMilestoneIndex === milestoneDates.length - 1}
              title="Salta alla data più recente registrata"
              style={styles.navBtn}
            >
              <span className="hide-mobile">Più Recente</span>
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>

        {/* Traccia Orizzontale delle Date Milestone & Checkpoints */}
        {milestoneDates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={styles.milestoneHeader}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tappe Storiche Registrate ({milestoneDates.length})
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Clicca su una data o checkpoint per saltare al punto temporale
              </span>
            </div>

            <div className="time-travel-milestone-track" role="tablist">
              {milestoneDates.map((mDate) => {
                const isActive = mDate === selectedDate;
                const cps = checkpoints.filter((c) => c.referenceDate === mDate);
                const hasCp = cps.length > 0;
                return (
                  <button
                    key={mDate}
                    onClick={() => handleSelectDate(mDate)}
                    className={`time-travel-milestone-chip ${isActive ? 'active' : ''} ${hasCp ? 'has-checkpoint' : ''}`}
                    title={hasCp ? `Checkpoint salvato al ${formatDate(mDate)}: ${cps.map((c) => c.name).join(', ')}` : `Data: ${formatDate(mDate)}`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    {hasCp && <span style={{ color: 'var(--accent-amber)', fontSize: '13px' }}>★</span>}
                    <span className="font-mono">{formatDate(mDate)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Context Bar Compatta (Area Informativa Sintetica) */}
      <div className="time-travel-context-strip">
        <div style={styles.contextItem}>
          <span style={styles.contextLabel}>Punto Temporale:</span>
          <span style={styles.contextValue}>{getPositionDescription()}</span>
        </div>

        <div style={styles.contextDivider} />

        <div style={styles.contextItem}>
          <span style={styles.contextLabel}>Componenti Montati:</span>
          <span className="font-mono" style={styles.contextValueNum}>{rigSummary.componentCount}</span>
        </div>

        <div style={styles.contextDivider} />

        <div style={styles.contextItem}>
          <span style={styles.contextLabel}>Costo Storico Rig:</span>
          <span className="font-mono" style={{ ...styles.contextValueNum, color: 'var(--accent-emerald)' }}>
            €{rigSummary.rigPurchaseCost.toFixed(2)}
          </span>
        </div>

        {checkpointsOnSelectedDate.length > 0 && (
          <>
            <div style={styles.contextDivider} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={styles.contextLabel}>
                {checkpointsOnSelectedDate.length === 1 ? 'Checkpoint salvato:' : `Checkpoint salvati (${checkpointsOnSelectedDate.length}):`}
              </span>
              {checkpointsOnSelectedDate.map((cp) => {
                const isThisActive = activeCheckpoint?.id === cp.id;
                return (
                  <button
                    key={cp.id}
                    onClick={() => handleOpenCheckpoint(cp)}
                    className={`btn btn-secondary ${isThisActive ? 'active' : ''}`}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderColor: isThisActive ? 'var(--accent-amber)' : undefined,
                    }}
                    title={`Apri ${cp.name} (${cp.summary.componentCount} componenti)`}
                  >
                    <span style={{ color: 'var(--accent-amber)' }}>★</span>
                    <span>{cp.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Eventi della Giornata (Intra-Day Event Picker - Nessun Orario Fittizio!) */}
      {dayEvents.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Movimenti del Giorno ({formatDate(selectedDate)})
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                — Sequenza ordinale deterministica
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleSelectStartOfDay}
                className={`btn btn-secondary ${boundary === 'start_of_day' ? 'active' : ''}`}
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                title="Visualizza lo stato della macchina prima che qualsiasi evento di questa giornata avesse inizio"
              >
                Inizio giornata (Prima di tutti)
              </button>
              <button
                onClick={handleSelectEndOfDay}
                className={`btn btn-secondary ${boundary === 'end_of_day' && !anchorEventId ? 'active' : ''}`}
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                title="Visualizza lo stato della macchina dopo che tutti gli eventi della giornata si sono conclusi"
              >
                Fine giornata (Tutti inclusi)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dayEvents.map((ev, idx) => {
              const comp = components.find((c) => c.id === ev.componentId);
              const isAnchor = anchorEventId === ev.id;
              const isAfter = isAnchor && boundary === 'after_event';
              const isBefore = isAnchor && boundary === 'before_event';

              return (
                <div
                  key={ev.id}
                  className={`time-travel-event-card ${isAnchor ? 'active-event' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span className="time-travel-event-step-badge">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={styles.eventBadge}>
                      {getEventLabel(ev.type)}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {comp ? comp.name : 'Componente'}
                    </span>
                    {'price' in ev && ev.price !== undefined && (
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        (€{ev.price.toFixed(2)})
                      </span>
                    )}
                    {'amount' in ev && ev.amount !== undefined && (
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        (€{ev.amount.toFixed(2)})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleSelectBeforeEvent(ev.id)}
                      className={`btn btn-secondary ${isBefore ? 'active' : ''}`}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      title={`Posiziona la timeline subito prima di questo evento`}
                    >
                      Prima di questo
                    </button>
                    <button
                      onClick={() => handleSelectAfterEvent(ev.id)}
                      className={`btn btn-secondary ${isAfter ? 'active' : ''}`}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      title={`Posiziona la timeline subito dopo questo evento`}
                    >
                      Dopo questo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Banner e Controllo Checkpoint Attivo (Fotografia vs Ricostruzione) */}
      {activeCheckpoint && (
        <div style={styles.checkpointBannerBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bookmark size={18} color="var(--accent-amber)" />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Checkpoint: {activeCheckpoint.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({formatDate(activeCheckpoint.referenceDate)} • {activeCheckpoint.summary.componentCount} componenti • €{activeCheckpoint.summary.rigPurchaseCost.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Toggle Switcher tra Fotografia Congelata e Ricostruzione Dinamica */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setViewMode('checkpoint_snapshot')}
                className={`btn btn-secondary ${viewMode === 'checkpoint_snapshot' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Fotografia Congelata
              </button>
              <button
                onClick={() => setViewMode('reconstruction')}
                className={`btn btn-secondary ${viewMode === 'reconstruction' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Ricostruzione Dinamica Timeline
              </button>
            </div>
          </div>

          {/* Banner Discrepanza Informativa (se presente) */}
          {checkpointDiscrepancy && (checkpointDiscrepancy.hasDiscrepancies || checkpointDiscrepancy.costDifference !== 0) && (
            <div className="checkpoint-discrepancy-banner animate-fade-in" style={{ marginTop: '12px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 600 }}>
                  La ricostruzione della timeline differisce dalla fotografia salvata in questo checkpoint.
                </span>
                <span>
                  {checkpointDiscrepancy.costDifference !== 0 && (
                    <>Differenza economica riscontrata: <strong>{checkpointDiscrepancy.costDifference > 0 ? `+€${checkpointDiscrepancy.costDifference.toFixed(2)}` : `-€${Math.abs(checkpointDiscrepancy.costDifference).toFixed(2)}`}</strong>. </>
                  )}
                  {checkpointDiscrepancy.missingInReconstruction.length > 0 && (
                    <>Componenti non più presenti nella ricostruzione: {checkpointDiscrepancy.missingInReconstruction.map((c) => c.name).join(', ')}. </>
                  )}
                  {checkpointDiscrepancy.addedInReconstruction.length > 0 && (
                    <>Componenti aggiuntivi nella ricostruzione: {checkpointDiscrepancy.addedInReconstruction.map((c) => c.name).join(', ')}. </>
                  )}
                  La fotografia originale del checkpoint è stata integralmente preservata.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Configurazione Hardware Storica */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          <h3 style={styles.rigSectionHeading}>
            CONFIGURAZIONE — {selectedDate ? formatDate(selectedDate).toUpperCase() : 'STORICA'}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {displayedComponents.length} {displayedComponents.length === 1 ? 'componente montato' : 'componenti montati'}
            {viewMode === 'checkpoint_snapshot' ? ' (da Snapshot congelato)' : ' (da Ricostruzione dinamica)'}
          </span>
        </div>

        {displayedComponents.length === 0 ? (
          <div style={styles.emptyRigBox}>
            <Package size={24} color="var(--text-muted)" />
            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Nessun componente risultava fisicamente montato nella macchina in questo preciso punto temporale.
            </span>
          </div>
        ) : (
          <div style={styles.componentsGrid}>
            {displayedComponents.map((comp) => (
              <div key={comp.id} className="card" style={styles.compCard}>
                <div style={styles.compCardTop}>
                  <div style={styles.compCategoryBadge}>
                    {getCategoryIcon(comp.category)}
                    <span>{COMPONENT_CATEGORY_LABELS[comp.category] || comp.category}</span>
                  </div>
                  <span style={styles.statusInstalledBadge}>MONTATO</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={styles.compName}>{comp.name}</div>
                  <div style={styles.compBrandModel}>
                    {[comp.brand, comp.model].filter(Boolean).join(' • ')}
                  </div>
                </div>

                <div style={styles.compCardFooter}>
                  {comp.slotOrLocation ? (
                    <span style={styles.slotText}>Slot: {comp.slotOrLocation}</span>
                  ) : (
                    <span style={styles.slotText}>Montato nel PC</span>
                  )}
                  {comp.purchasePrice !== undefined && (
                    <span className="font-mono" style={styles.priceText}>
                      €{comp.purchasePrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Pannello Gestione Checkpoints (Drawer / Sezione Secondaria) */}
      {isCheckpointListOpen && (
        <div className="card animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bookmark size={17} color="var(--accent-amber)" />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tutti i Checkpoint Salvati ({sortedCheckpoints.length})
              </h4>
            </div>
            <button
              onClick={() => setIsCheckpointListOpen(false)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Chiudi Pannello
            </button>
          </div>

          {sortedCheckpoints.length === 0 ? (
            <div style={styles.emptyCheckpointsBox}>
              <Bookmark size={20} color="var(--text-muted)" />
              <span>Nessun checkpoint salvato. Puoi salvare la configurazione corrente o storica con il pulsante &quot;★ Salva questa configurazione&quot;.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedCheckpoints.map((cp) => (
                <div
                  key={cp.id}
                  style={styles.checkpointManageRow}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent-amber)', fontSize: '14px' }}>★</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cp.name}
                      </span>
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        ({formatDate(cp.referenceDate)})
                      </span>
                    </div>
                    {cp.notes && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cp.notes}
                      </span>
                    )}
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>{cp.summary.componentCount} componenti</span>
                      <span>•</span>
                      <span className="font-mono">€{cp.summary.rigPurchaseCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenCheckpoint(cp)}
                      className="btn btn-primary"
                      style={{ fontSize: '11.5px', padding: '5px 10px' }}
                      title="Apri questo checkpoint nella Time Travel"
                    >
                      Apri in Time Travel
                    </button>
                    <button
                      onClick={() => setCheckpointToEdit(cp)}
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '5px 8px' }}
                      title="Modifica nome e note del checkpoint"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCheckpointClick(cp)}
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '5px 8px', color: 'var(--accent-ruby)' }}
                      title="Elimina questo checkpoint"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modale Salva Checkpoint (da Time Travel) */}
      <CheckpointModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        position={currentPosition}
        initialName={`Configurazione al ${formatDate(selectedDate)}`}
        onSuccess={(created) => {
          setActiveCheckpoint(created);
          setViewMode('checkpoint_snapshot');
        }}
      />

      {/* Modale Modifica Dettagli Checkpoint */}
      <CheckpointEditModal
        isOpen={Boolean(checkpointToEdit)}
        onClose={() => setCheckpointToEdit(null)}
        checkpoint={checkpointToEdit}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  headerTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  historicalBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 7px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--accent-primary-subtle)',
    color: 'var(--accent-primary)',
    letterSpacing: '0.06em',
  },
  headerSubtitle: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  navBtn: {
    fontSize: '12px',
    padding: '6px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  datePickerLabel: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  dateInput: {
    padding: '5px 10px',
    fontSize: '13px',
    width: '145px',
  },
  milestoneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2px',
  },
  contextItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    fontSize: '12.5px',
  },
  contextLabel: {
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  contextValue: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  contextValueNum: {
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  contextDivider: {
    width: '1px',
    height: '14px',
    backgroundColor: 'var(--border-subtle)',
  },
  checkpointActiveBadge: {
    color: 'var(--accent-amber)',
    fontWeight: 700,
    fontSize: '12.5px',
  },
  eventBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
  },
  checkpointBannerBox: {
    padding: '14px 18px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rigSectionHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.05em',
  },
  componentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  compCard: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  compCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compCategoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statusInstalledBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: 'var(--accent-emerald)',
    letterSpacing: '0.04em',
  },
  compName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  compBrandModel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  compCardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
    fontSize: '11.5px',
  },
  slotText: {
    color: 'var(--text-muted)',
  },
  priceText: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  emptyRigBox: {
    padding: '32px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    textAlign: 'center',
  },
  emptyCheckpointsBox: {
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12.5px',
    color: 'var(--text-muted)',
  },
  checkpointManageRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    gap: '12px',
    flexWrap: 'wrap',
  },
  emptyStateCard: {
    padding: '48px 24px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '14px',
    maxWidth: '560px',
    margin: '40px auto',
  },
  emptyStateIcon: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  emptyStateText: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
};
