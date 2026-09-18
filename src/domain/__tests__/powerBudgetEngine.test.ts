import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent } from '../../types';
import {
  computeRigPowerBudget,
  computeRigPowerBudgetFromInstalled,
  extractPsuWattage,
  evaluateHeadroomStatus,
} from '../powerBudgetEngine';
import userRigData from './fixtures/userRigSeed.json';

describe('PowerBudgetEngine (Sessione 3 — Semantic Correction Pass)', () => {
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
    expect(budget.estimatedPeakWatts).toBeNull();
    expect(budget.knownComponentsCount).toBe(0);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.hasAnyPowerData).toBe(false);
    expect(budget.isPartialEstimate).toBe(false);
    expect(budget.isCompleteEstimate).toBe(false);
    expect(budget.psuComponent).toBeNull();
    expect(budget.psuCapacityWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
    expect(budget.completenessNotice).toBe('Nessun componente montato nel PC attuale.');
  });

  // CASO 2: Solo CPU
  it('Caso 2: Calcola il budget con sola CPU montata (dataset completo per i componenti presenti)', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14600K');
    const budget = computeRigPowerBudgetFromInstalled([cpu]);

    expect(budget.totalComponents).toBe(1);
    expect(budget.knownPowerWatts).toBe(181);
    expect(budget.estimatedPeakWatts).toBe(181); // Completo per i componenti montati
    expect(budget.knownComponentsCount).toBe(1);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.isCompleteEstimate).toBe(true);
    expect(budget.isPartialEstimate).toBe(false);
    expect(budget.psuComponent).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
    expect(budget.categoryBreakdown.find((c) => c.category === 'cpu')?.totalWatts).toBe(181);
  });

  // CASO 3: CPU + GPU complete
  it('Caso 3: Calcola la stima di picco con CPU + GPU (dataset completo)', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'AMD Ryzen 7 7800X3D'); // 120W
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4080'); // 320W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu]);

    expect(budget.totalComponents).toBe(2);
    expect(budget.knownPowerWatts).toBe(440);
    expect(budget.estimatedPeakWatts).toBe(440);
    expect(budget.knownComponentsCount).toBe(2);
    expect(budget.unknownComponentsCount).toBe(0);
    expect(budget.isCompleteEstimate).toBe(true);
    expect(budget.isPartialEstimate).toBe(false);
  });

  // CASO A (Specifica Sezione 9): CPU + GPU noti, componenti ausiliari sconosciuti
  it('Caso A: CPU + GPU noti, componenti ausiliari sconosciuti -> peak, headroom e utilization sono null', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'AMD Ryzen 5 7600X'); // 105W
    const gpu = makeComponent('gpu-1', 'gpu', 'NVIDIA GeForce RTX 4070', {
      powerRating: 200,
      powerRatingSource: 'declared',
    });
    const mobo = makeComponent('mobo-1', 'motherboard', 'ASUS Prime B650');
    const ram = makeComponent('ram-1', 'ram', 'Kingston Fury 32GB');
    const psu = makeComponent('psu-1', 'psu', 'Corsair RM750e 750W'); // 750W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu, mobo, ram, psu]);

    expect(budget.knownPowerWatts).toBe(305); // 105 + 200
    expect(budget.isPartialEstimate).toBe(true);
    expect(budget.isCompleteEstimate).toBe(false);

    // CORREZIONE SEMANTICA: non spacciare la somma parziale per picco del sistema
    expect(budget.estimatedPeakWatts).toBeNull();
    // Margine e utilizzo non determinabili
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });

  // CASO B (Specifica Sezione 9): Tutti i contributi necessari disponibili
  it('Caso B: Tutti i contributi necessari disponibili -> peak, headroom e utilization calcolati', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core i5-14600K'); // 181W
    const gpu = makeComponent('gpu-1', 'gpu', 'MSI RTX 4070 Super'); // 220W
    const psu = makeComponent('psu-1', 'psu', 'Corsair RM850x 850W Gold'); // 850W

    const budget = computeRigPowerBudgetFromInstalled([cpu, gpu, psu]);

    expect(budget.isCompleteEstimate).toBe(true);
    expect(budget.isPartialEstimate).toBe(false);
    expect(budget.knownPowerWatts).toBe(401);
    expect(budget.estimatedPeakWatts).toBe(401);
    expect(budget.psuCapacityWatts).toBe(850);
    expect(budget.estimatedUtilizationPercent).toBe(Math.round((401 / 850) * 100)); // 47%
    expect(budget.estimatedHeadroomWatts).toBe(850 - 401); // 449W
    expect(budget.headroomStatus).toBe('high');
  });

  // CASO C (Specifica Sezione 9): PSU presente ma dati del sistema insufficienti
  it('Caso C: PSU presente ma dati del sistema insufficienti -> PSU capacity disponibile, headroom NON presentato come completo', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Ryzen 7 7700X'); // 105W
    const ram = makeComponent('ram-1', 'ram', 'DDR5 32GB'); // unknown
    const psu = makeComponent('psu-1', 'psu', 'Seasonic Focus 650W'); // 650W

    const budget = computeRigPowerBudgetFromInstalled([cpu, ram, psu]);

    expect(budget.hasPsu).toBe(true);
    expect(budget.psuCapacityWatts).toBe(650);
    expect(budget.isPartialEstimate).toBe(true);
    // Headroom e utilization devono essere rigorosamente null per non dare false certezze
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');
  });

  // CASO D (Specifica Sezione 9): Nessun PSU
  it('Caso D: Nessun PSU montato -> tutte le metriche dipendenti da PSU sono null e headroom unknown', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Ryzen 7 7700X'); // 105W
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

    const moboEst = budget.estimates.find((e) => e.componentId === 'mobo-1')!;
    expect(moboEst.watts).toBeNull();
    expect(moboEst.source).toBe('unknown');

    const ramEst = budget.estimates.find((e) => e.componentId === 'ram-1')!;
    expect(ramEst.watts).toBeNull();
    expect(ramEst.source).toBe('unknown');

    const ssdEst = budget.estimates.find((e) => e.componentId === 'ssd-1')!;
    expect(ssdEst.watts).toBeNull();
    expect(ssdEst.source).toBe('unknown');

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
      },
      {
        id: 'ev-3',
        componentId: 'c-psu',
        type: 'INSTALL',
        date: '2024-01-01',
        createdAt: dummyCreatedAt,
      },
    ];

    const budget = computeRigPowerBudget([compCpu, compOldGpu, compPsu], events);

    expect(budget.totalComponents).toBe(1);
    expect(budget.knownPowerWatts).toBe(120);
    expect(budget.isCompleteEstimate).toBe(true);
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

  // CASO 11: Divisione per zero
  it('Caso 11: Previene la divisione per zero in presenza di PSU con 0 Watt', () => {
    const cpu = makeComponent('cpu-1', 'cpu', 'Intel Core 14th Gen 14500'); // 154W
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
    expect(Number.isFinite(budget.knownPowerWatts)).toBe(true);
    if (budget.estimatedPeakWatts !== null) {
      expect(Number.isFinite(budget.estimatedPeakWatts)).toBe(true);
      expect(isNaN(budget.estimatedPeakWatts)).toBe(false);
    }
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
  it('Caso 14: Calcola accuratamente il Power Budget per il Rig reale (22 pezzi, stima parziale)', () => {
    const components = userRigData.components as unknown as Component[];
    const events = userRigData.events as unknown as ComponentEvent[];

    const budget = computeRigPowerBudget(components, events);

    // 22 componenti montati nel rig attuale: 1 PSU e 21 carichi
    expect(budget.hasPsu).toBe(true);
    expect(budget.psuCapacityWatts).toBe(750);
    expect(budget.psuComponent?.name).toContain('NZXT C750');

    // Potenza nota dei componenti con dato disponibile:
    // CPU (PL2 Turbo 154 W) + GPU RTX 4070 (200 W) = 354 W
    expect(budget.knownPowerWatts).toBe(354);

    // CORREZIONE SEMANTICA: Essendo la stima parziale (mancano consumi dichiarati per RAM, Mobo, NVMe, ventole):
    // - estimatedPeakWatts è null (non spacciato come picco di sistema)
    expect(budget.isPartialEstimate).toBe(true);
    expect(budget.isCompleteEstimate).toBe(false);
    expect(budget.estimatedPeakWatts).toBeNull();

    // - Headroom e utilization sono null per trasparenza totale (non si forza un falso ~396W o ~47%)
    expect(budget.estimatedUtilizationPercent).toBeNull();
    expect(budget.estimatedHeadroomWatts).toBeNull();
    expect(budget.headroomStatus).toBe('unknown');

    // Avviso descrittivo trasparente
    expect(budget.completenessNotice).toContain('Stima parziale');

    // Estrazione PSU confermata
    const psuComponent = components.find((c) => c.id === 'comp-psu-nzxt-c750')!;
    const extractedPsu = extractPsuWattage(psuComponent);
    expect(extractedPsu.watts).toBe(750);
  });
});
