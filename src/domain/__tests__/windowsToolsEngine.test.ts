import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  computeDriveUsagePercentage,
  formatDurationMs,
  evaluateScanNowRecommendations,
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
});
