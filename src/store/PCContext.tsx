import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import {
  Component,
  ComponentCategory,
  ComponentEvent,
  PurchaseEvent,
  InstallEvent,
  UninstallEvent,
  Upgrade,
  AppSettings,
  DatabaseSchema,
  ComponentComputedState,
  SaleEvent,
  ExtraExpenseEvent,
  GiftEvent,
  DisposalEvent,
  UpgradeExecutionInput,
  RigStatsSummary,
  Checkpoint,
  CheckpointTrigger,
  TemporalPosition,
  ComponentReceipt,
  WarrantyInfo,
  ALLOWED_RECEIPT_MIME_TYPES,
  AllowedReceiptMimeType,
  MAX_RECEIPT_FILE_SIZE_BYTES,
} from '../types';
import { APP_VERSION } from '../constants/version';
import {
  loadFullDatabase,
  saveComponent,
  saveEvent,
  saveUpgrade,
  saveCheckpointAtomic,
  deleteCheckpointAtomic,
  commitUpgradeTransaction,
  commitEventsAtomic,
  commitComponentWithEventsAtomic,
  commitBatchComponentsWithEventsAtomic,
  BatchComponentWithEventsItem,
  deleteComponent as dbDeleteComponent,
  deleteEvent as dbDeleteEvent,
  isDatabaseInitialized,
  setDatabaseInitialized,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
  normalizeSettings,
  getReceiptsByComponentId,
  saveReceiptAtomic,
  deleteReceiptAtomic,
} from '../storage';
import {
  computeTotalPurchased,
  computeTotalRecovered,
  computeHistoricalNetCost,
  computeCurrentRigCost,
  computeComponentComputedState,
  computeComponentStatus,
  sortEventsChronologically,
  validateComponent,
  validatePurchaseEvent,
  validateInstallEvent,
  validateUninstallEvent,
  validateSaleEvent,
  validateExtraExpenseEvent,
  validateGiftEvent,
  validateDisposalEvent,
  validateUpgrade,
  canDeleteEvent,
  canUpdateEvent,
  computeRigStats,
  createCheckpointFromCurrentRig,
  createCheckpointFromTemporalPosition,
  updateCheckpointMetadata,
  getConfigurationAtPosition,
  getEventsUpToPosition,
  computeWarrantyInfo,
  findPurchaseEvent,
} from '../domain';
import { generateId } from '../utils/id';

export interface ComponentInput {
  name: string;
  brand: string;
  model: string;
  category: ComponentCategory;
  serialNumber?: string;
  notes?: string;
}

export interface InitialPurchaseInput {
  price: number;
  date: string;
  store?: string;
  condition?: 'new' | 'used';
  warrantyExpiryDate?: string;
  notes?: string;
  initialReceipt?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    notes?: string;
  };
}

export interface InstallInput {
  date: string;
  slotOrLocation?: string;
  notes?: string;
}

export interface UninstallInput {
  date: string;
  reason?: UninstallEvent['reason'];
  notes?: string;
}

export interface SaleInput {
  date: string;
  price: number;
  platform?: string;
  buyer?: string;
  shippingCost?: number;
  fees?: number;
  notes?: string;
}

export interface ExtraExpenseInput {
  date: string;
  amount: number;
  description: string;
  notes?: string;
}

export interface GiftInput {
  date: string;
  recipient?: string;
  notes?: string;
}

export interface DisposalInput {
  date: string;
  disposalMethod: 'recycled' | 'broken_discarded' | 'eco_center';
  notes?: string;
}

export interface QuickSetupImportItem {
  category: ComponentCategory;
  brand: string;
  model: string;
  serialNumber?: string;
  notes?: string;
  purchasePrice?: number;
  slotOrLocation?: string;
}

export interface QuickSetupImportInput {
  rigName: string;
  rigDescription?: string;
  buildYear: number;
  components: QuickSetupImportItem[];
}

export interface StoreNotification {
  type: 'success' | 'error';
  message: string;
}

export interface InstalledComponentItem {
  component: Component;
  lastInstallEvent?: InstallEvent;
  computed: ComponentComputedState;
}

