import { describe, it, expect } from 'vitest';
import {
  queryStartupApps,
  openStartupSettings,
  runNetworkDiagnostics,
  queryWindowsUpdateStatus,
} from '../../../services/windowsToolsService';

describe('Startup Intelligence & Network Diagnostics Services & UI Presentation (Tranche 10)', () => {
  describe('Windows Tools Service Contracts', () => {
    it('queryStartupApps restituisce uno snapshot valido con lista app e metriche di stato', async () => {
      const snapshot = await queryStartupApps();

      expect(snapshot).toBeDefined();
      expect(snapshot.availability).toBe('available');
      expect(snapshot.totalApps).toBeGreaterThan(0);
      expect(snapshot.enabledCount).toBeGreaterThanOrEqual(0);
      expect(snapshot.disabledCount).toBeGreaterThanOrEqual(0);
      expect(snapshot.totalApps).toBe(snapshot.enabledCount + snapshot.disabledCount);
      expect(snapshot.apps.length).toBe(snapshot.totalApps);

      const firstApp = snapshot.apps[0];
      expect(firstApp.name).toBeTruthy();
      expect(firstApp.command).toBeTruthy();
      expect(['current_user', 'local_machine', 'local_machine_wow64']).toContain(firstApp.scope);
      expect(['high', 'medium', 'low', 'none', 'unknown']).toContain(firstApp.impact);
      expect(typeof firstApp.enabled).toBe('boolean');
    });

    it('queryWindowsUpdateStatus restituisce lo stato del riavvio e le sorgenti CBS/Registry', async () => {
      const status = await queryWindowsUpdateStatus();

      expect(status).toBeDefined();
      expect(status.availability).toBe('available');
      expect(typeof status.rebootPending).toBe('boolean');
      expect(Array.isArray(status.rebootSources)).toBe(true);
      expect(typeof status.pendingFileRenameCount).toBe('number');
    });

    it('runNetworkDiagnostics esegue il test ICMP on-demand e calcola metriche valide', async () => {
      const result = await runNetworkDiagnostics('1.1.1.1');

      expect(result).toBeDefined();
      expect(result.targetHost).toBe('1.1.1.1');
      expect(result.sentPackets).toBeGreaterThan(0);
      expect(result.receivedPackets).toBeGreaterThanOrEqual(0);
      expect(result.packetLossPercent).toBeGreaterThanOrEqual(0);
      expect(result.packetLossPercent).toBeLessThanOrEqual(100);
      expect(['optimal', 'good', 'degraded', 'critical', 'offline']).toContain(result.qualityRating);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('openStartupSettings gestisce la chiamata al protocollo nativo di sistema senza errori', async () => {
      const result = await openStartupSettings();
      expect(result.status).toBe('success');
    });
  });

  describe('Startup Scope and Impact Filtering Logic', () => {
    it('filtra correttamente le app per stato abilitato e disabilitato', async () => {
      const snapshot = await queryStartupApps();
      const enabledApps = snapshot.apps.filter((a) => a.enabled);
      const disabledApps = snapshot.apps.filter((a) => !a.enabled);

      expect(enabledApps.length).toBe(snapshot.enabledCount);
      expect(disabledApps.length).toBe(snapshot.disabledCount);
    });

    it('effettua la ricerca per nome e riga di comando', async () => {
      const snapshot = await queryStartupApps();
      const query = snapshot.apps[0].name.toLowerCase();

      const matched = snapshot.apps.filter(
        (a) => a.name.toLowerCase().includes(query) || a.command.toLowerCase().includes(query)
      );

      expect(matched.length).toBeGreaterThan(0);
      expect(matched.some((a) => a.name.toLowerCase().includes(query))).toBe(true);
    });
  });
});
