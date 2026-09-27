import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizationExecutionRecord, DatabaseSchema } from '../../types';
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
    OPTIMIZATION_HISTORY: 'optimizationHistory',
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
    getStore('optimizationHistory').clear();
    for (const o of params.optimizationHistory || []) getStore('optimizationHistory').set(o.id, o);
    getStore('metadata').clear();
    for (const m of params.metadataItems || []) getStore('metadata').set(m.key, m);
  }),
}));

describe('Optimization History Storage & Backup Integration', () => {
  const sampleRecord: OptimizationExecutionRecord = {
    id: 'opt-rec-1',
    recommendationId: 'rec-trim-C',
    recommendationTitle: 'Esegui Ottimizzazione TRIM (C:)',
    timestampStarted: '2026-09-25T14:00:00.000Z',
    timestampCompleted: '2026-09-25T14:00:01.500Z',
    durationMs: 1500,
    category: 'storage',
    actionAvailability: 'ONE_CLICK',
    target: 'Unità C:',
    triggerReason: 'Nessun TRIM registrato negli ultimi 30 giorni.',
    triggerEvidence: 'Ultimo TRIM: mai',
    actionId: 'run-trim',
    actionDescription: 'Invio comando TRIM all\'SSD C:',
    outcome: 'success',
    verificationType: 'state_based',
    verificationStatus: 'verified',
    verificationMethod: 'Interrogazione esito comando TRIM Windows',
    evidenceBefore: 'Ultimo TRIM: mai',
    evidenceAfter: 'Comando TRIM eseguito con successo su volume C:',
    schemaVersion: 1,
  };

  beforeEach(() => {
    inMemoryStores.clear();
    // Default valid components and events to satisfy backup prerequisites
    getStore('components').set('comp-1', {
      id: 'comp-1',
      name: 'Samsung 990 Pro',
      brand: 'Samsung',
      model: '2TB',
      category: 'storage',
    });
    getStore('events').set('ev-1', {
      id: 'ev-1',
      componentId: 'comp-1',
      date: '2025-01-01',
      type: 'PURCHASE',
      price: 180,
    });
    getStore('metadata').set('settings', {
      key: 'settings',
      value: { rigName: 'Test Rig' },
    });
  });

  it('esporta correttamente lo storico ottimizzazioni nel backup JSON', async () => {
    getStore('optimizationHistory').set(sampleRecord.id, sampleRecord);

    const json = await exportDatabaseToJSON();
    const parsed = JSON.parse(json) as DatabaseSchema;

    expect(parsed.optimizationHistory).toBeDefined();
    expect(parsed.optimizationHistory).toHaveLength(1);
    expect(parsed.optimizationHistory![0].id).toBe('opt-rec-1');
    expect(parsed.optimizationHistory![0].recommendationTitle).toBe('Esegui Ottimizzazione TRIM (C:)');
    expect(parsed.optimizationHistory![0].outcome).toBe('success');
  });

  it('valida con successo un backup JSON contenente optimizationHistory', () => {
    const backupData: DatabaseSchema = {
      schemaVersion: 1,
      appVersion: '3.1.0',
      exportedAt: '2026-09-25T15:00:00.000Z',
      settings: { rigName: 'Test Rig' } as any,
      components: [
        { id: 'comp-1', name: 'SSD', brand: 'Samsung', model: '990', category: 'storage', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      ],
      events: [
        { id: 'ev-1', componentId: 'comp-1', date: '2025-01-01', type: 'PURCHASE', price: 100, createdAt: '2025-01-01T00:00:00.000Z' },
      ],
      upgrades: [],
      optimizationHistory: [sampleRecord],
    };

    const res = validateImportJSON(JSON.stringify(backupData));
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.counts.optimizationHistory).toBe(1);
      expect(res.parsedData.optimizationHistory).toHaveLength(1);
    }
  });

  it('rifiuta un backup JSON se optimizationHistory contiene un ID duplicato', () => {
    const backupData = {
      schemaVersion: 1,
      appVersion: '3.1.0',
      components: [{ id: 'comp-1', name: 'SSD', brand: 'Samsung', model: '990', category: 'storage', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
      events: [{ id: 'ev-1', componentId: 'comp-1', date: '2025-01-01', type: 'PURCHASE', price: 100, createdAt: '2025-01-01T00:00:00.000Z' }],
      upgrades: [],
      optimizationHistory: [
        sampleRecord,
        { ...sampleRecord, recommendationId: 'rec-other' }, // Stesso ID 'opt-rec-1'
      ],
    };

    const res = validateImportJSON(JSON.stringify(backupData));
    expect(res.isValid).toBe(false);
    if (!res.isValid) {
      expect(res.error).toContain('duplicato');
    }
  });

  it('esegue l\'import atomico ripristinando optimizationHistory nel database', async () => {
    const backupData: DatabaseSchema = {
      schemaVersion: 1,
      appVersion: '3.1.0',
      exportedAt: '2026-09-25T15:00:00.000Z',
      settings: { rigName: 'Imported Rig' } as any,
      components: [{ id: 'comp-1', name: 'SSD', brand: 'Samsung', model: '990', category: 'storage', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
      events: [{ id: 'ev-1', componentId: 'comp-1', date: '2025-01-01', type: 'PURCHASE', price: 100, createdAt: '2025-01-01T00:00:00.000Z' }],
      upgrades: [],
      optimizationHistory: [sampleRecord],
    };

    await executeImport(backupData);

    const restoredRecords = Array.from(getStore('optimizationHistory').values());
    expect(restoredRecords).toHaveLength(1);
    expect((restoredRecords[0] as OptimizationExecutionRecord).id).toBe('opt-rec-1');
  });

  it('garantisce retrocompatibilità con backup legacy privi di optimizationHistory', async () => {
    const legacyBackup = {
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: '2025-06-01T12:00:00.000Z',
      settings: { rigName: 'Legacy Rig' },
      components: [{ id: 'comp-1', name: 'CPU', brand: 'AMD', model: '7800X3D', category: 'cpu' }],
      events: [{ id: 'ev-1', componentId: 'comp-1', date: '2025-01-01', type: 'PURCHASE', price: 350 }],
      upgrades: [],
      // Nessuna sezione optimizationHistory presente
    };

    const res = validateImportJSON(JSON.stringify(legacyBackup));
    expect(res.isValid).toBe(true);
    if (res.isValid) {
      expect(res.counts.optimizationHistory).toBe(0);
      expect(res.parsedData.optimizationHistory).toBeUndefined();
    }

    await executeImport(res.isValid ? res.parsedData : (legacyBackup as any));
    expect(getStore('optimizationHistory').size).toBe(0);
  });
});