interface PCStoreState {
  components: Component[];
  events: ComponentEvent[];
  upgrades: Upgrade[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  notification: StoreNotification | null;

  // 4 Metriche Finanziarie Formalizzate
  totalPurchased: number;
  totalRecovered: number;
  historicalNetCost: number;
  currentRigCost: number;

  // Riepilogo Statistiche di Dominio
  rigStats: RigStatsSummary;

  // Azioni di Notifica
  dismissNotification: () => void;
  showNotification: (type: 'success' | 'error', message: string) => void;

  // Azioni di Dominio / Componenti
  reloadFromDB: () => Promise<void>;
  createComponentWithOptionalPurchase: (
    componentInput: ComponentInput,
    purchaseInput?: InitialPurchaseInput
  ) => Promise<Component>;
  updateComponent: (
    id: string,
    updates: Partial<ComponentInput>
  ) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;

  // Azioni di Lifecycle & Movimentazione (Install / Uninstall / Sostituzione / Vendita / Spese / Dismissioni)
  installComponent: (componentId: string, input: InstallInput) => Promise<void>;
  uninstallComponent: (componentId: string, input: UninstallInput) => Promise<void>;
  replaceComponent: (
    oldComponentId: string,
    newComponentId: string,
    input: { date: string; slotOrLocation?: string; reason?: UninstallEvent['reason'] }
  ) => Promise<void>;
  recordSale: (componentId: string, input: SaleInput) => Promise<void>;
  recordExtraExpense: (componentId: string, input: ExtraExpenseInput) => Promise<void>;
  recordGift: (componentId: string, input: GiftInput) => Promise<void>;
  recordDisposal: (componentId: string, input: DisposalInput) => Promise<void>;
  executeUpgrade: (input: UpgradeExecutionInput) => Promise<Upgrade>;

  // Funzioni di lettura computate
  getComponentComputed: (id: string) => ComponentComputedState | undefined;
  getComponentEvents: (id: string) => ComponentEvent[];
  getInstalledComponents: () => InstalledComponentItem[];
  getAvailableForInstallComponents: (category?: ComponentCategory) => Component[];
  getSellableComponents: () => Component[];
  getNonTerminalComponents: () => Component[];

  // Azioni dirette per eventi/upgrade
  addEvent: (event: ComponentEvent) => Promise<void>;
  addUpgrade: (upgrade: Upgrade) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  deleteComponentEvent: (eventId: string, componentId: string) => Promise<void>;
  updateComponentEvent: (event: ComponentEvent) => Promise<void>;

  // Azioni Impostazioni & Personalizzazione
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettingsToDefault: () => Promise<void>;
  importQuickSetupData: (input: QuickSetupImportInput) => Promise<void>;

  // Checkpoint & Memoria Storica Congelata
  checkpoints: Checkpoint[];
  createCheckpointFromCurrent: (input: { name: string; notes?: string }) => Promise<Checkpoint>;
  createCheckpointFromPosition: (input: {
    name: string;
    notes?: string;
    position: TemporalPosition;
    trigger?: CheckpointTrigger;
    relatedUpgradeId?: string | null;
  }) => Promise<Checkpoint>;
  updateCheckpoint: (id: string, updates: { name?: string; notes?: string }) => Promise<void>;
  deleteCheckpoint: (id: string) => Promise<void>;

  // Cassaforte Ricevute & Garanzie (Task 1)
  getComponentWarranty: (componentId: string) => WarrantyInfo;
  getComponentReceipts: (componentId: string) => Promise<ComponentReceipt[]>;
  uploadReceipt: (
    componentId: string,
    fileData: { fileName: string; fileType: string; fileSize: number; dataUrl: string },
    notes?: string,
    eventId?: string
  ) => Promise<ComponentReceipt>;
  deleteReceipt: (receiptId: string) => Promise<void>;
}

const PCContext = createContext<PCStoreState | null>(null);

export const PCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DatabaseSchema>({
    schemaVersion: 1,
    appVersion: APP_VERSION,
    lastModified: new Date().toISOString(),
    settings: DEFAULT_SETTINGS,
    components: [],
    events: [],
    upgrades: [],
    checkpoints: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<StoreNotification | null>(null);

  const dismissNotification = () => setNotification(null);
  const showNotification = (type: 'success' | 'error', message: string) =>
    setNotification({ type, message });

  const reloadFromDB = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const initialized = await isDatabaseInitialized();
      const dbData = await loadFullDatabase();

      // Se IndexedDB non è mai stato inizializzato (primo avvio su installazione vergine)
      if (!initialized) {
        await setDatabaseInitialized(true);
      }

      setData(dbData);
    } catch (err) {
      const msg = `Errore durante il caricamento da IndexedDB: ${(err as Error).message}`;
      setError(msg);
      setNotification({ type: 'error', message: msg });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadFromDB().catch(() => {});
  }, []);

