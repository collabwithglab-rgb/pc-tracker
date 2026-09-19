import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent, PurchaseEvent, InstallEvent, Checkpoint, RigNormalizedComponent } from '../../../types';
import {
  normalizeCurrentRig,
  normalizeCheckpoint,
  compareRigs,
} from '../../../domain/rigComparisonEngine';

describe('Rig Comparison Presentation & UI Logic Tests', () => {
  const dummyCreatedAt = '2024-01-01T00:00:00.000Z';

  const makeComponent = (
    id: string,
    category: Component['category'],
    name: string,
    extra: Partial<Component> = {}
  ): Component => ({
    id,
    name,
    brand: 'Brand',
    model: name,
    category,
    createdAt: dummyCreatedAt,
    updatedAt: dummyCreatedAt,
    ...extra,
  });

  const makePurchase = (id: string, componentId: string, date: string, price: number): PurchaseEvent => ({
    id,
    componentId,
    type: 'PURCHASE',
    date,
    price,
    createdAt: dummyCreatedAt,
  });

  const makeInstall = (id: string, componentId: string, date: string, slot?: string): InstallEvent => ({
    id,
    componentId,
    type: 'INSTALL',
    date,
    slotOrLocation: slot,
    createdAt: dummyCreatedAt,
  });

  it('normalizza e confronta correttamente un Checkpoint congelato e il PC Attuale', () => {
    // Componenti storici e attuali
    const oldGpu = makeComponent('gpu-old', 'gpu', 'GeForce RTX 3070');
    const newGpu = makeComponent('gpu-new', 'gpu', 'GeForce RTX 4080 Super');
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-13600K');

    const checkpoint: Checkpoint = {
      id: 'chk-1',
      name: 'Build Iniziale 2023',
      createdAt: '2023-01-01T12:00:00.000Z',
      referenceDate: '2023-01-01',
      trigger: 'manual',
      summary: {
        componentCount: 2,
        rigPurchaseCost: 1000,
        categoryCounts: { cpu: 1, gpu: 1 },
      },
      componentsSnapshot: [
        {
          componentId: 'cpu-1',
          name: 'Intel Core i5-13600K',
          brand: 'Intel',
          model: 'Core i5-13600K',
          category: 'cpu',
          purchasePrice: 320,
        },
        {
          componentId: 'gpu-old',
          name: 'GeForce RTX 3070',
          brand: 'NVIDIA',
          model: 'GeForce RTX 3070',
          category: 'gpu',
          purchasePrice: 680,
        },
      ],
    };

    // Componenti attualmente montati nel PC
    const installed = [
      {
        component: cpu,
        lastInstallEvent: makeInstall('inst-1', 'cpu-1', '2023-01-01'),
      },
      {
        component: newGpu,
        lastInstallEvent: makeInstall('inst-2', 'gpu-new', '2024-05-01'),
      },
    ];

    const events: ComponentEvent[] = [
      makePurchase('p-1', 'cpu-1', '2023-01-01', 320),
      makePurchase('p-2', 'gpu-new', '2024-05-01', 1100),
    ];

    const getComponentComputed = (id: string) => {
      const p = events.find((e): e is PurchaseEvent => e.componentId === id && e.type === 'PURCHASE');
      return {
        totalPurchaseCost: p?.price ?? 0,
        status: 'IN_USE',
      } as any;
    };

    const normA = normalizeCheckpoint(checkpoint, [cpu, oldGpu]);
    const normB = normalizeCurrentRig(installed, events, getComponentComputed);

    const comparison = compareRigs(
      normA,
      normB,
      `Checkpoint: ${checkpoint.name}`,
      'Il Mio PC Attuale',
      checkpoint.referenceDate
    );

    // Verifiche sui totali e delta
    expect(comparison.summary.costA).toBe(1000);
    expect(comparison.summary.costB).toBe(1420);
    expect(comparison.summary.deltaCost).toBe(420);
    expect(comparison.summary.deltaCostPercent).toBeCloseTo(42, 0);

    // GPU sostituita
    expect(comparison.summary.replacedCount).toBe(1);
    expect(comparison.summary.unchangedCount).toBe(1);
    expect(comparison.summary.addedCount).toBe(0);
    expect(comparison.summary.removedCount).toBe(0);

    const gpuDiff = comparison.entries.find((e) => e.category === 'gpu');
    expect(gpuDiff).toBeDefined();
    expect(gpuDiff?.status).toBe('replaced');
    expect(gpuDiff?.oldComponent?.name).toBe('GeForce RTX 3070');
    expect(gpuDiff?.newComponent?.name).toBe('GeForce RTX 4080 Super');
    expect(gpuDiff?.priceDifference).toBe(420); // 1100 - 680
    expect(gpuDiff?.wattsDifference).toBeGreaterThan(0); // 4080 Super consuma più di 3070
  });

  it('inverte specularmente i delta e gli stati quando si effettua lo Swap tra A e B', () => {
    const compA: RigNormalizedComponent[] = [
      {
        componentId: 'comp-1',
        category: 'gpu' as const,
        name: 'RTX 3060',
        purchasePrice: 350,
        estimatedWatts: 170,
      },
    ];

    const compB: RigNormalizedComponent[] = [
      {
        componentId: 'comp-2',
        category: 'gpu' as const,
        name: 'RTX 4070 Ti',
        purchasePrice: 850,
        estimatedWatts: 285,
      },
    ];

    // Confronto A -> B
    const compAB = compareRigs(compA, compB, 'Config A', 'Config B');
    expect(compAB.summary.deltaCost).toBe(500);
    expect(compAB.summary.deltaWatts).toBe(115);
    expect(compAB.entries[0].status).toBe('replaced');

    // Confronto Swap B -> A
    const compBA = compareRigs(compB, compA, 'Config B', 'Config A');
    expect(compBA.summary.deltaCost).toBe(-500);
    expect(compBA.summary.deltaWatts).toBe(-115);
    expect(compBA.entries[0].status).toBe('replaced');
  });

  it('gestisce correttamente aggiunte e rimozioni con filtri UI', () => {
    const compA: RigNormalizedComponent[] = [
      { componentId: 'cpu-1', category: 'cpu' as const, name: 'Core i7', purchasePrice: 300, estimatedWatts: 125 },
      { componentId: 'ram-old', category: 'ram' as const, name: 'DDR4 16GB', purchasePrice: 80, estimatedWatts: 10 },
    ];

    const compB: RigNormalizedComponent[] = [
      { componentId: 'cpu-1', category: 'cpu' as const, name: 'Core i7', purchasePrice: 300, estimatedWatts: 125 },
      { componentId: 'ssd-new', category: 'storage' as const, name: 'Samsung 990 Pro 2TB', purchasePrice: 180, estimatedWatts: 8 },
    ];

    const res = compareRigs(compA, compB, 'Rig A', 'Rig B');

    expect(res.summary.unchangedCount).toBe(1); // cpu
    expect(res.summary.removedCount).toBe(1); // ram rimosso
    expect(res.summary.addedCount).toBe(1); // ssd aggiunto

    // Filtro 'replaced'
    const replaced = res.entries.filter((e) => e.status === 'replaced');
    expect(replaced.length).toBe(0);

    // Filtro 'added_removed'
    const addedRemoved = res.entries.filter((e) => e.status === 'added' || e.status === 'removed');
    expect(addedRemoved.length).toBe(2);

    // Filtro 'unchanged'
    const unchanged = res.entries.filter((e) => e.status === 'unchanged');
    expect(unchanged.length).toBe(1);
    expect(unchanged[0].category).toBe('cpu');
  });

  it('gestisce configurazioni a costo zero senza divisioni per zero o valori NaN', () => {
    const compA: RigNormalizedComponent[] = [];
    const compB: RigNormalizedComponent[] = [
      { componentId: 'fan-1', category: 'cooling' as const, name: 'Fan 120mm', purchasePrice: 20, estimatedWatts: 3 },
    ];

    const res = compareRigs(compA, compB, 'Vuoto', 'Nuovo');
    expect(res.summary.costA).toBe(0);
    expect(res.summary.costB).toBe(20);
    expect(res.summary.deltaCost).toBe(20);
    expect(res.summary.deltaCostPercent).toBe(100);
    expect(Number.isNaN(res.summary.deltaCostPercent)).toBe(false);

    // Entrambi zero
    const resBothZero = compareRigs([], [], 'A', 'B');
    expect(resBothZero.summary.deltaCostPercent).toBe(0);
  });
});
