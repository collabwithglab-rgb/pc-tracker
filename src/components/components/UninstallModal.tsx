import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, UNINSTALL_REASON_LABELS, UninstallEvent } from '../../types';
import { usePCStore } from '../../store';
import { Package, AlertCircle } from 'lucide-react';

interface UninstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: Component | null;
  onSuccess?: () => void;
}

export const UninstallModal: React.FC<UninstallModalProps> = ({
  isOpen,
  onClose,
  component,
  onSuccess,
}) => {
  const { uninstallComponent } = usePCStore();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<NonNullable<UninstallEvent['reason']>>('storage');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
    setReason('storage');
    setNotes('');
    setError('');
  }, [isOpen, component]);

  if (!component) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('La data di rimozione è obbligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await uninstallComponent(component.id, {
        date,
        reason,
        notes: notes.trim() || undefined,
      });
      onClose();
      onSuccess?.();
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
      title="Rimuovi Componente dal PC"
      subtitle="Registra lo smontaggio e lo spostamento a magazzino"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Info Componente da Smontare */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} color="var(--accent-amber)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14.5px' }}>
              {component.name}
            </span>
          </div>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {component.brand} {component.model && `• ${component.model}`}
          </span>
        </div>

        {/* Data di Rimozione */}
        <div className="form-group">
          <label className="form-label">
            Data di Rimozione / Smontaggio <span className="form-required">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {/* Motivo Rimozione */}
        <div className="form-group">
          <label className="form-label">
            Motivo dello Smontaggio <span className="form-required">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as NonNullable<UninstallEvent['reason']>)}
            className="form-select"
          >
            {Object.entries(UNINSTALL_REASON_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Note Rimozione */}
        <div className="form-group">
          <label className="form-label">Note Aggiuntive (Opzionale)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="es. Smontato per cambio pasta termica / riposto in scatola originale"
            className="form-input"
          />
        </div>

        {/* Azioni */}
        <div className="form-actions">
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
            className="btn btn-secondary"
            style={{ color: 'var(--accent-amber)', borderColor: 'var(--accent-amber-border)' }}
            disabled={isSubmitting}
          >
            <Package size={15} />
            <span>{isSubmitting ? 'Registrazione...' : 'Registra Rimozione'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
