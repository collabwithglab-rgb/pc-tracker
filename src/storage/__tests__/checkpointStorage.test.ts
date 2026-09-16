import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Component,
  ComponentEvent,
  Upgrade,
  Checkpoint,
  DatabaseSchema,
} from '../../types';
import {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
  sortDataDeterministically,
} from '../backupService';
import {
  getAllCheckpoints,
  getCheckpointById,
  saveCheckpointAtomic,
  deleteCheckpointAtomic,
  saveComponent,
  deleteComponent,
} from '../storageService';

// In-memory mock per gli Object Store IndexedDB (isolamento completo per test di storage e backup)
const inMemoryStores = new Map<string, Map<string, unknown>>();

function getStore(name: string): Map<string, unknown> {
  if (!inMemoryStores.has(name)) {
    inMemoryStores.set(name, new Map());
  }
  return inMemoryStores.get(name)!;
}

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

import { validateCheckpoint } from '../../domain';

let shouldFailAtomicReplace = false;

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
  clearStore: vi.fn(async (storeName: string) => {
    getStore(storeName).clear();
  }),
  getAllCheckpoints: vi.fn(async () => Array.from(getStore('checkpoints').values())),
  getCheckpointById: vi.fn(async (id: string) => getStore('checkpoints').get(id)),
  saveCheckpointAtomic: vi.fn(async (checkpoint: Checkpoint) => {
    const validation = validateCheckpoint(checkpoint);
    if (!validation.isValid) {
      const errorDetails = Object.values(validation.errors).join('; ');
      throw new Error(`Impossibile salvare il checkpoint: ${errorDetails}`);
    }
    getStore('checkpoints').set(checkpoint.id, checkpoint);
  }),
  deleteCheckpointAtomic: vi.fn(async (id: string) => {
    getStore('checkpoints').delete(id);
  }),
  deleteComponentCascade: vi.fn(async (componentId: string) => {
    // Elimina il componente, i suoi eventi e gli upgrade correlati, ma NON tocca checkpoints!
    getStore('components').delete(componentId);
    for (const [evId, ev] of Array.from(getStore('events').entries())) {
      if ((ev as ComponentEvent).componentId === componentId) {
        getStore('events').delete(evId);
      }
    }
    for (const [upId, up] of Array.from(getStore('upgrades').entries())) {
      const u = up as Upgrade;
      if (u.oldComponentId === componentId || u.newComponentId === componentId) {
        getStore('upgrades').delete(upId);
      }
    }
  }),
  replaceAllDataAtomic: vi.fn(async (params: {
    components: Component[];
    events: ComponentEvent[];
    upgrades: Upgrade[];
    checkpoints?: Checkpoint[];
    metadataItems?: Array<{ key: string; value: unknown }>;
  }) => {
    const snap = snapshotStores();
    try {
      if (shouldFailAtomicReplace) {
        throw new Error('Simulated IDB transaction crash during replaceAllDataAtomic');
      }
      getStore('components').clear();
      for (const c of params.components) getStore('components').set(c.id, c);
      getStore('events').clear();
      for (const e of params.events) getStore('events').set(e.id, e);
      getStore('upgrades').clear();
      for (const u of params.upgrades) getStore('upgrades').set(u.id, u);
      getStore('checkpoints').clear();
      if (params.checkpoints) {
        for (const cp of params.checkpoints) getStore('checkpoints').set(cp.id, cp);
      }
      if (params.metadataItems) {
        for (const m of params.metadataItems) getStore('metadata').set(m.key, m);
      }
    } catch (err) {
      restoreSnapshot(snap);
      throw err;
    }
  }),
}));

