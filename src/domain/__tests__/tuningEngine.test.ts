import { describe, it, expect } from 'vitest';
import {
  sortTuningProfiles,
  getTuningProfilesByComponent,
  groupTuningProfilesByCategory,
  validateTuningProfile,
  filterTuningProfiles,
  TUNING_TEMPLATES,
  generateBiosParameterCardMarkdown,
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

  it('valida biosVersion opzionale e rifiuta versioni eccessivamente lunghe', () => {
    const valid = validateTuningProfile({
      name: 'Valid with BIOS',
      date: '2024-05-01',
      category: 'cpu',
      type: 'curve_optimizer',
      stability: 'daily',
      biosVersion: 'AGESA 1.2.0.2 / BIOS 2401',
    });
    expect(valid.isValid).toBe(true);

    const invalid = validateTuningProfile({
      name: 'Invalid BIOS',
      date: '2024-05-01',
      biosVersion: 'A'.repeat(65),
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.biosVersion).toBeDefined();
  });

  it('espone i template di tuning contestuali per CPU, GPU, RAM e Ventole', () => {
    const templatesList = Object.values(TUNING_TEMPLATES);
    expect(templatesList.length).toBeGreaterThanOrEqual(5);

    const cpuPbo = TUNING_TEMPLATES.cpu_curve_optimizer;
    expect(cpuPbo).toBeDefined();
    expect(cpuPbo.category).toBe('cpu');
    expect(cpuPbo.defaultParameters).toHaveProperty('Curve Optimizer Offset');

    const gpuUv = TUNING_TEMPLATES.gpu_undervolt;
    expect(gpuUv).toBeDefined();
    expect(gpuUv.category).toBe('gpu');
    expect(gpuUv.defaultParameters).toHaveProperty('Target Voltage (mV)');
    expect(gpuUv.defaultParameters).toHaveProperty('Power Limit (%)');

    const ramExpo = TUNING_TEMPLATES.ram_timings;
    expect(ramExpo).toBeDefined();
    expect(ramExpo.category).toBe('ram');
    expect(ramExpo.defaultParameters).toHaveProperty('Frequency (MT/s)');
    expect(ramExpo.defaultParameters).toHaveProperty('tCL');

    const fanCurve = TUNING_TEMPLATES.fan_curve;
    expect(fanCurve).toBeDefined();
    expect(fanCurve.category).toBe('cooling');
    expect(fanCurve.defaultParameters).toHaveProperty('Target Temp (°C)');
  });

  it('genera correttamente il Markdown della Scheda Parametri BIOS con solo i dati reali registrati', () => {
    const profileWithAllFields: TuningProfile = {
      id: 'prof-test',
      name: 'Ryzen 7800X3D Daily UV',
      category: 'cpu',
      type: 'curve_optimizer',
      date: '2024-06-15',
      stability: 'daily',
      biosVersion: '2401 (AGESA 1.2.0.2)',
      parameters: {
        curveAllCore: -25,
        pptWatts: 85,
        tdcAmps: 75,
        edcAmps: 110,
      },
      temperatures: { idle: 37, load: 72 },
      observedPowerWatts: 74,
      benchmarks: [{ name: 'Cinebench R23 Multi', score: 18450 }],
      notes: 'Stabile 24h Prime95 e OCCT.',
      createdAt: '2024-06-15T10:00:00.000Z',
      updatedAt: '2024-06-15T10:00:00.000Z',
    };

    const md = generateBiosParameterCardMarkdown(profileWithAllFields, 'AMD Ryzen 7 7800X3D');

    // Header e metadati
    expect(md).toContain('# Scheda Parametri Hardware & BIOS');
    expect(md).toContain('- **Profilo**: Ryzen 7800X3D Daily UV');
    expect(md).toContain('- **Componente**: AMD Ryzen 7 7800X3D');
    expect(md).toContain('- **Versione BIOS / AGESA**: 2401 (AGESA 1.2.0.2)');
    expect(md).toContain('- **Stabilità Dichiarata**: Profilo Giornaliero (Daily)');
    expect(md).toContain('- **Data Configurazione**: 2024-06-15');

    // Parametri tecnici in tabella
    expect(md).toContain('## Parametri Registrati');
    expect(md).toContain('| curveAllCore | -25 |');
    expect(md).toContain('| pptWatts | 85 |');

    // Rilevamenti, temperature e consumi rigorosamente separati
    expect(md).toContain('## Rilevamenti, Temperature & Benchmark');
    expect(md).toContain('Idle: 37°C | Load: 72°C');
    expect(md).toContain('- **Potenza Assorbita Osservata**: 74 W');

    // Benchmark e note
    expect(md).toContain('Cinebench R23 Multi: **18450**');
    expect(md).toContain('## Note & Commenti di Stabilità');
    expect(md).toContain('Stabile 24h Prime95 e OCCT.');
  });

  it('omette i campi mancanti nella Scheda Parametri BIOS senza inventare dati', () => {
    const minimalProfile: TuningProfile = {
      id: 'prof-min',
      name: 'GPU Basic Curve',
      category: 'gpu',
      type: 'gpu_undervolt',
      date: '2024-08-01',
      stability: 'testing',
      parameters: { voltageMv: 925 },
      createdAt: '2024-08-01T10:00:00.000Z',
      updatedAt: '2024-08-01T10:00:00.000Z',
    };

    const md = generateBiosParameterCardMarkdown(minimalProfile);

    expect(md).toContain('- **Profilo**: GPU Basic Curve');
    expect(md).not.toContain('Versione BIOS / AGESA');
    expect(md).not.toContain('Rilevamenti, Temperature & Benchmark');
    expect(md).not.toContain('Note & Commenti di Stabilità');
    expect(md).toContain('| voltageMv | 925 |');
  });
});
