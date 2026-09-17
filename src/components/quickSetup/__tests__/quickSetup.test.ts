import { describe, it, expect } from 'vitest';
import {
  detectHardware,
  normalizeDetectedCategory,
} from '../../../services/hardwareDetectionService';
import {
  computeComponentStatus,
  computeHistoricalNetCost,
  computeCurrentRigCost,
} from '../../../domain';
import {
  Component,
  InstallEvent,
} from '../../../types';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../storage';

describe('Quick Setup & Hardware Detection Engine', () => {
  describe('hardwareDetectionService', () => {
    it('normalizza correttamente le categorie hardware da stringhe eterogenee', () => {
      expect(normalizeDetectedCategory('CPU')).toBe('cpu');
      expect(normalizeDetectedCategory('gpu')).toBe('gpu');
      expect(normalizeDetectedCategory('RAM')).toBe('ram');
      expect(normalizeDetectedCategory('Memory')).toBe('ram');
      expect(normalizeDetectedCategory('storage')).toBe('storage');
      expect(normalizeDetectedCategory('SSD')).toBe('storage');
      expect(normalizeDetectedCategory('HDD')).toBe('storage');
      expect(normalizeDetectedCategory('Disk')).toBe('storage');
      expect(normalizeDetectedCategory('motherboard')).toBe('motherboard');
      expect(normalizeDetectedCategory('Mainboard')).toBe('motherboard');
      expect(normalizeDetectedCategory('baseboard')).toBe('motherboard');
      expect(normalizeDetectedCategory('UnknownDevice')).toBe('other');
    });

    it('fornisce un set solido di componenti simulati in ambiente non-desktop', async () => {
      const detected = await detectHardware();
      expect(Array.isArray(detected)).toBe(true);
      expect(detected.length).toBeGreaterThanOrEqual(4);

      const categories = detected.map((d) => d.category);
      expect(categories).toContain('cpu');
      expect(categories).toContain('gpu');
      expect(categories).toContain('ram');
      expect(categories).toContain('storage');
      expect(categories).toContain('motherboard');

      for (const item of detected) {
        expect(item.manufacturer.length).toBeGreaterThan(0);
        expect(item.model.length).toBeGreaterThan(0);
        expect(item.confidence).toBe('HIGH');
        expect(item.source).toBeDefined();
      }
    });
  });

  describe('Settings Integration & Normalization', () => {
    it('include quickSetupCompleted con default false', () => {
      expect(DEFAULT_SETTINGS.quickSetupCompleted).toBe(false);

      const normalizedDefault = normalizeSettings({});
      expect(normalizedDefault.quickSetupCompleted).toBe(false);

      const normalizedTrue = normalizeSettings({ quickSetupCompleted: true });
      expect(normalizedTrue.quickSetupCompleted).toBe(true);
    });
  });

  describe('Ciclo di Vita & Integrità Finanziaria dopo Quick Setup', () => {
    it('i componenti importati dal Quick Setup hanno stato IN_USE deterministico e nessun prezzo inventato', () => {
      const now = new Date().toISOString();
      const testBuildYear = 2024;
      const installDate = `${testBuildYear}-01-01`;

      // Simula i componenti e i rispettivi eventi INSTALL generati dal Quick Setup
      const simulatedComponents: Component[] = [
        {
          id: 'comp-cpu-1',
          name: 'AMD Ryzen 7 7800X3D',
          brand: 'AMD',
          model: 'Ryzen 7 7800X3D',
          category: 'cpu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comp-gpu-1',
          name: 'NVIDIA GeForce RTX 4070',
          brand: 'NVIDIA',
          model: 'GeForce RTX 4070',
          category: 'gpu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comp-ram-1',
          name: 'Corsair 32 GB DDR5 RAM',
          brand: 'Corsair',
          model: '32 GB DDR5 RAM',
          category: 'ram',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const simulatedEvents: InstallEvent[] = simulatedComponents.map((c) => ({
        id: `ev-install-${c.id}`,
        componentId: c.id,
        type: 'INSTALL',
        date: installDate,
        slotOrLocation: c.category === 'cpu' ? 'Socket CPU' : c.category === 'gpu' ? 'PCIe 1' : 'Slot DIMM',
        notes: 'Installazione iniziale Quick Setup',
        createdAt: now,
      }));

      // 1. Verifica stato calcolato: tutti devono essere determinati come IN_USE
      for (const comp of simulatedComponents) {
        const compEvents = simulatedEvents.filter((e) => e.componentId === comp.id);
        const status = computeComponentStatus(compEvents);
        expect(status).toBe('IN_USE');
      }

      // 2. Verifica finanziaria: nessun prezzo fittizio è stato inserito
      const netCost = computeHistoricalNetCost(simulatedEvents);
      expect(netCost).toBe(0);

      const rigCost = computeCurrentRigCost(simulatedComponents, simulatedEvents);
      expect(rigCost).toBe(0);
    });
  });
});
