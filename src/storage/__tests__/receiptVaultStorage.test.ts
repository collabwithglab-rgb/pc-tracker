import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Component,
  ComponentEvent,
  ComponentReceipt,
  DatabaseSchema,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from '../../types';
import {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
} from '../backupService';
import {
  saveReceiptAtomic,
  getReceiptById,
  getReceiptsByComponentId,
  getAllReceipts,
  deleteReceiptAtomic,
  deleteComponent,
} from '../storageService';

// In-memory mock completo per tutti gli Object Store di IndexedDB
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

    // Cascade delete events
    const eventStore = getStore('events');
    for (const [id, ev] of Array.from(eventStore.entries())) {
      if ((ev as ComponentEvent).componentId === componentId) {
        eventStore.delete(id);
      }
    }

    // Cascade delete receipts
    const receiptStore = getStore('receipts');
    for (const [id, r] of Array.from(receiptStore.entries())) {
      if ((r as ComponentReceipt).componentId === componentId) {
        receiptStore.delete(id);
      }
    }
  }),
  replaceAllDataAtomic: vi.fn(async (params: any) => {
    getStore('components').clear();
    getStore('events').clear();
    getStore('upgrades').clear();
    getStore('checkpoints').clear();
    getStore('receipts').clear();
    getStore('metadata').clear();

    for (const c of params.components) getStore('components').set(c.id, c);
    for (const e of params.events) getStore('events').set(e.id, e);
    for (const u of params.upgrades || []) getStore('upgrades').set(u.id, u);
    for (const cp of params.checkpoints || []) getStore('checkpoints').set(cp.id, cp);
    for (const r of params.receipts || []) getStore('receipts').set(r.id, r);
    for (const m of params.metadataItems || []) getStore('metadata').set(m.key, m);
  }),
  getAllReceipts: vi.fn(async () => Array.from(getStore('receipts').values())),
  getReceiptsByComponentId: vi.fn(async (compFk: string) => {
    return Array.from(getStore('receipts').values()).filter(
      (r: any) => r.componentId === compFk
    );
  }),
  getReceiptById: vi.fn(async (rId: string) => getStore('receipts').get(rId)),
  saveReceiptAtomic: vi.fn(async (receipt: ComponentReceipt) => {
    getStore('receipts').set(receipt.id, receipt);
  }),
  deleteReceiptAtomic: vi.fn(async (rId: string) => {
    getStore('receipts').delete(rId);
  }),
  deleteReceiptsByComponentId: vi.fn(async (compFk: string) => {
    const rStore = getStore('receipts');
    for (const [id, r] of Array.from(rStore.entries())) {
      if ((r as ComponentReceipt).componentId === compFk) {
        rStore.delete(id);
      }
    }
  }),
}));

