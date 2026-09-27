import { describe, it, expect } from 'vitest';
import {
  getRecommendationEligibility,
  classifyRecommendationCadence,
  findRelevantExecutionRecords,
  evaluateRecommendationsWithHistory,
  SSD_TRIM_COOLDOWN_DAYS,
  RESTORE_POINT_COOLDOWN_DAYS,
  SHADER_CACHE_COOLDOWN_DAYS,
  DISM_CLEANUP_COOLDOWN_DAYS,
} from '../optimizationLifecycleEngine';
import { generateOptimizationRecommendations } from '../optimizationEngine';
import {
  OptimizationRecommendation,
  OptimizationExecutionRecord,
  SystemFactsInput,
  VolumeDriveInfo,
} from '../../types';

describe('optimizationLifecycleEngine (Tranche 5 - Optimization Memory & Lifecycle)', () => {
  const baseDate = '2026-09-24T12:00:00.000Z';

  const createSampleRecommendation = (
    id: string,
    actionId?: string,
    driveLetter?: string
  ): OptimizationRecommendation => ({
    id,
    title: `Titolo di test per ${id}`,
    category: 'storage',
    reason: 'Motivo di test per la raccomandazione',
    evidence: 'Evidenza di test',
    expectedBenefit: 'Beneficio atteso',
    risk: 'NONE',
    confidence: 'HIGH',
    actionAvailability: 'ONE_CLICK',
    rollbackAvailability: 'NOT_APPLICABLE',
    actionId: actionId || id.replace('opt-', ''),
    actionDescription: 'Descrizione azione',
    parameters: driveLetter ? { driveLetter } : undefined,
  });

  const createRecord = (
    id: string,
    recId: string,
    timestamp: string,
    outcome: OptimizationExecutionRecord['outcome'] = 'success',
    verificationStatus: OptimizationExecutionRecord['verificationStatus'] = 'verified',
    actionId?: string,
    target?: string
  ): OptimizationExecutionRecord => ({
    id,
    recommendationId: recId,
    recommendationTitle: `Titolo ${recId}`,
    timestampStarted: timestamp,
    timestampCompleted: timestamp,
    durationMs: 500,
    category: 'storage',
    actionAvailability: 'ONE_CLICK',
    target: target || 'Drive C:',
    triggerReason: 'Motivo trigger',
    triggerEvidence: 'Evidenza trigger',
    actionId: actionId || recId.replace('opt-', ''),
    actionDescription: 'Descrizione azione',
    outcome,
    verificationType: 'state_based',
    verificationStatus,
    verificationMethod: 'Verifica test',
    schemaVersion: 1,
  });

  const createDrive = (
    driveLetter: string,
    totalBytes: number,
    freeBytes: number,
    isSSD: boolean = true,
    trimSupported: boolean = true
  ): VolumeDriveInfo => ({
    driveLetter,
    label: 'Disco ' + driveLetter,
    fileSystem: 'NTFS',
    totalBytes,
    freeBytes,
    isSSD,
    mediaType: isSSD ? 'SSD' : 'HDD',
    trimSupported,
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Nessuno storico -> recommendation ELIGIBLE
  // ---------------------------------------------------------------------------
  it('1. Nessuno storico -> recommendation ELIGIBLE (mai eseguita)', () => {
    const rec = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
    const facts: SystemFactsInput = { referenceDate: baseDate, drives: [] };

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.executionCount).toBe(0);
    expect(result.lastExecution).toBeUndefined();
    expect(result.explanation).toContain('mai eseguita');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Action eseguita recentemente -> cooldown/context appropriato
  // ---------------------------------------------------------------------------
  it('2. Action periodica eseguita recentemente -> COOLDOWN con conteggio giorni rimanenti', () => {
    const rec = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
    const facts: SystemFactsInput = { referenceDate: baseDate, drives: [] };
    // Eseguita 2 giorni prima di baseDate (2026-09-22)
    const execDate = '2026-09-22T12:00:00.000Z';
    const record = createRecord('rec-1', 'opt-trim-C', execDate, 'success', 'verified');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [record],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('COOLDOWN');
    expect(result.executionCount).toBe(1);
    expect(result.lastExecution?.id).toBe('rec-1');
    expect(result.cooldownRemainingDays).toBe(SSD_TRIM_COOLDOWN_DAYS - 2);
    expect(result.explanation).toContain('periodo di riposo');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Action eseguita ma problema ancora presente -> RECURRING_ACTIVE (non nascondere!)
  // ---------------------------------------------------------------------------
  it('3. Action eseguita di recente ma condizione ancora presente -> RECURRING_ACTIVE (non nascondere)', () => {
    const rec = createSampleRecommendation('opt-cleanmgr-c', 'open-cleanmgr', 'C');
    // C: occupata al 95% (100GB totali, 5GB liberi)
    const facts: SystemFactsInput = {
      referenceDate: baseDate,
      drives: [createDrive('C:', 100_000_000_000, 5_000_000_000, true)],
    };
    // Eseguita ieri (2026-09-23)
    const execDate = '2026-09-23T12:00:00.000Z';
    const record = createRecord('rec-cleanmgr', 'opt-cleanmgr-c', execDate, 'success', 'verified');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [record],
      currentTimestamp: baseDate,
    });

    // REGOLA FONDAMENTALE: Non deve nascondere il problema attivo!
    expect(result.status).toBe('RECURRING_ACTIVE');
    expect(result.executionCount).toBe(1);
    expect(result.explanation).toContain('tuttora presente nel sistema');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Action eseguita + problema risolto -> ALREADY_RESOLVED
  // ---------------------------------------------------------------------------
  it('4. Action eseguita + problema risolto -> ALREADY_RESOLVED', () => {
    const rec = createSampleRecommendation('opt-cleanmgr-c', 'open-cleanmgr', 'C');
    // C: ora ampiamente libera al 50% (100GB totali, 50GB liberi)
    const facts: SystemFactsInput = {
      referenceDate: baseDate,
      drives: [createDrive('C:', 100_000_000_000, 50_000_000_000, true)],
    };
    const execDate = '2026-09-23T12:00:00.000Z';
    const record = createRecord('rec-cleanmgr', 'opt-cleanmgr-c', execDate, 'success', 'verified');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [record],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ALREADY_RESOLVED');
    expect(result.explanation).toContain('ha risolto la condizione rilevata');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Verification pending -> PENDING_VERIFICATION
  // ---------------------------------------------------------------------------
  it('5. Action eseguita ma verificationStatus = pending -> PENDING_VERIFICATION (non considerarla risolta)', () => {
    const rec = createSampleRecommendation('opt-clean-dust-filters', 'clean-filters');
    const facts: SystemFactsInput = { referenceDate: baseDate };
    const execDate = '2026-09-24T10:00:00.000Z';
    // Record con stato verifica pendente (es. pulizia fisica da completare o verificare)
    const record = createRecord('rec-filter', 'opt-clean-dust-filters', execDate, 'success', 'pending');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [record],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('PENDING_VERIFICATION');
    expect(result.explanation).toContain('verifica dell\'efficacia ancora in attesa');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Action failed -> non trattare come risolta (ELIGIBLE per retry)
  // ---------------------------------------------------------------------------
  it('6. Action fallita (outcome === failed) -> non trattare come risolta (resta ELIGIBLE)', () => {
    const rec = createSampleRecommendation('opt-create-restore-point', 'create-restore-point');
    const facts: SystemFactsInput = { referenceDate: baseDate };
    const execDate = '2026-09-24T11:00:00.000Z';
    const failedRecord = createRecord('rec-fail', 'opt-create-restore-point', execDate, 'failed', 'failed');
    failedRecord.errorMessage = 'Spazio insufficiente per Volume Shadow Copy';

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [failedRecord],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.executionCount).toBe(0); // Nessuna esecuzione con successo
    expect(result.explanation).toContain('non è andato a buon fine');
    expect(result.explanation).toContain('può essere ritentata');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Action cancelled -> non trattare come risolta (resta ELIGIBLE)
  // ---------------------------------------------------------------------------
  it('7. Action annullata dall\'utente (outcome === cancelled) -> resta ELIGIBLE', () => {
    const rec = createSampleRecommendation('opt-empty-recycle-bin', 'empty-recycle-bin');
    const facts: SystemFactsInput = { referenceDate: baseDate };
    const execDate = '2026-09-24T11:30:00.000Z';
    const cancelledRecord = createRecord('rec-cancel', 'opt-empty-recycle-bin', execDate, 'cancelled', 'not_applicable');
    cancelledRecord.cancellationReason = 'Operazione annullata dall\'utente al prompt';

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [cancelledRecord],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.executionCount).toBe(0);
    expect(result.explanation).toContain('annullato dall\'utente');
    expect(result.explanation).toContain('rimane disponibile');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Recommendation periodica -> nuovamente eleggibile dopo intervallo
  // ---------------------------------------------------------------------------
  it('8. Recommendation periodica -> nuovamente ELIGIBLE dopo decorso del periodo di cooldown', () => {
    const rec = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
    const facts: SystemFactsInput = { referenceDate: baseDate, drives: [] };
    // Eseguita 35 giorni prima (intervallo SSD_TRIM_COOLDOWN_DAYS = 30)
    const execDate = '2026-08-20T12:00:00.000Z';
    const record = createRecord('rec-trim-old', 'opt-trim-C', execDate, 'success', 'verified');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [record],
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.executionCount).toBe(1);
    expect(result.explanation).toContain('nuovamente eleggibile');
    expect(result.explanation).toContain('35 giorni fa');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Stato corrente cambiato -> lo storico non falsa l'attuale diagnosi
  // ---------------------------------------------------------------------------
  it('9. Stato corrente cambiato -> lo storico passato non oscura la nuova condizione attiva', () => {
    const rec = createSampleRecommendation('opt-sfc-repair', 'sfc-repair');
    // Ieri SFC era 'clean', ma oggi la scansione rileva 'corrupted'
    const facts: SystemFactsInput = {
      referenceDate: baseDate,
      systemFilesStatus: 'corrupted',
    };
    const execDate = '2026-09-20T12:00:00.000Z';
    const pastCleanRecord = createRecord('rec-sfc-clean', 'opt-sfc-repair', execDate, 'success', 'verified');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: [pastCleanRecord],
      currentTimestamp: baseDate,
    });

    // Poiché lo stato corrente è corrupted, la recommendation torna RECURRING_ACTIVE
    expect(result.status).toBe('RECURRING_ACTIVE');
    expect(result.explanation).toContain('condizione che l\'ha originata è tuttora presente');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Nessun record pertinente -> comportamento invariato rispetto a oggi
  // ---------------------------------------------------------------------------
  it('10. Nessun record pertinente nello storico per la recommendation target -> ELIGIBLE', () => {
    const rec = createSampleRecommendation('opt-clean-shader-cache', 'clean-shader-cache');
    const facts: SystemFactsInput = { referenceDate: baseDate };
    // Lo storico contiene record per ALTRE raccomandazioni (TRIM, restore point)
    const otherRecords = [
      createRecord('rec-trim', 'opt-trim-C', '2026-09-20T12:00:00.000Z', 'success', 'verified'),
      createRecord('rec-rp', 'opt-create-restore-point', '2026-09-21T12:00:00.000Z', 'success', 'verified'),
    ];

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: otherRecords,
      currentTimestamp: baseDate,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.executionCount).toBe(0);
    expect(result.lastExecution).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // TEST 11: Più execution record -> usa quello più recente secondo regola deterministica
  // ---------------------------------------------------------------------------
  it('11. Più execution record -> seleziona deterministica dell\'ultimo record e conta successi', () => {
    const rec = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
    const facts: SystemFactsInput = { referenceDate: baseDate };
    // 3 record storici per la stessa raccomandazione a date diverse
    const records = [
      createRecord('rec-1', 'opt-trim-C', '2026-08-01T10:00:00.000Z', 'success', 'verified'),
      createRecord('rec-2', 'opt-trim-C', '2026-08-15T10:00:00.000Z', 'failed', 'failed'),
      createRecord('rec-3', 'opt-trim-C', '2026-09-20T10:00:00.000Z', 'success', 'verified'),
    ];

    const matches = findRelevantExecutionRecords(rec, records);
    expect(matches).toHaveLength(3);
    // Il più recente è rec-3 (2026-09-20)
    expect(matches[0].id).toBe('rec-3');

    const result = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history: records,
      currentTimestamp: baseDate,
    });

    // 2026-09-20 rispetto al 2026-09-24 = 4 giorni < 30 -> COOLDOWN
    expect(result.status).toBe('COOLDOWN');
    expect(result.lastExecution?.id).toBe('rec-3');
    expect(result.executionCount).toBe(2); // rec-1 e rec-3 riuscite
  });

  // ---------------------------------------------------------------------------
  // TEST 12: Timestamp identici -> tie-break deterministico stabile su ID
  // ---------------------------------------------------------------------------
  it('12. Timestamp identici -> ordinamento deterministico stabile tramite ID', () => {
    const rec = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
    const sameTime = '2026-09-20T12:00:00.000Z';
    const recordA = createRecord('rec-alpha', 'opt-trim-C', sameTime);
    const recordZ = createRecord('rec-zeta', 'opt-trim-C', sameTime);

    const order1 = findRelevantExecutionRecords(rec, [recordA, recordZ]);
    const order2 = findRelevantExecutionRecords(rec, [recordZ, recordA]);

    // L'ordine deve essere identico in entrambi i casi grazie a localeCompare su ID
    expect(order1.map((r) => r.id)).toEqual(order2.map((r) => r.id));
    expect(order1[0].id).toBe('rec-alpha'); // 'rec-alpha' precede 'rec-zeta' in localeCompare
  });


  // ---------------------------------------------------------------------------
  // TEST 13: Backup legacy senza optimizationHistory -> nessuna regressione
  // ---------------------------------------------------------------------------
  it('13. Backup legacy senza optimizationHistory (undefined o vuoto) -> nessuna regressione', () => {
    const facts: SystemFactsInput = {
      referenceDate: baseDate,
      drives: [createDrive('C:', 1_000_000_000_000, 500_000_000_000, true, true)],
      maintenanceEntries: [],
    };

    // Chiamata con optimizationHistory non passato o vuoto (come nei backup pre-Tranche 4/5)
    const report1 = generateOptimizationRecommendations(facts, undefined, undefined);
    const report2 = generateOptimizationRecommendations(facts, undefined, []);

    expect(report1.totalCount).toBeGreaterThanOrEqual(1);
    expect(report1.totalCount).toBe(report2.totalCount);
    expect(report1.recommendations[0].eligibility).toBe('ELIGIBLE');
    expect(report1.recommendations[0].executionCount).toBe(0);
    expect(report1.resolvedOrCooldownRecommendations).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // TEST 14: Classificazione della cadenza deterministica
  // ---------------------------------------------------------------------------
  describe('Classificazione Cadenza Raccomandazioni', () => {
    it('classifica correttamente ONE_SHOT, PERIODIC, STATE_REMEDIATION, MANUAL_MAINTENANCE, DIAGNOSTIC', () => {
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-ultimate-performance'))).toBe('ONE_SHOT');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-enable-secure-boot'))).toBe('ONE_SHOT');

      expect(classifyRecommendationCadence(createSampleRecommendation('opt-trim-C'))).toBe('PERIODIC');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-create-restore-point'))).toBe('PERIODIC');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-clean-shader-cache'))).toBe('PERIODIC');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-clean-component-store'))).toBe('PERIODIC');

      expect(classifyRecommendationCadence(createSampleRecommendation('opt-cleanmgr-c'))).toBe('STATE_REMEDIATION');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-empty-recycle-bin'))).toBe('STATE_REMEDIATION');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-sfc-repair'))).toBe('STATE_REMEDIATION');

      expect(classifyRecommendationCadence(createSampleRecommendation('opt-clean-dust-filters'))).toBe('MANUAL_MAINTENANCE');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-replace-thermal-paste'))).toBe('MANUAL_MAINTENANCE');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-cooling-baseline-divergence'))).toBe('MANUAL_MAINTENANCE');

      expect(classifyRecommendationCadence(createSampleRecommendation('opt-ram-pressure-triage'))).toBe('DIAGNOSTIC');
      expect(classifyRecommendationCadence(createSampleRecommendation('opt-chkdsk-scan-C'))).toBe('DIAGNOSTIC');

      // Verifica costanti di cooldown tecnicamente motivate
      expect(SSD_TRIM_COOLDOWN_DAYS).toBe(30);
      expect(RESTORE_POINT_COOLDOWN_DAYS).toBe(14);
      expect(SHADER_CACHE_COOLDOWN_DAYS).toBe(14);
      expect(DISM_CLEANUP_COOLDOWN_DAYS).toBe(60);
    });
  });


  // ---------------------------------------------------------------------------
  // TEST 15: Integrazione evaluateRecommendationsWithHistory e separazione Cooldown
  // ---------------------------------------------------------------------------
  describe('evaluateRecommendationsWithHistory', () => {
    it('separa le raccomandazioni in attive e in riposo (cooldown)', () => {
      const recTrim = createSampleRecommendation('opt-trim-C', 'run-trim', 'C');
      const recCleanmgr = createSampleRecommendation('opt-cleanmgr-c', 'open-cleanmgr', 'C');

      const facts: SystemFactsInput = {
        referenceDate: baseDate,
        drives: [createDrive('C:', 100_000_000_000, 5_000_000_000, true)], // 95% full
      };

      // TRIM eseguito 2 giorni fa (cooldown), Cleanmgr eseguito ieri (ma C: ancora 95% piena)
      const history = [
        createRecord('r1', 'opt-trim-C', '2026-09-22T12:00:00.000Z', 'success', 'verified'),
        createRecord('r2', 'opt-cleanmgr-c', '2026-09-23T12:00:00.000Z', 'success', 'verified'),
      ];

      const { actionableRecommendations, resolvedOrCooldownRecommendations, byEligibility } =
        evaluateRecommendationsWithHistory([recTrim, recCleanmgr], facts, history, baseDate);

      // TRIM deve essere in riposo (COOLDOWN), non spammato all'utente
      expect(resolvedOrCooldownRecommendations).toHaveLength(1);
      expect(resolvedOrCooldownRecommendations[0].id).toBe('opt-trim-C');
      expect(resolvedOrCooldownRecommendations[0].eligibility).toBe('COOLDOWN');

      // Cleanmgr deve essere attivo con stato RECURRING_ACTIVE perché C: è ancora al 95%
      expect(actionableRecommendations).toHaveLength(1);
      expect(actionableRecommendations[0].id).toBe('opt-cleanmgr-c');
      expect(actionableRecommendations[0].eligibility).toBe('RECURRING_ACTIVE');

      expect(byEligibility.COOLDOWN).toBe(1);
      expect(byEligibility.RECURRING_ACTIVE).toBe(1);
    });
  });
});
