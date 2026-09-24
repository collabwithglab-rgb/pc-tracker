import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Database,
  ArrowRight,
  Activity,
  ShoppingBag,
  Wrench,
  Package,
  DollarSign,
  Gift,
  Recycle,
  Zap,
  Plus,
  TrendingUp,
  Sparkles,
  Share2,
  BookOpen,
  Tag,
  ShieldAlert,
  ShieldCheck,
  History,
  AlertCircle,
} from 'lucide-react';
import { usePCStore } from '../store';
import { formatDate } from '../utils';
import { NavSection } from '../components/layout/Sidebar';
import { ComponentIcon } from '../components/common/ComponentIcon';
import {
  computeRigPowerBudgetFromInstalled,
  computeUpcomingMaintenance,
  sortMaintenanceEntriesChronologically,
  getLocalDateISO,
} from '../domain';
import {
  COMPONENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  UNINSTALL_REASON_LABELS,
  ComponentCategory,
  ComponentEvent,
  PurchaseEvent,
} from '../types';

interface DashboardPageProps {
  onNavigate?: (section: NavSection) => void;
  onOpenCreateModal?: () => void;
  onOpenMovementSelector?: () => void;
  onSelectComponent?: (id: string) => void;
  onOpenQuickSetup?: () => void;
  onOpenExportModal?: () => void;
  onOpenWikiArticle?: (articleId: string) => void;
}

const CATEGORY_PRIORITY: Record<ComponentCategory, number> = {
  cpu: 1,
  gpu: 2,
  motherboard: 3,
  ram: 4,
  storage: 5,
  psu: 6,
  cooling: 7,
  case: 8,
  monitor: 9,
  peripherals: 10,
  accessories: 11,
  other: 12,
};

type RigCategoryFilter = 'all' | 'internals' | 'peripherals' | 'accessories';

const INTERNAL_CATEGORIES: ComponentCategory[] = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'cooling',
  'case',
];

const PERIPHERAL_CATEGORIES: ComponentCategory[] = [
  'monitor',
  'peripherals',
];

