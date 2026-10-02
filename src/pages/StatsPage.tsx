import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Activity,
  Clock,
  Flame,
  Award,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { usePCStore } from '../store';
import { COMPONENT_CATEGORY_LABELS, ComponentCategory } from '../types';
import { useTranslation } from '../locales';

interface StatsPageProps {
  onSelectComponent?: (id: string) => void;
  onOpenWikiArticle?: (articleId: string) => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ onSelectComponent, onOpenWikiArticle }) => {
  const { rigStats } = usePCStore();
  const { t, formatCurrency } = useTranslation();

  const {
    timeRange,
    financial,
    categories,
    years,
    peakYear,
    longevity,
    topExpensive,
    soldComponents,
    upgrades,
  } = rigStats;

  // Massimo importo speso tra gli anni per scalare l'altezza delle barre verticali
  const maxYearSpending = Math.max(...years.map((y) => y.totalSpent), 1);

  if (timeRange.totalComponentsCount === 0) {
    return (
      <div className="stats-page-container">
        <div className="stats-header-banner">
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t('stats_title')}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {t('stats_subtitle')}
            </p>
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-2xl) var(--space-lg)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)',
          }}
        >
          <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)', opacity: 0.5 }} />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {t('stats_empty_title')}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
            {t('stats_empty_desc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page-container">
      {/* HEADER BANNER CON ARCO TEMPORALE */}
      <div className="stats-header-banner">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {t('stats_title')}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {t('stats_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenWikiArticle && (
            <button
              type="button"
              className="contextual-help-pill micro-press"
              onClick={() => onOpenWikiArticle('the-four-financial-metrics')}
              title={t('stats_wiki_tooltip')}
            >
              <BookOpen size={13} color="var(--accent-primary)" />
              <span>{t('stats_wiki_btn')}</span>
            </button>
          )}
          <div className="stats-time-pill">
            <Calendar size={13} />
            <span>
              {timeRange.firstYear && timeRange.lastYear
                ? t('stats_time_range', {
                    firstYear: timeRange.firstYear,
                    lastYear: timeRange.lastYear,
                    years: timeRange.totalYearsCount,
                  })
                : t('stats_no_events')}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {t('stats_components_count', { count: timeRange.totalComponentsCount })}
            </span>
          </div>
        </div>
      </div>

      {/* KPI HERO STRIP (4 METRICHE CHIAVE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* KPI 1: Spesa Storica Totale */}
        <div className="stat-card stat-card-ruby">
          <div className="stat-card-header">
            <span className="stat-label">{t('stats_kpi_total_spent')}</span>
            <div className="stat-icon-badge">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">
            {formatCurrency(financial.totalPurchased)}
          </div>
          <div className="stat-subtext">
            {t('stats_kpi_total_spent_sub')}
          </div>
        </div>

        {/* KPI 2: Costo Netto Storico */}
        <div className="stat-card stat-card-primary">
          <div className="stat-card-header">
            <span className="stat-label">{t('stats_kpi_net_cost')}</span>
            <div className="stat-icon-badge">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">
            {formatCurrency(financial.historicalNetCost)}
          </div>
          <div className="stat-subtext">
            {t('stats_kpi_net_cost_sub')}
          </div>
        </div>

        {/* KPI 3: Recuperato dalle Vendite */}
        <div className="stat-card stat-card-emerald">
          <div className="stat-card-header">
            <span className="stat-label">{t('stats_kpi_recovered')}</span>
            <div className="stat-icon-badge">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">
            {formatCurrency(financial.totalRecovered)}
          </div>
          <div className="stat-subtext">
            {financial.soldComponentsCount > 0 ? (
              financial.soldComponentsCount === 1 ? (
                t('stats_kpi_recovered_sub_single', {
                  count: 1,
                  rate: financial.recoveryRateOnSold,
                })
              ) : (
                t('stats_kpi_recovered_sub_multi', {
                  count: financial.soldComponentsCount,
                  rate: financial.recoveryRateOnSold,
                })
              )
            ) : (
              t('stats_kpi_recovered_none')
            )}
          </div>
        </div>

        {/* KPI 4: Media Giorni d'Uso */}
        <div className="stat-card stat-card-indigo">
          <div className="stat-card-header">
            <span className="stat-label">{t('stats_kpi_avg_days')}</span>
            <div className="stat-icon-badge">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">{longevity.avgDaysInUseActive} {t('stats_days_unit')}</div>
          <div className="stat-subtext">
            {t('stats_kpi_avg_days_sub', {
              median: longevity.medianDaysInUse,
              never: longevity.neverMountedCount,
            })}
          </div>
        </div>
      </div>

      {/* SEZIONE 1 — SPESA PER CATEGORIA HARDWARE */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
              {t('stats_section_cat_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_cat_sub')}
            </span>
          </div>
        </div>

        <div className="stats-category-list">
          {categories.map((cat, idx) => (
            <div key={cat.category} className="stats-category-item">
              <div className="stats-category-header">
                <div className="stats-category-left">
                  <span className="stats-category-name">
                    {COMPONENT_CATEGORY_LABELS[cat.category] || cat.category}
                  </span>
                  <span className="stats-category-count-badge">
                    {cat.componentsCount === 1
                      ? t('stats_cat_component_single')
                      : t('stats_cat_component_multi', { count: cat.componentsCount })}
                  </span>
                  {idx === 0 && cat.totalSpent > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(244, 63, 94, 0.12)',
                        color: 'var(--accent-ruby)',
                        border: '1px solid var(--accent-ruby-border)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('stats_top_spending_badge')}
                    </span>
                  )}
                </div>
                <div className="stats-category-right">
                  <span className="stats-category-spent font-mono">
                    {formatCurrency(cat.totalSpent)}
                  </span>
                  <span className="stats-category-pct-badge">{cat.percentage}%</span>
                </div>
              </div>
              <div className="stats-bar-track">
                <div
                  className={`stats-bar-fill ${idx === 0 && cat.totalSpent > 0 ? 'stats-bar-fill-top' : ''}`}
                  style={{
                    width: `${Math.min(Math.max(cat.percentage, 1), 100)}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
              {t('stats_cat_empty')}
            </div>
          )}
        </div>
      </section>

      {/* SEZIONE 2 — SPESA NEL TEMPO (CASH FLOW PER ANNO) */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
              {t('stats_section_years_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_years_sub')}
            </span>
          </div>
          {peakYear && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary-border)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              <Flame size={13} style={{ color: 'var(--accent-ruby)' }} />
              {t('stats_peak_year_badge', {
                year: peakYear.year,
                amount: formatCurrency(peakYear.totalSpent),
                pct: peakYear.percentage,
              })}
            </span>
          )}
        </div>

        {/* Timeline Sequenziale Compatta */}
        {years.length > 0 && (
          <div className="stats-years-timeline-strip">
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t('stats_trend_label')}</span>
            {years.map((y, index) => (
              <React.Fragment key={y.year}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: y.isPeakYear ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: y.isPeakYear ? 700 : 500,
                  }}
                >
                  {y.year} ({formatCurrency(y.totalSpent)})
                </span>
                {index < years.length - 1 && (
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Istogramma Verticale Puro CSS/SVG */}
        <div className="stats-years-grid">
          {years.map((y) => {
            const barHeightPct = Math.round((y.totalSpent / maxYearSpending) * 100);
            return (
              <div
                key={y.year}
                className={`stats-year-card ${y.isPeakYear ? 'stats-year-card-peak' : ''}`}
              >
                {y.isPeakYear && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Flame size={11} style={{ color: 'var(--accent-ruby)' }} />
                    {t('stats_peak_badge')}
                  </div>
                )}
                <span className="stats-year-label">{y.year}</span>
                <div className="stats-year-bar-box">
                  <div
                    className="stats-year-bar-fill"
                    style={{
                      height: `${Math.max(barHeightPct, 4)}%`,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span className="stats-year-amount font-mono">
                    {formatCurrency(y.totalSpent)}
                  </span>
                  <span className="stats-year-pct">{t('stats_year_pct_of_total', { pct: y.percentage })}</span>
                </div>
              </div>
            );
          })}
          {years.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
              {t('stats_years_empty')}
            </div>
          )}
        </div>
      </section>

      {/* SEZIONE 3 — LONGEVITÀ & AMMORTAMENTO (€/DIE) */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <Clock size={18} style={{ color: 'var(--accent-indigo)' }} />
              {t('stats_section_longevity_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_longevity_sub')}
            </span>
          </div>
        </div>

        {/* 2 Spotlight Cards */}
        <div className="stats-spotlight-grid">
          {/* Card 1: Componente più longevo */}
          <div
            className="stats-spotlight-card"
            style={{
              cursor: longevity.mostUsedComponent && onSelectComponent ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (longevity.mostUsedComponent && onSelectComponent) {
                onSelectComponent(longevity.mostUsedComponent.id);
              }
            }}
          >
            <div className="stats-spotlight-badge" style={{ color: 'var(--accent-indigo)' }}>
              <Award size={14} />
              {t('stats_spotlight_most_used')}
            </div>
            <div className="stats-spotlight-name">
              {longevity.mostUsedComponent?.name || 'N/D'}
            </div>
            <div className="stats-spotlight-value font-mono" style={{ color: 'var(--accent-indigo)' }}>
              {longevity.mostUsedComponent
                ? t('stats_spotlight_days', { days: longevity.mostUsedComponent.daysInUse })
                : `0 ${t('stats_days_unit')}`}
            </div>
            <div className="stats-spotlight-meta">
              {longevity.mostUsedComponent
                ? t('stats_spotlight_cat', {
                    cat:
                      COMPONENT_CATEGORY_LABELS[longevity.mostUsedComponent.category] ||
                      longevity.mostUsedComponent.category,
                  })
                : t('stats_spotlight_none_mounted')}
            </div>
          </div>

          {/* Card 2: Miglior ammortamento */}
          <div
            className="stats-spotlight-card"
            style={{
              cursor: longevity.bestCostPerDayComponent && onSelectComponent ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (longevity.bestCostPerDayComponent && onSelectComponent) {
                onSelectComponent(longevity.bestCostPerDayComponent.id);
              }
            }}
          >
            <div className="stats-spotlight-badge" style={{ color: 'var(--accent-emerald)' }}>
              <Sparkles size={14} />
              {t('stats_spotlight_best_amortization')}
            </div>
            <div className="stats-spotlight-name">
              {longevity.bestCostPerDayComponent?.name || 'N/D'}
            </div>
            <div className="stats-spotlight-value font-mono" style={{ color: 'var(--accent-emerald)' }}>
              {longevity.bestCostPerDayComponent
                ? t('stats_cost_per_day', {
                    amount: formatCurrency(longevity.bestCostPerDayComponent.costPerDay),
                  })
                : 'N/D'}
            </div>
            <div className="stats-spotlight-meta">
              {longevity.bestCostPerDayComponent
                ? t('stats_spotlight_amortization_sub', {
                    days: longevity.bestCostPerDayComponent.daysInUse,
                    netCost: formatCurrency(longevity.bestCostPerDayComponent.netCost),
                  })
                : t('stats_spotlight_none_amortized')}
            </div>
          </div>
        </div>

        {/* Tabella Dettagliata della Longevità */}
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('stats_th_component')}</th>
                <th>{t('stats_th_category')}</th>
                <th>{t('stats_th_status')}</th>
                <th>{t('stats_th_days_in_use')}</th>
                <th style={{ textAlign: 'right' }}>{t('stats_th_cost_per_day')}</th>
              </tr>
            </thead>
            <tbody>
              {longevity.componentDurations.map((item) => (
                <tr
                  key={item.id}
                  style={{ cursor: onSelectComponent ? 'pointer' : 'default' }}
                  onClick={() => onSelectComponent && onSelectComponent(item.id)}
                >
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                  <td>
                    {COMPONENT_CATEGORY_LABELS[item.category as ComponentCategory] || item.category}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          item.status === 'IN_USE'
                            ? 'var(--accent-primary-subtle)'
                            : item.status === 'SOLD'
                            ? 'var(--accent-emerald-subtle)'
                            : 'rgba(245, 158, 11, 0.12)',
                        color:
                          item.status === 'IN_USE'
                            ? 'var(--accent-primary)'
                            : item.status === 'SOLD'
                            ? 'var(--accent-emerald)'
                            : 'var(--accent-amber)',
                        border:
                          item.status === 'IN_USE'
                            ? '1px solid var(--accent-primary-border)'
                            : item.status === 'SOLD'
                            ? '1px solid var(--accent-emerald-border)'
                            : '1px solid var(--accent-amber-border)',
                      }}
                    >
                      {item.status === 'IN_USE'
                        ? t('stats_status_in_use')
                        : item.status === 'SOLD'
                        ? t('stats_status_sold')
                        : t('stats_status_storage')}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {item.daysInUse > 0 ? `${item.daysInUse} ${t('stats_days_unit')}` : `0 ${t('stats_days_unit')}`}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {item.daysInUse > 0 && item.costPerDay !== null ? (
                      t('stats_cost_per_day', { amount: formatCurrency(item.costPerDay) })
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {t('stats_never_mounted')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {longevity.componentDurations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {t('stats_longevity_empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEZIONE 4 — TOP 5 COMPONENTI PIÙ COSTOSI */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <Award size={18} style={{ color: 'var(--accent-ruby)' }} />
              {t('stats_section_top_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_top_sub')}
            </span>
          </div>
        </div>

        <div className="stats-ranking-list">
          {topExpensive.map((item, index) => (
            <div
              key={item.id}
              className="stats-ranking-item"
              style={{ cursor: onSelectComponent ? 'pointer' : 'default' }}
              onClick={() => onSelectComponent && onSelectComponent(item.id)}
            >
              <div className="stats-ranking-left">
                <span className={`stats-ranking-rank ${index === 0 ? 'stats-ranking-rank-top' : ''}`}>
                  #{index + 1}
                </span>
                <span
                  className="stats-ranking-dot"
                  style={{
                    backgroundColor: item.isSold ? 'var(--accent-emerald)' : 'var(--accent-primary)',
                  }}
                  title={item.isSold ? t('stats_top_status_sold_title') : t('stats_top_status_active_title')}
                />
                <div className="stats-ranking-info">
                  <span className="stats-ranking-name">{item.name}</span>
                  <span className="stats-ranking-category">
                    ({COMPONENT_CATEGORY_LABELS[item.category] || item.category})
                  </span>
                </div>
                <div className="stats-ranking-leader" />
              </div>
              <div className="stats-ranking-right">
                <span className="stats-ranking-net font-mono">
                  {t('stats_top_net', { amount: formatCurrency(item.netCost) })}
                </span>
                <span className="stats-ranking-price font-mono">
                  {formatCurrency(item.totalHistoricalCost)}
                </span>
              </div>
            </div>
          ))}
          {topExpensive.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
              {t('stats_top_empty')}
            </div>
          )}
        </div>
      </section>

      {/* SEZIONE 5 — ANALISI COMPONENTI VENDUTI */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <ArrowUpRight size={18} style={{ color: 'var(--accent-emerald)' }} />
              {t('stats_section_sales_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_sales_sub')}
            </span>
          </div>
          {soldComponents.length > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--accent-emerald)',
                fontWeight: 600,
              }}
            >
              {t('stats_sales_total_recovered', { amount: formatCurrency(financial.totalRecovered) })}
            </span>
          )}
        </div>

        {soldComponents.length > 0 ? (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>{t('stats_th_sales_component')}</th>
                  <th>{t('stats_th_sales_category')}</th>
                  <th style={{ textAlign: 'right' }}>{t('stats_th_sales_spent')}</th>
                  <th style={{ textAlign: 'right' }}>{t('stats_th_sales_revenue')}</th>
                  <th style={{ textAlign: 'right' }}>{t('stats_th_sales_balance')}</th>
                  <th style={{ textAlign: 'right' }}>{t('stats_th_sales_recovered_pct')}</th>
                </tr>
              </thead>
              <tbody>
                {soldComponents.map((item) => (
                  <tr
                    key={item.id}
                    style={{ cursor: onSelectComponent ? 'pointer' : 'default' }}
                    onClick={() => onSelectComponent && onSelectComponent(item.id)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>
                      {COMPONENT_CATEGORY_LABELS[item.category] || item.category}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(item.totalCost)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {formatCurrency(item.netRevenue)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: item.deltaBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-ruby)',
                      }}
                    >
                      {item.deltaBalance >= 0 ? '+' : ''}
                      {formatCurrency(item.deltaBalance)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--accent-emerald)',
                          border: '1px solid var(--accent-emerald-border)',
                        }}
                      >
                        {item.recoveryPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {t('stats_sales_empty')}
          </div>
        )}
      </section>

      {/* SEZIONE 6 — SINTESI STORICO UPGRADE */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              {t('stats_section_upgrades_title')}
            </h3>
            <span className="stats-section-subtitle">
              {t('stats_section_upgrades_sub')}
            </span>
          </div>
          {upgrades.mostUpgradedCategory && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-default)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-primary)',
              }}
            >
              {t('stats_upgrades_most_updated_category', {
                cat: COMPONENT_CATEGORY_LABELS[upgrades.mostUpgradedCategory] || upgrades.mostUpgradedCategory,
                count: upgrades.categoryCount[upgrades.mostUpgradedCategory] || 0,
              })}
            </span>
          )}
        </div>

        {upgrades.totalUpgrades > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {/* Card Upgrades Totali */}
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('stats_upgrades_card_count')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {upgrades.totalUpgrades}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('stats_upgrades_card_count_sub')}
              </span>
            </div>

            {/* Card Investimento Nuovo */}
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('stats_upgrades_card_invested')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(upgrades.totalInvested)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('stats_upgrades_card_invested_sub')}
              </span>
            </div>

            {/* Card Recupero Vecchi */}
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('stats_upgrades_card_recovered')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                {formatCurrency(upgrades.totalRecovered)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('stats_upgrades_card_recovered_sub')}
              </span>
            </div>

            {/* Card Costo Netto Upgrade */}
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('stats_upgrades_card_net')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {formatCurrency(upgrades.totalNetCost)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('stats_upgrades_card_net_sub')}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {t('stats_upgrades_empty')}
          </div>
        )}
      </section>
    </div>
  );
};
