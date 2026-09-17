import { describe, it, expect } from 'vitest';
import {
  sortInstalledComponents,
  generateGeminiPrompt,
  generateDiscordMarkdown,
  generateWhatsAppText,
  generatePlainMarkdown,
  getWhatsAppShareUrl,
  CATEGORY_ORDER,
  CATEGORY_EMOJI,
} from '../../../domain/rigExportEngine';
import { validateImportJSON } from '../../../storage/backupService';
import { InstalledComponentItem } from '../../../store/PCContext';
import { Component } from '../../../types';

describe('Rig Export & Import Flow Contracts', () => {
  const mockInstalled: InstalledComponentItem[] = [
    {
      component: {
        id: 'c1',
        name: 'Core i5-14500',
        brand: 'Intel',
        model: '14500 (14 Core, fino a 5.0 GHz)',
        category: 'cpu',
        notes: 'LGA 1700',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      lastInstallEvent: {
        id: 'ev-1',
        componentId: 'c1',
        date: '2024-01-02',
        type: 'INSTALL',
        slotOrLocation: 'Socket LGA 1700',
        createdAt: '2024-01-02T10:00:00.000Z',
      },
      computed: {
        component: {} as Component,
        status: 'IN_USE',
        totalPurchaseCost: 245.5,
        totalSaleRevenue: 0,
        netCost: 245.5,
        daysInUse: 50,
        daysOwned: 50,
        costPerDayInUse: 4.91,
      },
    },
    {
      component: {
        id: 'c2',
        name: 'GeForce RTX 4070',
        brand: 'MSI',
        model: 'RTX 4070 12GB GDDR6X',
        category: 'gpu',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      lastInstallEvent: {
        id: 'ev-2',
        componentId: 'c2',
        date: '2024-01-02',
        type: 'INSTALL',
        slotOrLocation: 'PCIe 16x 1',
        createdAt: '2024-01-02T10:00:00.000Z',
      },
      computed: {
        component: {} as Component,
        status: 'IN_USE',
        totalPurchaseCost: 599.0,
        totalSaleRevenue: 0,
        netCost: 599.0,
        daysInUse: 50,
        daysOwned: 50,
        costPerDayInUse: 11.98,
      },
    },
    {
      component: {
        id: 'c3',
        name: 'Focus GX-850',
        brand: 'Seasonic',
        model: '850W 80+ Gold Modulare',
        category: 'psu',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      computed: {
        component: {} as Component,
        status: 'IN_USE',
        totalPurchaseCost: 130.0,
        totalSaleRevenue: 0,
        netCost: 130.0,
        daysInUse: 50,
        daysOwned: 50,
        costPerDayInUse: 2.6,
      },
    },
  ];

  describe('Taxonomy & Sorting', () => {
    it('definisce tutte le categorie hardware nell\'ordine canonico', () => {
      expect(CATEGORY_ORDER).toContain('cpu');
      expect(CATEGORY_ORDER).toContain('gpu');
      expect(CATEGORY_ORDER).toContain('motherboard');
      expect(CATEGORY_ORDER).toContain('ram');
      expect(CATEGORY_ORDER).toContain('storage');
      expect(CATEGORY_ORDER).toContain('psu');
      expect(CATEGORY_ORDER).toContain('case');
      expect(CATEGORY_ORDER).toContain('cooling');
    });

    it('assegna emoji distintive a ogni categoria hardware', () => {
      expect(CATEGORY_EMOJI.cpu).toBe('🧠');
      expect(CATEGORY_EMOJI.gpu).toBe('🎮');
      expect(CATEGORY_EMOJI.cooling).toBe('❄️');
      expect(CATEGORY_EMOJI.psu).toBe('🔌');
      expect(CATEGORY_EMOJI.storage).toBe('💾');
    });

    it('ordina i componenti garantendo CPU per prima', () => {
      const sorted = sortInstalledComponents(mockInstalled);
      expect(sorted[0].component.category).toBe('cpu');
    });
  });

  describe('Gemini AI Prompt Presets', () => {
    it('preset upgrade include call to action specifica per upgrade hardware', () => {
      const prompt = generateGeminiPrompt(mockInstalled, {
        detailLevel: 'quick',
        geminiPreset: 'upgrade',
        rigName: 'Gaming PC',
      });
      expect(prompt).toContain('Gaming PC');
      expect(prompt).toContain('Vorrei valutare un upgrade mirato');
      expect(prompt).toContain('Core i5-14500');
      expect(prompt).toContain('GeForce RTX 4070');
      expect(prompt).not.toContain('Costo d\'acquisto');
    });

    it('preset bottleneck include richiesta colli di bottiglia e limiti PSU', () => {
      const prompt = generateGeminiPrompt(mockInstalled, {
        detailLevel: 'detailed',
        geminiPreset: 'bottleneck',
        rigName: 'Gaming PC',
        includeCost: true,
      });
      expect(prompt).toContain('Analizza questa configurazione: ci sono colli di bottiglia (bottleneck)');
      expect(prompt).toContain('Slot: Socket LGA 1700');
      expect(prompt).toContain('€ 245.50');
    });

    it('preset specs_only genera solo le specifiche senza testo di contorno', () => {
      const prompt = generateGeminiPrompt(mockInstalled, {
        detailLevel: 'quick',
        geminiPreset: 'specs_only',
      });
      expect(prompt).not.toContain('upgrade');
      expect(prompt).not.toContain('bottleneck');
      expect(prompt).toContain('- **Processore (CPU)**:');
    });
  });

  describe('Discord and WhatsApp Formatters', () => {
    it('Discord: formatta con emoji hardware e blocchi orizzontali', () => {
      const text = generateDiscordMarkdown(mockInstalled, {
        detailLevel: 'quick',
        rigName: 'Black Beast',
      });
      expect(text).toContain('🖥️ **BLACK BEAST**');
      expect(text).toContain('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      expect(text).toContain('▫️ 🧠 **CPU:**');
      expect(text).toContain('▫️ 🎮 **GPU:**');
      expect(text).toContain('▫️ 🔌 **PSU:**');
    });

    it('WhatsApp: usa grassetti asterisco e genera URL di condivisione valido', () => {
      const text = generateWhatsAppText(mockInstalled, {
        detailLevel: 'quick',
        rigName: 'PC Peppe',
      });
      expect(text).toContain('🖥️ *SPECIFICHE PC — PC Peppe*');
      expect(text).toContain('🧠 *Processore (CPU):*');

      const shareUrl = getWhatsAppShareUrl(text);
      expect(shareUrl).toContain('https://api.whatsapp.com/send?text=');
    });
  });

  describe('Markdown & Technical Document', () => {
    it('genera tabella markdown in modalità dettagliata con costi', () => {
      const md = generatePlainMarkdown(mockInstalled, {
        detailLevel: 'detailed',
        rigName: 'Rig di Produzione',
        includeCost: true,
      });
      expect(md).toContain('# Rig di Produzione');
      expect(md).toContain('| Categoria | Componente | Specifiche / Note | Slot / Posizione |');
      expect(md).toContain('**Costo Totale Hardware Montato:** € 974,50');
    });
  });

  describe('Backup Validation Integration', () => {
    it('valida correttamente un file di backup valido e ne estrae i conteggi', () => {
      const backupJson = JSON.stringify({
        schemaVersion: 1,
        appVersion: '0.2.0',
        settings: { rigName: 'PC Valido' },
        components: [mockInstalled[0].component],
        events: [mockInstalled[0].lastInstallEvent],
        upgrades: [],
      });

      const validation = validateImportJSON(backupJson);
      expect(validation.isValid).toBe(true);
      if (validation.isValid) {
        expect(validation.counts.components).toBe(1);
        expect(validation.counts.events).toBe(1);
        expect(validation.settingsSummary?.rigName).toBe('PC Valido');
      }
    });

    it('rifiuta file JSON non validi o con struttura corrotta', () => {
      const invalidJson = JSON.stringify({
        schemaVersion: 1,
        // components missing
      });

      const validation = validateImportJSON(invalidJson);
      expect(validation.isValid).toBe(false);
    });
  });
});
