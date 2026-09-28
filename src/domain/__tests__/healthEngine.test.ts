import { describe, it, expect } from 'vitest';
import {
  evaluateSystemHealth,
  evaluateEventLogHealth,
  computeDaysBetween,
  computeDiagnosticCoverage,
} from '../healthEngine';
import { SystemFactsInput } from '../../types/health';
import { EventLogNativeFact } from '../../types/diagnostics';

describe('healthEngine', () => {
  const REF_DATE = '2026-09-24T12:00:00.000Z';

  describe('computeDaysBetween', () => {
    it('calcola esattamente i giorni trascorsi', () => {
      expect(computeDaysBetween('2026-09-14T12:00:00.000Z', REF_DATE)).toBe(10);
      expect(computeDaysBetween('2026-09-24T12:00:00.000Z', REF_DATE)).toBe(0);
    });

    it('restituisce 0 per date future o non valide', () => {
      expect(computeDaysBetween('2026-10-01T12:00:00.000Z', REF_DATE)).toBe(0);
      expect(computeDaysBetween('invalid-date', REF_DATE)).toBe(0);
    });
  });

  describe('Sistema Perfettamente Sano (100/100 Healthy)', () => {
    it('produce uno status healthy con punteggio 100 e finding positivi GOOD', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        smartDisks: [
          {
            deviceId: '0',
            friendlyName: 'Samsung SSD 990 PRO 2TB',
            mediaType: 'SSD',
            healthStatus: 'Healthy',
            temperatureCelsius: 42,
            wearPercentage: 8,
            readErrorsTotal: 0,
            writeErrorsTotal: 0,
            powerOnHours: 1200,
          },
        ],
        drives: [
          {
            driveLetter: 'C:',
            label: 'Windows NVMe',
            fileSystem: 'NTFS',
            totalBytes: 2000000000000,
            freeBytes: 1200000000000, // 40% usage, 1200 GB liberi
            isSSD: true,
            mediaType: 'SSD',
            trimSupported: true,
          },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 15.0, availability: 'available', unit: '%', source: 'Win32' },
            logicalProcessorCount: 16,
            baseFrequencyMhz: { value: 4200, availability: 'available', unit: 'MHz', source: 'Registry' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: {
            totalBytes: 34359738368,
            usedBytes: 12884901888, // ~37%
            availableBytes: 21474836480,
            utilizationPercent: 37.5,
          },
          gpus: [
            {
              id: 'gpu-0',
              name: 'NVIDIA GeForce RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 30.0, availability: 'available', unit: '%', source: 'NVML' },
              vramTotalBytes: { value: 12884901888, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2147483648, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16.6, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 48.0, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 405, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 405, availability: 'available', source: 'NVML' },
              powerWatts: { value: 22.0, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 0.0, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 3600 },
        },
        maintenanceEntries: [
          {
            id: 'm-1',
            date: '2026-08-15', // ~40 giorni fa
            type: 'thermal_paste',
            title: 'Sostituzione pasta Noctua NT-H2',
            description: 'Applicata nuova pasta su CPU e GPU',
            productUsed: 'Noctua NT-H2',
            createdAt: REF_DATE,
            updatedAt: REF_DATE,
          },
          {
            id: 'm-2',
            date: '2026-09-01', // ~23 giorni fa
            type: 'filter_cleaning',
            title: 'Pulizia filtri antipolvere',
            description: 'Lavaggio filtri frontali e inferiore',
            createdAt: REF_DATE,
            updatedAt: REF_DATE,
          },
        ],
        systemFilesStatus: 'clean',
        securityAudit: {
          secureBootEnabled: true,
          tpmPresent: true,
          tpmReady: true,
          vbsRunning: true,
          hvciRunning: true,
          hostsFileClean: true,
          hostsCustomEntriesCount: 2,
          details: 'All secure',
        },
      };

      const report = evaluateSystemHealth(facts);

      expect(report.overallStatus).toBe('healthy');
      expect(report.healthScore).toBe(100);
      expect(report.summary.criticalCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
      expect(report.summary.attentionCount).toBe(0);
      expect(report.summary.goodCount).toBeGreaterThan(0);

      // Verifiche sui finding positivi specifici
      const ids = report.findings.map((f) => f.id);
      expect(ids).toContain('smart-healthy-0');
      expect(ids).toContain('storage-c-healthy');
      expect(ids).toContain('ram-healthy');
      expect(ids).toContain('gpu-temp-healthy-gpu-0');
      expect(ids).toContain('maint-thermal-paste-fresh');
      expect(ids).toContain('maint-filters-clean');
      expect(ids).toContain('system-sfc-clean');
      expect(ids).toContain('sec-optimal-security');
    });
  });

  describe('Anomalie Critiche su Storage e S.M.A.R.T.', () => {
    it('identifica usura critica e errori I/O come CRITICAL con azione consigliata', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        smartDisks: [
          {
            deviceId: '0',
            friendlyName: 'SSD Guasto',
            mediaType: 'SSD',
            healthStatus: 'Unhealthy',
            readErrorsTotal: 18,
            writeErrorsTotal: 4,
            wearPercentage: 94,
          },
        ],
        drives: [
          {
            driveLetter: 'C:',
            label: 'System',
            fileSystem: 'NTFS',
            totalBytes: 1000000000000,
            freeBytes: 8000000000, // 8 GB liberi -> Critico (< 15 GB)
            isSSD: true,
            mediaType: 'SSD',
            trimSupported: true,
          },
        ],
      };

      const report = evaluateSystemHealth(facts);

      expect(report.overallStatus).toBe('critical');
      expect(report.summary.criticalCount).toBe(2); // Smart critico + Spazio C critico

      const smartFinding = report.findings.find((f) => f.id === 'smart-critical-0');
      expect(smartFinding).toBeDefined();
      expect(smartFinding?.severity).toBe('CRITICAL');
      expect(smartFinding?.recommendedActionId).toBe('backup-disk');

      const storageFinding = report.findings.find((f) => f.id === 'storage-c-critical');
      expect(storageFinding).toBeDefined();
      expect(storageFinding?.severity).toBe('CRITICAL');
      expect(storageFinding?.recommendedActionId).toBe('clean-disk');

      // Punteggio ridotto di 25 * 2 = 50 punti (100 - 50 = 50)
      expect(report.healthScore).toBeLessThanOrEqual(50);
      expect(report.areaBreakdown.storage.status).toBe('critical');
    });

    it('identifica usura elevata al 82% come WARNING', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        smartDisks: [
          {
            deviceId: '1',
            friendlyName: 'Crucial P3 1TB',
            mediaType: 'SSD',
            healthStatus: 'Healthy',
            wearPercentage: 84,
            readErrorsTotal: 0,
            writeErrorsTotal: 0,
          },
        ],
      };

      const report = evaluateSystemHealth(facts);
      const wearFinding = report.findings.find((f) => f.id === 'smart-wear-warning-1');
      expect(wearFinding).toBeDefined();
      expect(wearFinding?.severity).toBe('WARNING');
      expect(report.overallStatus).toBe('warning');
    });
  });

  describe('Pressione Memoria RAM', () => {
    it('segnala WARNING se la memoria supera il 92% di utilizzo', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10.0, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: {
            totalBytes: 16000000000,
            usedBytes: 15200000000, // 95%
            availableBytes: 800000000,
            utilizationPercent: 95.0,
          },
          gpus: [],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const ramFinding = report.findings.find((f) => f.id === 'ram-critical-pressure');
      expect(ramFinding).toBeDefined();
      expect(ramFinding?.severity).toBe('WARNING');
      expect(ramFinding?.recommendedActionId).toBe('close-heavy-apps');
      expect(report.areaBreakdown.ram.status).toBe('warning');
    });

    it('segnala ATTENTION se la memoria è compresa tra 82% e 91%', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10.0, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: {
            totalBytes: 32000000000,
            usedBytes: 27200000000, // 85%
            availableBytes: 4800000000,
            utilizationPercent: 85.0,
          },
          gpus: [],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const ramFinding = report.findings.find((f) => f.id === 'ram-attention-pressure');
      expect(ramFinding).toBeDefined();
      expect(ramFinding?.severity).toBe('ATTENTION');
    });
  });

  describe('GPU e Confronto con Personal Baseline', () => {
    it('rileva surriscaldamento critico se GPU core temp >= 88°C', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10.0, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50.0 },
          gpus: [
            {
              id: 'gpu-hot',
              name: 'RTX 3080',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 99.0, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 10000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 5000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 50.0, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 89.0, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 1800, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 9000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 320.0, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 100.0, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const critThermal = report.findings.find((f) => f.id === 'gpu-temp-critical-gpu-hot');
      expect(critThermal).toBeDefined();
      expect(critThermal?.severity).toBe('CRITICAL');
      expect(report.areaBreakdown.thermal.status).toBe('critical');
    });

    it('rileva deviazione da Personal Baseline quando la GPU opera 8°C più calda del profilo Daily', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        tuningProfiles: [
          {
            id: 'tune-daily-gpu',
            name: 'Daily UV 950mV',
            category: 'gpu',
            date: '2025-10-01',
            type: 'gpu_undervolt',
            parameters: { offsetMv: -50 },
            stability: 'daily',
            temperatures: {
              idle: 35,
              load: 68, // Riferimento registered: 68°C
            },
            createdAt: '2025-10-01',
            updatedAt: '2025-10-01',
          },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10.0, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50.0 },
          gpus: [
            {
              id: 'gpu-daily-test',
              name: 'NVIDIA RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 85.0, availability: 'available', source: 'NVML' }, // Sotto carico
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 6000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 50.0, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 78.0, availability: 'available', unit: '°C', source: 'NVML' }, // 78°C (+10°C vs 68)
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2475, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10500, availability: 'available', source: 'NVML' },
              powerWatts: { value: 180.0, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 65.0, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const baselineFinding = report.findings.find((f) => f.id === 'gpu-baseline-divergence-gpu-daily-test');
      expect(baselineFinding).toBeDefined();
      expect(baselineFinding?.severity).toBe('WARNING');
      expect(baselineFinding?.evidence).toContain('+10°C');
      expect(baselineFinding?.evidence).toContain('68°C');
      expect(baselineFinding?.metadata?.delta).toBe(10);
    });
  });

  describe('Registro Manutenzione e Scadenze', () => {
    it('segnala WARNING se la pasta termica non viene sostituita da oltre 2 anni (730 giorni)', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        maintenanceEntries: [
          {
            id: 'm-old',
            date: '2024-01-01', // ~997 giorni fa rispetto a 2026-09-24
            type: 'thermal_paste',
            title: 'Cambio pasta originale',
            description: 'Pasta termica originale di fabbrica',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      const report = evaluateSystemHealth(facts);
      const pastaFinding = report.findings.find((f) => f.id === 'maint-thermal-paste-overdue');
      expect(pastaFinding).toBeDefined();
      expect(pastaFinding?.severity).toBe('WARNING');
      expect(pastaFinding?.recommendedActionId).toBe('apply-thermal-paste');
      expect(report.areaBreakdown.maintenance.status).toBe('warning');
    });

    it('segnala ATTENTION se i filtri non vengono puliti da oltre 6 mesi (180 giorni)', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        maintenanceEntries: [
          {
            id: 'm-filters-old',
            date: '2026-01-01', // ~266 giorni fa
            type: 'filter_cleaning',
            title: 'Pulizia filtri',
            description: 'Pulizia filtri periodica',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      };

      const report = evaluateSystemHealth(facts);
      const filterFinding = report.findings.find((f) => f.id === 'maint-filters-due');
      expect(filterFinding).toBeDefined();
      expect(filterFinding?.severity).toBe('ATTENTION');
      expect(filterFinding?.recommendedActionId).toBe('clean-filters');
    });
  });

  describe('Integrità Sistema e Sicurezza Windows', () => {
    it('segnala WARNING se SFC rileva file di sistema corrotti', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        systemFilesStatus: 'corrupted',
      };

      const report = evaluateSystemHealth(facts);
      const sfcFinding = report.findings.find((f) => f.id === 'system-sfc-corrupted');
      expect(sfcFinding).toBeDefined();
      expect(sfcFinding?.severity).toBe('WARNING');
      expect(sfcFinding?.recommendedActionId).toBe('sfc-repair');
      expect(report.areaBreakdown.system.status).toBe('warning');
    });

    it('segnala ATTENTION per Secure Boot disabilitato e TPM assente', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        securityAudit: {
          secureBootEnabled: false,
          tpmPresent: false,
          tpmReady: false,
          vbsRunning: false,
          hvciRunning: false,
          hostsFileClean: true,
          hostsCustomEntriesCount: 0,
          details: 'Insecure',
        },
      };

      const report = evaluateSystemHealth(facts);
      const sbFinding = report.findings.find((f) => f.id === 'sec-secure-boot-disabled');
      const tpmFinding = report.findings.find((f) => f.id === 'sec-tpm-missing');

      expect(sbFinding).toBeDefined();
      expect(sbFinding?.severity).toBe('ATTENTION');
      expect(tpmFinding).toBeDefined();
      expect(tpmFinding?.severity).toBe('ATTENTION');
      expect(report.areaBreakdown.security.status).toBe('attention');
    });
  });

  describe('Resilienza e Input Vuoto', () => {
    it('gestisce fatti vuoti senza eccezioni e restituisce un report valido di default', () => {
      const report = evaluateSystemHealth({});
      expect(report.evaluatedAt).toBeDefined();
      expect(report.healthScore).toBe(100);
      expect(report.overallStatus).toBe('healthy');
      expect(report.findings).toEqual([]);
      expect(report.summary.criticalCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
    });
  });

  describe('Copertura Diagnostica (Diagnostic Coverage)', () => {
    it('calcola copertura completa (100%, full) quando tutti i sensori rispondono', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        systemFilesStatus: 'clean',
        securityAudit: {
          secureBootEnabled: true,
          tpmPresent: true,
          tpmReady: true,
          vbsRunning: true,
          hvciRunning: true,
          hostsFileClean: true,
          hostsCustomEntriesCount: 0,
          details: 'Audit completato con successo',
        },
        drives: [
          { driveLetter: 'C:', label: 'OS', fileSystem: 'NTFS', totalBytes: 1_000_000_000_000, freeBytes: 500_000_000_000, isSSD: true, mediaType: 'SSD', trimSupported: true },
        ],
        smartDisks: [
          { deviceId: '0', friendlyName: 'NVMe', mediaType: 'SSD', healthStatus: 'Healthy', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'available' },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: 45, availability: 'available', source: 'ACPI' },
            packagePowerWatts: { value: 65, availability: 'available', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50 },
          gpus: [
            {
              id: 'gpu-0',
              name: 'RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 20, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16.6, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 50, availability: 'available', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2000, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 50, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 0, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 100 },
        },
        diagnostics: {
          timestamp: REF_DATE,
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
        },
      };

      const coverage = computeDiagnosticCoverage(facts);
      expect(coverage.level).toBe('full');
      expect(coverage.percentage).toBe(100);
      expect(coverage.availableChannels).toBe(13);
      expect(coverage.totalChannels).toBe(13);
      expect(coverage.hasHardwareGaps).toBe(false);

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(100);
      expect(report.diagnosticCoverage?.level).toBe('full');
    });

    it('gestisce sensori unavailable o snapshot assente senza penalizzare Health Score', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
      };

      const coverage = computeDiagnosticCoverage(facts);
      expect(coverage.level).toBe('minimal');
      expect(coverage.percentage).toBe(0);
      expect(coverage.availableChannels).toBe(0);
      expect(coverage.hasHardwareGaps).toBe(true);

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(100);
      expect(report.overallStatus).toBe('healthy');
    });

    it('identifica sensori unsupported (es. CPU temp/power) mantenendo Health Score 100/100 e coverage parziale', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        systemFilesStatus: 'clean',
        securityAudit: {
          secureBootEnabled: true,
          tpmPresent: true,
          tpmReady: true,
          vbsRunning: true,
          hvciRunning: true,
          hostsFileClean: true,
          hostsCustomEntriesCount: 0,
          details: 'Audit completato con successo',
        },
        drives: [
          { driveLetter: 'C:', label: 'OS', fileSystem: 'NTFS', totalBytes: 1_000_000_000_000, freeBytes: 500_000_000_000, isSSD: true, mediaType: 'SSD', trimSupported: true },
        ],
        smartDisks: [
          { deviceId: '0', friendlyName: 'NVMe', mediaType: 'SSD', healthStatus: 'Healthy', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'available' },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 15, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50 },
          gpus: [
            {
              id: 'gpu-0',
              name: 'RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 20, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16.6, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 50, availability: 'available', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2000, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 50, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 0, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 100 },
        },
      };

      const coverage = computeDiagnosticCoverage(facts);
      expect(coverage.level).toBe('partial');
      expect(coverage.availableChannels).toBe(8);
      expect(coverage.totalChannels).toBe(13);
      expect(coverage.percentage).toBe(62);

      const cpuTempChannel = coverage.channels.find((c) => c.id === 'cpu_temp');
      expect(cpuTempChannel?.status).toBe('unsupported');

      const cpuPowerChannel = coverage.channels.find((c) => c.id === 'cpu_power');
      expect(cpuPowerChannel?.status).toBe('unsupported');

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(100);
      expect(report.diagnosticCoverage?.level).toBe('partial');
    });

    it('gestisce configurazione con GPU assente etichettando i canali grafici come not_detected', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        currentRigComponents: [],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 4,
            baseFrequencyMhz: { value: 3000, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: 40, availability: 'available', source: 'ACPI' },
            packagePowerWatts: { value: 30, availability: 'available', source: 'RAPL' },
          },
          memory: { totalBytes: 8000000000, usedBytes: 4000000000, availableBytes: 4000000000, utilizationPercent: 50 },
          gpus: [],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 50 },
        },
      };

      const coverage = computeDiagnosticCoverage(facts);
      const gpuTelemetry = coverage.channels.find((c) => c.id === 'gpu_telemetry');
      const gpuTemp = coverage.channels.find((c) => c.id === 'gpu_temp');

      expect(gpuTelemetry?.status).toBe('not_detected');
      expect(gpuTemp?.status).toBe('not_detected');

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(100);
    });

    it('identifica storage SMART non disponibile (unavailable) o con permission_required senza alterare lo Health Score', () => {
      // Caso 1: SMART unavailable
      const factsNoSmart: SystemFactsInput = {
        referenceDate: REF_DATE,
        smartDisks: [],
      };
      const covNoSmart = computeDiagnosticCoverage(factsNoSmart);
      const smartChannelNo = covNoSmart.channels.find((c) => c.id === 'storage_smart');
      expect(smartChannelNo?.status).toBe('unavailable');

      const reportNoSmart = evaluateSystemHealth(factsNoSmart);
      expect(reportNoSmart.healthScore).toBe(100);

      // Caso 2: SMART permission_required
      const factsPermSmart: SystemFactsInput = {
        referenceDate: REF_DATE,
        smartDisks: [
          {
            deviceId: '0',
            friendlyName: 'Samsung NVMe',
            mediaType: 'SSD',
            healthStatus: 'Unknown',
            readErrorsTotal: 0,
            writeErrorsTotal: 0,
            smartStatus: 'permission_required',
            smartStatusReason: 'Access to CIM denied without elevation',
          },
        ],
      };
      const covPermSmart = computeDiagnosticCoverage(factsPermSmart);
      const smartChannelPerm = covPermSmart.channels.find((c) => c.id === 'storage_smart');
      expect(smartChannelPerm?.status).toBe('permission_required');

      const reportPermSmart = evaluateSystemHealth(factsPermSmart);
      expect(reportPermSmart.healthScore).toBe(100);
    });
  });

  describe('Verifica Rigorosa Personal Baseline', () => {
    it('NON genera falsi positivi quando il carico GPU è sotto il 75% (es. in idle)', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        tuningProfiles: [
          {
            id: 'tune-daily-gpu',
            name: 'Daily UV 950mV',
            category: 'gpu',
            date: '2025-10-01',
            type: 'gpu_undervolt',
            parameters: { offsetMv: -50 },
            stability: 'daily',
            temperatures: { idle: 35, load: 68 },
            createdAt: '2025-10-01',
            updatedAt: '2025-10-01',
          },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50 },
          gpus: [
            {
              id: 'gpu-idle-test',
              name: 'NVIDIA RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 30, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 78, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 1000, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 5000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 50, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 30, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const baselineFinding = report.findings.find((f) => f.id.startsWith('gpu-baseline-divergence'));
      expect(baselineFinding).toBeUndefined();
    });

    it('NON attiva il confronto se il profilo non è Daily o manca la temperatura di carico registrata', () => {
      const factsNonDaily: SystemFactsInput = {
        referenceDate: REF_DATE,
        tuningProfiles: [
          {
            id: 'tune-bench-gpu',
            name: 'Extreme Benchmark UV',
            category: 'gpu',
            date: '2025-10-01',
            type: 'gpu_undervolt',
            parameters: { offsetMv: -100 },
            stability: 'testing',
            temperatures: { idle: 35, load: 68 },
            createdAt: '2025-10-01',
            updatedAt: '2025-10-01',
          },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50 },
          gpus: [
            {
              id: 'gpu-bench-test',
              name: 'NVIDIA RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 90, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 80, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2500, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 190, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 70, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(factsNonDaily);
      const baselineFinding = report.findings.find((f) => f.id.startsWith('gpu-baseline-divergence'));
      expect(baselineFinding).toBeUndefined();
    });

    it('NON attiva finding se la deviazione termica sotto carico è inferiore a 8°C (es. +5°C tolleranza normale)', () => {
      const factsWithinTolerance: SystemFactsInput = {
        referenceDate: REF_DATE,
        tuningProfiles: [
          {
            id: 'tune-daily-gpu',
            name: 'Daily UV 950mV',
            category: 'gpu',
            date: '2025-10-01',
            type: 'gpu_undervolt',
            parameters: { offsetMv: -50 },
            stability: 'daily',
            temperatures: { idle: 35, load: 68 },
            createdAt: '2025-10-01',
            updatedAt: '2025-10-01',
          },
        ],
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 10, availability: 'available', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Win32' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50 },
          gpus: [
            {
              id: 'gpu-tol-test',
              name: 'NVIDIA RTX 4070',
              vendor: 'NVIDIA',
              isDiscrete: true,
              utilizationPercent: { value: 85, availability: 'available', source: 'NVML' },
              vramTotalBytes: { value: 12000000000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2000000000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 73, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2400, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10000, availability: 'available', source: 'NVML' },
              powerWatts: { value: 180, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 60, availability: 'available', source: 'NVML' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(factsWithinTolerance);
      const baselineFinding = report.findings.find((f) => f.id.startsWith('gpu-baseline-divergence'));
      expect(baselineFinding).toBeUndefined();
    });
  });

  describe('Tranche 8D-1: Event Log Health Integration', () => {
    function createEvent(params: {
      provider: string;
      eventId: number;
      level?: number;
      targetContext?: string;
      payload?: any;
      timestamp?: string;
      recordId?: number;
    }): EventLogNativeFact {
      return {
        channel: 'System',
        provider: params.provider,
        eventId: params.eventId,
        level: params.level ?? 3,
        timestamp: params.timestamp ?? '2026-09-24T10:00:00.000Z',
        recordId: params.recordId ?? 1,
        targetContext: params.targetContext ?? null,
        payload: params.payload ?? null,
      };
    }

    describe('Availability Gate vs Empty Events', () => {
      it('A. availability=available, events=[] restituisce nessun finding di evento (array vuoto)', () => {
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: {
              availability: 'available',
              source: 'Wevtapi_SystemLog',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 0,
              truncated: false,
              events: [],
            },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toEqual([]);
      });

      it('B. availability=unavailable, events=[] non produce finding né falsa evidenza di registro pulito', () => {
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'partial',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: {
              availability: 'unavailable',
              source: 'Wevtapi_SystemLog',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 0,
              truncated: false,
              events: [],
              errorDetails: 'Log non accessibile in questo contesto',
            },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toEqual([]);
        expect(findings.some((f) => f.evidence?.includes('0 eventi'))).toBe(false);
      });

      it('C. availability=unsupported, events=[] restituisce array vuoto', () => {
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'unsupported',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: {
              availability: 'unsupported',
              source: 'Wevtapi_SystemLog',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 0,
              truncated: false,
              events: [],
            },
            collectionDurationMs: 10,
          },
        };

        expect(evaluateEventLogHealth(facts)).toEqual([]);
      });

      it('D. availability=error, events=[] restituisce array vuoto', () => {
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'error',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: {
              availability: 'error',
              source: 'Wevtapi_SystemLog',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 0,
              truncated: false,
              events: [],
              errorDetails: 'Accesso negato al registro System',
            },
            collectionDurationMs: 10,
          },
        };

        expect(evaluateEventLogHealth(facts)).toEqual([]);
      });

      it('E. diagnostics null/undefined restituisce array vuoto', () => {
        expect(evaluateEventLogHealth({})).toEqual([]);
        expect(evaluateEventLogHealth({ diagnostics: null })).toEqual([]);
      });
    });

    describe('WHEA Events (PRODUCT_SEVERITY_POLICY)', () => {
      it('WHEA 17 isolato (< 5) genera finding INFO', () => {
        const events = [createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 17 })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-17-isolated');
        expect(findings[0].severity).toBe('INFO');
        expect(findings[0].area).toBe('system');
        expect(findings[0].explanation).not.toMatch(/scheda madre guasta|GPU guasta/i);
      });

      it('WHEA 17 ripetuto (>= 5) genera finding ATTENTION', () => {
        const events = Array.from({ length: 5 }, (_, i) =>
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 17, recordId: i + 1 })
        );
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 5, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-17-repeated');
        expect(findings[0].severity).toBe('ATTENTION');
      });

      it('WHEA 18 singolo genera finding WARNING (non CRITICAL) senza causalita CPU guasta', () => {
        const events = [createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 18 })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-18-single');
        expect(findings[0].severity).toBe('WARNING');
        expect(findings[0].area).toBe('cpu');
        expect(findings[0].explanation).not.toMatch(/CPU guasta/i);
      });

      it('WHEA 18 ripetuto (>= 2) genera finding CRITICAL', () => {
        const events = [
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 18, recordId: 1 }),
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 18, recordId: 2 }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 2, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-18-repeated');
        expect(findings[0].severity).toBe('CRITICAL');
        expect(findings[0].area).toBe('cpu');
      });

      it('WHEA 19 isolato (< 3) genera ATTENTION (severita rigorosamente inferiore a WHEA 18)', () => {
        const events = [createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 19 })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-19-isolated');
        expect(findings[0].severity).toBe('ATTENTION');
      });

      it('WHEA 19 ripetuto (>= 3) genera WARNING', () => {
        const events = Array.from({ length: 3 }, (_, i) =>
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 19, recordId: i + 1 })
        );
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 3, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-whea-19-repeated');
        expect(findings[0].severity).toBe('WARNING');
      });

      it('WHEA 47 isolato genera ATTENTION e ripetuto genera WARNING (area ram)', () => {
        const singleEventFacts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: {
              availability: 'available',
              source: 'Wevtapi',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 1,
              truncated: false,
              events: [createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 47 })],
            },
            collectionDurationMs: 10,
          },
        };

        const singleFindings = evaluateEventLogHealth(singleEventFacts);
        expect(singleFindings[0].id).toBe('event-whea-47-isolated');
        expect(singleFindings[0].severity).toBe('ATTENTION');
        expect(singleFindings[0].area).toBe('ram');
        expect(singleFindings[0].explanation).not.toMatch(/RAM rotta/i);

        const repeatedFacts: SystemFactsInput = {
          diagnostics: {
            ...singleEventFacts.diagnostics!,
            eventLog: {
              ...singleEventFacts.diagnostics!.eventLog!,
              returnedEventCount: 3,
              events: Array.from({ length: 3 }, (_, i) =>
                createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 47, recordId: i + 1 })
              ),
            },
          },
        };

        const repeatedFindings = evaluateEventLogHealth(repeatedFacts);
        expect(repeatedFindings[0].id).toBe('event-whea-47-repeated');
        expect(repeatedFindings[0].severity).toBe('WARNING');
        expect(repeatedFindings[0].area).toBe('ram');
      });
    });

    describe('Kernel-Power 41 (Unclean Reboot vs Bugcheck)', () => {
      it('bugcheckCode === 0 genera event-kp41-unclean-reboot (ATTENTION) senza dichiarare BSOD o alimentatore guasto', () => {
        const events = [
          createEvent({
            provider: 'Microsoft-Windows-Kernel-Power',
            eventId: 41,
            payload: { type: 'kernelPower', bugcheckCode: 0, powerButtonTimestamp: 0 },
          }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-kp41-unclean-reboot');
        expect(findings[0].severity).toBe('ATTENTION');
        expect(findings[0].area).toBe('system');
        // Verifica divieto assoluto di BSOD, alimentatore guasto o PSU guasto
        expect(findings[0].title).toBe('Riavvio/arresto non pulito rilevato (Kernel-Power 41)');
        expect(findings[0].explanation).toContain('Possibili cause includono interruzione dell\'alimentazione, reset hardware o arresto forzato');
        expect(findings[0].explanation).toContain('La causa non è determinata da questo evento da solo');
        expect(findings[0].title).not.toMatch(/BSOD|alimentatore guasto|PSU guasto/i);
        expect(findings[0].explanation).not.toMatch(/BSOD|alimentatore guasto|PSU guasto/i);
      });

      it('bugcheckCode !== 0 genera event-kp41-bugcheck (WARNING) con codice hex preservato', () => {
        const events = [
          createEvent({
            provider: 'Microsoft-Windows-Kernel-Power',
            eventId: 41,
            payload: { type: 'kernelPower', bugcheckCode: 0x139, powerButtonTimestamp: 0 },
          }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-kp41-bugcheck');
        expect(findings[0].severity).toBe('WARNING');
        expect(findings[0].evidence).toContain('0x139');
        expect(findings[0].explanation).not.toMatch(/alimentatore guasto|PSU guasto/i);
      });
    });

    describe('Storage Events (Disk 7, 11, 51)', () => {
      it('Disk 7 isolato genera event-disk-7-isolated (ATTENTION) senza dichiarare SSD guasto', () => {
        const events = [createEvent({ provider: 'disk', eventId: 7, targetContext: '\\Device\\Harddisk0\\DR0' })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-disk-7-isolated');
        expect(findings[0].severity).toBe('ATTENTION');
        expect(findings[0].area).toBe('storage');
        expect(findings[0].explanation).not.toMatch(/SSD guasto/i);
      });

      it('Disk 7 ripetuto (>= 3) genera event-disk-7-repeated (WARNING)', () => {
        const events = Array.from({ length: 3 }, (_, i) =>
          createEvent({ provider: 'disk', eventId: 7, recordId: i + 1 })
        );
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 3, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-disk-7-repeated');
        expect(findings[0].severity).toBe('WARNING');
      });

      it('Disk 7 singolo ma corroborato da errori SMART genera event-disk-7-repeated (WARNING)', () => {
        const events = [createEvent({ provider: 'disk', eventId: 7 })];
        const facts: SystemFactsInput = {
          smartDisks: [
            {
              deviceId: '0',
              friendlyName: 'SSD Corroborato',
              mediaType: 'SSD',
              healthStatus: 'Warning',
              readErrorsTotal: 5,
              writeErrorsTotal: 2,
            },
          ],
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-disk-7-repeated');
        expect(findings[0].severity).toBe('WARNING');
      });

      it('Disk 11 genera event-disk-11-communication (ATTENTION)', () => {
        const events = [createEvent({ provider: 'disk', eventId: 11, targetContext: 'SCSI Controller' })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-disk-11-communication');
        expect(findings[0].severity).toBe('ATTENTION');
      });

      it('Disk 51 genera event-disk-51-paging (ATTENTION) senza urlare disk failure', () => {
        const events = [createEvent({ provider: 'disk', eventId: 51, targetContext: '\\Device\\Harddisk1\\DR1' })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-disk-51-paging');
        expect(findings[0].severity).toBe('ATTENTION');
        expect(findings[0].explanation).not.toMatch(/SSD guasto|guasto hardware/i);
      });
    });

    describe('NTFS Events (NTFS 55 & NTFS 98)', () => {
      it('NTFS 55 genera event-ntfs-55-corruption (WARNING) con azione chkdsk-scan', () => {
        const events = [createEvent({ provider: 'ntfs', eventId: 55, targetContext: 'Volume D:' })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-ntfs-55-corruption');
        expect(findings[0].severity).toBe('WARNING');
        expect(findings[0].recommendedActionId).toBe('chkdsk-scan');
      });

      it('NTFS 98 check-required genera event-ntfs-98-check-required (ATTENTION)', () => {
        const events = [
          createEvent({
            provider: 'ntfs',
            eventId: 98,
            level: 3,
            payload: { type: 'ntfs', repairHint: 'Volume check or repair is required' },
          }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-ntfs-98-check-required');
        expect(findings[0].severity).toBe('ATTENTION');
      });

      it('NTFS 98 verified genera event-ntfs-98-verified (INFO)', () => {
        const events = [
          createEvent({
            provider: 'ntfs',
            eventId: 98,
            level: 4,
            targetContext: 'Volume C: is healthy',
          }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-ntfs-98-verified');
        expect(findings[0].severity).toBe('INFO');
      });
    });

    describe('Display 4101 (TDR Driver Reset)', () => {
      it('Display 4101 isolato (< 3) genera event-display-tdr-isolated (ATTENTION) senza dichiarare GPU rotta', () => {
        const events = [createEvent({ provider: 'Display', eventId: 4101, payload: { type: 'display', driverName: 'nvlddmkm' } })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-display-tdr-isolated');
        expect(findings[0].severity).toBe('ATTENTION');
        expect(findings[0].area).toBe('gpu');
        expect(findings[0].explanation).not.toMatch(/GPU rotta|guasto permanente della scheda grafica/i);
      });

      it('Display 4101 frequente (>= 3) genera event-display-tdr-frequent (WARNING)', () => {
        const events = Array.from({ length: 3 }, (_, i) =>
          createEvent({ provider: 'Display', eventId: 4101, recordId: i + 1, payload: { type: 'display', driverName: 'amdkmdag' } })
        );
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 3, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings).toHaveLength(1);
        expect(findings[0].id).toBe('event-display-tdr-frequent');
        expect(findings[0].severity).toBe('WARNING');
      });
    });

    describe('Truncation Safety & Wording Audit', () => {
      it('se truncated === true, l evidenza include "nel campione limitato di diagnostica" e non "totale"', () => {
        const events = [createEvent({ provider: 'Display', eventId: 4101 })];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 1, truncated: true, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings[0].evidence).toContain('nel campione limitato di diagnostica');
        expect(findings[0].evidence).not.toMatch(/totale|nella settimana/i);
      });

      it('tutti i findings superano il test di assenza causalita e parole allarmistiche', () => {
        const events = [
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 17, recordId: 1 }),
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 18, recordId: 2 }),
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 19, recordId: 3 }),
          createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 47, recordId: 4 }),
          createEvent({ provider: 'Microsoft-Windows-Kernel-Power', eventId: 41, recordId: 5, payload: { type: 'kernelPower', bugcheckCode: 0, powerButtonTimestamp: 0 } }),
          createEvent({ provider: 'disk', eventId: 7, recordId: 6 }),
          createEvent({ provider: 'disk', eventId: 11, recordId: 7 }),
          createEvent({ provider: 'disk', eventId: 51, recordId: 8 }),
          createEvent({ provider: 'ntfs', eventId: 55, recordId: 9 }),
          createEvent({ provider: 'Display', eventId: 4101, recordId: 10 }),
        ];
        const facts: SystemFactsInput = {
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 10, truncated: false, events },
            collectionDurationMs: 10,
          },
        };

        const findings = evaluateEventLogHealth(facts);
        expect(findings.length).toBeGreaterThanOrEqual(10);

        const forbiddenRegex = /CPU guasta|RAM rotta|GPU rotta|SSD guasto|alimentatore guasto|PSU guasto/i;
        for (const f of findings) {
          expect(f.title).not.toMatch(forbiddenRegex);
          expect(f.evidence).not.toMatch(forbiddenRegex);
          expect(f.explanation).not.toMatch(forbiddenRegex);
        }
      });
    });

    describe('Determinism & Order Invariance', () => {
      it('l ordine degli eventi nell array non altera i findings prodotti (Permutation Invariance)', () => {
        const ev1 = createEvent({ provider: 'Microsoft-Windows-WHEA-Logger', eventId: 18, recordId: 1 });
        const ev2 = createEvent({ provider: 'Display', eventId: 4101, recordId: 2 });
        const ev3 = createEvent({ provider: 'ntfs', eventId: 55, recordId: 3 });

        const baseDiagnostics = {
          timestamp: REF_DATE,
          status: 'success' as const,
          deviceProblems: { availability: 'available' as const, source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
          memoryCommit: { availability: 'available' as const, source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
          powerStatus: { availability: 'available' as const, source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' as const },
          collectionDurationMs: 10,
        };

        const factsOrder1: SystemFactsInput = {
          diagnostics: {
            ...baseDiagnostics,
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 3, truncated: false, events: [ev1, ev2, ev3] },
          },
        };

        const factsOrder2: SystemFactsInput = {
          diagnostics: {
            ...baseDiagnostics,
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 3, truncated: false, events: [ev3, ev1, ev2] },
          },
        };

        const findings1 = evaluateEventLogHealth(factsOrder1);
        const findings2 = evaluateEventLogHealth(factsOrder2);

        expect(findings1).toEqual(findings2);
      });
    });

    describe('Health Score Isolation', () => {
      it('Event Log clean o non disponibile aggiunge zero penalita allo score di sistema', () => {
        const baseCleanFacts: SystemFactsInput = {
          referenceDate: REF_DATE,
          systemFilesStatus: 'clean',
        };

        const initialReport = evaluateSystemHealth(baseCleanFacts);
        const initialScore = initialReport.healthScore;

        // Aggiungi eventLog clean (available, events: [])
        const factsWithCleanEvents: SystemFactsInput = {
          ...baseCleanFacts,
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
            memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
            powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
            eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
            collectionDurationMs: 10,
          },
        };
        const cleanReport = evaluateSystemHealth(factsWithCleanEvents);
        expect(cleanReport.healthScore).toBe(initialScore);

        // Aggiungi eventLog non disponibile (unavailable)
        const factsWithUnavailableEvents: SystemFactsInput = {
          ...baseCleanFacts,
          diagnostics: {
            ...factsWithCleanEvents.diagnostics!,
            eventLog: { availability: 'unavailable', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
          },
        };
        const unavailableReport = evaluateSystemHealth(factsWithUnavailableEvents);
        expect(unavailableReport.healthScore).toBe(initialScore);
      });
    });
  });
});

