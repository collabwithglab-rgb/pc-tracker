import { describe, it, expect } from 'vitest';
import {
  computeTotalPurchased,
  computeTotalRecovered,
  computeHistoricalNetCost,
  computeCurrentRigCost,
  computeComponentNetCost,
} from '../financialEngine';
import {
  computeComponentStatus,
  computeDaysInUse,
  computeComponentComputedState,
} from '../lifecycleEngine';
import { getConfigurationAtDate, getComponentStatusAtDate } from '../historyEngine';
import { computeUpgradeSummary } from '../upgradeEngine';
import { Component, ComponentEvent, Upgrade } from '../../types';

describe('Domain Layer: Financial Engine', () => {
  const comp: Component = {
    id: 'c1',
    name: 'RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC',
    category: 'gpu',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  };

  const events: ComponentEvent[] = [
    {
      id: 'e1',
      componentId: 'c1',
      date: '2024-01-10',
      type: 'PURCHASE',
      price: 1000,
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'e2',
      componentId: 'c1',
      date: '2024-02-01',
      type: 'EXTRA_EXPENSE',
      amount: 50,
      description: 'Thermal pads',
      createdAt: '2024-02-01T10:00:00Z',
    },
    {
      id: 'e3',
      componentId: 'c1',
      date: '2024-06-01',
      type: 'SALE',
      price: 700,
      shippingCost: 20,
      fees: 30,
      createdAt: '2024-06-01T10:00:00Z',
    },
  ];

  it('calcola correttamente il Totale Acquistato Storico', () => {
    expect(computeTotalPurchased(events)).toBe(1050);
  });

  it('calcola correttamente il Totale Recuperato dalle Vendite al netto di fee e spedizione', () => {
    // 700 - 20 - 30 = 650
    expect(computeTotalRecovered(events)).toBe(650);
  });

  it('calcola correttamente il Costo Netto Storico', () => {
    // 1050 - 650 = 400
    expect(computeHistoricalNetCost(events)).toBe(400);
  });

  it('calcola il costo netto di un singolo componente', () => {
    expect(computeComponentNetCost('c1', events)).toBe(400);
  });

  it('calcola il costo della configurazione attuale per soli componenti IN_USE', () => {
    // Se c1 è venduta, il costo attuale è 0
    expect(computeCurrentRigCost([comp], events)).toBe(0);

    // Se aggiungiamo un componente montato
    const activeComp: Component = {
      id: 'c2',
      name: 'i7 14700K',
      brand: 'Intel',
      model: '14700K',
      category: 'cpu',
      createdAt: '',
      updatedAt: '',
    };
    const activeEvents: ComponentEvent[] = [
      { id: 'a1', componentId: 'c2', date: '2024-01-10', type: 'PURCHASE', price: 420, createdAt: '' },
      { id: 'a2', componentId: 'c2', date: '2024-01-11', type: 'INSTALL', createdAt: '' },
    ];
    expect(computeCurrentRigCost([comp, activeComp], [...events, ...activeEvents])).toBe(420);
  });
});

describe('Domain Layer: Lifecycle Engine', () => {
  const comp: Component = {
    id: 'c1',
    name: 'RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC',
    category: 'gpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('identifica correttamente lo stato derivato per ogni tipo terminale', () => {
    const basePurchase: ComponentEvent = {
      id: 'e1',
      componentId: 'c1',
      date: '2024-01-01',
      type: 'PURCHASE',
      price: 500,
      createdAt: '2024-01-01T00:00:00Z',
    };

    // Solo acquisto -> IN_STORAGE
    expect(computeComponentStatus([basePurchase])).toBe('IN_STORAGE');

    // Montaggio -> IN_USE
    const installEv: ComponentEvent = {
      id: 'e2',
      componentId: 'c1',
      date: '2024-01-02',
      type: 'INSTALL',
      createdAt: '2024-01-02T00:00:00Z',
    };
    expect(computeComponentStatus([basePurchase, installEv])).toBe('IN_USE');

    // Rimozione -> IN_STORAGE
    const uninstallEv: ComponentEvent = {
      id: 'e3',
      componentId: 'c1',
      date: '2024-02-01',
      type: 'UNINSTALL',
      createdAt: '2024-02-01T00:00:00Z',
    };
    expect(computeComponentStatus([basePurchase, installEv, uninstallEv])).toBe('IN_STORAGE');

    // Vendita -> SOLD
    const saleEv: ComponentEvent = {
      id: 'e4',
      componentId: 'c1',
      date: '2024-02-15',
      type: 'SALE',
      price: 400,
      createdAt: '2024-02-15T00:00:00Z',
    };
    expect(computeComponentStatus([basePurchase, installEv, uninstallEv, saleEv])).toBe('SOLD');

    // Regalo -> GIFTED
    const giftEv: ComponentEvent = {
      id: 'e5',
      componentId: 'c1',
      date: '2024-02-15',
      type: 'GIFT',
      recipient: 'Fratello',
      createdAt: '2024-02-15T00:00:00Z',
    };
    expect(computeComponentStatus([basePurchase, installEv, uninstallEv, giftEv])).toBe('GIFTED');

    // Smaltimento -> DISPOSED
    const disposalEv: ComponentEvent = {
      id: 'e6',
      componentId: 'c1',
      date: '2024-02-15',
      type: 'DISPOSAL',
      disposalMethod: 'eco_center',
      createdAt: '2024-02-15T00:00:00Z',
    };
    expect(computeComponentStatus([basePurchase, installEv, uninstallEv, disposalEv])).toBe(
      'DISPOSED'
    );
  });

  it('calcola correttamente i giorni di montaggio effettivo', () => {
    const events: ComponentEvent[] = [
      {
        id: '1',
        componentId: 'c1',
        date: '2024-01-01',
        type: 'INSTALL',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        componentId: 'c1',
        date: '2024-01-11',
        type: 'UNINSTALL',
        createdAt: '2024-01-11T00:00:00Z',
      },
    ];

    // 10 giorni
    expect(computeDaysInUse(events, '2024-01-20')).toBe(10);
  });

  it('calcola lo stato computato completo del componente con costo al giorno', () => {
    const events: ComponentEvent[] = [
      { id: '1', componentId: 'c1', date: '2024-01-01', type: 'PURCHASE', price: 600, createdAt: '' },
      { id: '2', componentId: 'c1', date: '2024-01-01', type: 'INSTALL', createdAt: '' },
      { id: '3', componentId: 'c1', date: '2024-01-11', type: 'UNINSTALL', createdAt: '' },
      { id: '4', componentId: 'c1', date: '2024-01-15', type: 'SALE', price: 500, createdAt: '' },
    ];

    const state = computeComponentComputedState(comp, events);
    expect(state.status).toBe('SOLD');
    expect(state.totalPurchaseCost).toBe(600);
    expect(state.totalSaleRevenue).toBe(500);
    expect(state.netCost).toBe(100);
    expect(state.daysInUse).toBe(10);
    // Costo/giorno: 100€ / 10 giorni = 10€/giorno
    expect(state.costPerDayInUse).toBe(10);
  });
});

