import { Component, ComponentCategory } from './component';

/**
 * Sorgente del valore di potenza:
 * - declared: dato tecnico dichiarato dal produttore (TDP / capacità PSU nominale)
 * - estimated: stima euristica derivata da specifiche tecniche comparabili
 * - userDefined: valore specificato manualmente dall'utente
 * - unknown: dato non disponibile o insufficiente
 */
export type PowerSource = 'declared' | 'estimated' | 'userDefined' | 'unknown';

/**
 * Stato qualitativo prudente del margine di alimentazione disponibile.
 * Nessuna pretesa di certificazione elettrica assoluta:
 * - high: margine stimato abbondante (>= 150 W)
 * - reduced: margine stimato ridotto (50-149 W)
 * - critical: margine stimato critico o deficitario (< 50 W)
 * - unknown: dati insufficienti per stabilire un margine
 */
export type HeadroomStatus = 'high' | 'reduced' | 'critical' | 'unknown';

/**
 * Metadati di potenza per un singolo componente hardware.
 */
export interface ComponentPowerEstimate {
  componentId: string;
  componentName: string;
  category: ComponentCategory;
  watts: number | null;
  source: PowerSource;
  label: string;
  isPsu?: boolean;
}

/**
 * Scomposizione del fabbisogno energetico aggregato per categoria hardware.
 */
export interface CategoryPowerBreakdown {
  category: ComponentCategory;
  categoryLabel: string;
  totalWatts: number | null; // null se nessun componente della categoria ha dati noti
  componentsCount: number;
  knownCount: number;
  hasUnknowns: boolean;
}

/**
 * Risultato completo e strutturato del calcolo del Power Budget del Rig Attuale.
 */
export interface RigPowerBudget {
  // Metriche di potenza
  knownPowerWatts: number; // Somma esatta dei soli carichi con specifiche disponibili (Watt)
  estimatedPeakWatts: number | null; // Stima di picco dell'intero sistema (disponibile SOLO con dataset completo; null se parziale)
  isPartialEstimate: boolean; // true se uno o più componenti montati non hanno dati di potenza sufficienti
  isCompleteEstimate: boolean; // true SOLO se tutti i carichi montati dispongono di dati di potenza
  hasAnyPowerData: boolean; // true se almeno un componente ha un valore noto

  // Statistiche componenti
  totalComponents: number;
  knownComponentsCount: number;
  unknownComponentsCount: number;
  unknownComponents: Component[];
  estimates: ComponentPowerEstimate[];
  categoryBreakdown: CategoryPowerBreakdown[];

  // Alimentatore (PSU)
  psuComponent: Component | null;
  psuCapacityWatts: number | null;
  psuSource: PowerSource;
  hasPsu: boolean;

  // Confronto e Margini (esclusivamente quando la base dati del sistema è completa e affidabile)
  estimatedUtilizationPercent: number | null; // Arrotondato a intero; null se PSU assente o stima di sistema parziale
  estimatedHeadroomWatts: number | null; // PSU - peak; null se PSU assente o stima di sistema parziale
  headroomStatus: HeadroomStatus; // Valutato solo su stime complete; 'unknown' se dati parziali o PSU assente
  completenessNotice: string; // Frase descrittiva trasparente sull'attendibilità della stima
}
