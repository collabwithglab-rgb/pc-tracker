/**
 * Optimization Engine — Motore puro e deterministico di raccomandazioni motivate
 * (PC Care Center - Tranche 3)
 * 
 * Trasforma fatti di sistema e report di salute in raccomandazioni trasparenti
 * con stima di beneficio atteso, livello di rischio, disponibilità di azione e rollback.
 * 
 * Regola: Zero registry cleaner, zero RAM booster fasulli, zero debloat automatico.
 */

import {
  OptimizationRecommendation,
  OptimizationReport,
  OptimizationCategory,
  OptimizationRisk,
} from '../types/optimization';
import { SystemFactsInput, SystemHealthReport } from '../types/health';
import { evaluateSystemHealth, computeDaysBetween } from './healthEngine';

/**
 * Genera il catalogo delle raccomandazioni ottimizzate per il sistema corrente.
 */
export function generateOptimizationRecommendations(
  facts: SystemFactsInput,
  providedHealthReport?: SystemHealthReport
): OptimizationReport {
  const recommendations: OptimizationRecommendation[] = [];
  const health = providedHealthReport || evaluateSystemHealth(facts);
  const refDate = facts.referenceDate || new Date().toISOString();

  // 1. Raccomandazioni su Storage e Manutenzione SSD
  evaluateStorageRecommendations(facts, health, recommendations);

  // 2. Raccomandazioni su Sicurezza e Punti di Ripristino
  evaluateSafetyAndIntegrityRecommendations(facts, health, recommendations, refDate);

  // 3. Raccomandazioni su Performance, Cache e Schemi Energetici
  evaluatePerformanceRecommendations(facts, recommendations);

  // 4. Raccomandazioni su Termiche e Manutenzione Fisica (con Personal Baseline)
  evaluateThermalAndMaintenanceRecommendations(facts, health, recommendations, refDate);

  // 5. Ordinamento deterministico per rilevanza (rischio/beneficio)
  sortRecommendationsByPriority(recommendations);

  // 6. Costruzione del report aggregato
  return buildOptimizationReport(recommendations, refDate);
}

// ---------------------------------------------------------------------------
// 1. STORAGE RECOMMENDATIONS
// ---------------------------------------------------------------------------

