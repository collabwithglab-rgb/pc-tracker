import { describe, it, expect } from 'vitest';
import {
  evaluateSystemHealth,
} from '../healthEngine';
import {
  generateOptimizationRecommendations,
} from '../optimizationEngine';
import {
  SystemFactsInput,
} from '../../types/health';
import {
  DisplayDiagnosticsSnapshot,
  AudioDiagnosticsSnapshot,
  MonitorInfo,
} from '../../types/windowsTools';
import {
  queryDisplayDiagnostics,
  detectAudioGlitchesOrStatus,
  openDisplaySettings,
  openSoundSettings,
} from '../../services/windowsToolsService';
import {
  executeOptimizationWorkflow,
} from '../../services/optimizationExecutionService';
import { OptimizationRecommendation } from '../../types/optimization';

describe('Display Diagnostics & Audio Latency Intelligence Engines (Tranche 11)', () => {
  const baseFacts: SystemFactsInput = {
    monitoring: null,
    drives: [],
    smartDisks: [],
    securityAudit: null,
    systemFilesStatus: 'clean',
    maintenanceEntries: [],
    tuningProfiles: [],
    currentRigComponents: [],
  };

  describe('Health Engine — evaluateDisplayAndAudioHealth', () => {
    it('rileva il finding display-refresh-rate-limited quando un monitor ad alto refresh rate è impostato a soli 60 Hz', () => {
      const displaySnapshot: DisplayDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Win32 EnumDisplayMonitors',
        totalMonitors: 1,
        monitors: [
          {
            id: 'display-1',
            monitorName: 'LG UltraGear 27GP850',
            adapterName: 'NVIDIA GeForce RTX 4070',
            currentResolution: { width: 2560, height: 1440 },
            currentRefreshRate: 60,
            maxSupportedRefreshRate: 165,
            supportedRefreshRates: [60, 120, 144, 165],
            bitsPerPixel: 32,
            orientation: 'landscape',
            isPrimary: true,
            virtualBounds: { x: 0, y: 0, width: 2560, height: 1440 },
            dpiScalePercent: 100,
            isRefreshRateLimited: true,
          },
        ],
        hasHighRefreshRateMismatch: true,
        hasMixedRefreshRates: false,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        displayDiagnostics: displaySnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const limitedFinding = report.findings.find((f) => f.id === 'display-refresh-rate-limited-display-1');

      expect(limitedFinding).toBeDefined();
      expect(limitedFinding?.severity).toBe('WARNING');
      expect(limitedFinding?.area).toBe('system');
      expect(limitedFinding?.confidence).toBe('HIGH');
      expect(limitedFinding?.evidence).toBe('60 Hz (max: 165 Hz)');
      expect(limitedFinding?.metadata?.currentRefreshRate).toBe(60);
      expect(limitedFinding?.metadata?.maxSupportedRefreshRate).toBe(165);
    });

    it('non emette finding se il monitor è già configurato alla sua frequenza massima supportata', () => {
      const displaySnapshot: DisplayDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Win32 EnumDisplayMonitors',
        totalMonitors: 1,
        monitors: [
          {
            id: 'display-1',
            monitorName: 'ASUS ROG Swift PG279Q',
            adapterName: 'NVIDIA GeForce RTX 4070',
            currentResolution: { width: 2560, height: 1440 },
            currentRefreshRate: 165,
            maxSupportedRefreshRate: 165,
            supportedRefreshRates: [60, 120, 144, 165],
            bitsPerPixel: 32,
            orientation: 'landscape',
            isPrimary: true,
            virtualBounds: { x: 0, y: 0, width: 2560, height: 1440 },
            dpiScalePercent: 100,
            isRefreshRateLimited: false,
          },
        ],
        hasHighRefreshRateMismatch: false,
        hasMixedRefreshRates: false,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        displayDiagnostics: displaySnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const limitedFinding = report.findings.find((f) => f.id.startsWith('display-refresh-rate-limited'));

      expect(limitedFinding).toBeUndefined();
    });

    it('rileva il finding display-mixed-refresh-rates in configurazioni multimonitor con refresh rate disallineati', () => {
      const displaySnapshot: DisplayDiagnosticsSnapshot = {
        availability: 'available',
        source: 'Win32 EnumDisplayMonitors',
        totalMonitors: 2,
        monitors: [
          {
            id: 'display-1',
            monitorName: 'Monitor Primario Gaming',
            adapterName: 'NVIDIA RTX 4070',
            currentResolution: { width: 2560, height: 1440 },
            currentRefreshRate: 165,
            maxSupportedRefreshRate: 165,
            supportedRefreshRates: [60, 144, 165],
            bitsPerPixel: 32,
            orientation: 'landscape',
            isPrimary: true,
            virtualBounds: { x: 0, y: 0, width: 2560, height: 1440 },
            dpiScalePercent: 100,
            isRefreshRateLimited: false,
          },
          {
            id: 'display-2',
            monitorName: 'Monitor Secondario Ufficio',
            adapterName: 'NVIDIA RTX 4070',
            currentResolution: { width: 1920, height: 1080 },
            currentRefreshRate: 60,
            maxSupportedRefreshRate: 60,
            supportedRefreshRates: [60],
            bitsPerPixel: 32,
            orientation: 'landscape',
            isPrimary: false,
            virtualBounds: { x: 2560, y: 0, width: 1920, height: 1080 },
            dpiScalePercent: 100,
            isRefreshRateLimited: false,
          },
        ],
        hasHighRefreshRateMismatch: false,
        hasMixedRefreshRates: true,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        displayDiagnostics: displaySnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const mixedFinding = report.findings.find((f) => f.id === 'display-mixed-refresh-rates');

      expect(mixedFinding).toBeDefined();
      expect(mixedFinding?.severity).toBe('INFO');
      expect(mixedFinding?.area).toBe('system');
      expect(mixedFinding?.evidence).toContain('165 Hz');
      expect(mixedFinding?.evidence).toContain('60 Hz');
    });

    it('rileva il finding audio-service-stopped quando il servizio Windows Audio è interrotto', () => {
      const audioSnapshot: AudioDiagnosticsSnapshot = {
        availability: 'available',
        source: 'WASAPI & Windows Service Control Manager',
        defaultDeviceName: 'Speakers (Realtek High Definition Audio)',
        defaultSampleRateHz: 48000,
        defaultBitDepth: 24,
        defaultChannels: 2,
        devices: [],
        audioServiceRunning: false,
        audioEndpointBuilderRunning: true,
        engineStatus: 'issues_detected',
        glitchOrIssueDetected: true,
        issueSummary: 'Audiosrv stopped',
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        audioDiagnostics: audioSnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const audioFinding = report.findings.find((f) => f.id === 'audio-service-stopped');

      expect(audioFinding).toBeDefined();
      expect(audioFinding?.severity).toBe('WARNING');
      expect(audioFinding?.area).toBe('system');
      expect(audioFinding?.evidence).toBe('Audiosrv: STOPPED');
    });

    it('rileva il finding audio-sample-rate-degraded se la frequenza di campionamento è inferiore a 44.1 kHz', () => {
      const audioSnapshot: AudioDiagnosticsSnapshot = {
        availability: 'available',
        source: 'WASAPI MMDevices Registry & Core Audio',
        defaultDeviceName: 'Generic USB Headset',
        defaultSampleRateHz: 22050,
        defaultBitDepth: 16,
        defaultChannels: 1,
        devices: [
          {
            id: 'audio-dev-1',
            name: 'Generic USB Headset',
            isDefault: true,
            state: 'active',
            sampleRateHz: 22050,
            bitDepth: 16,
            channels: 1,
          },
        ],
        audioServiceRunning: true,
        audioEndpointBuilderRunning: true,
        engineStatus: 'degraded',
        glitchOrIssueDetected: false,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        audioDiagnostics: audioSnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const audioFinding = report.findings.find((f) => f.id === 'audio-sample-rate-degraded');

      expect(audioFinding).toBeDefined();
      expect(audioFinding?.severity).toBe('ATTENTION');
      expect(audioFinding?.area).toBe('system');
      expect(audioFinding?.evidence).toBe('22050 Hz');
    });

    it('rileva audio-issues-detected se ci sono anomalie nei log o endpoint audio in stato degradato', () => {
      const audioSnapshot: AudioDiagnosticsSnapshot = {
        availability: 'available',
        source: 'WASAPI & System Event Log',
        defaultDeviceName: 'Studio Monitor',
        defaultSampleRateHz: 48000,
        defaultBitDepth: 24,
        defaultChannels: 2,
        devices: [],
        audioServiceRunning: true,
        audioEndpointBuilderRunning: true,
        engineStatus: 'issues_detected',
        glitchOrIssueDetected: true,
        issueSummary: 'Audio glitches detected in driver pipeline',
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        audioDiagnostics: audioSnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const audioFinding = report.findings.find((f) => f.id === 'audio-issues-detected');

      expect(audioFinding).toBeDefined();
      expect(audioFinding?.severity).toBe('ATTENTION');
      expect(audioFinding?.evidence).toContain('Audio glitches detected');
    });
  });

  describe('Optimization Engine — evaluateDisplayAndAudioRecommendations', () => {
    it('genera la raccomandazione opt-display-refresh-rate per monitor con frequenza limitata', () => {
      const monitor: MonitorInfo = {
        id: 'mon-samsung-g7',
        monitorName: 'Samsung Odyssey G7',
        adapterName: 'NVIDIA RTX 4070',
        currentResolution: { width: 2560, height: 1440 },
        currentRefreshRate: 60,
        maxSupportedRefreshRate: 240,
        supportedRefreshRates: [60, 144, 240],
        bitsPerPixel: 32,
        orientation: 'landscape',
        isPrimary: true,
        virtualBounds: { x: 0, y: 0, width: 2560, height: 1440 },
        dpiScalePercent: 100,
        isRefreshRateLimited: true,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        displayDiagnostics: {
          availability: 'available',
          source: 'Win32 EnumDisplayMonitors',
          totalMonitors: 1,
          monitors: [monitor],
          hasHighRefreshRateMismatch: true,
          hasMixedRefreshRates: false,
        },
      };

      const health = evaluateSystemHealth(facts);
      const optReport = generateOptimizationRecommendations(facts, health, []);
      const rec = optReport.recommendations.find((r) => r.id === 'opt-display-refresh-rate-mon-samsung-g7');

      expect(rec).toBeDefined();
      expect(rec?.actionId).toBe('open-display-settings');
      expect(rec?.actionAvailability).toBe('ASSISTED');
      expect(rec?.rollbackAvailability).toBe('NOT_APPLICABLE');
      expect(rec?.confidence).toBe('HIGH');
      expect(rec?.parameters?.targetHz).toBe(240);
    });

    it('genera la raccomandazione opt-audio-format-review per formato audio sub-ottimale o servizio arrestato', () => {
      const facts: SystemFactsInput = {
        ...baseFacts,
        audioDiagnostics: {
          availability: 'available',
          source: 'WASAPI MMDevices',
          defaultDeviceName: 'Speakers',
          defaultSampleRateHz: 32000,
          defaultBitDepth: 16,
          defaultChannels: 2,
          devices: [],
          audioServiceRunning: true,
          audioEndpointBuilderRunning: true,
          engineStatus: 'degraded',
          glitchOrIssueDetected: false,
        },
      };

      const health = evaluateSystemHealth(facts);
      const optReport = generateOptimizationRecommendations(facts, health, []);
      const rec = optReport.recommendations.find((r) => r.id === 'opt-audio-format-review');

      expect(rec).toBeDefined();
      expect(rec?.actionId).toBe('open-sound-settings');
      expect(rec?.actionAvailability).toBe('ASSISTED');
      expect(rec?.rollbackAvailability).toBe('NOT_APPLICABLE');
      expect(rec?.confidence).toBe('HIGH');
    });
  });

  describe('Windows Tools Service & Optimization Execution (Tranche 11)', () => {
    it('queryDisplayDiagnostics restituisce uno snapshot valido con monitor rilevati', async () => {
      const snapshot = await queryDisplayDiagnostics();
      expect(snapshot).toBeDefined();
      expect(snapshot.totalMonitors).toBeGreaterThanOrEqual(1);
      expect(snapshot.monitors.length).toBeGreaterThanOrEqual(1);
      expect(snapshot.monitors[0].currentRefreshRate).toBeGreaterThan(0);
      expect(snapshot.monitors[0].maxSupportedRefreshRate).toBeGreaterThanOrEqual(snapshot.monitors[0].currentRefreshRate);
    });

    it('detectAudioGlitchesOrStatus restituisce uno snapshot valido con endpoint audio e stato servizio', async () => {
      const snapshot = await detectAudioGlitchesOrStatus();
      expect(snapshot).toBeDefined();
      expect(snapshot.audioServiceRunning).toBe(true);
      expect(['optimal', 'standard', 'degraded', 'issues_detected']).toContain(snapshot.engineStatus);
    });

    it('openDisplaySettings esegue con successo e restituisce URI impostazioni', async () => {
      const res = await openDisplaySettings();
      expect(res.status).toBe('success');
      expect(res.data).toContain('ms-settings:display-advanced');
    });

    it('openSoundSettings esegue con successo e restituisce URI impostazioni', async () => {
      const res = await openSoundSettings();
      expect(res.status).toBe('success');
      expect(res.data).toContain('ms-settings:sound');
    });

    it('executeOptimizationWorkflow supporta open-display-settings e open-sound-settings', async () => {
      const mockRecordExecution = async (input: any) => ({
        ...input,
        id: 'test-exec-1',
        timestamp: new Date().toISOString(),
      });

      const displayRec: OptimizationRecommendation = {
        id: 'opt-display-refresh-rate-test',
        title: 'Unlock Max Refresh Rate',
        category: 'performance',
        reason: 'Refresh rate is limited',
        evidence: '60 Hz < 144 Hz',
        expectedBenefit: 'Smoothness',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'ASSISTED',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'open-display-settings',
        actionDescription: 'Open display settings',
        verificationMethod: 'Display updated',
        cadenceType: 'STATE_REMEDIATION',
      };

      const resDisplay = await executeOptimizationWorkflow({
        recommendation: displayRec,
        facts: baseFacts,
        recordExecution: mockRecordExecution,
      });
      expect(resDisplay.notification.type).toBe('success');
      expect(resDisplay.record.actionId).toBe('open-display-settings');

      const soundRec: OptimizationRecommendation = {
        id: 'opt-audio-format-review',
        title: 'Review Audio Format',
        category: 'system',
        reason: 'Sample rate is low',
        evidence: '22050 Hz',
        expectedBenefit: 'Fidelity',
        risk: 'NONE',
        confidence: 'HIGH',
        actionAvailability: 'ASSISTED',
        rollbackAvailability: 'NOT_APPLICABLE',
        actionId: 'open-sound-settings',
        actionDescription: 'Open sound settings',
        verificationMethod: 'Sound updated',
        cadenceType: 'STATE_REMEDIATION',
      };

      const resSound = await executeOptimizationWorkflow({
        recommendation: soundRec,
        facts: baseFacts,
        recordExecution: mockRecordExecution,
      });
      expect(resSound.notification.type).toBe('success');
      expect(resSound.record.actionId).toBe('open-sound-settings');
    });
  });
});
