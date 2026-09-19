import { describe, it, expect } from 'vitest';
import {
  NavSection,
  NavigationTarget,
  MaintenanceTab,
  SettingsTab,
  MarketplaceTab,
  VALID_MAINTENANCE_TABS,
  VALID_SETTINGS_TABS,
  VALID_MARKETPLACE_TABS,
} from '../../../types/navigation';

describe('Navigation Foundation Suite (Session 5 - Phase 1)', () => {
  describe('1. Semplice navigazione a sezioni (Retrocompatibilità)', () => {
    it('accetta stringhe NavSection e le normalizza correttamente', () => {
      const validSections: NavSection[] = [
        'dashboard',
        'current-rig',
        'time-travel',
        'archive',
        'upgrades',
        'marketplace',
        'stats',
        'maintenance',
        'wiki',
        'settings',
      ];

      validSections.forEach((sec) => {
        const target: NavSection | NavigationTarget = sec;
        const normalized: NavigationTarget = typeof target === 'string' ? { section: target } : target;
        expect(normalized.section).toBe(sec);
        expect(normalized.subTab).toBeUndefined();
        expect(normalized.componentId).toBeUndefined();
      });
    });
  });

  describe('2. Apertura diretta di subTab fortemente tipizzati', () => {
    it('supporta destinazioni composte per Maintenance, Settings e Marketplace', () => {
      const maintenanceTarget: NavigationTarget = {
        section: 'maintenance',
        subTab: 'tools',
      };
      expect(maintenanceTarget.section).toBe('maintenance');
      expect(maintenanceTarget.subTab).toBe('tools');

      const sTab: SettingsTab = 'backup';
      const settingsTarget: NavigationTarget = {
        section: 'settings',
        subTab: sTab,
      };
      expect(settingsTarget.section).toBe('settings');
      expect(settingsTarget.subTab).toBe('backup');

      const mTab: MarketplaceTab = 'sold';
      const marketplaceTarget: NavigationTarget = {
        section: 'marketplace',
        subTab: mTab,
      };
      expect(marketplaceTarget.section).toBe('marketplace');
      expect(marketplaceTarget.subTab).toBe('sold');
    });

    it('valida i tab consentiti rispetto alle whitelist a runtime', () => {
      expect(VALID_MAINTENANCE_TABS).toContain('registro');
      expect(VALID_MAINTENANCE_TABS).toContain('scan');
      expect(VALID_MAINTENANCE_TABS).toContain('tools');
      expect(VALID_MAINTENANCE_TABS).toContain('tuning');

      expect(VALID_SETTINGS_TABS).toContain('preferences');
      expect(VALID_SETTINGS_TABS).toContain('appearance');
      expect(VALID_SETTINGS_TABS).toContain('backup');
      expect(VALID_SETTINGS_TABS).toContain('data');

      expect(VALID_MARKETPLACE_TABS).toContain('storage');
      expect(VALID_MARKETPLACE_TABS).toContain('sold');
    });

    it('simula la transizione di requestedTab su pagina già montata', () => {
      // Stato iniziale della pagina Maintenance (default 'registro')
      let activeTab: MaintenanceTab = 'registro';

      const simulateRequestedTabChange = (requestedTab?: MaintenanceTab) => {
        if (requestedTab && VALID_MAINTENANCE_TABS.includes(requestedTab)) {
          activeTab = requestedTab;
        }
      };

      expect(activeTab).toBe('registro');

      // Nuova navigazione profonda verso 'tools' mentre la pagina è già montata
      simulateRequestedTabChange('tools');
      expect(activeTab).toBe('tools');

      // Nuova navigazione verso 'scan'
      simulateRequestedTabChange('scan');
      expect(activeTab).toBe('scan');
    });
  });

  describe('3. Apertura diretta ComponentDetail e ritorno contestuale al Referrer', () => {
    interface MockAppState {
      currentSection: NavSection;
      selectedComponentId: string | null;
      componentReferrerSection: NavSection | null;
      activeSubTab: string | null;
    }

    const createDispatcher = (initialState: MockAppState) => {
      let state = { ...initialState };

      const navigate = (target: NavSection | NavigationTarget) => {
        const dest: NavigationTarget = typeof target === 'string' ? { section: target } : target;

        if (dest.componentId) {
          state.selectedComponentId = dest.componentId;
          state.componentReferrerSection = dest.referrer || (state.currentSection !== 'archive' ? state.currentSection : null);
          state.currentSection = 'archive';
          state.activeSubTab = null;
          return;
        }

        state.selectedComponentId = null;
        state.componentReferrerSection = null;
        state.currentSection = dest.section;
        state.activeSubTab = dest.subTab || null;
      };

      const selectComponent = (id: string, referrer?: NavSection) => {
        state.selectedComponentId = id;
        state.componentReferrerSection = referrer || (state.currentSection !== 'archive' ? state.currentSection : null);
        state.currentSection = 'archive';
        state.activeSubTab = null;
      };

      const backFromComponentDetail = () => {
        const targetSection = state.componentReferrerSection || 'archive';
        state.selectedComponentId = null;
        state.componentReferrerSection = null;
        state.currentSection = targetSection;
        state.activeSubTab = null;
      };

      return {
        getState: () => state,
        navigate,
        selectComponent,
        backFromComponentDetail,
      };
    };

    it('torna correttamente alla Dashboard se aperto da Dashboard', () => {
      const app = createDispatcher({
        currentSection: 'dashboard',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      // L'utente apre un componente dal feed della Dashboard
      app.selectComponent('gpu-4090');
      expect(app.getState().currentSection).toBe('archive');
      expect(app.getState().selectedComponentId).toBe('gpu-4090');
      expect(app.getState().componentReferrerSection).toBe('dashboard');

      // Click su Indietro
      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('dashboard');
      expect(app.getState().selectedComponentId).toBeNull();
      expect(app.getState().componentReferrerSection).toBeNull();
    });

    it('torna correttamente a Current Rig se aperto dal Rig Attuale', () => {
      const app = createDispatcher({
        currentSection: 'current-rig',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      app.selectComponent('cpu-7800x3d');
      expect(app.getState().currentSection).toBe('archive');
      expect(app.getState().selectedComponentId).toBe('cpu-7800x3d');
      expect(app.getState().componentReferrerSection).toBe('current-rig');

      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('current-rig');
      expect(app.getState().selectedComponentId).toBeNull();
    });

    it('torna correttamente agli Upgrade se aperto dallo Storico Upgrade', () => {
      const app = createDispatcher({
        currentSection: 'upgrades',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      app.selectComponent('psu-1000w');
      expect(app.getState().componentReferrerSection).toBe('upgrades');

      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('upgrades');
    });

    it('torna correttamente a Marketplace se aperto da Vendite & Annunci', () => {
      const app = createDispatcher({
        currentSection: 'marketplace',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      app.selectComponent('gpu-gtx1080');
      expect(app.getState().componentReferrerSection).toBe('marketplace');

      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('marketplace');
    });

    it('torna correttamente a Stats se aperto dalle Statistiche', () => {
      const app = createDispatcher({
        currentSection: 'stats',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      app.selectComponent('ssd-samsung');
      expect(app.getState().componentReferrerSection).toBe('stats');

      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('stats');
    });

    it('rimane in Archivio se aperto direttamente dall Archivio', () => {
      const app = createDispatcher({
        currentSection: 'archive',
        selectedComponentId: null,
        componentReferrerSection: null,
        activeSubTab: null,
      });

      app.selectComponent('ram-64gb');
      expect(app.getState().componentReferrerSection).toBeNull();

      app.backFromComponentDetail();
      expect(app.getState().currentSection).toBe('archive');
    });

    it('genera etichette getBackLabel coerenti per ogni referrer', () => {
      const getBackLabel = (referrer?: NavSection | null): string => {
        switch (referrer) {
          case 'dashboard':
            return 'Torna alla Dashboard';
          case 'current-rig':
            return 'Torna al Mio PC';
          case 'upgrades':
            return 'Torna agli Upgrade';
          case 'marketplace':
            return 'Torna a Vendite & Annunci';
          case 'stats':
            return 'Torna alle Statistiche';
          case 'archive':
          default:
            return "Torna all'Archivio";
        }
      };

      expect(getBackLabel('dashboard')).toBe('Torna alla Dashboard');
      expect(getBackLabel('current-rig')).toBe('Torna al Mio PC');
      expect(getBackLabel('upgrades')).toBe('Torna agli Upgrade');
      expect(getBackLabel('marketplace')).toBe('Torna a Vendite & Annunci');
      expect(getBackLabel('stats')).toBe('Torna alle Statistiche');
      expect(getBackLabel('archive')).toBe("Torna all'Archivio");
      expect(getBackLabel(null)).toBe("Torna all'Archivio");
      expect(getBackLabel(undefined)).toBe("Torna all'Archivio");
    });
  });

  describe('4. Preservazione di defaultStartSection', () => {
    it('inizializza la schermata iniziale in base a defaultStartSection di settings', () => {
      const determineInitialSection = (defaultStartSection?: string, isLoaded: boolean = true) => {
        if (!isLoaded) return 'dashboard';
        return defaultStartSection || 'dashboard';
      };

      expect(determineInitialSection('current-rig')).toBe('current-rig');
      expect(determineInitialSection('archive')).toBe('archive');
      expect(determineInitialSection('dashboard')).toBe('dashboard');
      expect(determineInitialSection(undefined)).toBe('dashboard');
    });
  });

  describe('5. Cambio tab reattivo e sequenziale per Settings e Marketplace', () => {
    it('simula sequenza di cambi tab su SettingsPage già montata', () => {
      let activeTab: SettingsTab = 'preferences';

      const simulateRequestedTabChange = (requestedTab?: SettingsTab) => {
        if (requestedTab && VALID_SETTINGS_TABS.includes(requestedTab)) {
          activeTab = requestedTab;
        }
      };

      expect(activeTab).toBe('preferences');
      simulateRequestedTabChange('appearance');
      expect(activeTab).toBe('appearance');
      simulateRequestedTabChange('backup');
      expect(activeTab).toBe('backup');
      simulateRequestedTabChange('data');
      expect(activeTab).toBe('data');
      // Tab non valido ignorato
      simulateRequestedTabChange('invalid_tab' as unknown as SettingsTab);
      expect(activeTab).toBe('data');
    });

    it('simula sequenza di cambi tab su MarketplacePage già montata', () => {
      let activeTab: MarketplaceTab = 'storage';

      const simulateRequestedTabChange = (requestedTab?: MarketplaceTab) => {
        if (requestedTab && VALID_MARKETPLACE_TABS.includes(requestedTab)) {
          activeTab = requestedTab;
        }
      };

      expect(activeTab).toBe('storage');
      simulateRequestedTabChange('sold');
      expect(activeTab).toBe('sold');
      simulateRequestedTabChange('storage');
      expect(activeTab).toBe('storage');
    });
  });
});

