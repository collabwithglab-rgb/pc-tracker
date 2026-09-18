import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { usePCStore } from '../../store';
import {
  MaintenanceEntry,
  MaintenanceEntryInput,
  MaintenanceType,
  MAINTENANCE_TYPE_LABELS,
} from '../../types';
import { getLocalDateISO } from '../../domain';
import { Wrench, Calendar, Tag, DollarSign, Sparkles, Cpu, Clock, FileText } from 'lucide-react';

interface MaintenanceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: MaintenanceEntry | null;
  initialValues?: Partial<MaintenanceEntryInput>;
}

const COMMON_THERMAL_PRODUCTS = [
  'Noctua NT-H2',
  'Noctua NT-H1',
  'Arctic MX-6',
  'Arctic MX-4',
  'Thermal Grizzly Kryonaut',
  'Thermal Grizzly Hydronaut',
  'Corsair TM30',
  'Alcool Isopropilico 99%',
];

export const MaintenanceEntryModal: React.FC<MaintenanceEntryModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  initialValues,
}) => {
  const { components, addMaintenanceEntry, updateMaintenanceEntry } = usePCStore();

  const [date, setDate] = useState<string>(getLocalDateISO());
  const [type, setType] = useState<MaintenanceType>('cleaning');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [cost, setCost] = useState<string>('');
  const [productUsed, setProductUsed] = useState<string>('');
  const [nextDueDate, setNextDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (entryToEdit) {
      setDate(entryToEdit.date);
      setType(entryToEdit.type);
      setTitle(entryToEdit.title);
      setDescription(entryToEdit.description || '');
      setSelectedComponentIds(entryToEdit.componentIds || []);
      setCost(entryToEdit.cost !== undefined ? String(entryToEdit.cost) : '');
      setProductUsed(entryToEdit.productUsed || '');
      setNextDueDate(entryToEdit.nextDueDate || '');
      setNotes(entryToEdit.notes || '');
    } else {
      setDate(initialValues?.date || getLocalDateISO());
      setType(initialValues?.type || 'cleaning');
      setTitle(initialValues?.title || '');
      setDescription(initialValues?.description || '');
      setSelectedComponentIds(initialValues?.componentIds || []);
      setCost(initialValues?.cost !== undefined ? String(initialValues?.cost) : '');
      setProductUsed(initialValues?.productUsed || '');
      setNextDueDate(initialValues?.nextDueDate || '');
      setNotes(initialValues?.notes || '');
    }
    setErrors({});
  }, [isOpen, entryToEdit, initialValues]);

  const toggleComponentSelection = (id: string) => {
    setSelectedComponentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Il titolo dell’intervento è obbligatorio.';
    }
    if (!date) {
      newErrors.date = 'La data è obbligatoria.';
    }
    const parsedCost = cost.trim() ? parseFloat(cost.replace(',', '.')) : undefined;
    if (cost.trim() && (isNaN(parsedCost!) || parsedCost! < 0)) {
      newErrors.cost = 'Inserisci un importo valido.';
    }
    if (nextDueDate.trim() && date && nextDueDate.trim() < date) {
      newErrors.nextDueDate = 'La data di prossima manutenzione non può essere antecedente alla data dell’intervento.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: MaintenanceEntryInput = {
        date,
        type,
        title: title.trim(),
        description: description.trim(),
        componentIds: selectedComponentIds.length > 0 ? selectedComponentIds : undefined,
        cost: parsedCost,
        productUsed: productUsed.trim() || undefined,
        nextDueDate: nextDueDate.trim() || undefined,
        notes: notes.trim() || undefined,
        source: initialValues?.source || (entryToEdit ? entryToEdit.source : 'manual'),
      };

      if (entryToEdit) {
        await updateMaintenanceEntry(entryToEdit.id, payload);
      } else {
        await addMaintenanceEntry(payload);
      }
      onClose();
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entryToEdit ? 'Modifica Intervento Manutenzione' : 'Registra Nuovo Intervento Manutenzione'}
      subtitle="Traccia interventi di pulizia, cambio pasta termica, serraggio e manutenzione Windows"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} className="form-layout" style={{ gap: '16px' }}>
        {errors.submit && (
          <div className="status-banner status-error" style={{ marginBottom: '8px' }}>
            {errors.submit}
          </div>
        )}

        {/* Riga 1: Data e Tipo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="maint-date">
              <Calendar size={14} style={{ marginRight: '6px' }} />
              Data Intervento *
            </label>
            <input
              id="maint-date"
              type="date"
              className={`input-field ${errors.date ? 'input-error' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="maint-type">
              <Tag size={14} style={{ marginRight: '6px' }} />
              Tipologia Intervento *
            </label>
            <select
              id="maint-type"
              className="input-field select-field"
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
            >
              {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map((t) => (
                <option key={t} value={t}>
                  {MAINTENANCE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Titolo */}
        <div className="form-group">
          <label className="form-label" htmlFor="maint-title">
            <Wrench size={14} style={{ marginRight: '6px' }} />
            Titolo Sintetico *
          </label>
          <input
            id="maint-title"
            type="text"
            className={`input-field ${errors.title ? 'input-error' : ''}`}
            placeholder="es. Sostituzione pasta termica CPU, Pulizia filtri case..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        {/* Componenti Coinvolti */}
        <div className="form-group">
          <label className="form-label">
            <Cpu size={14} style={{ marginRight: '6px' }} />
            Componenti Coinvolti (Opzionale)
          </label>
          <div
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '8px',
              background: 'var(--bg-input, #0f172a)',
              border: '1px solid var(--border-color, #1e293b)',
              borderRadius: '6px',
            }}
          >
            {components.map((c) => {
              const isSelected = selectedComponentIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleComponentSelection(c.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    borderRadius: '4px',
                    border: '1px solid',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    borderColor: isSelected ? 'var(--accent-primary, #38bdf8)' : 'var(--border-color, #334155)',
                    color: isSelected ? 'var(--accent-primary, #38bdf8)' : 'var(--text-secondary, #94a3b8)',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prodotto Usato (utile in particolare per paste termiche o detergenti) */}
        <div className="form-group">
          <label className="form-label" htmlFor="maint-product">
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Prodotto Utilizzato / Pasta Termica (Opzionale)
          </label>
          <input
            id="maint-product"
            type="text"
            list="thermal-products"
            className="input-field"
            placeholder="es. Noctua NT-H2, Arctic MX-4, Kryonaut..."
            value={productUsed}
            onChange={(e) => setProductUsed(e.target.value)}
          />
          <datalist id="thermal-products">
            {COMMON_THERMAL_PRODUCTS.map((prod) => (
              <option key={prod} value={prod} />
            ))}
          </datalist>
        </div>

        {/* Riga: Costo & Prossima Scadenza */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="maint-cost">
              <DollarSign size={14} style={{ marginRight: '6px' }} />
              Spesa Sostenuta (€ opzionale)
            </label>
            <input
              id="maint-cost"
              type="text"
              className={`input-field ${errors.cost ? 'input-error' : ''}`}
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            {errors.cost && <span className="error-text">{errors.cost}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="maint-next-date">
              <Clock size={14} style={{ marginRight: '6px' }} />
              Prossima Manutenzione (Opzionale)
            </label>
            <input
              id="maint-next-date"
              type="date"
              className={`input-field ${errors.nextDueDate ? 'input-error' : ''}`}
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
            {errors.nextDueDate && <span className="error-text">{errors.nextDueDate}</span>}
          </div>
        </div>

        {/* Descrizione & Note */}
        <div className="form-group">
          <label className="form-label" htmlFor="maint-desc">
            <FileText size={14} style={{ marginRight: '6px' }} />
            Dettagli & Note dell’Intervento
          </label>
          <textarea
            id="maint-desc"
            className="input-field textarea-field"
            rows={3}
            placeholder="Dettagli sulle temperature riscontrate, pulizia ventole, stato pasta precedente..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Azioni Modale */}
        <div className="modal-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : entryToEdit ? 'Aggiorna Intervento' : 'Salva nel Registro'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
