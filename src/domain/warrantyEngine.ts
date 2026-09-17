import {
  PurchaseEvent,
  ComponentEvent,
  WarrantyInfo,
  WarrantyPreset,
} from '../types';
import { getLocalDateISO } from './lifecycleEngine';
import { isValidISODateString } from './validators';

/**
 * Preset temporali standard per la garanzia hardware.
 */
export const WARRANTY_PRESETS: WarrantyPreset[] = [
  { label: '2 Anni (Legge UE)', months: 24 },
  { label: '3 Anni', months: 36 },
  { label: '5 Anni', months: 60 },
  { label: '10 Anni', months: 120 },
];

/**
 * Calcola la data ISO di scadenza (YYYY-MM-DD) sommando un numero di mesi alla data di acquisto.
 * Gestisce correttamente anni bisestili e mesi con diverso numero di giorni (senza overflow).
 */
export function calculateExpiryDateFromPreset(purchaseDate: string, months: number): string {
  if (!isValidISODateString(purchaseDate) || typeof months !== 'number' || months <= 0) {
    return '';
  }

  const [y, m, d] = purchaseDate.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return '';
  }

  const totalMonths = (m - 1) + Math.floor(months);
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;

  // Determina l'ultimo giorno valido del mese di destinazione (es. 28 o 29 per Febbraio, 30 per Aprile)
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const finalDay = Math.min(d, maxDaysInTargetMonth);

  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(finalDay).padStart(2, '0');

  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Estrae l'evento PURCHASE più recente/rilevante dalla lista degli eventi di un componente.
 */
export function findPurchaseEvent(events: ComponentEvent[]): PurchaseEvent | undefined {
  const purchases = events.filter((e): e is PurchaseEvent => e.type === 'PURCHASE');
  if (purchases.length === 0) return undefined;
  // Restituisce il più recente per data
  return [...purchases].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * Calcola lo stato di garanzia, i giorni rimanenti e l'etichetta leggibile in lingua italiana.
 *
 * Stati restituiti:
 * - 'none': nessuna data di scadenza definita
 * - 'expired': data di scadenza precedente alla data di riferimento
 * - 'expiring': garanzia in scadenza (scade oggi, domani o entro 30 giorni)
 * - 'active': garanzia pienamente attiva (> 30 giorni rimanenti)
 */
export function computeWarrantyInfo(
  purchaseEvent?: Partial<PurchaseEvent> | null,
  referenceDate?: string
): WarrantyInfo {
  const rawDate = purchaseEvent?.warrantyExpiryDate?.trim();

  if (!rawDate || !isValidISODateString(rawDate)) {
    return {
      hasWarranty: false,
      status: 'none',
      daysRemaining: 0,
      humanLabel: 'Nessuna garanzia impostata',
      isExpiringSoon: false,
      isExpired: false,
      isActive: false,
    };
  }

  const today = referenceDate || getLocalDateISO();
  const [ty, tm, td] = today.split('-').map(Number);
  const [ey, em, ed] = rawDate.split('-').map(Number);

  const utcToday = Date.UTC(ty, tm - 1, td);
  const utcExpiry = Date.UTC(ey, em - 1, ed);
  const diffDays = Math.round((utcExpiry - utcToday) / (1000 * 60 * 60 * 24));

  // 1. Caso: Garanzia scaduta nel passato
  if (diffDays < 0) {
    const pastDays = Math.abs(diffDays);
    let pastLabel: string;

    if (pastDays === 1) {
      pastLabel = 'Scaduta da 1 giorno';
    } else if (pastDays <= 30) {
      pastLabel = `Scaduta da ${pastDays} giorni`;
    } else if (pastDays < 365) {
      const months = Math.floor(pastDays / 30.4375);
      pastLabel = months <= 1 ? 'Scaduta da 1 mese' : `Scaduta da ${months} mesi`;
    } else {
      const years = Math.floor(pastDays / 365.25);
      pastLabel = years <= 1 ? 'Scaduta da oltre 1 anno' : `Scaduta da oltre ${years} anni`;
    }

    return {
      hasWarranty: true,
      status: 'expired',
      expiryDate: rawDate,
      daysRemaining: 0,
      humanLabel: pastLabel,
      isExpiringSoon: false,
      isExpired: true,
      isActive: false,
    };
  }

  // 2. Caso: Scade oggi
  if (diffDays === 0) {
    return {
      hasWarranty: true,
      status: 'expiring',
      expiryDate: rawDate,
      daysRemaining: 0,
      humanLabel: 'Scade oggi',
      isExpiringSoon: true,
      isExpired: false,
      isActive: true,
    };
  }

  // 3. Caso: Scade domani
  if (diffDays === 1) {
    return {
      hasWarranty: true,
      status: 'expiring',
      expiryDate: rawDate,
      daysRemaining: 1,
      humanLabel: 'Scade domani',
      isExpiringSoon: true,
      isExpired: false,
      isActive: true,
    };
  }

  // 4. Caso: In scadenza ravvicinata (2-30 giorni)
  if (diffDays <= 30) {
    return {
      hasWarranty: true,
      status: 'expiring',
      expiryDate: rawDate,
      daysRemaining: diffDays,
      humanLabel: `Scade tra ${diffDays} giorni`,
      isExpiringSoon: true,
      isExpired: false,
      isActive: true,
    };
  }

  // 5. Caso: Garanzia pienamente attiva (> 30 giorni)
  const totalMonths = Math.round(diffDays / 30.4375);
  let activeLabel: string;

  if (totalMonths < 12) {
    activeLabel = totalMonths <= 1 ? 'Ancora 1 mese' : `Ancora ${totalMonths} mesi`;
  } else {
    const years = Math.floor(totalMonths / 12);
    const remMonths = totalMonths % 12;
    if (remMonths > 0) {
      activeLabel = `Ancora ${years} ${years === 1 ? 'anno' : 'anni'} e ${remMonths} ${remMonths === 1 ? 'mese' : 'mesi'}`;
    } else {
      activeLabel = `Ancora ${years} ${years === 1 ? 'anno' : 'anni'}`;
    }
  }

  return {
    hasWarranty: true,
    status: 'active',
    expiryDate: rawDate,
    daysRemaining: diffDays,
    humanLabel: activeLabel,
    isExpiringSoon: false,
    isExpired: false,
    isActive: true,
  };
}
