import { describe, it, expect } from 'vitest';
import {
  createOptimizationExecutionRecord,
  validateOptimizationExecutionRecord,
  sortOptimizationRecords,
  filterOptimizationRecords,
  determineVerificationType,
  getOutcomeBadgeClass,
  getOutcomeLabel,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
  getVerificationTypeLabel,
} from '../optimizationHistoryEngine';
import {
  CreateOptimizationRecordInput,
  OptimizationRecommendation,
} from '../../types';

describe('optimizationHistoryEngine - Data Model, Lifecycle & Verification', () => {
  const baseInput: CreateOptimizationRecordInput = {
    recommendationId: 'rec-test-1',
    recommendationTitle: 'Svuota Cestino di Windows',
    timestampStarted: '2026-09-25T10:00:00.000Z',
    timestampCompleted: '2026-09-25T10:00:02.000Z',
    category: 'storage',
    actionAvailability: 'USER_CONFIRMED',
    target: 'Cestino di Windows',
    triggerReason: 'Il cestino supera la soglia raccomandata.',
    triggerEvidence: '4.8 GB occupati',
    actionId: 'empty-recycle-bin',
    actionDescription: 'Svuotamento programmatico del cestino',
    outcome: 'success',
    verificationType: 'quantitative',
    verificationStatus: 'verified',
    verificationMethod: 'Verifica dimensione cestino post-svuotamento',
    evidenceBefore: { summary: '4.8 GB (120 elementi)', metrics: { totalSizeBytes: 4800000000, itemCount: 120 } },
    evidenceAfter: { summary: '0 Byte (0 elementi)', metrics: { totalSizeBytes: 0, itemCount: 0 } },
    metricsDelta: { numericChange: 4800000000, unit: 'bytes', description: 'Liberati 4.8 GB' },
  };

  describe('DATA MODEL & SCHEMA VERSION', () => {
    it('crea un record valido con schemaVersion = 1 e calcolo durata ms', () => {
      const record = createOptimizationExecutionRecord(baseInput);

      expect(record.id).toBeDefined();
      expect(record.schemaVersion).toBe(1);
      expect(record.recommendationId).toBe('rec-test-1');
      expect(record.recommendationTitle).toBe('Svuota Cestino di Windows');
      expect(record.durationMs).toBe(2000);
      expect(record.outcome).toBe('success');
      expect(record.verificationType).toBe('quantitative');
      expect(record.verificationStatus).toBe('verified');
    });

    it('valida con successo un record ben formato', () => {
      const record = createOptimizationExecutionRecord(baseInput);
      const res = validateOptimizationExecutionRecord(record);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rifiuta un record privo di id', () => {
      const invalid = { ...createOptimizationExecutionRecord(baseInput), id: '' };
      const res = validateOptimizationExecutionRecord(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('id');
    });

    it('rifiuta un record privo di recommendationId o recommendationTitle', () => {
      const invalid = { ...createOptimizationExecutionRecord(baseInput), recommendationTitle: '' };
      const res = validateOptimizationExecutionRecord(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('recommendationTitle');
    });

    it('rifiuta timestamp ISO non validi', () => {
      const invalid = { ...createOptimizationExecutionRecord(baseInput), timestampStarted: 'not-a-date' };
      const res = validateOptimizationExecutionRecord(invalid);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('timestampStarted');
    });

    it('rifiuta valori outcome o status non presenti negli enum', () => {
      const invalidOutcome = { ...createOptimizationExecutionRecord(baseInput), outcome: 'unknown' as any };
      expect(validateOptimizationExecutionRecord(invalidOutcome).isValid).toBe(false);

      const invalidStatus = { ...createOptimizationExecutionRecord(baseInput), verificationStatus: 'unknown' as any };
      expect(validateOptimizationExecutionRecord(invalidStatus).isValid).toBe(false);
    });
  });

  describe('LIFECYCLE OUTCOMES', () => {
    it('rappresenta correttamente lo stato success', () => {
      const rec = createOptimizationExecutionRecord({
        ...baseInput,
        outcome: 'success',
        verificationStatus: 'verified',
      });
      expect(rec.outcome).toBe('success');
      expect(getOutcomeLabel(rec.outcome)).toBe('Riuscita');
      expect(getOutcomeBadgeClass(rec.outcome)).toBe('badge-emerald');
    });

    it('rappresenta correttamente lo stato cancelled con cancellationReason', () => {
      const rec = createOptimizationExecutionRecord({
        ...baseInput,
        outcome: 'cancelled',
        cancellationReason: 'Annullato dall\'utente al prompt di conferma',
        verificationStatus: 'not_applicable',
      });
      expect(rec.outcome).toBe('cancelled');
      expect(rec.cancellationReason).toBe('Annullato dall\'utente al prompt di conferma');
      expect(getOutcomeLabel(rec.outcome)).toBe('Annullata');
      expect(getOutcomeBadgeClass(rec.outcome)).toBe('badge-amber');
      expect(rec.verificationStatus).toBe('not_applicable');
    });

    it('rappresenta correttamente lo stato failed con errorMessage', () => {
      const rec = createOptimizationExecutionRecord({
        ...baseInput,
        outcome: 'failed',
        errorMessage: 'Accesso negato: richiesta elevazione UAC',
        verificationStatus: 'failed',
      });
      expect(rec.outcome).toBe('failed');
      expect(rec.errorMessage).toBe('Accesso negato: richiesta elevazione UAC');
      expect(getOutcomeLabel(rec.outcome)).toBe('Fallita');
      expect(getOutcomeBadgeClass(rec.outcome)).toBe('badge-ruby');
      expect(rec.verificationStatus).toBe('failed');
    });

    it('rappresenta correttamente lo stato skipped', () => {
      const rec = createOptimizationExecutionRecord({
        ...baseInput,
        outcome: 'skipped',
        verificationStatus: 'not_applicable',
      });
      expect(rec.outcome).toBe('skipped');
      expect(getOutcomeLabel(rec.outcome)).toBe('Ignorata');
      expect(getOutcomeBadgeClass(rec.outcome)).toBe('badge-subtle');
    });
  });

  describe('VERIFICATION TAXONOMY & DETERMINATION', () => {
    it('determina quantitative per svuota cestino e shader cache', () => {
      const rec1: OptimizationRecommendation = {
        id: 'r1',
        title: 'Cestino',
        category: 'storage',
        reason: 'Spazio',
        evidence: '5 GB',
        expectedBenefit: 'Recupero',
        risk: 'LOW',
        confidence: 'HIGH',
        actionAvailability: 'USER_CONFIRMED',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'empty-recycle-bin',
      };
      expect(determineVerificationType(rec1)).toBe('quantitative');

      const rec2: OptimizationRecommendation = {
        ...rec1,
        actionId: 'clean-shader-cache',
      };
      expect(determineVerificationType(rec2)).toBe('quantitative');
      expect(getVerificationTypeLabel('quantitative')).toBe('Quantitativa');
    });

    it('determina state_based per TRIM ed Ultimate Performance', () => {
      const trimRec: OptimizationRecommendation = {
        id: 'r-trim',
        title: 'TRIM SSD',
        category: 'storage',
        reason: 'TRIM non recente',
        evidence: '> 30gg',
        expectedBenefit: 'Performance scrittura',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'ONE_CLICK',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'run-trim',
      };
      expect(determineVerificationType(trimRec)).toBe('state_based');
      expect(getVerificationTypeLabel('state_based')).toBe('Di Stato');
    });

    it('determina command_based per comandi diagnostici e di sistema Windows', () => {
      const sfcRec: OptimizationRecommendation = {
        id: 'r-sfc',
        title: 'SFC',
        category: 'system',
        reason: 'File corrotti',
        evidence: 'Corruzione rilevata',
        expectedBenefit: 'Stabilità',
        risk: 'LOW',
        confidence: 'HIGH',
        actionAvailability: 'ASSISTED',
        rollbackAvailability: 'MANUAL_RESTORE',
        actionId: 'sfc-repair',
      };
      expect(determineVerificationType(sfcRec)).toBe('command_based');
      expect(getVerificationTypeLabel('command_based')).toBe('Da Comando');
    });

    it('determina manual per azioni fisiche o di consultazione (pasta termica, filtri)', () => {
      const pasteRec: OptimizationRecommendation = {
        id: 'r-paste',
        title: 'Pasta Termica',
        category: 'thermal',
        reason: 'Pasta vecchia',
        evidence: '3 anni fa',
        expectedBenefit: 'Temperature',
        risk: 'MODERATE',
        confidence: 'MEDIUM',
        actionAvailability: 'MANUAL',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'apply-thermal-paste',
      };
      expect(determineVerificationType(pasteRec)).toBe('manual');
      expect(getVerificationTypeLabel('manual')).toBe('Manuale');
    });

    it('fornisce badge e label coerenti per tutti i verificationStatus', () => {
      expect(getVerificationStatusLabel('verified')).toBe('Verificato');
      expect(getVerificationStatusBadgeClass('verified')).toBe('badge-emerald');

      expect(getVerificationStatusLabel('pending')).toBe('In attesa');
      expect(getVerificationStatusBadgeClass('pending')).toBe('badge-amber');

      expect(getVerificationStatusLabel('not_applicable')).toBe('N/A');
      expect(getVerificationStatusBadgeClass('not_applicable')).toBe('badge-subtle');

      expect(getVerificationStatusLabel('inconclusive')).toBe('Inconclusivo');
      expect(getVerificationStatusBadgeClass('inconclusive')).toBe('badge-cyan');

      expect(getVerificationStatusLabel('failed')).toBe('Non risolto');
      expect(getVerificationStatusBadgeClass('failed')).toBe('badge-ruby');
    });
  });

  describe('EVIDENCE HANDLING', () => {
    it('gestisce evidenza prima e dopo strutturata', () => {
      const rec = createOptimizationExecutionRecord(baseInput);
      expect(typeof rec.evidenceBefore).toBe('object');
      expect((rec.evidenceBefore as any).summary).toBe('4.8 GB (120 elementi)');
      expect((rec.evidenceAfter as any).summary).toBe('0 Byte (0 elementi)');
      expect(rec.metricsDelta?.numericChange).toBe(4800000000);
    });

    it('supporta evidenza assente o stringa semplice', () => {
      const rec = createOptimizationExecutionRecord({
        ...baseInput,
        evidenceBefore: 'Non verificato in precedenza',
        evidenceAfter: undefined,
        metricsDelta: undefined,
      });
      expect(rec.evidenceBefore).toBe('Non verificato in precedenza');
      expect(rec.evidenceAfter).toBeUndefined();
      expect(rec.metricsDelta).toBeUndefined();
    });
  });

  describe('SORTING & FILTERING', () => {
    const rec1 = createOptimizationExecutionRecord({
      ...baseInput,
      id: 'opt-1',
      timestampStarted: '2026-09-20T10:00:00.000Z',
      outcome: 'success',
      category: 'storage',
    });
    const rec2 = createOptimizationExecutionRecord({
      ...baseInput,
      id: 'opt-2',
      timestampStarted: '2026-09-25T12:00:00.000Z',
      outcome: 'cancelled',
      category: 'system',
    });
    const rec3 = createOptimizationExecutionRecord({
      ...baseInput,
      id: 'opt-3',
      timestampStarted: '2026-09-22T08:00:00.000Z',
      outcome: 'failed',
      category: 'thermal',
    });

    it('ordina in modo deterministico per data decrescente (più recenti prima)', () => {
      const sorted = sortOptimizationRecords([rec1, rec2, rec3], 'desc');
      expect(sorted.map((r) => r.id)).toEqual(['opt-2', 'opt-3', 'opt-1']);
    });

    it('ordina in modo deterministico per data crescente', () => {
      const sorted = sortOptimizationRecords([rec1, rec2, rec3], 'asc');
      expect(sorted.map((r) => r.id)).toEqual(['opt-1', 'opt-3', 'opt-2']);
    });

    it('filtra per outcome', () => {
      const list = [rec1, rec2, rec3];
      expect(filterOptimizationRecords(list, { outcome: 'success' })).toHaveLength(1);
      expect(filterOptimizationRecords(list, { outcome: 'cancelled' })).toHaveLength(1);
      expect(filterOptimizationRecords(list, { outcome: 'ALL' })).toHaveLength(3);
    });

    it('filtra per categoria e testo di ricerca', () => {
      const list = [rec1, rec2, rec3];
      expect(filterOptimizationRecords(list, { category: 'storage' })).toHaveLength(1);
      expect(filterOptimizationRecords(list, { searchQuery: 'cestino' })).toHaveLength(3); // baseInput has 'Cestino' in title
      expect(filterOptimizationRecords(list, { searchQuery: 'inesistente' })).toHaveLength(0);
    });
  });
});
