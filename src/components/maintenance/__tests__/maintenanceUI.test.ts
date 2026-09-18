import { describe, it, expect } from 'vitest';
import {
  MaintenanceEntry,
  MaintenanceType,
  MAINTENANCE_TYPE_LABELS,
  TuningType,
  TUNING_TYPE_LABELS,
  TuningStability,
  TUNING_STABILITY_LABELS,
  WindowsToolResult,
  RecycleBinInfo,
} from '../../../types';
import {
  formatBytes,
  formatDurationMs,
  computeDriveUsagePercentage,
  getMaintenanceTypeBadgeClass,
  getTuningStabilityBadgeClass,
  validateMaintenanceEntry,
  validateTuningProfile,
  sortMaintenanceEntriesChronologically,
  computeUpcomingMaintenance,
  computeTotalMaintenanceCost,
  getLastMaintenanceOfType,
  getLastThermalPasteApplication,
} from '../../../domain';

describe('Windows Maintenance Center UI & Integration Suite', () => {
  it('should validate labels and badge classes for all maintenance types', () => {
    const types: MaintenanceType[] = [
      'cleaning',
      'filter_cleaning',
      'fan_cleaning',
      'thermal_paste',
      'thermal_pad',
      'storage_maintenance',
      'inspection',
      'system_maintenance',
      'other',
    ];

    for (const t of types) {
      expect(MAINTENANCE_TYPE_LABELS[t]).toBeDefined();
      expect(typeof MAINTENANCE_TYPE_LABELS[t]).toBe('string');
      const badge = getMaintenanceTypeBadgeClass(t);
      expect(badge).toMatch(/badge-(cyan|amber|emerald|gray|purple)/);
    }
  });

  it('should validate labels and badge classes for all tuning types and stability levels', () => {
    const tuningTypes: TuningType[] = [
      'cpu_undervolt',
      'curve_optimizer',
      'gpu_undervolt',
      'power_limit',
      'memory_xmp_expo',
      'fan_profile',
      'custom',
    ];

    for (const tt of tuningTypes) {
      expect(TUNING_TYPE_LABELS[tt]).toBeDefined();
    }

    const stabilities: TuningStability[] = ['daily', 'stable', 'testing', 'unstable'];
    for (const s of stabilities) {
      expect(TUNING_STABILITY_LABELS[s]).toBeDefined();
      const badge = getTuningStabilityBadgeClass(s);
      expect(badge).toMatch(/badge-(emerald|cyan|amber|ruby|gray)/);
    }
  });

  it('should correctly validate maintenance entry input', () => {
    const valid = validateMaintenanceEntry({
      title: 'Pulizia filtri antipolvere',
      date: '2026-09-18',
      type: 'filter_cleaning',
      cost: 0,
    });
    expect(valid.isValid).toBe(true);
    expect(Object.keys(valid.errors).length).toBe(0);

    const invalid = validateMaintenanceEntry({
      title: '',
      date: 'invalid-date',
      cost: -10,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.title).toBeDefined();
    expect(invalid.errors.date).toBeDefined();
    expect(invalid.errors.cost).toBeDefined();
  });

  it('should correctly validate tuning profile input', () => {
    const valid = validateTuningProfile({
      name: 'AMD Curve Optimizer -25 All Cores',
      date: '2026-09-18',
      type: 'curve_optimizer',
      stability: 'stable',
      observedPowerWatts: 125,
      temperatures: { idle: 38, load: 74 },
    });
    expect(valid.isValid).toBe(true);

    const invalid = validateTuningProfile({
      name: '',
      date: 'not-a-date',
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.name).toBeDefined();
    expect(invalid.errors.date).toBeDefined();
  });

  it('should calculate maintenance statistics: last cleaning, thermal paste and total cost', () => {
    const entries: MaintenanceEntry[] = [
      {
        id: 'm1',
        date: '2026-01-10',
        type: 'cleaning',
        title: 'Pulizia generale',
        description: 'Rimozione polvere con compressore',
        createdAt: '2026-01-10T10:00:00.000Z',
        updatedAt: '2026-01-10T10:00:00.000Z',
      },
      {
        id: 'm2',
        date: '2026-05-15',
        type: 'thermal_paste',
        title: 'Cambio pasta CPU',
        description: 'Sostituzione pasta termica su 7800X3D',
        productUsed: 'Noctua NT-H2',
        cost: 14.90,
        componentIds: ['cpu-1'],
        nextDueDate: '2027-05-15',
        createdAt: '2026-05-15T12:00:00.000Z',
        updatedAt: '2026-05-15T12:00:00.000Z',
      },
      {
        id: 'm3',
        date: '2026-08-20',
        type: 'cleaning',
        title: 'Pulizia filtri periodica',
        description: 'Lavaggio filtri case',
        cost: 5.00,
        createdAt: '2026-08-20T14:00:00.000Z',
        updatedAt: '2026-08-20T14:00:00.000Z',
      },
    ];

    const sorted = sortMaintenanceEntriesChronologically(entries, 'desc');
    expect(sorted[0].id).toBe('m3');

    const lastClean = getLastMaintenanceOfType(entries, 'cleaning');
    expect(lastClean?.id).toBe('m3');
    expect(lastClean?.date).toBe('2026-08-20');

    const lastPaste = getLastThermalPasteApplication(entries, [{ id: 'cpu-1', name: 'Ryzen 7 7800X3D' }]);
    expect(lastPaste?.productUsed).toBe('Noctua NT-H2');
    expect(lastPaste?.componentName).toBe('Ryzen 7 7800X3D');

    const totalCost = computeTotalMaintenanceCost(entries);
    expect(totalCost).toBeCloseTo(19.90, 2);

    const upcoming = computeUpcomingMaintenance(entries);
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].id).toBe('m2');
  });

  it('should format bytes and durations accurately without fabricating metrics', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 500)).toBe('500 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');

    expect(formatDurationMs(45)).toBe('45 ms');
    expect(formatDurationMs(1250)).toBe('1,3 s');

    // Free 500GB on 1000GB = 50% used
    expect(computeDriveUsagePercentage(500 * 1024, 1000 * 1024)).toBe(50);
    // Free 100GB on 1000GB = 90% used
    expect(computeDriveUsagePercentage(100 * 1024, 1000 * 1024)).toBe(90);
  });

  it('should properly structure ToolResult and RecycleBin info models', () => {
    const bin: RecycleBinInfo = {
      itemCount: 15,
      totalSizeBytes: 1024 * 1024 * 250,
    };
    expect(bin.itemCount).toBe(15);
    expect(formatBytes(bin.totalSizeBytes)).toBe('250 MB');

    const result: WindowsToolResult<string> = {
      status: 'success',
      message: 'Ottimizzazione TRIM completata con successo.',
      durationMs: 340,
      requiresElevation: true,
      data: 'TRIM C: completato',
    };
    expect(result.status).toBe('success');
    expect(result.requiresElevation).toBe(true);
  });
});
