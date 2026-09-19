import {
  Component,
  ComponentCategory,
  ComponentEvent,
  ComponentComputedState,
  InstallEvent,
  PurchaseEvent,
  ExtraExpenseEvent,
  Checkpoint,
  RigNormalizedComponent,
  ComponentDiffEntry,
  RigComparisonSummary,
  RigComparisonResult,
} from '../types';
import { getComponentPowerEstimate } from './powerBudgetEngine';
import { getConfigurationAtDate, getEventsUpToPosition } from './historyEngine';

/**
 * Normalizza la configurazione hardware attualmente montata nel PC (IN_USE).
 */
export function normalizeCurrentRig(
  installedComponents: (Component | { component: Component; lastInstallEvent?: InstallEvent })[],
  events: ComponentEvent[],
  getComputed?: (id: string) => ComponentComputedState | undefined
): RigNormalizedComponent[] {
  return installedComponents.map((item) => {
    const comp = 'component' in item ? item.component : item;
    const providedInstall = 'lastInstallEvent' in item ? item.lastInstallEvent : undefined;

    // Trova l'ultimo evento di installazione per ricavare lo slot
    const compEvents = events.filter((e) => e.componentId === comp.id);
    const installEvents = compEvents.filter((e) => e.type === 'INSTALL') as InstallEvent[];
    const latestInstall = providedInstall || (installEvents.length > 0 ? installEvents[installEvents.length - 1] : undefined);

    // Calcolo costo d'acquisto (con fallback sugli eventi se getComputed non è presente o non lo trova)
    let purchasePrice: number | undefined;
    if (getComputed) {
      const computed = getComputed(comp.id);
      if (computed && typeof computed.totalPurchaseCost === 'number') {
        purchasePrice = computed.totalPurchaseCost;
      }
    }
    
    if (purchasePrice === undefined) {
      const purchaseEvent = compEvents.find((e) => e.type === 'PURCHASE') as PurchaseEvent | undefined;
      const extraEvents = compEvents.filter((e) => e.type === 'EXTRA_EXPENSE') as ExtraExpenseEvent[];
      const extraSum = extraEvents.reduce((s, ex) => s + (ex.amount || 0), 0);
      if (purchaseEvent) {
        purchasePrice = (purchaseEvent.price || 0) + extraSum;
      }
    }

    // Stima potenza in Watt (esclude PSU)
    const power = getComponentPowerEstimate(comp);
    const estimatedWatts = !power.isPsu && power.watts !== null && power.watts > 0 ? power.watts : null;

    return {
      componentId: comp.id,
      name: comp.name,
      brand: comp.brand || undefined,
      model: comp.model || undefined,
      category: comp.category,
      slotOrLocation: latestInstall?.slotOrLocation || undefined,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice.toFixed(2)) : undefined,
      estimatedWatts,
    };
  });
}

/**
 * Normalizza uno snapshot congelato di un Checkpoint storico.
 */
export function normalizeCheckpoint(
  checkpoint: Checkpoint,
  allComponents: Component[] = []
): RigNormalizedComponent[] {
  return checkpoint.componentsSnapshot.map((entry) => {
    // Tenta di associare il componente live per accedere ad eventuali specifiche dichiarate
    const liveComp = allComponents.find((c) => c.id === entry.componentId);

    let estimatedWatts: number | null = null;
    if (liveComp) {
      const power = getComponentPowerEstimate(liveComp);
      if (!power.isPsu && power.watts !== null && power.watts > 0) {
        estimatedWatts = power.watts;
      }
    } else {
      // Stima euristica tramite pseudo-componente sui metadati congelati dello snapshot
      const pseudo: Component = {
        id: entry.componentId || 'snapshot-item',
        name: entry.name,
        brand: entry.brand || '',
        model: entry.model || '',
        category: entry.category,
        createdAt: '',
        updatedAt: '',
      };
      const power = getComponentPowerEstimate(pseudo);
      if (!power.isPsu && power.watts !== null && power.watts > 0) {
        estimatedWatts = power.watts;
      }
    }

    return {
      componentId: entry.componentId || `${entry.name}-${entry.category}`,
      name: entry.name,
      brand: entry.brand || undefined,
      model: entry.model || undefined,
      category: entry.category,
      slotOrLocation: entry.slotOrLocation || undefined,
      purchasePrice: entry.purchasePrice !== undefined ? Number(entry.purchasePrice.toFixed(2)) : undefined,
      estimatedWatts,
    };
  });
}

/**
 * Normalizza una configurazione ricostruita dinamicamente ad una specifica data storica.
 */
