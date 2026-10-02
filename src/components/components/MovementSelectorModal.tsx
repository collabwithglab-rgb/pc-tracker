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
import { useTranslation } from '../../locales';

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
  const { t } = useTranslation();
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
      title: t('movement_opt_purchase_title'),
      description: t('movement_opt_purchase_desc'),
      icon: <ShoppingBag size={20} />,
      iconBg: 'var(--accent-primary-subtle)',
      iconColor: 'var(--accent-primary)',
    },
    {
      id: 'upgrade',
      title: t('movement_opt_upgrade_title'),
      description: t('movement_opt_upgrade_desc'),
      icon: <ArrowUpRight size={20} />,
      iconBg: 'var(--accent-primary-subtle)',
      iconColor: 'var(--accent-primary)',
    },
  ];

  const managementOptions: MovementOption[] = [
    {
      id: 'sale',
      title: t('movement_opt_sale_title'),
      description: t('movement_opt_sale_desc'),
      icon: <DollarSign size={20} />,
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: 'var(--accent-emerald)',
    },
    {
      id: 'expense',
      title: t('movement_opt_expense_title'),
      description: t('movement_opt_expense_desc'),
      icon: <Receipt size={20} />,
      iconBg: 'rgba(244, 63, 94, 0.12)',
      iconColor: 'var(--accent-ruby)',
    },
    {
      id: 'gift',
      title: t('movement_opt_gift_title'),
      description: t('movement_opt_gift_desc'),
      icon: <Gift size={20} />,
      iconBg: 'rgba(129, 140, 248, 0.12)',
      iconColor: 'var(--accent-indigo)',
    },
    {
      id: 'disposal',
      title: t('movement_opt_disposal_title'),
      description: t('movement_opt_disposal_desc'),
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
          title: t('movement_meta_purchase_title'),
          subtitle: t('movement_meta_purchase_sub'),
          maxWidth: '620px',
        };
      case 'sale':
        return {
          title: t('movement_meta_sale_title'),
          subtitle: t('movement_meta_sale_sub'),
          maxWidth: '600px',
        };
      case 'expense':
        return {
          title: t('movement_meta_expense_title'),
          subtitle: t('movement_meta_expense_sub'),
          maxWidth: '560px',
        };
      case 'gift':
        return {
          title: t('movement_meta_gift_title'),
          subtitle: t('movement_meta_gift_sub'),
          maxWidth: '540px',
        };
      case 'disposal':
        return {
          title: t('movement_meta_disposal_title'),
          subtitle: t('movement_meta_disposal_sub'),
          maxWidth: '540px',
        };
      default:
        return {
          title: t('movement_selector_title'),
          subtitle: t('movement_selector_subtitle'),
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
      backTitle={t('action_back')}
      title={meta.title}
      subtitle={meta.subtitle}
      maxWidth={meta.maxWidth}
    >
      {activeType === null && (
        <div className="movement-flow-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="movement-group-label">{t('movement_group_acquisition')}</div>
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

          <div className="movement-group-label" style={{ marginTop: '10px' }}>{t('movement_group_management')}</div>
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
                  {t('movement_footer_care_prompt')}
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
                <span>{t('movement_footer_care_btn')}</span>
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
