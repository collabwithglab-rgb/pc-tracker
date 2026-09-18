import {
  Component,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  ComponentEvent,
} from '../types';
import {
  ComponentPowerEstimate,
  CategoryPowerBreakdown,
  RigPowerBudget,
  PowerSource,
  HeadroomStatus,
} from '../types/power';
import { computeComponentStatus } from './lifecycleEngine';

/**
 * Tabella di riferimento per i TDP di fabbrica dichiarati per le GPU più diffuse (valori ufficiali di riferimento).
 * Chiavi normalizzate in minuscolo senza spazi o trattini per matching robusto.
 */
const KNOWN_GPU_TDP: Array<{ pattern: RegExp; tdp: number; label: string }> = [
  // NVIDIA RTX 40 Series
  { pattern: /rtx\s*4090/i, tdp: 450, label: 'NVIDIA RTX 4090 (TDP di riferimento: 450W)' },
  { pattern: /rtx\s*4080\s*super/i, tdp: 320, label: 'NVIDIA RTX 4080 Super (TDP di riferimento: 320W)' },
  { pattern: /rtx\s*4080/i, tdp: 320, label: 'NVIDIA RTX 4080 (TDP di riferimento: 320W)' },
  { pattern: /rtx\s*4070\s*ti\s*super/i, tdp: 285, label: 'NVIDIA RTX 4070 Ti Super (TDP di riferimento: 285W)' },
  { pattern: /rtx\s*4070\s*ti/i, tdp: 285, label: 'NVIDIA RTX 4070 Ti (TDP di riferimento: 285W)' },
  { pattern: /rtx\s*4070\s*super/i, tdp: 220, label: 'NVIDIA RTX 4070 Super (TDP di riferimento: 220W)' },
  { pattern: /rtx\s*4070/i, tdp: 200, label: 'NVIDIA RTX 4070 (TDP di riferimento: 200W)' },
  { pattern: /rtx\s*4060\s*ti/i, tdp: 160, label: 'NVIDIA RTX 4060 Ti (TDP di riferimento: 160W)' },
  { pattern: /rtx\s*4060/i, tdp: 115, label: 'NVIDIA RTX 4060 (TDP di riferimento: 115W)' },

  // NVIDIA RTX 30 Series
  { pattern: /rtx\s*3090\s*ti/i, tdp: 450, label: 'NVIDIA RTX 3090 Ti (TDP di riferimento: 450W)' },
  { pattern: /rtx\s*3090/i, tdp: 350, label: 'NVIDIA RTX 3090 (TDP di riferimento: 350W)' },
  { pattern: /rtx\s*3080\s*ti/i, tdp: 350, label: 'NVIDIA RTX 3080 Ti (TDP di riferimento: 350W)' },
  { pattern: /rtx\s*3080/i, tdp: 320, label: 'NVIDIA RTX 3080 (TDP di riferimento: 320W)' },
  { pattern: /rtx\s*3070\s*ti/i, tdp: 290, label: 'NVIDIA RTX 3070 Ti (TDP di riferimento: 290W)' },
  { pattern: /rtx\s*3070/i, tdp: 220, label: 'NVIDIA RTX 3070 (TDP di riferimento: 220W)' },
  { pattern: /rtx\s*3060\s*ti/i, tdp: 200, label: 'NVIDIA RTX 3060 Ti (TDP di riferimento: 200W)' },
  { pattern: /rtx\s*3060/i, tdp: 170, label: 'NVIDIA RTX 3060 (TDP di riferimento: 170W)' },
  { pattern: /rtx\s*3050/i, tdp: 130, label: 'NVIDIA RTX 3050 (TDP di riferimento: 130W)' },

  // AMD Radeon RX 7000 Series
  { pattern: /rx\s*7900\s*xtx/i, tdp: 355, label: 'AMD RX 7900 XTX (TDP di riferimento: 355W)' },
  { pattern: /rx\s*7900\s*xt/i, tdp: 315, label: 'AMD RX 7900 XT (TDP di riferimento: 315W)' },
  { pattern: /rx\s*7900\s*gre/i, tdp: 260, label: 'AMD RX 7900 GRE (TDP di riferimento: 260W)' },
  { pattern: /rx\s*7800\s*xt/i, tdp: 263, label: 'AMD RX 7800 XT (TDP di riferimento: 263W)' },
  { pattern: /rx\s*7700\s*xt/i, tdp: 245, label: 'AMD RX 7700 XT (TDP di riferimento: 245W)' },
  { pattern: /rx\s*7600\s*xt/i, tdp: 190, label: 'AMD RX 7600 XT (TDP di riferimento: 190W)' },
  { pattern: /rx\s*7600/i, tdp: 165, label: 'AMD RX 7600 (TDP di riferimento: 165W)' },

  // AMD Radeon RX 6000 Series
  { pattern: /rx\s*6950\s*xt/i, tdp: 335, label: 'AMD RX 6950 XT (TDP di riferimento: 335W)' },
  { pattern: /rx\s*6900\s*xt/i, tdp: 300, label: 'AMD RX 6900 XT (TDP di riferimento: 300W)' },
  { pattern: /rx\s*6800\s*xt/i, tdp: 300, label: 'AMD RX 6800 XT (TDP di riferimento: 300W)' },
  { pattern: /rx\s*6800/i, tdp: 250, label: 'AMD RX 6800 (TDP di riferimento: 250W)' },
  { pattern: /rx\s*6750\s*xt/i, tdp: 250, label: 'AMD RX 6750 XT (TDP di riferimento: 250W)' },
  { pattern: /rx\s*6700\s*xt/i, tdp: 230, label: 'AMD RX 6700 XT (TDP di riferimento: 230W)' },
  { pattern: /rx\s*6650\s*xt/i, tdp: 180, label: 'AMD RX 6650 XT (TDP di riferimento: 180W)' },
  { pattern: /rx\s*6600\s*xt/i, tdp: 160, label: 'AMD RX 6600 XT (TDP di riferimento: 160W)' },
  { pattern: /rx\s*6600/i, tdp: 132, label: 'AMD RX 6600 (TDP di riferimento: 132W)' },
];

