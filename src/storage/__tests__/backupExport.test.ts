import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Component,
  ComponentEvent,
  PurchaseEvent,
  InstallEvent,
  UninstallEvent,
  SaleEvent,
  ExtraExpenseEvent,
  Upgrade,
  DatabaseSchema,
} from '../../types';

// In-memory mock per gli Object Store IndexedDB (isolamento completo)
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
  putItems: vi.fn(async (storeName: string, items: any[]) => {
    for (const item of items) {
      const key = storeName === 'metadata' ? item.key : item.id;
      getStore(storeName).set(key, item);
    }
  }),
  deleteItemFromStore: vi.fn(async (storeName: string, id: string) => {
    getStore(storeName).delete(id);
  }),
  clearStore: vi.fn(async (storeName: string) => {
    getStore(storeName).clear();
  }),
  replaceAllDataAtomic: vi.fn(async (params: {
    components: Component[];
    events: ComponentEvent[];
    upgrades: Upgrade[];
    checkpoints?: any[];
    metadataItems?: Array<{ key: string; value: unknown }>;
  }) => {
    const snapshot = snapshotStores();
    try {
      if (shouldFailAtomicReplace) {
        throw new Error('Simulated IDB transaction crash during replaceAllDataAtomic');
      }
      getStore('components').clear();
      for (const c of params.components) {
        getStore('components').set(c.id, c);
      }
      getStore('events').clear();
      for (const e of params.events) {
        getStore('events').set(e.id, e);
      }
      getStore('upgrades').clear();
      for (const u of params.upgrades) {
        getStore('upgrades').set(u.id, u);
      }
      getStore('checkpoints').clear();
      if (params.checkpoints) {
        for (const cp of params.checkpoints) {
          getStore('checkpoints').set(cp.id, cp);
        }
      }
      if (params.metadataItems) {
        for (const m of params.metadataItems) {
          getStore('metadata').set(m.key, m);
        }
      }
    } catch (err) {
      restoreSnapshot(snapshot);
      throw err;
    }
  }),
  saveComponentWithEventsAtomic: vi.fn(async ({ component, events }) => {
    getStore('components').set(component.id, component);
    for (const e of events) {
      getStore('events').set(e.id, e);
    }
  }),
  saveUpgradeAtomic: vi.fn(),
  saveEventsAtomic: vi.fn(),
  deleteComponentCascade: vi.fn(),
  resetDatabaseAtomic: vi.fn(async () => {
    inMemoryStores.clear();
    getStore('metadata').set('initialized', { key: 'initialized', value: true });
  }),
}));

import {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
  getLastExportedAt,
  exportComponentsToCSV,
  exportEventsToCSV,
  escapeCSVCell,
  sortDataDeterministically,
} from '../backupService';
import { loadFullDatabase, saveComponent, saveEvent } from '../storageService';

