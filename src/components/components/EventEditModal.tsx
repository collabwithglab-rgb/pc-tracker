import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  ComponentEvent,
  EVENT_TYPE_LABELS,
  UNINSTALL_REASON_LABELS,
  UninstallEvent,
  PurchaseEvent,
  InstallEvent,
  SaleEvent,
  ExtraExpenseEvent,
  GiftEvent,
  DisposalEvent,
} from '../../types';
import { usePCStore } from '../../store';
import { Edit2, AlertCircle } from 'lucide-react';

interface EventEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ComponentEvent | null;
  componentName: string;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  onClose,
  event,
  componentName,
}) => {
  const { updateComponentEvent } = usePCStore();

  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campi specifici per tipo
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseStore, setPurchaseStore] = useState('');
  const [purchaseCondition, setPurchaseCondition] = useState<'new' | 'used'>('new');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');

  const [installSlot, setInstallSlot] = useState('');

  const [uninstallReason, setUninstallReason] = useState<NonNullable<UninstallEvent['reason']>>('upgrade');

  const [salePrice, setSalePrice] = useState('');
  const [salePlatform, setSalePlatform] = useState('');
  const [saleBuyer, setSaleBuyer] = useState('');
  const [saleShipping, setSaleShipping] = useState('');
  const [saleFees, setSaleFees] = useState('');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');

  const [giftRecipient, setGiftRecipient] = useState('');

  const [disposalMethod, setDisposalMethod] = useState<'recycled' | 'broken_discarded' | 'eco_center'>('recycled');

  useEffect(() => {
    if (!event) return;

    setDate(event.date || '');
    setNotes(event.notes || '');
    setError('');

    if (event.type === 'PURCHASE') {
      const pe = event as PurchaseEvent;
      setPurchasePrice(pe.price !== undefined ? pe.price.toString() : '');
      setPurchaseStore(pe.store || '');
      setPurchaseCondition(pe.condition || 'new');
      setPurchaseOrderNumber(pe.orderNumber || '');
    } else if (event.type === 'INSTALL') {
      const ie = event as InstallEvent;
      setInstallSlot(ie.slotOrLocation || '');
    } else if (event.type === 'UNINSTALL') {
      const ue = event as UninstallEvent;
      setUninstallReason(ue.reason || 'upgrade');
    } else if (event.type === 'SALE') {
      const se = event as SaleEvent;
      setSalePrice(se.price !== undefined ? se.price.toString() : '');
      setSalePlatform(se.platform || '');
      setSaleBuyer(se.buyer || '');
      setSaleShipping(se.shippingCost !== undefined ? se.shippingCost.toString() : '');
      setSaleFees(se.fees !== undefined ? se.fees.toString() : '');
    } else if (event.type === 'EXTRA_EXPENSE') {
      const ee = event as ExtraExpenseEvent;
      setExpenseAmount(ee.amount !== undefined ? ee.amount.toString() : '');
      setExpenseDescription(ee.description || '');
    } else if (event.type === 'GIFT') {
      const ge = event as GiftEvent;
      setGiftRecipient(ge.recipient || '');
    } else if (event.type === 'DISPOSAL') {
      const de = event as DisposalEvent;
      setDisposalMethod(de.disposalMethod || 'recycled');
    }
  }, [event, isOpen]);

  if (!event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date || date.trim().length === 0) {
      setError('La data dell’evento è obbligatoria.');
      return;
    }

    let updated: ComponentEvent;

    switch (event.type) {
      case 'PURCHASE': {
        const priceNum = parseFloat(purchasePrice);
        if (isNaN(priceNum) || priceNum < 0) {
          setError('Inserisci un prezzo di acquisto valido e non negativo.');
          return;
        }
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          price: priceNum,
          store: purchaseStore.trim() || undefined,
          condition: purchaseCondition,
          orderNumber: purchaseOrderNumber.trim() || undefined,
        };
        break;
      }
      case 'INSTALL': {
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          slotOrLocation: installSlot.trim() || undefined,
        };
        break;
      }
      case 'UNINSTALL': {
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          reason: uninstallReason,
        };
        break;
      }
      case 'SALE': {
        const priceNum = parseFloat(salePrice);
        if (isNaN(priceNum) || priceNum < 0) {
          setError('Inserisci un prezzo lordo di vendita valido.');
          return;
        }
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          price: priceNum,
          platform: salePlatform.trim() || undefined,
          buyer: saleBuyer.trim() || undefined,
          shippingCost: saleShipping ? parseFloat(saleShipping) : undefined,
          fees: saleFees ? parseFloat(saleFees) : undefined,
        };
        break;
      }
      case 'EXTRA_EXPENSE': {
        const amountNum = parseFloat(expenseAmount);
        if (isNaN(amountNum) || amountNum < 0) {
          setError('Inserisci un importo valido per la spesa accessoria.');
          return;
        }
        if (!expenseDescription.trim()) {
          setError('La descrizione della spesa è obbligatoria.');
          return;
        }
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          amount: amountNum,
          description: expenseDescription.trim(),
        };
        break;
      }
      case 'GIFT': {
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          recipient: giftRecipient.trim() || undefined,
        };
        break;
      }
      case 'DISPOSAL': {
        updated = {
          ...event,
          date,
          notes: notes.trim() || undefined,
          disposalMethod,
        };
        break;
      }
      default:
        return;
    }

    try {
      setIsSubmitting(true);
      await updateComponentEvent(updated);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = EVENT_TYPE_LABELS[event.type] || event.type;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modifica Evento: ${typeLabel}`}
      subtitle={`Componente: ${componentName}`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div className="form-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="edit-event-date">
            Data Evento *
          </label>
          <input
            id="edit-event-date"
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Campi specifici per PURCHASE */}
        {event.type === 'PURCHASE' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-purchase-price">
                  Prezzo (€) *
                </label>
                <input
                  id="edit-purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-purchase-condition">
                  Condizione
                </label>
                <select
                  id="edit-purchase-condition"
                  className="form-select"
                  value={purchaseCondition}
                  onChange={(e) => setPurchaseCondition(e.target.value as 'new' | 'used')}
                >
                  <option value="new">Nuovo</option>
                  <option value="used">Usato</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-purchase-store">
                  Negozio / Venditore
                </label>
                <input
                  id="edit-purchase-store"
                  type="text"
                  className="form-input"
                  value={purchaseStore}
                  onChange={(e) => setPurchaseStore(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-purchase-order">
                  Numero Ordine
                </label>
                <input
                  id="edit-purchase-order"
                  type="text"
                  className="form-input"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Campi specifici per INSTALL */}
        {event.type === 'INSTALL' && (
          <div className="form-group">
            <label className="form-label" htmlFor="edit-install-slot">
              Slot o Posizione nel PC
            </label>
            <input
              id="edit-install-slot"
              type="text"
              className="form-input"
              value={installSlot}
              onChange={(e) => setInstallSlot(e.target.value)}
              placeholder="es. PCIe 1, Slot M.2 1, Case Front"
            />
          </div>
        )}

        {/* Campi specifici per UNINSTALL */}
        {event.type === 'UNINSTALL' && (
          <div className="form-group">
            <label className="form-label" htmlFor="edit-uninstall-reason">
              Motivo della Rimozione
            </label>
            <select
              id="edit-uninstall-reason"
              className="form-select"
              value={uninstallReason}
              onChange={(e) => setUninstallReason(e.target.value as NonNullable<UninstallEvent['reason']>)}
            >
              {Object.entries(UNINSTALL_REASON_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Campi specifici per SALE */}
        {event.type === 'SALE' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-sale-price">
                  Prezzo Vendita Lordo (€) *
                </label>
                <input
                  id="edit-sale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-sale-platform">
                  Piattaforma
                </label>
                <input
                  id="edit-sale-platform"
                  type="text"
                  className="form-input"
                  value={salePlatform}
                  onChange={(e) => setSalePlatform(e.target.value)}
                  placeholder="es. Subito, eBay, Privato"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-sale-shipping">
                  Spedizione a carico tuo (€)
                </label>
                <input
                  id="edit-sale-shipping"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={saleShipping}
                  onChange={(e) => setSaleShipping(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-sale-fees">
                  Commissioni (€)
                </label>
                <input
                  id="edit-sale-fees"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={saleFees}
                  onChange={(e) => setSaleFees(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Campi specifici per EXTRA_EXPENSE */}
        {event.type === 'EXTRA_EXPENSE' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-expense-amount">
                Importo Spesa (€) *
              </label>
              <input
                id="edit-expense-amount"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-expense-desc">
                Descrizione *
              </label>
              <input
                id="edit-expense-desc"
                type="text"
                className="form-input"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="es. Cavi custom, Pad termici"
                required
              />
            </div>
          </>
        )}

        {/* Campi specifici per GIFT */}
        {event.type === 'GIFT' && (
          <div className="form-group">
            <label className="form-label" htmlFor="edit-gift-recipient">
              Destinatario del Regalo
            </label>
            <input
              id="edit-gift-recipient"
              type="text"
              className="form-input"
              value={giftRecipient}
              onChange={(e) => setGiftRecipient(e.target.value)}
              placeholder="Nome persona o ente"
            />
          </div>
        )}

        {/* Campi specifici per DISPOSAL */}
        {event.type === 'DISPOSAL' && (
          <div className="form-group">
            <label className="form-label" htmlFor="edit-disposal-method">
              Metodo di Smaltimento
            </label>
            <select
              id="edit-disposal-method"
              className="form-select"
              value={disposalMethod}
              onChange={(e) =>
                setDisposalMethod(e.target.value as 'recycled' | 'broken_discarded' | 'eco_center')
              }
            >
              <option value="recycled">Riciclato / RAEE</option>
              <option value="eco_center">Isola Ecologica</option>
              <option value="broken_discarded">Rotto / Dismesso</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="edit-event-notes">
            Note Aggiuntive
          </label>
          <textarea
            id="edit-event-notes"
            className="form-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuali annotazioni su questo evento..."
          />
        </div>

        <div className="form-actions" style={{ marginTop: '8px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Edit2 size={15} />
            <span>{isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
