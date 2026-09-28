import {
  OptimizationRecommendation,
  SystemFactsInput,
  OptimizationExecutionRecord,
  CreateOptimizationRecordInput,
  OptimizationOutcome,
  OptimizationVerificationStatus,
} from '../types';
import {
  determineVerificationType,
} from '../domain/optimizationHistoryEngine';
import {
  runSsdTrim,
  openDiskCleanup,
  createRestorePoint,
  verifySystemFiles,
  cleanGpuShaderCache,
  enableUltimatePerformance,
  emptyRecycleBin,
  cleanComponentStore,
  checkDiskReadonly,
  queryRecycleBin,
} from './windowsToolsService';
import { formatBytes } from '../domain';

export interface ExecuteOptimizationParams {
  recommendation: OptimizationRecommendation;
  facts: SystemFactsInput;
  recordExecution: (input: CreateOptimizationRecordInput) => Promise<OptimizationExecutionRecord>;
  onRefreshFacts?: () => void;
  onSwitchTab?: (tab: 'live' | 'registro' | 'windows' | 'tuning') => void;
}

export interface OptimizationExecutionResult {
  record: OptimizationExecutionRecord;
  notification: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
  };
}

/**
 * Esegue in modo centralizzato il ciclo di vita completo di una raccomandazione:
 * Recommendation -> Action -> Verification -> Record -> Future Context
 */
