import {
  Component,
  ComponentEvent,
  Upgrade,
  Checkpoint,
  DatabaseSchema,
  AppSettings,
  AccentColorPreference,
  EnvironmentThemePreference,
  TypographyPresetPreference,
} from '../types';
import {
  STORES,
  getAllFromStore,
  getByIdFromStore,
  putItem,
  deleteItemFromStore,
  deleteComponentCascade,
  saveUpgradeAtomic,
  SaveUpgradeAtomicParams,
  saveEventsAtomic,
  resetDatabaseAtomic,
  saveComponentWithEventsAtomic,
  saveBatchComponentsWithEventsAtomic,
  BatchComponentWithEventsItem,
} from './indexedDB';
import { CURRENT_SCHEMA_VERSION } from './migrations';


export const DEFAULT_SETTINGS: AppSettings = {
  rigName: '',
  rigDescription: '',
  buildYear: undefined,
  quickSetupCompleted: false,
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
};

/**
 * Normalizza e completa le impostazioni applicative, garantendo retrocompatibilità
 * con database legacy o fallback solido in caso di dati parziali/corrotti.
 */
export function normalizeSettings(rawSettings: unknown): AppSettings {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const s = rawSettings as Partial<AppSettings>;

  let buildYear: number | undefined = undefined;
  if (
    typeof s.buildYear === 'number' &&
    !isNaN(s.buildYear) &&
    s.buildYear >= 1990 &&
    s.buildYear <= new Date().getFullYear() + 1
  ) {
    buildYear = Math.floor(s.buildYear);
  }

  const validRecentCounts = [5, 7, 10, 15];
  const dashboardRecentCount =
    typeof s.dashboardRecentCount === 'number' && validRecentCounts.includes(s.dashboardRecentCount)
      ? s.dashboardRecentCount
      : DEFAULT_SETTINGS.dashboardRecentCount;

  const validAccents: AccentColorPreference[] = ['cyan', 'arctic', 'violet', 'emerald', 'amber', 'crimson'];
  const accentColor: AccentColorPreference =
    typeof s.accentColor === 'string' && validAccents.includes(s.accentColor as AccentColorPreference)
      ? (s.accentColor as AccentColorPreference)
      : DEFAULT_SETTINGS.accentColor;

  const validEnvironments: EnvironmentThemePreference[] = ['obsidian', 'graphite', 'slate', 'midnight', 'carbon'];
  const environmentTheme: EnvironmentThemePreference =
    typeof s.environmentTheme === 'string' && validEnvironments.includes(s.environmentTheme as EnvironmentThemePreference)
      ? (s.environmentTheme as EnvironmentThemePreference)
      : DEFAULT_SETTINGS.environmentTheme;

  const validTypography: TypographyPresetPreference[] = ['default', 'minimal', 'system'];
  const typographyPreset: TypographyPresetPreference =
    typeof s.typographyPreset === 'string' && validTypography.includes(s.typographyPreset as TypographyPresetPreference)
      ? (s.typographyPreset as TypographyPresetPreference)
      : DEFAULT_SETTINGS.typographyPreset;

  return {
    rigName: typeof s.rigName === 'string' ? s.rigName.trim() : DEFAULT_SETTINGS.rigName,
    rigDescription:
      typeof s.rigDescription === 'string' ? s.rigDescription.trim() : DEFAULT_SETTINGS.rigDescription,
    buildYear,
    quickSetupCompleted: typeof s.quickSetupCompleted === 'boolean' ? s.quickSetupCompleted : false,
    currencySymbol: '€', // PC Tracker rimane rigorosamente focalizzato sull'euro
    dateFormat: s.dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD/MM/YYYY',
    uiDensity: s.uiDensity === 'compact' ? 'compact' : 'comfortable',
    reducedMotion:
      s.reducedMotion === 'always' || s.reducedMotion === 'never' ? s.reducedMotion : 'system',
    accentColor,
    environmentTheme,
    typographyPreset,
    defaultStartSection:
      s.defaultStartSection === 'current-rig' || s.defaultStartSection === 'archive'
        ? s.defaultStartSection
        : 'dashboard',
    dashboardRecentCount,
    showRigSynthesis:
      typeof s.showRigSynthesis === 'boolean'
        ? s.showRigSynthesis
        : DEFAULT_SETTINGS.showRigSynthesis,
    archiveDefaultSort:
      s.archiveDefaultSort === 'name_asc' || s.archiveDefaultSort === 'cost_desc'
        ? s.archiveDefaultSort
        : 'purchase_date_desc',
    archiveDefaultView: s.archiveDefaultView === 'table' ? 'table' : 'cards',
    confirmEventDeletion:
      typeof s.confirmEventDeletion === 'boolean'
        ? s.confirmEventDeletion
        : DEFAULT_SETTINGS.confirmEventDeletion,
    autoCloseMovementModal:
      typeof s.autoCloseMovementModal === 'boolean'
        ? s.autoCloseMovementModal
        : DEFAULT_SETTINGS.autoCloseMovementModal,
    customCategories: Array.isArray(s.customCategories) ? s.customCategories : undefined,
  };
}

/**
 * Salva o aggiorna le impostazioni dell'applicazione in IndexedDB.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const normalized = normalizeSettings(settings);
  await putItem(STORES.METADATA, { key: 'settings', value: normalized });
}

/**
 * Ripristina esclusivamente le impostazioni di default su IndexedDB,
 * senza toccare componenti, eventi, upgrade o flag di inizializzazione.
 */
