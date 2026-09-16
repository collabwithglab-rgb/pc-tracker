import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, COMPONENT_CATEGORY_LABELS, InstallEvent } from '../../types';
import { usePCStore } from '../../store';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';

interface ReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldComponent: Component | null;
  lastInstallEvent?: InstallEvent;
  onSuccess?: () => void;
}

export const ReplaceModal: React.FC<ReplaceModalProps> = ({
  isOpen,
  onClose,
  oldComponent,
  lastInstallEvent,
  onSuccess,
}) => {
  const { getAvailableForInstallComponents, replaceComponent } = usePCStore();

  const [newComponentId, setNewComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotOrLocation, setSlotOrLocation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Componenti disponibili in magazzino della stessa categoria
  const availableSameCategory = oldComponent
    ? getAvailableForInstallComponents(oldComponent.category)
    : [];

  useEffect(() => {
    if (availableSameCategory.length > 0) {
      setNewComponentId(availableSameCategory[0].id);
    } else {
      setNewComponentId('');
    }
    setDate(new Date().toISOString().split('T')[0]);
    setSlotOrLocation(lastInstallEvent?.slotOrLocation || '');
    setError('');
  }, [isOpen, oldComponent, lastInstallEvent]);

  if (!oldComponent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newComponentId) {
      setError('Seleziona il nuovo componente da installare al posto di quello attuale.');
      return;
    }

    if (!date) {
      setError('La data di sostituzione è obbligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await replaceComponent(oldComponent.id, newComponentId, {
        date,
        slotOrLocation: slotOrLocation.trim() || undefined,
        reason: 'upgrade',
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
      title="Sostituisci Componente"
      subtitle="Smonta il pezzo attuale e installa un componente dal magazzino"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Vecchio componente */}
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
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Componente Attuale (Verrà spostato in Magazzino):
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14.5px' }}>
            {oldComponent.name}
          </span>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {oldComponent.brand} {oldComponent.model && `• ${oldComponent.model}`} ({COMPONENT_CATEGORY_LABELS[oldComponent.category]})
          </span>
        </div>

        {/* Selezione Nuovo Componente */}
        <div className="form-group">
          <label className="form-label">
            Nuovo Componente da Montare <span className="form-required">*</span>
          </label>
          {availableSameCategory.length === 0 ? (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              Nessun altro componente di categoria <strong>{COMPONENT_CATEGORY_LABELS[oldComponent.category]}</strong> disponibile in magazzino. Aggiungi prima il nuovo pezzo all'Archivio.
            </div>
          ) : (
            <select
              value={newComponentId}
              onChange={(e) => setNewComponentId(e.target.value)}
              className="form-select"
            >
              {availableSameCategory.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.brand} {c.model})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Data di Sostituzione */}
        <div className="form-group">
          <label className="form-label">
            Data di Sostituzione <span className="form-required">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {/* Slot Hardware Ereditato */}
        <div className="form-group">
          <label className="form-label">Alloggiamento / Slot Hardware (Opzionale)</label>
          <input
            type="text"
            value={slotOrLocation}
            onChange={(e) => setSlotOrLocation(e.target.value)}
            placeholder="es. PCIe Slot 1, M.2_1"
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
            className="btn btn-primary"
            disabled={isSubmitting || availableSameCategory.length === 0}
          >
            <ArrowRightLeft size={15} />
            <span>{isSubmitting ? 'Sostituzione...' : 'Conferma Sostituzione'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
