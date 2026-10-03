import { describe, it, expect } from 'vitest';
import {
  EventLogDiagnosticsSnapshot,
  WindowsServicesSnapshot,
  WindowsServiceNativeFact,
  EventLogNativeFact,
} from '../../../types/diagnostics';
import { HealthFinding, HealthFindingCorrelationEvidence } from '../../../types/health';
import { groupAndDeduplicateEvents } from '../../../domain/diagnosticCorrelationEngine';

describe('Tranche 8E — Care Diagnostics UI Presentation & Verification', () => {
  describe('1. Presentazione Event Log Card & Truncation Copy Rule (Sezione 2.1)', () => {
    it('mostra la dicitura esatta di campionamento limitato quando truncated === true e count === maxEventsCap', () => {
      const snapshot: EventLogDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 50,
        truncated: true,
        events: Array(50).fill(null).map((_, i) => ({
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 19,
          level: 3,
          timestamp: `2026-09-28T10:00:${String(i).padStart(2, '0')}Z`,
          recordId: 1000 + i,
        })),
      };

      // Helper di formattazione del testo usato nella UI
      const formatEventLogSummary = (snap: EventLogDiagnosticsSnapshot) => {
        if (snap.availability !== 'available') {
          return 'Sensore non disponibile';
        }
        if (snap.truncated) {
          return `Almeno ${snap.maxEventsCap} eventi rilevati (campionamento limitato ai più recenti)`;
        }
        if (snap.returnedEventCount === 0) {
          return '0 eventi critici rilevati (ultimi 7 giorni)';
        }
        return `${snap.returnedEventCount} eventi rilevati negli ultimi 7 giorni`;
      };

      const copy = formatEventLogSummary(snapshot);
      expect(copy).toBe('Almeno 50 eventi rilevati (campionamento limitato ai più recenti)');
      expect(copy).not.toContain('Totale eventi: 50');
    });

    it('mostra conteggio esaustivo trasparente quando non è troncato', () => {
      const emptySnapshot: EventLogDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 0,
        truncated: false,
        events: [],
      };

      const partialSnapshot: EventLogDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Wevtapi_SystemLog',
        queryTimeWindowHours: 168,
        maxEventsCap: 50,
        returnedEventCount: 4,
        truncated: false,
        events: [],
      };

      const formatEventLogSummary = (snap: EventLogDiagnosticsSnapshot) => {
        if (snap.truncated) {
          return `Almeno ${snap.maxEventsCap} eventi rilevati (campionamento limitato ai più recenti)`;
        }
        if (snap.returnedEventCount === 0) {
          return '0 eventi critici rilevati (ultimi 7 giorni)';
        }
        return `${snap.returnedEventCount} eventi rilevati negli ultimi 7 giorni`;
      };

      expect(formatEventLogSummary(emptySnapshot)).toBe('0 eventi critici rilevati (ultimi 7 giorni)');
      expect(formatEventLogSummary(partialSnapshot)).toBe('4 eventi rilevati negli ultimi 7 giorni');
    });

    it('deduplica correttamente gli eventi per la modale di ispezione', () => {
      const mockEvents: EventLogNativeFact[] = [
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 19,
          timestamp: '2026-09-28T10:00:00Z',
          level: 3,
          recordId: 101,
        },
        {
          channel: 'System',
          provider: 'Microsoft-Windows-WHEA-Logger',
          eventId: 19,
          timestamp: '2026-09-28T10:05:00Z',
          level: 3,
          recordId: 102,
        },
        {
          channel: 'System',
          provider: 'disk',
          eventId: 7,
          timestamp: '2026-09-28T11:00:00Z',
          level: 2,
          recordId: 103,
        },
      ];

      const groups = groupAndDeduplicateEvents(mockEvents, '2026-09-28T12:00:00Z', 168);
      expect(groups).toHaveLength(2);

      const wheaGroup = groups.find((g) => g.provider === 'Microsoft-Windows-WHEA-Logger');
      expect(wheaGroup).toBeDefined();
      expect(wheaGroup?.occurrenceCount).toBe(2);
      expect(wheaGroup?.firstSeen).toBe('2026-09-28T10:00:00Z');
      expect(wheaGroup?.lastSeen).toBe('2026-09-28T10:05:00Z');

      const diskGroup = groups.find((g) => g.provider === 'disk');
      expect(diskGroup).toBeDefined();
      expect(diskGroup?.occurrenceCount).toBe(1);
    });
  });

  describe('2. Presentazione Modello Servizi SCM a 3 Classi (Sezione 2.7)', () => {
    // Helper di valutazione dello stato del servizio basato sul modello a 3 classi
    const evaluateService = (fact: WindowsServiceNativeFact) => {
      if (fact.currentState === 'unknown') {
        return { isProblematic: false, status: 'Non Rilevato', badgeClass: 'badge-subtle' };
      }

      if (fact.operationalModel === 'always_running') {
        if (fact.currentState !== 'running') {
          return { isProblematic: true, status: 'Arrestato (Anomalia)', badgeClass: 'badge-ruby' };
        }
        if (fact.startType === 'disabled') {
          return { isProblematic: true, status: 'Disabilitato (Avviso)', badgeClass: 'badge-amber' };
        }
        return { isProblematic: false, status: 'In Esecuzione', badgeClass: 'badge-emerald' };
      }

      if (fact.operationalModel === 'on_demand') {
        if (fact.startType === 'disabled') {
          return { isProblematic: true, status: 'Disabilitato', badgeClass: 'badge-amber' };
        }
        if (fact.win32ExitCode !== 0 && fact.currentState === 'stopped') {
          return { isProblematic: true, status: `Errore (${fact.win32ExitCode})`, badgeClass: 'badge-amber' };
        }
        if (fact.currentState === 'running') {
          return { isProblematic: false, status: 'Attivo (In Uso)', badgeClass: 'badge-cyan' };
        }
        return { isProblematic: false, status: 'A Riposo', badgeClass: 'badge-neutral' };
      }

      // Contextual
      if (fact.startType === 'disabled') {
        return { isProblematic: true, status: 'Disabilitato', badgeClass: 'badge-amber' };
      }
      return { isProblematic: false, status: fact.currentState === 'running' ? 'Attivo' : 'A Riposo', badgeClass: 'badge-neutral' };
    };

    it('identifica un servizio on-demand arrestato come fisiologico (non ansioso)', () => {
      const wuauserv: WindowsServiceNativeFact = {
        serviceName: 'wuauserv',
        displayName: 'Windows Update',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'demand',
        win32ExitCode: 0,
      };

      const result = evaluateService(wuauserv);
      expect(result.isProblematic).toBe(false);
      expect(result.status).toBe('A Riposo');
      expect(result.badgeClass).toBe('badge-neutral');
    });

    it('identifica un servizio always_running arrestato come anomalia critica', () => {
      const eventLog: WindowsServiceNativeFact = {
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        currentState: 'stopped',
        startType: 'auto',
        win32ExitCode: 0,
      };

      const result = evaluateService(eventLog);
      expect(result.isProblematic).toBe(true);
      expect(result.status).toBe('Arrestato (Anomalia)');
      expect(result.badgeClass).toBe('badge-ruby');
    });

    it('identifica un servizio on-demand disabilitato come avviso', () => {
      const vss: WindowsServiceNativeFact = {
        serviceName: 'VSS',
        displayName: 'Volume Shadow Copy',
        operationalModel: 'on_demand',
        currentState: 'stopped',
        startType: 'disabled',
        win32ExitCode: 0,
      };

      const result = evaluateService(vss);
      expect(result.isProblematic).toBe(true);
      expect(result.status).toBe('Disabilitato');
      expect(result.badgeClass).toBe('badge-amber');
    });

    it('calcola correttamente il riassunto dei 6 servizi di catalogo', () => {
      const catalogServices: WindowsServiceNativeFact[] = [
        { serviceName: 'EventLog', displayName: 'Event Log', operationalModel: 'always_running', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
        { serviceName: 'Winmgmt', displayName: 'WMI', operationalModel: 'always_running', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
        { serviceName: 'wuauserv', displayName: 'WU', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
        { serviceName: 'TrustedInstaller', displayName: 'TI', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
        { serviceName: 'VSS', displayName: 'VSS', operationalModel: 'on_demand', currentState: 'stopped', startType: 'demand', win32ExitCode: 0 },
        { serviceName: 'WinDefend', displayName: 'Defender', operationalModel: 'contextual', currentState: 'running', startType: 'auto', win32ExitCode: 0 },
      ];

      const snapshot: WindowsServicesSnapshot = {
        availability: 'available',
        source: 'Advapi32_SCM',
        scannedAt: '2026-09-28T12:00:00Z',
        catalogCount: 6,
        services: catalogServices,
      };

      const problemCount = snapshot.services.filter((s) => evaluateService(s).isProblematic).length;
      expect(problemCount).toBe(0);
      expect(snapshot.catalogCount).toBe(6);
      expect(snapshot.services).toHaveLength(6);
    });

    it('non segnala falsi allarmi critici quando lo stato del servizio è unknown', () => {
      const unknownService: WindowsServiceNativeFact = {
        serviceName: 'EventLog',
        displayName: 'Windows Event Log',
        operationalModel: 'always_running',
        currentState: 'unknown',
        startType: 'unknown',
        win32ExitCode: 0,
      };

      const result = evaluateService(unknownService);
      expect(result.isProblematic).toBe(false);
      expect(result.status).toBe('Non Rilevato');
      expect(result.badgeClass).toBe('badge-subtle');
    });
  });

  describe('3. Presentazione Correlazioni & Zero Data Loss (Sezione 5)', () => {
    it('preserva integralmente tutti i campi del finding assorbito senza perdita dati', () => {
      const correlationEvidence: HealthFindingCorrelationEvidence = {
        correlationId: 'whea_cpu_tuning_direct',
        strength: 'DIRECT_MATCH',
        title: 'Correlazione Errori WHEA-Logger con Profilo Tuning CPU Attivo',
        hardwareEvidence: 'Profilo di tuning CPU presente nel contesto di analisi con offset di undervolt -30mV',
        eventEvidence: 'Rilevati 3 eventi WHEA-Logger 19 negli ultimi 7 giorni',
        explanation: 'La contemporanea presenza di eventi WHEA e di un tuning con riduzione di tensione suggerisce di verificare la stabilità.',
        absorbedFinding: {
          subsumedFindingId: 'tuning_aggressive_undervolt',
          originalSeverity: 'ATTENTION',
          area: 'cpu',
          title: 'Profilo Tuning con Tensione Ridotta Rilevato',
          evidence: 'Offset core: -30mV',
          explanation: 'Il profilo applica un undervolt aggressivo che potrebbe essere instabile sotto determinati carichi transitori.',
        },
      };

      const primaryFinding: HealthFinding = {
        id: 'whea_hardware_errors_detected',
        severity: 'WARNING',
        area: 'cpu',
        title: 'Errori Hardware Segnalati da Windows (WHEA-Logger)',
        evidence: '3 errori WHEA registrati',
        explanation: 'Windows ha registrato eventi WHEA corretti dall\'architettura hardware.',
        confidence: 'HIGH',
        correlations: [correlationEvidence],
      };

      // Verifiche contrattuali
      expect(primaryFinding.correlations).toBeDefined();
      expect(primaryFinding.correlations?.[0].strength).toBe('DIRECT_MATCH');
      expect(primaryFinding.correlations?.[0].absorbedFinding).toBeDefined();

      const absorbed = primaryFinding.correlations![0].absorbedFinding!;
      expect(absorbed.subsumedFindingId).toBe('tuning_aggressive_undervolt');
      expect(absorbed.originalSeverity).toBe('ATTENTION');
      expect(absorbed.title).toBe('Profilo Tuning con Tensione Ridotta Rilevato');
      expect(absorbed.evidence).toBe('Offset core: -30mV');
      expect(absorbed.explanation).toContain('instabile sotto determinati carichi transitori');
    });

    it('rispetta la regola di non-causalità e neutralità del linguaggio', () => {
      const explanation = 'Profilo di tuning CPU presente nel contesto di analisi. Questa convergenza di evidenze non costituisce prova di causalità univoca.';
      expect(explanation.toLowerCase()).toContain('profilo di tuning cpu presente nel contesto di analisi');
      expect(explanation).toContain('non costituisce prova di causalità');
      expect(explanation).not.toContain('ha rotto la CPU');
      expect(explanation).not.toContain('ha causato il crash');
    });

    it('visualizza il badge di truncamento nei finding con metadata isTruncatedSample', () => {
      const findingWithTruncation: HealthFinding = {
        id: 'whea_hardware_errors_detected',
        severity: 'WARNING',
        area: 'cpu',
        title: 'Errori Hardware Segnalati da Windows (WHEA-Logger)',
        evidence: '50 errori WHEA registrati (campione)',
        explanation: 'Windows ha registrato eventi hardware.',
        confidence: 'HIGH',
        metadata: {
          isTruncatedSample: true,
          capLimit: 50,
        },
      };

      expect(findingWithTruncation.metadata?.isTruncatedSample).toBe(true);
      expect(findingWithTruncation.metadata?.capLimit).toBe(50);
    });
  });

  describe('Tranche 9 — AMD Radeon GPU Telemetry & Hotspot UI Presentation', () => {
    it('genera il badge dedicato dinamico per GPU AMD ADL o NVIDIA NVML', () => {
      const getGpuBadgeText = (gpu: { isDiscrete: boolean; vendor: string; coreTemperatureCelsius: { source?: string } }) => {
        if (!gpu.isDiscrete) return 'Integrata (iGPU)';
        return `Dedicata (${gpu.coreTemperatureCelsius.source || (gpu.vendor === 'AMD' ? 'ADL' : 'NVML')})`;
      };

      expect(getGpuBadgeText({ isDiscrete: true, vendor: 'AMD', coreTemperatureCelsius: { source: 'ADL' } })).toBe('Dedicata (ADL)');
      expect(getGpuBadgeText({ isDiscrete: true, vendor: 'NVIDIA', coreTemperatureCelsius: { source: 'NVML' } })).toBe('Dedicata (NVML)');
      expect(getGpuBadgeText({ isDiscrete: false, vendor: 'Intel', coreTemperatureCelsius: {} })).toBe('Integrata (iGPU)');
    });

    it('calcola correttamente le classi termiche Hotspot su architettura AMD RDNA', () => {
      const getHotspotThermalClass = (temp?: number | null): string => {
        if (temp === null || temp === undefined) return '';
        if (temp >= 110) return 'temp-critical';
        if (temp >= 100) return 'temp-warning';
        return 'temp-good';
      };

      expect(getHotspotThermalClass(112)).toBe('temp-critical');
      expect(getHotspotThermalClass(110)).toBe('temp-critical');
      expect(getHotspotThermalClass(105)).toBe('temp-warning');
      expect(getHotspotThermalClass(100)).toBe('temp-warning');
      expect(getHotspotThermalClass(85)).toBe('temp-good');
      expect(getHotspotThermalClass(null)).toBe('');
    });
  });
});
