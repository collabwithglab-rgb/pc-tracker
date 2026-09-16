import React, { useMemo } from 'react';
import {
  Cpu,
  Layers,
  Database,
  ArrowRight,
  Activity,
  ShoppingBag,
  Wrench,
  Package,
  DollarSign,
  Gift,
  Recycle,
  HardDrive,
  Zap,
  Fan,
  Monitor,
  Sliders,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { usePCStore } from '../store';
import { formatDate } from '../utils';
import { NavSection } from '../components/layout/Sidebar';
import {
  COMPONENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  UNINSTALL_REASON_LABELS,
  ComponentCategory,
  ComponentEvent,
} from '../types';

interface DashboardPageProps {
  onNavigate?: (section: NavSection) => void;
  onOpenCreateModal?: () => void;
  onOpenMovementSelector?: () => void;
  onSelectComponent?: (id: string) => void;
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

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenCreateModal,
  onOpenMovementSelector,
  onSelectComponent,
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
  } = usePCStore();

  const installed = getInstalledComponents();
  const installedCount = installed.length;

  // Ordina i componenti attualmente montati per importanza hardware
  const sortedInstalled = useMemo(() => {
    return [...installed].sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.component.category] || 99;
      const pB = CATEGORY_PRIORITY[b.component.category] || 99;
      if (pA !== pB) return pA - pB;
      return a.component.name.localeCompare(b.component.name);
    });
  }, [installed]);

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

  if (isLoading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Inizializzazione IndexedDB...</div>;
  }

  const getCategoryIcon = (category: ComponentCategory) => {
    switch (category) {
      case 'cpu':
        return <Cpu size={16} color="var(--accent-primary)" />;
      case 'gpu':
        return <Sliders size={16} color="var(--accent-primary)" />;
      case 'motherboard':
        return <Layers size={16} color="var(--accent-indigo)" />;
      case 'ram':
        return <Sliders size={16} color="var(--accent-indigo)" />;
      case 'storage':
        return <HardDrive size={16} color="var(--accent-primary)" />;
      case 'psu':
        return <Zap size={16} color="var(--accent-amber)" />;
      case 'cooling':
        return <Fan size={16} color="var(--accent-primary)" />;
      case 'case':
        return <Package size={16} color="var(--text-secondary)" />;
      case 'monitor':
        return <Monitor size={16} color="var(--accent-primary)" />;
      default:
        return <Cpu size={16} color="var(--accent-primary)" />;
    }
  };

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
          {onOpenCreateModal && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={onOpenCreateModal} className="btn btn-primary micro-press" id="btn-add-first-component">
                <Plus size={15} />
                <span>Aggiungi il Primo Componente</span>
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* LIVELLO 2: Rig Attuale in Sintesi (visibile se showRigSynthesis !== false) */}
      {settings.showRigSynthesis !== false && (
        <section className="dashboard-widget-card animate-slide-up stagger-4" aria-label="Rig Attuale in Sintesi">
          <div className="dashboard-widget-header">
            <div className="dashboard-widget-title-group">
              <h2 className="dashboard-widget-title">
                <Cpu size={18} color="var(--accent-primary)" />
                <span>{settings.rigName ? `${settings.rigName} in Sintesi` : 'Rig Attuale in Sintesi'}</span>
              </h2>
              <span className="dashboard-widget-subtitle">
                {installedCount > 0
                  ? `${installedCount} componenti attualmente operativi nel PC`
                  : 'Nessun componente attualmente montato nel PC'}
              </span>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('current-rig')}
              className="dashboard-widget-link micro-press"
              title="Apri la schermata completa Il Mio PC"
            >
              <span>Apri Il Mio PC</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {installedCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '12px', fontSize: '13.5px' }}>
                Non hai ancora montato componenti nel tuo PC attuale.
              </p>
              <button
                onClick={() => onNavigate && onNavigate('current-rig')}
                className="btn btn-primary micro-press"
                style={{ fontSize: '13px', margin: '0 auto' }}
              >
                Configura il tuo PC
              </button>
            </div>
          ) : (
            <div className="rig-synthesis-grid">
              {sortedInstalled.map(({ component, computed }) => {
                const categoryLabel = COMPONENT_CATEGORY_LABELS[component.category] || component.category;
                return (
                  <div
                    key={component.id}
                    className="rig-synthesis-item"
                    onClick={() => onSelectComponent && onSelectComponent(component.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectComponent && onSelectComponent(component.id)}
                    title={`Visualizza dettaglio di ${component.name}`}
                    aria-label={`Componente ${component.name}, categoria ${categoryLabel}, ${computed.daysInUse} giorni d'uso`}
                  >
                    <div className="rig-synthesis-icon">
                      {getCategoryIcon(component.category)}
                    </div>
                    <div className="rig-synthesis-info">
                      <span className="rig-synthesis-category">{categoryLabel}</span>
                      <span className="rig-synthesis-name">{component.name}</span>
                      <div className="rig-synthesis-meta">
                        <span
                          className="badge badge-in-use"
                          style={{ fontSize: '10px', padding: '1px 6px' }}
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
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--bg-surface)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {eventTypeLabel}
                        </span>
                        {isMostRecent && (
                          <span
                            className="badge badge-in-use"
                            style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 600 }}
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
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(ev.date, settings.dateFormat)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 500 }}>
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
