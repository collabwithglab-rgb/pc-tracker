/**
 * Smart Maintenance Scheduler Engine — Motore puro per il calcolo dei promemoria
 * di manutenzione hardware, verifiche e salute del sistema (PC Care Center - Tranche 1)
 * 
 * Pipeline: Facts -> Recommendation -> Lifecycle -> Scheduler -> Reminder Decision.
 * 
 * Regole architetturali:
 * - Puro e deterministico: nessun orologio di sistema, nessun timer reale, nessuna dipendenza esterna.
 * - Il timestamp corrente deve essere sempre passato come parametro.
 * - Non duplica i calcoli di cooldown: consuma direttamente il Lifecycle Engine e il Maintenance Engine.
 * - Distingue tra "reminder exists" (dominio) e "isNotificationEligible" (presentazione/soppressione).
 */

import {
  OptimizationRecommendation,
  OptimizationExecutionRecord,
  MaintenanceEntry,
  SystemFactsInput,
  MaintenanceReminder,
  SchedulerSettings,
  SchedulerNotificationMode,
  SchedulerLeadTimeDays,
  ALLOWED_LEAD_TIME_DAYS,
  ReminderInteraction,
  ReminderUrgency,
  DEFAULT_SCHEDULER_SETTINGS,
  VERIFICATION_PENDING_THRESHOLD_HOURS,
  NotificationSuppressionReason,
} from '../types';
import { computeDaysRemaining } from './maintenanceEngine';
import {
  evaluateRecommendationsWithHistory,
  classifyRecommendationCadence,
} from './optimizationLifecycleEngine';
import { isValidISODateString } from './validators';
import { formatDate } from '../utils/formatters';

/**
 * Normalizza e convalida in modo deterministico le impostazioni dello scheduler,
 * garantendo fallback sicuro a fronte di campi mancanti, non validi o legacy.
 */
export function normalizeSchedulerSettings(raw: unknown): SchedulerSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SCHEDULER_SETTINGS };
  }

  const s = raw as Record<string, unknown>;

  const enabled = typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SCHEDULER_SETTINGS.enabled;

  const validModes: SchedulerNotificationMode[] = ['all', 'important_only', 'verification_only', 'none'];
  const notificationMode: SchedulerNotificationMode =
    typeof s.notificationMode === 'string' && validModes.includes(s.notificationMode as SchedulerNotificationMode)
      ? (s.notificationMode as SchedulerNotificationMode)
      : DEFAULT_SCHEDULER_SETTINGS.notificationMode;

  const leadTimeDays: SchedulerLeadTimeDays =
    typeof s.leadTimeDays === 'number' && (ALLOWED_LEAD_TIME_DAYS as readonly number[]).includes(s.leadTimeDays)
      ? (s.leadTimeDays as SchedulerLeadTimeDays)
      : DEFAULT_SCHEDULER_SETTINGS.leadTimeDays;

  return {
    enabled,
    notificationMode,
    leadTimeDays,
  };
}

/**
 * Normalizza e ripulisce le interazioni utente registrate per i promemoria (snooze, lastNotified, cycleExecutionId).
 * Garanzia architetturale: filtra via qualsiasi stato computato o derivato (eligibility, urgency, dueDate, ecc.)
 * preservando ESCLUSIVAMENTE i dati persistenti di interazione dell'utente.
 */
