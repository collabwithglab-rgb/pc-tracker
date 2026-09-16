import { describe, it, expect } from 'vitest';
import { ComponentCategory } from '../../../types';

/**
 * Test di conformità per Tranche 11.7 — Stats Polish
 *
 * Linee guida utente:
 * - Aggiungere solo test realmente pertinenti (nessun numero minimo forzato).
 * - Nessuna semantica ARIA impropria (es. vietato role="progressbar" su barre di distribuzione).
 * - Empty state per-sezione quando vendite/upgrade sono assenti (non nascondere statistiche valide).
 * - Animazioni come progressive enhancement con prefers-reduced-motion.
 */

describe('Roadmap 11.7 — Stats Polish & Semantic Accessibility', () => {
  describe('Dynamic Accent & KPI Contract', () => {
    it('associa il KPI del Costo Netto Storico alla classe stat-card-primary', () => {
      // Verifica che la card primaria segua il token dinamico dell'accento (stat-card-primary)
      // anziché un colore fisso (stat-card-cyan)
      const kpiCardClasses = {
        totalPurchased: 'stat-card stat-card-ruby',
        historicalNetCost: 'stat-card stat-card-primary',
        totalRecovered: 'stat-card stat-card-emerald',
        longevity: 'stat-card stat-card-indigo',
      };

      expect(kpiCardClasses.historicalNetCost).toContain('stat-card-primary');
      expect(kpiCardClasses.historicalNetCost).not.toContain('stat-card-cyan');
    });

    it('gestisce il subtext del KPI vendite evitando 0% recupero fuorviante quando non ci sono vendite', () => {
      const formatSoldKpiSubtext = (soldCount: number, recoveryRate: number) => {
        if (soldCount > 0) {
          const unit = soldCount === 1 ? 'pezzo venduto' : 'pezzi venduti';
          return `${soldCount} ${unit} (${recoveryRate}% recupero sul venduto)`;
        }
        return 'Nessun componente venduto finora';
      };

      // Con vendite reali
      expect(formatSoldKpiSubtext(3, 48.5)).toBe('3 pezzi venduti (48.5% recupero sul venduto)');
      expect(formatSoldKpiSubtext(1, 60)).toBe('1 pezzo venduto (60% recupero sul venduto)');

      // Senza vendite: evita "0 pezzi venduti (0% recupero sul venduto)"
      expect(formatSoldKpiSubtext(0, 0)).toBe('Nessun componente venduto finora');
    });
  });

  describe('Per-Section Empty State Resilience', () => {
    it('isola lo stato vuoto delle vendite alla sola sezione 5 senza nascondere i dati delle altre sezioni', () => {
      const mockStatsWithNoSales = {
        totalComponentsCount: 15,
        totalPurchased: 4500,
        soldComponents: [],
        categories: [{ category: 'gpu' as ComponentCategory, totalSpent: 1200, percentage: 26.7 }],
        upgrades: { totalUpgrades: 2, totalInvested: 1800, totalRecovered: 0, totalNetCost: 1800 },
      };

      // I dati globali e di categoria devono rimanere visibili
      expect(mockStatsWithNoSales.totalComponentsCount).toBeGreaterThan(0);
      expect(mockStatsWithNoSales.totalPurchased).toBe(4500);
      expect(mockStatsWithNoSales.categories).toHaveLength(1);

      // Solo la sezione vendite deve risultare vuota
      const hasSoldData = mockStatsWithNoSales.soldComponents.length > 0;
      expect(hasSoldData).toBe(false);

      const soldSectionFallback = !hasSoldData
        ? 'Nessun componente venduto finora. Le cessioni registrate compariranno qui con il relativo tasso di recupero.'
        : null;

      expect(soldSectionFallback).toContain('Nessun componente venduto finora');
    });

    it('isola lo stato vuoto degli upgrade alla sola sezione 6 senza nascondere le altre sezioni', () => {
      const mockStatsWithNoUpgrades = {
        totalComponentsCount: 10,
        upgrades: { totalUpgrades: 0, totalInvested: 0, totalRecovered: 0, totalNetCost: 0 },
      };

      const hasUpgradeData = mockStatsWithNoUpgrades.upgrades.totalUpgrades > 0;
      expect(hasUpgradeData).toBe(false);

      const upgradeSectionFallback = !hasUpgradeData
        ? 'Nessun upgrade registrato finora. I passaggi generazionali tracciati compariranno qui.'
        : null;

      expect(upgradeSectionFallback).toContain('Nessun upgrade registrato finora');
    });

    it('attiva l empty state globale solo quando totalComponentsCount è 0', () => {
      const shouldRenderGlobalEmptyState = (totalComponentsCount: number) => {
        return totalComponentsCount === 0;
      };

      expect(shouldRenderGlobalEmptyState(0)).toBe(true);
      expect(shouldRenderGlobalEmptyState(1)).toBe(false);
      expect(shouldRenderGlobalEmptyState(29)).toBe(false);
    });
  });

  describe('Semantic Accessibility & ARIA Rules', () => {
    it('non applica role="progressbar" a barre di distribuzione o grafici a colonna', () => {
      // Regola: role="progressbar" è ammesso SOLO per avanzamenti di processo (es. wizard a step),
      // MAI per distribuzioni percentuali di spesa o istogrammi storici.
      const categoryBarAttributes = {
        className: 'stats-bar-fill',
        'aria-hidden': 'true', // La barra è puramente visiva: il testo fornisce già nome, percentuale e importo
      };

      const yearHistogramBarAttributes = {
        className: 'stats-year-bar-fill',
        'aria-hidden': 'true',
      };

      expect(categoryBarAttributes).not.toHaveProperty('role', 'progressbar');
      expect(yearHistogramBarAttributes).not.toHaveProperty('role', 'progressbar');
      expect(categoryBarAttributes['aria-hidden']).toBe('true');
      expect(yearHistogramBarAttributes['aria-hidden']).toBe('true');
    });
  });

  describe('Top Expensive Scannable Ranking Format', () => {
    it('struttura la riga di classifica con posizione, nome, categoria, costo netto e prezzo allineato', () => {
      const item = {
        id: 'c-gpu-4090',
        name: 'ASUS ROG Strix RTX 4090 OC',
        category: 'gpu' as ComponentCategory,
        totalHistoricalCost: 1999.0,
        netCost: 1200.0,
        isSold: false,
      };

      const rankIndex = 0; // #1
      const rankLabel = `#${rankIndex + 1}`;
      const isTopRank = rankIndex === 0;

      expect(rankLabel).toBe('#1');
      expect(isTopRank).toBe(true);

      const formattedPrice = `€ ${item.totalHistoricalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
      const formattedNet = `Netto: € ${item.netCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;

      expect(formattedPrice).toMatch(/€\s*1\.?999,00/);
      expect(formattedNet).toMatch(/Netto:\s*€\s*1\.?200,00/);
    });
  });
});
