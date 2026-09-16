import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, COMPONENT_STATUS_LABELS, COMPONENT_CATEGORY_LABELS } from '../../types';
import { usePCStore } from '../../store';
import { DollarSign, AlertCircle, Info, TrendingUp } from 'lucide-react';

export interface SaleFormProps {
  preSelectedComponent?: Component | null;
  onCancel: () => void;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  preSelectedComponent,
  onCancel,
  onSuccess,
  onBack,
}) => {
  const { getSellableComponents, getComponentComputed, recordSale } = usePCStore();

  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [buyer, setBuyer] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<string>('');
  const [fees, setFees] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sellableComponents = getSellableComponents();

  useEffect(() => {
    if (preSelectedComponent) {
      setSelectedComponentId(preSelectedComponent.id);
    } else if (sellableComponents.length > 0) {
      setSelectedComponentId(sellableComponents[0].id);
    } else {
      setSelectedComponentId('');
    }
    setDate(new Date().toISOString().split('T')[0]);
    setPrice('');
    setPlatform('');
    setBuyer('');
    setShippingCost('');
    setFees('');
    setNotes('');
    setError('');
  }, [preSelectedComponent]);

  const numPrice = parseFloat(price) || 0;
  const numShipping = parseFloat(shippingCost) || 0;
  const numFees = parseFloat(fees) || 0;
  const netRecovered = Math.max(0, numPrice - numShipping - numFees);

  const selectedComp = preSelectedComponent || sellableComponents.find((c) => c.id === selectedComponentId);
  const compComputed = selectedComp ? getComponentComputed(selectedComp.id) : undefined;
  const isCurrentlyInUse = compComputed?.status === 'IN_USE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedComponentId) {
      setError('Seleziona un componente da vendere.');
      return;
    }

    if (!date) {
      setError('La data di vendita è obbligatoria.');
      return;
    }

    if (price.trim() === '' || isNaN(numPrice) || numPrice < 0) {
      setError('Inserisci un prezzo di vendita valido (non negativo).');
      return;
    }

    if (shippingCost.trim() !== '' && (isNaN(numShipping) || numShipping < 0)) {
      setError('Le spese di spedizione non possono essere negative.');
      return;
    }

    if (fees.trim() !== '' && (isNaN(numFees) || numFees < 0)) {
      setError('Le commissioni non possono essere negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordSale(selectedComponentId, {
        date,
        price: numPrice,
        platform: platform.trim() || undefined,
        buyer: buyer.trim() || undefined,
        shippingCost: shippingCost.trim() !== '' ? numShipping : undefined,
        fees: fees.trim() !== '' ? numFees : undefined,
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
          Componente Venduto <span className="form-required">*</span>
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
                color: 'var(--accent-emerald)',
                backgroundColor: 'var(--accent-emerald-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600,
              }}
            >
              {COMPONENT_CATEGORY_LABELS[preSelectedComponent.category]}
            </span>
          </div>
        ) : sellableComponents.length === 0 ? (
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
            Nessun componente vendibile disponibile nell'archivio (tutti risultano già dismessi o venduti).
          </div>
        ) : (
          <select
            className="form-select"
            value={selectedComponentId}
            onChange={(e) => setSelectedComponentId(e.target.value)}
            disabled={isSubmitting}
          >
            {sellableComponents.map((c) => {
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
            backgroundColor: 'var(--accent-primary-subtle)',
            border: '1px solid var(--accent-primary-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-primary)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            Questo pezzo è montato nel PC. Confermando la vendita verrà automaticamente registrato lo smontaggio dal rig.
          </span>
        </div>
      )}

      {/* Rigo 1: Data e Prezzo Lordo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">
            Data Vendita <span className="form-required">*</span>
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
            Prezzo Venduto (€) <span className="form-required">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="es. 350.00"
            className="form-input font-mono"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {/* Rigo 2: Spese di Spedizione e Commissioni */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">
            Spedizione a tuo carico (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="es. 10.00 (opzionale)"
            className="form-input font-mono"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Commissioni trattenute (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="es. 15.50 (PayPal / eBay)"
            className="form-input font-mono"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Pannello Calcolo Incasso Netto Reale */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--accent-emerald-subtle)',
          border: '1px solid var(--accent-emerald-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Incasso Netto Effettivo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Prezzo lordo − spese − commissioni
            </div>
          </div>
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--accent-emerald)',
          }}
        >
          € {netRecovered.toFixed(2)}
        </div>
      </div>

      {/* Rigo 3: Piattaforma e Acquirente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Piattaforma / Canale</label>
          <input
            type="text"
            placeholder="es. Subito.it, eBay, Forum, A mano"
            className="form-input"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Acquirente</label>
          <input
            type="text"
            placeholder="es. Marco R., Nickname"
            className="form-input"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Note opzionali */}
      <div className="form-group">
        <label className="form-label">Note sulla vendita</label>
        <textarea
          rows={2}
          placeholder="Dettagli aggiuntivi, tracking spedizione, condizioni al momento della vendita..."
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
            backgroundColor: 'var(--accent-emerald)',
            borderColor: 'var(--accent-emerald)',
            color: 'var(--text-primary)',
          }}
          disabled={isSubmitting || !selectedComponentId}
        >
          <DollarSign size={15} />
          <span>{isSubmitting ? 'Registrazione...' : 'Conferma Vendita'}</span>
        </button>
      </div>
    </form>
  );
};

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedComponent?: Component | null;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({
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
      title="Registra Vendita Hardware"
      maxWidth="600px"
    >
      <SaleForm
        preSelectedComponent={preSelectedComponent}
        onCancel={onClose}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Modal>
  );
};