export function normalizeHistoricalDate(
  components: Component[],
  events: ComponentEvent[],
  targetDate: string
): RigNormalizedComponent[] {
  const installedAtDate = getConfigurationAtDate(components, events, targetDate);
  const relevantEvents = getEventsUpToPosition(events, { date: targetDate, boundary: 'end_of_day' });

  return installedAtDate.map((comp) => {
    const compEvents = relevantEvents.filter((e) => e.componentId === comp.id);
    const installEvents = compEvents.filter((e) => e.type === 'INSTALL') as InstallEvent[];
    const latestInstall = installEvents.length > 0 ? installEvents[installEvents.length - 1] : undefined;

    const purchaseEvent = compEvents.find((e) => e.type === 'PURCHASE') as PurchaseEvent | undefined;
    const extraEvents = compEvents.filter((e) => e.type === 'EXTRA_EXPENSE') as ExtraExpenseEvent[];
    const extraSum = extraEvents.reduce((s, ex) => s + (ex.amount || 0), 0);
    const purchasePrice = purchaseEvent ? (purchaseEvent.price || 0) + extraSum : undefined;

    const power = getComponentPowerEstimate(comp);
    const estimatedWatts = !power.isPsu && power.watts !== null && power.watts > 0 ? power.watts : null;

    return {
      componentId: comp.id,
      name: comp.name,
      brand: comp.brand || undefined,
      model: comp.model || undefined,
      category: comp.category,
      slotOrLocation: latestInstall?.slotOrLocation || undefined,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice.toFixed(2)) : undefined,
      estimatedWatts,
    };
  });
}

const CATEGORY_ORDER: ComponentCategory[] = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'cooling',
  'case',
  'monitor',
  'peripherals',
  'accessories',
  'other',
];

const SINGLE_INSTANCE_CATEGORIES: Set<ComponentCategory> = new Set([
  'cpu',
  'motherboard',
  'psu',
  'case',
]);

/**
 * Confronta punto a punto due configurazioni hardware normalizzate (Rig A vs Rig B).
 */
