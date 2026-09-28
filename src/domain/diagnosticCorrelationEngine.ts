/**
 * Motore di Correlazione Diagnostica Pura (Tranche 8C)
 *
 * PRINCIPI ARCHITETTURALI E DI DOMINIO:
 * 1. PUREZZA E DETERMINISMO:
 *    - Nessun I/O, nessun DB, nessun IPC, nessun framework UI
 *    - Nessun utilizzo di orologio di sistema non deterministico o date senza input esplicito
 *    - Risultato identico a parità di input indipendentemente dall'ordine (Permutation Invariance)
 * 2. CORRELAZIONE, MAI CAUSALITÀ:
 *    - Rileva esclusivamente evidenze convergenti, segnali correlati, coincidenze temporali
 *    - Vietato affermare: "X ha causato Y", "PSU guasto", "GPU rotta", "l'undervolt ha causato il WHEA"
 * 3. CONTRATTO DI FORZA:
 *    - DIRECT_MATCH: riscontro tecnico concreto (stesso hardware ID, driver accertato, controller)
 *    - RELATED_SIGNAL: legame tecnico plausibile nello stesso sottosistema ma non dimostrato
 *    - WEAK_CONTEXT: contesto compatibile senza legame dimostrato
 *    - NO_CORRELATION: nessun legame (default operativo: omissione del record)
 * 4. EVENTI SUPPORTATI ESCLUSIVI:
 *    - WHEA: 17, 18, 19, 47
 *    - Kernel-Power: 41
 *    - disk: 7, 11, 51
 *    - Ntfs: 55, 98
 *    - Display: 4101
 * 5. TRUNCATION SAFETY:
 *    - Se snapshot.truncated === true, mai dichiarare "totali" o dedurre frequenze complessive
 * 6. PII PROTECTION:
 *    - Nessun username, SID, percorso utente o XML grezzo nei risultati
 */

import {
  DiagnosticCorrelation,
  CorrelationStrength,
  DiagnosticCorrelationInput,
  EventLogNativeFact,
  DeviceProblemFact,
  WindowsServiceNativeFact,
} from '../types/diagnostics';
import { HealthAffectedArea } from '../types/health';
import { WINDOWS_SERVICES_CATALOG } from '../types/diagnostics';

export interface DiagnosticEventGroup {
  groupKey: string;
  provider: string;
  eventId: number;
  targetContext?: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  isTruncatedSample: boolean;
  events: EventLogNativeFact[];
}

/**
 * Priorità per l'ordinamento deterministico delle correlazioni per forza
 */
const STRENGTH_ORDER: Record<CorrelationStrength, number> = {
  DIRECT_MATCH: 0,
  RELATED_SIGNAL: 1,
  WEAK_CONTEXT: 2,
  NO_CORRELATION: 3,
};

/**
 * Utility per la sanificazione deterministica delle chiavi di evidenza degli ID
 */
export function sanitizeEvidenceKey(str?: string | null): string {
  if (!str) return 'general';
  const clean = str
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
    .trim()
    .replace(/^_+|_+$/g, '');
  return clean.slice(0, 48) || 'general';
}

/**
 * Verifica deterministica se un timestamp ricade nella finestra temporale stabilita.
 * Non fa uso di orologi di sistema dinamici.
 *
 * @param eventTimestamp Timestamp ISO 8601 dell'evento
 * @param referenceDate Timestamp ISO 8601 della data di riferimento
 * @param hours Ampiezza della finestra in ore (positiva)
 * @returns true se l'evento è entro [referenceDate - hours, referenceDate], false altrimenti
 */
export function isWithinWindow(
  eventTimestamp: string,
  referenceDate: string,
  hours: number
): boolean {
  if (!eventTimestamp || typeof eventTimestamp !== 'string') return false;
  if (!referenceDate || typeof referenceDate !== 'string') return false;
  if (typeof hours !== 'number' || isNaN(hours) || hours <= 0) return false;

  const evTime = Date.parse(eventTimestamp);
  const refTime = Date.parse(referenceDate);

  if (isNaN(evTime) || isNaN(refTime)) return false;

  // Se l'evento è nel futuro rispetto alla data di riferimento, è fuori finestra
  if (evTime > refTime) return false;

  const diffMs = refTime - evTime;
  const windowMs = hours * 60 * 60 * 1000;

  // Boundary esatto compreso: [0, windowMs]
  return diffMs >= 0 && diffMs <= windowMs;
}

/**
 * Verifica se un provider ed eventId rientrano nella lista tassativa degli eventi supportati
 */
export function isSupportedDiagnosticEvent(provider: string, eventId: number): boolean {
  const normProv = provider.trim().toLowerCase();

  // WHEA: 17, 18, 19, 47
  if (normProv === 'microsoft-windows-whea-logger' || normProv.includes('whea')) {
    return eventId === 17 || eventId === 18 || eventId === 19 || eventId === 47;
  }

  // Kernel-Power: 41
  if (normProv === 'microsoft-windows-kernel-power' || normProv.includes('kernel-power')) {
    return eventId === 41;
  }

  // disk: 7, 11, 51
  if (normProv === 'disk') {
    return eventId === 7 || eventId === 11 || eventId === 51;
  }

  // Ntfs: 55, 98
  if (normProv === 'ntfs') {
    return eventId === 55 || eventId === 98;
  }

  // Display: 4101
  if (normProv === 'display') {
    return eventId === 4101;
  }

  return false;
}

