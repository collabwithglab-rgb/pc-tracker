import { describe, it, expect } from 'vitest';
import {
  STATIC_NAVIGATION_COMMANDS,
  STATIC_ACTION_COMMANDS,
  buildComponentCommands,
  computeCommandScore,
  searchCommands,
} from '../commandRegistry';
import { Component, ComponentComputedState } from '../../types';

describe('Command Registry & Deterministic Ranking Suite', () => {
  describe('1. Comandi Statici di Navigazione', () => {
    it('include esattamente 10 sezioni principali di primo livello', () => {
      const navCommands = STATIC_NAVIGATION_COMMANDS.filter((c) => c.category === 'navigation');
      expect(navCommands).toHaveLength(10);

      const expectedSections = [
        'dashboard',
        'current-rig',
        'time-travel',
        'upgrades',
        'archive',
        'marketplace',
        'stats',
        'maintenance',
        'wiki',
        'settings',
      ];

      expectedSections.forEach((sec) => {
        const found = navCommands.find((c) => c.target?.section === sec && !c.target?.subTab);
        expect(found).toBeDefined();
        expect(found?.label.length).toBeGreaterThan(0);
      });
    });

    it('include esattamente 9 comandi di deep navigation verso subTab specifici', () => {
      const deepNavCommands = STATIC_NAVIGATION_COMMANDS.filter((c) => c.category === 'deep-navigation');
      expect(deepNavCommands).toHaveLength(9);

      // Maintenance (3 tab: registro, windows, tuning)
      expect(deepNavCommands.find((c) => c.target?.section === 'maintenance' && c.target?.subTab === 'registro')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'maintenance' && c.target?.subTab === 'windows')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'maintenance' && c.target?.subTab === 'tuning')).toBeDefined();

      // Settings (4 tab)
      expect(deepNavCommands.find((c) => c.target?.section === 'settings' && c.target?.subTab === 'preferences')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'settings' && c.target?.subTab === 'appearance')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'settings' && c.target?.subTab === 'backup')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'settings' && c.target?.subTab === 'data')).toBeDefined();

      // Marketplace (2 tab)
      expect(deepNavCommands.find((c) => c.target?.section === 'marketplace' && c.target?.subTab === 'storage')).toBeDefined();
      expect(deepNavCommands.find((c) => c.target?.section === 'marketplace' && c.target?.subTab === 'sold')).toBeDefined();
    });

    it('include le azioni rapide previste dall’applicazione', () => {
      expect(STATIC_ACTION_COMMANDS.length).toBeGreaterThanOrEqual(7);

      const actionIds = STATIC_ACTION_COMMANDS.map((a) => a.actionId);
      expect(actionIds).toContain('new-movement');
      expect(actionIds).toContain('add-component');
      expect(actionIds).toContain('quick-backup');
      expect(actionIds).toContain('import-backup');
      expect(actionIds).toContain('create-checkpoint');
      expect(actionIds).toContain('open-wiki');
      expect(actionIds).toContain('open-settings');
    });
  });

  describe('2. Generazione Dinamica Comandi Componenti', () => {
    const mockComponents: Component[] = [
      {
        id: 'comp-gpu-4090',
        name: 'ASUS ROG Strix RTX 4090 OC 24GB',
        brand: 'ASUS',
        model: 'ROG Strix RTX 4090 OC',
        category: 'gpu',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'comp-cpu-7800x3d',
        name: 'AMD Ryzen 7 7800X3D',
        brand: 'AMD',
        model: 'Ryzen 7 7800X3D',
        category: 'cpu',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    const mockComputed: Record<string, ComponentComputedState> = {
      'comp-gpu-4090': {
        component: mockComponents[0],
        status: 'IN_USE',
        totalPurchaseCost: 1950,
        totalSaleRevenue: 0,
        netCost: 1950,
        daysInUse: 300,
        daysOwned: 300,
        costPerDayInUse: 6.5,
      },
      'comp-cpu-7800x3d': {
        component: mockComponents[1],
        status: 'IN_STORAGE',
        totalPurchaseCost: 420,
        totalSaleRevenue: 0,
        netCost: 420,
        daysInUse: 120,
        daysOwned: 150,
        costPerDayInUse: 3.5,
      },
    };

    it('genera comandi con metadati, etichette e target archive', () => {
      const compCommands = buildComponentCommands(mockComponents, (id) => mockComputed[id]);
      expect(compCommands).toHaveLength(2);

      const gpuCmd = compCommands.find((c) => c.id === 'component-comp-gpu-4090');
      expect(gpuCmd).toBeDefined();
      expect(gpuCmd?.label).toBe('ASUS ROG Strix RTX 4090 OC');
      expect(gpuCmd?.category).toBe('components');
      expect(gpuCmd?.target).toEqual({
        section: 'archive',
        componentId: 'comp-gpu-4090',
      });
      expect(gpuCmd?.componentMeta?.status).toBe('IN_USE');
      expect(gpuCmd?.subtitle).toContain('In Uso');
    });
  });

  describe('3. Determinismo e Punteggi del Ranking (Scoring)', () => {
    it('assegna 100 punti per match esatto', () => {
      const item = STATIC_NAVIGATION_COMMANDS[0]; // Panoramica
      const score = computeCommandScore(item, 'panoramica');
      expect(score).toBe(100);
    });

    it('assegna 80 punti se la label inizia con la query', () => {
      const item = STATIC_NAVIGATION_COMMANDS[0]; // Panoramica
      const score = computeCommandScore(item, 'pan');
      expect(score).toBe(80);
    });

    it('assegna 60 punti se la query è sottostringa della label', () => {
      const item = STATIC_NAVIGATION_COMMANDS[0]; // Panoramica
      const score = computeCommandScore(item, 'oram');
      expect(score).toBe(60);
    });

    it('assegna 40 punti per match su keyword secondaria', () => {
      const toolsCmd = STATIC_NAVIGATION_COMMANDS.find((c) => c.id === 'deep-maintenance-windows')!;
      // 'sfc' è tra le keywords di deep-maintenance-windows
      const score = computeCommandScore(toolsCmd, 'sfc');
      expect(score).toBe(40);
    });

    it('assegna 0 punti per query senza corrispondenze', () => {
      const item = STATIC_NAVIGATION_COMMANDS[0];
      const score = computeCommandScore(item, 'stringanonesistente123');
      expect(score).toBe(0);
    });
  });

  describe('4. Algoritmo di Ricerca searchCommands', () => {
    const allCommands = [...STATIC_NAVIGATION_COMMANDS, ...STATIC_ACTION_COMMANDS];

    it('restituisce i comandi di default a query vuota fino al limite', () => {
      const res = searchCommands('', allCommands, 5);
      expect(res).toHaveLength(5);
      expect(res[0].id).toBe(allCommands[0].id);
    });

    it('posiziona al primo posto il match esatto o di prefisso più rilevante', () => {
      // Query "tools" o "strumenti"
      const res = searchCommands('strumenti', allCommands, 10);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe('deep-maintenance-windows');
    });

    it('trova comandi tramite keyword tecniche (es. trim, sfc, chkdsk)', () => {
      const resTrim = searchCommands('trim', allCommands, 5);
      expect(resTrim.length).toBeGreaterThan(0);
      expect(resTrim[0].id).toBe('deep-maintenance-windows');

      const resSfc = searchCommands('sfc', allCommands, 5);
      expect(resSfc.length).toBeGreaterThan(0);
      expect(resSfc[0].id).toBe('deep-maintenance-windows');
    });

    it('trova componenti reali del database per nome, marca o modello', () => {
      const components: Component[] = [
        { id: '1', name: 'Nvidia RTX 4070 Ti', brand: 'MSI', model: 'Ventus 3X RTX 4070 Ti', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: '2', name: 'Corsair Vengeance 32GB', brand: 'Corsair', model: 'Vengeance DDR5', category: 'ram', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      const compCommands = buildComponentCommands(components);
      const combined = [...allCommands, ...compCommands];

      const res4070 = searchCommands('4070', combined, 5);
      expect(res4070.length).toBeGreaterThan(0);
      expect(res4070[0].id).toBe('component-1');

      const resCorsair = searchCommands('corsair', combined, 5);
      expect(resCorsair.length).toBeGreaterThan(0);
      expect(resCorsair[0].id).toBe('component-2');
    });

    it('gestisce correttamente il caso zero risultati restituendo un array vuoto', () => {
      const res = searchCommands('xyz999nonsenseabc', allCommands, 10);
      expect(res).toEqual([]);
    });

    it('rispetta rigorosamente il limite massimo specificato', () => {
      const resLimited = searchCommands('a', allCommands, 3);
      expect(resLimited.length).toBeLessThanOrEqual(3);
    });
  });
});