/**
 * Tabella di riferimento per i TDP di picco turbo (PL2/MTP) o TDP dichiarati per le CPU più diffuse.
 */
const KNOWN_CPU_TDP: Array<{ pattern: RegExp; tdp: number; label: string }> = [
  // Intel Core 14th Gen
  { pattern: /i9-?14900/i, tdp: 253, label: 'Intel Core i9-14900 (PL2 Turbo: 253W)' },
  { pattern: /i7-?14700/i, tdp: 253, label: 'Intel Core i7-14700 (PL2 Turbo: 253W)' },
  { pattern: /i5-?14600/i, tdp: 181, label: 'Intel Core i5-14600 (PL2 Turbo: 181W)' },
  { pattern: /\b(?:i5-?)?14500\b/i, tdp: 154, label: 'Intel Core 14500 (PL2 Turbo: 154W / Base 65W)' },
  { pattern: /i5-?14400/i, tdp: 148, label: 'Intel Core i5-14400 (PL2 Turbo: 148W / Base 65W)' },

  // Intel Core 13th Gen
  { pattern: /i9-?13900/i, tdp: 253, label: 'Intel Core i9-13900 (PL2 Turbo: 253W)' },
  { pattern: /i7-?13700/i, tdp: 253, label: 'Intel Core i7-13700 (PL2 Turbo: 253W)' },
  { pattern: /i5-?13600/i, tdp: 181, label: 'Intel Core i5-13600 (PL2 Turbo: 181W)' },
  { pattern: /i5-?13500/i, tdp: 154, label: 'Intel Core i5-13500 (PL2 Turbo: 154W)' },
  { pattern: /i5-?13400/i, tdp: 148, label: 'Intel Core i5-13400 (PL2 Turbo: 148W)' },

  // Intel Core 12th Gen
  { pattern: /i9-?12900/i, tdp: 241, label: 'Intel Core i9-12900 (PL2 Turbo: 241W)' },
  { pattern: /i7-?12700/i, tdp: 190, label: 'Intel Core i7-12700 (PL2 Turbo: 190W)' },
  { pattern: /i5-?12600/i, tdp: 150, label: 'Intel Core i5-12600 (PL2 Turbo: 150W)' },
  { pattern: /i5-?12400/i, tdp: 117, label: 'Intel Core i5-12400 (PL2 Turbo: 117W)' },

  // AMD Ryzen 9000 & 7000 Series
  { pattern: /ryzen\s*9\s*9950x/i, tdp: 170, label: 'AMD Ryzen 9 9950X (TDP dichiarato: 170W)' },
  { pattern: /ryzen\s*9\s*9900x/i, tdp: 120, label: 'AMD Ryzen 9 9900X (TDP dichiarato: 120W)' },
  { pattern: /ryzen\s*7\s*9800x3d/i, tdp: 120, label: 'AMD Ryzen 7 9800X3D (TDP dichiarato: 120W)' },
  { pattern: /ryzen\s*7\s*9700x/i, tdp: 65, label: 'AMD Ryzen 7 9700X (TDP dichiarato: 65W)' },
  { pattern: /ryzen\s*5\s*9600x/i, tdp: 65, label: 'AMD Ryzen 5 9600X (TDP dichiarato: 65W)' },

  { pattern: /ryzen\s*9\s*7950x3d/i, tdp: 120, label: 'AMD Ryzen 9 7950X3D (TDP dichiarato: 120W)' },
  { pattern: /ryzen\s*9\s*7950x/i, tdp: 170, label: 'AMD Ryzen 9 7950X (TDP dichiarato: 170W)' },
  { pattern: /ryzen\s*9\s*7900x3d/i, tdp: 120, label: 'AMD Ryzen 9 7900X3D (TDP dichiarato: 120W)' },
  { pattern: /ryzen\s*9\s*7900x/i, tdp: 170, label: 'AMD Ryzen 9 7900X (TDP dichiarato: 170W)' },
  { pattern: /ryzen\s*7\s*7800x3d/i, tdp: 120, label: 'AMD Ryzen 7 7800X3D (TDP dichiarato: 120W)' },
  { pattern: /ryzen\s*7\s*7700x/i, tdp: 105, label: 'AMD Ryzen 7 7700X (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*5\s*7600x/i, tdp: 105, label: 'AMD Ryzen 5 7600X (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*5\s*7600/i, tdp: 65, label: 'AMD Ryzen 5 7600 (TDP dichiarato: 65W)' },

  // AMD Ryzen 5000 Series
  { pattern: /ryzen\s*7\s*5800x3d/i, tdp: 105, label: 'AMD Ryzen 7 5800X3D (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*9\s*5950x/i, tdp: 105, label: 'AMD Ryzen 9 5950X (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*9\s*5900x/i, tdp: 105, label: 'AMD Ryzen 9 5900X (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*7\s*5800x/i, tdp: 105, label: 'AMD Ryzen 7 5800X (TDP dichiarato: 105W)' },
  { pattern: /ryzen\s*7\s*5700x/i, tdp: 65, label: 'AMD Ryzen 7 5700X (TDP dichiarato: 65W)' },
  { pattern: /ryzen\s*5\s*5600x/i, tdp: 65, label: 'AMD Ryzen 5 5600X (TDP dichiarato: 65W)' },
  { pattern: /ryzen\s*5\s*5600/i, tdp: 65, label: 'AMD Ryzen 5 5600 (TDP dichiarato: 65W)' },
];

/**
 * Tenta di estrarre la potenza nominale in Watt dichiarata per un alimentatore (PSU).
 * Riconosce formati standard: "750W", "850 W", "1000W", "C750", "RM850x", ecc.
 */
export function extractPsuWattage(component: Component): { watts: number | null; label: string } {
  if (component.powerRating && component.powerRating > 0) {
    return {
      watts: Math.round(component.powerRating),
      label: `Capacità nominale dichiarata: ${Math.round(component.powerRating)} W`,
    };
  }

  const combinedText = `${component.name} ${component.model} ${component.notes || ''}`;

  // 1. Cerca esplicito "X W" o "XW" (con range verosimile per PSU PC: 250W - 2400W)
  const explicitWattMatch = combinedText.match(/\b(2[5-9]\d|[3-9]\d{2}|1\d{3}|2[0-4]\d{2})\s*[wW]\b/);
  if (explicitWattMatch) {
    const val = parseInt(explicitWattMatch[1], 10);
    return { watts: val, label: `Capacità nominale dichiarata: ${val} W` };
  }

  // 2. Cerca prefissi modello diffusi (es. C750, RM850, Focus 650, Seasonic 750, SF750, CX650, etc.)
  const modelWattMatch = combinedText.match(/\b(?:C|RM|SF|CX|GX|TX|HX|AX|Focus|Core|Leadex|V)?\s*(450|500|550|600|650|700|750|800|850|1000|1050|1200|1300|1500|1600)\b/i);
  if (modelWattMatch) {
    const val = parseInt(modelWattMatch[1], 10);
    return { watts: val, label: `Capacità nominale desunta da modello: ${val} W` };
  }

  return { watts: null, label: 'Alimentatore montato (capacità nominale non specificata)' };
}

/**
 * Determina i metadati di potenza per un singolo componente hardware.
 * Rispetta rigorosamente la gerarchia:
 * 1. userDefined (se impostato manualmente)
 * 2. declared (se specificato in campo o rilevato da specifiche/note ufficiali)
 * 3. unknown (se non esiste un dato certo: MAI inventare valori arbitrari).
 */
export function getComponentPowerEstimate(
  component: Component,
  customOverride?: ComponentPowerEstimate
): ComponentPowerEstimate {
  // Override esterno esplicito
  if (customOverride) {
    return customOverride;
  }

  // 1. Valore pre-impostato nel componente
  if (component.powerRating !== undefined && component.powerRating !== null) {
    const src: PowerSource = component.powerRatingSource || 'userDefined';
    return {
      componentId: component.id,
      componentName: component.name,
      category: component.category,
      watts: component.powerRating > 0 ? Math.round(component.powerRating) : 0,
      source: src,
      label:
        src === 'userDefined'
          ? 'Valore impostato manualmente'
          : src === 'declared'
          ? `Dichiarato dal produttore: ${Math.round(component.powerRating)} W`
          : 'Stima del componente',
      isPsu: component.category === 'psu',
    };
  }

  // 2. Categoria PSU
  if (component.category === 'psu') {
    const psuInfo = extractPsuWattage(component);
    return {
      componentId: component.id,
      componentName: component.name,
      category: 'psu',
      watts: psuInfo.watts,
      source: psuInfo.watts ? 'declared' : 'unknown',
      label: psuInfo.label,
      isPsu: true,
    };
  }

  const combinedText = `${component.name} ${component.brand} ${component.model} ${component.notes || ''}`;

  // 3. Estrazione esplicita da stringa note (es. "TDP 65W/154W" o "TDP 200W")
  // In caso di dual TDP Intel (Base / Turbo PL2), il secondo valore è il picco energetico rilevante.
  const dualTdpMatch = combinedText.match(/tdp\s*(?:base\s*)?(\d{2,3})\s*[wW]?\s*[\/|e]\s*(?:turbo\s*|pl2\s*)?(\d{2,3})\s*[wW]/i);
  if (dualTdpMatch) {
    const peakW = parseInt(dualTdpMatch[2], 10);
    return {
      componentId: component.id,
      componentName: component.name,
      category: component.category,
      watts: peakW,
      source: 'declared',
      label: `TDP dichiarato dal produttore (Picco Turbo PL2: ${peakW} W)`,
    };
  }

  const singleTdpMatch = combinedText.match(/\btdp\s*[:=]?\s*(\d{2,3})\s*[wW]\b/i);
  if (singleTdpMatch) {
    const tdpW = parseInt(singleTdpMatch[1], 10);
    return {
      componentId: component.id,
      componentName: component.name,
      category: component.category,
      watts: tdpW,
      source: 'declared',
      label: `TDP dichiarato dal produttore: ${tdpW} W`,
    };
  }

  // 4. Se GPU, consultazione tabella ufficiale
  if (component.category === 'gpu') {
    for (const entry of KNOWN_GPU_TDP) {
      if (entry.pattern.test(combinedText)) {
        return {
          componentId: component.id,
          componentName: component.name,
          category: 'gpu',
          watts: entry.tdp,
          source: 'declared',
          label: entry.label,
        };
      }
    }
  }

  // 5. Se CPU, consultazione tabella ufficiale
  if (component.category === 'cpu') {
    for (const entry of KNOWN_CPU_TDP) {
      if (entry.pattern.test(combinedText)) {
        return {
          componentId: component.id,
          componentName: component.name,
          category: 'cpu',
          watts: entry.tdp,
          source: 'declared',
          label: entry.label,
        };
      }
    }
  }

  // 6. Per qualsiasi altra categoria (Scheda Madre, RAM, Storage, Dissipatore, Case, ecc.):
  // REGOLA DI CORRETTEZZA: NON INVENTARE DATI. Restituisce unknown e watts: null.
  return {
    componentId: component.id,
    componentName: component.name,
    category: component.category,
    watts: null,
    source: 'unknown',
    label: 'Dato di potenza non disponibile',
  };
}

/**
 * Valuta lo stato del margine di alimentazione disponibile in base ai Watt rimanenti.
 * Terminologia cauta e rigorosamente non assertiva (nessuna "garanzia elettrica").
 */
export function evaluateHeadroomStatus(
  headroomWatts: number | null,
  psuCapacityWatts: number | null
): HeadroomStatus {
  if (headroomWatts === null || psuCapacityWatts === null || psuCapacityWatts <= 0) {
    return 'unknown';
  }
  if (headroomWatts >= 150) {
    return 'high';
  }
  if (headroomWatts >= 50) {
    return 'reduced';
  }
  return 'critical';
}

/**
 * Motore puro per il calcolo del Power Budget su una lista di componenti già identificati come IN_USE.
 * È deterministico, privo di side-effect e indipendente da React e IndexedDB.
 */
export function computeRigPowerBudgetFromInstalled(
  installedComponents: Component[],
  customOverrides?: Record<string, ComponentPowerEstimate>
): RigPowerBudget {
  const estimates: ComponentPowerEstimate[] = [];
  let psuComponent: Component | null = null;
  let psuCapacityWatts: number | null = null;
  let psuSource: PowerSource = 'unknown';

  let knownPowerWatts = 0;
  const unknownComponents: Component[] = [];
  let knownComponentsCount = 0;

  for (const comp of installedComponents) {
    const override = customOverrides ? customOverrides[comp.id] : undefined;
    const est = getComponentPowerEstimate(comp, override);
    estimates.push(est);

    if (comp.category === 'psu') {
      // Memorizza la PSU montata
      if (!psuComponent) {
        psuComponent = comp;
        psuCapacityWatts = est.watts;
        psuSource = est.source;
      }
      // NOTA: la PSU non consuma watt come carico del sistema, fornisce capacità.
      // Non sommiamo la capacità della PSU nel carico di assorbimento del PC.
      continue;
    }

    if (est.watts !== null && est.watts > 0) {
      knownPowerWatts += est.watts;
      knownComponentsCount++;
    } else {
      unknownComponents.push(comp);
    }
  }

  const nonPsuComponents = installedComponents.filter((c) => c.category !== 'psu');
  const totalComponents = nonPsuComponents.length;
  const unknownComponentsCount = unknownComponents.length;
  const hasAnyPowerData = knownPowerWatts > 0;
  const isPartialEstimate = totalComponents > 0 && unknownComponentsCount > 0;

  // Stima di picco del sistema (basata sui carichi noti disponibili)
  const estimatedPeakWatts = knownPowerWatts;

  // Calcolo utilizzo e margine PSU (solo se PSU presente e con potenza nota)
  let estimatedUtilizationPercent: number | null = null;
  let estimatedHeadroomWatts: number | null = null;

  if (psuCapacityWatts !== null && psuCapacityWatts > 0 && estimatedPeakWatts > 0) {
    const rawPercent = (estimatedPeakWatts / psuCapacityWatts) * 100;
    // Protezione totale da NaN e Infinity
    estimatedUtilizationPercent = Number.isFinite(rawPercent) ? Math.round(rawPercent) : null;
    estimatedHeadroomWatts = psuCapacityWatts - estimatedPeakWatts;
  }

  const headroomStatus = evaluateHeadroomStatus(estimatedHeadroomWatts, psuCapacityWatts);

  // Scomposizione ordinata per categoria
  const categoriesPresent = Array.from(new Set(nonPsuComponents.map((c) => c.category)));
  // Priorità visiva classica: GPU, CPU, Storage, Cooling, Motherboard, RAM, Case, altro
  const categoryPriority: Record<ComponentCategory, number> = {
    gpu: 1,
    cpu: 2,
    motherboard: 3,
    ram: 4,
    storage: 5,
    cooling: 6,
    case: 7,
    psu: 8,
    monitor: 9,
    peripherals: 10,
    accessories: 11,
    other: 12,
  };

  categoriesPresent.sort((a, b) => (categoryPriority[a] || 99) - (categoryPriority[b] || 99));

  const categoryBreakdown: CategoryPowerBreakdown[] = categoriesPresent.map((cat) => {
    const compEstimates = estimates.filter((e) => e.category === cat && !e.isPsu);
    let catWattsSum = 0;
    let hasKnown = false;
    let hasUnknowns = false;

    for (const ce of compEstimates) {
      if (ce.watts !== null && ce.watts > 0) {
        catWattsSum += ce.watts;
        hasKnown = true;
      } else {
        hasUnknowns = true;
      }
    }

    return {
      category: cat,
      categoryLabel: COMPONENT_CATEGORY_LABELS[cat] || cat,
      totalWatts: hasKnown ? catWattsSum : null, // null se nessun pezzo della categoria ha dati
      componentsCount: compEstimates.length,
      knownCount: compEstimates.filter((e) => e.watts !== null && e.watts > 0).length,
      hasUnknowns,
    };
  });

  // Frase di trasparenza della stima
  let completenessNotice: string;
  if (totalComponents === 0) {
    completenessNotice = 'Nessun componente montato nel PC attuale.';
  } else if (!hasAnyPowerData) {
    completenessNotice = 'Dati di potenza non disponibili per la configurazione attuale.';
  } else if (isPartialEstimate) {
    completenessNotice = 'Stima parziale: calcolata sui soli componenti con dati di potenza disponibili (es. CPU e GPU).';
  } else {
    completenessNotice = 'Stima di picco basata sui dati dichiarati di tutti i componenti montati.';
  }

  return {
    knownPowerWatts,
    estimatedPeakWatts,
    isPartialEstimate,
    hasAnyPowerData,
    totalComponents,
    knownComponentsCount,
    unknownComponentsCount,
    unknownComponents,
    estimates,
    categoryBreakdown,
    psuComponent,
    psuCapacityWatts,
    psuSource,
    hasPsu: psuComponent !== null,
    estimatedUtilizationPercent,
    estimatedHeadroomWatts,
    headroomStatus,
    completenessNotice,
  };
}

/**
 * Funzione di comodità che estrae i componenti IN_USE tramite la logica di lifecycle pura esistente
 * e ne calcola il Power Budget.
 */
export function computeRigPowerBudget(
  components: Component[],
  events: ComponentEvent[],
  customOverrides?: Record<string, ComponentPowerEstimate>
): RigPowerBudget {
  const installedComponents = components.filter((comp) => {
    const compEvents = events.filter((e) => e.componentId === comp.id);
    return computeComponentStatus(compEvents) === 'IN_USE';
  });

  return computeRigPowerBudgetFromInstalled(installedComponents, customOverrides);
}
