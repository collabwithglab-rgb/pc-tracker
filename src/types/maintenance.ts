export type MaintenanceType =
  | 'cleaning'             // Pulizia generale PC
  | 'filter_cleaning'      // Pulizia filtri antipolvere
  | 'fan_cleaning'         // Pulizia ventole / radiatori
  | 'thermal_paste'        // Sostituzione pasta termica
  | 'thermal_pad'          // Sostituzione pad termici
  | 'storage_maintenance'  // TRIM / Manutenzione SSD
  | 'inspection'           // Ispezione visiva / serraggio cavi
  | 'system_maintenance'   // Manutenzione software Windows
  | 'other';               // Altro

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  cleaning: 'Pulizia Generale',
  filter_cleaning: 'Pulizia Filtri',
  fan_cleaning: 'Pulizia Ventole / Dissipatore',
  thermal_paste: 'Pasta Termica',
  thermal_pad: 'Pad Termici',
  storage_maintenance: 'Manutenzione Storage / TRIM',
  inspection: 'Ispezione & Serraggio',
  system_maintenance: 'Manutenzione Sistema Windows',
  other: 'Altra Manutenzione',
};

export interface MaintenanceEntry {
  id: string;              // UUID univoco e stabile
  date: string;            // Data ISO YYYY-MM-DD
  type: MaintenanceType;
  title: string;           // Titolo sintetico dell'intervento
  description: string;     // Descrizione dell'intervento eseguito
  componentIds?: string[]; // Soft-link ai componenti coinvolti (es. CPU, Dissipatore, GPU, SSD)
  cost?: number;           // Spesa opzionale sostenuta (es. acquisto pasta, attrezzi)
  productUsed?: string;    // Prodotto utilizzato (es. "Noctua NT-H2", "Thermal Grizzly Kryonaut", "Alcool Isopropilico 99%")
  notes?: string;          // Note o osservazioni
  nextDueDate?: string;    // Prossima manutenzione consigliata (YYYY-MM-DD)
  source?: 'manual' | 'tool' | 'diagnostic'; // Origine della registrazione
  createdAt: string;       // Timestamp ISO
  updatedAt: string;       // Timestamp ISO
}

export interface MaintenanceEntryInput {
  date: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  componentIds?: string[];
  cost?: number;
  productUsed?: string;
  notes?: string;
  nextDueDate?: string;
  source?: 'manual' | 'tool' | 'diagnostic';
}

export type MaintenanceConditionTier = 'optimal' | 'good' | 'monitor' | 'due' | 'none';

export interface MaintenanceConditionResult {
  tier: MaintenanceConditionTier;
  label: string;
  badgeClass: string;
  description: string;
  daysElapsed: number | null;
}
