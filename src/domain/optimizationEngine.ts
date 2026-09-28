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
  RecommendationEligibilityStatus,
} from '../types/optimization';
import { OptimizationExecutionRecord } from '../types/optimizationHistory';
import { SystemFactsInput, SystemHealthReport } from '../types/health';
import { evaluateSystemHealth, computeDaysBetween } from './healthEngine';
import { isMetricAvailable } from '../services/monitoringService';
import { evaluateRecommendationsWithHistory } from './optimizationLifecycleEngine';

/**
 * Genera il catalogo delle raccomandazioni ottimizzate per il sistema corrente,
 * integrando la memoria storica e il ciclo di vita (Tranche 5).
 */
export function generateOptimizationRecommendations(
  facts: SystemFactsInput,
  providedHealthReport?: SystemHealthReport,
  optimizationHistory: OptimizationExecutionRecord[] = [],
  currentTimestamp?: string
): OptimizationReport {
  const recommendations: OptimizationRecommendation[] = [];
  const health = providedHealthReport || evaluateSystemHealth(facts);
  const refDate = currentTimestamp || facts.referenceDate || new Date().toISOString();

  // 1. Raccomandazioni su Storage e Manutenzione SSD/Cestino/CHKDSK
  evaluateStorageRecommendations(facts, health, recommendations);

  // 2. Raccomandazioni su Sicurezza, Ripristino e Component Store Windows
  evaluateSafetyAndIntegrityRecommendations(facts, health, recommendations, refDate);

  // 3. Raccomandazioni su Performance, Cache, RAM e WinGet
  evaluatePerformanceRecommendations(facts, recommendations);

  // 4. Raccomandazioni su Termiche e Manutenzione Fisica (con Personal Baseline)
  evaluateThermalAndMaintenanceRecommendations(facts, health, recommendations, refDate);

  // 5. Ordinamento deterministico per rilevanza (rischio/beneficio)
  sortRecommendationsByPriority(recommendations);

  // 6. Arricchimento con il ciclo di vita e memoria storica (Tranche 5)
  const {
    actionableRecommendations,
    resolvedOrCooldownRecommendations,
    byEligibility,
  } = evaluateRecommendationsWithHistory(recommendations, facts, optimizationHistory, refDate);

  // 7. Costruzione del report aggregato
  return buildOptimizationReport(
    actionableRecommendations,
    resolvedOrCooldownRecommendations,
    byEligibility,
    refDate
  );
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
        expectedBenefit: 'Informa il controller dei blocchi non più utilizzati dai file cancellati, favorendo velocità di scrittura e uniformità d\'usura.',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'ONE_CLICK',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'run-trim',
        actionDescription: `Invio comandi ReTrim al controller SSD per l'unità ${letter}:`,
        verificationMethod: 'Conferma ricezione comando dal controller storage e aggiornamento data nel diario',
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
        actionAvailability: 'ONE_CLICK',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'open-cleanmgr',
        actionDescription: 'Apertura dell\'utility ufficiale cleanmgr.exe per selezionare i file temporanei di sistema',
        verificationMethod: 'Nuova scansione volumi: incremento dei byte liberi sull\'unità C:',
        parameters: { driveLetter: 'C:' },
      });
    }
  }

  // C. Svuotamento Cestino di Windows se saturo
  if (facts.recycleBin && (facts.recycleBin.totalSizeBytes >= 500 * 1024 * 1024 || facts.recycleBin.itemCount >= 50)) {
    const sizeMb = (facts.recycleBin.totalSizeBytes / (1024 * 1024)).toFixed(0);
    recommendations.push({
      id: 'opt-empty-recycle-bin',
      title: 'Svuota Cestino di Windows',
      category: 'storage',
      reason: `Il Cestino di Windows trattiene ${facts.recycleBin.itemCount} elementi eliminati per un totale di ${sizeMb} MB. È opportuno liberare questo spazio.`,
      evidence: `${facts.recycleBin.itemCount} file nel Cestino (${sizeMb} MB occupati)`,
      expectedBenefit: `Recupero immediato di ${sizeMb} MB di spazio fisico su disco trattenuti da file eliminati.`,
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'USER_CONFIRMED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'empty-recycle-bin',
      actionDescription: 'Eliminazione definitiva di tutti gli elementi allocati nel Cestino di sistema',
      verificationMethod: 'Interrogazione queryRecycleBin: conteggio elementi e byte residui pari a zero',
    });
  }

  // D. Scansione Integrità File System (CHKDSK read-only) su dischi con errori I/O
  const disksWithErrors = (facts.smartDisks || []).filter(
    (d) => d.readErrorsTotal > 0 || d.writeErrorsTotal > 0
  );
  for (const disk of disksWithErrors) {
    const matchingDrive = (facts.drives || []).find(
      (d) => (disk.friendlyName && d.friendlyName && d.friendlyName.toLowerCase() === disk.friendlyName.toLowerCase()) ||
             (d.label && disk.friendlyName && disk.friendlyName.toLowerCase().includes(d.label.toLowerCase()))
    ) || (facts.drives && facts.drives[0]);
    const letter = matchingDrive ? matchingDrive.driveLetter.toUpperCase().replace(':', '') : 'C';

    recommendations.push({
      id: `opt-chkdsk-scan-${letter}`,
      title: `Esegui Scansione File System (CHKDSK) su Unità ${letter}:`,
      category: 'storage',
      reason: `I contatori fisici del controller per ${disk.friendlyName} indicano errori di lettura/scrittura. Si raccomanda una verifica online non distruttiva del file system.`,
      evidence: `Errori I/O rilevati: ${disk.readErrorsTotal} lettura, ${disk.writeErrorsTotal} scrittura su ${disk.friendlyName}`,
      expectedBenefit: 'Verifica la coerenza dei metadati NTFS e identifica eventuali corruzioni di indici o directory prima che si aggravino.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'chkdsk-scan',
      actionDescription: `Esecuzione del comando chkdsk ${letter}: /scan in modalità non distruttiva e online`,
      verificationMethod: 'Report diagnostico CHKDSK privo di violazioni e assenza di ulteriori errori di I/O',
      parameters: { driveLetter: letter },
    });
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
      expectedBenefit: 'Consente il rollback del registro e dei driver di Windows in caso di anomalie post-aggiornamento.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'create-restore-point',
      actionDescription: 'Creazione snapshot di protezione sistema tramite le API del Volume Shadow Copy di Windows',
      verificationMethod: 'Presenza del nuovo punto di ripristino nel catalogo di sistema con timestamp aggiornato',
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
      expectedBenefit: 'Sostituisce i file danneggiati con copie originali memorizzate nella cache WinSxS, favorendo stabilità ed affidabilità.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'MANUAL_RESTORE',
      actionId: 'sfc-repair',
      actionDescription: 'Esecuzione sfc /scannow con riparazione automatica delle DLL e dei driver protetti',
      verificationMethod: 'Nuova scansione SFC con esito "Nessuna violazione di integrità riscontrata"',
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
      expectedBenefit: 'Protegge il bootloader di Windows dall\'iniezione di rootkit e bootkit all\'avvio del computer.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'reboot-uefi',
      actionDescription: 'Accesso guidato al BIOS/UEFI per impostare "Secure Boot" su "Enabled"',
      verificationMethod: 'Riesame audit di sicurezza: secureBootEnabled impostato su true',
    });
  }

  // D. Pulizia Component Store Windows (WinSxS DISM)
  const lastDismDate = (facts.maintenanceEntries || [])
    .filter((e) => e.title.toUpperCase().includes('WINSXS') || e.title.toUpperCase().includes('DISM'))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const daysSinceDism = lastDismDate ? computeDaysBetween(lastDismDate, refDate) : 999;
  const cDrive = (facts.drives || []).find((d) => d.driveLetter.toUpperCase().startsWith('C'))
    || (facts.monitoring?.storage || []).find((s) => s.driveLetter.toUpperCase().startsWith('C'));
  const cUsagePct = cDrive && cDrive.totalBytes > 0 ? ((cDrive.totalBytes - cDrive.freeBytes) / cDrive.totalBytes) * 100 : 0;

  if (cDrive && daysSinceDism >= 60 && (cUsagePct >= 80 || facts.systemFilesStatus === 'corrupted')) {
    recommendations.push({
      id: 'opt-clean-component-store',
      title: 'Ottimizza Archivio Componenti Windows (WinSxS)',
      category: 'system',
      reason: 'Windows conserva nel repository WinSxS le versioni obsolete dei file sostituite dagli aggiornamenti cumulativi di sistema.',
      evidence: lastDismDate
        ? `Ultima pulizia Component Store eseguita ${daysSinceDism} giorni fa`
        : 'Nessuna pulizia WinSxS registrata negli ultimi 60 giorni',
      expectedBenefit: 'Consolidamento del catalogo pacchetti e liberazione sicura di 1-4 GB sull\'unità di sistema C:.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-component-store',
      actionDescription: 'Esecuzione DISM /Online /Cleanup-Image /StartComponentCleanup con privilegi di amministratore',
      verificationMethod: 'Conclusione con codice successo 0x0 del processo DISM e spazio incrementato su C:',
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
      expectedBenefit: 'Favorisce la risoluzione di problemi di stuttering e texture corrotte; la cache verrà rigenerata al primo avvio di ciascun gioco.',
      risk: 'LOW',
      confidence: 'MEDIUM',
      actionAvailability: 'USER_CONFIRMED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-shader-cache',
      actionDescription: 'Eliminazione dei file temporanei dalla cache grafica DirectX (D3DSCache) e dai repository driver',
      verificationMethod: 'Conteggio file rimossi e byte liberati, rigenerazione trasparente al successivo avvio 3D',
    });
  }

  // B. Schema Prestazioni Elevate per Utenti con Profilo Tuning (Rule K - Power Policy)
  const hasTuningDaily = (facts.tuningProfiles || []).some((p) => p.stability === 'daily');
  const power = facts.diagnostics?.powerStatus;
  const isBatteryActive = power?.isOnBattery === true || power?.batterySaverActive === true;
  const isBatteryCapable = power?.powerArchitecture === 'battery_capable';

  // Rule K: Non proporre mai Ultimate Performance su batteria, risparmio batteria attivo o portatili non collegati ad AC
  if (hasTuningDaily && !isBatteryActive && (!isBatteryCapable || power?.isOnAC === true)) {
    const powerNote = isBatteryCapable && power?.isOnAC
      ? ' Il sistema è un dispositivo portatile attualmente collegato alla presa elettrica fissa.'
      : '';
    recommendations.push({
      id: 'opt-ultimate-performance',
      title: 'Attiva Schema Prestazioni Eccellenti (Ultimate Performance)',
      category: 'performance',
      reason: `Il tuo sistema dispone di profili di tuning stabili ed è alimentato da rete fissa senza restrizioni di batteria.${powerNote}`,
      evidence: isBatteryCapable
        ? 'Profili tuning daily registrati e alimentazione AC attiva (batteria non attiva)'
        : 'Profili di tuning daily registrati nel database',
      expectedBenefit: 'Riduce le latenze di transizione dei core CPU favorendo il mantenimento delle frequenze operative sotto carico.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'AUTOMATIC',
      actionId: 'enable-ultimate-performance',
      actionDescription: 'Sblocco e attivazione tramite powercfg dello schema GUID Prestazioni Eccellenti',
      verificationMethod: 'Interrogazione powercfg /getactivescheme con conferma dello schema abilitato',
    });
  }

  // C. Triage Pressione Memoria RAM e Spazio di Commit (Rule B.2, J)
  const mem = facts.monitoring?.memory;
  const commit = facts.diagnostics?.memoryCommit;
  const isHighRam = mem && mem.totalBytes > 0 && mem.utilizationPercent >= 88;
  const isHighCommit = commit && commit.availability === 'available' && commit.commitUtilizationPercent >= 88;

  if (isHighRam || isHighCommit) {
    const ramPct = mem ? `${mem.utilizationPercent.toFixed(1)}%` : 'N/D';
    const commitEvidence = commit && commit.availability === 'available'
      ? `, Commit al ${commit.commitUtilizationPercent.toFixed(1)}% (${(commit.commitTotalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB / ${(commit.commitLimitBytes / (1024 * 1024 * 1024)).toFixed(1)} GB)`
      : '';
    recommendations.push({
      id: 'opt-ram-pressure-triage',
      title: 'Ispezione Processi per Pressione Memoria RAM',
      category: 'performance',
      reason: isHighCommit
        ? 'Lo spazio di commit o la memoria RAM fisica sono sotto pressione significativa. Il sistema ricorre attivamente al paging su disco.'
        : 'La memoria fisica RAM è occupata per oltre l\'88%. Il sistema ricorre attivamente al paging su disco, riducendo la fluidità.',
      evidence: `RAM al ${ramPct}${commitEvidence}`,
      expectedBenefit: 'Identificazione e chiusura mirata di applicazioni o schede browser in memory-leak per prevenire micro-stuttering.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'READ_ONLY',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'open-taskmgr-memory',
      actionDescription: 'Consultazione diagnostica dei processi a maggior assorbimento in Gestione Attività / Monitoraggio Risorse',
      verificationMethod: 'Verifica telemetrica del rientro dell\'utilizzo RAM e commit al di sotto dell\'80%',
    });
  }

  // D. Ispezione Periferiche con Errore Windows (Rule L & M)
  const deviceProblems = (facts.diagnostics?.deviceProblems.devicesWithProblems || [])
    .filter((d) => d.severity === 'critical' || d.severity === 'warning');

  if (deviceProblems.length > 0) {
    const firstDev = deviceProblems[0];
    const devName = firstDev.friendlyName || firstDev.deviceId;
    recommendations.push({
      id: 'opt-device-fault-inspection',
      title: `Ispezione Periferica con Errore Windows: ${devName}`,
      category: 'system',
      reason: `Windows ha arrestato o rilevato un problema hardware/driver su questa periferica (${firstDev.problemLabel}).`,
      evidence: `${firstDev.problemLabel}: ${firstDev.problemDescription}`,
      expectedBenefit: 'Identificazione del controller o driver difettoso per prevenire instabilità di sistema o crash BSOD.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'inspect-device-fault',
      actionDescription: 'Apertura guidata di Gestione Dispositivi di Windows (devmgmt.msc) per visualizzare lo stato della periferica',
      verificationMethod: 'Nuova scansione dei nodi hardware con azzeramento del codice di errore',
      parameters: { deviceId: firstDev.deviceId },
    });
  }

  // D. Aggiornamento Software di Supporto e Runtime con WinGet
  if (facts.wingetUpdates && facts.wingetUpdates.length > 0) {
    const count = facts.wingetUpdates.length;
    const names = facts.wingetUpdates.slice(0, 2).map((u) => u.name).join(', ');
    const extra = count > 2 ? ` e altri ${count - 2} pacchetti` : '';
    recommendations.push({
      id: 'opt-winget-updates',
      title: `Aggiorna Software di Supporto e Runtime (${count} disponibili)`,
      category: 'system',
      reason: 'Sono disponibili nuove versioni ufficiali per runtime o applicazioni installate sul PC tramite il gestore pacchetti Microsoft WinGet.',
      evidence: `${count} aggiornamenti rilevati (${names}${extra})`,
      expectedBenefit: 'Aggiornamento di componenti runtime (es. VC++ Redistributable) con patch di compatibilità e sicurezza.',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'ASSISTED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'view-winget-updates',
      actionDescription: 'Apertura della sezione Windows Tools per l\'ispezione e installazione degli aggiornamenti WinGet',
      verificationMethod: 'Riesame WinGet con esito 0 aggiornamenti pendenti per i pacchetti selezionati',
    });
  }
}

