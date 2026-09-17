import { Component } from './component';
import { ComponentEvent } from './events';
import { Upgrade } from './upgrade';
import { Checkpoint } from './checkpoint';
import { ComponentReceipt } from './receipt';

export type UIDensity = 'comfortable' | 'compact';
export type ReducedMotionPreference = 'system' | 'always' | 'never';
export type DateFormatPreference = 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type AccentColorPreference = 'cyan' | 'arctic' | 'violet' | 'emerald' | 'amber' | 'crimson';
export type EnvironmentThemePreference = 'obsidian' | 'graphite' | 'slate' | 'midnight' | 'carbon';
export type TypographyPresetPreference = 'default' | 'minimal' | 'system';
export type DefaultSectionPreference = 'dashboard' | 'current-rig' | 'archive';
export type ArchiveSortPreference = 'purchase_date_desc' | 'name_asc' | 'cost_desc';
export type ArchiveViewPreference = 'cards' | 'table';

export interface AppSettings {
  // Identità del Setup
  rigName: string; // default: ""
  rigDescription: string; // default: ""
  buildYear?: number; // default: undefined
  quickSetupCompleted?: boolean; // default: false

  // Interfaccia & Visualizzazione Globale
  currencySymbol: string; // default: "€"
  dateFormat: DateFormatPreference; // default: "DD/MM/YYYY"
  uiDensity: UIDensity; // default: "comfortable"
  reducedMotion: ReducedMotionPreference; // default: "system"
  accentColor: AccentColorPreference; // default: "cyan"
  environmentTheme: EnvironmentThemePreference; // default: "obsidian"
  typographyPreset: TypographyPresetPreference; // default: "default"

  // Navigazione & Dashboard
  defaultStartSection: DefaultSectionPreference; // default: "dashboard"
  dashboardRecentCount: number; // default: 7
  showRigSynthesis: boolean; // default: true

  // Archivio & Hardware
  archiveDefaultSort: ArchiveSortPreference; // default: "purchase_date_desc"
  archiveDefaultView: ArchiveViewPreference; // default: "cards"

  // Comportamento & Form
  confirmEventDeletion: boolean; // default: true
  autoCloseMovementModal: boolean; // default: true

  // Retrocompatibilità
  customCategories?: string[];
}

export interface DatabaseSchema {
  schemaVersion: number; // 1
  appVersion: string; // "0.1.0"
  lastModified?: string; // ISO timestamp facoltativo (retrocompatibilità)
  exportedAt?: string; // Timestamp ISO esatto della generazione del backup
  settings: AppSettings;
  components: Component[];
  events: ComponentEvent[];
  upgrades: Upgrade[];
  checkpoints?: Checkpoint[]; // Opzionale per retrocompatibilità con backup legacy
  receipts?: ComponentReceipt[]; // Opzionale per retrocompatibilità
}

export interface ImportPreview {
  isValid: true;
  schemaVersion: number;
  appVersion?: string;
  exportedAt?: string;
  counts: {
    components: number;
    events: number;
    upgrades: number;
    checkpoints: number;
    receipts?: number;
  };
  settingsSummary?: {
    rigName?: string;
    buildYear?: number;
    currencySymbol?: string;
  };
  parsedData: DatabaseSchema;
}

export interface ImportError {
  isValid: false;
  error: string;
}

export type ImportValidationResult = ImportPreview | ImportError;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  counts?: {
    components: number;
    events: number;
    upgrades: number;
    checkpoints?: number;
    receipts?: number;
  };
}

