/**
 * Definizione dei contratti di tipo per la Cassaforte Ricevute (Receipt Vault)
 * e il monitoraggio delle garanzie hardware.
 */

export type AllowedReceiptMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp';

export const ALLOWED_RECEIPT_MIME_TYPES: AllowedReceiptMimeType[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TOTAL_RECEIPTS_BACKUP_BYTES = 50 * 1024 * 1024; // 50 MB

export interface ComponentReceiptMeta {
  id: string; // UUID stabile
  componentId: string; // FK verso Component.id
  eventId?: string; // FK opzionale verso PurchaseEvent.id o ExtraExpenseEvent.id
  fileName: string; // es. "Fattura_RTX4080_Amazon.pdf"
  fileType: string; // MIME type es. "application/pdf", "image/png"
  fileSize: number; // Dimensione in byte
  uploadedAt: string; // Timestamp ISO di inserimento
  notes?: string;
}

export interface ComponentReceipt extends ComponentReceiptMeta {
  dataUrl: string; // Payload Base64 / Data URL per rendering e download locale
}

export type WarrantyStatus = 'active' | 'expiring' | 'expired' | 'none';

export interface WarrantyInfo {
  hasWarranty: boolean;
  status: WarrantyStatus;
  expiryDate?: string; // YYYY-MM-DD
  daysRemaining: number;
  humanLabel: string; // es. "Ancora 1 anno e 4 mesi", "Scade tra 18 giorni", "Garanzia terminata"
  isExpiringSoon: boolean; // true se rimanenti tra 1 e 30 giorni (o scade oggi)
  isExpired: boolean;
  isActive: boolean; // true se active o expiring
}

export interface WarrantyPreset {
  label: string;
  months: number;
}