// ---------------------------------------------------------------------------
// 4. THERMAL & PHYSICAL MAINTENANCE RECOMMENDATIONS
// ---------------------------------------------------------------------------

function evaluateThermalAndMaintenanceRecommendations(
  facts: SystemFactsInput,
  health: SystemHealthReport,
  recommendations: OptimizationRecommendation[],
  _refDate: string
): void {
  // A. Deviazione da Personal Baseline per GPU
  const baselineFinding = health.findings.find((f) => f.id.startsWith('gpu-baseline-divergence'));
  if (baselineFinding) {
    recommendations.push({
      id: 'opt-cooling-baseline-divergence',
      title: 'Ispeziona Flusso d\'Aria e Dissipazione GPU',
      category: 'thermal',
      reason: 'La scheda grafica lavora a temperature significativamente superiori rispetto al tuo riferimento "Daily" validato.',
      evidence: baselineFinding.evidence,
      expectedBenefit: 'Favorisce il ripristino delle temperature operative originarie, abbassa i giri ventola e previene il calo di clock della GPU.',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-filters',
      actionDescription: 'Controllo ventole scheda grafica, pulizia dissipatore e orientamento flussi d\'aria del case',
      verificationMethod: 'Verifica telemetrica sotto carico: rientro del delta termico entro 4°C dalla baseline',
    });
  }

  // A2. Deviazione da Personal Baseline per CPU
  const dailyCpuProfile = (facts.tuningProfiles || []).find(
    (p) => p.category === 'cpu' && p.stability === 'daily' && p.temperatures?.load !== undefined
  );
  const baselineCpuLoadTemp = dailyCpuProfile?.temperatures?.load;
  const cpu = facts.monitoring?.cpu;

  if (
    dailyCpuProfile &&
    baselineCpuLoadTemp !== undefined &&
    cpu &&
    isMetricAvailable(cpu.packageTemperatureCelsius) &&
    isMetricAvailable(cpu.utilizationPercent) &&
    cpu.utilizationPercent.value >= 75
  ) {
    const cpuTemp = cpu.packageTemperatureCelsius.value;
    const delta = cpuTemp - baselineCpuLoadTemp;
    if (delta >= 10) {
      recommendations.push({
        id: 'opt-cpu-baseline-divergence',
        title: 'Ispeziona Dissipazione CPU da Baseline Personale',
        category: 'thermal',
        reason: 'Il processore sotto carico opera a temperature nettamente superiori rispetto al tuo profilo Daily di riferimento validato.',
        evidence: `Carico CPU al ${cpu.utilizationPercent.value}%: ${cpuTemp}°C (+${delta.toFixed(0)}°C rispetto al riferimento Daily di ${baselineCpuLoadTemp}°C per "${dailyCpuProfile.name}")`,
        expectedBenefit: 'Prevenzione del thermal throttling di picco, mantenimento delle frequenze turbo stabili e riduzione della rumorosità delle ventole.',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'MANUAL',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'inspect-cpu-cooling',
        actionDescription: 'Controllo serraggio dissipatore, portata pompa a liquido o regime ventole dissipatore aria',
        verificationMethod: 'Nuovo ciclo di carico sostenuto con delta termico inferiore a 5°C rispetto al riferimento',
        parameters: { currentTemp: cpuTemp, baselineTemp: baselineCpuLoadTemp, delta },
      });
    }
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
      expectedBenefit: 'Favorisce il ripristino dell\'efficienza termica (stimata tipicamente in 5-12°C in meno a parità di carico).',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'MANUAL',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'apply-thermal-paste',
      actionDescription: 'Rimozione vecchia pasta con alcool isopropilico e applicazione di nuovo composto termico ad alta conducibilità',
      verificationMethod: 'Registrazione dell\'intervento nel diario di cura e monitoraggio delle temperature sotto carico',
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
      actionAvailability: 'MANUAL',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'clean-filters',
      actionDescription: 'Smontaggio e rimozione meccanica della polvere dai filtri anteriore, inferiore e superiore del case',
      verificationMethod: 'Registrazione dell\'intervento nel diario e miglioramento della temperatura interna',
    });
  }

  // D. Termiche Anomale GPU in Idle (Inattività)
  const gpus = facts.monitoring?.gpus || [];
  const primaryGpu = gpus.find((g) => g.isDiscrete) || gpus[0];
  if (
    primaryGpu &&
    primaryGpu.isDiscrete &&
    isMetricAvailable(primaryGpu.coreTemperatureCelsius) &&
    isMetricAvailable(primaryGpu.utilizationPercent) &&
    primaryGpu.utilizationPercent.value <= 10 &&
    primaryGpu.coreTemperatureCelsius.value >= 58
  ) {
    const idleTemp = primaryGpu.coreTemperatureCelsius.value;
    const idleLoad = primaryGpu.utilizationPercent.value;
    recommendations.push({
      id: 'opt-gpu-idle-thermals',
      title: `Verifica Ventilazione e Temperatura Idle GPU: ${primaryGpu.name}`,
      category: 'thermal',
      reason: 'La scheda grafica registra temperature elevate a riposo, senza carichi 3D o di calcolo attivi.',
      evidence: `GPU in idle (carico ${idleLoad}%): temperatura a riposo di ${idleTemp}°C (atteso < 50°C)`,
      expectedBenefit: 'Abbattimento del calore residuo nel case, prevenzione dell\'invecchiamento dei condensatori e riduzione dei consumi in standby.',
      risk: 'NONE',
      confidence: 'MEDIUM',
      actionAvailability: 'MANUAL',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'inspect-gpu-idle',
      actionDescription: 'Verifica della modalità Zero-RPM, pulizia feritoie di espulsione posteriore e verifica assenza processi fantasma in stato P0',
      verificationMethod: 'Temperatura GPU stabilizzata sotto i 50°C a computer inattivo',
    });
  }
}

