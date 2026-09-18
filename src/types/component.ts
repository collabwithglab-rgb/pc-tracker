export type ComponentCategory =
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'ram'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooling'
  | 'monitor'
  | 'peripherals'
  | 'accessories'
  | 'other';

export const COMPONENT_CATEGORY_LABELS: Record<ComponentCategory, string> = {
  cpu: 'Processore (CPU)',
  gpu: 'Scheda Video (GPU)',
  motherboard: 'Scheda Madre',
  ram: 'Memoria (RAM)',
  storage: 'Archiviazione (SSD/HDD)',
  psu: 'Alimentatore (PSU)',
  case: 'Case',
  cooling: 'Raffreddamento (Cooling)',
  monitor: 'Monitor',
  peripherals: 'Periferiche',
  accessories: 'Accessori / Cavi',
  other: 'Altro',
};

export interface Component {
  id: string; // UUID stabile
  name: string; // es. "GeForce RTX 4090"
  brand: string; // es. "Gigabyte"
  model: string; // es. "Gaming OC 24G"
  category: ComponentCategory;
  serialNumber?: string;
  notes?: string;
  /**
   * Valore nominale/proxy di potenza in Watt (es. TDP di fabbrica, PL2 Turbo, capacità PSU di targa).
   * NOTA SEMANTICA: Rappresenta un parametro tecnico o una stima di riferimento per il Power Budget,
   * e NON costituisce una misurazione elettrica reale in tempo reale (nessun monitoraggio da sensori).
   */
  powerRating?: number;
  powerRatingSource?: 'declared' | 'estimated' | 'userDefined';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type ComponentStatus =
  | 'IN_USE'
  | 'IN_STORAGE'
  | 'SOLD'
  | 'GIFTED'
  | 'DISPOSED';

export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  IN_USE: 'In Uso',
  IN_STORAGE: 'In Magazzino',
  SOLD: 'Venduto',
  GIFTED: 'Regalato',
  DISPOSED: 'Smaltito',
};

export interface ComponentComputedState {
  component: Component;
  status: ComponentStatus;
  totalPurchaseCost: number;
  totalSaleRevenue: number;
  netCost: number;
  purchaseDate?: string;
  firstInstallDate?: string;
  lastInstallDate?: string;
  lastUninstallDate?: string;
  saleDate?: string;
  giftDate?: string;
  disposalDate?: string;
  daysInUse: number;
  daysOwned: number;
  costPerDayInUse: number | null;
}