describe('Checkpoint Storage & Backup Integration (Tranche 10.2)', () => {
  beforeEach(() => {
    inMemoryStores.clear();
    shouldFailAtomicReplace = false;
    vi.clearAllMocks();
  });

  const sampleCheckpoint: Checkpoint = {
    id: 'cp-build-2024',
    name: 'Build Iniziale 2024',
    referenceDate: '2024-01-15',
    createdAt: '2024-01-15T12:00:00Z',
    trigger: 'manual',
    componentsSnapshot: [
      {
        componentId: 'comp-cpu-1',
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '100-100000910WOF',
        category: 'cpu',
        slotOrLocation: 'Socket AM5',
        purchasePrice: 380,
      },
    ],
    summary: {
      componentCount: 1,
      rigPurchaseCost: 380,
      categoryCounts: { cpu: 1 },
    },
  };

  describe('1. Operazioni Storage Checkpoint', () => {
    it('salva un checkpoint valido su IndexedDB', async () => {
      await saveCheckpointAtomic(sampleCheckpoint);

      const retrieved = await getCheckpointById('cp-build-2024');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('cp-build-2024');
      expect(retrieved?.name).toBe('Build Iniziale 2024');
      expect(retrieved?.summary.rigPurchaseCost).toBe(380);
    });

    it('rifiuta e impedisce il salvataggio di un checkpoint non valido (validazione prima della scrittura)', async () => {
      const invalidCheckpoint = {
        ...sampleCheckpoint,
        name: ' ', // nome non valido
      };

      await expect(saveCheckpointAtomic(invalidCheckpoint as any)).rejects.toThrow(
        /Impossibile salvare il checkpoint/
      );

      // Nessun elemento salvato nello store
      const all = await getAllCheckpoints();
      expect(all).toHaveLength(0);
    });

    it('recupera tutti i checkpoint salvati', async () => {
      await saveCheckpointAtomic(sampleCheckpoint);
      await saveCheckpointAtomic({
        ...sampleCheckpoint,
        id: 'cp-upgrade-2',
        name: 'Secondo Checkpoint',
        referenceDate: '2024-06-01',
      });

      const all = await getAllCheckpoints();
      expect(all).toHaveLength(2);
    });

    it('elimina un checkpoint atomico senza toccare altri record', async () => {
      await saveCheckpointAtomic(sampleCheckpoint);
      expect(await getCheckpointById('cp-build-2024')).toBeDefined();

      await deleteCheckpointAtomic('cp-build-2024');
      expect(await getCheckpointById('cp-build-2024')).toBeUndefined();
    });
  });

  describe('2. Esportazione Backup JSON con Checkpoint', () => {
    it('include l’array checkpoints nel dump JSON deterministico', async () => {
      // Inserisce componente, evento e checkpoint
      const comp: Component = {
        id: 'comp-cpu-1',
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '100-100000910WOF',
        category: 'cpu',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      };
      const ev: ComponentEvent = {
        id: 'ev-1',
        componentId: 'comp-cpu-1',
        type: 'PURCHASE',
        price: 380,
        date: '2024-01-10',
        createdAt: '2024-01-10T10:00:00Z',
      };
      getStore('components').set(comp.id, comp);
      getStore('events').set(ev.id, ev);
      getStore('checkpoints').set(sampleCheckpoint.id, sampleCheckpoint);

      const jsonStr = await exportDatabaseToJSON();
      const parsed = JSON.parse(jsonStr) as DatabaseSchema;

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.checkpoints).toBeDefined();
      expect(parsed.checkpoints).toHaveLength(1);
      expect(parsed.checkpoints![0].id).toBe('cp-build-2024');
      expect(parsed.checkpoints![0].componentsSnapshot[0].name).toBe('Ryzen 7 7800X3D');
    });

    it('ordina in modo deterministico i checkpoint prima dell’export', () => {
      const cpLater: Checkpoint = {
        ...sampleCheckpoint,
        id: 'cp-2',
        name: 'Giugno 2024',
        referenceDate: '2024-06-01',
      };
      const cpEarlier: Checkpoint = {
        ...sampleCheckpoint,
        id: 'cp-1',
        name: 'Gennaio 2024',
        referenceDate: '2024-01-10',
      };

      const data = {
        components: [],
        events: [],
        checkpoints: [cpLater, cpEarlier],
      };

      sortDataDeterministically(data);
      expect(data.checkpoints[0].id).toBe('cp-1');
      expect(data.checkpoints[1].id).toBe('cp-2');
    });
  });

  describe('3. Importazione e Retrocompatibilità con Backup Legacy', () => {
    it('importa con successo un backup legacy v1 PRIVI di checkpoints, impostando checkpoints = []', () => {
      const legacyBackup = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: { rigName: 'Legacy Rig' },
        components: [
          {
            id: 'c-1',
            name: 'SSD Samsung',
            brand: 'Samsung',
            model: '980 Pro',
            category: 'storage',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        events: [
          {
            id: 'e-1',
            componentId: 'c-1',
            type: 'PURCHASE',
            price: 120,
            date: '2024-01-05',
            createdAt: '2024-01-05T00:00:00Z',
          },
        ],
        // checkpoints NON presente
      };

      const validation = validateImportJSON(JSON.stringify(legacyBackup));
      expect(validation.isValid).toBe(true);
      if (validation.isValid) {
        expect(validation.counts.checkpoints).toBe(0);
        expect(validation.parsedData.checkpoints).toEqual([]);
      }
    });

    it('importa correttamente un backup recente contenente checkpoints', async () => {
      const fullBackup: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: { rigName: 'Modern Rig' } as any,
        components: [
          {
            id: 'comp-cpu-1',
            name: 'Ryzen 7 7800X3D',
            brand: 'AMD',
            model: '100-100000910WOF',
            category: 'cpu',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        events: [
          {
            id: 'ev-1',
            componentId: 'comp-cpu-1',
            type: 'PURCHASE',
            price: 380,
            date: '2024-01-10',
            createdAt: '2024-01-10T00:00:00Z',
          },
        ],
        upgrades: [],
        checkpoints: [sampleCheckpoint],
      };

      const validation = validateImportJSON(JSON.stringify(fullBackup));
      expect(validation.isValid).toBe(true);
      if (validation.isValid) {
        expect(validation.counts.checkpoints).toBe(1);

        await executeImport(validation.parsedData);

        const restored = await getCheckpointById('cp-build-2024');
        expect(restored).toBeDefined();
        expect(restored?.name).toBe('Build Iniziale 2024');
      }
    });
  });

  describe('4. Integrità Referenziale e Regola dei Soft-Link', () => {
    it('CONSENTE checkpoint con soft-link a un componentId non più presente nel catalogo components (autosufficienza storica)', () => {
      const backupWithDeletedComponent: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {} as any,
        components: [], // Il componente comp-cpu-1 è stato eliminato dal catalogo corrente
        events: [],
        upgrades: [],
        checkpoints: [sampleCheckpoint], // Conserva i dati congelati
      };

      const validation = validateImportJSON(JSON.stringify(backupWithDeletedComponent));
      // Deve essere valido perché il Checkpoint è autosufficiente tramite componentsSnapshot
      expect(validation.isValid).toBe(true);
    });

    it('RIFIUTA checkpoint con anchorEventId inesistente nella cronologia eventi', () => {
      const backupWithBadAnchor = {
        schemaVersion: 1,
        components: [],
        events: [],
        checkpoints: [
          {
            ...sampleCheckpoint,
            anchorEventId: 'ev-inesistente',
          },
        ],
      };

      const validation = validateImportJSON(JSON.stringify(backupWithBadAnchor));
      expect(validation.isValid).toBe(false);
      if (!validation.isValid) {
        expect(validation.error).toContain('evento di ancoraggio');
        expect(validation.error).toContain('non esiste');
      }
    });

    it('RIFIUTA checkpoint con anchorEventId la cui data non coincide con la referenceDate', () => {
      const backupWithMismatchedAnchorDate = {
        schemaVersion: 1,
        components: [
          {
            id: 'c-1',
            name: 'CPU',
            brand: 'AMD',
            model: 'X',
            category: 'cpu',
            createdAt: '',
            updatedAt: '',
          },
        ],
        events: [
          {
            id: 'ev-1',
            componentId: 'c-1',
            type: 'PURCHASE',
            price: 100,
            date: '2024-05-01', // Maggio
            createdAt: '',
          },
        ],
        checkpoints: [
          {
            ...sampleCheckpoint,
            referenceDate: '2024-01-15', // Gennaio
            anchorEventId: 'ev-1',
          },
        ],
      };

      const validation = validateImportJSON(JSON.stringify(backupWithMismatchedAnchorDate));
      expect(validation.isValid).toBe(false);
      if (!validation.isValid) {
        expect(validation.error).toContain('data diversa rispetto alla data di riferimento');
      }
    });

    it('RIFIUTA checkpoint con relatedUpgradeId inesistente', () => {
      const backupWithBadUpgrade = {
        schemaVersion: 1,
        components: [],
        events: [],
        upgrades: [],
        checkpoints: [
          {
            ...sampleCheckpoint,
            relatedUpgradeId: 'upg-inesistente',
          },
        ],
      };

      const validation = validateImportJSON(JSON.stringify(backupWithBadUpgrade));
      expect(validation.isValid).toBe(false);
      if (!validation.isValid) {
        expect(validation.error).toContain('upgrade collegato');
        expect(validation.error).toContain('non esiste');
      }
    });
  });

  describe('5. Indipendenza e Resilienza: Eliminazione Componenti e Rollback Atomico', () => {
    it('l’eliminazione a cascata di un Componente NON distrugge né altera i Checkpoint esistenti', async () => {
      // Setup: salviamo un componente e un checkpoint
      const comp: Component = {
        id: 'comp-cpu-1',
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '100-100000910WOF',
        category: 'cpu',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await saveComponent(comp);
      await saveCheckpointAtomic(sampleCheckpoint);

      // Eliminiamo il componente tramite deleteComponent
      await deleteComponent('comp-cpu-1');

      // Verifica: il componente è stato rimosso
      expect(getStore('components').has('comp-cpu-1')).toBe(false);

      // Verifica fondamentale: il checkpoint esiste ancora intatto con lo snapshot congelato!
      const cp = await getCheckpointById('cp-build-2024');
      expect(cp).toBeDefined();
      expect(cp?.componentsSnapshot[0].name).toBe('Ryzen 7 7800X3D');
      expect(cp?.componentsSnapshot[0].purchasePrice).toBe(380);
    });

    it('l’eliminazione di un Checkpoint non tocca in alcun modo Components o Events', async () => {
      const comp: Component = {
        id: 'comp-cpu-1',
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '100-100000910WOF',
        category: 'cpu',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const ev: ComponentEvent = {
        id: 'ev-1',
        componentId: 'comp-cpu-1',
        type: 'PURCHASE',
        price: 380,
        date: '2024-01-10',
        createdAt: '2024-01-10T00:00:00Z',
      };
      getStore('components').set(comp.id, comp);
      getStore('events').set(ev.id, ev);
      await saveCheckpointAtomic(sampleCheckpoint);

      await deleteCheckpointAtomic('cp-build-2024');

      expect(await getCheckpointById('cp-build-2024')).toBeUndefined();
      expect(getStore('components').has('comp-cpu-1')).toBe(true);
      expect(getStore('events').has('ev-1')).toBe(true);
    });

    it('se l’import atomico fallisce a metà, IndexedDB preserva lo stato originale di tutti gli store incluso checkpoints (rollback totale)', async () => {
      // Stato iniziale con 1 checkpoint preesistente
      await saveCheckpointAtomic(sampleCheckpoint);

      // Simuliamo crash durante l'import atomico
      shouldFailAtomicReplace = true;

      const newBackupData: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {} as any,
        components: [],
        events: [],
        upgrades: [],
        checkpoints: [
          {
            ...sampleCheckpoint,
            id: 'cp-nuovo-che-non-deve-entrare',
            name: 'Non Valido',
          },
        ],
      };

      await expect(executeImport(newBackupData)).rejects.toThrow(
        /Simulated IDB transaction crash/
      );

      // Verifica rollback: il checkpoint originale è ancora presente, quello nuovo non c'è
      const cpOriginal = await getCheckpointById('cp-build-2024');
      expect(cpOriginal).toBeDefined();
      const cpNew = await getCheckpointById('cp-nuovo-che-non-deve-entrare');
      expect(cpNew).toBeUndefined();
    });
  });
});