// ---------------------------------------------------------------------------
// 5. SORTING & RANKING DETERMINISTICO
// ---------------------------------------------------------------------------

function sortRecommendationsByPriority(recs: OptimizationRecommendation[]): void {
  // Punteggio di priorità per ordinamento deterministico:
  // 1. Correzioni integrità file di sistema Windows (SFC)
  // 2. Azioni critiche su volumi saturi e corruzioni file system (Cleanmgr C:, CHKDSK)
  // 3. Anomalie termiche rispetto a baseline validata (GPU/CPU baseline divergence)
  // 4. Pressione memoria RAM e Cestino saturo (RAM triage, Recycle Bin)
  // 5. Misure preventive e manutenzione SSD (Restore Point, TRIM, WinSxS)
  // 6. Manutenzioni fisiche e aggiornamenti (Pasta termica, Shader cache, WinGet, filtri)
  // 7. Ottimizzazioni prestazionali e firmware (Ultimate Performance, Idle thermals, Secure Boot)
  const priorityWeight: Record<string, number> = {
    'opt-sfc-repair': 100,
    'opt-cleanmgr-c': 90,
    'opt-cooling-baseline-divergence': 85,
    'opt-cpu-baseline-divergence': 84,
    'opt-ram-pressure-triage': 82,
    'opt-empty-recycle-bin': 81,
    'opt-create-restore-point': 80,
    'opt-clean-component-store': 72,
    'opt-replace-thermal-paste': 70,
    'opt-clean-shader-cache': 65,
    'opt-winget-updates': 62,
    'opt-clean-dust-filters': 60,
    'opt-gpu-idle-thermals': 58,
    'opt-ultimate-performance': 55,
    'opt-enable-secure-boot': 50,
  };

  const getWeight = (id: string, risk: OptimizationRisk): number => {
    if (priorityWeight[id] !== undefined) {
      return priorityWeight[id];
    }
    if (id.startsWith('opt-chkdsk-scan')) return 88;
    if (id.startsWith('opt-trim-')) return 75;
    return risk === 'NONE' ? 40 : 30;
  };

  recs.sort((a, b) => {
    const weightA = getWeight(a.id, a.risk);
    const weightB = getWeight(b.id, b.risk);
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    return a.id.localeCompare(b.id);
  });
}

function buildOptimizationReport(
  actionableRecommendations: OptimizationRecommendation[],
  resolvedOrCooldownRecommendations: OptimizationRecommendation[] = [],
  byEligibility: Record<RecommendationEligibilityStatus, number> = {
    ELIGIBLE: actionableRecommendations.length,
    COOLDOWN: 0,
    ALREADY_RESOLVED: 0,
    PENDING_VERIFICATION: 0,
    RECURRING_ACTIVE: 0,
    NOT_ELIGIBLE: 0,
  },
  evaluatedAt: string = new Date().toISOString()
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

  for (const r of actionableRecommendations) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byRisk[r.risk] = (byRisk[r.risk] || 0) + 1;
  }

  return {
    evaluatedAt,
    recommendations: actionableRecommendations,
    resolvedOrCooldownRecommendations,
    totalCount: actionableRecommendations.length,
    byCategory,
    byRisk,
    byEligibility,
  };
}


