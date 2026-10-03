import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Component,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from '../../types';
import { VALID_CATEGORIES } from '../../domain/validators';
import { WARRANTY_PRESETS, calculateExpiryDateFromPreset } from '../../domain/warrantyEngine';
import { usePCStore, InitialPurchaseInput } from '../../store';
import { useI18n } from '../../locales';
import { AlertCircle, Plus, Check, ShieldCheck, Upload, FileText, X } from 'lucide-react';

export interface ComponentFormProps {
  componentToEdit?: Component | null;
  onCancel: () => void;
  onSuccess?: (component: Component) => void;
  onBack?: () => void;
}

export const ComponentForm: React.FC<ComponentFormProps> = ({
  componentToEdit,
  onCancel,
  onSuccess,
  onBack,
}) => {
  const { createComponentWithOptionalPurchase, updateComponent } = usePCStore();
  const { t } = useI18n();
  const isEditing = Boolean(componentToEdit);

  // Campi Anagrafici
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('gpu');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Campi Acquisto Iniziale
  const [recordPurchase, setRecordPurchase] = useState(true);
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [store, setStore] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [receiptFile, setReceiptFile] = useState<{
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
  } | null>(null);

  // Stato validazione locale & submit
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (componentToEdit) {
      setName(componentToEdit.name);
      setBrand(componentToEdit.brand);
      setModel(componentToEdit.model);
      setCategory(componentToEdit.category);
      setSerialNumber(componentToEdit.serialNumber || '');
      setNotes(componentToEdit.notes || '');
      setRecordPurchase(false);
      setWarrantyExpiryDate('');
      setReceiptFile(null);
    } else {
      setName('');
      setBrand('');
      setModel('');
      setCategory('gpu');
      setSerialNumber('');
      setNotes('');
      setRecordPurchase(true);
      setPrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setStore('');
      setCondition('new');
      setWarrantyExpiryDate('');
      setReceiptFile(null);
    }
    setErrors({});
  }, [componentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('modal_comp_err_name_req');
    if (!category) newErrors.category = t('modal_comp_err_cat_req');

    if (!isEditing && recordPurchase) {
      if (price === '' || isNaN(Number(price))) {
        newErrors.price = t('modal_comp_err_price_invalid');
      } else if (Number(price) < 0) {
        newErrors.price = t('modal_comp_err_price_neg');
      }
      if (!purchaseDate) {
        newErrors.purchaseDate = t('modal_comp_err_date_req');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && componentToEdit) {
        await updateComponent(componentToEdit.id, {
          name: name.trim(),
          brand: brand.trim(),
          model: model.trim(),
          category,
          serialNumber: serialNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        onCancel();
      } else {
        const purchaseInput: InitialPurchaseInput | undefined = recordPurchase
          ? {
              price: Number(price),
              date: purchaseDate,
              store: store.trim() || undefined,
              condition,
              warrantyExpiryDate: warrantyExpiryDate.trim() || undefined,
              initialReceipt: receiptFile || undefined,
            }
          : undefined;

        const created = await createComponentWithOptionalPurchase(
          {
            name: name.trim(),
            brand: brand.trim(),
            model: model.trim(),
            category,
            serialNumber: serialNumber.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          purchaseInput
        );

        onSuccess?.(created);
        onCancel();
      }
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : t('component_form_save_unknown_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {errors.form && (
        <div className="form-error-banner animate-fade-in">
          <AlertCircle size={16} />
          <span>{errors.form}</span>
        </div>
      )}

      {/* Rigo 1: Nome Componente */}
      <div className="form-group">
        <label className="form-label">
          {t('modal_comp_name_label')} <span className="form-required">*</span>
        </label>
        <input
          type="text"
          placeholder={t('modal_comp_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`form-input ${errors.name ? 'form-input-error' : ''}`}
          autoFocus
        />
        {errors.name && <span className="form-error-text">{errors.name}</span>}
      </div>

      {/* Rigo 2: Categoria e Brand */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">
            {t('modal_comp_category_label')} <span className="form-required">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
            className={`form-select ${errors.category ? 'form-input-error' : ''}`}
          >
            {VALID_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {COMPONENT_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          {errors.category && <span className="form-error-text">{errors.category}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">{t('modal_comp_brand_label')}</label>
          <input
            type="text"
            placeholder={t('modal_comp_brand_placeholder')}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Rigo 3: Modello e Seriale */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">{t('modal_comp_model_label')}</label>
          <input
            type="text"
            placeholder={t('modal_comp_model_placeholder')}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('modal_comp_serial_label')}</label>
          <input
            type="text"
            placeholder={t('modal_comp_serial_placeholder')}
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Rigo 4: Note */}
      <div className="form-group">
        <label className="form-label">{t('modal_comp_notes_label')}</label>
        <textarea
          rows={2}
          placeholder={t('modal_comp_notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="form-textarea"
        />
      </div>

      {/* Blocco Acquisto Iniziale (solo creazione) */}
      {!isEditing && (
        <div
          style={{
            marginTop: '4px',
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: recordPurchase ? '12px' : '0' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('modal_comp_purchase_section_title')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {t('modal_comp_purchase_section_desc')}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="checkbox"
                checked={recordPurchase}
                onChange={(e) => setRecordPurchase(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{t('modal_comp_purchase_enable')}</span>
            </label>
          </div>

          {recordPurchase && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">
                    {t('modal_comp_price_label')} <span className="form-required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t('modal_comp_price_placeholder')}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`form-input font-mono ${errors.price ? 'form-input-error' : ''}`}
                  />
                  {errors.price && <span className="form-error-text">{errors.price}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('modal_comp_date_label')} <span className="form-required">*</span>
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={`form-input ${errors.purchaseDate ? 'form-input-error' : ''}`}
                  />
                  {errors.purchaseDate && <span className="form-error-text">{errors.purchaseDate}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">{t('modal_comp_store_label')}</label>
                  <input
                    type="text"
                    placeholder={t('modal_comp_store_placeholder')}
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('modal_comp_condition_label')}</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as 'new' | 'used')}
                    className="form-select"
                  >
                    <option value="new">{t('modal_comp_condition_new')}</option>
                    <option value="used">{t('modal_comp_condition_used')}</option>
                  </select>
                </div>
              </div>

              {/* Scadenza Garanzia con Preset Rapidi */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: 0 }}>
                    <ShieldCheck size={14} color="var(--accent-primary)" />
                    <span>{t('modal_comp_warranty_label')}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {WARRANTY_PRESETS.slice(0, 3).map((p) => (
                      <button
                        key={p.months}
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '1px 6px', fontSize: '11px', height: '22px' }}
                        onClick={() => {
                          const exp = calculateExpiryDateFromPreset(purchaseDate, p.months);
                          setWarrantyExpiryDate(exp);
                        }}
                        title={t('modal_comp_warranty_preset_title', { years: p.months / 12 })}
                      >
                        {t('modal_comp_warranty_preset_years', { years: p.months / 12 })}
                      </button>
                    ))}
                    {warrantyExpiryDate && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '1px 6px', fontSize: '11px', height: '22px', color: 'var(--text-muted)' }}
                        onClick={() => setWarrantyExpiryDate('')}
                        title={t('modal_comp_warranty_clear_title')}
                      >
                        {t('modal_comp_warranty_clear')}
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="date"
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Allegato Ricevuta / Fattura */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={14} color="var(--accent-primary)" />
                  <span>{t('modal_comp_receipt_label')}</span>
                </label>
                {!receiptFile ? (
                  <div
                    style={{
                      border: '1px dashed var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('comp-form-receipt-upload')?.click()}
                  >
                    <input
                      id="comp-form-receipt-upload"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
                          alert(t('modal_comp_receipt_err_size'));
                          return;
                        }
                        if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as any)) {
                          alert(t('modal_comp_receipt_err_format'));
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setReceiptFile({
                              fileName: file.name,
                              fileType: file.type,
                              fileSize: file.size,
                              dataUrl: reader.result,
                            });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Upload size={13} color="var(--accent-primary)" />
                      <span>{t('modal_comp_receipt_upload_prompt')}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-primary-border)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <FileText size={14} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {receiptFile.fileName}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        ({(receiptFile.fileSize / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', height: '22px', color: 'var(--accent-ruby)' }}
                      onClick={() => setReceiptFile(null)}
                      title={t('modal_comp_receipt_remove_title')}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Azioni */}
      <div className="form-actions" style={{ marginTop: '6px', paddingTop: '10px' }}>
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
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          {t('action_cancel')}
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isEditing ? <Check size={16} /> : <Plus size={16} />}
          <span>{isSubmitting ? t('modal_comp_btn_submitting') : isEditing ? t('modal_comp_btn_submit_edit') : t('modal_comp_btn_submit_create')}</span>
        </button>
      </div>
    </form>
  );
};

export interface ComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentToEdit?: Component | null;
  onSuccess?: (component: Component) => void;
  onBack?: () => void;
}

export const ComponentFormModal: React.FC<ComponentFormModalProps> = ({
  isOpen,
  onClose,
  componentToEdit,
  onSuccess,
  onBack,
}) => {
  const { t } = useI18n();
  const isEditing = Boolean(componentToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      title={isEditing ? t('modal_comp_title_edit') : t('modal_comp_title_new')}
      subtitle={isEditing ? t('modal_comp_subtitle_edit') : t('modal_comp_subtitle_new')}
      maxWidth="600px"
    >
      <ComponentForm
        componentToEdit={componentToEdit}
        onCancel={onClose}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Modal>
  );
};
