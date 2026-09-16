import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent, Checkpoint } from '../../types';
import {
  getTimelineBounds,
  getTimelineEvents,
  getEventsUpToPosition,
  getComponentStatusAtPosition,
  getComponentStatusAtDate,
  getConfigurationAtPosition,
  getConfigurationAtDate,
  getRigSummaryAtPosition,
  getRigSummaryAtDate,
  getStateAtCheckpoint,
  compareCheckpointToReconstruction,
} from '../historyEngine';

describe('Time Travel Engine (Tranche 10.3)', () => {
  // Fixture minime artificiali e indipendenti da qualsiasi dataset specifico
  const compCpu: Component = {
    id: 'c-cpu',
    name: 'AMD Ryzen 7 7800X3D',
    brand: 'AMD',
    model: '100-100000910WOF',
    category: 'cpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuOld: Component = {
    id: 'c-gpu-old',
    name: 'Nvidia RTX 3080',
    brand: 'Nvidia',
    model: 'FE 10GB',
    category: 'gpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuNew: Component = {
    id: 'c-gpu-new',
    name: 'Nvidia RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC 24GB',
    category: 'gpu',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  };

  const components = [compCpu, compGpuOld, compGpuNew];

  const sampleEvents: ComponentEvent[] = [
    // 2024-01-10: Acquisto e montaggio CPU (380€)
    {
      id: 'ev-cpu-buy',
      componentId: 'c-cpu',
      type: 'PURCHASE',
      price: 380,
      date: '2024-01-10',
      createdAt: '2024-01-10T09:00:00Z',
    },
    {
      id: 'ev-cpu-inst',
      componentId: 'c-cpu',
      type: 'INSTALL',
      slotOrLocation: 'Socket AM5',
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
    },

    // 2024-01-15: Acquisto e montaggio vecchia GPU (700€)
    {
      id: 'ev-gpu-old-buy',
      componentId: 'c-gpu-old',
      type: 'PURCHASE',
      price: 700,
      date: '2024-01-15',
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: 'ev-gpu-old-inst',
      componentId: 'c-gpu-old',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-01-15',
      createdAt: '2024-01-15T11:00:00Z',
    },

    // 2024-06-15: GIORNATA CON EVENTI MULTIPLI INFRA-GIORNALIERI
    // 1. Smontaggio vecchia GPU
    {
      id: 'ev-gpu-old-uninst',
      componentId: 'c-gpu-old',
      type: 'UNINSTALL',
      reason: 'upgrade',
      date: '2024-06-15',
      createdAt: '2024-06-15T09:00:00Z',
    },
    // 2. Acquisto nuova GPU (1800€)
    {
      id: 'ev-gpu-new-buy',
      componentId: 'c-gpu-new',
      type: 'PURCHASE',
      price: 1800,
      date: '2024-06-15',
      createdAt: '2024-06-15T10:30:00Z',
    },
    // 3. Montaggio nuova GPU
    {
      id: 'ev-gpu-new-inst',
      componentId: 'c-gpu-new',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-06-15',
      createdAt: '2024-06-15T14:00:00Z',
    },
    // 4. Spesa extra per cavo (40€)
    {
      id: 'ev-gpu-new-extra',
      componentId: 'c-gpu-new',
      type: 'EXTRA_EXPENSE',
      amount: 40,
      description: 'Cavo angolato',
      date: '2024-06-15',
      createdAt: '2024-06-15T14:30:00Z',
    },

    // 2024-06-20: Vendita vecchia GPU (450€ netti)
    {
      id: 'ev-gpu-old-sale',
      componentId: 'c-gpu-old',
      type: 'SALE',
      price: 450,
      date: '2024-06-20',
      createdAt: '2024-06-20T16:00:00Z',
    },
  ];

  describe('1. Confini Temporali della Timeline (Bounds API)', () => {
    it('restituisce null per timeline senza eventi', () => {
      expect(getTimelineBounds([])).toEqual({ minDate: null, maxDate: null });
    });

    it('identifica correttamente la prima e l’ultima data della timeline', () => {
      const bounds = getTimelineBounds(sampleEvents);
      expect(bounds.minDate).toBe('2024-01-10');
      expect(bounds.maxDate).toBe('2024-06-20');
    });

    it('ordina deterministicamente gli eventi della timeline con getTimelineEvents', () => {
      const shuffled = [...sampleEvents].reverse();
      const sorted = getTimelineEvents(shuffled);
      expect(sorted[0].id).toBe('ev-cpu-buy');
      expect(sorted[sorted.length - 1].id).toBe('ev-gpu-old-sale');
    });

    it('estrae accuratamente la porzione di eventi con getEventsUpToPosition', () => {
      const eventsStartOfDay = getEventsUpToPosition(sampleEvents, {
        date: '2024-06-15',
        boundary: 'start_of_day',
      });
      expect(eventsStartOfDay.map((e) => e.id)).toEqual([
        'ev-cpu-buy',
        'ev-cpu-inst',
        'ev-gpu-old-buy',
        'ev-gpu-old-inst',
      ]);
    });
  });

  describe('2. Date senza Eventi & Comportamento Temporale Estremo', () => {
    it('data precedente al primo evento: configurazione vuota', () => {
      const configBefore = getConfigurationAtDate(components, sampleEvents, '2020-01-01');
      expect(configBefore).toHaveLength(0);

      const summaryBefore = getRigSummaryAtDate(components, sampleEvents, '2020-01-01');
      expect(summaryBefore.componentCount).toBe(0);
      expect(summaryBefore.rigPurchaseCost).toBe(0);
    });

    it('data intermedia senza eventi (aprile 2024): configurazione stabile con CPU e vecchia GPU', () => {
      const configApril = getConfigurationAtDate(components, sampleEvents, '2024-04-01');
      expect(configApril.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-old'].sort());

      const summaryApril = getRigSummaryAtDate(components, sampleEvents, '2024-04-01');
      expect(summaryApril.componentCount).toBe(2);
      expect(summaryApril.rigPurchaseCost).toBe(1080); // 380 (CPU) + 700 (GPU vecchia)
      expect(summaryApril.categoryCounts.cpu).toBe(1);
      expect(summaryApril.categoryCounts.gpu).toBe(1);
    });

    it('data successiva all’ultimo evento (2025): configurazione finale con CPU e nuova GPU', () => {
      const configFuture = getConfigurationAtDate(components, sampleEvents, '2025-01-01');
      expect(configFuture.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-new'].sort());

      const summaryFuture = getRigSummaryAtDate(components, sampleEvents, '2025-01-01');
      expect(summaryFuture.componentCount).toBe(2);
      expect(summaryFuture.rigPurchaseCost).toBe(2220); // 380 + 1800 + 40 (extra)
    });
  });

  describe('3. Eventi Multipli nello Stesso Giorno & Temporal Position Infra-giornaliera', () => {
    const targetDate = '2024-06-15';

    it('all’inizio del giorno (start_of_day): vecchia GPU ancora montata, nuova GPU non esiste', () => {
      const configStart = getConfigurationAtPosition(components, sampleEvents, {
        date: targetDate,
        boundary: 'start_of_day',
      });
      expect(configStart.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-old'].sort());

      expect(getComponentStatusAtPosition('c-gpu-old', sampleEvents, { date: targetDate, boundary: 'start_of_day' })).toBe('IN_USE');
      expect(getComponentStatusAtPosition('c-gpu-new', sampleEvents, { date: targetDate, boundary: 'start_of_day' })).toBe('NOT_YET_PURCHASED');
    });

    it('dopo lo smontaggio della vecchia GPU (anchor: ev-gpu-old-uninst): vecchia GPU in storage, rig ha solo CPU', () => {
      const configAfterUninst = getConfigurationAtPosition(components, sampleEvents, {
        date: targetDate,
        anchorEventId: 'ev-gpu-old-uninst',
        boundary: 'after_event',
      });
      expect(configAfterUninst.map((c) => c.id)).toEqual(['c-cpu']);

      expect(getComponentStatusAtPosition('c-gpu-old', sampleEvents, { date: targetDate, anchorEventId: 'ev-gpu-old-uninst' })).toBe('IN_STORAGE');
      expect(getComponentStatusAtPosition('c-gpu-new', sampleEvents, { date: targetDate, anchorEventId: 'ev-gpu-old-uninst' })).toBe('NOT_YET_PURCHASED');

      const summary = getRigSummaryAtPosition(components, sampleEvents, {
        date: targetDate,
        anchorEventId: 'ev-gpu-old-uninst',
      });
      expect(summary.componentCount).toBe(1);
      expect(summary.rigPurchaseCost).toBe(380);
    });

    it('dopo l’acquisto della nuova GPU (anchor: ev-gpu-new-buy): nuova GPU in storage, non ancora montata', () => {
      expect(getComponentStatusAtPosition('c-gpu-new', sampleEvents, { date: targetDate, anchorEventId: 'ev-gpu-new-buy' })).toBe('IN_STORAGE');

      const configAfterBuy = getConfigurationAtPosition(components, sampleEvents, {
        date: targetDate,
        anchorEventId: 'ev-gpu-new-buy',
      });
      expect(configAfterBuy.map((c) => c.id)).toEqual(['c-cpu']);
    });

    it('dopo il montaggio della nuova GPU (anchor: ev-gpu-new-inst): nuova GPU è montata (IN_USE)', () => {
      const configAfterInst = getConfigurationAtPosition(components, sampleEvents, {
        date: targetDate,
        anchorEventId: 'ev-gpu-new-inst',
      });
      expect(configAfterInst.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-new'].sort());
      expect(getComponentStatusAtPosition('c-gpu-new', sampleEvents, { date: targetDate, anchorEventId: 'ev-gpu-new-inst' })).toBe('IN_USE');

      // Costo prima della spesa extra: 380 + 1800 = 2180
      const summary = getRigSummaryAtPosition(components, sampleEvents, {
        date: targetDate,
        anchorEventId: 'ev-gpu-new-inst',
      });
      expect(summary.rigPurchaseCost).toBe(2180);
    });

    it('a fine giornata (end_of_day o dopo ev-gpu-new-extra): include anche la spesa extra', () => {
      const summary = getRigSummaryAtDate(components, sampleEvents, targetDate);
      expect(summary.componentCount).toBe(2);
      expect(summary.rigPurchaseCost).toBe(2220); // 380 + 1800 + 40
    });
  });

  describe('4. Lifecycle Storico: Componenti Venduti e Dismessi', () => {
    it('prima della vendita (2024-06-18): vecchia GPU è IN_STORAGE', () => {
      expect(getComponentStatusAtDate('c-gpu-old', sampleEvents, '2024-06-18')).toBe('IN_STORAGE');
    });

    it('dopo la vendita (2024-06-25): vecchia GPU è SOLD e non compare nel rig montato', () => {
      expect(getComponentStatusAtDate('c-gpu-old', sampleEvents, '2024-06-25')).toBe('SOLD');
      const config = getConfigurationAtDate(components, sampleEvents, '2024-06-25');
      expect(config.some((c) => c.id === 'c-gpu-old')).toBe(false);
    });
  });

  describe('5. Integrazione Checkpoint + Time Travel', () => {
    const cpSetupIniziale: Checkpoint = {
      id: 'cp-jan-2024',
      name: 'Setup Iniziale Gennaio',
      referenceDate: '2024-01-20',
      createdAt: '2024-01-20T12:00:00Z',
      trigger: 'manual',
      componentsSnapshot: [
        {
          componentId: 'c-cpu',
          name: 'Ryzen 7 7800X3D',
          brand: 'AMD',
          model: '100-100000910WOF',
          category: 'cpu',
          purchasePrice: 380,
          slotOrLocation: 'Socket AM5',
        },
        {
          componentId: 'c-gpu-old',
          name: 'RTX 3080',
          brand: 'Nvidia',
          model: 'FE',
          category: 'gpu',
          purchasePrice: 700,
          slotOrLocation: 'PCIe 1',
        },
      ],
      summary: {
        componentCount: 2,
        rigPurchaseCost: 1080,
        categoryCounts: { cpu: 1, gpu: 1 },
      },
    };

    it('funziona perfettamente anche con 0 checkpoint esistenti (Time Travel indipendente)', () => {
      const config = getConfigurationAtDate(components, sampleEvents, '2024-01-20');
      expect(config).toHaveLength(2);
    });

    it('getStateAtCheckpoint restituisce fedelmente la fotografia congelata senza ricalcoli', () => {
      const snapshot = getStateAtCheckpoint(cpSetupIniziale);
      expect(snapshot.isFrozenSnapshot).toBe(true);
      expect(snapshot.checkpoint.id).toBe('cp-jan-2024');
      expect(snapshot.components).toHaveLength(2);
      expect(snapshot.summary.rigPurchaseCost).toBe(1080);
    });

    it('compareCheckpointToReconstruction conferma corrispondenza esatta quando gli eventi coincidono', () => {
      const discrepancy = compareCheckpointToReconstruction(cpSetupIniziale, components, sampleEvents);
      expect(discrepancy.hasDiscrepancies).toBe(false);
      expect(discrepancy.missingInReconstruction).toHaveLength(0);
      expect(discrepancy.addedInReconstruction).toHaveLength(0);
      expect(discrepancy.costDifference).toBe(0);
    });

    it('modifica retroattiva degli eventi: rileva discrepanza informativa senza alterare lo snapshot del Checkpoint', () => {
      // Simuliamo che un evento di acquisto storico sia stato modificato da 700€ a 600€
      // oppure che la GPU sia stata smontata prima
      const modifiedEvents = sampleEvents.map((e) =>
        e.id === 'ev-gpu-old-buy' ? { ...e, price: 600 } : e
      );

      const discrepancy = compareCheckpointToReconstruction(cpSetupIniziale, components, modifiedEvents);

      expect(discrepancy.hasDiscrepancies).toBe(false); // i componenti sono gli stessi
      // Ma il costo ricostruito (380 + 600 = 980) differisce da quello congelato nel checkpoint (1080):
      expect(discrepancy.costDifference).toBe(-100);

      // REGOLA ARCHITETTURALE: Il Checkpoint NON è stato toccato
      expect(cpSetupIniziale.summary.rigPurchaseCost).toBe(1080);
      expect(cpSetupIniziale.componentsSnapshot[1].purchasePrice).toBe(700);
    });

    it('gestisce checkpoint senza anchorEventId (risolve a fine giornata della referenceDate)', () => {
      const cpNoAnchor: Checkpoint = {
        ...cpSetupIniziale,
        id: 'cp-no-anchor',
        anchorEventId: null,
      };

      const discrepancy = compareCheckpointToReconstruction(cpNoAnchor, components, sampleEvents);
      expect(discrepancy.hasDiscrepancies).toBe(false);
    });

    it('gestisce checkpoint multipli infra-giornalieri tra eventi nella stessa data', () => {
      // Creiamo due checkpoint nel giorno dell'upgrade (2024-06-15):
      // Checkpoint A: salvato durante la lavorazione dopo lo smontaggio (anchor: ev-gpu-old-uninst)
      // Checkpoint B: salvato al termine dopo il montaggio e cavo (anchor: ev-gpu-new-extra)
      const cpMidUpgrade: Checkpoint = {
        id: 'cp-mid',
        name: 'Work in Progress: GPU Smontata',
        referenceDate: '2024-06-15',
        createdAt: '2024-06-15T09:30:00Z',
        anchorEventId: 'ev-gpu-old-uninst',
        trigger: 'manual',
        componentsSnapshot: [
          {
            componentId: 'c-cpu',
            name: 'Ryzen 7',
            brand: 'AMD',
            model: '7800X3D',
            category: 'cpu',
            purchasePrice: 380,
          },
        ],
        summary: { componentCount: 1, rigPurchaseCost: 380 },
      };

      const cpFinalUpgrade: Checkpoint = {
        id: 'cp-final',
        name: 'Build Completa con RTX 4090',
        referenceDate: '2024-06-15',
        createdAt: '2024-06-15T15:00:00Z',
        anchorEventId: 'ev-gpu-new-extra',
        trigger: 'suggested_upgrade',
        componentsSnapshot: [
          {
            componentId: 'c-cpu',
            name: 'Ryzen 7',
            brand: 'AMD',
            model: '7800X3D',
            category: 'cpu',
            purchasePrice: 380,
          },
          {
            componentId: 'c-gpu-new',
            name: 'RTX 4090',
            brand: 'Gigabyte',
            model: 'Gaming OC',
            category: 'gpu',
            purchasePrice: 1840,
          },
        ],
        summary: { componentCount: 2, rigPurchaseCost: 2220 },
      };

      // Entrambi vengono confrontati accuratamente rispetto al proprio punto temporale esatto
      const discMid = compareCheckpointToReconstruction(cpMidUpgrade, components, sampleEvents);
      expect(discMid.hasDiscrepancies).toBe(false);

      const discFinal = compareCheckpointToReconstruction(cpFinalUpgrade, components, sampleEvents);
      expect(discFinal.hasDiscrepancies).toBe(false);
    });
  });
});