/**
 * Aggregazione e deduplicazione deterministica degli eventi.
 * GroupKey: provider + eventId + (targetContext || 'general').
 * Non include mai il timestamp nella chiave.
 * Risultato 100% indipendente dall'ordine di input (Permutation Invariant).
 */
export function groupAndDeduplicateEvents(
  events: EventLogNativeFact[],
  referenceDate: string,
  windowHours = 168,
  isTruncatedSample = false
): DiagnosticEventGroup[] {
  if (!events || events.length === 0) return [];

  // 1. Filtra eventi supportati e compresi nella finestra temporale
  const validEvents = events.filter((e) => {
    if (!isSupportedDiagnosticEvent(e.provider, e.eventId)) return false;
    return isWithinWindow(e.timestamp, referenceDate, windowHours);
  });

  if (validEvents.length === 0) return [];

  // 2. Raggruppa per chiave deterministica normalizzata
  const groupsMap = new Map<string, {
    provider: string;
    eventId: number;
    targetContext?: string;
    events: EventLogNativeFact[];
  }>();

  for (const ev of validEvents) {
    const normProvider = ev.provider.trim();
    const rawTarget = ev.targetContext?.trim();
    const targetKey = rawTarget ? rawTarget.toLowerCase() : 'general';
    const key = `${normProvider}:${ev.eventId}:${targetKey}`;

    const existing = groupsMap.get(key);
    if (existing) {
      existing.events.push(ev);
    } else {
      groupsMap.set(key, {
        provider: normProvider,
        eventId: ev.eventId,
        targetContext: rawTarget || undefined,
        events: [ev],
      });
    }
  }

  // 3. Costruisci i gruppi con ordinamento cronologico per firstSeen/lastSeen
  const result: DiagnosticEventGroup[] = [];

  for (const [groupKey, data] of groupsMap.entries()) {
    // Ordina eventi del gruppo per timestamp (e recordId come tie-breaker deterministico)
    const sorted = [...data.events].sort((a, b) => {
      const timeDiff = Date.parse(a.timestamp) - Date.parse(b.timestamp);
      if (timeDiff !== 0) return timeDiff;
      return (a.recordId || 0) - (b.recordId || 0);
    });

    result.push({
      groupKey,
      provider: data.provider,
      eventId: data.eventId,
      targetContext: data.targetContext,
      occurrenceCount: sorted.length,
      firstSeen: sorted[0].timestamp,
      lastSeen: sorted[sorted.length - 1].timestamp,
      isTruncatedSample,
      events: sorted,
    });
  }

  // 4. Ordina i gruppi risultanti per groupKey in modo deterministico
  result.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

  return result;
}

/**
 * Format string controllata per il conteggio degli eventi che rispetta la regola Truncation Safety.
 * Mai emettere "totali" se isTruncatedSample è true.
 */
function formatEventEvidence(
  count: number,
  isTruncated: boolean,
  description: string
): string {
  if (isTruncated) {
    return `${count} ${count === 1 ? 'evento rilevato' : 'eventi rilevati'} nel campione limitato di diagnostica (${description})`;
  }
  return `${count} ${count === 1 ? 'evento registrato' : 'eventi registrati'} nel registro di sistema (${description})`;
}

// ---------------------------------------------------------------------------
// HELPER HARDWARE & DISPOSITIVI
// ---------------------------------------------------------------------------

function isGpuDevice(dev: DeviceProblemFact): boolean {
  const idUpper = dev.deviceId.toUpperCase();
  const nameLower = (dev.friendlyName || '').toLowerCase();

  return (
    idUpper.includes('VEN_10DE') || // NVIDIA
    idUpper.includes('VEN_1002') || // AMD
    idUpper.includes('VEN_8086') && (nameLower.includes('graphics') || nameLower.includes('arc') || nameLower.includes('iris') || nameLower.includes('uhd')) ||
    nameLower.includes('geforce') ||
    nameLower.includes('radeon') ||
    nameLower.includes('rtx') ||
    nameLower.includes('gtx') ||
    nameLower.includes('graphics') ||
    nameLower.includes('gpu')
  );
}

type HardwareVendor = 'nvidia' | 'amd' | 'intel' | 'unknown';

function getGpuVendor(deviceId: string, friendlyName?: string | null): HardwareVendor {
  const idUpper = deviceId.toUpperCase();
  const nameLower = (friendlyName || '').toLowerCase();

  if (idUpper.includes('VEN_10DE') || nameLower.includes('nvidia') || nameLower.includes('geforce') || nameLower.includes('rtx') || nameLower.includes('gtx')) {
    return 'nvidia';
  }
  if (idUpper.includes('VEN_1002') || nameLower.includes('amd') || nameLower.includes('radeon') || nameLower.includes('rx ')) {
    return 'amd';
  }
  if (idUpper.includes('VEN_8086') || nameLower.includes('intel') || nameLower.includes('arc')) {
    return 'intel';
  }
  return 'unknown';
}

