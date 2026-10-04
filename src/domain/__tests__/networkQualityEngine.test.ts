import { describe, it, expect } from 'vitest';
import {
  computeNetworkMetrics,
  classifyNetworkQuality,
  getNetworkQualityMeta,
  formatLatencyMs,
} from '../networkQualityEngine';
import { NetworkQualityRating } from '../../types/windowsTools';

describe('Network Quality Engine (Tranche 10)', () => {
  describe('computeNetworkMetrics', () => {
    it('calcola correttamente rttMin, rttMax, rttAvg, packetLoss e jitter per un set di campioni valido', () => {
      const samples = [10.2, 12.4, 11.0, 14.8];
      const metrics = computeNetworkMetrics(samples, 4);

      expect(metrics.sentPackets).toBe(4);
      expect(metrics.receivedPackets).toBe(4);
      expect(metrics.packetLossPercent).toBe(0);
      expect(metrics.rttMinMs).toBe(10.2);
      expect(metrics.rttMaxMs).toBe(14.8);
      expect(metrics.rttAvgMs).toBeCloseTo(12.1, 1);
      expect(metrics.jitterMs).toBeGreaterThan(0);
      expect(metrics.qualityRating).toBe('optimal');
    });

    it('calcola correttamente la percentuale di pacchetti persi quando ci sono timeout', () => {
      const samples = [25.0, 30.0];
      const metrics = computeNetworkMetrics(samples, 4); // 2 ricevuti su 4 inviati = 50% loss

      expect(metrics.sentPackets).toBe(4);
      expect(metrics.receivedPackets).toBe(2);
      expect(metrics.packetLossPercent).toBe(50);
      expect(metrics.qualityRating).toBe('critical');
    });

    it('gestisce il caso di perdita totale dei pacchetti (100% loss / offline)', () => {
      const samples: number[] = [];
      const metrics = computeNetworkMetrics(samples, 4);

      expect(metrics.sentPackets).toBe(4);
      expect(metrics.receivedPackets).toBe(0);
      expect(metrics.packetLossPercent).toBe(100);
      expect(metrics.rttMinMs).toBeNull();
      expect(metrics.rttMaxMs).toBeNull();
      expect(metrics.rttAvgMs).toBeNull();
      expect(metrics.jitterMs).toBeNull();
      expect(metrics.qualityRating).toBe('offline');
    });

    it('gestisce un singolo campione ping con jitter pari a 0', () => {
      const samples = [15.5];
      const metrics = computeNetworkMetrics(samples, 1);

      expect(metrics.rttMinMs).toBe(15.5);
      expect(metrics.rttMaxMs).toBe(15.5);
      expect(metrics.rttAvgMs).toBe(15.5);
      expect(metrics.jitterMs).toBe(0);
      expect(metrics.qualityRating).toBe('optimal');
    });
  });

  describe('classifyNetworkQuality', () => {
    it('classifica come optimal una linea a bassissima latenza e zero loss', () => {
      const rating = classifyNetworkQuality({
        rttAvgMs: 14.5,
        packetLossPercent: 0,
        jitterMs: 2.1,
      });
      expect(rating).toBe('optimal');
    });

    it('classifica come good una linea stabile con latenza moderata', () => {
      const rating = classifyNetworkQuality({
        rttAvgMs: 42.0,
        packetLossPercent: 1.0,
        jitterMs: 8.5,
      });
      expect(rating).toBe('good');
    });

    it('classifica come degraded una linea con latenza o jitter elevati', () => {
      const rating = classifyNetworkQuality({
        rttAvgMs: 85.0,
        packetLossPercent: 4.0,
        jitterMs: 22.0,
      });
      expect(rating).toBe('degraded');
    });

    it('classifica come critical una linea con perdita pacchetti considerevole (>20%) o latenza molto alta', () => {
      const ratingHighLoss = classifyNetworkQuality({
        rttAvgMs: 30.0,
        packetLossPercent: 25.0,
        jitterMs: 5.0,
      });
      expect(ratingHighLoss).toBe('critical');

      const ratingHighLatency = classifyNetworkQuality({
        rttAvgMs: 250.0,
        packetLossPercent: 0,
        jitterMs: 10.0,
      });
      expect(ratingHighLatency).toBe('critical');
    });

    it('classifica come offline una linea con perdita pacchetti del 100% o senza dati di latenza', () => {
      const rating100 = classifyNetworkQuality({
        rttAvgMs: null,
        packetLossPercent: 100,
        jitterMs: null,
      });
      expect(rating100).toBe('offline');

      const ratingNoAvg = classifyNetworkQuality({
        rttAvgMs: undefined,
        packetLossPercent: 50,
      });
      expect(ratingNoAvg).toBe('offline');
    });
  });

  describe('getNetworkQualityMeta', () => {
    const ratings: NetworkQualityRating[] = ['optimal', 'good', 'degraded', 'critical', 'offline'];

    it.each(ratings)('restituisce metadati validi e coerenti per il rating %s', (rating) => {
      const meta = getNetworkQualityMeta(rating, 'it');
      expect(meta.rating).toBe(rating);
      expect(meta.labelKey).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.badgeClass).toMatch(/^badge-/);
      expect(meta.color).toBeTruthy();
    });

    it('supporta la localizzazione per le lingue registrate', () => {
      const metaIt = getNetworkQualityMeta('optimal', 'it');
      const metaEn = getNetworkQualityMeta('optimal', 'en');
      expect(metaIt.label).toBe('Ottimale');
      expect(metaEn.label).toBe('Optimal');
    });
  });

  describe('formatLatencyMs', () => {
    it('formatta correttamente valori numerici con una cifra decimale', () => {
      expect(formatLatencyMs(14.234)).toBe('14.2 ms');
      expect(formatLatencyMs(0)).toBe('0.0 ms');
    });

    it('restituisce dash per valori null o undefined', () => {
      expect(formatLatencyMs(null)).toBe('—');
      expect(formatLatencyMs(undefined)).toBe('—');
    });
  });
});
