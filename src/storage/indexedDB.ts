import { Component, ComponentEvent, Upgrade, Checkpoint, AppSettings, ComponentReceipt } from '../types';
import { validateCheckpoint } from '../domain/checkpointEngine';

const DB_NAME = 'pc_tracker_db';
const DB_VERSION = 3;

export const STORES = {
  COMPONENTS: 'components',
  EVENTS: 'events',
  UPGRADES: 'upgrades',
  METADATA: 'metadata',
  CHECKPOINTS: 'checkpoints',
  RECEIPTS: 'receipts',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Apre la connessione al database IndexedDB locale, inizializzando gli Object Store
 * se il database viene creato o la versione incrementata.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non è supportato in questo ambiente.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store: components
      if (!db.objectStoreNames.contains(STORES.COMPONENTS)) {
        db.createObjectStore(STORES.COMPONENTS, { keyPath: 'id' });
      }

      // Store: events (con indici per componentId e date)
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('componentId', 'componentId', { unique: false });
        eventStore.createIndex('date', 'date', { unique: false });
      }

      // Store: upgrades
      if (!db.objectStoreNames.contains(STORES.UPGRADES)) {
        const upgradeStore = db.createObjectStore(STORES.UPGRADES, { keyPath: 'id' });
        upgradeStore.createIndex('date', 'date', { unique: false });
      }

      // Store: metadata (per impostazioni e versionamento)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      // Store: checkpoints (versione 2)
      if (!db.objectStoreNames.contains(STORES.CHECKPOINTS)) {
        const checkpointStore = db.createObjectStore(STORES.CHECKPOINTS, { keyPath: 'id' });
        checkpointStore.createIndex('referenceDate', 'referenceDate', { unique: false });
      }

      // Store: receipts (versione 3 - Cassaforte Ricevute)
      if (!db.objectStoreNames.contains(STORES.RECEIPTS)) {
        const receiptStore = db.createObjectStore(STORES.RECEIPTS, { keyPath: 'id' });
        receiptStore.createIndex('componentId', 'componentId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Errore durante l’apertura di IndexedDB.'));
    };
  });
}

/**
 * Recupera tutti gli elementi da uno specifico Object Store.
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Recupera un singolo elemento per ID da uno specifico Object Store.
 */
export async function getByIdFromStore<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva o aggiorna un elemento in uno specifico Object Store.
 */
export async function putItem<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Inserisce o aggiorna una lista di elementi in una singola transazione atomica.
 */
