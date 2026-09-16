import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, COMPONENT_STATUS_LABELS, COMPONENT_CATEGORY_LABELS, DisposalEvent } from '../../types';
import { usePCStore } from '../../store';
import { Recycle, AlertCircle, Info } from 'lucide-react';

export interface DisposalFormProps {
  preSelectedComponent?: Component | null;
  onCancel: () => void;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const DisposalForm: React.FC<DisposalFormProps> = ({
  preSelectedComponent,
  onCancel,
  onSuccess,
  onBack,
}) => {
  const { getNonTerminalComponents, getComponentComputed, recordDisposal } = usePCStore();

  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [disposalMethod, setDisposalMethod] = useState<DisposalEvent['disposalMethod']>('eco_center');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nonTerminalComponents = getNonTerminalComponents();

  useEffect(() => {
    if (preSelectedComponent) {
      setSelectedComponentId(preSelectedComponent.id);
    } else if (nonTerminalComponents.length > 0) {
      setSelectedComponentId(nonTerminalComponents[0].id);
    } else {
      setSelectedComponentId('');
    }
    setDate(new Date().toISOString().split('T')[0]);
    setDisposalMethod('eco_center');
    setNotes('');
    setError('');
  }, [preSelectedComponent]);

  const selectedComp = preSelectedComponent || nonTerminalComponents.find((c) => c.id === selectedComponentId);
  const compComputed = selectedComp ? getComponentComputed(selectedComp.id) : undefined;
  const isCurrentlyInUse = compComputed?.status === 'IN_USE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedComponentId) {
      setError('Seleziona il componente da smaltire.');
      return;
    }

    if (!date) {
      setError('La data di smaltimento è obbligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordDisposal(selectedComponentId, {
        date,
        disposalMethod,
        notes: notes.trim() || undefined,
      });

      onSuccess?.(selectedComponentId);
      onCancel();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div className="form-error-banner animate-fade-in">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Selezione Componente */}
      <div className="form-group">
        <label className="form-label">
          Componente da Smaltire <span className="form-required">*</span>
        </label>
        {preSelectedComponent ? (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                {preSelectedComponent.name}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                ({preSelectedComponent.brand})
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600,
              }}
            >
              {COMPONENT_CATEGORY_LABELS[preSelectedComponent.category]}
            </span>
          </div>
        ) : nonTerminalComponents.length === 0 ? (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--accent-amber-subtle)',
              color: 'var(--accent-amber)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              border: '1px solid var(--accent-amber-border)',
            }}
          >
            Nessun componente attivo o a magazzino disponibile da smaltire.
          </div>
        ) : (
          <select
            className="form-select"
            value={selectedComponentId}
            onChange={(e) => setSelectedComponentId(e.target.value)}
            disabled={isSubmitting}
          >
            {nonTerminalComponents.map((c) => {
              const computed = getComponentComputed(c.id);
              const statusLabel = computed ? COMPONENT_STATUS_LABELS[computed.status] : '';
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.brand}) — [{statusLabel}]
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Avviso se montato nel PC */}
      {isCurrentlyInUse && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(100, 116, 139, 0.08)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            Questo pezzo è montato nel PC. Confermando lo smaltimento verrà automaticamente rimosso dal rig.
          </span>
        </div>
      )}

      {/* Rigo Data e Metodo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">
            Data Smaltimento <span className="form-required">*</span>
          </label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Metodo Smaltimento <span className="form-required">*</span>
          </label>
          <select
            className="form-select"
            value={disposalMethod}
            onChange={(e) => setDisposalMethod(e.target.value as DisposalEvent['disposalMethod'])}
            disabled={isSubmitting}
          >
            <option value="eco_center">Isola Ecologica Comunale</option>
            <option value="recycled">Riciclato RAEE</option>
            <option value="broken_discarded">Guasto / Gettato</option>
          </select>
        </div>
      </div>

      {/* Note */}
      <div className="form-group">
        <label className="form-label">Motivo o note (opzionale)</label>
        <textarea
          rows={2}
          placeholder="es. Difetto circuito di alimentazione non riparabile, portato al centro RAEE..."
          className="form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Pulsanti Azione */}
      <div className="form-actions">
        {onBack && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onBack}
            disabled={isSubmitting}
            style={{ marginRight: 'auto' }}
          >
            Indietro
          </button>
        )}
        <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            backgroundColor: 'var(--text-muted)',
            borderColor: 'var(--text-muted)',
            color: 'var(--text-primary)',
          }}
          disabled={isSubmitting || !selectedComponentId}
        >
          <Recycle size={15} />
          <span>{isSubmitting ? 'Salvataggio...' : 'Conferma Smaltimento'}</span>
        </button>
      </div>
    </form>
  );
};

interface DisposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedComponent?: Component | null;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const DisposalModal: React.FC<DisposalModalProps> = ({
  isOpen,
  onClose,
  preSelectedComponent,
  onSuccess,
  onBack,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      title="Registra Smaltimento Hardware"
      maxWidth="540px"
    >
      <DisposalForm
        preSelectedComponent={preSelectedComponent}
        onCancel={onClose}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Modal>
  );
};
