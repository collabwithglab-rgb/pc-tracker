import type { OptimizationExecutionRecord } from './optimizationHistory';

/**
 * Tipi per l'Optimization Engine e le Raccomandazioni di Sistema (PC Care Center - Tranche 3 & Tranche 5)
 */

export type OptimizationRisk = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

export type ActionAvailability =
  | 'READ_ONLY'           // Sola lettura o diagnostica (nessuna modifica al sistema)
  | 'ONE_CLICK'           // Esecuzione immediata in 1-click in user-space non distruttiva
  | 'USER_CONFIRMED'      // Azione mutante che richiede conferma esplicita prima di procedere
  | 'ASSISTED'            // Richiede autorizzazione esplicita Windows UAC o assistita da OS
  | 'MANUAL'              // Guida passo-passo per l'utente (es. BIOS/UEFI, manutenzione fisica)
  // Alias retrocompatibili
  | 'AUTOMATED_SAFE'
  | 'ASSISTED_UAC'
  | 'MANUAL_GUIDED'
  | 'EXTERNAL_LINK';

export type RollbackAvailability =
  | 'AUTOMATIC'           // L'applicazione può ripristinare il valore precedente in 1-click
  | 'MANUAL_RESTORE'      // Ripristinabile tramite Punto di Ripristino di Windows
  | 'NOT_APPLICABLE';     // Operazione di pulizia o diagnostica innocua e non-distruttiva

export type OptimizationCategory =
  | 'storage'
  | 'maintenance'
  | 'system'
  | 'performance'
  | 'security'
  | 'thermal';

/**
 * Cadenza e natura semantica della raccomandazione:
 * - ONE_SHOT: Azione una tantum (es. attivazione power scheme o impostazione firmware).
 * - STATE_REMEDIATION: Proposta finché la specifica condizione persiste (es. C: saturo, file corrotti).
 * - PERIODIC: Manutenzione fisiologica da ripetere dopo un intervallo temporale (es. TRIM, Restore Point, Shader Cache).
 * - MANUAL_MAINTENANCE: Intervento fisico a cura dell'utente con verifica pendente (es. filtri antipolvere, pasta termica).
 * - DIAGNOSTIC: Consultazione/triage di sola lettura senza modifiche dirette al sistema (es. RAM pressure triage).
 */
export type RecommendationCadenceType =
  | 'ONE_SHOT'
  | 'STATE_REMEDIATION'
  | 'PERIODIC'
  | 'MANUAL_MAINTENANCE'
  | 'DIAGNOSTIC';

/**
 * Stato deterministico di eleggibilità nel ciclo di vita della raccomandazione:
 * - ELIGIBLE: Pronta per essere eseguita (nuova o periodo di cooldown completato).
 * - COOLDOWN: In periodo di riposo/fisiologico dopo un'esecuzione riuscita recente.
 * - ALREADY_RESOLVED: La condizione anomala è stata risolta con successo e non sussiste più.
 * - PENDING_VERIFICATION: Intervento registrato ma verifica ancora in attesa (es. osservazione telemetrica o riavvio).
 * - RECURRING_ACTIVE: Già eseguita in precedenza ma la condizione anomala persiste tuttora nel sistema (NON nascondere!).
 * - NOT_ELIGIBLE: Non applicabile al sistema corrente.
 */
export type RecommendationEligibilityStatus =
  | 'ELIGIBLE'
  | 'COOLDOWN'
  | 'ALREADY_RESOLVED'
  | 'PENDING_VERIFICATION'
  | 'RECURRING_ACTIVE'
  | 'NOT_ELIGIBLE';

export interface OptimizationRecommendation {
  id: string;                     // Identificativo univoco deterministico
  title: string;
  category: OptimizationCategory;
  reason: string;                 // Perché viene proposta
  evidence: string;               // Fatto oggettivo o metrica che la motiva
  expectedBenefit: string;        // Guadagno atteso concreto (spazio, temperature, stabilità)
  risk: OptimizationRisk;
  confidence: 'HIGH' | 'MEDIUM';
  actionAvailability: ActionAvailability;
  rollbackAvailability: RollbackAvailability;
  actionId?: string;              // Riferimento al catalogo azioni native Windows
  actionDescription?: string;     // Cosa viene concretamente eseguito dal sistema
  verificationMethod?: string;    // Metodo di verifica dell'efficacia post-azione
  parameters?: Record<string, string | number | boolean>;

  // Lifecycle & Memory Context (Tranche 5)
  cadenceType?: RecommendationCadenceType;
  eligibility?: RecommendationEligibilityStatus;
  lastExecution?: OptimizationExecutionRecord;
  executionCount?: number;
  historyExplanation?: string;
  cooldownRemainingDays?: number;
}

export interface OptimizationReport {
  evaluatedAt: string;
  recommendations: OptimizationRecommendation[];
  resolvedOrCooldownRecommendations?: OptimizationRecommendation[];
  totalCount: number;
  byCategory: Record<OptimizationCategory, number>;
  byRisk: Record<OptimizationRisk, number>;
  byEligibility?: Record<RecommendationEligibilityStatus, number>;
}

