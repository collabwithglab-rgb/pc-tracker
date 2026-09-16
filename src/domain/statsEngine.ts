import {
  Component,
  ComponentEvent,
  Upgrade,
  ComponentCategory,
  RigStatsSummary,
  CategorySpendingStats,
  YearSpendingStats,
  LongevityStats,
  TopExpensiveComponent,
  SoldComponentStats,
  UpgradeStatsSummary,
} from '../types';
import {
  computeTotalPurchased,
  computeTotalRecovered,
  computeHistoricalNetCost,
  computeCurrentRigCost,
} from './financialEngine';
import {
  computeComponentComputedState,
} from './lifecycleEngine';
import { computeUpgradeSummary } from './upgradeEngine';

/**
 * Calcola l'insieme completo e rigoroso di statistiche di dominio per il rig,
 * riutilizzando i motori puri (financialEngine, lifecycleEngine, upgradeEngine).
 */
export function computeRigStats(
  components: Component[],
  events: ComponentEvent[],
  upgrades: Upgrade[],
  referenceDate?: string
): RigStatsSummary {
  // 1. Metriche finanziarie globali
  const totalPurchased = computeTotalPurchased(events);
  const totalRecovered = computeTotalRecovered(events);
  const historicalNetCost = computeHistoricalNetCost(events);
  const currentRigCost = computeCurrentRigCost(components, events);

  // Mappa rapida per componente
  const compMap = new Map<string, Component>();
  for (const c of components) {
    compMap.set(c.id, c);
  }

  // Calcolo stati computati per tutti i componenti
  const computedStates = components.map((c) =>
    computeComponentComputedState(c, events, referenceDate)
  );

  // 2. Arco Temporale (Cash flow dates)
  const financialYears = new Set<string>();
  for (const ev of events) {
    if ((ev.type === 'PURCHASE' || ev.type === 'EXTRA_EXPENSE') && ev.date) {
      const yr = ev.date.substring(0, 4);
      if (/^\d{4}$/.test(yr)) {
        financialYears.add(yr);
      }
    }
  }

  const sortedYearsList = Array.from(financialYears).sort();
  const timeRange = {
    firstYear: sortedYearsList.length > 0 ? sortedYearsList[0] : null,
    lastYear: sortedYearsList.length > 0 ? sortedYearsList[sortedYearsList.length - 1] : null,
    totalYearsCount: sortedYearsList.length,
    totalComponentsCount: components.length,
  };

  // 3. Analisi Componenti Venduti
  const soldItems: SoldComponentStats[] = [];
  let totalCostOfSold = 0;

  for (const st of computedStates) {
    if (st.status === 'SOLD' || st.totalSaleRevenue > 0) {
      totalCostOfSold += st.totalPurchaseCost;
      const deltaBalance = Number((st.totalSaleRevenue - st.totalPurchaseCost).toFixed(2));
      const recoveryPercentage =
        st.totalPurchaseCost > 0
          ? Number(((st.totalSaleRevenue / st.totalPurchaseCost) * 100).toFixed(1))
          : 0;

      soldItems.push({
        id: st.component.id,
        name: st.component.name,
        category: st.component.category,
        totalCost: Number(st.totalPurchaseCost.toFixed(2)),
        netRevenue: Number(st.totalSaleRevenue.toFixed(2)),
        deltaBalance,
        recoveryPercentage,
      });
    }
  }

  // Ordinamento vendite per ricavo netto decrescente
  soldItems.sort((a, b) => b.netRevenue - a.netRevenue);

  const recoveryRateOnSold =
    totalCostOfSold > 0
      ? Number(((totalRecovered / totalCostOfSold) * 100).toFixed(1))
      : 0;

  // 4. Spesa per Categoria Hardware
  const catSpendingMap = new Map<ComponentCategory, { total: number; count: number }>();

  // Inizializza con i componenti presenti per garantire il conteggio corretto
  for (const c of components) {
    const entry = catSpendingMap.get(c.category) || { total: 0, count: 0 };
    entry.count += 1;
    catSpendingMap.set(c.category, entry);
  }

  // Attribuisce la spesa (PURCHASE ed EXTRA_EXPENSE) tramite il componente associato
  for (const ev of events) {
    const comp = compMap.get(ev.componentId);
    if (!comp) continue;

    if (ev.type === 'PURCHASE') {
      const entry = catSpendingMap.get(comp.category) || { total: 0, count: 0 };
      entry.total += ev.price || 0;
      catSpendingMap.set(comp.category, entry);
    } else if (ev.type === 'EXTRA_EXPENSE') {
      const entry = catSpendingMap.get(comp.category) || { total: 0, count: 0 };
      entry.total += ev.amount || 0;
      catSpendingMap.set(comp.category, entry);
    }
  }

  const categories: CategorySpendingStats[] = Array.from(catSpendingMap.entries())
    .map(([category, data]) => {
      const totalSpent = Number(data.total.toFixed(2));
      const percentage =
        totalPurchased > 0
          ? Number(((totalSpent / totalPurchased) * 100).toFixed(1))
          : 0;
      return {
        category,
        totalSpent,
        percentage,
        componentsCount: data.count,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // 5. Spesa per Anno (Cash flow per data di spesa)
  const yearSpendingMap = new Map<string, number>();

  for (const ev of events) {
    if (ev.type === 'PURCHASE' || ev.type === 'EXTRA_EXPENSE') {
      const yr = ev.date ? ev.date.substring(0, 4) : '';
      if (/^\d{4}$/.test(yr)) {
        const cost = ev.type === 'PURCHASE' ? ev.price || 0 : ev.amount || 0;
        yearSpendingMap.set(yr, (yearSpendingMap.get(yr) || 0) + cost);
      }
    }
  }

  let peakYearAmount = -1;
  let peakYearStr: string | null = null;

  for (const [yr, amt] of yearSpendingMap.entries()) {
    if (amt > peakYearAmount) {
      peakYearAmount = amt;
      peakYearStr = yr;
    }
  }

  const years: YearSpendingStats[] = Array.from(yearSpendingMap.entries())
    .map(([year, amt]) => {
      const totalSpent = Number(amt.toFixed(2));
      const percentage =
        totalPurchased > 0
          ? Number(((totalSpent / totalPurchased) * 100).toFixed(1))
          : 0;
      return {
        year,
        totalSpent,
        percentage,
        isPeakYear: year === peakYearStr && totalSpent > 0,
      };
    })
    .sort((a, b) => a.year.localeCompare(b.year));

  const peakYear = years.find((y) => y.isPeakYear) || null;

  // 6. Longevità ed Efficienza (€/die)
  const activeUseStates = computedStates.filter((st) => st.daysInUse > 0);
  const neverMountedCount = computedStates.filter((st) => st.daysInUse === 0).length;

  // Ordinamento per giorni d'uso decrescente
  const sortedByDays = [...computedStates].sort((a, b) => b.daysInUse - a.daysInUse);

  const mostUsedCompState = sortedByDays.length > 0 ? sortedByDays[0] : null;
  const mostUsedComponent =
    mostUsedCompState && mostUsedCompState.daysInUse > 0
      ? {
          id: mostUsedCompState.component.id,
          name: mostUsedCompState.component.name,
          category: mostUsedCompState.component.category,
          daysInUse: mostUsedCompState.daysInUse,
        }
      : null;

  // Calcolo medie
  const totalDaysActive = activeUseStates.reduce((acc, st) => acc + st.daysInUse, 0);
  const totalDaysAll = computedStates.reduce((acc, st) => acc + st.daysInUse, 0);

  const avgDaysInUseActive =
    activeUseStates.length > 0
      ? Number((totalDaysActive / activeUseStates.length).toFixed(1))
      : 0;

  const avgDaysInUseAll =
    computedStates.length > 0
      ? Number((totalDaysAll / computedStates.length).toFixed(1))
      : 0;

  // Mediana giorni d'uso (su tutti i componenti)
  const allDaysList = computedStates.map((st) => st.daysInUse).sort((a, b) => a - b);
  let medianDaysInUse = 0;
  if (allDaysList.length > 0) {
    const mid = Math.floor(allDaysList.length / 2);
    medianDaysInUse =
      allDaysList.length % 2 !== 0
        ? allDaysList[mid]
        : Math.round((allDaysList[mid - 1] + allDaysList[mid]) / 2);
  }

  // Miglior ammortamento (€/die più basso su giorni d'uso > 0 e netCost >= 0)
  const validCostPerDay = activeUseStates
    .filter((st) => st.daysInUse > 0 && st.costPerDayInUse !== null && st.costPerDayInUse >= 0)
    .sort((a, b) => {
      const ratioA = a.netCost / a.daysInUse;
      const ratioB = b.netCost / b.daysInUse;
      return ratioA - ratioB;
    });

  const bestCostPerDayState = validCostPerDay.length > 0 ? validCostPerDay[0] : null;
  const bestCostPerDayComponent = bestCostPerDayState
    ? {
        id: bestCostPerDayState.component.id,
        name: bestCostPerDayState.component.name,
        category: bestCostPerDayState.component.category,
        daysInUse: bestCostPerDayState.daysInUse,
        costPerDay: bestCostPerDayState.costPerDayInUse!,
        netCost: Number(bestCostPerDayState.netCost.toFixed(2)),
      }
    : null;

  const componentDurations = sortedByDays.map((st) => ({
    id: st.component.id,
    name: st.component.name,
    category: st.component.category,
    daysInUse: st.daysInUse,
    costPerDay: st.costPerDayInUse,
    status: st.status,
  }));

  const longevity: LongevityStats = {
    mostUsedComponent,
    avgDaysInUseActive,
    avgDaysInUseAll,
    medianDaysInUse,
    neverMountedCount,
    bestCostPerDayComponent,
    componentDurations,
  };

  // 7. Top 5 Componenti Più Costosi (Spesa Storica Complessiva)
  const topExpensive: TopExpensiveComponent[] = [...computedStates]
    .sort((a, b) => b.totalPurchaseCost - a.totalPurchaseCost)
    .slice(0, 5)
    .map((st) => ({
      id: st.component.id,
      name: st.component.name,
      category: st.component.category,
      totalHistoricalCost: Number(st.totalPurchaseCost.toFixed(2)),
      netCost: Number(st.netCost.toFixed(2)),
      isSold: st.status === 'SOLD',
    }));

  // 8. Statistiche Upgrade (riuso totale di upgradeEngine)
  let totalUpgradeInvested = 0;
  let totalUpgradeRecovered = 0;
  const upgradeCatCount: Partial<Record<ComponentCategory, number>> = {};

  for (const up of upgrades) {
    upgradeCatCount[up.category] = (upgradeCatCount[up.category] || 0) + 1;
    try {
      const summary = computeUpgradeSummary(up, components, events);
      totalUpgradeInvested += summary.newComponentCost;
      totalUpgradeRecovered += summary.oldComponentRecovered;
    } catch {
      // Nel caso di componente non trovato, continua senza bloccare
    }
  }

  let mostUpgradedCategory: ComponentCategory | null = null;
  let maxUpCount = 0;
  for (const [cat, count] of Object.entries(upgradeCatCount)) {
    if (count && count > maxUpCount) {
      maxUpCount = count;
      mostUpgradedCategory = cat as ComponentCategory;
    }
  }

  const upgradeSummary: UpgradeStatsSummary = {
    totalUpgrades: upgrades.length,
    totalInvested: Number(totalUpgradeInvested.toFixed(2)),
    totalRecovered: Number(totalUpgradeRecovered.toFixed(2)),
    totalNetCost: Number((totalUpgradeInvested - totalUpgradeRecovered).toFixed(2)),
    mostUpgradedCategory,
    categoryCount: upgradeCatCount,
  };

  return {
    timeRange,
    financial: {
      totalPurchased: Number(totalPurchased.toFixed(2)),
      totalRecovered: Number(totalRecovered.toFixed(2)),
      historicalNetCost: Number(historicalNetCost.toFixed(2)),
      currentRigCost: Number(currentRigCost.toFixed(2)),
      soldComponentsCount: soldItems.length,
      totalCostOfSold: Number(totalCostOfSold.toFixed(2)),
      recoveryRateOnSold,
    },
    categories,
    years,
    peakYear,
    longevity,
    topExpensive,
    soldComponents: soldItems,
    upgrades: upgradeSummary,
  };
}
