import { describe, it, expect } from 'vitest';
import { evaluateSystemHealth, computeDiagnosticCoverage } from '../healthEngine';
import { generateOptimizationRecommendations } from '../optimizationEngine';
import { SystemFactsInput } from '../../types/health';
import { SystemDiagnosticsSnapshot } from '../../types/diagnostics';
import { TuningProfile } from '../../types/tuning';

describe('Tranche 7B — Domain Integration: Health Engine & Optimization Engine', () => {
  const baseDiagnostics: SystemDiagnosticsSnapshot = {
    timestamp: '2026-09-28T10:00:00Z',
    status: 'success',
    collectionDurationMs: 4,
    deviceProblems: {
      availability: 'available',
      source: 'CM_Get_DevNode_Status',
      totalDevicesScanned: 219,
      problemCount: 0,
      devicesWithProblems: [],
    },
    memoryCommit: {
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
    },
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
  };

  const dailyTuningProfile: TuningProfile = {
    id: 'tune-1',
    name: 'Daily Undervolt Curve -25',
    category: 'cpu',
    componentId: 'cpu-1',
    date: '2026-09-20',
    stability: 'daily',
    type: 'cpu_undervolt',
    parameters: { offsetMv: -25 },
    notes: 'Stabile in Cinebench e Prime95',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  };

  // -------------------------------------------------------------------------
  // 1. HEALTH ENGINE — DEVICE PROBLEMS (RULE I)
  // -------------------------------------------------------------------------
  describe('1. Health Engine — Device Faults Evaluation', () => {
    it('Healthy device tree generates GOOD finding with 0 score penalty', () => {
      const facts: SystemFactsInput = {
        diagnostics: baseDiagnostics,
      };

      const report = evaluateSystemHealth(facts);
      const healthyFinding = report.findings.find((f) => f.id === 'device-tree-healthy');

      expect(healthyFinding).toBeDefined();
      expect(healthyFinding?.severity).toBe('GOOD');
      expect(healthyFinding?.evidence).toContain('219 nodi hardware');
      expect(report.healthScore).toBe(100);
    });

    it('Fatal hardware problem (Code 43) produces CRITICAL finding with score penalty', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          deviceProblems: {
            ...baseDiagnostics.deviceProblems,
            problemCount: 1,
            devicesWithProblems: [
              {
                deviceId: 'PCI\\VEN_10DE&DEV_2684&SUBSYS_169910DE',
                friendlyName: 'NVIDIA GeForce RTX 4090',
                problemCode: 43,
                problemLabel: 'CM_PROB_FAILED_POST (Codice 43)',
                problemDescription: 'Il dispositivo ha segnalato un problema ed è stato arrestato da Windows',
                statusFlags: 0x00000400,
                severity: 'critical',
              },
            ],
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const fault = report.findings.find((f) => f.id.startsWith('device-fault-43'));

      expect(fault).toBeDefined();
      expect(fault?.severity).toBe('CRITICAL');
      expect(fault?.title).toContain('RTX 4090');
      expect(report.summary.criticalCount).toBe(1);
      expect(report.healthScore).toBe(75); // 100 - 25
      expect(report.overallStatus).toBe('critical');
    });

    it('Disabled or disconnected device produces INFO finding without breaking Health Score', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          deviceProblems: {
            ...baseDiagnostics.deviceProblems,
            problemCount: 1,
            devicesWithProblems: [
              {
                deviceId: 'USB\\VID_046D&PID_C52B',
                friendlyName: 'Dispositivo di input USB disconnesso',
                problemCode: 45,
                problemLabel: 'CM_PROB_HARDWARE_NOT_PRESENT (Codice 45)',
                problemDescription: 'Dispositivo attualmente non collegato fisicamente al computer',
                statusFlags: 0,
                severity: 'info',
              },
            ],
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const infoFinding = report.findings.find((f) => f.id.startsWith('device-fault-45'));

      expect(infoFinding).toBeDefined();
      expect(infoFinding?.severity).toBe('INFO');
      expect(report.summary.criticalCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
      expect(report.healthScore).toBe(100); // 0 penalty for INFO!
    });

    it('Unavailable/unsupported device API does not penalize score', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          deviceProblems: {
            availability: 'unsupported',
            source: 'CM_Get_DevNode_Status',
            totalDevicesScanned: 0,
            problemCount: 0,
            devicesWithProblems: [],
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const anyFault = report.findings.some((f) => f.id.startsWith('device-fault-'));
      expect(anyFault).toBe(false);
      expect(report.healthScore).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // 2. HEALTH ENGINE — MEMORY COMMIT & PRESSURE (RULE J)
  // -------------------------------------------------------------------------
  describe('2. Health Engine — Memory Commit Evaluation', () => {
    it('Optimal memory commit produces GOOD finding with 0 score penalty', () => {
      const facts: SystemFactsInput = {
        diagnostics: baseDiagnostics,
      };

      const report = evaluateSystemHealth(facts);
      const goodCommit = report.findings.find((f) => f.id === 'memory-commit-optimal');

      expect(goodCommit).toBeDefined();
      expect(goodCommit?.severity).toBe('GOOD');
      expect(report.healthScore).toBe(100);
    });

    it('High commit (>88%) with low physical memory (<=15%) produces ATTENTION finding', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          memoryCommit: {
            ...baseDiagnostics.memoryCommit,
            commitUtilizationPercent: 90.0,
            physicalUtilizationPercent: 88.0, // only 12% free
            physicalAvailableBytes: 3.8 * 1024 * 1024 * 1024,
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const pressureFinding = report.findings.find((f) => f.id === 'memory-commit-high-pressure');

      expect(pressureFinding).toBeDefined();
      expect(pressureFinding?.severity).toBe('ATTENTION');
      expect(report.summary.attentionCount).toBeGreaterThanOrEqual(1);
      expect(report.healthScore).toBe(96); // 100 - 4
    });

    it('Extreme exhaustion (>94% commit AND <=8% physical RAM) produces WARNING finding', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          memoryCommit: {
            ...baseDiagnostics.memoryCommit,
            commitUtilizationPercent: 96.0,
            physicalUtilizationPercent: 94.0, // only 6% free
            physicalAvailableBytes: 1.5 * 1024 * 1024 * 1024,
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const warnFinding = report.findings.find((f) => f.id === 'memory-commit-critical-exhaustion');

      expect(warnFinding).toBeDefined();
      expect(warnFinding?.severity).toBe('WARNING');
      expect(report.summary.warningCount).toBeGreaterThanOrEqual(1);
      expect(report.healthScore).toBe(88); // 100 - 12
    });

    it('High commit spike with healthy physical RAM does not produce critical alarm', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          memoryCommit: {
            ...baseDiagnostics.memoryCommit,
            commitUtilizationPercent: 91.0,
            physicalUtilizationPercent: 45.0, // RAM fisica al 55% libera!
          },
        },
      };

      const report = evaluateSystemHealth(facts);
      const criticalExhaustion = report.findings.find((f) => f.id === 'memory-commit-critical-exhaustion');
      expect(criticalExhaustion).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. OPTIMIZATION ENGINE — POWER CONTEXT & DEVICE RECS (RULE K, L, M)
  // -------------------------------------------------------------------------
  describe('3. Optimization Engine — Power Policy & Device Recommendations', () => {
    it('Rule K: Proposes Ultimate Performance on desktop-like AC system with daily tuning', () => {
      const facts: SystemFactsInput = {
        diagnostics: baseDiagnostics,
        tuningProfiles: [dailyTuningProfile],
      };

      const opt = generateOptimizationRecommendations(facts);
      const ultPerf = opt.recommendations.find((r) => r.id === 'opt-ultimate-performance');

      expect(ultPerf).toBeDefined();
      expect(ultPerf?.actionAvailability).toBe('ASSISTED');
    });

    it('Rule K: DOES NOT propose Ultimate Performance when running on battery', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          powerStatus: {
            ...baseDiagnostics.powerStatus,
            acLineStatus: 0,
            isOnAC: false,
            isOnBattery: true,
            hasSystemBattery: true,
            powerArchitecture: 'battery_capable',
          },
        },
        tuningProfiles: [dailyTuningProfile],
      };

      const opt = generateOptimizationRecommendations(facts);
      const ultPerf = opt.recommendations.find((r) => r.id === 'opt-ultimate-performance');

      expect(ultPerf).toBeUndefined(); // Refused on battery!
    });

    it('Rule K: DOES NOT propose Ultimate Performance when battery saver is active', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          powerStatus: {
            ...baseDiagnostics.powerStatus,
            batterySaverActive: true,
          },
        },
        tuningProfiles: [dailyTuningProfile],
      };

      const opt = generateOptimizationRecommendations(facts);
      const ultPerf = opt.recommendations.find((r) => r.id === 'opt-ultimate-performance');

      expect(ultPerf).toBeUndefined(); // Refused on battery saver!
    });

    it('Rule K: Proposes Ultimate Performance on battery-capable laptop ONLY when explicitly on AC', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          powerStatus: {
            ...baseDiagnostics.powerStatus,
            acLineStatus: 1,
            isOnAC: true,
            isOnBattery: false,
            hasSystemBattery: true,
            powerArchitecture: 'battery_capable',
          },
        },
        tuningProfiles: [dailyTuningProfile],
      };

      const opt = generateOptimizationRecommendations(facts);
      const ultPerf = opt.recommendations.find((r) => r.id === 'opt-ultimate-performance');

      expect(ultPerf).toBeDefined();
      expect(ultPerf?.reason).toContain('dispositivo portatile');
    });

    it('Rule L & M: Generates ASSISTED inspection recommendation for warning/critical device faults', () => {
      const facts: SystemFactsInput = {
        diagnostics: {
          ...baseDiagnostics,
          deviceProblems: {
            ...baseDiagnostics.deviceProblems,
            problemCount: 1,
            devicesWithProblems: [
              {
                deviceId: 'PCI\\VEN_10DE&DEV_2684',
                friendlyName: 'NVIDIA RTX 4090',
                problemCode: 43,
                problemLabel: 'CM_PROB_FAILED_POST (Codice 43)',
                problemDescription: 'Arrestato da Windows',
                statusFlags: 0x400,
                severity: 'critical',
              },
            ],
          },
        },
      };

      const opt = generateOptimizationRecommendations(facts);
      const devRec = opt.recommendations.find((r) => r.id === 'opt-device-fault-inspection');

      expect(devRec).toBeDefined();
      expect(devRec?.category).toBe('system');
      expect(devRec?.actionAvailability).toBe('ASSISTED');
      expect(devRec?.actionId).toBe('inspect-device-fault');
      expect(devRec?.verificationMethod).toContain('azzeramento del codice di errore');
    });

    it('Rule L: Does NOT generate false device recommendations when all devices are healthy', () => {
      const facts: SystemFactsInput = {
        diagnostics: baseDiagnostics,
      };

      const opt = generateOptimizationRecommendations(facts);
      const devRec = opt.recommendations.find((r) => r.id === 'opt-device-fault-inspection');

      expect(devRec).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 4. DIAGNOSTIC COVERAGE (RULE N)
  // -------------------------------------------------------------------------
  describe('4. Diagnostic Coverage (Rule N)', () => {
    it('Correctly counts all 15 channels when native facts are present', () => {
      const facts: SystemFactsInput = {
        diagnostics: baseDiagnostics,
      };

      const cov = computeDiagnosticCoverage(facts);

      expect(cov.totalChannels).toBe(15);
      const devChannel = cov.channels.find((c) => c.id === 'device_faults');
      const memChannel = cov.channels.find((c) => c.id === 'memory_commit');
      const pwrChannel = cov.channels.find((c) => c.id === 'power_architecture');

      expect(devChannel?.status).toBe('available');
      expect(memChannel?.status).toBe('available');
      expect(pwrChannel?.status).toBe('available');
    });

    it('Marks channels as unavailable when diagnostics is omitted', () => {
      const facts: SystemFactsInput = {};
      const cov = computeDiagnosticCoverage(facts);

      const devChannel = cov.channels.find((c) => c.id === 'device_faults');
      const memChannel = cov.channels.find((c) => c.id === 'memory_commit');
      const pwrChannel = cov.channels.find((c) => c.id === 'power_architecture');

      expect(devChannel?.status).toBe('unavailable');
      expect(memChannel?.status).toBe('unavailable');
      expect(pwrChannel?.status).toBe('unavailable');
    });
  });
});
