/**
 * Network Quality Engine — Helper puro e deterministico di analisi e classificazione latenza
 * (PC Care Center - Tranche 10)
 *
 * Calcola statistiche RTT (min, max, avg), packet loss, jitter e classifica la qualità
 * della connessione di rete secondo metriche trasparenti RFC 3550 / ICMP.
 *
 * Regola: Zero effetti collaterali, zero dipendenze UI, zero chiamate asincrone.
 */

import { NetworkQualityRating } from '../types/windowsTools';
import { SupportedLocale } from '../types';
import { translate } from '../locales';

export interface NetworkMetricsInput {
  rttAvgMs?: number | null;
  packetLossPercent: number;
  jitterMs?: number | null;
}

export interface NetworkQualityMeta {
  rating: NetworkQualityRating;
  labelKey: string;
  label: string;
  badgeClass: string;
  color: string;
}

/**
 * Classifica la qualità della connessione in modo puro e deterministico.
 */
export function classifyNetworkQuality(input: NetworkMetricsInput): NetworkQualityRating {
  const { rttAvgMs, packetLossPercent, jitterMs } = input;

  if (packetLossPercent >= 100 || rttAvgMs === null || rttAvgMs === undefined) {
    return 'offline';
  }

  const avg = rttAvgMs;
  const jitter = jitterMs ?? 0;

  if (packetLossPercent > 20 || avg > 200) {
    return 'critical';
  }

  if (packetLossPercent > 5 || avg > 80 || jitter > 30) {
    return 'degraded';
  }

  if (avg <= 30 && jitter <= 5 && packetLossPercent === 0) {
    return 'optimal';
  }

  return 'good';
}

/**
 * Calcola le metriche complete da una sequenza di campioni di latenza (ms) e pacchetti inviati.
 */
export function computeNetworkMetrics(
  samples: number[],
  sentPackets = 4
): {
  min: number | null;
  max: number | null;
  avg: number | null;
  jitter: number | null;
  rttMinMs: number | null;
  rttMaxMs: number | null;
  rttAvgMs: number | null;
  jitterMs: number | null;
  sentPackets: number;
  receivedPackets: number;
  packetLossPercent: number;
  qualityRating: NetworkQualityRating;
} {
  const validSamples = samples.filter((s) => typeof s === 'number' && !isNaN(s) && s >= 0);
  const received = validSamples.length;
  const packetLossPercent =
    sentPackets > 0
      ? Math.round(((sentPackets - received) / sentPackets) * 1000) / 10
      : 0;

  if (validSamples.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
      jitter: null,
      rttMinMs: null,
      rttMaxMs: null,
      rttAvgMs: null,
      jitterMs: null,
      sentPackets,
      receivedPackets: 0,
      packetLossPercent: 100,
      qualityRating: 'offline',
    };
  }

  const min = Math.min(...validSamples);
  const max = Math.max(...validSamples);
  const sum = validSamples.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / validSamples.length) * 10) / 10;

  let jitter: number | null = 0;
  if (validSamples.length > 1) {
    let diffSum = 0;
    for (let i = 0; i < validSamples.length - 1; i++) {
      diffSum += Math.abs(validSamples[i + 1] - validSamples[i]);
    }
    jitter = Math.round((diffSum / (validSamples.length - 1)) * 10) / 10;
  }

  const qualityRating = classifyNetworkQuality({
    rttAvgMs: avg,
    packetLossPercent,
    jitterMs: jitter,
  });

  return {
    min,
    max,
    avg,
    jitter,
    rttMinMs: min,
    rttMaxMs: max,
    rttAvgMs: avg,
    jitterMs: jitter,
    sentPackets,
    receivedPackets: received,
    packetLossPercent,
    qualityRating,
  };
}

/**
 * Restituisce i metadati visivi e descrittivi per una classificazione di qualità di rete.
 */
export function getNetworkQualityMeta(
  rating: NetworkQualityRating,
  locale: SupportedLocale = 'it'
): NetworkQualityMeta {
  switch (rating) {
    case 'optimal':
      return {
        rating,
        labelKey: 'network_quality_optimal',
        label: translate(locale, 'network_quality_optimal'),
        badgeClass: 'badge-emerald',
        color: 'var(--accent-emerald)',
      };
    case 'good':
      return {
        rating,
        labelKey: 'network_quality_good',
        label: translate(locale, 'network_quality_good'),
        badgeClass: 'badge-cyan',
        color: 'var(--accent-cyan)',
      };
    case 'degraded':
      return {
        rating,
        labelKey: 'network_quality_degraded',
        label: translate(locale, 'network_quality_degraded'),
        badgeClass: 'badge-amber',
        color: 'var(--accent-amber)',
      };
    case 'critical':
      return {
        rating,
        labelKey: 'network_quality_critical',
        label: translate(locale, 'network_quality_critical'),
        badgeClass: 'badge-ruby',
        color: 'var(--accent-ruby)',
      };
    case 'offline':
    default:
      return {
        rating: 'offline',
        labelKey: 'network_quality_offline',
        label: translate(locale, 'network_quality_offline'),
        badgeClass: 'badge-gray',
        color: 'var(--text-muted)',
      };
  }
}

/**
 * Helper per formattare una latenza in millisecondi.
 */
export function formatLatencyMs(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '—';
  return `${ms.toFixed(1)} ms`;
}