export async function resetSettings(): Promise<AppSettings> {
  const defaults = { ...DEFAULT_SETTINGS };
  await putItem(STORES.METADATA, { key: 'settings', value: defaults });
  return defaults;
}

/**
 * Carica l'intero database da IndexedDB (Single Source of Truth).
 */
export async function loadFullDatabase(): Promise<DatabaseSchema> {
  const [components, events, upgrades, checkpoints, metadataList] = await Promise.all([
    getAllFromStore<Component>(STORES.COMPONENTS),
    getAllFromStore<ComponentEvent>(STORES.EVENTS),
    getAllFromStore<Upgrade>(STORES.UPGRADES),
    getAllFromStore<Checkpoint>(STORES.CHECKPOINTS),
    getAllFromStore<{ key: string; value: unknown }>(STORES.METADATA),
  ]);

  const settingsEntry = metadataList.find((m) => m.key === 'settings');
  const settings = normalizeSettings(settingsEntry?.value);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: '0.1.0',
    lastModified: new Date().toISOString(),
    settings,
    components,
    events,
    upgrades,
    checkpoints,
  };
}

/**
 * Salva o aggiorna un componente su IndexedDB.
 */
export async function saveComponent(component: Component): Promise<void> {
  const updatedComponent: Component = {
    ...component,
    updatedAt: new Date().toISOString(),
  };
  await putItem(STORES.COMPONENTS, updatedComponent);
}

/**
 * Salva o aggiorna un evento su IndexedDB con verifica di integrità referenziale.
 */
export async function saveEvent(event: ComponentEvent): Promise<void> {
  const existingComponent = await getByIdFromStore<Component>(STORES.COMPONENTS, event.componentId);
  if (!existingComponent) {
    throw new Error(
      `Integrità referenziale violata: componente non trovato (ID: ${event.componentId})`
    );
  }
  await putItem(STORES.EVENTS, event);
}

/**
 * Salva o aggiorna un upgrade su IndexedDB.
 */
export async function saveUpgrade(upgrade: Upgrade): Promise<void> {
  await putItem(STORES.UPGRADES, upgrade);
}

/**
 * Esegue il commit atomico dell'Upgrade su IndexedDB.
 * Salva il nuovo componente (se creato), tutti gli eventi collegati (INSTALL, UNINSTALL, SALE, PURCHASE)
 * e il record dell'Upgrade in un'unica transazione ACID multi-store.
 */
export async function commitUpgradeTransaction(params: SaveUpgradeAtomicParams): Promise<void> {
  await saveUpgradeAtomic(params);
}

/**
 * Salva una lista di eventi in una singola transazione atomica.
 * Usato da replaceComponent, recordSale, recordGift, recordDisposal per garantire che le sequenze di eventi
 * siano persistite atomicamente (tutte o nessuna).
 */
export async function commitEventsAtomic(events: ComponentEvent[]): Promise<void> {
  await saveEventsAtomic(events);
}

/**
 * Salva un componente ed eventuali eventi correlati (es. PURCHASE iniziale) in una singola transazione atomica IDB.
 */
export async function commitComponentWithEventsAtomic(
  component: Component,
  events: ComponentEvent[] = []
): Promise<void> {
  await saveComponentWithEventsAtomic({ component, events });
}

/**
 * Salva in un'unica transazione atomica ACID multipli componenti con i rispettivi eventi
 * e opzionalmente aggiorna le impostazioni del setup (usato da Quick Setup).
 */
export async function commitBatchComponentsWithEventsAtomic(
  items: BatchComponentWithEventsItem[],
  settingsToUpdate?: AppSettings
): Promise<void> {
  await saveBatchComponentsWithEventsAtomic(items, settingsToUpdate);
}

/**
 * Elimina un componente e a cascata tutti i suoi eventi ed upgrade collegati da IndexedDB.
 * Operazione atomica: componente, eventi e upgrade vengono eliminati in una singola transazione IDB.
 */
export async function deleteComponent(componentId: string): Promise<void> {
  await deleteComponentCascade(componentId);
}

/**
 * Elimina un singolo evento da IndexedDB.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await deleteItemFromStore(STORES.EVENTS, eventId);
}

export {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
  importDatabaseFromJSON,
  getLastExportedAt,
  setLastExportedAt,
  exportComponentsToCSV,
  exportEventsToCSV,
  downloadFile,
} from './backupService';

export {
  getAllCheckpoints,
  getCheckpointById,
  saveCheckpointAtomic,
  deleteCheckpointAtomic,
} from './indexedDB';


/**
 * Verifica se il database locale è già stato inizializzato esplicitamente.
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const entry = await getByIdFromStore<{ key: string; value: unknown }>(
    STORES.METADATA,
    'initialized'
  );
  return Boolean(entry?.value);
}

/**
 * Imposta il flag di inizializzazione nel database.
 */
export async function setDatabaseInitialized(value: boolean = true): Promise<void> {
  await putItem(STORES.METADATA, { key: 'initialized', value });
}

/**
 * Svuota completamente il database IndexedDB in una singola transazione atomica (AUD-001)
 * e imposta esplicitamente il flag initialized a true,
 * in modo che un successivo ricaricamento non reinserisca l'auto-seed.
 */
export async function resetDatabase(): Promise<void> {
  await resetDatabaseAtomic();
}
