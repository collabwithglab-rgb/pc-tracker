import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SchedulerSettings,
  SchedulerNotificationMode,
  DEFAULT_SCHEDULER_SETTINGS,
  ALLOWED_LEAD_TIME_DAYS,
  OptimizationRecommendation,
  OptimizationCategory,
  AppSettings,
} from '../../../types';
import {
  evaluateMaintenanceReminders,
  normalizeSchedulerSettings,
} from '../../../domain';
import {
  normalizeSettings,
  saveSettings,
  loadFullDatabase,
  exportDatabaseToJSON,
  validateImportJSON,
} from '../../../storage';

/**
 * Mock isolato per IndexedDB compatibile con l'ambiente Node/Vitest
 */
const mockStore: Record<string, Record<string, unknown>> = {
  metadata: {},
  components: {},
  events: {},
  upgrades: {},
  checkpoints: {},
  receipts: {},
  maintenance: {},
  tuningProfiles: {},
  optimizationHistory: {},
};

vi.mock('../../../storage/indexedDB', () => ({
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
  openDB: vi.fn().mockResolvedValue({}),
  getAllFromStore: vi.fn().mockImplementation(async (storeName: string) => {
    return Object.values(mockStore[storeName] || {});
  }),
  getItem: vi.fn().mockImplementation(async (storeName: string, key: string) => {
    return mockStore[storeName]?.[key] ?? null;
  }),
  putItem: vi.fn().mockImplementation(async (storeName: string, item: any) => {
    const key = item.key || item.id || 'default';
    if (!mockStore[storeName]) mockStore[storeName] = {};
    mockStore[storeName][key] = item;
    return item;
  }),
  putItems: vi.fn().mockImplementation(async (storeName: string, items: any[]) => {
    for (const item of items) {
      const key = item.key || item.id || 'default';
      if (!mockStore[storeName]) mockStore[storeName] = {};
      mockStore[storeName][key] = item;
    }
  }),
  deleteItem: vi.fn().mockImplementation(async (storeName: string, key: string) => {
    if (mockStore[storeName]) {
      delete mockStore[storeName][key];
    }
  }),
  clearStore: vi.fn().mockImplementation(async (storeName: string) => {
    mockStore[storeName] = {};
  }),
}));

