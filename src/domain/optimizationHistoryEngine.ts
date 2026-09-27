import {
  OptimizationExecutionRecord,
  CreateOptimizationRecordInput,
  OptimizationOutcome,
  OptimizationVerificationType,
  OptimizationVerificationStatus,
  OptimizationRecommendation,
} from '../types';
import { generateId } from '../utils/id';

/**
 * Valid outcome values for OptimizationExecutionRecord.
 */
export const VALID_OPTIMIZATION_OUTCOMES: readonly OptimizationOutcome[] = [
  'success',
  'cancelled',
  'failed',
  'skipped',
];

/**
 * Valid verification types for OptimizationExecutionRecord.
 */
export const VALID_VERIFICATION_TYPES: readonly OptimizationVerificationType[] = [
  'quantitative',
  'state_based',
  'command_based',
  'manual',
];

/**
 * Valid verification statuses for OptimizationExecutionRecord.
 */
export const VALID_VERIFICATION_STATUSES: readonly OptimizationVerificationStatus[] = [
  'verified',
  'pending',
  'not_applicable',
  'inconclusive',
  'failed',
];

/**
 * Determina in modo rigoroso e deterministico il tipo formale di verifica
 * associato a una raccomandazione di sistema.
 * 
 * Regola fondamentale: NON fabbricare parametri quantitativi dove non esistono.
 */
export function determineVerificationType(rec: OptimizationRecommendation): OptimizationVerificationType {
  const actionId = rec.actionId || '';

  // 1. Azioni con vera metrica numerica oggettiva prima/dopo
  if (actionId === 'empty-recycle-bin' || actionId === 'clean-shader-cache') {
    return 'quantitative';
  }

  // 2. Azioni il cui esito è un cambio di stato verificabile nel sistema operativo
  if (actionId === 'run-trim' || actionId === 'enable-ultimate-performance') {
    return 'state_based';
  }

  // 3. Azioni verificate tramite output e codice di uscita del comando Windows
  if (
    actionId === 'sfc-repair' ||
    actionId === 'clean-component-store' ||
    actionId === 'chkdsk-scan' ||
    actionId === 'create-restore-point' ||
    actionId === 'open-cleanmgr'
  ) {
    return 'command_based';
  }

  // 4. Azioni manuali, fisiche o di consultazione / guida
  return 'manual';
}

/**
 * Crea un nuovo record storico immutabile conforme allo schema versionato.
 */
export function createOptimizationExecutionRecord(
  input: CreateOptimizationRecordInput
): OptimizationExecutionRecord {
  const id = input.id || generateId();
  const timestampCompleted = input.timestampCompleted || new Date().toISOString();

  let durationMs = input.durationMs;
  if (durationMs === undefined && input.timestampStarted && timestampCompleted) {
    const start = new Date(input.timestampStarted).getTime();
    const end = new Date(timestampCompleted).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      durationMs = end - start;
    }
  }

  return {
    id,
    recommendationId: input.recommendationId,
    recommendationTitle: input.recommendationTitle,
    timestampStarted: input.timestampStarted,
    timestampCompleted,
    durationMs,

    category: input.category,
    actionAvailability: input.actionAvailability,
    target: input.target,
    componentId: input.componentId,

    triggerReason: input.triggerReason,
    triggerEvidence: input.triggerEvidence,
    actionId: input.actionId,
    actionDescription: input.actionDescription,

    outcome: input.outcome,
    errorMessage: input.errorMessage,
    cancellationReason: input.cancellationReason,

    verificationType: input.verificationType,
    verificationStatus: input.verificationStatus,
    verificationMethod: input.verificationMethod,
    evidenceBefore: input.evidenceBefore,
    evidenceAfter: input.evidenceAfter,
    metricsDelta: input.metricsDelta,

    relatedMaintenanceEntryId: input.relatedMaintenanceEntryId,
    schemaVersion: input.schemaVersion || 1,
  };
}

/**
 * Valida la conformità strutturale di un record di esecuzione storica.
 */
