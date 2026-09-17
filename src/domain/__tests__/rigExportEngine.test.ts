import { describe, it, expect } from 'vitest';
import {
  sortInstalledComponents,
  generateGeminiPrompt,
  generateDiscordMarkdown,
  generateWhatsAppText,
  generatePlainMarkdown,
  getWhatsAppShareUrl,
  RigExportOptions,
} from '../rigExportEngine';
import { InstalledComponentItem } from '../../store/PCContext';
import { Component } from '../../types/component';

describe('rigExportEngine', () => {
  const mockCPU: InstalledComponentItem = {
    component: {
      id: 'comp-cpu',
      name: 'Core i5-14500',
      brand: 'Intel',
      model: '14500 (14 Core, fino a 5.0 GHz)',
      category: 'cpu',
      notes: 'LGA 1700, 6P+8E',
      createdAt: '2024-06-01T10:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z',
    },
    lastInstallEvent: {
      id: 'ev-install-cpu',
      componentId: 'comp-cpu',
      date: '2024-06-02',
      type: 'INSTALL',
      slotOrLocation: 'Socket LGA 1700',
      createdAt: '2024-06-02T10:00:00.000Z',
    },
    computed: {
      component: {} as Component,
      status: 'IN_USE',
      totalPurchaseCost: 245.5,
      totalSaleRevenue: 0,
      netCost: 245.5,
      daysInUse: 100,
      daysOwned: 100,
      costPerDayInUse: 2.45,
    },
  };

  const mockGPU: InstalledComponentItem = {
    component: {
      id: 'comp-gpu',
      name: 'GeForce RTX 4070',
      brand: 'MSI',
      model: 'RTX 4070 12GB GDDR6X',
      category: 'gpu',
      createdAt: '2024-06-01T10:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z',
    },
    lastInstallEvent: {
      id: 'ev-install-gpu',
      componentId: 'comp-gpu',
      date: '2024-06-02',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 16x 1',
      createdAt: '2024-06-02T10:00:00.000Z',
    },
    computed: {
      component: {} as Component,
      status: 'IN_USE',
      totalPurchaseCost: 599.0,
      totalSaleRevenue: 0,
      netCost: 599.0,
      daysInUse: 100,
      daysOwned: 100,
      costPerDayInUse: 5.99,
    },
  };

  const mockPSU: InstalledComponentItem = {
    component: {
      id: 'comp-psu',
      name: 'Focus GX-850',
      brand: 'Seasonic',
      model: '850W 80+ Gold',
      category: 'psu',
      createdAt: '2024-06-01T10:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z',
    },
    computed: {
      component: {} as Component,
      status: 'IN_USE',
      totalPurchaseCost: 130.0,
      totalSaleRevenue: 0,
      netCost: 130.0,
      daysInUse: 100,
      daysOwned: 100,
      costPerDayInUse: 1.3,
    },
  };

  const mockItems = [mockGPU, mockPSU, mockCPU];

  it('ordina i componenti secondo priorità logica (CPU prima di GPU e PSU)', () => {
    const sorted = sortInstalledComponents(mockItems);
    expect(sorted[0].component.category).toBe('cpu');
    expect(sorted[1].component.category).toBe('gpu');
    expect(sorted[2].component.category).toBe('psu');
  });

  describe('generateGeminiPrompt', () => {
    it('genera prompt veloce (quick) con preset upgrade', () => {
      const opts: RigExportOptions = {
        detailLevel: 'quick',
        geminiPreset: 'upgrade',
        rigName: 'Gaming PC',
      };
      const text = generateGeminiPrompt(mockItems, opts);
      expect(text).toContain('Ecco la configurazione hardware attuale del mio Gaming PC:');
      expect(text).toContain('- **Processore (CPU)**: Core i5-14500 - 14500 (14 Core, fino a 5.0 GHz)');
      expect(text).toContain('- **Scheda Video (GPU)**: GeForce RTX 4070 - RTX 4070 12GB GDDR6X');
      expect(text).toContain('Vorrei valutare un upgrade mirato');
      expect(text).not.toContain('Costo d\'acquisto');
    });

    it('genera prompt dettagliato con preset bottleneck e costi inclusi', () => {
      const opts: RigExportOptions = {
        detailLevel: 'detailed',
        geminiPreset: 'bottleneck',
        rigName: 'Workstation',
        includeCost: true,
      };
      const text = generateGeminiPrompt(mockItems, opts);
      expect(text).toContain('Workstation');
      expect(text).toContain('Slot: Socket LGA 1700');
      expect(text).toContain('Costo d\'acquisto: € 245.50');
      expect(text).toContain('Analizza questa configurazione: ci sono colli di bottiglia (bottleneck)');
    });

    it('gestisce preset specs_only senza domande aggiuntive', () => {
      const opts: RigExportOptions = {
        detailLevel: 'quick',
        geminiPreset: 'specs_only',
      };
      const text = generateGeminiPrompt(mockItems, opts);
      expect(text).not.toContain('Vorrei valutare');
      expect(text).not.toContain('colli di bottiglia');
    });
  });

  describe('generateDiscordMarkdown', () => {
    it('genera formattazione Discord con emoji hardware', () => {
      const opts: RigExportOptions = {
        detailLevel: 'quick',
        rigName: 'Rig di Battaglia',
        buildYear: 2024,
      };
      const text = generateDiscordMarkdown(mockItems, opts);
      expect(text).toContain('🖥️ **RIG DI BATTAGLIA**');
      expect(text).toContain('*Build originaria: 2024*');
      expect(text).toContain('▫️ 🧠 **CPU:**');
      expect(text).toContain('▫️ 🎮 **GPU:**');
      expect(text).toContain('▫️ 🔌 **PSU:**');
    });
  });

  describe('generateWhatsAppText', () => {
    it('genera formattazione WhatsApp con grassetti asterisco', () => {
      const opts: RigExportOptions = {
        detailLevel: 'quick',
        rigName: 'Il mio bolide',
      };
      const text = generateWhatsAppText(mockItems, opts);
      expect(text).toContain('🖥️ *SPECIFICHE PC — Il mio bolide*');
      expect(text).toContain('🧠 *Processore (CPU):*');
      expect(text).toContain('🎮 *Scheda Video (GPU):*');
    });

    it('genera URL valido di condivisione WhatsApp', () => {
      const url = getWhatsAppShareUrl('Test specs');
      expect(url).toBe('https://api.whatsapp.com/send?text=Test%20specs');
    });
  });

  describe('generatePlainMarkdown', () => {
    it('genera documento Markdown completo con tabella in modalità dettagliata', () => {
      const opts: RigExportOptions = {
        detailLevel: 'detailed',
        rigName: 'Specifiche Peppe',
        includeCost: true,
      };
      const text = generatePlainMarkdown(mockItems, opts);
      expect(text).toContain('# Specifiche Peppe');
      expect(text).toContain('| Categoria | Componente | Specifiche / Note | Slot / Posizione |');
      expect(text).toContain('**Costo Totale Hardware Montato:** € 974,50');
    });
  });
});
