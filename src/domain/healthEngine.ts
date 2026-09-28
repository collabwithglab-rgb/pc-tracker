/**
 * Health Engine — Motore puro e deterministico di analisi salute del PC
 * (PC Care Center - Tranche 2)
 * 
 * Riceve fatti di sistema oggettivi (telemetria, S.M.A.R.T., volumi, sicurezza, manutenzione, tuning)
 * e produce un report trasparente HealthFinding[] con punteggio e categorizzazione per area.
 * 
 * Regola: Zero effetti collaterali, zero dipendenze UI, zero valori inventati.
 */

import {
  HealthFinding,
  HealthSeverity,
  HealthAffectedArea,
  SystemFactsInput,
  SystemHealthReport,
  AreaHealthSummary,
  DiagnosticCoverage,
  DiagnosticChannel,
  DiagnosticChannelStatus,
  DiagnosticCoverageLevel,
} from '../types/health';
import { isMetricAvailable } from '../services/monitoringService';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcola i giorni trascorsi tra una data target e una data di riferimento (o oggi).
 */
export function computeDaysBetween(targetDateIso: string, referenceDateIso?: string): number {
  const target = new Date(targetDateIso).getTime();
  if (isNaN(target)) return 0;

  const ref = referenceDateIso ? new Date(referenceDateIso).getTime() : Date.now();
  if (isNaN(ref)) return 0;

  return Math.max(0, Math.floor((ref - target) / MS_PER_DAY));
}

/**
 * Converte byte in gigabyte con arrotondamento a 1 decimale.
 */
function toGb(bytes: number): number {
  if (bytes <= 0 || isNaN(bytes)) return 0;
  return Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;
}

// Costanti denominate per soglie Memory Commit e Disponibilità Fisica (Rule J - No Magic Numbers)
export const MEMORY_COMMIT_HIGH_THRESHOLD_PERCENT = 88;
export const MEMORY_COMMIT_CRITICAL_THRESHOLD_PERCENT = 94;
export const MEMORY_PHYSICAL_LOW_AVAILABILITY_PERCENT = 15;
export const MEMORY_PHYSICAL_CRITICAL_AVAILABILITY_PERCENT = 8;

/**
 * Valuta obiettivamente i fatti di sistema e produce il report di salute completo.
 */
export function evaluateSystemHealth(facts: SystemFactsInput): SystemHealthReport {
  const findings: HealthFinding[] = [];
  const refDate = facts.referenceDate || new Date().toISOString();

  // 1. Valutazione Sottosistema Storage (S.M.A.R.T. e Volumi)
  evaluateStorageHealth(facts, findings);

  // 2. Valutazione Sottosistema Memoria RAM Fisica
  evaluateMemoryHealth(facts, findings);

  // 2b. Valutazione Diagnostica Spazio di Commit Memoria Virtuale (Tranche 7B)
  evaluateMemoryCommitAndPressure(facts, findings);

  // 3. Valutazione Integrità Periferiche e Driver Hardware (Tranche 7B)
  evaluateDeviceProblems(facts, findings);

  // 4. Valutazione Sottosistema GPU & Termiche (incluso confronto con Personal Baseline)
  evaluateGpuAndThermalHealth(facts, findings);

  // 5. Valutazione Registro Manutenzione e Cura Fisica
  evaluateMaintenanceHealth(facts, findings, refDate);

  // 6. Valutazione Integrità di Sistema e Sicurezza Kernel
  evaluateSystemAndSecurityHealth(facts, findings);

  // 6b. Valutazione Registro Eventi Hardware e Kernel (Tranche 8D-1)
  const eventFindings = evaluateEventLogHealth(facts);
  findings.push(...eventFindings);

  // 7. Calcolo del punteggio sintetico e ripartizione per area
  const report = buildHealthReport(findings, refDate);

  // 8. Calcolo puro della Copertura Diagnostica (indipendente dallo Health Score)
  report.diagnosticCoverage = computeDiagnosticCoverage(facts);

  return report;
}

// ---------------------------------------------------------------------------
// 1. STORAGE HEALTH EVALUATION
// ---------------------------------------------------------------------------

