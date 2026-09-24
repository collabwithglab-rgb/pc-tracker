import { describe, it, expect } from 'vitest';
import {
  evaluateSystemHealth,
  computeDaysBetween,
} from '../healthEngine';
import { SystemFactsInput } from '../../types/health';

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
});
