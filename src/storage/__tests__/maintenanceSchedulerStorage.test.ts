import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  saveSettings,
  resetSettings,
  loadFullDatabase,
  resetDatabase,
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
  normalizeSchedulerSettings,
  normalizeReminderInteractions,
} from '../storageService';
import {
  DEFAULT_SCHEDULER_SETTINGS,
  ReminderInteraction,
  DatabaseSchema,
  MaintenanceEntry,
  OptimizationRecommendation,
  OptimizationExecutionRecord,
} from '../../types';
import { evaluateMaintenanceReminders } from '../../domain';

function createMockMaintenanceEntry(overrides: Partial<MaintenanceEntry> = {}): MaintenanceEntry {
  return {
    id: 'entry-1',
    date: '2026-03-01',
    type: 'cleaning',
    title: 'Pulizia Filtri',
    description: 'Manutenzione periodica',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function createMockRecommendation(overrides: Partial<OptimizationRecommendation> = {}): OptimizationRecommendation {
  return {
    id: 'opt-trim-C',
    category: 'storage',
    title: 'Ottimizzazione Unità C: (TRIM)',
    reason: 'TRIM periodico',
    evidence: 'SSD NVMe su C:',
    expectedBenefit: 'Prestazioni ottimali',
    risk: 'NONE',
    confidence: 'HIGH',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    actionId: 'win-defrag-trim-c',
    eligibility: 'ELIGIBLE',
    parameters: { driveLetter: 'C' },
    ...overrides,
  };
}

function createMockOptRecord(overrides: Partial<OptimizationExecutionRecord> = {}): OptimizationExecutionRecord {
  return {
    id: 'opt-hist-bench-1',
    recommendationId: 'opt-gpu-power',
    recommendationTitle: 'Ottimizzazione GPU Power Limit',
    category: 'performance',
    actionAvailability: 'ONE_CLICK',
    triggerReason: 'Profilo energetico',
    triggerEvidence: 'Power limit standard',
    actionDescription: 'Regolazione del power target',
    timestampStarted: '2026-09-24T10:00:00Z',
    timestampCompleted: '2026-09-24T10:00:05Z',
    durationMs: 5000,
    outcome: 'success',
    verificationType: 'manual',
    verificationStatus: 'pending',
    verificationMethod: 'Test sotto carico',
    schemaVersion: 1,
    ...overrides,
  };
}

// In-memory mock per gli Object Store IndexedDB
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
  resetDatabaseAtomic: vi.fn(async () => {
    inMemoryStores.clear();
    getStore('metadata').set('initialized', { key: 'initialized', value: true });
  }),
}));

