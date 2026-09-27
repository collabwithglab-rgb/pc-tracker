import { OptimizationCategory, ActionAvailability } from './optimization';

/**
 * Esito tecnico dell'esecuzione di una raccomandazione di ottimizzazione.
 */
export type OptimizationOutcome = 'success' | 'cancelled' | 'failed' | 'skipped';

/**
 * Tipologia formale di verifica dell'efficacia post-azione:
 * - quantitative: Metrica numerica prima/dopo oggettivamente misurabile (es. byte, elementi).
 * - state_based: Transizione di stato confermata da interrogazione OS (es. schema abilitato, TRIM eseguito).
 * - command_based: Successo del comando Windows con codice di uscita 0 e output analizzato.
 * - manual: Verifica visiva, strumentale o fisica a carico dell'utente (es. pasta termica, ventole).
 */
export type OptimizationVerificationType =
  | 'quantitative'
  | 'state_based'
  | 'command_based'
  | 'manual';

/**
 * Stato della verifica di efficacia.
 */
export type OptimizationVerificationStatus =
  | 'verified'
  | 'pending'
  | 'not_applicable'
  | 'inconclusive'
  | 'failed';

/**
 * Dati di evidenza strutturati o descrittivi prima/dopo l'ottimizzazione.
 */
export interface OptimizationEvidenceData {
  summary: string;
  metrics?: Record<string, number | string | boolean>;
}

/**
 * Variazione quantitativa reale misurata tra prima e dopo l'intervento.
 */
export interface OptimizationMetricsDelta {
  numericChange?: number;
  unit?: string;
  description?: string;
}

/**
 * Record storico immutabile e deterministico di una raccomandazione eseguita.
 * Rappresenta la memoria del PC Care Center:
 * Recommendation -> Action -> Verification -> Historical Record -> Future Context.
 */
export interface OptimizationExecutionRecord {
  id: string;                                // UUID v4 univoco e stabile
  recommendationId: string;                  // ID raccomandazione originaria
  recommendationTitle: string;               // Titolo sintetico
  timestampStarted: string;                  // Timestamp ISO inizio operazione
  timestampCompleted: string;                // Timestamp ISO completamento operazione
  durationMs?: number;                       // Durata in millisecondi

  category: OptimizationCategory;            // Categoria hardware/sistema
  actionAvailability: ActionAvailability;    // Livello disponibilità azione
  target?: string;                           // Bersaglio (es. "Drive C:", "WinSxS", "Shader Cache")
  componentId?: string;                      // Soft-link facoltativo al componente hardware

  triggerReason: string;                     // Motivo che ha originato la proposta
  triggerEvidence: string;                   // Evidenza iniziale osservata
  actionId?: string;                         // Identificatore dell'azione
  actionDescription: string;                 // Cosa è stato concretamente eseguito

  outcome: OptimizationOutcome;              // Esito esecuzione
  errorMessage?: string;                     // Errore tecnico se outcome === 'failed'
  cancellationReason?: string;               // Motivo se outcome === 'cancelled'

  verificationType: OptimizationVerificationType;
  verificationStatus: OptimizationVerificationStatus;
  verificationMethod: string;                // Metodo di verifica
  evidenceBefore?: OptimizationEvidenceData | string; // Evidenza pre-intervento
  evidenceAfter?: OptimizationEvidenceData | string;  // Evidenza post-intervento
  metricsDelta?: OptimizationMetricsDelta;   // Variazione metrica reale se quantitativo

  relatedMaintenanceEntryId?: string;        // Soft-link al diario manutenzione se collegato
  schemaVersion: number;                     // Versione schema record (1)
}

/**
 * Input per la creazione di un record di esecuzione storica.
 */
export interface CreateOptimizationRecordInput {
  id?: string;
  recommendationId: string;
  recommendationTitle: string;
  timestampStarted: string;
  timestampCompleted?: string;
  durationMs?: number;

  category: OptimizationCategory;
  actionAvailability: ActionAvailability;
  target?: string;
  componentId?: string;

  triggerReason: string;
  triggerEvidence: string;
  actionId?: string;
  actionDescription: string;

  outcome: OptimizationOutcome;
  errorMessage?: string;
  cancellationReason?: string;

  verificationType: OptimizationVerificationType;
  verificationStatus: OptimizationVerificationStatus;
  verificationMethod: string;
  evidenceBefore?: OptimizationEvidenceData | string;
  evidenceAfter?: OptimizationEvidenceData | string;
  metricsDelta?: OptimizationMetricsDelta;

  relatedMaintenanceEntryId?: string;
  schemaVersion?: number;
}
