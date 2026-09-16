import { Component, ComponentCategory } from './component';
import { Checkpoint, CheckpointSummary } from './checkpoint';

/**
 * Delimitatore di confine per la risoluzione temporale ad una data o evento.
 * - 'start_of_day': inizio della giornata, prima che qualsiasi evento di quel giorno abbia avuto luogo.
 * - 'end_of_day': fine della giornata, dopo che tutti gli eventi di quel giorno hanno avuto luogo.
 * - 'after_event': subito dopo l'esecuzione dell'evento specificato in anchorEventId.
 * - 'before_event': subito prima dell'esecuzione dell'evento specificato in anchorEventId.
 */
export type TemporalBoundary =
  | 'start_of_day'
  | 'end_of_day'
  | 'after_event'
  | 'before_event';

/**
 * Rappresenta un punto preciso nel tempo della storia del PC.
 * Può esprimere una data pura, una posizione infra-giornaliera (prima/dopo gli eventi del giorno),
 * oppure l'ancoraggio a uno specifico evento della cronologia.
 */
export interface TemporalPosition {
  /** Data ISO 'YYYY-MM-DD' */
  date: string;
  /** Eventuale ID evento per ancoraggio infra-giornaliero */
  anchorEventId?: string | null;
  /** Delimitatore temporale (default: 'end_of_day' se senza anchor, 'after_event' se con anchor) */
  boundary?: TemporalBoundary;
}

/**
 * Estremi temporali della timeline (prima e ultima data utile registrata).
 */
export interface TimelineBounds {
  minDate: string | null;
  maxDate: string | null;
}

/**
 * Sintesi statistica ed economica della configurazione ad un punto temporale (Time Travel).
 */
export interface TimeTravelRigSummary {
  componentCount: number;
  rigPurchaseCost: number;
  categoryCounts: Partial<Record<ComponentCategory, number>>;
  components: Component[];
}

/**
 * Risultato della lettura di un Checkpoint per Time Travel.
 * Espone la fotografia congelata immutabile salvata dall'utente, NON una ricostruzione ricalcolata.
 */
export interface CheckpointHistoricalState {
  checkpoint: Checkpoint;
  components: Array<{
    id: string;
    name: string;
    brand: string;
    model: string;
    category: ComponentCategory;
    slotOrLocation?: string;
    purchasePrice?: number;
    notes?: string;
  }>;
  summary: CheckpointSummary;
  isFrozenSnapshot: true;
}
