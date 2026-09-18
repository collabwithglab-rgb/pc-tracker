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

interface StatsPageProps {
  onSelectComponent?: (id: string) => void;
  onOpenWikiArticle?: (articleId: string) => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ onSelectComponent, onOpenWikiArticle }) => {
  const { rigStats } = usePCStore();

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
              Statistiche & Analisi Storica
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Analisi economica, longevità hardware e andamento investimenti derivati deterministicamente dalla cronologia eventi.
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
            Nessun dato registrato
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
            Aggiungi componenti o registra acquisti e movimenti per popolare i grafici e visualizzare le metriche storiche del PC.
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
            Statistiche & Analisi Storica
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Analisi economica, longevità hardware e andamento investimenti derivati deterministicamente dalla cronologia eventi.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenWikiArticle && (
            <button
              type="button"
              className="contextual-help-pill micro-press"
              onClick={() => onOpenWikiArticle('the-four-financial-metrics')}
              title="Come vengono calcolate le 4 metriche finanziarie? Leggi la guida ufficiale"
            >
              <BookOpen size={13} color="var(--accent-primary)" />
              <span>Guida Formule Finanziarie</span>
            </button>
          )}
          <div className="stats-time-pill">
            <Calendar size={13} />
            <span>
              {timeRange.firstYear && timeRange.lastYear
                ? `${timeRange.firstYear} → ${timeRange.lastYear} (${timeRange.totalYearsCount} anni solari)`
                : 'Nessun evento registrato'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-primary)' }}>{timeRange.totalComponentsCount} componenti</span>
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
            <span className="stat-label">Spesa Storica Totale</span>
            <div className="stat-icon-badge">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="stat-value">
            € {financial.totalPurchased.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext">
            Totale uscite per acquisti hardware e spese accessorie
          </div>
        </div>

        {/* KPI 2: Costo Netto Storico */}
        <div className="stat-card stat-card-primary">
          <div className="stat-card-header">
            <span className="stat-label">Costo Netto Storico</span>
            <div className="stat-icon-badge">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-value">
            € {financial.historicalNetCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext">
            Spesa reale a fondo perduto al netto dei ricavi da vendita
          </div>
        </div>

        {/* KPI 3: Recuperato dalle Vendite */}
        <div className="stat-card stat-card-emerald">
          <div className="stat-card-header">
            <span className="stat-label">Recuperato dalle Vendite</span>
            <div className="stat-icon-badge">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value">
            € {financial.totalRecovered.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext">
            {financial.soldComponentsCount > 0 ? (
              <>
                {financial.soldComponentsCount}{' '}
                {financial.soldComponentsCount === 1 ? 'pezzo venduto' : 'pezzi venduti'} (
                {financial.recoveryRateOnSold}% recupero sul venduto)
              </>
            ) : (
              'Nessun componente venduto finora'
            )}
          </div>
        </div>

        {/* KPI 4: Media Giorni d'Uso */}
        <div className="stat-card stat-card-indigo">
          <div className="stat-card-header">
            <span className="stat-label">Media Giorni d'Uso</span>
            <div className="stat-icon-badge">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value">{longevity.avgDaysInUseActive} gg</div>
          <div className="stat-subtext">
            Mediana: {longevity.medianDaysInUse} gg • {longevity.neverMountedCount} mai montati
          </div>
        </div>
      </div>

      {/* SEZIONE 1 — SPESA PER CATEGORIA HARDWARE */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
              Spesa per Categoria Hardware
            </h3>
            <span className="stats-section-subtitle">
              Distribuzione percentuale e valore monetario cumulato (acquisti ed extra spese).
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
                    {cat.componentsCount} {cat.componentsCount === 1 ? 'componente' : 'componenti'}
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
                      Top Spesa
                    </span>
                  )}
                </div>
                <div className="stats-category-right">
                  <span className="stats-category-spent">
                    € {cat.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
              Nessuna categoria presente.
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
              Spesa nel Tempo (Evoluzione Annuale Cash Flow)
            </h3>
            <span className="stats-section-subtitle">
              Flussi finanziari per data di acquisto o spesa accessoria sostenuta.
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
              Anno di Picco: {peakYear.year} (€ {peakYear.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })} • {peakYear.percentage}%)
            </span>
          )}
        </div>

        {/* Timeline Sequenziale Compatta */}
        {years.length > 0 && (
          <div className="stats-years-timeline-strip">
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Andamento:</span>
            {years.map((y, index) => (
              <React.Fragment key={y.year}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: y.isPeakYear ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: y.isPeakYear ? 700 : 500,
                  }}
                >
                  {y.year} (€ {y.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
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
                    Picco
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
                  <span className="stats-year-amount">
                    € {y.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="stats-year-pct">{y.percentage}% del totale</span>
                </div>
              </div>
            );
          })}
          {years.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
              Nessun dato annuale disponibile.
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
              Longevità Hardware & Ammortamento (€/die)
            </h3>
            <span className="stats-section-subtitle">
              Analisi dell'effettivo tempo di utilizzo nel PC e del costo al giorno per ciascun pezzo.
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
              Componente Più Longevo
            </div>
            <div className="stats-spotlight-name">
              {longevity.mostUsedComponent?.name || 'N/D'}
            </div>
            <div className="stats-spotlight-value" style={{ color: 'var(--accent-indigo)' }}>
              {longevity.mostUsedComponent ? `${longevity.mostUsedComponent.daysInUse} giorni` : '0 gg'}
            </div>
            <div className="stats-spotlight-meta">
              {longevity.mostUsedComponent
                ? `Categoria: ${COMPONENT_CATEGORY_LABELS[longevity.mostUsedComponent.category] || longevity.mostUsedComponent.category}`
                : 'Nessun componente montato'}
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
              Miglior Ammortamento al Giorno
            </div>
            <div className="stats-spotlight-name">
              {longevity.bestCostPerDayComponent?.name || 'N/D'}
            </div>
            <div className="stats-spotlight-value" style={{ color: 'var(--accent-emerald)' }}>
              {longevity.bestCostPerDayComponent
                ? `€ ${longevity.bestCostPerDayComponent.costPerDay.toFixed(2)} / die`
                : 'N/D'}
            </div>
            <div className="stats-spotlight-meta">
              {longevity.bestCostPerDayComponent
                ? `Usato per ${longevity.bestCostPerDayComponent.daysInUse} giorni con costo netto di € ${longevity.bestCostPerDayComponent.netCost.toFixed(2)}`
                : 'Nessun componente ammortizzato'}
            </div>
          </div>
        </div>

        {/* Tabella Dettagliata della Longevità */}
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Componente</th>
                <th>Categoria</th>
                <th>Stato</th>
                <th>Giorni d'Uso</th>
                <th style={{ textAlign: 'right' }}>Costo / Giorno</th>
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
                        ? 'In Uso'
                        : item.status === 'SOLD'
                        ? 'Venduto'
                        : 'Magazzino'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {item.daysInUse > 0 ? `${item.daysInUse} gg` : '0 gg'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {item.daysInUse > 0 && item.costPerDay !== null ? (
                      `€ ${item.costPerDay.toFixed(2)} / die`
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        — Mai montato
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {longevity.componentDurations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nessun componente montato finora.
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
              Top 5 Componenti Più Costosi (Investimento Storico)
            </h3>
            <span className="stats-section-subtitle">
              Classifica dei pezzi per spesa storica complessiva (acquisto + extra spese).
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
                  title={item.isSold ? 'Venduto' : 'In Uso / Attivo'}
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
                <span className="stats-ranking-net">
                  Netto: € {item.netCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
                <span className="stats-ranking-price">
                  € {item.totalHistoricalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
          {topExpensive.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
              Nessun componente da mostrare.
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
              Analisi Recupero Vendite
            </h3>
            <span className="stats-section-subtitle">
              Bilancio economico per ciascun componente ceduto con relativo tasso di recupero.
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
              Totale Incassato: € {financial.totalRecovered.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {soldComponents.length > 0 ? (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Componente</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Spesa Storica</th>
                  <th style={{ textAlign: 'right' }}>Ricavo Netto Incassato</th>
                  <th style={{ textAlign: 'right' }}>Saldo Netto</th>
                  <th style={{ textAlign: 'right' }}>% Recuperata</th>
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
                      € {item.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      € {item.netRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
                      € {item.deltaBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
            Nessun componente venduto finora. Le cessioni registrate compariranno qui con il relativo tasso di recupero.
          </div>
        )}
      </section>

      {/* SEZIONE 6 — SINTESI STORICO UPGRADE */}
      <section className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title-group">
            <h3 className="stats-section-title">
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              Sintesi Storico Upgrade
            </h3>
            <span className="stats-section-subtitle">
              Riepilogo economico dei passaggi generazionali calcolato direttamente da upgradeEngine.
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
              Categoria più aggiornata:{' '}
              <strong style={{ color: 'var(--accent-primary)' }}>
                {COMPONENT_CATEGORY_LABELS[upgrades.mostUpgradedCategory] || upgrades.mostUpgradedCategory}
              </strong>{' '}
              ({upgrades.categoryCount[upgrades.mostUpgradedCategory]} upgrade)
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
                Upgrade Registrati
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {upgrades.totalUpgrades}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Cambi generazionali tracciati
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
                Investimento Nuovi Pezzi
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                € {upgrades.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Spesa sostenuta per i ricambi subentrati
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
                Recupero da Cessioni
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                € {upgrades.totalRecovered.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Ricavi netti dalla vendita dei pezzi sostituiti
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
                Costo Netto Upgrade
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                € {upgrades.totalNetCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Effettiva spesa incrementale degli upgrade
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
            Nessun upgrade registrato finora. I passaggi generazionali tracciati compariranno qui.
          </div>
        )}
      </section>
    </div>
  );
};