describe('Domain Layer: History Engine (Point-in-Time PC Rig)', () => {
  const compCpu: Component = {
    id: 'cpu1',
    name: 'Ryzen 7 7800X3D',
    brand: 'AMD',
    model: '7800X3D',
    category: 'cpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuOld: Component = {
    id: 'gpu1',
    name: 'GeForce RTX 3080',
    brand: 'EVGA',
    model: 'FTW3',
    category: 'gpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuNew: Component = {
    id: 'gpu2',
    name: 'GeForce RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC',
    category: 'gpu',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  };

  const components = [compCpu, compGpuOld, compGpuNew];

  const events: ComponentEvent[] = [
    // CPU montata e rimasta nel tempo
    { id: '1', componentId: 'cpu1', date: '2024-01-01', type: 'PURCHASE', price: 400, createdAt: '' },
    { id: '2', componentId: 'cpu1', date: '2024-01-02', type: 'INSTALL', createdAt: '' },

    // RTX 3080 montata a gennaio e smontata/venduta a giugno
    { id: '3', componentId: 'gpu1', date: '2024-01-01', type: 'PURCHASE', price: 700, createdAt: '' },
    { id: '4', componentId: 'gpu1', date: '2024-01-02', type: 'INSTALL', createdAt: '' },
    { id: '5', componentId: 'gpu1', date: '2024-06-01', type: 'UNINSTALL', createdAt: '' },
    { id: '6', componentId: 'gpu1', date: '2024-06-05', type: 'SALE', price: 450, createdAt: '' },

    // RTX 4090 comprata e montata il 2 giugno
    { id: '7', componentId: 'gpu2', date: '2024-06-02', type: 'PURCHASE', price: 1600, createdAt: '' },
    { id: '8', componentId: 'gpu2', date: '2024-06-02', type: 'INSTALL', createdAt: '' },
  ];

  it('ricostruisce il PC a marzo 2024 (CPU + RTX 3080)', () => {
    const configMarch = getConfigurationAtDate(components, events, '2024-03-15');
    expect(configMarch.map((c) => c.id)).toEqual(['cpu1', 'gpu1']);
  });

  it('ricostruisce il PC a luglio 2024 (CPU + RTX 4090)', () => {
    const configJuly = getConfigurationAtDate(components, events, '2024-07-01');
    expect(configJuly.map((c) => c.id)).toEqual(['cpu1', 'gpu2']);
  });

  it('determina correttamente lo stato storico della RTX 3080 dopo la vendita', () => {
    expect(getComponentStatusAtDate('gpu1', events, '2024-03-01')).toBe('IN_USE');
    expect(getComponentStatusAtDate('gpu1', events, '2024-06-03')).toBe('IN_STORAGE');
    expect(getComponentStatusAtDate('gpu1', events, '2024-06-10')).toBe('SOLD');
  });
});

describe('Domain Layer: Upgrade Engine', () => {
  const compOld: Component = {
    id: 'old1',
    name: 'RTX 3080',
    brand: 'EVGA',
    model: 'FTW3',
    category: 'gpu',
    createdAt: '',
    updatedAt: '',
  };
  const compNew: Component = {
    id: 'new1',
    name: 'RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC',
    category: 'gpu',
    createdAt: '',
    updatedAt: '',
  };

  const upgrade: Upgrade = {
    id: 'u1',
    date: '2024-06-02',
    category: 'gpu',
    oldComponentId: 'old1',
    newComponentId: 'new1',
  };

  const events: ComponentEvent[] = [
    { id: '1', componentId: 'old1', date: '2023-01-01', type: 'PURCHASE', price: 750, createdAt: '' },
    { id: '2', componentId: 'old1', date: '2024-06-05', type: 'SALE', price: 400, createdAt: '' },
    { id: '3', componentId: 'new1', date: '2024-06-02', type: 'PURCHASE', price: 1650, createdAt: '' },
  ];

  it('calcola esattamente il costo netto dell upgrade (Costo Nuovo - Ricavo Vecchio)', () => {
    const summary = computeUpgradeSummary(upgrade, [compOld, compNew], events);
    expect(summary.newComponentCost).toBe(1650);
    expect(summary.oldComponentRecovered).toBe(400);
    // 1650 - 400 = 1250
    expect(summary.netUpgradeCost).toBe(1250);
  });
});