const ACCESSORY_CATEGORIES: ComponentCategory[] = [
  'accessories',
  'other',
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenCreateModal,
  onOpenMovementSelector,
  onSelectComponent,
  onOpenQuickSetup,
  onOpenExportModal,
  onOpenWikiArticle,
}) => {
  const {
    components,
    events,
    totalPurchased,
    totalRecovered,
    historicalNetCost,
    currentRigCost,
    settings,
    isLoading,
    getInstalledComponents,
    getComponentComputed,
    getComponentWarranty,
    maintenanceEntries,
    upgrades,
    checkpoints,
  } = usePCStore();

  const [selectedRigFilter, setSelectedRigFilter] = useState<RigCategoryFilter>('all');

  const installed = getInstalledComponents();
  const installedCount = installed.length;

  const installedComponents = useMemo(() => installed.map((item) => item.component), [installed]);
  const powerBudget = useMemo(() => computeRigPowerBudgetFromInstalled(installedComponents), [installedComponents]);

  // Conteggio componenti per ciascun raggruppamento
  const rigCounts = useMemo(() => {
    let internals = 0;
    let peripherals = 0;
    let accessories = 0;
    for (const item of installed) {
      const cat = item.component.category;
      if (INTERNAL_CATEGORIES.includes(cat)) internals++;
      else if (PERIPHERAL_CATEGORIES.includes(cat)) peripherals++;
      else accessories++;
    }
    return {
      all: installed.length,
      internals,
      peripherals,
      accessories,
    };
  }, [installed]);

  // Ordina i componenti attualmente montati per importanza hardware
  const sortedInstalled = useMemo(() => {
    return [...installed].sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.component.category] || 99;
      const pB = CATEGORY_PRIORITY[b.component.category] || 99;
      if (pA !== pB) return pA - pB;
      return a.component.name.localeCompare(b.component.name);
    });
  }, [installed]);

  // Componenti filtrati per categoria rapida nel Rig
  const filteredInstalled = useMemo(() => {
    if (selectedRigFilter === 'all') return sortedInstalled;
    if (selectedRigFilter === 'internals') {
      return sortedInstalled.filter((item) => INTERNAL_CATEGORIES.includes(item.component.category));
    }
    if (selectedRigFilter === 'peripherals') {
      return sortedInstalled.filter((item) => PERIPHERAL_CATEGORIES.includes(item.component.category));
    }
    return sortedInstalled.filter((item) => ACCESSORY_CATEGORIES.includes(item.component.category));
  }, [sortedInstalled, selectedRigFilter]);

  // Ultimi eventi avvenuti (più recenti per primi), con ordinamento deterministico
  const recentEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const diffCreated = (b.createdAt || '').localeCompare(a.createdAt || '');
      if (diffCreated !== 0) return diffCreated;
      return b.id.localeCompare(a.id);
    });
    return sorted.slice(0, settings.dashboardRecentCount || 7);
  }, [events, settings.dashboardRecentCount]);

  // Smart System Pulse (Centrale Operativa Hardware Reattiva e Pura)
  const systemPulse = useMemo(() => {
    const today = getLocalDateISO();

    // 1. Manutenzione PC
    const upcoming = computeUpcomingMaintenance(maintenanceEntries, today);
    let maintenancePulse: {
      status: 'amber' | 'ruby' | 'emerald' | 'primary';
      title: string;
      subtitle: string;
      targetSection: NavSection;
    };

    if (upcoming.length > 0) {
      const nextItem = upcoming[0];
      const dueDate = nextItem.nextDueDate!;
      const [ty, tm, td] = today.split('-').map(Number);
      const [ey, em, ed] = dueDate.split('-').map(Number);
      const diffDays = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        maintenancePulse = {
          status: 'ruby',
          title: 'Manutenzione Scaduta',
          subtitle: `${nextItem.title} (scaduta da ${Math.abs(diffDays)} gg)`,
          targetSection: 'maintenance',
        };
      } else if (diffDays <= 30) {
        const daysText = diffDays === 0 ? 'Oggi' : diffDays === 1 ? 'Domani' : `tra ${diffDays} gg`;
        maintenancePulse = {
          status: 'amber',
          title: 'Manutenzione in Arrivo',
          subtitle: `${nextItem.title} (${daysText})`,
          targetSection: 'maintenance',
        };
      } else {
        maintenancePulse = {
          status: 'emerald',
          title: 'Manutenzione Programmata',
          subtitle: `${nextItem.title} (tra ${diffDays} gg)`,
          targetSection: 'maintenance',
        };
      }
    } else if (maintenanceEntries.length > 0) {
      const sorted = sortMaintenanceEntriesChronologically(maintenanceEntries, 'desc');
      const last = sorted[0];
      maintenancePulse = {
        status: 'emerald',
        title: 'Manutenzione in Regola',
        subtitle: `Ultima: ${last.title} (${formatDate(last.date, settings.dateFormat)})`,
        targetSection: 'maintenance',
      };
    } else {
      maintenancePulse = {
        status: 'primary',
        title: 'Cura del PC & Salute',
        subtitle: 'Panoramica, telemetria live e diario interventi',
        targetSection: 'maintenance',
      };
    }

    // 2. Magazzino & Monetizzazione (Marketplace)
    const inStorage = components.filter((c) => getComponentComputed(c.id)?.status === 'IN_STORAGE');
    let inStorageTotalPurchase = 0;
    for (const c of inStorage) {
      const compEvents = events.filter((e) => e.componentId === c.id);
      const purchase = compEvents.find((e) => e.type === 'PURCHASE') as PurchaseEvent | undefined;
      inStorageTotalPurchase += purchase?.price || 0;
    }

    const storagePulse = inStorage.length > 0
      ? {
          status: 'emerald' as const,
          title: `${inStorage.length} ${inStorage.length === 1 ? 'Pezzo a Magazzino' : 'Pezzi a Magazzino'}`,
          subtitle: `€${inStorageTotalPurchase.toFixed(0)} capitale fermo • Vendi o riutilizza`,
          targetSection: 'marketplace' as NavSection,
        }
      : {
          status: 'primary' as const,
          title: 'Magazzino Vuoto',
          subtitle: 'Tutto l’hardware è montato o dismesso',
          targetSection: 'marketplace' as NavSection,
        };

    // 3. Garanzie Hardware
    const expiringWarranties: { name: string; humanLabel: string }[] = [];
    let activeWarrantiesCount = 0;

    for (const c of components) {
      const status = getComponentComputed(c.id)?.status;
      if (status === 'SOLD' || status === 'GIFTED' || status === 'DISPOSED') continue;
      const warranty = getComponentWarranty(c.id);
      if (warranty.hasWarranty) {
        if (warranty.isExpiringSoon) {
          expiringWarranties.push({ name: c.name, humanLabel: warranty.humanLabel });
        } else if (warranty.isActive) {
          activeWarrantiesCount++;
        }
      }
    }

    const warrantyPulse = expiringWarranties.length > 0
      ? {
          status: 'amber' as const,
          title: `${expiringWarranties.length} ${expiringWarranties.length === 1 ? 'Garanzia in Scadenza' : 'Garanzie in Scadenza'}`,
          subtitle: `${expiringWarranties[0].name} (${expiringWarranties[0].humanLabel})`,
          targetSection: 'archive' as NavSection,
        }
      : activeWarrantiesCount > 0
      ? {
          status: 'primary' as const,
          title: 'Copertura Garanzie',
          subtitle: `${activeWarrantiesCount} ${activeWarrantiesCount === 1 ? 'componente protetto' : 'componenti protetti'}`,
          targetSection: 'archive' as NavSection,
        }
      : {
          status: 'primary' as const,
          title: 'Garanzie Hardware',
          subtitle: 'Registra ricevute e scadenze',
          targetSection: 'archive' as NavSection,
        };

    // 4. Checkpoint / Time Travel / Upgrades
    let lifecyclePulse: {
      status: 'primary' | 'emerald';
      title: string;
      subtitle: string;
      targetSection: NavSection;
    };

    if (checkpoints.length > 0) {
      const lastCp = checkpoints[checkpoints.length - 1];
      lifecyclePulse = {
        status: 'primary',
        title: `${checkpoints.length} ${checkpoints.length === 1 ? 'Snapshot Salvato' : 'Snapshot Salvati'}`,
        subtitle: `Ultimo: ${lastCp.name} • Time Travel`,
        targetSection: 'time-travel',
      };
    } else if (upgrades.length > 0) {
      lifecyclePulse = {
        status: 'emerald',
        title: `${upgrades.length} ${upgrades.length === 1 ? 'Upgrade Storico' : 'Upgrade Storici'}`,
        subtitle: 'Traccia la cronologia generazionale',
        targetSection: 'upgrades',
      };
    } else {
      lifecyclePulse = {
        status: 'primary',
        title: 'Time Travel & Snapshot',
        subtitle: 'Salva uno snapshot del PC attuale',
        targetSection: 'time-travel',
      };
    }

    return {
      maintenance: maintenancePulse,
      storage: storagePulse,
      warranty: warrantyPulse,
      lifecycle: lifecyclePulse,
    };
  }, [
    components,
    events,
    maintenanceEntries,
    upgrades,
    checkpoints,
    settings.dateFormat,
    getComponentComputed,
    getComponentWarranty,
  ]);

  if (isLoading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Inizializzazione IndexedDB...</div>;
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ShoppingBag size={15} color="var(--accent-ruby)" />;
      case 'INSTALL':
        return <Wrench size={15} color="var(--accent-primary)" />;
      case 'UNINSTALL':
        return <Package size={15} color="var(--accent-amber)" />;
      case 'SALE':
        return <DollarSign size={15} color="var(--accent-emerald)" />;
      case 'EXTRA_EXPENSE':
        return <ShoppingBag size={15} color="var(--accent-ruby)" />;
      case 'GIFT':
        return <Gift size={15} color="var(--accent-indigo)" />;
      case 'DISPOSAL':
        return <Recycle size={15} color="var(--text-muted)" />;
      default:
        return <Activity size={15} color="var(--text-muted)" />;
    }
  };

  const formatEventDetails = (ev: ComponentEvent) => {
    switch (ev.type) {
      case 'PURCHASE':
        return `Prezzo: €${ev.price.toFixed(2)}${ev.store ? ` • Negozio: ${ev.store}` : ''}`;
      case 'INSTALL':
        return ev.slotOrLocation ? `Alloggiamento: ${ev.slotOrLocation}` : 'Montato nel case';
      case 'UNINSTALL':
        return `Motivo: ${ev.reason ? UNINSTALL_REASON_LABELS[ev.reason] || ev.reason : 'Smontato a magazzino'}`;
      case 'SALE': {
        const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
        return `Netto incassato: €${net.toFixed(2)}${ev.platform ? ` • ${ev.platform}` : ''}`;
      }
      case 'EXTRA_EXPENSE':
        return `Importo: €${ev.amount.toFixed(2)} • ${ev.description}`;
      case 'GIFT':
        return `Donato a: ${ev.recipient || 'Non specificato'}`;
      case 'DISPOSAL':
        return `Smaltimento: ${ev.disposalMethod}`;
      default:
        return '';
    }
  };

  const getEventFinancialDelta = (ev: ComponentEvent) => {
    switch (ev.type) {
      case 'PURCHASE':
        return ev.price > 0 ? { text: `-€${ev.price.toFixed(2)}`, color: 'var(--accent-ruby)' } : null;
      case 'EXTRA_EXPENSE':
        return ev.amount > 0 ? { text: `-€${ev.amount.toFixed(2)}`, color: 'var(--accent-ruby)' } : null;
      case 'SALE': {
        const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
        return { text: `+€${net.toFixed(2)}`, color: 'var(--accent-emerald)' };
      }
      default:
        return null;
    }
  };

  const isDatabaseEmpty = components.length === 0 && events.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* STATO VUOTO DELIBERATO: Database Vuoto */}
      {isDatabaseEmpty && (
        <div className="card animate-slide-up" style={{ padding: '32px 24px', textAlign: 'center', borderColor: 'var(--border-default)' }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 16px' }}>
            <Database size={26} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Nessun Componente Registrato
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Il tuo database locale è pronto. Inizia a configurare il tuo PC aggiungendo il primo componente hardware.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onOpenCreateModal && (
              <button onClick={onOpenCreateModal} className="btn btn-primary micro-press" id="btn-add-first-component">
                <Plus size={15} />
                <span>Aggiungi il Primo Componente</span>
              </button>
            )}
            {onOpenWikiArticle && (
              <button
                type="button"
                onClick={() => onOpenWikiArticle('first-rig-setup')}
                className="btn btn-secondary micro-press"
                style={{ fontSize: '13px' }}
              >
                <BookOpen size={14} color="var(--accent-primary)" />
                <span>Guida Primi Passi</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Intestazione Metriche Finanziarie con Pill Contestuale */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '-10px', marginTop: '-4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Metriche Economiche Fondamentali
        </span>
        {onOpenWikiArticle && (
          <button
            type="button"
            className="contextual-help-pill"
            onClick={() => onOpenWikiArticle('the-four-financial-metrics')}
            title="Spiegazione formale delle 4 metriche finanziarie di PC Tracker"
          >
            <BookOpen size={12} />
            <span>Spiegazione 4 Metriche</span>
          </button>
        )}
      </div>

      {/* LIVELLO 1: 4 Metriche Finanziarie Formalizzate (Apple-Style Staggered con Halo Cromatico) */}
      <div style={gridStyle}>
        <div className="stat-card stat-card-ruby animate-slide-up stagger-1">
          <div className="stat-card-header">
            <span className="stat-label">Totale Acquistato Storico</span>
            <div className="stat-icon-badge">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-ruby)' }}>
            € {totalPurchased.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <span className="stat-subtext">Ogni euro speso per hardware</span>
        </div>

        <div className="stat-card stat-card-emerald animate-slide-up stagger-2">
          <div className="stat-card-header">
            <span className="stat-label">Totale Recuperato Vendite</span>
            <div className="stat-icon-badge">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            € {totalRecovered.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <span className="stat-subtext">Netto incassato da pezzi dismessi</span>
        </div>

        <div className="stat-card stat-card-primary animate-slide-up stagger-3">
          <div className="stat-card-header">
            <span className="stat-label">Costo Netto Storico</span>
            <div className="stat-icon-badge">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            € {historicalNetCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <span className="stat-subtext">Esborso a fondo perduto complessivo</span>
        </div>

        <div className="stat-card stat-card-indigo animate-slide-up stagger-4">
          <div className="stat-card-header">
            <span className="stat-label">Costo Configurazione Attuale</span>
            <div className="stat-icon-badge">
              <Cpu size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-indigo)' }}>
            € {currentRigCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <span className="stat-subtext">Costo pezzi attualmente montati</span>
        </div>
      </div>

      {/* LIVELLO 1.5: Smart System Pulse (Centrale Operativa Hardware) */}
      {!isDatabaseEmpty && (
        <div className="dashboard-system-pulse animate-slide-up stagger-4" role="region" aria-label="Centrale Operativa Hardware">
          {/* Pill Manutenzione */}
          <div
            className={`system-pulse-pill system-pulse-${systemPulse.maintenance.status}`}
            onClick={() => onNavigate && onNavigate(systemPulse.maintenance.targetSection)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate(systemPulse.maintenance.targetSection)}
            title="Apri Registro Manutenzione PC"
          >
            <div className="system-pulse-left">
              <div className="system-pulse-icon">
                {systemPulse.maintenance.status === 'ruby' || systemPulse.maintenance.status === 'amber' ? (
                  <AlertCircle size={18} />
                ) : (
                  <Wrench size={18} />
                )}
              </div>
              <div className="system-pulse-content">
                <span className="system-pulse-title">{systemPulse.maintenance.title}</span>
                <span className="system-pulse-subtitle">{systemPulse.maintenance.subtitle}</span>
              </div>
            </div>
            <div className="system-pulse-right">
              <ArrowRight size={14} style={{ opacity: 0.6 }} />
            </div>
          </div>

          {/* Pill Magazzino & Vendite */}
          <div
            className={`system-pulse-pill system-pulse-${systemPulse.storage.status}`}
            onClick={() => onNavigate && onNavigate(systemPulse.storage.targetSection)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate(systemPulse.storage.targetSection)}
            title="Apri Vendite & Annunci (Marketplace)"
          >
            <div className="system-pulse-left">
              <div className="system-pulse-icon">
                <Tag size={18} />
              </div>
              <div className="system-pulse-content">
                <span className="system-pulse-title">{systemPulse.storage.title}</span>
                <span className="system-pulse-subtitle">{systemPulse.storage.subtitle}</span>
              </div>
            </div>
            <div className="system-pulse-right">
              <ArrowRight size={14} style={{ opacity: 0.6 }} />
            </div>
          </div>

          {/* Pill Garanzie Hardware */}
          <div
            className={`system-pulse-pill system-pulse-${systemPulse.warranty.status}`}
            onClick={() => onNavigate && onNavigate(systemPulse.warranty.targetSection)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate(systemPulse.warranty.targetSection)}
            title="Gestisci garanzie e ricevute nell'Archivio"
          >
            <div className="system-pulse-left">
              <div className="system-pulse-icon">
                {systemPulse.warranty.status === 'amber' ? (
                  <ShieldAlert size={18} />
                ) : (
                  <ShieldCheck size={18} />
                )}
              </div>
              <div className="system-pulse-content">
                <span className="system-pulse-title">{systemPulse.warranty.title}</span>
                <span className="system-pulse-subtitle">{systemPulse.warranty.subtitle}</span>
              </div>
            </div>
            <div className="system-pulse-right">
              <ArrowRight size={14} style={{ opacity: 0.6 }} />
            </div>
          </div>

          {/* Pill Time Travel & Snapshot */}
          <div
            className={`system-pulse-pill system-pulse-${systemPulse.lifecycle.status}`}
            onClick={() => onNavigate && onNavigate(systemPulse.lifecycle.targetSection)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate(systemPulse.lifecycle.targetSection)}
            title="Esplora la macchina nel tempo (Time Travel)"
          >
            <div className="system-pulse-left">
              <div className="system-pulse-icon">
                <History size={18} />
              </div>
              <div className="system-pulse-content">
                <span className="system-pulse-title">{systemPulse.lifecycle.title}</span>
                <span className="system-pulse-subtitle">{systemPulse.lifecycle.subtitle}</span>
              </div>
            </div>
            <div className="system-pulse-right">
              <ArrowRight size={14} style={{ opacity: 0.6 }} />
            </div>
          </div>
        </div>
      )}

      {/* LIVELLO 2: Rig Attuale in Sintesi (visibile se showRigSynthesis !== false) */}
      {settings.showRigSynthesis !== false && (
        <section className="dashboard-widget-card animate-slide-up stagger-4" aria-label="Rig Attuale in Sintesi">
          <div className="dashboard-widget-header">
            <div className="dashboard-widget-title-group">
              <h2 className="dashboard-widget-title">
                <Cpu size={18} color="var(--accent-primary)" />
                <span>{settings.rigName ? `${settings.rigName} in Sintesi` : 'Rig Attuale in Sintesi'}</span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="dashboard-widget-subtitle">
                  {installedCount > 0
                    ? `${installedCount} componenti attualmente operativi nel PC`
                    : 'Nessun componente attualmente montato nel PC'}
                </span>
                {installedCount > 0 && powerBudget.hasAnyPowerData && (
                  <span className="power-budget-compact-pill" title={powerBudget.completenessNotice}>
                    <Zap size={12} color="var(--accent-amber)" />
                    {powerBudget.isCompleteEstimate ? (
                      <>
                        <span>~{powerBudget.estimatedPeakWatts} W picco</span>
                        {powerBudget.psuCapacityWatts && (
                          <>
                            <span style={{ opacity: 0.4 }}>•</span>
                            <span>PSU {powerBudget.psuCapacityWatts} W</span>
                          </>
                        )}
                        {powerBudget.estimatedHeadroomWatts !== null && (
                          <>
                            <span style={{ opacity: 0.4 }}>•</span>
                            <span>Margine ~{powerBudget.estimatedHeadroomWatts} W</span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span>~{powerBudget.knownPowerWatts} W noti</span>
                        {powerBudget.psuCapacityWatts && (
                          <>
                            <span style={{ opacity: 0.4 }}>•</span>
                            <span>PSU {powerBudget.psuCapacityWatts} W</span>
                          </>
                        )}
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ color: 'var(--accent-amber)' }}>Stima parziale</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Filtro Rapido per Categoria del Rig Attuale */}
              {installedCount > 0 && (
                <div className="rig-filter-pills" role="tablist" aria-label="Filtro rapido categorie componenti">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedRigFilter === 'all'}
                    className={`rig-filter-btn ${selectedRigFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedRigFilter('all')}
                  >
                    <span>Tutti</span>
                    <span className="rig-filter-count">{rigCounts.all}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedRigFilter === 'internals'}
                    className={`rig-filter-btn ${selectedRigFilter === 'internals' ? 'active' : ''}`}
                    onClick={() => setSelectedRigFilter('internals')}
                    title="Componenti interni: CPU, GPU, Motherboard, RAM, Storage, PSU, Cooling, Case"
                  >
                    <span>Interni</span>
                    <span className="rig-filter-count">{rigCounts.internals}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedRigFilter === 'peripherals'}
                    className={`rig-filter-btn ${selectedRigFilter === 'peripherals' ? 'active' : ''}`}
                    onClick={() => setSelectedRigFilter('peripherals')}
                    title="Monitor, Cuffie, Mouse, Tastiera, Gamepad, Scheda Audio"
                  >
                    <span>Periferiche</span>
                    <span className="rig-filter-count">{rigCounts.peripherals}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedRigFilter === 'accessories'}
                    className={`rig-filter-btn ${selectedRigFilter === 'accessories' ? 'active' : ''}`}
                    onClick={() => setSelectedRigFilter('accessories')}
                    title="Accessori, Cavi, Hub ventole, Controller RGB, Adattatori"
                  >
                    <span>Accessori</span>
                    <span className="rig-filter-count">{rigCounts.accessories}</span>
                  </button>
                </div>
              )}

              {installedCount > 0 && onOpenExportModal && (
                <button
                  type="button"
                  onClick={onOpenExportModal}
                  className="btn btn-secondary micro-press"
                  style={{ fontSize: '12px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  title="Esporta o condividi la scheda tecnica per Gemini, Discord, WhatsApp o PDF"
                  id="btn-dashboard-export-rig"
                >
                  <Share2 size={13} color="var(--accent-primary)" />
                  <span>Esporta Scheda</span>
                </button>
              )}

              <button
                onClick={() => onNavigate && onNavigate('current-rig')}
                className="dashboard-widget-link micro-press"
                title="Apri la schermata completa Il Mio PC"
              >
                <span>Apri Il Mio PC</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {installedCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '12px', fontSize: '13.5px' }}>
                Non hai ancora montato componenti nel tuo PC attuale.
              </p>
              <button
                onClick={() => {
                  if (onOpenQuickSetup) {
                    onOpenQuickSetup();
                  } else if (onNavigate) {
                    onNavigate('current-rig');
                  }
                }}
                className="btn btn-primary micro-press"
                style={{ fontSize: '13px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} />
                <span>Configura il tuo PC (Quick Setup)</span>
              </button>
            </div>
          ) : filteredInstalled.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px', marginBottom: '10px' }}>
                Nessun componente montato in questa categoria.
              </p>
              <button
                type="button"
                className="btn btn-secondary micro-press"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={() => setSelectedRigFilter('all')}
              >
                Mostra Tutti i Componenti ({installedCount})
              </button>
            </div>
          ) : (
            <div className="rig-synthesis-grid">
              {filteredInstalled.map(({ component, computed }) => {
                const categoryLabel = COMPONENT_CATEGORY_LABELS[component.category] || component.category;
                return (
                  <div
                    key={component.id}
                    className="rig-synthesis-item"
                    data-category={component.category}
                    onClick={() => onSelectComponent && onSelectComponent(component.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectComponent && onSelectComponent(component.id)}
                    title={`Visualizza dettaglio di ${component.name}`}
                    aria-label={`Componente ${component.name}, categoria ${categoryLabel}, ${computed.daysInUse} giorni d'uso`}
                  >
                    <div className="rig-synthesis-icon" data-category={component.category}>
                      <ComponentIcon category={component.category} name={component.name} size={17} />
                    </div>
                    <div className="rig-synthesis-info">
                      <span className="rig-synthesis-category">{categoryLabel}</span>
                      <span className="rig-synthesis-name">{component.name}</span>
                      <div className="rig-synthesis-meta">
                        <span
                          className="badge badge-in-use"
                          style={{ fontSize: '11.5px', padding: '2px 7px' }}
                        >
                          {computed.daysInUse} gg d'uso
                        </span>
                        {computed.totalPurchaseCost > 0 && (
                          <span
                            className="font-mono"
                            style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' }}
                          >
                            €{computed.totalPurchaseCost.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* LIVELLO 3 & 4: Ultimi Movimenti Hardware & Azione Contestuale Essenziale */}
      <section className="dashboard-widget-card animate-slide-up stagger-5" aria-label="Ultimi Movimenti Hardware">
        <div className="dashboard-widget-header">
          <div className="dashboard-widget-title-group">
            <h2 className="dashboard-widget-title">
              <Activity size={18} color="var(--accent-emerald)" />
              <span>Ultimi Movimenti Hardware</span>
            </h2>
            <span className="dashboard-widget-subtitle">
              Le variazioni, gli acquisti e le installazioni più recenti registrate su IndexedDB
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* LIVELLO 4: CTA contestuale essenziale compatta (senza card duplicate) */}
            {(onOpenMovementSelector || onOpenCreateModal) && (
              <button
                onClick={onOpenMovementSelector || onOpenCreateModal}
                className="btn btn-secondary micro-press"
                style={{ fontSize: '12px', padding: '5px 12px', height: '30px' }}
                title="Registra una nuova variazione hardware"
              >
                <Plus size={13} />
                <span>Nuovo Movimento</span>
              </button>
            )}

            <button
              onClick={() => onNavigate && onNavigate('archive')}
              className="dashboard-widget-link micro-press"
              title="Visualizza tutto lo storico nell'Archivio"
            >
              <span>Vedi Archivio Completo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {recentEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '13.5px', marginBottom: '10px' }}>
              Nessun movimento o evento ancora registrato nello storico.
            </p>
            {(onOpenMovementSelector || onOpenCreateModal) && (
              <button
                onClick={onOpenMovementSelector || onOpenCreateModal}
                className="btn btn-secondary micro-press"
                style={{ fontSize: '12.5px', margin: '0 auto' }}
              >
                <Plus size={13} />
                <span>Registra il Primo Movimento</span>
              </button>
            )}
          </div>
        ) : (
          <div className="movements-feed-list">
            {recentEvents.map((ev, index) => {
              const comp = components.find((c) => c.id === ev.componentId);
              const eventTypeLabel = EVENT_TYPE_LABELS[ev.type] || ev.type;
              const details = formatEventDetails(ev);
              const delta = getEventFinancialDelta(ev);
              const isMostRecent = index === 0;

              return (
                <div
                  key={ev.id}
                  className="movement-feed-row"
                  style={isMostRecent ? { borderLeft: '3px solid var(--accent-primary)' } : undefined}
                  onClick={() => onSelectComponent && onSelectComponent(ev.componentId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectComponent && onSelectComponent(ev.componentId)}
                  title={`Apri scheda componente: ${comp?.name || 'Componente'}`}
                  aria-label={`${eventTypeLabel}: ${comp?.name || 'Componente'}, data ${formatDate(ev.date, settings.dateFormat)}`}
                >
                  <div className="movement-feed-left">
                    <div className="movement-feed-icon-wrap">
                      {getEventIcon(ev.type)}
                    </div>
                    <div className="movement-feed-content">
                      <div className="movement-feed-title">
                        <span>{comp?.name || 'Componente sconosciuto'}</span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-surface)',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {eventTypeLabel}
                        </span>
                        {isMostRecent && (
                          <span
                            className="badge badge-in-use"
                            style={{ fontSize: '11.5px', padding: '2px 7px', fontWeight: 600 }}
                          >
                            Più recente
                          </span>
                        )}
                      </div>
                      {details && <span className="movement-feed-desc">{details}</span>}
                    </div>
                  </div>

                  <div className="movement-feed-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {delta && (
                        <span
                          className="font-mono"
                          style={{ fontSize: '12px', fontWeight: 600, color: delta.color }}
                        >
                          {delta.text}
                        </span>
                      )}
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDate(ev.date, settings.dateFormat)}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      Dettaglio
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px',
};
