import { describe, it, expect } from 'vitest';
import { Component, ComponentComputedState } from '../../types';
import { filterComponentsForArchive, sortComponentsForArchive } from '../archiveEngine';

describe('Archive Engine (Filter & Deterministic Sort)', () => {
  const dummyComponents: Component[] = [
    {
      id: 'comp-1',
      name: 'Samsung 980 Pro 2TB',
      brand: 'Samsung',
      model: 'MZ-V8P2T0BW',
      category: 'storage',
      notes: 'Acquistato per giochi pesanti e VM',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 'comp-2',
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      model: '100-100000910WOF',
      category: 'cpu',
      notes: 'Il re del gaming moderno',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-01T10:00:00Z',
    },
    {
      id: 'comp-3',
      name: 'Corsair Vengeance DDR5 32GB',
      brand: 'Corsair',
      model: 'CMK32GX5M2B6000Z30',
      category: 'ram',
      notes: 'Kit 6000MHz CL30',
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-01T10:00:00Z',
    },
    {
      id: 'comp-4',
      name: 'Nvidia RTX 3070 Founders',
      brand: 'Nvidia',
      model: 'RTX 3070 FE',
      category: 'gpu',
      notes: 'Venduta su Subito a inizio anno',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z',
    },
  ];

  const dummyComputedMap: Record<string, ComponentComputedState> = {
    'comp-1': {
      component: dummyComponents[0],
      status: 'IN_USE',
      totalPurchaseCost: 160,
      totalSaleRevenue: 0,
      netCost: 160,
      purchaseDate: '2024-01-15',
      daysInUse: 120,
      daysOwned: 120,
      costPerDayInUse: 1.33,
    },
    'comp-2': {
      component: dummyComponents[1],
      status: 'IN_USE',
      totalPurchaseCost: 399,
      totalSaleRevenue: 0,
      netCost: 399,
      purchaseDate: '2024-05-10',
      daysInUse: 90,
      daysOwned: 90,
      costPerDayInUse: 4.43,
    },
    'comp-3': {
      component: dummyComponents[2],
      status: 'IN_STORAGE',
      totalPurchaseCost: 125,
      totalSaleRevenue: 0,
      netCost: 125,
      purchaseDate: '2024-03-20',
      daysInUse: 0,
      daysOwned: 60,
      costPerDayInUse: null,
    },
    'comp-4': {
      component: dummyComponents[3],
      status: 'SOLD',
      totalPurchaseCost: 519,
      totalSaleRevenue: 300,
      netCost: 219,
      purchaseDate: '2023-01-10',
      saleDate: '2024-01-05',
      daysInUse: 360,
      daysOwned: 360,
      costPerDayInUse: 0.61,
    },
  };

  it('filters components matching full-text in name, brand, model and notes', () => {
    // Ricerca per brand
    const byBrand = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: 'samsung',
      category: 'all',
      status: 'all',
    });
    expect(byBrand.length).toBe(1);
    expect(byBrand[0].id).toBe('comp-1');

    // Ricerca per model
    const byModel = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: '6000Z30',
      category: 'all',
      status: 'all',
    });
    expect(byModel.length).toBe(1);
    expect(byModel[0].id).toBe('comp-3');

    // Ricerca per notes
    const byNotes = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: 'Subito',
      category: 'all',
      status: 'all',
    });
    expect(byNotes.length).toBe(1);
    expect(byNotes[0].id).toBe('comp-4');
  });

  it('filters components by category and derived status', () => {
    // Filtro categoria
    const cpus = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: '',
      category: 'cpu',
      status: 'all',
    });
    expect(cpus.length).toBe(1);
    expect(cpus[0].name).toContain('Ryzen 7');

    // Filtro stato IN_USE
    const inUse = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: '',
      category: 'all',
      status: 'IN_USE',
    });
    expect(inUse.length).toBe(2);

    // Filtro stato SOLD
    const sold = filterComponentsForArchive(dummyComponents, dummyComputedMap, {
      searchQuery: '',
      category: 'all',
      status: 'SOLD',
    });
    expect(sold.length).toBe(1);
    expect(sold[0].id).toBe('comp-4');
  });

  it('sorts components deterministically by purchase_date_desc', () => {
    const sorted = sortComponentsForArchive(dummyComponents, dummyComputedMap, 'purchase_date_desc');
    // Più recente: comp-2 (2024-05-10) -> comp-3 (2024-03-20) -> comp-1 (2024-01-15) -> comp-4 (2023-01-10)
    expect(sorted.map((c) => c.id)).toEqual(['comp-2', 'comp-3', 'comp-1', 'comp-4']);
  });

  it('sorts components deterministically by name_asc', () => {
    const sorted = sortComponentsForArchive(dummyComponents, dummyComputedMap, 'name_asc');
    // Alfabetico: AMD (comp-2) -> Corsair (comp-3) -> Nvidia (comp-4) -> Samsung (comp-1)
    expect(sorted.map((c) => c.id)).toEqual(['comp-2', 'comp-3', 'comp-4', 'comp-1']);
  });

  it('sorts components deterministically by cost_desc', () => {
    const sorted = sortComponentsForArchive(dummyComponents, dummyComputedMap, 'cost_desc');
    // Costo decrescente: comp-4 (519) -> comp-2 (399) -> comp-1 (160) -> comp-3 (125)
    expect(sorted.map((c) => c.id)).toEqual(['comp-4', 'comp-2', 'comp-1', 'comp-3']);
  });
});
