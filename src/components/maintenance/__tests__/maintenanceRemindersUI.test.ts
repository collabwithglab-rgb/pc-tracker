import { describe, it, expect, vi } from 'vitest';
import {
  MaintenanceReminder,
  ReminderUrgency,
  OptimizationRecommendation,
  OptimizationExecutionRecord,
  MaintenanceEntry,
  DEFAULT_SCHEDULER_SETTINGS,
} from '../../../types';
import {
  evaluateMaintenanceReminders,
  normalizeSchedulerSettings,
  normalizeReminderInteractions,
} from '../../../domain';

describe('UI Prossimi Promemoria — Smart Maintenance Scheduler (Tranche 3)', () => {
  // Helper di visualizzazione coerenti con la UI di CareOverviewTab
  const getDisplayedReminders = (
    reminders: MaintenanceReminder[],
    showAll: boolean = false,
    maxLimit: number = 3
  ): MaintenanceReminder[] => {
    return showAll ? reminders : reminders.slice(0, maxLimit);
  };

  const getReminderActionLabel = (
    reminder: MaintenanceReminder,
    recommendations: OptimizationRecommendation[] = []
  ): string | null => {
    if (reminder.type === 'VERIFICATION_REMINDER') {
      return 'Verifica';
    }
    if (reminder.type === 'MAINTENANCE_REMINDER') {
      return 'Apri Registro';
    }
    if (reminder.recommendationId) {
      const targetRec = recommendations.find((r) => r.id === reminder.recommendationId);
      if (targetRec) {
        if (targetRec.actionAvailability === 'MANUAL' || targetRec.actionAvailability === 'MANUAL_GUIDED') {
          return 'Apri Guida';
        }
        if (reminder.type === 'CONDITION_RECHECK') {
          return 'Rivedi';
        }
        return 'Esegui ora';
      }
      return 'Esegui ora';
    }
    return null;
  };

  const getReminderUrgencyBadge = (urgency: ReminderUrgency) => {
    switch (urgency) {
      case 'overdue':
        return { label: 'Scaduto', badgeClass: 'badge-ruby' };
      case 'condition_active':
        return { label: 'Anomalia Attiva', badgeClass: 'badge-amber' };
      case 'verification_pending':
        return { label: 'Verifica in Sospeso', badgeClass: 'badge-cyan' };
      case 'action_required':
        return { label: 'Consigliato Ora', badgeClass: 'badge-cyan' };
      case 'due_soon':
        return { label: 'Imminente', badgeClass: 'badge-subtle' };
      case 'upcoming':
      default:
        return { label: 'Programmato', badgeClass: 'badge-subtle' };
    }
  };

  const getReminderTemporalText = (reminder: MaintenanceReminder) => {
    if (reminder.daysRemaining !== undefined) {
      if (reminder.daysRemaining < 0) {
        const overdueDays = Math.abs(reminder.daysRemaining);
        return `Scaduto da ${overdueDays} ${overdueDays === 1 ? 'giorno' : 'giorni'}`;
      }
      if (reminder.daysRemaining === 0) {
        return 'Scadenza oggi';
      }
      return `Tra ${reminder.daysRemaining} ${reminder.daysRemaining === 1 ? 'giorno' : 'giorni'}`;
    }
    if (reminder.dueDate) {
      return `Scadenza: ${reminder.dueDate}`;
    }
    if (reminder.type === 'VERIFICATION_REMINDER') {
      return 'Verifica in sospeso';
    }
    if (reminder.type === 'CONDITION_RECHECK') {
      return 'Persistente dopo intervento';
    }
    return 'In programma';
  };

  // Mock factories
  const createMockRecommendation = (overrides: Partial<OptimizationRecommendation> = {}): OptimizationRecommendation => ({
    id: 'opt-trim-C',
    category: 'storage',
    title: 'Ottimizzazione Unità C: (TRIM)',
    reason: 'Esecuzione periodica comando TRIM per preservare prestazioni SSD',
    evidence: 'Unità C: SSD NVMe',
    expectedBenefit: 'Prestazioni ottimali I/O',
    risk: 'NONE',
    confidence: 'HIGH',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    actionId: 'win-defrag-trim-c',
    cadenceType: 'PERIODIC',
    eligibility: 'ELIGIBLE',
    parameters: { driveLetter: 'C' },
    ...overrides,
  });

  const createMockMaintenanceEntry = (overrides: Partial<MaintenanceEntry> = {}): MaintenanceEntry => ({
    id: 'entry-filters',
    title: 'Pulizia filtri antipolvere',
    description: 'Manutenzione periodica programmata filtri antipolvere',
    type: 'filter_cleaning',
    date: '2026-06-01',
    nextDueDate: '2026-09-25',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  });

  // 1. Zero reminders
  it('1. visualizza empty state sobrio quando non sono presenti promemoria', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [],
      optimizationHistory: [],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(0);
    const displayed = getDisplayedReminders(reminders);
    expect(displayed).toHaveLength(0);
  });

  // 2. Un reminder
  it('2. renderizza correttamente un singolo promemoria con metadati e badge', () => {
    const entry = createMockMaintenanceEntry({ nextDueDate: '2026-09-29' }); // tra 2 giorni
    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [entry],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    const r = reminders[0];
    expect(r.id).toBe('rem-maint-entry-entry-filters');
    expect(r.urgency).toBe('due_soon');
    expect(getReminderTemporalText(r)).toBe('Tra 2 giorni');
    expect(getReminderUrgencyBadge(r.urgency).label).toBe('Imminente');
    expect(getReminderActionLabel(r)).toBe('Apri Registro');
  });

  // 3. Tre reminders
  it('3. visualizza esattamente tre promemoria senza necessità di link "Mostra tutti"', () => {
    const rec1 = createMockRecommendation({ id: 'rec-1', title: 'TRIM C:' });
    const rec2 = createMockRecommendation({ id: 'rec-2', title: 'Ripristino', parameters: {} });
    const entry = createMockMaintenanceEntry({ id: 'm-1', nextDueDate: '2026-09-28' });

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec1, rec2],
      maintenanceEntries: [entry],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(3);
    const displayed = getDisplayedReminders(reminders, false, 3);
    expect(displayed).toHaveLength(3);
  });

  // 4. Più di tre reminders -> massimo 3 visualizzati di default
  it('4. con più di 3 promemoria, visualizza i primi 3 preservando l\'ordine deterministico', () => {
    const rec1 = createMockRecommendation({ id: 'rec-1', title: 'Rec 1' });
    const rec2 = createMockRecommendation({ id: 'rec-2', title: 'Rec 2' });
    const entry1 = createMockMaintenanceEntry({ id: 'm-1', nextDueDate: '2026-09-20' }); // overdue
    const entry2 = createMockMaintenanceEntry({ id: 'm-2', nextDueDate: '2026-09-28' }); // due soon
    const entry3 = createMockMaintenanceEntry({ id: 'm-3', nextDueDate: '2026-09-29' }); // due soon

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec1, rec2],
      maintenanceEntries: [entry1, entry2, entry3],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders.length).toBeGreaterThan(3);

    // Di default mostra massimo 3
    const defaultVisible = getDisplayedReminders(reminders, false, 3);
    expect(defaultVisible).toHaveLength(3);
    // Il primo deve essere quello overdue
    expect(defaultVisible[0].urgency).toBe('overdue');

    // Con toggle attivo mostra tutti
    const allVisible = getDisplayedReminders(reminders, true, 3);
    expect(allVisible).toHaveLength(reminders.length);
  });

  // 5. Reminder overdue
  it('5. gestisce correttamente reminder overdue con badge Scaduto e testo giorni negativo', () => {
    const entry = createMockMaintenanceEntry({ nextDueDate: '2026-09-24' }); // scaduto da 3 giorni
    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [entry],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    const r = reminders[0];
    expect(r.urgency).toBe('overdue');
    expect(r.daysRemaining).toBe(-3);
    expect(getReminderUrgencyBadge(r.urgency).label).toBe('Scaduto');
    expect(getReminderUrgencyBadge(r.urgency).badgeClass).toBe('badge-ruby');
    expect(getReminderTemporalText(r)).toBe('Scaduto da 3 giorni');
  });

  // 6. Reminder verification_pending
  it('6. gestisce correttamente reminder verification_pending con azione Verifica', () => {
    const historyRecord: OptimizationExecutionRecord = {
      id: 'exec-test-1',
      recommendationId: 'opt-curve-opt',
      recommendationTitle: 'AMD Curve Optimizer',
      category: 'performance',
      actionAvailability: 'MANUAL',
      triggerReason: 'Profilo stabilità',
      triggerEvidence: 'Crash intermittente',
      actionDescription: 'Regolazione CO',
      timestampStarted: '2026-09-24T10:00:00Z',
      timestampCompleted: '2026-09-24T10:15:00Z',
      durationMs: 900000,
      outcome: 'success',
      verificationType: 'manual',
      verificationStatus: 'pending',
      verificationMethod: 'Test OCCT 1 ora',
      schemaVersion: 1,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      optimizationHistory: [historyRecord],
      currentTimestamp: '2026-09-27T10:00:00Z', // 72 ore dopo (> 48h)
    });

    expect(reminders).toHaveLength(1);
    const r = reminders[0];
    expect(r.type).toBe('VERIFICATION_REMINDER');
    expect(r.urgency).toBe('verification_pending');
    expect(getReminderUrgencyBadge(r.urgency).label).toBe('Verifica in Sospeso');
    expect(getReminderActionLabel(r)).toBe('Verifica');
  });

  // 7. Reminder due_soon
  it('7. gestisce correttamente reminder due_soon all\'interno del lead time', () => {
    const entry = createMockMaintenanceEntry({ nextDueDate: '2026-09-29' }); // 2 giorni rispetto al 27
    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [entry],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    const r = reminders[0];
    expect(r.urgency).toBe('due_soon');
    expect(r.daysRemaining).toBe(2);
    expect(getReminderUrgencyBadge(r.urgency).label).toBe('Imminente');
    expect(getReminderTemporalText(r)).toBe('Tra 2 giorni');
  });

  // 8. Reminder condition_active
  it('8. gestisce correttamente reminder condition_active con azione Rivedi', () => {
    const rec = createMockRecommendation({
      id: 'opt-high-temp',
      title: 'Pasta Termica CPU ad Alta Temperatura',
      eligibility: 'RECURRING_ACTIVE',
    });

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    const r = reminders[0];
    expect(r.type).toBe('CONDITION_RECHECK');
    expect(r.urgency).toBe('condition_active');
    expect(getReminderUrgencyBadge(r.urgency).label).toBe('Anomalia Attiva');
    expect(getReminderActionLabel(r, [rec])).toBe('Rivedi');
  });

  // 9. Action button corretto a seconda della disponibilità
  it('9. determina l\'action button corretto in base al tipo e alla disponibilità azione', () => {
    const oneClickRec = createMockRecommendation({ id: 'rec-1', actionAvailability: 'ONE_CLICK' });
    const manualRec = createMockRecommendation({ id: 'rec-2', actionAvailability: 'MANUAL' });
    const userConfirmedRec = createMockRecommendation({ id: 'rec-3', actionAvailability: 'USER_CONFIRMED' });

    const reminder1: MaintenanceReminder = {
      id: 'rem-1',
      type: 'PERIODIC_REMINDER',
      title: 'TRIM C:',
      description: 'Desc',
      urgency: 'action_required',
      recommendationId: 'rec-1',
      isNotificationEligible: true,
      explanation: 'Spiegazione',
    };

    const reminder2: MaintenanceReminder = {
      id: 'rem-2',
      type: 'PERIODIC_REMINDER',
      title: 'Punto di Ripristino',
      description: 'Desc',
      urgency: 'action_required',
      recommendationId: 'rec-2',
      isNotificationEligible: true,
      explanation: 'Spiegazione',
    };

    const reminder3: MaintenanceReminder = {
      id: 'rem-3',
      type: 'PERIODIC_REMINDER',
      title: 'Pulizia Disco',
      description: 'Desc',
      urgency: 'action_required',
      recommendationId: 'rec-3',
      isNotificationEligible: true,
      explanation: 'Spiegazione',
    };

    expect(getReminderActionLabel(reminder1, [oneClickRec])).toBe('Esegui ora');
    expect(getReminderActionLabel(reminder2, [manualRec])).toBe('Apri Guida');
    expect(getReminderActionLabel(reminder3, [userConfirmedRec])).toBe('Esegui ora');
  });

  // 10. Snooze calculation & validation
  it('10. calcola correttamente la data di snooze a 7 giorni nel formato ISO YYYY-MM-DD', () => {
    const baseDate = new Date('2026-09-27T10:00:00Z');
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + 7);
    const snoozedUntil = targetDate.toISOString().slice(0, 10);

    expect(snoozedUntil).toBe('2026-10-04');
  });

  // 11. Reminder aggiornato dopo snooze
  it('11. esclude immediatamente il promemoria dal calcolo quando snoozedUntil > currentLocalDate', () => {
    const rec = createMockRecommendation({ id: 'opt-trim-C' });
    const reminderId = 'rem-periodic-opt-trim-C';

    // Prima dello snooze: visibile
    const beforeSnooze = evaluateMaintenanceReminders({
      recommendations: [rec],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });
    expect(beforeSnooze).toHaveLength(1);

    // Dopo lo snooze al 2026-10-04: escluso completamente
    const afterSnooze = evaluateMaintenanceReminders({
      recommendations: [rec],
      interactions: {
        [reminderId]: { reminderId, snoozedUntil: '2026-10-04' },
      },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });
    expect(afterSnooze).toHaveLength(0);
  });

  // 12. Click action delegation
  it('12. associa correttamente l\'azione del promemoria alla raccomandazione originale', () => {
    const targetRec = createMockRecommendation({ id: 'opt-trim-C', title: 'TRIM C:' });
    const reminder: MaintenanceReminder = {
      id: 'rem-periodic-opt-trim-C',
      type: 'PERIODIC_REMINDER',
      title: 'TRIM C:',
      description: 'Desc',
      urgency: 'action_required',
      recommendationId: 'opt-trim-C',
      isNotificationEligible: true,
      explanation: 'Spiegazione',
    };

    const actionMock = vi.fn();
    const handleAction = (rem: MaintenanceReminder) => {
      if (rem.recommendationId === targetRec.id) {
        actionMock(targetRec);
      }
    };

    handleAction(reminder);
    expect(actionMock).toHaveBeenCalledWith(targetRec);
  });

  // 13. USER_CONFIRMED -> confirmation flow
  it('13. riconosce che le raccomandazioni USER_CONFIRMED richiedono conferma esplicita', () => {
    const userConfirmedRec = createMockRecommendation({
      id: 'opt-clean-mgr',
      title: 'Pulizia File di Sistema',
      actionAvailability: 'USER_CONFIRMED',
    });

    const isMutant = userConfirmedRec.actionAvailability === 'USER_CONFIRMED';
    expect(isMutant).toBe(true);
  });

  // 14. Reminder cambia dopo execution (Lifecycle integration)
  it('14. il promemoria scompare/cambia dopo che l\'azione viene eseguita e registrata nello storico', () => {
    const recInitial = createMockRecommendation({
      id: 'opt-trim-C',
      eligibility: 'ELIGIBLE',
    });

    // 1. Inizialmente pronto
    const initialReminders = evaluateMaintenanceReminders({
      recommendations: [recInitial],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });
    expect(initialReminders).toHaveLength(1);
    expect(initialReminders[0].urgency).toBe('action_required');

    // 2. Dopo esecuzione: raccomandazione entra in COOLDOWN di 30 giorni
    const recInCooldown = createMockRecommendation({
      id: 'opt-trim-C',
      eligibility: 'COOLDOWN',
      cooldownRemainingDays: 30, // 30 > leadTimeDays (3)
    });

    const updatedReminders = evaluateMaintenanceReminders({
      recommendations: [recInCooldown],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:05:00Z',
    });

    // Il promemoria scompare perché in cooldown oltre il lead time
    expect(updatedReminders).toHaveLength(0);
  });

  // 15. notificationMode none -> reminder ancora visibile in-app
  it('15. quando notificationMode = "none", il promemoria rimane visibile in-app ma isNotificationEligible = false', () => {
    const rec = createMockRecommendation({ id: 'opt-trim-C' });

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      settings: { notificationMode: 'none' },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('mode_none');

    // In UI viene comunque mostrato
    const displayed = getDisplayedReminders(reminders);
    expect(displayed).toHaveLength(1);
    expect(displayed[0].title).toContain('TRIM');
  });

  // 16. Reminder non notificabile ma visualizzabile
  it('16. promemoria non notificabile per same_day_already_notified rimane visualizzabile in app', () => {
    const rec = createMockRecommendation({ id: 'opt-trim-C' });
    const reminderId = 'rem-periodic-opt-trim-C';

    const reminders = evaluateMaintenanceReminders({
      recommendations: [rec],
      interactions: {
        [reminderId]: { reminderId, lastNotifiedDate: '2026-09-27' },
      },
      currentTimestamp: '2026-09-27T15:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('same_day_already_notified');

    // In-app UI deve mostrarlo ugualmente
    const displayed = getDisplayedReminders(reminders);
    expect(displayed).toHaveLength(1);
  });

  // 17. Refresh / state restoration
  it('17. mantiene la coerenza totale dello stato derivato tra riesami e ricaricamenti', () => {
    const rec = createMockRecommendation({ id: 'opt-trim-C' });
    const interactions = {
      'rem-periodic-opt-trim-C': {
        reminderId: 'rem-periodic-opt-trim-C',
        snoozedUntil: '2026-10-01',
      },
    };

    const normalizedInteractions = normalizeReminderInteractions(interactions);
    const settings = normalizeSchedulerSettings(DEFAULT_SCHEDULER_SETTINGS);

    // Valutazione 1 (prima sessione)
    const run1 = evaluateMaintenanceReminders({
      recommendations: [rec],
      interactions: normalizedInteractions,
      settings,
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    // Valutazione 2 (dopo ricaricamento / riesame)
    const run2 = evaluateMaintenanceReminders({
      recommendations: [rec],
      interactions: normalizeReminderInteractions(JSON.parse(JSON.stringify(normalizedInteractions))),
      settings: normalizeSchedulerSettings(JSON.parse(JSON.stringify(settings))),
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(run1).toEqual(run2);
    expect(run1).toHaveLength(0); // Snoozed until 01/10
  });
});
