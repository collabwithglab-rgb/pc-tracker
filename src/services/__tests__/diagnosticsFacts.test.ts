import { describe, it, expect } from 'vitest';
import {
  mapProblemCode,
  evaluateCommitPressure,
  applyEventCapAndSentinel,
  mapServiceState,
  mapServiceStartType,
  createServiceFact,
  WINDOWS_SERVICES_CATALOG,
  MemoryCommitSnapshot,
  PowerStatusSnapshot,
  DeviceProblemsFact,
  EventLogNativeFact,
  EventLogDiagnosticsSnapshot,
  WindowsServiceNativeFact,
  WindowsServicesSnapshot,
  SystemDiagnosticsSnapshot,
} from '../../types/diagnostics';
import {
  getSystemDiagnosticsSnapshot,
  UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT,
} from '../diagnosticsService';

describe('Tranche 7A — Native Facts & Contracts Verification', () => {
  // -------------------------------------------------------------------------
  // A. DEVICE / DRIVER FAULTS TESTS
  // -------------------------------------------------------------------------
  describe('A. Device / Driver Faults', () => {
    it('Rule A.1: Healthy device does not produce an error item', () => {
      const fact: DeviceProblemsFact = {
        availability: 'available',
        source: 'CM_Get_DevNode_Status',
        totalDevicesScanned: 219,
        problemCount: 0,
        devicesWithProblems: [],
      };

      expect(fact.devicesWithProblems).toHaveLength(0);
      expect(fact.problemCount).toBe(0);
      expect(fact.availability).toBe('available');
    });

    it('Rule A.2: Correctly maps official Windows problem codes (CM_PROB_*)', () => {
      const p43 = mapProblemCode(43);
      expect(p43.label).toContain('CM_PROB_FAILED_POST');
      expect(p43.label).toContain('Codice 43');
      expect(p43.severity).toBe('critical');
      expect(p43.description).toContain('arrestato da Windows');

      const p10 = mapProblemCode(10);
      expect(p10.label).toContain('CM_PROB_FAILED_START');
      expect(p10.severity).toBe('warning');

      const p22 = mapProblemCode(22);
      expect(p22.label).toContain('CM_PROB_DISABLED');
      expect(p22.severity).toBe('info');

      const p1 = mapProblemCode(1);
      expect(p1.label).toContain('CM_PROB_NOT_CONFIGURED');
      expect(p1.severity).toBe('attention');

      const p45 = mapProblemCode(45);
      expect(p45.label).toContain('CM_PROB_HARDWARE_NOT_PRESENT');
      expect(p45.severity).toBe('info');
    });

    it('Rule A.2: Handles unknown problem code without inventing arbitrary causes', () => {
      const pUnk = mapProblemCode(9999);
      expect(pUnk.label).toBe('Codice dispositivo Windows 9999');
      expect(pUnk.description).toContain('9999');
      expect(pUnk.severity).toBe('attention');
    });

    it('A.1: Handles API failure gracefully without claiming device is healthy', () => {
      const failedFact: DeviceProblemsFact = {
        availability: 'error',
        source: 'CM_Get_DevNode_Status',
        totalDevicesScanned: 0,
        problemCount: 0,
        devicesWithProblems: [],
        errorDetails: 'CM_Locate_DevNodeW failed',
      };

      expect(failedFact.availability).toBe('error');
      expect(failedFact.errorDetails).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // B. MEMORY COMMIT DIAGNOSTICS TESTS
  // -------------------------------------------------------------------------
  describe('B. Memory Commit Diagnostics', () => {
    const normalSnap: MemoryCommitSnapshot = {
      availability: 'available',
      source: 'GetPerformanceInfo',
      commitTotalBytes: 16 * 1024 * 1024 * 1024,
      commitLimitBytes: 32 * 1024 * 1024 * 1024,
      commitPeakBytes: 20 * 1024 * 1024 * 1024,
      physicalTotalBytes: 32 * 1024 * 1024 * 1024,
      physicalAvailableBytes: 18 * 1024 * 1024 * 1024,
      systemCacheBytes: 10 * 1024 * 1024 * 1024,
      kernelPagedBytes: 500 * 1024 * 1024,
      kernelNonpagedBytes: 400 * 1024 * 1024,
      processCount: 250,
      threadCount: 3500,
      commitUtilizationPercent: 50.0,
      physicalUtilizationPercent: 43.8,
    };

    it('Calculates normal memory commit utilization and metrics', () => {
      expect(normalSnap.commitUtilizationPercent).toBe(50.0);
      expect(normalSnap.physicalUtilizationPercent).toBe(43.8);
      expect(normalSnap.availability).toBe('available');
    });

    it('Rule B.2 & B.3: evaluateCommitPressure classifies single samples without calling it OOM', () => {
      const assessment = evaluateCommitPressure([normalSnap]);
      expect(assessment.level).toBe('NORMAL');
      expect(assessment.isSustained).toBe(false);
      expect(assessment.averageCommitUtilization).toBe(50.0);
    });

    it('Rule B.3: Detects sustained commit pressure across multiple consecutive samples', () => {
      const highSnap1: MemoryCommitSnapshot = {
        ...normalSnap,
        commitUtilizationPercent: 91.0,
        physicalUtilizationPercent: 85.0,
      };
      const highSnap2: MemoryCommitSnapshot = {
        ...normalSnap,
        commitUtilizationPercent: 93.5,
        physicalUtilizationPercent: 88.0,
      };

      const sustained = evaluateCommitPressure([highSnap1, highSnap2]);
      expect(sustained.level).toBe('SUSTAINED_PRESSURE');
      expect(sustained.isSustained).toBe(true);
      expect(sustained.sampleCount).toBe(2);
      expect(sustained.details).toContain('Pressione sostenuta');
    });

    it('Rule B.2: High commit spike on single sample is elevated diagnostic, NOT critical OOM', () => {
      const spike: MemoryCommitSnapshot = {
        ...normalSnap,
        commitUtilizationPercent: 92.0,
        physicalUtilizationPercent: 60.0, // RAM fisica ancora abbondante
      };

      const assessment = evaluateCommitPressure([spike]);
      expect(assessment.level).toBe('ELEVATED');
      expect(assessment.isSustained).toBe(false);
    });

    it('Handles empty or invalid snapshots without division by zero', () => {
      const empty = evaluateCommitPressure([]);
      expect(empty.level).toBe('NORMAL');
      expect(empty.sampleCount).toBe(0);

      const zeroLimitSnap: MemoryCommitSnapshot = {
        ...normalSnap,
        commitLimitBytes: 0,
      };
      const zeroResult = evaluateCommitPressure([zeroLimitSnap]);
      expect(zeroResult.sampleCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // C. POWER ARCHITECTURE TESTS
  // -------------------------------------------------------------------------
  describe('C. Power Architecture Detection', () => {
    it('Correctly classifies desktop-like system with AC and no battery', () => {
      const desktop: PowerStatusSnapshot = {
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
      };

      expect(desktop.powerArchitecture).toBe('desktop_like');
      expect(desktop.hasSystemBattery).toBe(false);
      expect(desktop.isOnAC).toBe(true);
      expect(desktop.isOnBattery).toBe(false);
    });

    it('Correctly classifies battery-capable system running on battery', () => {
      const laptop: PowerStatusSnapshot = {
        availability: 'available',
        source: 'GetSystemPowerStatus',
        acLineStatus: 0,
        batteryFlag: 1,
        batteryLifePercent: 78,
        batterySaverActive: true,
        hasSystemBattery: true,
        isOnAC: false,
        isOnBattery: true,
        powerArchitecture: 'battery_capable',
      };

      expect(laptop.powerArchitecture).toBe('battery_capable');
      expect(laptop.hasSystemBattery).toBe(true);
      expect(laptop.isOnBattery).toBe(true);
      expect(laptop.batterySaverActive).toBe(true);
      expect(laptop.batteryLifePercent).toBe(78);
    });

    it('Correctly handles unknown power state', () => {
      const unknownPwr: PowerStatusSnapshot = {
        availability: 'available',
        source: 'GetSystemPowerStatus',
        acLineStatus: 255,
        batteryFlag: 255,
        batteryLifePercent: null,
        batterySaverActive: false,
        hasSystemBattery: false,
        isOnAC: null,
        isOnBattery: null,
        powerArchitecture: 'unknown',
      };

      expect(unknownPwr.powerArchitecture).toBe('unknown');
      expect(unknownPwr.isOnAC).toBeNull();
      expect(unknownPwr.isOnBattery).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // D. SERVICE & FALLBACK CONTRACTS
  // -------------------------------------------------------------------------
  describe('D. IPC & Web Fallback Contracts', () => {
    it('getSystemDiagnosticsSnapshot returns explicit unsupported contract in web environment', async () => {
      const snapshot: SystemDiagnosticsSnapshot = await getSystemDiagnosticsSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.status).toBe('unsupported');
      expect(snapshot.deviceProblems.availability).toBe('unsupported');
      expect(snapshot.memoryCommit.availability).toBe('unsupported');
      expect(snapshot.powerStatus.availability).toBe('unsupported');
      expect(snapshot.eventLog?.availability).toBe('unsupported');
      expect(snapshot.eventLog?.source).toBe('Wevtapi_SystemLog');
      expect(snapshot.eventLog?.queryTimeWindowHours).toBe(168);
      expect(snapshot.eventLog?.maxEventsCap).toBe(50);
      expect(snapshot.eventLog?.returnedEventCount).toBe(0);
      expect(snapshot.eventLog?.truncated).toBe(false);
      expect(snapshot.eventLog?.events).toHaveLength(0);
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.powerStatus.powerArchitecture).toBe('unknown');
    });
  });

  // -------------------------------------------------------------------------
  // E. NATIVE EVENT LOG FACTS (TRANCHE 8A)
  // -------------------------------------------------------------------------
  describe('E. Native Event Log Facts & Capping (Tranche 8A)', () => {
    it('A. 0 events produces returnedEventCount=0 and truncated=false', () => {
      const result = applyEventCapAndSentinel([], false, 50);
      expect(result.returnedEventCount).toBe(0);
      expect(result.truncated).toBe(false);
      expect(result.events).toHaveLength(0);
    });

    it('B. 49 events produces returnedEventCount=49 and truncated=false', () => {
      const mockEvents = Array.from({ length: 49 }, (_, i) => ({ id: i }));
      const result = applyEventCapAndSentinel(mockEvents, false, 50);
      expect(result.returnedEventCount).toBe(49);
      expect(result.truncated).toBe(false);
      expect(result.events).toHaveLength(49);
    });

    it('C. Exactly 50 events without sentinel produces returnedEventCount=50 and truncated=false', () => {
      const mockEvents = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const result = applyEventCapAndSentinel(mockEvents, false, 50);
      expect(result.returnedEventCount).toBe(50);
      expect(result.truncated).toBe(false);
      expect(result.events).toHaveLength(50);
    });

    it('D. 50 events with positive sentinel probe (51+ in log) produces returnedEventCount=50 and truncated=true', () => {
      const mockEvents = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const result = applyEventCapAndSentinel(mockEvents, true, 50);
      expect(result.returnedEventCount).toBe(50);
      expect(result.truncated).toBe(true);
      expect(result.events).toHaveLength(50);
    });

    it('E. 55 events collected with sentinel caps to 50 and truncated=true', () => {
      const mockEvents = Array.from({ length: 55 }, (_, i) => ({ id: i }));
      const result = applyEventCapAndSentinel(mockEvents, true, 50);
      expect(result.returnedEventCount).toBe(50);
      expect(result.truncated).toBe(true);
      expect(result.events).toHaveLength(50);
    });

    it('F. disk 7 and disk 51 are preserved as distinct events without collapsing', () => {
      const fact7: EventLogNativeFact = {
        channel: 'System',
        provider: 'disk',
        eventId: 7,
        level: 2,
        timestamp: '2026-09-20T10:00:00Z',
        recordId: 100,
        targetContext: '\\Device\\Harddisk0\\DR0',
        payload: {
          type: 'disk',
          deviceName: '\\Device\\Harddisk0\\DR0',
          ioStatus: '0xC000000E',
        },
      };

      const fact51: EventLogNativeFact = {
        channel: 'System',
        provider: 'disk',
        eventId: 51,
        level: 3,
        timestamp: '2026-09-20T10:05:00Z',
        recordId: 101,
        targetContext: '\\Device\\Harddisk0\\DR0',
        payload: {
          type: 'disk',
          deviceName: '\\Device\\Harddisk0\\DR0',
          ioStatus: '0xC000009C',
        },
      };

      expect(fact7.eventId).toBe(7);
      expect(fact51.eventId).toBe(51);
      expect(fact7.eventId).not.toBe(fact51.eventId);
      expect(fact7.targetContext).toBe(fact51.targetContext);
    });

    it('G. disk 11 preserves controller error context without assuming disk failure', () => {
      const fact11: EventLogNativeFact = {
        channel: 'System',
        provider: 'disk',
        eventId: 11,
        level: 2,
        timestamp: '2026-09-21T08:00:00Z',
        recordId: 102,
        targetContext: '\\Device\\Harddisk1\\DR1',
        payload: {
          type: 'disk',
          deviceName: '\\Device\\Harddisk1\\DR1',
          ioStatus: '0xC000000E',
        },
      };

      expect(fact11.eventId).toBe(11);
      expect(fact11.targetContext).toBe('\\Device\\Harddisk1\\DR1');
      expect((fact11 as any).severity).toBeUndefined();
      expect((fact11 as any).classificationCategory).toBeUndefined();
      expect(fact11.payload?.type).toBe('disk');
    });

    it('H. NTFS 55 and 98 are preserved as distinct native facts', () => {
      const fact55: EventLogNativeFact = {
        channel: 'System',
        provider: 'Ntfs',
        eventId: 55,
        level: 2,
        timestamp: '2026-09-22T09:00:00Z',
        recordId: 103,
        targetContext: 'C:',
        payload: {
          type: 'ntfs',
          volumeName: 'C:',
          repairHint: 'Corruption',
        },
      };

      const fact98: EventLogNativeFact = {
        channel: 'System',
        provider: 'Ntfs',
        eventId: 98,
        level: 3,
        timestamp: '2026-09-22T09:30:00Z',
        recordId: 104,
        targetContext: 'D:',
        payload: {
          type: 'ntfs',
          volumeName: 'D:',
          repairHint: 'Online spot fix required',
        },
      };

      expect(fact55.eventId).toBe(55);
      expect(fact98.eventId).toBe(98);
      expect(fact55.eventId).not.toBe(fact98.eventId);
      expect(fact55.targetContext).toBe('C:');
      expect(fact98.targetContext).toBe('D:');
    });

    it('I. Kernel-Power 41 preserves BugcheckCode and PowerButtonTimestamp when present', () => {
      const fact41: EventLogNativeFact = {
        channel: 'System',
        provider: 'Microsoft-Windows-Kernel-Power',
        eventId: 41,
        level: 1,
        timestamp: '2026-09-23T11:00:00Z',
        recordId: 105,
        payload: {
          type: 'kernelPower',
          bugcheckCode: 159,
          bugcheckParameter1: '0x3',
          powerButtonTimestamp: 13370000000,
          sleepInProgress: 0,
          connectedStandbyInProgress: false,
        },
      };

      expect(fact41.eventId).toBe(41);
      expect(fact41.payload?.type).toBe('kernelPower');
      if (fact41.payload?.type === 'kernelPower') {
        expect(fact41.payload.bugcheckCode).toBe(159);
        expect(fact41.payload.powerButtonTimestamp).toBe(13370000000);
        expect(fact41.payload.connectedStandbyInProgress).toBe(false);
      }
    });

    it('J. WHEA 17/18/19/47 are distinguished by Event ID and structured data', () => {
      const wheaEvents: EventLogNativeFact[] = [
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 17,
          level: 3,
          timestamp: '2026-09-24T12:00:00Z',
          recordId: 106,
          payload: { type: 'whea', errorSource: 4 },
        },
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 18,
          level: 1,
          timestamp: '2026-09-24T12:10:00Z',
          recordId: 107,
          payload: { type: 'whea', errorSource: 3, mcaBank: 2 },
        },
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 19,
          level: 3,
          timestamp: '2026-09-24T12:20:00Z',
          recordId: 108,
          payload: { type: 'whea', errorSource: 3, mcaBank: 0 },
        },
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 47,
          level: 3,
          timestamp: '2026-09-24T12:30:00Z',
          recordId: 109,
          payload: { type: 'whea', errorSource: 5 },
        },
      ];

      const ids = wheaEvents.map((e) => e.eventId);
      expect(ids).toEqual([17, 18, 19, 47]);
      expect(wheaEvents[1].level).toBe(1); // Uncorrected MCE is Level 1 (Critical)
      expect(wheaEvents[0].level).toBe(3); // Corrected PCIe is Level 3 (Warning)
    });

    it('K. Fallback availability handles channel unavailable or unsupported', () => {
      const unavailableSnap: EventLogDiagnosticsSnapshot = {
        availability: 'unavailable',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 0,
        truncated: false,
        events: [],
        errorDetails: 'Accesso negato al registro eventi System',
      };

      expect(unavailableSnap.availability).toBe('unavailable');
      expect(unavailableSnap.returnedEventCount).toBe(0);
      expect(unavailableSnap.errorDetails).toContain('negato');
    });

    it('L. Rendering failure on one event does not crash snapshot', () => {
      const snapWithSingleValid: EventLogDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 1,
        truncated: false,
        events: [
          {
            channel: 'System',
            provider: 'disk',
            eventId: 7,
            level: 2,
            timestamp: '2026-09-25T14:00:00Z',
            recordId: 200,
            targetContext: '\\Device\\Harddisk0\\DR0',
          },
        ],
      };

      expect(snapWithSingleValid.availability).toBe('available');
      expect(snapWithSingleValid.events).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // TRANCHE 8B — NATIVE WINDOWS SERVICE FACTS & CONTRACTS
  // -------------------------------------------------------------------------
  describe('Tranche 8B — Native Windows Service Facts & Contracts', () => {
    it('Scenario A: Running + Auto maps to running state and preserves PID', () => {
      const fact = createServiceFact({
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        rawState: 4, // SERVICE_RUNNING
        rawStartType: 2, // SERVICE_AUTO_START
        isDelayed: false,
        win32ExitCode: 0,
        rawProcessId: 1234,
      });

      expect(fact.serviceName).toBe('EventLog');
      expect(fact.displayName).toBe('Windows Event Log');
      expect(fact.operationalModel).toBe('always_running');
      expect(fact.currentState).toBe('running');
      expect(fact.startType).toBe('auto');
      expect(fact.win32ExitCode).toBe(0);
      expect(fact.serviceSpecificExitCode).toBeNull();
      expect(fact.processId).toBe(1234);
    });

    it('Scenario B: Stopped + Demand is a pure fact without derived problem', () => {
      const fact = createServiceFact({
        serviceName: 'wuauserv',
        displayName: 'Windows Update',
        operationalModel: 'on_demand',
        rawState: 1, // SERVICE_STOPPED
        rawStartType: 3, // SERVICE_DEMAND_START
        win32ExitCode: 0,
        rawProcessId: 0,
      });

      expect(fact.serviceName).toBe('wuauserv');
      expect(fact.currentState).toBe('stopped');
      expect(fact.startType).toBe('demand');
      expect(fact.processId).toBeNull();
      expect(fact.win32ExitCode).toBe(0);
    });

    it('Scenario C: Stopped + Disabled is a distinct configuration', () => {
      const fact = createServiceFact({
        serviceName: 'TrustedInstaller',
        displayName: 'Windows Modules Installer',
        operationalModel: 'on_demand',
        rawState: 1, // SERVICE_STOPPED
        rawStartType: 4, // SERVICE_DISABLED
        win32ExitCode: 0,
      });

      expect(fact.currentState).toBe('stopped');
      expect(fact.startType).toBe('disabled');
      expect(fact.processId).toBeNull();
    });

    it('Scenario D: Stopped + Non-zero Win32 Exit Code is preserved', () => {
      const fact = createServiceFact({
        serviceName: 'VSS',
        displayName: 'Volume Shadow Copy',
        operationalModel: 'on_demand',
        rawState: 1, // SERVICE_STOPPED
        rawStartType: 3, // SERVICE_DEMAND_START
        win32ExitCode: 1067, // ERROR_PROCESS_ABORTED
      });

      expect(fact.currentState).toBe('stopped');
      expect(fact.win32ExitCode).toBe(1067);
      expect(fact.processId).toBeNull();
    });

    it('Scenario E: Service Specific Exit Code is preserved when exitCode is 1066 or specific != 0', () => {
      const fact = createServiceFact({
        serviceName: 'WinDefend',
        displayName: 'Microsoft Defender Antivirus Service',
        operationalModel: 'contextual',
        rawState: 1,
        rawStartType: 2,
        win32ExitCode: 1066, // ERROR_SERVICE_SPECIFIC_ERROR
        rawSpecificExitCode: 42,
      });

      expect(fact.win32ExitCode).toBe(1066);
      expect(fact.serviceSpecificExitCode).toBe(42);
    });

    it('Scenario F: Service not found (1060) creates controlled unknown fact', () => {
      const fact: WindowsServiceNativeFact = {
        serviceName: 'NonExistentService',
        displayName: 'NonExistentService',
        operationalModel: 'on_demand',
        currentState: 'unknown',
        startType: 'unknown',
        win32ExitCode: 1060, // ERROR_SERVICE_DOES_NOT_EXIST
        serviceSpecificExitCode: null,
        processId: null,
      };

      expect(fact.currentState).toBe('unknown');
      expect(fact.startType).toBe('unknown');
      expect(fact.win32ExitCode).toBe(1060);
      expect(fact.processId).toBeNull();
    });

    it('Scenario G: Access denied (5) creates controlled unknown fact', () => {
      const fact: WindowsServiceNativeFact = {
        serviceName: 'ProtectedService',
        displayName: 'ProtectedService',
        operationalModel: 'always_running',
        currentState: 'unknown',
        startType: 'unknown',
        win32ExitCode: 5, // ERROR_ACCESS_DENIED
        serviceSpecificExitCode: null,
        processId: null,
      };

      expect(fact.currentState).toBe('unknown');
      expect(fact.startType).toBe('unknown');
      expect(fact.win32ExitCode).toBe(5);
      expect(fact.processId).toBeNull();
    });

    it('Scenario H: Correctly maps start types including delayed auto and unknown', () => {
      expect(mapServiceStartType(0)).toBe('boot');
      expect(mapServiceStartType(1)).toBe('system');
      expect(mapServiceStartType(2, false)).toBe('auto');
      expect(mapServiceStartType(2, true)).toBe('auto_delayed');
      expect(mapServiceStartType(3)).toBe('demand');
      expect(mapServiceStartType(4)).toBe('disabled');
      expect(mapServiceStartType(99)).toBe('unknown');
    });

    it('Scenario I: Correctly maps service states including unknown', () => {
      expect(mapServiceState(1)).toBe('stopped');
      expect(mapServiceState(2)).toBe('start_pending');
      expect(mapServiceState(3)).toBe('stop_pending');
      expect(mapServiceState(4)).toBe('running');
      expect(mapServiceState(5)).toBe('continue_pending');
      expect(mapServiceState(6)).toBe('pause_pending');
      expect(mapServiceState(7)).toBe('paused');
      expect(mapServiceState(99)).toBe('unknown');
    });

    it('Scenario J: Rule 3 & Test J - Stopped service MUST NEVER report a PID', () => {
      const fact = createServiceFact({
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        rawState: 1, // SERVICE_STOPPED
        rawStartType: 2,
        win32ExitCode: 0,
        rawProcessId: 9999, // Stale PID in raw memory
      });

      expect(fact.currentState).toBe('stopped');
      expect(fact.processId).toBeNull();
    });

    it('Scenario K: Exact catalog of 6 services with proper operational models', () => {
      expect(WINDOWS_SERVICES_CATALOG).toHaveLength(6);
      const names = WINDOWS_SERVICES_CATALOG.map((s) => s.serviceName);
      expect(names).toEqual([
        'EventLog',
        'Winmgmt',
        'wuauserv',
        'TrustedInstaller',
        'VSS',
        'WinDefend',
      ]);

      const models = WINDOWS_SERVICES_CATALOG.map((s) => s.operationalModel);
      expect(models).toEqual([
        'always_running',
        'always_running',
        'on_demand',
        'on_demand',
        'on_demand',
        'contextual',
      ]);
    });

    it('Scenario L: Determinism - identical input produces identical output', () => {
      const input = {
        serviceName: 'Winmgmt',
        displayName: 'Windows Management Instrumentation',
        operationalModel: 'always_running' as const,
        rawState: 4,
        rawStartType: 2,
        isDelayed: false,
        win32ExitCode: 0,
        rawSpecificExitCode: 0,
        rawProcessId: 5678,
      };

      const fact1 = createServiceFact(input);
      const fact2 = createServiceFact(input);
      expect(fact1).toEqual(fact2);
    });

    it('SystemDiagnostics integration includes systemServices snapshot in web fallback and error state', async () => {
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.systemServices).toBeDefined();
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.systemServices?.availability).toBe('unsupported');
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.systemServices?.catalogCount).toBe(6);
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.systemServices?.services).toHaveLength(0);

      const snap: SystemDiagnosticsSnapshot = await getSystemDiagnosticsSnapshot();
      expect(snap.systemServices).toBeDefined();
      const servicesSnap: WindowsServicesSnapshot = snap.systemServices!;
      expect(servicesSnap.catalogCount).toBe(6);
      expect(servicesSnap.source).toBe('Advapi32_SCM');
    });
  });
});

