import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Component, COMPONENT_STATUS_LABELS, COMPONENT_CATEGORY_LABELS } from '../../types';
import { usePCStore } from '../../store';
import { useI18n } from '../../locales';
import { Gift, AlertCircle, Info } from 'lucide-react';

export interface GiftFormProps {
  preSelectedComponent?: Component | null;
  onCancel: () => void;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const GiftForm: React.FC<GiftFormProps> = ({
  preSelectedComponent,
  onCancel,
  onSuccess,
  onBack,
}) => {
  const { getNonTerminalComponents, getComponentComputed, recordGift } = usePCStore();
  const { t } = useI18n();

  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState<string>('');
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
    setRecipient('');
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
      setError(t('modal_gift_err_no_comp'));
      return;
    }

    if (!date) {
      setError(t('modal_gift_err_no_date'));
      return;
    }

    try {
      setIsSubmitting(true);
      await recordGift(selectedComponentId, {
        date,
        recipient: recipient.trim() || undefined,
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
          {t('modal_gift_comp_label')} <span className="form-required">*</span>
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
                color: 'var(--accent-indigo)',
                backgroundColor: 'var(--accent-indigo-subtle)',
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
            {t('modal_gift_empty_warning')}
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
            backgroundColor: 'rgba(129, 140, 248, 0.08)',
            border: '1px solid var(--accent-indigo-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-indigo)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            {t('modal_gift_in_use_warning')}
          </span>
        </div>
      )}

      {/* Rigo Data e Destinatario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">
            {t('modal_gift_date_label')} <span className="form-required">*</span>
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
          <label className="form-label">{t('modal_gift_recipient_label')}</label>
          <input
            type="text"
            placeholder={t('modal_gift_recipient_placeholder')}
            className="form-input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Note */}
      <div className="form-group">
        <label className="form-label">{t('modal_gift_notes_label')}</label>
        <textarea
          rows={2}
          placeholder={t('modal_gift_notes_placeholder')}
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
            {t('action_back')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('modal_gift_btn_cancel')}
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            backgroundColor: 'var(--accent-indigo)',
            borderColor: 'var(--accent-indigo)',
            color: 'var(--text-primary)',
          }}
          disabled={isSubmitting || !selectedComponentId}
        >
          <Gift size={15} />
          <span>{isSubmitting ? t('modal_gift_btn_submitting') : t('modal_gift_btn_submit')}</span>
        </button>
      </div>
    </form>
  );
};

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedComponent?: Component | null;
  onSuccess?: (componentId: string) => void;
  onBack?: () => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  preSelectedComponent,
  onSuccess,
  onBack,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      title={t('modal_gift_title')}
      maxWidth="540px"
    >
      <GiftForm
        preSelectedComponent={preSelectedComponent}
        onCancel={onClose}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Modal>
  );
};
