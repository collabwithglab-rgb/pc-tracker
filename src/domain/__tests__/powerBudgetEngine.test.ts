import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent } from '../../types';
import {
  computeRigPowerBudget,
  computeRigPowerBudgetFromInstalled,
  extractPsuWattage,
  evaluateHeadroomStatus,
} from '../powerBudgetEngine';
import userRigData from './fixtures/userRigSeed.json';

describe('PowerBudgetEngine (Sessione 3)', () => {
  const dummyCreatedAt = '2024-01-01T00:00:00.000Z';

  const makeComponent = (
    id: string,
    category: Component['category'],
    name: string,
    extra: Partial<Component> = {}
  ): Component => ({
    id,
    name,
    brand: 'Generic',
    model: name,
    category,
    createdAt: dummyCreatedAt,
    updatedAt: dummyCreatedAt,
    ...extra,
  });

  // CASO 1: Rig vuoto
  it('Caso 1: Gestisce correttamente un Rig completamente vuoto', () => {
    const budget = computeRigPowerBudgetFromInstalled([]);

    expect(budget.totalComponents).toBe(0);
    expect(budget.knownPowerWatts).toBe(0);
    expect(budget.estimatedPeakWatts).toBe(0);
    expect(budget.knownComponentsCount).toBe(0);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.hasAnyPowerData).toBe(false);
    expect(budget.isPartialEstimate).toBe(false);
    expect(budget.psuComponent).toBeNull();
    expect(budget.psuCapacityWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
    expect(budget.completenessNotice).toBe('Nessun componente montato nel PC attuale.');
  });

  // CASO 2: Solo CPU
  it('Caso 2: Calcola il budget con sola CPU montata', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14600K');
    const budget = computeRigPowerBudgetFromInstalled([cpu]);

    expect(budget.totalComponents).toBe(1);
    expect(budget.knownPowerWatts).toBe(181);
    expect(budget.estimatedPeakWatts).toBe(181);
    expect(budget.knownComponentsCount).toBe(1);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.psuComponent).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
    expect(budget.categoryBreakdown.find((c) => c.category === 'cpu')?.totalWatts).toBe(181);
  });

  // CASO 3: CPU + GPU
  it('Caso 3: Calcola la stima di picco con CPU + GPU', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'AMD Ryzen 7 7800X3D'); // 120W
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4080'); // 320W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu]);

    expect(budget.totalComponents).toBe(2);
    expect(budget.knownPowerWatts).toBe(440);
    expect(budget.estimatedPeakWatts).toBe(440);
    expect(budget.knownComponentsCount).toBe(2);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.isPartialEstimate).toBe(false);
  });

  // CASO 4: CPU + GPU + componenti con dati noti
  it('Caso 4: Gestisce CPU + GPU + componenti con dati utente definiti', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'AMD Ryzen 5 7600X'); // 105W
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4070', {
      powerRating: 200,
      powerRatingSource: 'declared',
    });
    const fan = makeComponent('fan-1', 'cooling', 'Custom Fan Kit', {
      powerRating: 15,
      powerRatingSource: 'userDefined',
    });

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu, fan]);

    expect(budget.totalComponents).toBe(3);
    expect(budget.knownPowerWatts).toBe(105 + 200 + 15);
    expect(budget.estimatedPeakWatts).toBe(320);
    expect(budget.categoryBreakdown.find((c) => c.category === 'cooling')?.totalWatts).toBe(15);
  });

  // CASO 5: PSU presente
  it('Caso 5: Calcola margine e utilizzo quando la PSU è presente con potenza nota', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14600K'); // 181W
    const gpu = makeComponent('gpu-1', 'gpu', 'MSI RTX 4070 Super'); // 220W
    const psu = makeComponent('psu-1', 'psu', 'Corsair RM850x 850W Gold'); // 850W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);

    expect(budget.hasPsu).toBe(true);
    expect(budget.psuCapacityWatts).toBe(850);
    expect(budget.psuSource).toBe('declared');
    expect(budget.estimatedPeakWatts).toBe(401);
    expect(budget.estimatedUtilizationPercent).toBe(Math.round((401 / 850) * 100)); // 47%
    expect(budget.estimatedHeadroomWatts).toBe(850 - 401); // 449W
    expect(budget.headroomStatus).toBe('high');
  });

  // CASO 6: PSU assente
  it('Caso 6: Gestisce PSU assente senza errori', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Ryzen 7 7700X');
    const budget = computeRigPowerBudgetFromInstalled([cpu]);

    expect(budget.hasPsu).toBe(false);
    expect(budget.psuComponent).toBeNull();
    expect(budget.psuCapacityWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });

  // CASO 7: Valori mancanti (NON inventare dati)
  it('Caso 7: Componenti senza dati mantengono watts null e source unknown senza valori inventati', () => {
    const mobo = makeComponent('mobo-1', 'motherboard', 'MSI MAG B650 TOMAHAWK');
    const ram = makeComponent('ram-1', 'ram', 'Corsair Vengeance 32GB DDR5');
    const ssd = makeComponent('ssd-1', 'storage', 'Samsung 990 Pro 2TB');
    const cpu = makeComponent('cpu-1', 'cpu', 'Ryzen 5 7600'); // 65W

    const budget = computeRigPowerBudgetFromInstalled([mobo, ram, ssd, cpu]);

    // Motherboard, RAM e SSD NON devono ricevere numeri a caso (es. 80W, 10W, 8W)
    const moboEst = budget.estimates.find((e) => e.componentId === 'mobo-1')!;
    expect(moboEst.watts).toBeNull();
    expect(moboEst.source).toBe('unknown');

    const ramEst = budget.estimates.find((e) => e.componentId === 'ram-1')!;
    expect(ramEst.watts).toBeNull();
    expect(ramEst.source).toBe('unknown');

    const ssdEst = budget.estimates.find((e) => e.componentId === 'ssd-1')!;
    expect(ssdEst.watts).toBeNull();
    expect(ssdEst.source).toBe('unknown');

    // Il breakdown delle categorie senza dati ha totalWatts null (distinto da 0)
    const ramCat = budget.categoryBreakdown.find((c) => c.category === 'ram')!;
    expect(ramCat.totalWatts).toBeNull();
    expect(ramCat.hasUnknowns).toBe(true);

    expect(budget.isPartialEstimate).toBe(true);
    expect(budget.unknownComponentsCount).toBe(3);
    expect(budget.completenessNotice).toContain('Stima parziale');
  });

  // CASO 8: Componenti non IN_USE vengono esclusi
  it('Caso 8: Esclude componenti non montati (IN_STORAGE, SOLD)', () => {
    const compCpu = makeComponent('c-cpu', 'cpu', 'Ryzen 7 7800X3D'); // 120W
    const compOldGpu = makeComponent('c-old-gpu', 'gpu', 'RTX 3070'); // 220W, ma a magazzino
    const compPsu = makeComponent('c-psu', 'psu', 'Seasonic 750W'); // 750W

    const events: ComponentEvent[] = [
      {
        id: 'ev-1',
        componentId: 'c-cpu',
        type: 'INSTALL',
        date: '2024-01-01',
        createdAt: dummyCreatedAt,
      },
      {
        id: 'ev-2',
        componentId: 'c-old-gpu',
        type: 'PURCHASE',
        date: '2024-01-01',
        price: 500,
        createdAt: dummyCreatedAt,
      }, // Solo PURCHASE -> IN_STORAGE
      {
        id: 'ev-3',
        componentId: 'c-psu',
        type: 'INSTALL',
        date: '2024-01-01',
        createdAt: dummyCreatedAt,
      },
    ];

    const budget = computeRigPowerBudget([compCpu, compOldGpu, compPsu], events);

    expect(budget.totalComponents).toBe(1); // Solo CPU come carico
    expect(budget.knownPowerWatts).toBe(120);
    expect(budget.estimates.some((e) => e.componentId === 'c-old-gpu')).toBe(false);
  });

  // CASO 9: Headroom (High, Reduced, Critical)
  it('Caso 9: Classifica correttamente la disponibilità di headroom', () => {
    expect(evaluateHeadroomStatus(200, 750)).toBe('high');
    expect(evaluateHeadroomStatus(150, 750)).toBe('high');
    expect(evaluateHeadroomStatus(149, 750)).toBe('reduced');
    expect(evaluateHeadroomStatus(50, 750)).toBe('reduced');
    expect(evaluateHeadroomStatus(49, 750)).toBe('critical');
    expect(evaluateHeadroomStatus(-20, 750)).toBe('critical');
    expect(evaluateHeadroomStatus(null, 750)).toBe('unknown');
    expect(evaluateHeadroomStatus(200, null)).toBe('unknown');
    expect(evaluateHeadroomStatus(200, 0)).toBe('unknown');
  });

  // CASO 10: Utilization
  it('Caso 10: Calcola correttamente la percentuale di utilizzo', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i9-14900K'); // 253W
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4090'); // 450W
    const psu = makeComponent('psu-1', 'psu', 'Alimentatore 1000W'); // 1000W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);

    // Peak: 253 + 450 = 703W
    expect(budget.estimatedPeakWatts).toBe(703);
    // 703 / 1000 = 70.3% -> 70%
    expect(budget.estimatedUtilizationPercent).toBe(70);
    expect(budget.estimatedHeadroomWatts).toBe(297);
    expect(budget.headroomStatus).toBe('high');
  });

  // CASO 11: Divisione per zero
  it('Caso 11: Previene la divisione per zero in presenza di PSU con 0 Watt', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14500'); // 154W
    const psuZero = makeComponent('psu-zero', 'psu', 'Alimentatore Guasto', {
      powerRating: 0,
      powerRatingSource: 'userDefined',
    });

    const budget = computeRigPowerBudgetFromInstalled([cpu, psuZero]);

    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });

  // CASO 12: Nessun NaN o Infinity
  it('Caso 12: Nessun campo produce mai NaN o Infinity', () => {
    const weirdComponents: Component[] = [
      makeComponent('c1', 'other', 'Strano 1'),
      makeComponent('c2', 'cpu', 'Senza TDP Spec'),
      makeComponent('c3', 'psu', 'PSU Senza Wattaggio'),
    ];

    const budget = computeRigPowerBudgetFromInstalled(weirdComponents);

    expect(isNaN(budget.knownPowerWatts)).toBe(false);
    expect(isNaN(budget.estimatedPeakWatts)).toBe(false);
    expect(Number.isFinite(budget.knownPowerWatts)).toBe(true);
    expect(Number.isFinite(budget.estimatedPeakWatts)).toBe(true);
    if (budget.estimatedUtilizationPercent !== null) {
      expect(Number.isFinite(budget.estimatedUtilizationPercent)).toBe(true);
      expect(isNaN(budget.estimatedUtilizationPercent)).toBe(false);
    }
    if (budget.estimatedHeadroomWatts !== null) {
      expect(Number.isFinite(budget.estimatedHeadroomWatts)).toBe(true);
      expect(isNaN(budget.estimatedHeadroomWatts)).toBe(false);
    }
  });

  // CASO 13: Determinismo del risultato
  it('Caso 13: Esecuzioni multiple producono risultati identici e deterministici', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'AMD Ryzen 7 7800X3D');
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4070 Ti');
    const psu = makeComponent('psu-1', 'psu', 'NZXT C750 Gold Core 750W');

    const run1 = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);
    const run2 = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);

    expect(run1).toEqual(run2);
  });

  // CASO 14: Verifica sul dataset reale userRigSeed.json
  it('Caso 14: Calcola accuratamente il Power Budget per il Rig reale (i5-14500, RTX 4070, C750W)', () => {
    const components = userRigData.components as unknown as Component[];
    const events = userRigData.events as unknown as ComponentEvent[];

    const budget = computeRigPowerBudget(components, events);

    // 22 componenti montati nel rig attuale, di cui 1 è la PSU (NZXT C750) e 21 sono carichi
    expect(budget.hasPsu).toBe(true);
    expect(budget.psuCapacityWatts).toBe(750);
    expect(budget.psuComponent?.name).toContain('NZXT C750');

    // Carichi con potenza dichiarata rilevata:
    // 1. CPU Intel Core i5-14500: TDP PL2 Turbo = 154 W (da note o lookup)
    // 2. GPU MSI GeForce RTX 4070: TDP riferimento = 200 W
    expect(budget.knownPowerWatts).toBe(354);
    expect(budget.estimatedPeakWatts).toBe(354);

    // Utilizzo PSU stimato: 354 / 750 = 47.2% -> 47%
    expect(budget.estimatedUtilizationPercent).toBe(47);

    // Margine stimato (Headroom): 750 - 354 = 396 W
    expect(budget.estimatedHeadroomWatts).toBe(396);
    expect(budget.headroomStatus).toBe('high');

    // La stima è parziale (RAM, Motherboard, SSD e ventole non hanno consumo dichiarato artificiale)
    expect(budget.isPartialEstimate).toBe(true);
    expect(budget.completenessNotice).toContain('Stima parziale');

    // Verifica estrazione PSU corretta
    const psuComponent = components.find((c) => c.id === 'comp-psu-nzxt-c750')!;
    const extractedPsu = extractPsuWattage(psuComponent);
    expect(extractedPsu.watts).toBe(750);
  });
});
