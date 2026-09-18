import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent, RigPowerBudget } from '../../../types';
import {
  computeRigPowerBudget,
  computeRigPowerBudgetFromInstalled,
} from '../../../domain';
import userRigData from '../../../domain/__tests__/fixtures/userRigSeed.json';

describe('Power Budget UI Presentation & State Tests (Sessione 3)', () => {
  const dummyCreatedAt = '2024-01-01T00:00:00.000Z';

  const makeComponent = (
    id: string,
    category: Component['category'],
    name: string,
    extra: Partial<Component> = {}
  ): Component => ({
    id,
    name,
    brand: 'TestBrand',
    model: name,
    category,
    createdAt: dummyCreatedAt,
    updatedAt: dummyCreatedAt,
    ...extra,
  });

  it('produce i 4 KPI formattati e coerenti per un rig completo', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14500'); // 154W
    const gpu = makeComponent('gpu-1', 'gpu', 'MSI GeForce RTX 4070'); // 200W
    const psu = makeComponent('psu-1', 'psu', 'NZXT C750 Gold Core 750W'); // 750W

    const budget: RigPowerBudget = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);

    // KPI 1: Picco
    expect(budget.estimatedPeakWatts).toBe(354);
    // KPI 2: PSU
    expect(budget.psuCapacityWatts).toBe(750);
    // KPI 3: Utilizzo
    expect(budget.estimatedUtilizationPercent).toBe(47);
    // KPI 4: Margine
    expect(budget.estimatedHeadroomWatts).toBe(396);
    expect(budget.headroomStatus).toBe('high');
  });

  it('gestisce lo stato privo di PSU mostrando null senza crashare o produrre NaN', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Ryzen 7 7800X3D'); // 120W
    const budget: RigPowerBudget = computeRigPowerBudgetFromInstalled([cpu]);

    expect(budget.hasPsu).toBe(false);
    expect(budget.psuCapacityWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });

  it('genera il breakdown delle categorie distinguendo tra valori noti e non disponibili (—)', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i7-14700K'); // 253W
    const mobo = makeComponent('mobo-1', 'motherboard', 'ASUS ROG STRIX Z790'); // null
    const ram = makeComponent('ram-1', 'ram', 'G.Skill Trident Z5 32GB'); // null

    const budget: RigPowerBudget = computeRigPowerBudgetFromInstalled([cpu, mobo, ram]);

    const cpuCategory = budget.categoryBreakdown.find((c) => c.category === 'cpu');
    const moboCategory = budget.categoryBreakdown.find((c) => c.category === 'motherboard');
    const ramCategory = budget.categoryBreakdown.find((c) => c.category === 'ram');

    expect(cpuCategory?.totalWatts).toBe(253);
    expect(moboCategory?.totalWatts).toBeNull();
    expect(ramCategory?.totalWatts).toBeNull();
  });

  it('verifica che la stima su userRigSeed.json sia corretta e rifletta il Rig Reale (stima parziale)', () => {
    const components = userRigData.components as unknown as Component[];
    const events = userRigData.events as unknown as ComponentEvent[];

    const budget = computeRigPowerBudget(components, events);

    expect(budget.hasPsu).toBe(true);
    expect(budget.psuCapacityWatts).toBe(750);
    expect(budget.psuComponent?.name).toContain('NZXT C750');
    expect(budget.knownPowerWatts).toBe(354);
    expect(budget.isPartialEstimate).toBe(true);
    expect(budget.isCompleteEstimate).toBe(false);
    expect(budget.estimatedPeakWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });
});
