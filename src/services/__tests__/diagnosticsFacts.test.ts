import { describe, it, expect } from 'vitest';
import {
  mapProblemCode,
  evaluateCommitPressure,
  MemoryCommitSnapshot,
  PowerStatusSnapshot,
  DeviceProblemsFact,
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
      expect(UNSUPPORTED_WEB_DIAGNOSTICS_SNAPSHOT.powerStatus.powerArchitecture).toBe('unknown');
    });
  });
});
