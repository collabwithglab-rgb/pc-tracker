import { describe, it, expect } from 'vitest';
import {
  normalizeCurrentRig,
  normalizeCheckpoint,
  compareRigs,
} from '../rigComparisonEngine';
import {
  Component,
  ComponentEvent,
  Checkpoint,
  RigNormalizedComponent,
} from '../../types';

describe('Rig Comparison Engine Suite', () => {
  const dummyCreatedAt = '2024-01-01T00:00:00.000Z';
  const mockComponents: Component[] = [
    {
      id: 'cpu-7800x3d',
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      model: 'Ryzen 7 7800X3D',
      category: 'cpu',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'gpu-3080',
      name: 'NVIDIA GeForce RTX 3080',
      brand: 'ASUS',
      model: 'TUF Gaming RTX 3080',
      category: 'gpu',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'gpu-4090',
      name: 'NVIDIA GeForce RTX 4090',
      brand: 'ASUS',
      model: 'ROG Strix RTX 4090',
      category: 'gpu',
      createdAt: '2024-06-01',
      updatedAt: '2024-06-01',
    },
    {
      id: 'ssd-1tb',
      name: 'Samsung 980 Pro 1TB',
      brand: 'Samsung',
      model: '980 Pro 1TB',
      category: 'storage',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'ssd-2tb',
      name: 'Samsung 990 Pro 2TB',
      brand: 'Samsung',
      model: '990 Pro 2TB',
      category: 'storage',
      createdAt: '2024-06-01',
      updatedAt: '2024-06-01',
    },
    {
      id: 'psu-850w',
      name: 'Corsair RM850x',
      brand: 'Corsair',
      model: 'RM850x',
      category: 'psu',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const mockEvents: ComponentEvent[] = [
    {
      id: 'p-cpu',
      componentId: 'cpu-7800x3d',
      type: 'PURCHASE',
      date: '2024-01-01',
      price: 420,
      createdAt: dummyCreatedAt,
    },
    {
      id: 'i-cpu',
      componentId: 'cpu-7800x3d',
      type: 'INSTALL',
      date: '2024-01-01',
      slotOrLocation: 'Socket AM5',
      createdAt: dummyCreatedAt,
    },
    {
      id: 'p-gpu-3080',
      componentId: 'gpu-3080',
      type: 'PURCHASE',
      date: '2023-01-01',
      price: 750,
      createdAt: dummyCreatedAt,
    },
    {
      id: 'i-gpu-3080',
      componentId: 'gpu-3080',
      type: 'INSTALL',
      date: '2023-01-01',
      slotOrLocation: 'PCIe 1',
      createdAt: dummyCreatedAt,
    },
    {
      id: 'p-gpu-4090',
      componentId: 'gpu-4090',
      type: 'PURCHASE',
      date: '2024-06-01',
      price: 1950,
      createdAt: dummyCreatedAt,
    },
    {
      id: 'i-gpu-4090',
      componentId: 'gpu-4090',
      type: 'INSTALL',
      date: '2024-06-01',
      slotOrLocation: 'PCIe 1',
      createdAt: dummyCreatedAt,
    },
    {
      id: 'p-ssd-1tb',
      componentId: 'ssd-1tb',
      type: 'PURCHASE',
      date: '2023-01-01',
      price: 110,
      createdAt: dummyCreatedAt,
    },
    {
      id: 'i-ssd-1tb',
      componentId: 'ssd-1tb',
      type: 'INSTALL',
      date: '2023-01-01',
      slotOrLocation: 'Slot M.2 1',
      createdAt: dummyCreatedAt,
    },
    {
      id: 'p-ssd-2tb',
      componentId: 'ssd-2tb',
      type: 'PURCHASE',
      date: '2024-06-01',
      price: 180,
      createdAt: dummyCreatedAt,
    },
    {
      id: 'i-ssd-2tb',
      componentId: 'ssd-2tb',
      type: 'INSTALL',
      date: '2024-06-01',
      slotOrLocation: 'Slot M.2 2',
      createdAt: dummyCreatedAt,
    },
  ];

  describe('1. Normalizzazione Sorgenti', () => {
    it('normalizza correttamente la configurazione attuale', () => {
      const installed = [mockComponents[0], mockComponents[2]]; // CPU + RTX 4090
      const normalized = normalizeCurrentRig(installed, mockEvents);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].componentId).toBe('cpu-7800x3d');
      expect(normalized[0].purchasePrice).toBe(420);
      expect(normalized[0].slotOrLocation).toBe('Socket AM5');
      expect(normalized[1].componentId).toBe('gpu-4090');
      expect(normalized[1].purchasePrice).toBe(1950);
      expect(normalized[1].estimatedWatts).toBe(450); // RTX 4090 riconosciuta a 450W
    });

    it('normalizza uno snapshot congelato di un Checkpoint storico', () => {
      const checkpoint: Checkpoint = {
        id: 'chk-1',
        name: 'Build Iniziale 2023',
        referenceDate: '2023-01-01',
        createdAt: '2023-01-01T12:00:00Z',
        trigger: 'manual',
        summary: {
          componentCount: 2,
          rigPurchaseCost: 860,
        },
        componentsSnapshot: [
          {
            componentId: 'gpu-3080',
            name: 'NVIDIA GeForce RTX 3080',
            brand: 'ASUS',
            model: 'TUF Gaming RTX 3080',
            category: 'gpu',
            purchasePrice: 750,
            slotOrLocation: 'PCIe 1',
          },
          {
            componentId: 'ssd-1tb',
            name: 'Samsung 980 Pro 1TB',
            brand: 'Samsung',
            model: '980 Pro 1TB',
            category: 'storage',
            purchasePrice: 110,
            slotOrLocation: 'Slot M.2 1',
          },
        ],
      };

      const normalized = normalizeCheckpoint(checkpoint, mockComponents);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].name).toBe('NVIDIA GeForce RTX 3080');
      expect(normalized[0].purchasePrice).toBe(750);
      expect(normalized[0].estimatedWatts).toBe(320); // RTX 3080 riconosciuta a 320W
    });
  });

  describe('2. Confronto tra Configurazioni Identiche', () => {
    it('rileva 0 differenze, delta costo 0 e tutti i pezzi invariati', () => {
      const itemsA: RigNormalizedComponent[] = [
        { componentId: 'cpu-1', name: 'Ryzen 7 7800X3D', category: 'cpu', purchasePrice: 420, estimatedWatts: 120 },
        { componentId: 'gpu-1', name: 'RTX 4090', category: 'gpu', purchasePrice: 1950, estimatedWatts: 450 },
      ];

      const res = compareRigs(itemsA, itemsA, 'Rig A', 'Rig B');

      expect(res.summary.costA).toBe(2370);
      expect(res.summary.costB).toBe(2370);
      expect(res.summary.deltaCost).toBe(0);
      expect(res.summary.deltaCostPercent).toBe(0);
      expect(res.summary.countA).toBe(2);
      expect(res.summary.countB).toBe(2);
      expect(res.summary.deltaCount).toBe(0);
      expect(res.summary.deltaWatts).toBe(0);
      expect(res.summary.replacedCount).toBe(0);
      expect(res.summary.addedCount).toBe(0);
      expect(res.summary.removedCount).toBe(0);
      expect(res.summary.unchangedCount).toBe(2);

      expect(res.entries.every((e) => e.status === 'unchanged')).toBe(true);
    });
  });

  describe('3. Confronto con Sostituzione Componente (Upgrade)', () => {
    it('calcola correttamente la sostituzione della GPU con delta prezzo e delta watt', () => {
      const itemsA: RigNormalizedComponent[] = [
        { componentId: 'cpu-1', name: 'Ryzen 7 7800X3D', category: 'cpu', purchasePrice: 420, estimatedWatts: 120 },
        { componentId: 'gpu-3080', name: 'RTX 3080', category: 'gpu', slotOrLocation: 'PCIe 1', purchasePrice: 750, estimatedWatts: 320 },
      ];

      const itemsB: RigNormalizedComponent[] = [
        { componentId: 'cpu-1', name: 'Ryzen 7 7800X3D', category: 'cpu', purchasePrice: 420, estimatedWatts: 120 },
        { componentId: 'gpu-4090', name: 'RTX 4090', category: 'gpu', slotOrLocation: 'PCIe 1', purchasePrice: 1950, estimatedWatts: 450 },
      ];

      const res = compareRigs(itemsA, itemsB, '2023 Setup', '2024 Setup');

      expect(res.summary.costA).toBe(1170);
      expect(res.summary.costB).toBe(2370);
      expect(res.summary.deltaCost).toBe(1200); // 2370 - 1170 = +1200
      expect(res.summary.deltaCostPercent).toBe(102.6); // +102.6%
      expect(res.summary.wattsA).toBe(440); // 120 + 320
      expect(res.summary.wattsB).toBe(570); // 120 + 450
      expect(res.summary.deltaWatts).toBe(130); // +130W

      expect(res.summary.replacedCount).toBe(1);
      expect(res.summary.unchangedCount).toBe(1);

      const gpuEntry = res.entries.find((e) => e.category === 'gpu');
      expect(gpuEntry).toBeDefined();
      expect(gpuEntry?.status).toBe('replaced');
      expect(gpuEntry?.oldComponent?.name).toBe('RTX 3080');
      expect(gpuEntry?.newComponent?.name).toBe('RTX 4090');
      expect(gpuEntry?.priceDifference).toBe(1200);
      expect(gpuEntry?.wattsDifference).toBe(130);
    });
  });

  describe('4. Componenti Aggiunti e Rimossi', () => {
    it('rileva componenti aggiunti e calcola la crescita del setup', () => {
      const itemsA: RigNormalizedComponent[] = [
        { componentId: 'ssd-1', name: 'SSD 1TB', category: 'storage', slotOrLocation: 'Slot M.2 1', purchasePrice: 100 },
      ];

      const itemsB: RigNormalizedComponent[] = [
        { componentId: 'ssd-1', name: 'SSD 1TB', category: 'storage', slotOrLocation: 'Slot M.2 1', purchasePrice: 100 },
        { componentId: 'ssd-2', name: 'SSD 2TB', category: 'storage', slotOrLocation: 'Slot M.2 2', purchasePrice: 180 },
      ];

      const res = compareRigs(itemsA, itemsB, 'Rig A', 'Rig B');

      expect(res.summary.countA).toBe(1);
      expect(res.summary.countB).toBe(2);
      expect(res.summary.deltaCount).toBe(1);
      expect(res.summary.deltaCost).toBe(180);
      expect(res.summary.addedCount).toBe(1);
      expect(res.summary.unchangedCount).toBe(1);

      const added = res.entries.find((e) => e.status === 'added');
      expect(added?.newComponent?.name).toBe('SSD 2TB');
      expect(added?.priceDifference).toBe(180);
    });

    it('rileva componenti rimossi', () => {
      const itemsA: RigNormalizedComponent[] = [
        { componentId: 'cap-1', name: 'Elgato 4K60 Pro', category: 'peripherals', purchasePrice: 220 },
      ];

      const itemsB: RigNormalizedComponent[] = [];

      const res = compareRigs(itemsA, itemsB, 'Rig A', 'Rig B');

      expect(res.summary.countA).toBe(1);
      expect(res.summary.countB).toBe(0);
      expect(res.summary.deltaCount).toBe(-1);
      expect(res.summary.deltaCost).toBe(-220);
      expect(res.summary.removedCount).toBe(1);

      const removed = res.entries.find((e) => e.status === 'removed');
      expect(removed?.oldComponent?.name).toBe('Elgato 4K60 Pro');
      expect(removed?.priceDifference).toBe(-220);
    });
  });

  describe('5. Casi Limite Economici', () => {
    it('gestisce configurazione iniziale a costo zero senza NaN', () => {
      const itemsA: RigNormalizedComponent[] = [];
      const itemsB: RigNormalizedComponent[] = [
        { componentId: 'cpu-1', name: 'Ryzen 5', category: 'cpu', purchasePrice: 200 },
      ];

      const res = compareRigs(itemsA, itemsB, 'Inizio', 'Fine');
      expect(res.summary.costA).toBe(0);
      expect(res.summary.costB).toBe(200);
      expect(res.summary.deltaCostPercent).toBe(100);
      expect(Number.isNaN(res.summary.deltaCostPercent)).toBe(false);
    });
  });
});
