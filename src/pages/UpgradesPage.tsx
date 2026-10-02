import React, { useState, useMemo } from 'react';
import { usePCStore } from '../store';
import {
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_STATUS_LABELS,
  ComponentCategory,
} from '../types';
import { computeUpgradeSummary } from '../domain/upgradeEngine';
import { useI18n, TranslationKey } from '../locales';
import {
  ArrowRight,
  Calendar,
  History,
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  Info,
  Plus,
  Bookmark,
  BookOpen,
} from 'lucide-react';

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

const COMPONENT_STATUS_KEYS: Record<string, TranslationKey> = {
  IN_USE: 'status_in_use',
  IN_STORAGE: 'status_in_storage',
  SOLD: 'status_sold',
  GIFTED: 'status_gifted',
  DISPOSED: 'status_disposed',
};

interface UpgradesPageProps {
  onSelectComponent?: (id: string) => void;
  onOpenUpgradeWizard?: () => void;
  onOpenWikiArticle?: (articleId: string) => void;
}

export const UpgradesPage: React.FC<UpgradesPageProps> = ({
  onSelectComponent,
  onOpenUpgradeWizard,
  onOpenWikiArticle,
}) => {
  const { upgrades, components, events, getComponentComputed, checkpoints } = usePCStore();
  const { t, formatCurrency, formatDate } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calcola i riepiloghi per ciascun upgrade
  const computedUpgrades = useMemo(() => {
    return upgrades
      .map((up) => {
        try {
          return computeUpgradeSummary(up, components, events);
        } catch {
          return null;
        }
      })
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .sort((a, b) => b.upgrade.date.localeCompare(a.upgrade.date));
  }, [upgrades, components, events]);

  // Metriche cumulative globali degli upgrade
  const aggregateStats = useMemo(() => {
    return computedUpgrades.reduce(
      (acc, curr) => {
        acc.totalNewCost += curr.newComponentCost;
        acc.totalRecovered += curr.oldComponentRecovered;
        acc.totalNetCost += curr.netUpgradeCost;
        return acc;
      },
      { totalNewCost: 0, totalRecovered: 0, totalNetCost: 0 }
    );
  }, [computedUpgrades]);

  // Categorie uniche presenti tra gli upgrade registrati
  const availableCategories = useMemo(() => {
    const set = new Set<ComponentCategory>();
    for (const item of computedUpgrades) {
      set.add(item.upgrade.category);
    }
    return Array.from(set);
  }, [computedUpgrades]);

  // Filtraggio per ricerca testuale e categoria
  const filteredUpgrades = useMemo(() => {
    return computedUpgrades.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.newComponent.name.toLowerCase().includes(q) ||
        item.newComponent.brand.toLowerCase().includes(q) ||
        (item.oldComponent && item.oldComponent.name.toLowerCase().includes(q)) ||
        (item.oldComponent && item.oldComponent.brand.toLowerCase().includes(q)) ||
        (item.upgrade.notes && item.upgrade.notes.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' || item.upgrade.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [computedUpgrades, searchQuery, selectedCategory]);

  const getCategoryLabel = (cat: ComponentCategory) => {
    const key = COMPONENT_CATEGORY_KEYS[cat];
    return key ? t(key) : COMPONENT_CATEGORY_LABELS[cat] || cat;
  };

  const getStatusLabel = (status: string) => {
    const key = COMPONENT_STATUS_KEYS[status];
    return key ? t(key) : COMPONENT_STATUS_LABELS[status as keyof typeof COMPONENT_STATUS_LABELS] || status;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* KPI Riassuntivi in Alto */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="stat-card stat-card-primary">
          <div className="stat-card-header">
            <span className="stat-label">{t('upgrades_kpi_generations')}</span>
            <div className="stat-icon-badge">
              <History size={18} />
            </div>
          </div>
          <div className="stat-value">{upgrades.length}</div>
          <span className="stat-subtext">{t('upgrades_kpi_generations_sub')}</span>
        </div>

        <div className="stat-card stat-card-ruby">
          <div className="stat-card-header">
            <span className="stat-label">{t('upgrades_kpi_spending_new')}</span>
            <div className="stat-icon-badge">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">
            {formatCurrency(aggregateStats.totalNewCost)}
          </div>
          <span className="stat-subtext">{t('upgrades_kpi_spending_new_sub')}</span>
        </div>

        <div className="stat-card stat-card-emerald">
          <div className="stat-card-header">
            <span className="stat-label">{t('upgrades_kpi_recovered_old')}</span>
            <div className="stat-icon-badge">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">
            {formatCurrency(aggregateStats.totalRecovered)}
          </div>
          <span className="stat-subtext">{t('upgrades_kpi_recovered_old_sub')}</span>
        </div>

        <div className="stat-card stat-card-indigo">
          <div className="stat-card-header">
            <span className="stat-label">{t('upgrades_kpi_net_cost')}</span>
            <div className="stat-icon-badge">
              <History size={18} />
            </div>
          </div>
          <div
            className="stat-value font-mono"
            style={{ color: aggregateStats.totalNetCost > 0 ? 'var(--text-primary)' : 'var(--accent-emerald)' }}
          >
            {formatCurrency(aggregateStats.totalNetCost)}
          </div>
          <span className="stat-subtext">{t('upgrades_kpi_net_cost_sub')}</span>
        </div>
      </div>

      {/* Barra Ricerca e Filtro Categoria */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder={t('upgrades_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--text-muted)" />
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
          >
            <option value="all">{t('upgrades_category_filter_all', { count: computedUpgrades.length })}</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>

          {onOpenWikiArticle && (
            <button
              type="button"
              className="contextual-help-pill"
              onClick={() => onOpenWikiArticle('upgrade-wizard-guide')}
              title={t('upgrades_guide_tooltip')}
            >
              <BookOpen size={13} />
              <span>{t('upgrades_guide_btn')}</span>
            </button>
          )}

          {onOpenUpgradeWizard && (
            <button
              onClick={onOpenUpgradeWizard}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }}
              title={t('upgrades_new_btn_tooltip')}
            >
              <Plus size={15} />
              <span>{t('upgrades_new_btn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista Upgrade o Empty State */}
      {filteredUpgrades.length === 0 ? (
        <div className="empty-state-box animate-fade-in">
          <History size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {t('upgrades_empty_title')}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.4, marginBottom: '14px' }}>
            {searchQuery || selectedCategory !== 'all'
              ? t('upgrades_empty_filter_desc')
              : t('upgrades_empty_zero_desc')}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onOpenUpgradeWizard && (
              <button onClick={onOpenUpgradeWizard} className="btn btn-primary micro-press" style={{ fontSize: '13px' }}>
                <Plus size={15} />
                <span>{t('upgrades_empty_first_btn')}</span>
              </button>
            )}
            {onOpenWikiArticle && (
              <button
                type="button"
                onClick={() => onOpenWikiArticle('upgrade-wizard-guide')}
                className="btn btn-secondary micro-press"
                style={{ fontSize: '13px' }}
              >
                <BookOpen size={14} color="var(--accent-primary)" />
                <span>{t('upgrades_empty_how_btn')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredUpgrades.map((item, index) => {
            const { upgrade, oldComponent, newComponent, newComponentCost, oldComponentRecovered, netUpgradeCost } = item;
            const newComputed = getComponentComputed(newComponent.id);
            const oldComputed = oldComponent ? getComponentComputed(oldComponent.id) : undefined;

            const associatedCheckpoint = checkpoints.find((cp) => cp.relatedUpgradeId === upgrade.id);

            return (
              <div
                key={upgrade.id}
                className={`upgrade-card animate-slide-up stagger-${(index % 5) + 1}`}
              >
                {/* 1. Header riga upgrade: Categoria, Data Sostituzione, Checkpoint Associato, ID */}
                <div className="upgrade-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="category-chip">
                      {getCategoryLabel(upgrade.category)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span>{t('upgrades_card_date', { date: formatDate(upgrade.date) })}</span>
                    </div>
                    {associatedCheckpoint && (
                      <div className="upgrade-checkpoint-pill" title={t('upgrades_card_checkpoint_tooltip', { name: associatedCheckpoint.name })}>
                        <Bookmark size={12} color="var(--accent-primary)" />
                        <span>{t('upgrades_card_checkpoint_label', { name: associatedCheckpoint.name })}</span>
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ID: <span className="font-mono">{upgrade.id}</span>
                  </span>
                </div>

                {/* 2. RAPPRESENTAZIONE PRINCIPALE: VECCHIO → SOSTITUZIONE → NUOVO */}
                <div className="upgrade-transition-row">
                  {/* BOX VECCHIO COMPONENTE */}
                  <div
                    className={`upgrade-component-box ${oldComponent && onSelectComponent ? 'upgrade-component-box-interactive' : ''}`}
                    onClick={() => oldComponent && onSelectComponent?.(oldComponent.id)}
                    title={oldComponent ? t('upgrades_card_prev_click_tooltip', { name: oldComponent.name }) : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {t('upgrades_card_prev_label')}
                      </span>
                      {oldComputed && (
                        <span
                          className={`badge ${
                            oldComputed.status === 'SOLD'
                              ? 'badge-sold'
                              : oldComputed.status === 'IN_STORAGE'
                              ? 'badge-in-storage'
                              : 'badge-disposed'
                          }`}
                          style={{ fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          {getStatusLabel(oldComputed.status)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25, overflowWrap: 'break-word' }}>
                      {oldComponent ? oldComponent.name : t('upgrades_card_prev_empty')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>{oldComponent ? `${oldComponent.brand} • ${oldComponent.model}` : t('upgrades_card_prev_new_entry')}</span>
                      {oldComponent && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {getCategoryLabel(oldComponent.category)}
                        </span>
                      )}
                    </div>

                    {oldComponent && (
                      <div style={{ fontSize: '11.5px', marginTop: '2px', color: oldComponentRecovered > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                        {oldComponentRecovered > 0 ? (
                          <span>{t('upgrades_card_prev_recovered', { amount: formatCurrency(oldComponentRecovered) })}</span>
                        ) : (
                          <span>{t('upgrades_card_prev_historical', { amount: formatCurrency(oldComputed?.totalPurchaseCost || 0) })}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FRECCIA INDICATORE DI TRANSIZIONE */}
                  <div className="upgrade-arrow-badge">
                    <div className="upgrade-arrow-badge-icon">
                      <ArrowRight size={16} />
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
                      {t('upgrades_card_replaced_with')}
                    </span>
                  </div>

                  {/* BOX NUOVO COMPONENTE */}
                  <div
                    className={`upgrade-component-box ${onSelectComponent ? 'upgrade-component-box-interactive' : ''}`}
                    onClick={() => onSelectComponent?.(newComponent.id)}
                    title={t('upgrades_card_next_click_tooltip', { name: newComponent.name })}
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {t('upgrades_card_next_label')}
                      </span>
                      {newComputed && (
                        <span
                          className={`badge ${
                            newComputed.status === 'IN_USE'
                              ? 'badge-in-use'
                              : 'badge-in-storage'
                          }`}
                          style={{ fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          {getStatusLabel(newComputed.status)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25, overflowWrap: 'break-word' }}>
                      {newComponent.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>{newComponent.brand} • {newComponent.model}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {getCategoryLabel(newComponent.category)}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', marginTop: '2px', color: 'var(--accent-ruby)' }}>
                      {t('upgrades_card_next_purchase', { amount: formatCurrency(newComponentCost) })}
                    </div>
                  </div>
                </div>

                {/* 3. DIFFERENZIALE ECONOMICO SUBORDINATO */}
                <div className="upgrade-metrics-strip">
                  <div className="upgrade-metric-item">
                    <span className="upgrade-metric-label">{t('upgrades_strip_cost_new')}</span>
                    <span className="upgrade-metric-value" style={{ color: 'var(--accent-ruby)' }}>
                      {formatCurrency(newComponentCost)}
                    </span>
                  </div>

                  <div className="upgrade-metric-item">
                    <span className="upgrade-metric-label">{t('upgrades_strip_recovered_old')}</span>
                    <span className="upgrade-metric-value" style={{ color: oldComponentRecovered > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {oldComponentRecovered > 0 ? `+ ${formatCurrency(oldComponentRecovered)}` : formatCurrency(0)}
                    </span>
                  </div>

                  <div className="upgrade-metric-item" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
                    <span className="upgrade-metric-label">{t('upgrades_strip_net_cost')}</span>
                    <span
                      className="upgrade-metric-value"
                      style={{
                        fontSize: '15px',
                        color: netUpgradeCost <= 0 ? 'var(--accent-emerald)' : 'var(--text-primary)',
                      }}
                    >
                      {formatCurrency(netUpgradeCost)}
                    </span>
                  </div>
                </div>

                {/* 4. NOTE DELL'UPGRADE */}
                {upgrade.notes && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-app)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      lineHeight: 1.4,
                      borderLeft: '3px solid var(--border-default)',
                    }}
                  >
                    <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{upgrade.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
