import React from 'react';
import {
  Zap,
  Cpu,
  Layers,
  HardDrive,
  Fan,
  Box,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Info,
  HelpCircle,
} from 'lucide-react';
import { RigPowerBudget, ComponentCategory } from '../../types';

interface PowerBudgetCardProps {
  budget: RigPowerBudget;
}

export const PowerBudgetCard: React.FC<PowerBudgetCardProps> = ({ budget }) => {
  const getCategoryIcon = (category: ComponentCategory, size = 14) => {
    switch (category) {
      case 'cpu':
        return <Cpu size={size} color="var(--accent-primary)" />;
      case 'gpu':
        return <Sliders size={size} color="var(--accent-primary)" />;
      case 'motherboard':
        return <Layers size={size} color="var(--accent-indigo)" />;
      case 'ram':
        return <Box size={size} color="var(--accent-indigo)" />;
      case 'storage':
        return <HardDrive size={size} color="var(--accent-primary)" />;
      case 'cooling':
        return <Fan size={size} color="var(--accent-primary)" />;
      default:
        return <HelpCircle size={size} color="var(--text-muted)" />;
    }
  };

  const renderBadge = () => {
    // Se la stima è parziale, evidenziamo in modo trasparente l'incompletezza della base dati
    if (budget.isPartialEstimate) {
      return (
        <span className="power-budget-badge power-budget-badge-reduced" title="Alcuni componenti non hanno dati di potenza disponibili">
          <Info size={12} />
          <span>Stima di sistema parziale</span>
        </span>
      );
    }

    if (budget.isCompleteEstimate) {
      switch (budget.headroomStatus) {
        case 'high':
          return (
            <span className="power-budget-badge power-budget-badge-high" title="Margine stimato abbondante (>= 150 W)">
              <ShieldCheck size={12} />
              <span>Ampio margine stimato</span>
            </span>
          );
        case 'reduced':
          return (
            <span className="power-budget-badge power-budget-badge-reduced" title="Margine stimato ridotto (50-149 W)">
              <ShieldAlert size={12} />
              <span>Margine stimato ridotto</span>
            </span>
          );
        case 'critical':
          return (
            <span className="power-budget-badge power-budget-badge-critical" title="Margine stimato critico o insufficiente (< 50 W)">
              <ShieldAlert size={12} />
              <span>Margine critico o negativo</span>
            </span>
          );
      }
    }

    return (
      <span className="power-budget-badge power-budget-badge-unknown">
        <Info size={12} />
        <span>{budget.hasPsu ? 'Potenza PSU non specificata' : 'Alimentatore non registrato'}</span>
      </span>
    );
  };

  return (
    <section className="power-budget-card animate-slide-up" aria-label="Power Budget e Stima Consumi">
      {/* Header del Widget */}
      <div className="power-budget-header">
        <div className="power-budget-title-group">
          <h3 className="power-budget-title">
            <Zap size={17} color="var(--accent-amber)" />
            <span>Power Budget & Stima Consumi</span>
          </h3>
          {renderBadge()}
        </div>

        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Dati tecnici dichiarati & proxy di stima
        </span>
      </div>

      {/* Avviso Trasparente di Completezza Posizionato Accanto ai Valori */}
      {budget.isPartialEstimate && (
        <div className="power-budget-callout-banner">
          <Info size={15} style={{ flexShrink: 0, color: 'var(--accent-amber)', marginTop: '2px' }} />
          <div>
            <strong>Stima parziale:</strong> La potenza nota (<strong>~{budget.knownPowerWatts} W</strong>) riflette esclusivamente i componenti con specifiche disponibili (es. CPU e GPU). Margine residuo e utilizzo PSU dell&apos;intero sistema <strong>non sono determinabili con certezza</strong> in assenza di dati su tutte le parti montate.
          </div>
        </div>
      )}

      {/* KPI Fondamentali (4 Colonne Reattive) */}
      <div className="power-budget-kpi-grid">
        {/* KPI 1: Potenza Nota dei Componenti */}
        <div className="power-budget-kpi-card">
          <span className="power-budget-kpi-label">
            {budget.isCompleteEstimate ? 'Fabbisogno Stimato di Picco' : 'Potenza Nota dei Componenti'}
          </span>
          <div className="power-budget-kpi-value font-mono" style={{ color: 'var(--accent-primary)' }}>
            {budget.hasAnyPowerData ? `~${budget.knownPowerWatts} W` : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {budget.isCompleteEstimate
              ? 'Carico di picco stimato del sistema'
              : 'Somma dei soli carichi con dati noti'}
          </span>
        </div>

        {/* KPI 2: Capacità Nominale PSU */}
        <div className="power-budget-kpi-card">
          <span className="power-budget-kpi-label">Alimentatore (PSU)</span>
          <div className="power-budget-kpi-value font-mono" style={{ color: 'var(--accent-amber)' }}>
            {budget.psuCapacityWatts ? `${budget.psuCapacityWatts} W` : '—'}
          </div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={budget.psuComponent?.name || 'Alimentatore non registrato'}
          >
            {budget.psuComponent ? budget.psuComponent.name : 'Alimentatore non registrato'}
          </span>
        </div>

        {/* KPI 3: Utilizzo PSU Stimato */}
        <div className="power-budget-kpi-card">
          <span className="power-budget-kpi-label">Utilizzo PSU Stimato</span>
          <div className="power-budget-kpi-value font-mono" style={{ color: 'var(--text-primary)' }}>
            {budget.estimatedUtilizationPercent !== null ? `~${budget.estimatedUtilizationPercent}%` : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {budget.estimatedUtilizationPercent !== null
              ? 'Rapporto carico/capacità'
              : budget.isPartialEstimate
              ? 'Non determinabile (dati parziali)'
              : 'PSU o carico non noti'}
          </span>
        </div>

        {/* KPI 4: Margine PSU (Headroom) */}
        <div className="power-budget-kpi-card">
          <span className="power-budget-kpi-label">Margine PSU (Headroom)</span>
          <div
            className="power-budget-kpi-value font-mono"
            style={{
              color:
                budget.headroomStatus === 'high'
                  ? 'var(--accent-emerald)'
                  : budget.headroomStatus === 'reduced'
                  ? 'var(--accent-amber)'
                  : budget.headroomStatus === 'critical'
                  ? 'var(--accent-ruby)'
                  : 'var(--text-muted)',
            }}
          >
            {budget.estimatedHeadroomWatts !== null ? `~${budget.estimatedHeadroomWatts} W` : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {budget.estimatedHeadroomWatts !== null
              ? 'Potenza residua stimata'
              : budget.isPartialEstimate
              ? 'Non determinabile (dati parziali)'
              : 'Dati insufficienti'}
          </span>
        </div>
      </div>

      {/* Breakdown dei Contributi per Categoria */}
      {budget.categoryBreakdown.length > 0 && (
        <div className="power-budget-breakdown-section">
          <span className="power-budget-breakdown-title">Scomposizione per Categoria Hardware</span>
          <div className="power-budget-breakdown-grid">
            {budget.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="power-budget-breakdown-item">
                <div className="power-budget-breakdown-left">
                  {getCategoryIcon(cat.category)}
                  <span>{cat.categoryLabel}</span>
                </div>
                <div className="power-budget-breakdown-value font-mono">
                  {cat.totalWatts !== null ? (
                    <span style={{ color: 'var(--accent-primary)' }}>~{cat.totalWatts} W</span>
                  ) : (
                    <span
                      style={{ color: 'var(--text-muted)', fontWeight: 400 }}
                      title="Dato di potenza non dichiarato per questa categoria"
                    >
                      —
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota Informativa di Riferimento */}
      <div className="power-budget-notice">
        <Info size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
        <span>
          I parametri indicati si basano su TDP e valori dichiarati di targa. Non costituiscono una misurazione da sensori hardware in tempo reale.
        </span>
      </div>
    </section>
  );
};
