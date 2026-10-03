import React, { useState, useEffect, useRef } from 'react';
import { usePCStore } from '../store';
import {
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_STATUS_LABELS,
  UNINSTALL_REASON_LABELS,
  EVENT_TYPE_LABELS,
  Component,
  ComponentEvent,
  ComponentCategory,
  ComponentReceipt,
  NavSection,
  MaintenanceEntry,
  TuningProfile,
  MAINTENANCE_TYPE_LABELS,
  TUNING_TYPE_LABELS,
  TUNING_STABILITY_LABELS,
} from '../types';
import {
  canDeleteEvent,
  findPurchaseEvent,
  getMaintenanceByComponent,
  getTuningProfilesByComponent,
  getLatestThermalPasteService,
  sortMaintenanceEntriesChronologically,
  sortTuningProfiles,
  getMaintenanceTypeBadgeClass,
  getTuningStabilityBadgeClass,
} from '../domain';
import { EventEditModal, ReceiptVaultModal, ListingGeneratorModal } from '../components/components';
import { MaintenanceEntryModal, TuningProfileModal, BiosParameterCardModal } from '../components/maintenance';
import { HardwareIconBadge } from '../components/common/ComponentIcon';
import { useI18n, TranslationKey } from '../locales';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Tag,
  Clock,
  FileText,
  ShoppingBag,
  Wrench,
  Sliders,
  Plus,
  Package,
  DollarSign,
  Gift,
  Recycle,
  ArrowRightLeft,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldOff,
  UploadCloud,
  Eye,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

const COMPONENT_STATUS_KEYS: Record<string, TranslationKey> = {
  IN_USE: 'status_in_use',
  IN_STORAGE: 'status_in_storage',
  SOLD: 'status_sold',
  GIFTED: 'status_gifted',
  DISPOSED: 'status_disposed',
};

const COMPONENT_CATEGORY_KEYS: Record<ComponentCategory, TranslationKey> = {
  cpu: 'category_cpu',
  gpu: 'category_gpu',
  motherboard: 'category_motherboard',
  ram: 'category_ram',
  storage: 'category_storage',
  psu: 'category_psu',
  case: 'category_case',
  cooling: 'category_cooling',
  monitor: 'category_monitor',
  peripherals: 'category_peripherals',
  accessories: 'category_accessories',
  other: 'category_other',
};

const UNINSTALL_REASON_KEYS: Record<string, TranslationKey> = {
  upgrade: 'uninstall_reason_upgrade',
  maintenance: 'uninstall_reason_maintenance',
  storage: 'uninstall_reason_storage',
  defect: 'uninstall_reason_defect',
  other: 'uninstall_reason_other',
};

const EVENT_TYPE_TITLE_KEYS: Record<string, TranslationKey> = {
  PURCHASE: 'detail_event_title_purchase',
  INSTALL: 'detail_event_title_install',
  UNINSTALL: 'detail_event_title_uninstall',
  SALE: 'detail_event_title_sale',
  EXTRA_EXPENSE: 'detail_event_title_extra_expense',
  GIFT: 'detail_event_title_gift',
  DISPOSAL: 'detail_event_title_disposal',
};

interface ComponentDetailPageProps {
  componentId: string;
  onBack: () => void;
  referrerSection?: NavSection | null;
  onEdit: (component: Component) => void;
  onDelete: (component: Component) => void;
  onInstall?: (component: Component) => void;
  onUninstall?: (component: Component) => void;
  onReplace?: (component: Component) => void;
  onUpgrade?: (component: Component) => void;
  onSale?: (component: Component) => void;
  onExtraExpense?: (component: Component) => void;
  onGift?: (component: Component) => void;
  onDisposal?: (component: Component) => void;
}

