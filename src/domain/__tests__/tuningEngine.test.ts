import { describe, it, expect } from 'vitest';
import {
  sortTuningProfiles,
  getTuningProfilesByComponent,
  groupTuningProfilesByCategory,
  validateTuningProfile,
  filterTuningProfiles,
} from '../tuningEngine';
import { TuningProfile } from '../../types';

describe('tuningEngine', () => {
  const sampleProfiles: TuningProfile[] = [
    {
      id: 'tuning-1',
      name: 'CPU Curve Optimizer -20 All-Core',
      componentId: 'comp-cpu',
      category: 'cpu',
      date: '2024-02-10',
      type: 'curve_optimizer',
      parameters: { curveAllCore: -20, pptWatts: 85 },
      stability: 'daily',
      benchmarks: [{ name: 'Cinebench R23', score: 18200 }],
      temperatures: { idle: 38, load: 74 },
      observedPowerWatts: 78,
      createdAt: '2024-02-10T11:00:00.000Z',
      updatedAt: '2024-02-10T11:00:00.000Z',
    },
    {
      id: 'tuning-2',
      name: 'GPU Undervolt 0.950V @ 2700MHz',
      componentId: 'comp-gpu',
      category: 'gpu',
      date: '2024-03-01',
      type: 'gpu_undervolt',
      parameters: { voltageMv: 950, coreClockMhz: 2700, memoryClockMhz: 1000 },
      stability: 'stable',
      benchmarks: [{ name: '3DMark Time Spy', score: 18500 }],
      temperatures: { idle: 32, load: 62 },
      observedPowerWatts: 185,
      createdAt: '2024-03-01T15:00:00.000Z',
      updatedAt: '2024-03-01T15:00:00.000Z',
    },
    {
      id: 'tuning-3',
      name: 'RAM EXPO I 6000MHz CL30',
      componentId: 'comp-ram',
      category: 'ram',
      date: '2024-01-20',
      type: 'memory_xmp_expo',
      parameters: { speedMts: 6000, cl: 30, trcd: 36, trp: 36, tras: 76, dramVoltage: 1.35 },
      stability: 'daily',
      createdAt: '2024-01-20T10:00:00.000Z',
      updatedAt: '2024-01-20T10:00:00.000Z',
    },
  ];

  it('ordina i profili per data decrescente', () => {
    const sorted = sortTuningProfiles(sampleProfiles);
    expect(sorted[0].id).toBe('tuning-2'); // 2024-03-01
    expect(sorted[1].id).toBe('tuning-1'); // 2024-02-10
    expect(sorted[2].id).toBe('tuning-3'); // 2024-01-20
  });

  it('filtra i profili per componente collegato', () => {
    const cpuProfiles = getTuningProfilesByComponent(sampleProfiles, 'comp-cpu');
    expect(cpuProfiles).toHaveLength(1);
    expect(cpuProfiles[0].name).toContain('Curve Optimizer');
  });

  it('raggruppa i profili per categoria hardware', () => {
    const grouped = groupTuningProfilesByCategory(sampleProfiles);
    expect(grouped.cpu).toHaveLength(1);
    expect(grouped.gpu).toHaveLength(1);
    expect(grouped.ram).toHaveLength(1);
    expect(grouped.cooling).toHaveLength(0);
  });

  it('valida un profilo di tuning corretto', () => {
    const res = validateTuningProfile({
      name: 'Test Profile',
      date: '2024-05-01',
      category: 'cpu',
      type: 'cpu_undervolt',
      stability: 'testing',
      observedPowerWatts: 65,
    });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it('rifiuta un profilo privo di nome o con data non valida', () => {
    const res = validateTuningProfile({
      name: '',
      date: 'non-valid-date',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.name).toBeDefined();
    expect(res.errors.date).toBeDefined();
  });

  it('filtra per categoria e testo di ricerca', () => {
    const filtered = filterTuningProfiles(sampleProfiles, {
      category: 'gpu',
      searchQuery: '0.950V',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('tuning-2');
  });
});
