/**
 * Optimization Lifecycle Engine — Motore puro per il ciclo di vita delle raccomandazioni
 * e la memoria di ottimizzazione (PC Care Center - Tranche 5)
 * 
 * Trasforma lo storico delle esecuzioni in contesto deterministico:
 * NEW -> RECOMMENDED -> EXECUTED -> VERIFIED / PENDING -> COOLDOWN -> ELIGIBLE AGAIN
 * 
 * Regola fondamentale: Lo storico non deve mai nascondere da solo un problema attivo.
 */

import {
  OptimizationRecommendation,
  RecommendationCadenceType,
  RecommendationEligibilityStatus,
} from '../types/optimization';
import { OptimizationExecutionRecord } from '../types/optimizationHistory';
import { SystemFactsInput } from '../types/health';
import { isMetricAvailable } from '../services/monitoringService';


// ---------------------------------------------------------------------------
// 1. COSTANTI DI CADENZA E COOLDOWN TECNICAMENTE MOTIVATE
// ---------------------------------------------------------------------------

/**
 * 30 giorni: Ciclo standard di manutenzione TRIM per dischi a stato solido (SSD).
 * Eseguire TRIM più frequentemente non offre benefici di usura o velocità e
 * genera comandi ReTrim ridondanti sul controller storage.
 */
export const SSD_TRIM_COOLDOWN_DAYS = 30;

/**
 * 14 giorni: Cadenza consigliata per i Punti di Ripristino di sistema (VSS).
 * Creare snapshot troppo frequentemente consuma spazio riservato per le copie shadow su C:,
 * mentre un intervallo bisettimanale garantisce un punto recente prima degli aggiornamenti.
 */
export const RESTORE_POINT_COOLDOWN_DAYS = 14;

/**
 * 14 giorni: Igiene della cache shader DirectX / driver GPU.
 * La ricompilazione continua degli shader causa spike di CPU e micro-stuttering nei giochi;
 * cancellare la cache ogni giorno è controproducente. 14 giorni è un intervallo equilibrato.
 */
export const SHADER_CACHE_COOLDOWN_DAYS = 14;

/**
 * 60 giorni: Consolidamento archivio componenti Windows (DISM WinSxS).
 * L'operazione StartComponentCleanup impegna CPU e I/O per diversi minuti;
 * è consigliata solo a valle degli aggiornamenti cumulativi mensili di sistema.
 */
export const DISM_CLEANUP_COOLDOWN_DAYS = 60;

/**
 * 7 giorni: Scansione non distruttiva del file system (CHKDSK read-only).
 * Evita di ripetere la scansione all'infinito a meno che non compaiano nuovi errori I/O.
 */
export const CHKDSK_COOLDOWN_DAYS = 7;

/**
 * 180 giorni (6 mesi): Pulizia fisica dei filtri antipolvere del case del PC.
 */
export const DUST_FILTERS_COOLDOWN_DAYS = 180;

/**
 * 730 giorni (2 anni): Intervallo tipico di degradazione/essiccamento della pasta termica.
 */
export const THERMAL_PASTE_COOLDOWN_DAYS = 730;

/**
 * 1 ora: Finestra temporale di riesame per il triage della memoria RAM prima di riproporre la notifica.
 */
export const RAM_TRIAGE_COOLDOWN_HOURS = 1;

/**
 * 24 ore: Intervallo prima di riproporre l'avvio di Cleanmgr se la saturazione disco persiste.
 */
export const CLEANMGR_RECURRENCE_HOURS = 24;

// ---------------------------------------------------------------------------
// 2. CLASSIFICAZIONE DELLA CADENZA DELLE RACCOMANDAZIONI
// ---------------------------------------------------------------------------

/**
 * Classifica in modo deterministico la natura semantica della raccomandazione.
 */
