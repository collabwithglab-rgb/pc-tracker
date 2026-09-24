import { MaintenanceEntry, MaintenanceType, MAINTENANCE_TYPE_LABELS, MaintenanceConditionResult } from '../types';
import { isValidISODateString } from './validators';
import { getLocalDateISO } from './lifecycleEngine';

/**
 * Ordina gli interventi di manutenzione cronologicamente:
 * - Primario: data decrescente (i più recenti in cima)
 * - Secondario: createdAt decrescente
 * - Tie-breaker: ID univoco
 */
export function sortMaintenanceEntriesChronologically(
  entries: MaintenanceEntry[],
  direction: 'asc' | 'desc' = 'desc'
): MaintenanceEntry[] {
  return [...entries].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) {
      return direction === 'desc' ? -dateComp : dateComp;
    }
    const createdComp = (a.createdAt || '').localeCompare(b.createdAt || '');
    if (createdComp !== 0) {
      return direction === 'desc' ? -createdComp : createdComp;
    }
    return direction === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
  });
}

/**
 * Filtra gli interventi di manutenzione associati ad uno specifico componente.
 */
export function getMaintenanceByComponent(
  entries: MaintenanceEntry[],
  componentId: string
): MaintenanceEntry[] {
  if (!componentId) return [];
  return entries.filter((e) => e.componentIds && e.componentIds.includes(componentId));
}

/**
 * Restituisce l'ultimo intervento registrato di sostituzione pasta termica,
 * opzionalmente filtrato per componente (es. CPU o GPU).
 */
export function getLatestThermalPasteService(
  entries: MaintenanceEntry[],
  componentId?: string
): MaintenanceEntry | undefined {
  const pasteEntries = entries.filter((e) => e.type === 'thermal_paste');
  const filtered = componentId
    ? pasteEntries.filter((e) => e.componentIds && e.componentIds.includes(componentId))
    : pasteEntries;
  const sorted = sortMaintenanceEntriesChronologically(filtered, 'desc');
  return sorted[0];
}

/**
 * Restituisce gli interventi con una prossima data di manutenzione programmata (nextDueDate),
 * ordinati cronologicamente (il più vicino o imminente per primo).
 */
export function computeUpcomingMaintenance(
  entries: MaintenanceEntry[],
  _referenceDate: string = new Date().toISOString().split('T')[0]
): MaintenanceEntry[] {
  return entries
    .filter((e) => e.nextDueDate && isValidISODateString(e.nextDueDate))
    .sort((a, b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || ''));
}

/**
 * Calcola il totale delle spese registrate per interventi di manutenzione.
 */
export function computeTotalMaintenanceCost(entries: MaintenanceEntry[]): number {
  return entries.reduce((total, entry) => {
    const cost = typeof entry.cost === 'number' && !isNaN(entry.cost) && entry.cost > 0 ? entry.cost : 0;
    return total + cost;
  }, 0);
}

/**
 * Valida un intervento di manutenzione prima del salvataggio.
 */
