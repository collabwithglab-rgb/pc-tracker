import { TuningProfile, TUNING_TYPE_LABELS, TuningStability, TUNING_STABILITY_LABELS } from '../types';
import { isValidISODateString } from './validators';

/**
 * Ordina i profili di tuning:
 * - Primario: data decrescente (i più recenti per primi)
 * - Secondario: nome alfabetico
 * - Tie-breaker: ID univoco
 */
export function sortTuningProfiles(profiles: TuningProfile[]): TuningProfile[] {
  return [...profiles].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    const nameComp = a.name.localeCompare(b.name);
    if (nameComp !== 0) return nameComp;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Filtra i profili di tuning per componente collegato.
 */
export function getTuningProfilesByComponent(
  profiles: TuningProfile[],
  componentId: string
): TuningProfile[] {
  if (!componentId) return [];
  return profiles.filter((p) => p.componentId === componentId);
}

/**
 * Raggruppa i profili di tuning per categoria hardware (cpu, gpu, ram, cooling, other).
 */
export function groupTuningProfilesByCategory(
  profiles: TuningProfile[]
): Record<string, TuningProfile[]> {
  const groups: Record<string, TuningProfile[]> = {
    cpu: [],
    gpu: [],
    ram: [],
    cooling: [],
    other: [],
  };

  for (const profile of profiles) {
    const cat = profile.category || 'other';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(profile);
  }

  return groups;
}

/**
 * Valida un profilo di tuning prima del salvataggio.
 */
export function validateTuningProfile(
  profile: Partial<TuningProfile>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!profile.name || typeof profile.name !== 'string' || profile.name.trim().length === 0) {
    errors.name = 'Il nome del profilo di tuning è obbligatorio.';
  } else if (profile.name.trim().length > 100) {
    errors.name = 'Il nome non può superare i 100 caratteri.';
  }

  if (!profile.date || !isValidISODateString(profile.date)) {
    errors.date = 'Inserisci una data valida nel formato YYYY-MM-DD.';
  }

  if (!profile.type || !(profile.type in TUNING_TYPE_LABELS)) {
    errors.type = 'Seleziona una tipologia di tuning valida.';
  }

  if (!profile.stability || !(profile.stability in TUNING_STABILITY_LABELS)) {
    errors.stability = 'Seleziona un livello di stabilità valido.';
  }

  if (profile.observedPowerWatts !== undefined && profile.observedPowerWatts !== null) {
    if (typeof profile.observedPowerWatts !== 'number' || isNaN(profile.observedPowerWatts) || profile.observedPowerWatts < 0) {
      errors.observedPowerWatts = 'La potenza osservata deve essere un numero positivo o zero.';
    }
  }

  if (profile.temperatures) {
    if (profile.temperatures.idle !== undefined && (typeof profile.temperatures.idle !== 'number' || isNaN(profile.temperatures.idle))) {
      errors.idleTemp = 'La temperatura idle deve essere un valore numerico valido.';
    }
    if (profile.temperatures.load !== undefined && (typeof profile.temperatures.load !== 'number' || isNaN(profile.temperatures.load))) {
      errors.loadTemp = 'La temperatura load deve essere un valore numerico valido.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Filtro polivalente per i profili di tuning.
 */
export function filterTuningProfiles(
  profiles: TuningProfile[],
  filter: {
    category?: string | 'ALL';
    stability?: TuningStability | 'ALL';
    searchQuery?: string;
  }
): TuningProfile[] {
  return profiles.filter((p) => {
    if (filter.category && filter.category !== 'ALL' && p.category !== filter.category) {
      return false;
    }
    if (filter.stability && filter.stability !== 'ALL' && p.stability !== filter.stability) {
      return false;
    }
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchNotes = p.notes ? p.notes.toLowerCase().includes(q) : false;
      const matchBench = p.benchmarks ? p.benchmarks.some((b) => b.name.toLowerCase().includes(q)) : false;
      if (!matchName && !matchNotes && !matchBench) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Restituisce la classe badge CSS per il livello di stabilità del profilo.
 */
export function getTuningStabilityBadgeClass(stability: TuningStability): string {
  switch (stability) {
    case 'daily':
      return 'badge-emerald';
    case 'stable':
      return 'badge-cyan';
    case 'testing':
      return 'badge-amber';
    case 'unstable':
      return 'badge-ruby';
    default:
      return 'badge-gray';
  }
}
