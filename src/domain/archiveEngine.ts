import {
  Component,
  ComponentComputedState,
  ArchiveSortPreference,
} from '../types';

export interface ArchiveFilterOptions {
  searchQuery: string;
  category: string; // 'all' | ComponentCategory
  status: string; // 'all' | ComponentStatus
}

/**
 * Filtra la lista di componenti in base alla ricerca full-text (nome, brand, modello, note),
 * alla categoria selezionata e allo stato derivato dal lifecycle engine.
 */
export function filterComponentsForArchive(
  components: Component[],
  computedMap: Record<string, ComponentComputedState | undefined>,
  filters: ArchiveFilterOptions
): Component[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const cat = filters.category;
  const stat = filters.status;

  return components.filter((comp) => {
    // 1. Ricerca full-text su name, brand, model, notes
    if (query) {
      const matchesName = comp.name.toLowerCase().includes(query);
      const matchesBrand = comp.brand.toLowerCase().includes(query);
      const matchesModel = comp.model.toLowerCase().includes(query);
      const matchesNotes = comp.notes ? comp.notes.toLowerCase().includes(query) : false;
      if (!matchesName && !matchesBrand && !matchesModel && !matchesNotes) {
        return false;
      }
    }

    // 2. Filtro categoria
    if (cat !== 'all' && comp.category !== cat) {
      return false;
    }

    // 3. Filtro stato calcolato
    if (stat !== 'all') {
      const computed = computedMap[comp.id];
      const status = computed?.status || 'IN_STORAGE';
      if (status !== stat) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Ordina i componenti in modo deterministico secondo la preferenza specificata:
 * - 'purchase_date_desc': data acquisto decrescente (i più recenti per primi); tie-breaker nome A-Z, poi id
 * - 'name_asc': alfabetico A-Z per nome; tie-breaker id
 * - 'cost_desc': spesa totale decrescente; tie-breaker nome A-Z, poi id
 */
export function sortComponentsForArchive(
  components: Component[],
  computedMap: Record<string, ComponentComputedState | undefined>,
  sortPreference: ArchiveSortPreference
): Component[] {
  return [...components].sort((a, b) => {
    const compA = computedMap[a.id];
    const compB = computedMap[b.id];

    switch (sortPreference) {
      case 'purchase_date_desc': {
        const dateA = compA?.purchaseDate || '';
        const dateB = compB?.purchaseDate || '';
        if (dateA !== dateB) {
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.localeCompare(dateA);
        }
        const nameDiff = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        return a.id.localeCompare(b.id);
      }

      case 'name_asc': {
        const nameDiff = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        return a.id.localeCompare(b.id);
      }

      case 'cost_desc': {
        const costA = compA?.totalPurchaseCost || 0;
        const costB = compB?.totalPurchaseCost || 0;
        if (costA !== costB) {
          return costB - costA;
        }
        const nameDiff = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        return a.id.localeCompare(b.id);
      }

      default:
        return a.name.localeCompare(b.name);
    }
  });
}
