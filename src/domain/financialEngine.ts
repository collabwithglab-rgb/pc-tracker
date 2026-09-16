import { Component, ComponentEvent, Upgrade } from '../types';
import { computeComponentStatus } from './lifecycleEngine';

/**
 * Totale Acquistato Storico:
 * Somma dei prezzi di tutti gli eventi PURCHASE e di tutti gli importi EXTRA_EXPENSE.
 * Rappresenta ogni euro mai speso per l'hardware del PC.
 */
export function computeTotalPurchased(events: ComponentEvent[]): number {
  return events.reduce((total, event) => {
    if (event.type === 'PURCHASE') {
      return total + (event.price || 0);
    }
    if (event.type === 'EXTRA_EXPENSE') {
      return total + (event.amount || 0);
    }
    return total;
  }, 0);
}

/**
 * Totale Recuperato dalle Vendite:
 * Somma dei prezzi netti incassati da tutti gli eventi SALE (prezzo - spedizione a carico - commissioni).
 */
export function computeTotalRecovered(events: ComponentEvent[]): number {
  return events.reduce((total, event) => {
    if (event.type === 'SALE') {
      const net = (event.price || 0) - (event.shippingCost || 0) - (event.fees || 0);
      return total + net;
    }
    return total;
  }, 0);
}

/**
 * Costo Netto Storico:
 * Totale Acquistato Storico - Totale Recuperato dalle Vendite.
 * Rappresenta la spesa reale a fondo perduto sostenuta nel tempo.
 */
export function computeHistoricalNetCost(events: ComponentEvent[]): number {
  return computeTotalPurchased(events) - computeTotalRecovered(events);
}

/**
 * Costo Configurazione Attuale:
 * Somma dei costi di acquisto e spese accessorie dei soli componenti attualmente IN_USE.
 */
export function computeCurrentRigCost(components: Component[], events: ComponentEvent[]): number {
  const eventsByComponent = new Map<string, ComponentEvent[]>();
  for (const event of events) {
    const list = eventsByComponent.get(event.componentId) || [];
    list.push(event);
    eventsByComponent.set(event.componentId, list);
  }

  let total = 0;
  for (const component of components) {
    const compEvents = eventsByComponent.get(component.id) || [];
    const status = computeComponentStatus(compEvents);
    if (status === 'IN_USE') {
      for (const ev of compEvents) {
        if (ev.type === 'PURCHASE') {
          total += ev.price || 0;
        } else if (ev.type === 'EXTRA_EXPENSE') {
          total += ev.amount || 0;
        }
      }
    }
  }

  return total;
}

/**
 * Costo Netto di un Singolo Componente:
 * (Costo Acquisto + Spese Accessorie) - Ricavo Netto Vendita.
 */
export function computeComponentNetCost(componentId: string, events: ComponentEvent[]): number {
  const compEvents = events.filter((e) => e.componentId === componentId);
  const purchased = compEvents.reduce((acc, ev) => {
    if (ev.type === 'PURCHASE') return acc + (ev.price || 0);
    if (ev.type === 'EXTRA_EXPENSE') return acc + (ev.amount || 0);
    return acc;
  }, 0);

  const recovered = compEvents.reduce((acc, ev) => {
    if (ev.type === 'SALE') {
      return acc + ((ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0));
    }
    return acc;
  }, 0);

  return purchased - recovered;
}

/**
 * Costo Netto di un Upgrade:
 * Costo Acquisto Nuovo Pezzo - Ricavo Netto Vendita Pezzo Sostituito.
 */
export function computeUpgradeNetCost(upgrade: Upgrade, events: ComponentEvent[]): number {
  // Costo nuovo pezzo
  const newCompEvents = events.filter((e) => e.componentId === upgrade.newComponentId);
  const newCost = newCompEvents.reduce((acc, ev) => {
    if (ev.type === 'PURCHASE') return acc + (ev.price || 0);
    if (ev.type === 'EXTRA_EXPENSE') return acc + (ev.amount || 0);
    return acc;
  }, 0);

  // Ricavo vendita vecchio pezzo (se presente)
  let oldRecovered = 0;
  if (upgrade.oldComponentId) {
    const oldCompEvents = events.filter((e) => e.componentId === upgrade.oldComponentId);
    oldRecovered = oldCompEvents.reduce((acc, ev) => {
      if (ev.type === 'SALE') {
        return acc + ((ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0));
      }
      return acc;
    }, 0);
  }

  return newCost - oldRecovered;
}
