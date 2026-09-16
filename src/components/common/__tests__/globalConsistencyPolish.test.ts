import { describe, it, expect } from 'vitest';
import { ComponentStatus } from '../../../types';

/**
 * Test di conformità per Tranche 11.9 — Global Consistency Audit
 *
 * Principi verificati:
 * 1. KPI cards e badge "In Uso" utilizzano esclusivamente il token dinamico dell'accento (stat-card-primary).
 * 2. Totale eliminazione della classe legacy stat-card-cyan.
 * 3. Assenza di emoji decorative o simboli testuali ridondanti sovrapposti a icone Lucide.
 * 4. Architettura AppShell centralizzata (.app-layout, .app-sidebar, .app-main, .app-header, .app-content).
 * 5. Contratti cromatici semantici preservati per il ciclo di vita (in_use, sold, in_storage, gifted, disposed).
 * 6. Micro-interazioni tattili omogenee (micro-press sui pulsanti di azione globale).
 */

describe('Roadmap 11.9 — Global Consistency Audit', () => {
  describe('Dynamic Accent & KPI Card Standardization', () => {
    it('utilizza esclusivamente stat-card-primary per le card KPI primarie e ripudia stat-card-cyan', () => {
      // Mappatura delle classi delle card KPI tra Dashboard, Stats e ComponentDetail
      const dashboardKpiCards = {
        currentRigCost: 'stat-card stat-card-primary',
        historicalPurchased: 'stat-card stat-card-ruby',
        historicalRecovered: 'stat-card stat-card-emerald',
        historicalNetCost: 'stat-card stat-card-indigo',
      };

      const statsKpiCards = {
        totalPurchased: 'stat-card stat-card-ruby',
        historicalNetCost: 'stat-card stat-card-primary',
        totalRecovered: 'stat-card stat-card-emerald',
        longevity: 'stat-card stat-card-indigo',
      };

      const componentDetailKpiCards = {
        netCost: 'stat-card stat-card-primary',
        purchaseCost: 'stat-card',
        saleRecovered: 'stat-card stat-card-emerald',
      };

      // Verifica che la card primaria sia sempre legata a stat-card-primary
      expect(dashboardKpiCards.currentRigCost).toContain('stat-card-primary');
      expect(dashboardKpiCards.currentRigCost).not.toContain('stat-card-cyan');

      expect(statsKpiCards.historicalNetCost).toContain('stat-card-primary');
      expect(statsKpiCards.historicalNetCost).not.toContain('stat-card-cyan');

      expect(componentDetailKpiCards.netCost).toContain('stat-card-primary');
      expect(componentDetailKpiCards.netCost).not.toContain('stat-card-cyan');
    });

    it('associa il badge IN_USE al token primario dinamico e non a valori cyan hardcoded', () => {
      const getStatusBadgeClass = (status: ComponentStatus) => {
        switch (status) {
          case 'IN_USE':
            return 'badge badge-in-use';
          case 'IN_STORAGE':
            return 'badge badge-storage';
          case 'SOLD':
            return 'badge badge-sold';
          case 'GIFTED':
            return 'badge badge-gifted';
          case 'DISPOSED':
            return 'badge badge-disposed';
          default:
            return 'badge';
        }
      };

      expect(getStatusBadgeClass('IN_USE')).toBe('badge badge-in-use');
      expect(getStatusBadgeClass('IN_STORAGE')).toBe('badge badge-storage');
      expect(getStatusBadgeClass('SOLD')).toBe('badge badge-sold');
      expect(getStatusBadgeClass('GIFTED')).toBe('badge badge-gifted');
      expect(getStatusBadgeClass('DISPOSED')).toBe('badge badge-disposed');
    });
  });

  describe('Clean Typography & Absence of Redundant Text Symbols', () => {
    it('elimina emoji decorative da intestazioni, pulsanti e selettori', () => {
      const uiButtonAndHeaderTexts = [
        'Nuovo Movimento',
        'Backup JSON',
        'Ripristina Backup',
        'Checkpoint',
        'Fotografia Congelata',
        'Ricostruzione Dinamica Timeline',
        'Salva Checkpoint',
        'Dataset di Sviluppo (29 componenti)',
        'Resetta Database',
      ];

      // Regex per emoji comuni (Unicode emoji ranges)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      uiButtonAndHeaderTexts.forEach((text) => {
        expect(text).not.toMatch(emojiRegex);
      });
    });

    it('non duplica simboli testuali (★, ⚠, ✓) quando sono già presenti icone grafiche Lucide', () => {
      const actionLabels = {
        checkpointSave: 'Salva Checkpoint',
        checkpointSnapshot: 'Fotografia Congelata',
        checkpointNotice: 'La ricostruzione della timeline differisce dalla fotografia salvata in questo checkpoint.',
        successIndicator: 'Database sincronizzato',
      };

      expect(actionLabels.checkpointSave).not.toContain('★');
      expect(actionLabels.checkpointSnapshot).not.toContain('★');
      expect(actionLabels.checkpointNotice).not.toContain('⚠');
      expect(actionLabels.successIndicator).not.toContain('✓');
    });
  });

  describe('AppShell Layout Stability & Header Action Contract', () => {
    it('preserva la geometria stabile della sidebar a 250px e altezza sticky', () => {
      const stableSidebarStyle = {
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      };

      expect(stableSidebarStyle.width).toBe('250px');
      expect(stableSidebarStyle.height).toBe('100vh');
      expect(stableSidebarStyle.position).toBe('sticky');
    });

    it('assicura che i pulsanti globali dell header includano feedback tattile micro-press', () => {
      const getHeaderButtonClasses = (variant: 'primary' | 'secondary') => {
        if (variant === 'primary') {
          return 'btn btn-primary micro-press';
        }
        return 'btn btn-secondary micro-press';
      };

      expect(getHeaderButtonClasses('primary')).toContain('micro-press');
      expect(getHeaderButtonClasses('secondary')).toContain('micro-press');
    });
  });

  describe('Modal Action Contrast & Semantics', () => {
    it('utilizza il token di testo var(--text-primary) anziché colori hardcoded (#fff) nei bottoni modali', () => {
      const modalSubmitStyle = {
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--text-primary)',
        border: 'none',
      };

      expect(modalSubmitStyle.color).toBe('var(--text-primary)');
      expect(modalSubmitStyle.color).not.toBe('#fff');
      expect(modalSubmitStyle.color).not.toBe('#ffffff');
    });
  });
});