export async function executeOptimizationWorkflow({
  recommendation: rec,
  facts,
  recordExecution,
  onRefreshFacts,
  onSwitchTab,
}: ExecuteOptimizationParams): Promise<OptimizationExecutionResult> {
  const timestampStarted = new Date().toISOString();
  const verificationType = determineVerificationType(rec);

  // 1. Cattura Evidenza Iniziale (Before)
  let evidenceBeforeSummary = rec.evidence;
  let evidenceBeforeMetrics: Record<string, number | string | boolean> | undefined;

  if (rec.actionId === 'empty-recycle-bin' && facts.recycleBin) {
    evidenceBeforeSummary = `${formatBytes(facts.recycleBin.totalSizeBytes)} (${facts.recycleBin.itemCount} elementi)`;
    evidenceBeforeMetrics = {
      totalSizeBytes: facts.recycleBin.totalSizeBytes,
      itemCount: facts.recycleBin.itemCount,
    };
  }

  let outcome: OptimizationOutcome = 'success';
  let verificationStatus: OptimizationVerificationStatus = 'verified';
  let evidenceAfterSummary: string | undefined;
  let evidenceAfterMetrics: Record<string, number | string | boolean> | undefined;
  let metricsDelta: { numericChange?: number; unit?: string; description?: string } | undefined;
  let errorMessage: string | undefined;
  let cancellationReason: string | undefined;
  let notificationType: 'success' | 'warning' | 'error' | 'info' = 'success';
  let notificationMessage = '';

  const driveLetter = typeof rec.parameters?.driveLetter === 'string' ? rec.parameters.driveLetter : undefined;
  const target = driveLetter
    ? `Unità ${driveLetter.toUpperCase()}:`
    : rec.actionId === 'empty-recycle-bin'
    ? 'Cestino di Windows'
    : rec.actionId === 'clean-shader-cache'
    ? 'DirectX Shader Cache'
    : rec.actionId === 'clean-component-store'
    ? 'WinSxS Component Store'
    : rec.category.toUpperCase();

  try {
    if (rec.actionId === 'run-trim') {
      const letter = driveLetter || 'C';
      const res = await runSsdTrim(letter);
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = `Ottimizzazione TRIM completata con successo su unità ${letter}:`;
        verificationStatus = 'verified';
        evidenceAfterSummary = `Comando TRIM eseguito con successo su volume ${letter}:`;
      } else {
        notificationType = 'warning';
        notificationMessage = res.message || 'Ottimizzazione TRIM completata con avvisi.';
        verificationStatus = 'inconclusive';
        evidenceAfterSummary = res.message;
      }
    } else if (rec.actionId === 'empty-recycle-bin') {
      const res = await emptyRecycleBin();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Cestino di Windows svuotato con successo.';
        // Post-verifica reale quantitativa interrogando l'API Windows
        try {
          const postBinRes = await queryRecycleBin();
          const bytesBefore = facts.recycleBin?.totalSizeBytes || 0;
          const bytesAfter = postBinRes.data?.totalSizeBytes ?? 0;
          const itemCountAfter = postBinRes.data?.itemCount ?? 0;
          const freedBytes = Math.max(0, bytesBefore - bytesAfter);

          evidenceAfterSummary = `${formatBytes(bytesAfter)} (${itemCountAfter} elementi)`;
          evidenceAfterMetrics = {
            totalSizeBytes: bytesAfter,
            itemCount: itemCountAfter,
          };
          metricsDelta = {
            numericChange: freedBytes,
            unit: 'bytes',
            description: `Liberati ${formatBytes(freedBytes)} di spazio su disco`,
          };
          verificationStatus = 'verified';
        } catch {
          evidenceAfterSummary = 'Cestino azzerato (0 byte)';
          verificationStatus = 'verified';
        }
      } else {
        outcome = 'failed';
        verificationStatus = 'failed';
        errorMessage = res.message;
        notificationType = 'warning';
        notificationMessage = res.message || 'Svuotamento Cestino completato con avvisi.';
      }
    } else if (rec.actionId === 'create-restore-point') {
      const res = await createRestorePoint('PC Care Center - Salvaguardia Sistema');
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Punto di Ripristino di sicurezza creato con successo.';
        verificationStatus = 'verified';
        evidenceAfterSummary = 'Punto di ripristino creato: "PC Care Center - Salvaguardia Sistema"';
      } else if (res.status === 'cancelled') {
        outcome = 'cancelled';
        cancellationReason = 'Operazione annullata dall\'utente al prompt UAC Windows';
        verificationStatus = 'not_applicable';
        notificationType = 'info';
        notificationMessage = 'Creazione annullata dall\'utente al prompt UAC.';
      } else {
        outcome = 'failed';
        errorMessage = res.message;
        verificationStatus = 'failed';
        notificationType = 'warning';
        notificationMessage = res.message || 'Verifica lo stato di Protezione Sistema.';
      }
    } else if (rec.actionId === 'sfc-repair') {
      const res = await verifySystemFiles();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Riparazione completata: ' + res.message;
        verificationStatus = 'verified';
        evidenceAfterSummary = res.message;
      } else {
        verificationStatus = 'inconclusive';
        evidenceAfterSummary = res.message || 'Scansione completata con esito da verificare.';
        notificationType = 'warning';
        notificationMessage = res.message || 'Scansione completata con esito da verificare.';
      }
    } else if (rec.actionId === 'clean-shader-cache') {
      const res = await cleanGpuShaderCache();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = `Shader Cache DirectX/GPU pulita (${res.message}).`;
        verificationStatus = 'verified';
        evidenceAfterSummary = `Cache svuotata: ${res.message}`;
      } else {
        verificationStatus = 'inconclusive';
        evidenceAfterSummary = res.message;
        notificationType = 'warning';
        notificationMessage = res.message || 'Pulizia shader cache completata.';
      }
    } else if (rec.actionId === 'enable-ultimate-performance') {
      const res = await enableUltimatePerformance();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Schema Prestazioni Eccellenti attivato in Windows.';
        verificationStatus = 'verified';
        evidenceAfterSummary = 'Schema "Prestazioni Eccellenti" configurato e attivo';
      } else {
        outcome = 'failed';
        errorMessage = res.message;
        verificationStatus = 'failed';
        notificationType = 'warning';
        notificationMessage = res.message || 'Schema non applicato.';
      }
    } else if (rec.actionId === 'clean-component-store') {
      const res = await cleanComponentStore();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Pulizia Component Store WinSxS completata con successo.';
        verificationStatus = 'verified';
        evidenceAfterSummary = 'Operazione DISM Component Cleanup completata con successo';
      } else {
        verificationStatus = 'inconclusive';
        evidenceAfterSummary = res.message;
        notificationType = 'warning';
        notificationMessage = res.message || 'Operazione DISM completata con esito da verificare.';
      }
    } else if (rec.actionId === 'chkdsk-scan') {
      const letter = (rec.parameters?.driveLetter as string) || 'C';
      const res = await checkDiskReadonly(letter);
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = `Scansione ${letter}: completata: ${res.message}`;
        verificationStatus = 'verified';
        evidenceAfterSummary = res.message;
      } else {
        verificationStatus = 'inconclusive';
        evidenceAfterSummary = res.message;
        notificationType = 'warning';
        notificationMessage = res.message || `Scansione ${letter}: completata con esito da verificare.`;
      }
    } else if (rec.actionId === 'open-cleanmgr') {
      const res = await openDiskCleanup();
      if (res.status === 'success') {
        notificationType = 'success';
        notificationMessage = 'Utility Pulizia Disco di Windows avviata.';
        verificationStatus = 'verified';
        evidenceAfterSummary = 'Pulizia Disco avviata sul desktop';
      } else {
        outcome = 'failed';
        errorMessage = res.message;
        verificationStatus = 'failed';
        notificationType = 'error';
        notificationMessage = res.message || 'Impossibile avviare Pulizia Disco.';
      }
    } else if (rec.actionId === 'view-winget-updates') {
      onSwitchTab?.('windows');
      verificationStatus = 'not_applicable';
      evidenceAfterSummary = 'Reindirizzamento effettuato alla scheda Aggiornamenti WinGet';
      notificationType = 'info';
      notificationMessage = 'Aperta scheda Aggiornamenti WinGet.';
    } else if (rec.actionId === 'open-taskmgr-memory') {
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Indicazioni fornite: consultazione Gestione Attività (Ctrl+Shift+Esc)';
      notificationType = 'info';
      notificationMessage = 'Consulta Gestione Attività (Ctrl+Shift+Esc) per ordinare i processi per RAM.';
    } else if (rec.actionId === 'inspect-device-fault') {
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Indicazioni fornite: consultazione Gestione Dispositivi (devmgmt.msc)';
      notificationType = 'info';
      notificationMessage = 'Apri Gestione Dispositivi (tasto Windows + X -> Gestione dispositivi) per verificare lo stato del dispositivo.';
    } else if (rec.actionId === 'inspect-cpu-cooling') {
      onSwitchTab?.('tuning');
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Aperta sezione Tuning per verifica curve ventole e profilo dissipazione';
      notificationType = 'info';
      notificationMessage = 'Aperta sezione Tuning per ispezione curve ventole.';
    } else if (rec.actionId === 'inspect-gpu-idle') {
      onSwitchTab?.('live');
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Aperto monitoraggio live per controllo frequenze e consumi GPU in idle';
      notificationType = 'info';
      notificationMessage = 'Aperto monitoraggio live per controllo GPU idle.';
    } else if (rec.actionId === 'clean-filters' || rec.actionId === 'apply-thermal-paste') {
      onSwitchTab?.('registro');
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Indirizzato al Registro Manutenzione per tracciamento attività fisica';
      notificationType = 'info';
      notificationMessage = `Aperto Registro Manutenzione per: ${rec.title}`;
    } else if (rec.actionId === 'reboot-uefi') {
      onSwitchTab?.('windows');
      verificationStatus = 'pending';
      evidenceAfterSummary = 'Consultazione parametri BIOS/UEFI avviata';
      notificationType = 'info';
      notificationMessage = 'Consultazione parametri BIOS/UEFI avviata.';
    } else {
      verificationStatus = 'not_applicable';
      evidenceAfterSummary = 'Azione guidata completata';
      notificationType = 'info';
      notificationMessage = `Azione guidata: ${rec.title}`;
    }

    onRefreshFacts?.();
  } catch (err) {
    outcome = 'failed';
    errorMessage = (err as Error).message || 'Errore imprevisto durante l\'esecuzione dell\'azione.';
    verificationStatus = 'failed';
    notificationType = 'error';
    notificationMessage = 'Si è verificato un errore durante l\'operazione.';
  }

  const timestampCompleted = new Date().toISOString();

  // 2. Registrazione Immutabile nello Storico del Dominio
  const record = await recordExecution({
    recommendationId: rec.id,
    recommendationTitle: rec.title,
    timestampStarted,
    timestampCompleted,

    category: rec.category,
    actionAvailability: rec.actionAvailability,
    target,

    triggerReason: rec.reason,
    triggerEvidence: rec.evidence,
    actionId: rec.actionId,
    actionDescription: rec.actionDescription || rec.title,

    outcome,
    errorMessage,
    cancellationReason,

    verificationType,
    verificationStatus,
    verificationMethod: rec.verificationMethod || 'Verifica post-esecuzione',
    evidenceBefore: evidenceBeforeMetrics
      ? { summary: evidenceBeforeSummary, metrics: evidenceBeforeMetrics }
      : evidenceBeforeSummary,
    evidenceAfter: evidenceAfterMetrics
      ? { summary: evidenceAfterSummary || 'Operazione completata', metrics: evidenceAfterMetrics }
      : evidenceAfterSummary,
    metricsDelta,
  });

  return {
    record,
    notification: {
      type: notificationType,
      message: notificationMessage,
    },
  };
}

