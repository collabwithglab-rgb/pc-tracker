import {
  Component,
  ComponentCategory,
  ComponentEvent,
  InstallEvent,
  PurchaseEvent,
  ExtraExpenseEvent,
  Upgrade,
  Checkpoint,
  CheckpointComponentEntry,
  CheckpointDiscrepancy,
  CheckpointTrigger,
} from '../types';
import { generateId } from '../utils/id';
import { getLocalDateISO, sortEventsChronologically } from './lifecycleEngine';
import { isValidISODateString, VALID_CATEGORIES, ValidationErrors } from './validators';

/**
 * Valida il nome di un Checkpoint.
 * Regole:
 * - Obbligatorio e non nullo.
 * - Lunghezza compresa tra 2 e 100 caratteri dopo il trim.
 */
export function validateCheckpointName(
  name: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Il nome del checkpoint è obbligatorio.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Il nome del checkpoint non può essere vuoto.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Il nome del checkpoint deve contenere almeno 2 caratteri.' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Il nome del checkpoint non può superare 100 caratteri.' };
  }

  return { isValid: true };
}

/**
 * Valida la coerenza e l'esistenza di un eventuale evento di ancoraggio temporale.
 * Se specificato, l'evento deve esistere e la sua data deve coincidere con la referenceDate del checkpoint.
 */
export function isAnchorEventValid(
  anchorEventId: string | null | undefined,
  events: ComponentEvent[],
  referenceDate?: string
): { isValid: boolean; error?: string } {
  if (!anchorEventId) {
    return { isValid: true };
  }

  const foundEvent = events.find((e) => e.id === anchorEventId);
  if (!foundEvent) {
    return {
      isValid: false,
      error: 'L’evento di ancoraggio specificato non esiste nella cronologia eventi.',
    };
  }

  if (referenceDate && foundEvent.date !== referenceDate) {
    return {
      isValid: false,
      error: `L’evento di ancoraggio appartiene al ${foundEvent.date}, data diversa rispetto alla data di riferimento del checkpoint (${referenceDate}).`,
    };
  }

  return { isValid: true };
}

/**
 * Valida l'esistenza di un eventuale upgrade associato al checkpoint.
 */
export function isRelatedUpgradeValid(
  relatedUpgradeId: string | null | undefined,
  upgrades: Upgrade[]
): { isValid: boolean; error?: string } {
  if (!relatedUpgradeId) {
    return { isValid: true };
  }

  const foundUpgrade = upgrades.find((u) => u.id === relatedUpgradeId);
  if (!foundUpgrade) {
    return {
      isValid: false,
      error: 'L’upgrade collegato specificato non esiste nel database.',
    };
  }

  return { isValid: true };
}

/**
 * Valida la struttura formale e l'integrità di un oggetto Checkpoint.
 */
