import React, { useState, useEffect } from 'react';
import { usePCStore } from '../store';
import { formatDate } from '../utils';
import {
  Component,
  COMPONENT_CATEGORY_LABELS,
  SaleEvent,
  MarketplaceTab,
  VALID_MARKETPLACE_TABS,
} from '../types';
import { formatUsageDuration } from '../domain';
import {
  Tag,
  DollarSign,
  Package,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Calendar,
  Sparkles,
  Layers,
  BookOpen,
} from 'lucide-react';

export type { MarketplaceTab };

interface MarketplacePageProps {
  onSelectComponent: (id: string) => void;
  onOpenSaleModal: (component?: Component) => void;
  onOpenListingModal: (component: Component) => void;
  onOpenWikiArticle?: (articleId: string) => void;
  requestedTab?: MarketplaceTab;
  onTabChange?: (tab: MarketplaceTab) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  onSelectComponent,
  onOpenSaleModal,
  onOpenListingModal,
  onOpenWikiArticle,
  requestedTab,
  onTabChange,
}) => {
  const {
    components,
    events,
    getComponentComputed,
    getComponentWarranty,
    settings,
  } = usePCStore();

  const [activeTab, setActiveTab] = useState<MarketplaceTab>(
    requestedTab && VALID_MARKETPLACE_TABS.includes(requestedTab) ? requestedTab : 'storage'
  );

  useEffect(() => {
    if (requestedTab && VALID_MARKETPLACE_TABS.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const handleTabChange = (tab: MarketplaceTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Filtra componenti per stato calcolato
  const storageComponents = components.filter(
    (c) => getComponentComputed(c.id)?.status === 'IN_STORAGE'
  );

  const soldComponents = components.filter(
    (c) => getComponentComputed(c.id)?.status === 'SOLD'
  );

  // Calcolo KPI Finanziari del Mercato
  let totalRecoveredSales = 0;
  for (const ev of events) {
    if (ev.type === 'SALE') {
      const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
      totalRecoveredSales += net;
    }
  }

  const storageTotalValue = storageComponents.reduce((acc, c) => {
    const compState = getComponentComputed(c.id);
    return acc + (compState?.totalPurchaseCost || 0);
  }, 0);

  // Mappa delle vendite con i dettagli dell'evento SALE
  const soldWithEvents = soldComponents.map((comp) => {
    const compEvents = events.filter((e) => e.componentId === comp.id);
    const saleEvent = compEvents
      .filter((e): e is SaleEvent => e.type === 'SALE')
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const computed = getComponentComputed(comp.id);
    return {
      component: comp,
      saleEvent,
      computed,
    };
  });

  return (
    <div style={styles.container}>
      {/* Header Pagina */}
      <div className="animate-slide-up" style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Tag size={22} color="var(--accent-primary)" />
            <span>Vendite & Annunci Marketplace</span>
          </h1>
          <p style={styles.subtitle}>
            Gestisci l'hardware a magazzino, genera annunci istantanei per Subito.it, eBay, Vinted e monitora gli incassi.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenWikiArticle && (
            <button
              type="button"
              className="contextual-help-pill micro-press"
              onClick={() => onOpenWikiArticle('listing-generator-guide')}
              title="Consigli per creare annunci efficaci e massimizzare il realizzo? Leggi la guida"
            >
              <BookOpen size={13} color="var(--accent-primary)" />
              <span>Guida Vendite & Annunci</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenSaleModal()}
            className="btn btn-secondary micro-press"
            style={{
              fontSize: '13px',
              padding: '8px 16px',
              color: 'var(--accent-emerald)',
              borderColor: 'var(--accent-emerald-border)',
              backgroundColor: 'var(--accent-emerald-subtle)',
            }}
          >
            <DollarSign size={15} />
            <span>+ Registra Vendita</span>
          </button>
        </div>
      </div>

      {/* Mini-Dashboard KPI Mercato Hardware */}
      <div style={styles.metricsGrid}>
        <div className="stat-card stat-card-indigo animate-slide-up stagger-1">
          <span className="stat-label">Pezzi a Magazzino</span>
          <span className="stat-value font-mono" style={{ color: 'var(--accent-amber)' }}>
            {storageComponents.length}
          </span>
          <span className="stat-subtext">Hardware pronto da vendere</span>
        </div>

        <div className="stat-card stat-card-emerald animate-slide-up stagger-2">
          <span className="stat-label">Totale Recuperato</span>
          <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            €{totalRecoveredSales.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </span>
          <span className="stat-subtext">Netto da tutte le vendite storiche</span>
        </div>

        <div className="stat-card animate-slide-up stagger-3">
          <span className="stat-label">Capitale a Magazzino</span>
          <span className="stat-value font-mono">
            €{storageTotalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </span>
          <span className="stat-subtext">Costo d'acquisto pezzi fermi</span>
        </div>

        <div className="stat-card animate-slide-up stagger-4">
          <span className="stat-label">Pezzi Venduti</span>
          <span className="stat-value font-mono" style={{ color: 'var(--text-primary)' }}>
            {soldComponents.length}
          </span>
          <span className="stat-subtext">Transazioni concluse nel tempo</span>
        </div>
      </div>

      {/* Barra Tab Switcher */}
      <div className="listing-tabs-bar animate-slide-up stagger-2" style={{ marginTop: '8px' }}>
        <button
          type="button"
          className={`listing-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => handleTabChange('storage')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <Package size={15} />
          <span>Pronti da Vendere (A Magazzino)</span>
          <span
            style={{
              fontSize: '11.5px',
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeTab === 'storage' ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
              color: activeTab === 'storage' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 600,
            }}
          >
            {storageComponents.length}
          </span>
        </button>

        <button
          type="button"
          className={`listing-tab-btn ${activeTab === 'sold' ? 'active' : ''}`}
          onClick={() => handleTabChange('sold')}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <DollarSign size={15} />
          <span>Hardware Venduto (Storico)</span>
          <span
            style={{
              fontSize: '11.5px',
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeTab === 'sold' ? 'var(--accent-emerald-subtle)' : 'var(--bg-surface)',
              color: activeTab === 'sold' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 600,
            }}
          >
            {soldComponents.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PEZZI A MAGAZZINO (PRONTI ALLA VENDITA) */}
      {activeTab === 'storage' && (
        <div className="animate-slide-up stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {storageComponents.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">
                <Package size={26} color="var(--accent-amber)" />
              </div>
              <h3 className="empty-state-title">Nessun pezzo a magazzino</h3>
              <p className="empty-state-desc">
                Tutti i componenti registrati sono attualmente installati nel PC oppure sono già stati venduti.
                Quando smonti un pezzo dal computer, comparirà subito qui pronto per la vendita.
              </p>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {storageComponents.map((comp) => {
                const computed = getComponentComputed(comp.id);
                const warranty = getComponentWarranty(comp.id);
                const usageText = formatUsageDuration(computed?.daysInUse || 0);

                return (
                  <div key={comp.id} className="card card-interactive" style={styles.itemCard}>
                    <div style={styles.itemTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="category-chip">
                          {COMPONENT_CATEGORY_LABELS[comp.category]}
                        </span>
                        <span className="badge badge-in-storage">A Magazzino</span>
                      </div>

                      <span className="font-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Costo: €{computed?.totalPurchaseCost.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <h3 style={styles.itemTitle}>{comp.name}</h3>
                      <p style={styles.itemModel}>
                        {comp.brand} {comp.model && `• ${comp.model}`}
                      </p>
                    </div>

                    {/* Metadati Chiave: Utilizzo e Garanzia */}
                    <div style={styles.metaRow}>
                      <div style={styles.metaItem}>
                        <Layers size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{usageText}</span>
                      </div>

                      {warranty.hasWarranty && warranty.status === 'active' && (
                        <div style={styles.metaItem}>
                          <ShieldCheck size={13} color="var(--accent-emerald)" />
                          <span style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>
                            Garanzia fino al {formatDate(warranty.expiryDate, settings.dateFormat)}
                          </span>
                        </div>
                      )}

                      {warranty.hasWarranty && warranty.status === 'expiring' && (
                        <div style={styles.metaItem}>
                          <ShieldAlert size={13} color="var(--accent-amber)" />
                          <span style={{ fontSize: '12px', color: 'var(--accent-amber)' }}>
                            In scadenza ({warranty.humanLabel.toLowerCase()})
                          </span>
                        </div>
                      )}

                      {(!warranty.hasWarranty || warranty.status === 'expired') && (
                        <div style={styles.metaItem}>
                          <ShieldX size={13} color="var(--text-secondary)" />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Garanzia terminata</span>
                        </div>
                      )}
                    </div>

                    {/* Barra Azioni Dirette: Genera Annuncio & Vendi */}
                    <div style={styles.actionsRow}>
                      <button
                        type="button"
                        onClick={() => onOpenListingModal(comp)}
                        className="btn btn-primary micro-press"
                        style={{ fontSize: '12.5px', padding: '6px 14px', flex: 1 }}
                        title="Genera testo annuncio per Subito.it, eBay, Vinted o Prompt IA"
                      >
                        <Sparkles size={14} />
                        <span>Genera Annuncio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenSaleModal(comp)}
                        className="btn btn-secondary micro-press"
                        style={{
                          fontSize: '12.5px',
                          padding: '6px 12px',
                          color: 'var(--accent-emerald)',
                          borderColor: 'var(--accent-emerald-border)',
                        }}
                        title="Registra vendita di questo componente"
                      >
                        <DollarSign size={14} />
                        <span>Vendi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectComponent(comp.id)}
                        className="btn btn-ghost micro-press"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        title="Visualizza scheda tecnica completa"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTRO HARDWARE VENDUTO */}
      {activeTab === 'sold' && (
        <div className="animate-slide-up stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {soldWithEvents.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">
                <DollarSign size={26} color="var(--accent-emerald)" />
              </div>
              <h3 className="empty-state-title">Nessuna vendita registrata</h3>
              <p className="empty-state-desc">
                Non hai ancora registrato vendite di componenti. Quando venderai un pezzo a magazzino,
                troverai qui tutto lo storico dettagliato con prezzi, piattaforme e ricavi.
              </p>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {soldWithEvents.map(({ component: comp, saleEvent, computed }) => {
                const netPrice = saleEvent
                  ? (saleEvent.price || 0) - (saleEvent.shippingCost || 0) - (saleEvent.fees || 0)
                  : 0;

                return (
                  <div key={comp.id} className="card card-interactive" style={styles.itemCard}>
                    <div style={styles.itemTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="category-chip">
                          {COMPONENT_CATEGORY_LABELS[comp.category]}
                        </span>
                        <span className="badge badge-sold">Venduto</span>
                      </div>

                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        +€{netPrice.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <h3 style={styles.itemTitle}>{comp.name}</h3>
                      <p style={styles.itemModel}>
                        {comp.brand} {comp.model && `• ${comp.model}`}
                      </p>
                    </div>

                    {/* Dettagli della Vendita */}
                    <div style={styles.metaRow}>
                      <div style={styles.metaItem}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Venduto il {saleEvent?.date ? formatDate(saleEvent.date, settings.dateFormat) : '—'}
                        </span>
                      </div>

                      {saleEvent?.platform && (
                        <div style={styles.metaItem}>
                          <ShoppingBag size={13} color="var(--accent-primary)" />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Piattaforma: <strong>{saleEvent.platform}</strong>
                          </span>
                        </div>
                      )}

                      {saleEvent?.buyer && (
                        <div style={styles.metaItem}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Acquirente: {saleEvent.buyer}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ ...styles.metaRow, paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Costo acquisto originario: €{computed?.totalPurchaseCost.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Costo netto reale: €{computed?.netCost.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onSelectComponent(comp.id)}
                        className="btn btn-secondary micro-press"
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        <span>Visualizza Scheda</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  subtitle: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
    gap: '16px',
  },
  itemCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
  },
  itemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  itemTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  itemModel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '10px',
    borderTop: '1px solid var(--border-subtle)',
  },
};