  /**
   * Crea un nuovo componente con ID stabile e opzionalmente registra il primo acquisto.
   */
  const createComponentWithOptionalPurchase = async (
    componentInput: ComponentInput,
    purchaseInput?: InitialPurchaseInput
  ): Promise<Component> => {
    const compValidation = validateComponent(componentInput);
    if (!compValidation.isValid) {
      const firstError = Object.values(compValidation.errors)[0];
      setNotification({ type: 'error', message: firstError });
      throw new Error(firstError);
    }

    const now = new Date().toISOString();
    const newComponent: Component = {
      id: generateId(),
      name: componentInput.name.trim(),
      brand: componentInput.brand.trim(),
      model: componentInput.model.trim(),
      category: componentInput.category,
      serialNumber: componentInput.serialNumber?.trim() || undefined,
      notes: componentInput.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    let purchaseEvent: PurchaseEvent | null = null;
    if (purchaseInput && purchaseInput.price !== undefined && purchaseInput.price !== null) {
      const purchaseValidation = validatePurchaseEvent({
        ...purchaseInput,
        componentId: newComponent.id,
      });

      if (!purchaseValidation.isValid) {
        const firstError = Object.values(purchaseValidation.errors)[0];
        setNotification({ type: 'error', message: firstError });
        throw new Error(firstError);
      }

      purchaseEvent = {
        id: generateId(),
        componentId: newComponent.id,
        type: 'PURCHASE',
        price: Number(purchaseInput.price),
        date: purchaseInput.date || now.split('T')[0],
        store: purchaseInput.store?.trim() || undefined,
        condition: purchaseInput.condition || 'new',
        warrantyExpiryDate: purchaseInput.warrantyExpiryDate?.trim() || undefined,
        notes: purchaseInput.notes?.trim() || undefined,
        createdAt: now,
      };
    }

    await commitComponentWithEventsAtomic(
      newComponent,
      purchaseEvent ? [purchaseEvent] : []
    );

    if (purchaseInput?.initialReceipt) {
      const receiptToSave: ComponentReceipt = {
        id: generateId(),
        componentId: newComponent.id,
        eventId: purchaseEvent?.id,
        fileName: purchaseInput.initialReceipt.fileName.trim(),
        fileType: purchaseInput.initialReceipt.fileType,
        fileSize: purchaseInput.initialReceipt.fileSize,
        dataUrl: purchaseInput.initialReceipt.dataUrl,
        uploadedAt: now,
        notes: purchaseInput.initialReceipt.notes?.trim() || undefined,
      };
      await saveReceiptAtomic(receiptToSave);
    }

    await reloadFromDB();
    setNotification({
      type: 'success',
      message: `Componente "${newComponent.name}" aggiunto con successo!`,
    });

    return newComponent;
  };

  /**
   * Modifica i dati anagrafici di un componente esistente.
   */
  const updateComponent = async (
    id: string,
    updates: Partial<ComponentInput>
  ): Promise<void> => {
    const existing = data.components.find((c) => c.id === id);
    if (!existing) {
      throw new Error(`Componente con ID ${id} non trovato.`);
    }

    const mergedData: Partial<Component> = {
      ...existing,
      ...updates,
    };

    const validation = validateComponent(mergedData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setNotification({ type: 'error', message: firstError });
      throw new Error(firstError);
    }

    const updatedComponent: Component = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      brand: updates.brand !== undefined ? updates.brand.trim() : existing.brand,
      model: updates.model !== undefined ? updates.model.trim() : existing.model,
      category: updates.category || existing.category,
      serialNumber:
        updates.serialNumber !== undefined
          ? updates.serialNumber.trim() || undefined
          : existing.serialNumber,
      notes:
        updates.notes !== undefined ? updates.notes.trim() || undefined : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    await saveComponent(updatedComponent);
    await reloadFromDB();
    setNotification({
      type: 'success',
      message: `Componente "${updatedComponent.name}" aggiornato con successo!`,
    });
  };

  /**
   * Elimina un componente e a cascata tutti i suoi eventi collegati.
   */
  const deleteComponent = async (id: string): Promise<void> => {
    const existing = data.components.find((c) => c.id === id);
    await dbDeleteComponent(id);
    await reloadFromDB();
    setNotification({
      type: 'success',
      message: existing
        ? `Componente "${existing.name}" e i suoi eventi eliminati con successo.`
        : 'Componente eliminato.',
    });
  };

  /**
   * Installa un componente nel PC (crea evento INSTALL).
   */
  const installComponent = async (componentId: string, input: InstallInput): Promise<void> => {
    const comp = data.components.find((c) => c.id === componentId);
    if (!comp) {
      throw new Error(`Componente ${componentId} non trovato.`);
    }

    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const currentStatus = computeComponentStatus(compEvents);

    const validation = validateInstallEvent(
      { componentId, date: input.date, slotOrLocation: input.slotOrLocation },
      currentStatus
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setNotification({ type: 'error', message: firstError });
      throw new Error(firstError);
    }

    const installEvent: InstallEvent = {
      id: generateId(),
      componentId,
      type: 'INSTALL',
      date: input.date,
      slotOrLocation: input.slotOrLocation?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await saveEvent(installEvent);
    await reloadFromDB();
    setNotification({
      type: 'success',
      message: `"${comp.name}" installato nel PC con successo!`,
    });
  };

  /**
   * Rimuove un componente montato nel PC (crea evento UNINSTALL).
   */
  const uninstallComponent = async (componentId: string, input: UninstallInput): Promise<void> => {
    const comp = data.components.find((c) => c.id === componentId);
    if (!comp) {
      throw new Error(`Componente ${componentId} non trovato.`);
    }

    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const currentStatus = computeComponentStatus(compEvents);

    const validation = validateUninstallEvent(
      { componentId, date: input.date, reason: input.reason },
      currentStatus
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setNotification({ type: 'error', message: firstError });
      throw new Error(firstError);
    }

    const uninstallEvent: UninstallEvent = {
      id: generateId(),
      componentId,
      type: 'UNINSTALL',
      date: input.date,
      reason: input.reason || 'storage',
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await saveEvent(uninstallEvent);
    await reloadFromDB();
    setNotification({
      type: 'success',
      message: `"${comp.name}" rimosso dal PC e riposto in magazzino.`,
    });
  };

  /**
   * Sostituzione semplice: rimuove il vecchio componente e installa il nuovo alla stessa data.
   */
  const replaceComponent = async (
    oldComponentId: string,
    newComponentId: string,
    input: { date: string; slotOrLocation?: string; reason?: UninstallEvent['reason'] }
  ): Promise<void> => {
    const oldComp = data.components.find((c) => c.id === oldComponentId);
    const newComp = data.components.find((c) => c.id === newComponentId);

    if (!oldComp || !newComp) {
      throw new Error('Componenti per la sostituzione non trovati.');
    }

    // Validazione lifecycle: il vecchio pezzo deve essere attualmente IN_USE
    const oldCompEvents = data.events.filter((e) => e.componentId === oldComponentId);
    const oldStatus = computeComponentStatus(oldCompEvents);
    if (oldStatus !== 'IN_USE') {
      const msg = `Impossibile sostituire "${oldComp.name}": non risulta montato nel PC (stato: ${oldStatus}).`;
      setNotification({ type: 'error', message: msg });
      throw new Error(msg);
    }

    // Validazione lifecycle: il nuovo pezzo deve essere disponibile IN_STORAGE
    const newCompEvents = data.events.filter((e) => e.componentId === newComponentId);
    const newStatus = computeComponentStatus(newCompEvents);
    if (newStatus !== 'IN_STORAGE') {
      const msg = `Impossibile montare "${newComp.name}": non è disponibile in magazzino (stato: ${newStatus}).`;
      setNotification({ type: 'error', message: msg });
      throw new Error(msg);
    }

    // Validazione data obbligatoria
    if (!input.date) {
      const msg = 'La data di sostituzione è obbligatoria.';
      setNotification({ type: 'error', message: msg });
      throw new Error(msg);
    }

    const now = new Date().toISOString();

    // 1. Evento di rimozione del vecchio pezzo
    const uninstallEvent: UninstallEvent = {
      id: generateId(),
      componentId: oldComponentId,
      type: 'UNINSTALL',
      date: input.date,
      reason: input.reason || 'upgrade',
      notes: `Sostituito con ${newComp.name}`,
      createdAt: now,
    };

    // 2. Evento di montaggio del nuovo pezzo
    const installEvent: InstallEvent = {
      id: generateId(),
      componentId: newComponentId,
      type: 'INSTALL',
      date: input.date,
      slotOrLocation: input.slotOrLocation,
      notes: `Sostituto al posto di ${oldComp.name}`,
      createdAt: now,
    };

    // Transazione atomica: UNINSTALL + INSTALL devono essere entrambi persistiti o nessuno.
    await commitEventsAtomic([uninstallEvent, installEvent]);
    await reloadFromDB();

    setNotification({
      type: 'success',
      message: `Sostituzione completata: ${newComp.name} ha preso il posto di ${oldComp.name}.`,
    });
  };

  const handleAddEvent = async (event: ComponentEvent) => {
    await saveEvent(event);
    await reloadFromDB();
  };

  const handleAddUpgrade = async (upgrade: Upgrade) => {
    await saveUpgrade(upgrade);
    await reloadFromDB();
  };

  const handleRemoveEvent = async (id: string) => {
    await dbDeleteEvent(id);
    await reloadFromDB();
  };

  const handleDeleteComponentEvent = async (eventId: string, componentId: string) => {
    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const check = canDeleteEvent(eventId, compEvents);
    if (!check.canDelete) {
      const msg = check.error || 'Impossibile eliminare questo evento: violerebbe la coerenza storica.';
      showNotification('error', msg);
      throw new Error(msg);
    }

    await dbDeleteEvent(eventId);
    await reloadFromDB();
    showNotification('success', 'Evento eliminato con successo dallo storico.');
  };

  const handleUpdateComponentEvent = async (updatedEvent: ComponentEvent) => {
    const compEvents = data.events.filter((e) => e.componentId === updatedEvent.componentId);
    const check = canUpdateEvent(updatedEvent, compEvents);
    if (!check.canUpdate) {
      const msg = check.error || 'Modifica non consentita per questo evento.';
      showNotification('error', msg);
      throw new Error(msg);
    }

    await saveEvent(updatedEvent);
    await reloadFromDB();
    showNotification('success', 'Evento aggiornato con successo.');
  };

  const getComponentComputed = (id: string): ComponentComputedState | undefined => {
    const component = data.components.find((c) => c.id === id);
    if (!component) return undefined;
    return computeComponentComputedState(component, data.events);
  };

  const getComponentEvents = (id: string): ComponentEvent[] => {
    return sortEventsChronologically(data.events.filter((e) => e.componentId === id));
  };

  /**
   * Restituisce tutti i componenti attualmente montati nel PC (stato IN_USE)
   * con le relative informazioni sull'ultimo evento di installazione.
   */
  const getInstalledComponents = (): InstalledComponentItem[] => {
    const result: InstalledComponentItem[] = [];

    for (const comp of data.components) {
      const computed = computeComponentComputedState(comp, data.events);

      if (computed.status === 'IN_USE') {
        const compEvents = data.events.filter((e) => e.componentId === comp.id);
        const installEvents = compEvents.filter((e): e is InstallEvent => e.type === 'INSTALL');
        const sortedInstalls = installEvents.length > 1 ? (sortEventsChronologically(installEvents) as InstallEvent[]) : installEvents;
        const lastInstall = sortedInstalls[sortedInstalls.length - 1];
        result.push({
          component: comp,
          lastInstallEvent: lastInstall,
          computed,
        });
      }
    }

    return result;
  };

  /**
   * Restituisce i componenti posseduti in magazzino (stato IN_STORAGE)
   * pronti per essere installati nel PC.
   */
  const getAvailableForInstallComponents = (category?: ComponentCategory): Component[] => {
    return data.components.filter((comp) => {
      if (category && comp.category !== category) return false;
      const compEvents = data.events.filter((e) => e.componentId === comp.id);
      const status = computeComponentStatus(compEvents);
      return status === 'IN_STORAGE';
    });
  };

  /**
   * Restituisce i componenti non ancora dismessi (non SOLD, non GIFTED, non DISPOSED).
   */
  const getNonTerminalComponents = (): Component[] => {
    return data.components.filter((comp) => {
      const compEvents = data.events.filter((e) => e.componentId === comp.id);
      const status = computeComponentStatus(compEvents);
      return status !== 'SOLD' && status !== 'GIFTED' && status !== 'DISPOSED';
    });
  };

  const getSellableComponents = (): Component[] => {
    return getNonTerminalComponents();
  };

  /**
   * Registra una vendita (SALE) su un componente esistente.
   * Se il componente è attualmente montato (IN_USE), registra prima uno smontaggio contestuale.
   */
  const recordSale = async (componentId: string, input: SaleInput): Promise<void> => {
    const component = data.components.find((c) => c.id === componentId);
    if (!component) {
      const msg = `Componente ${componentId} non trovato.`;
      showNotification('error', msg);
      throw new Error(msg);
    }

    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const currentStatus = computeComponentStatus(compEvents);
    const existingCompIds = new Set(data.components.map((c) => c.id));

    const validation = validateSaleEvent(
      { ...input, componentId },
      currentStatus,
      existingCompIds
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showNotification('error', firstError);
      throw new Error(firstError);
    }

    const now = new Date().toISOString();

    const eventsToCommit: ComponentEvent[] = [];

    // Se il pezzo è montato nel PC, effettua lo smontaggio preventivo per la vendita (atomico assieme a SALE)
    if (currentStatus === 'IN_USE') {
      const uninstallEvent: UninstallEvent = {
        id: generateId(),
        componentId,
        type: 'UNINSTALL',
        date: input.date,
        reason: 'upgrade',
        notes: 'Smontato dal PC per avvenuta vendita',
        createdAt: now,
      };
      eventsToCommit.push(uninstallEvent);
    }

    const saleEvent: SaleEvent = {
      id: generateId(),
      componentId,
      type: 'SALE',
      date: input.date,
      price: Number(input.price),
      platform: input.platform?.trim() || undefined,
      buyer: input.buyer?.trim() || undefined,
      shippingCost: input.shippingCost !== undefined && !isNaN(input.shippingCost) ? Number(input.shippingCost) : undefined,
      fees: input.fees !== undefined && !isNaN(input.fees) ? Number(input.fees) : undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
    };
    eventsToCommit.push(saleEvent);

    await commitEventsAtomic(eventsToCommit);
    await reloadFromDB();

    const net = saleEvent.price - (saleEvent.shippingCost || 0) - (saleEvent.fees || 0);
    showNotification(
      'success',
      `Vendita registrata per ${component.name}: incasso netto di €${net.toFixed(2)}.`
    );
  };

  /**
   * Registra una spesa accessoria (EXTRA_EXPENSE) collegata a un componente esistente.
   */
  const recordExtraExpense = async (
    componentId: string,
    input: ExtraExpenseInput
  ): Promise<void> => {
    const component = data.components.find((c) => c.id === componentId);
    if (!component) {
      const msg = `Componente ${componentId} non trovato.`;
      showNotification('error', msg);
      throw new Error(msg);
    }

    const existingCompIds = new Set(data.components.map((c) => c.id));
    const validation = validateExtraExpenseEvent(
      { ...input, componentId },
      existingCompIds
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showNotification('error', firstError);
      throw new Error(firstError);
    }

    const now = new Date().toISOString();
    const expenseEvent: ExtraExpenseEvent = {
      id: generateId(),
      componentId,
      type: 'EXTRA_EXPENSE',
      date: input.date,
      amount: Number(input.amount),
      description: input.description.trim(),
      notes: input.notes?.trim() || undefined,
      createdAt: now,
    };

    await saveEvent(expenseEvent);
    await reloadFromDB();

    showNotification(
      'success',
      `Spesa extra di €${expenseEvent.amount.toFixed(2)} registrata per ${component.name}.`
    );
  };

  /**
   * Registra una donazione/regalo (GIFT) per un componente.
   */
  const recordGift = async (componentId: string, input: GiftInput): Promise<void> => {
    const component = data.components.find((c) => c.id === componentId);
    if (!component) {
      const msg = `Componente ${componentId} non trovato.`;
      showNotification('error', msg);
      throw new Error(msg);
    }

    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const currentStatus = computeComponentStatus(compEvents);
    const existingCompIds = new Set(data.components.map((c) => c.id));

    const validation = validateGiftEvent(
      { ...input, componentId },
      currentStatus,
      existingCompIds
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showNotification('error', firstError);
      throw new Error(firstError);
    }

    const now = new Date().toISOString();
    const eventsToCommit: ComponentEvent[] = [];

    if (currentStatus === 'IN_USE') {
      const uninstallEvent: UninstallEvent = {
        id: generateId(),
        componentId,
        type: 'UNINSTALL',
        date: input.date,
        reason: 'storage',
        notes: 'Smontato dal PC per donazione/regalo',
        createdAt: now,
      };
      eventsToCommit.push(uninstallEvent);
    }

    const giftEvent: GiftEvent = {
      id: generateId(),
      componentId,
      type: 'GIFT',
      date: input.date,
      recipient: input.recipient?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
    };
    eventsToCommit.push(giftEvent);

    await commitEventsAtomic(eventsToCommit);
    await reloadFromDB();

    showNotification(
      'success',
      `Componente ${component.name} registrato come donato/regalato.`
    );
  };

  /**
   * Registra uno smaltimento (DISPOSAL) per un componente.
   */
  const recordDisposal = async (componentId: string, input: DisposalInput): Promise<void> => {
    const component = data.components.find((c) => c.id === componentId);
    if (!component) {
      const msg = `Componente ${componentId} non trovato.`;
      showNotification('error', msg);
      throw new Error(msg);
    }

    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const currentStatus = computeComponentStatus(compEvents);
    const existingCompIds = new Set(data.components.map((c) => c.id));

    const validation = validateDisposalEvent(
      { ...input, componentId },
      currentStatus,
      existingCompIds
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showNotification('error', firstError);
      throw new Error(firstError);
    }

    const now = new Date().toISOString();
    const eventsToCommit: ComponentEvent[] = [];

    if (currentStatus === 'IN_USE') {
      const uninstallEvent: UninstallEvent = {
        id: generateId(),
        componentId,
        type: 'UNINSTALL',
        date: input.date,
        reason: 'defect',
        notes: 'Smontato dal PC per smaltimento',
        createdAt: now,
      };
      eventsToCommit.push(uninstallEvent);
    }

    const disposalEvent: DisposalEvent = {
      id: generateId(),
      componentId,
      type: 'DISPOSAL',
      date: input.date,
      disposalMethod: input.disposalMethod,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
    };
    eventsToCommit.push(disposalEvent);

    await commitEventsAtomic(eventsToCommit);
    await reloadFromDB();

    showNotification(
      'success',
      `Componente ${component.name} registrato come smaltito.`
    );
  };

  /**
   * Esegue un Upgrade generazionale in modo atomico su IndexedDB.
   * Coordina in un'unica transazione ACID multi-store:
   * 1. Creazione nuovo componente (se mode === 'new')
   * 2. Registrazione PURCHASE nuovo componente (se indicato)
   * 3. Smontaggio UNINSTALL del vecchio componente (se montato IN_USE)
   * 4. Eventuale vendita SALE del vecchio componente (se richiesta)
   * 5. Installazione INSTALL del nuovo componente
   * 6. Creazione del record Upgrade
   * Se un qualsiasi passaggio fallisce, IndexedDB effettua il rollback totale.
   */
  const executeUpgrade = async (input: UpgradeExecutionInput): Promise<Upgrade> => {
    const validation = validateUpgrade(input, data.components, data.events);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showNotification('error', firstError);
      throw new Error(firstError);
    }

    const oldComp = data.components.find((c) => c.id === input.oldComponentId)!;
    const oldEvents = data.events.filter((e) => e.componentId === oldComp.id);
    const oldStatus = computeComponentStatus(oldEvents);

    const now = new Date().toISOString();
    const eventsToSave: ComponentEvent[] = [];
    let newCompToSave: Component | undefined = undefined;
    let targetNewId: string;
    let category: ComponentCategory;

    // 1. Nuovo componente: creazione anagrafica e acquisto contestuale (se mode === 'new')
    if (input.mode === 'new') {
      const newId = generateId();
      category = input.newComponentData!.category;
      newCompToSave = {
        id: newId,
        name: input.newComponentData!.name.trim(),
        brand: input.newComponentData!.brand?.trim() || '',
        model: input.newComponentData!.model?.trim() || '',
        category,
        notes: input.newComponentData!.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      if (input.newComponentData!.purchasePrice !== undefined) {
        const purchaseEvent: PurchaseEvent = {
          id: generateId(),
          componentId: newId,
          type: 'PURCHASE',
          date: input.date,
          price: Number(input.newComponentData!.purchasePrice),
          store: input.newComponentData!.store?.trim() || undefined,
          condition: input.newComponentData!.condition || 'new',
          warrantyExpiryDate: input.newComponentData!.warrantyExpiryDate || undefined,
          notes: input.newComponentData!.notes?.trim() || undefined,
          createdAt: now,
        };
        eventsToSave.push(purchaseEvent);
      }
      targetNewId = newId;
    } else {
      targetNewId = input.newComponentId!;
      const existingComp = data.components.find((c) => c.id === targetNewId)!;
      category = existingComp.category;
    }

    // 2. Smontaggio del vecchio componente se era montato nel PC
    if (oldStatus === 'IN_USE') {
      const uninstallEvent: UninstallEvent = {
        id: generateId(),
        componentId: oldComp.id,
        type: 'UNINSTALL',
        date: input.date,
        reason: 'upgrade',
        notes: input.notes?.trim()
          ? `Smontato per upgrade: ${input.notes.trim()}`
          : `Smontato dal PC per passaggio a nuovo componente`,
        createdAt: now,
      };
      eventsToSave.push(uninstallEvent);
    }

    // 3. Eventuale vendita contestuale del vecchio componente
    if (input.saleOldComponent) {
      const saleEvent: SaleEvent = {
        id: generateId(),
        componentId: oldComp.id,
        type: 'SALE',
        date: input.date,
        price: Number(input.salePrice || 0),
        shippingCost: input.shippingCost !== undefined && !isNaN(input.shippingCost) ? Number(input.shippingCost) : undefined,
        fees: input.fees !== undefined && !isNaN(input.fees) ? Number(input.fees) : undefined,
        platform: input.platform?.trim() || undefined,
        buyer: input.buyer?.trim() || undefined,
        notes: input.saleNotes?.trim() || undefined,
        createdAt: now,
      };
      eventsToSave.push(saleEvent);
    }

    // 4. Montaggio del nuovo componente nel PC
    const installEvent: InstallEvent = {
      id: generateId(),
      componentId: targetNewId,
      type: 'INSTALL',
      date: input.date,
      slotOrLocation: input.slotOrLocation?.trim() || undefined,
      notes: `Montato tramite upgrade in sostituzione di ${oldComp.name}`,
      createdAt: now,
    };
    eventsToSave.push(installEvent);

    // 5. Creazione record Upgrade relazionale
    const upgradeRecord: Upgrade = {
      id: generateId(),
      date: input.date,
      category,
      oldComponentId: oldComp.id,
      newComponentId: targetNewId,
      notes: input.notes?.trim() || undefined,
    };

    // 6. Commit Atomico Cross-Store su IndexedDB
    await commitUpgradeTransaction({
      newComponent: newCompToSave,
      eventsToSave,
      upgrade: upgradeRecord,
    });

    // 7. Ricaricamento deterministico dello stato
    await reloadFromDB();

    const targetName = newCompToSave ? newCompToSave.name : (data.components.find((c) => c.id === targetNewId)?.name || 'nuovo componente');
    showNotification(
      'success',
      `Upgrade registrato: ${oldComp.name} ➔ ${targetName}.`
    );

    return upgradeRecord;
  };

  /**
   * Aggiorna le impostazioni dell'applicazione in modo atomico e le persiste su IndexedDB.
   */
  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated = normalizeSettings({ ...data.settings, ...updates });
    await saveSettings(updated);
    setData((prev) => ({
      ...prev,
      settings: updated,
      lastModified: new Date().toISOString(),
    }));
  };

  /**
   * Ripristina esclusivamente le impostazioni di default, senza toccare componenti, eventi o upgrade.
   */
  const resetSettingsToDefault = async () => {
    const defaults = await resetSettings();
    setData((prev) => ({
      ...prev,
      settings: defaults,
      lastModified: new Date().toISOString(),
    }));
    showNotification('success', 'Impostazioni predefinite ripristinate con successo.');
  };

  // Metriche finanziarie calcolate
  const totalPurchased = useMemo(() => computeTotalPurchased(data.events), [data.events]);
  const totalRecovered = useMemo(() => computeTotalRecovered(data.events), [data.events]);
  const historicalNetCost = useMemo(() => computeHistoricalNetCost(data.events), [data.events]);
  const currentRigCost = useMemo(
    () => computeCurrentRigCost(data.components, data.events),
    [data.components, data.events]
  );

  const rigStats = useMemo(
    () => computeRigStats(data.components, data.events, data.upgrades),
    [data.components, data.events, data.upgrades]
  );

  /**
   * Creazione e gestione Checkpoint
   */
  const createCheckpointFromCurrent = async (input: { name: string; notes?: string }): Promise<Checkpoint> => {
    try {
      const newCheckpoint = createCheckpointFromCurrentRig({
        name: input.name,
        notes: input.notes,
        trigger: 'manual',
        components: data.components,
        events: data.events,
      });

      await saveCheckpointAtomic(newCheckpoint);
      setData((prev) => ({
        ...prev,
        checkpoints: [...(prev.checkpoints || []), newCheckpoint],
      }));
      showNotification('success', `Checkpoint "${newCheckpoint.name}" salvato con successo!`);
      return newCheckpoint;
    } catch (err) {
      const msg = `Errore salvataggio checkpoint: ${(err as Error).message}`;
      showNotification('error', msg);
      throw err;
    }
  };

  const createCheckpointFromPosition = async (input: {
    name: string;
    notes?: string;
    position: TemporalPosition;
    trigger?: CheckpointTrigger;
    relatedUpgradeId?: string | null;
  }): Promise<Checkpoint> => {
    try {
      const installed = getConfigurationAtPosition(data.components, data.events, input.position);
      const relevantEvents = getEventsUpToPosition(data.events, input.position);

      const newCheckpoint = createCheckpointFromTemporalPosition({
        name: input.name,
        notes: input.notes,
        trigger: input.trigger || 'manual',
        position: input.position,
        installedComponents: installed,
        events: relevantEvents,
        relatedUpgradeId: input.relatedUpgradeId,
      });

      await saveCheckpointAtomic(newCheckpoint);
      setData((prev) => ({
        ...prev,
        checkpoints: [...(prev.checkpoints || []), newCheckpoint],
      }));
      showNotification('success', `Checkpoint "${newCheckpoint.name}" salvato con successo!`);
      return newCheckpoint;
    } catch (err) {
      const msg = `Errore salvataggio checkpoint: ${(err as Error).message}`;
      showNotification('error', msg);
      throw err;
    }
  };

  const handleUpdateCheckpoint = async (id: string, updates: { name?: string; notes?: string }): Promise<void> => {
    try {
      const target = (data.checkpoints || []).find((c) => c.id === id);
      if (!target) {
        throw new Error(`Checkpoint non trovato (ID: ${id})`);
      }
      const updated = updateCheckpointMetadata(target, updates);
      await saveCheckpointAtomic(updated);
      setData((prev) => ({
        ...prev,
        checkpoints: (prev.checkpoints || []).map((c) => (c.id === id ? updated : c)),
      }));
      showNotification('success', 'Checkpoint aggiornato con successo.');
    } catch (err) {
      const msg = `Errore aggiornamento checkpoint: ${(err as Error).message}`;
      showNotification('error', msg);
      throw err;
    }
  };

  const handleDeleteCheckpoint = async (id: string): Promise<void> => {
    try {
      await deleteCheckpointAtomic(id);
      setData((prev) => ({
        ...prev,
        checkpoints: (prev.checkpoints || []).filter((c) => c.id !== id),
      }));
      showNotification('success', 'Checkpoint eliminato con successo.');
    } catch (err) {
      const msg = `Errore eliminazione checkpoint: ${(err as Error).message}`;
      showNotification('error', msg);
      throw err;
    }
  };

  const handleImportQuickSetupData = async (input: QuickSetupImportInput): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const currentDate = now.split('T')[0];
      const currentYear = new Date().getFullYear();

      const installDate =
        input.buildYear === currentYear ? currentDate : `${input.buildYear}-01-01`;

      const newSettings: AppSettings = {
        ...data.settings,
        rigName: input.rigName.trim() || 'Gaming PC',
        rigDescription: input.rigDescription?.trim() || '',
        buildYear: input.buildYear,
        quickSetupCompleted: true,
      };

      const getDefaultSlot = (cat: ComponentCategory): string => {
        switch (cat) {
          case 'cpu':
            return 'Socket CPU';
          case 'gpu':
            return 'PCIe x16 Slot 1';
          case 'motherboard':
            return 'Chassis';
          case 'ram':
            return 'Slot DIMM';
          case 'storage':
            return 'Slot M.2 NVMe';
          case 'psu':
            return 'Vano Alimentatore';
          case 'case':
            return 'Chassis Principale';
          case 'cooling':
            return 'Socket / Case Mount';
          default:
            return 'Postazione PC';
        }
      };

      const batchItems: BatchComponentWithEventsItem[] = input.components.map((item) => {
        const compId = generateId();
        const comp: Component = {
          id: compId,
          name: `${item.brand} ${item.model}`.trim(),
          brand: item.brand.trim() || 'Generic',
          model: item.model.trim() || 'Hardware Component',
          category: item.category,
          serialNumber: item.serialNumber?.trim() || undefined,
          notes: item.notes?.trim() || 'Configurazione iniziale Quick Setup',
          createdAt: now,
          updatedAt: now,
        };

        const compEvents: ComponentEvent[] = [];

        // Se l'utente ha indicato un prezzo d'acquisto reale, creiamo l'evento PURCHASE
        if (typeof item.purchasePrice === 'number' && !isNaN(item.purchasePrice) && item.purchasePrice > 0) {
          const purchaseEv: PurchaseEvent = {
            id: generateId(),
            componentId: compId,
            type: 'PURCHASE',
            date: installDate,
            price: item.purchasePrice,
            condition: 'new',
            notes: 'Prezzo inserito durante il Quick Setup',
            createdAt: now,
          };
          compEvents.push(purchaseEv);
        }

        const installEv: InstallEvent = {
          id: generateId(),
          componentId: compId,
          type: 'INSTALL',
          date: installDate,
          slotOrLocation: item.slotOrLocation || getDefaultSlot(item.category),
          notes: 'Installazione iniziale Quick Setup',
          createdAt: now,
        };
        compEvents.push(installEv);

        return {
          component: comp,
          events: compEvents,
        };
      });

      await commitBatchComponentsWithEventsAtomic(batchItems, newSettings);
      await reloadFromDB();
      showNotification(
        'success',
        `Setup completato! ${input.components.length} componenti configurati nel tuo PC.`
      );
    } catch (err) {
      const msg = `Errore durante il Quick Setup: ${(err as Error).message}`;
      showNotification('error', msg);
      throw err;
    }
  };

