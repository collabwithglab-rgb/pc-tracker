import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, ComponentCategory, COMPONENT_CATEGORY_LABELS } from '../../types';
import { usePCStore } from '../../store';
import { Wrench, AlertCircle } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedComponent?: Component | null;
  targetCategory?: ComponentCategory | null;
  onSuccess?: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  preSelectedComponent,
  targetCategory,
  onSuccess,
}) => {
  const { getAvailableForInstallComponents, installComponent } = usePCStore();

  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotOrLocation, setSlotOrLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recupera i componenti disponibili in magazzino
  const availableComponents = getAvailableForInstallComponents(targetCategory || undefined);

  useEffect(() => {
    if (preSelectedComponent) {
      setSelectedComponentId(preSelectedComponent.id);
    } else if (availableComponents.length > 0) {
      setSelectedComponentId(availableComponents[0].id);
    } else {
      setSelectedComponentId('');
    }
    setDate(new Date().toISOString().split('T')[0]);
    setSlotOrLocation('');
    setNotes('');
    setError('');
  }, [isOpen, preSelectedComponent, targetCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedComponentId) {
      setError('Seleziona un componente da installare.');
      return;
    }

    if (!date) {
      setError('La data di installazione è obbligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await installComponent(selectedComponentId, {
        date,
        slotOrLocation: slotOrLocation.trim() || undefined,
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

  const getSlotPlaceholder = (cat?: ComponentCategory) => {
    switch (cat) {
      case 'gpu':
        return 'es. PCIe x16 Slot 1';
      case 'storage':
        return 'es. Slot M.2_1, SATA 1';
      case 'ram':
        return 'es. DIMM A2 / B2 (Dual Channel)';
      case 'cooling':
        return 'es. Socket CPU / Frontale 360mm';
      case 'case':
        return 'es. Chassis primario';
      default:
        return 'es. Posizione o slot dedicato (opzionale)';
    }
  };

  const selectedComp = preSelectedComponent || availableComponents.find((c) => c.id === selectedComponentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Installa Componente nel PC"
      subtitle="Registra il montaggio fisico all'interno della macchina"
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Selezione Componente se non pre-selezionato */}
        {!preSelectedComponent ? (
          <div className="form-group">
            <label className="form-label">
              Componente da Installare (in Magazzino) <span className="form-required">*</span>
            </label>
            {availableComponents.length === 0 ? (
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
                Nessun componente in magazzino disponibile per {targetCategory ? COMPONENT_CATEGORY_LABELS[targetCategory] : 'questa categoria'}. Aggiungi prima un componente all'Archivio.
              </div>
            ) : (
              <select
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
                className="form-select"
              >
                {availableComponents.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.brand} {comp.model}) — {COMPONENT_CATEGORY_LABELS[comp.category]}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={16} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14.5px' }}>
                {preSelectedComponent.name}
              </span>
            </div>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {preSelectedComponent.brand} {preSelectedComponent.model && `• ${preSelectedComponent.model}`} ({COMPONENT_CATEGORY_LABELS[preSelectedComponent.category]})
            </span>
          </div>
        )}

        {/* Data di Installazione */}
        <div className="form-group">
          <label className="form-label">
            Data di Installazione <span className="form-required">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {/* Slot / Alloggiamento Hardware */}
        <div className="form-group">
          <label className="form-label">
            Alloggiamento / Slot Hardware (Opzionale)
          </label>
          <input
            type="text"
            value={slotOrLocation}
            onChange={(e) => setSlotOrLocation(e.target.value)}
            placeholder={getSlotPlaceholder(selectedComp?.category || targetCategory || undefined)}
            className="form-input"
          />
        </div>

        {/* Note Opzionali */}
        <div className="form-group">
          <label className="form-label">Note Aggiuntive (Opzionale)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="es. Pasta termica Kryonaut, viti M.2 originali"
            className="form-input"
          />
        </div>

        {/* Pulsanti Azione */}
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
            disabled={isSubmitting || (!preSelectedComponent && availableComponents.length === 0)}
          >
            <Wrench size={15} />
            <span>{isSubmitting ? 'Salvataggio...' : 'Installa Componente'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