function evaluateStorageHealth(facts: SystemFactsInput, findings: HealthFinding[]): void {
  // A. Analisi S.M.A.R.T. e contatori di affidabilità fisici
  if (facts.smartDisks && facts.smartDisks.length > 0) {
    for (const disk of facts.smartDisks) {
      if (
        disk.smartStatus === 'permission_required' ||
        disk.smartStatus === 'unsupported' ||
        disk.smartStatus === 'unavailable'
      ) {
        // Registri SMART non accessibili o non supportati: non penalizzano lo Health Score.
        // Lo stato del canale è tracciato separatamente in computeDiagnosticCoverage.
        continue;
      }

      const isHealthyStatus = (disk.healthStatus || '').toLowerCase().includes('healthy');
      const hasErrors = disk.readErrorsTotal > 0 || disk.writeErrorsTotal > 0;
      const isCriticalWear = disk.wearPercentage !== undefined && disk.wearPercentage >= 90;
      const isHighWear = disk.wearPercentage !== undefined && disk.wearPercentage >= 80 && disk.wearPercentage < 90;
      const isOverheating = disk.temperatureCelsius !== undefined && disk.temperatureCelsius >= 70;

      const isExplicitlyUnhealthy =
        disk.healthStatus !== undefined &&
        disk.healthStatus.trim() !== '' &&
        !isHealthyStatus &&
        disk.healthStatus.toLowerCase() !== 'unknown';

      if (isExplicitlyUnhealthy || isCriticalWear || (disk.readErrorsTotal > 0 && disk.writeErrorsTotal > 0)) {
        findings.push({
          id: `smart-critical-${disk.deviceId}`,
          severity: 'CRITICAL',
          area: 'storage',
          title: `Integrità Disco Compromessa: ${disk.friendlyName}`,
          evidence: `Rilevati ${disk.readErrorsTotal} errori lettura, ${disk.writeErrorsTotal} errori scrittura, usura ${disk.wearPercentage ?? 'N/D'}%`,
          explanation: 'L\'unità di memorizzazione fisica presenta errori di lettura/scrittura o celle di memoria flash quasi esaurite. Rischio concreto di corruzione dati o guasto hardware.',
          confidence: 'HIGH',
          recommendedActionId: 'backup-disk',
          metadata: { deviceId: disk.deviceId, wear: disk.wearPercentage ?? 0 },
        });
      } else if (isHighWear) {
        findings.push({
          id: `smart-wear-warning-${disk.deviceId}`,
          severity: 'WARNING',
          area: 'storage',
          title: `Usura Elevata Celle SSD: ${disk.friendlyName}`,
          evidence: `Livello di usura al ${disk.wearPercentage}% (${100 - (disk.wearPercentage || 0)}% vita utile residua)`,
          explanation: 'L\'SSD ha consumato oltre l\'80% dei cicli di riscrittura garantiti dal produttore. È opportuno pianificare una sostituzione preventiva.',
          confidence: 'HIGH',
          recommendedActionId: 'monitor-storage',
        });
      } else if (isOverheating) {
        findings.push({
          id: `smart-temp-warning-${disk.deviceId}`,
          severity: 'WARNING',
          area: 'thermal',
          title: `Temperatura Elevata SSD: ${disk.friendlyName}`,
          evidence: `Temperatura del controller rilevata a ${disk.temperatureCelsius}°C`,
          explanation: 'Temperature prolungate superiori a 70°C degradano le prestazioni del controller NVMe per thermal throttling e ne accelerano l\'invecchiamento.',
          confidence: 'HIGH',
          recommendedActionId: 'inspect-cooling',
        });
      } else if (hasErrors) {
        findings.push({
          id: `smart-errors-attention-${disk.deviceId}`,
          severity: 'ATTENTION',
          area: 'storage',
          title: `Errori I/O Rilevati su Disco: ${disk.friendlyName}`,
          evidence: `${disk.readErrorsTotal} errori lettura, ${disk.writeErrorsTotal} errori scrittura registrati`,
          explanation: 'Errori isolati di I/O possono derivare da cavi SATA difettosi, contatti M.2 sporchi o settori danneggiati riallocati.',
          confidence: 'MEDIUM',
          recommendedActionId: 'check-disk',
        });
      } else if (isHealthyStatus && (disk.wearPercentage === undefined || disk.wearPercentage < 50)) {
        findings.push({
          id: `smart-healthy-${disk.deviceId}`,
          severity: 'GOOD',
          area: 'storage',
          title: `Stato S.M.A.R.T. Integro: ${disk.friendlyName}`,
          evidence: '0 errori I/O, stato di salute nominale verificato dal controller',
          explanation: 'Il supporto di memorizzazione opera nei parametri ottimali di fabbrica.',
          confidence: 'HIGH',
        });
      }
    }
  }

  // B. Analisi saturazione volumi logici (da drives o da monitoring snapshot)
  const volumeList = facts.drives && facts.drives.length > 0
    ? facts.drives.map((d) => ({
        letter: d.driveLetter.toUpperCase().replace(':', ''),
        usedBytes: d.totalBytes - d.freeBytes,
        totalBytes: d.totalBytes,
        freeBytes: d.freeBytes,
        isSSD: d.isSSD,
        trimSupported: d.trimSupported,
      }))
    : (facts.monitoring?.storage || []).map((s) => ({
        letter: s.driveLetter.toUpperCase().replace(':', ''),
        usedBytes: s.usedBytes,
        totalBytes: s.totalBytes,
        freeBytes: s.freeBytes,
        isSSD: true,
        trimSupported: true,
      }));

  for (const vol of volumeList) {
    if (vol.totalBytes <= 0) continue;
    const usagePct = (vol.usedBytes / vol.totalBytes) * 100;
    const freeGb = toGb(vol.freeBytes);
    const isSystemDrive = vol.letter === 'C';

    if (isSystemDrive) {
      if (usagePct >= 90 || vol.freeBytes < 15 * 1024 * 1024 * 1024) {
        findings.push({
          id: 'storage-c-critical',
          severity: 'CRITICAL',
          area: 'storage',
          title: 'Spazio Critico su Unità di Sistema C:',
          evidence: `Spazio occupato al ${usagePct.toFixed(1)}% (soli ${freeGb} GB liberi)`,
          explanation: 'Meno di 15 GB o oltre il 90% di occupazione su C: impedisce l\'installazione degli aggiornamenti cumulativi di Windows e la corretta allocazione del file di paging.',
          confidence: 'HIGH',
          recommendedActionId: 'clean-disk',
        });
      } else if (usagePct >= 82) {
        findings.push({
          id: 'storage-c-attention',
          severity: 'ATTENTION',
          area: 'storage',
          title: 'Spazio Ridotto su Unità di Sistema C:',
          evidence: `Spazio occupato all'${usagePct.toFixed(1)}% (${freeGb} GB liberi)`,
          explanation: 'Gli SSD NVMe/SATA riducono la velocità di scrittura sequenziale quando lo spazio libero scende sotto il 15-20% per saturazione della cache SLC.',
          confidence: 'HIGH',
          recommendedActionId: 'clean-disk',
        });
      } else {
        findings.push({
          id: 'storage-c-healthy',
          severity: 'GOOD',
          area: 'storage',
          title: 'Capacità Unità di Sistema C: Ottimale',
          evidence: `Spazio occupato al ${usagePct.toFixed(1)}% (${freeGb} GB liberi)`,
          explanation: 'Margine di spazio ampiamente sufficiente per cache, aggiornamenti e prestazioni ottimali dell\'SSD.',
          confidence: 'HIGH',
        });
      }
    } else {
      // Unità secondarie
      if (usagePct >= 95) {
        findings.push({
          id: `storage-${vol.letter}-warning`,
          severity: 'WARNING',
          area: 'storage',
          title: `Volume ${vol.letter}: Quasi Saturo`,
          evidence: `Occupazione al ${usagePct.toFixed(1)}% (${freeGb} GB liberi)`,
          explanation: 'Il volume di archiviazione secondario è prossimo al riempimento totale.',
          confidence: 'HIGH',
          recommendedActionId: 'clean-disk',
        });
      } else if (usagePct >= 88) {
        findings.push({
          id: `storage-${vol.letter}-attention`,
          severity: 'ATTENTION',
          area: 'storage',
          title: `Volume ${vol.letter}: Elevata Occupazione`,
          evidence: `Occupazione all'${usagePct.toFixed(1)}% (${freeGb} GB liberi)`,
          explanation: 'Lo spazio sul volume secondario sta esaurendosi.',
          confidence: 'MEDIUM',
        });
      }
    }

    // Segnalazione TRIM supportato
    if (vol.isSSD && vol.trimSupported) {
      findings.push({
        id: `storage-trim-supported-${vol.letter}`,
        severity: 'INFO',
        area: 'storage',
        title: `Ottimizzazione TRIM Supportata su ${vol.letter}:`,
        evidence: 'Il controller SSD supporta le istruzioni ATA/NVMe Dataset Management (TRIM)',
        explanation: 'Il comando TRIM notifica al controller i blocchi non più utilizzati dai file cancellati, mantenendo costante la velocità di scrittura.',
        confidence: 'HIGH',
        recommendedActionId: 'run-trim',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 2. MEMORY HEALTH EVALUATION
// ---------------------------------------------------------------------------

function evaluateMemoryHealth(facts: SystemFactsInput, findings: HealthFinding[]): void {
  const mem = facts.monitoring?.memory;
  if (!mem || mem.totalBytes <= 0) return;

  const usagePct = mem.utilizationPercent;
  const usedGb = toGb(mem.usedBytes);
  const totalGb = toGb(mem.totalBytes);
  const availGb = toGb(mem.availableBytes);

  if (usagePct >= 92) {
    findings.push({
      id: 'ram-critical-pressure',
      severity: 'WARNING',
      area: 'ram',
      title: 'Pressione Elevata su Memoria RAM',
      evidence: `Utilizzo al ${usagePct.toFixed(1)}% (${usedGb} GB usati su ${totalGb} GB totali)`,
      explanation: 'La memoria fisica RAM è quasi satura. Windows sta riversando attivamente pagine di memoria sul file di paging del disco, provocando cali di reattività e micro-stuttering.',
      confidence: 'HIGH',
      recommendedActionId: 'close-heavy-apps',
    });
  } else if (usagePct >= 82) {
    findings.push({
      id: 'ram-attention-pressure',
      severity: 'ATTENTION',
      area: 'ram',
      title: 'Carico Significativo di Memoria RAM',
      evidence: `Utilizzo all'${usagePct.toFixed(1)}% (${availGb} GB disponibili)`,
      explanation: 'Il sistema sta consumando oltre l\'80% della memoria fisica disponibile. Verifica la presenza di schede browser o processi in background ad alto consumo.',
      confidence: 'MEDIUM',
    });
  } else if (usagePct < 75) {
    findings.push({
      id: 'ram-healthy',
      severity: 'GOOD',
      area: 'ram',
      title: 'Margine di Memoria RAM Abbondante',
      evidence: `Utilizzo al ${usagePct.toFixed(1)}% (${availGb} GB memoria libera/in cache)`,
      explanation: 'La memoria fisica a disposizione favorisce un multitasking fluido minimizzando il ricorso allo swap su disco.',
      confidence: 'HIGH',
    });
  }
}

// ---------------------------------------------------------------------------
// 2b. MEMORY COMMIT & PRESSURE EVALUATION (TRANCHE 7B - RULE J)
// ---------------------------------------------------------------------------

function evaluateMemoryCommitAndPressure(facts: SystemFactsInput, findings: HealthFinding[]): void {
  const commit = facts.diagnostics?.memoryCommit;
  if (!commit || commit.availability !== 'available' || commit.commitLimitBytes <= 0) {
    // API non disponibile o unsupported: coverage only, nessun impatto sullo Health Score
    return;
  }

  const commitPct = commit.commitUtilizationPercent;
  const physPct = commit.physicalUtilizationPercent;
  const availPhysGb = toGb(commit.physicalAvailableBytes);
  const commitTotalGb = toGb(commit.commitTotalBytes);
  const commitLimitGb = toGb(commit.commitLimitBytes);
  const physAvailPct = 100 - physPct;

  // Saturazione critica: commit estremo E RAM fisica quasi esaurita
  if (
    commitPct >= MEMORY_COMMIT_CRITICAL_THRESHOLD_PERCENT &&
    physAvailPct <= MEMORY_PHYSICAL_CRITICAL_AVAILABILITY_PERCENT
  ) {
    findings.push({
      id: 'memory-commit-critical-exhaustion',
      severity: 'WARNING',
      area: 'ram',
      title: 'Saturazione Elevata dello Spazio di Commit',
      evidence: `Spazio di commit al ${commitPct.toFixed(1)}% (${commitTotalGb} GB su ${commitLimitGb} GB) e RAM fisica residua a soli ${availPhysGb} GB`,
      explanation: 'La memoria virtuale protetta dal file di paging e la RAM fisica sono prossime all\'esaurimento. Possibili rallentamenti marcati o errori di allocazione nelle applicazioni più pesanti.',
      confidence: 'HIGH',
      recommendedActionId: 'inspect-memory-pressure',
      metadata: { commitPct, physPct, commitTotalGb, commitLimitGb },
    });
  } else if (
    commitPct >= MEMORY_COMMIT_HIGH_THRESHOLD_PERCENT &&
    physAvailPct <= MEMORY_PHYSICAL_LOW_AVAILABILITY_PERCENT
  ) {
    findings.push({
      id: 'memory-commit-high-pressure',
      severity: 'ATTENTION',
      area: 'ram',
      title: 'Pressione Significativa sullo Spazio di Commit',
      evidence: `Spazio di commit all'${commitPct.toFixed(1)}% (${commitTotalGb} GB su ${commitLimitGb} GB, ${availPhysGb} GB RAM fisica disponibile)`,
      explanation: 'Le applicazioni attive hanno prenotato una quota consistente di spazio di commit nel sistema operativo. Il sistema opera correttamente ma con margine ridotto.',
      confidence: 'MEDIUM',
      recommendedActionId: 'inspect-memory-pressure',
      metadata: { commitPct, physPct },
    });
  } else if (commitPct < 75 && physPct < 75) {
    findings.push({
      id: 'memory-commit-optimal',
      severity: 'GOOD',
      area: 'ram',
      title: 'Spazio di Commit e Allocazione Memoria Ottimali',
      evidence: `Spazio di commit al ${commitPct.toFixed(1)}% (${commitTotalGb} GB su ${commitLimitGb} GB), RAM fisica disponibile ${availPhysGb} GB`,
      explanation: 'Ampio margine sia nella memoria RAM fisica che nel file di paging di Windows, ideale per carichi multitasking e sessioni di lavoro intensive.',
      confidence: 'HIGH',
    });
  }
}

// ---------------------------------------------------------------------------
// 2c. DEVICE & DRIVER FAULTS EVALUATION (TRANCHE 7B - RULE I)
// ---------------------------------------------------------------------------

function evaluateDeviceProblems(facts: SystemFactsInput, findings: HealthFinding[]): void {
  const devFacts = facts.diagnostics?.deviceProblems;
  if (!devFacts || devFacts.availability !== 'available') {
    // Canale non disponibile: tracciato in Diagnostic Coverage, nessun finding penalizzante
    return;
  }

  if (devFacts.problemCount === 0 || devFacts.devicesWithProblems.length === 0) {
    findings.push({
      id: 'device-tree-healthy',
      severity: 'GOOD',
      area: 'system',
      title: 'Tutti i Dispositivi e Driver Funzionanti',
      evidence: `${devFacts.totalDevicesScanned} nodi hardware scansionati in Gestione Dispositivi senza errori`,
      explanation: 'Nessuna periferica, controller o driver di sistema ha segnalato codici di errore o problemi di avvio a Windows.',
      confidence: 'HIGH',
    });
    return;
  }

  for (const dev of devFacts.devicesWithProblems) {
    const devName = dev.friendlyName || dev.deviceId;
    const isCritical = dev.severity === 'critical';
    const isWarning = dev.severity === 'warning';
    const isInfo = dev.severity === 'info';

    let severity: HealthSeverity = 'ATTENTION';
    if (isCritical) severity = 'CRITICAL';
    else if (isWarning) severity = 'WARNING';
    else if (isInfo) severity = 'INFO';

    const safeId = dev.deviceId.replace(/[^a-zA-Z0-9-_]/g, '_').slice(-24);
    findings.push({
      id: `device-fault-${dev.problemCode}-${safeId}`,
      severity,
      area: 'system',
      title: `Problema Periferica: ${devName}`,
      evidence: `${dev.problemLabel}: ${dev.problemDescription}`,
      explanation: `Windows segnala uno stato anomalo per il dispositivo. Codice problema: ${dev.problemCode}. Stato flag: 0x${dev.statusFlags.toString(16).toUpperCase()}.`,
      confidence: 'HIGH',
      recommendedActionId: 'inspect-device-fault',
      metadata: { deviceId: dev.deviceId, problemCode: dev.problemCode },
    });
  }
}

// ---------------------------------------------------------------------------
// 3. GPU & THERMAL EVALUATION (CON PERSONAL BASELINE)
// ---------------------------------------------------------------------------

function evaluateGpuAndThermalHealth(facts: SystemFactsInput, findings: HealthFinding[]): void {
  const gpus = facts.monitoring?.gpus;
  if (!gpus || gpus.length === 0) return;

  // Cerca un profilo Daily GPU per il confronto con Personal Baseline
  const dailyGpuProfile = (facts.tuningProfiles || []).find(
    (p) => p.category === 'gpu' && p.stability === 'daily' && p.temperatures?.load !== undefined
  );
  const baselineLoadTemp = dailyGpuProfile?.temperatures?.load;

  for (const gpu of gpus) {
    if (!gpu.isDiscrete && gpus.some((g) => g.isDiscrete)) {
      // Ignora alert termici secondari per la iGPU se è presente una GPU dedicata attiva
      continue;
    }

    if (isMetricAvailable(gpu.coreTemperatureCelsius)) {
      const temp = gpu.coreTemperatureCelsius.value;

      if (temp >= 88) {
        findings.push({
          id: `gpu-temp-critical-${gpu.id}`,
          severity: 'CRITICAL',
          area: 'thermal',
          title: `Surriscaldamento Critico GPU: ${gpu.name}`,
          evidence: `Temperatura di funzionamento a ${temp}°C`,
          explanation: 'La GPU opera oltre la soglia termica di sicurezza di picco. Il chip applica il thermal throttling forzato riducendo frequenze e voltaggi.',
          confidence: 'HIGH',
          recommendedActionId: 'inspect-cooling',
        });
      } else if (temp >= 82) {
        findings.push({
          id: `gpu-temp-warning-${gpu.id}`,
          severity: 'WARNING',
          area: 'thermal',
          title: `Temperatura GPU Elevata: ${gpu.name}`,
          evidence: `Temperatura rilevata di ${temp}°C`,
          explanation: 'La temperatura operativa della scheda video è superiore alla media ideale (65-78°C). È consigliata una verifica del profilo ventole o del flusso d\'aria del case.',
          confidence: 'HIGH',
          recommendedActionId: 'inspect-cooling',
        });
      } else if (temp <= 74 && temp >= 25) {
        findings.push({
          id: `gpu-temp-healthy-${gpu.id}`,
          severity: 'GOOD',
          area: 'thermal',
          title: `Termiche GPU Ottimali: ${gpu.name}`,
          evidence: `Temperatura operativa a ${temp}°C`,
          explanation: 'Il sistema di dissipazione della scheda grafica mantiene temperature eccellenti.',
          confidence: 'HIGH',
        });
      }

      // Confronto Personal Baseline
      if (
        baselineLoadTemp !== undefined &&
        isMetricAvailable(gpu.utilizationPercent) &&
        gpu.utilizationPercent.value >= 75
      ) {
        const delta = temp - baselineLoadTemp;
        if (delta >= 8) {
          findings.push({
            id: `gpu-baseline-divergence-${gpu.id}`,
            severity: 'WARNING',
            area: 'thermal',
            title: `Deviazione Termica da Personal Baseline: ${gpu.name}`,
            evidence: `Carico al ${gpu.utilizationPercent.value}%: ${temp}°C misurati (+${delta.toFixed(0)}°C rispetto al riferimento Daily registrato di ${baselineLoadTemp}°C)`,
            explanation: `La GPU sotto carico opera ${delta.toFixed(0)}°C più calda rispetto a quando hai validato il tuo profilo Daily ("${dailyGpuProfile?.name}"). Questa deviazione può indicare polvere accumulata nei radiatori o degrado della pasta termica.`,
            confidence: 'HIGH',
            recommendedActionId: 'clean-filters',
            metadata: { currentTemp: temp, baselineTemp: baselineLoadTemp, delta },
          });
        }
      }
    }

    // Monitoraggio VRAM Saturation
    if (isMetricAvailable(gpu.vramUtilizationPercent) && gpu.vramUtilizationPercent.value >= 95) {
      findings.push({
        id: `gpu-vram-saturation-${gpu.id}`,
        severity: 'ATTENTION',
        area: 'gpu',
        title: `Memoria Video VRAM Quasi Satura: ${gpu.name}`,
        evidence: `VRAM occupata al ${gpu.vramUtilizationPercent.value}%`,
        explanation: 'La memoria grafica dedicata è prossima all\'esaurimento. Se i giochi superano la VRAM, l\'allocazione scivola sulla RAM di sistema provocando cali di FPS.',
        confidence: 'HIGH',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 4. MAINTENANCE & LONGEVITY EVALUATION
// ---------------------------------------------------------------------------

function evaluateMaintenanceHealth(
  facts: SystemFactsInput,
  findings: HealthFinding[],
  refDate: string
): void {
  const entries = facts.maintenanceEntries || [];

  // A. Analisi Pasta Termica
  const thermalPasteEntries = entries
    .filter((e) => e.type === 'thermal_paste' || e.type === 'thermal_pad')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (thermalPasteEntries.length > 0) {
    const latest = thermalPasteEntries[0];
    const days = computeDaysBetween(latest.date, refDate);

    if (days >= 730) {
      findings.push({
        id: 'maint-thermal-paste-overdue',
        severity: 'WARNING',
        area: 'maintenance',
        title: 'Sostituzione Pasta Termica Consigliata',
        evidence: `Ultima applicazione registrata ${days} giorni fa (${latest.date})`,
        explanation: 'Le paste termiche standard a base di ossidi metallici o polimeri subiscono degradazione (pump-out ed essiccamento) dopo 2 anni di cicli termici.',
        confidence: 'HIGH',
        recommendedActionId: 'apply-thermal-paste',
        metadata: { daysElapsed: days, lastDate: latest.date },
      });
    } else if (days >= 365) {
      findings.push({
        id: 'maint-thermal-paste-monitor',
        severity: 'ATTENTION',
        area: 'maintenance',
        title: 'Pasta Termica: Ispezione Annuale Consigliata',
        evidence: `Ultima applicazione ${days} giorni fa (${latest.date})`,
        explanation: 'È trascorso oltre un anno dall\'ultima applicazione. Verifica che le temperature in idle e sotto carico non mostrino aumenti anomali.',
        confidence: 'MEDIUM',
      });
    } else if (days <= 90) {
      findings.push({
        id: 'maint-thermal-paste-fresh',
        severity: 'GOOD',
        area: 'maintenance',
        title: 'Pasta Termica Recente e Protetta',
        evidence: `Sostituita di recente (${days} giorni fa, ${latest.productUsed || 'pasta applicata'})`,
        explanation: 'Il composto termoconduttivo tra CPU/GPU e dissipatore è fresco e favorisce un ottimale scambio termico.',
        confidence: 'HIGH',
      });
    }
  } else if ((facts.currentRigComponents || []).some((c) => c.category === 'cpu' || c.category === 'gpu')) {
    findings.push({
      id: 'maint-thermal-paste-never',
      severity: 'INFO',
      area: 'maintenance',
      title: 'Nessun Cambio Pasta Termica nel Registro',
      evidence: 'Nessun intervento registrato nel diario di cura del PC',
      explanation: 'Annotare le sostituzioni di pasta o pad termici nel registro consente all\'Health Engine di calcolare le scadenze e confrontare le temperature storiche.',
      confidence: 'HIGH',
      recommendedActionId: 'log-maintenance',
    });
  }

  // B. Analisi Pulizia Filtri e Ventole
  const cleaningEntries = entries
    .filter((e) => e.type === 'cleaning' || e.type === 'filter_cleaning' || e.type === 'fan_cleaning')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (cleaningEntries.length > 0) {
    const latest = cleaningEntries[0];
    const days = computeDaysBetween(latest.date, refDate);

    if (days >= 180) {
      findings.push({
        id: 'maint-filters-due',
        severity: 'ATTENTION',
        area: 'maintenance',
        title: 'Pulizia Filtri Antipolvere Consigliata',
        evidence: `Ultima pulizia registrata ${days} giorni fa (${latest.date})`,
        explanation: 'I filtri antipolvere del case tendono a intasarsi dopo 4-6 mesi, riducendo l\'apporto d\'aria fresca verso radiatori e scheda video.',
        confidence: 'HIGH',
        recommendedActionId: 'clean-filters',
      });
    } else if (days <= 45) {
      findings.push({
        id: 'maint-filters-clean',
        severity: 'GOOD',
        area: 'maintenance',
        title: 'Filtri Antipolvere e Flusso d\'Aria Puliti',
        evidence: `Pulizia effettuata di recente (${days} giorni fa)`,
        explanation: 'Il flusso d\'aria in aspirazione è libero da accumuli di polvere, favorendo il raffreddamento passivo e attivo.',
        confidence: 'HIGH',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 5. SYSTEM INTEGRITY & SECURITY EVALUATION
// ---------------------------------------------------------------------------

function evaluateSystemAndSecurityHealth(facts: SystemFactsInput, findings: HealthFinding[]): void {
  // A. Integrità File di Sistema Windows (SFC)
  if (facts.systemFilesStatus === 'corrupted') {
    findings.push({
      id: 'system-sfc-corrupted',
      severity: 'WARNING',
      area: 'system',
      title: 'File di Sistema Windows Danneggiati',
      evidence: 'La verifica di integrità SFC (System File Checker) ha riscontrato file protetti alterati o corrotti',
      explanation: 'File di sistema corrotti possono provocare crash casuali, errori nelle DLL di runtime e malfunzionamenti del sottosistema Windows Update.',
      confidence: 'HIGH',
      recommendedActionId: 'sfc-repair',
    });
  } else if (facts.systemFilesStatus === 'clean') {
    findings.push({
      id: 'system-sfc-clean',
      severity: 'GOOD',
      area: 'system',
      title: 'Integrità File di Sistema Windows Convalidata',
      evidence: 'Scansione SFC completata: nessuna violazione di integrità riscontrata',
      explanation: 'Tutti i componenti fondamentali del sistema operativo corrispondono agli hash crittografici ufficiali Microsoft.',
      confidence: 'HIGH',
    });
  }

  // B. Audit Sicurezza Kernel e Hardware
  const sec = facts.securityAudit;
  if (sec) {
    if (!sec.secureBootEnabled) {
      findings.push({
        id: 'sec-secure-boot-disabled',
        severity: 'ATTENTION',
        area: 'security',
        title: 'Secure Boot Non Attivo nel Firmware',
        evidence: 'Stato rilevato da Windows UEFI: disabilitato',
        explanation: 'Secure Boot impedisce l\'esecuzione di bootkit e codice malevolo prima del caricamento del sistema operativo. È consigliabile attivarlo nel BIOS.',
        confidence: 'HIGH',
        recommendedActionId: 'enable-secure-boot',
      });
    }

    if (!sec.tpmPresent || !sec.tpmReady) {
      findings.push({
        id: 'sec-tpm-missing',
        severity: 'ATTENTION',
        area: 'security',
        title: 'Modulo TPM 2.0 Assente o Non Inizializzato',
        evidence: 'TPM non rilevato o non pronto all\'uso',
        explanation: 'Il modulo TPM è richiesto da Windows 11 per BitLocker, isolamento credenziali e protezione biometrica Windows Hello.',
        confidence: 'HIGH',
      });
    }

    if (!sec.vbsRunning) {
      findings.push({
        id: 'sec-vbs-disabled',
        severity: 'INFO',
        area: 'security',
        title: 'Virtualization-Based Security (VBS) Non Attiva',
        evidence: 'Isolamento basato su virtualizzazione non attivo',
        explanation: 'VBS utilizza l\'hypervisor di Windows per creare un ambiente sicuro di memoria separato dal sistema operativo.',
        confidence: 'MEDIUM',
      });
    }

    if (!sec.hvciRunning) {
      findings.push({
        id: 'sec-hvci-disabled',
        severity: 'INFO',
        area: 'security',
        title: 'Integrità della Memoria (HVCI) Disabilitata',
        evidence: 'Controllo crittografico del codice kernel inattivo',
        explanation: 'L\'integrità della memoria protegge i processi del kernel da attacchi di iniezione di codice da parte di driver difettosi o malevoli.',
        confidence: 'MEDIUM',
      });
    }

    if (sec.hostsCustomEntriesCount > 10) {
      findings.push({
        id: 'sec-hosts-custom-rules',
        severity: 'ATTENTION',
        area: 'security',
        title: 'Numerose Regole Personalizzate nel File Hosts',
        evidence: `${sec.hostsCustomEntriesCount} regole custom rilevate in System32\\drivers\\etc\\hosts`,
        explanation: 'Un elevato numero di voci nel file hosts può causare problemi di risoluzione DNS o essere residuo di adware / software di blocco.',
        confidence: 'MEDIUM',
      });
    }

    if (sec.secureBootEnabled && sec.tpmReady && sec.vbsRunning && sec.hvciRunning) {
      findings.push({
        id: 'sec-optimal-security',
        severity: 'GOOD',
        area: 'security',
        title: 'Sicurezza Piattaforma e Kernel Ottimale',
        evidence: 'Secure Boot, TPM 2.0, VBS e HVCI tutti attivi',
        explanation: 'La piattaforma Windows sfrutta al massimo le difese hardware e hypervisor di sicurezza.',
        confidence: 'HIGH',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 5b. EVENT LOG HARDWARE & KERNEL HEALTH EVALUATION (TRANCHE 8D-1)
// ---------------------------------------------------------------------------

/**
 * Costanti di soglia per la severità degli eventi (PRODUCT_SEVERITY_POLICY).
 * Definite specificamente come policy deterministica di prodotto di PC Tracker, non standard Microsoft.
 */
export const WHEA_17_ATTENTION_THRESHOLD = 5;
export const WHEA_18_CRITICAL_THRESHOLD = 2;
export const WHEA_19_WARNING_THRESHOLD = 3;
export const WHEA_47_WARNING_THRESHOLD = 3;
export const DISK_7_REPEATED_THRESHOLD = 3;
export const DISPLAY_4101_FREQUENT_THRESHOLD = 3;

/**
 * Valutazione pura dei fatti del Registro Eventi di Windows (Tranche 8D-1).
 * 
 * Regole architetturali:
 * - Funzione pura: riceve facts e restituisce SEMPRE un nuovo array di HealthFinding[].
 * - Nessuna mutazione degli input.
 * - Nessun uso di Date.now() o stato globale.
 * - Availability Gate: se availability !== 'available', restituisce [].
 *   events: [] con availability !== 'available' NON indica registro pulito.
 * - Truncation Safety: se truncated === true, usa "nel campione limitato di diagnostica".
 * - Divieto categorico di parole causali non dimostrate (es. "CPU guasta", "alimentatore guasto", ecc.).
 */
export function evaluateEventLogHealth(facts: SystemFactsInput): HealthFinding[] {
  const eventLog = facts.diagnostics?.eventLog;
  if (!eventLog || eventLog.availability !== 'available') {
    return [];
  }

  const rawEvents = eventLog.events;
  if (!rawEvents || rawEvents.length === 0) {
    return [];
  }

  const isTruncated = eventLog.truncated ?? false;
  const findings: HealthFinding[] = [];

  // Helper locale per format evidence conforme a Truncation Safety
  const formatEvidence = (count: number, desc: string): string => {
    if (isTruncated) {
      return `${count} ${count === 1 ? 'evento rilevato' : 'eventi rilevati'} nel campione limitato di diagnostica (${desc})`;
    }
    return `${count} ${count === 1 ? 'evento registrato' : 'eventi registrati'} nel registro di sistema (${desc})`;
  };

  // 1. Filtraggio e Raggruppamento per Categoria di Evento Supportata
  // L'ordine di valutazione è FISSO e DETERMINISTICO per garantire Permutation Invariance:
  // WHEA 17, WHEA 18, WHEA 19, WHEA 47, KP41, Disk 7, Disk 11, Disk 51, NTFS 55, NTFS 98, Display 4101

  // A. WHEA 17 (PCIe Corrected)
  const whea17Events = rawEvents.filter(
    (e) => e.provider.toLowerCase().includes('whea') && e.eventId === 17
  );
  if (whea17Events.length > 0) {
    const count = whea17Events.length;
    const isRepeated = count >= WHEA_17_ATTENTION_THRESHOLD;
    findings.push({
      id: isRepeated ? 'event-whea-17-repeated' : 'event-whea-17-isolated',
      severity: isRepeated ? 'ATTENTION' : 'INFO',
      area: 'system',
      title: isRepeated ? 'Segnali Ripetuti Corretti Bus PCIe (WHEA 17)' : 'Segnali Corretti Bus PCIe (WHEA 17)',
      evidence: formatEvidence(count, 'WHEA 17: correzione errori trasmissione bus PCIe'),
      explanation: isRepeated
        ? 'Rilevati frequenti segnali di correzione automatica sul bus PCIe (policy PC Tracker: 5 o più eventi). Suggerisce la verifica del corretto alloggiamento delle schede di espansione o dei supporti M.2.'
        : 'Rilevati segnali di correzione automatica sul bus PCIe. L\'architettura hardware e Windows hanno gestito e corretto l\'anomalia in modo trasparente senza perdita di dati.',
      confidence: 'HIGH',
      metadata: { eventId: 17, count, isTruncated },
    });
  }

  // B. WHEA 18 (Uncorrected Hardware MCE)
  const whea18Events = rawEvents.filter(
    (e) => e.provider.toLowerCase().includes('whea') && e.eventId === 18
  );
  if (whea18Events.length > 0) {
    const count = whea18Events.length;
    const isRepeated = count >= WHEA_18_CRITICAL_THRESHOLD;
    findings.push({
      id: isRepeated ? 'event-whea-18-repeated' : 'event-whea-18-single',
      severity: isRepeated ? 'CRITICAL' : 'WARNING',
      area: 'cpu',
      title: isRepeated
        ? 'Eccezioni Hardware MCE Non Corrette Ricorrenti (WHEA 18)'
        : 'Eccezione Hardware MCE Non Corretta (WHEA 18)',
      evidence: formatEvidence(count, 'WHEA 18: eccezione hardware irreversibile non corretta dal processore'),
      explanation: isRepeated
        ? 'Rilevate molteplici eccezioni hardware MCE irreversibili (policy PC Tracker: 2 o più eventi). Il processore segnala instabilità di calcolo o tensione che richiede la verifica dei profili operativi.'
        : 'Rilevata eccezione hardware Machine Check Exception (MCE) non corretta segnalata dal processore a Windows. Indica instabilità temporanea di calcolo o tensione, senza presupporre un danno permanente al silicio.',
      confidence: 'HIGH',
      metadata: { eventId: 18, count, isTruncated },
    });
  }

  // C. WHEA 19 (Corrected Hardware MCE)
  const whea19Events = rawEvents.filter(
    (e) => e.provider.toLowerCase().includes('whea') && e.eventId === 19
  );
  if (whea19Events.length > 0) {
    const count = whea19Events.length;
    const isRepeated = count >= WHEA_19_WARNING_THRESHOLD;
    findings.push({
      id: isRepeated ? 'event-whea-19-repeated' : 'event-whea-19-isolated',
      severity: isRepeated ? 'WARNING' : 'ATTENTION',
      area: 'cpu',
      title: isRepeated
        ? 'Frequenti Segnali MCE Corretti dall\'Hardware (WHEA 19)'
        : 'Segnali MCE Corretti dall\'Hardware (WHEA 19)',
      evidence: formatEvidence(count, 'WHEA 19: correzione interna errori MCE dal processore'),
      explanation: isRepeated
        ? 'Rilevate frequenti correzioni hardware MCE dal processore (policy PC Tracker: 3 o più eventi). Segnala instabilità di margine nei calcoli interni della CPU.'
        : 'Rilevati errori hardware Machine Check Exception (MCE) corretti autonomamente dal processore prima di generare un blocco. Indica un\'anomalia gestita senza interruzione del sistema operativo.',
      confidence: 'HIGH',
      metadata: { eventId: 19, count, isTruncated },
    });
  }

  // D. WHEA 47 (Corrected Memory)
  const whea47Events = rawEvents.filter(
    (e) => e.provider.toLowerCase().includes('whea') && e.eventId === 47
  );
  if (whea47Events.length > 0) {
    const count = whea47Events.length;
    const isRepeated = count >= WHEA_47_WARNING_THRESHOLD;
    findings.push({
      id: isRepeated ? 'event-whea-47-repeated' : 'event-whea-47-isolated',
      severity: isRepeated ? 'WARNING' : 'ATTENTION',
      area: 'ram',
      title: isRepeated
        ? 'Frequenti Correzioni Memoria Rilevate (WHEA 47)'
        : 'Segnali di Correzione Memoria (WHEA 47)',
      evidence: formatEvidence(count, 'WHEA 47: correzione errore memoria RAM/controller'),
      explanation: isRepeated
        ? 'Rilevate frequenti correzioni di memoria (policy PC Tracker: 3 o più eventi). Segnala potenziale instabilità nei banchi RAM o nei profili di memoria.'
        : 'Rilevato errore di memoria corretto dal controller o dal meccanismo di parità. L\'integrità dei dati in esecuzione è stata preservata.',
      confidence: 'HIGH',
      metadata: { eventId: 47, count, isTruncated },
    });
  }

  // E. Kernel-Power 41 (Unclean Reboot / Bugcheck)
  const kp41Events = rawEvents.filter(
    (e) => e.provider.toLowerCase().includes('kernel-power') && e.eventId === 41
  );
  if (kp41Events.length > 0) {
    const bugcheckEvents = kp41Events.filter(
      (e) => e.payload?.type === 'kernelPower' && e.payload.bugcheckCode !== 0
    );
    const nonBugcheckEvents = kp41Events.filter(
      (e) => !e.payload || e.payload.type !== 'kernelPower' || e.payload.bugcheckCode === 0
    );

    if (nonBugcheckEvents.length > 0) {
      const count = nonBugcheckEvents.length;
      findings.push({
        id: 'event-kp41-unclean-reboot',
        severity: 'ATTENTION',
        area: 'system',
        title: 'Riavvio Imprevisto di Sistema (Kernel-Power 41)',
        evidence: formatEvidence(count, 'Kernel-Power 41: arresto anomalo senza codice bugcheck (0x0)'),
        explanation: 'Il computer si è arrestato o riavviato senza completare la consueta procedura di spegnimento (es. interruzione di corrente, pressione del tasto reset o blocco improvviso). Non indica necessariamente un guasto dell\'alimentatore o della scheda madre.',
        confidence: 'HIGH',
        metadata: { eventId: 41, bugcheckCode: 0, count, isTruncated },
      });
    }

    if (bugcheckEvents.length > 0) {
      const count = bugcheckEvents.length;
      const sampleBugcheck = (bugcheckEvents[0].payload as { type: 'kernelPower'; bugcheckCode: number }).bugcheckCode;
      const hexCode = `0x${sampleBugcheck.toString(16).toUpperCase()}`;
      findings.push({
        id: 'event-kp41-bugcheck',
        severity: 'WARNING',
        area: 'system',
        title: 'Riavvio Imprevisto con Codice Bugcheck (Kernel-Power 41)',
        evidence: formatEvidence(count, `Kernel-Power 41: arresto anomalo con codice bugcheck kernel ${hexCode}`),
        explanation: `Il sistema ha registrato un arresto anomalo del kernel con codice bugcheck ${hexCode}. Indica un crash di sistema gestito dal kernel senza implicare un guasto fisico accertato dell'alimentatore o della scheda madre.`,
        confidence: 'HIGH',
        metadata: { eventId: 41, bugcheckCode: sampleBugcheck, count, isTruncated },
      });
    }
  }

  // F. Disk 7 (Bad Block)
  const disk7Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'disk' && e.eventId === 7
  );
  if (disk7Events.length > 0) {
    const count = disk7Events.length;
    const hasCorroboratedSmart = (facts.smartDisks || []).some(
      (d) => d.readErrorsTotal > 0 || d.writeErrorsTotal > 0
    );
    const hasCorroboratedDevFault = (facts.diagnostics?.deviceProblems?.devicesWithProblems || []).some(
      (d) => (d.severity === 'critical' || d.severity === 'warning') && d.deviceId.toLowerCase().includes('disk')
    );
    const isRepeatedOrCorroborated = count >= DISK_7_REPEATED_THRESHOLD || hasCorroboratedSmart || hasCorroboratedDevFault;
    const target = disk7Events[0].targetContext || 'dispositivo di archiviazione';

    findings.push({
      id: isRepeatedOrCorroborated ? 'event-disk-7-repeated' : 'event-disk-7-isolated',
      severity: isRepeatedOrCorroborated ? 'WARNING' : 'ATTENTION',
      area: 'storage',
      title: isRepeatedOrCorroborated
        ? 'Blocchi Danneggiati Rilevati su Disco (Disk 7)'
        : 'Segnalazione Blocco Danneggiato su Disco (Disk 7)',
      evidence: formatEvidence(count, `disk 7: blocco con difficoltà di lettura su ${target}`),
      explanation: isRepeatedOrCorroborated
        ? 'Rilevati molteplici eventi di blocco danneggiato o confermati da anomalie nel comparto di archiviazione. È consigliata una scansione di coerenza e un controllo preventivo dei backup.'
        : 'Il driver del disco ha segnalato un blocco con difficoltà di lettura. Può trattarsi di un settore riallocato o di un errore transitorio di I/O, senza implicare la rottura immediata del supporto.',
      confidence: 'HIGH',
      recommendedActionId: 'chkdsk-scan',
      metadata: { eventId: 7, count, isTruncated },
    });
  }

  // G. Disk 11 (Controller Communication Error)
  const disk11Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'disk' && e.eventId === 11
  );
  if (disk11Events.length > 0) {
    const count = disk11Events.length;
    const target = disk11Events[0].targetContext || 'controller storage';
    findings.push({
      id: 'event-disk-11-communication',
      severity: 'ATTENTION',
      area: 'storage',
      title: 'Segnali di Comunicazione Controller Storage (Disk 11)',
      evidence: formatEvidence(count, `disk 11: difficoltà di comunicazione del controller su ${target}`),
      explanation: 'Il driver di archiviazione ha rilevato un errore di comunicazione o timeout con il controller del disco. Può dipendere da contatti, cavi dati o gestione energetica dell\'interfaccia.',
      confidence: 'MEDIUM',
      metadata: { eventId: 11, count, isTruncated },
    });
  }

  // H. Disk 51 (Paging Operation Error)
  const disk51Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'disk' && e.eventId === 51
  );
  if (disk51Events.length > 0) {
    const count = disk51Events.length;
    const target = disk51Events[0].targetContext || 'file di paging';
    findings.push({
      id: 'event-disk-51-paging',
      severity: 'ATTENTION',
      area: 'storage',
      title: 'Segnale di Errore I/O durante Paging su Disco (Disk 51)',
      evidence: formatEvidence(count, `disk 51: errore durante operazione di paging su ${target}`),
      explanation: 'Si è verificato un errore durante un\'operazione di paging su disco. Indica contesa I/O o latenza elevata durante la scrittura della memoria virtuale, trattandosi di un segnale di allerta temporaneo del sottosistema di archiviazione.',
      confidence: 'MEDIUM',
      metadata: { eventId: 51, count, isTruncated },
    });
  }

  // I. NTFS 55 (Filesystem Structure Corrupted)
  const ntfs55Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'ntfs' && e.eventId === 55
  );
  if (ntfs55Events.length > 0) {
    const count = ntfs55Events.length;
    const target = ntfs55Events[0].targetContext || 'volume NTFS';
    findings.push({
      id: 'event-ntfs-55-corruption',
      severity: 'WARNING',
      area: 'storage',
      title: 'Struttura File System Danneggiata (NTFS 55)',
      evidence: formatEvidence(count, `Ntfs 55: corruzione logica della struttura file system su ${target}`),
      explanation: 'Il sottosistema NTFS ha riscontrato un danneggiamento nella struttura logica del file system su una partizione. È necessaria una verifica di integrità con l\'utility CHKDSK per prevenire incongruenze nei dati.',
      confidence: 'HIGH',
      recommendedActionId: 'chkdsk-scan',
      metadata: { eventId: 55, count, isTruncated },
    });
  }

  // J. NTFS 98 (Filesystem Check / Verification Signal)
  const ntfs98Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'ntfs' && e.eventId === 98
  );
  if (ntfs98Events.length > 0) {
    const count = ntfs98Events.length;
    const target = ntfs98Events[0].targetContext || 'volume NTFS';
    const isCheckRequired = ntfs98Events.some(
      (e) =>
        e.level === 3 ||
        (e.payload?.type === 'ntfs' && e.payload.repairHint && /check|scan|repair|corrupt|chkdsk/i.test(e.payload.repairHint)) ||
        (e.targetContext && /check|repair|scan|corrupt|required/i.test(e.targetContext))
    );

    if (isCheckRequired) {
      findings.push({
        id: 'event-ntfs-98-check-required',
        severity: 'ATTENTION',
        area: 'storage',
        title: 'Verifica Integrità File System Richiesta (NTFS 98)',
        evidence: formatEvidence(count, `Ntfs 98: richiesta di scansione o controllo di integrità per ${target}`),
        explanation: 'Il file system NTFS ha notificato la necessità di una scansione di coerenza sul volume. È opportuno pianificare un controllo del volume con CHKDSK per assicurare la consistenza della tabella dei file.',
        confidence: 'HIGH',
        recommendedActionId: 'chkdsk-scan',
        metadata: { eventId: 98, count, checkRequired: true, isTruncated },
      });
    } else {
      findings.push({
        id: 'event-ntfs-98-verified',
        severity: 'INFO',
        area: 'storage',
        title: 'Notifica Verifica Integrità File System (NTFS 98)',
        evidence: formatEvidence(count, `Ntfs 98: controllo di integrità registrato per ${target}`),
        explanation: 'Il file system NTFS ha completato o registrato un controllo informativo di coerenza sul volume, senza evidenza di violazioni catastrofiche.',
        confidence: 'HIGH',
        metadata: { eventId: 98, count, checkRequired: false, isTruncated },
      });
    }
  }

  // K. Display 4101 (TDR Driver Reset)
  const display4101Events = rawEvents.filter(
    (e) => e.provider.toLowerCase() === 'display' && e.eventId === 4101
  );
  if (display4101Events.length > 0) {
    const count = display4101Events.length;
    const isFrequent = count >= DISPLAY_4101_FREQUENT_THRESHOLD;
    const driverName =
      (display4101Events[0].payload?.type === 'display' && display4101Events[0].payload.driverName) ||
      display4101Events[0].targetContext ||
      'driver video';

    findings.push({
      id: isFrequent ? 'event-display-tdr-frequent' : 'event-display-tdr-isolated',
      severity: isFrequent ? 'WARNING' : 'ATTENTION',
      area: 'gpu',
      title: isFrequent
        ? 'Frequenti Ripristini Driver Video TDR (Display 4101)'
        : 'Ripristino Driver Video per Timeout TDR (Display 4101)',
      evidence: formatEvidence(count, `Display 4101: timeout e ripristino del driver grafico (${driverName})`),
      explanation: isFrequent
        ? 'Rilevati molteplici eventi TDR di ripristino del driver video (policy PC Tracker: 3 o più eventi). Suggerisce instabilità dell\'ambiente grafico, incompatibilità driver o corruzione della shader cache.'
        : 'Windows ha rilevato un blocco temporaneo del driver grafico e ne ha eseguito il ripristino automatico (Timeout Detection and Recovery). Indica un\'interruzione momentanea dell\'ambiente video ripristinata dal sistema operativo.',
      confidence: 'HIGH',
      recommendedActionId: 'clean-shader-cache',
      metadata: { eventId: 4101, count, isTruncated },
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 6. HEALTH REPORT & SCORE CALCULATION
// ---------------------------------------------------------------------------

function buildHealthReport(findings: HealthFinding[], evaluatedAt: string): SystemHealthReport {
  let criticalCount = 0;
  let warningCount = 0;
  let attentionCount = 0;
  let goodCount = 0;
  let infoCount = 0;

  const areaMap: Record<HealthAffectedArea, { critical: number; warning: number; attention: number; total: number }> = {
    cpu: { critical: 0, warning: 0, attention: 0, total: 0 },
    gpu: { critical: 0, warning: 0, attention: 0, total: 0 },
    ram: { critical: 0, warning: 0, attention: 0, total: 0 },
    storage: { critical: 0, warning: 0, attention: 0, total: 0 },
    thermal: { critical: 0, warning: 0, attention: 0, total: 0 },
    maintenance: { critical: 0, warning: 0, attention: 0, total: 0 },
    system: { critical: 0, warning: 0, attention: 0, total: 0 },
    security: { critical: 0, warning: 0, attention: 0, total: 0 },
  };

  for (const f of findings) {
    areaMap[f.area].total += 1;
    switch (f.severity) {
      case 'CRITICAL':
        criticalCount++;
        areaMap[f.area].critical += 1;
        break;
      case 'WARNING':
        warningCount++;
        areaMap[f.area].warning += 1;
        break;
      case 'ATTENTION':
        attentionCount++;
        areaMap[f.area].attention += 1;
        break;
      case 'GOOD':
        goodCount++;
        break;
      case 'INFO':
        infoCount++;
        break;
    }
  }

  // Calcolo del punteggio sintetico:
  // Base 100
  // -25 per ogni CRITICAL
  // -12 per ogni WARNING
  // -4 per ogni ATTENTION
  const penalty = criticalCount * 25 + warningCount * 12 + attentionCount * 4;
  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  // Stato generale deterministico
  let overallStatus: SystemHealthReport['overallStatus'] = 'healthy';
  if (criticalCount > 0 || healthScore < 50) {
    overallStatus = 'critical';
  } else if (warningCount > 0 || healthScore < 75) {
    overallStatus = 'warning';
  } else if (attentionCount > 0 || healthScore < 90) {
    overallStatus = 'attention';
  }

  // Ripartizione per area
  const areaBreakdown = Object.entries(areaMap).reduce(
    (acc, [areaKey, counts]) => {
      const area = areaKey as HealthAffectedArea;
      let status: AreaHealthSummary['status'] = 'healthy';
      if (counts.critical > 0) status = 'critical';
      else if (counts.warning > 0) status = 'warning';
      else if (counts.attention > 0) status = 'attention';

      acc[area] = {
        status,
        findingsCount: counts.total,
      };
      return acc;
    },
    {} as Record<HealthAffectedArea, AreaHealthSummary>
  );

  return {
    evaluatedAt,
    overallStatus,
    healthScore,
    summary: {
      criticalCount,
      warningCount,
      attentionCount,
      goodCount,
      infoCount,
    },
    findings,
    areaBreakdown,
  };
}

// ---------------------------------------------------------------------------
// 7. DIAGNOSTIC COVERAGE CALCULATION (PURE FUNCTION)
// ---------------------------------------------------------------------------

/**
 * Calcola obiettivamente la Copertura Diagnostica del sistema esaminando la disponibilità
 * dei singoli canali telemetrici e diagnostici.
 * 
 * REGOLA FONDAMENTALE:
 * Le metriche 'unavailable' o 'unsupported' NON penalizzano lo Health Score.
 * "Nessuna anomalia rilevata" NON implica che tutti i sensori siano presenti o disponibili.
 */
export function computeDiagnosticCoverage(facts: SystemFactsInput): DiagnosticCoverage {
  const channels: DiagnosticChannel[] = [];
  const mon = facts.monitoring;

  // 1. Carico Processore (CPU Load)
  if (mon && isMetricAvailable(mon.cpu.utilizationPercent)) {
    channels.push({
      id: 'cpu_load',
      label: 'Carico Processore (CPU)',
      area: 'cpu',
      status: 'available',
      source: mon.cpu.utilizationPercent.source || 'Win32_Perf',
    });
  } else {
    const avail = mon?.cpu.utilizationPercent.availability;
    channels.push({
      id: 'cpu_load',
      label: 'Carico Processore (CPU)',
      area: 'cpu',
      status: (avail as DiagnosticChannelStatus) || 'unavailable',
      details: mon ? 'Dato di utilizzo CPU non disponibile' : 'Snapshot di telemetria non attivo',
    });
  }

  // 2. Temperatura Package CPU
  if (mon && isMetricAvailable(mon.cpu.packageTemperatureCelsius)) {
    channels.push({
      id: 'cpu_temp',
      label: 'Temperatura Package CPU',
      area: 'thermal',
      status: 'available',
      source: mon.cpu.packageTemperatureCelsius.source || 'ACPI',
    });
  } else {
    const avail = mon?.cpu.packageTemperatureCelsius.availability;
    channels.push({
      id: 'cpu_temp',
      label: 'Temperatura Package CPU',
      area: 'thermal',
      status: avail === 'unsupported' ? 'unsupported' : (avail as DiagnosticChannelStatus) || 'unavailable',
      details: avail === 'unsupported'
        ? 'Non supportato nativamente dall\'OS senza driver ad anello 0 (kernel ring-0)'
        : 'Sensore termico CPU non disponibile',
    });
  }

  // 3. Consumo Energetico CPU (Power Package)
  if (mon && isMetricAvailable(mon.cpu.packagePowerWatts)) {
    channels.push({
      id: 'cpu_power',
      label: 'Consumo Energetico CPU',
      area: 'cpu',
      status: 'available',
      source: mon.cpu.packagePowerWatts.source || 'RAPL',
    });
  } else {
    const avail = mon?.cpu.packagePowerWatts.availability;
    channels.push({
      id: 'cpu_power',
      label: 'Consumo Energetico CPU',
      area: 'cpu',
      status: avail === 'unsupported' ? 'unsupported' : (avail as DiagnosticChannelStatus) || 'unavailable',
      details: avail === 'unsupported'
        ? 'Interfaccia RAPL / contatori energetici non accessibili in user-space standard'
        : 'Dato energetico CPU non disponibile',
    });
  }

  // 4. Memoria di Sistema (RAM)
  if (mon && mon.memory && mon.memory.totalBytes > 0) {
    channels.push({
      id: 'ram_usage',
      label: 'Memoria di Sistema (RAM)',
      area: 'ram',
      status: 'available',
      source: 'GlobalMemoryStatusEx',
    });
  } else {
    channels.push({
      id: 'ram_usage',
      label: 'Memoria di Sistema (RAM)',
      area: 'ram',
      status: 'unavailable',
      details: 'Dati di memoria fisica non disponibili',
    });
  }

  // 5. Telemetria e Carico GPU
  const gpus = mon?.gpus || [];
  const primaryGpu = gpus.find((g) => g.isDiscrete) || gpus[0];
  if (primaryGpu) {
    if (isMetricAvailable(primaryGpu.utilizationPercent)) {
      channels.push({
        id: 'gpu_telemetry',
        label: 'Carico e Memoria GPU',
        area: 'gpu',
        status: 'available',
        source: primaryGpu.utilizationPercent.source || 'NVML',
      });
    } else {
      const avail = primaryGpu.utilizationPercent.availability;
      channels.push({
        id: 'gpu_telemetry',
        label: 'Carico e Memoria GPU',
        area: 'gpu',
        status: (avail as DiagnosticChannelStatus) || 'unavailable',
        details: 'Telemetria GPU non disponibile per il dispositivo rilevato',
      });
    }
  } else {
    const hasGpuInRig = (facts.currentRigComponents || []).some((c) => c.category === 'gpu');
    channels.push({
      id: 'gpu_telemetry',
      label: 'Carico e Memoria GPU',
      area: 'gpu',
      status: hasGpuInRig ? 'unavailable' : 'not_detected',
      details: hasGpuInRig ? 'GPU configurata nel rig ma telemetria non rilevata' : 'Nessuna scheda grafica rilevata',
    });
  }

  // 6. Temperatura Core GPU
  if (primaryGpu) {
    if (isMetricAvailable(primaryGpu.coreTemperatureCelsius)) {
      channels.push({
        id: 'gpu_temp',
        label: 'Temperatura Core GPU',
        area: 'thermal',
        status: 'available',
        source: primaryGpu.coreTemperatureCelsius.source || 'NVML',
      });
    } else {
      const avail = primaryGpu.coreTemperatureCelsius.availability;
      channels.push({
        id: 'gpu_temp',
        label: 'Temperatura Core GPU',
        area: 'thermal',
        status: (avail as DiagnosticChannelStatus) || 'unavailable',
        details: 'Sensore termico GPU non accessibile',
      });
    }
  } else {
    const hasGpuInRig = (facts.currentRigComponents || []).some((c) => c.category === 'gpu');
    channels.push({
      id: 'gpu_temp',
      label: 'Temperatura Core GPU',
      area: 'thermal',
      status: hasGpuInRig ? 'unavailable' : 'not_detected',
      details: hasGpuInRig ? 'GPU presente nel rig ma termiche non lette' : 'Nessuna scheda grafica rilevata',
    });
  }

  // 7. Affidabilità S.M.A.R.T. Dischi
  if (facts.smartDisks && facts.smartDisks.length > 0) {
    const hasPermissionIssue = facts.smartDisks.some((d) => d.smartStatus === 'permission_required');
    const isAllUnsupported = facts.smartDisks.every((d) => d.smartStatus === 'unsupported');
    const hasError = facts.smartDisks.some((d) => d.smartStatus === 'error');
    if (hasPermissionIssue) {
      channels.push({
        id: 'storage_smart',
        label: 'Affidabilità S.M.A.R.T. Dischi',
        area: 'storage',
        status: 'permission_required',
        details: 'Accesso ai registri di usura e temperatura limitato senza elevazione UAC',
      });
    } else if (isAllUnsupported) {
      channels.push({
        id: 'storage_smart',
        label: 'Affidabilità S.M.A.R.T. Dischi',
        area: 'storage',
        status: 'unsupported',
        details: 'Contatori S.M.A.R.T. non supportati dai dispositivi di archiviazione attuali',
      });
    } else if (hasError) {
      channels.push({
        id: 'storage_smart',
        label: 'Affidabilità S.M.A.R.T. Dischi',
        area: 'storage',
        status: 'error',
        details: 'Errore durante la lettura dei registri S.M.A.R.T.',
      });
    } else {
      channels.push({
        id: 'storage_smart',
        label: 'Affidabilità S.M.A.R.T. Dischi',
        area: 'storage',
        status: 'available',
        source: 'StorageReliabilityCounters',
      });
    }
  } else {
    channels.push({
      id: 'storage_smart',
      label: 'Affidabilità S.M.A.R.T. Dischi',
      area: 'storage',
      status: 'unavailable',
      details: 'Nessun dato S.M.A.R.T. caricato',
    });
  }

  // 8. Spazio e File System Volumi
  const drives = facts.drives || [];
  const monStorage = mon?.storage || [];
  if (drives.length > 0 || monStorage.length > 0) {
    channels.push({
      id: 'storage_volumes',
      label: 'Spazio e File System Volumi',
      area: 'storage',
      status: 'available',
      source: 'Win32_Volume',
    });
  } else {
    channels.push({
      id: 'storage_volumes',
      label: 'Spazio e File System Volumi',
      area: 'storage',
      status: 'unavailable',
      details: 'Nessun volume di archiviazione rilevato',
    });
  }

  // 9. Audit Sicurezza Hardware & Kernel
  if (facts.securityAudit) {
    channels.push({
      id: 'system_security',
      label: 'Audit Sicurezza Hardware & Kernel',
      area: 'security',
      status: 'available',
      source: 'WMI_Security',
    });
  } else {
    channels.push({
      id: 'system_security',
      label: 'Audit Sicurezza Hardware & Kernel',
      area: 'security',
      status: 'unavailable',
      details: 'Audit sicurezza non eseguito',
    });
  }

  // 10. Integrità File di Sistema Windows (SFC)
  if (facts.systemFilesStatus === 'clean' || facts.systemFilesStatus === 'corrupted') {
    channels.push({
      id: 'system_files',
      label: 'Integrità File di Sistema Windows',
      area: 'system',
      status: 'available',
      source: 'SFC_Verify',
    });
  } else if (facts.systemFilesStatus === 'requires_elevation') {
    channels.push({
      id: 'system_files',
      label: 'Integrità File di Sistema Windows',
      area: 'system',
      status: 'permission_required',
      details: 'Scansione SFC richiede elevazione dei privilegi UAC',
    });
  } else {
    channels.push({
      id: 'system_files',
      label: 'Integrità File di Sistema Windows',
      area: 'system',
      status: 'unavailable',
      details: 'Scansione integrità file di sistema non eseguita',
    });
  }

  // 11. Integrità Dispositivi & Driver Hardware (DevNode)
  const devFacts = facts.diagnostics?.deviceProblems;
  if (devFacts && devFacts.availability === 'available') {
    channels.push({
      id: 'device_faults',
      label: 'Stato Periferiche & Driver Hardware',
      area: 'system',
      status: 'available',
      source: devFacts.source || 'CM_Get_DevNode_Status',
      details: `${devFacts.totalDevicesScanned} periferiche verificate (${devFacts.problemCount} con codice problema)`,
    });
  } else {
    const status = (devFacts?.availability as DiagnosticChannelStatus) || 'unavailable';
    channels.push({
      id: 'device_faults',
      label: 'Stato Periferiche & Driver Hardware',
      area: 'system',
      status,
      details: devFacts?.errorDetails || 'Scansione nodi hardware Windows non eseguita',
    });
  }

  // 12. Spazio di Commit Memoria Virtuale
  const memCommit = facts.diagnostics?.memoryCommit;
  if (memCommit && memCommit.availability === 'available' && memCommit.commitLimitBytes > 0) {
    channels.push({
      id: 'memory_commit',
      label: 'Spazio di Commit Memoria Virtuale',
      area: 'ram',
      status: 'available',
      source: memCommit.source || 'GetPerformanceInfo',
      details: `Commit ${memCommit.commitUtilizationPercent}% (${toGb(memCommit.commitTotalBytes)} GB su ${toGb(memCommit.commitLimitBytes)} GB)`,
    });
  } else {
    const status = (memCommit?.availability as DiagnosticChannelStatus) || 'unavailable';
    channels.push({
      id: 'memory_commit',
      label: 'Spazio di Commit Memoria Virtuale',
      area: 'ram',
      status,
      details: memCommit?.errorDetails || 'Dati di commit della memoria virtuale non disponibili',
    });
  }

  // 13. Architettura Energetica & Alimentazione
  const pwrStatus = facts.diagnostics?.powerStatus;
  if (pwrStatus && pwrStatus.availability === 'available') {
    const pwrDesc = pwrStatus.powerArchitecture === 'desktop_like'
      ? 'Desktop Fisso (Rete Elettrica AC)'
      : pwrStatus.isOnBattery
      ? `Portatile su Batteria (${pwrStatus.batteryLifePercent ?? 'N/D'}%)`
      : 'Portatile Collegato a Rete AC';
    channels.push({
      id: 'power_architecture',
      label: 'Architettura Energetica & Alimentazione',
      area: 'system',
      status: 'available',
      source: pwrStatus.source || 'GetSystemPowerStatus',
      details: pwrDesc,
    });
  } else {
    const status = (pwrStatus?.availability as DiagnosticChannelStatus) || 'unavailable';
    channels.push({
      id: 'power_architecture',
      label: 'Architettura Energetica & Alimentazione',
      area: 'system',
      status,
      details: pwrStatus?.errorDetails || 'Stato di alimentazione energetica non rilevato',
    });
  }

  const totalChannels = channels.length;
  const availableChannels = channels.filter((c) => c.status === 'available').length;
  const percentage = Math.round((availableChannels / totalChannels) * 100);
  const hasHardwareGaps = availableChannels < totalChannels;

  let level: DiagnosticCoverageLevel = 'full';
  if (percentage < 60) {
    level = 'minimal';
  } else if (percentage < 100) {
    level = 'partial';
  }

  let summary = '';
  if (level === 'full') {
    summary = `Copertura diagnostica completa (${availableChannels}/${totalChannels} sensori attivi). Tutti i canali diagnostici rispondono affidabilmente.`;
  } else if (level === 'partial') {
    summary = `Copertura diagnostica parziale (${availableChannels}/${totalChannels} sensori attivi). Nessuna anomalia rilevata sui sensori disponibili; metriche non supportate dall'OS senza driver dedicati non penalizzano lo Health Score.`;
  } else {
    summary = `Copertura diagnostica minima (${availableChannels}/${totalChannels} sensori attivi). Esegui una scansione completa o avvia il monitoraggio per estendere la copertura.`;
  }

  return {
    level,
    percentage,
    totalChannels,
    availableChannels,
    channels,
    summary,
    hasHardwareGaps,
  };
}