export function normalizeReminderInteractions(raw: unknown): Record<string, ReminderInteraction> {
  const result: Record<string, ReminderInteraction> = {};
  if (!raw || typeof raw !== 'object') return result;

  const entries: [string, unknown][] = Array.isArray(raw)
    ? raw.map((item, idx) => [item?.reminderId || String(idx), item])
    : Object.entries(raw as Record<string, unknown>);

  for (const [key, val] of entries) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const item = val as Record<string, unknown>;
    const reminderId =
      typeof item.reminderId === 'string' && item.reminderId.trim()
        ? item.reminderId.trim()
        : typeof key === 'string' && key.trim()
        ? key.trim()
        : '';

    if (!reminderId) continue;

    const snoozedUntil =
      typeof item.snoozedUntil === 'string' && isValidISODateString(item.snoozedUntil)
        ? item.snoozedUntil
        : undefined;

    const lastNotifiedDate =
      typeof item.lastNotifiedDate === 'string' && isValidISODateString(item.lastNotifiedDate)
        ? item.lastNotifiedDate
        : undefined;

    const cycleExecutionId =
      typeof item.cycleExecutionId === 'string' && item.cycleExecutionId.trim()
        ? item.cycleExecutionId.trim()
        : undefined;

    // Persistiamo solo record che contengono effettivamente almeno un'interazione utente
    if (snoozedUntil || lastNotifiedDate || cycleExecutionId) {
      result[reminderId] = {
        reminderId,
        ...(snoozedUntil ? { snoozedUntil } : {}),
        ...(lastNotifiedDate ? { lastNotifiedDate } : {}),
        ...(cycleExecutionId ? { cycleExecutionId } : {}),
      };
    }
  }

  return result;
}

/**
 * Estrae la porzione di data di calendario 'YYYY-MM-DD' da un timestamp ISO o da una stringa data.
 * Garantisce confronti deterministici indipendenti da conversioni implicite di fuso orario.
 */
export function extractLocalDateString(timestamp: string): string {
  if (!timestamp || typeof timestamp !== 'string') return '';
  const trimmed = timestamp.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  return trimmed;
}

/**
 * Determina se un promemoria è considerato "importante" ai fini della modalità 'important_only'.
 */
export function isReminderImportant(reminder: MaintenanceReminder): boolean {
  // 1. Condizioni anomale persistenti (intervento eseguito ma problema ancora presente)
  if (reminder.type === 'CONDITION_RECHECK') return true;

  // 2. Verifiche dell'efficacia in sospeso da oltre 48 ore
  if (reminder.type === 'VERIFICATION_REMINDER') return true;

  // 3. Manutenzioni fisiche scadute o imminenti (filtri, pasta termica)
  if (reminder.type === 'MAINTENANCE_REMINDER') {
    return reminder.urgency === 'overdue' || reminder.urgency === 'due_soon' || reminder.urgency === 'action_required';
  }

  // 4. Manutenzioni periodiche essenziali per l'integrità del sistema
  if (reminder.type === 'PERIODIC_REMINDER') {
    const recId = reminder.recommendationId || '';
    // TRIM su SSD e Punti di Ripristino di sistema sono prioritari
    if (recId.startsWith('opt-trim-') || recId === 'opt-create-restore-point') {
      return true;
    }
    // Pulizia shader cache e pulizia componenti non sono considerate prioritarie in important_only
    return false;
  }

  return false;
}

/**
 * Assegna un peso numerico all'urgenza per garantire un ordinamento deterministico:
 * 1. overdue / condition_active (problemi attivi o scadenze superate)
 * 2. verification_pending (verifiche post-azione in attesa)
 * 3. action_required (cooldown terminato, raccomandazione pronta)
 * 4. due_soon (imminente entro la finestra di lead time)
 * 5. upcoming (programmato per il futuro)
 */
export function getUrgencySortWeight(urgency: ReminderUrgency): number {
  switch (urgency) {
    case 'overdue':
    case 'condition_active':
      return 1;
    case 'verification_pending':
      return 2;
    case 'action_required':
      return 3;
    case 'due_soon':
      return 4;
    case 'upcoming':
    default:
      return 5;
  }
}

/**
 * Parametri di input per la funzione pura evaluateMaintenanceReminders.
 */
export interface EvaluateMaintenanceRemindersInput {
  /**
   * Catalogo di raccomandazioni (possono essere già arricchite con eligibility o valutate sul momento)
   */
  recommendations: OptimizationRecommendation[];
  /**
   * Fatti di sistema opzionali (necessari solo se le raccomandazioni non sono già state arricchite con eligibility)
   */
  facts?: SystemFactsInput;
  /**
   * Diario di manutenzione fisica per scadenze programmate (nextDueDate)
   */
  maintenanceEntries?: MaintenanceEntry[];
  /**
   * Storico esecuzioni per verifiche pendenti
   */
  optimizationHistory?: OptimizationExecutionRecord[];
  /**
   * Impostazioni dello scheduler (se omesse, vengono usati i DEFAULT_SCHEDULER_SETTINGS)
   */
  settings?: Partial<SchedulerSettings>;
  /**
   * Interazioni dell'utente registrate per i singoli promemoria (snooze, lastNotified)
   */
  interactions?: Record<string, ReminderInteraction> | ReminderInteraction[];
  /**
   * Timestamp ISO o data corrente di riferimento (OBBLIGATORIO per purezza e determinismo).
   */
  currentTimestamp: string;
}

