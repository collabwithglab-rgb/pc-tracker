/**
 * Tipi di Dominio per lo Smart Maintenance Scheduler (Tranche 1)
 * 
 * Modello deterministico per il calcolo dei promemoria di manutenzione hardware e sistema:
 * Facts -> Recommendation -> Lifecycle -> Scheduler -> Reminder Decision.
 * 
 * Regola fondamentale: Reminder è un'entità pura DERIVATA, non uno stato persistente duplicato.
 */

import { OptimizationCategory } from './optimization';
import { MaintenanceType } from './maintenance';

/**
 * Le 4 categorie concettuali di promemoria previste dall'architettura:
 * - PERIODIC_REMINDER: Scadenza del cooldown fisiologico (es. TRIM ogni 30gg, Restore Point ogni 14gg).
 * - MAINTENANCE_REMINDER: Interventi fisici calendarizzati o soglie di usura (filtri, pasta termica).
 * - VERIFICATION_REMINDER: Verifica dell'efficacia post-azione ancora in sospeso (es. test sotto carico > 48h).
 * - CONDITION_RECHECK: Condizioni anomale che persistono tuttora nonostante un intervento passato (RECURRING_ACTIVE).
 */
export type ReminderType =
  | 'PERIODIC_REMINDER'
  | 'MAINTENANCE_REMINDER'
  | 'VERIFICATION_REMINDER'
  | 'CONDITION_RECHECK';

/**
 * Tassonomia deterministica di urgenza per l'ordinamento delle priorità:
 * 1. overdue / condition_active (problemi o scadenze già superate)
 * 2. verification_pending (interventi in sospeso da oltre 48 ore)
 * 3. action_required (cooldown terminato, eleggibile ora)
 * 4. due_soon (all'interno della finestra di lead time)
 * 5. upcoming (programmato per il futuro oltre il lead time)
 */
export type ReminderUrgency =
  | 'overdue'
  | 'condition_active'
  | 'verification_pending'
  | 'action_required'
  | 'due_soon'
  | 'upcoming';

/**
 * Modalità di notifica configurabili:
 * - 'all': Tutti i reminder idonei.
 * - 'important_only': Solo reminder prioritari (anomalie persistenti, verifiche pendenti, TRIM, filtri/pasta).
 * - 'verification_only': Solo verifiche post-azione in sospeso.
 * - 'none': Nessuna notifica attiva (i reminder restano comunque calcolati per la visualizzazione in-app).
 */
export type SchedulerNotificationMode =
  | 'all'
  | 'important_only'
  | 'verification_only'
  | 'none';

/**
 * Finestra di anticipo permessa (giorni prima della scadenza naturale).
 */
export type SchedulerLeadTimeDays = 0 | 1 | 3 | 7;

/**
 * Motivo formale della mancata eleggibilità a notifica (soppressione):
 */
export type NotificationSuppressionReason =
  | 'scheduler_disabled'
  | 'mode_none'
  | 'mode_important_only'
  | 'mode_verification_only'
  | 'same_day_already_notified';

/**
 * Configurazione essenziale dello scheduler.
 */
export interface SchedulerSettings {
  enabled: boolean;
  notificationMode: SchedulerNotificationMode;
  leadTimeDays: SchedulerLeadTimeDays;
}

export type MaintenanceSchedulerSettings = SchedulerSettings;

/**
 * Valori predefiniti sicuri e non invadenti per lo scheduler.
 */
export const DEFAULT_SCHEDULER_SETTINGS: SchedulerSettings = {
  enabled: true,
  notificationMode: 'important_only',
  leadTimeDays: 3,
};

/**
 * Soglia temporale minima (in ore) dopo l'esecuzione di un'azione prima che una verifica
 * in sospeso (pending / inconclusive) dia origine a un reminder all'utente.
 */
export const VERIFICATION_PENDING_THRESHOLD_HOURS = 48;

/**
 * Valori di lead time consentiti dal modello.
 */
export const ALLOWED_LEAD_TIME_DAYS: readonly SchedulerLeadTimeDays[] = [0, 1, 3, 7];

/**
 * Interazione minimale dell'utente con un promemoria (per snooze e soppressione duplicati nello stesso giorno).
 */
export interface ReminderInteraction {
  reminderId: string;
  snoozedUntil?: string;       // Data ISO 'YYYY-MM-DD' fino a cui il reminder è escluso
  lastNotifiedDate?: string;   // Data ISO 'YYYY-MM-DD' dell'ultimo avviso mostrato
  cycleExecutionId?: string;   // ID del record storico associato all'ultimo ciclo gestito
}

/**
 * Entità pura e derivata del promemoria di manutenzione.
 */
export interface MaintenanceReminder {
  id: string;                                // ID univoco e deterministico del promemoria
  type: ReminderType;                        // Categoria semantica
  title: string;                             // Titolo sintetico per la UI
  description: string;                       // Descrizione sobria e chiara
  urgency: ReminderUrgency;                  // Livello di urgenza per l'ordinamento
  target?: string;                           // Bersaglio hardware/sistema (es. "Unità C:", "Filtri Antipolvere")
  category?: OptimizationCategory | MaintenanceType | string;
  actionId?: string;                         // Riferimento all'azione Windows se eseguibile in 1-click
  recommendationId?: string;                 // Riferimento alla raccomandazione originale
  maintenanceEntryId?: string;               // Riferimento all'intervento nel diario se applicabile
  executionRecordId?: string;                // Riferimento al record di esecuzione storica se applicabile
  dueDate?: string;                          // Data di scadenza ISO 'YYYY-MM-DD' se applicabile
  daysRemaining?: number;                    // Giorni rimanenti (negativi = scaduto)
  isNotificationEligible: boolean;           // true se può essere notificato secondo filtri, preferenze e snooze
  suppressionReason?: NotificationSuppressionReason; // Motivo se non notificabile
  snoozedUntil?: string;                     // Eventuale data di snooze attiva
  explanation: string;                       // Spiegazione oggettiva della motivazione
}
