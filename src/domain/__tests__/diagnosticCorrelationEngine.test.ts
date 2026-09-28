import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeDiagnosticCorrelations,
  groupAndDeduplicateEvents,
  isWithinWindow,
  sanitizeEvidenceKey,
  isSupportedDiagnosticEvent,
} from '../diagnosticCorrelationEngine';
import {
  DiagnosticCorrelationInput,
  EventLogNativeFact,
  DeviceProblemFact,
  WindowsServiceNativeFact,
  EventLogDiagnosticsSnapshot,
} from '../../types/diagnostics';
import { TuningProfile } from '../../types/tuning';
import { DiskSmartHealth } from '../../types/windowsTools';

describe('Tranche 8C — Pure Diagnostic Correlation Engine', () => {
  const REF_DATE = '2026-09-28T12:00:00.000Z';

  // -------------------------------------------------------------------------
  // TEST 1: GPU Code 43 + Display 4101 vero identity match -> DIRECT_MATCH
  // -------------------------------------------------------------------------
  it('1. GPU Code 43 + Display 4101 vero identity match -> DIRECT_MATCH', () => {
    const gpuFault: DeviceProblemFact = {
      deviceId: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
      friendlyName: 'NVIDIA GeForce RTX 4090',
      problemCode: 43,
      problemLabel: 'CM_PROB_FAILED_POST (Codice 43)',
      problemDescription: 'Il dispositivo ha segnalato un problema ed è stato arrestato da Windows',
      statusFlags: 0x00000400,
      severity: 'critical',
    };

    const displayEvent: EventLogNativeFact = {
      channel: 'System',
      provider: 'Display',
      eventId: 4101,
      level: 3,
      timestamp: '2026-09-28T10:00:00.000Z',
      recordId: 101,
      targetContext: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
      payload: {
        type: 'display',
        driverName: 'nvlddmkm',
      },
    };

    const input: DiagnosticCorrelationInput = {
      deviceFaults: [gpuFault],
      events: [displayEvent],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    expect(correlations.length).toBeGreaterThan(0);
    const directMatch = correlations.find((c) => c.strength === 'DIRECT_MATCH');
    expect(directMatch).toBeDefined();
    expect(directMatch?.affectedArea).toBe('gpu');
    expect(directMatch?.id).toContain('correlation:gpu:device_driver_match:');
    expect(directMatch?.title).toContain('TDR');
    expect(directMatch?.hardwareEvidence).toContain('RTX 4090');
    expect(directMatch?.eventEvidence).toContain('Display 4101');
    expect(directMatch?.explanation).toContain('Evidenze convergenti');
    expect(directMatch?.recommendedActionId).toBe('reinstall-gpu-driver');
  });

  // -------------------------------------------------------------------------
  // TEST 2: GPU issue + Display 4101 ma device context diverso -> NON DIRECT_MATCH
  // -------------------------------------------------------------------------
  it('2. GPU issue + Display 4101 ma device context diverso -> NON DIRECT_MATCH', () => {
    const nvidiaGpuFault: DeviceProblemFact = {
      deviceId: 'PCI\\VEN_10DE&DEV_2684',
      friendlyName: 'NVIDIA GeForce RTX 4090',
      problemCode: 43,
      problemLabel: 'CM_PROB_FAILED_POST (Codice 43)',
      problemDescription: 'Il dispositivo ha segnalato un problema',
      statusFlags: 0x00000400,
      severity: 'critical',
    };

    // Driver AMD amdkmdag associato a Display 4101: contesto confliggente con NVIDIA
    const amdDisplayEvent: EventLogNativeFact = {
      channel: 'System',
      provider: 'Display',
      eventId: 4101,
      level: 3,
      timestamp: '2026-09-28T10:00:00.000Z',
      recordId: 102,
      targetContext: 'amdkmdag',
      payload: {
        type: 'display',
        driverName: 'amdkmdag',
      },
    };

    const input: DiagnosticCorrelationInput = {
      deviceFaults: [nvidiaGpuFault],
      events: [amdDisplayEvent],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    // Deve produrre nessuna correlazione di tipo DIRECT_MATCH tra i due dispositivi incompatibili
    const directMatch = correlations.find(
      (c) => c.strength === 'DIRECT_MATCH' && c.hardwareEvidence.includes('RTX 4090')
    );
    expect(directMatch).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST 3: Storage fault + Disk 7 stesso target -> DIRECT_MATCH
  // -------------------------------------------------------------------------
  it('3. Storage fault + Disk 7 stesso target -> DIRECT_MATCH', () => {
    const storageFault: DeviceProblemFact = {
      deviceId: 'SCSI\\Disk&Ven_Samsung&Prod_SSD_990_PRO_Harddisk0',
      friendlyName: 'Samsung SSD 990 PRO 2TB (Harddisk0)',
      problemCode: 10,
      problemLabel: 'CM_PROB_FAILED_START (Codice 10)',
      problemDescription: 'Impossibile avviare il dispositivo di archiviazione',
      statusFlags: 0x00000200,
      severity: 'warning',
    };

    const disk7Event: EventLogNativeFact = {
      channel: 'System',
      provider: 'disk',
      eventId: 7,
      level: 2,
      timestamp: '2026-09-28T09:30:00.000Z',
      recordId: 201,
      targetContext: '\\Device\\Harddisk0\\DR0',
      payload: {
        type: 'disk',
        deviceName: '\\Device\\Harddisk0\\DR0',
      },
    };

    const input: DiagnosticCorrelationInput = {
      deviceFaults: [storageFault],
      events: [disk7Event],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    const directMatch = correlations.find(
      (c) => c.strength === 'DIRECT_MATCH' && c.affectedArea === 'storage'
    );
    expect(directMatch).toBeDefined();
    expect(directMatch?.id).toContain('correlation:storage:disk_bad_block:');
    expect(directMatch?.hardwareEvidence).toContain('Samsung SSD 990 PRO');
    expect(directMatch?.eventEvidence).toContain('disk 7');
    expect(directMatch?.explanation).toContain('Evidenze convergenti');
    expect(directMatch?.explanation).not.toContain('guasto SSD');
  });

  // -------------------------------------------------------------------------
  // TEST 4: Storage SMART anomaly + Disk 51 senza stesso device -> RELATED_SIGNAL
  // -------------------------------------------------------------------------
  it('4. Storage SMART anomaly + Disk 51 senza stesso device -> RELATED_SIGNAL', () => {
    const smartDisks: DiskSmartHealth[] = [
      {
        deviceId: 'PhysicalDrive1',
        friendlyName: 'Kingston A400 SSD 480GB',
        mediaType: 'SSD',
        readErrorsTotal: 15,
        writeErrorsTotal: 4,
        healthStatus: 'Attention',
      },
    ];

    // Evento di paging disk 51 con target generico o su altro disco
    const disk51Event: EventLogNativeFact = {
      channel: 'System',
      provider: 'disk',
      eventId: 51,
      level: 3,
      timestamp: '2026-09-28T08:00:00.000Z',
      recordId: 205,
      targetContext: '\\Device\\Harddisk0\\DR0',
    };

    const input: DiagnosticCorrelationInput = {
      smartDisks,
      events: [disk51Event],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    const related = correlations.find((c) => c.affectedArea === 'storage');
    expect(related).toBeDefined();
    // Non può essere DIRECT_MATCH perché i device non coincidono (PhysicalDrive1 vs Harddisk0)
    expect(related?.strength).toBe('RELATED_SIGNAL');
    expect(related?.title).toContain('Paging');
    expect(related?.hardwareEvidence).toContain('Kingston A400');
    expect(related?.explanation).toContain('Segnali correlati nello stesso sottosistema');
    expect(related?.explanation).toContain('in assenza di un identificatore fisico comprovato');
  });

  // -------------------------------------------------------------------------
  // TEST 5: CPU undervolt + WHEA -> RELATED_SIGNAL, mai causal language
  // -------------------------------------------------------------------------
  it('5. CPU undervolt + WHEA -> RELATED_SIGNAL, mai causal language', () => {
    const tuningProfile: TuningProfile = {
      id: 'tune-cpu-uv',
      name: 'Daily Undervolt Curve -25',
      category: 'cpu',
      date: '2026-09-20',
      type: 'cpu_undervolt',
      parameters: { offsetMv: -25 },
      stability: 'daily',
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    };

    const whea18Event: EventLogNativeFact = {
      channel: 'System',
      provider: 'Microsoft-Windows-WHEA-Logger',
      eventId: 18,
      level: 1, // Critical
      timestamp: '2026-09-28T07:15:00.000Z',
      recordId: 301,
      targetContext: 'Processor Core 0',
      payload: {
        type: 'whea',
        mcaBank: 3,
      },
    };

    const input: DiagnosticCorrelationInput = {
      tuningProfiles: [tuningProfile],
      events: [whea18Event],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    const wheaCorr = correlations.find((c) => c.affectedArea === 'cpu');
    expect(wheaCorr).toBeDefined();
    expect(wheaCorr?.strength).toBe('RELATED_SIGNAL');
    expect(wheaCorr?.title).toContain('WHEA-18');
    expect(wheaCorr?.hardwareEvidence).toContain('Daily Undervolt Curve -25');

    // Verifica tassativa: NESSUN linguaggio causale ammesso e no falsa coincidenza temporale
    const explanation = wheaCorr!.explanation;
    expect(explanation).toContain('Profilo di undervolt presente nel contesto di analisi');
    expect(explanation).not.toContain('coincidenza temporale');
    expect(explanation).not.toContain('ha causato');
    expect(explanation).not.toContain('rotto');
    expect(explanation).not.toContain('guasto');
  });

  // -------------------------------------------------------------------------
  // TEST 6: Kernel-Power 41 -> nessuna causalità PSU
  // -------------------------------------------------------------------------
  it('6. Kernel-Power 41 -> nessuna causalità PSU', () => {
    const kpEvent: EventLogNativeFact = {
      channel: 'System',
      provider: 'Microsoft-Windows-Kernel-Power',
      eventId: 41,
      level: 1,
      timestamp: '2026-09-28T06:00:00.000Z',
      recordId: 401,
      payload: {
        type: 'kernelPower',
        bugcheckCode: 0,
        powerButtonTimestamp: 0,
      },
    };

    const input: DiagnosticCorrelationInput = {
      powerStatus: {
        availability: 'available',
        source: 'GetSystemPowerStatus',
        acLineStatus: 1,
        batteryFlag: 128,
        batteryLifePercent: null,
        batterySaverActive: false,
        hasSystemBattery: false,
        isOnAC: true,
        isOnBattery: false,
        powerArchitecture: 'desktop_like',
      },
      events: [kpEvent],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    // Regola Tranche 8C.1: Nessuna correlazione generata per KP41 + desktop_like con bugcheck 0
    expect(correlations).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Kernel-Power 41 + valid bugcheckCode -> bugcheck evidence preserved
  // -------------------------------------------------------------------------
  it('7. Kernel-Power 41 + valid bugcheckCode -> bugcheck evidence preserved', () => {
    const kpEvent: EventLogNativeFact = {
      channel: 'System',
      provider: 'Microsoft-Windows-Kernel-Power',
      eventId: 41,
      level: 1,
      timestamp: '2026-09-28T05:30:00.000Z',
      recordId: 402,
      payload: {
        type: 'kernelPower',
        bugcheckCode: 0x00000124, // WHEA_UNCORRECTABLE_ERROR bugcheck
        powerButtonTimestamp: 0,
      },
    };

    const input: DiagnosticCorrelationInput = {
      events: [kpEvent],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    const kpCorr = correlations.find((c) => c.affectedArea === 'system');
    expect(kpCorr).toBeDefined();
    expect(kpCorr?.strength).toBe('RELATED_SIGNAL');
    expect(kpCorr?.hardwareEvidence).toContain('0x124');
    expect(kpCorr?.eventEvidence).toContain('0x124');
    expect(kpCorr?.explanation).toContain('0x124');
    expect(kpCorr?.explanation).not.toContain('guasto hardware');
  });

  // -------------------------------------------------------------------------
  // TEST 8: wuauserv stopped + demand -> nessuna correlation problem
  // -------------------------------------------------------------------------
  it('8. wuauserv stopped + demand -> nessuna correlation problem', () => {
    const wuauservFact: WindowsServiceNativeFact = {
      serviceName: 'wuauserv',
      displayName: 'Windows Update',
      operationalModel: 'on_demand',
      currentState: 'stopped',
      startType: 'demand',
      win32ExitCode: 0,
    };

    const input: DiagnosticCorrelationInput = {
      serviceFacts: [wuauservFact],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    // Servizio on_demand a riposo: ZERO correlazioni generate
    expect(correlations).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // TEST 9: EventLog stopped + EventLog-related evidence -> correlation coerente
  // -------------------------------------------------------------------------
  it('9. EventLog stopped + EventLog-related evidence -> correlation coerente', () => {
    const eventLogFact: WindowsServiceNativeFact = {
      serviceName: 'EventLog',
      displayName: 'Windows Event Log',
      operationalModel: 'always_running',
      currentState: 'stopped',
      startType: 'auto',
      win32ExitCode: 0,
    };

    const input: DiagnosticCorrelationInput = {
      serviceFacts: [eventLogFact],
      eventLog: {
        availability: 'unavailable',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 0,
        truncated: false,
        events: [],
        errorDetails: 'RPC server unavailable (0x800706BA)',
      },
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    // Regola Tranche 8C.1: Nessuna correlazione circolare generata
    expect(correlations).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // TEST 10: 50 eventi identici -> un gruppo aggregato
  // -------------------------------------------------------------------------
  it('10. 50 eventi identici -> un gruppo aggregato', () => {
    const events: EventLogNativeFact[] = [];
    for (let i = 1; i <= 50; i++) {
      events.push({
        channel: 'System',
        provider: 'disk',
        eventId: 7,
        level: 2,
        timestamp: '2026-09-28T04:00:00.000Z',
        recordId: i,
        targetContext: '\\Device\\Harddisk0\\DR0',
      });
    }

    const groups = groupAndDeduplicateEvents(events, REF_DATE, 168, false);

    expect(groups.length).toBe(1);
    expect(groups[0].groupKey).toBe('disk:7:\\device\\harddisk0\\dr0');
    expect(groups[0].occurrenceCount).toBe(50);
    expect(groups[0].firstSeen).toBe('2026-09-28T04:00:00.000Z');
    expect(groups[0].lastSeen).toBe('2026-09-28T04:00:00.000Z');
  });

  // -------------------------------------------------------------------------
  // TEST 11: 51+ eventi con truncated=true -> nessun falso conteggio totale
  // -------------------------------------------------------------------------
  it('11. 51+ eventi con truncated=true -> nessun falso conteggio totale', () => {
    const events: EventLogNativeFact[] = [];
    for (let i = 1; i <= 50; i++) {
      events.push({
        channel: 'System',
        provider: 'Display',
        eventId: 4101,
        level: 3,
        timestamp: '2026-09-28T03:00:00.000Z',
        recordId: i,
        targetContext: 'nvlddmkm',
      });
    }

    const snapshot: EventLogDiagnosticsSnapshot = {
      availability: 'available',
      source: 'Wevtapi_SystemLog',
      queryTimeWindowHours: 168,
      maxEventsCap: 50,
      returnedEventCount: 50,
      truncated: true,
      events,
    };

    const input: DiagnosticCorrelationInput = {
      eventLog: snapshot,
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    expect(correlations.length).toBeGreaterThan(0);

    for (const corr of correlations) {
      // Regola Truncation Safety: MAI dire "50 eventi totali" o "totali"
      expect(corr.eventEvidence).not.toContain('totali');
      expect(corr.explanation).not.toContain('totali');
      expect(corr.eventEvidence).toContain('campione limitato');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 12: timestamp esattamente sul boundary -> deterministico
  // -------------------------------------------------------------------------
  it('12. timestamp esattamente sul boundary -> deterministico', () => {
    // 24 ore prima esatte
    const exactBoundary = '2026-09-27T12:00:00.000Z';
    const isInside = isWithinWindow(exactBoundary, REF_DATE, 24);
    expect(isInside).toBe(true);

    // 1 millisecondo oltre il boundary delle 24h
    const justOutside = '2026-09-27T11:59:59.999Z';
    const isOutside = isWithinWindow(justOutside, REF_DATE, 24);
    expect(isOutside).toBe(false);
  });

  // -------------------------------------------------------------------------
  // TEST 13: timestamp fuori finestra -> escluso
  // -------------------------------------------------------------------------
  it('13. timestamp fuori finestra -> escluso', () => {
    const oldTimestamp = '2026-09-20T10:00:00.000Z'; // Più di 7 giorni fa
    const isInside = isWithinWindow(oldTimestamp, REF_DATE, 168);
    expect(isInside).toBe(false);

    // Evento nel futuro rispetto a REF_DATE
    const futureTimestamp = '2026-09-28T13:00:00.000Z';
    const isFutureInside = isWithinWindow(futureTimestamp, REF_DATE, 168);
    expect(isFutureInside).toBe(false);
  });

  // -------------------------------------------------------------------------
  // TEST 14: invalid timestamp -> nessuna correlazione temporale
  // -------------------------------------------------------------------------
  it('14. invalid timestamp -> nessuna correlazione temporale', () => {
    expect(isWithinWindow('invalid-date', REF_DATE, 24)).toBe(false);
    expect(isWithinWindow('', REF_DATE, 24)).toBe(false);
    expect(isWithinWindow(null as any, REF_DATE, 24)).toBe(false);
    expect(isWithinWindow('2026-09-28T10:00:00.000Z', 'invalid-ref', 24)).toBe(false);
    expect(isWithinWindow('2026-09-28T10:00:00.000Z', REF_DATE, -5)).toBe(false);

    const badEvent: EventLogNativeFact = {
      channel: 'System',
      provider: 'disk',
      eventId: 7,
      level: 2,
      timestamp: 'not-a-timestamp',
      recordId: 999,
      targetContext: 'C:',
    };

    const groups = groupAndDeduplicateEvents([badEvent], REF_DATE, 168);
    expect(groups).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // TEST 15: identico input in ordine diverso -> identico output (permutation invariance)
  // -------------------------------------------------------------------------
  it('15. identico input in ordine diverso -> identico output (permutation invariance)', () => {
    const ev1: EventLogNativeFact = {
      channel: 'System',
      provider: 'Display',
      eventId: 4101,
      level: 3,
      timestamp: '2026-09-28T11:00:00.000Z',
      recordId: 1,
      targetContext: 'nvlddmkm',
    };

    const ev2: EventLogNativeFact = {
      channel: 'System',
      provider: 'disk',
      eventId: 7,
      level: 2,
      timestamp: '2026-09-28T10:00:00.000Z',
      recordId: 2,
      targetContext: '\\Device\\Harddisk0\\DR0',
    };

    const ev3: EventLogNativeFact = {
      channel: 'System',
      provider: 'Microsoft-Windows-Kernel-Power',
      eventId: 41,
      level: 1,
      timestamp: '2026-09-28T09:00:00.000Z',
      recordId: 3,
      payload: { type: 'kernelPower', bugcheckCode: 0, powerButtonTimestamp: 0 },
    };

    const resA = computeDiagnosticCorrelations({ events: [ev1, ev2, ev3] }, REF_DATE);
    const resB = computeDiagnosticCorrelations({ events: [ev3, ev1, ev2] }, REF_DATE);
    const resC = computeDiagnosticCorrelations({ events: [ev2, ev3, ev1] }, REF_DATE);

    expect(resA).toEqual(resB);
    expect(resB).toEqual(resC);
  });

  // -------------------------------------------------------------------------
  // TEST 16: nessun segnale correlabile -> []
  // -------------------------------------------------------------------------
  it('16. nessun segnale correlabile -> []', () => {
    const cleanInput: DiagnosticCorrelationInput = {
      deviceFaults: [],
      events: [],
      serviceFacts: [
        {
          serviceName: 'EventLog',
          displayName: 'Windows Event Log',
          operationalModel: 'always_running',
          currentState: 'running',
          startType: 'auto',
          win32ExitCode: 0,
        },
        {
          serviceName: 'wuauserv',
          displayName: 'Windows Update',
          operationalModel: 'on_demand',
          currentState: 'stopped',
          startType: 'demand',
          win32ExitCode: 0,
        },
      ],
      tuningProfiles: [],
      smartDisks: [
        {
          deviceId: 'PhysicalDrive0',
          friendlyName: 'Samsung SSD 990 PRO 2TB',
          mediaType: 'SSD',
          readErrorsTotal: 0,
          writeErrorsTotal: 0,
          healthStatus: 'OK',
        },
      ],
    };

    const correlations = computeDiagnosticCorrelations(cleanInput, REF_DATE);
    expect(correlations).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // TEST 17: nessun PII nei risultati
  // -------------------------------------------------------------------------
  it('17. nessun PII nei risultati', () => {
    const input: DiagnosticCorrelationInput = {
      events: [
        {
          channel: 'System',
          provider: 'Display',
          eventId: 4101,
          level: 3,
          timestamp: '2026-09-28T10:00:00.000Z',
          recordId: 1,
          targetContext: 'nvlddmkm',
        },
        {
          channel: 'System',
          provider: 'disk',
          eventId: 51,
          level: 3,
          timestamp: '2026-09-28T09:00:00.000Z',
          recordId: 2,
          targetContext: '\\Device\\Harddisk0\\DR0',
        },
      ],
    };

    const correlations = computeDiagnosticCorrelations(input, REF_DATE);

    for (const corr of correlations) {
      const fullText = JSON.stringify(corr);
      expect(fullText).not.toMatch(/C:\\Users\\/i);
      expect(fullText).not.toMatch(/S-1-5-\d+/i);
      expect(fullText).not.toContain('<Event>');
      expect(fullText).not.toContain('giuse');
    }
  });

  // -------------------------------------------------------------------------
  // TEST 18: nessuna Date.now()
  // -------------------------------------------------------------------------
  it('18. nessuna Date.now() nel sorgente dell\'engine', () => {
    const enginePath = path.resolve(__dirname, '../diagnosticCorrelationEngine.ts');
    const sourceCode = fs.readFileSync(enginePath, 'utf8');

    expect(sourceCode).not.toContain('Date.now()');
    expect(sourceCode).not.toMatch(/new\s+Date\(\s*\)/);
  });

  // -------------------------------------------------------------------------
  // PROPERTY TESTS
  // -------------------------------------------------------------------------
  describe('Property Tests', () => {
    it('PERMUTATION INVARIANCE: array con molteplici fatti in ordini diversi produce identico risultato', () => {
      const devFault: DeviceProblemFact = {
        deviceId: 'PCI\\VEN_10DE&DEV_2684',
        friendlyName: 'NVIDIA GeForce RTX 4090',
        problemCode: 43,
        problemLabel: 'CM_PROB_FAILED_POST',
        problemDescription: 'Guasto post',
        statusFlags: 0x400,
        severity: 'critical',
      };

      const evA: EventLogNativeFact = {
        channel: 'System',
        provider: 'Display',
        eventId: 4101,
        level: 3,
        timestamp: '2026-09-28T11:00:00.000Z',
        recordId: 10,
        targetContext: 'nvlddmkm',
      };

      const evB: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-Kernel-Power',
        eventId: 41,
        level: 1,
        timestamp: '2026-09-28T08:00:00.000Z',
        recordId: 11,
        payload: { type: 'kernelPower', bugcheckCode: 0x50, powerButtonTimestamp: 0 },
      };

      const serviceCrash: WindowsServiceNativeFact = {
        serviceName: 'WinDefend',
        displayName: 'Microsoft Defender',
        operationalModel: 'contextual',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 1067,
      };

      const input1: DiagnosticCorrelationInput = {
        deviceFaults: [devFault],
        events: [evA, evB],
        serviceFacts: [serviceCrash],
      };

      const input2: DiagnosticCorrelationInput = {
        deviceFaults: [devFault],
        events: [evB, evA],
        serviceFacts: [serviceCrash],
      };

      const out1 = computeDiagnosticCorrelations(input1, REF_DATE);
      const out2 = computeDiagnosticCorrelations(input2, REF_DATE);

      expect(out1).toEqual(out2);
    });

    it('TRUNCATION SAFETY: returnedEventCount=50 e truncated=true non produce mai "50 eventi totali"', () => {
      const events: EventLogNativeFact[] = [];
      for (let i = 1; i <= 50; i++) {
        events.push({
          channel: 'System',
          provider: 'disk',
          eventId: 7,
          level: 2,
          timestamp: '2026-09-28T05:00:00.000Z',
          recordId: i,
          targetContext: '\\Device\\Harddisk0\\DR0',
        });
      }

      const input: DiagnosticCorrelationInput = {
        eventLog: {
          availability: 'available',
          source: 'Wevtapi_SystemLog',
          queryTimeWindowHours: 168,
          maxEventsCap: 50,
          returnedEventCount: 50,
          truncated: true,
          events,
        },
      };

      const out = computeDiagnosticCorrelations(input, REF_DATE);
      expect(out.length).toBeGreaterThan(0);

      for (const c of out) {
        expect(c.eventEvidence).not.toContain('50 eventi totali');
        expect(c.explanation).not.toContain('totali');
        expect(c.eventEvidence).toContain('campione limitato');
      }
    });

    it('NO FALSE DIRECT MATCH: due dispositivi diversi non possono essere correlati come DIRECT_MATCH', () => {
      const intelGpu: DeviceProblemFact = {
        deviceId: 'PCI\\VEN_8086&DEV_5690',
        friendlyName: 'Intel Arc A770 Graphics',
        problemCode: 43,
        problemLabel: 'CM_PROB_FAILED_POST',
        problemDescription: 'Errore avvio dispositivo',
        statusFlags: 0x400,
        severity: 'critical',
      };

      // Evento di driver NVIDIA nvlddmkm
      const nvidiaTdr: EventLogNativeFact = {
        channel: 'System',
        provider: 'Display',
        eventId: 4101,
        level: 3,
        timestamp: '2026-09-28T10:00:00.000Z',
        recordId: 55,
        targetContext: 'nvlddmkm',
        payload: {
          type: 'display',
          driverName: 'nvlddmkm',
        },
      };

      const out = computeDiagnosticCorrelations(
        { deviceFaults: [intelGpu], events: [nvidiaTdr] },
        REF_DATE
      );

      // Nessun DIRECT_MATCH ammesso tra hardware Intel e driver NVIDIA
      const directMatch = out.find((c) => c.strength === 'DIRECT_MATCH');
      expect(directMatch).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // TEST AGGIUNTIVI PER EVENTI SPECIFICI (WHEA 17/19/47, NTFS 55/98, DISK 11)
  // -------------------------------------------------------------------------
  describe('Specific Subsystems & WHEA distinction', () => {
    it('Preserva WHEA-17 (PCIe), WHEA-19 (corrected MCE) e WHEA-47 (memory)', () => {
      const whea17: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-WHEA-Logger',
        eventId: 17,
        level: 3,
        timestamp: '2026-09-28T09:00:00.000Z',
        recordId: 1,
      };

      const whea19: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-WHEA-Logger',
        eventId: 19,
        level: 3,
        timestamp: '2026-09-28T08:00:00.000Z',
        recordId: 2,
      };

      const whea47: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-WHEA-Logger',
        eventId: 47,
        level: 3,
        timestamp: '2026-09-28T07:00:00.000Z',
        recordId: 3,
      };

      const out = computeDiagnosticCorrelations(
        { events: [whea17, whea19, whea47] },
        REF_DATE
      );

      const corr17 = out.find((c) => c.id.includes('17'));
      const corr19 = out.find((c) => c.id.includes('19'));
      const corr47 = out.find((c) => c.id.includes('47'));

      expect(corr17?.affectedArea).toBe('system');
      expect(corr19?.affectedArea).toBe('cpu');
      expect(corr47?.affectedArea).toBe('ram');
    });

    it('Supporta NTFS 55 (integrità) e NTFS 98 (scansione)', () => {
      const ntfs55: EventLogNativeFact = {
        channel: 'System',
        provider: 'Ntfs',
        eventId: 55,
        level: 2,
        timestamp: '2026-09-28T06:00:00.000Z',
        recordId: 10,
        targetContext: 'D:',
      };

      const ntfs98: EventLogNativeFact = {
        channel: 'System',
        provider: 'Ntfs',
        eventId: 98,
        level: 4,
        timestamp: '2026-09-28T05:00:00.000Z',
        recordId: 11,
        targetContext: 'D:',
      };

      const out = computeDiagnosticCorrelations({ events: [ntfs55, ntfs98] }, REF_DATE);

      expect(out.some((c) => c.id.includes('ntfs_integrity'))).toBe(true);
      expect(out.some((c) => c.id.includes('ntfs_scan'))).toBe(true);
    });

    it('Rifiuta eventi non compresi nella lista tassativa degli Event ID supportati', () => {
      expect(isSupportedDiagnosticEvent('Microsoft-Windows-Kernel-Power', 42)).toBe(false);
      expect(isSupportedDiagnosticEvent('disk', 15)).toBe(false);
      expect(isSupportedDiagnosticEvent('Application Error', 1000)).toBe(false);
      expect(isSupportedDiagnosticEvent('Display', 4100)).toBe(false);
      expect(isSupportedDiagnosticEvent('Microsoft-Windows-WHEA-Logger', 20)).toBe(false);
    });

    it('Sanifica correttamente le chiavi degli identificatori', () => {
      expect(sanitizeEvidenceKey('PCI\\VEN_10DE&DEV_2684')).toBe('pci_ven_10de_dev_2684');
      expect(sanitizeEvidenceKey(null)).toBe('general');
      expect(sanitizeEvidenceKey('')).toBe('general');
    });
  });

  // -------------------------------------------------------------------------
  // TRANCHE 8C.1 — HARDENING PRECISION TESTS (6 TEST RICHIESTI)
  // -------------------------------------------------------------------------
  describe('Tranche 8C.1 — Hardening Precision Tests', () => {
    // 1. GPU stesso vendor/driver ma device identity diversa -> NON DIRECT_MATCH (RELATED_SIGNAL)
    it('8C.1-1. GPU stesso vendor/driver ma device identity diversa -> NON DIRECT_MATCH', () => {
      const gpuFault: DeviceProblemFact = {
        deviceId: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
        friendlyName: 'NVIDIA GeForce RTX 4090',
        problemCode: 43,
        problemLabel: 'CM_PROB_FAILED_POST',
        problemDescription: 'Guasto post GPU',
        statusFlags: 0x400,
        severity: 'critical',
      };

      // Driver nvidia generico (nvlddmkm) senza identificatore hardware univoco
      const displayEvent: EventLogNativeFact = {
        channel: 'System',
        provider: 'Display',
        eventId: 4101,
        level: 3,
        timestamp: '2026-09-28T10:00:00.000Z',
        recordId: 101,
        targetContext: 'nvlddmkm',
        payload: {
          type: 'display',
          driverName: 'nvlddmkm',
        },
      };

      const out = computeDiagnosticCorrelations(
        { deviceFaults: [gpuFault], events: [displayEvent] },
        REF_DATE
      );

      // NON deve essere DIRECT_MATCH
      const direct = out.find((c) => c.strength === 'DIRECT_MATCH');
      expect(direct).toBeUndefined();

      // Deve essere solo RELATED_SIGNAL (compatibilità vendor/driver)
      const related = out.find((c) => c.strength === 'RELATED_SIGNAL');
      expect(related).toBeDefined();
      expect(related?.affectedArea).toBe('gpu');
      expect(related?.explanation).toContain('senza riscontro certo dello stesso identificatore driver');
    });

    // 2. GPU vera identity match -> DIRECT_MATCH
    it('8C.1-2. GPU vera identity match -> DIRECT_MATCH', () => {
      const gpuFault: DeviceProblemFact = {
        deviceId: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
        friendlyName: 'NVIDIA GeForce RTX 4090',
        problemCode: 43,
        problemLabel: 'CM_PROB_FAILED_POST',
        problemDescription: 'Guasto post GPU',
        statusFlags: 0x400,
        severity: 'critical',
      };

      // Evento con identificatore hardware condiviso nel targetContext
      const displayEvent: EventLogNativeFact = {
        channel: 'System',
        provider: 'Display',
        eventId: 4101,
        level: 3,
        timestamp: '2026-09-28T10:00:00.000Z',
        recordId: 102,
        targetContext: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
        payload: {
          type: 'display',
          driverName: 'nvlddmkm',
        },
      };

      const out = computeDiagnosticCorrelations(
        { deviceFaults: [gpuFault], events: [displayEvent] },
        REF_DATE
      );

      const direct = out.find((c) => c.strength === 'DIRECT_MATCH');
      expect(direct).toBeDefined();
      expect(direct?.affectedArea).toBe('gpu');
      expect(direct?.id).toContain('correlation:gpu:device_driver_match:');
    });

    // 3. Undervolt profile senza activation timestamp + WHEA storico -> nessuna falsa "coincidenza temporale"
    it('8C.1-3. Undervolt profile senza activation timestamp + WHEA storico -> nessuna falsa "coincidenza temporale"', () => {
      const undervoltProfile: TuningProfile = {
        id: 'tune-profile-1',
        name: 'Daily UV Curve -30',
        category: 'cpu',
        date: '2026-09-15', // Profilo creato giorni prima
        type: 'cpu_undervolt',
        parameters: { offsetMv: -30 },
        stability: 'daily',
        createdAt: '2026-09-15T12:00:00Z',
        updatedAt: '2026-09-15T12:00:00Z',
      };

      const wheaEvent: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-WHEA-Logger',
        eventId: 18,
        level: 1,
        timestamp: '2026-09-28T08:00:00.000Z',
        recordId: 501,
      };

      const out = computeDiagnosticCorrelations(
        { tuningProfiles: [undervoltProfile], events: [wheaEvent] },
        REF_DATE
      );

      const corr = out.find((c) => c.affectedArea === 'cpu');
      expect(corr).toBeDefined();
      expect(corr?.strength).toBe('RELATED_SIGNAL');

      // Verifica formale: non deve affermare falsa "coincidenza temporale"
      expect(corr?.explanation).toContain('Profilo di undervolt presente nel contesto di analisi');
      expect(corr?.explanation).not.toContain('coincidenza temporale');
      expect(corr?.explanation).not.toContain('ha causato');
    });

    // 4. Kernel-Power 41 + desktop_like -> nessuna correlation
    it('8C.1-4. Kernel-Power 41 + desktop_like -> nessuna correlation', () => {
      const kpEvent: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-Kernel-Power',
        eventId: 41,
        level: 1,
        timestamp: '2026-09-28T09:00:00.000Z',
        recordId: 601,
        payload: {
          type: 'kernelPower',
          bugcheckCode: 0,
          powerButtonTimestamp: 0,
        },
      };

      const out = computeDiagnosticCorrelations(
        {
          events: [kpEvent],
          powerStatus: {
            availability: 'available',
            source: 'GetSystemPowerStatus',
            acLineStatus: 1,
            batteryFlag: 128,
            batteryLifePercent: null,
            batterySaverActive: false,
            hasSystemBattery: false,
            isOnAC: true,
            isOnBattery: false,
            powerArchitecture: 'desktop_like',
          },
        },
        REF_DATE
      );

      // Default: NESSUNA correlazione prodotta
      expect(out).toEqual([]);
    });

    // 5. EventLog stopped + unavailable conseguente -> no circular DIRECT_MATCH
    it('8C.1-5. EventLog stopped + unavailable conseguente -> no circular DIRECT_MATCH', () => {
      const eventLogService: WindowsServiceNativeFact = {
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        currentState: 'stopped',
        startType: 'auto',
        win32ExitCode: 0,
      };

      const out = computeDiagnosticCorrelations(
        {
          serviceFacts: [eventLogService],
          eventLog: {
            availability: 'unavailable',
            source: 'Wevtapi_SystemLog',
            queryTimeWindowHours: 168,
            maxEventsCap: 50,
            returnedEventCount: 0,
            truncated: false,
            events: [],
            errorDetails: 'Service is stopped',
          },
        },
        REF_DATE
      );

      // Regola: nessuna correlazione circolare generata
      expect(out).toEqual([]);
    });

    // 6. Nessun regression test sulle correlation già valide
    it('8C.1-6. Nessun regression test sulle correlation già valide (multi-segnale)', () => {
      const storageFault: DeviceProblemFact = {
        deviceId: 'SCSI\\Disk&Ven_Samsung&Prod_SSD_990_PRO_Harddisk0',
        friendlyName: 'Samsung SSD 990 PRO 2TB (Harddisk0)',
        problemCode: 10,
        problemLabel: 'CM_PROB_FAILED_START',
        problemDescription: 'Errore controller',
        statusFlags: 0x200,
        severity: 'warning',
      };

      const disk7: EventLogNativeFact = {
        channel: 'System',
        provider: 'disk',
        eventId: 7,
        level: 2,
        timestamp: '2026-09-28T09:30:00.000Z',
        recordId: 701,
        targetContext: '\\Device\\Harddisk0\\DR0',
      };

      const kpCrash: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-Kernel-Power',
        eventId: 41,
        level: 1,
        timestamp: '2026-09-28T07:00:00.000Z',
        recordId: 702,
        payload: {
          type: 'kernelPower',
          bugcheckCode: 0x00000124,
          powerButtonTimestamp: 0,
        },
      };

      const serviceCrash: WindowsServiceNativeFact = {
        serviceName: 'Winmgmt',
        displayName: 'WMI Service',
        operationalModel: 'always_running',
        currentState: 'stopped',
        startType: 'auto',
        win32ExitCode: 1067,
      };

      const out = computeDiagnosticCorrelations(
        {
          deviceFaults: [storageFault],
          events: [disk7, kpCrash],
          serviceFacts: [serviceCrash],
        },
        REF_DATE
      );

      expect(out.length).toBe(3);

      const storageCorr = out.find((c) => c.affectedArea === 'storage');
      expect(storageCorr?.strength).toBe('DIRECT_MATCH');

      const serviceCorr = out.find((c) => c.id.includes('service_exit_error'));
      expect(serviceCorr?.strength).toBe('DIRECT_MATCH');

      const kpCorr = out.find((c) => c.id.includes('kernel_power_bugcheck'));
      expect(kpCorr?.strength).toBe('RELATED_SIGNAL');
      expect(kpCorr?.hardwareEvidence).toContain('0x124');
    });
  });
});
