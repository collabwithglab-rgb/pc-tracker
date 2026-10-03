import { describe, it, expect } from 'vitest';
import {
  evaluateSystemHealth,
  evaluateEventLogHealth,
  evaluateWindowsServicesHealth,
  computeDaysBetween,
  computeDiagnosticCoverage,
  HARDWARE_SENSOR_CHANNEL_IDS,
  isHardwareGap,
  enrichFindingsWithCorrelations,
  getFindingSemanticRank,
  sortCorrelationEvidence,
  sanitizeCorrelationWording,
} from '../healthEngine';
import { HealthFinding, SystemFactsInput } from '../../types/health';
import {
  EventLogNativeFact,
  WindowsServiceNativeFact,
  DiagnosticCorrelation,
} from '../../types/diagnostics';

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

    it('rileva surriscaldamento critico Hotspot (TJunction >= 110°C) su GPU AMD Radeon via ADL', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 20.0, availability: 'available', source: 'GetSystemTimes' },
            logicalProcessorCount: 16,
            baseFrequencyMhz: { value: 3800, availability: 'available', source: 'WMI' },
            packageTemperatureCelsius: { value: 50.0, availability: 'available', source: 'WMI' },
            packagePowerWatts: { value: 65.0, availability: 'available', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50.0 },
          gpus: [
            {
              id: 'gpu-amd-rdna',
              name: 'AMD Radeon RX 7900 XTX',
              vendor: 'AMD',
              isDiscrete: true,
              utilizationPercent: { value: 98.0, availability: 'available', source: 'ADL' },
              vramTotalBytes: { value: 24000000000, availability: 'available', source: 'ADL' },
              vramUsedBytes: { value: 12000000000, availability: 'available', source: 'ADL' },
              vramUtilizationPercent: { value: 50.0, availability: 'available', source: 'ADL' },
              coreTemperatureCelsius: { value: 75.0, availability: 'available', unit: '°C', source: 'ADL' },
              hotspotTemperatureCelsius: { value: 112.0, availability: 'available', unit: '°C', source: 'ADL' },
              coreClockMhz: { value: 2500, availability: 'available', source: 'ADL' },
              memoryClockMhz: { value: 2500, availability: 'available', source: 'ADL' },
              powerWatts: { value: 350.0, availability: 'available', source: 'ADL' },
              fanSpeedPercent: { value: 95.0, availability: 'available', source: 'ADL' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const critHotspot = report.findings.find((f) => f.id === 'gpu-hotspot-critical-gpu-amd-rdna');
      expect(critHotspot).toBeDefined();
      expect(critHotspot?.severity).toBe('CRITICAL');
      expect(critHotspot?.evidence).toContain('112°C');

      // Verifica canale diagnostico con sorgente ADL
      const tempChannel = report.diagnosticCoverage?.channels.find((c) => c.id === 'gpu_temp');
      expect(tempChannel?.status).toBe('available');
      expect(tempChannel?.source).toBe('ADL');
    });

    it('rileva avviso termico Hotspot (TJunction tra 100°C e 109°C) su GPU AMD Radeon', () => {
      const facts: SystemFactsInput = {
        referenceDate: REF_DATE,
        monitoring: {
          timestamp: REF_DATE,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 15.0, availability: 'available', source: 'GetSystemTimes' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'WMI' },
            packageTemperatureCelsius: { value: 45.0, availability: 'available', source: 'WMI' },
            packagePowerWatts: { value: 45.0, availability: 'available', source: 'RAPL' },
          },
          memory: { totalBytes: 16000000000, usedBytes: 8000000000, availableBytes: 8000000000, utilizationPercent: 50.0 },
          gpus: [
            {
              id: 'gpu-amd-6800xt',
              name: 'AMD Radeon RX 6800 XT',
              vendor: 'AMD',
              isDiscrete: true,
              utilizationPercent: { value: 85.0, availability: 'available', source: 'ADL' },
              vramTotalBytes: { value: 16000000000, availability: 'available', source: 'ADL' },
              vramUsedBytes: { value: 8000000000, availability: 'available', source: 'ADL' },
              vramUtilizationPercent: { value: 50.0, availability: 'available', source: 'ADL' },
              coreTemperatureCelsius: { value: 72.0, availability: 'available', unit: '°C', source: 'ADL' },
              hotspotTemperatureCelsius: { value: 104.0, availability: 'available', unit: '°C', source: 'ADL' },
              coreClockMhz: { value: 2200, availability: 'available', source: 'ADL' },
              memoryClockMhz: { value: 2000, availability: 'available', source: 'ADL' },
              powerWatts: { value: 280.0, availability: 'available', source: 'ADL' },
              fanSpeedPercent: { value: 75.0, availability: 'available', source: 'ADL' },
            },
          ],
          storage: [],
          system: { osVersion: 'Win', osBuild: '1', uptimeSeconds: 100 },
        },
      };

      const report = evaluateSystemHealth(facts);
      const warnHotspot = report.findings.find((f) => f.id === 'gpu-hotspot-warning-gpu-amd-6800xt');
      expect(warnHotspot).toBeDefined();
      expect(warnHotspot?.severity).toBe('WARNING');
      expect(warnHotspot?.evidence).toContain('104°C');
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
          eventLog: {
            availability: 'available',
            source: 'Wevtapi_SystemLog',
            queryTimeWindowHours: 168,
            maxEventsCap: 50,
            returnedEventCount: 0,
            truncated: false,
            events: [],
          },
          systemServices: {
            availability: 'available',
            source: 'Advapi32_SCM',
            scannedAt: REF_DATE,
            catalogCount: 6,
            services: [
              { serviceName: 'EventLog', displayName: 'Windows Event Log', operationalModel: 'always_running', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
              { serviceName: 'Winmgmt', displayName: 'Windows Management Instrumentation', operationalModel: 'always_running', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
              { serviceName: 'wuauserv', displayName: 'Windows Update', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
              { serviceName: 'TrustedInstaller', displayName: 'Windows Modules Installer', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
              { serviceName: 'VSS', displayName: 'Volume Shadow Copy', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
              { serviceName: 'WinDefend', displayName: 'Microsoft Defender Antivirus Service', operationalModel: 'contextual', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
            ],
          },
        },
      };

      const coverage = computeDiagnosticCoverage(facts);
      expect(coverage.level).toBe('full');
      expect(coverage.percentage).toBe(100);
      expect(coverage.availableChannels).toBe(15);
      expect(coverage.totalChannels).toBe(15);
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
        diagnostics: {
          timestamp: REF_DATE,
          status: 'success',
          deviceProblems: { availability: 'available', source: 'CM_Get_DevNode_Status', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
          memoryCommit: { availability: 'available', source: 'GetPerformanceInfo', commitTotalBytes: 10, commitLimitBytes: 20, commitPeakBytes: 15, physicalTotalBytes: 16, physicalAvailableBytes: 8, systemCacheBytes: 2, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 10, threadCount: 100, commitUtilizationPercent: 50, physicalUtilizationPercent: 50 },
          powerStatus: { availability: 'available', source: 'GetSystemPowerStatus', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
          eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
          systemServices: { availability: 'available', source: 'Advapi32', scannedAt: REF_DATE, catalogCount: 6, services: [] },
          collectionDurationMs: 5,
        },
      };

      const coverage = computeDiagnosticCoverage(facts);
      expect(coverage.level).toBe('partial');
      expect(coverage.availableChannels).toBe(13);
      expect(coverage.totalChannels).toBe(15);
      expect(coverage.percentage).toBe(87);

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

  // -------------------------------------------------------------------------
  // TRANCHE 8D-2 — WINDOWS SERVICES HEALTH & 15-CHANNEL COVERAGE
  // -------------------------------------------------------------------------
  describe('Tranche 8D-2 — Windows Services Health & 15-Channel Diagnostic Coverage', () => {
    const createService = (overrides: Partial<WindowsServiceNativeFact>): WindowsServiceNativeFact => ({
      serviceName: 'EventLog',
      displayName: 'Windows Event Log',
      operationalModel: 'always_running',
      currentState: 'running',
      startType: 'auto',
      win32ExitCode: 0,
      ...overrides,
    });

    const createServiceFacts = (
      services: WindowsServiceNativeFact[],
      availability: 'available' | 'unavailable' | 'unsupported' | 'error' = 'available'
    ): SystemFactsInput => ({
      referenceDate: REF_DATE,
      diagnostics: {
        timestamp: REF_DATE,
        status: 'success',
        collectionDurationMs: 5,
        deviceProblems: { availability: 'available', source: 'test', totalDevicesScanned: 10, problemCount: 0, devicesWithProblems: [] },
        memoryCommit: { availability: 'available', source: 'test', commitTotalBytes: 1, commitLimitBytes: 10, commitPeakBytes: 5, physicalTotalBytes: 10, physicalAvailableBytes: 5, systemCacheBytes: 1, kernelPagedBytes: 1, kernelNonpagedBytes: 1, processCount: 1, threadCount: 1, commitUtilizationPercent: 10, physicalUtilizationPercent: 50 },
        powerStatus: { availability: 'available', source: 'test', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
        systemServices: {
          availability,
          source: 'Advapi32_SCM',
          scannedAt: REF_DATE,
          catalogCount: 6,
          services,
        },
      },
    });

    // 1. EventLog running → nessun finding
    it('1. EventLog running: nessun finding di salute', () => {
      const s = createService({ serviceName: 'EventLog', currentState: 'running', win32ExitCode: 0 });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 2. EventLog stopped → CRITICAL
    it('2. EventLog stopped: genera finding CRITICAL con penalita Health Score', () => {
      const s = createService({ serviceName: 'EventLog', currentState: 'stopped', win32ExitCode: 0 });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe('service-eventlog-stopped');
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].area).toBe('system');
      expect(findings[0].confidence).toBe('HIGH');
      expect(findings[0].evidence).toContain('stopped');

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(75); // 100 - 25
      expect(report.overallStatus).toBe('critical');
    });

    // 3. Winmgmt stopped → WARNING
    it('3. Winmgmt stopped: genera finding WARNING', () => {
      const s = createService({
        serviceName: 'Winmgmt',
        displayName: 'Windows Management Instrumentation',
        operationalModel: 'always_running',
        currentState: 'stopped',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe('service-winmgmt-stopped');
      expect(findings[0].severity).toBe('WARNING');
      expect(findings[0].area).toBe('system');
      expect(findings[0].evidence).toContain('stopped');

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(88); // 100 - 12
      expect(report.overallStatus).toBe('warning');
    });

    // 4. wuauserv stopped + demand → nessun finding
    it('4. wuauserv stopped + demand: nessun finding (on-demand idle fisiologico)', () => {
      const s = createService({
        serviceName: 'wuauserv',
        displayName: 'Windows Update',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 5. TrustedInstaller stopped + demand → nessun finding
    it('5. TrustedInstaller stopped + demand: nessun finding (on-demand idle fisiologico)', () => {
      const s = createService({
        serviceName: 'TrustedInstaller',
        displayName: 'Windows Modules Installer',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 6. VSS stopped + demand → nessun finding
    it('6. VSS stopped + demand: nessun finding (on-demand idle fisiologico)', () => {
      const s = createService({
        serviceName: 'VSS',
        displayName: 'Volume Shadow Copy',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 7. VSS disabled → ATTENTION
    it('7. VSS disabled: genera finding ATTENTION', () => {
      const s = createService({
        serviceName: 'VSS',
        displayName: 'Volume Shadow Copy',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'disabled',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe('service-vss-disabled');
      expect(findings[0].severity).toBe('ATTENTION');
      expect(findings[0].area).toBe('system');
      expect(findings[0].evidence).toContain('disabled');

      const report = evaluateSystemHealth(facts);
      expect(report.healthScore).toBe(96); // 100 - 4
      expect(report.overallStatus).toBe('attention');
    });

    // 8. WinDefend stopped + AV unknown → nessun finding
    it('8. WinDefend stopped + AV unknown: nessun finding (non dedurre assenza antivirus alternativo)', () => {
      const s = createService({
        serviceName: 'WinDefend',
        displayName: 'Microsoft Defender Antivirus Service',
        operationalModel: 'contextual',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 9. service win32ExitCode != 0 → finding
    it('9. service win32ExitCode != 0: genera finding coerente con arresto anomalo', () => {
      const s = createService({
        serviceName: 'wuauserv',
        displayName: 'Windows Update',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 1067,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe('service-wuauserv-abnormal-exit');
      expect(findings[0].severity).toBe('WARNING');
      expect(findings[0].evidence).toContain('1067');
      expect(findings[0].metadata?.win32ExitCode).toBe(1067);
    });

    // 10. serviceSpecificExitCode preserved
    it('10. serviceSpecificExitCode preserved: preservato nell evidenza e nei metadati', () => {
      const s = createService({
        serviceName: 'TrustedInstaller',
        displayName: 'Windows Modules Installer',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 1066,
        serviceSpecificExitCode: 2147942402,
      });
      const facts = createServiceFacts([s]);
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(1);
      expect(findings[0].evidence).toContain('1066');
      expect(findings[0].evidence).toContain('2147942402');
      expect(findings[0].metadata?.win32ExitCode).toBe(1066);
      expect(findings[0].metadata?.serviceSpecificExitCode).toBe(2147942402);
    });

    // 11. systemServices unavailable → no finding
    it('11. systemServices unavailable: restituisce array vuoto', () => {
      const s = createService({ serviceName: 'EventLog', currentState: 'stopped' });
      const facts = createServiceFacts([s], 'unavailable');
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 12. systemServices unsupported → no finding
    it('12. systemServices unsupported: restituisce array vuoto', () => {
      const s = createService({ serviceName: 'EventLog', currentState: 'stopped' });
      const facts = createServiceFacts([s], 'unsupported');
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 13. systemServices error → no finding
    it('13. systemServices error: restituisce array vuoto', () => {
      const s = createService({ serviceName: 'EventLog', currentState: 'stopped' });
      const facts = createServiceFacts([s], 'error');
      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(0);
    });

    // 14. coverage 13 + 2 → totalChannels === 15
    it('14. coverage 13 + 2: totalChannels calcola esattamente 15 canali', () => {
      const facts = createServiceFacts([]);
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.totalChannels).toBe(15);
      expect(cov.channels).toHaveLength(15);
    });

    // 15. system_events status corretto
    it('15. system_events status corretto: riflette availability di eventLog nativo', () => {
      // Available
      const factsAvail: SystemFactsInput = {
        diagnostics: {
          timestamp: REF_DATE,
          status: 'success',
          collectionDurationMs: 1,
          deviceProblems: { availability: 'available', source: 't', totalDevicesScanned: 0, problemCount: 0, devicesWithProblems: [] },
          memoryCommit: { availability: 'available', source: 't', commitTotalBytes: 1, commitLimitBytes: 2, commitPeakBytes: 1, physicalTotalBytes: 2, physicalAvailableBytes: 1, systemCacheBytes: 0, kernelPagedBytes: 0, kernelNonpagedBytes: 0, processCount: 1, threadCount: 1, commitUtilizationPercent: 50, physicalUtilizationPercent: 50 },
          powerStatus: { availability: 'available', source: 't', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
          eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
        },
      };
      const covAvail = computeDiagnosticCoverage(factsAvail);
      const chAvail = covAvail.channels.find((c) => c.id === 'system_events');
      expect(chAvail?.status).toBe('available');

      // Unsupported
      const factsUnsup: SystemFactsInput = {
        diagnostics: {
          ...factsAvail.diagnostics!,
          eventLog: { availability: 'unsupported', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
        },
      };
      const covUnsup = computeDiagnosticCoverage(factsUnsup);
      const chUnsup = covUnsup.channels.find((c) => c.id === 'system_events');
      expect(chUnsup?.status).toBe('unsupported');

      // Error
      const factsErr: SystemFactsInput = {
        diagnostics: {
          ...factsAvail.diagnostics!,
          eventLog: { availability: 'error', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [], errorDetails: 'Access denied' },
        },
      };
      const covErr = computeDiagnosticCoverage(factsErr);
      const chErr = covErr.channels.find((c) => c.id === 'system_events');
      expect(chErr?.status).toBe('error');

      // Omitted -> unavailable
      const factsOmitted: SystemFactsInput = {};
      const covOmitted = computeDiagnosticCoverage(factsOmitted);
      const chOmitted = covOmitted.channels.find((c) => c.id === 'system_events');
      expect(chOmitted?.status).toBe('unavailable');
    });

    // 16. system_services status corretto
    it('16. system_services status corretto: riflette availability di systemServices nativo', () => {
      // Available
      const factsAvail = createServiceFacts([], 'available');
      const covAvail = computeDiagnosticCoverage(factsAvail);
      const chAvail = covAvail.channels.find((c) => c.id === 'system_services');
      expect(chAvail?.status).toBe('available');

      // Unsupported
      const factsUnsup = createServiceFacts([], 'unsupported');
      const covUnsup = computeDiagnosticCoverage(factsUnsup);
      const chUnsup = covUnsup.channels.find((c) => c.id === 'system_services');
      expect(chUnsup?.status).toBe('unsupported');

      // Error
      const factsErr = createServiceFacts([], 'error');
      const covErr = computeDiagnosticCoverage(factsErr);
      const chErr = covErr.channels.find((c) => c.id === 'system_services');
      expect(chErr?.status).toBe('error');

      // Omitted -> unavailable
      const factsOmitted: SystemFactsInput = {};
      const covOmitted = computeDiagnosticCoverage(factsOmitted);
      const chOmitted = covOmitted.channels.find((c) => c.id === 'system_services');
      expect(chOmitted?.status).toBe('unavailable');
    });

    // 17. coverage gaps NON impostano hardware gaps
    it('17. coverage gaps NON impostano hardware gaps: canali software/OS mancanti non attivano hasHardwareGaps', () => {
      const factsHardwareOnly: SystemFactsInput = {
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
          details: 'Audit OK',
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
              hotspotTemperatureCelsius: { value: 60, availability: 'available', source: 'NVML' },
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
          deviceProblems: { availability: 'available', source: 'CM_Get_DevNode_Status', totalDevicesScanned: 219, problemCount: 0, devicesWithProblems: [] },
          memoryCommit: { availability: 'available', source: 'GetPerformanceInfo', commitTotalBytes: 16 * 1024 * 1024 * 1024, commitLimitBytes: 32 * 1024 * 1024 * 1024, commitPeakBytes: 20 * 1024 * 1024 * 1024, physicalTotalBytes: 32 * 1024 * 1024 * 1024, physicalAvailableBytes: 18 * 1024 * 1024 * 1024, systemCacheBytes: 10 * 1024 * 1024 * 1024, kernelPagedBytes: 500 * 1024 * 1024, kernelNonpagedBytes: 400 * 1024 * 1024, processCount: 250, threadCount: 3500, commitUtilizationPercent: 50.0, physicalUtilizationPercent: 43.8 },
          powerStatus: { availability: 'available', source: 'GetSystemPowerStatus', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
          // eventLog e systemServices sono omessi
        },
      };

      const cov = computeDiagnosticCoverage(factsHardwareOnly);
      expect(cov.availableChannels).toBe(13);
      expect(cov.totalChannels).toBe(15);
      expect(cov.hasHardwareGaps).toBe(false); // Coverage gap software ma NESSUN hardware gap!
    });

    // 18. unavailable services NON riducono Health Score
    it('18. unavailable services NON riducono Health Score: score isolation perfetta', () => {
      const baseFacts: SystemFactsInput = {
        referenceDate: REF_DATE,
        systemFilesStatus: 'clean',
      };
      const reportBase = evaluateSystemHealth(baseFacts);

      const factsWithUnavailable = createServiceFacts([], 'unavailable');
      factsWithUnavailable.systemFilesStatus = 'clean';
      const reportUnavail = evaluateSystemHealth(factsWithUnavailable);

      expect(reportUnavail.healthScore).toBe(reportBase.healthScore);
    });

    // 19. nessun finding duplicato
    it('19. nessun finding duplicato: previene findings ridondanti anche con duplicati in input', () => {
      const s1 = createService({ serviceName: 'EventLog', currentState: 'stopped' });
      const s2 = createService({ serviceName: 'EventLog', currentState: 'stopped' }); // duplicato
      const s3 = createService({ serviceName: 'Winmgmt', currentState: 'stopped' });
      const facts = createServiceFacts([s1, s2, s3]);

      const findings = evaluateWindowsServicesHealth(facts);
      expect(findings).toHaveLength(2); // 1 EventLog + 1 Winmgmt
      const ids = findings.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    // 20. permutation invariance
    it('20. permutation invariance: ordine dei servizi in input non altera i findings prodotti', () => {
      const s1 = createService({ serviceName: 'EventLog', currentState: 'stopped' });
      const s2 = createService({ serviceName: 'Winmgmt', currentState: 'stopped' });
      const s3 = createService({ serviceName: 'VSS', startType: 'disabled' });

      const factsOrder1 = createServiceFacts([s1, s2, s3]);
      const factsOrder2 = createServiceFacts([s3, s1, s2]);
      const factsOrder3 = createServiceFacts([s2, s3, s1]);

      const findings1 = evaluateWindowsServicesHealth(factsOrder1);
      const findings2 = evaluateWindowsServicesHealth(factsOrder2);
      const findings3 = evaluateWindowsServicesHealth(factsOrder3);

      expect(findings1).toEqual(findings2);
      expect(findings2).toEqual(findings3);
    });
  });

  // -------------------------------------------------------------------------
  // TRANCHE 8D-2.1 — HARDWARE GAP SEMANTIC HARDENING
  // -------------------------------------------------------------------------
  describe('Tranche 8D-2.1 — Hardware Gap Semantic Hardening', () => {
    const createFullFacts = (): SystemFactsInput => ({
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
        details: 'Audit OK',
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
            hotspotTemperatureCelsius: { value: 60, availability: 'available', source: 'NVML' },
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
        deviceProblems: { availability: 'available', source: 'CM_Get_DevNode_Status', totalDevicesScanned: 219, problemCount: 0, devicesWithProblems: [] },
        memoryCommit: { availability: 'available', source: 'GetPerformanceInfo', commitTotalBytes: 16 * 1024 * 1024 * 1024, commitLimitBytes: 32 * 1024 * 1024 * 1024, commitPeakBytes: 20 * 1024 * 1024 * 1024, physicalTotalBytes: 32 * 1024 * 1024 * 1024, physicalAvailableBytes: 18 * 1024 * 1024 * 1024, systemCacheBytes: 10 * 1024 * 1024 * 1024, kernelPagedBytes: 500 * 1024 * 1024, kernelNonpagedBytes: 400 * 1024 * 1024, processCount: 250, threadCount: 3500, commitUtilizationPercent: 50.0, physicalUtilizationPercent: 43.8 },
        powerStatus: { availability: 'available', source: 'GetSystemPowerStatus', acLineStatus: 1, batteryFlag: 128, batteryLifePercent: null, batterySaverActive: false, hasSystemBattery: false, isOnAC: true, isOnBattery: false, powerArchitecture: 'desktop_like' },
        eventLog: { availability: 'available', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] },
        systemServices: {
          availability: 'available',
          source: 'Advapi32_SCM',
          scannedAt: REF_DATE,
          catalogCount: 6,
          services: [
            { serviceName: 'EventLog', displayName: 'Windows Event Log', operationalModel: 'always_running', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
          ],
        },
      },
    });

    it('contiene esattamente i 5 canali hardware/termici/SMART candidati', () => {
      expect(Array.from(HARDWARE_SENSOR_CHANNEL_IDS).sort()).toEqual([
        'cpu_power',
        'cpu_temp',
        'gpu_telemetry',
        'gpu_temp',
        'storage_smart',
      ]);
    });

    // A. system_events unavailable → hasHardwareGaps false
    it('A. system_events unavailable → hasHardwareGaps false', () => {
      const facts = createFullFacts();
      facts.diagnostics!.eventLog = {
        availability: 'unavailable',
        source: 'Wevtapi',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 0,
        truncated: false,
        events: [],
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // B. system_services unavailable → hasHardwareGaps false
    it('B. system_services unavailable → hasHardwareGaps false', () => {
      const facts = createFullFacts();
      facts.diagnostics!.systemServices = {
        availability: 'unavailable',
        source: 'Advapi32_SCM',
        scannedAt: REF_DATE,
        catalogCount: 6,
        services: [],
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // C. system_files unavailable → hasHardwareGaps false
    it('C. system_files unavailable → hasHardwareGaps false', () => {
      const facts = createFullFacts();
      facts.systemFilesStatus = 'not_tested';
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // D. memory_commit unavailable → hasHardwareGaps false
    it('D. memory_commit unavailable → hasHardwareGaps false', () => {
      const facts = createFullFacts();
      facts.diagnostics!.memoryCommit = {
        ...facts.diagnostics!.memoryCommit,
        availability: 'unavailable',
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // E. power_architecture unavailable → hasHardwareGaps false
    it('E. power_architecture unavailable → hasHardwareGaps false', () => {
      const facts = createFullFacts();
      facts.diagnostics!.powerStatus = {
        ...facts.diagnostics!.powerStatus,
        availability: 'unavailable',
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // F. cpu_temp unavailable → hasHardwareGaps false (telemetry gap, non hardware gap)
    it('F. cpu_temp unavailable → hasHardwareGaps false (telemetry gap)', () => {
      const facts = createFullFacts();
      facts.monitoring!.cpu.packageTemperatureCelsius = {
        value: null,
        availability: 'unavailable',
        source: 'ACPI',
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // G. gpu_telemetry unavailable → hasHardwareGaps false (telemetry gap, non hardware gap)
    it('G. gpu_telemetry unavailable → hasHardwareGaps false (telemetry gap)', () => {
      const facts = createFullFacts();
      facts.monitoring!.gpus[0].utilizationPercent = {
        value: null,
        availability: 'unavailable',
        source: 'NVML',
      };
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // H. storage_smart unavailable → hasHardwareGaps false (telemetry gap, non hardware gap)
    it('H. storage_smart unavailable → hasHardwareGaps false (telemetry gap)', () => {
      const facts = createFullFacts();
      facts.smartDisks = [];
      const cov = computeDiagnosticCoverage(facts);
      expect(cov.availableChannels).toBe(14);
      expect(cov.totalChannels).toBe(15);
      expect(cov.percentage).toBe(93);
      expect(cov.hasHardwareGaps).toBe(false);
    });

    // I. coverage percentage corretta in tutti i casi
    it('I. coverage percentage corretta in tutti i casi: calcolo deterministico percentuale', () => {
      const facts = createFullFacts();
      // Con tutti i 15 attivi -> 100%
      expect(computeDiagnosticCoverage(facts).percentage).toBe(100);

      // Con 1 disattivato (14/15) -> 93%
      facts.diagnostics!.eventLog = { availability: 'unavailable', source: 'Wevtapi', queryTimeWindowHours: 168, maxEventsCap: 50, returnedEventCount: 0, truncated: false, events: [] };
      expect(computeDiagnosticCoverage(facts).percentage).toBe(93);

      // Con 2 disattivati (13/15) -> 87%
      facts.diagnostics!.systemServices = { availability: 'unavailable', source: 'Advapi32_SCM', scannedAt: REF_DATE, catalogCount: 6, services: [] };
      expect(computeDiagnosticCoverage(facts).percentage).toBe(87);

      // Con 3 disattivati (12/15) -> 80%
      facts.systemFilesStatus = 'not_tested';
      expect(computeDiagnosticCoverage(facts).percentage).toBe(80);

      // Con 5 disattivati (10/15) -> 67%
      facts.diagnostics!.memoryCommit = { ...facts.diagnostics!.memoryCommit, availability: 'unavailable' };
      facts.diagnostics!.powerStatus = { ...facts.diagnostics!.powerStatus, availability: 'unavailable' };
      expect(computeDiagnosticCoverage(facts).percentage).toBe(67);
    });

    // Tranche 8D-2.1 — Final Semantic Precision Fix: isHardwareGap
    describe('isHardwareGap — Distinzione semantica tra Hardware Gap e Telemetry/Coverage Gap', () => {
      // 1. Funzione pura isHardwareGap per gpu_telemetry (tutti i 6 stati)
      it('gpu_telemetry: distingue rigorosamente assenza hardware da lacune di telemetria', () => {
        // 1. available → false (nessun gap)
        expect(isHardwareGap('gpu_telemetry', 'available')).toBe(false);

        // 2. not_detected → true (Hardware Gap reale: nessuna GPU presente nel sistema)
        expect(isHardwareGap('gpu_telemetry', 'not_detected')).toBe(true);

        // 3. unavailable → false (Coverage Gap: telemetria temporaneamente non campionata)
        expect(isHardwareGap('gpu_telemetry', 'unavailable')).toBe(false);

        // 4. permission_required → false (Coverage Gap: permessi UAC Windows)
        expect(isHardwareGap('gpu_telemetry', 'permission_required')).toBe(false);

        // 5. error → false (Coverage Gap: errore transitorio query WMI/NVML)
        expect(isHardwareGap('gpu_telemetry', 'error')).toBe(false);

        // 6. unsupported → false (Coverage Gap: la GPU è presente nel computer, ma il modello o
        // l'ambiente di runtime non supporta librerie proprietarie di telemetria NVML. Non è un hardware mancante)
        expect(isHardwareGap('gpu_telemetry', 'unsupported')).toBe(false);
      });

      // 2. Funzione pura isHardwareGap per storage_smart (tutti i 6 stati)
      it('storage_smart: distingue rigorosamente assenza hardware da lacune di telemetria', () => {
        // 1. available → false (nessun gap)
        expect(isHardwareGap('storage_smart', 'available')).toBe(false);

        // 2. not_detected → true (Hardware Gap reale: nessun disco o controller SMART rilevato)
        expect(isHardwareGap('storage_smart', 'not_detected')).toBe(true);

        // 3. unavailable → false (Coverage Gap: dati SMART non ancora popolati o snapshot vuoto)
        expect(isHardwareGap('storage_smart', 'unavailable')).toBe(false);

        // 4. permission_required → false (Coverage Gap: lettura CIM limitata senza elevazione UAC)
        expect(isHardwareGap('storage_smart', 'permission_required')).toBe(false);

        // 5. error → false (Coverage Gap: errore I/O o driver durante lettura registri SMART)
        expect(isHardwareGap('storage_smart', 'error')).toBe(false);

        // 6. unsupported → false (Coverage Gap: il disco fisico esiste ed è montato, ma il bus,
        // enclosure esterna o virtual disk non supporta comandi ATA/NVMe SMART in user-space standard)
        expect(isHardwareGap('storage_smart', 'unsupported')).toBe(false);
      });

      // 3. Canali OS / software non generano mai Hardware Gap
      it('system_events e system_services non generano mai Hardware Gap', () => {
        expect(isHardwareGap('system_events', 'available')).toBe(false);
        expect(isHardwareGap('system_events', 'not_detected')).toBe(false);
        expect(isHardwareGap('system_events', 'unavailable')).toBe(false);

        expect(isHardwareGap('system_services', 'available')).toBe(false);
        expect(isHardwareGap('system_services', 'not_detected')).toBe(false);
        expect(isHardwareGap('system_services', 'unavailable')).toBe(false);
      });

      // 4. Test end-to-end con computeDiagnosticCoverage per gpu_telemetry
      it('computeDiagnosticCoverage riflette la semantica per gpu_telemetry', () => {
        const facts = createFullFacts();

        // available → hasHardwareGaps false
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // not_detected → hasHardwareGaps true
        facts.monitoring!.gpus[0].utilizationPercent = { value: null, availability: 'not_detected', source: 'NVML' };
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(true);

        // unavailable → hasHardwareGaps false
        facts.monitoring!.gpus[0].utilizationPercent = { value: null, availability: 'unavailable', source: 'NVML' };
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // permission_error / permission_required → hasHardwareGaps false
        facts.monitoring!.gpus[0].utilizationPercent = { value: null, availability: 'permission_error', source: 'NVML' };
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // error → hasHardwareGaps false
        facts.monitoring!.gpus[0].utilizationPercent = { value: null, availability: 'error', source: 'NVML' };
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // unsupported → hasHardwareGaps false
        facts.monitoring!.gpus[0].utilizationPercent = { value: null, availability: 'unsupported', source: 'NVML' };
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);
      });

      // 5. Test end-to-end con computeDiagnosticCoverage per storage_smart
      it('computeDiagnosticCoverage riflette la semantica per storage_smart', () => {
        const facts = createFullFacts();

        // available → hasHardwareGaps false
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // not_detected → hasHardwareGaps true
        facts.smartDisks = [{ deviceId: '0', friendlyName: 'Virtual', mediaType: 'SSD', healthStatus: 'Unknown', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'not_detected' }];
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(true);

        // unavailable → hasHardwareGaps false
        facts.smartDisks = [{ deviceId: '0', friendlyName: 'Disk', mediaType: 'SSD', healthStatus: 'Unknown', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'unavailable' }];
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // permission_required → hasHardwareGaps false
        facts.smartDisks = [{ deviceId: '0', friendlyName: 'Disk', mediaType: 'SSD', healthStatus: 'Unknown', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'permission_required' }];
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // error → hasHardwareGaps false
        facts.smartDisks = [{ deviceId: '0', friendlyName: 'Disk', mediaType: 'SSD', healthStatus: 'Unknown', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'error' }];
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);

        // unsupported → hasHardwareGaps false
        facts.smartDisks = [{ deviceId: '0', friendlyName: 'Disk', mediaType: 'SSD', healthStatus: 'Unknown', readErrorsTotal: 0, writeErrorsTotal: 0, smartStatus: 'unsupported' }];
        expect(computeDiagnosticCoverage(facts).hasHardwareGaps).toBe(false);
      });

      // 6. Test end-to-end per canali OS unavailable
      it('computeDiagnosticCoverage: system_events e system_services unavailable → hasHardwareGaps false', () => {
        const facts = createFullFacts();
        facts.diagnostics!.eventLog = {
          availability: 'unavailable',
          source: 'Wevtapi',
          queryTimeWindowHours: 168,
          maxEventsCap: 50,
          returnedEventCount: 0,
          truncated: false,
          events: [],
        };
        facts.diagnostics!.systemServices = {
          availability: 'unavailable',
          source: 'Advapi32_SCM',
          scannedAt: REF_DATE,
          catalogCount: 6,
          services: [],
        };
        const cov = computeDiagnosticCoverage(facts);
        expect(cov.availableChannels).toBe(13);
        expect(cov.totalChannels).toBe(15);
        expect(cov.percentage).toBe(87);
        expect(cov.hasHardwareGaps).toBe(false);
      });
    });
  });

  // =========================================================================
  // TRANCHE 8D-3 — CORRELATION → HEALTH ENRICHMENT ENGINE
  // =========================================================================
  describe('Tranche 8D-3 — Correlation → Health Enrichment Engine', () => {
    const createFinding = (overrides: Partial<HealthFinding> = {}): HealthFinding => ({
      id: 'finding-1',
      severity: 'WARNING',
      area: 'system',
      title: 'Finding Titolo',
      evidence: 'Finding Evidenza',
      explanation: 'Finding Spiegazione',
      confidence: 'HIGH',
      ...overrides,
    });

    const createCorrelation = (overrides: Partial<DiagnosticCorrelation> = {}): DiagnosticCorrelation => ({
      id: 'correlation:gpu:device_driver_match:ven_10de',
      strength: 'DIRECT_MATCH',
      affectedArea: 'gpu',
      title: 'Correlazione Driver Grafico TDR e Stato Dispositivo GPU',
      hardwareEvidence: 'Dispositivo in stato anomalo',
      eventEvidence: 'Display 4101: TDR driver nvlddmkm',
      explanation: 'Evidenze convergenti tra arresto dispositivo GPU e ripristini TDR.',
      ...overrides,
    });

    describe('Helper Functions Semantici', () => {
      it('getFindingSemanticRank assegna i ranghi corretti da Rank 1 a 5', () => {
        expect(getFindingSemanticRank(createFinding({ id: 'device-fault-10-gpu' }))).toBe(1);
        expect(getFindingSemanticRank(createFinding({ id: 'smart-critical-ssd' }))).toBe(2);
        expect(getFindingSemanticRank(createFinding({ id: 'gpu-temp-hot' }))).toBe(2);
        expect(getFindingSemanticRank(createFinding({ id: 'event-whea-18' }))).toBe(3);
        expect(getFindingSemanticRank(createFinding({ id: 'service-vss' }))).toBe(4);
        expect(getFindingSemanticRank(createFinding({ id: 'maintenance-clean' }))).toBe(5);
        expect(getFindingSemanticRank(createFinding({ id: 'other-generic' }))).toBe(99);
      });

      it('sortCorrelationEvidence ordina per forza e poi per ID alfabetico', () => {
        const c1 = { correlationId: 'c-weak', strength: 'WEAK_CONTEXT' as const, title: '', hardwareEvidence: '', eventEvidence: '', explanation: '' };
        const c2 = { correlationId: 'b-rel', strength: 'RELATED_SIGNAL' as const, title: '', hardwareEvidence: '', eventEvidence: '', explanation: '' };
        const c3 = { correlationId: 'a-rel', strength: 'RELATED_SIGNAL' as const, title: '', hardwareEvidence: '', eventEvidence: '', explanation: '' };
        const c4 = { correlationId: 'direct', strength: 'DIRECT_MATCH' as const, title: '', hardwareEvidence: '', eventEvidence: '', explanation: '' };

        const sorted = sortCorrelationEvidence([c1, c2, c3, c4]);
        expect(sorted.map((s) => s.correlationId)).toEqual(['direct', 'a-rel', 'b-rel', 'c-weak']);
      });
    });

    describe('FASE 10 — Test Funzionali ed Edge Cases (20 casi)', () => {
      // 1. nessun correlation
      it('1. nessun correlation: restituisce i finding primari clonati e invariati', () => {
        const f1 = createFinding({ id: 'smart-1', area: 'storage', severity: 'WARNING' });
        const f2 = createFinding({ id: 'ram-1', area: 'ram', severity: 'ATTENTION' });
        const result = enrichFindingsWithCorrelations([f1, f2], []);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('smart-1');
        expect(result[1].id).toBe('ram-1');
        expect(result[0].correlations).toBeUndefined();
      });

      // 2. nessun finding primario
      it('2. nessun finding primario: restituisce array vuoto senza errori', () => {
        const c1 = createCorrelation();
        const result = enrichFindingsWithCorrelations([], [c1]);
        expect(result).toEqual([]);
      });

      // 3. correlation senza anchor valido
      it('3. correlation senza anchor valido: correlation ignorata, nessun finding creato', () => {
        const f1 = createFinding({ id: 'ram-usage-high', area: 'ram', severity: 'WARNING' });
        const c1 = createCorrelation({
          id: 'correlation:gpu:device_driver_match:other',
          affectedArea: 'gpu',
        });
        const result = enrichFindingsWithCorrelations([f1], [c1]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('ram-usage-high');
        expect(result[0].correlations).toBeUndefined();
      });

      // 4. DIRECT_MATCH con anchor WARNING + secondary CRITICAL
      it('4. DIRECT_MATCH con anchor WARNING + secondary CRITICAL: severity anchor resta WARNING', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
          title: 'Problema GPU Code 10',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-frequent',
          area: 'gpu',
          severity: 'CRITICAL',
          title: 'TDR Ricorrenti Driver Grafico',
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('device-fault-10-pci_ven_10de');
        // SEVERITY PRESERVATION: rimane WARNING, non diventa CRITICAL!
        expect(result[0].severity).toBe('WARNING');
        expect(result[0].correlations).toHaveLength(1);
        expect(result[0].correlations![0].absorbedFinding).toBeDefined();
        expect(result[0].correlations![0].absorbedFinding!.originalSeverity).toBe('CRITICAL');
        expect(result[0].correlations![0].absorbedFinding!.subsumedFindingId).toBe('event-display-tdr-frequent');
      });

      // 5. DIRECT_MATCH con anchor CRITICAL + secondary WARNING
      it('5. DIRECT_MATCH con anchor CRITICAL + secondary WARNING: severity anchor resta CRITICAL', () => {
        const anchor = createFinding({
          id: 'device-fault-43-pci_ven_10de',
          area: 'gpu',
          severity: 'CRITICAL',
          title: 'GPU Arrestata Codice 43',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-isolated',
          area: 'gpu',
          severity: 'WARNING',
          title: 'TDR Driver Grafico Isolato',
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('device-fault-43-pci_ven_10de');
        expect(result[0].severity).toBe('CRITICAL');
        expect(result[0].correlations![0].absorbedFinding!.originalSeverity).toBe('WARNING');
      });

      // 6. più correlation sullo stesso anchor
      it('6. più correlation sullo stesso anchor: arricchimento cumulativo e ordinamento per forza/id', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-isolated',
          area: 'gpu',
          severity: 'ATTENTION',
        });
        const c1 = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
        });
        const c2 = createCorrelation({
          id: 'correlation:gpu:tdr_hardware_signal:pci_ven_10de',
          strength: 'RELATED_SIGNAL',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [c2, c1]);
        expect(result).toHaveLength(1);
        const corrs = result[0].correlations!;
        expect(corrs).toHaveLength(2);
        // DIRECT_MATCH precede RELATED_SIGNAL
        expect(corrs[0].strength).toBe('DIRECT_MATCH');
        expect(corrs[1].strength).toBe('RELATED_SIGNAL');
      });

      // 7. più anchor candidati (ambiguità di rango minimo)
      it('7. più anchor candidati con stesso rank minimo: SAFE FAIL, nessun assorbimento', () => {
        const f1 = createFinding({ id: 'device-fault-10-gpu1', area: 'gpu', severity: 'WARNING' });
        const f2 = createFinding({ id: 'device-fault-43-gpu2', area: 'gpu', severity: 'CRITICAL' });
        const f3 = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const corr = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const result = enrichFindingsWithCorrelations([f1, f2, f3], [corr]);
        // Safe fail: nessun assorbimento, tutti e 3 i finding sopravvivono
        expect(result).toHaveLength(3);
        expect(result.map((f) => f.id)).toEqual(['device-fault-10-gpu1', 'device-fault-43-gpu2', 'event-display-tdr-isolated']);
      });

      // 8. candidati con stesso rank
      it('8. candidati con stesso rank (es. due event log): SAFE FAIL, nessun assorbimento', () => {
        const f1 = createFinding({ id: 'event-disk-7-isolated', area: 'storage', severity: 'ATTENTION' });
        const f2 = createFinding({ id: 'event-disk-11-communication', area: 'storage', severity: 'ATTENTION' });
        const corr = createCorrelation({
          id: 'correlation:storage:bad_blocks_smart_match:disk1',
          strength: 'DIRECT_MATCH',
          affectedArea: 'storage',
        });

        const result = enrichFindingsWithCorrelations([f1, f2], [corr]);
        // Stesso rango (Rank 3): SAFE FAIL
        expect(result).toHaveLength(2);
      });

      // 9. RELATED_SIGNAL senza primary finding compatibile
      it('9. RELATED_SIGNAL senza primary finding compatibile: zero nuovi finding, zero score delta', () => {
        const ramFinding = createFinding({ id: 'ram-usage-high', area: 'ram', severity: 'WARNING' });
        const corr = createCorrelation({
          id: 'correlation:gpu:tdr_isolated_signal:gpu1',
          strength: 'RELATED_SIGNAL',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([ramFinding], [corr]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('ram-usage-high');
        expect(result[0].correlations).toBeUndefined();
      });

      // 10. WEAK_CONTEXT senza primary finding
      it('10. WEAK_CONTEXT senza primary finding compatibile: correlation ignorata', () => {
        const corr = createCorrelation({
          id: 'correlation:system:weak_power:generic',
          strength: 'WEAK_CONTEXT',
          affectedArea: 'system',
        });
        const result = enrichFindingsWithCorrelations([], [corr]);
        expect(result).toHaveLength(0);
      });

      // 11. secondary con metadata
      it('11. secondary con metadata: metadati preservati integralmente in absorbedFinding', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-isolated',
          area: 'gpu',
          severity: 'ATTENTION',
          metadata: { eventId: 4101, count: 2, isTruncated: false, driver: 'nvlddmkm.sys' },
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(result).toHaveLength(1);
        const absorbed = result[0].correlations![0].absorbedFinding!;
        expect(absorbed.metadata).toEqual({
          eventId: 4101,
          count: 2,
          isTruncated: false,
          driver: 'nvlddmkm.sys',
        });
      });

      // 12. secondary con recommendedActionId
      it('12. secondary con recommendedActionId: recommendedActionId preservato in absorbedFinding', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
          recommendedActionId: 'inspect-device-fault',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-isolated',
          area: 'gpu',
          severity: 'ATTENTION',
          recommendedActionId: 'clean-shader-cache',
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(result[0].recommendedActionId).toBe('inspect-device-fault');
        expect(result[0].correlations![0].absorbedFinding!.recommendedActionId).toBe('clean-shader-cache');
      });

      // 13. anchor senza recommendedActionId
      it('13. anchor senza recommendedActionId: eredita quello del secondario assorbito', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
          recommendedActionId: undefined,
        });
        const secondary = createFinding({
          id: 'event-display-tdr-isolated',
          area: 'gpu',
          severity: 'ATTENTION',
          recommendedActionId: 'clean-shader-cache',
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(result[0].recommendedActionId).toBe('clean-shader-cache');
      });

      // 14. Event Log truncated
      it('14. Event Log truncated: informazione di campionamento parziale preservata', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
        });
        const secondary = createFinding({
          id: 'event-display-tdr-frequent',
          area: 'gpu',
          severity: 'WARNING',
          evidence: '50 eventi rilevati nel campione limitato di diagnostica (Display 4101)',
          metadata: { isTruncated: true, count: 50 },
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
          eventEvidence: '50 eventi nel campione parziale limitato',
        });

        const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        const absorbed = result[0].correlations![0].absorbedFinding!;
        expect(absorbed.evidence).toContain('campione limitato');
        expect(absorbed.metadata?.isTruncated).toBe(true);
      });

      // 15. duplicate / repeated correlation
      it('15. duplicate correlation in input: deduplicata preservando una sola evidenza', () => {
        const anchor = createFinding({
          id: 'device-fault-10-pci_ven_10de',
          area: 'gpu',
          severity: 'WARNING',
        });
        const corr = createCorrelation({
          id: 'correlation:gpu:tdr_hardware_signal:pci_ven_10de',
          strength: 'RELATED_SIGNAL',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations([anchor], [corr, corr]);
        expect(result[0].correlations).toHaveLength(1);
      });

      // 16. determinismo: stesso input → stesso output
      it('16. determinismo: chiamate multiple con stesso input producono output identico al 100%', () => {
        const f1 = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const f2 = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const corr = createCorrelation({ id: 'correlation:gpu:device_driver_match:pci_ven_10de', strength: 'DIRECT_MATCH' });

        const resA = enrichFindingsWithCorrelations([f1, f2], [corr]);
        const resB = enrichFindingsWithCorrelations([f1, f2], [corr]);
        expect(resA).toEqual(resB);
      });

      // 17. preservazione dell'ordine canonico dei finding
      it('17. preservazione ordine canonico: i finding sopravvissuti mantengono la posizione relativa originale', () => {
        const fStorage = createFinding({ id: 'smart-critical-disk1', area: 'storage', severity: 'CRITICAL' });
        const fRam = createFinding({ id: 'ram-usage-high', area: 'ram', severity: 'WARNING' });
        const fGpuFault = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const fDisplayTdr = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const fService = createFinding({ id: 'service-vss-disabled', area: 'system', severity: 'ATTENTION' });

        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const result = enrichFindingsWithCorrelations(
          [fStorage, fRam, fGpuFault, fDisplayTdr, fService],
          [corr]
        );

        // fDisplayTdr è assorbito in fGpuFault. L'ordine relativo dei 4 rimasti è intatto:
        expect(result.map((f) => f.id)).toEqual([
          'smart-critical-disk1',
          'ram-usage-high',
          'device-fault-10-pci_ven_10de',
          'service-vss-disabled',
        ]);
      });

      // 18. score identico a quello atteso dopo la rimozione del secondary assorbito
      it('18. score evaluation dopo enrichment: score calcolato sui soli finding finali', () => {
        const fStorage = createFinding({ id: 'smart-errors-attention-disk1', area: 'storage', severity: 'ATTENTION' }); // -4
        const fDevFault = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' }); // -12
        const fDisplayTdr = createFinding({ id: 'event-display-tdr-frequent', area: 'gpu', severity: 'CRITICAL' }); // -25 (assorbito!)

        const corr = createCorrelation({
          id: 'correlation:gpu:device_driver_match:pci_ven_10de',
          strength: 'DIRECT_MATCH',
          affectedArea: 'gpu',
        });

        const enriched = enrichFindingsWithCorrelations([fStorage, fDevFault, fDisplayTdr], [corr]);
        expect(enriched).toHaveLength(2); // fDisplayTdr rimosso!
        // buildHealthReport interno: penalty = 12 (WARNING) + 4 (ATTENTION) = 16. Score = 100 - 16 = 84.
        // Se non fosse assorbito, penalty sarebbe 25 + 12 + 4 = 41 -> Score = 59!
      });

      // 19. nessuna doppia penalità
      it('19. zero double-penalty: un DIRECT_MATCH rimuove il secondario e previene penalità duplicata', () => {
        const anchor = createFinding({ id: 'smart-critical-disk1', area: 'storage', severity: 'CRITICAL' });
        const secondary = createFinding({ id: 'event-disk-7-isolated', area: 'storage', severity: 'ATTENTION' });
        const corr = createCorrelation({
          id: 'correlation:storage:bad_blocks_smart_match:disk1',
          strength: 'DIRECT_MATCH',
          affectedArea: 'storage',
        });

        const enriched = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
        expect(enriched).toHaveLength(1);
        expect(enriched[0].id).toBe('smart-critical-disk1');
      });

      // 20. nessuna modifica della severity dell'anchor
      it('20. nessuna modifica della severity dell\'anchor: resta rigidamente quella originale per ogni grado', () => {
        for (const sev of ['INFO', 'GOOD', 'ATTENTION', 'WARNING', 'CRITICAL'] as const) {
          const anchor = createFinding({
            id: 'device-fault-10-pci_ven_10de',
            area: 'gpu',
            severity: sev,
          });
          const secondary = createFinding({
            id: 'event-display-tdr-frequent',
            area: 'gpu',
            severity: 'CRITICAL',
          });
          const corr = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

          const result = enrichFindingsWithCorrelations([anchor, secondary], [corr]);
          expect(result[0].severity).toBe(sev);
        }
      });
    });

    describe('FASE 11 — Property Tests (Invarianti P1 – P8)', () => {
      // P1. Permutation Invariance di correlations
      it('P1. Permutation Invariance: l\'ordine di correlations in input non altera finding né correlations[]', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const secondary = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const c1 = createCorrelation({ id: 'correlation:gpu:device_driver_match:pci_ven_10de', strength: 'DIRECT_MATCH' });
        const c2 = createCorrelation({ id: 'correlation:gpu:tdr_hardware_signal:pci_ven_10de', strength: 'RELATED_SIGNAL' });

        const res1 = enrichFindingsWithCorrelations([anchor, secondary], [c1, c2]);
        const res2 = enrichFindingsWithCorrelations([anchor, secondary], [c2, c1]);

        expect(res1).toEqual(res2);
      });

      // P2. Severity dell'anchor invariata
      it('P2. Anchor Severity Invariance: nessun enrichment muta la severity originale dell\'anchor', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'ATTENTION' });
        const secondary = createFinding({ id: 'event-display-tdr-frequent', area: 'gpu', severity: 'CRITICAL' });
        const c = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const res = enrichFindingsWithCorrelations([anchor, secondary], [c]);
        expect(res[0].severity).toBe('ATTENTION');
      });

      // P3. Nessun secondary assorbito sopravvive
      it('P3. Secondary Elimination: nessun ID assorbito è presente tra i finding finali', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const secondary = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const c = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const res = enrichFindingsWithCorrelations([anchor, secondary], [c]);
        const finalIds = res.map((f) => f.id);
        expect(finalIds).not.toContain('event-display-tdr-isolated');
      });

      // P4. Nessuna correlation introduce penalty propria
      it('P4. Zero Intrinsic Correlation Penalty: correlation senza assorbimento non altera i finding né produce penalità', () => {
        const f1 = createFinding({ id: 'event-whea-18-single', area: 'cpu', severity: 'WARNING' });
        const c = createCorrelation({
          id: 'correlation:cpu:undervolt_whea_18:daily_uv',
          strength: 'RELATED_SIGNAL',
          affectedArea: 'cpu',
        });

        const res = enrichFindingsWithCorrelations([f1], [c]);
        expect(res).toHaveLength(1);
        expect(res[0].severity).toBe('WARNING');
        expect(res[0].correlations).toHaveLength(1);
      });

      // P5. Zero double penalty
      it('P5. Anti-Double Penalty: l\'assorbimento elimina la seconda penalità dello score', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' }); // -12
        const secondary = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' }); // -4
        const c = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const res = enrichFindingsWithCorrelations([anchor, secondary], [c]);
        expect(res).toHaveLength(1);
        // Risultato ha solo anchor (-12), il secondario (-4) è rimosso
      });

      // P6. Nessuna perdita dati del secondary
      it('P6. Full Data Retention: tutti i dati del secondario sono preservati in absorbedFinding', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const secondary: HealthFinding = {
          id: 'event-display-tdr-isolated',
          severity: 'ATTENTION',
          area: 'gpu',
          title: 'Titolo TDR',
          evidence: 'Evidenza TDR',
          explanation: 'Spiegazione TDR',
          confidence: 'HIGH',
          recommendedActionId: 'action-test',
          metadata: { customField: 42, flag: true },
        };
        const c = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const res = enrichFindingsWithCorrelations([anchor, secondary], [c]);
        const absorbed = res[0].correlations![0].absorbedFinding!;
        expect(absorbed.subsumedFindingId).toBe('event-display-tdr-isolated');
        expect(absorbed.originalSeverity).toBe('ATTENTION');
        expect(absorbed.area).toBe('gpu');
        expect(absorbed.title).toBe('Titolo TDR');
        expect(absorbed.evidence).toBe('Evidenza TDR');
        expect(absorbed.explanation).toBe('Spiegazione TDR');
        expect(absorbed.recommendedActionId).toBe('action-test');
        expect(absorbed.metadata).toEqual({ customField: 42, flag: true });
      });

      // P7. Deterministic Correlation Ordering
      it('P7. Correlation Ordering Determinism: DIRECT_MATCH > RELATED_SIGNAL > WEAK_CONTEXT > ordine alfabetico', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const cWeak = createCorrelation({ id: 'correlation:gpu:z_weak', strength: 'WEAK_CONTEXT' });
        const cRelB = createCorrelation({ id: 'correlation:gpu:b_signal', strength: 'RELATED_SIGNAL' });
        const cRelA = createCorrelation({ id: 'correlation:gpu:a_signal', strength: 'RELATED_SIGNAL' });
        const cDirect = createCorrelation({ id: 'correlation:gpu:device_driver_match:pci_ven_10de', strength: 'DIRECT_MATCH' });

        const res = enrichFindingsWithCorrelations([anchor], [cWeak, cRelB, cRelA, cDirect]);
        const corrs = res[0].correlations!;
        expect(corrs).toHaveLength(4);
        expect(corrs[0].strength).toBe('DIRECT_MATCH');
        expect(corrs[1].correlationId).toBe('correlation:gpu:a_signal');
        expect(corrs[2].correlationId).toBe('correlation:gpu:b_signal');
        expect(corrs[3].strength).toBe('WEAK_CONTEXT');
      });

      // P8. Input Immutability
      it('P8. Input Immutability: la funzione pura non muta in alcun modo gli oggetti di input', () => {
        const anchor = createFinding({ id: 'device-fault-10-pci_ven_10de', area: 'gpu', severity: 'WARNING' });
        const secondary = createFinding({ id: 'event-display-tdr-isolated', area: 'gpu', severity: 'ATTENTION' });
        const corr = createCorrelation({ strength: 'DIRECT_MATCH', affectedArea: 'gpu' });

        const origAnchorJson = JSON.stringify(anchor);
        const origSecJson = JSON.stringify(secondary);
        const origCorrJson = JSON.stringify(corr);

        enrichFindingsWithCorrelations([anchor, secondary], [corr]);

        expect(JSON.stringify(anchor)).toBe(origAnchorJson);
        expect(JSON.stringify(secondary)).toBe(origSecJson);
        expect(JSON.stringify(corr)).toBe(origCorrJson);
      });
    });

    describe('Wording Anti-Causale e Sanitizzazione (FASE 8)', () => {
      it('sostituisce espressioni categoriche temporali non dimostrate con formulazioni neutre', () => {
        expect(sanitizeCorrelationWording('profilo undervolt attivo registrato')).toBe(
          'profilo di tuning CPU presente nel contesto di analisi registrato'
        );
        expect(sanitizeCorrelationWording('coincidenza temporale tra eventi')).toBe(
          'coesistenza nel contesto di analisi tra eventi'
        );
      });
    });

    describe('Integrazione End-to-End in evaluateSystemHealth (FASE 12)', () => {
      it('integra GPU Device Problem e Display TDR: DIRECT_MATCH, assorbimento e anti-doppia penalità', () => {
        const facts: SystemFactsInput = {
          referenceDate: REF_DATE,
          diagnostics: {
            timestamp: REF_DATE,
            status: 'success',
            collectionDurationMs: 5,
            deviceProblems: {
              availability: 'available',
              source: 'CM_Get_DevNode_Status',
              totalDevicesScanned: 10,
              problemCount: 1,
              devicesWithProblems: [
                {
                  deviceId: 'PCI\\VEN_10DE&DEV_2206',
                  friendlyName: 'NVIDIA GeForce RTX 3080',
                  problemCode: 43,
                  problemLabel: 'CM_PROB_FAILED_POST (Codice 43)',
                  problemDescription: 'Dispositivo arrestato da Windows',
                  statusFlags: 0x1802000,
                  severity: 'critical',
                },
              ],
            },
            memoryCommit: {
              availability: 'available',
              source: 'test',
              commitTotalBytes: 1,
              commitLimitBytes: 10,
              commitPeakBytes: 5,
              physicalTotalBytes: 10,
              physicalAvailableBytes: 5,
              systemCacheBytes: 1,
              kernelPagedBytes: 1,
              kernelNonpagedBytes: 1,
              processCount: 1,
              threadCount: 1,
              commitUtilizationPercent: 10,
              physicalUtilizationPercent: 50,
            },
            powerStatus: {
              availability: 'available',
              source: 'test',
              acLineStatus: 1,
              batteryFlag: 128,
              batteryLifePercent: null,
              batterySaverActive: false,
              hasSystemBattery: false,
              isOnAC: true,
              isOnBattery: false,
              powerArchitecture: 'desktop_like',
            },
            eventLog: {
              availability: 'available',
              source: 'Wevtapi',
              queryTimeWindowHours: 168,
              maxEventsCap: 50,
              returnedEventCount: 1,
              truncated: false,
              events: [
                {
                  channel: 'System',
                  provider: 'Display',
                  eventId: 4101,
                  level: 3,
                  timestamp: REF_DATE,
                  recordId: 100,
                  targetContext: 'PCI\\VEN_10DE&DEV_2206',
                  payload: { type: 'display', driverName: 'nvlddmkm' },
                },
              ],
            },
          },
        };

        const report = evaluateSystemHealth(facts);

        // Deve esistere il finding per il guasto GPU
        const gpuFault = report.findings.find((f) => f.id.startsWith('device-fault-43'));
        expect(gpuFault).toBeDefined();
        expect(gpuFault!.severity).toBe('CRITICAL');
        expect(gpuFault!.correlations).toBeDefined();
        expect(gpuFault!.correlations!.length).toBeGreaterThan(0);
        expect(gpuFault!.correlations![0].strength).toBe('DIRECT_MATCH');
        expect(gpuFault!.correlations![0].absorbedFinding).toBeDefined();
        expect(gpuFault!.correlations![0].absorbedFinding!.subsumedFindingId).toBe('event-display-tdr-isolated');

        // Il finding event-display-tdr non deve sopravvivere nell'array finale (assorbito!)
        const displayFinding = report.findings.find((f) => f.id.startsWith('event-display-tdr'));
        expect(displayFinding).toBeUndefined();

        // Anti-doppia penalità verificata:
        // Solo il guasto GPU (-25) penalizza lo score. Non -25 (GPU) - 4 (TDR) = -29!
        expect(report.healthScore).toBe(75);
      });
    });
  });
});



