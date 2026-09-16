import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent } from '../../types';
import {
  createCheckpointFromCurrentRig,
  createCheckpointFromTemporalPosition,
  detectCheckpointDiscrepancy,
  sortCheckpointsChronologically,
  sortEventsChronologically,
  getConfigurationAtPosition,
  getRigSummaryAtPosition,
  getTimelineBounds,
} from '../index';
import { validateImportJSON } from '../../storage/backupService';

describe('Roadmap 10.5 — Hardening, Edge Cases & E2E Validation', () => {
  // Fixture General-Purpose Minimal (3 components, 4 events, 0 upgrades, 0 checkpoints)
  const compCpu: Component = {
    id: 'min-cpu',
    name: 'Intel Core i5-13600K',
    brand: 'Intel',
    model: 'BX8071513600K',
    category: 'cpu',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const compRam: Component = {
    id: 'min-ram',
    name: 'Corsair Vengeance DDR5 32GB',
    brand: 'Corsair',
    model: 'CMK32GX5M2B6000C30',
    category: 'ram',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const compGpu: Component = {
    id: 'min-gpu',
    name: 'Asus Dual RTX 4070',
    brand: 'Asus',
    model: 'DUAL-RTX4070-O12G',
    category: 'gpu',
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2023-03-01T00:00:00Z',
  };

  const minComponents = [compCpu, compRam, compGpu];

  const minEvents: ComponentEvent[] = [
    {
      id: 'ev-1-cpu-buy',
      componentId: 'min-cpu',
      type: 'PURCHASE',
      price: 320,
      date: '2023-01-10',
      createdAt: '2023-01-10T09:00:00Z',
    },
    {
      id: 'ev-2-cpu-inst',
      componentId: 'min-cpu',
      type: 'INSTALL',
      slotOrLocation: 'LGA 1700',
      date: '2023-01-10',
      createdAt: '2023-01-10T10:00:00Z',
    },
    {
      id: 'ev-3-ram-buy',
      componentId: 'min-ram',
      type: 'PURCHASE',
      price: 130,
      date: '2023-01-12',
      createdAt: '2023-01-12T09:00:00Z',
    },
    {
      id: 'ev-4-ram-inst',
      componentId: 'min-ram',
      type: 'INSTALL',
      slotOrLocation: 'DIMM 2+4',
      date: '2023-01-12',
      createdAt: '2023-01-12T11:00:00Z',
    },
  ];

  describe('1. Dataset General-Purpose (3 componenti, 4 eventi, 0 upgrades, 0 checkpoints)', () => {
    it('opera in modo fluido senza assunzioni sul dataset di sviluppo', () => {
      const bounds = getTimelineBounds(minEvents);
      expect(bounds.minDate).toBe('2023-01-10');
      expect(bounds.maxDate).toBe('2023-01-12');

      // Prima del primo evento
      const emptyRig = getConfigurationAtPosition(minComponents, minEvents, {
        date: '2022-12-31',
        boundary: 'end_of_day',
      });
      expect(emptyRig).toHaveLength(0);

      // Alla prima data (dopo montaggio CPU)
      const cpuOnlyRig = getConfigurationAtPosition(minComponents, minEvents, {
        date: '2023-01-10',
        boundary: 'end_of_day',
      });
      expect(cpuOnlyRig.map((c) => c.id)).toEqual(['min-cpu']);

      // Alla fine della cronologia
      const fullRig = getConfigurationAtPosition(minComponents, minEvents, {
        date: '2023-01-12',
        boundary: 'end_of_day',
      });
      expect(fullRig.map((c) => c.id).sort()).toEqual(['min-cpu', 'min-ram'].sort());

      const summary = getRigSummaryAtPosition(minComponents, minEvents, {
        date: '2023-01-12',
        boundary: 'end_of_day',
      });
      expect(summary.componentCount).toBe(2);
      expect(summary.rigPurchaseCost).toBe(450); // 320 + 130
    });
  });

  describe('2. True Retroactive Discrepancy & Checkpoint Immutability', () => {
    it('dimostra formalmente che Checkpoint Snapshot != Event Reconstruction quando gli eventi vengono alterati', () => {
      // 1. Creazione Checkpoint congelato
      const checkpoint = createCheckpointFromCurrentRig({
        name: 'Milestone Gennaio 2023',
        components: minComponents,
        events: minEvents,
        referenceDate: '2023-01-12',
      });

      expect(checkpoint.summary.rigPurchaseCost).toBe(450);
      expect(checkpoint.componentsSnapshot).toHaveLength(2);

      // 2. Modifica retroattiva: il prezzo della RAM viene ridotto a 90€ e la CPU viene retroattivamente smontata
      const alteredEvents: ComponentEvent[] = minEvents
        .map((e) => (e.id === 'ev-3-ram-buy' ? { ...e, price: 90 } : e))
        .concat([
          {
            id: 'ev-cpu-uninst-retro',
            componentId: 'min-cpu',
            type: 'UNINSTALL',
            reason: 'maintenance',
            date: '2023-01-11',
            createdAt: '2023-01-11T12:00:00Z',
          },
        ]);

      // 3. Ricostruzione dinamica tramite historyEngine
      const reconstructed = getConfigurationAtPosition(minComponents, alteredEvents, {
        date: '2023-01-12',
        boundary: 'end_of_day',
      });

      // La ricostruzione contiene solo la RAM (la CPU risulta smontata il giorno prima)
      expect(reconstructed.map((c) => c.id)).toEqual(['min-ram']);

      // 4. Comparazione informativa
      const discrepancy = detectCheckpointDiscrepancy(checkpoint, reconstructed, alteredEvents);

      expect(discrepancy.hasDiscrepancies).toBe(true);
      // CPU manca nella ricostruzione dinamica
      expect(discrepancy.missingInReconstruction.map((c) => c.componentId)).toEqual(['min-cpu']);
      // Delta costo: ricostruzione (90€) - snapshot (450€) = -360€
      expect(discrepancy.costDifference).toBe(-360);

      // 5. REGOLA INVIOLABILE: Il checkpoint originale NON è stato toccato
      expect(checkpoint.summary.rigPurchaseCost).toBe(450);
      expect(checkpoint.componentsSnapshot).toHaveLength(2);
      expect(checkpoint.componentsSnapshot.map((c) => c.componentId).sort()).toEqual(
        ['min-cpu', 'min-ram'].sort()
      );
    });

    it('preserva la leggibilità dello snapshot congelato anche se un componente viene eliminato dal catalogo', () => {
      const checkpoint = createCheckpointFromCurrentRig({
        name: 'Snapshot con Componente',
        components: [compCpu],
        events: minEvents,
        referenceDate: '2023-01-10',
      });

      // Simuliamo che compCpu venga cancellato dall'archivio componenti
      const componentsWithoutCpu: Component[] = [];

      const reconstructed = getConfigurationAtPosition(componentsWithoutCpu, minEvents, {
        date: '2023-01-10',
        boundary: 'end_of_day',
      });
      expect(reconstructed).toHaveLength(0);

      const discrepancy = detectCheckpointDiscrepancy(checkpoint, reconstructed, minEvents);
      expect(discrepancy.hasDiscrepancies).toBe(true);
      expect(discrepancy.missingInReconstruction).toHaveLength(1);
      expect(discrepancy.missingInReconstruction[0].name).toBe('Intel Core i5-13600K');

      // Lo snapshot nel Checkpoint mantiene tutte le specifiche visive memorizzate
      expect(checkpoint.componentsSnapshot[0].name).toBe('Intel Core i5-13600K');
      expect(checkpoint.componentsSnapshot[0].brand).toBe('Intel');
      expect(checkpoint.componentsSnapshot[0].category).toBe('cpu');
    });
  });

  describe('3. Multiple Checkpoints Same Day & Intra-Day Discrimination', () => {
    it('discrimina deterministicamente due checkpoint creati nella stessa data con posizioni differenti', () => {
      const dayDate = '2024-06-15';
      const dayEventsSequence: ComponentEvent[] = [
        {
          id: 'ev-uninst-old',
          componentId: 'min-cpu',
          type: 'UNINSTALL',
          reason: 'upgrade',
          date: dayDate,
          createdAt: '2024-06-15T09:00:00Z',
        },
        {
          id: 'ev-inst-new',
          componentId: 'min-gpu',
          type: 'INSTALL',
          slotOrLocation: 'PCIe 1',
          date: dayDate,
          createdAt: '2024-06-15T11:00:00Z',
        },
      ];

      // Checkpoint 1: salvato dopo lo smontaggio (ancorato a ev-uninst-old)
      const cp1 = createCheckpointFromTemporalPosition({
        name: 'Step 1: Smontaggio',
        position: { date: dayDate, anchorEventId: 'ev-uninst-old' },
        installedComponents: [],
        events: dayEventsSequence,
      });

      // Checkpoint 2: salvato dopo il montaggio della GPU (ancorato a ev-inst-new)
      const cp2 = createCheckpointFromTemporalPosition({
        name: 'Step 2: Montaggio GPU',
        position: { date: dayDate, anchorEventId: 'ev-inst-new' },
        installedComponents: [compGpu],
        events: dayEventsSequence,
      });

      // Ordinamento cronologico dei checkpoint
      const sorted = sortCheckpointsChronologically([cp2, cp1], dayEventsSequence);

      expect(sorted[0].id).toBe(cp1.id);
      expect(sorted[1].id).toBe(cp2.id);
      expect(sorted[0].summary.componentCount).toBe(0);
      expect(sorted[1].summary.componentCount).toBe(1);
    });
  });

  describe('4. Backup JSON & Checkpoint Resilienza (Schema Versioning & Legacy)', () => {
    it('accetta e ripristina un backup contenente checkpoints validi', () => {
      const dumpWithCheckpoints = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
        settings: {
          currency: 'EUR',
          dateFormat: 'DD/MM/YYYY',
        },
        components: [compCpu],
        events: [minEvents[0], minEvents[1]],
        upgrades: [],
        checkpoints: [
          {
            id: 'cp-dump-1',
            name: 'Backup Milestone',
            referenceDate: '2023-01-10',
            createdAt: '2023-01-10T12:00:00Z',
            trigger: 'manual',
            anchorEventId: null,
            relatedUpgradeId: null,
            componentsSnapshot: [
              {
                componentId: 'min-cpu',
                name: 'Intel Core i5',
                brand: 'Intel',
                model: '13600K',
                category: 'cpu',
                purchasePrice: 320,
              },
            ],
            summary: {
              componentCount: 1,
              rigPurchaseCost: 320,
              categoryCounts: { cpu: 1 },
            },
          },
        ],
      };

      const validation = validateImportJSON(JSON.stringify(dumpWithCheckpoints));
      expect(validation.isValid).toBe(true);
      if (validation.isValid) {
        expect(validation.parsedData.checkpoints).toHaveLength(1);
        expect(validation.parsedData.checkpoints![0].id).toBe('cp-dump-1');
      }
    });

    it('gestisce retro-compatibilità con backup legacy senza campo checkpoints (checkpoints = [])', () => {
      const legacyDump = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
        settings: {},
        components: [compCpu],
        events: [],
        upgrades: [],
        // checkpoints omesso
      };

      const validation = validateImportJSON(JSON.stringify(legacyDump));
      expect(validation.isValid).toBe(true);
      if (validation.isValid) {
        expect(validation.parsedData.checkpoints).toBeDefined();
        expect(validation.parsedData.checkpoints).toEqual([]);
      }
    });

    it('rifiuta un dump con checkpoints corrotti senza alterare nulla', () => {
      const corruptDump = {
        schemaVersion: 1,
        appVersion: '0.1.0',
        exportedAt: new Date().toISOString(),
        components: [],
        events: [],
        upgrades: [],
        checkpoints: [
          {
            // ID mancante, nome mancante, snapshot mancante
            trigger: 'invalid_trigger',
          },
        ],
      };

      const validation = validateImportJSON(JSON.stringify(corruptDump));
      expect(validation.isValid).toBe(false);
      if (!validation.isValid) {
        expect(validation.error).toBeDefined();
        expect(typeof validation.error).toBe('string');
      }
    });
  });

  describe('5. Determinismo dell’Ordinamento Temporale', () => {
    it('risolve correttamente eventi con stessa data, stesso createdAt ma tipi differenti', () => {
      const sameTimestamp = '2024-05-01T10:00:00Z';
      const eventsSameMoment: ComponentEvent[] = [
        { id: 'ev-sale', componentId: 'c1', type: 'SALE', price: 100, date: '2024-05-01', createdAt: sameTimestamp },
        { id: 'ev-inst', componentId: 'c1', type: 'INSTALL', date: '2024-05-01', createdAt: sameTimestamp },
        { id: 'ev-uninst', componentId: 'c1', type: 'UNINSTALL', date: '2024-05-01', createdAt: sameTimestamp },
        { id: 'ev-buy', componentId: 'c1', type: 'PURCHASE', price: 200, date: '2024-05-01', createdAt: sameTimestamp },
      ];

      const sorted = sortEventsChronologically(eventsSameMoment);

      // Priorità logica: PURCHASE (1) -> UNINSTALL (2) -> INSTALL (3) -> SALE (5)
      expect(sorted.map((e) => e.type)).toEqual(['PURCHASE', 'UNINSTALL', 'INSTALL', 'SALE']);
    });

    it('adotta tie-breaker deterministico su ID a parità di data, timestamp e tipo', () => {
      const sameTimestamp = '2024-05-01T10:00:00Z';
      const identicalEvents: ComponentEvent[] = [
        { id: 'ev-z', componentId: 'c1', type: 'PURCHASE', price: 50, date: '2024-05-01', createdAt: sameTimestamp },
        { id: 'ev-a', componentId: 'c1', type: 'PURCHASE', price: 50, date: '2024-05-01', createdAt: sameTimestamp },
        { id: 'ev-m', componentId: 'c1', type: 'PURCHASE', price: 50, date: '2024-05-01', createdAt: sameTimestamp },
      ];

      const sorted = sortEventsChronologically(identicalEvents);
      expect(sorted.map((e) => e.id)).toEqual(['ev-a', 'ev-m', 'ev-z']);
    });
  });
});