export function classifyRecommendationCadence(rec: OptimizationRecommendation): RecommendationCadenceType {
  const id = rec.id || '';
  const actionId = rec.actionId || '';

  // A. ONE_SHOT: Interventi di configurazione una tantum
  if (id === 'opt-ultimate-performance' || id === 'opt-enable-secure-boot') {
    return 'ONE_SHOT';
  }

  // B. PERIODIC: Manutenzioni con ciclo temporale fisiologico
  if (
    id.startsWith('opt-trim-') ||
    id === 'opt-create-restore-point' ||
    id === 'opt-clean-shader-cache' ||
    id === 'opt-clean-component-store'
  ) {
    return 'PERIODIC';
  }

  // C. MANUAL_MAINTENANCE: Interventi fisici a cura dell'utente
  if (
    id === 'opt-clean-dust-filters' ||
    id === 'opt-replace-thermal-paste' ||
    id === 'opt-cooling-baseline-divergence' ||
    id === 'opt-cpu-baseline-divergence'
  ) {
    return 'MANUAL_MAINTENANCE';
  }

  // D. DIAGNOSTIC: Consultazioni di sola lettura senza modifiche
  if (
    id === 'opt-ram-pressure-triage' ||
    id === 'opt-gpu-idle-thermals' ||
    id.startsWith('opt-chkdsk-scan-') ||
    rec.actionAvailability === 'READ_ONLY'
  ) {
    return 'DIAGNOSTIC';
  }

  // E. STATE_REMEDIATION: Azioni legate a specifiche condizioni transitorie
  if (
    id === 'opt-cleanmgr-c' ||
    id === 'opt-empty-recycle-bin' ||
    id === 'opt-sfc-repair' ||
    id === 'opt-winget-updates' ||
    actionId === 'empty-recycle-bin' ||
    actionId === 'open-cleanmgr'
  ) {
    return 'STATE_REMEDIATION';
  }

  return 'STATE_REMEDIATION';
}

// ---------------------------------------------------------------------------
// 3. RECUPERO RECORD STORICI PERTINENTI
// ---------------------------------------------------------------------------

/**
 * Trova tutti i record storici collegati a una raccomandazione specifica,
 * ordinati in modo rigoroso per timestamp decrescente (più recente per primo),
 * con tie-break deterministico sull'ID in caso di timestamp identico.
 */
