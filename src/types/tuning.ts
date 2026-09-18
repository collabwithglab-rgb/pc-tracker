import { ComponentCategory } from './component';

export type TuningType =
  | 'cpu_undervolt'        // Offset di tensione CPU (mV)
  | 'curve_optimizer'      // AMD Curve Optimizer (Negative counts per-core o all-core)
  | 'gpu_undervolt'        // GPU V/F Curve o offset di tensione
  | 'power_limit'          // TDP / PPT / PL1 / PL2 / TGP
  | 'memory_xmp_expo'      // Profilo memoria RAM (XMP / EXPO / subtimings)
  | 'fan_profile'          // Curva ventole / dissipatore
  | 'custom';              // Altro tuning

export const TUNING_TYPE_LABELS: Record<TuningType, string> = {
  cpu_undervolt: 'CPU Undervolt',
  curve_optimizer: 'AMD Curve Optimizer',
  gpu_undervolt: 'GPU Undervolt',
  power_limit: 'Power Limit (TDP/PPT)',
  memory_xmp_expo: 'RAM XMP / EXPO',
  fan_profile: 'Curva Ventole / Flusso',
  custom: 'Tuning Personalizzato',
};

export type TuningStability = 'daily' | 'stable' | 'testing' | 'unstable';

export const TUNING_STABILITY_LABELS: Record<TuningStability, string> = {
  daily: 'Profilo Giornaliero (Daily)',
  stable: 'Completamente Stabile',
  testing: 'In Fase di Test / Validazione',
  unstable: 'Instabile / Crash Rilevati',
};

export interface TuningBenchmarkRecord {
  name: string;            // es. "Cinebench R23", "3DMark Time Spy", "Cyberpunk 2077"
  score: string | number;  // Punteggio o FPS medi
  notes?: string;
}

export interface TuningProfile {
  id: string;              // UUID stabile
  name: string;            // Nome sintetico del profilo (es. "Daily UV -25mV All-Core")
  componentId?: string;    // Soft link al componente
  category: ComponentCategory; // 'cpu' | 'gpu' | 'ram' | 'cooling' | 'other'
  date: string;            // Data ISO YYYY-MM-DD
  type: TuningType;
  parameters: Record<string, string | number>; // Parametri tecnici (es. { offsetMv: -25, socVoltage: 1.20 })
  stability: TuningStability;
  benchmarks?: TuningBenchmarkRecord[];
  temperatures?: {
    idle?: number;         // °C
    load?: number;         // °C
    ambient?: number;      // °C
  };
  observedPowerWatts?: number; // Potenza assorbita rilevata (W)
  notes?: string;
  createdAt: string;       // Timestamp ISO
  updatedAt: string;       // Timestamp ISO
}

export interface TuningProfileInput {
  name: string;
  componentId?: string;
  category: ComponentCategory;
  date: string;
  type: TuningType;
  parameters: Record<string, string | number>;
  stability: TuningStability;
  benchmarks?: TuningBenchmarkRecord[];
  temperatures?: {
    idle?: number;
    load?: number;
    ambient?: number;
  };
  observedPowerWatts?: number;
  notes?: string;
}
