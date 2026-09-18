import { Component, ComponentEvent, ComponentStatus, ComponentComputedState } from '../types';

const EVENT_TYPE_ORDER: Record<string, number> = {
  PURCHASE: 1,
  UNINSTALL: 2,
  INSTALL: 3,
  EXTRA_EXPENSE: 4,
  SALE: 5,
  GIFT: 6,
  DISPOSAL: 7,
};

/**
 * Ordina gli eventi cronologicamente per data (e createdAt come fallback infra-giornaliero).
 * In caso di data e timestamp identici, applica una priorità logica di tipo evento e tie-breaker su ID per determinismo totale.
 */
export function sortEventsChronologically(events: ComponentEvent[]): ComponentEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const createdA = a.createdAt || '';
    const createdB = b.createdAt || '';
    if (createdA !== createdB) {
      return createdA.localeCompare(createdB);
    }
    const orderA = EVENT_TYPE_ORDER[a.type] || 99;
    const orderB = EVENT_TYPE_ORDER[b.type] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Calcola la differenza in giorni tra due date ISO 'YYYY-MM-DD'.
 */
export function differenceInDays(startDate: string, endDate: string): number {
  const [y1, m1, d1] = startDate.split('T')[0].split('-').map(Number);
  const [y2, m2, d2] = endDate.split('T')[0].split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    return 0;
  }
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const diffTime = utc2 - utc1;
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

/**
 * Restituisce la data odierna nel formato ISO 'YYYY-MM-DD' basandosi sull'orario locale (timezone-safe).
 * Evita sfasamenti a cavallo di mezzanotte causati da toISOString() in UTC.
 */
export function getLocalDateISO(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determina deterministicamente lo stato del componente da una sequenza già ordinata di eventi.
 * Regola unificata tra Lifecycle ed History (AUD-006):
 * 1. Se è presente un evento terminale (SALE, GIFT, DISPOSAL), questo ha precedenza assoluta (stato terminale irreversibile).
 * 2. Altrimenti, l'ultimo evento tra INSTALL e UNINSTALL determina lo stato (IN_USE o IN_STORAGE).
 * 3. Se non vi sono montaggi/smontaggi (solo PURCHASE o EXTRA_EXPENSE), lo stato è IN_STORAGE.
 */
export function resolveStatusFromSortedEvents(sorted: ComponentEvent[]): ComponentStatus {
  if (sorted.length === 0) {
    return 'IN_STORAGE';
  }

  const lastTerminal = [...sorted].reverse().find(
    (e) => e.type === 'SALE' || e.type === 'GIFT' || e.type === 'DISPOSAL'
  );

  if (lastTerminal) {
    if (lastTerminal.type === 'SALE') return 'SOLD';
    if (lastTerminal.type === 'GIFT') return 'GIFTED';
    if (lastTerminal.type === 'DISPOSAL') return 'DISPOSED';
  }

  const lastInstallOrUninstall = [...sorted].reverse().find(
    (e) => e.type === 'INSTALL' || e.type === 'UNINSTALL'
  );

  if (lastInstallOrUninstall) {
    return lastInstallOrUninstall.type === 'INSTALL' ? 'IN_USE' : 'IN_STORAGE';
  }

  return 'IN_STORAGE';
}

/**
 * Calcola lo stato derivato di un componente a partire dalla sequenza di eventi.
 * Accetta un flag facoltativo eventsAlreadySorted per evitare sort ridondanti se l'array è già ordinato.
 */
export function computeComponentStatus(
  events: ComponentEvent[],
  eventsAlreadySorted: boolean = false
): ComponentStatus {
  if (events.length === 0) {
    return 'IN_STORAGE';
  }
  const sorted = eventsAlreadySorted ? events : sortEventsChronologically(events);
  return resolveStatusFromSortedEvents(sorted);
}

/**
 * Calcola i giorni totali di effettivo montaggio nel PC.
 * Accetta un flag facoltativo eventsAlreadySorted per evitare sort ridondanti se l'array è già ordinato.
 */
export function computeDaysInUse(
  events: ComponentEvent[],
  referenceDate?: string,
  eventsAlreadySorted: boolean = false
): number {
  const sorted = eventsAlreadySorted ? events : sortEventsChronologically(events);
  const today = referenceDate || getLocalDateISO();

  let totalDays = 0;
  let currentInstallDate: string | null = null;

  for (const ev of sorted) {
    if (ev.type === 'INSTALL') {
      if (!currentInstallDate) {
        currentInstallDate = ev.date;
      }
    } else if (
      ev.type === 'UNINSTALL' ||
      ev.type === 'SALE' ||
      ev.type === 'GIFT' ||
      ev.type === 'DISPOSAL'
    ) {
      if (currentInstallDate) {
        totalDays += differenceInDays(currentInstallDate, ev.date);
        currentInstallDate = null;
      }
    }
  }

  // Se è ancora montato (IN_USE), sommiamo fino alla data di riferimento
  if (currentInstallDate) {
    totalDays += differenceInDays(currentInstallDate, today);
  }

  return totalDays;
}

/**
 * Genera l'oggetto completo di stato derivato e metriche per un componente.
 */
export function computeComponentComputedState(
  component: Component,
  allEvents: ComponentEvent[],
  referenceDate?: string
): ComponentComputedState {
  const compEvents = sortEventsChronologically(
    allEvents.filter((e) => e.componentId === component.id)
  );

  const status = computeComponentStatus(compEvents, true);

  let totalPurchaseCost = 0;
  let totalSaleRevenue = 0;
  let purchaseDate: string | undefined;
  let firstInstallDate: string | undefined;
  let lastInstallDate: string | undefined;
  let lastUninstallDate: string | undefined;
  let saleDate: string | undefined;
  let giftDate: string | undefined;
  let disposalDate: string | undefined;

  for (const ev of compEvents) {
    if (ev.type === 'PURCHASE') {
      totalPurchaseCost += ev.price || 0;
      if (!purchaseDate) purchaseDate = ev.date;
    } else if (ev.type === 'EXTRA_EXPENSE') {
      totalPurchaseCost += ev.amount || 0;
    } else if (ev.type === 'SALE') {
      const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
      totalSaleRevenue += net;
      saleDate = ev.date;
    } else if (ev.type === 'INSTALL') {
      if (!firstInstallDate) firstInstallDate = ev.date;
      lastInstallDate = ev.date;
    } else if (ev.type === 'UNINSTALL') {
      lastUninstallDate = ev.date;
    } else if (ev.type === 'GIFT') {
      giftDate = ev.date;
    } else if (ev.type === 'DISPOSAL') {
      disposalDate = ev.date;
    }
  }

  const netCost = totalPurchaseCost - totalSaleRevenue;
  const daysInUse = computeDaysInUse(compEvents, referenceDate, true);

  const today = referenceDate || getLocalDateISO();
  const terminalDate = saleDate || giftDate || disposalDate || today;
  const daysOwned = purchaseDate ? differenceInDays(purchaseDate, terminalDate) : 0;
  const costPerDayInUse = daysInUse > 0 ? Number((netCost / daysInUse).toFixed(2)) : null;

  return {
    component,
    status,
    totalPurchaseCost,
    totalSaleRevenue,
    netCost,
    purchaseDate,
    firstInstallDate,
    lastInstallDate,
    lastUninstallDate,
    saleDate,
    giftDate,
    disposalDate,
    daysInUse,
    daysOwned,
    costPerDayInUse,
  };
}
