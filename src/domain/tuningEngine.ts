import { TuningProfile, TuningType, TUNING_TYPE_LABELS, TuningStability, TUNING_STABILITY_LABELS, ComponentCategory } from '../types';
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

  if (profile.biosVersion !== undefined && profile.biosVersion !== null) {
    if (typeof profile.biosVersion !== 'string') {
      errors.biosVersion = 'La versione del BIOS deve essere una stringa valida.';
    } else if (profile.biosVersion.trim().length > 60) {
      errors.biosVersion = 'La versione del BIOS non può superare i 60 caratteri.';
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
      const matchBios = p.biosVersion ? p.biosVersion.toLowerCase().includes(q) : false;
      if (!matchName && !matchNotes && !matchBench && !matchBios) {
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

export interface TuningTemplate {
  id: string;
  name: string;
  category: ComponentCategory;
  type: TuningType;
  defaultParameters: Record<string, string | number>;
  description: string;
}

/**
 * Template contestuali per la compilazione rapida e standardizzata dei parametri di tuning.
 */
export const TUNING_TEMPLATES: Record<string, TuningTemplate> = {
  cpu_curve_optimizer: {
    id: 'cpu_curve_optimizer',
    name: 'CPU — AMD Curve Optimizer & PBO',
    category: 'cpu',
    type: 'curve_optimizer',
    defaultParameters: {
      'Curve Optimizer Offset': '-25',
      'Boost Clock Override (MHz)': '+100',
      'PPT (W)': '142',
      'TDC (A)': '110',
      'EDC (A)': '150',
      'Core Voltage Offset (mV)': '0',
    },
    description: 'Template per ottimizzazione PBO e Curve Optimizer su processori AMD Ryzen',
  },
  cpu_intel_undervolt: {
    id: 'cpu_intel_undervolt',
    name: 'CPU — Intel Core Undervolt & Power Limits',
    category: 'cpu',
    type: 'cpu_undervolt',
    defaultParameters: {
      'Vcore Offset (mV)': '-80',
      'PL1 / Long Duration (W)': '125',
      'PL2 / Short Duration (W)': '253',
      'Tau (s)': '56',
      'LLC (Load-Line Calibration)': 'Level 4',
    },
    description: 'Template per undervolt offset e limiti di potenza PL1/PL2 Intel Core',
  },
  gpu_undervolt: {
    id: 'gpu_undervolt',
    name: 'GPU — Undervolt & Frequenza / Memoria',
    category: 'gpu',
    type: 'gpu_undervolt',
    defaultParameters: {
      'Target Voltage (mV)': '950',
      'Core Clock (MHz)': '2650',
      'Power Limit (%)': '100',
      'VRAM Clock Offset (MHz)': '+1000',
      'V/F Note': 'Curva bloccata a 950mV',
    },
    description: 'Template per undervolt e overclock memoria GPU',
  },
  ram_timings: {
    id: 'ram_timings',
    name: 'RAM — Frequenza, Timings & Voltaggi (XMP/EXPO)',
    category: 'ram',
    type: 'memory_xmp_expo',
    defaultParameters: {
      'Frequency (MT/s)': '6000',
      'Profile': 'EXPO I',
      'tCL': '30',
      'tRCD': '38',
      'tRP': '38',
      'tRAS': '96',
      'VDD (V)': '1.35',
      'VDDQ (V)': '1.35',
      'SoC Voltage (V)': '1.20',
    },
    description: 'Template per frequenze, primary timings e tensioni controller di memoria',
  },
  fan_curve: {
    id: 'fan_curve',
    name: 'FAN — Curva Ventole / Dissipatore',
    category: 'cooling',
    type: 'fan_profile',
    defaultParameters: {
      'Target Temp (°C)': '65',
      'PWM Min (%)': '35',
      'PWM Max (%)': '80',
      'Profilo': 'Silent / Custom',
    },
    description: 'Template per curve PWM ventole e soglie di temperatura',
  },
};

/**
 * Genera la Scheda Parametri BIOS e Hardware in formato Markdown pulito e pronto per l'esportazione o stampa.
 * Include esclusivamente i dati realmente inseriti dall'utente senza inventare valori mancanti.
 */
export function generateBiosParameterCardMarkdown(
  profile: TuningProfile,
  componentName?: string
): string {
  const lines: string[] = [];
  lines.push(`# Scheda Parametri Hardware & BIOS`);
  lines.push(``);
  lines.push(`- **Profilo**: ${profile.name}`);
  lines.push(`- **Componente**: ${componentName || 'Non specificato'}`);
  lines.push(`- **Tipologia**: ${TUNING_TYPE_LABELS[profile.type] || profile.type}`);
  lines.push(`- **Stabilità Dichiarata**: ${TUNING_STABILITY_LABELS[profile.stability] || profile.stability}`);
  lines.push(`- **Data Configurazione**: ${profile.date}`);
  if (profile.biosVersion && profile.biosVersion.trim()) {
    lines.push(`- **Versione BIOS / AGESA**: ${profile.biosVersion.trim()}`);
  }
  lines.push(``);

  const paramEntries = Object.entries(profile.parameters || {});
  if (paramEntries.length > 0) {
    lines.push(`## Parametri Registrati`);
    lines.push(``);
    lines.push(`| Parametro | Valore Configurato |`);
    lines.push(`| :--- | :--- |`);
    for (const [k, v] of paramEntries) {
      lines.push(`| ${k} | ${String(v)} |`);
    }
    lines.push(``);
  }

  const hasTemps = profile.temperatures && (
    profile.temperatures.idle !== undefined ||
    profile.temperatures.load !== undefined ||
    profile.temperatures.ambient !== undefined
  );
  const hasPower = profile.observedPowerWatts !== undefined && profile.observedPowerWatts !== null;
  const hasBench = profile.benchmarks && profile.benchmarks.length > 0;

  if (hasTemps || hasPower || hasBench) {
    lines.push(`## Rilevamenti, Temperature & Benchmark`);
    lines.push(``);

    if (hasTemps) {
      const t = profile.temperatures!;
      const parts: string[] = [];
      if (t.idle !== undefined) parts.push(`Idle: ${t.idle}°C`);
      if (t.load !== undefined) parts.push(`Load: ${t.load}°C`);
      if (t.ambient !== undefined) parts.push(`Ambiente: ${t.ambient}°C`);
      if (parts.length > 0) {
        lines.push(`- **Temperature Rilevate**: ${parts.join(' | ')}`);
      }
    }

    if (hasPower) {
      lines.push(`- **Potenza Assorbita Osservata**: ${profile.observedPowerWatts} W`);
    }

    if (hasBench) {
      lines.push(`- **Benchmark & Risultati**:`);
      for (const b of profile.benchmarks!) {
        const n = b.notes ? ` (${b.notes})` : '';
        lines.push(`  - ${b.name}: **${b.score}**${n}`);
      }
    }
    lines.push(``);
  }

  if (profile.notes && profile.notes.trim()) {
    lines.push(`## Note & Commenti di Stabilità`);
    lines.push(``);
    lines.push(profile.notes.trim());
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Scheda generata con PC Tracker — Centro Operativo Hardware*`);

  return lines.join('\n');
}

