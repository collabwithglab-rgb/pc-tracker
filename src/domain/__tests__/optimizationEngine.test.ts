import { describe, it, expect } from 'vitest';
import { generateOptimizationRecommendations } from '../optimizationEngine';
import { SystemFactsInput, SystemHealthReport } from '../../types/health';
import { Component } from '../../types/component';
import { TuningProfile } from '../../types/tuning';
import { MaintenanceEntry } from '../../types/maintenance';
import { VolumeDriveInfo, SecurityAuditData } from '../../types/windowsTools';
import { MonitoringSnapshot } from '../../types/monitoring';

describe('optimizationEngine', () => {
  const baseRefDate = '2026-09-24T12:00:00.000Z';

  const defaultSecurityAudit: SecurityAuditData = {
    secureBootEnabled: true,
    tpmPresent: true,
    tpmReady: true,
    vbsRunning: true,
    hvciRunning: true,
    hostsFileClean: true,
    hostsCustomEntriesCount: 0,
    details: 'System is secure',
  };

  const createMaintenanceEntry = (
    id: string,
    title: string,
    date: string,
    type: MaintenanceEntry['type'] = 'system_maintenance',
    componentIds: string[] = ['c1']
  ): MaintenanceEntry => ({
    id,
    title,
    description: title,
    date,
    type,
    componentIds,
    createdAt: baseRefDate,
    updatedAt: baseRefDate,
  });

  const createDrive = (
    driveLetter: string,
    totalBytes: number,
    freeBytes: number,
    isSSD: boolean = true,
    trimSupported: boolean = true
  ): VolumeDriveInfo => ({
    driveLetter,
    label: 'Drive ' + driveLetter,
    fileSystem: 'NTFS',
    totalBytes,
    freeBytes,
    isSSD,
    mediaType: isSSD ? 'SSD' : 'HDD',
    trimSupported,
  });

  const createTuningProfile = (
    id: string,
    name: string,
    category: 'cpu' | 'gpu' | 'ram' | 'cooling' | 'other' = 'cpu',
    stability: 'daily' | 'stable' | 'testing' | 'unstable' = 'daily',
    loadTemp?: number
  ): TuningProfile => ({
    id,
    name,
    category,
    date: '2026-05-01',
    type: category === 'gpu' ? 'gpu_undervolt' : 'cpu_undervolt',
    parameters: {},
    stability,
    temperatures: loadTemp !== undefined ? { load: loadTemp } : undefined,
    createdAt: baseRefDate,
    updatedAt: baseRefDate,
  });

  it('generates an empty report when system facts are minimal and clean', () => {
    const facts: SystemFactsInput = {
      referenceDate: baseRefDate,
      drives: [],
      maintenanceEntries: [
        createMaintenanceEntry('m1', 'Punto di ripristino pre-aggiornamento', '2026-09-20'),
      ],
      systemFilesStatus: 'clean',
      securityAudit: defaultSecurityAudit,
    };

    const report = generateOptimizationRecommendations(facts);
    expect(report.evaluatedAt).toBe(baseRefDate);
    expect(report.totalCount).toBe(0);
    expect(report.recommendations).toHaveLength(0);
    expect(report.byRisk.NONE).toBe(0);
    expect(report.byCategory.storage).toBe(0);
  });

  describe('Storage Recommendations (TRIM & Disk Cleanup)', () => {
    it('recommends SSD TRIM when SSD has no recent maintenance (> 30 days)', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        drives: [createDrive('C:', 1_000_000_000_000, 500_000_000_000, true, true)],
        maintenanceEntries: [
          createMaintenanceEntry(
            'm-trim',
            'Ottimizzazione ReTrim disco C:',
            '2026-08-01',
            'storage_maintenance',
            ['c-ssd']
          ),
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const trimRec = report.recommendations.find((r) => r.id === 'opt-trim-C');

      expect(trimRec).toBeDefined();
      expect(trimRec?.category).toBe('storage');
      expect(trimRec?.risk).toBe('NONE');
      expect(trimRec?.actionAvailability).toBe('AUTOMATED_SAFE');
      expect(trimRec?.parameters?.driveLetter).toBe('C');
      expect(report.byCategory.storage).toBeGreaterThanOrEqual(1);
    });

    it('does NOT recommend TRIM if done recently (< 30 days)', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        drives: [createDrive('C:', 1_000_000_000_000, 500_000_000_000, true, true)],
        maintenanceEntries: [
          createMaintenanceEntry(
            'm-trim',
            'TRIM manuale',
            '2026-09-15',
            'storage_maintenance',
            ['c-ssd']
          ),
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const trimRec = report.recommendations.find((r) => r.id === 'opt-trim-C');
      expect(trimRec).toBeUndefined();
    });

    it('recommends Cleanmgr on C: when usage is >= 82%', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        drives: [createDrive('C:', 1_000_000_000_000, 150_000_000_000, true, true)], // 85% used
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const cleanmgrRec = report.recommendations.find((r) => r.id === 'opt-cleanmgr-c');

      expect(cleanmgrRec).toBeDefined();
      expect(cleanmgrRec?.category).toBe('storage');
      expect(cleanmgrRec?.risk).toBe('LOW');
      expect(cleanmgrRec?.actionId).toBe('open-cleanmgr');
    });

    it('detects C: usage from monitoring storage array if drives not set', () => {
      const monitoringData: MonitoringSnapshot = {
        timestamp: baseRefDate,
        status: 'success',
        cpu: {
          utilizationPercent: { value: 10, availability: 'available', unit: '%', source: 'Win32' },
          logicalProcessorCount: 8,
          baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Registry' },
          packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
          packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
        },
        memory: {
          totalBytes: 32_000_000_000,
          usedBytes: 16_000_000_000,
          availableBytes: 16_000_000_000,
          utilizationPercent: 50,
        },
        gpus: [],
        storage: [
          {
            driveLetter: 'C:',
            label: 'OS',
            fileSystem: 'NTFS',
            totalBytes: 1_000_000_000,
            usedBytes: 850_000_000,
            freeBytes: 150_000_000, // 85% used
            utilizationPercent: 85,
          },
        ],
        system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 3600 },
      };

      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        monitoring: monitoringData,
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      expect(report.recommendations.some((r) => r.id === 'opt-cleanmgr-c')).toBe(true);
    });
  });

  describe('Safety & System Integrity Recommendations', () => {
    it('recommends creating a restore point when none exists or > 14 days old', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        maintenanceEntries: [
          createMaintenanceEntry(
            'm-old-rp',
            'Punto di ripristino creazione',
            '2026-09-01' // 23 days ago
          ),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const rpRec = report.recommendations.find((r) => r.id === 'opt-create-restore-point');

      expect(rpRec).toBeDefined();
      expect(rpRec?.category).toBe('system');
      expect(rpRec?.actionAvailability).toBe('ASSISTED_UAC');
      expect(rpRec?.risk).toBe('NONE');
    });

    it('recommends SFC repair when system files are reported as corrupted', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        systemFilesStatus: 'corrupted',
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const sfcRec = report.recommendations.find((r) => r.id === 'opt-sfc-repair');

      expect(sfcRec).toBeDefined();
      expect(sfcRec?.category).toBe('system');
      expect(sfcRec?.actionId).toBe('sfc-repair');
      expect(sfcRec?.rollbackAvailability).toBe('MANUAL_RESTORE');
    });

    it('recommends enabling Secure Boot if securityAudit says false', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        securityAudit: {
          ...defaultSecurityAudit,
          secureBootEnabled: false,
        },
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const secRec = report.recommendations.find((r) => r.id === 'opt-enable-secure-boot');

      expect(secRec).toBeDefined();
      expect(secRec?.category).toBe('security');
      expect(secRec?.actionAvailability).toBe('MANUAL_GUIDED');
    });
  });

  describe('Performance & Tuning Recommendations', () => {
    it('recommends DirectX & GPU Shader Cache cleaning if discrete GPU is present', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        monitoring: {
          timestamp: baseRefDate,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 5, availability: 'available', unit: '%', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Registry' },
            packageTemperatureCelsius: { value: null, availability: 'unsupported', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: {
            totalBytes: 32_000_000_000,
            usedBytes: 8_000_000_000,
            availableBytes: 24_000_000_000,
            utilizationPercent: 25,
          },
          gpus: [
            {
              id: 'gpu-0',
              name: 'NVIDIA GeForce RTX 4070',
              vendor: 'NVIDIA',
              utilizationPercent: { value: 10, availability: 'available', unit: '%', source: 'NVML' },
              vramTotalBytes: { value: 12_000_000_000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 2_000_000_000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 16.6, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 45, availability: 'available', unit: '°C', source: 'NVML' },
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2500, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10500, availability: 'available', source: 'NVML' },
              powerWatts: { value: 40, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 0, availability: 'available', source: 'NVML' },
              isDiscrete: true,
            },
          ],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 100 },
        },
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const cacheRec = report.recommendations.find((r) => r.id === 'opt-clean-shader-cache');

      expect(cacheRec).toBeDefined();
      expect(cacheRec?.category).toBe('performance');
      expect(cacheRec?.actionId).toBe('clean-shader-cache');
    });

    it('recommends Ultimate Performance power plan when user has validated daily tuning profile', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        tuningProfiles: [
          createTuningProfile('tune-1', 'Daily Undervolt 5.5GHz', 'cpu', 'daily'),
        ],
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const planRec = report.recommendations.find((r) => r.id === 'opt-ultimate-performance');

      expect(planRec).toBeDefined();
      expect(planRec?.category).toBe('performance');
      expect(planRec?.actionAvailability).toBe('ASSISTED_UAC');
      expect(planRec?.rollbackAvailability).toBe('AUTOMATIC');
    });
  });

  describe('Thermal & Maintenance Recommendations (Personal Baseline)', () => {
    it('recommends cooling inspection when GPU diverges > 8°C from Personal Baseline', () => {
      const gpuComponent: Component = {
        id: 'gpu-rtx4070',
        name: 'GeForce RTX 4070',
        brand: 'ASUS',
        model: 'Dual OC',
        category: 'gpu',
        createdAt: baseRefDate,
        updatedAt: baseRefDate,
      };

      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        currentRigComponents: [gpuComponent],
        monitoring: {
          timestamp: baseRefDate,
          status: 'success',
          cpu: {
            utilizationPercent: { value: 50, availability: 'available', unit: '%', source: 'Win32' },
            logicalProcessorCount: 8,
            baseFrequencyMhz: { value: 3600, availability: 'available', source: 'Registry' },
            packageTemperatureCelsius: { value: 60, availability: 'available', source: 'ACPI' },
            packagePowerWatts: { value: null, availability: 'unsupported', source: 'RAPL' },
          },
          memory: {
            totalBytes: 32_000_000_000,
            usedBytes: 16_000_000_000,
            availableBytes: 16_000_000_000,
            utilizationPercent: 50,
          },
          gpus: [
            {
              id: 'gpu-0',
              name: 'NVIDIA GeForce RTX 4070',
              vendor: 'NVIDIA',
              utilizationPercent: { value: 95, availability: 'available', unit: '%', source: 'NVML' },
              vramTotalBytes: { value: 12_000_000_000, availability: 'available', source: 'NVML' },
              vramUsedBytes: { value: 8_000_000_000, availability: 'available', source: 'NVML' },
              vramUtilizationPercent: { value: 66, availability: 'available', source: 'NVML' },
              coreTemperatureCelsius: { value: 82, availability: 'available', unit: '°C', source: 'NVML' }, // +14°C over baseline of 68°C
              hotspotTemperatureCelsius: { value: null, availability: 'unsupported', source: 'NVML' },
              coreClockMhz: { value: 2500, availability: 'available', source: 'NVML' },
              memoryClockMhz: { value: 10500, availability: 'available', source: 'NVML' },
              powerWatts: { value: 200, availability: 'available', source: 'NVML' },
              fanSpeedPercent: { value: 80, availability: 'available', source: 'NVML' },
              isDiscrete: true,
            },
          ],
          storage: [],
          system: { osVersion: 'Windows 11', osBuild: '26100', uptimeSeconds: 5000 },
        },
        tuningProfiles: [
          createTuningProfile('tune-gpu', 'Daily Quiet Curve', 'gpu', 'daily', 68),
        ],
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const thermalRec = report.recommendations.find((r) => r.id === 'opt-cooling-baseline-divergence');

      expect(thermalRec).toBeDefined();
      expect(thermalRec?.category).toBe('thermal');
      expect(thermalRec?.actionAvailability).toBe('MANUAL_GUIDED');
    });

    it('recommends thermal paste replacement when overdue in maintenance logs', () => {
      const cpuComp: Component = {
        id: 'cpu-7800x3d',
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '7800X3D',
        category: 'cpu',
        createdAt: baseRefDate,
        updatedAt: baseRefDate,
      };

      const facts: SystemFactsInput = {
        referenceDate: '2026-09-24T12:00:00.000Z',
        currentRigComponents: [cpuComp],
        maintenanceEntries: [
          createMaintenanceEntry(
            'm-old-paste',
            'Applicazione pasta termica Noctua NT-H2',
            '2023-01-01', // > 730 days ago
            'thermal_paste',
            ['cpu-7800x3d']
          ),
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const pasteRec = report.recommendations.find((r) => r.id === 'opt-replace-thermal-paste');

      expect(pasteRec).toBeDefined();
      expect(pasteRec?.category).toBe('maintenance');
      expect(pasteRec?.actionAvailability).toBe('MANUAL_GUIDED');
    });

    it('recommends dust filters cleaning when overdue (> 180 days)', () => {
      const caseComp: Component = {
        id: 'case-meshify',
        name: 'Fractal Meshify 2',
        brand: 'Fractal Design',
        model: 'Meshify 2',
        category: 'case',
        createdAt: baseRefDate,
        updatedAt: baseRefDate,
      };

      const facts: SystemFactsInput = {
        referenceDate: '2026-09-24T12:00:00.000Z',
        currentRigComponents: [caseComp],
        maintenanceEntries: [
          createMaintenanceEntry(
            'm-filters',
            'Pulizia filtri antipolvere',
            '2025-10-01', // > 180 days ago
            'filter_cleaning',
            ['case-meshify']
          ),
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const filterRec = report.recommendations.find((r) => r.id === 'opt-clean-dust-filters');

      expect(filterRec).toBeDefined();
      expect(filterRec?.category).toBe('maintenance');
      expect(filterRec?.actionAvailability).toBe('MANUAL_GUIDED');
    });
  });

  describe('Deterministic Sorting and Report Aggregations', () => {
    it('sorts recommendations deterministically prioritizing system integrity and safe high-yield actions', () => {
      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        systemFilesStatus: 'corrupted',
        securityAudit: {
          ...defaultSecurityAudit,
          secureBootEnabled: false,
        },
        drives: [createDrive('C:', 100_000, 10_000, true, true)], // 90% used
        maintenanceEntries: [], // triggers restore point too
        tuningProfiles: [
          createTuningProfile('t1', 'Daily profile', 'cpu', 'daily'),
        ],
      };

      const report = generateOptimizationRecommendations(facts);
      const ids = report.recommendations.map((r) => r.id);

      // SFC repair has highest priority (100)
      expect(ids[0]).toBe('opt-sfc-repair');
      // Cleanmgr C: has priority 90
      expect(ids[1]).toBe('opt-cleanmgr-c');

      // Check report aggregates
      expect(report.totalCount).toBe(report.recommendations.length);
      expect(report.byRisk.LOW).toBeGreaterThan(0);
      expect(report.byRisk.NONE).toBeGreaterThan(0);
    });

    it('allows passing an existing pre-computed health report', () => {
      const precomputedHealth: SystemHealthReport = {
        evaluatedAt: baseRefDate,
        overallStatus: 'warning',
        healthScore: 60,
        summary: {
          criticalCount: 1,
          warningCount: 0,
          attentionCount: 0,
          goodCount: 0,
          infoCount: 0,
        },
        findings: [
          {
            id: 'system-sfc-corrupted',
            severity: 'CRITICAL',
            area: 'system',
            title: 'File di sistema Windows danneggiati',
            evidence: 'sfc output',
            explanation: 'Violazioni rilevate',
            confidence: 'HIGH',
            recommendedActionId: 'sfc-repair',
          },
        ],
        areaBreakdown: {
          cpu: { status: 'healthy', findingsCount: 0 },
          gpu: { status: 'healthy', findingsCount: 0 },
          ram: { status: 'healthy', findingsCount: 0 },
          storage: { status: 'healthy', findingsCount: 0 },
          thermal: { status: 'healthy', findingsCount: 0 },
          maintenance: { status: 'healthy', findingsCount: 0 },
          system: { status: 'critical', findingsCount: 1 },
          security: { status: 'healthy', findingsCount: 0 },
        },
      };

      const facts: SystemFactsInput = {
        referenceDate: baseRefDate,
        maintenanceEntries: [
          createMaintenanceEntry('m-rp', 'Punto di ripristino', '2026-09-20'),
        ],
      };

      const report = generateOptimizationRecommendations(facts, precomputedHealth);
      expect(report.recommendations.some((r) => r.id === 'opt-sfc-repair')).toBe(true);
    });
  });
});
