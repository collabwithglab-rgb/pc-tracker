import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, COMPONENT_STATUS_LABELS, COMPONENT_CATEGORY_LABELS } from '../../types';
import { usePCStore } from '../../store';
import { AlertCircle, Info, Receipt } from 'lucide-react';

export interface ExtraExpenseFormProps {
  preSelectedComponent?: Component | null;
  onCancel: () => void;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const ExtraExpenseForm: React.FC<ExtraExpenseFormProps> = ({
  preSelectedComponent,
  onCancel,
  onSuccess,
  onBack,
}) => {
  const { getNonTerminalComponents, getComponentComputed, recordExtraExpense } = usePCStore();

  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
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
    setAmount('');
    setDescription('');
    setNotes('');
    setError('');
  }, [preSelectedComponent]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedComponentId) {
      setError('Seleziona il componente a cui associare la spesa.');
      return;
    }

    if (!date) {
      setError('La data della spesa è obbligatoria.');
      return;
    }

    if (amount.trim() === '' || isNaN(numAmount) || numAmount <= 0) {
      setError('L’importo della spesa deve essere un valore numerico maggiore di zero.');
      return;
    }

    if (!description.trim()) {
      setError('La descrizione della spesa è obbligatoria (es. Cavi custom, waterblock, pad termici).');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordExtraExpense(selectedComponentId, {
        date,
        amount: numAmount,
        description: description.trim(),
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
          Componente Target <span className="form-required">*</span>
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
                color: 'var(--accent-ruby)',
                backgroundColor: 'var(--accent-ruby-subtle)',
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
            Nessun componente attivo o a magazzino disponibile a cui associare una spesa.
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

      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid var(--accent-ruby-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-ruby)',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Info size={16} style={{ flexShrink: 0 }} />
        <span>
          Le spese extra incrementano il costo storico del componente e il totale acquistato, riflettendosi sul bilancio netto.
        </span>
      </div>

      {/* Rigo Data e Importo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">
            Data Spesa <span className="form-required">*</span>
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
            Importo (€) <span className="form-required">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="es. 29.90"
            className="form-input font-mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {/* Descrizione Spesa */}
      <div className="form-group">
        <label className="form-label">
          Descrizione / Oggetto <span className="form-required">*</span>
        </label>
        <input
          type="text"
          placeholder="es. Cavi custom sleeved neri, pasta termica Thermal Grizzly, staffa anti-sag"
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {/* Note opzionali */}
      <div className="form-group">
        <label className="form-label">Note o negozio (opzionale)</label>
        <textarea
          rows={2}
          placeholder="es. Acquistato su Amazon Prime, comprende sdoppiatore RGB..."
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
            backgroundColor: 'var(--accent-ruby)',
            borderColor: 'var(--accent-ruby)',
            color: 'var(--text-primary)',
          }}
          disabled={isSubmitting || !selectedComponentId}
        >
          <Receipt size={15} />
          <span>{isSubmitting ? 'Salvataggio...' : 'Registra Spesa'}</span>
        </button>
      </div>
    </form>
  );
};

interface ExtraExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedComponent?: Component | null;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const ExtraExpenseModal: React.FC<ExtraExpenseModalProps> = ({
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
      title="Registra Spesa Extra / Modding"
      maxWidth="560px"
    >
      <ExtraExpenseForm
        preSelectedComponent={preSelectedComponent}
        onCancel={onClose}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Modal>
  );
};
