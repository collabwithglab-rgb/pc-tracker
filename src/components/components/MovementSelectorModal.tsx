import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  ShoppingBag,
  DollarSign,
  Receipt,
  Gift,
  Recycle,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { Component } from '../../types';
import { ComponentForm } from './ComponentFormModal';
import { SaleForm } from './SaleModal';
import { ExtraExpenseForm } from './ExtraExpenseModal';
import { GiftForm } from './GiftModal';
import { DisposalForm } from './DisposalModal';

export type MovementType = 'purchase' | 'sale' | 'expense' | 'gift' | 'disposal' | 'upgrade';

interface MovementOption {
  id: MovementType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export interface MovementSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption?: (option: MovementType) => void;
  onSuccessPurchase?: (created: Component) => void;
  onSelectUpgrade?: () => void;
  onOpenWikiGuide?: (articleId: string) => void;
  onNavigateToCare?: () => void;
}

export const MovementSelectorModal: React.FC<MovementSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
  onSuccessPurchase,
  onSelectUpgrade,
  onOpenWikiGuide,
  onNavigateToCare,
}) => {
  const [activeType, setActiveType] = useState<MovementType | null>(null);

  // Reset dello stato interno alla chiusura o riapertura del modale
  useEffect(() => {
    if (!isOpen) {
      setActiveType(null);
    }
  }, [isOpen]);

  const acquisitionOptions: MovementOption[] = [
    {
      id: 'purchase',
      title: 'Nuovo Acquisto / Componente',
      description: 'Aggiungi un nuovo pezzo all’inventario con acquisto e montaggio opzionale',
      icon: <ShoppingBag size={20} />,
      iconBg: 'var(--accent-primary-subtle)',
      iconColor: 'var(--accent-primary)',
    },
    {
      id: 'upgrade',
      title: 'Cambio Generazionale / Upgrade',
      description: 'Sostituzione guidata di un pezzo con nuovo modello ed eventuale permuta',
      icon: <ArrowUpRight size={20} />,
      iconBg: 'var(--accent-primary-subtle)',
      iconColor: 'var(--accent-primary)',
    },
  ];

  const managementOptions: MovementOption[] = [
    {
      id: 'sale',
      title: 'Registra Vendita',
      description: 'Registra la vendita di un pezzo, commissioni, spedizione e incasso netto',
      icon: <DollarSign size={20} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: 'var(--accent-emerald)',
    },
    {
      id: 'expense',
      title: 'Spesa Extra / Modding',
      description: 'Accessori, cavi sleevati, pasta termica o modding associati a un pezzo',
      icon: <Receipt size={20} />,
      iconBg: 'rgba(244, 63, 94, 0.12)',
      iconColor: 'var(--accent-ruby)',
    },
    {
      id: 'gift',
      title: 'Regala Componente',
      description: 'Cedi a titolo gratuito un componente a terzi aggiornando il suo ciclo di vita',
      icon: <Gift size={20} />,
      iconBg: 'rgba(129, 140, 248, 0.12)',
      iconColor: 'var(--accent-indigo)',
    },
    {
      id: 'disposal',
      title: 'Smaltisci Hardware',
      description: 'Dismetti un pezzo guasto o conferiscilo all’isola ecologica o centro RAEE',
      icon: <Recycle size={20} />,
      iconBg: 'rgba(100, 116, 139, 0.14)',
      iconColor: 'var(--text-muted)',
    },
  ];

  const handleSelect = (id: MovementType) => {
    if (id === 'upgrade') {
      if (onSelectUpgrade) {
        onSelectUpgrade();
      } else {
        onSelectOption?.(id);
      }
      return;
    }
    setActiveType(id);
  };

  const handleBackToSelector = () => {
    setActiveType(null);
  };

  // Titoli e sottotitoli contestuali
  const getModalMeta = () => {
    switch (activeType) {
      case 'purchase':
        return {
          title: 'Nuovo Acquisto / Componente',
          subtitle: 'Aggiungi un nuovo pezzo all’inventario del tuo hardware',
          maxWidth: '620px',
        };
      case 'sale':
        return {
          title: 'Registra Vendita Hardware',
          subtitle: 'Registra la vendita di un pezzo e calcola l’incasso netto reale',
          maxWidth: '600px',
        };
      case 'expense':
        return {
          title: 'Registra Spesa Extra / Modding',
          subtitle: 'Associa una spesa accessoria a un componente esistente',
          maxWidth: '560px',
        };
      case 'gift':
        return {
          title: 'Regala Componente',
          subtitle: 'Cessione a titolo gratuito e aggiornamento del ciclo di vita',
          maxWidth: '540px',
        };
      case 'disposal':
        return {
          title: 'Registra Smaltimento Hardware',
          subtitle: 'Conferimento centro RAEE o dismissione definitiva di un pezzo guasto',
          maxWidth: '540px',
        };
      default:
        return {
          title: 'Nuovo Movimento Hardware',
          subtitle: 'Seleziona l’operazione economica o di inventario che desideri registrare',
          maxWidth: '620px',
        };
    }
  };

  const meta = getModalMeta();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={activeType ? handleBackToSelector : undefined}
      backTitle="Torna al selettore movimenti"
      title={meta.title}
      subtitle={meta.subtitle}
      maxWidth={meta.maxWidth}
    >
      {activeType === null && (
        <div className="movement-flow-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="movement-group-label">Acquisto & Upgrade</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {acquisitionOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className="movement-option-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: opt.iconBg,
                      color: opt.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {opt.title}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {opt.description}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>

          <div className="movement-group-label" style={{ marginTop: '10px' }}>Gestione & Dismissione</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {managementOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className="movement-option-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: opt.iconBg,
                      color: opt.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {opt.title}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {opt.description}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {onOpenWikiGuide && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Dubbi su quale movimento registrare?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWikiGuide('component-states-explained');
                }}
                className="micro-press"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                <BookOpen size={13} />
                <span>Guida Movimenti & Ciclo di Vita</span>
              </button>
            </div>
          )}

          {onNavigateToCare && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={14} color="var(--accent-cyan)" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Vuoi registrare una pulizia, cambio pasta o profilo di tuning?
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToCare();
                }}
                className="micro-press"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Cura del PC</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {activeType === 'purchase' && (
        <div className="movement-flow-content">
          <ComponentForm
            onCancel={onClose}
            onSuccess={(comp) => {
              onClose();
              onSuccessPurchase?.(comp);
            }}
            onBack={handleBackToSelector}
          />
        </div>
      )}

      {activeType === 'sale' && (
        <div className="movement-flow-content">
          <SaleForm
            onCancel={onClose}
            onSuccess={() => onClose()}
            onBack={handleBackToSelector}
          />
        </div>
      )}

      {activeType === 'expense' && (
        <div className="movement-flow-content">
          <ExtraExpenseForm
            onCancel={onClose}
            onSuccess={() => onClose()}
            onBack={handleBackToSelector}
          />
        </div>
      )}

      {activeType === 'gift' && (
        <div className="movement-flow-content">
          <GiftForm
            onCancel={onClose}
            onSuccess={() => onClose()}
            onBack={handleBackToSelector}
          />
        </div>
      )}

      {activeType === 'disposal' && (
        <div className="movement-flow-content">
          <DisposalForm
            onCancel={onClose}
            onSuccess={() => onClose()}
            onBack={handleBackToSelector}
          />
        </div>
      )}
    </Modal>
  );
};