export function validateOptimizationExecutionRecord(record: unknown): {
  isValid: boolean;
  error?: string;
} {
  if (!record || typeof record !== 'object') {
    return { isValid: false, error: 'Il record deve essere un oggetto definito.' };
  }

  const r = record as Partial<OptimizationExecutionRecord>;

  if (!r.id || typeof r.id !== 'string' || r.id.trim() === '') {
    return { isValid: false, error: 'Campo obbligatorio mancante o non valido: id' };
  }

  if (!r.recommendationId || typeof r.recommendationId !== 'string') {
    return { isValid: false, error: 'Campo obbligatorio mancante o non valido: recommendationId' };
  }

  if (!r.recommendationTitle || typeof r.recommendationTitle !== 'string') {
    return { isValid: false, error: 'Campo obbligatorio mancante o non valido: recommendationTitle' };
  }

  if (!r.timestampStarted || typeof r.timestampStarted !== 'string' || isNaN(Date.parse(r.timestampStarted))) {
    return { isValid: false, error: 'Timestamp ISO di inizio non valido: timestampStarted' };
  }

  if (!r.timestampCompleted || typeof r.timestampCompleted !== 'string' || isNaN(Date.parse(r.timestampCompleted))) {
    return { isValid: false, error: 'Timestamp ISO di completamento non valido: timestampCompleted' };
  }

  if (!r.outcome || !VALID_OPTIMIZATION_OUTCOMES.includes(r.outcome)) {
    return { isValid: false, error: `Valore non consentito per outcome: ${r.outcome}` };
  }

  if (!r.verificationType || !VALID_VERIFICATION_TYPES.includes(r.verificationType)) {
    return { isValid: false, error: `Valore non consentito per verificationType: ${r.verificationType}` };
  }

  if (!r.verificationStatus || !VALID_VERIFICATION_STATUSES.includes(r.verificationStatus)) {
    return { isValid: false, error: `Valore non consentito per verificationStatus: ${r.verificationStatus}` };
  }

  if (typeof r.schemaVersion !== 'number' || r.schemaVersion < 1) {
    return { isValid: false, error: 'schemaVersion non valido o mancante' };
  }

  return { isValid: true };
}

/**
 * Ordina una collezione di record di ottimizzazione in modo deterministico per data decrescente.
 */
export function sortOptimizationRecords(
  records: OptimizationExecutionRecord[],
  direction: 'asc' | 'desc' = 'desc'
): OptimizationExecutionRecord[] {
  return [...records].sort((a, b) => {
    const timeA = new Date(a.timestampStarted).getTime();
    const timeB = new Date(b.timestampStarted).getTime();
    const diff = direction === 'desc' ? timeB - timeA : timeA - timeB;
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Filtra i record di esecuzione storica per esito, categoria o testo di ricerca.
 */
export function filterOptimizationRecords(
  records: OptimizationExecutionRecord[],
  filters: {
    outcome?: OptimizationOutcome | 'ALL';
    verificationStatus?: OptimizationVerificationStatus | 'ALL';
    category?: string | 'ALL';
    searchQuery?: string;
  }
): OptimizationExecutionRecord[] {
  return records.filter((rec) => {
    if (filters.outcome && filters.outcome !== 'ALL' && rec.outcome !== filters.outcome) {
      return false;
    }
    if (
      filters.verificationStatus &&
      filters.verificationStatus !== 'ALL' &&
      rec.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }
    if (filters.category && filters.category !== 'ALL' && rec.category !== filters.category) {
      return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchTitle = rec.recommendationTitle.toLowerCase().includes(q);
      const matchReason = rec.triggerReason.toLowerCase().includes(q);
      const matchDesc = rec.actionDescription.toLowerCase().includes(q);
      const matchTarget = rec.target?.toLowerCase().includes(q);
      if (!matchTitle && !matchReason && !matchDesc && !matchTarget) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Helper per etichette leggibili e classi badge di stile (Dark Hardware Enthusiast).
 */
export function getOutcomeLabel(outcome: OptimizationOutcome): string {
  switch (outcome) {
    case 'success':
      return 'Riuscita';
    case 'cancelled':
      return 'Annullata';
    case 'failed':
      return 'Fallita';
    case 'skipped':
      return 'Ignorata';
  }
}

export function getOutcomeBadgeClass(outcome: OptimizationOutcome): string {
  switch (outcome) {
    case 'success':
      return 'badge-emerald';
    case 'cancelled':
      return 'badge-amber';
    case 'failed':
      return 'badge-ruby';
    case 'skipped':
      return 'badge-subtle';
  }
}

export function getVerificationStatusLabel(status: OptimizationVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verificato';
    case 'pending':
      return 'In attesa';
    case 'not_applicable':
      return 'N/A';
    case 'inconclusive':
      return 'Inconclusivo';
    case 'failed':
      return 'Non risolto';
  }
}

export function getVerificationStatusBadgeClass(status: OptimizationVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'badge-emerald';
    case 'pending':
      return 'badge-amber';
    case 'not_applicable':
      return 'badge-subtle';
    case 'inconclusive':
      return 'badge-cyan';
    case 'failed':
      return 'badge-ruby';
  }
}

export function getVerificationTypeLabel(type: OptimizationVerificationType): string {
  switch (type) {
    case 'quantitative':
      return 'Quantitativa';
    case 'state_based':
      return 'Di Stato';
    case 'command_based':
      return 'Da Comando';
    case 'manual':
      return 'Manuale';
  }
}
