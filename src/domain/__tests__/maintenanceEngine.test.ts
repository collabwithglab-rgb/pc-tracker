import { describe, it, expect } from 'vitest';
import {
  sortMaintenanceEntriesChronologically,
  getMaintenanceByComponent,
  getLatestThermalPasteService,
  computeUpcomingMaintenance,
  computeTotalMaintenanceCost,
  validateMaintenanceEntry,
  filterMaintenanceEntries,
  computeDaysElapsed,
  computeDaysRemaining,
  evaluateThermalPasteCondition,
  evaluateCleaningCondition,
  getLatestCleaningService,
  getEarliestUpcomingMaintenance,
  computeMaintenanceConditionSummary,
} from '../maintenanceEngine';
import { MaintenanceEntry } from '../../types';

describe('maintenanceEngine', () => {
  const sampleEntries: MaintenanceEntry[] = [
    {
      id: 'maint-1',
      date: '2024-01-15',
      type: 'thermal_paste',
      title: 'Sostituzione pasta termica CPU',
      description: 'Applicata Arctic MX-4 su Ryzen 7 7800X3D',
      componentIds: ['comp-cpu'],
      cost: 8.5,
      productUsed: 'Arctic MX-4',
      nextDueDate: '2025-01-15',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'maint-2',
      date: '2024-06-20',
      type: 'filter_cleaning',
      title: 'Pulizia filtri antipolvere',
      description: 'Lavaggio filtri magnetici case',
      componentIds: ['comp-case'],
      cost: 0,
      nextDueDate: '2024-09-20',
      createdAt: '2024-06-20T14:30:00.000Z',
      updatedAt: '2024-06-20T14:30:00.000Z',
    },
    {
      id: 'maint-3',
      date: '2024-11-05',
      type: 'thermal_paste',
      title: 'Aggiornamento a Noctua NT-H2',
      description: 'Sostituita pasta con Noctua NT-H2 ad alte prestazioni',
      componentIds: ['comp-cpu'],
      cost: 14.9,
      productUsed: 'Noctua NT-H2',
      nextDueDate: '2025-11-05',
      createdAt: '2024-11-05T09:00:00.000Z',
      updatedAt: '2024-11-05T09:00:00.000Z',
    },
  ];

  it('ordina le voci di manutenzione cronologicamente in modo decrescente', () => {
    const sorted = sortMaintenanceEntriesChronologically(sampleEntries, 'desc');
    expect(sorted[0].id).toBe('maint-3');
    expect(sorted[1].id).toBe('maint-2');
    expect(sorted[2].id).toBe('maint-1');
  });

  it('ordina le voci di manutenzione in modo crescente se specificato', () => {
    const sorted = sortMaintenanceEntriesChronologically(sampleEntries, 'asc');
    expect(sorted[0].id).toBe('maint-1');
    expect(sorted[2].id).toBe('maint-3');
  });

  it('filtra per componentId correttamente', () => {
    const cpuMaint = getMaintenanceByComponent(sampleEntries, 'comp-cpu');
    expect(cpuMaint).toHaveLength(2);
    expect(cpuMaint.map((m) => m.id)).toEqual(['maint-1', 'maint-3']);

    const gpuMaint = getMaintenanceByComponent(sampleEntries, 'comp-gpu');
    expect(gpuMaint).toHaveLength(0);
  });

  it('trova l’ultima sostituzione di pasta termica per la CPU', () => {
    const latest = getLatestThermalPasteService(sampleEntries, 'comp-cpu');
    expect(latest).toBeDefined();
    expect(latest?.id).toBe('maint-3');
    expect(latest?.productUsed).toBe('Noctua NT-H2');
  });

  it('calcola le manutenzioni future in programma ordinate per data', () => {
    const upcoming = computeUpcomingMaintenance(sampleEntries, '2024-01-01');
    expect(upcoming).toHaveLength(3);
    expect(upcoming[0].id).toBe('maint-2'); // 2024-09-20
    expect(upcoming[1].id).toBe('maint-1'); // 2025-01-15
    expect(upcoming[2].id).toBe('maint-3'); // 2025-11-05
  });

  it('calcola la spesa complessiva della manutenzione', () => {
    const totalCost = computeTotalMaintenanceCost(sampleEntries);
    expect(totalCost).toBeCloseTo(23.4, 2);
  });

  it('valida una voce di manutenzione valida', () => {
    const res = validateMaintenanceEntry({
      title: 'Pulizia Ventole',
      date: '2024-10-10',
      type: 'fan_cleaning',
      cost: 5.0,
      nextDueDate: '2025-04-10',
    });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it('rifiuta date invalide, titoli mancanti o nextDueDate antecedente', () => {
    const res = validateMaintenanceEntry({
      title: '',
      date: 'invalid-date',
      type: 'other',
      nextDueDate: '2023-01-01',
      cost: -10,
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.title).toBeDefined();
    expect(res.errors.date).toBeDefined();
    expect(res.errors.cost).toBeDefined();
  });

  it('filtra per tipo e per query di ricerca', () => {
    const filtered = filterMaintenanceEntries(sampleEntries, {
      type: 'thermal_paste',
      searchQuery: 'Noctua',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('maint-3');
  });

  it('calcola correttamente i giorni trascorsi e rimanenti evitando offset di fuso orario', () => {
    expect(computeDaysElapsed('2024-01-01', '2024-01-11')).toBe(10);
    expect(computeDaysElapsed(undefined, '2024-01-11')).toBeNull();
    expect(computeDaysRemaining('2024-01-15', '2024-01-10')).toBe(5);
    expect(computeDaysRemaining('2024-01-05', '2024-01-10')).toBe(-5);
    expect(computeDaysRemaining(undefined, '2024-01-10')).toBeNull();
  });

  it('valuta le soglie documentate della pasta termica in modo rigoroso', () => {
    // < 180 giorni -> optimal (Fresca)
    const fresh = evaluateThermalPasteCondition('2024-05-01', '2024-07-01');
    expect(fresh.tier).toBe('optimal');
    expect(fresh.label).toBe('Fresca');
    expect(fresh.badgeClass).toBe('badge-emerald');

    // 180 - 365 giorni -> good (Buona)
    const good = evaluateThermalPasteCondition('2024-01-01', '2024-08-01');
    expect(good.tier).toBe('good');
    expect(good.badgeClass).toBe('badge-cyan');

    // 366 - 730 giorni -> monitor (Da monitorare)
    const monitor = evaluateThermalPasteCondition('2023-01-01', '2024-06-01');
    expect(monitor.tier).toBe('monitor');
    expect(monitor.badgeClass).toBe('badge-amber');

    // > 730 giorni -> due (Sostituzione consigliata)
    const degraded = evaluateThermalPasteCondition('2021-01-01', '2024-06-01');
    expect(degraded.tier).toBe('due');
    expect(degraded.label).toBe('Sostituzione consigliata');
    expect(degraded.badgeClass).toBe('badge-ruby');

    // Mai applicata
    const none = evaluateThermalPasteCondition(undefined, '2024-06-01');
    expect(none.tier).toBe('none');
    expect(none.badgeClass).toBe('badge-gray');
  });

  it('valuta le soglie documentate della pulizia filtri/ventole', () => {
    // < 60 giorni -> optimal (Fresca / Recente)
    const fresh = evaluateCleaningCondition('2024-05-15', '2024-06-01');
    expect(fresh.tier).toBe('optimal');
    expect(fresh.label).toBe('Fresca');

    // 60 - 120 giorni -> good (Buona)
    const good = evaluateCleaningCondition('2024-03-01', '2024-06-01');
    expect(good.tier).toBe('good');

    // > 120 giorni -> monitor (Da monitorare)
    const monitor = evaluateCleaningCondition('2023-11-01', '2024-06-01');
    expect(monitor.tier).toBe('monitor');

    // Nessuna pulizia registrata
    const none = evaluateCleaningCondition(undefined, '2024-06-01');
    expect(none.tier).toBe('none');
  });

  it('trova l’ultima pulizia e la scadenza più imminente', () => {
    const latestClean = getLatestCleaningService(sampleEntries);
    expect(latestClean?.id).toBe('maint-2');

    const earliest = getEarliestUpcomingMaintenance(sampleEntries, '2024-07-01');
    expect(earliest).toBeDefined();
    expect(earliest?.entry.id).toBe('maint-2');
    expect(earliest?.isOverdue).toBe(false);

    // Con data successiva al 2024-09-20, diventa scaduta (isOverdue = true)
    const overdue = getEarliestUpcomingMaintenance(sampleEntries, '2024-10-01');
    expect(overdue?.isOverdue).toBe(true);
  });

  it('calcola la scheda di sintesi Condizione Attuale integrata', () => {
    const summary = computeMaintenanceConditionSummary(
      sampleEntries,
      [{ id: 'comp-cpu', name: 'AMD Ryzen 7 7800X3D' }],
      '2024-12-01'
    );

    expect(summary.totalCost).toBeCloseTo(23.4, 2);
    expect(summary.totalEntriesCount).toBe(3);
    expect(summary.lastThermalPaste.entry?.id).toBe('maint-3');
    expect(summary.lastThermalPaste.productUsed).toBe('Noctua NT-H2');
    expect(summary.lastThermalPaste.componentName).toBe('AMD Ryzen 7 7800X3D');
    expect(summary.lastCleaning.entry?.id).toBe('maint-2');
    expect(summary.upcomingCount).toBe(3); // All 3 entries have nextDueDate scheduled
  });
});