export function findRelevantExecutionRecords(
  rec: OptimizationRecommendation,
  history: OptimizationExecutionRecord[]
): OptimizationExecutionRecord[] {
  const recId = rec.id;
  const actionId = rec.actionId;
  const driveLetter = typeof rec.parameters?.driveLetter === 'string'
    ? rec.parameters.driveLetter.toUpperCase().replace(':', '')
    : undefined;

  const matches = history.filter((r) => {
    // 1. Corrispondenza primaria per recommendationId esatto
    if (r.recommendationId === recId) {
      return true;
    }

    // 2. Corrispondenza secondaria per actionId + target coerente
    if (actionId && r.actionId === actionId) {
      if (driveLetter) {
        return r.target ? r.target.toUpperCase().includes(driveLetter) : true;
      }
      return true;
    }

    return false;
  });

  return matches.sort((a, b) => {
    const timeA = new Date(a.timestampStarted).getTime();
    const timeB = new Date(b.timestampStarted).getTime();
    const diff = timeB - timeA;
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

// ---------------------------------------------------------------------------
// 4. FUNZIONE DI ELIGIBILITY PURA
// ---------------------------------------------------------------------------

export interface EligibilityEvaluationInput {
  facts: SystemFactsInput;
  recommendation: OptimizationRecommendation;
  history: OptimizationExecutionRecord[];
  currentTimestamp?: string;
}

export interface RecommendationEligibilityResult {
  status: RecommendationEligibilityStatus;
  cadenceType: RecommendationCadenceType;
  lastExecution?: OptimizationExecutionRecord;
  executionCount: number;
  explanation: string;
  cooldownRemainingDays?: number;
}

/**
 * Calcola in modo puro e deterministico lo stato di eleggibilità di una raccomandazione,
 * integrando i fatti attuali con la memoria storica delle esecuzioni passate.
 */
export function getRecommendationEligibility({
  facts,
  recommendation: rec,
  history,
  currentTimestamp,
}: EligibilityEvaluationInput): RecommendationEligibilityResult {
  const cadenceType = rec.cadenceType || classifyRecommendationCadence(rec);
  const relevantRecords = findRelevantExecutionRecords(rec, history);
  const now = currentTimestamp ? new Date(currentTimestamp) : new Date(facts.referenceDate || new Date().toISOString());

  // Nessuno storico registrato
  if (relevantRecords.length === 0) {
    return {
      status: 'ELIGIBLE',
      cadenceType,
      executionCount: 0,
      explanation: 'Nuova raccomandazione (mai eseguita in precedenza).',
    };
  }

  // Calcolo conteggio esecuzioni riuscite
  const successRecords = relevantRecords.filter((r) => r.outcome === 'success');
  const executionCount = successRecords.length;

  // L'ultimo record registrato in assoluto
  const lastRecord = relevantRecords[0];
  const lastExecDate = new Date(lastRecord.timestampCompleted || lastRecord.timestampStarted);
  const elapsedMs = Math.max(0, now.getTime() - lastExecDate.getTime());
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  const formattedDate = !isNaN(lastExecDate.getTime())
    ? lastExecDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'data recente';

  // 1. CASO: Ultima azione annullata dall'utente
  if (lastRecord.outcome === 'cancelled') {
    return {
      status: 'ELIGIBLE',
      cadenceType,
      lastExecution: lastRecord,
      executionCount,
      explanation: `Ultimo tentativo annullato dall'utente il ${formattedDate}. L'azione rimane disponibile per essere eseguita.`,
    };
  }

  // 2. CASO: Ultima azione fallita con errore tecnico
  if (lastRecord.outcome === 'failed') {
    return {
      status: 'ELIGIBLE',
      cadenceType,
      lastExecution: lastRecord,
      executionCount,
      explanation: `L'ultimo tentativo del ${formattedDate} non è andato a buon fine (${lastRecord.errorMessage || 'errore di sistema'}). L'azione può essere ritentata.`,
    };
  }

  // 3. CASO: Verifica dell'efficacia in attesa (PENDING)
  if (
    lastRecord.verificationStatus === 'pending' ||
    lastRecord.verificationStatus === 'inconclusive'
  ) {
    return {
      status: 'PENDING_VERIFICATION',
      cadenceType,
      lastExecution: lastRecord,
      executionCount,
      explanation: `Intervento registrato il ${formattedDate} — verifica dell'efficacia ancora in attesa (richiede nuovo ciclo di carico o riavvio).`,
    };
  }

  // 4. CASO: Ultima azione riuscita (success) e verificata -> valutazione in base alla cadenza
  switch (cadenceType) {
    case 'ONE_SHOT': {
      // Se è one-shot ed è stata verificata con successo, la raccomandazione è risolta
      // a meno che la condizione non sia chiaramente disabilitata di nuovo (es. secure boot)
      if (rec.id === 'opt-enable-secure-boot') {
        if (facts.securityAudit?.secureBootEnabled === false) {
          return {
            status: 'RECURRING_ACTIVE',
            cadenceType,
            lastExecution: lastRecord,
            executionCount,
            explanation: `Istruzioni per Secure Boot già consultate il ${formattedDate}, ma il firmware segnala ancora Secure Boot disabilitato.`,
          };
        }
      }

      return {
        status: 'ALREADY_RESOLVED',
        cadenceType,
        lastExecution: lastRecord,
        executionCount,
        explanation: `Configurazione applicata e verificata con successo il ${formattedDate}.`,
      };
    }

    case 'PERIODIC': {
      const cooldownDays = getCooldownDaysForRecommendation(rec.id);
      if (elapsedDays < cooldownDays) {
        const remainingDays = cooldownDays - elapsedDays;
        return {
          status: 'COOLDOWN',
          cadenceType,
          lastExecution: lastRecord,
          executionCount,
          cooldownRemainingDays: remainingDays,
          explanation: `Ottimizzazione eseguita con successo ${elapsedDays} giorni fa (${formattedDate}). In periodo di riposo: prossima esecuzione consigliata tra ${remainingDays} giorni.`,
        };
      }

      return {
        status: 'ELIGIBLE',
        cadenceType,
        lastExecution: lastRecord,
        executionCount,
        explanation: `Manutenzione periodica nuovamente eleggibile (ultima esecuzione: ${elapsedDays} giorni fa, il ${formattedDate}).`,
      };
    }

    case 'STATE_REMEDIATION': {
      // REGOLA FONDAMENTALE: LO STORICO NON DEVE DA SOLO NASCONDERE UN PROBLEMA ATTUALE.
      // Verifichiamo se la condizione che ha originato la proposta è ancora attiva nei fatti correnti.
      const isConditionActive = checkConditionIsActive(rec.id, facts);

      if (isConditionActive) {
        return {
          status: 'RECURRING_ACTIVE',
          cadenceType,
          lastExecution: lastRecord,
          executionCount,
          explanation: `Questa ottimizzazione era già stata eseguita il ${formattedDate}, ma la condizione che l'ha originata è tuttora presente nel sistema.`,
        };
      }

      return {
        status: 'ALREADY_RESOLVED',
        cadenceType,
        lastExecution: lastRecord,
        executionCount,
        explanation: `L'intervento eseguito il ${formattedDate} ha risolto la condizione rilevata. La raccomandazione non viene riproposta.`,
      };
    }

    case 'MANUAL_MAINTENANCE': {
      const cooldownDays = getCooldownDaysForRecommendation(rec.id);
      if (elapsedDays < cooldownDays) {
        const remainingDays = cooldownDays - elapsedDays;
        return {
          status: 'COOLDOWN',
          cadenceType,
          lastExecution: lastRecord,
          executionCount,
          cooldownRemainingDays: remainingDays,
          explanation: `Intervento di manutenzione registrato il ${formattedDate}. Prossimo controllo consigliato tra ${remainingDays} giorni.`,
        };
      }

      return {
        status: 'ELIGIBLE',
        cadenceType,
        lastExecution: lastRecord,
        executionCount,
        explanation: `Manutenzione fisica consigliata: sono trascorsi ${elapsedDays} giorni dall'ultimo intervento registrato.`,
      };
    }

    case 'DIAGNOSTIC': {
      const isConditionActive = checkConditionIsActive(rec.id, facts);

      if (isConditionActive) {
        if (rec.id.startsWith('opt-chkdsk-scan-')) {
          if (elapsedDays < CHKDSK_COOLDOWN_DAYS) {
            return {
              status: 'COOLDOWN',
              cadenceType,
              lastExecution: lastRecord,
              executionCount,
              cooldownRemainingDays: CHKDSK_COOLDOWN_DAYS - elapsedDays,
              explanation: `Scansione integrità file system completata di recente (${formattedDate}). In assenza di ulteriori errori I/O non è necessario ripeterla immediatamente.`,
            };
          }
        }

        if (elapsedHours < RAM_TRIAGE_COOLDOWN_HOURS) {
          return {
            status: 'RECURRING_ACTIVE',
            cadenceType,
            lastExecution: lastRecord,
            executionCount,
            explanation: `Diagnostica consultata di recente (${elapsedHours} ore fa), ma la saturazione anomala persiste.`,
          };
        }

        return {
          status: 'ELIGIBLE',
          cadenceType,
          lastExecution: lastRecord,
          executionCount,
          explanation: `Diagnostica consultata in precedenza il ${formattedDate}; la condizione anomala è ancora rilevata.`,
        };
      }

      return {
        status: 'ALREADY_RESOLVED',
        cadenceType,
        lastExecution: lastRecord,
        executionCount,
        explanation: `La condizione diagnostica precedente è rientrata nei parametri ottimali.`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// 5. HELPER INTERNI PER VERIFICA CONDIZIONI E COOLDOWN
// ---------------------------------------------------------------------------

function getCooldownDaysForRecommendation(id: string): number {
  if (id.startsWith('opt-trim-')) return SSD_TRIM_COOLDOWN_DAYS;
  if (id === 'opt-create-restore-point') return RESTORE_POINT_COOLDOWN_DAYS;
  if (id === 'opt-clean-shader-cache') return SHADER_CACHE_COOLDOWN_DAYS;
  if (id === 'opt-clean-component-store') return DISM_CLEANUP_COOLDOWN_DAYS;
  if (id === 'opt-clean-dust-filters') return DUST_FILTERS_COOLDOWN_DAYS;
  if (id === 'opt-replace-thermal-paste') return THERMAL_PASTE_COOLDOWN_DAYS;
  if (id.startsWith('opt-chkdsk-scan-')) return CHKDSK_COOLDOWN_DAYS;
  return 14;
}

/**
 * Controlla se la condizione di trigger è oggettivamente ancora presente nei facts correnti.
 */
function checkConditionIsActive(id: string, facts: SystemFactsInput): boolean {
  if (id === 'opt-cleanmgr-c') {
    const cDrive = (facts.drives || []).find((d) => d.driveLetter.toUpperCase().startsWith('C'))
      || (facts.monitoring?.storage || []).find((s) => s.driveLetter.toUpperCase().startsWith('C'));
    if (!cDrive || cDrive.totalBytes <= 0) return false;
    const usagePct = ((cDrive.totalBytes - cDrive.freeBytes) / cDrive.totalBytes) * 100;
    return usagePct >= 82;
  }

  if (id === 'opt-empty-recycle-bin') {
    if (!facts.recycleBin) return false;
    return facts.recycleBin.totalSizeBytes >= 500 * 1024 * 1024 || facts.recycleBin.itemCount >= 50;
  }

  if (id === 'opt-sfc-repair') {
    return facts.systemFilesStatus === 'corrupted';
  }

  if (id === 'opt-winget-updates') {
    return (facts.wingetUpdates || []).length > 0;
  }

  if (id === 'opt-ram-pressure-triage') {
    return (facts.monitoring?.memory?.utilizationPercent ?? 0) >= 90;
  }

  if (id === 'opt-enable-secure-boot') {
    return facts.securityAudit?.secureBootEnabled === false;
  }

  if (id.startsWith('opt-chkdsk-scan-')) {
    return (facts.smartDisks || []).some((d) => d.readErrorsTotal > 0 || d.writeErrorsTotal > 0);
  }

  if (id === 'opt-gpu-idle-thermals') {
    const gpus = facts.monitoring?.gpus || [];
    const primary = gpus.find((g) => g.isDiscrete) || gpus[0];
    if (!primary || !isMetricAvailable(primary.coreTemperatureCelsius)) {
      return false;
    }
    return primary.coreTemperatureCelsius.value >= 58;
  }


  return true;
}

// ---------------------------------------------------------------------------
// 6. ENRICHMENT GENERALE DELLE RACCOMANDAZIONI
// ---------------------------------------------------------------------------

/**
 * Arricchisce tutte le raccomandazioni valutandone il ciclo di vita rispetto allo storico.
 * Separa le raccomandazioni attive (da mostrare all'utente) da quelle in riposo (COOLDOWN) o risolte.
 */
export function evaluateRecommendationsWithHistory(
  recommendations: OptimizationRecommendation[],
  facts: SystemFactsInput,
  history: OptimizationExecutionRecord[] = [],
  currentTimestamp?: string
): {
  actionableRecommendations: OptimizationRecommendation[];
  resolvedOrCooldownRecommendations: OptimizationRecommendation[];
  byEligibility: Record<RecommendationEligibilityStatus, number>;
} {
  const actionable: OptimizationRecommendation[] = [];
  const resolvedOrCooldown: OptimizationRecommendation[] = [];

  const byEligibility: Record<RecommendationEligibilityStatus, number> = {
    ELIGIBLE: 0,
    COOLDOWN: 0,
    ALREADY_RESOLVED: 0,
    PENDING_VERIFICATION: 0,
    RECURRING_ACTIVE: 0,
    NOT_ELIGIBLE: 0,
  };

  for (const rec of recommendations) {
    const cadenceType = classifyRecommendationCadence(rec);
    const eligibilityResult = getRecommendationEligibility({
      facts,
      recommendation: rec,
      history,
      currentTimestamp,
    });

    const enrichedRec: OptimizationRecommendation = {
      ...rec,
      cadenceType,
      eligibility: eligibilityResult.status,
      lastExecution: eligibilityResult.lastExecution,
      executionCount: eligibilityResult.executionCount,
      historyExplanation: eligibilityResult.explanation,
      cooldownRemainingDays: eligibilityResult.cooldownRemainingDays,
    };

    byEligibility[eligibilityResult.status] = (byEligibility[eligibilityResult.status] || 0) + 1;

    if (
      eligibilityResult.status === 'COOLDOWN' ||
      eligibilityResult.status === 'ALREADY_RESOLVED' ||
      eligibilityResult.status === 'NOT_ELIGIBLE'
    ) {
      resolvedOrCooldown.push(enrichedRec);
    } else {
      // ELIGIBLE, RECURRING_ACTIVE, PENDING_VERIFICATION sono attive per l'utente
      actionable.push(enrichedRec);
    }
  }

  return {
    actionableRecommendations: actionable,
    resolvedOrCooldownRecommendations: resolvedOrCooldown,
    byEligibility,
  };
}