export const ComponentDetailPage: React.FC<ComponentDetailPageProps> = ({
  componentId,
  onBack,
  referrerSection,
  onEdit,
  onDelete,
  onInstall,
  onUninstall,
  onReplace,
  onUpgrade,
  onSale,
  onExtraExpense,
  onGift,
  onDisposal,
}) => {
  const {
    components,
    getComponentComputed,
    getComponentEvents,
    deleteComponentEvent,
    getComponentWarranty,
    getComponentReceipts,
    uploadReceipt,
    deleteReceipt,
    maintenanceEntries,
    tuningProfiles,
    deleteMaintenanceEntry,
    deleteTuningProfile,
  } = usePCStore();

  const { t, formatCurrency, formatDate, currentLocale } = useI18n();

  const [editingEvent, setEditingEvent] = useState<ComponentEvent | null>(null);

  // Modali Cura & Tuning per questo componente
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<MaintenanceEntry | null>(null);
  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<TuningProfile | null>(null);

  const [isBiosCardModalOpen, setIsBiosCardModalOpen] = useState(false);
  const [biosCardProfile, setBiosCardProfile] = useState<TuningProfile | null>(null);

  // Stato e caricamento asincrono per la Cassaforte Ricevute (Zero-Heap RAM)
  const [receipts, setReceipts] = useState<ComponentReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<ComponentReceipt | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  const component = components.find((c) => c.id === componentId);
  const computed = getComponentComputed(componentId);
  const events = getComponentEvents(componentId);

  const getBackLabel = (referrer?: NavSection | null): string => {
    switch (referrer) {
      case 'dashboard':
        return t('detail_back_dashboard');
      case 'current-rig':
        return t('detail_back_current_rig');
      case 'upgrades':
        return t('detail_back_upgrades');
      case 'marketplace':
        return t('detail_back_marketplace');
      case 'stats':
        return t('detail_back_stats');
      case 'archive':
      default:
        return t('detail_back_archive');
    }
  };

  const getStatusLabel = (status: string) => {
    const key = COMPONENT_STATUS_KEYS[status];
    return key ? t(key) : COMPONENT_STATUS_LABELS[status as keyof typeof COMPONENT_STATUS_LABELS] || status;
  };

  const getCategoryLabel = (category: ComponentCategory) => {
    const key = COMPONENT_CATEGORY_KEYS[category];
    return key ? t(key) : COMPONENT_CATEGORY_LABELS[category] || category;
  };

  const componentMaintenance = React.useMemo(() => {
    return sortMaintenanceEntriesChronologically(
      getMaintenanceByComponent(maintenanceEntries, componentId),
      'desc'
    );
  }, [maintenanceEntries, componentId]);

  const componentTuning = React.useMemo(() => {
    return sortTuningProfiles(
      getTuningProfilesByComponent(tuningProfiles, componentId)
    );
  }, [tuningProfiles, componentId]);

  const latestThermalPaste = React.useMemo(() => {
    return getLatestThermalPasteService(componentMaintenance, componentId);
  }, [componentMaintenance, componentId]);

  const handleOpenNewMaintenance = () => {
    setEntryToEdit(null);
    setIsMaintenanceModalOpen(true);
  };

  const handleEditMaintenance = (entry: MaintenanceEntry) => {
    setEntryToEdit(entry);
    setIsMaintenanceModalOpen(true);
  };

  const handleDeleteMaintenance = async (entry: MaintenanceEntry) => {
    if (window.confirm(t('detail_maintenance_delete_confirm', { title: entry.title }))) {
      try {
        await deleteMaintenanceEntry(entry.id);
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  const handleOpenNewTuning = () => {
    setProfileToEdit(null);
    setIsTuningModalOpen(true);
  };

  const handleEditTuning = (profile: TuningProfile) => {
    setProfileToEdit(profile);
    setIsTuningModalOpen(true);
  };

  const handleDeleteTuning = async (profile: TuningProfile) => {
    if (window.confirm(t('detail_tuning_delete_confirm', { name: profile.name }))) {
      try {
        await deleteTuningProfile(profile.id);
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingReceipts(true);
    getComponentReceipts(componentId)
      .then((data) => {
        if (isMounted) setReceipts(data);
      })
      .catch((err) => {
        console.error('Errore nel recupero delle ricevute:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingReceipts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [componentId, getComponentReceipts]);

  const handleProcessFile = async (file: File) => {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      alert(t('detail_receipts_error_mime'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(t('detail_receipts_error_size', { size: (file.size / (1024 * 1024)).toFixed(1) }));
      return;
    }

    try {
      setIsUploadingReceipt(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(t('detail_receipts_error_read')));
        reader.readAsDataURL(file);
      });

      const newReceipt = await uploadReceipt(
        componentId,
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataUrl,
        }
      );
      setReceipts((prev) => [newReceipt, ...prev]);
    } catch (err) {
      alert((err as Error).message || t('detail_receipts_error_save'));
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadReceipt = (rc: ComponentReceipt) => {
    const a = document.createElement('a');
    a.href = rc.dataUrl;
    a.download = rc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    await deleteReceipt(receiptId);
    setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
    if (viewingReceipt && viewingReceipt.id === receiptId) {
      setViewingReceipt(null);
    }
  };

  if (!component || !computed) {
    return (
      <div className="card" style={{ maxWidth: '480px', margin: '40px auto', textAlign: 'center' }}>
        <p style={{ marginBottom: '16px' }}>{t('detail_not_found')}</p>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} /> {getBackLabel(referrerSection)}
        </button>
      </div>
    );
  }

  const handleDeleteEvent = async (ev: ComponentEvent) => {
    if (!component) return;
    const check = canDeleteEvent(ev.id, events, currentLocale);
    if (!check.canDelete) {
      alert(check.error || t('detail_event_delete_error'));
      return;
    }
    const typeLabel = (EVENT_TYPE_TITLE_KEYS[ev.type] ? t(EVENT_TYPE_TITLE_KEYS[ev.type]) : EVENT_TYPE_LABELS[ev.type]) || ev.type;
    const dateFormatted = formatDate(ev.date);
    if (
      window.confirm(
        t('detail_event_delete_confirm', { type: typeLabel, date: dateFormatted })
      )
    ) {
      try {
        await deleteComponentEvent(ev.id, component.id);
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return 'badge-in-use';
      case 'IN_STORAGE':
        return 'badge-in-storage';
      case 'SOLD':
        return 'badge-sold';
      case 'GIFTED':
        return 'badge-gifted';
      case 'DISPOSED':
        return 'badge-disposed';
      default:
        return '';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ShoppingBag size={14} color="var(--accent-ruby)" />;
      case 'INSTALL':
        return <Wrench size={14} color="var(--accent-primary)" />;
      case 'UNINSTALL':
        return <Package size={14} color="var(--accent-amber)" />;
      case 'SALE':
        return <DollarSign size={14} color="var(--accent-emerald)" />;
      case 'GIFT':
        return <Gift size={14} color="var(--accent-indigo)" />;
      case 'DISPOSAL':
        return <Recycle size={14} color="var(--text-muted)" />;
      default:
        return <Tag size={14} />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Barra superiore di navigazione (Apple-Style Slide-Up) */}
      <div className="animate-slide-up" style={styles.topNav}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '13px' }} id="btn-component-back">
          <ArrowLeft size={15} />
          <span>{getBackLabel(referrerSection)}</span>
        </button>

        <div style={styles.topActions}>
          {(computed.status === 'IN_USE' || computed.status === 'IN_STORAGE') && onUpgrade && (
            <button
              onClick={() => onUpgrade(component)}
              className="btn btn-secondary micro-press"
              title={t('detail_action_upgrade_tooltip')}
              style={{
                color: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary-border)',
                backgroundColor: 'var(--accent-primary-subtle)',
                fontSize: '13px',
                padding: '6px 12px',
              }}
            >
              <ArrowUpRight size={14} />
              <span>{t('detail_action_upgrade')}</span>
            </button>
          )}

          {computed.status === 'IN_STORAGE' && onInstall && (
            <button onClick={() => onInstall(component)} className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 12px' }}>
              <Wrench size={14} />
              <span>{t('detail_action_install')}</span>
            </button>
          )}

          {computed.status === 'IN_USE' && (
            <>
              {onReplace && (
                <button onClick={() => onReplace(component)} className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  <ArrowRightLeft size={14} />
                  <span>{t('detail_action_replace')}</span>
                </button>
              )}
              {onUninstall && (
                <button
                  onClick={() => onUninstall(component)}
                  className="btn btn-secondary"
                  style={{ color: 'var(--accent-amber)', borderColor: 'var(--accent-amber-border)', fontSize: '13px', padding: '6px 12px' }}
                >
                  <Package size={14} />
                  <span>{t('detail_action_uninstall')}</span>
                </button>
              )}
            </>
          )}

          {/* Azioni di Movimentazione ed Economia (se non già dismesso) */}
          {computed.status !== 'SOLD' && computed.status !== 'GIFTED' && computed.status !== 'DISPOSED' && (
            <>
              {onSale && (
                <button
                  onClick={() => onSale(component)}
                  className="btn btn-secondary"
                  title={t('detail_action_sale_tooltip')}
                  style={{ color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald-border)', fontSize: '13px', padding: '6px 12px' }}
                >
                  <DollarSign size={14} />
                  <span>{t('detail_action_sale')}</span>
                </button>
              )}
              {onExtraExpense && (
                <button
                  onClick={() => onExtraExpense(component)}
                  className="btn btn-secondary"
                  title={t('detail_action_extra_expense_tooltip')}
                  style={{ color: 'var(--accent-ruby)', borderColor: 'var(--accent-ruby-border)', fontSize: '13px', padding: '6px 12px' }}
                >
                  <Receipt size={14} />
                  <span>{t('detail_action_extra_expense')}</span>
                </button>
              )}
              {computed.status === 'IN_STORAGE' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsListingModalOpen(true)}
                    className="btn btn-secondary micro-press"
                    title={t('detail_action_generate_listing_tooltip')}
                    style={{
                      color: 'var(--accent-primary)',
                      borderColor: 'var(--accent-primary-border)',
                      backgroundColor: 'var(--accent-primary-subtle)',
                      fontSize: '13px',
                      padding: '6px 12px',
                    }}
                  >
                    <Tag size={14} />
                    <span>{t('detail_action_generate_listing')}</span>
                  </button>
                  {onGift && (
                    <button
                      onClick={() => onGift(component)}
                      className="btn btn-secondary"
                      title={t('detail_action_gift_tooltip')}
                      style={{ color: 'var(--accent-indigo)', borderColor: 'var(--accent-indigo-border)', fontSize: '13px', padding: '6px 12px' }}
                    >
                      <Gift size={14} />
                      <span>{t('detail_action_gift')}</span>
                    </button>
                  )}
                  {onDisposal && (
                    <button
                      onClick={() => onDisposal(component)}
                      className="btn btn-secondary"
                      title={t('detail_action_disposal_tooltip')}
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', fontSize: '13px', padding: '6px 12px' }}
                    >
                      <Recycle size={14} />
                      <span>{t('detail_action_disposal')}</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Azioni Rapide Cura & Tuning per questo pezzo */}
          <button
            type="button"
            onClick={handleOpenNewMaintenance}
            className="btn btn-secondary micro-press"
            title={t('detail_action_care_tooltip')}
            style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.25)', fontSize: '13px', padding: '6px 12px' }}
          >
            <Wrench size={14} />
            <span>{t('detail_action_care')}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenNewTuning}
            className="btn btn-secondary micro-press"
            title={t('detail_action_tuning_tooltip')}
            style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.25)', fontSize: '13px', padding: '6px 12px' }}
          >
            <Sliders size={14} />
            <span>{t('detail_action_tuning')}</span>
          </button>

          <button onClick={() => onEdit(component)} className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
            <Edit2 size={14} />
            <span>{t('detail_action_edit')}</span>
          </button>
          <button
            onClick={() => onDelete(component)}
            className="btn btn-ghost"
            style={{ color: 'var(--accent-ruby)', padding: '6px 10px', fontSize: '13px' }}
          >
            <Trash2 size={14} />
            <span>{t('detail_action_delete')}</span>
          </button>
        </div>
      </div>

      {/* Header Scheda Componente */}
      <div className="card animate-slide-up stagger-1" style={styles.headerCard}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <HardwareIconBadge category={component.category} name={component.name} size={22} boxSize={46} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={styles.badges}>
              <span className={`badge ${getStatusBadgeClass(computed.status)}`}>
                {getStatusLabel(computed.status)}
              </span>
              <span
                className="category-chip"
                data-category={component.category}
                style={{ fontSize: '11.5px', padding: '2px 8px' }}
              >
                {getCategoryLabel(component.category)}
              </span>
            </div>
            <h1 style={styles.title}>{component.name}</h1>
            <p style={styles.brandModel}>
              {component.brand} {component.model && `• ${component.model}`}
            </p>
          </div>
        </div>
      </div>

      {/* Metriche Finanziarie e di Utilizzo (Apple-Style Staggered) */}
      <div style={styles.metricsGrid}>
        <div className="stat-card stat-card-ruby animate-slide-up stagger-2">
          <span className="stat-label">{t('detail_metric_total_purchase')}</span>
          <span className="stat-value" style={{ color: 'var(--accent-ruby)' }}>
            {formatCurrency(computed.totalPurchaseCost)}
          </span>
          <span className="stat-subtext">{t('detail_metric_total_purchase_sub')}</span>
        </div>

        <div className="stat-card stat-card-emerald animate-slide-up stagger-2">
          <span className="stat-label">{t('detail_metric_total_revenue')}</span>
          <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            {formatCurrency(computed.totalSaleRevenue)}
          </span>
          <span className="stat-subtext">{t('detail_metric_total_revenue_sub')}</span>
        </div>

        <div className="stat-card stat-card-primary animate-slide-up stagger-3">
          <span className="stat-label">{t('detail_metric_net_cost')}</span>
          <span className="stat-value" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(computed.netCost)}
          </span>
          <span className="stat-subtext">{t('detail_metric_net_cost_sub')}</span>
        </div>

        <div className="stat-card animate-slide-up stagger-3">
          <span className="stat-label">{t('detail_metric_days_in_use')}</span>
          <span className="stat-value font-mono">{t('detail_metric_days_count', { days: computed.daysInUse })}</span>
          <span className="stat-subtext">{t('detail_metric_days_in_use_sub')}</span>
        </div>

        <div className="stat-card animate-slide-up stagger-4">
          <span className="stat-label">{t('detail_metric_cost_per_day')}</span>
          <span className="stat-value font-mono">
            {computed.costPerDayInUse !== null
              ? t('detail_metric_cost_per_day_val', { amount: formatCurrency(computed.costPerDayInUse) })
              : '—'}
          </span>
          <span className="stat-subtext">{t('detail_metric_cost_per_day_sub')}</span>
        </div>
      </div>

      {/* Griglia a 2 colonne: Specifiche Anagrafiche e Cronologia Eventi */}
      <div className="animate-slide-up stagger-4" style={styles.detailsGrid}>
        {/* Anagrafica */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--accent-primary)" />
            <span>{t('detail_specs_heading')}</span>
          </h2>

          <div style={styles.specList}>
            <div style={styles.specRow}>
              <span style={styles.specLabel}>{t('detail_spec_category')}</span>
              <span style={styles.specValue}>{getCategoryLabel(component.category)}</span>
            </div>

            <div style={styles.specRow}>
              <span style={styles.specLabel}>{t('detail_spec_brand')}</span>
              <span style={styles.specValue}>{component.brand || '—'}</span>
            </div>

            <div style={styles.specRow}>
              <span style={styles.specLabel}>{t('detail_spec_model')}</span>
              <span style={styles.specValue}>{component.model || '—'}</span>
            </div>

            <div style={styles.specRow}>
              <span style={styles.specLabel}>{t('detail_spec_serial')}</span>
              <span className="font-mono" style={styles.specValue}>{component.serialNumber || '—'}</span>
            </div>

            <div style={styles.specRow}>
              <span style={styles.specLabel}>{t('detail_spec_registered_at')}</span>
              <span style={styles.specValue}>{formatDate(component.createdAt)}</span>
            </div>
          </div>

          {component.notes && (
            <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={styles.specLabel}>{t('detail_spec_personal_notes')}</span>
              <p style={{ marginTop: '4px', fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {component.notes}
              </p>
            </div>
          )}
        </div>

        {/* Cronologia Eventi Timeline */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--accent-primary)" />
            <span>{t('detail_timeline_heading', { count: events.length })}</span>
          </h2>

          {events.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
              {t('detail_timeline_empty')}
            </p>
          ) : (
            <div style={styles.timeline}>
              {events.map((ev, idx) => (
                <div key={ev.id} style={styles.timelineItem}>
                  <div style={styles.timelineIconCol}>
                    <div style={styles.timelineIconWrapper}>
                      {getEventIcon(ev.type)}
                    </div>
                    {idx < events.length - 1 && <div style={styles.timelineLine} />}
                  </div>

                  <div style={styles.timelineContent}>
                    <div style={styles.eventHeader}>
                      <span style={styles.eventTitle}>
                        {EVENT_TYPE_TITLE_KEYS[ev.type] ? t(EVENT_TYPE_TITLE_KEYS[ev.type]) : (EVENT_TYPE_LABELS[ev.type] || ev.type)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDate(ev.date)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingEvent(ev)}
                            className="btn btn-ghost"
                            style={{ padding: '3px 6px', height: '24px', color: 'var(--text-secondary)' }}
                            title={t('detail_event_edit_tooltip')}
                            aria-label={t('detail_event_edit_tooltip')}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev)}
                            className="btn btn-ghost"
                            style={{ padding: '3px 6px', height: '24px', color: 'var(--accent-ruby)' }}
                            title={t('detail_event_delete_tooltip')}
                            aria-label={t('detail_event_delete_tooltip')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {ev.type === 'PURCHASE' && (
                      <div style={styles.eventDesc}>
                        {t('detail_event_desc_purchase_price', { price: formatCurrency(ev.price) })}
                        {ev.store && ` • ${t('detail_event_desc_store', { store: ev.store })}`}
                        {ev.condition && ` • ${ev.condition === 'new' ? t('detail_event_desc_condition_new') : t('detail_event_desc_condition_used')}`}
                      </div>
                    )}

                    {ev.type === 'INSTALL' && (
                      <div style={styles.eventDesc}>
                        {ev.slotOrLocation ? t('detail_event_desc_install_slot', { slot: ev.slotOrLocation }) : t('detail_event_desc_install_pc')}
                        {ev.notes && ` • ${t('detail_event_desc_notes', { notes: ev.notes })}`}
                      </div>
                    )}

                    {ev.type === 'UNINSTALL' && (
                      <div style={styles.eventDesc}>
                        {ev.reason && `${t('detail_event_desc_uninstall_reason', { reason: (UNINSTALL_REASON_KEYS[ev.reason] ? t(UNINSTALL_REASON_KEYS[ev.reason]) : UNINSTALL_REASON_LABELS[ev.reason]) || ev.reason })}`}
                        {ev.notes && ` • ${t('detail_event_desc_notes', { notes: ev.notes })}`}
                      </div>
                    )}

                    {ev.type === 'EXTRA_EXPENSE' && (
                      <div style={styles.eventDesc}>
                        {t('detail_event_desc_extra_amount', { amount: formatCurrency(ev.amount) })}
                        {ev.description && ` • ${ev.description}`}
                      </div>
                    )}

                    {ev.type === 'SALE' && (
                      <div style={styles.eventDesc}>
                        {t('detail_event_desc_sale_revenue', { price: formatCurrency(ev.price) })}
                        {ev.platform && ` • ${t('detail_event_desc_platform', { platform: ev.platform })}`}
                      </div>
                    )}

                    {ev.type === 'GIFT' && ev.recipient && (
                      <div style={styles.eventDesc}>
                        {t('detail_event_desc_gift_recipient', { recipient: ev.recipient })}
                      </div>
                    )}

                    {ev.type === 'DISPOSAL' && (
                      <div style={styles.eventDesc}>
                        {t('detail_event_desc_disposal_method', { method: ev.disposalMethod })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Griglia a 2 colonne: Garanzia & Assistenza (RMA) e Cassaforte Ricevute */}
      <div className="animate-slide-up stagger-4" style={styles.detailsGrid}>
        {/* Garanzia & Assistenza RMA */}
        {(() => {
          const warranty = getComponentWarranty(componentId);
          const purchaseEvent = findPurchaseEvent(events);

          return (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--accent-primary)" />
                  <span>{t('detail_warranty_heading')}</span>
                </h2>
                {warranty.status === 'active' && (
                  <span className="badge badge-warranty-active">
                    <ShieldCheck size={12} /> {warranty.humanLabel}
                  </span>
                )}
                {warranty.status === 'expiring' && (
                  <span className="badge badge-warranty-expiring">
                    <ShieldAlert size={12} /> {warranty.humanLabel}
                  </span>
                )}
                {warranty.status === 'expired' && (
                  <span className="badge badge-warranty-expired">
                    <ShieldX size={12} /> {warranty.humanLabel}
                  </span>
                )}
                {warranty.status === 'none' && (
                  <span className="badge" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    <ShieldOff size={12} /> {t('detail_warranty_unspecified')}
                  </span>
                )}
              </div>

              <div style={styles.specList}>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_status_label')}</span>
                  <span style={styles.specValue}>{warranty.humanLabel}</span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_expiry_label')}</span>
                  <span className="font-mono" style={styles.specValue}>
                    {warranty.expiryDate ? formatDate(warranty.expiryDate) : t('detail_warranty_unregistered')}
                  </span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_purchase_date_label')}</span>
                  <span className="font-mono" style={styles.specValue}>
                    {purchaseEvent?.date ? formatDate(purchaseEvent.date) : '—'}
                  </span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_store_label')}</span>
                  <span style={styles.specValue}>{purchaseEvent?.store || '—'}</span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_order_label')}</span>
                  <span className="font-mono" style={styles.specValue}>{purchaseEvent?.orderNumber || '—'}</span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specLabel}>{t('detail_warranty_serial_label')}</span>
                  <span className="font-mono" style={styles.specValue}>{component.serialNumber || '—'}</span>
                </div>
              </div>

              {purchaseEvent && (
                <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(purchaseEvent)}
                    className="btn btn-secondary micro-press"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    title={t('detail_warranty_edit_tooltip')}
                  >
                    <Edit2 size={12} />
                    <span>{purchaseEvent.warrantyExpiryDate ? t('detail_warranty_edit_btn') : t('detail_warranty_set_btn')}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Cassaforte Ricevute & Fatture */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--accent-primary)" />
              <span>{t('detail_receipts_heading', { count: receipts.length })}</span>
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('detail_receipts_local_badge')}</span>
          </div>

          {/* Input file nascosto e Dropzone Apple-style */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProcessFile(f);
            }}
          />

          <div
            className="receipt-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('receipt-dropzone-dragover');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('receipt-dropzone-dragover');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('receipt-dropzone-dragover');
              const f = e.dataTransfer.files?.[0];
              if (f) handleProcessFile(f);
            }}
          >
            <UploadCloud size={22} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isUploadingReceipt ? t('detail_receipts_uploading') : t('detail_receipts_upload_prompt')}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {t('detail_receipts_dropzone_hint')}
            </span>
          </div>

          {/* Elenco Documenti Allegati */}
          {isLoadingReceipts ? (
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
              {t('detail_receipts_loading')}
            </p>
          ) : receipts.length === 0 ? (
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
              {t('detail_receipts_empty')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {receipts.map((rc) => {
                const isPdf = rc.fileType === 'application/pdf';
                const sizeMb = (rc.fileSize / (1024 * 1024)).toFixed(2);
                return (
                  <div key={rc.id} className="receipt-card">
                    <div className="receipt-card-info">
                      <div className="receipt-card-icon">
                        {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                      </div>
                      <div className="receipt-card-text">
                        <span className="receipt-card-filename" title={rc.fileName}>
                          {rc.fileName}
                        </span>
                        <span className="receipt-card-meta">
                          <span>{sizeMb} MB</span>
                          <span>•</span>
                          <span>{formatDate(rc.uploadedAt)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="receipt-card-actions">
                      <button
                        type="button"
                        onClick={() => setViewingReceipt(rc)}
                        className="btn btn-secondary micro-press"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title={t('detail_receipts_open_tooltip')}
                        aria-label={`${t('detail_receipts_open_tooltip')} ${rc.fileName}`}
                      >
                        <Eye size={13} />
                        <span>{t('detail_receipts_open_btn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(rc)}
                        className="btn btn-ghost micro-press"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title={t('detail_receipts_download_tooltip')}
                        aria-label={`${t('detail_receipts_download_tooltip')} ${rc.fileName}`}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(t('detail_receipts_delete_confirm', { fileName: rc.fileName }))) {
                            await handleDeleteReceipt(rc.id);
                          }
                        }}
                        className="btn btn-ghost micro-press"
                        style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--accent-ruby)' }}
                        title={t('detail_receipts_delete_tooltip')}
                        aria-label={`${t('detail_receipts_delete_tooltip')} ${rc.fileName}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Griglia a 2 colonne: Cura & Manutenzione Hardware e Profili di Tuning */}
      <div className="animate-slide-up stagger-4" style={styles.detailsGrid}>
        {/* Card 1: Cura & Manutenzione Hardware */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={16} color="var(--accent-cyan)" />
              <span>{t('detail_maintenance_heading', { count: componentMaintenance.length })}</span>
            </h2>
            <button
              type="button"
              onClick={handleOpenNewMaintenance}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.25)' }}
            >
              <Plus size={13} />
              <span>{t('detail_maintenance_record_btn')}</span>
            </button>
          </div>

          {/* Banner Pasta Termica (se registrata per questo pezzo) */}
          {latestThermalPaste && (() => {
            const days = Math.max(0, Math.floor((new Date().getTime() - new Date(latestThermalPaste.date).getTime()) / (1000 * 3600 * 24)));
            let badgeText = t('detail_maintenance_paste_fresh', { days });
            let badgeColor = 'var(--accent-emerald)';
            let badgeBg = 'rgba(16, 185, 129, 0.1)';
            if (days > 365) {
              badgeText = t('detail_maintenance_paste_monitor', { days });
              badgeColor = 'var(--accent-amber)';
              badgeBg = 'rgba(245, 158, 11, 0.1)';
            } else if (days > 180) {
              badgeText = t('detail_maintenance_paste_good', { days });
              badgeColor = 'var(--accent-cyan)';
              badgeBg = 'rgba(56, 189, 248, 0.1)';
            }

            return (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('detail_maintenance_paste_title')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatDate(latestThermalPaste.date)}
                    {latestThermalPaste.productUsed && ` • ${latestThermalPaste.productUsed}`}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: badgeColor,
                    backgroundColor: badgeBg,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badgeText}
                </span>
              </div>
            );
          })()}

          {/* Elenco Interventi di Manutenzione */}
          {componentMaintenance.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                {t('detail_maintenance_empty_desc')}
              </p>
              <button
                type="button"
                onClick={handleOpenNewMaintenance}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={13} />
                <span>{t('detail_maintenance_empty_btn')}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {componentMaintenance.map((m) => {
                const typeBadgeClass = getMaintenanceTypeBadgeClass(m.type);
                const typeLabel = MAINTENANCE_TYPE_LABELS[m.type] || m.type;

                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span className={`badge ${typeBadgeClass}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                          {typeLabel}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleEditMaintenance(m)}
                          className="btn btn-ghost"
                          style={{ padding: '2px 5px', height: '22px', color: 'var(--text-secondary)' }}
                          title={t('detail_maintenance_edit_tooltip')}
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaintenance(m)}
                          className="btn btn-ghost"
                          style={{ padding: '2px 5px', height: '22px', color: 'var(--accent-ruby)' }}
                          title={t('detail_maintenance_delete_tooltip')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span className="font-mono">{formatDate(m.date)}</span>
                      {m.cost !== undefined && m.cost > 0 && (
                        <span className="font-mono" style={{ color: 'var(--accent-ruby)', fontWeight: 500 }}>
                          {formatCurrency(m.cost)}
                        </span>
                      )}
                    </div>

                    {(m.productUsed || m.notes) && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '2px' }}>
                        {m.productUsed && <span style={{ color: 'var(--accent-cyan)' }}>{t('detail_maintenance_product_label', { product: m.productUsed })} </span>}
                        {m.notes && <span>{m.notes}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 2: Profili di Tuning Associati */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="var(--accent-amber)" />
              <span>{t('detail_tuning_heading', { count: componentTuning.length })}</span>
            </h2>
            <button
              type="button"
              onClick={handleOpenNewTuning}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.25)' }}
            >
              <Plus size={13} />
              <span>{t('detail_tuning_add_btn')}</span>
            </button>
          </div>

          {componentTuning.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                {t('detail_tuning_empty_desc')}
              </p>
              <button
                type="button"
                onClick={handleOpenNewTuning}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={13} />
                <span>{t('detail_tuning_empty_btn')}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {componentTuning.map((p) => {
                const stabBadge = getTuningStabilityBadgeClass(p.stability);
                const typeLabel = TUNING_TYPE_LABELS[p.type] || p.type;
                const stabLabel = TUNING_STABILITY_LABELS[p.stability] || p.stability;
                const paramEntries = Object.entries(p.parameters || {});

                return (
                  <div
                    key={p.id}
                    className={p.stability === 'daily' ? 'tuning-card-daily' : undefined}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: p.stability === 'daily' ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
                      border: p.stability === 'daily' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                        <span className={`badge ${stabBadge}`} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {stabLabel}
                        </span>
                        {p.stability === 'daily' && (
                          <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
                            ⭐ DAILY
                          </span>
                        )}
                        {p.biosVersion && (
                          <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 5px', fontFamily: 'var(--font-mono)' }} title={`BIOS firmware: ${p.biosVersion}`}>
                            BIOS {p.biosVersion}
                          </span>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setBiosCardProfile(p);
                            setIsBiosCardModalOpen(true);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '2px 5px', height: '22px', color: 'var(--accent-cyan)' }}
                          title={t('detail_tuning_export_bios_tooltip')}
                        >
                          <FileText size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditTuning(p)}
                          className="btn btn-ghost"
                          style={{ padding: '2px 5px', height: '22px', color: 'var(--text-secondary)' }}
                          title={t('detail_tuning_edit_tooltip')}
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTuning(p)}
                          className="btn btn-ghost"
                          style={{ padding: '2px 5px', height: '22px', color: 'var(--accent-ruby)' }}
                          title={t('detail_tuning_delete_tooltip')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span>{typeLabel}</span>
                      <span className="font-mono">{formatDate(p.date)}</span>
                    </div>

                    {/* Parametri principali */}
                    {paramEntries.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {paramEntries.slice(0, 3).map(([k, v]) => (
                          <span
                            key={k}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <strong>{k}:</strong> {v}
                          </span>
                        ))}
                        {paramEntries.length > 3 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            {t('detail_tuning_more_params', { count: paramEntries.length - 3 })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Temperature e Potenza se presenti */}
                    {(p.temperatures?.idle !== undefined || p.temperatures?.load !== undefined || p.observedPowerWatts !== undefined) && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        {p.temperatures?.idle !== undefined && <span>{t('detail_tuning_idle', { temp: p.temperatures.idle })}</span>}
                        {p.temperatures?.load !== undefined && <span>{t('detail_tuning_load', { temp: p.temperatures.load })}</span>}
                        {p.observedPowerWatts !== undefined && <span>{t('detail_tuning_power', { watts: p.observedPowerWatts })}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modale Modifica Singolo Evento */}
      <EventEditModal
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
        componentName={component.name}
      />

      {/* Modale Visualizzatore Cassaforte Ricevute */}
      <ReceiptVaultModal
        isOpen={Boolean(viewingReceipt)}
        onClose={() => setViewingReceipt(null)}
        receipt={viewingReceipt}
        componentName={component.name}
        onDelete={handleDeleteReceipt}
      />

      {/* Modale Generatore Annunci di Vendita & Prompt IA */}
      <ListingGeneratorModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        component={component}
        computed={computed}
        events={events}
        warranty={getComponentWarranty(componentId)}
        receiptCount={receipts.length}
      />

      {/* Modale Inserimento / Modifica Manutenzione per questo pezzo */}
      <MaintenanceEntryModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setEntryToEdit(null);
        }}
        entryToEdit={entryToEdit}
        initialValues={{
          componentIds: [component.id],
          title: t('detail_maintenance_initial_title', { name: component.name }),
        }}
      />

      {/* Modale Inserimento / Modifica Tuning per questo pezzo */}
      <TuningProfileModal
        isOpen={isTuningModalOpen}
        onClose={() => {
          setIsTuningModalOpen(false);
          setProfileToEdit(null);
        }}
        profileToEdit={profileToEdit}
        initialValues={{
          componentId: component.id,
          category: component.category,
        }}
      />

      {/* Modale Esportazione Scheda Parametri BIOS */}
      <BiosParameterCardModal
        isOpen={isBiosCardModalOpen}
        onClose={() => {
          setIsBiosCardModalOpen(false);
          setBiosCardProfile(null);
        }}
        profile={biosCardProfile}
        componentName={component?.name}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  headerCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.25,
  },
  brandModel: {
    fontSize: '13.5px',
    color: 'var(--text-muted)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  specList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle)',
    fontSize: '13px',
  },
  specLabel: {
    color: 'var(--text-muted)',
  },
  specValue: {
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
  },
  timelineIconCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timelineIconWrapper: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineLine: {
    width: '1px',
    flex: 1,
    backgroundColor: 'var(--border-subtle)',
    margin: '2px 0',
  },
  timelineContent: {
    paddingBottom: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  eventTitle: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  eventDesc: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
  },
};