describe('Receipt Vault Storage & Backup (Cassaforte Ricevute)', () => {
  const sampleComponent: Component = {
    id: 'comp-rtx4080',
    name: 'GeForce RTX 4080 Super',
    brand: 'ASUS',
    model: 'TUF Gaming',
    category: 'gpu',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const sampleReceipt: ComponentReceipt = {
    id: 'rec-001',
    componentId: 'comp-rtx4080',
    fileName: 'Fattura_Amazon_RTX4080.pdf',
    fileType: 'application/pdf',
    fileSize: 1024 * 1024, // 1 MB
    uploadedAt: '2024-01-15T10:30:00Z',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    notes: 'Ricevuta ufficiale con garanzia Amazon 24 mesi',
  };

  beforeEach(() => {
    inMemoryStores.clear();
    getStore('components').set(sampleComponent.id, sampleComponent);
  });

  describe('CRUD Ricevute su IndexedDB', () => {
    it('salva e recupera una ricevuta per ID', async () => {
      await saveReceiptAtomic(sampleReceipt);
      const retrieved = await getReceiptById(sampleReceipt.id);
      expect(retrieved).toEqual(sampleReceipt);
    });

    it('recupera le ricevute filtrate per componentId', async () => {
      const receipt2: ComponentReceipt = {
        id: 'rec-002',
        componentId: 'comp-rtx4080',
        fileName: 'Scontrino_Pad_Termici.png',
        fileType: 'image/png',
        fileSize: 200 * 1024,
        uploadedAt: '2024-02-01T10:00:00Z',
        dataUrl: 'data:image/png;base64,iVBORw0KGgo...',
      };

      const receiptOtherComp: ComponentReceipt = {
        id: 'rec-003',
        componentId: 'other-comp-id',
        fileName: 'Fattura_Altro.pdf',
        fileType: 'application/pdf',
        fileSize: 500 * 1024,
        uploadedAt: '2024-03-01T10:00:00Z',
        dataUrl: 'data:application/pdf;base64,...',
      };

      await saveReceiptAtomic(sampleReceipt);
      await saveReceiptAtomic(receipt2);
      await saveReceiptAtomic(receiptOtherComp);

      const rtxReceipts = await getReceiptsByComponentId('comp-rtx4080');
      expect(rtxReceipts).toHaveLength(2);
      expect(rtxReceipts.map((r) => r.id)).toContain('rec-001');
      expect(rtxReceipts.map((r) => r.id)).toContain('rec-002');
      expect(rtxReceipts.map((r) => r.id)).not.toContain('rec-003');
    });

    it('elimina una singola ricevuta', async () => {
      await saveReceiptAtomic(sampleReceipt);
      expect(await getReceiptById(sampleReceipt.id)).toBeDefined();

      await deleteReceiptAtomic(sampleReceipt.id);
      expect(await getReceiptById(sampleReceipt.id)).toBeUndefined();
    });

    it('elimina a cascata tutte le ricevute quando il componente viene eliminato (Anti-Leak)', async () => {
      await saveReceiptAtomic(sampleReceipt);
      expect(await getAllReceipts()).toHaveLength(1);

      await deleteComponent('comp-rtx4080');
      expect(await getAllReceipts()).toHaveLength(0);
      expect(await getReceiptById(sampleReceipt.id)).toBeUndefined();
    });
  });

  describe('Backup, Esportazione e Validazione JSON (Anti-Leak & Limiti)', () => {
    it('include le ricevute esportando il database in JSON', async () => {
      await saveReceiptAtomic(sampleReceipt);
      const jsonStr = await exportDatabaseToJSON();
      const parsed = JSON.parse(jsonStr) as DatabaseSchema;

      expect(parsed.receipts).toBeDefined();
      expect(parsed.receipts).toHaveLength(1);
      expect(parsed.receipts![0].id).toBe('rec-001');
      expect(parsed.receipts![0].fileName).toBe('Fattura_Amazon_RTX4080.pdf');
    });

    it('valida con successo un backup contenente ricevute valide', async () => {
      const backupData: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {} as any,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        upgrades: [],
        receipts: [sampleReceipt],
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.counts.receipts).toBe(1);
      }
    });

    it('rifiuta un backup se una ricevuta supera il limite di dimensione di 10MB', async () => {
      const oversizeReceipt: ComponentReceipt = {
        ...sampleReceipt,
        fileSize: MAX_RECEIPT_FILE_SIZE_BYTES + 1024, // > 10MB
      };

      const backupData = {
        schemaVersion: 1,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        receipts: [oversizeReceipt],
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('supera il limite massimo consentito di 10MB');
      }
    });

    it('rifiuta un backup se il totale delle ricevute supera 50MB', async () => {
      const receipts: ComponentReceipt[] = [];
      // 6 ricevute da 9MB = 54MB (> 50MB)
      for (let i = 1; i <= 6; i++) {
        receipts.push({
          ...sampleReceipt,
          id: `rec-heavy-${i}`,
          fileSize: 9 * 1024 * 1024,
        });
      }

      const backupData = {
        schemaVersion: 1,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        receipts,
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('supera il limite di sicurezza di 50MB');
      }
    });

    it('rifiuta un backup con formato MIME non supportato (.exe / .zip)', async () => {
      const maliciousReceipt: ComponentReceipt = {
        ...sampleReceipt,
        fileType: 'application/x-msdownload',
      };

      const backupData = {
        schemaVersion: 1,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        receipts: [maliciousReceipt],
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Tipo file non supportato');
      }
    });

    it('rifiuta un backup se la ricevuta fa riferimento a un componentId inesistente (integrità referenziale)', async () => {
      const orphanReceipt: ComponentReceipt = {
        ...sampleReceipt,
        componentId: 'non-existent-comp-id',
      };

      const backupData = {
        schemaVersion: 1,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        receipts: [orphanReceipt],
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Integrità referenziale violata');
      }
    });

    it('rifiuta un backup se il campo dataUrl è corrotto o non è una stringa data:', async () => {
      const corruptReceipt: ComponentReceipt = {
        ...sampleReceipt,
        dataUrl: 'corrupted-payload-without-data-prefix',
      };

      const backupData = {
        schemaVersion: 1,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        receipts: [corruptReceipt],
      };

      const result = validateImportJSON(JSON.stringify(backupData));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Data URL non valido o corrotto');
      }
    });

    it('esegue il ripristino atomico delle ricevute tramite executeImport', async () => {
      const backupData: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        settings: {} as any,
        components: [sampleComponent],
        events: [
          {
            id: 'ev-1',
            componentId: sampleComponent.id,
            type: 'PURCHASE',
            price: 1100,
            date: '2024-01-15',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        upgrades: [],
        receipts: [sampleReceipt],
      };

      await executeImport(backupData);
      const storedReceipt = await getReceiptById('rec-001');
      expect(storedReceipt).toBeDefined();
      expect(storedReceipt?.fileName).toBe('Fattura_Amazon_RTX4080.pdf');
    });
  });
});
