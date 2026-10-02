import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { EventLogDiagnosticsSnapshot } from '../../types/diagnostics';
import { groupAndDeduplicateEvents, DiagnosticEventGroup } from '../../domain/diagnosticCorrelationEngine';
import { Modal } from '../common/Modal';

interface EventLogInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventLogSnapshot?: EventLogDiagnosticsSnapshot | null;
  referenceDate?: string;
}

/**
 * Decodifica testuale controllata dell'evento nativo (senza PII e anti-ansia).
 * Rispetta rigorosamente le specifiche di Tranche 8A e Sezioni 2.1-2.5.
 */
function getEventClassificationInfo(provider: string, eventId: number): {
  label: string;
  category: 'whea' | 'kernel_power' | 'storage' | 'display' | 'other';
  severityBadgeClass: string;
  severityLabel: string;
  description: string;
} {
  const normProv = provider.toLowerCase();

  if (normProv.includes('whea')) {
    if (eventId === 18) {
      return {
        label: 'WHEA-Logger 18 • Uncorrected MCE',
        category: 'whea',
        severityBadgeClass: 'badge-ruby',
        severityLabel: 'Critico',
        description: 'Errore hardware fatale/non corretto su core CPU o bus di sistema.',
      };
    }
    if (eventId === 19) {
      return {
        label: 'WHEA-Logger 19 • Corrected MCE',
        category: 'whea',
        severityBadgeClass: 'badge-amber',
        severityLabel: 'Avviso',
        description: 'Errore corretto dal processore (Machine Check). Frequente in presenza di undervolt spinto o degrado silicio.',
      };
    }
    if (eventId === 17) {
      return {
        label: 'WHEA-Logger 17 • Corrected PCIe Error',
        category: 'whea',
        severityBadgeClass: 'badge-cyan',
        severityLabel: 'Nota',
        description: 'Errore corretto sul bus di comunicazione PCIe periferica.',
      };
    }
    if (eventId === 47) {
      return {
        label: 'WHEA-Logger 47 • Corrected Memory Error',
        category: 'whea',
        severityBadgeClass: 'badge-cyan',
        severityLabel: 'Nota',
        description: 'Errore corretto sui moduli di memoria con correzione di parità/ECC.',
      };
    }
  }

  if (normProv.includes('kernel-power') && eventId === 41) {
    return {
      label: 'Kernel-Power 41 • Arresto Imprevisto',
      category: 'kernel_power',
      severityBadgeClass: 'badge-amber',
      severityLabel: 'Avviso',
      description: 'Il sistema si è riavviato senza un regolare arresto (interruzione alimentazione, freeze, crash o pressione tasto spegnimento).',
    };
  }

  if (normProv === 'disk') {
    if (eventId === 7) {
      return {
        label: 'disk 7 • Bad Block Rilevato',
        category: 'storage',
        severityBadgeClass: 'badge-ruby',
        severityLabel: 'Critico',
        description: 'Rilevato blocco di memoria difettoso sul dispositivo disco durante operazione I/O.',
      };
    }
    if (eventId === 11) {
      return {
        label: 'disk 11 • Errore Controller Storage',
        category: 'storage',
        severityBadgeClass: 'badge-amber',
        severityLabel: 'Avviso',
        description: 'Il driver del controller storage ha segnalato un errore sulla periferica.',
      };
    }
    if (eventId === 51) {
      return {
        label: 'disk 51 • Paging I/O Error',
        category: 'storage',
        severityBadgeClass: 'badge-cyan',
        severityLabel: 'Nota',
        description: 'Errore durante operazione di paging I/O. Spesso transitorio o causato da saturazione della coda di scrittura.',
      };
    }
  }

  if (normProv === 'ntfs') {
    if (eventId === 55) {
      return {
        label: 'Ntfs 55 • Corruzione Filesystem Offline',
        category: 'storage',
        severityBadgeClass: 'badge-ruby',
        severityLabel: 'Critico',
        description: 'La struttura del file system su disco è danneggiata e richiede riparazione offline con chkdsk.',
      };
    }
    if (eventId === 98) {
      return {
        label: 'Ntfs 98 • Verifica Integrità Filesystem',
        category: 'storage',
        severityBadgeClass: 'badge-amber',
        severityLabel: 'Avviso',
        description: 'Rilevata potenziale incoerenza nel file system NTFS; è consigliata una scansione online (chkdsk /scan).',
      };
    }
  }

  if (normProv === 'display' && eventId === 4101) {
    return {
      label: 'Display 4101 • Timeout Driver Grafico (TDR)',
      category: 'display',
      severityBadgeClass: 'badge-amber',
      severityLabel: 'Avviso',
      description: 'Il driver video non ha risposto in tempo ed è stato riavviato con successo dal sottosistema TDR di Windows.',
    };
  }

  return {
    label: `${provider} ${eventId}`,
    category: 'other',
    severityBadgeClass: 'badge-subtle',
    severityLabel: 'Info',
    description: `Evento registrato nel canale System da ${provider}.`,
  };
}