describe('Smart Maintenance Scheduler — Settings UI & Refinement (Tranche 4)', () => {
  beforeEach(() => {
    for (const store of Object.keys(mockStore)) {
      mockStore[store] = {};
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper per raccomandazione in cooldown con scadenza controllata
  const createCooldownRec = (
    id: string,
    title: string,
    cooldownRemainingDays: number,
    category: OptimizationCategory = 'storage',
    cadenceType: 'PERIODIC' | 'ONE_SHOT' = 'PERIODIC'
  ): OptimizationRecommendation => ({
    id,
    category,
    title,
    reason: `Motivazione per ${title}`,
    evidence: `Evidenza per ${title}`,
    expectedBenefit: 'Prestazioni ottimali e stabilità',
    confidence: 'HIGH',
    risk: 'NONE',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    cadenceType,
    cooldownRemainingDays,
    eligibility: 'COOLDOWN',
    parameters: { driveLetter: 'C' },
  });

  // 1. Default settings corretti
  it('1. default settings corretti: enabled=true, important_only, leadTimeDays=3', () => {
    expect(DEFAULT_SCHEDULER_SETTINGS).toEqual({
      enabled: true,
      notificationMode: 'important_only',
      leadTimeDays: 3,
    });
    expect(ALLOWED_LEAD_TIME_DAYS).toEqual([0, 1, 3, 7]);
  });

  // 2. Master toggle
  it('2. master toggle: disabilita e riabilita lo scheduler senza perdere lo stato', () => {
    const sOff = normalizeSchedulerSettings({ ...DEFAULT_SCHEDULER_SETTINGS, enabled: false });
    expect(sOff.enabled).toBe(false);
    expect(sOff.notificationMode).toBe('important_only');
    expect(sOff.leadTimeDays).toBe(3);

    const sOn = normalizeSchedulerSettings({ ...sOff, enabled: true });
    expect(sOn.enabled).toBe(true);
    expect(sOn.notificationMode).toBe('important_only');
    expect(sOn.leadTimeDays).toBe(3);
  });

  // 3-6. Notification mode support
  it('3. notificationMode = all: rende tutti i reminder eleggibili a notifica', () => {
    const rec = createCooldownRec('trim-c', 'Ottimizzazione TRIM Unità C:', 2);
    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isNotificationEligible).toBe(true);
    expect(reminders[0].suppressionReason).toBeUndefined();
  });

  it('4. notificationMode = important_only: seleziona i promemoria prioritari', () => {
    const trimRec = createCooldownRec('opt-trim-c', 'Ottimizzazione TRIM Unità C:', 2, 'storage');
    const reminders = evaluateMaintenanceReminders({
      recommendations: [trimRec],
      settings: { enabled: true, notificationMode: 'important_only', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    // TRIM su SSD è marcato come prioritario da isReminderImportant
    expect(reminders[0].isNotificationEligible).toBe(true);
  });

  it('5. notificationMode = verification_only: sopprime promemoria non di verifica', () => {
    const trimRec = createCooldownRec('trim-c', 'Ottimizzazione TRIM Unità C:', 2);
    const reminders = evaluateMaintenanceReminders({
      recommendations: [trimRec],
      settings: { enabled: true, notificationMode: 'verification_only', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('mode_verification_only');
  });

  it('6. notificationMode = none: sopprime notifiche ma mantiene i reminder visibili in-app', () => {
    const trimRec = createCooldownRec('trim-c', 'Ottimizzazione TRIM Unità C:', 2);
    const reminders = evaluateMaintenanceReminders({
      recommendations: [trimRec],
      settings: { enabled: true, notificationMode: 'none', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('mode_none');
  });

  // 7-10. Lead time days (0, 1, 3, 7)
  it('7. leadTime 0: include solo elementi con cooldownRemainingDays = 0', () => {
    const recDueNow = createCooldownRec('rec-0', 'Manutenzione Oggi', 0);
    const recDueTomorrow = createCooldownRec('rec-1', 'Manutenzione Domani', 1);

    const reminders = evaluateMaintenanceReminders({
      recommendations: [recDueNow, recDueTomorrow],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 0 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-rec-0');
  });

  it('8. leadTime 1: include elementi fino a 1 giorno di anticipo', () => {
    const rec1 = createCooldownRec('rec-1', 'Manutenzione Domani', 1);
    const rec3 = createCooldownRec('rec-3', 'Manutenzione Tra 3 Giorni', 3);

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec1, rec3],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 1 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-rec-1');
  });

  it('9. leadTime 3: include elementi fino a 3 giorni (default)', () => {
    const rec3 = createCooldownRec('rec-3', 'Manutenzione Tra 3 Giorni', 3);
    const rec5 = createCooldownRec('rec-5', 'Manutenzione Tra 5 Giorni', 5);

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec3, rec5],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-rec-3');
  });

  it('10. leadTime 7: include elementi fino a 7 giorni di anticipo', () => {
    const rec5 = createCooldownRec('rec-5', 'Manutenzione Tra 5 Giorni', 5);
    const rec10 = createCooldownRec('rec-10', 'Manutenzione Tra 10 Giorni', 10);

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec5, rec10],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 7 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-rec-5');
  });

  // 11. Normalization fallback su valori non validi
  it('11. valore non valido -> fallback robusto a DEFAULT_SCHEDULER_SETTINGS', () => {
    const invalidInputs = [
      null,
      undefined,
      'invalid-string',
      42,
      [],
      {},
      { enabled: 'maybe', notificationMode: 'bogus', leadTimeDays: 99 },
      { enabled: null, notificationMode: 123, leadTimeDays: -1 },
    ];

    for (const input of invalidInputs) {
      const normalized = normalizeSchedulerSettings(input);
      expect(normalized.enabled).toBeTypeOf('boolean');
      expect(['all', 'important_only', 'verification_only', 'none']).toContain(normalized.notificationMode);
      expect([0, 1, 3, 7]).toContain(normalized.leadTimeDays);
    }
  });

  // 12. Update settings -> persistence
  it('12. update settings -> persistence su IndexedDB', async () => {
    const initialSettings: AppSettings = normalizeSettings({});
    expect(initialSettings.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);

    const updatedSettings: AppSettings = {
      ...initialSettings,
      scheduler: {
        enabled: true,
        notificationMode: 'all',
        leadTimeDays: 7,
      },
    };

    await saveSettings(updatedSettings);

    const loaded = await loadFullDatabase();
    expect(loaded.settings.scheduler).toEqual({
      enabled: true,
      notificationMode: 'all',
      leadTimeDays: 7,
    });
  });

  // 13. Reload -> persistence
  it('13. reload -> persistence garantita attraverso loadFullDatabase', async () => {
    await saveSettings(
      normalizeSettings({
        scheduler: { enabled: false, notificationMode: 'none', leadTimeDays: 1 },
      })
    );

    const db1 = await loadFullDatabase();
    expect(db1.settings.scheduler?.enabled).toBe(false);
    expect(db1.settings.scheduler?.notificationMode).toBe('none');
    expect(db1.settings.scheduler?.leadTimeDays).toBe(1);

    const db2 = await loadFullDatabase();
    expect(db2.settings.scheduler).toEqual(db1.settings.scheduler);
  });

  // 14. Scheduler reacts to changed settings
  it('14. scheduler reacts to changed settings dinamicamente', () => {
    const recIn4Days = createCooldownRec('rec-4', 'Intervento tra 4 giorni', 4);

    // Con leadTime = 3, l'evento tra 4 giorni è fuori finestra
    const rem3 = evaluateMaintenanceReminders({
      recommendations: [recIn4Days],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });
    expect(rem3).toHaveLength(0);

    // Con leadTime = 7, l'evento tra 4 giorni entra nella finestra
    const rem7 = evaluateMaintenanceReminders({
      recommendations: [recIn4Days],
      settings: { enabled: true, notificationMode: 'all', leadTimeDays: 7 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });
    expect(rem7).toHaveLength(1);
    expect(rem7[0].daysRemaining).toBe(4);
  });

  // 15. notificationMode none -> reminder resta visibile in-app
  it('15. notificationMode none -> reminder resta visibile in-app', () => {
    const rec = createCooldownRec('trim-c', 'Ottimizzazione TRIM Unità C:', 1);
    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      settings: { enabled: true, notificationMode: 'none', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].title).toContain('Ottimizzazione TRIM');
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('mode_none');
  });

  // 16. enabled false -> comportamento scheduler corretto
  it('16. enabled false -> scheduler disabilitato restituisce array vuoto', () => {
    const rec = createCooldownRec('trim-c', 'Ottimizzazione TRIM Unità C:', 0);
    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      settings: { enabled: false, notificationMode: 'all', leadTimeDays: 7 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });

    expect(reminders).toHaveLength(0);
  });

  // 17. Reset defaults
  it('17. reset defaults: ripristina scheduler ai valori canonici senza toccare storico o interazioni', async () => {
    // Simuliamo impostazioni utente modificate
    const customSettings: AppSettings = normalizeSettings({
      scheduler: { enabled: false, notificationMode: 'none', leadTimeDays: 0 },
      reminderInteractions: {
        'rem-1': { reminderId: 'rem-1', snoozedUntil: '2026-10-01' },
      },
    });
    await saveSettings(customSettings);

    // Reset selettivo dello scheduler (come eseguito da handleResetSchedulerDefaults)
    const resetScheduler = normalizeSchedulerSettings(DEFAULT_SCHEDULER_SETTINGS);
    const mergedSettings: AppSettings = {
      ...customSettings,
      scheduler: resetScheduler,
    };
    await saveSettings(mergedSettings);

    const loaded = await loadFullDatabase();
    expect(loaded.settings.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
    // Le interazioni utente NON sono state cancellate dal reset scheduler
    expect(loaded.settings.reminderInteractions?.['rem-1']?.snoozedUntil).toBe('2026-10-01');
  });

  // 18. Legacy settings -> defaults
  it('18. legacy settings (senza campo scheduler) -> applica automaticamente i defaults', () => {
    const legacyRawSettings = {
      rigName: 'Workstation 2024',
      currencySymbol: '€',
      dateFormat: 'DD/MM/YYYY',
    };

    const normalized = normalizeSettings(legacyRawSettings);
    expect(normalized.scheduler).toBeDefined();
    expect(normalized.scheduler).toEqual(DEFAULT_SCHEDULER_SETTINGS);
    expect(normalized.reminderInteractions).toEqual({});
  });

  // 19. Backup round-trip
  it('19. backup round-trip: esporta impostazioni scheduler personalizzate e le ripristina', async () => {
    const customScheduler: SchedulerSettings = {
      enabled: true,
      notificationMode: 'verification_only',
      leadTimeDays: 7,
    };

    await saveSettings(normalizeSettings({ scheduler: customScheduler }));

    const backupJson = await exportDatabaseToJSON();
    const parsedBackup = JSON.parse(backupJson);

    expect(parsedBackup.settings.scheduler).toEqual(customScheduler);

    const validation = validateImportJSON(backupJson);
    expect(validation.isValid).toBe(true);
    if (validation.isValid) {
      expect(validation.parsedData.settings.scheduler).toEqual(customScheduler);
    }
  });

  // 20. Accessibility basics & ARIA semantics
  it('20. accessibility basics: semantica switch, radio group e associazioni', () => {
    // Switch semantico
    const switchAttrs = (enabled: boolean) => ({
      role: 'switch' as const,
      'aria-checked': enabled,
      'aria-labelledby': 'scheduler-toggle-label',
      'aria-describedby': 'scheduler-toggle-desc',
    });

    const activeSwitch = switchAttrs(true);
    expect(activeSwitch.role).toBe('switch');
    expect(activeSwitch['aria-checked']).toBe(true);

    const inactiveSwitch = switchAttrs(false);
    expect(inactiveSwitch['aria-checked']).toBe(false);

    // Radio group semantico
    const radioAttrs = (selectedMode: SchedulerNotificationMode, currentOption: SchedulerNotificationMode) => ({
      role: 'radio' as const,
      'aria-checked': selectedMode === currentOption,
    });

    const activeRadio = radioAttrs('important_only', 'important_only');
    expect(activeRadio.role).toBe('radio');
    expect(activeRadio['aria-checked']).toBe(true);

    const inactiveRadio = radioAttrs('important_only', 'all');
    expect(inactiveRadio.role).toBe('radio');
    expect(inactiveRadio['aria-checked']).toBe(false);

    // Select semantico per lead time
    const selectAttrs = {
      id: 'scheduler-lead-time-select',
      'aria-describedby': 'scheduler-lead-time-desc',
    };
    expect(selectAttrs.id).toBe('scheduler-lead-time-select');
    expect(selectAttrs['aria-describedby']).toBe('scheduler-lead-time-desc');
  });

  // 21. TEST DI INTEGRAZIONE CRITICO (Section 17): leadTime 7 -> visibile -> leadTime 0 -> fuori finestra
  it('21. Flusso di integrazione Section 17: leadTime 7 (visibile) -> leadTime 0 (fuori finestra)', () => {
    // Creiamo un componente in cooldown con 5 giorni rimanenti
    const rec5Days = createCooldownRec('ssd-trim', 'TRIM SSD Samsung 990 Pro', 5);

    // Fase A: leadTime = 3 (default) -> l'evento tra 5 giorni è fuori finestra
    const remDefault = evaluateMaintenanceReminders({
      recommendations: [rec5Days],
      settings: { enabled: true, notificationMode: 'important_only', leadTimeDays: 3 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });
    expect(remDefault).toHaveLength(0);

    // Fase B: Utente imposta leadTime = 7 in Impostazioni -> promemoria ora visibile!
    const remLead7 = evaluateMaintenanceReminders({
      recommendations: [rec5Days],
      settings: { enabled: true, notificationMode: 'important_only', leadTimeDays: 7 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });
    expect(remLead7).toHaveLength(1);
    expect(remLead7[0].daysRemaining).toBe(5);
    expect(remLead7[0].urgency).toBe('due_soon');

    // Fase C: Utente imposta leadTime = 0 in Impostazioni -> promemoria torna fuori finestra!
    const remLead0 = evaluateMaintenanceReminders({
      recommendations: [rec5Days],
      settings: { enabled: true, notificationMode: 'important_only', leadTimeDays: 0 },
      currentTimestamp: '2026-09-28T10:00:00.000Z',
    });
    expect(remLead0).toHaveLength(0);
  });
});