export async function putItems<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const item of items) {
      store.put(item);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Elimina un elemento per ID da uno specifico Object Store.
 */
export async function deleteItemFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Svuota completamente uno specifico Object Store.
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Elimina un componente, tutti i suoi eventi correlati e tutti gli Upgrade
 * in cui il componente compare come oldComponentId o newComponentId,
 * in una singola transazione atomica multi-store.
 * Garanzia: se il browser crasha a metà, nessuna modifica viene applicata (rollback atomico IDB).
 */
export async function deleteComponentCascade(componentId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeNames: StoreName[] = [STORES.COMPONENTS, STORES.EVENTS, STORES.UPGRADES];
    const hasReceiptsStore = db.objectStoreNames.contains(STORES.RECEIPTS);
    if (hasReceiptsStore) {
      storeNames.push(STORES.RECEIPTS);
    }
    const tx = db.transaction(storeNames, 'readwrite');
    const componentStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);
    const upgradeStore = tx.objectStore(STORES.UPGRADES);

    // Elimina il componente
    componentStore.delete(componentId);

    // Elimina a cascata tutte le ricevute associate
    if (hasReceiptsStore) {
      const receiptStore = tx.objectStore(STORES.RECEIPTS);
      const receiptIndex = receiptStore.index('componentId');
      const receiptCursorRequest = receiptIndex.openCursor(IDBKeyRange.only(componentId));
      receiptCursorRequest.onsuccess = () => {
        const cursor = receiptCursorRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    // Elimina a cascata tutti gli eventi associati tramite indice 'componentId'
    const eventIndex = eventStore.index('componentId');
    const eventCursorRequest = eventIndex.openCursor(IDBKeyRange.only(componentId));

    eventCursorRequest.onsuccess = () => {
      const cursor = eventCursorRequest.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Elimina a cascata tutti gli Upgrade dove il componente compare come oldComponentId o newComponentId.
    // Lo store upgrades non ha indici su questi campi, quindi usiamo un full-store cursor scan.
    const upgradeCursorRequest = upgradeStore.openCursor();

    upgradeCursorRequest.onsuccess = () => {
      const cursor = upgradeCursorRequest.result;
      if (cursor) {
        const upgrade = cursor.value as Upgrade;
        if (upgrade.oldComponentId === componentId || upgrade.newComponentId === componentId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface SaveUpgradeAtomicParams {
  newComponent?: Component;
  eventsToSave: ComponentEvent[];
  upgrade: Upgrade;
}

/**
 * Esegue il salvataggio atomico di un intero upgrade hardware su IndexedDB.
 * Utilizza una singola transazione readwrite multi-store su [COMPONENTS, EVENTS, UPGRADES].
 * Garanzia ACID: se un qualsiasi step fallisce o genera eccezione, IndexedDB esegue
 * il rollback completo: nessun componente orfano, nessun evento parziale, nessun upgrade residuo.
 */
export async function saveUpgradeAtomic(params: SaveUpgradeAtomicParams): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.COMPONENTS, STORES.EVENTS, STORES.UPGRADES], 'readwrite');
    const compStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);
    const upgradeStore = tx.objectStore(STORES.UPGRADES);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione di upgrade annullata o fallita. Rollback eseguito.'));

    try {
      if (params.newComponent) {
        compStore.put(params.newComponent);
      }
      for (const ev of params.eventsToSave) {
        eventStore.put(ev);
      }
      upgradeStore.put(params.upgrade);
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/**
 * Salva una lista di eventi in una singola transazione atomica sullo store EVENTS.
 * Se un qualsiasi put fallisce, IndexedDB esegue il rollback automatico e nessun evento viene persistito.
 * Usato da replaceComponent per garantire che UNINSTALL + INSTALL siano sempre entrambi presenti o assenti.
 */
export async function saveEventsAtomic(events: ComponentEvent[]): Promise<void> {
  if (events.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EVENTS, 'readwrite');
    const store = tx.objectStore(STORES.EVENTS);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione atomica eventi annullata. Rollback eseguito.'));

    try {
      for (const ev of events) {
        store.put(ev);
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

export interface ReplaceAllDataAtomicParams {
  components: Component[];
  events: ComponentEvent[];
  upgrades: Upgrade[];
  metadataItems: { key: string; value: unknown }[];
  checkpoints?: Checkpoint[];
  receipts?: ComponentReceipt[];
}

/**
 * Esegue la sostituzione atomica di tutti i dati del database in una singola transazione IDB multi-store.
 * Coinvolge: COMPONENTS, EVENTS, UPGRADES, METADATA, CHECKPOINTS e RECEIPTS.
 * Se una qualsiasi scrittura o operazione fallisce, IndexedDB esegue il rollback automatico:
 * nessun dato nuovo viene persistito e il database precedente rimane intatto.
 */
export async function replaceAllDataAtomic(params: ReplaceAllDataAtomicParams): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeNames: StoreName[] = [
      STORES.COMPONENTS,
      STORES.EVENTS,
      STORES.UPGRADES,
      STORES.METADATA,
      STORES.CHECKPOINTS,
    ];
    const hasReceiptsStore = db.objectStoreNames.contains(STORES.RECEIPTS);
    if (hasReceiptsStore) {
      storeNames.push(STORES.RECEIPTS);
    }

    const tx = db.transaction(storeNames, 'readwrite');
    const compStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);
    const upgradeStore = tx.objectStore(STORES.UPGRADES);
    const metaStore = tx.objectStore(STORES.METADATA);
    const checkpointStore = tx.objectStore(STORES.CHECKPOINTS);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione atomica di import annullata. Rollback eseguito.'));

    try {
      compStore.clear();
      eventStore.clear();
      upgradeStore.clear();
      metaStore.clear();
      checkpointStore.clear();

      if (hasReceiptsStore) {
        const receiptStore = tx.objectStore(STORES.RECEIPTS);
        receiptStore.clear();
        if (params.receipts && params.receipts.length > 0) {
          for (const r of params.receipts) {
            receiptStore.put(r);
          }
        }
      }

      for (const comp of params.components) {
        compStore.put(comp);
      }
      for (const ev of params.events) {
        eventStore.put(ev);
      }
      for (const up of params.upgrades) {
        upgradeStore.put(up);
      }
      for (const meta of params.metadataItems) {
        metaStore.put(meta);
      }
      if (params.checkpoints && params.checkpoints.length > 0) {
        for (const cp of params.checkpoints) {
          checkpointStore.put(cp);
        }
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/**
 * Svuota in modo atomico tutti gli Object Store e imposta il flag 'initialized' a true.
 * Se la transazione fallisce, il database precedente rimane integro (rollback IDB).
 */
export async function resetDatabaseAtomic(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeNames: StoreName[] = [
      STORES.COMPONENTS,
      STORES.EVENTS,
      STORES.UPGRADES,
      STORES.METADATA,
      STORES.CHECKPOINTS,
    ];
    const hasReceiptsStore = db.objectStoreNames.contains(STORES.RECEIPTS);
    if (hasReceiptsStore) {
      storeNames.push(STORES.RECEIPTS);
    }

    const tx = db.transaction(storeNames, 'readwrite');
    const compStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);
    const upgradeStore = tx.objectStore(STORES.UPGRADES);
    const metaStore = tx.objectStore(STORES.METADATA);
    const checkpointStore = tx.objectStore(STORES.CHECKPOINTS);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione atomica di reset annullata. Rollback eseguito.'));

    try {
      compStore.clear();
      eventStore.clear();
      upgradeStore.clear();
      metaStore.clear();
      checkpointStore.clear();

      if (hasReceiptsStore) {
        tx.objectStore(STORES.RECEIPTS).clear();
      }

      metaStore.put({ key: 'initialized', value: true });
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/**
 * Recupera tutti i Checkpoint memorizzati in IndexedDB.
 */
export async function getAllCheckpoints(): Promise<Checkpoint[]> {
  return getAllFromStore<Checkpoint>(STORES.CHECKPOINTS);
}

/**
 * Recupera un singolo Checkpoint per ID da IndexedDB.
 */
export async function getCheckpointById(id: string): Promise<Checkpoint | undefined> {
  return getByIdFromStore<Checkpoint>(STORES.CHECKPOINTS, id);
}

/**
 * Salva un Checkpoint su IndexedDB in una transazione atomica.
 * Valida la struttura formale tramite checkpointEngine prima di procedere alla scrittura.
 */
export async function saveCheckpointAtomic(checkpoint: Checkpoint): Promise<void> {
  const validation = validateCheckpoint(checkpoint);
  if (!validation.isValid) {
    const errorDetails = Object.values(validation.errors).join('; ');
    throw new Error(`Impossibile salvare il checkpoint: ${errorDetails}`);
  }
  await putItem(STORES.CHECKPOINTS, checkpoint);
}

/**
 * Elimina un Checkpoint per ID da IndexedDB.
 * Non tocca in alcun modo Components, Events, Upgrades o Settings.
 */
export async function deleteCheckpointAtomic(id: string): Promise<void> {
  await deleteItemFromStore(STORES.CHECKPOINTS, id);
}

export interface SaveComponentWithEventsAtomicParams {
  component: Component;
  events?: ComponentEvent[];
}

/**
 * Salva un componente e i suoi eventi correlati (es. PURCHASE iniziale) in una singola transazione IDB multi-store.
 * Garantisce che componente ed evento siano persistiti insieme in modo atomico o entrambi assenti in caso di errore.
 */
export async function saveComponentWithEventsAtomic(
  params: SaveComponentWithEventsAtomicParams
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.COMPONENTS, STORES.EVENTS], 'readwrite');
    const compStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione atomica componente + eventi annullata. Rollback eseguito.'));

    try {
      compStore.put(params.component);
      if (params.events && params.events.length > 0) {
        for (const ev of params.events) {
          eventStore.put(ev);
        }
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

export interface BatchComponentWithEventsItem {
  component: Component;
  events: ComponentEvent[];
}

/**
 * Salva in una singola transazione atomica ACID multipli componenti con i rispettivi eventi
 * e opzionalmente aggiorna le impostazioni dell'applicazione (es. durante Quick Setup).
 */
export async function saveBatchComponentsWithEventsAtomic(
  items: BatchComponentWithEventsItem[],
  settingsToUpdate?: AppSettings
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const storeNames = settingsToUpdate
      ? [STORES.COMPONENTS, STORES.EVENTS, STORES.METADATA]
      : [STORES.COMPONENTS, STORES.EVENTS];
    const tx = db.transaction(storeNames, 'readwrite');
    const compStore = tx.objectStore(STORES.COMPONENTS);
    const eventStore = tx.objectStore(STORES.EVENTS);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transazione atomica di batch salvataggio annullata. Rollback eseguito.'));

    try {
      if (settingsToUpdate) {
        const metaStore = tx.objectStore(STORES.METADATA);
        metaStore.put({ key: 'settings', value: settingsToUpdate });
      }
      for (const item of items) {
        compStore.put(item.component);
        for (const ev of item.events) {
          eventStore.put(ev);
        }
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/**
 * Recupera tutte le ricevute memorizzate in IndexedDB.
 */
export async function getAllReceipts(): Promise<ComponentReceipt[]> {
  const db = await openDatabase();
  if (!db.objectStoreNames.contains(STORES.RECEIPTS)) return [];
  return getAllFromStore<ComponentReceipt>(STORES.RECEIPTS);
}

/**
 * Recupera tutte le ricevute associate a uno specifico componente tramite indice 'componentId'.
 */
export async function getReceiptsByComponentId(componentId: string): Promise<ComponentReceipt[]> {
  const db = await openDatabase();
  if (!db.objectStoreNames.contains(STORES.RECEIPTS)) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECEIPTS, 'readonly');
    const store = tx.objectStore(STORES.RECEIPTS);
    const index = store.index('componentId');
    const request = index.getAll(IDBKeyRange.only(componentId));

    request.onsuccess = () => resolve(request.result as ComponentReceipt[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Recupera una singola ricevuta per ID da IndexedDB.
 */
export async function getReceiptById(id: string): Promise<ComponentReceipt | undefined> {
  const db = await openDatabase();
  if (!db.objectStoreNames.contains(STORES.RECEIPTS)) return undefined;
  return getByIdFromStore<ComponentReceipt>(STORES.RECEIPTS, id);
}

/**
 * Salva o aggiorna una ricevuta su IndexedDB in una transazione atomica.
 */
export async function saveReceiptAtomic(receipt: ComponentReceipt): Promise<void> {
  await putItem(STORES.RECEIPTS, receipt);
}

/**
 * Elimina una ricevuta per ID da IndexedDB.
 */
export async function deleteReceiptAtomic(id: string): Promise<void> {
  await deleteItemFromStore(STORES.RECEIPTS, id);
}

/**
 * Elimina tutte le ricevute collegate a un componente.
 */
export async function deleteReceiptsByComponentId(componentId: string): Promise<void> {
  const db = await openDatabase();
  if (!db.objectStoreNames.contains(STORES.RECEIPTS)) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECEIPTS, 'readwrite');
    const store = tx.objectStore(STORES.RECEIPTS);
    const index = store.index('componentId');
    const request = index.openCursor(IDBKeyRange.only(componentId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