function getDriverVendor(driverOrTarget?: string | null): HardwareVendor {
  if (!driverOrTarget) return 'unknown';
  const norm = driverOrTarget.toLowerCase();

  if (norm.includes('nvlddmkm') || norm.includes('nvidia')) return 'nvidia';
  if (norm.includes('amdkmdag') || norm.includes('atikmdag') || norm.includes('amd')) return 'amd';
  if (norm.includes('igfx') || norm.includes('intel')) return 'intel';
  return 'unknown';
}

/**
 * Valuta la corrispondenza tecnica tra un guasto dispositivo e un evento Display 4101.
 * Regola Tranche 8C.1:
 * DIRECT_MATCH richiede una vera identità hardware condivisa (es. targetContext o payload
 * contiene il deviceId, device instance path o identificatore hardware univoco).
 * La sola compatibilità di vendor o nome driver (es. NVIDIA + nvlddmkm, AMD + amdkmdag)
 * NON è sufficiente per DIRECT_MATCH e produce esclusivamente RELATED_SIGNAL.
 */
function evaluateGpuMatch(
  dev: DeviceProblemFact,
  driverName?: string | null,
  targetContext?: string | null
): { matches: boolean; isDirectMatch: boolean } {
  const devVendor = getGpuVendor(dev.deviceId, dev.friendlyName);
  const evVendor = getDriverVendor(driverName || targetContext);

  // Se entrambi i vendor sono noti ma diversi (es. GPU NVIDIA vs driver AMD) -> conflitto: nessuna corrispondenza
  if (devVendor !== 'unknown' && evVendor !== 'unknown' && devVendor !== evVendor) {
    return { matches: false, isDirectMatch: false };
  }

  // Verifica se esiste una VERA identità hardware condivisa (DIRECT_MATCH)
  if (targetContext) {
    const tLower = targetContext.toLowerCase();
    const idLower = dev.deviceId.toLowerCase();
    const nameLower = (dev.friendlyName || '').toLowerCase();

    // Match se targetContext contiene l'identificatore hardware specifico PCI/VEN/DEV
    if (
      (tLower.includes('pci\\') || tLower.includes('ven_') || tLower.includes('dev_')) &&
      (idLower.includes(tLower) || tLower.includes(idLower))
    ) {
      return { matches: true, isDirectMatch: true };
    }

    // Match se targetContext contiene il nome specifico del modello (escludendo generici nomi driver)
    const genericDrivers = ['nvlddmkm', 'amdkmdag', 'atikmdag', 'igfx', 'display', 'graphics'];
    if (!genericDrivers.includes(tLower) && nameLower.length > 5 && (tLower.includes(nameLower) || nameLower.includes(tLower))) {
      return { matches: true, isDirectMatch: true };
    }
  }

  // Compatibilità generica di vendor/driver (es. NVIDIA dev + nvlddmkm) -> solo RELATED_SIGNAL (Regola 8C.1)
  if (devVendor !== 'unknown' && evVendor !== 'unknown' && devVendor === evVendor) {
    return { matches: true, isDirectMatch: false };
  }

  // Dispositivo GPU senza mapping vendor o contesto noto
  return { matches: false, isDirectMatch: false };
}

function isStorageDevice(dev: DeviceProblemFact): boolean {
  const idUpper = dev.deviceId.toUpperCase();
  const nameLower = (dev.friendlyName || '').toLowerCase();

  return (
    idUpper.includes('DISK') ||
    idUpper.includes('NVME') ||
    idUpper.includes('SCSI') ||
    idUpper.includes('IDE') ||
    idUpper.includes('SATA') ||
    nameLower.includes('ssd') ||
    nameLower.includes('hdd') ||
    nameLower.includes('harddisk') ||
    nameLower.includes('drive') ||
    nameLower.includes('disk') ||
    nameLower.includes('samsung') ||
    nameLower.includes('wd') ||
    nameLower.includes('crucial') ||
    nameLower.includes('kingston')
  );
}

/**
 * Verifica corrispondenza tra target I/O o volume e hardware di archiviazione
 */
