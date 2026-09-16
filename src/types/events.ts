export type EventType =
  | 'PURCHASE'
  | 'INSTALL'
  | 'UNINSTALL'
  | 'SALE'
  | 'EXTRA_EXPENSE'
  | 'GIFT'
  | 'DISPOSAL';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  PURCHASE: 'Acquisto',
  INSTALL: 'Installazione',
  UNINSTALL: 'Rimozione',
  SALE: 'Vendita',
  EXTRA_EXPENSE: 'Spesa Extra',
  GIFT: 'Regalo',
  DISPOSAL: 'Smaltimento',
};

export interface BaseEvent {
  id: string; // UUID stabile
  componentId: string; // FK verso Component.id
  date: string; // Data evento ISO 'YYYY-MM-DD'
  createdAt: string; // Timestamp di inserimento
  notes?: string;
}

export interface PurchaseEvent extends BaseEvent {
  type: 'PURCHASE';
  price: number; // in Euro
  store?: string;
  orderNumber?: string;
  link?: string;
  condition?: 'new' | 'used';
  warrantyExpiryDate?: string;
}

export interface InstallEvent extends BaseEvent {
  type: 'INSTALL';
  slotOrLocation?: string; // es. "PCIe 1", "Slot M.2 1"
}

export interface UninstallEvent extends BaseEvent {
  type: 'UNINSTALL';
  reason?: 'upgrade' | 'maintenance' | 'storage' | 'defect' | 'other';
}

export const UNINSTALL_REASON_LABELS: Record<NonNullable<UninstallEvent['reason']>, string> = {
  upgrade: 'Upgrade / Sostituzione',
  maintenance: 'Manutenzione / Pulizia',
  storage: 'Messo da parte / In magazzino',
  defect: 'Guasto / Difetto',
  other: 'Altro motivo',
};

export interface SaleEvent extends BaseEvent {
  type: 'SALE';
  price: number; // Prezzo lordo incassato
  platform?: string; // es. "Subito", "eBay", "Privato"
  buyer?: string;
  shippingCost?: number; // Spese di spedizione a carico del venditore
  fees?: number; // Commissioni piattaforma
}

export interface ExtraExpenseEvent extends BaseEvent {
  type: 'EXTRA_EXPENSE';
  amount: number; // in Euro
  description: string; // es. "Cavi custom", "Pad termici", "Waterblock"
}

export interface GiftEvent extends BaseEvent {
  type: 'GIFT';
  recipient?: string; // A chi è stato donato
}

export interface DisposalEvent extends BaseEvent {
  type: 'DISPOSAL';
  disposalMethod: 'recycled' | 'broken_discarded' | 'eco_center';
}

export type ComponentEvent =
  | PurchaseEvent
  | InstallEvent
  | UninstallEvent
  | SaleEvent
  | ExtraExpenseEvent
  | GiftEvent
  | DisposalEvent;
