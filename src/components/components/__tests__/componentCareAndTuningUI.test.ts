import { describe, it, expect } from 'vitest';
import { MaintenanceEntry, TuningProfile, Component } from '../../../types';
import {
  getMaintenanceByComponent,
  getTuningProfilesByComponent,
  getLatestThermalPasteService,
  sortMaintenanceEntriesChronologically,
  sortTuningProfiles,
  getMaintenanceTypeBadgeClass,
  getTuningStabilityBadgeClass,
} from '../../../domain';

describe('Component Care & Tuning Integration Suite (PC Care Center — Tranche 2)', () => {
  const mockGpu: Component = {
    id: 'comp-gpu-4090',
    name: 'RTX 4090 ROG Strix',
    brand: 'ASUS',
    model: 'ROG Strix OC',
    category: 'gpu',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockCpu: Component = {
    id: 'comp-cpu-7800x3d',
    name: 'Ryzen 7 7800X3D',
    brand: 'AMD',
    model: '100-100000910WOF',
    category: 'cpu',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockMaintenanceEntries: MaintenanceEntry[] = [
    {
      id: 'm1',
      title: 'Pulizia filtri e ventole GPU',
      description: 'Pulizia ordinaria',
      date: '2026-03-01',
      type: 'fan_cleaning',
      componentIds: ['comp-gpu-4090'],
      cost: 0,
      notes: 'Aria compressa e pennello',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-01',
    },
    {
      id: 'm2',
      title: 'Sostituzione Pasta Termica Noctua NT-H2',
      description: 'Cambio pasta termica periodico',
      date: '2025-10-15',
      type: 'thermal_paste',
      componentIds: ['comp-cpu-7800x3d'],
      productUsed: 'Noctua NT-H2',
      cost: 9.5,
      createdAt: '2025-10-15',
      updatedAt: '2025-10-15',
    },
    {
      id: 'm3',
      title: 'Pulizia generale case',
      description: 'Aspirazione polvere',
      date: '2026-01-10',
      type: 'cleaning',
      componentIds: ['comp-gpu-4090', 'comp-cpu-7800x3d'],
      cost: 0,
      createdAt: '2026-01-10',
      updatedAt: '2026-01-10',
    },
  ];

  const mockTuningProfiles: TuningProfile[] = [
    {
      id: 't1',
      name: 'Undervolt RTX 4090 950mV',
      date: '2026-02-01',
      type: 'gpu_undervolt',
      stability: 'daily',
      category: 'gpu',
      componentId: 'comp-gpu-4090',
      parameters: {
        'Target Voltage (mV)': '950',
        'Core Clock (MHz)': '2650',
      },
      temperatures: { idle: 35, load: 65 },
      observedPowerWatts: 320,
      createdAt: '2026-02-01',
      updatedAt: '2026-02-01',
    },
    {
      id: 't2',
      name: 'AMD Curve Optimizer -30 All Cores',
      date: '2026-01-15',
      type: 'curve_optimizer',
      stability: 'stable',
      category: 'cpu',
      componentId: 'comp-cpu-7800x3d',
      parameters: {
        'Curve Optimizer Offset': '-30',
      },
      temperatures: { idle: 42, load: 78 },
      observedPowerWatts: 82,
      createdAt: '2026-01-15',
      updatedAt: '2026-01-15',
    },
  ];

  describe('1. Filtraggio e Ordinamento Manutenzione per Componente', () => {
    it('isola correttamente gli interventi collegati al componente target', () => {
      const gpuEntries = getMaintenanceByComponent(mockMaintenanceEntries, mockGpu.id);
      expect(gpuEntries).toHaveLength(2);
      expect(gpuEntries.map((e) => e.id)).toEqual(['m1', 'm3']);

      const cpuEntries = getMaintenanceByComponent(mockMaintenanceEntries, mockCpu.id);
      expect(cpuEntries).toHaveLength(2);
      expect(cpuEntries.map((e) => e.id)).toEqual(['m2', 'm3']);

      const emptyEntries = getMaintenanceByComponent(mockMaintenanceEntries, 'non-existing-id');
      expect(emptyEntries).toHaveLength(0);
    });

    it('ordina cronologicamente gli interventi in ordine decrescente', () => {
      const gpuEntries = getMaintenanceByComponent(mockMaintenanceEntries, mockGpu.id);
      const sorted = sortMaintenanceEntriesChronologically(gpuEntries, 'desc');
      expect(sorted[0].id).toBe('m1'); // 2026-03-01
      expect(sorted[1].id).toBe('m3'); // 2026-01-10
    });

    it('identifica l’ultima applicazione di pasta termica specifica per CPU', () => {
      const latestCpuPaste = getLatestThermalPasteService(mockMaintenanceEntries, mockCpu.id);
      expect(latestCpuPaste).toBeDefined();
      expect(latestCpuPaste?.id).toBe('m2');
      expect(latestCpuPaste?.productUsed).toBe('Noctua NT-H2');

      const latestGpuPaste = getLatestThermalPasteService(mockMaintenanceEntries, mockGpu.id);
      expect(latestGpuPaste).toBeUndefined();
    });

    it('assegna la classe badge corretta al tipo di manutenzione', () => {
      expect(getMaintenanceTypeBadgeClass('fan_cleaning')).toBe('badge-cyan');
      expect(getMaintenanceTypeBadgeClass('thermal_paste')).toBe('badge-amber');
      expect(getMaintenanceTypeBadgeClass('cleaning')).toBe('badge-cyan');
      expect(getMaintenanceTypeBadgeClass('storage_maintenance')).toBe('badge-emerald');
    });
  });

  describe('2. Filtraggio e Ordinamento Tuning per Componente', () => {
    it('isola correttamente i profili di tuning collegati al componente target', () => {
      const gpuProfiles = getTuningProfilesByComponent(mockTuningProfiles, mockGpu.id);
      expect(gpuProfiles).toHaveLength(1);
      expect(gpuProfiles[0].id).toBe('t1');
      expect(gpuProfiles[0].name).toBe('Undervolt RTX 4090 950mV');

      const cpuProfiles = getTuningProfilesByComponent(mockTuningProfiles, mockCpu.id);
      expect(cpuProfiles).toHaveLength(1);
      expect(cpuProfiles[0].id).toBe('t2');

      const emptyProfiles = getTuningProfilesByComponent(mockTuningProfiles, 'comp-unknown');
      expect(emptyProfiles).toHaveLength(0);
    });

    it('ordina i profili di tuning cronologicamente', () => {
      const sorted = sortTuningProfiles(mockTuningProfiles);
      expect(sorted[0].id).toBe('t1'); // 2026-02-01
      expect(sorted[1].id).toBe('t2'); // 2026-01-15
    });

    it('assegna la classe badge corretta alla stabilità del profilo', () => {
      expect(getTuningStabilityBadgeClass('daily')).toBe('badge-emerald');
      expect(getTuningStabilityBadgeClass('stable')).toBe('badge-cyan');
      expect(getTuningStabilityBadgeClass('testing')).toBe('badge-amber');
      expect(getTuningStabilityBadgeClass('unstable')).toBe('badge-ruby');
    });
  });

  describe('3. Precompilazione Intelligente per Form Modali', () => {
    it('genera initialValues con componente pre-selezionato per manutenzione', () => {
      const initialMaint = {
        componentIds: [mockGpu.id],
        title: `Cura ${mockGpu.name}`,
      };

      expect(initialMaint.componentIds).toContain('comp-gpu-4090');
      expect(initialMaint.title).toBe('Cura RTX 4090 ROG Strix');
    });

    it('genera initialValues con componente e categoria pre-selezionati per tuning', () => {
      const initialTuning = {
        componentId: mockGpu.id,
        category: mockGpu.category,
      };

      expect(initialTuning.componentId).toBe('comp-gpu-4090');
      expect(initialTuning.category).toBe('gpu');
    });
  });
});
