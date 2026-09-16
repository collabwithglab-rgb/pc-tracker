import { describe, it, expect } from 'vitest';
import userRigData from './fixtures/userRigSeed.json';
import {
  computeTotalPurchased,
  computeTotalRecovered,
  computeHistoricalNetCost,
  computeCurrentRigCost,
  computeComponentComputedState,
  computeComponentStatus,
} from '../index';
import { DatabaseSchema } from '../../types';

describe('User Rig Real Data Verification', () => {
  const schema = userRigData as unknown as DatabaseSchema;
  const components = schema.components;
  const events = schema.events;
  const upgrades = schema.upgrades;

  it('contains exactly 29 components, 62 events and 5 upgrades', () => {
    expect(components.length).toBe(29);
    expect(events.length).toBe(62);
    expect(upgrades.length).toBe(5);
  });

  it('validates referential integrity for all events and upgrades', () => {
    const compIds = new Set(components.map((c) => c.id));
    for (const ev of events) {
      expect(compIds.has(ev.componentId)).toBe(true);
    }
    for (const up of upgrades) {
      if (up.oldComponentId) {
        expect(compIds.has(up.oldComponentId)).toBe(true);
      }
      expect(compIds.has(up.newComponentId)).toBe(true);
    }
  });

  it('matches all financial metrics from the user document to the cent', () => {
    const totalPurchased = computeTotalPurchased(events);
    const totalRecovered = computeTotalRecovered(events);
    const historicalNetCost = computeHistoricalNetCost(events);
    const currentRigCost = computeCurrentRigCost(components, events);

    // Totale Acquistato Storico: € 2832.55
    expect(totalPurchased).toBeCloseTo(2832.55, 2);

    // Totale Recuperato dalle Vendite: € 45.00 (Alimentatore Thermaltake)
    expect(totalRecovered).toBeCloseTo(45.0, 2);

    // Costo Netto Storico: € 2787.55
    expect(historicalNetCost).toBeCloseTo(2787.55, 2);

    // Valore Totale Setup Attivo nel PC / Postazione (22 pezzi IN_USE):
    // 1970.57 (interno) + 356.24 (display) + 332.78 (periferiche) = 2659.59 €
    expect(currentRigCost).toBeCloseTo(2659.59, 2);
  });

  it('verifies correct derived states for sold, stored and active components', () => {
    // 1 pezzo VENDUTO
    const psuThermaltake = components.find((c) => c.id === 'comp-psu-thermaltake-tr2s-700w')!;
    const psuEvents = events.filter((e) => e.componentId === psuThermaltake.id);
    expect(computeComponentStatus(psuEvents)).toBe('SOLD');
    const psuState = computeComponentComputedState(psuThermaltake, psuEvents);
    expect(psuState.netCost).toBe(6.0); // 51.00 - 45.00 = 6.00 € delta spesa

    // 6 pezzi IN MAGAZZINO / SCORTA
    const storageIds = [
      'comp-periph-logitech-g413-tkl',
      'comp-periph-ajazz-ak820-pro',
      'comp-periph-razer-blackshark-v2x',
      'comp-periph-dacoity-gaming-rgb',
      'comp-cooler-cooler-master-i70c',
      'comp-cooler-intel-laminar-rm1',
    ];
    for (const id of storageIds) {
      const comp = components.find((c) => c.id === id)!;
      const compEvs = events.filter((e) => e.componentId === comp.id);
      expect(computeComponentStatus(compEvs)).toBe('IN_STORAGE');
    }

    // 22 pezzi ATTIVI IN USO
    const inUseComponents = components.filter((c) => {
      const compEvs = events.filter((e) => e.componentId === c.id);
      return computeComponentStatus(compEvs) === 'IN_USE';
    });
    expect(inUseComponents.length).toBe(22);
  });
});
