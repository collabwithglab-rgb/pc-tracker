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
    if (!name.trim()) newErrors.name = 'Il nome del componente è obbligatorio.';
    if (!category) newErrors.category = 'Seleziona una categoria valida.';

    if (!isEditing && recordPurchase) {
      if (price === '' || isNaN(Number(price))) {
        newErrors.price = 'Inserisci un prezzo valido (o 0 se regalo).';
      } else if (Number(price) < 0) {
        newErrors.price = 'Il prezzo non può essere negativo.';
      }
      if (!purchaseDate) {
        newErrors.purchaseDate = 'La data di acquisto è obbligatoria.';
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
      setErrors({ form: err instanceof Error ? err.message : 'Errore sconosciuto durante il salvataggio' });
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
          Nome Componente <span className="form-required">*</span>
        </label>
        <input
          type="text"
          placeholder="es. GeForce RTX 4080 Super Gaming OC"
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
            Categoria <span className="form-required">*</span>
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
          <label className="form-label">Brand / Produttore</label>
          <input
            type="text"
            placeholder="es. ASUS, Corsair, AMD"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Rigo 3: Modello e Seriale */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">Modello Specifico</label>
          <input
            type="text"
            placeholder="es. TUF-RTX4080S-O16G"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Numero Seriale (S/N)</label>
          <input
            type="text"
            placeholder="es. SN1234567890"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Rigo 4: Note */}
      <div className="form-group">
        <label className="form-label">Note</label>
        <textarea
          rows={2}
          placeholder="es. Acquistato bundle con scheda madre, versione con pasta pre-applicata..."
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
                Registra Evento di Acquisto Iniziale
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Inserisci subito data e prezzo per alimentare i calcoli storici
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="checkbox"
                checked={recordPurchase}
                onChange={(e) => setRecordPurchase(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Abilita</span>
            </label>
          </div>

          {recordPurchase && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Prezzo (€) <span className="form-required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="es. 499.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`form-input font-mono ${errors.price ? 'form-input-error' : ''}`}
                  />
                  {errors.price && <span className="form-error-text">{errors.price}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Data Acquisto <span className="form-required">*</span>
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
                  <label className="form-label">Negozio</label>
                  <input
                    type="text"
                    placeholder="es. Amazon, Caseking, Privato"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Condizione</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as 'new' | 'used')}
                    className="form-select"
                  >
                    <option value="new">Nuovo</option>
                    <option value="used">Usato</option>
                  </select>
                </div>
              </div>

              {/* Scadenza Garanzia con Preset Rapidi */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: 0 }}>
                    <ShieldCheck size={14} color="var(--accent-primary)" />
                    <span>Scadenza Garanzia (RMA)</span>
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
                        title={`Calcola scadenza a +${p.months / 12} anni da data acquisto`}
                      >
                        +{p.months / 12} anni
                      </button>
                    ))}
                    {warrantyExpiryDate && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '1px 6px', fontSize: '11px', height: '22px', color: 'var(--text-muted)' }}
                        onClick={() => setWarrantyExpiryDate('')}
                        title="Rimuovi data scadenza"
                      >
                        Azzera
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
                  <span>Ricevuta / Fattura d'Acquisto (Opzionale)</span>
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
                          alert('Il file selezionato supera il limite di 10MB.');
                          return;
                        }
                        if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as any)) {
                          alert('Formato non supportato. Usa PDF, PNG, JPG o WebP.');
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
                      <span>Allega PDF o immagine (max 10MB)</span>
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
                      title="Rimuovi allegato"
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
            Indietro
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isEditing ? <Check size={16} /> : <Plus size={16} />}
          <span>{isSubmitting ? 'Salvataggio...' : isEditing ? 'Aggiorna Anagrafica' : 'Salva Componente'}</span>
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
  const isEditing = Boolean(componentToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={onBack}
      title={isEditing ? 'Modifica Componente' : 'Nuovo Componente'}
      subtitle={isEditing ? 'Aggiorna i dettagli anagrafici del pezzo' : 'Aggiungi un nuovo pezzo all\'inventario'}
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