  /**
   * Calcola lo stato di garanzia e i giorni residui per un componente.
   */
  const getComponentWarranty = (componentId: string): WarrantyInfo => {
    const compEvents = data.events.filter((e) => e.componentId === componentId);
    const purchase = findPurchaseEvent(compEvents);
    return computeWarrantyInfo(purchase);
  };

  /**
   * Recupera on-demand tutte le ricevute associate a un componente.
   */
  const getComponentReceipts = async (componentId: string): Promise<ComponentReceipt[]> => {
    return getReceiptsByComponentId(componentId);
  };

  /**
   * Salva una ricevuta/fattura nella cassaforte locale di IndexedDB.
   */
  const uploadReceipt = async (
    componentId: string,
    fileData: { fileName: string; fileType: string; fileSize: number; dataUrl: string },
    notes?: string,
    eventId?: string
  ): Promise<ComponentReceipt> => {
    const comp = data.components.find((c) => c.id === componentId);
    if (!comp) {
      throw new Error(`Componente con ID ${componentId} non trovato.`);
    }

    if (fileData.fileSize > MAX_RECEIPT_FILE_SIZE_BYTES) {
      const err = `Il file supera il limite massimo consentito di 10MB (${(fileData.fileSize / (1024 * 1024)).toFixed(1)}MB).`;
      showNotification('error', err);
      throw new Error(err);
    }

    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(fileData.fileType as AllowedReceiptMimeType)) {
      const err = `Tipo file non supportato (${fileData.fileType}). Formati supportati: PDF, PNG, JPG, WebP.`;
      showNotification('error', err);
      throw new Error(err);
    }

