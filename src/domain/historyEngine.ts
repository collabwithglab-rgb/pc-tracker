import {
  Component,
  ComponentCategory,
  ComponentEvent,
  ComponentStatus,
  Checkpoint,
  CheckpointDiscrepancy,
  TemporalPosition,
  TimelineBounds,
  TimeTravelRigSummary,
  CheckpointHistoricalState,
} from '../types';
import { sortEventsChronologically, resolveStatusFromSortedEvents } from './lifecycleEngine';
import { computeCurrentRigCost } from './financialEngine';
import { detectCheckpointDiscrepancy } from './checkpointEngine';
import { isValidISODateString } from './validators';

/**
 * Restituisce la sequenza ordinata deterministicamente di tutti gli eventi registrati.
 * Questa sequenza costituisce la spina dorsale temporale del Time Travel.
 */
export function getTimelineEvents(allEvents: ComponentEvent[]): ComponentEvent[] {
  return sortEventsChronologically(allEvents);
}

/**
 * Calcola i confini temporali assoluti della timeline (prima e ultima data utile).
 * Se non sono presenti eventi validi, restituisce minDate = null e maxDate = null.
 */
export function getTimelineBounds(allEvents: ComponentEvent[]): TimelineBounds {
  const validDates = allEvents
    .filter((e) => isValidISODateString(e.date))
    .map((e) => e.date);

  if (validDates.length === 0) {
    return { minDate: null, maxDate: null };
  }

  validDates.sort();
  return {
    minDate: validDates[0],
    maxDate: validDates[validDates.length - 1],
  };
}

/**
 * Filtra gli eventi avvenuti fino a una determinata TemporalPosition (data, orario relativo o evento di ancoraggio).
 *
 * Risoluzione:
 * 1. Se è specificato anchorEventId ed esiste nella cronologia ordinata:
 *    - 'before_event': include tutti gli eventi fino a quello precedente all'ancora.
 *    - 'after_event' (o default): include tutti gli eventi fino all'evento ancora incluso.
 * 2. Altrimenti, risolve per data:
 *    - 'start_of_day': include solo gli eventi con data strettamente minore (< position.date).
 *    - 'end_of_day' (o default): include tutti gli eventi con data minore o uguale (<= position.date).
 */
export function getEventsUpToPosition(
  allEvents: ComponentEvent[],
  position: TemporalPosition
): ComponentEvent[] {
  const sorted = getTimelineEvents(allEvents);

  if (position.anchorEventId) {
    const anchorIdx = sorted.findIndex((e) => e.id === position.anchorEventId);
    if (anchorIdx !== -1) {
      if (position.boundary === 'before_event') {
        return sorted.slice(0, anchorIdx);
      }
      return sorted.slice(0, anchorIdx + 1);
    }
  }

  if (position.boundary === 'start_of_day') {
    return sorted.filter((e) => e.date < position.date);
  }

  return sorted.filter((e) => e.date <= position.date);
}

/**
 * Ricostruisce lo stato di un componente ad una specifica TemporalPosition (AUD-006).
 */
export function getComponentStatusAtPosition(
  componentId: string,
  allEvents: ComponentEvent[],
  position: TemporalPosition
): ComponentStatus | 'NOT_YET_PURCHASED' {
  const eventsUpTo = getEventsUpToPosition(allEvents, position).filter(
    (e) => e.componentId === componentId
  );

  if (eventsUpTo.length === 0) {
    return 'NOT_YET_PURCHASED';
  }

  const hasPurchase = eventsUpTo.some((e) => e.type === 'PURCHASE');
  if (!hasPurchase) {
    return 'NOT_YET_PURCHASED';
  }

  return resolveStatusFromSortedEvents(eventsUpTo);
}

/**
 * Ricostruisce lo stato di un componente ad una specifica data storica T (fine giornata).
 * Mantiene la compatibilità con l'API legacy.
 */
export function getComponentStatusAtDate(
  componentId: string,
  allEvents: ComponentEvent[],
  targetDate: string
): ComponentStatus | 'NOT_YET_PURCHASED' {
  return getComponentStatusAtPosition(componentId, allEvents, {
    date: targetDate,
    boundary: 'end_of_day',
  });
}

