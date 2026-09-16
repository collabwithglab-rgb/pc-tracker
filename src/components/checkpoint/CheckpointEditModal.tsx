import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { usePCStore } from '../../store';
import { Checkpoint } from '../../types';
import { Edit3, AlertCircle } from 'lucide-react';

interface CheckpointEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoint: Checkpoint | null;
}

export const CheckpointEditModal: React.FC<CheckpointEditModalProps> = ({
  isOpen,
  onClose,
  checkpoint,
}) => {
  const { updateCheckpoint } = usePCStore();

  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && checkpoint) {
      setName(checkpoint.name);
      setNotes(checkpoint.notes || '');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, checkpoint]);

  if (!checkpoint) return null;

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

      await updateCheckpoint(checkpoint.id, {
        name: trimmedName,
        notes: notes.trim() || undefined,
      });

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
      title="Modifica Dettagli Checkpoint"
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={styles.disclaimerBox}>
          <span>
            Nota: I componenti e i dati economici di questo checkpoint rimangono storicamente congelati ed immutabili.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="edit-checkpoint-name">
            Nome Checkpoint
          </label>
          <input
            id="edit-checkpoint-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del checkpoint"
            maxLength={100}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="edit-checkpoint-notes">
            Note (opzionale)
          </label>
          <textarea
            id="edit-checkpoint-notes"
            className="form-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi o modifica le note..."
            style={{ resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} color="var(--accent-ruby)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

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
            <Edit3 size={15} />
            <span>{isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  disclaimerBox: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
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