    const allowedPrefixes = [
      'data:application/pdf;',
      'data:image/png;',
      'data:image/jpeg;',
      'data:image/webp;',
    ];
    if (
      !fileData.dataUrl ||
      !allowedPrefixes.some((prefix) => fileData.dataUrl.toLowerCase().startsWith(prefix))
    ) {
      const err = `Data URL non conforme o formato non sicuro per "${fileData.fileName}".`;
      showNotification('error', err);
      throw new Error(err);
    }

    const receipt: ComponentReceipt = {
      id: generateId(),
      componentId,
      eventId,
      fileName: fileData.fileName.trim(),
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      dataUrl: fileData.dataUrl,
      uploadedAt: new Date().toISOString(),
      notes: notes?.trim() || undefined,
    };

    await saveReceiptAtomic(receipt);
    showNotification('success', `Ricevuta "${receipt.fileName}" salvata nella cassaforte locale!`);
    return receipt;
  };

  /**
   * Elimina una ricevuta dalla cassaforte locale di IndexedDB.
   */
  const deleteReceipt = async (receiptId: string): Promise<void> => {
    await deleteReceiptAtomic(receiptId);
    showNotification('success', 'Ricevuta eliminata dalla cassaforte.');
  };

  const contextValue: PCStoreState = useMemo(
    () => ({
      components: data.components,
      events: data.events,
      upgrades: data.upgrades,
      settings: data.settings,
      checkpoints: data.checkpoints || [],
      isLoading,
      error,
      notification,
      totalPurchased,
      totalRecovered,
      historicalNetCost,
      currentRigCost,
      rigStats,
      dismissNotification,
      showNotification,
      reloadFromDB,
      createComponentWithOptionalPurchase,
      updateComponent,
      deleteComponent,
      installComponent,
      uninstallComponent,
      replaceComponent,
      recordSale,
      recordExtraExpense,
      recordGift,
      recordDisposal,
      executeUpgrade,
      getComponentComputed,
      getComponentEvents,
      getInstalledComponents,
      getAvailableForInstallComponents,
      getSellableComponents,
      getNonTerminalComponents,
      addEvent: handleAddEvent,
      addUpgrade: handleAddUpgrade,
      removeEvent: handleRemoveEvent,
      deleteComponentEvent: handleDeleteComponentEvent,
      updateComponentEvent: handleUpdateComponentEvent,
      updateSettings,
      resetSettingsToDefault,
      importQuickSetupData: handleImportQuickSetupData,
      createCheckpointFromCurrent,
      createCheckpointFromPosition,
      updateCheckpoint: handleUpdateCheckpoint,
      deleteCheckpoint: handleDeleteCheckpoint,
      getComponentWarranty,
      getComponentReceipts,
      uploadReceipt,
      deleteReceipt,
    }),
    [
      data,
      isLoading,
      error,
      notification,
      totalPurchased,
      totalRecovered,
      historicalNetCost,
      currentRigCost,
      rigStats,
    ]
  );

  return <PCContext.Provider value={contextValue}>{children}</PCContext.Provider>;
};

export function usePCStore(): PCStoreState {
  const context = useContext(PCContext);
  if (!context) {
    throw new Error('usePCStore deve essere utilizzato all’interno di un PCProvider.');
  }
  return context;
}
