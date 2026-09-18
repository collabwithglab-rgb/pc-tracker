import { MaintenanceEntry, MaintenanceType, MAINTENANCE_TYPE_LABELS } from '../types';
import { isValidISODateString } from './validators';

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