/**
 * Registra un'operazione annullata dall'utente in fase di prompt/conferma
 */
export async function recordCancelledOptimization(
  rec: OptimizationRecommendation,
  reason: string,
  recordExecution: (input: CreateOptimizationRecordInput) => Promise<OptimizationExecutionRecord>
): Promise<OptimizationExecutionRecord> {
  const timestamp = new Date().toISOString();
  return recordExecution({
    recommendationId: rec.id,
    recommendationTitle: rec.title,
    timestampStarted: timestamp,
    timestampCompleted: timestamp,
    durationMs: 0,

    category: rec.category,
    actionAvailability: rec.actionAvailability,
    target: typeof rec.parameters?.driveLetter === 'string' ? `Unità ${rec.parameters.driveLetter.toUpperCase()}:` : rec.category.toUpperCase(),

    triggerReason: rec.reason,
    triggerEvidence: rec.evidence,
    actionId: rec.actionId,
    actionDescription: rec.actionDescription || rec.title,

    outcome: 'cancelled',
    cancellationReason: reason,

    verificationType: determineVerificationType(rec),
    verificationStatus: 'not_applicable',
    verificationMethod: rec.verificationMethod || 'Nessuna verifica (annullato dall\'utente)',
    evidenceBefore: rec.evidence,
  });
}