/**
 * Ricostruisce la configurazione esatta del PC ad una precisa TemporalPosition.
 * Restituisce l'elenco dei componenti fisicamente montati (stato IN_USE) in quel punto temporale.
 */
export function getConfigurationAtPosition(
  components: Component[],
  allEvents: ComponentEvent[],
  position: TemporalPosition
): Component[] {
  return components.filter((comp) => {
    const status = getComponentStatusAtPosition(comp.id, allEvents, position);
    return status === 'IN_USE';
  });
}

/**
 * Ricostruisce la configurazione esatta del PC ad una qualsiasi data storica T (fine giornata).
 * Restituisce i componenti che erano fisicamente montati nel PC alla data specificata.
 */
export function getConfigurationAtDate(
  components: Component[],
  allEvents: ComponentEvent[],
  targetDate: string
): Component[] {
  return getConfigurationAtPosition(components, allEvents, {
    date: targetDate,
    boundary: 'end_of_day',
  });
}

/**
 * Calcola il riepilogo statistico ed economico della configurazione montata ad una TemporalPosition.
 * Riutilizza la logica finanziaria formale di financialEngine (computeCurrentRigCost).
 */
export function getRigSummaryAtPosition(
  components: Component[],
  allEvents: ComponentEvent[],
  position: TemporalPosition
): TimeTravelRigSummary {
  const installed = getConfigurationAtPosition(components, allEvents, position);
  const relevantEvents = getEventsUpToPosition(allEvents, position);

  const rigPurchaseCost = computeCurrentRigCost(installed, relevantEvents);
  const categoryCounts: Partial<Record<ComponentCategory, number>> = {};

  for (const comp of installed) {
    categoryCounts[comp.category] = (categoryCounts[comp.category] || 0) + 1;
  }

  return {
    componentCount: installed.length,
    rigPurchaseCost,
    categoryCounts,
    components: installed,
  };
}

/**
 * Calcola il riepilogo statistico ed economico della configurazione ad una data storica T (fine giornata).
 */
export function getRigSummaryAtDate(
  components: Component[],
  allEvents: ComponentEvent[],
  targetDate: string
): TimeTravelRigSummary {
  return getRigSummaryAtPosition(components, allEvents, {
    date: targetDate,
    boundary: 'end_of_day',
  });
}

/**
 * Restituisce la fotografia storica congelata nel Checkpoint.
 *
 * REGOLA ARCHITETTURALE:
 * Il Checkpoint è un'istantanea volontaria e immutabile dell'utente.
 * NON viene ricalcolato automaticamente dagli eventi correnti.
 */
export function getStateAtCheckpoint(checkpoint: Checkpoint): CheckpointHistoricalState {
  return {
    checkpoint,
    components: checkpoint.componentsSnapshot.map((entry) => ({
      id: entry.componentId,
      name: entry.name,
      brand: entry.brand,
      model: entry.model,
      category: entry.category,
      slotOrLocation: entry.slotOrLocation,
      purchasePrice: entry.purchasePrice,
      notes: entry.notes,
    })),
    summary: checkpoint.summary,
    isFrozenSnapshot: true,
  };
}

/**
 * Confronta la fotografia congelata nel Checkpoint con la configurazione
 * ricostruita dagli Eventi alla medesima data/posizione temporale.
 *
 * In caso di discrepanza informativa (es. eventi modificati retroattivamente):
 * - Il Checkpoint NON cambia;
 * - Lo snapshot NON viene riscritto;
 * - Viene restituito il delta informativo tra Checkpoint e ricostruzione.
 */
export function compareCheckpointToReconstruction(
  checkpoint: Checkpoint,
  components: Component[],
  allEvents: ComponentEvent[]
): CheckpointDiscrepancy {
  const position: TemporalPosition = {
    date: checkpoint.referenceDate,
    anchorEventId: checkpoint.anchorEventId,
    boundary: checkpoint.anchorEventId ? 'after_event' : 'end_of_day',
  };

  const reconstructedComponents = getConfigurationAtPosition(components, allEvents, position);
  const relevantEvents = getEventsUpToPosition(allEvents, position);

  return detectCheckpointDiscrepancy(checkpoint, reconstructedComponents, relevantEvents);
}