export function validateMaintenanceEntry(
  entry: Partial<MaintenanceEntry>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!entry.title || typeof entry.title !== 'string' || entry.title.trim().length === 0) {
    errors.title = 'Il titolo della manutenzione è obbligatorio.';
  } else if (entry.title.trim().length > 120) {
    errors.title = 'Il titolo non può superare i 120 caratteri.';
  }

  if (!entry.date || !isValidISODateString(entry.date)) {
    errors.date = 'Inserisci una data valida nel formato YYYY-MM-DD.';
  }

  if (!entry.type || !(entry.type in MAINTENANCE_TYPE_LABELS)) {
    errors.type = 'Seleziona un tipo di manutenzione valido.';
  }

  if (entry.cost !== undefined && entry.cost !== null) {
    if (typeof entry.cost !== 'number' || isNaN(entry.cost) || entry.cost < 0) {
      errors.cost = 'Il costo deve essere un numero positivo o zero.';
    }
  }

  if (entry.nextDueDate && !isValidISODateString(entry.nextDueDate)) {
    errors.nextDueDate = 'La data di prossima manutenzione non è valida (formato atteso: YYYY-MM-DD).';
  }

  if (entry.date && entry.nextDueDate && isValidISODateString(entry.date) && isValidISODateString(entry.nextDueDate)) {
    if (entry.nextDueDate < entry.date) {
      errors.nextDueDate = 'La data di prossima manutenzione non può essere antecedente alla data dell’intervento.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Filtro polivalente per la schermata del registro manutenzione.
 */
export function filterMaintenanceEntries(
  entries: MaintenanceEntry[],
  filter: {
    type?: MaintenanceType | 'ALL';
    componentId?: string;
    searchQuery?: string;
  }
): MaintenanceEntry[] {
  return entries.filter((entry) => {
    if (filter.type && filter.type !== 'ALL' && entry.type !== filter.type) {
      return false;
    }
    if (filter.componentId && (!entry.componentIds || !entry.componentIds.includes(filter.componentId))) {
      return false;
    }
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchTitle = entry.title.toLowerCase().includes(q);
      const matchDesc = entry.description ? entry.description.toLowerCase().includes(q) : false;
      const matchProduct = entry.productUsed ? entry.productUsed.toLowerCase().includes(q) : false;
      const matchNotes = entry.notes ? entry.notes.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchDesc && !matchProduct && !matchNotes) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Restituisce l'ultimo intervento registrato di uno specifico tipo.
 */
export function getLastMaintenanceOfType(
  entries: MaintenanceEntry[],
  type: MaintenanceType
): MaintenanceEntry | undefined {
  const filtered = entries.filter((e) => e.type === type);
  const sorted = sortMaintenanceEntriesChronologically(filtered, 'desc');
  return sorted[0];
}

/**
 * Restituisce i dettagli dell'ultima applicazione di pasta termica.
 */
export function getLastThermalPasteApplication(
  entries: MaintenanceEntry[],
  components?: { id: string; name: string }[]
): { date: string; productUsed?: string; componentName?: string } | undefined {
  const last = getLatestThermalPasteService(entries);
  if (!last) return undefined;
  const comp =
    components && last.componentIds && last.componentIds.length > 0
      ? components.find((c) => c.id === last.componentIds![0])
      : undefined;
  return {
    date: last.date,
    productUsed: last.productUsed,
    componentName: comp ? comp.name : undefined,
  };
}

/**
 * Restituisce la classe badge CSS per la tipologia di manutenzione.
 */
export function getMaintenanceTypeBadgeClass(type: MaintenanceType): string {
  switch (type) {
    case 'cleaning':
    case 'filter_cleaning':
    case 'fan_cleaning':
      return 'badge-cyan';
    case 'thermal_paste':
    case 'thermal_pad':
      return 'badge-amber';
    case 'storage_maintenance':
      return 'badge-emerald';
    case 'inspection':
      return 'badge-gray';
    case 'system_maintenance':
      return 'badge-purple';
    case 'other':
    default:
      return 'badge-gray';
  }
}

/**
 * Calcola i giorni trascorsi tra una data passata e una data di riferimento (default: oggi locale).
 * Restituisce null se la data passata non è fornita o non è valida.
 * Non restituisce mai valori negativi per date passate.
 */
export function computeDaysElapsed(
  dateStr?: string,
  referenceDate: string = getLocalDateISO()
): number | null {
  if (!dateStr || !isValidISODateString(dateStr)) return null;
  const [y1, m1, d1] = dateStr.split('-').map(Number);
  const [y2, m2, d2] = referenceDate.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calcola i giorni rimanenti fino a una data futura di scadenza/promemoria.
 * Valori negativi indicano che la scadenza è stata superata (overdue).
 */
export function computeDaysRemaining(
  targetDateStr?: string,
  referenceDate: string = getLocalDateISO()
): number | null {
  if (!targetDateStr || !isValidISODateString(targetDateStr)) return null;
  const [y1, m1, d1] = referenceDate.split('-').map(Number);
  const [y2, m2, d2] = targetDateStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Valuta oggettivamente la condizione della pasta termica in base al tempo trascorso dall'ultimo intervento.
 *
 * Soglie oggettive documentate:
 * - < 180 giorni (< 6 mesi): Fresca (badge-emerald)
 * - 180-365 giorni (6-12 mesi): Buona (badge-cyan)
 * - 366-730 giorni (1-2 anni): Da monitorare (badge-amber)
 * - > 730 giorni (> 2 anni): Sostituzione consigliata (badge-ruby)
 * - Nessuna registrazione: Non registrata (badge-gray)
 */
export function evaluateThermalPasteCondition(
  lastDate?: string,
  referenceDate: string = getLocalDateISO()
): MaintenanceConditionResult {
  const days = computeDaysElapsed(lastDate, referenceDate);
  if (days === null) {
    return {
      tier: 'none',
      label: 'Non registrata',
      badgeClass: 'badge-gray',
      description: 'Nessun cambio pasta termica registrato',
      daysElapsed: null,
    };
  }

  if (days < 180) {
    return {
      tier: 'optimal',
      label: 'Fresca',
      badgeClass: 'badge-emerald',
      description: 'Applicazione recente (< 6 mesi)',
      daysElapsed: days,
    };
  }

  if (days <= 365) {
    return {
      tier: 'good',
      label: 'Buona',
      badgeClass: 'badge-cyan',
      description: 'Applicazione valida (entro 1 anno)',
      daysElapsed: days,
    };
  }

  if (days <= 730) {
    return {
      tier: 'monitor',
      label: 'Da monitorare',
      badgeClass: 'badge-amber',
      description: 'Oltre 1 anno dall’applicazione',
      daysElapsed: days,
    };
  }

  return {
    tier: 'due',
    label: 'Sostituzione consigliata',
    badgeClass: 'badge-ruby',
    description: 'Oltre 2 anni dall’applicazione',
    daysElapsed: days,
  };
}

/**
 * Valuta oggettivamente lo stato di pulizia (filtri, ventole, case) in base al tempo trascorso.
 *
 * Soglie oggettive documentate:
 * - < 60 giorni (< 2 mesi): Fresca (badge-emerald)
 * - 60-120 giorni (2-4 mesi): Buona (badge-cyan)
 * - > 120 giorni (> 4 mesi): Da monitorare (badge-amber)
 * - Nessuna registrazione: Non registrata (badge-gray)
 */
export function evaluateCleaningCondition(
  lastDate?: string,
  referenceDate: string = getLocalDateISO()
): MaintenanceConditionResult {
  const days = computeDaysElapsed(lastDate, referenceDate);
  if (days === null) {
    return {
      tier: 'none',
      label: 'Non registrata',
      badgeClass: 'badge-gray',
      description: 'Nessuna pulizia registrata',
      daysElapsed: null,
    };
  }

  if (days < 60) {
    return {
      tier: 'optimal',
      label: 'Fresca',
      badgeClass: 'badge-emerald',
      description: 'Pulizia recente (< 2 mesi)',
      daysElapsed: days,
    };
  }

  if (days <= 120) {
    return {
      tier: 'good',
      label: 'Buona',
      badgeClass: 'badge-cyan',
      description: 'Entro 4 mesi dall’ultima pulizia',
      daysElapsed: days,
    };
  }

  return {
    tier: 'monitor',
    label: 'Da monitorare',
    badgeClass: 'badge-amber',
    description: 'Oltre 4 mesi dall’ultima pulizia',
    daysElapsed: days,
  };
}

/**
 * Restituisce l'ultimo intervento registrato di pulizia (generale, filtri o ventole).
 */
export function getLatestCleaningService(
  entries: MaintenanceEntry[]
): MaintenanceEntry | undefined {
  const cleanings = entries.filter((e) =>
    e.type === 'cleaning' || e.type === 'filter_cleaning' || e.type === 'fan_cleaning'
  );
  const sorted = sortMaintenanceEntriesChronologically(cleanings, 'desc');
  return sorted[0];
}

/**
 * Restituisce il promemoria / intervento programmato più imminente.
 */
export function getEarliestUpcomingMaintenance(
  entries: MaintenanceEntry[],
  referenceDate: string = getLocalDateISO()
): { entry: MaintenanceEntry; daysRemaining: number; isOverdue: boolean } | undefined {
  const upcoming = computeUpcomingMaintenance(entries, referenceDate);
  if (upcoming.length === 0) return undefined;
  const earliest = upcoming[0];
  const days = computeDaysRemaining(earliest.nextDueDate, referenceDate) ?? 0;
  return {
    entry: earliest,
    daysRemaining: days,
    isOverdue: days < 0,
  };
}

export interface MaintenanceConditionSummary {
  lastCleaning: {
    entry?: MaintenanceEntry;
    daysElapsed: number | null;
    condition: MaintenanceConditionResult;
  };
  lastThermalPaste: {
    entry?: MaintenanceEntry;
    daysElapsed: number | null;
    condition: MaintenanceConditionResult;
    productUsed?: string;
    componentName?: string;
  };
  earliestUpcoming?: {
    entry: MaintenanceEntry;
    daysRemaining: number;
    isOverdue: boolean;
  };
  upcomingCount: number;
  totalCost: number;
  totalEntriesCount: number;
}

/**
 * Calcola il riassunto completo dello stato di condizione attuale del PC,
 * aggregando pulizia, pasta termica, scadenze imminenti e spesa complessiva.
 */
export function computeMaintenanceConditionSummary(
  entries: MaintenanceEntry[],
  components?: { id: string; name: string }[],
  referenceDate: string = getLocalDateISO()
): MaintenanceConditionSummary {
  const lastClean = getLatestCleaningService(entries);
  const cleanDays = computeDaysElapsed(lastClean?.date, referenceDate);
  const cleanCondition = evaluateCleaningCondition(lastClean?.date, referenceDate);

  const lastPaste = getLatestThermalPasteService(entries);
  const pasteDays = computeDaysElapsed(lastPaste?.date, referenceDate);
  const pasteCondition = evaluateThermalPasteCondition(lastPaste?.date, referenceDate);

  const pasteComp =
    components && lastPaste?.componentIds && lastPaste.componentIds.length > 0
      ? components.find((c) => c.id === lastPaste.componentIds![0])
      : undefined;

  const upcomingList = computeUpcomingMaintenance(entries, referenceDate);
  const earliestUpcoming = getEarliestUpcomingMaintenance(entries, referenceDate);
  const totalCost = computeTotalMaintenanceCost(entries);

  return {
    lastCleaning: {
      entry: lastClean,
      daysElapsed: cleanDays,
      condition: cleanCondition,
    },
    lastThermalPaste: {
      entry: lastPaste,
      daysElapsed: pasteDays,
      condition: pasteCondition,
      productUsed: lastPaste?.productUsed,
      componentName: pasteComp?.name,
    },
    earliestUpcoming,
    upcomingCount: upcomingList.length,
    totalCost,
    totalEntriesCount: entries.length,
  };
}

