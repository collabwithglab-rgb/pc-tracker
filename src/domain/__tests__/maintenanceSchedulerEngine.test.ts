/**
 * Test Suite per lo Smart Maintenance Scheduler Engine (Tranche 1)
 * 
 * Copertura esaustiva:
 * 1. scheduler disabled
 * 2. notificationMode none
 * 3. notificationMode verification_only
 * 4. notificationMode important_only
 * 5. leadTime = 0
 * 6. leadTime = 3
 * 7. leadTime = 7
 * 8. periodic reminder fuori finestra
 * 9. periodic reminder dentro finestra
 * 10. periodic reminder scaduto
 * 11. snooze attivo
 * 12. snooze scaduto
 * 13. duplicate notification same day
 * 14. verification pending > soglia
 * 15. verification pending < soglia
 * 16. recurring active
 * 17. maintenance due soon
 * 18. maintenance overdue
 * 19. nessun reminder
 * 20. ordinamento deterministico
 * 21. timezone boundary
 * 22. leap year
 * 23. timestamp identici
 * 24. input vuoti/null dove il contratto lo permette
 * 25. purezza architetturale (zero React / Tauri / IndexedDB)
 * 26. helper deterministici (extractLocalDateString, isReminderImportant, getUrgencySortWeight)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  evaluateMaintenanceReminders,
  extractLocalDateString,
  isReminderImportant,
  getUrgencySortWeight,
} from '../maintenanceSchedulerEngine';
import {
  OptimizationRecommendation,
  OptimizationExecutionRecord,
  MaintenanceEntry,
  ReminderInteraction,
} from '../../types';

describe('Smart Maintenance Scheduler Engine (Tranche 1)', () => {
  // Mock di base per raccomandazioni periodiche
  const mockTrimRecommendation: OptimizationRecommendation = {
    id: 'opt-trim-C',
    title: 'Esegui Ottimizzazione TRIM su Unità C:',
    category: 'storage',
    reason: 'L\'unità SSD supporta il comando ReTrim.',
    evidence: 'SSD NVMe su C:',
    expectedBenefit: 'Velocità di scrittura e uniformità d\'usura.',
    risk: 'NONE',
    confidence: 'HIGH',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    actionId: 'run-trim',
    cadenceType: 'PERIODIC',
    eligibility: 'COOLDOWN',
    cooldownRemainingDays: 2,
    parameters: { driveLetter: 'C' },
  };

  const mockShaderCacheRec: OptimizationRecommendation = {
    id: 'opt-clean-shader-cache',
    title: 'Ripulisci Cache Shader DirectX / GPU',
    category: 'performance',
    reason: 'La cache shader è accumulata da oltre 14 giorni.',
    evidence: 'Directory shader cache popolata',
    expectedBenefit: 'Risoluzione micro-stuttering.',
    risk: 'LOW',
    confidence: 'MEDIUM',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    actionId: 'clean-shader-cache',
    cadenceType: 'PERIODIC',
    eligibility: 'COOLDOWN',
    cooldownRemainingDays: 1,
  };

  // 1. Scheduler disabled
  it('1. restituisce un array vuoto se lo scheduler è disabilitato (enabled: false)', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      settings: { enabled: false },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toEqual([]);
  });

  // 2. NotificationMode: 'none'
  it('2. in notificationMode none restituisce i reminder per la UI ma con isNotificationEligible = false', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      settings: { enabled: true, notificationMode: 'none', leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders.length).toBe(1);
    expect(reminders[0].id).toBe('rem-periodic-opt-trim-C');
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('mode_none');
  });

  // 3. NotificationMode: 'verification_only'
  it('3. in notificationMode verification_only ammette a notifica solo le verifiche pendenti', () => {
    const pendingRecord: OptimizationExecutionRecord = {
      id: 'rec-verif-001',
      recommendationId: 'opt-sfc-repair',
      recommendationTitle: 'Verifica Integrità File di Sistema SFC',
      timestampStarted: '2026-09-24T10:00:00Z',
      timestampCompleted: '2026-09-24T10:05:00Z',
      category: 'system',
      actionAvailability: 'ASSISTED',
      triggerReason: 'File corrotti',
      triggerEvidence: 'SFC error',
      actionDescription: 'sfc /scannow',
      outcome: 'success',
      verificationType: 'command_based',
      verificationStatus: 'pending',
      verificationMethod: 'Scansione post-riavvio',
      schemaVersion: 1,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      optimizationHistory: [pendingRecord],
      settings: { enabled: true, notificationMode: 'verification_only', leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z', // 72 ore dopo (> 48h)
    });

    expect(reminders.length).toBe(2);

    const verifRem = reminders.find((r) => r.type === 'VERIFICATION_REMINDER');
    const trimRem = reminders.find((r) => r.type === 'PERIODIC_REMINDER');

    expect(verifRem).toBeDefined();
    expect(verifRem!.isNotificationEligible).toBe(true);

    expect(trimRem).toBeDefined();
    expect(trimRem!.isNotificationEligible).toBe(false);
    expect(trimRem!.suppressionReason).toBe('mode_verification_only');
  });

  // 4. NotificationMode: 'important_only'
  it('4. in notificationMode important_only ammette TRIM ma sopprime la cache shader', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation, mockShaderCacheRec],
      settings: { enabled: true, notificationMode: 'important_only', leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders.length).toBe(2);

    const trimRem = reminders.find((r) => r.id === 'rem-periodic-opt-trim-C');
    const shaderRem = reminders.find((r) => r.id === 'rem-periodic-opt-clean-shader-cache');

    expect(trimRem!.isNotificationEligible).toBe(true);
    expect(shaderRem!.isNotificationEligible).toBe(false);
    expect(shaderRem!.suppressionReason).toBe('mode_important_only');
  });

  // 5. LeadTime = 0
  it('5. con leadTime = 0 include solo le manutenzioni scadute o previste per il giorno stesso', () => {
    const maintEntries: MaintenanceEntry[] = [
      {
        id: 'maint-today',
        date: '2026-09-01',
        nextDueDate: '2026-09-27',
        type: 'cleaning',
        title: 'Pulizia Case',
        description: 'Pulizia programmata del case',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'maint-tomorrow',
        date: '2026-09-01',
        nextDueDate: '2026-09-28',
        type: 'fan_cleaning',
        title: 'Pulizia Ventole',
        description: 'Pulizia ventole di raffreddamento',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        { ...mockTrimRecommendation, cooldownRemainingDays: 1 },
      ],
      maintenanceEntries: maintEntries,
      settings: { leadTimeDays: 0 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    // mockTrimRecommendation ha cooldownRemainingDays: 1 -> con leadTime 0 non deve apparire
    expect(reminders.find((r) => r.id === 'rem-periodic-opt-trim-C')).toBeUndefined();

    // maint-today è per oggi (daysRemaining = 0) -> deve apparire
    expect(reminders.find((r) => r.id === 'rem-maint-entry-maint-today')).toBeDefined();

    // maint-tomorrow è per domani (daysRemaining = 1) -> con leadTime 0 non deve apparire
    expect(reminders.find((r) => r.id === 'rem-maint-entry-maint-tomorrow')).toBeUndefined();
  });

  // 6. LeadTime = 3 (Default)
  it('6. con leadTime = 3 genera reminder per scadenze fino a 3 giorni prima', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        { ...mockTrimRecommendation, cooldownRemainingDays: 3 },
        { ...mockShaderCacheRec, cooldownRemainingDays: 4 },
      ],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    // 3 giorni rimanenti <= leadTime 3 -> incluso
    expect(reminders.find((r) => r.id === 'rem-periodic-opt-trim-C')).toBeDefined();

    // 4 giorni rimanenti > leadTime 3 -> escluso
    expect(reminders.find((r) => r.id === 'rem-periodic-opt-clean-shader-cache')).toBeUndefined();
  });

  // 7. LeadTime = 7
  it('7. con leadTime = 7 genera reminder per scadenze fino a 7 giorni prima', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        { ...mockShaderCacheRec, cooldownRemainingDays: 7 },
        { ...mockTrimRecommendation, cooldownRemainingDays: 8 },
      ],
      settings: { leadTimeDays: 7 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    // 7 giorni rimanenti <= leadTime 7 -> incluso
    expect(reminders.find((r) => r.id === 'rem-periodic-opt-clean-shader-cache')).toBeDefined();

    // 8 giorni rimanenti > leadTime 7 -> escluso
    expect(reminders.find((r) => r.id === 'rem-periodic-opt-trim-C')).toBeUndefined();
  });

  // 8. Periodic reminder fuori finestra
  it('8. non produce alcun reminder per manutenzioni periodiche con cooldown oltre la finestra', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        { ...mockTrimRecommendation, cooldownRemainingDays: 20 },
      ],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(0);
  });

  // 9. Periodic reminder dentro finestra
  it('9. produce reminder con urgenza due_soon per raccomandazione periodica dentro la finestra', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        { ...mockTrimRecommendation, cooldownRemainingDays: 2 },
      ],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].urgency).toBe('due_soon');
    expect(reminders[0].daysRemaining).toBe(2);
    expect(reminders[0].title).toContain('tra 2 giorni');
  });

  // 10. Periodic reminder scaduto / eleggibile
  it('10. produce reminder con urgenza action_required quando la manutenzione periodica è ELIGIBLE', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        {
          ...mockTrimRecommendation,
          eligibility: 'ELIGIBLE',
          cooldownRemainingDays: undefined,
          lastExecution: {
            id: 'old-exec',
            recommendationId: 'opt-trim-C',
            recommendationTitle: 'TRIM',
            timestampStarted: '2026-08-25T10:00:00Z',
            timestampCompleted: '2026-08-25T10:01:00Z',
            category: 'storage',
            actionAvailability: 'ONE_CLICK',
            triggerReason: 'Trim',
            triggerEvidence: 'SSD',
            actionDescription: 'retrim',
            outcome: 'success',
            verificationType: 'state_based',
            verificationStatus: 'verified',
            verificationMethod: 'OS query',
            schemaVersion: 1,
          },
        },
      ],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].urgency).toBe('action_required');
    expect(reminders[0].daysRemaining).toBe(0);
    expect(reminders[0].title).toContain('nuovamente disponibile');
  });

  // 11. Snooze attivo
  it('11. esclude completamente dal risultato i reminder con snooze attivo (snoozedUntil > data corrente)', () => {
    const interactions: ReminderInteraction[] = [
      {
        reminderId: 'rem-periodic-opt-trim-C',
        snoozedUntil: '2026-10-05', // Data futura
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      interactions,
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(0);
  });

  // 12. Snooze scaduto
  it('12. include normalmente i reminder il cui snooze è scaduto (snoozedUntil <= data corrente)', () => {
    const interactions: ReminderInteraction[] = [
      {
        reminderId: 'rem-periodic-opt-trim-C',
        snoozedUntil: '2026-09-26', // Data passata
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      interactions,
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-opt-trim-C');
  });

  // 13. Duplicate notification same day
  it('13. se un reminder è già stato notificato nella stessa data, imposta isNotificationEligible = false ma lo mantiene per la UI', () => {
    const interactions: ReminderInteraction[] = [
      {
        reminderId: 'rem-periodic-opt-trim-C',
        lastNotifiedDate: '2026-09-27', // Notificato oggi
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      interactions,
      currentTimestamp: '2026-09-27T15:30:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('rem-periodic-opt-trim-C');
    expect(reminders[0].isNotificationEligible).toBe(false);
    expect(reminders[0].suppressionReason).toBe('same_day_already_notified');
  });

  // 14. Verification pending > soglia (>= 48h)
  it('14. genera un reminder per verifiche post-azione in sospeso da oltre 48 ore', () => {
    const pendingRecord: OptimizationExecutionRecord = {
      id: 'exec-thermal-001',
      recommendationId: 'opt-cooling-baseline-divergence',
      recommendationTitle: 'Controllo Divergenza Raffreddamento',
      timestampStarted: '2026-09-25T08:00:00Z',
      timestampCompleted: '2026-09-25T08:30:00Z',
      category: 'thermal',
      actionAvailability: 'MANUAL',
      triggerReason: 'Baseline termica scostata',
      triggerEvidence: '+12C sopra baseline',
      actionDescription: 'Ispezione ventole dissipatore',
      outcome: 'success',
      verificationType: 'quantitative',
      verificationStatus: 'pending',
      verificationMethod: 'Nuovo ciclo di carico per monitorare temperature',
      schemaVersion: 1,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      optimizationHistory: [pendingRecord],
      currentTimestamp: '2026-09-27T10:00:00Z', // Trascorsi esattamente 49.5 ore
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('VERIFICATION_REMINDER');
    expect(reminders[0].urgency).toBe('verification_pending');
    expect(reminders[0].executionRecordId).toBe('exec-thermal-001');
    expect(reminders[0].title).toContain('Verifica in sospeso');
  });

  // 15. Verification pending < soglia (< 48h)
  it('15. non genera reminder se l\'azione è stata eseguita da meno di 48 ore', () => {
    const pendingRecord: OptimizationExecutionRecord = {
      id: 'exec-recent-002',
      recommendationId: 'opt-cooling-baseline-divergence',
      recommendationTitle: 'Controllo Divergenza Raffreddamento',
      timestampStarted: '2026-09-27T02:00:00Z',
      timestampCompleted: '2026-09-27T02:15:00Z',
      category: 'thermal',
      actionAvailability: 'MANUAL',
      triggerReason: 'Baseline termica',
      triggerEvidence: '+10C',
      actionDescription: 'Pulizia filtri',
      outcome: 'success',
      verificationType: 'quantitative',
      verificationStatus: 'pending',
      verificationMethod: 'Ciclo di carico',
      schemaVersion: 1,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      optimizationHistory: [pendingRecord],
      currentTimestamp: '2026-09-27T10:00:00Z', // Trascorsi solo 7 ore e 45 minuti
    });

    expect(reminders).toHaveLength(0);
  });

  // 16. Recurring active
  it('16. genera reminder CONDITION_RECHECK per raccomandazioni RECURRING_ACTIVE', () => {
    const recurringRec: OptimizationRecommendation = {
      id: 'opt-cleanmgr-c',
      title: 'Avvia Pulizia Disco su Unità di Sistema C:',
      category: 'storage',
      reason: 'L\'unità C: è satura all\'88%.',
      evidence: 'Spazio occupato all\'88%',
      expectedBenefit: 'Rimozione file temporanei',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ONE_CLICK',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'open-cleanmgr',
      cadenceType: 'STATE_REMEDIATION',
      eligibility: 'RECURRING_ACTIVE',
      historyExplanation: 'Questa ottimizzazione era già stata eseguita il 20/09/2026 ma la saturazione persiste.',
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [recurringRec],
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('CONDITION_RECHECK');
    expect(reminders[0].urgency).toBe('condition_active');
    expect(reminders[0].title).toContain('Anomalia Persistente');
    expect(reminders[0].description).toContain('tuttora presente nel sistema');
  });

  // 17. Maintenance due soon
  it('17. genera reminder con urgenza due_soon per interventi di manutenzione fisica entro la data programmata', () => {
    const maintEntries: MaintenanceEntry[] = [
      {
        id: 'maint-filter-01',
        date: '2026-03-27',
        nextDueDate: '2026-09-30', // Tra 3 giorni rispetto al 27
        type: 'filter_cleaning',
        title: 'Pulizia Filtri Antipolvere Case',
        description: 'Controllo e lavaggio filtri magnetici anteriori e inferiori',
        createdAt: '2026-03-27T10:00:00Z',
        updatedAt: '2026-03-27T10:00:00Z',
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: maintEntries,
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('MAINTENANCE_REMINDER');
    expect(reminders[0].urgency).toBe('due_soon');
    expect(reminders[0].daysRemaining).toBe(3);
    expect(reminders[0].title).toContain('tra 3 giorni');
  });

  // 18. Maintenance overdue
  it('18. genera reminder con urgenza overdue per interventi di manutenzione fisica con scadenza superata', () => {
    const maintEntries: MaintenanceEntry[] = [
      {
        id: 'maint-paste-01',
        date: '2024-09-15',
        nextDueDate: '2026-09-15', // Scaduto 12 giorni fa rispetto al 27
        type: 'thermal_paste',
        title: 'Sostituzione Pasta Termica CPU',
        description: 'Applicazione Noctua NT-H2',
        createdAt: '2024-09-15T10:00:00Z',
        updatedAt: '2024-09-15T10:00:00Z',
      },
    ];

    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: maintEntries,
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('MAINTENANCE_REMINDER');
    expect(reminders[0].urgency).toBe('overdue');
    expect(reminders[0].daysRemaining).toBe(-12);
    expect(reminders[0].title).toContain('scaduta da 12 giorni');
  });

  // 19. Nessun reminder
  it('19. restituisce array vuoto quando non ci sono scadenze, anomalie o verifiche pendenti', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [
        {
          ...mockTrimRecommendation,
          cooldownRemainingDays: 25, // Fuori finestra
        },
      ],
      maintenanceEntries: [
        {
          id: 'maint-far',
          date: '2026-09-01',
          nextDueDate: '2026-11-01', // Scadenza lontana
          type: 'cleaning',
          title: 'Pulizia',
          description: 'Pulizia generale ordinaria',
          createdAt: '2026-09-01T10:00:00Z',
          updatedAt: '2026-09-01T10:00:00Z',
        },
      ],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toEqual([]);
  });

  // 20. Ordinamento deterministico
  it('20. ordina rigorosamente i promemoria per tier di urgenza, giorni rimanenti e tie-breaker su ID', () => {
    const overdueMaint: MaintenanceEntry = {
      id: 'entry-overdue-b',
      date: '2026-08-01',
      nextDueDate: '2026-09-20', // -7 giorni
      type: 'filter_cleaning',
      title: 'Filtri B',
      description: 'Pulizia filtri B',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const overdueMaintMore: MaintenanceEntry = {
      id: 'entry-overdue-a',
      date: '2026-08-01',
      nextDueDate: '2026-09-10', // -17 giorni (più arretrata)
      type: 'fan_cleaning',
      title: 'Ventole A',
      description: 'Pulizia ventole A',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const recurringRec: OptimizationRecommendation = {
      id: 'opt-recurring',
      title: 'Anomalia Attiva',
      category: 'storage',
      reason: 'Spazio',
      evidence: 'C:',
      expectedBenefit: 'Spazio',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ONE_CLICK',
      rollbackAvailability: 'NOT_APPLICABLE',
      cadenceType: 'STATE_REMEDIATION',
      eligibility: 'RECURRING_ACTIVE',
    };

    const pendingRecord: OptimizationExecutionRecord = {
      id: 'exec-pending-01',
      recommendationId: 'opt-cooling',
      recommendationTitle: 'Verifica Cooling',
      timestampStarted: '2026-09-24T10:00:00Z',
      timestampCompleted: '2026-09-24T10:05:00Z',
      category: 'thermal',
      actionAvailability: 'MANUAL',
      triggerReason: 'Cooling',
      triggerEvidence: 'Delta',
      actionDescription: 'Test',
      outcome: 'success',
      verificationType: 'quantitative',
      verificationStatus: 'pending',
      verificationMethod: 'Test carico',
      schemaVersion: 1,
    };

    const dueSoonRec: OptimizationRecommendation = {
      ...mockTrimRecommendation,
      cooldownRemainingDays: 2,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [dueSoonRec, recurringRec],
      maintenanceEntries: [overdueMaint, overdueMaintMore],
      optimizationHistory: [pendingRecord],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders.length).toBe(5);

    // Tier 1: overdue (-17) -> overdue (-7) -> condition_active (daysRemaining 0)
    expect(reminders[0].id).toBe('rem-maint-entry-entry-overdue-a');
    expect(reminders[1].id).toBe('rem-maint-entry-entry-overdue-b');
    expect(reminders[2].id).toBe('rem-condition-opt-recurring');

    // Tier 2: verification_pending
    expect(reminders[3].id).toBe('rem-verif-exec-pending-01');

    // Tier 4: due_soon
    expect(reminders[4].id).toBe('rem-periodic-opt-trim-C');
  });

  // 21. Timezone boundary
  it('21. gestisce correttamente i cambi di data a cavallo della mezzanotte e con timestamp con offset', () => {
    const interaction: ReminderInteraction = {
      reminderId: 'rem-periodic-opt-trim-C',
      lastNotifiedDate: '2026-03-29',
    };

    // Primo test: 23:59:59 UTC del 29 marzo -> stesso giorno, soppresso
    const remBefore = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      interactions: [interaction],
      currentTimestamp: '2026-03-29T23:59:59Z',
    });
    expect(remBefore[0].isNotificationEligible).toBe(false);
    expect(remBefore[0].suppressionReason).toBe('same_day_already_notified');

    // Secondo test: 00:00:01 UTC del 30 marzo -> nuovo giorno di calendario, eleggibile
    const remAfter = evaluateMaintenanceReminders({
      recommendations: [mockTrimRecommendation],
      interactions: [interaction],
      currentTimestamp: '2026-03-30T00:00:01Z',
    });
    expect(remAfter[0].isNotificationEligible).toBe(true);
    expect(remAfter[0].suppressionReason).toBeUndefined();
  });

  // 22. Leap year
  it('22. calcola con precisione i giorni di anticipo attraverso il 29 febbraio di un anno bisestile (2024)', () => {
    const leapYearEntry: MaintenanceEntry = {
      id: 'maint-leap-2024',
      date: '2024-02-01',
      nextDueDate: '2024-03-01',
      type: 'cleaning',
      title: 'Pulizia Bisestile',
      description: 'Pulizia in anno bisestile',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-01T10:00:00Z',
    };

    // Al 28 febbraio 2024: mancano esattamente 2 giorni (29 febbraio e 1 marzo)
    const reminders2024 = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [leapYearEntry],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2024-02-28T12:00:00Z',
    });

    expect(reminders2024).toHaveLength(1);
    expect(reminders2024[0].daysRemaining).toBe(2);

    // In anno non bisestile (2025): dal 28 febbraio al 1 marzo manca esattamente 1 giorno
    const normalYearEntry: MaintenanceEntry = {
      ...leapYearEntry,
      id: 'maint-normal-2025',
      date: '2025-02-01',
      nextDueDate: '2025-03-01',
      description: 'Pulizia in anno ordinario',
    };

    const reminders2025 = evaluateMaintenanceReminders({
      recommendations: [],
      maintenanceEntries: [normalYearEntry],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2025-02-28T12:00:00Z',
    });

    expect(reminders2025).toHaveLength(1);
    expect(reminders2025[0].daysRemaining).toBe(1);
  });

  // 23. Timestamp identici & Tie-breaker
  it('23. applica tie-breaker alfabetico su ID per reminder con identica urgenza e daysRemaining', () => {
    const recZ: OptimizationRecommendation = {
      ...mockTrimRecommendation,
      id: 'opt-z-disk',
      title: 'Z Disk',
      cooldownRemainingDays: 2,
    };
    const recA: OptimizationRecommendation = {
      ...mockTrimRecommendation,
      id: 'opt-a-disk',
      title: 'A Disk',
      cooldownRemainingDays: 2,
    };

    const reminders = evaluateMaintenanceReminders({
      recommendations: [recZ, recA],
      settings: { leadTimeDays: 3 },
      currentTimestamp: '2026-09-27T10:00:00Z',
    });

    expect(reminders).toHaveLength(2);
    expect(reminders[0].id).toBe('rem-periodic-opt-a-disk');
    expect(reminders[1].id).toBe('rem-periodic-opt-z-disk');
  });

  // 24. Input vuoti / null dove il contratto lo permette
  it('24. gestisce input vuoti, omessi o minimali in totale sicurezza senza eccezioni', () => {
    const reminders = evaluateMaintenanceReminders({
      recommendations: [],
      currentTimestamp: '2026-09-27',
    });

    expect(reminders).toEqual([]);
  });

  // 25. Architectural Purity Test
  it('25. [ARCHITECTURAL TEST] il modulo maintenanceSchedulerEngine non importa React, Tauri, IndexedDB o API browser', () => {
    const engineFilePath = resolve(__dirname, '../maintenanceSchedulerEngine.ts');
    const content = readFileSync(engineFilePath, 'utf-8');

    // Verifica divieto di importare librerie non pure
    expect(content).not.toMatch(/from\s+['"]react['"]/);
    expect(content).not.toMatch(/from\s+['"]@tauri-apps/);
    expect(content).not.toMatch(/from\s+['"][^'"]*indexedDB/i);
    expect(content).not.toMatch(/localStorage/);
    expect(content).not.toMatch(/sessionStorage/);
    expect(content).not.toMatch(/\bwindow\b/);
    expect(content).not.toMatch(/\bdocument\b/);
    expect(content).not.toMatch(/Date\.now\(\)/);
  });

  // 26. Helper deterministici
  it('26. verifica il corretto comportamento delle funzioni helper pure', () => {
    // extractLocalDateString
    expect(extractLocalDateString('2026-09-27T15:30:00Z')).toBe('2026-09-27');
    expect(extractLocalDateString('2026-12-31')).toBe('2026-12-31');
    expect(extractLocalDateString('')).toBe('');

    // isReminderImportant
    expect(isReminderImportant({
      id: 'rem-condition-1',
      type: 'CONDITION_RECHECK',
      title: 'Test',
      description: 'Test',
      urgency: 'condition_active',
      isNotificationEligible: true,
      explanation: 'Test',
    })).toBe(true);

    expect(isReminderImportant({
      id: 'rem-periodic-opt-clean-shader-cache',
      type: 'PERIODIC_REMINDER',
      title: 'Shader cache',
      description: 'Test',
      urgency: 'due_soon',
      recommendationId: 'opt-clean-shader-cache',
      isNotificationEligible: true,
      explanation: 'Test',
    })).toBe(false);

    // getUrgencySortWeight
    expect(getUrgencySortWeight('overdue')).toBe(1);
    expect(getUrgencySortWeight('condition_active')).toBe(1);
    expect(getUrgencySortWeight('verification_pending')).toBe(2);
    expect(getUrgencySortWeight('action_required')).toBe(3);
    expect(getUrgencySortWeight('due_soon')).toBe(4);
    expect(getUrgencySortWeight('upcoming')).toBe(5);
  });
});
