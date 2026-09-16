import { Component, ComponentEvent, Upgrade, UpgradeComputedSummary } from '../types';

/**
 * Calcola il riepilogo economico di un upgrade specifico.
 */
export function computeUpgradeSummary(
  upgrade: Upgrade,
  components: Component[],
  events: ComponentEvent[]
): UpgradeComputedSummary {
  const newComponent = components.find((c) => c.id === upgrade.newComponentId);
  if (!newComponent) {
    throw new Error(`Nuovo componente non trovato per l'upgrade: ${upgrade.id}`);
  }

  const oldComponent = upgrade.oldComponentId
    ? components.find((c) => c.id === upgrade.oldComponentId)
    : undefined;

  // Costo del nuovo componente
  const newCompEvents = events.filter((e) => e.componentId === upgrade.newComponentId);
  const newComponentCost = newCompEvents.reduce((acc, ev) => {
    if (ev.type === 'PURCHASE') return acc + (ev.price || 0);
    if (ev.type === 'EXTRA_EXPENSE') return acc + (ev.amount || 0);
    return acc;
  }, 0);

  // Ricavo recuperato dal vecchio componente
  let oldComponentRecovered = 0;
  if (upgrade.oldComponentId) {
    const oldCompEvents = events.filter((e) => e.componentId === upgrade.oldComponentId);
    oldComponentRecovered = oldCompEvents.reduce((acc, ev) => {
      if (ev.type === 'SALE') {
        return acc + ((ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0));
      }
      return acc;
    }, 0);
  }

  const netUpgradeCost = newComponentCost - oldComponentRecovered;

  return {
    upgrade,
    oldComponent,
    newComponent,
    newComponentCost,
    oldComponentRecovered,
    netUpgradeCost,
  };
}
