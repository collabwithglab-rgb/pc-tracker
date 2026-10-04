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
  StartupAppsSnapshot,
  WindowsUpdateStatus,
} from '../../types/windowsTools';

describe('Startup Intelligence & Windows Update Diagnostics Engines (Tranche 10)', () => {
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

  describe('Health Engine — evaluateWindowsUpdateAndStartupHealth', () => {
    it('rileva il finding deterministico system-reboot-pending quando Windows Update richiede un riavvio', () => {
      const updateStatus: WindowsUpdateStatus = {
        availability: 'available',
        source: 'HKLM Registry & Component-Based Servicing',
        rebootPending: true,
        rebootSources: ['RebootRequired', 'CBS RebootPending'],
        pendingFileRenameCount: 3,
        lastCheckTime: '2026-10-03 14:00',
        lastInstallTime: '2026-10-03 15:30',
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        windowsUpdate: updateStatus,
      };

      const report = evaluateSystemHealth(facts);
      const rebootFinding = report.findings.find((f) => f.id === 'system-reboot-pending');

      expect(rebootFinding).toBeDefined();
      expect(rebootFinding?.severity).toBe('WARNING');
      expect(rebootFinding?.area).toBe('system');
      expect(rebootFinding?.confidence).toBe('HIGH');
      expect(rebootFinding?.evidence).toContain('RebootRequired');
      expect(rebootFinding?.evidence).toContain('CBS RebootPending');
      expect(rebootFinding?.metadata?.pendingRenames).toBe(3);
    });

    it('non emette system-reboot-pending se nessun riavvio è pendente', () => {
      const updateStatus: WindowsUpdateStatus = {
        availability: 'available',
        source: 'Registry',
        rebootPending: false,
        rebootSources: [],
        pendingFileRenameCount: 0,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        windowsUpdate: updateStatus,
      };

      const report = evaluateSystemHealth(facts);
      const rebootFinding = report.findings.find((f) => f.id === 'system-reboot-pending');

      expect(rebootFinding).toBeUndefined();
    });

    it('rileva il finding startup-apps-high-count quando le app abilitate superano la soglia di 15', () => {
      const startupSnapshot: StartupAppsSnapshot = {
        availability: 'available',
        source: 'Registry Run & StartupApproved',
        totalApps: 24,
        enabledCount: 18,
        disabledCount: 6,
        apps: [],
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        startupApps: startupSnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const startupFinding = report.findings.find((f) => f.id === 'startup-apps-high-count');

      expect(startupFinding).toBeDefined();
      expect(startupFinding?.severity).toBe('ATTENTION');
      expect(startupFinding?.area).toBe('system');
      expect(startupFinding?.evidence).toBe('18 / 24');
      expect(startupFinding?.metadata?.enabledCount).toBe(18);
    });

    it('non emette startup-apps-high-count se le app abilitate sono entro la soglia consentita (<= 15)', () => {
      const startupSnapshot: StartupAppsSnapshot = {
        availability: 'available',
        source: 'Registry Run',
        totalApps: 20,
        enabledCount: 12,
        disabledCount: 8,
        apps: [],
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        startupApps: startupSnapshot,
      };

      const report = evaluateSystemHealth(facts);
      const startupFinding = report.findings.find((f) => f.id === 'startup-apps-high-count');

      expect(startupFinding).toBeUndefined();
    });
  });

  describe('Optimization Engine — evaluateWindowsUpdateAndStartupRecommendations', () => {
    it('genera la raccomandazione opt-finalize-windows-update quando il sistema ha un riavvio pendente', () => {
      const updateStatus: WindowsUpdateStatus = {
        availability: 'available',
        source: 'CBS',
        rebootPending: true,
        rebootSources: ['CBS RebootPending'],
        pendingFileRenameCount: 0,
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        windowsUpdate: updateStatus,
      };

      const health = evaluateSystemHealth(facts);
      const report = generateOptimizationRecommendations(facts, health);

      const opt = report.recommendations.find((r) => r.id === 'opt-finalize-windows-update');
      expect(opt).toBeDefined();
      expect(opt?.category).toBe('system');
      expect(opt?.risk).toBe('NONE');
      expect(opt?.actionAvailability).toBe('ASSISTED');
      expect(opt?.actionId).toBe('reboot-system');
      expect(opt?.parameters?.rebootSources).toContain('CBS RebootPending');
    });

    it('genera la raccomandazione non distruttiva opt-review-startup-apps quando le app abilitate sono > 15', () => {
      const startupSnapshot: StartupAppsSnapshot = {
        availability: 'available',
        source: 'Registry',
        totalApps: 22,
        enabledCount: 17,
        disabledCount: 5,
        apps: [],
      };

      const facts: SystemFactsInput = {
        ...baseFacts,
        startupApps: startupSnapshot,
      };

      const health = evaluateSystemHealth(facts);
      const report = generateOptimizationRecommendations(facts, health);

      const opt = report.recommendations.find((r) => r.id === 'opt-review-startup-apps');
      expect(opt).toBeDefined();
      expect(opt?.category).toBe('performance');
      expect(opt?.risk).toBe('LOW');
      expect(opt?.actionAvailability).toBe('ONE_CLICK');
      expect(opt?.actionId).toBe('open-startup-settings');
      expect(opt?.parameters?.enabledCount).toBe(17);
    });

    it('non genera raccomandazioni di startup o reboot quando lo stato di sistema è nominale', () => {
      const facts: SystemFactsInput = {
        ...baseFacts,
        windowsUpdate: {
          availability: 'available',
          source: 'Registry',
          rebootPending: false,
          rebootSources: [],
          pendingFileRenameCount: 0,
        },
        startupApps: {
          availability: 'available',
          source: 'Registry',
          totalApps: 10,
          enabledCount: 5,
          disabledCount: 5,
          apps: [],
        },
      };

      const health = evaluateSystemHealth(facts);
      const report = generateOptimizationRecommendations(facts, health);

      expect(report.recommendations.some((r) => r.id === 'opt-finalize-windows-update')).toBe(false);
      expect(report.recommendations.some((r) => r.id === 'opt-review-startup-apps')).toBe(false);
    });
  });
});