export function compareRigs(
  itemsA: RigNormalizedComponent[],
  itemsB: RigNormalizedComponent[],
  titleA: string,
  titleB: string,
  dateA?: string,
  dateB?: string
): RigComparisonResult {
  const entries: ComponentDiffEntry[] = [];

  // Raggruppa i componenti per categoria hardware
  for (const category of CATEGORY_ORDER) {
    const listA = itemsA.filter((i) => i.category === category);
    const listB = itemsB.filter((i) => i.category === category);

    if (listA.length === 0 && listB.length === 0) {
      continue;
    }

    // Categorie a istanza singola naturale (CPU, Motherboard, PSU, Case)
    if (SINGLE_INSTANCE_CATEGORIES.has(category) && listA.length <= 1 && listB.length <= 1) {
      const itemA = listA[0];
      const itemB = listB[0];

      if (itemA && itemB) {
        if (itemA.componentId === itemB.componentId || (itemA.name === itemB.name && itemA.model === itemB.model)) {
          entries.push({
            category,
            status: 'unchanged',
            oldComponent: itemA,
            newComponent: itemB,
            priceDifference: 0,
            wattsDifference: 0,
          });
        } else {
          const priceDiff = (itemB.purchasePrice ?? 0) - (itemA.purchasePrice ?? 0);
          const wattsDiff =
            itemA.estimatedWatts !== null && itemA.estimatedWatts !== undefined &&
            itemB.estimatedWatts !== null && itemB.estimatedWatts !== undefined
              ? itemB.estimatedWatts - itemA.estimatedWatts
              : null;

          entries.push({
            category,
            status: 'replaced',
            oldComponent: itemA,
            newComponent: itemB,
            priceDifference: Number(priceDiff.toFixed(2)),
            wattsDifference: wattsDiff,
          });
        }
      } else if (itemA && !itemB) {
        entries.push({
          category,
          status: 'removed',
          oldComponent: itemA,
          priceDifference: -(itemA.purchasePrice ?? 0),
          wattsDifference: itemA.estimatedWatts ? -itemA.estimatedWatts : null,
        });
      } else if (!itemA && itemB) {
        entries.push({
          category,
          status: 'added',
          newComponent: itemB,
          priceDifference: itemB.purchasePrice ?? 0,
          wattsDifference: itemB.estimatedWatts ?? null,
        });
      }
      continue;
    }

    // Categorie multi-componente (GPU multiple, RAM, Storage, Cooling, ecc.)
    const remainingA = [...listA];
    const remainingB = [...listB];

    // Pass 1: Identici per componentId
    for (let aIdx = remainingA.length - 1; aIdx >= 0; aIdx--) {
      const a = remainingA[aIdx];
      const bIdx = remainingB.findIndex(
        (b) => b.componentId === a.componentId || (b.name === a.name && b.model === a.model && b.slotOrLocation === a.slotOrLocation)
      );
      if (bIdx !== -1) {
        const b = remainingB[bIdx];
        entries.push({
          category,
          status: 'unchanged',
          oldComponent: a,
          newComponent: b,
          priceDifference: 0,
          wattsDifference: 0,
        });
        remainingA.splice(aIdx, 1);
        remainingB.splice(bIdx, 1);
      }
    }

    // Pass 2: Sostituzioni per Slot coincidente (es. "Slot M.2 1" con componente diverso)
    for (let aIdx = remainingA.length - 1; aIdx >= 0; aIdx--) {
      const a = remainingA[aIdx];
      if (!a.slotOrLocation) continue;
      const bIdx = remainingB.findIndex((b) => b.slotOrLocation === a.slotOrLocation);
      if (bIdx !== -1) {
        const b = remainingB[bIdx];
        const priceDiff = (b.purchasePrice ?? 0) - (a.purchasePrice ?? 0);
        const wattsDiff =
          a.estimatedWatts !== null && a.estimatedWatts !== undefined &&
          b.estimatedWatts !== null && b.estimatedWatts !== undefined
            ? b.estimatedWatts - a.estimatedWatts
            : null;

        entries.push({
          category,
          status: 'replaced',
          oldComponent: a,
          newComponent: b,
          priceDifference: Number(priceDiff.toFixed(2)),
          wattsDifference: wattsDiff,
        });
        remainingA.splice(aIdx, 1);
        remainingB.splice(bIdx, 1);
      }
    }

    // Pass 3: Sostituzioni accoppiate per posizione residua nella stessa categoria
    const pairCount = Math.min(remainingA.length, remainingB.length);
    for (let i = 0; i < pairCount; i++) {
      const a = remainingA.shift()!;
      const b = remainingB.shift()!;
      const priceDiff = (b.purchasePrice ?? 0) - (a.purchasePrice ?? 0);
      const wattsDiff =
        a.estimatedWatts !== null && a.estimatedWatts !== undefined &&
        b.estimatedWatts !== null && b.estimatedWatts !== undefined
          ? b.estimatedWatts - a.estimatedWatts
          : null;

      entries.push({
        category,
        status: 'replaced',
        oldComponent: a,
        newComponent: b,
        priceDifference: Number(priceDiff.toFixed(2)),
        wattsDifference: wattsDiff,
      });
    }

    // Pass 4: Componenti rimossi (presenti solo in A)
    for (const a of remainingA) {
      entries.push({
        category,
        status: 'removed',
        oldComponent: a,
        priceDifference: -(a.purchasePrice ?? 0),
        wattsDifference: a.estimatedWatts ? -a.estimatedWatts : null,
      });
    }

    // Pass 5: Componenti aggiunti (presenti solo in B)
    for (const b of remainingB) {
      entries.push({
        category,
        status: 'added',
        newComponent: b,
        priceDifference: b.purchasePrice ?? 0,
        wattsDifference: b.estimatedWatts ?? null,
      });
    }
  }

  // Calcolo delle metriche aggregate
  const costA = itemsA.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const costB = itemsB.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const deltaCost = Number((costB - costA).toFixed(2));

  let deltaCostPercent: number | null = null;
  if (costA > 0) {
    deltaCostPercent = Number(((deltaCost / costA) * 100).toFixed(1));
  } else if (costB > 0) {
    deltaCostPercent = 100;
  } else {
    deltaCostPercent = 0;
  }

  const countA = itemsA.length;
  const countB = itemsB.length;
  const deltaCount = countB - countA;

  const validWattsA = itemsA
    .map((i) => i.estimatedWatts)
    .filter((w): w is number => w !== null && w !== undefined && w > 0);
  const wattsA = validWattsA.length > 0 ? validWattsA.reduce((s, w) => s + w, 0) : null;

  const validWattsB = itemsB
    .map((i) => i.estimatedWatts)
    .filter((w): w is number => w !== null && w !== undefined && w > 0);
  const wattsB = validWattsB.length > 0 ? validWattsB.reduce((s, w) => s + w, 0) : null;

  let deltaWatts: number | null = null;
  if (wattsA !== null && wattsB !== null) {
    deltaWatts = wattsB - wattsA;
  }

  const replacedCount = entries.filter((e) => e.status === 'replaced').length;
  const addedCount = entries.filter((e) => e.status === 'added').length;
  const removedCount = entries.filter((e) => e.status === 'removed').length;
  const unchangedCount = entries.filter((e) => e.status === 'unchanged').length;

  const summary: RigComparisonSummary = {
    costA: Number(costA.toFixed(2)),
    costB: Number(costB.toFixed(2)),
    deltaCost,
    deltaCostPercent,
    countA,
    countB,
    deltaCount,
    wattsA,
    wattsB,
    deltaWatts,
    replacedCount,
    addedCount,
    removedCount,
    unchangedCount,
  };

  return {
    titleA,
    titleB,
    dateA,
    dateB,
    summary,
    entries,
  };
}