export function validateCheckpoint(
  checkpoint: Partial<Checkpoint>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // 1. Validazione Nome
  const nameResult = validateCheckpointName(checkpoint.name);
  if (!nameResult.isValid && nameResult.error) {
    errors.name = nameResult.error;
  }

  // 2. Validazione Data di Riferimento
  if (!checkpoint.referenceDate || checkpoint.referenceDate.trim().length === 0) {
    errors.referenceDate = 'La data di riferimento è obbligatoria.';
  } else if (!isValidISODateString(checkpoint.referenceDate)) {
    errors.referenceDate = 'Data di riferimento non valida (formato atteso: YYYY-MM-DD).';
  }

  // 3. Validazione Trigger
  const validTriggers: CheckpointTrigger[] = ['manual', 'suggested_upgrade', 'suggested_major'];
  if (!checkpoint.trigger || !validTriggers.includes(checkpoint.trigger)) {
    errors.trigger = 'Motivazione di creazione (trigger) non valida.';
  }

  // 4. Validazione Snapshot Componenti
  if (!Array.isArray(checkpoint.componentsSnapshot)) {
    errors.componentsSnapshot = 'Lo snapshot dei componenti deve essere un array.';
  } else {
    checkpoint.componentsSnapshot.forEach((entry, idx) => {
      if (!entry.name || entry.name.trim().length === 0) {
        errors[`componentsSnapshot[${idx}].name`] = 'Nome componente mancante nello snapshot.';
      }
      if (!entry.category || !VALID_CATEGORIES.includes(entry.category)) {
        errors[`componentsSnapshot[${idx}].category`] = 'Categoria non valida nello snapshot.';
      }
      if (entry.purchasePrice !== undefined && (isNaN(entry.purchasePrice) || entry.purchasePrice < 0)) {
        errors[`componentsSnapshot[${idx}].purchasePrice`] = 'Il prezzo di acquisto non può essere negativo.';
      }
    });
  }

  // 5. Validazione Summary
  if (!checkpoint.summary) {
    errors.summary = 'Il riepilogo (summary) del checkpoint è obbligatorio.';
  } else {
    if (typeof checkpoint.summary.componentCount !== 'number' || checkpoint.summary.componentCount < 0) {
      errors['summary.componentCount'] = 'Il numero di componenti deve essere un numero non negativo.';
    }
    if (typeof checkpoint.summary.rigPurchaseCost !== 'number' || checkpoint.summary.rigPurchaseCost < 0) {
      errors['summary.rigPurchaseCost'] = 'Il costo della configurazione deve essere un numero non negativo.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Crea deterministicamente un Checkpoint a partire da una configurazione di componenti montati.
 * Cattura lo snapshot leggero dei componenti e calcola le metriche di sintesi congelate.
 */
export function createCheckpointFromRig(params: {
  name: string;
  referenceDate?: string;
  notes?: string;
  trigger?: CheckpointTrigger;
  anchorEventId?: string | null;
  relatedUpgradeId?: string | null;
  installedComponents: Component[];
  events: ComponentEvent[];
  id?: string;
  createdAt?: string;
}): Checkpoint {
  const nameValidation = validateCheckpointName(params.name);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error);
  }

  const refDate = params.referenceDate || getLocalDateISO();
  if (!isValidISODateString(refDate)) {
    throw new Error(`Data di riferimento non valida: ${refDate}`);
  }

  const categoryCounts: Partial<Record<ComponentCategory, number>> = {};
  let rigPurchaseCost = 0;

  // Costruisce lo snapshot congelato per ciascun componente montato
  const componentsSnapshot: CheckpointComponentEntry[] = params.installedComponents.map((comp) => {
    // Eventi del componente fino alla data di riferimento
    const compEvents = sortEventsChronologically(
      params.events.filter((e) => e.componentId === comp.id && e.date <= refDate)
    );

    // Trova l'ultimo evento di installazione per ricavare slot/posizione
    const latestInstall = [...compEvents].reverse().find((e) => e.type === 'INSTALL') as
      | InstallEvent
      | undefined;

    // Trova evento di acquisto per ricavare il prezzo storico
    const purchaseEvent = compEvents.find((e) => e.type === 'PURCHASE') as
      | PurchaseEvent
      | undefined;

    // Aggiunge eventuali spese extra sostenute per il componente
    const extraExpenses = compEvents.filter((e) => e.type === 'EXTRA_EXPENSE') as ExtraExpenseEvent[];
    const extraAmount = extraExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

    const purchasePrice = purchaseEvent
      ? Number(((purchaseEvent.price || 0) + extraAmount).toFixed(2))
      : undefined;

    if (purchasePrice !== undefined) {
      rigPurchaseCost += purchasePrice;
    }

    categoryCounts[comp.category] = (categoryCounts[comp.category] || 0) + 1;

    return {
      componentId: comp.id,
      name: comp.name,
      brand: comp.brand || '',
      model: comp.model || '',
      category: comp.category,
      slotOrLocation: latestInstall?.slotOrLocation,
      purchasePrice,
      notes: comp.notes,
    };
  });

  return {
    id: params.id || generateId(),
    name: params.name.trim(),
    referenceDate: refDate,
    createdAt: params.createdAt || new Date().toISOString(),
    notes: params.notes?.trim() || undefined,
    trigger: params.trigger || 'manual',
    anchorEventId: params.anchorEventId ?? null,
    relatedUpgradeId: params.relatedUpgradeId ?? null,
    componentsSnapshot,
    summary: {
      componentCount: componentsSnapshot.length,
      rigPurchaseCost: Number(rigPurchaseCost.toFixed(2)),
      categoryCounts,
    },
  };
}

/**
 * Ordina deterministicamente una lista di Checkpoint.
 * Criteri in ordine di priorità:
 * 1. referenceDate cronologica crescente (YYYY-MM-DD).
 * 2. Posizione temporale dell'anchorEventId nella sequenza ordinata degli eventi (per discriminare stati nello stesso giorno).
 * 3. createdAt crescente come fallback infra-giornaliero.
 * 4. id crescente per assoluto determinismo.
 */
export function sortCheckpointsChronologically(
  checkpoints: Checkpoint[],
  events: ComponentEvent[] = []
): Checkpoint[] {
  if (checkpoints.length <= 1) {
    return [...checkpoints];
  }

  // Pre-calcola l'indice di apparizione di ciascun evento nella sequenza cronologica
  const sortedEvents = events.length > 0 ? sortEventsChronologically(events) : [];
  const eventIndexMap = new Map<string, number>();
  sortedEvents.forEach((ev, idx) => {
    eventIndexMap.set(ev.id, idx);
  });

  return [...checkpoints].sort((a, b) => {
    // 1. Data di riferimento
    if (a.referenceDate !== b.referenceDate) {
      return a.referenceDate.localeCompare(b.referenceDate);
    }

    // 2. Ordinamento tramite anchorEventId se entrambi agganciati
    if (a.anchorEventId && b.anchorEventId && a.anchorEventId !== b.anchorEventId) {
      const idxA = eventIndexMap.get(a.anchorEventId);
      const idxB = eventIndexMap.get(b.anchorEventId);
      if (idxA !== undefined && idxB !== undefined && idxA !== idxB) {
        return idxA - idxB;
      }
    }

    // 3. Fallback createdAt
    if (a.createdAt !== b.createdAt) {
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    }

    // 4. Determinismo assoluto tramite ID
    return a.id.localeCompare(b.id);
  });
}

/**
 * Determina se un'operazione su un componente o un upgrade è un candidato naturale
 * per suggerire all'utente di creare un nuovo Checkpoint.
 */
export function shouldSuggestCheckpoint(params: {
  upgrade?: Upgrade;
  event?: ComponentEvent;
  component?: Component;
}): { shouldSuggest: boolean; reason?: 'upgrade' | 'major_change' } {
  // Un upgrade generazionale è il caso primario di suggerimento
  if (params.upgrade) {
    return { shouldSuggest: true, reason: 'upgrade' };
  }

  // Modifiche strutturali fondanti (es. installazione di una scheda madre o processore)
  if (params.event && params.event.type === 'INSTALL') {
    if (params.component && (params.component.category === 'motherboard' || params.component.category === 'cpu')) {
      return { shouldSuggest: true, reason: 'major_change' };
    }
  }

  return { shouldSuggest: false };
}

/**
 * Analizza le eventuali discrepanze tra la fotografia immutabile congelata nel Checkpoint
 * e la configurazione attualmente ricostruita dagli Eventi alla medesima data storica.
 *
 * Rispetta la regola fondamentale:
 * "Time Travel = verità ricostruita dagli Events."
 * "Checkpoint = memoria storica esplicita dell'utente."
 *
 * Questa funzione è puramente informativa e NON modifica lo snapshot del Checkpoint.
 */
export function detectCheckpointDiscrepancy(
  checkpoint: Checkpoint,
  reconstructedComponents: Component[],
  events: ComponentEvent[] = []
): CheckpointDiscrepancy {
  const reconstructedMap = new Map(reconstructedComponents.map((c) => [c.id, c]));
  const snapshotIdSet = new Set(checkpoint.componentsSnapshot.map((entry) => entry.componentId));

  // Componenti congelati nel checkpoint che non risultano più montati secondo gli eventi
  const missingInReconstruction = checkpoint.componentsSnapshot.filter(
    (entry) => !reconstructedMap.has(entry.componentId)
  );

  // Componenti che risultano montati secondo gli eventi ma non erano presenti nello snapshot
  const addedInReconstruction = reconstructedComponents
    .filter((comp) => !snapshotIdSet.has(comp.id))
    .map((comp) => ({ id: comp.id, name: comp.name, category: comp.category }));

  // Calcola il costo totale di acquisto della configurazione ricostruita
  let reconstructedCost = 0;
  for (const comp of reconstructedComponents) {
    const compEvents = events.filter((e) => e.componentId === comp.id && e.date <= checkpoint.referenceDate);
    const purchase = compEvents.find((e) => e.type === 'PURCHASE') as PurchaseEvent | undefined;
    const extras = compEvents.filter((e) => e.type === 'EXTRA_EXPENSE') as ExtraExpenseEvent[];
    const extraTotal = extras.reduce((sum, ex) => sum + (ex.amount || 0), 0);
    reconstructedCost += (purchase?.price || 0) + extraTotal;
  }

  const costDifference = Number((reconstructedCost - checkpoint.summary.rigPurchaseCost).toFixed(2));
  const hasDiscrepancies = missingInReconstruction.length > 0 || addedInReconstruction.length > 0;

  return {
    hasDiscrepancies,
    missingInReconstruction,
    addedInReconstruction,
    costDifference,
  };
}

/**
 * Crea un Checkpoint a partire dalla configurazione hardware corrente della macchina.
 * La logica di dominio determina automaticamente i componenti montati, l'eventuale evento
 * di ancoraggio più recente tra quelli attivi, e la data di riferimento odierna.
 * L'UI non deve compiere assunzioni né hardcodare anchorEventId.
 */
export function createCheckpointFromCurrentRig(params: {
  name: string;
  notes?: string;
  trigger?: CheckpointTrigger;
  components: Component[];
  events: ComponentEvent[];
  installedComponents?: Component[];
  relatedUpgradeId?: string | null;
  referenceDate?: string;
}): Checkpoint {
  const refDate = params.referenceDate || getLocalDateISO();

  // Se i componenti montati non sono forniti esplicitamente, ricavali filtrando per stato attuale
  const installed = params.installedComponents || params.components.filter((c) => {
    const compEvents = params.events.filter((e) => e.componentId === c.id);
    const sorted = sortEventsChronologically(compEvents);
    const latestInstallOrUninstall = [...sorted]
      .reverse()
      .find((e) => e.type === 'INSTALL' || e.type === 'UNINSTALL');
    const isTerminal = sorted.some((e) => e.type === 'SALE' || e.type === 'GIFT' || e.type === 'DISPOSAL');
    return !isTerminal && latestInstallOrUninstall?.type === 'INSTALL';
  });

  // Trova l'evento più recente tra i componenti attualmente montati per l'eventuale ancoraggio
  const installedIds = new Set(installed.map((c) => c.id));
  const relevantEvents = params.events.filter((e) => installedIds.has(e.componentId));
  const sortedRelevantEvents = sortEventsChronologically(relevantEvents);
  const latestRelevantEvent = sortedRelevantEvents.length > 0
    ? sortedRelevantEvents[sortedRelevantEvents.length - 1]
    : undefined;

  const anchorEventId = latestRelevantEvent?.date === refDate ? latestRelevantEvent.id : null;

  return createCheckpointFromRig({
    name: params.name,
    referenceDate: refDate,
    notes: params.notes,
    trigger: params.trigger || 'manual',
    anchorEventId,
    relatedUpgradeId: params.relatedUpgradeId,
    installedComponents: installed,
    events: params.events,
  });
}

/**
 * Crea un Checkpoint catturando fedelmente una precisa posizione temporale (Time Travel).
 * La logica di dominio deriva i componenti montati e le spese a quel punto temporale esatto.
 */
export function createCheckpointFromTemporalPosition(params: {
  name: string;
  notes?: string;
  trigger?: CheckpointTrigger;
  position: { date: string; anchorEventId?: string | null; boundary?: string };
  installedComponents: Component[];
  events: ComponentEvent[];
  relatedUpgradeId?: string | null;
}): Checkpoint {
  return createCheckpointFromRig({
    name: params.name,
    referenceDate: params.position.date,
    notes: params.notes,
    trigger: params.trigger || 'manual',
    anchorEventId: params.position.anchorEventId || null,
    relatedUpgradeId: params.relatedUpgradeId,
    installedComponents: params.installedComponents,
    events: params.events,
  });
}

/**
 * Aggiorna esclusivamente i metadati modificabili (nome e note) di un Checkpoint.
 * Preserva integralmente e inviolabilmente lo snapshot dei componenti e i dati di sintesi congelati.
 */
export function updateCheckpointMetadata(
  checkpoint: Checkpoint,
  updates: { name?: string; notes?: string }
): Checkpoint {
  if (updates.name !== undefined) {
    const val = validateCheckpointName(updates.name);
    if (!val.isValid) {
      throw new Error(val.error);
    }
  }

  return {
    ...checkpoint,
    name: updates.name !== undefined ? updates.name.trim() : checkpoint.name,
    notes: updates.notes !== undefined ? updates.notes.trim() || undefined : checkpoint.notes,
  };
}