/**
 * Funzione principale pura dello Smart Maintenance Scheduler.
 * Valuta tutti i dati del sistema e restituisce la lista ordinata e deterministica
 * dei promemoria di manutenzione derivati.
 */
export function evaluateMaintenanceReminders({
  recommendations: rawRecommendations = [],
  facts,
  maintenanceEntries = [],
  optimizationHistory = [],
  settings: partialSettings,
  interactions = [],
  currentTimestamp,
}: EvaluateMaintenanceRemindersInput): MaintenanceReminder[] {
  // 1. Normalizzazione impostazioni
  const settings: SchedulerSettings = normalizeSchedulerSettings(partialSettings);

  // Se lo scheduler è disabilitato dall'utente, restituisce un array vuoto
  if (!settings.enabled) {
    return [];
  }

  // 2. Normalizzazione data e timestamp
  const currentLocalDate = extractLocalDateString(currentTimestamp);
  const currentMs = new Date(currentTimestamp).getTime();

  // 3. Normalizzazione interazioni utente in Map per lookup O(1)
  const normalizedInteractions = normalizeReminderInteractions(interactions);
  const interactionMap = new Map<string, ReminderInteraction>(
    Object.entries(normalizedInteractions)
  );

  // 4. Preparazione raccomandazioni con ciclo di vita
  // Se le raccomandazioni contengono già eligibility, le utilizziamo direttamente;
  // altrimenti se sono forniti facts, eseguiamo l'arricchimento con il lifecycle engine.
  let evaluatedRecs: OptimizationRecommendation[] = rawRecommendations;
  const needsEnrichment = rawRecommendations.some((r) => !r.eligibility);
  if (needsEnrichment && facts) {
    const { actionableRecommendations, resolvedOrCooldownRecommendations } = evaluateRecommendationsWithHistory(
      rawRecommendations,
      facts,
      optimizationHistory,
      currentTimestamp
    );
    evaluatedRecs = [...actionableRecommendations, ...resolvedOrCooldownRecommendations];
  }

  const remindersMap = new Map<string, MaintenanceReminder>();

  // ---------------------------------------------------------------------------
  // A. PERIODIC REMINDERS (SSD TRIM, Punti di Ripristino, Cache Shader, ecc.)
  // ---------------------------------------------------------------------------
  for (const rec of evaluatedRecs) {
    const cadenceType = rec.cadenceType || classifyRecommendationCadence(rec);
    if (cadenceType !== 'PERIODIC') continue;

    const driveLetter = typeof rec.parameters?.driveLetter === 'string'
      ? rec.parameters.driveLetter.toUpperCase().replace(':', '')
      : undefined;
    const targetLabel = driveLetter ? `Unità ${driveLetter}:` : rec.category.toUpperCase();

    // Caso A1: In COOLDOWN -> Verifica se è all'interno della finestra di anticipo (lead time)
    if (rec.eligibility === 'COOLDOWN') {
      const remainingDays = rec.cooldownRemainingDays ?? 0;
      if (remainingDays <= settings.leadTimeDays) {
        const id = `rem-periodic-${rec.id}`;
        const title = remainingDays === 0
          ? `${rec.title} nuovamente consigliata`
          : `${rec.title} tra ${remainingDays} ${remainingDays === 1 ? 'giorno' : 'giorni'}`;

        remindersMap.set(id, {
          id,
          type: 'PERIODIC_REMINDER',
          title,
          description: rec.reason,
          urgency: remainingDays === 0 ? 'action_required' : 'due_soon',
          target: targetLabel,
          category: rec.category,
          actionId: rec.actionId,
          recommendationId: rec.id,
          daysRemaining: remainingDays,
          isNotificationEligible: true,
          explanation: rec.historyExplanation || `In periodo di riposo: prossima esecuzione consigliata tra ${remainingDays} giorni.`,
        });
      }
    }

    // Caso A2: ELIGIBLE -> Cooldown terminato o raccomandazione periodica pronta per l'esecuzione
    if (rec.eligibility === 'ELIGIBLE') {
      const id = `rem-periodic-${rec.id}`;
      const title = rec.lastExecution
        ? `${rec.title} nuovamente disponibile`
        : rec.title;

      remindersMap.set(id, {
        id,
        type: 'PERIODIC_REMINDER',
        title,
        description: rec.reason,
        urgency: 'action_required',
        target: targetLabel,
        category: rec.category,
        actionId: rec.actionId,
        recommendationId: rec.id,
        daysRemaining: 0,
        isNotificationEligible: true,
        explanation: rec.historyExplanation || 'Manutenzione periodica pronta per essere eseguita.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // B. MAINTENANCE REMINDERS (Diario Manutenzione & Interventi Manuali)
  // ---------------------------------------------------------------------------
  // B1. Scadenze calendarizzate con nextDueDate nel diario manutenzione
  for (const entry of maintenanceEntries) {
    if (!entry.nextDueDate || !isValidISODateString(entry.nextDueDate)) continue;

    const daysRemaining = computeDaysRemaining(entry.nextDueDate, currentLocalDate);
    if (daysRemaining === null) continue;

    const id = `rem-maint-entry-${entry.id}`;

    // Scaduto (overdue)
    if (daysRemaining < 0) {
      const overdueDays = Math.abs(daysRemaining);
      remindersMap.set(id, {
        id,
        type: 'MAINTENANCE_REMINDER',
        title: `${entry.title} scaduta da ${overdueDays} ${overdueDays === 1 ? 'giorno' : 'giorni'}`,
        description: entry.description || 'Intervento di manutenzione programmato non ancora registrato.',
        urgency: 'overdue',
        target: entry.productUsed || entry.title,
        category: entry.type,
        maintenanceEntryId: entry.id,
        dueDate: entry.nextDueDate,
        daysRemaining,
        isNotificationEligible: true,
        explanation: `Intervento programmato per il ${formatDate(entry.nextDueDate, 'DD/MM/YYYY')} non ancora completato.`,
      });
    }
    // Imminente entro il lead time (due_soon)
    else if (daysRemaining <= settings.leadTimeDays) {
      const title = daysRemaining === 0
        ? `${entry.title} in programma oggi`
        : `${entry.title} in programma tra ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'}`;

      remindersMap.set(id, {
        id,
        type: 'MAINTENANCE_REMINDER',
        title,
        description: entry.description || 'Intervento di manutenzione programmato imminente.',
        urgency: 'due_soon',
        target: entry.productUsed || entry.title,
        category: entry.type,
        maintenanceEntryId: entry.id,
        dueDate: entry.nextDueDate,
        daysRemaining,
        isNotificationEligible: true,
        explanation: `Intervento pianificato per il ${formatDate(entry.nextDueDate, 'DD/MM/YYYY')}.`,
      });
    }
  }

  // B2. Raccomandazioni di manutenzione fisica (filtri antipolvere, pasta termica)
  for (const rec of evaluatedRecs) {
    const cadenceType = rec.cadenceType || classifyRecommendationCadence(rec);
    if (cadenceType !== 'MANUAL_MAINTENANCE') continue;

    const id = `rem-maint-${rec.id}`;

    if (rec.eligibility === 'ELIGIBLE') {
      remindersMap.set(id, {
        id,
        type: 'MAINTENANCE_REMINDER',
        title: rec.title,
        description: rec.reason,
        urgency: 'action_required',
        target: rec.category.toUpperCase(),
        category: rec.category,
        actionId: rec.actionId,
        recommendationId: rec.id,
        daysRemaining: 0,
        isNotificationEligible: true,
        explanation: rec.historyExplanation || rec.evidence,
      });
    } else if (rec.eligibility === 'COOLDOWN') {
      const remainingDays = rec.cooldownRemainingDays ?? 0;
      if (remainingDays <= settings.leadTimeDays) {
        const title = remainingDays === 0
          ? `${rec.title} consigliata oggi`
          : `${rec.title} consigliata tra ${remainingDays} ${remainingDays === 1 ? 'giorno' : 'giorni'}`;

        remindersMap.set(id, {
          id,
          type: 'MAINTENANCE_REMINDER',
          title,
          description: rec.reason,
          urgency: remainingDays === 0 ? 'action_required' : 'due_soon',
          target: rec.category.toUpperCase(),
          category: rec.category,
          actionId: rec.actionId,
          recommendationId: rec.id,
          daysRemaining: remainingDays,
          isNotificationEligible: true,
          explanation: rec.historyExplanation || 'Controllo di manutenzione consigliato.',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. VERIFICATION REMINDERS (Verifiche Post-Azione in Sospeso > 48h)
  // ---------------------------------------------------------------------------
  // C1. Da raccomandazioni con stato PENDING_VERIFICATION
  for (const rec of evaluatedRecs) {
    if (rec.eligibility !== 'PENDING_VERIFICATION') continue;

    const lastExec = rec.lastExecution;
    if (!lastExec) continue;

    const execTimestamp = lastExec.timestampCompleted || lastExec.timestampStarted;
    const execMs = new Date(execTimestamp).getTime();
    if (isNaN(execMs)) continue;

    const elapsedMs = Math.max(0, currentMs - execMs);
    const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

    // Solo se sono trascorse almeno 48 ore dall'esecuzione dell'azione
    if (elapsedHours >= VERIFICATION_PENDING_THRESHOLD_HOURS) {
      const id = `rem-verif-${lastExec.id}`;
      const elapsedDays = Math.floor(elapsedHours / 24);
      const title = `Verifica in sospeso: ${rec.title}`;
      const description = `Intervento eseguito ${elapsedDays} ${elapsedDays === 1 ? 'giorno' : 'giorni'} fa (${elapsedHours}h). Verifica (${lastExec.verificationMethod}) in attesa.`;

      remindersMap.set(id, {
        id,
        type: 'VERIFICATION_REMINDER',
        title,
        description,
        urgency: 'verification_pending',
        target: lastExec.target,
        category: rec.category,
        actionId: rec.actionId,
        recommendationId: rec.id,
        executionRecordId: lastExec.id,
        isNotificationEligible: true,
        explanation: rec.historyExplanation || `Verifica post-azione in sospeso da ${elapsedHours} ore.`,
      });
    }
  }

  // C2. Da optimizationHistory direttamente (per record in sospeso non collegati a raccomandazioni attive)
  for (const record of optimizationHistory) {
    if (record.verificationStatus !== 'pending' && record.verificationStatus !== 'inconclusive') {
      continue;
    }

    const id = `rem-verif-${record.id}`;
    if (remindersMap.has(id)) continue;

    const execTimestamp = record.timestampCompleted || record.timestampStarted;
    const execMs = new Date(execTimestamp).getTime();
    if (isNaN(execMs)) continue;

    const elapsedMs = Math.max(0, currentMs - execMs);
    const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

    if (elapsedHours >= VERIFICATION_PENDING_THRESHOLD_HOURS) {
      const elapsedDays = Math.floor(elapsedHours / 24);
      remindersMap.set(id, {
        id,
        type: 'VERIFICATION_REMINDER',
        title: `Verifica in sospeso: ${record.recommendationTitle}`,
        description: `Intervento eseguito ${elapsedDays} ${elapsedDays === 1 ? 'giorno' : 'giorni'} fa (${elapsedHours}h). Verifica (${record.verificationMethod}) in attesa.`,
        urgency: 'verification_pending',
        target: record.target,
        category: record.category,
        actionId: record.actionId,
        recommendationId: record.recommendationId,
        executionRecordId: record.id,
        isNotificationEligible: true,
        explanation: `Verifica dell'efficacia in sospeso da ${elapsedHours} ore.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // D. CONDITION RECHECK (Intervento già eseguito ma anomalia ancora presente)
  // ---------------------------------------------------------------------------
  for (const rec of evaluatedRecs) {
    if (rec.eligibility !== 'RECURRING_ACTIVE') continue;

    const id = `rem-condition-${rec.id}`;
    const driveLetter = typeof rec.parameters?.driveLetter === 'string'
      ? rec.parameters.driveLetter.toUpperCase().replace(':', '')
      : undefined;
    const targetLabel = driveLetter ? `Unità ${driveLetter}:` : rec.category.toUpperCase();

    remindersMap.set(id, {
      id,
      type: 'CONDITION_RECHECK',
      title: `Anomalia Persistente: ${rec.title}`,
      description: 'L\'ottimizzazione era già stata eseguita in precedenza, ma la condizione che l\'ha originata è tuttora presente nel sistema.',
      urgency: 'condition_active',
      target: targetLabel,
      category: rec.category,
      actionId: rec.actionId,
      recommendationId: rec.id,
      daysRemaining: 0,
      isNotificationEligible: true,
      explanation: rec.historyExplanation || 'La condizione anomala persiste nel sistema nonostante il precedente intervento.',
    });
  }

  // ---------------------------------------------------------------------------
  // 5. APPLICAZIONE SNOOZE, NOTIFICATION MODE E SOPPRESSIONE DUPLICATI
  // ---------------------------------------------------------------------------
  const finalReminders: MaintenanceReminder[] = [];

  for (const reminder of remindersMap.values()) {
    const interaction = interactionMap.get(reminder.id);

    // 5.1 Snooze Rule: se snoozedUntil > currentLocalDate -> ESCLUSO dal dominio
    if (interaction && interaction.snoozedUntil && isValidISODateString(interaction.snoozedUntil)) {
      if (interaction.snoozedUntil > currentLocalDate) {
        // Promemoria posticipato dall'utente: escluso completamente
        continue;
      }
    }

    let isNotificationEligible = true;
    let suppressionReason: NotificationSuppressionReason | undefined = undefined;

    // 5.2 Notification Mode Filtering
    if (settings.notificationMode === 'none') {
      isNotificationEligible = false;
      suppressionReason = 'mode_none';
    } else if (settings.notificationMode === 'verification_only') {
      if (reminder.type !== 'VERIFICATION_REMINDER') {
        isNotificationEligible = false;
        suppressionReason = 'mode_verification_only';
      }
    } else if (settings.notificationMode === 'important_only') {
      if (!isReminderImportant(reminder)) {
        isNotificationEligible = false;
        suppressionReason = 'mode_important_only';
      }
    }

    // 5.3 Duplicate Notification Suppression (Regola Stesso Giorno)
    // Se è ancora eleggibile a notifica ma è già stato notificato nella data locale odierna:
    if (isNotificationEligible && interaction && interaction.lastNotifiedDate) {
      if (interaction.lastNotifiedDate === currentLocalDate) {
        isNotificationEligible = false;
        suppressionReason = 'same_day_already_notified';
      }
    }

    finalReminders.push({
      ...reminder,
      isNotificationEligible,
      suppressionReason,
      snoozedUntil: interaction?.snoozedUntil,
    });
  }

  // ---------------------------------------------------------------------------
  // 6. ORDINAMENTO DETERMINISTICO DELLE PRIORITÀ
  // ---------------------------------------------------------------------------
  finalReminders.sort((a, b) => {
    // 1. Tier primario di urgenza
    const weightA = getUrgencySortWeight(a.urgency);
    const weightB = getUrgencySortWeight(b.urgency);
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // 2. Giorni rimanenti (minori per primi: i più scaduti o imminenti)
    if (a.daysRemaining !== undefined && b.daysRemaining !== undefined) {
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
    } else if (a.daysRemaining !== undefined) {
      return -1;
    } else if (b.daysRemaining !== undefined) {
      return 1;
    }

    // 3. Tie-breaker deterministico su ID
    return a.id.localeCompare(b.id);
  });

  return finalReminders;
}