function evaluateStorageRecommendations(
  facts: SystemFactsInput,
  _health: SystemHealthReport,
  recommendations: OptimizationRecommendation[]
): void {
  // A. Ottimizzazione TRIM su SSD
  const ssdDrives = (facts.drives || []).filter((d) => d.isSSD && d.trimSupported);
  const lastTrimDate = (facts.maintenanceEntries || [])
    .filter((e) => e.type === 'storage_maintenance' || e.title.toUpperCase().includes('TRIM'))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;

  const daysSinceTrim = lastTrimDate ? computeDaysBetween(lastTrimDate, facts.referenceDate) : 999;

  for (const drive of ssdDrives) {
    const letter = drive.driveLetter.toUpperCase().replace(':', '');
    if (daysSinceTrim >= 30) {
      recommendations.push({
        id: `opt-trim-${letter}`,
        title: `Esegui Ottimizzazione TRIM su Unità ${letter}:`,
        category: 'storage',
        reason: 'L\'unità SSD supporta il comando ReTrim ma non risulta ottimizzata di recente nel registro di manutenzione.',
        evidence: `Unità SSD ${letter}: (${drive.friendlyName || drive.label || 'SSD'}) compatibile con istruzioni TRIM`,
        expectedBenefit: 'Informa il controller dei blocchi non più utilizzati dai file cancellati, preservando velocità di scrittura e uniformità d\'usura.',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'AUTOMATED_SAFE',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'run-trim',
        parameters: { driveLetter: letter },
      });
    }
  }

  // B. Pulizia Spazio su C: se saturazione elevata
  const cDrive = (facts.drives || []).find((d) => d.driveLetter.toUpperCase().startsWith('C'))
    || (facts.monitoring?.storage || []).find((s) => s.driveLetter.toUpperCase().startsWith('C'));

  if (cDrive) {
    const total = cDrive.totalBytes;
    const free = cDrive.freeBytes;
    const usagePct = total > 0 ? ((total - free) / total) * 100 : 0;

    if (usagePct >= 82) {
      recommendations.push({
        id: 'opt-cleanmgr-c',
        title: 'Avvia Pulizia Disco su Unità di Sistema C:',
        category: 'storage',
        reason: `L'unità di sistema C: è occupata per l'${usagePct.toFixed(0)}%. È opportuno liberare spazio per prevenire rallentamenti.`,
        evidence: `Spazio occupato all'${usagePct.toFixed(1)}% su C:`,
        expectedBenefit: 'Rimozione sicura di file temporanei di sistema, precedenti installazioni Windows e cache senza toccare file personali.',
        risk: 'LOW',
        confidence: 'HIGH',
        actionAvailability: 'AUTOMATED_SAFE',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'open-cleanmgr',
        parameters: { driveLetter: 'C:' },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 2. SAFETY & SYSTEM INTEGRITY RECOMMENDATIONS
// ---------------------------------------------------------------------------

function evaluateSafetyAndIntegrityRecommendations(
  facts: SystemFactsInput,
  health: SystemHealthReport,
  recommendations: OptimizationRecommendation[],
  refDate: string
): void {
  // A. Creazione Punto di Ripristino (Safety Point)
  const lastRestorePoint = (facts.maintenanceEntries || [])
    .filter((e) => e.title.toLowerCase().includes('ripristino') || e.title.toLowerCase().includes('restore'))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;

  const daysSinceRestore = lastRestorePoint ? computeDaysBetween(lastRestorePoint, refDate) : 999;

  if (daysSinceRestore >= 14) {
    recommendations.push({
      id: 'opt-create-restore-point',
      title: 'Crea Punto di Ripristino di Sicurezza',
      category: 'system',
      reason: 'Non risulta registrato alcun Punto di Ripristino recente. È fondamentale disporre di un\'ancora di salvataggio prima di aggiornamenti di sistema.',
      evidence: lastRestorePoint
        ? `Ultimo punto di ripristino registrato ${daysSinceRestore} giorni fa`
        : 'Nessun punto di ripristino registrato nel diario',
      expectedBenefit: 'Consente il rollback istantaneo del registro e dei driver di Windows in caso di anomalie post-aggiornamento.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED_UAC',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'create-restore-point',
    });
  }

  // B. Riparazione File di Sistema Windows Corrotti (SFC)
  const sfcFinding = health.findings.find((f) => f.id === 'system-sfc-corrupted');
  if (sfcFinding || facts.systemFilesStatus === 'corrupted') {
    recommendations.push({
      id: 'opt-sfc-repair',
      title: 'Esegui Riparazione File di Sistema Windows (SFC)',
      category: 'system',
      reason: 'La scansione di verifica ha riscontrato violazioni di integrità nei file protetti del sistema operativo.',
      evidence: 'Rilevati file di sistema Windows danneggiati o alterati',
      expectedBenefit: 'Sostituisce i file danneggiati con copie originali memorizzate nella cache WinSxS, ripristinando stabilità ed affidabilità.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED_UAC',
      rollbackAvailability: 'MANUAL_RESTORE',
      actionId: 'sfc-repair',
    });
  }

  // C. Attivazione Secure Boot nel BIOS UEFI
  const secFinding = health.findings.find((f) => f.id === 'sec-secure-boot-disabled');
  if (secFinding || facts.securityAudit?.secureBootEnabled === false) {
    recommendations.push({
      id: 'opt-enable-secure-boot',
      title: 'Abilita Secure Boot nel Firmware UEFI',
      category: 'security',
      reason: 'Secure Boot è disattivato a livello firmware della scheda madre.',
      evidence: 'Stato UEFI: Secure Boot disabilitato',
      expectedBenefit: 'Protegge il bootloader di Windows dall\'iniezione di rootkit e bootkit malevoli all\'avvio del computer.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL_GUIDED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'reboot-uefi',
    });
  }
}

// ---------------------------------------------------------------------------
// 3. PERFORMANCE & CACHE RECOMMENDATIONS
// ---------------------------------------------------------------------------

function evaluatePerformanceRecommendations(
  facts: SystemFactsInput,
  recommendations: OptimizationRecommendation[]
): void {
  // A. Pulizia Shader Cache GPU
  const hasDiscreteGpu = (facts.monitoring?.gpus || []).some((g) => g.isDiscrete)
    || (facts.currentRigComponents || []).some((c) => c.category === 'gpu');

  if (hasDiscreteGpu) {
    recommendations.push({
      id: 'opt-clean-shader-cache',
      title: 'Ottimizza Shader Cache DirectX & GPU',
      category: 'performance',
      reason: 'L\'accumulo prolungato di shader compilati da driver precedenti può provocare conflitti e micro-stuttering nei videogiochi.',
      evidence: 'GPU dedicata presente nel sistema',
      expectedBenefit: 'Risolve problemi di stuttering e texture corrotte; la cache verrà rigenerata pulita al primo avvio di ciascun gioco.',
      risk: 'LOW',
      confidence: 'MEDIUM',
      actionAvailability: 'AUTOMATED_SAFE',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-shader-cache',
    });
  }

  // B. Schema Prestazioni Elevate per Utenti con Profilo Tuning
  const hasTuningDaily = (facts.tuningProfiles || []).some((p) => p.stability === 'daily');
  if (hasTuningDaily) {
    recommendations.push({
      id: 'opt-ultimate-performance',
      title: 'Attiva Schema Prestazioni Eccellenti (Ultimate Performance)',
      category: 'performance',
      reason: 'Il tuo sistema dispone di profili di tuning stabili ma Windows potrebbe applicare stati di risparmio energetico restrittivi.',
      evidence: 'Profili di tuning daily registrati nel database',
      expectedBenefit: 'Elimina le micro-latenze di commutazione dei core CPU garantendo massima frequenza costante sotto carico.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED_UAC',
      rollbackAvailability: 'AUTOMATIC',
      actionId: 'enable-ultimate-performance',
    });
  }
}

// ---------------------------------------------------------------------------
// 4. THERMAL & PHYSICAL MAINTENANCE RECOMMENDATIONS
// ---------------------------------------------------------------------------

function evaluateThermalAndMaintenanceRecommendations(
  _facts: SystemFactsInput,
  health: SystemHealthReport,
  recommendations: OptimizationRecommendation[],
  _refDate: string
): void {
  // A. Deviazione da Personal Baseline
  const baselineFinding = health.findings.find((f) => f.id.startsWith('gpu-baseline-divergence'));
  if (baselineFinding) {
    recommendations.push({
      id: 'opt-cooling-baseline-divergence',
      title: 'Ispeziona Flusso d\'Aria e Dissipazione GPU',
      category: 'thermal',
      reason: 'La scheda grafica lavora a temperature significativamente superiori rispetto al tuo riferimento "Daily" validato.',
      evidence: baselineFinding.evidence,
      expectedBenefit: 'Ripristina le temperature operative originarie, abbassa i giri ventola e previene il calo di clock della GPU.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL_GUIDED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-filters',
    });
  }

  // B. Sostituzione Pasta Termica Scaduta
  const pasteFinding = health.findings.find((f) => f.id === 'maint-thermal-paste-overdue');
  if (pasteFinding) {
    recommendations.push({
      id: 'opt-replace-thermal-paste',
      title: 'Pianifica Sostituzione Pasta Termica',
      category: 'maintenance',
      reason: 'La pasta termica tra chip e dissipatore non viene sostituita da oltre 2 anni ed è soggetta ad essiccamento.',
      evidence: pasteFinding.evidence,
      expectedBenefit: 'Riduzione tipica di 5-12°C sulle temperature massime di esercizio a parità di carico.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL_GUIDED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'apply-thermal-paste',
    });
  }

  // C. Pulizia Filtri Antipolvere Scaduta
  const filterFinding = health.findings.find((f) => f.id === 'maint-filters-due');
  if (filterFinding) {
    recommendations.push({
      id: 'opt-clean-dust-filters',
      title: 'Pulisci Filtri Antipolvere del Case',
      category: 'maintenance',
      reason: 'È trascorso oltre mezzo anno dall\'ultimo intervento di pulizia filtri.',
      evidence: filterFinding.evidence,
      expectedBenefit: 'Aumenta la portata d\'aria fresca verso i componenti riducendo il rumore delle ventole.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL_GUIDED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-filters',
    });
  }
}

// ---------------------------------------------------------------------------
// 5. SORTING & RANKING DETERMINISTICO
// ---------------------------------------------------------------------------

function sortRecommendationsByPriority(recs: OptimizationRecommendation[]): void {
  // Punteggio di priorità per ordinamento deterministico:
  // 1. Azioni critiche o correzioni di errori di sistema (SFC, Storage C: saturo)
  // 2. Azioni ad alto beneficio e rischio nullo/basso (TRIM, Restore Point, Shader Cache)
  // 3. Manutenzioni fisiche e firmware (Pasta termica, filtri, Secure Boot)
  const priorityWeight: Record<string, number> = {
    'opt-sfc-repair': 100,
    'opt-cleanmgr-c': 90,
    'opt-cooling-baseline-divergence': 85,
    'opt-create-restore-point': 80,
    'opt-trim-C': 75,
    'opt-replace-thermal-paste': 70,
    'opt-clean-shader-cache': 65,
    'opt-clean-dust-filters': 60,
    'opt-ultimate-performance': 55,
    'opt-enable-secure-boot': 50,
  };

  recs.sort((a, b) => {
    const weightA = priorityWeight[a.id] || (a.risk === 'NONE' ? 40 : 30);
    const weightB = priorityWeight[b.id] || (b.risk === 'NONE' ? 40 : 30);
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    return a.id.localeCompare(b.id);
  });
}

// ---------------------------------------------------------------------------
// 6. BUILD REPORT
// ---------------------------------------------------------------------------

function buildOptimizationReport(
  recommendations: OptimizationRecommendation[],
  evaluatedAt: string
): OptimizationReport {
  const byCategory: Record<OptimizationCategory, number> = {
    storage: 0,
    maintenance: 0,
    system: 0,
    performance: 0,
    security: 0,
    thermal: 0,
  };

  const byRisk: Record<OptimizationRisk, number> = {
    NONE: 0,
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
  };

  for (const r of recommendations) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byRisk[r.risk] = (byRisk[r.risk] || 0) + 1;
  }

  return {
    evaluatedAt,
    recommendations,
    totalCount: recommendations.length,
    byCategory,
    byRisk,
  };
}
