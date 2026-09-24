import { describe, it, expect } from 'vitest';
import {
  getMonitoringSnapshot,
  isMetricAvailable,
  formatMetricValue,
  extractSnapshotVitals,
  UNSUPPORTED_WEB_SNAPSHOT,
} from '../monitoringService';
import { MonitoringSnapshot, MetricValue } from '../../types/monitoring';

describe('monitoringService', () => {
  describe('Web / Non-Desktop Fallback (Zero Mock Data)', () => {
    it('restituisce uno snapshot con status unsupported e zero metriche numeriche fittizie', async () => {
      const snapshot = await getMonitoringSnapshot();

      expect(snapshot.status).toBe('unsupported');
      expect(snapshot.cpu.utilizationPercent.value).toBeNull();
      expect(snapshot.cpu.utilizationPercent.availability).toBe('unsupported');
      expect(snapshot.cpu.baseFrequencyMhz.value).toBeNull();
      expect(snapshot.cpu.packageTemperatureCelsius.value).toBeNull();
      expect(snapshot.cpu.packagePowerWatts.value).toBeNull();

      expect(snapshot.memory.totalBytes).toBe(0);
      expect(snapshot.memory.usedBytes).toBe(0);
      expect(snapshot.memory.utilizationPercent).toBe(0);

      expect(snapshot.gpus).toEqual([]);
      expect(snapshot.storage).toEqual([]);
      expect(snapshot.system.osVersion).toContain('Web Browser');

      // Verifica che il timestamp sia un ISO valido
      expect(new Date(snapshot.timestamp).getTime()).not.toBeNaN();
    });

    it('UNSUPPORTED_WEB_SNAPSHOT contiene reason esplicative per ogni metrica non disponibile', () => {
      expect(UNSUPPORTED_WEB_SNAPSHOT.cpu.utilizationPercent.reason).toBeDefined();
      expect(UNSUPPORTED_WEB_SNAPSHOT.cpu.packageTemperatureCelsius.reason).toBeDefined();
      expect(UNSUPPORTED_WEB_SNAPSHOT.cpu.packagePowerWatts.reason).toBeDefined();
    });
  });

  describe('isMetricAvailable type-guard', () => {
    it('restituisce true solo per metriche con availability "available" e valore non nullo', () => {
      const validMetric: MetricValue<number> = {
        value: 45.2,
        availability: 'available',
        unit: '%',
        source: 'Win32_GetSystemTimes',
      };
      expect(isMetricAvailable(validMetric)).toBe(true);
    });

    it('restituisce false se availability è unavailable anche con un valore presente', () => {
      const unavailableMetric: MetricValue<number> = {
        value: null,
        availability: 'unavailable',
        source: 'NVML',
        reason: 'sensor_off',
      };
      expect(isMetricAvailable(unavailableMetric)).toBe(false);
    });

    it('restituisce false per availability "unsupported" o "error"', () => {
      const unsupported: MetricValue<number> = {
        value: null,
        availability: 'unsupported',
        source: 'ACPI',
      };
      const errorMetric: MetricValue<number> = {
        value: null,
        availability: 'error',
        source: 'Tauri',
      };
      expect(isMetricAvailable(unsupported)).toBe(false);
      expect(isMetricAvailable(errorMetric)).toBe(false);
    });

    it('gestisce in sicurezza input null o undefined', () => {
      expect(isMetricAvailable(null)).toBe(false);
      expect(isMetricAvailable(undefined)).toBe(false);
    });
  });

  describe('formatMetricValue', () => {
    it('formatta correttamente valore e unità per metriche disponibili', () => {
      const metric: MetricValue<number> = {
        value: 12.8,
        availability: 'available',
        unit: '%',
        source: 'Win32',
      };
      expect(formatMetricValue(metric)).toBe('12.8 %');

      const freqMetric: MetricValue<number> = {
        value: 4200,
        availability: 'available',
        unit: 'MHz',
        source: 'Registry',
      };
      expect(formatMetricValue(freqMetric)).toBe('4200 MHz');
    });

    it('formatta senza spazio extra se non è specificata alcuna unità', () => {
      const metricWithoutUnit: MetricValue<string> = {
        value: 'Standard',
        availability: 'available',
        source: 'Registry',
      };
      expect(formatMetricValue(metricWithoutUnit)).toBe('Standard');
    });

    it('restituisce N/D di default se la metrica non è disponibile', () => {
      const unavailable: MetricValue<number> = {
        value: null,
        availability: 'unavailable',
        source: 'NVML',
      };
      expect(formatMetricValue(unavailable)).toBe('N/D');
    });

    it('supporta un testo di fallback personalizzato', () => {
      const unsupported: MetricValue<number> = {
        value: null,
        availability: 'unsupported',
        source: 'ACPI',
      };
      expect(formatMetricValue(unsupported, 'Non Supportato')).toBe('Non Supportato');
    });
  });

  describe('extractSnapshotVitals', () => {
    it('estrae vitals coerenti da uno snapshot non supportato', () => {
      const vitals = extractSnapshotVitals(UNSUPPORTED_WEB_SNAPSHOT);
      expect(vitals.isSupported).toBe(false);
      expect(vitals.cpuUtilization).toBeNull();
      expect(vitals.memoryUtilization).toBe(0);
      expect(vitals.primaryGpu).toBeNull();
      expect(vitals.fixedStorageCount).toBe(0);
    });

    it('estrae vitals corretti da uno snapshot simulato completo', () => {
      const populatedSnapshot: MonitoringSnapshot = {
        timestamp: '2026-09-24T21:00:00.000Z',
        status: 'success',
        cpu: {
          utilizationPercent: {
            value: 23.4,
            availability: 'available',
            unit: '%',
            source: 'Win32_GetSystemTimes',
          },
          logicalProcessorCount: 16,
          baseFrequencyMhz: {
            value: 4200,
            availability: 'available',
            unit: 'MHz',
            source: 'Registry',
          },
          packageTemperatureCelsius: {
            value: null,
            availability: 'unsupported',
            source: 'ACPI',
            reason: 'requires_driver',
          },
          packagePowerWatts: {
            value: null,
            availability: 'unsupported',
            source: 'RAPL',
          },
        },
        memory: {
          totalBytes: 34359738368,
          usedBytes: 17179869184,
          availableBytes: 17179869184,
          utilizationPercent: 50.0,
        },
        gpus: [
          {
            id: 'gpu-0',
            name: 'NVIDIA GeForce RTX 4070',
            vendor: 'NVIDIA',
            isDiscrete: true,
            utilizationPercent: {
              value: 65.0,
              availability: 'available',
              unit: '%',
              source: 'NVML',
            },
            vramTotalBytes: {
              value: 12884901888,
              availability: 'available',
              unit: 'bytes',
              source: 'NVML',
            },
            vramUsedBytes: {
              value: 6442450944,
              availability: 'available',
              unit: 'bytes',
              source: 'NVML',
            },
            vramUtilizationPercent: {
              value: 50.0,
              availability: 'available',
              unit: '%',
              source: 'NVML',
            },
            coreTemperatureCelsius: {
              value: 62.0,
              availability: 'available',
              unit: '°C',
              source: 'NVML',
            },
            hotspotTemperatureCelsius: {
              value: null,
              availability: 'unsupported',
              source: 'NVML',
            },
            coreClockMhz: {
              value: 2475,
              availability: 'available',
              unit: 'MHz',
              source: 'NVML',
            },
            memoryClockMhz: {
              value: 10500,
              availability: 'available',
              unit: 'MHz',
              source: 'NVML',
            },
            powerWatts: {
              value: 145.2,
              availability: 'available',
              unit: 'W',
              source: 'NVML',
            },
            fanSpeedPercent: {
              value: 45.0,
              availability: 'available',
              unit: '%',
              source: 'NVML',
            },
          },
        ],
        storage: [
          {
            driveLetter: 'C:',
            label: 'Windows NVMe',
            fileSystem: 'NTFS',
            totalBytes: 2000000000000,
            usedBytes: 1000000000000,
            freeBytes: 1000000000000,
            utilizationPercent: 50.0,
          },
        ],
        system: {
          osVersion: 'Windows 11 Pro',
          osBuild: '26100',
          uptimeSeconds: 86400,
        },
      };

      const vitals = extractSnapshotVitals(populatedSnapshot);
      expect(vitals.isSupported).toBe(true);
      expect(vitals.cpuUtilization).toBe(23.4);
      expect(vitals.memoryUtilization).toBe(50.0);
      expect(vitals.primaryGpu?.name).toBe('NVIDIA GeForce RTX 4070');
      expect(vitals.fixedStorageCount).toBe(1);
    });
  });

  describe('Invarianti di Contratti e Robustezza', () => {
    it('garantisce che se availability non è "available", value sia sempre null', () => {
      const snap = UNSUPPORTED_WEB_SNAPSHOT;
      const metrics = [
        snap.cpu.utilizationPercent,
        snap.cpu.baseFrequencyMhz,
        snap.cpu.packageTemperatureCelsius,
        snap.cpu.packagePowerWatts,
      ];

      for (const m of metrics) {
        if (m.availability !== 'available') {
          expect(m.value).toBeNull();
        }
      }
    });
  });

  describe('Circular Buffer Volatile (Max 30 Campioni)', () => {
    it('mantiene un massimo di 30 campioni ed applica eliminazione FIFO', async () => {
      const {
        getSnapshotBuffer,
        clearSnapshotBuffer,
        pushToSnapshotBuffer,
      } = await import('../monitoringService');

      clearSnapshotBuffer();
      expect(getSnapshotBuffer()).toHaveLength(0);

      // Inserisce 35 snapshot numerati
      for (let i = 1; i <= 35; i++) {
        pushToSnapshotBuffer({
          ...UNSUPPORTED_WEB_SNAPSHOT,
          timestamp: `2026-09-24T12:00:${i < 10 ? '0' + i : i}.000Z`,
        });
      }

      const buffer = getSnapshotBuffer();
      expect(buffer).toHaveLength(30);
      // Il primo elemento deve essere il 6° inserito (timestamp che termina con :06)
      expect(buffer[0].timestamp).toContain(':06.000Z');
      // L'ultimo elemento deve essere il 35° (timestamp :35)
      expect(buffer[29].timestamp).toContain(':35.000Z');

      clearSnapshotBuffer();
      expect(getSnapshotBuffer()).toHaveLength(0);
    });
  });

  describe('Live Polling & Smart Pause', () => {
    it('avvia il polling, invoca la callback e gestisce la cancellazione del timer', async () => {
      const { startLiveMonitoring } = await import('../monitoringService');

      let callCount = 0;
      let lastPausedState = false;

      const stop = startLiveMonitoring(
        (_snap, meta) => {
          callCount++;
          lastPausedState = meta.isSmartPaused;
        },
        { intervalMs: 50, enableSmartPause: false }
      );

      // Attende il completamento del primo tick asincrono
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(lastPausedState).toBe(false);

      // Ferma il polling
      stop();
      const countAfterStop = callCount;

      // Attende per verificare che non ci siano ulteriori chiamate
      await new Promise((resolve) => setTimeout(resolve, 120));
      expect(callCount).toBe(countAfterStop);
    });
  });
});
