import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Component } from '../../types';
import { usePCStore } from '../../store';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: Component | null;
  onDeleted?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  component,
  onDeleted,
}) => {
  const { deleteComponent, getComponentEvents } = usePCStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!component) return null;

  const eventsCount = getComponentEvents(component.id).length;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteComponent(component.id);
      onClose();
      onDeleted?.();
    } catch (err) {
      alert(`Errore durante l'eliminazione: ${(err as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Elimina Componente"
      maxWidth="460px"
    >
      <div style={styles.container}>
        <div style={styles.iconContainer}>
          <AlertTriangle size={28} color="var(--accent-ruby)" />
        </div>

        <p style={styles.warningText}>
          Sei sicuro di voler eliminare <strong>{component.name}</strong> ({component.brand} {component.model})?
        </p>

        {eventsCount > 0 && (
          <div className="form-error-banner" style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '13px' }}>
              <strong>Cancellazione a cascata:</strong> Verranno eliminati anche tutti i <strong>{eventsCount} eventi</strong> collegati a questo pezzo (acquisti, montaggi, vendite).
            </span>
          </div>
        )}

        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Questa azione è permanente e rimuoverà il componente da IndexedDB.
        </p>

        <div className="form-actions" style={{ justifyContent: 'center', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isDeleting}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-danger"
            disabled={isDeleting}
          >
            <Trash2 size={15} />
            <span>{isDeleting ? 'Eliminazione...' : 'Elimina Definitivamente'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    textAlign: 'center',
  },
  iconContainer: {
    width: '50px',
    height: '50px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--accent-ruby-subtle)',
    border: '1px solid var(--accent-ruby-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  warningText: {
    fontSize: '14.5px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
};
