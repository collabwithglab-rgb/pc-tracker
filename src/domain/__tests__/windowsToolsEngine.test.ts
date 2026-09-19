import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  computeDriveUsagePercentage,
  formatDurationMs,
  evaluateScanNowRecommendations,
  classifyDiskHealth,
  formatTemperatureCelsius,
  formatWearPercentage,
  evaluateSecurityAuditStatus,
} from '../windowsToolsEngine';

describe('windowsToolsEngine', () => {
  it('formatta correttamente i byte in unità umane', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 50)).toBe('50 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1.8)).toBe('1.8 TB');
  });

  it('calcola la percentuale di spazio occupato', () => {
    // 100 GB totali, 30 GB liberi -> 70% occupato
    expect(computeDriveUsagePercentage(30 * 1024, 100 * 1024)).toBe(70);
    // Valori limite
    expect(computeDriveUsagePercentage(0, 100)).toBe(100);
    expect(computeDriveUsagePercentage(100, 100)).toBe(0);
  });

  it('formatta la durata in ms o secondi', () => {
    expect(formatDurationMs(350)).toBe('350 ms');
    expect(formatDurationMs(4200)).toBe('4,2 s');
  });

  it('restituisce raccomandazioni oggettive da Scan Now', () => {
    const actions = evaluateScanNowRecommendations({
      drives: [
        {
          driveLetter: 'C:',
          label: 'System',
          fileSystem: 'NTFS',
          totalBytes: 1000,
          freeBytes: 100, // 90% occupato -> raccomanda cleanmgr
          isSSD: true,
          mediaType: 'SSD',
          trimSupported: true,
        },
      ],
      recycleBin: {
        itemCount: 25,
        totalSizeBytes: 1024 * 1024 * 150, // 150 MB -> raccomanda svuota cestino
      },
    });

    expect(actions).toHaveLength(3);
    const actionTypes = actions.map((a) => a.actionType);
    expect(actionTypes).toContain('trim');
    expect(actionTypes).toContain('clean_recycle_bin');
    expect(actionTypes).toContain('open_cleanmgr');
  });

  describe('S.M.A.R.T. Health & Security Audit', () => {
    it('classifica la salute del disco (healthy, warning, critical)', () => {
      // Caso 1: disco integro
      const healthyDisk: import('../../types/windowsTools').DiskSmartHealth = {
        deviceId: '0',
        friendlyName: 'Samsung 980 Pro 1TB',
        mediaType: 'SSD',
        healthStatus: 'Healthy',
        temperatureCelsius: 42,
        wearPercentage: 10,
        readErrorsTotal: 0,
        writeErrorsTotal: 0,
      };
      const resHealthy = classifyDiskHealth(healthyDisk);
      expect(resHealthy.status).toBe('healthy');
      expect(resHealthy.badgeClass).toBe('badge-emerald');

      // Caso 2: surriscaldamento o errori I/O (warning)
      const warningDisk: import('../../types/windowsTools').DiskSmartHealth = {
        ...healthyDisk,
        temperatureCelsius: 72,
      };
      const resWarning = classifyDiskHealth(warningDisk);
      expect(resWarning.status).toBe('warning');
      expect(resWarning.badgeClass).toBe('badge-amber');

      // Caso 3: salute non healthy o wear estremo (critical)
      const criticalDisk: import('../../types/windowsTools').DiskSmartHealth = {
        ...healthyDisk,
        healthStatus: 'Bad / Failing',
      };
      const resCritical = classifyDiskHealth(criticalDisk);
      expect(resCritical.status).toBe('critical');
      expect(resCritical.badgeClass).toBe('badge-ruby');
    });

    it('formatta la temperatura e la percentuale di usura', () => {
      expect(formatTemperatureCelsius(48.6)).toBe('49°C');
      expect(formatTemperatureCelsius(undefined)).toBe('N/D');

      expect(formatWearPercentage(15)).toBe('15% consumato (85% vita residua)');
      expect(formatWearPercentage(undefined)).toBe('N/D');
    });

    it('valuta lo score dell audit di sicurezza', () => {
      const allGreen: import('../../types/windowsTools').SecurityAuditData = {
        secureBootEnabled: true,
        tpmPresent: true,
        tpmReady: true,
        vbsRunning: true,
        hvciRunning: true,
        hostsFileClean: true,
        hostsCustomEntriesCount: 0,
        details: 'Configurazione ottimale',
      };
      const auditResult = evaluateSecurityAuditStatus(allGreen);
      expect(auditResult.isOptimal).toBe(true);
      expect(auditResult.score).toBe(5);
      expect(auditResult.recommendations).toHaveLength(0);

      const degraded: import('../../types/windowsTools').SecurityAuditData = {
        secureBootEnabled: false,
        tpmPresent: true,
        tpmReady: false,
        vbsRunning: false,
        hvciRunning: false,
        hostsFileClean: false,
        hostsCustomEntriesCount: 4,
        details: 'Configurazione da verificare',
      };
      const auditDegraded = evaluateSecurityAuditStatus(degraded);
      expect(auditDegraded.isOptimal).toBe(false);
      expect(auditDegraded.score).toBe(0);
      expect(auditDegraded.recommendations.length).toBeGreaterThanOrEqual(4);
    });
  });
});
