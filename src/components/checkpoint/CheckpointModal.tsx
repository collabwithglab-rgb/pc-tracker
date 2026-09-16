import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { usePCStore } from '../../store';
import { Checkpoint, CheckpointTrigger, TemporalPosition } from '../../types';
import { formatDate } from '../../utils';
import { getRigSummaryAtPosition } from '../../domain';
import { Bookmark, Sparkles, AlertCircle, HardDrive, DollarSign } from 'lucide-react';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: TemporalPosition | null;
  initialName?: string;
  trigger?: CheckpointTrigger;
  relatedUpgradeId?: string | null;
  onSuccess?: (checkpoint: Checkpoint) => void;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  isOpen,
  onClose,
  position,
  initialName,
  trigger = 'manual',
  relatedUpgradeId,
  onSuccess,
}) => {
  const {
    components,
    events,
    currentRigCost,
    getInstalledComponents,
    createCheckpointFromCurrent,
    createCheckpointFromPosition,
  } = usePCStore();

  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calcola il riepilogo della configurazione che verrà catturata
  const previewSummary = useMemo(() => {
    if (position) {
      const summary = getRigSummaryAtPosition(components, events, position);
      return {
        componentCount: summary.componentCount,
        rigPurchaseCost: summary.rigPurchaseCost,
        dateLabel: formatDate(position.date),
      };
    }
    const installed = getInstalledComponents();
    return {
      componentCount: installed.length,
      rigPurchaseCost: currentRigCost,
      dateLabel: 'Oggi (Configurazione Attuale)',
    };
  }, [position, components, events, currentRigCost, getInstalledComponents]);

  // Reset del form all'apertura del modale
  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
      setNotes('');

      if (initialName) {
        setName(initialName);
      } else if (position) {
        setName(`Configurazione al ${formatDate(position.date)}`);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setName(`Checkpoint ${formatDate(todayStr)}`);
      }
    }
  }, [isOpen, initialName, position]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Il nome del checkpoint deve contenere almeno 2 caratteri.');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Il nome del checkpoint non può superare 100 caratteri.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let created: Checkpoint;
      if (position) {
        created = await createCheckpointFromPosition({
          name: trimmedName,
          notes: notes.trim() || undefined,
          position,
          trigger,
          relatedUpgradeId,
        });
      } else {
        created = await createCheckpointFromCurrent({
          name: trimmedName,
          notes: notes.trim() || undefined,
        });
      }

      onSuccess?.(created);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={position ? 'Salva Configurazione Storica come Checkpoint' : 'Salva Configurazione Attuale come Checkpoint'}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Banner Informativo sul Punto Temporale */}
        <div style={styles.infoBanner}>
          <div style={styles.bannerIcon}>
            {position ? <Sparkles size={18} color="var(--accent-amber)" /> : <Bookmark size={18} color="var(--accent-primary)" />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.bannerTitle}>
              {position ? 'Istantanea Storica Congelata' : 'Fotografia Configurazione Attuale'}
            </div>
            <div style={styles.bannerText}>
              {position
                ? `Il checkpoint congelerà la macchina esattamente come configurata al ${previewSummary.dateLabel}.`
                : 'Il checkpoint salverà una fotografia immutabile dei componenti e dei costi attualmente montati.'}
            </div>
          </div>
        </div>

        {/* Riepilogo Sintetico dello Snapshot da Catturare */}
        <div style={styles.previewGrid}>
          <div style={styles.previewCard}>
            <div style={styles.previewCardLabel}>
              <HardDrive size={13} color="var(--accent-primary)" />
              <span>Componenti Montati</span>
            </div>
            <div className="font-mono" style={styles.previewCardValue}>
              {previewSummary.componentCount}
            </div>
          </div>
          <div style={styles.previewCard}>
            <div style={styles.previewCardLabel}>
              <DollarSign size={13} color="var(--accent-emerald)" />
              <span>Costo Storico Rig</span>
            </div>
            <div className="font-mono" style={styles.previewCardValue}>
              €{previewSummary.rigPurchaseCost.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Campo: Nome Checkpoint */}
        <div className="form-group">
          <label className="form-label required" htmlFor="checkpoint-name">
            Nome Checkpoint
          </label>
          <input
            id="checkpoint-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Build Originaria 2024, Passaggio a RTX 4090..."
            maxLength={100}
            required
            autoFocus
          />
        </div>

        {/* Campo: Note Opzionali */}
        <div className="form-group">
          <label className="form-label" htmlFor="checkpoint-notes">
            Note o Dettagli (opzionale)
          </label>
          <textarea
            id="checkpoint-notes"
            className="form-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descrivi brevemente lo scopo di questo checkpoint o le modifiche apportate..."
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Messaggio Errore */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} color="var(--accent-ruby)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Azioni */}
        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !name.trim()}
          >
            <Bookmark size={15} />
            <span>{isSubmitting ? 'Salvataggio...' : 'Salva Checkpoint'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  infoBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
  },
  bannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '2px',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  bannerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  previewCard: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  previewCardLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
  },
  previewCardValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.25)',
    color: 'var(--accent-ruby)',
    fontSize: '12.5px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '10px',
    borderTop: '1px solid var(--border-subtle)',
  },
};
