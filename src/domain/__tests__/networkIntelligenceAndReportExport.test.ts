import { describe, it, expect } from 'vitest';
import {
  evaluateSystemHealth,
} from '../healthEngine';
import {
  generateOptimizationRecommendations,
} from '../optimizationEngine';
import {
  generateCareHealthReportJson,
  generateCareHealthReportMarkdown,
  exportCareHealthReportToFile,
} from '../careReportExportEngine';
import {
  queryNetworkAdapterDetails,
  queryWifiSignalMetrics,
  MOCK_NETWORK_ADAPTER_SNAPSHOT,
  MOCK_WIFI_SIGNAL_SNAPSHOT,
} from '../../services/windowsToolsService';
import {
  SystemFactsInput,
  NetworkAdapterSnapshot,
  WifiSignalSnapshot,
} from '../../types';

describe('Tranche 12 - Network Adapter Link Speed & Wi-Fi Intelligence Engine', () => {
  it('rileva il downgrade della negoziazione Ethernet (100 Mbps su scheda Gigabit/Multi-Gig)', () => {
    const downgradedAdapter: NetworkAdapterSnapshot = {
      availability: 'available',
      source: 'GetAdaptersAddresses',
      adapterName: 'Intel Ethernet Connection I219-V',
      description: 'Intel(R) Ethernet Connection (7) I219-V',
      adapterType: 'ethernet',
      status: 'connected',
      linkSpeedMbps: 100,
      maxSpeedMbps: 1000,
      isLinkSpeedDowngraded: true,
      ipv4: '192.168.1.150',
      gateway: '192.168.1.1',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      dhcpEnabled: true,
    };

    const facts: SystemFactsInput = {
      networkAdapter: downgradedAdapter,
    };

    const health = evaluateSystemHealth(facts);
    const finding = health.findings.find((f) => f.id === 'network-ethernet-link-downgraded');

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('WARNING');
    expect(finding?.area).toBe('system');
    expect(finding?.recommendedActionId).toBe('opt-network-verify-ethernet-cable');
    expect(finding?.evidence).toContain('100 Mbps');
    expect(finding?.evidence).toContain('1000 Mbps');
  });

  it('non genera finding di downgrade se la scheda Ethernet negozia a 1000 Mbps o oltre', () => {
    const optimalAdapter: NetworkAdapterSnapshot = {
      availability: 'available',
      source: 'GetAdaptersAddresses',
      adapterName: 'Realtek PCIe 2.5GbE Family Controller',
      description: 'Realtek Gaming 2.5GbE Controller',
      adapterType: 'ethernet',
      status: 'connected',
      linkSpeedMbps: 2500,
      maxSpeedMbps: 2500,
      isLinkSpeedDowngraded: false,
      ipv4: '192.168.1.200',
      gateway: '192.168.1.1',
      macAddress: '11:22:33:44:55:66',
      dhcpEnabled: true,
    };

    const facts: SystemFactsInput = {
      networkAdapter: optimalAdapter,
    };

    const health = evaluateSystemHealth(facts);
    const finding = health.findings.find((f) => f.id === 'network-ethernet-link-downgraded');
    expect(finding).toBeUndefined();
  });

  it('rileva un segnale Wi-Fi debole (<45%) con rischio instabilità e jitter', () => {
    const weakWifi: WifiSignalSnapshot = {
      availability: 'available',
      source: 'WlanGetNetworkBssList',
      isConnected: true,
      ssid: 'Home_Fiber_5G',
      bssid: '00:11:22:33:44:55',
      signalQualityPercent: 32,
      rssiDbm: -82,
      band: '5GHz',
      standard: 'Wi-Fi 6',
      channel: 36,
    };

    const facts: SystemFactsInput = {
      wifiSignal: weakWifi,
    };

    const health = evaluateSystemHealth(facts);
    const finding = health.findings.find((f) => f.id === 'network-wifi-weak-signal');

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('ATTENTION');
    expect(finding?.area).toBe('system');
    expect(finding?.recommendedActionId).toBe('opt-network-optimize-wifi-reception');
    expect(finding?.evidence).toContain('32%');
    expect(finding?.evidence).toContain('-82 dBm');
    expect(finding?.explanation).toContain('Home_Fiber_5G');
    expect(finding?.metadata?.ssid).toBe('Home_Fiber_5G');
  });

  it('non genera finding se il segnale Wi-Fi è eccellente (>=45%)', () => {
    const strongWifi: WifiSignalSnapshot = {
      availability: 'available',
      source: 'WlanGetNetworkBssList',
      isConnected: true,
      ssid: 'Gaming_Studio_6G',
      signalQualityPercent: 85,
      rssiDbm: -53,
      band: '6GHz',
      standard: 'Wi-Fi 6/6E',
      channel: 69,
    };

    const facts: SystemFactsInput = {
      wifiSignal: strongWifi,
    };

    const health = evaluateSystemHealth(facts);
    const finding = health.findings.find((f) => f.id === 'network-wifi-weak-signal');
    expect(finding).toBeUndefined();
  });

  it('genera raccomandazioni di ottimizzazione mirate per cavo Ethernet e posizionamento Wi-Fi', () => {
    const facts: SystemFactsInput = {
      networkAdapter: {
        availability: 'available',
        source: 'GetAdaptersAddresses',
        adapterName: 'Intel I225-V',
        description: 'Intel Ethernet 2.5GbE',
        adapterType: 'ethernet',
        status: 'connected',
        linkSpeedMbps: 100,
        maxSpeedMbps: 2500,
        isLinkSpeedDowngraded: true,
        ipv4: '192.168.1.10',
        dhcpEnabled: true,
      },
      wifiSignal: {
        availability: 'available',
        source: 'WlanGetNetworkBssList',
        isConnected: true,
        ssid: 'Office_WiFi',
        signalQualityPercent: 30,
        rssiDbm: -84,
        band: '2.4GHz',
        standard: 'Wi-Fi 5',
      },
    };

    const health = evaluateSystemHealth(facts);
    const optReport = generateOptimizationRecommendations(facts, health, []);

    const ethRec = optReport.recommendations.find((r) => r.id === 'opt-network-verify-ethernet-cable');
    expect(ethRec).toBeDefined();
    expect(ethRec?.category).toBe('system');
    expect(ethRec?.risk).toBe('NONE');
    expect(ethRec?.actionAvailability).toBe('MANUAL');
    expect(ethRec?.evidence).toContain('100 Mbps');

    const wifiRec = optReport.recommendations.find((r) => r.id === 'opt-network-optimize-wifi-reception');
    expect(wifiRec).toBeDefined();
    expect(wifiRec?.category).toBe('system');
    expect(wifiRec?.risk).toBe('NONE');
    expect(wifiRec?.actionAvailability).toBe('MANUAL');
    expect(wifiRec?.evidence).toContain('30%');
  });
});