// Helpers per creare istanze con tipi completi
function createMockComponent(overrides: Partial<Component> & { id: string; name: string; category: Component['category'] }): Component {
  return {
    brand: 'GenericBrand',
    model: 'GenericModel',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockPurchase(overrides: Partial<PurchaseEvent> & { id: string; componentId: string; date: string }): PurchaseEvent {
  return {
    type: 'PURCHASE',
    price: 100,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockInstall(overrides: Partial<InstallEvent> & { id: string; componentId: string; date: string }): InstallEvent {
  return {
    type: 'INSTALL',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockUninstall(overrides: Partial<UninstallEvent> & { id: string; componentId: string; date: string }): UninstallEvent {
  return {
    type: 'UNINSTALL',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockSale(overrides: Partial<SaleEvent> & { id: string; componentId: string; date: string; price: number }): SaleEvent {
  return {
    type: 'SALE',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockExtraExpense(overrides: Partial<ExtraExpenseEvent> & { id: string; componentId: string; date: string; amount: number; description: string }): ExtraExpenseEvent {
  return {
    type: 'EXTRA_EXPENSE',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Roadmap 9: Backup / Export Definitivo', () => {
  beforeEach(() => {
    inMemoryStores.clear();
    shouldFailAtomicReplace = false;
  });

  // --------------------------------------------------------------------------
  // 1. JSON EXPORT: Struttura, Versione e Contenuto
  // --------------------------------------------------------------------------
  describe('JSON Export', () => {
    it('contiene tutti gli store necessari (components, events, upgrades, settings) con schemaVersion e timestamp', async () => {
      const comp = createMockComponent({
        id: 'comp-1',
        name: 'AMD Ryzen 7 7800X3D',
        category: 'cpu',
      });
      const ev = createMockPurchase({
        id: 'ev-1',
        componentId: 'comp-1',
        date: '2024-01-10',
        price: 389.99,
      });
      await saveComponent(comp);
      await saveEvent(ev);

      const jsonString = await exportDatabaseToJSON();
      const parsed = JSON.parse(jsonString) as DatabaseSchema;

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.appVersion).toBe('0.2.1');
      expect(typeof parsed.exportedAt).toBe('string');
      expect(parsed.components).toHaveLength(1);
      expect(parsed.components[0].id).toBe('comp-1');
      expect(parsed.events).toHaveLength(1);
      expect(parsed.events[0].id).toBe('ev-1');
      expect(Array.isArray(parsed.upgrades)).toBe(true);
      expect(parsed.settings).toBeDefined();
      expect(parsed.settings.currencySymbol).toBe('€');
    });

    it('ordina in modo deterministico le collezioni (ID per componenti, cronologico per eventi e upgrade)', () => {
      const compZ = createMockComponent({ id: 'comp-z', name: 'Z Comp', category: 'cpu' });
      const compA = createMockComponent({ id: 'comp-a', name: 'A Comp', category: 'gpu' });

      const ev2 = createMockInstall({ id: 'ev-2', componentId: 'comp-z', date: '2024-03-01' });
      const ev1 = createMockPurchase({ id: 'ev-1', componentId: 'comp-z', date: '2024-01-01' });
      const ev3 = createMockPurchase({ id: 'ev-3', componentId: 'comp-a', date: '2024-01-01' });

      const up2: Upgrade = { id: 'up-2', date: '2024-05-01', category: 'gpu', oldComponentId: 'comp-a', newComponentId: 'comp-z' };
      const up1: Upgrade = { id: 'up-1', date: '2024-02-01', category: 'cpu', oldComponentId: 'comp-a', newComponentId: 'comp-z' };

      const data = {
        components: [compZ, compA],
        events: [ev2, ev1, ev3],
        upgrades: [up2, up1],
      };

      sortDataDeterministically(data);

      expect(data.components[0].id).toBe('comp-a');
      expect(data.components[1].id).toBe('comp-z');

      // ev-1 e ev-3 hanno la stessa data (2024-01-01), tie-breaker deterministico per ID
      expect(data.events[0].date).toBe('2024-01-01');
      expect(data.events[0].id).toBe('ev-1');
      expect(data.events[1].id).toBe('ev-3');
      expect(data.events[2].date).toBe('2024-03-01');

      expect(data.upgrades[0].id).toBe('up-1');
      expect(data.upgrades[1].id).toBe('up-2');
    });

    it('persiste lastExportedAt in STORES.METADATA e lo rende recuperabile', async () => {
      expect(await getLastExportedAt()).toBeNull();

      await exportDatabaseToJSON();
      const lastExport = await getLastExportedAt();
      expect(lastExport).not.toBeNull();
      expect(typeof lastExport).toBe('string');
      expect(new Date(lastExport!).getTime()).not.toBeNaN();
    });
  });

  // --------------------------------------------------------------------------
  // 2. JSON IMPORT: Validazione e Preview
  // --------------------------------------------------------------------------
  describe('JSON Import: Validazione e Preview', () => {
    it('restituisce ImportPreview con conteggi e metadati corretti per un backup valido', () => {
      const c1 = createMockComponent({ id: 'c1', name: 'GPU RTX 4080', category: 'gpu' });
      const c2 = createMockComponent({ id: 'c2', name: 'GPU RTX 4090', category: 'gpu' });

      const validBackup: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        exportedAt: '2024-06-01T12:00:00.000Z',
        settings: {
          rigName: 'Rig Enthusiast',
          rigDescription: 'Custom PC',
          currencySymbol: '€',
          dateFormat: 'DD/MM/YYYY',
          uiDensity: 'comfortable',
          reducedMotion: 'system',
          accentColor: 'cyan',
          environmentTheme: 'obsidian',
          typographyPreset: 'default',
          defaultStartSection: 'dashboard',
          dashboardRecentCount: 7,
          showRigSynthesis: true,
          archiveDefaultSort: 'purchase_date_desc',
          archiveDefaultView: 'cards',
          confirmEventDeletion: true,
          autoCloseMovementModal: true,
        },
        components: [c1, c2],
        events: [
          createMockPurchase({ id: 'e1', componentId: 'c1', date: '2024-01-01', price: 1100 }),
          createMockInstall({ id: 'e2', componentId: 'c1', date: '2024-01-02' }),
          createMockUninstall({ id: 'e3', componentId: 'c1', date: '2024-03-01' }),
          createMockPurchase({ id: 'e4', componentId: 'c2', date: '2024-03-01', price: 1800 }),
          createMockInstall({ id: 'e5', componentId: 'c2', date: '2024-03-01' }),
        ],
        upgrades: [
          { id: 'u1', date: '2024-03-01', category: 'gpu', oldComponentId: 'c1', newComponentId: 'c2' },
        ],
      };

      const result = validateImportJSON(JSON.stringify(validBackup));
      expect(result.isValid).toBe(true);

      if (result.isValid) {
        expect(result.schemaVersion).toBe(1);
        expect(result.counts.components).toBe(2);
        expect(result.counts.events).toBe(5);
        expect(result.counts.upgrades).toBe(1);
        expect(result.settingsSummary?.rigName).toBe('Rig Enthusiast');
        expect(result.exportedAt).toBe('2024-06-01T12:00:00.000Z');
      }
    });

    it('rifiuta file con ID componenti duplicati', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [
          createMockComponent({ id: 'dup-id', name: 'Component 1', category: 'cpu' }),
          createMockComponent({ id: 'dup-id', name: 'Component 2', category: 'gpu' }),
        ],
        events: [],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('ID componente duplicato');
      }
    });

    it('rifiuta file con ID eventi duplicati', () => {
      const comp = createMockComponent({ id: 'c1', name: 'Comp', category: 'cpu' });
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [comp],
        events: [
          createMockPurchase({ id: 'dup-ev', componentId: 'c1', date: '2024-01-01' }),
          createMockInstall({ id: 'dup-ev', componentId: 'c1', date: '2024-01-02' }),
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('ID evento duplicato');
      }
    });

    it('rifiuta file con referenze orfane (eventi su componenti inesistenti)', () => {
      const comp = createMockComponent({ id: 'c1', name: 'Comp', category: 'cpu' });
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [comp],
        events: [
          createMockPurchase({ id: 'e1', componentId: 'c-fantasma', date: '2024-01-01' }),
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Integrità referenziale violata');
      }
    });

    it('rifiuta file con referenze orfane negli upgrade', () => {
      const comp = createMockComponent({ id: 'c1', name: 'Comp', category: 'cpu' });
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [comp],
        events: [createMockPurchase({ id: 'e1', componentId: 'c1', date: '2024-01-01' })],
        upgrades: [
          { id: 'u1', date: '2024-02-01', category: 'cpu', oldComponentId: 'c1', newComponentId: 'c-inesistente' },
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Integrità referenziale violata');
      }
    });

    it('rifiuta date invalide o impossibili nel calendario gregoriano', () => {
      const comp = createMockComponent({ id: 'c1', name: 'Comp', category: 'cpu' });
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [comp],
        events: [
          createMockPurchase({ id: 'e1', componentId: 'c1', date: '2024-02-31' }),
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Data non valida');
      }
    });

    it('rifiuta sequenze con ciclo di vita incoerente', () => {
      const comp = createMockComponent({ id: 'c1', name: 'Comp', category: 'cpu' });
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [comp],
        events: [
          createMockPurchase({ id: 'e1', componentId: 'c1', date: '2024-01-01' }),
          createMockUninstall({ id: 'e2', componentId: 'c1', date: '2024-01-05' }), // Smontaggio senza montaggio
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Coerenza ciclo di vita violata');
      }
    });

    it('rifiuta versioni di schema future non supportate', () => {
      const json = JSON.stringify({
        schemaVersion: 99,
        components: [],
        events: [],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Versione backup non supportata');
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. ESECUZIONE ATOMICA IMPORT E ROLLBACK
  // --------------------------------------------------------------------------
  describe('Esecuzione Atomica Import e Rollback', () => {
    it('import valido sostituisce completamente e fedelmente i dati', async () => {
      // Dati iniziali
      await saveComponent(createMockComponent({ id: 'old-1', name: 'Vecchio', category: 'other' }));

      const newComp = createMockComponent({ id: 'new-1', name: 'Nuovo Pezzo', category: 'ram' });
      const newEv = createMockPurchase({ id: 'ev-new', componentId: 'new-1', date: '2024-01-15' });

      const validBackup: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {
          rigName: 'Nuovo Setup',
          rigDescription: '',
          currencySymbol: '€',
          dateFormat: 'DD/MM/YYYY',
          uiDensity: 'comfortable',
          reducedMotion: 'system',
          accentColor: 'cyan',
          environmentTheme: 'obsidian',
          typographyPreset: 'default',
          defaultStartSection: 'dashboard',
          dashboardRecentCount: 7,
          showRigSynthesis: true,
          archiveDefaultSort: 'purchase_date_desc',
          archiveDefaultView: 'cards',
          confirmEventDeletion: true,
          autoCloseMovementModal: true,
        },
        components: [newComp],
        events: [newEv],
        upgrades: [],
      };

      await executeImport(validBackup);

      const db = await loadFullDatabase();
      expect(db.components).toHaveLength(1);
      expect(db.components[0].id).toBe('new-1');
      expect(db.events).toHaveLength(1);
      expect(db.events[0].id).toBe('ev-new');
      expect(db.settings.rigName).toBe('Nuovo Setup');
    });

    it('in caso di fallimento della transazione IDB il database rimane intatto', async () => {
      // Setup dati iniziali
      const safeComp = createMockComponent({ id: 'safe-comp', name: 'Pezzo Sicuro', category: 'cpu' });
      const safeEv = createMockPurchase({ id: 'safe-ev', componentId: 'safe-comp', date: '2024-01-01' });
      await saveComponent(safeComp);
      await saveEvent(safeEv);

      const crashingComp = createMockComponent({ id: 'crashing-comp', name: 'Crash', category: 'gpu' });
      const crashingEv = createMockPurchase({ id: 'crashing-ev', componentId: 'crashing-comp', date: '2024-01-01' });

      const validBackup: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {
          rigName: 'Tentativo Fallito',
          rigDescription: '',
          currencySymbol: '€',
          dateFormat: 'DD/MM/YYYY',
          uiDensity: 'comfortable',
          reducedMotion: 'system',
          accentColor: 'cyan',
          environmentTheme: 'obsidian',
          typographyPreset: 'default',
          defaultStartSection: 'dashboard',
          dashboardRecentCount: 7,
          showRigSynthesis: true,
          archiveDefaultSort: 'purchase_date_desc',
          archiveDefaultView: 'cards',
          confirmEventDeletion: true,
          autoCloseMovementModal: true,
        },
        components: [crashingComp],
        events: [crashingEv],
        upgrades: [],
      };

      shouldFailAtomicReplace = true;

      await expect(executeImport(validBackup)).rejects.toThrow('Simulated IDB transaction crash');

      // Verifica che il database locale sia intatto
      const db = await loadFullDatabase();
      expect(db.components).toHaveLength(1);
      expect(db.components[0].id).toBe('safe-comp');
      expect(db.events).toHaveLength(1);
      expect(db.events[0].id).toBe('safe-ev');
    });
  });

  // --------------------------------------------------------------------------
  // 4. CSV EXPORT: Escaping RFC 4180 e Formattazione
  // --------------------------------------------------------------------------
  describe('CSV Export', () => {
    it('effettua correttamente l’escaping RFC 4180 per virgole, virgolette e newline', () => {
      expect(escapeCSVCell('test')).toBe('test');
      expect(escapeCSVCell('test, con virgola')).toBe('"test, con virgola"');
      expect(escapeCSVCell('test "con virgolette"')).toBe('"test ""con virgolette"""');
      expect(escapeCSVCell('test con\nnewline')).toBe('"test con\nnewline"');
      expect(escapeCSVCell(null)).toBe('');
      expect(escapeCSVCell(undefined)).toBe('');
      expect(escapeCSVCell(123.45)).toBe('123.45');
    });

    it('exportComponentsToCSV include il BOM UTF-8, le intestazioni e i campi calcolati corretti', () => {
      const comp = createMockComponent({
        id: 'c1',
        name: 'GPU RTX 4070, Ti',
        brand: 'ASUS "TUF"',
        model: 'OC',
        category: 'gpu',
      });
      const events: ComponentEvent[] = [
        createMockPurchase({ id: 'e1', componentId: 'c1', date: '2024-01-01', price: 800 }),
        createMockExtraExpense({ id: 'e2', componentId: 'c1', date: '2024-01-05', amount: 35, description: 'Cavo 12VHPWR' }),
        createMockInstall({ id: 'e3', componentId: 'c1', date: '2024-01-05' }),
        createMockUninstall({ id: 'e4', componentId: 'c1', date: '2024-02-01' }),
        createMockSale({ id: 'e5', componentId: 'c1', date: '2024-02-10', price: 700 }),
      ];

      const csv = exportComponentsToCSV([comp], events);

      // Inizia con UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Contiene intestazioni obbligatorie
      expect(csv).toContain('ID,Nome,Marca,Modello,Categoria,Numero Serie,Stato,Data Acquisto,Prezzo Acquisto,Spese Extra,Ricavo Vendita,Costo Netto,Giorni Utilizzo,Note,Data Creazione');

      // Escaping del nome con virgola e brand con virgolette
      expect(csv).toContain('"GPU RTX 4070, Ti"');
      expect(csv).toContain('"ASUS ""TUF"""');

      // Stato SOLD
      expect(csv).toContain('SOLD');

      // Costo netto: (800 + 35) - 700 = 135.00
      expect(csv).toContain('135.00');
    });

    it('exportEventsToCSV include il BOM UTF-8, mappa il nome componente e riporta tutti i dettagli dell’evento', () => {
      const comp = createMockComponent({
        id: 'c1',
        name: 'Ryzen 7 7800X3D',
        category: 'cpu',
      });
      const ev = createMockPurchase({
        id: 'e1',
        componentId: 'c1',
        date: '2024-01-01',
        price: 389.99,
        store: 'Amazon IT',
        orderNumber: 'IT-123-456',
        notes: 'Nota con "virgolette" e\nnewline',
      });

      const csv = exportEventsToCSV([ev], [comp]);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID Evento,ID Componente,Nome Componente,Categoria,Tipo Evento,Data,Prezzo (€)');
      expect(csv).toContain('Ryzen 7 7800X3D');
      expect(csv).toContain('389.99');
      expect(csv).toContain('Amazon IT');
      expect(csv).toContain('"Nota con ""virgolette"" e\nnewline"');
    });
  });
});
