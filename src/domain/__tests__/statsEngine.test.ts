import { describe, it, expect } from 'vitest';
import { computeRigStats } from '../statsEngine';
import { Component, ComponentEvent, Upgrade } from '../../types';
import userRigData from './fixtures/userRigSeed.json';

describe('statsEngine pure functions and domain logic', () => {
  // 1. Dataset Vuoto
  it('handles an empty dataset gracefully without NaN, Infinity or errors', () => {
    const stats = computeRigStats([], [], []);

    expect(stats.timeRange.firstYear).toBeNull();
    expect(stats.timeRange.lastYear).toBeNull();
    expect(stats.timeRange.totalYearsCount).toBe(0);
    expect(stats.timeRange.totalComponentsCount).toBe(0);

    expect(stats.financial.totalPurchased).toBe(0);
    expect(stats.financial.totalRecovered).toBe(0);
    expect(stats.financial.historicalNetCost).toBe(0);
    expect(stats.financial.currentRigCost).toBe(0);
    expect(stats.financial.soldComponentsCount).toBe(0);
    expect(stats.financial.totalCostOfSold).toBe(0);
    expect(stats.financial.recoveryRateOnSold).toBe(0);

    expect(stats.categories).toEqual([]);
    expect(stats.years).toEqual([]);
    expect(stats.peakYear).toBeNull();

    expect(stats.longevity.mostUsedComponent).toBeNull();
    expect(stats.longevity.avgDaysInUseActive).toBe(0);
    expect(stats.longevity.avgDaysInUseAll).toBe(0);
    expect(stats.longevity.medianDaysInUse).toBe(0);
    expect(stats.longevity.neverMountedCount).toBe(0);
    expect(stats.longevity.bestCostPerDayComponent).toBeNull();
    expect(stats.longevity.componentDurations).toEqual([]);

    expect(stats.topExpensive).toEqual([]);
    expect(stats.soldComponents).toEqual([]);

    expect(stats.upgrades.totalUpgrades).toBe(0);
    expect(stats.upgrades.totalInvested).toBe(0);
    expect(stats.upgrades.totalRecovered).toBe(0);
    expect(stats.upgrades.totalNetCost).toBe(0);
    expect(stats.upgrades.mostUpgradedCategory).toBeNull();
  });

  // 2. Componenti senza eventi
  it('handles components without events correctly (0 days in use, cost 0, neverMounted)', () => {
    const components: Component[] = [
      { id: 'c1', name: 'Spare Cable', brand: 'Brand', model: 'M', category: 'accessories', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c2', name: 'Backup Drive', brand: 'Brand', model: 'D', category: 'storage', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const stats = computeRigStats(components, [], []);

    expect(stats.timeRange.totalComponentsCount).toBe(2);
    expect(stats.financial.totalPurchased).toBe(0);
    expect(stats.longevity.neverMountedCount).toBe(2);
    expect(stats.longevity.avgDaysInUseActive).toBe(0);
    expect(stats.longevity.avgDaysInUseAll).toBe(0);
    expect(stats.longevity.medianDaysInUse).toBe(0);
    expect(stats.longevity.componentDurations.length).toBe(2);
    expect(stats.longevity.componentDurations[0].costPerDay).toBeNull();
    expect(stats.longevity.componentDurations[1].costPerDay).toBeNull();
  });

  // 3. Aggregazione Spesa per Categoria e Percentuali
  it('aggregates category spending and calculates exact percentages and counts', () => {
    const components: Component[] = [
      { id: 'gpu1', name: 'RTX 4070', brand: 'NVIDIA', model: 'FE', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'cpu1', name: 'i5 14500', brand: 'Intel', model: '14500', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'cpu2', name: 'i3 12100', brand: 'Intel', model: '12100', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'gpu1', type: 'PURCHASE', date: '2024-01-10', price: 600, createdAt: '2024-01-10' },
      { id: 'e2', componentId: 'cpu1', type: 'PURCHASE', date: '2024-01-12', price: 250, createdAt: '2024-01-12' },
      { id: 'e3', componentId: 'cpu2', type: 'PURCHASE', date: '2024-01-15', price: 150, createdAt: '2024-01-15' },
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.financial.totalPurchased).toBe(1000);
    expect(stats.categories.length).toBe(2);

    // GPU: 600€ (60.0%) [1 pezzo]
    expect(stats.categories[0].category).toBe('gpu');
    expect(stats.categories[0].totalSpent).toBe(600);
    expect(stats.categories[0].percentage).toBe(60.0);
    expect(stats.categories[0].componentsCount).toBe(1);

    // CPU: 400€ (40.0%) [2 pezzi]
    expect(stats.categories[1].category).toBe('cpu');
    expect(stats.categories[1].totalSpent).toBe(400);
    expect(stats.categories[1].percentage).toBe(40.0);
    expect(stats.categories[1].componentsCount).toBe(2);
  });

  // 4. Extra Expenses e attribuzione categoria/anno
  it('correctly calculates extra expenses and attributes them to the component category and year', () => {
    const components: Component[] = [
      { id: 'gpu1', name: 'RTX 4080', brand: 'NVIDIA', model: 'FE', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'gpu1', type: 'PURCHASE', date: '2024-01-10', price: 1000, createdAt: '2024-01-10' },
      { id: 'e2', componentId: 'gpu1', type: 'EXTRA_EXPENSE', date: '2025-02-15', amount: 150, description: 'Waterblock', createdAt: '2025-02-15' },
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.financial.totalPurchased).toBe(1150);
    expect(stats.categories[0].category).toBe('gpu');
    expect(stats.categories[0].totalSpent).toBe(1150);
    expect(stats.categories[0].percentage).toBe(100);

    // Spesa per anno: 2024 (1000) e 2025 (150)
    expect(stats.years.length).toBe(2);
    expect(stats.years[0].year).toBe('2024');
    expect(stats.years[0].totalSpent).toBe(1000);
    expect(stats.years[0].isPeakYear).toBe(true);
    expect(stats.years[1].year).toBe('2025');
    expect(stats.years[1].totalSpent).toBe(150);
    expect(stats.years[1].isPeakYear).toBe(false);
    expect(stats.peakYear?.year).toBe('2024');
  });

  // 5. Determinazione Peak Year
  it('identifies the peak spending year accurately', () => {
    const components: Component[] = [
      { id: 'c1', name: 'Part 1', brand: 'B', model: 'M', category: 'case', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
      { id: 'c2', name: 'Part 2', brand: 'B', model: 'M', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c3', name: 'Part 3', brand: 'B', model: 'M', category: 'ram', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2023-05-10', price: 100, createdAt: '2023-05-10' },
      { id: 'e2', componentId: 'c2', type: 'PURCHASE', date: '2024-06-20', price: 800, createdAt: '2024-06-20' },
      { id: 'e3', componentId: 'c3', type: 'PURCHASE', date: '2025-01-15', price: 150, createdAt: '2025-01-15' },
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.years.length).toBe(3);
    expect(stats.peakYear?.year).toBe('2024');
    expect(stats.peakYear?.totalSpent).toBe(800);
    expect(stats.peakYear?.percentage).toBe(76.2);
  });

  // 6. Longevità, Media Giorni d'Uso e Mediana
  it('calculates longevity, median and active/all averages correctly', () => {
    const components: Component[] = [
      { id: 'c1', name: 'CPU A', brand: 'Intel', model: '1', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c2', name: 'CPU B', brand: 'AMD', model: '2', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c3', name: 'CPU C', brand: 'Intel', model: '3', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      // c1: 100 giorni d'uso, costo 200€ -> 2.00 €/die
      { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01', price: 200, createdAt: '2024-01-01' },
      { id: 'e2', componentId: 'c1', type: 'INSTALL', date: '2024-01-01', createdAt: '2024-01-01' },
      { id: 'e3', componentId: 'c1', type: 'UNINSTALL', date: '2024-04-10', createdAt: '2024-04-10' },

      // c2: 50 giorni d'uso, costo 50€ -> 1.00 €/die (migliore ammortamento)
      { id: 'e4', componentId: 'c2', type: 'PURCHASE', date: '2024-01-01', price: 50, createdAt: '2024-01-01' },
      { id: 'e5', componentId: 'c2', type: 'INSTALL', date: '2024-01-01', createdAt: '2024-01-01' },
      { id: 'e6', componentId: 'c2', type: 'UNINSTALL', date: '2024-02-20', createdAt: '2024-02-20' },

      // c3: mai montato (0 giorni d'uso)
      { id: 'e7', componentId: 'c3', type: 'PURCHASE', date: '2024-01-01', price: 80, createdAt: '2024-01-01' },
    ];

    const stats = computeRigStats(components, events, [], '2024-05-01');

    expect(stats.longevity.neverMountedCount).toBe(1);
    expect(stats.longevity.mostUsedComponent?.id).toBe('c1');
    expect(stats.longevity.mostUsedComponent?.daysInUse).toBe(100);

    // Medie: c1=100gg, c2=50gg, c3=0gg
    // Attivi: (100 + 50) / 2 = 75.0 gg
    expect(stats.longevity.avgDaysInUseActive).toBe(75.0);
    // Tutti: (100 + 50 + 0) / 3 = 50.0 gg
    expect(stats.longevity.avgDaysInUseAll).toBe(50.0);
    // Mediana di [0, 50, 100] = 50
    expect(stats.longevity.medianDaysInUse).toBe(50);
  });

  // 7. Componenti mai montati e costPerDay null
  it('ensures never mounted components have costPerDay set to null and no NaN or Infinity', () => {
    const components: Component[] = [
      { id: 'c1', name: 'Spare Fan', brand: 'Noctua', model: 'A12', category: 'cooling', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01', price: 30, createdAt: '2024-01-01' },
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.longevity.neverMountedCount).toBe(1);
    expect(stats.longevity.componentDurations[0].daysInUse).toBe(0);
    expect(stats.longevity.componentDurations[0].costPerDay).toBeNull();
    expect(Number.isNaN(stats.longevity.avgDaysInUseActive)).toBe(false);
    expect(Number.isFinite(stats.longevity.avgDaysInUseActive)).toBe(true);
    expect(stats.longevity.bestCostPerDayComponent).toBeNull();
  });

  // 8. Miglior ammortamento al giorno (€/die)
  it('finds best costPerDay component by accurate ratio', () => {
    const components: Component[] = [
      { id: 'c1', name: 'Part A', brand: 'B', model: 'M', category: 'psu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c2', name: 'Part B', brand: 'B', model: 'M', category: 'cooling', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      // c1: 6€ netto per 600 giorni -> 0.010 €/die
      { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01', price: 50, createdAt: '2024-01-01' },
      { id: 'e2', componentId: 'c1', type: 'INSTALL', date: '2024-01-01', createdAt: '2024-01-01' },
      { id: 'e3', componentId: 'c1', type: 'UNINSTALL', date: '2025-08-23', createdAt: '2025-08-23' },
      { id: 'e4', componentId: 'c1', type: 'SALE', date: '2025-08-23', price: 44, createdAt: '2025-08-23' },

      // c2: 15€ netto per 150 giorni -> 0.100 €/die
      { id: 'e5', componentId: 'c2', type: 'PURCHASE', date: '2024-01-01', price: 15, createdAt: '2024-01-01' },
      { id: 'e6', componentId: 'c2', type: 'INSTALL', date: '2024-01-01', createdAt: '2024-01-01' },
      { id: 'e7', componentId: 'c2', type: 'UNINSTALL', date: '2024-05-30', createdAt: '2024-05-30' },
    ];

    const stats = computeRigStats(components, events, [], '2025-09-01');

    expect(stats.longevity.bestCostPerDayComponent?.id).toBe('c1');
    expect(stats.longevity.bestCostPerDayComponent?.costPerDay).toBe(0.01);
  });

  // 9. Top Componenti Più Costosi
  it('ranks top expensive components by total historical cost including extra expenses', () => {
    const components: Component[] = [
      { id: 'c1', name: 'GPU', brand: 'N', model: '4070', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c2', name: 'SSD', brand: 'S', model: '990', category: 'storage', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c3', name: 'CPU', brand: 'I', model: '14500', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01', price: 600, createdAt: '2024-01-01' },
      { id: 'e2', componentId: 'c2', type: 'PURCHASE', date: '2024-01-01', price: 300, createdAt: '2024-01-01' },
      { id: 'e3', componentId: 'c2', type: 'EXTRA_EXPENSE', date: '2024-02-01', amount: 50, description: 'Heatsink', createdAt: '2024-02-01' },
      { id: 'e4', componentId: 'c3', type: 'PURCHASE', date: '2024-01-01', price: 250, createdAt: '2024-01-01' },
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.topExpensive.length).toBe(3);
    expect(stats.topExpensive[0].name).toBe('GPU');
    expect(stats.topExpensive[0].totalHistoricalCost).toBe(600);
    expect(stats.topExpensive[1].name).toBe('SSD');
    expect(stats.topExpensive[1].totalHistoricalCost).toBe(350);
    expect(stats.topExpensive[2].name).toBe('CPU');
    expect(stats.topExpensive[2].totalHistoricalCost).toBe(250);
  });

  // 10. Componenti Venduti e Percentuale di Recupero
  it('correctly reports sold components and recovery percentage without ROI wording', () => {
    const components: Component[] = [
      { id: 'psu1', name: 'Old PSU', brand: 'Brand', model: '700W', category: 'psu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'psu1', type: 'PURCHASE', date: '2024-01-01', price: 50, createdAt: '2024-01-01' },
      { id: 'e2', componentId: 'psu1', type: 'SALE', date: '2024-06-01', price: 45, fees: 5, createdAt: '2024-06-01' }, // Ricavo netto = 40€
    ];

    const stats = computeRigStats(components, events, []);

    expect(stats.financial.soldComponentsCount).toBe(1);
    expect(stats.financial.totalRecovered).toBe(40);
    expect(stats.financial.totalCostOfSold).toBe(50);
    // Recovery rate: (40 / 50) * 100 = 80.0%
    expect(stats.financial.recoveryRateOnSold).toBe(80.0);

    expect(stats.soldComponents.length).toBe(1);
    expect(stats.soldComponents[0].name).toBe('Old PSU');
    expect(stats.soldComponents[0].totalCost).toBe(50);
    expect(stats.soldComponents[0].netRevenue).toBe(40);
    expect(stats.soldComponents[0].deltaBalance).toBe(-10);
    expect(stats.soldComponents[0].recoveryPercentage).toBe(80.0);
  });

  // 11. Statistiche Upgrade
  it('aggregates upgrade data accurately using upgradeEngine', () => {
    const components: Component[] = [
      { id: 'old1', name: 'GTX 1060', brand: 'N', model: '1060', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'new1', name: 'RTX 4070', brand: 'N', model: '4070', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'old1', type: 'PURCHASE', date: '2022-01-01', price: 250, createdAt: '2022-01-01' },
      { id: 'e2', componentId: 'old1', type: 'SALE', date: '2024-01-01', price: 100, createdAt: '2024-01-01' },
      { id: 'e3', componentId: 'new1', type: 'PURCHASE', date: '2024-01-01', price: 600, createdAt: '2024-01-01' },
    ];
    const upgrades: Upgrade[] = [
      { id: 'up1', date: '2024-01-01', category: 'gpu', oldComponentId: 'old1', newComponentId: 'new1' },
    ];

    const stats = computeRigStats(components, events, upgrades);

    expect(stats.upgrades.totalUpgrades).toBe(1);
    expect(stats.upgrades.totalInvested).toBe(600);
    expect(stats.upgrades.totalRecovered).toBe(100);
    expect(stats.upgrades.totalNetCost).toBe(500);
    expect(stats.upgrades.mostUpgradedCategory).toBe('gpu');
    expect(stats.upgrades.categoryCount.gpu).toBe(1);
  });

  // 12. Verifica Centesimale Completa sul Dataset Reale userRigSeed.json
  it('verifies all metrics against the real userRigSeed dataset to the cent', () => {
    const { components, events, upgrades } = userRigData as unknown as {
      components: Component[];
      events: ComponentEvent[];
      upgrades: Upgrade[];
    };

    const stats = computeRigStats(components, events, upgrades, '2026-09-08');

    // 1. Totali Finanziari
    expect(stats.financial.totalPurchased).toBe(2832.55);
    expect(stats.financial.totalRecovered).toBe(65.0);
    expect(stats.financial.historicalNetCost).toBe(2767.55);
    expect(stats.financial.currentRigCost).toBe(2659.59);

    // 2. Vendite (Thermaltake + Logitech)
    expect(stats.financial.soldComponentsCount).toBe(2);
    expect(stats.financial.totalCostOfSold).toBe(90.99);
    expect(stats.financial.recoveryRateOnSold).toBe(71.4);
    expect(stats.soldComponents[0].name).toBe('Thermaltake TR2 S 700W');
    expect(stats.soldComponents[0].recoveryPercentage).toBe(88.2);
    expect(stats.soldComponents[0].deltaBalance).toBe(-6.0);
    expect(stats.soldComponents[1].name).toBe('Logitech G413 TKL SE');
    expect(stats.soldComponents[1].recoveryPercentage).toBe(50.0);
    expect(stats.soldComponents[1].deltaBalance).toBe(-19.99);

    // 3. Upgrades
    expect(stats.upgrades.totalUpgrades).toBe(5);
    expect(stats.upgrades.totalInvested).toBe(358.08);
    expect(stats.upgrades.totalRecovered).toBe(65.0);
    expect(stats.upgrades.totalNetCost).toBe(293.08);
    expect(stats.upgrades.mostUpgradedCategory).toBe('peripherals');
    expect(stats.upgrades.categoryCount.peripherals).toBe(3);
    expect(stats.upgrades.categoryCount.psu).toBe(1);
    expect(stats.upgrades.categoryCount.cooling).toBe(1);

    // 4. Categorie (Top 3: GPU, Storage, Periferiche)
    expect(stats.categories[0].category).toBe('gpu');
    expect(stats.categories[0].totalSpent).toBe(605.0);
    expect(stats.categories[0].percentage).toBe(21.4);

    expect(stats.categories[1].category).toBe('storage');
    expect(stats.categories[1].totalSpent).toBe(466.03);
    expect(stats.categories[1].percentage).toBe(16.5);

    expect(stats.categories[2].category).toBe('peripherals');
    expect(stats.categories[2].totalSpent).toBe(440.75);
    expect(stats.categories[2].percentage).toBe(15.6);

    // 5. Spesa per Anno
    expect(stats.years.length).toBe(4);
    expect(stats.years.map((y) => y.year)).toEqual(['2023', '2024', '2025', '2026']);
    expect(stats.peakYear?.year).toBe('2024');
    expect(stats.peakYear?.totalSpent).toBe(1864.21);

    // 6. Longevità
    expect(stats.longevity.mostUsedComponent?.name).toBe('Sony DualShock 4 V2');
    expect(stats.longevity.neverMountedCount).toBe(2); // AJAZZ AK820 PRO Wireless e Intel Laminar RM1
    expect(stats.longevity.bestCostPerDayComponent?.name).toBe('Thermaltake TR2 S 700W');
    expect(stats.longevity.bestCostPerDayComponent?.costPerDay).toBe(0.01);

    // 7. Top 5 Costosi
    expect(stats.topExpensive.length).toBe(5);
    expect(stats.topExpensive[0].name).toBe('MSI GeForce RTX 4070');
    expect(stats.topExpensive[0].totalHistoricalCost).toBe(605.0);
    expect(stats.topExpensive[1].name).toBe('Samsung 990 PRO 2TB NVMe M.2');
    expect(stats.topExpensive[1].totalHistoricalCost).toBe(373.04);
  });
});