describe('Tranche 12 - Care Center Health Report Export Engine', () => {
  const mockFacts: SystemFactsInput = {
    networkAdapter: {
      availability: 'available',
      source: 'GetAdaptersAddresses',
      adapterName: 'Intel Ethernet Controller I225-V',
      description: 'Intel 2.5GbE LAN',
      adapterType: 'ethernet',
      status: 'connected',
      linkSpeedMbps: 2500,
      maxSpeedMbps: 2500,
      isLinkSpeedDowngraded: false,
      ipv4: '192.168.1.55',
      gateway: '192.168.1.1',
      macAddress: '00:11:22:33:44:55',
      dhcpEnabled: true,
    },
    wifiSignal: {
      availability: 'available',
      source: 'wlanapi',
      isConnected: true,
      ssid: 'FiberMesh_Ultra',
      signalQualityPercent: 92,
      rssiDbm: -48,
      band: '6GHz',
      standard: 'Wi-Fi 7',
    },
    displayDiagnostics: {
      availability: 'available',
      source: 'Win32_GDI',
      totalMonitors: 1,
      monitors: [
        {
          id: 'mon-1',
          monitorName: 'ROG Swift PG279QM',
          adapterName: 'NVIDIA GeForce RTX 4090',
          currentResolution: { width: 2560, height: 1440 },
          currentRefreshRate: 240,
          maxSupportedRefreshRate: 240,
          supportedRefreshRates: [60, 120, 144, 240],
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
    },
    audioDiagnostics: {
      availability: 'available',
      source: 'WASAPI',
      defaultDeviceName: 'Speakers (Realtek High Definition Audio)',
      defaultSampleRateHz: 48000,
      defaultBitDepth: 24,
      defaultChannels: 2,
      audioServiceRunning: true,
      audioEndpointBuilderRunning: true,
      engineStatus: 'optimal',
      glitchOrIssueDetected: false,
      devices: [],
    },
  };

  it('genera un report JSON valido con schemaVersion: 1 e tutte le sezioni di telemetria locale', () => {
    const health = evaluateSystemHealth(mockFacts);
    const optReport = generateOptimizationRecommendations(mockFacts, health, []);
    const jsonStr = generateCareHealthReportJson(health, mockFacts, optReport.recommendations);

    const parsed = JSON.parse(jsonStr);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.generator).toContain('PC Tracker Care Center');
    expect(parsed.summary.healthScore).toBe(health.healthScore);
    expect(parsed.network.adapter.linkSpeedMbps).toBe(2500);
    expect(parsed.network.wifiSignal.ssid).toBe('FiberMesh_Ultra');
    expect(parsed.network.wifiSignal.standard).toBe('Wi-Fi 7');
    expect(parsed.display.monitors[0].monitorName).toBe('ROG Swift PG279QM');
    expect(parsed.audio.defaultSampleRateHz).toBe(48000);
    expect(parsed.privacyNotice).toContain('100% Local-First');
  });

  it('genera un report Markdown leggibile e completo per benchmark e diagnostica', () => {
    const health = evaluateSystemHealth(mockFacts);
    const optReport = generateOptimizationRecommendations(mockFacts, health, []);
    const md = generateCareHealthReportMarkdown(health, mockFacts, optReport.recommendations, 'it');

    expect(md).toContain('# PC Tracker Care Center — Health & Diagnostics Report');
    expect(md).toContain('## 1. Health Breakdown by Area');
    expect(md).toContain('## 2. Network Connectivity & Link Speed');
    expect(md).toContain('Intel Ethernet Controller I225-V');
    expect(md).toContain('2500 Mbps');
    expect(md).toContain('FiberMesh_Ultra');
    expect(md).toContain('Wi-Fi 7');
    expect(md).toContain('ROG Swift PG279QM');
    expect(md).toContain('Realtek High Definition Audio');
    expect(md).toContain('Local-First & Zero-Telemetry');
  });

  it('exportCareHealthReportToFile produce payload con nomi file formattati e mime types appropriati', () => {
    const health = evaluateSystemHealth(mockFacts);
    const optReport = generateOptimizationRecommendations(mockFacts, health, []);

    const mdPayload = exportCareHealthReportToFile(health, mockFacts, optReport.recommendations, 'markdown');
    expect(mdPayload.format).toBe('markdown');
    expect(mdPayload.mimeType).toBe('text/markdown');
    expect(mdPayload.filename).toMatch(/^pc-care-health-report-\d{4}-\d{2}-\d{2}\.md$/);
    expect(mdPayload.content.length).toBeGreaterThan(100);

    const jsonPayload = exportCareHealthReportToFile(health, mockFacts, optReport.recommendations, 'json');
    expect(jsonPayload.format).toBe('json');
    expect(jsonPayload.mimeType).toBe('application/json');
    expect(jsonPayload.filename).toMatch(/^pc-care-health-report-\d{4}-\d{2}-\d{2}\.json$/);
    expect(jsonPayload.content.length).toBeGreaterThan(100);
  });
});

describe('Tranche 12 - Windows Tools Service Mock Integration', () => {
  it('queryNetworkAdapterDetails restituisce il mock adapter nel browser environment', async () => {
    const res = await queryNetworkAdapterDetails();
    expect(res).toBeDefined();
    expect(res.availability).toBe('available');
    expect(res.adapterName).toBe(MOCK_NETWORK_ADAPTER_SNAPSHOT.adapterName);
    expect(res.linkSpeedMbps).toBeGreaterThan(0);
  });

  it('queryWifiSignalMetrics restituisce il mock wifi signal nel browser environment', async () => {
    const res = await queryWifiSignalMetrics();
    expect(res).toBeDefined();
    expect(res.availability).toBe('available');
    expect(res.ssid).toBe(MOCK_WIFI_SIGNAL_SNAPSHOT.ssid);
    expect(res.signalQualityPercent).toBeGreaterThan(0);
  });
});
