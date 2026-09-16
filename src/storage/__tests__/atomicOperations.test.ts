import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, ComponentEvent, DatabaseSchema } from '../../types';

// In-memory mock per gli store IndexedDB con supporto al rollback transazionale
const inMemoryStores = new Map<string, Map<string, unknown>>();

function getStore(name: string): Map<string, unknown> {
  if (!inMemoryStores.has(name)) {
    inMemoryStores.set(name, new Map());
  }
  return inMemoryStores.get(name)!;
}

// Clona lo stato di tutti gli store per simulare il rollback di una transazione IDB
function snapshotStores(): Map<string, Map<string, unknown>> {
  const snap = new Map<string, Map<string, unknown>>();
  for (const [name, map] of inMemoryStores.entries()) {
    snap.set(name, new Map(map));
  }
  return snap;
}

function restoreSnapshot(snap: Map<string, Map<string, unknown>>) {
  inMemoryStores.clear();
  for (const [name, map] of snap.entries()) {
    inMemoryStores.set(name, new Map(map));
  }
}

// Simulatore di fallimenti per test di rollback
let shouldFailTransaction = false;

vi.mock('../indexedDB', () => ({
  STORES: {
    COMPONENTS: 'components',
    EVENTS: 'events',
    UPGRADES: 'upgrades',
    METADATA: 'metadata',
    CHECKPOINTS: 'checkpoints',
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
  deleteComponentCascade: vi.fn(async (componentId: string) => {
    getStore('components').delete(componentId);
  }),
  saveUpgradeAtomic: vi.fn(async () => {}),
  saveEventsAtomic: vi.fn(async (events: ComponentEvent[]) => {
    const snap = snapshotStores();
    try {
      if (shouldFailTransaction) {
        throw new Error('Simulated IDB transaction abort');
      }
      for (const ev of events) {
        getStore('events').set(ev.id, ev);
      }
    } catch (err) {
      restoreSnapshot(snap);
      throw err;
    }
  }),
  replaceAllDataAtomic: vi.fn(async (params: any) => {
    const snap = snapshotStores();
    try {
      getStore('components').clear();
      getStore('events').clear();
      getStore('upgrades').clear();
      getStore('metadata').clear();
      getStore('checkpoints').clear();

      if (shouldFailTransaction) {
        throw new Error('Simulated IDB write failure during import transaction');
      }

      for (const c of params.components) getStore('components').set(c.id, c);
      for (const e of params.events) getStore('events').set(e.id, e);
      for (const u of params.upgrades) getStore('upgrades').set(u.id, u);
      for (const m of params.metadataItems) getStore('metadata').set(m.key, m);
      if (params.checkpoints) {
        for (const cp of params.checkpoints) getStore('checkpoints').set(cp.id, cp);
      }
    } catch (err) {
      restoreSnapshot(snap);
      throw err;
    }
  }),
  resetDatabaseAtomic: vi.fn(async () => {
    const snap = snapshotStores();
    try {
      getStore('components').clear();
      getStore('events').clear();
      getStore('upgrades').clear();
      getStore('metadata').clear();
      getStore('checkpoints').clear();

      if (shouldFailTransaction) {
        throw new Error('Simulated IDB failure during reset transaction');
      }

      getStore('metadata').set('initialized', { key: 'initialized', value: true });
    } catch (err) {
      restoreSnapshot(snap);
      throw err;
    }
  }),
  saveComponentWithEventsAtomic: vi.fn(async (params: any) => {
    const snap = snapshotStores();
    try {
      if (shouldFailTransaction) {
        throw new Error('Simulated IDB failure during component+event transaction');
      }
      getStore('components').set(params.component.id, params.component);
      if (params.events) {
        for (const ev of params.events) {
          getStore('events').set(ev.id, ev);
        }
      }
    } catch (err) {
      restoreSnapshot(snap);
      throw err;
    }
  }),
}));

import {
  executeImport,
  resetDatabase,
  commitComponentWithEventsAtomic,
  commitEventsAtomic,
  loadFullDatabase,
  saveComponent,
  DEFAULT_SETTINGS,
} from '../storageService';

describe('AUD-001 & AUD-004: Atomic Operations & Rollback Engine', () => {
  beforeEach(async () => {
    inMemoryStores.clear();
    shouldFailTransaction = false;
  });

  it('AUD-001: executeImport rollback - se la transazione fallisce, i dati precedenti rimangono intatti', async () => {
    // 1. Popola il database iniziale
    const initialComponent: Component = {
      id: 'comp-orig-1',
      name: 'Original CPU',
      brand: 'AMD',
      model: '5600X',
      category: 'cpu',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    await saveComponent(initialComponent);

    let db = await loadFullDatabase();
    expect(db.components.length).toBe(1);
    expect(db.components[0].id).toBe('comp-orig-1');

    // 2. Tenta un import che fallisce a metà transazione
    shouldFailTransaction = true;
    const newSchema: DatabaseSchema = {
      schemaVersion: 1,
      appVersion: '0.1.0',
      lastModified: '2024-05-01',
      components: [
        {
          id: 'comp-new-1',
          name: 'New GPU',
          brand: 'NVIDIA',
          model: 'RTX 4080',
          category: 'gpu',
          createdAt: '2024-05-01',
          updatedAt: '2024-05-01',
        },
      ],
      events: [],
      upgrades: [],
      settings: DEFAULT_SETTINGS,
    };

    await expect(executeImport(newSchema)).rejects.toThrow('Simulated IDB write failure');

    // 3. Verifica atomicità: il database precedente è intatto e il nuovo componente NON è stato inserito
    db = await loadFullDatabase();
    expect(db.components.length).toBe(1);
    expect(db.components[0].id).toBe('comp-orig-1');
  });

  it('AUD-001: resetDatabase rollback - se la transazione fallisce, i dati non vengono azzerati', async () => {
    const comp: Component = {
      id: 'comp-pre-reset',
      name: 'Pre-Reset GPU',
      brand: 'ASUS',
      model: 'TUF',
      category: 'gpu',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    await saveComponent(comp);

    shouldFailTransaction = true;
    await expect(resetDatabase()).rejects.toThrow('Simulated IDB failure during reset');

    const db = await loadFullDatabase();
    expect(db.components.length).toBe(1);
    expect(db.components[0].id).toBe('comp-pre-reset');
  });

  it('AUD-004: commitComponentWithEventsAtomic salva componente ed evento in una singola transazione atomica', async () => {
    const newComp: Component = {
      id: 'comp-atomic-1',
      name: 'Atomic RAM',
      brand: 'Corsair',
      model: 'Vengeance',
      category: 'ram',
      createdAt: '2024-03-01',
      updatedAt: '2024-03-01',
    };
    const newPurchase: ComponentEvent = {
      id: 'ev-atomic-1',
      componentId: 'comp-atomic-1',
      type: 'PURCHASE',
      date: '2024-03-01',
      price: 120,
      createdAt: '2024-03-01T10:00:00.000Z',
    };

    // Caso successo
    await commitComponentWithEventsAtomic(newComp, [newPurchase]);

    let db = await loadFullDatabase();
    expect(db.components.some((c) => c.id === 'comp-atomic-1')).toBe(true);
    expect(db.events.some((e) => e.id === 'ev-atomic-1')).toBe(true);

    // Caso errore con rollback: nessun elemento orfano
    shouldFailTransaction = true;
    const failingComp: Component = {
      id: 'comp-failing-2',
      name: 'Failing SSD',
      brand: 'Crucial',
      model: 'P5',
      category: 'storage',
      createdAt: '2024-04-01',
      updatedAt: '2024-04-01',
    };
    const failingPurchase: ComponentEvent = {
      id: 'ev-failing-2',
      componentId: 'comp-failing-2',
      type: 'PURCHASE',
      date: '2024-04-01',
      price: 90,
      createdAt: '2024-04-01T10:00:00.000Z',
    };

    await expect(
      commitComponentWithEventsAtomic(failingComp, [failingPurchase])
    ).rejects.toThrow('Simulated IDB failure');

    db = await loadFullDatabase();
    expect(db.components.some((c) => c.id === 'comp-failing-2')).toBe(false);
    expect(db.events.some((e) => e.id === 'ev-failing-2')).toBe(false);
  });

  it('AUD-002 / AUD-003: commitEventsAtomic salva batch di eventi atomicamente con rollback in caso di errore', async () => {
    const uninstallEv: ComponentEvent = {
      id: 'ev-un-1',
      componentId: 'comp-atomic-1',
      type: 'UNINSTALL',
      date: '2024-06-01',
      createdAt: '2024-06-01T10:00:00.000Z',
    };
    const saleEv: ComponentEvent = {
      id: 'ev-sale-1',
      componentId: 'comp-atomic-1',
      type: 'SALE',
      date: '2024-06-01',
      price: 80,
      createdAt: '2024-06-01T10:00:00.000Z',
    };

    // Successo
    await commitEventsAtomic([uninstallEv, saleEv]);
    let db = await loadFullDatabase();
    expect(db.events.some((e) => e.id === 'ev-un-1')).toBe(true);
    expect(db.events.some((e) => e.id === 'ev-sale-1')).toBe(true);

    // Errore: rollback completo
    shouldFailTransaction = true;
    const uninstallEv2: ComponentEvent = {
      id: 'ev-un-fail',
      componentId: 'comp-atomic-1',
      type: 'UNINSTALL',
      date: '2024-07-01',
      createdAt: '2024-07-01T10:00:00.000Z',
    };
    const giftEv: ComponentEvent = {
      id: 'ev-gift-fail',
      componentId: 'comp-atomic-1',
      type: 'GIFT',
      date: '2024-07-01',
      createdAt: '2024-07-01T10:00:00.000Z',
    };

    await expect(commitEventsAtomic([uninstallEv2, giftEv])).rejects.toThrow(
      'Simulated IDB transaction abort'
    );

    db = await loadFullDatabase();
    expect(db.events.some((e) => e.id === 'ev-un-fail')).toBe(false);
    expect(db.events.some((e) => e.id === 'ev-gift-fail')).toBe(false);
  });
});
