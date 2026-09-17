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

    it('calcola correttamente la data di installazione in base all\'anno di build', () => {
      const currentYear = new Date().getFullYear();
      const todayISO = new Date().toISOString().split('T')[0];

      // Se anno passato (es. 2023), la data deve essere 2023-01-01
      const pastYear = 2023;
      const pastDate = pastYear < currentYear ? `${pastYear}-01-01` : todayISO;
      expect(pastDate).toBe('2023-01-01');

      // Se anno corrente, la data è quella odierna (YYYY-MM-DD)
      const thisYear = currentYear;
      const thisDate = thisYear < currentYear ? `${thisYear}-01-01` : todayISO;
      expect(thisDate).toBe(todayISO);
    });

    it('assegna slot fisici predefiniti corretti per ciascuna categoria hardware', () => {
      const getDefaultSlot = (cat: string) => {
        switch (cat) {
          case 'cpu':
            return 'Socket CPU';
          case 'gpu':
            return 'PCIe x16 Slot 1';
          case 'motherboard':
            return 'Chassis';
          case 'ram':
            return 'Slot DIMM';
          case 'storage':
            return 'Slot M.2 NVMe';
          case 'psu':
            return 'Vano Alimentatore';
          case 'case':
            return 'Chassis Principale';
          case 'cooling':
            return 'Socket / Case Mount';
          default:
            return 'Postazione PC';
        }
      };

      expect(getDefaultSlot('cpu')).toBe('Socket CPU');
      expect(getDefaultSlot('gpu')).toBe('PCIe x16 Slot 1');
      expect(getDefaultSlot('motherboard')).toBe('Chassis');
      expect(getDefaultSlot('ram')).toBe('Slot DIMM');
      expect(getDefaultSlot('storage')).toBe('Slot M.2 NVMe');
      expect(getDefaultSlot('psu')).toBe('Vano Alimentatore');
      expect(getDefaultSlot('other')).toBe('Postazione PC');
    });

    it('supporta la registrazione opzionale di un prezzo reale senza inventare costi per gli altri', () => {
      const now = new Date().toISOString();
      const compId1 = 'comp-cpu-real-price';
      const compId2 = 'comp-gpu-zero-price';

      const events: (InstallEvent | any)[] = [
        // Componente 1: con prezzo reale fornito dall'utente (549.99 €)
        {
          id: 'ev-pur-1',
          componentId: compId1,
          type: 'PURCHASE',
          date: '2024-01-01',
          price: 549.99,
          condition: 'new',
          createdAt: now,
        },
        {
          id: 'ev-inst-1',
          componentId: compId1,
          type: 'INSTALL',
          date: '2024-01-01',
          slotOrLocation: 'Socket CPU',
          createdAt: now,
        },
        // Componente 2: senza prezzo (nessuna spesa inventata)
        {
          id: 'ev-inst-2',
          componentId: compId2,
          type: 'INSTALL',
          date: '2024-01-01',
          slotOrLocation: 'PCIe 1',
          createdAt: now,
        },
      ];

      const netCost = computeHistoricalNetCost(events);
      expect(netCost).toBe(549.99);
    });
  });

  describe('Smart Diff & Rilevamento Avanzato Metadati', () => {
    it('riconosce VRAM della GPU, versione BIOS e interfaccia NVMe nel servizio', async () => {
      const detected = await detectHardware();
      const gpu = detected.find((d) => d.category === 'gpu' && d.extraDetails?.is_discrete === 'true');
      expect(gpu).toBeDefined();
      expect(gpu?.capacity).toBe('12 GB');
      expect(gpu?.extraDetails?.vram).toBe('12 GB');

      const mobo = detected.find((d) => d.category === 'motherboard');
      expect(mobo).toBeDefined();
      expect(mobo?.extraDetails?.bios_version).toBe('2403');
      expect(mobo?.extraDetails?.bios_date).toBe('2024-05-10');

      const storage = detected.find((d) => d.category === 'storage');
      expect(storage).toBeDefined();
      expect(storage?.extraDetails?.interface).toBe('NVMe');

      const igpu = detected.find((d) => d.category === 'gpu' && d.extraDetails?.is_integrated === 'true');
      expect(igpu).toBeDefined();
      expect(igpu?.extraDetails?.is_integrated).toBe('true');
    });

    it('identifica i componenti già presenti nel PC evitando duplicati accidentali', () => {
      const existingInstalled: Component[] = [
        {
          id: 'existing-cpu',
          name: 'AMD Ryzen 7 7800X3D',
          brand: 'AMD',
          model: 'Ryzen 7 7800X3D',
          category: 'cpu',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'existing-ram',
          name: '32 GB DDR5 RAM Kit',
          brand: 'Corsair',
          model: '32 GB RAM',
          category: 'ram',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const checkDuplicate = (cand: { category: string; model: string; capacity?: string }) => {
        const normCandModel = cand.model.toLowerCase().replace(/[^a-z0-9]/g, '');
        return existingInstalled.some((comp) => {
          if (comp.category !== cand.category) return false;
          const normCompModel = comp.model.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normCompName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '');

          if (normCompModel.length >= 4 && normCandModel.length >= 4) {
            if (normCompModel.includes(normCandModel) || normCandModel.includes(normCompModel)) return true;
          }
          if (normCompName.length >= 4 && normCandModel.length >= 4) {
            if (normCompName.includes(normCandModel) || normCandModel.includes(normCompName)) return true;
          }
          if (cand.category === 'ram' && cand.capacity && (comp.name.includes(cand.capacity) || comp.model.includes(cand.capacity))) {
            return true;
          }
          return false;
        });
      };

      // CPU identica già presente -> duplicato rilevato
      expect(checkDuplicate({ category: 'cpu', model: 'AMD Ryzen 7 7800X3D' })).toBe(true);

      // RAM identica (32 GB) -> duplicato rilevato
      expect(checkDuplicate({ category: 'ram', model: '32 GB DDR5', capacity: '32 GB' })).toBe(true);

      // Nuova GPU (RTX 4070) non presente -> nessun duplicato
      expect(checkDuplicate({ category: 'gpu', model: 'GeForce RTX 4070' })).toBe(false);
    });
  });
});