describe('Smart Maintenance Scheduler — Storage, Normalization & Backup (Tranche 2)', () => {
  beforeEach(async () => {
    inMemoryStores.clear();
    await resetDatabase();
  });

  // =========================================================================
  // A. STORAGE
  // =========================================================================
  describe('A. Storage & Persistence', () => {
    it('fornisce impostazioni scheduler di default canoniche in DEFAULT_SETTINGS', () => {
      expect(DEFAULT_SETTINGS.scheduler).toBeDefined();
      expect(DEFAULT_SETTINGS.scheduler?.enabled).toBe(true);
      expect(DEFAULT_SETTINGS.scheduler?.notificationMode).toBe('important_only');
      expect(DEFAULT_SETTINGS.scheduler?.leadTimeDays).toBe(3);
      expect(DEFAULT_SETTINGS.reminderInteractions).toEqual({});
    });

    it('salva e recupera le impostazioni dello scheduler tramite IndexedDB metadata store', async () => {
      const customSettings = {
        ...DEFAULT_SETTINGS,
        scheduler: {
          enabled: true,
          notificationMode: 'all' as const,
          leadTimeDays: 7 as const,
        },
      };

      await saveSettings(customSettings);
      const dbData = await loadFullDatabase();

      expect(dbData.settings.scheduler).toEqual({
        enabled: true,
        notificationMode: 'all',
        leadTimeDays: 7,
      });
    });

    it('persiste le impostazioni modificate dopo un reload simulato del database', async () => {
      const updatedSettings = normalizeSettings({
        ...DEFAULT_SETTINGS,
        scheduler: {
          enabled: false,
          notificationMode: 'verification_only',
          leadTimeDays: 1,
        },
      });

      await saveSettings(updatedSettings);

      // Simula reload
      const loaded = await loadFullDatabase();
      expect(loaded.settings.scheduler?.enabled).toBe(false);
      expect(loaded.settings.scheduler?.notificationMode).toBe('verification_only');
      expect(loaded.settings.scheduler?.leadTimeDays).toBe(1);
    });

    it('resetSettings ripristina lo scheduler ai valori di default canonici', async () => {
      await saveSettings({
        ...DEFAULT_SETTINGS,
        scheduler: {
          enabled: false,
          notificationMode: 'none',
          leadTimeDays: 0,
        },
        reminderInteractions: {
          'rem-test': { reminderId: 'rem-test', snoozedUntil: '2026-12-31' },
        },
      });

      const defaults = await resetSettings();
      expect(defaults.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(defaults.reminderInteractions).toEqual({});

      const reloaded = await loadFullDatabase();
      expect(reloaded.settings.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(reloaded.settings.reminderInteractions).toEqual({});
    });
  });

  // =========================================================================
  // B. NORMALIZATION
  // =========================================================================
  describe('B. Canonical Normalization & Defensive Fallbacks', () => {
    it('normalizza payload vuoto o non oggetto verso DEFAULT_SCHEDULER_SETTINGS', () => {
      expect(normalizeSchedulerSettings(undefined)).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(normalizeSchedulerSettings(null)).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(normalizeSchedulerSettings('invalid')).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(normalizeSchedulerSettings(42)).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(normalizeSchedulerSettings([])).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(normalizeSchedulerSettings({})).toEqual(DEFAULT_SCHEDULER_SETTINGS);
    });

    it('effettua fallback sicuro se notificationMode contiene un valore non consentito', () => {
      const normalized = normalizeSchedulerSettings({
        enabled: true,
        notificationMode: 'spam_everything_always',
        leadTimeDays: 3,
      });

      expect(normalized.notificationMode).toBe('important_only');
    });

    it('effettua fallback sicuro se leadTimeDays contiene un valore non valido', () => {
      const invalidValues = [5, 2, -1, 10, NaN, '3', null, undefined];
      for (const val of invalidValues) {
        const normalized = normalizeSchedulerSettings({
          enabled: true,
          notificationMode: 'all',
          leadTimeDays: val,
        });
        expect(normalized.leadTimeDays).toBe(3);
      }
    });

    it('preserva esattamente i valori di leadTimeDays consentiti (0, 1, 3, 7)', () => {
      const allowed = [0, 1, 3, 7] as const;
      for (const days of allowed) {
        const normalized = normalizeSchedulerSettings({
          leadTimeDays: days,
        });
        expect(normalized.leadTimeDays).toBe(days);
      }
    });

    it('effettua fallback sicuro se enabled contiene valori non booleani', () => {
      expect(normalizeSchedulerSettings({ enabled: 'true' }).enabled).toBe(true);
      expect(normalizeSchedulerSettings({ enabled: 1 }).enabled).toBe(true);
      expect(normalizeSchedulerSettings({ enabled: null }).enabled).toBe(true);
      expect(normalizeSchedulerSettings({ enabled: false }).enabled).toBe(false);
    });

    it('normalizeReminderInteractions scarta stati calcolati/derivati e preserva solo interazioni utente', () => {
      const rawPolluted = {
        'rem-1': {
          reminderId: 'rem-1',
          snoozedUntil: '2026-10-15',
          lastNotifiedDate: '2026-09-27',
          cycleExecutionId: 'exec-abc-123',
          // Proprietà proibite da persistere:
          eligibility: 'ELIGIBLE',
          urgency: 'overdue',
          dueDate: '2026-09-20',
          title: 'Titolo calcolato',
          explanation: 'Spiegazione calcolata',
          daysRemaining: -7,
          isNotificationEligible: true,
        },
      };

      const normalized = normalizeReminderInteractions(rawPolluted);

      expect(normalized['rem-1']).toEqual({
        reminderId: 'rem-1',
        snoozedUntil: '2026-10-15',
        lastNotifiedDate: '2026-09-27',
        cycleExecutionId: 'exec-abc-123',
      });
      expect((normalized['rem-1'] as any).urgency).toBeUndefined();
      expect((normalized['rem-1'] as any).eligibility).toBeUndefined();
      expect((normalized['rem-1'] as any).dueDate).toBeUndefined();
    });

    it('normalizeReminderInteractions scarta date ISO non valide o malformate', () => {
      const rawWithBadDates = {
        'rem-bad': {
          reminderId: 'rem-bad',
          snoozedUntil: '2026-02-31', // 31 febbraio non esiste
          lastNotifiedDate: 'not-a-date',
        },
      };

      const normalized = normalizeReminderInteractions(rawWithBadDates);
      // Data non valida -> nessun campo interazione valido -> record escluso
      expect(normalized['rem-bad']).toBeUndefined();
    });

    it('normalizeReminderInteractions supporta sia Record<string, ReminderInteraction> sia array', () => {
      const arrayInput = [
        {
          reminderId: 'rem-arr-1',
          snoozedUntil: '2026-10-01',
        },
        {
          reminderId: 'rem-arr-2',
          lastNotifiedDate: '2026-09-27',
        },
      ];

      const normalized = normalizeReminderInteractions(arrayInput);
      expect(normalized['rem-arr-1']?.snoozedUntil).toBe('2026-10-01');
      expect(normalized['rem-arr-2']?.lastNotifiedDate).toBe('2026-09-27');
    });
  });

  // =========================================================================
  // C. INTERACTIONS & SNOOZE INTEGRATION
  // =========================================================================
  describe('C. Reminder Interactions & Snooze Persistence', () => {
    it('persiste uno snooze utente e lo ricarica intatto', async () => {
      const settingsWithSnooze = {
        ...DEFAULT_SETTINGS,
        reminderInteractions: {
          'rem-periodic-opt-trim-C': {
            reminderId: 'rem-periodic-opt-trim-C',
            snoozedUntil: '2026-10-05',
          },
        },
      };

      await saveSettings(settingsWithSnooze);
      const dbData = await loadFullDatabase();

      expect(dbData.settings.reminderInteractions?.['rem-periodic-opt-trim-C']).toEqual({
        reminderId: 'rem-periodic-opt-trim-C',
        snoozedUntil: '2026-10-05',
      });
    });

    it('consente di rimuovere o ripulire una singola interazione', async () => {
      const initialSettings = {
        ...DEFAULT_SETTINGS,
        reminderInteractions: {
          'rem-1': { reminderId: 'rem-1', snoozedUntil: '2026-10-05' },
          'rem-2': { reminderId: 'rem-2', snoozedUntil: '2026-10-10' },
        },
      };
      await saveSettings(initialSettings);

      // Rimuove rem-1
      const updatedInteractions = { ...initialSettings.reminderInteractions };
      delete (updatedInteractions as any)['rem-1'];

      await saveSettings({
        ...initialSettings,
        reminderInteractions: updatedInteractions,
      });

      const loaded = await loadFullDatabase();
      expect(loaded.settings.reminderInteractions?.['rem-1']).toBeUndefined();
      expect(loaded.settings.reminderInteractions?.['rem-2']?.snoozedUntil).toBe('2026-10-10');
    });

    it('lo snooze persistito sopprime deterministicamente il reminder tramite evaluateMaintenanceReminders', () => {
      const reminderInteraction: Record<string, ReminderInteraction> = {
        'rem-maint-entry-1': {
          reminderId: 'rem-maint-entry-1',
          snoozedUntil: '2026-10-01',
        },
      };

      const maintenanceEntries = [
        createMockMaintenanceEntry({
          id: '1',
          date: '2026-03-01',
          type: 'cleaning',
          title: 'Pulizia Filtri',
          nextDueDate: '2026-09-25', // Scaduto rispetto al 27/09/2026
        }),
      ];

      // Senza snooze: reminder è generato
      const withoutSnooze = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        currentTimestamp: '2026-09-27T10:00:00Z',
      });
      expect(withoutSnooze.some((r) => r.id === 'rem-maint-entry-1')).toBe(true);

      // Con snooze attivo (fino al 01/10/2026, data di riferimento 27/09/2026): reminder ESCLUSO
      const withSnooze = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        interactions: reminderInteraction,
        currentTimestamp: '2026-09-27T10:00:00Z',
      });
      expect(withSnooze.some((r) => r.id === 'rem-maint-entry-1')).toBe(false);

      // Quando il tempo avanza oltre lo snooze (es. 02/10/2026): reminder ricompare automaticamente
      const afterSnoozeExpired = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        interactions: reminderInteraction,
        currentTimestamp: '2026-10-02T10:00:00Z',
      });
      expect(afterSnoozeExpired.some((r) => r.id === 'rem-maint-entry-1')).toBe(true);
    });

    it('notificationMode = none NON cancella i reminder, ma imposta isNotificationEligible = false', () => {
      const maintenanceEntries = [
        createMockMaintenanceEntry({
          id: 'entry-2',
          date: '2026-03-01',
          type: 'thermal_paste',
          title: 'Pasta Termica',
          nextDueDate: '2026-09-26',
        }),
      ];

      const reminders = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        settings: { enabled: true, notificationMode: 'none', leadTimeDays: 3 },
        currentTimestamp: '2026-09-27T10:00:00Z',
      });

      expect(reminders.length).toBeGreaterThan(0);
      expect(reminders[0].isNotificationEligible).toBe(false);
      expect(reminders[0].suppressionReason).toBe('mode_none');
    });
  });

  // =========================================================================
  // D. BACKUP & EXPORT/IMPORT
  // =========================================================================
  describe('D. Backup Export & Import Compatibility', () => {
    it('esporta le impostazioni dello scheduler e le interazioni nel dump JSON', async () => {
      await saveSettings({
        ...DEFAULT_SETTINGS,
        scheduler: {
          enabled: true,
          notificationMode: 'verification_only',
          leadTimeDays: 7,
        },
        reminderInteractions: {
          'rem-test-export': {
            reminderId: 'rem-test-export',
            snoozedUntil: '2026-11-01',
            lastNotifiedDate: '2026-09-27',
            cycleExecutionId: 'exec-exp-99',
          },
        },
      });

      const jsonStr = await exportDatabaseToJSON();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.settings.scheduler).toEqual({
        enabled: true,
        notificationMode: 'verification_only',
        leadTimeDays: 7,
      });
      expect(parsed.settings.reminderInteractions['rem-test-export']).toEqual({
        reminderId: 'rem-test-export',
        snoozedUntil: '2026-11-01',
        lastNotifiedDate: '2026-09-27',
        cycleExecutionId: 'exec-exp-99',
      });
    });

    it('esegue l\'import atomico di un backup contenente scheduler e interactions', async () => {
      const backupPayload: DatabaseSchema = {
        schemaVersion: 1,
        appVersion: '3.1.0',
        settings: {
          ...DEFAULT_SETTINGS,
          scheduler: {
            enabled: true,
            notificationMode: 'all',
            leadTimeDays: 1,
          },
          reminderInteractions: {
            'rem-imported': {
              reminderId: 'rem-imported',
              snoozedUntil: '2026-10-20',
            },
          },
        },
        components: [],
        events: [],
        upgrades: [],
      };

      const validation = validateImportJSON(JSON.stringify(backupPayload));
      expect(validation.isValid).toBe(true);

      if (validation.isValid) {
        await executeImport(validation.parsedData);
      }

      const reloaded = await loadFullDatabase();
      expect(reloaded.settings.scheduler).toEqual({
        enabled: true,
        notificationMode: 'all',
        leadTimeDays: 1,
      });
      expect(reloaded.settings.reminderInteractions?.['rem-imported']?.snoozedUntil).toBe('2026-10-20');
    });

    it('importa con successo un backup legacy privo di campi scheduler, applicando default sicuri', async () => {
      const legacyBackup: Record<string, unknown> = {
        schemaVersion: 1,
        appVersion: '1.0.0',
        settings: {
          rigName: 'Legacy PC 2023',
          currencySymbol: '€',
          dateFormat: 'DD/MM/YYYY',
        },
        components: [],
        events: [],
        upgrades: [],
      };

      const validation = validateImportJSON(JSON.stringify(legacyBackup));
      expect(validation.isValid).toBe(true);

      if (validation.isValid) {
        await executeImport(validation.parsedData);
      }

      const reloaded = await loadFullDatabase();
      expect(reloaded.settings.rigName).toBe('Legacy PC 2023');
      expect(reloaded.settings.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(reloaded.settings.reminderInteractions).toEqual({});
    });

    it('importa con successo un backup contenente valori invalidi o corrotti nello scheduler', async () => {
      const corruptedBackup: Record<string, unknown> = {
        schemaVersion: 1,
        appVersion: '3.1.0',
        settings: {
          rigName: 'Corrupted Settings PC',
          scheduler: {
            enabled: 'non-boolean-value',
            notificationMode: 'invalid_mode_xyz',
            leadTimeDays: 999, // Non consentito
          },
          reminderInteractions: {
            'rem-corrupt': {
              reminderId: 'rem-corrupt',
              snoozedUntil: 'not-a-valid-date',
              eligibility: 'HACKED_FIELD',
            },
          },
        },
        components: [],
        events: [],
        upgrades: [],
      };

      const validation = validateImportJSON(JSON.stringify(corruptedBackup));
      expect(validation.isValid).toBe(true);

      if (validation.isValid) {
        await executeImport(validation.parsedData);
      }

      const reloaded = await loadFullDatabase();
      // Valori corrotti normalizzati in sicurezza:
      expect(reloaded.settings.scheduler?.enabled).toBe(true);
      expect(reloaded.settings.scheduler?.notificationMode).toBe('important_only');
      expect(reloaded.settings.scheduler?.leadTimeDays).toBe(3);
      // Interazione corrotta priva di campi validi -> scartata:
      expect(reloaded.settings.reminderInteractions?.['rem-corrupt']).toBeUndefined();
    });

    it('supporta backup con reminderInteractions posizionato al root level', async () => {
      const rootInteractionsBackup: Record<string, unknown> = {
        schemaVersion: 1,
        appVersion: '3.1.0',
        settings: {
          rigName: 'Root Interactions PC',
        },
        reminderInteractions: {
          'rem-root-1': {
            reminderId: 'rem-root-1',
            snoozedUntil: '2026-11-15',
          },
        },
        components: [],
        events: [],
        upgrades: [],
      };

      const validation = validateImportJSON(JSON.stringify(rootInteractionsBackup));
      expect(validation.isValid).toBe(true);

      if (validation.isValid) {
        await executeImport(validation.parsedData);
      }

      const reloaded = await loadFullDatabase();
      expect(reloaded.settings.reminderInteractions?.['rem-root-1']?.snoozedUntil).toBe('2026-11-15');
    });
  });

  // =========================================================================
  // E. DATABASE SAFETY & ZERO REGRESSION
  // =========================================================================
  describe('E. Database Safety & Zero Regression', () => {
    it('database vuoto o non inizializzato restituisce impostazioni scheduler di default', async () => {
      inMemoryStores.clear();
      const loaded = await loadFullDatabase();
      expect(loaded.settings.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
      expect(loaded.settings.reminderInteractions).toEqual({});
    });

    it('salvataggi scheduler non toccano componenti, eventi o storico ottimizzazioni preesistenti', async () => {
      // Inserisci componente fittizio
      const comp = {
        id: 'comp-test-1',
        name: 'CPU Ryzen 7 7800X3D',
        brand: 'AMD',
        model: 'Ryzen 7 7800X3D',
        category: 'cpu' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      getStore('components').set(comp.id, comp);

      // Inserisci storico ottimizzazione fittizio
      const optRecord = {
        id: 'opt-rec-1',
        recommendationId: 'opt-trim-C',
        category: 'storage' as const,
        timestampStarted: '2026-09-01T10:00:00Z',
        outcome: 'SUCCESS' as const,
      };
      getStore('optimizationHistory').set(optRecord.id, optRecord);

      // Esegui aggiornamento scheduler
      await saveSettings({
        ...DEFAULT_SETTINGS,
        scheduler: {
          enabled: true,
          notificationMode: 'all',
          leadTimeDays: 7,
        },
      });

      const loaded = await loadFullDatabase();
      expect(loaded.components).toHaveLength(1);
      expect(loaded.components[0].id).toBe('comp-test-1');
      expect(loaded.optimizationHistory).toHaveLength(1);
      expect(loaded.optimizationHistory?.[0].id).toBe('opt-rec-1');
      expect(loaded.settings.scheduler?.leadTimeDays).toBe(7);
    });
  });

  // =========================================================================
  // F. PCCONTEXT INTEGRATION CONTRACT & REACTIVITY
  // =========================================================================
  describe('F. PCContext Integration Contract & Reactivity Pipeline', () => {
    it('simula il flusso completo di updateSchedulerSettings con ricalcolo reattivo dei promemoria', async () => {
      // 1. Stato iniziale: leadTimeDays = 3
      let settings = { ...DEFAULT_SETTINGS };
      await saveSettings(settings);

      const maintenanceEntries = [
        createMockMaintenanceEntry({
          id: 'fan-cleaning',
          date: '2026-03-01',
          type: 'cleaning',
          title: 'Pulizia Ventole',
          nextDueDate: '2026-10-03', // 6 giorni rispetto al 27/09/2026
        }),
      ];

      // Con leadTimeDays = 3, la scadenza tra 6 giorni NON è ancora visibile
      const initialReminders = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        settings: settings.scheduler,
        currentTimestamp: '2026-09-27T10:00:00Z',
      });
      expect(initialReminders).toHaveLength(0);

      // 2. Modifica impostazioni scheduler: leadTimeDays = 7
      const updatedScheduler = normalizeSchedulerSettings({
        ...settings.scheduler,
        leadTimeDays: 7,
      });
      settings = { ...settings, scheduler: updatedScheduler };
      await saveSettings(settings);

      // 3. Verifica persistenza e ricalcolo reattivo
      const loaded = await loadFullDatabase();
      expect(loaded.settings.scheduler?.leadTimeDays).toBe(7);

      const updatedReminders = evaluateMaintenanceReminders({
        recommendations: [],
        maintenanceEntries,
        settings: loaded.settings.scheduler,
        currentTimestamp: '2026-09-27T10:00:00Z',
      });
      expect(updatedReminders).toHaveLength(1);
      expect(updatedReminders[0].id).toBe('rem-maint-entry-fan-cleaning');
      expect(updatedReminders[0].urgency).toBe('due_soon');
      expect(updatedReminders[0].daysRemaining).toBe(6);
    });

    it('simula il flusso setReminderSnooze e clearReminderInteraction', async () => {
      let settings = { ...DEFAULT_SETTINGS };

      const reminderId = 'rem-maint-entry-thermal-paste';
      const snoozedUntil = '2026-10-15';

      // Simula setReminderSnooze
      const currentInteractions = normalizeReminderInteractions(settings.reminderInteractions);
      const updatedInteractions = {
        ...currentInteractions,
        [reminderId]: { reminderId, snoozedUntil },
      };
      settings = { ...settings, reminderInteractions: updatedInteractions };
      await saveSettings(settings);

      let loaded = await loadFullDatabase();
      expect(loaded.settings.reminderInteractions?.[reminderId]?.snoozedUntil).toBe('2026-10-15');

      // Simula clearReminderInteraction
      const interactionsToClear = { ...loaded.settings.reminderInteractions };
      delete interactionsToClear[reminderId];
      settings = { ...settings, reminderInteractions: interactionsToClear };
      await saveSettings(settings);

      loaded = await loadFullDatabase();
      expect(loaded.settings.reminderInteractions?.[reminderId]).toBeUndefined();
    });

    it('simula markReminderNotified registrando lastNotifiedDate e cycleExecutionId', async () => {
      let settings = { ...DEFAULT_SETTINGS };
      const reminderId = 'rem-periodic-opt-trim-C';
      const notifiedDate = '2026-09-27';
      const cycleExecutionId = 'exec-trim-cycle-1';

      const currentInteractions = normalizeReminderInteractions(settings.reminderInteractions);
      const updatedInteractions = {
        ...currentInteractions,
        [reminderId]: { reminderId, lastNotifiedDate: notifiedDate, cycleExecutionId },
      };
      settings = { ...settings, reminderInteractions: updatedInteractions };
      await saveSettings(settings);

      const loaded = await loadFullDatabase();
      expect(loaded.settings.reminderInteractions?.[reminderId]?.lastNotifiedDate).toBe('2026-09-27');
      expect(loaded.settings.reminderInteractions?.[reminderId]?.cycleExecutionId).toBe('exec-trim-cycle-1');

      // Verifica che nella stessa data locale odierna il reminder venga soppresso per duplicati
      const recommendations = [createMockRecommendation()];

      const evaluated = evaluateMaintenanceReminders({
        recommendations,
        interactions: loaded.settings.reminderInteractions,
        settings: loaded.settings.scheduler,
        currentTimestamp: '2026-09-27T15:00:00Z',
      });

      expect(evaluated).toHaveLength(1);
      expect(evaluated[0].isNotificationEligible).toBe(false);
      expect(evaluated[0].suppressionReason).toBe('same_day_already_notified');
    });

    it('nuovo record in optimizationHistory con verifica pendente > 48h genera VERIFICATION_REMINDER reattivo', async () => {
      const historyRecord = createMockOptRecord();

      const reminders = evaluateMaintenanceReminders({
        recommendations: [],
        optimizationHistory: [historyRecord],
        currentTimestamp: '2026-09-27T10:00:00Z',
      });

      expect(reminders).toHaveLength(1);
      expect(reminders[0].type).toBe('VERIFICATION_REMINDER');
      expect(reminders[0].urgency).toBe('verification_pending');
      expect(reminders[0].executionRecordId).toBe('opt-hist-bench-1');
    });
  });
});

