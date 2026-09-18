import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceEntry, TuningProfile, DatabaseSchema } from '../../types';
import {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
} from '../backupService';

// In-memory mock store
const inMemoryStores = new Map<string, Map<string, unknown>>();

function getStore(name: string): Map<string, unknown> {
  if (!inMemoryStores.has(name)) {
    inMemoryStores.set(name, new Map());
  }
  return inMemoryStores.get(name)!;
}

vi.mock('../indexedDB', () => ({
  STORES: {
    COMPONENTS: 'components',
    EVENTS: 'events',
    UPGRADES: 'upgrades',
    METADATA: 'metadata',
    CHECKPOINTS: 'checkpoints',
    RECEIPTS: 'receipts',
    MAINTENANCE: 'maintenance',
    TUNING: 'tuningProfiles',
  },
  getAllFromStore: vi.fn(async (storeName: string) => Array.from(getStore(storeName).values())),
  getByIdFromStore: vi.fn(async (storeName: string, id: string) => getStore(storeName).get(id)),
  putItem: vi.fn(async (storeName: string, item: any) => {
    const key = storeName === 'metadata' ? item.key : item.id;
    getStore(storeName).set(key, item);
  }),
  deleteItemFromStore: vi.fn(async (storeName: string, id: string) => {
    getStore(storeName).delete(id);
  }),
  replaceAllDataAtomic: vi.fn(async (params: any) => {
    getStore('components').clear();
    for (const c of params.components || []) getStore('components').set(c.id, c);
    getStore('events').clear();
    for (const e of params.events || []) getStore('events').set(e.id, e);
    getStore('upgrades').clear();
    for (const u of params.upgrades || []) getStore('upgrades').set(u.id, u);
    getStore('checkpoints').clear();
    for (const cp of params.checkpoints || []) getStore('checkpoints').set(cp.id, cp);
    getStore('receipts').clear();
    for (const r of params.receipts || []) getStore('receipts').set(r.id, r);
    getStore('maintenance').clear();
    for (const m of params.maintenance || []) getStore('maintenance').set(m.id, m);
    getStore('tuningProfiles').clear();
    for (const t of params.tuningProfiles || []) getStore('tuningProfiles').set(t.id, t);
    getStore('metadata').clear();
    for (const m of params.metadataItems || []) getStore('metadata').set(m.key, m);
  }),
}));

describe('Maintenance & Tuning Storage Integration', () => {
  beforeEach(() => {
    inMemoryStores.clear();

    // Inserimento componente e evento base per validità referenziale
    getStore('components').set('comp-cpu', {
      id: 'comp-cpu',
      name: 'Ryzen 7 7800X3D',
      brand: 'AMD',
      model: '7800X3D',
      category: 'cpu',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    getStore('events').set('ev-1', {
      id: 'ev-1',
      componentId: 'comp-cpu',
      type: 'PURCHASE',
      date: '2024-01-01',
      price: 380,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('esporta e include correttamente maintenance e tuning nel backup JSON', async () => {
    const maint: MaintenanceEntry = {
      id: 'maint-1',
      date: '2024-06-01',
      type: 'thermal_paste',
      title: 'Cambio pasta termica',
      description: 'Applicata Noctua NT-H2',
      componentIds: ['comp-cpu'],
      cost: 12.5,
      productUsed: 'Noctua NT-H2',
      createdAt: '2024-06-01T10:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z',
    };
    getStore('maintenance').set(maint.id, maint);

    const tuning: TuningProfile = {
      id: 'tune-1',
      name: 'Curve Optimizer -25 All-Core',
      componentId: 'comp-cpu',
      category: 'cpu',
      date: '2024-06-02',
      type: 'curve_optimizer',
      parameters: { curveAllCore: -25 },
      stability: 'daily',
      createdAt: '2024-06-02T10:00:00.000Z',
      updatedAt: '2024-06-02T10:00:00.000Z',
    };
    getStore('tuningProfiles').set(tuning.id, tuning);

    const jsonStr = await exportDatabaseToJSON();
    const parsed = JSON.parse(jsonStr) as DatabaseSchema;

    expect(parsed.maintenance).toBeDefined();
    expect(parsed.maintenance).toHaveLength(1);
    expect(parsed.maintenance![0].id).toBe('maint-1');

    expect(parsed.tuningProfiles).toBeDefined();
    expect(parsed.tuningProfiles).toHaveLength(1);
    expect(parsed.tuningProfiles![0].id).toBe('tune-1');
  });

  it('valida e importa con successo un backup contenente manutenzione e tuning', async () => {
    const backupPayload = {
      schemaVersion: 1,
      appVersion: '0.2.2',
      settings: { rigName: 'Gaming PC' },
      components: [
        { id: 'comp-cpu', name: 'Ryzen 7', brand: 'AMD', model: '7800X3D', category: 'cpu' },
      ],
      events: [
        { id: 'ev-1', componentId: 'comp-cpu', type: 'PURCHASE', date: '2024-01-01', price: 350 },
      ],
      maintenance: [
        {
          id: 'maint-1',
          date: '2024-07-01',
          type: 'cleaning',
          title: 'Pulizia filtri',
          description: 'Pulizia filtri case',
        },
      ],
      tuningProfiles: [
        {
          id: 'tune-1',
          name: 'Profilo Eco 65W',
          category: 'cpu',
          date: '2024-07-02',
          type: 'power_limit',
          parameters: { ppt: 65 },
          stability: 'stable',
        },
      ],
    };

    const validation = validateImportJSON(JSON.stringify(backupPayload));
    expect(validation.isValid).toBe(true);

    if (validation.isValid) {
      expect(validation.counts.maintenance).toBe(1);
      expect(validation.counts.tuningProfiles).toBe(1);

      await executeImport(validation.parsedData);
      expect(getStore('maintenance').has('maint-1')).toBe(true);
      expect(getStore('tuningProfiles').has('tune-1')).toBe(true);
    }
  });

  it('preserva la retrocompatibilità totale con vecchi backup privi di manutenzione o tuning', async () => {
    const legacyPayload = {
      schemaVersion: 1,
      appVersion: '0.1.0',
      settings: { rigName: 'Legacy PC' },
      components: [
        { id: 'comp-cpu', name: 'Ryzen 7', brand: 'AMD', model: '7800X3D', category: 'cpu' },
      ],
      events: [
        { id: 'ev-1', componentId: 'comp-cpu', type: 'PURCHASE', date: '2024-01-01', price: 350 },
      ],
    };

    const validation = validateImportJSON(JSON.stringify(legacyPayload));
    expect(validation.isValid).toBe(true);

    if (validation.isValid) {
      expect(validation.counts.maintenance).toBe(0);
      expect(validation.counts.tuningProfiles).toBe(0);

      await executeImport(validation.parsedData);
      expect(getStore('components').has('comp-cpu')).toBe(true);
      expect(getStore('maintenance').size).toBe(0);
      expect(getStore('tuningProfiles').size).toBe(0);
    }
  });
});