function matchesStorageTarget(
  devOrSmartId: string,
  devOrSmartName: string,
  eventTarget?: string | null
): boolean {
  if (!eventTarget) return false;

  const targetLower = eventTarget.toLowerCase();
  const idLower = devOrSmartId.toLowerCase();
  const nameLower = devOrSmartName.toLowerCase();

  // Match diretto su stringhe
  if (idLower.includes(targetLower) || targetLower.includes(idLower)) return true;
  if (nameLower.length > 3 && (targetLower.includes(nameLower) || nameLower.includes(targetLower))) return true;

  // Estrai numero disco da target (es. Harddisk0, DR0, PhysicalDrive0)
  const targetHdMatch = targetLower.match(/harddisk(\d+)/);
  const targetDrMatch = targetLower.match(/dr(\d+)/);
  const targetPdMatch = targetLower.match(/physicaldrive(\d+)/);
  const targetNum = targetHdMatch
    ? targetHdMatch[1]
    : targetPdMatch
      ? targetPdMatch[1]
      : targetDrMatch
        ? targetDrMatch[1]
        : null;

  if (targetNum !== null) {
    // Verifica se idLower o nameLower contiene harddiskX, physicaldriveX, o drX
    const devHd = idLower.match(/harddisk(\d+)/) || nameLower.match(/harddisk(\d+)/);
    const devPd = idLower.match(/physicaldrive(\d+)/) || nameLower.match(/physicaldrive(\d+)/);
    const devDisk = idLower.match(/disk(\d+)/) || nameLower.match(/disk(\d+)/);
    const devDr = idLower.match(/dr(\d+)/) || nameLower.match(/dr(\d+)/);

    if (
      (devHd && devHd[1] === targetNum) ||
      (devPd && devPd[1] === targetNum) ||
      (devDisk && devDisk[1] === targetNum) ||
      (devDr && devDr[1] === targetNum)
    ) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// MOTORE PRINCIPALE DI CORRELAZIONE DIAGNOSTICA PURA
// ---------------------------------------------------------------------------

/**
 * Calcola in modo deterministico e puro le correlazioni diagnostiche di sistema.
 *
 * @param input Fatti nativi di input (Device Problems, Event Log, Servizi, Tuning, SMART)
 * @param referenceDate Data di riferimento esplicita (ISO 8601) per le finestre temporali
 * @returns Array ordinato e deterministico di DiagnosticCorrelation
 */
export function computeDiagnosticCorrelations(
  input: DiagnosticCorrelationInput,
  referenceDate: string
): DiagnosticCorrelation[] {
  if (!input || !referenceDate || typeof referenceDate !== 'string') {
    return [];
  }

  // Valida che referenceDate sia parsabile
  if (isNaN(Date.parse(referenceDate))) {
    return [];
  }

  const correlationsMap = new Map<string, DiagnosticCorrelation>();

  // Normalizza gli input dei device problems
  const deviceProblemsList: DeviceProblemFact[] = [
    ...(input.deviceProblems?.devicesWithProblems || []),
    ...(input.deviceFaults || []),
  ];

  // Normalizza gli eventi nativi
  const rawEvents: EventLogNativeFact[] = [
    ...(input.eventLog?.events || []),
    ...(input.events || []),
  ];
  const isTruncated = input.eventLog?.truncated ?? false;
  const timeWindowHours = input.eventLog?.queryTimeWindowHours || 168;

  // Aggrega e deduplica gli eventi
  const eventGroups = groupAndDeduplicateEvents(
    rawEvents,
    referenceDate,
    timeWindowHours,
    isTruncated
  );

  // Normalizza i fatti dei servizi Windows
  const serviceFacts: WindowsServiceNativeFact[] = [
    ...(input.services?.services || []),
    ...(input.serviceFacts || []),
  ];

  // -------------------------------------------------------------------------
  // REGOLA 1: GPU & DISPLAY DRIVER TDR (EVENTO 4101)
  // -------------------------------------------------------------------------
  const displayGroups = eventGroups.filter(
    (g) => g.provider.toLowerCase() === 'display' && g.eventId === 4101
  );

  for (const group of displayGroups) {
    const sampleEvent = group.events[0];
    const driverName =
      sampleEvent.payload?.type === 'display' ? sampleEvent.payload.driverName : undefined;
    const target = group.targetContext || driverName || 'sottosistema video';

    const gpuFaults = deviceProblemsList.filter(isGpuDevice);

    if (gpuFaults.length > 0) {
      let matchedAnyDirect = false;

      for (const dev of gpuFaults) {
        const matchResult = evaluateGpuMatch(dev, driverName, group.targetContext);

        if (matchResult.isDirectMatch) {
          matchedAnyDirect = true;
          const safeKey = sanitizeEvidenceKey(dev.deviceId);
          const id = `correlation:gpu:device_driver_match:${safeKey}`;

          correlationsMap.set(id, {
            id,
            strength: 'DIRECT_MATCH',
            affectedArea: 'gpu',
            title: 'Correlazione Driver Grafico TDR e Stato Dispositivo GPU',
            hardwareEvidence: `Dispositivo ${dev.friendlyName || dev.deviceId} in stato anomalo (Codice ${dev.problemCode}: ${dev.problemLabel})`,
            eventEvidence: formatEventEvidence(
              group.occurrenceCount,
              isTruncated,
              `Display 4101: TDR driver ${driverName || target}`
            ),
            explanation: `Evidenze convergenti tra l'arresto del dispositivo GPU in Gestione Dispositivi (Codice ${dev.problemCode}) e i ripristini TDR registrati dal driver video (${driverName || target}). Stesso dispositivo e driver grafico correlati nello stesso sottosistema.`,
            recommendedActionId: 'reinstall-gpu-driver',
          });
        }
      }

      // Se c'erano guasti GPU ma nessuno era un DIRECT_MATCH (es. contesti compatibili o vendor non in conflitto)
      if (!matchedAnyDirect) {
        for (const dev of gpuFaults) {
          const matchResult = evaluateGpuMatch(dev, driverName, group.targetContext);
          if (matchResult.matches && !matchResult.isDirectMatch) {
            const safeKey = sanitizeEvidenceKey(dev.deviceId);
            const id = `correlation:gpu:tdr_hardware_signal:${safeKey}`;

            correlationsMap.set(id, {
              id,
              strength: 'RELATED_SIGNAL',
              affectedArea: 'gpu',
              title: 'Segnali Correlati Sottosistema Grafico (TDR e Periferica)',
              hardwareEvidence: `Dispositivo ${dev.friendlyName || dev.deviceId} con anomalia (Codice ${dev.problemCode})`,
              eventEvidence: formatEventEvidence(
                group.occurrenceCount,
                isTruncated,
                'Display 4101: ripristino driver video'
              ),
              explanation: `Segnali correlati nello stesso sottosistema grafico tra l'anomalia rilevata per la scheda video e gli eventi di ripristino TDR del driver, senza riscontro certo dello stesso identificatore driver.`,
            });
          }
        }
      }
    } else {
      // Nessun guasto hardware GPU segnalato: solo evento TDR Display 4101
      const safeKey = sanitizeEvidenceKey(target);
      const id = `correlation:gpu:display_tdr:${safeKey}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea: 'gpu',
        title: 'Eventi Ripristino Driver Video TDR (Display 4101)',
        hardwareEvidence: `Driver video di sistema attivo (${driverName || target})`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `Display 4101: timeout e ripristino driver ${driverName || target}`
        ),
        explanation: `Rilevati eventi di ripristino per timeout del driver video (TDR). Si tratta di segnali correlati di stabilità dell'ambiente grafico che documentano il riavvio del driver senza indicare un guasto fisico accertato.`,
        recommendedActionId: 'clean-shader-cache',
      });
    }
  }

  // -------------------------------------------------------------------------
  // REGOLA 2: STORAGE ERRORS & STORAGE FAULTS / S.M.A.R.T.
  // Eventi: disk (7, 11, 51), Ntfs (55, 98)
  // -------------------------------------------------------------------------
  const storageGroups = eventGroups.filter((g) => {
    const p = g.provider.toLowerCase();
    return (
      (p === 'disk' && (g.eventId === 7 || g.eventId === 11 || g.eventId === 51)) ||
      (p === 'ntfs' && (g.eventId === 55 || g.eventId === 98))
    );
  });

  const storageFaults = deviceProblemsList.filter(isStorageDevice);
  const smartDisksWithAnomalies = (input.smartDisks || []).filter(
    (d) =>
      d.readErrorsTotal > 0 ||
      d.writeErrorsTotal > 0 ||
      (d.healthStatus && d.healthStatus.toUpperCase() !== 'OK' && d.healthStatus.toUpperCase() !== 'HEALTHY')
  );

  for (const group of storageGroups) {
    const target = group.targetContext || 'disco di sistema';
    const safeTargetKey = sanitizeEvidenceKey(target);

    if (group.provider.toLowerCase() === 'disk' && group.eventId === 7) {
      // Disk 7: bad block / storage evidence
      // Cerca se esiste un riscontro diretto sullo stesso dispositivo hardware
      const matchingFault = storageFaults.find((f) =>
        matchesStorageTarget(f.deviceId, f.friendlyName || '', target)
      );
      const matchingSmart = (input.smartDisks || []).find((d) =>
        matchesStorageTarget(d.deviceId, d.friendlyName || '', target)
      );

      if (matchingFault || (matchingSmart && (matchingSmart.readErrorsTotal > 0 || matchingSmart.writeErrorsTotal > 0))) {
        const matchedName = matchingFault?.friendlyName || matchingSmart?.friendlyName || target;
        const id = `correlation:storage:disk_bad_block:${safeTargetKey}`;

        correlationsMap.set(id, {
          id,
          strength: 'DIRECT_MATCH',
          affectedArea: 'storage',
          title: 'Correlazione Errori Settori Disco e Stato Hardware Unità',
          hardwareEvidence: `Unità ${matchedName} con anomalia registrata`,
          eventEvidence: formatEventEvidence(
            group.occurrenceCount,
            isTruncated,
            `disk 7: blocco danneggiato rilevato su ${target}`
          ),
          explanation: `Evidenze convergenti sullo stesso dispositivo di memorizzazione: riscontro diretto tra la segnalazione di blocco danneggiato (disk 7) e l'anomalia registrata per l'unità hardware.`,
          recommendedActionId: 'backup-disk',
        });
      } else if (storageFaults.length > 0 || smartDisksWithAnomalies.length > 0) {
        // Anomalie presenti nel sottosistema ma senza prova di identità dello stesso disco
        const id = `correlation:storage:disk_bad_block_subsystem:${safeTargetKey}`;

        correlationsMap.set(id, {
          id,
          strength: 'RELATED_SIGNAL',
          affectedArea: 'storage',
          title: 'Segnali Blocchi Danneggiati nel Sottosistema Archiviazione',
          hardwareEvidence: `Sottosistema di archiviazione con anomalie registrate su unità collegate`,
          eventEvidence: formatEventEvidence(
            group.occurrenceCount,
            isTruncated,
            `disk 7: blocchi danneggiati rilevati su ${target}`
          ),
          explanation: `Segnali correlati all'interno del sottosistema di archiviazione: presenza di eventi di blocco danneggiato del disco in coesistenza con anomalie del comparto storage, in assenza di un identificatore univoco del singolo supporto fisico.`,
          recommendedActionId: 'check-disk',
        });
      } else {
        // Disk 7 standalone
        const id = `correlation:storage:disk_bad_block_standalone:${safeTargetKey}`;

        correlationsMap.set(id, {
          id,
          strength: 'RELATED_SIGNAL',
          affectedArea: 'storage',
          title: 'Rilevamento Blocchi Danneggiati su Disco (Disk 7)',
          hardwareEvidence: `Unità di archiviazione logica ${target}`,
          eventEvidence: formatEventEvidence(
            group.occurrenceCount,
            isTruncated,
            `disk 7: blocchi con difficoltà di lettura su ${target}`
          ),
          explanation: `Segnale di allerta I/O registrato dal driver del disco. Indica blocchi con difficoltà di lettura rilevati dal controller senza presupporre un guasto completo dell'unità.`,
          recommendedActionId: 'check-disk',
        });
      }
    } else if (group.provider.toLowerCase() === 'disk' && group.eventId === 11) {
      // Disk 11: controller communication/error signal
      const matchingControllerFault = storageFaults.find(
        (f) =>
          f.deviceId.toUpperCase().includes('AHCI') ||
          f.deviceId.toUpperCase().includes('RAID') ||
          f.deviceId.toUpperCase().includes('NVME') ||
          f.deviceId.toUpperCase().includes('CONTROLLER')
      );

      const strength: CorrelationStrength = matchingControllerFault ? 'DIRECT_MATCH' : 'RELATED_SIGNAL';
      const id = `correlation:storage:disk_controller_error:${safeTargetKey}`;

      correlationsMap.set(id, {
        id,
        strength,
        affectedArea: 'storage',
        title: 'Segnali Comunicazione Controller Archiviazione (Disk 11)',
        hardwareEvidence: matchingControllerFault
          ? `Controller ${matchingControllerFault.friendlyName || matchingControllerFault.deviceId} con anomalia (Codice ${matchingControllerFault.problemCode})`
          : `Controller del sottosistema di archiviazione`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `disk 11: errore di comunicazione del controller su ${target}`
        ),
        explanation: `Segnali correlati relativi alla comunicazione del controller di archiviazione. Evidenze di difficoltà temporanee di interfaccia o I/O senza implicare guasto del disco.`,
      });
    } else if (group.provider.toLowerCase() === 'disk' && group.eventId === 51) {
      // Disk 51: device I/O paging error
      // Regola: se c'è un'anomalia SMART ma non lo stesso device -> RELATED_SIGNAL
      if (smartDisksWithAnomalies.length > 0) {
        const smartDisk = smartDisksWithAnomalies[0];
        const id = `correlation:storage:disk_paging_smart_anomaly:${safeTargetKey}`;

        correlationsMap.set(id, {
          id,
          strength: 'RELATED_SIGNAL',
          affectedArea: 'storage',
          title: 'Segnali Correlati Sottosistema Archiviazione (Paging ed Errori S.M.A.R.T.)',
          hardwareEvidence: `Anomalie S.M.A.R.T. registrate nel comparto dischi (${smartDisk.friendlyName}: ${smartDisk.readErrorsTotal} err. lettura, ${smartDisk.writeErrorsTotal} err. scrittura)`,
          eventEvidence: formatEventEvidence(
            group.occurrenceCount,
            isTruncated,
            `disk 51: errore durante operazione di paging su ${target}`
          ),
          explanation: `Segnali correlati nello stesso sottosistema di archiviazione tra anomalie I/O registrate dal controller del disco ed eventi di paging del sistema operativo, in assenza di un identificatore fisico comprovato per il singolo disco.`,
          recommendedActionId: 'check-disk',
        });
      } else {
        const id = `correlation:storage:disk_paging_error:${safeTargetKey}`;

        correlationsMap.set(id, {
          id,
          strength: 'RELATED_SIGNAL',
          affectedArea: 'storage',
          title: 'Errori I/O Paging Memoria su Disco (Disk 51)',
          hardwareEvidence: `Unità o file di paging del sottosistema di archiviazione (${target})`,
          eventEvidence: formatEventEvidence(
            group.occurrenceCount,
            isTruncated,
            `disk 51: errore durante operazione di paging su ${target}`
          ),
          explanation: `Segnali di fallimento temporaneo di operazioni di paging su disco. Evidenze di contesa I/O o latenza elevata senza diagnosi di rottura hardware.`,
        });
      }
    } else if (group.provider.toLowerCase() === 'ntfs' && group.eventId === 55) {
      // NTFS 55: filesystem integrity issue
      const id = `correlation:storage:ntfs_integrity:${safeTargetKey}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea: 'storage',
        title: 'Segnalazione Integrità File System NTFS (Evento 55)',
        hardwareEvidence: `Volume o partizione di archiviazione ${target}`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `Ntfs 55: struttura file system danneggiata su ${target}`
        ),
        explanation: `Segnali correlati di integrità del file system registrati da NTFS. Evidenze di corruzione logica che richiedono verifica della coerenza della partizione.`,
        recommendedActionId: 'run-chkdsk',
      });
    } else if (group.provider.toLowerCase() === 'ntfs' && group.eventId === 98) {
      // NTFS 98: filesystem scan/check signal
      const id = `correlation:storage:ntfs_scan:${safeTargetKey}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea: 'storage',
        title: 'Notifica Scansione File System NTFS (Evento 98)',
        hardwareEvidence: `Volume o partizione di archiviazione ${target}`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `Ntfs 98: notifica scansione integrità su ${target}`
        ),
        explanation: `Segnali di richiesta o completamento della verifica del file system NTFS nel sottosistema di archiviazione.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // REGOLA 3: CPU UNDERVOLT / CURVE OPTIMIZER & WHEA (17, 18, 19, 47)
  // Distinzione formale: 17 PCIe, 18 MCE uncorrected, 19 MCE corrected, 47 memory
  // MAI causal language ("X ha causato Y")
  // -------------------------------------------------------------------------
  const wheaGroups = eventGroups.filter((g) => {
    const p = g.provider.toLowerCase();
    return (
      (p === 'microsoft-windows-whea-logger' || p.includes('whea')) &&
      (g.eventId === 17 || g.eventId === 18 || g.eventId === 19 || g.eventId === 47)
    );
  });

  const cpuTuningProfiles = (input.tuningProfiles || []).filter(
    (p) =>
      p.category === 'cpu' ||
      p.type === 'cpu_undervolt' ||
      p.type === 'curve_optimizer'
  );

  for (const group of wheaGroups) {
    let affectedArea: HealthAffectedArea = 'cpu';
    let wheaTypeDesc = 'segnali MCE hardware';

    if (group.eventId === 17) {
      affectedArea = 'system';
      wheaTypeDesc = 'segnali corretti bus PCIe';
    } else if (group.eventId === 18) {
      affectedArea = 'cpu';
      wheaTypeDesc = 'segnali MCE hardware non corretti';
    } else if (group.eventId === 19) {
      affectedArea = 'cpu';
      wheaTypeDesc = 'segnali MCE hardware corretti';
    } else if (group.eventId === 47) {
      affectedArea = 'ram';
      wheaTypeDesc = 'segnali hardware memoria';
    }

    if (cpuTuningProfiles.length > 0) {
      // Profilo undervolt attivo nello stesso lasso temporale
      const profile = cpuTuningProfiles[0];
      const safeProfKey = sanitizeEvidenceKey(profile.id);
      const id = `correlation:${affectedArea}:undervolt_whea_${group.eventId}:${safeProfKey}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea,
        title: `Segnali WHEA-${group.eventId} in Presenza di Profilo Undervolt CPU`,
        hardwareEvidence: `Profilo di tuning CPU presente: ${profile.name} (tipo: ${profile.type}, stabilità dichiarata: ${profile.stability})`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `WHEA ${group.eventId}: ${wheaTypeDesc}`
        ),
        explanation: `Profilo di undervolt presente nel contesto di analisi in coesistenza con eventi hardware WHEA del processore nello stesso sottosistema. Trattasi di evidenze convergenti che suggeriscono una verifica della stabilità delle tensioni, senza presupporre causalità univoca o difetti irreversibili dell'hardware.`,
      });
    } else {
      // Evento WHEA in assenza di profilo di undervolt registrato
      const safeKey = sanitizeEvidenceKey(group.targetContext || 'hardware');
      const id = `correlation:${affectedArea}:whea_signal_${group.eventId}:${safeKey}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea,
        title: `Eventi Segnalazione Hardware WHEA-${group.eventId}`,
        hardwareEvidence: `Sottosistema hardware monitorato dal kernel Windows WHEA`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `WHEA ${group.eventId}: ${wheaTypeDesc}`
        ),
        explanation: `Rilevati eventi di segnalazione architettura WHEA di Windows. Evidenze di correzione o rilevamento anomalie registrate dal sottosistema hardware senza attribuzione di causa primaria.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // REGOLA 4: KERNEL-POWER 41 (UNEXPECTED REBOOT)
  // Nessuna causalità PSU. Preserva bugcheckCode se diverso da 0.
  // -------------------------------------------------------------------------
  const kpGroups = eventGroups.filter((g) => {
    const p = g.provider.toLowerCase();
    return (
      (p === 'microsoft-windows-kernel-power' || p.includes('kernel-power')) &&
      g.eventId === 41
    );
  });

  for (const group of kpGroups) {
    // Ispeziona se esiste un bugcheckCode valido diverso da 0 tra gli eventi del gruppo
    let bugcheckCode = 0;
    for (const ev of group.events) {
      if (ev.payload?.type === 'kernelPower' && ev.payload.bugcheckCode !== 0) {
        bugcheckCode = ev.payload.bugcheckCode;
        break;
      }
    }

    if (bugcheckCode !== 0) {
      // Preserva bugcheckCode come evidenza tecnica ma senza diagnosi causale
      const hexCode = `0x${bugcheckCode.toString(16).toUpperCase()}`;
      const id = `correlation:system:kernel_power_bugcheck:${sanitizeEvidenceKey(hexCode)}`;

      correlationsMap.set(id, {
        id,
        strength: 'RELATED_SIGNAL',
        affectedArea: 'system',
        title: 'Riavvio Imprevisto con Codice Bugcheck (Kernel-Power 41)',
        hardwareEvidence: `Registrazione di arresto anomalo di sistema (bugcheckCode: ${hexCode})`,
        eventEvidence: formatEventEvidence(
          group.occurrenceCount,
          isTruncated,
          `Kernel-Power 41: riavvio imprevisto con codice bugcheck ${hexCode}`
        ),
        explanation: `Rilevata evidenza di arresto imprevisto con codice bugcheck ${hexCode} registrato dal kernel. Costituisce evidenza tecnica nativa sul riavvio anomalo senza presupporre una diagnosi di rottura hardware o guasto dell'alimentatore.`,
      });
    }
    // Regola Tranche 8C.1: Se bugcheckCode === 0, default operativo è NESSUNA correlazione
    // (rimossa la generazione automatica di WEAK_CONTEXT per KP41 + desktop_like)
  }

  // -------------------------------------------------------------------------
  // REGOLA 5: WINDOWS SERVICES (crash, exit errors, catalog)
  // Nessun problema segnalato per on_demand stopped (es. wuauserv).
  // Regola Tranche 8C.1: EventLog stopped + unavailability conseguente NON genera
  // correlazione circolare DIRECT_MATCH (evitata correlazione tautologica).
  // -------------------------------------------------------------------------
  for (const s of serviceFacts) {
    const isAlwaysRunning = s.operationalModel === 'always_running';
    const isOnDemand = s.operationalModel === 'on_demand';

    // Regola esplicita: se il servizio è on_demand, stopped e con exitCode 0 -> NESSUNA correlazione
    if (isOnDemand && s.currentState === 'stopped' && s.win32ExitCode === 0) {
      continue;
    }

    // Servizio del catalogo con codice di uscita anomalo o crash (win32ExitCode !== 0)
    if (s.win32ExitCode !== 0) {
      const isCatalog = WINDOWS_SERVICES_CATALOG.some(
        (c) => c.serviceName.toLowerCase() === s.serviceName.toLowerCase()
      );

      if (isCatalog) {
        const strength: CorrelationStrength = isAlwaysRunning ? 'DIRECT_MATCH' : 'RELATED_SIGNAL';
        const safeServKey = sanitizeEvidenceKey(s.serviceName);
        const id = `correlation:system:service_exit_error:${safeServKey}`;

        correlationsMap.set(id, {
          id,
          strength,
          affectedArea: 'system',
          title: `Codice Errore Uscita Servizio: ${s.displayName || s.serviceName}`,
          hardwareEvidence: `Servizio ${s.serviceName} terminato con codice Win32: ${s.win32ExitCode}${s.serviceSpecificExitCode ? ` (specifico: ${s.serviceSpecificExitCode})` : ''}`,
          eventEvidence: `Stato operativo: ${s.currentState} (modello: ${s.operationalModel}, avvio: ${s.startType})`,
          explanation: `Riscontro diretto per codice di errore d'uscita anomalo registrato dal Service Control Manager durante l'esecuzione o l'arresto del servizio di sistema ${s.serviceName}.`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // ORDINAMENTO DETERMINISTICO DEL RISULTATO
  // 1. Forza: DIRECT_MATCH > RELATED_SIGNAL > WEAK_CONTEXT > NO_CORRELATION
  // 2. AffectedArea alfabetica
  // 3. ID alfabetico
  // -------------------------------------------------------------------------
  const correlations = Array.from(correlationsMap.values());

  correlations.sort((a, b) => {
    const strengthDiff = STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength];
    if (strengthDiff !== 0) return strengthDiff;

    const areaDiff = a.affectedArea.localeCompare(b.affectedArea);
    if (areaDiff !== 0) return areaDiff;

    return a.id.localeCompare(b.id);
  });

  return correlations;
}