export const EventLogInspectionModal: React.FC<EventLogInspectionModalProps> = ({
  isOpen,
  onClose,
  eventLogSnapshot,
  referenceDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const refDate = referenceDate || new Date().toISOString();

  // Deduplicazione pura e raggruppamento per chiave deterministica (provider + eventId + target)
  const groupedEvents: DiagnosticEventGroup[] = useMemo(() => {
    if (!eventLogSnapshot || !eventLogSnapshot.events || eventLogSnapshot.events.length === 0) {
      return [];
    }
    return groupAndDeduplicateEvents(
      eventLogSnapshot.events,
      refDate,
      eventLogSnapshot.queryTimeWindowHours || 168,
      eventLogSnapshot.truncated
    );
  }, [eventLogSnapshot, refDate]);

  // Conteggi sintetici per provider
  const categoryCounts = useMemo(() => {
    const counts = { whea: 0, kernel_power: 0, storage: 0, display: 0, total: 0 };
    for (const g of groupedEvents) {
      counts.total += g.occurrenceCount;
      const info = getEventClassificationInfo(g.provider, g.eventId);
      if (info.category === 'whea') counts.whea += g.occurrenceCount;
      else if (info.category === 'kernel_power') counts.kernel_power += g.occurrenceCount;
      else if (info.category === 'storage') counts.storage += g.occurrenceCount;
      else if (info.category === 'display') counts.display += g.occurrenceCount;
    }
    return counts;
  }, [groupedEvents]);

  // Filtro di ricerca
  const filteredGroups = useMemo(() => {
    return groupedEvents.filter((g) => {
      const info = getEventClassificationInfo(g.provider, g.eventId);
      if (categoryFilter !== 'all' && info.category !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.provider.toLowerCase().includes(q) ||
        String(g.eventId).includes(q) ||
        info.label.toLowerCase().includes(q) ||
        (g.targetContext && g.targetContext.toLowerCase().includes(q))
      );
    });
  }, [groupedEvents, categoryFilter, searchQuery]);

  const formatDateLabel = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoDate;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registro Eventi di Sistema (Windows System Log)"
      subtitle="Diagnostica eventi nativi Windows (wevtapi.dll) — Canale System (168h)"
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Banner di stato del campionamento e regola di Truncation (Sezione 2.1) */}
        {eventLogSnapshot && eventLogSnapshot.truncated ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertTriangle size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                Almeno 50 eventi rilevati (campionamento limitato ai più recenti)
              </strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Il cap a 50 eventi salvaguarda le risorse di memoria e IPC. I fatti mostrati rappresentano le anomalie più recenti estratte dal registro negli ultimi 7 giorni.
              </div>
            </div>
          </div>
        ) : eventLogSnapshot && eventLogSnapshot.returnedEventCount > 0 ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                {eventLogSnapshot.returnedEventCount} eventi analizzati (query esaustiva)
              </strong>{' '}
              nella finestra temporale degli ultimi 7 giorni (168 ore).
            </div>
          </div>
        ) : !eventLogSnapshot || eventLogSnapshot.availability !== 'available' ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Nessun dato di log campionato nella sessione:</strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                L'interrogazione del canale System (wevtapi.dll) viene eseguita automaticamente all'apertura del modulo Care Center nell'applicazione Desktop nativa.
              </div>
            </div>
          </div>
        ) : null}

        {/* Barra di filtraggio e pillole di conteggio rapido */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: categoryFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-input)',
                color: categoryFilter === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setCategoryFilter('all')}
            >
              Tutti ({categoryCounts.total})
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: categoryFilter === 'whea' ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-input)',
                color: categoryFilter === 'whea' ? 'var(--accent-ruby)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setCategoryFilter('whea')}
            >
              WHEA ({categoryCounts.whea})
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: categoryFilter === 'storage' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                color: categoryFilter === 'storage' ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setCategoryFilter('storage')}
            >
              Dischi / NTFS ({categoryCounts.storage})
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: categoryFilter === 'display' ? 'rgba(129, 140, 248, 0.15)' : 'var(--bg-input)',
                color: categoryFilter === 'display' ? '#818cf8' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setCategoryFilter('display')}
            >
              Display TDR ({categoryCounts.display})
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: categoryFilter === 'kernel_power' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                color: categoryFilter === 'kernel_power' ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setCategoryFilter('kernel_power')}
            >
              Kernel-Power ({categoryCounts.kernel_power})
            </button>
          </div>

          <div style={{ position: 'relative', width: '200px' }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Cerca evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '28px', height: '30px', fontSize: '0.78rem' }}
            />
          </div>
        </div>

        {/* Lista gruppi eventi */}
        {filteredGroups.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 'var(--space-xl)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <CheckCircle2 size={32} color="var(--accent-emerald)" />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Nessun Evento Critico Rilevato
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.45 }}>
              Il Registro di Sistema di Windows non ha registrato anomalie hardware WHEA, crash TDR grafici, errori di paging I/O o problemi NTFS negli ultimi 7 giorni.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredGroups.map((group) => {
              const info = getEventClassificationInfo(group.provider, group.eventId);

              return (
                <div
                  key={group.groupKey}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${info.severityBadgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {info.severityLabel}
                      </span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {info.label}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {group.targetContext && (
                        <span
                          className="badge badge-subtle"
                          style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
                          title={`Contesto bersaglio: ${group.targetContext}`}
                        >
                          Target: {group.targetContext}
                        </span>
                      )}
                      <span
                        className="badge badge-cyan"
                        style={{ fontSize: '0.72rem', fontWeight: 600 }}
                      >
                        {group.occurrenceCount} {group.occurrenceCount === 1 ? 'evento' : 'eventi'}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {info.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '6px',
                      marginTop: '2px',
                    }}
                  >
                    <span>
                      Provider: <code style={{ color: 'var(--text-secondary)' }}>{group.provider}</code> (ID: {group.eventId})
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span>Primo: {formatDateLabel(group.firstSeen)}</span>
                      <span>·</span>
                      <span>Ultimo: {formatDateLabel(group.lastSeen)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-xs)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};
