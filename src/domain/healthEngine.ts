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
  HealthAffectedArea,
  SystemFactsInput,
  SystemHealthReport,
  AreaHealthSummary,
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

/**
 * Valuta obiettivamente i fatti di sistema e produce il report di salute completo.
 */
export function evaluateSystemHealth(facts: SystemFactsInput): SystemHealthReport {
  const findings: HealthFinding[] = [];
  const refDate = facts.referenceDate || new Date().toISOString();

  // 1. Valutazione Sottosistema Storage (S.M.A.R.T. e Volumi)
  evaluateStorageHealth(facts, findings);

  // 2. Valutazione Sottosistema Memoria RAM
  evaluateMemoryHealth(facts, findings);

  // 3. Valutazione Sottosistema GPU & Termiche (incluso confronto con Personal Baseline)
  evaluateGpuAndThermalHealth(facts, findings);

  // 4. Valutazione Registro Manutenzione e Cura Fisica
  evaluateMaintenanceHealth(facts, findings, refDate);

  // 5. Valutazione Integrità di Sistema e Sicurezza Kernel
  evaluateSystemAndSecurityHealth(facts, findings);

  // 6. Calcolo del punteggio sintetico e ripartizione per area
  return buildHealthReport(findings, refDate);
}

// ---------------------------------------------------------------------------
// 1. STORAGE HEALTH EVALUATION
// ---------------------------------------------------------------------------

function evaluateStorageHealth(facts: SystemFactsInput, findings: HealthFinding[]): void {
  // A. Analisi S.M.A.R.T. e contatori di affidabilità fisici
  if (facts.smartDisks && facts.smartDisks.length > 0) {
    for (const disk of facts.smartDisks) {
      const isHealthyStatus = (disk.healthStatus || '').toLowerCase().includes('healthy');
      const hasErrors = disk.readErrorsTotal > 0 || disk.writeErrorsTotal > 0;
      const isCriticalWear = disk.wearPercentage !== undefined && disk.wearPercentage >= 90;
      const isHighWear = disk.wearPercentage !== undefined && disk.wearPercentage >= 80 && disk.wearPercentage < 90;
      const isOverheating = disk.temperatureCelsius !== undefined && disk.temperatureCelsius >= 70;

      if (!isHealthyStatus || isCriticalWear || (disk.readErrorsTotal > 0 && disk.writeErrorsTotal > 0)) {
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
      explanation: 'La memoria fisica a disposizione garantisce multitasking fluido senza ricorso al disco di swap.',
      confidence: 'HIGH',
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
        explanation: 'Il composto termoconduttivo tra CPU/GPU e dissipatore è fresco e garantisce massima efficienza di scambio termico.',
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
