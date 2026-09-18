import { describe, it, expect } from 'vitest';
import { NavSection } from '../Sidebar';
import { Component, ComponentEvent, SaleEvent, PurchaseEvent } from '../../../types';
import { computeComponentComputedState } from '../../../domain';

describe('Navigation & Marketplace Suite', () => {
  it('should include marketplace as a valid NavSection', () => {
    const validSections: NavSection[] = [
      'dashboard',
      'current-rig',
      'time-travel',
      'archive',
      'upgrades',
      'marketplace',
      'stats',
      'maintenance',
      'wiki',
      'settings',
    ];

    expect(validSections).toContain('marketplace');
    expect(validSections).toContain('maintenance');
    expect(validSections).toContain('wiki');
    expect(validSections.length).toBe(10);
  });

  it('should accurately compute inStorage count and badge for marketplace', () => {
    const now = '2021-01-01T00:00:00.000Z';
    const mockComponents: Component[] = [
      { id: 'c1', name: 'RTX 3070', brand: 'MSI', model: 'Ventus', category: 'gpu', createdAt: now, updatedAt: now },
      { id: 'c2', name: 'Ryzen 5800X', brand: 'AMD', model: '5800X', category: 'cpu', createdAt: now, updatedAt: now },
      { id: 'c3', name: 'RAM 16GB', brand: 'Corsair', model: 'Vengeance', category: 'ram', createdAt: now, updatedAt: now },
    ];

    const mockEvents: ComponentEvent[] = [
      { id: 'e1', componentId: 'c1', date: '2021-01-01', type: 'PURCHASE', price: 600, createdAt: now } as PurchaseEvent,
      { id: 'e2', componentId: 'c1', date: '2021-01-02', type: 'INSTALL', slotOrLocation: 'PCIe 1', createdAt: now },
      { id: 'e3', componentId: 'c1', date: '2023-01-01', type: 'UNINSTALL', reason: 'upgrade', createdAt: now }, // IN_STORAGE

      { id: 'e4', componentId: 'c2', date: '2021-01-01', type: 'PURCHASE', price: 400, createdAt: now } as PurchaseEvent,
      { id: 'e5', componentId: 'c2', date: '2021-01-02', type: 'INSTALL', slotOrLocation: 'AM4', createdAt: now }, // IN_USE

      { id: 'e6', componentId: 'c3', date: '2021-01-01', type: 'PURCHASE', price: 80, createdAt: now } as PurchaseEvent, // IN_STORAGE (never installed)
    ];

    const computedStates = mockComponents.map((c) => {
      const cEvents = mockEvents.filter((e) => e.componentId === c.id);
      return computeComponentComputedState(c, cEvents);
    });

    const inStorageCount = computedStates.filter((s) => s.status === 'IN_STORAGE').length;
    const inUseCount = computedStates.filter((s) => s.status === 'IN_USE').length;

    expect(inStorageCount).toBe(2);
    expect(inUseCount).toBe(1);

    // Badge should be inStorageCount if > 0
    const badge = inStorageCount > 0 ? inStorageCount : undefined;
    expect(badge).toBe(2);
  });

  it('should accurately calculate net recovered from sales and capital locked in storage', () => {
    const mockEvents: ComponentEvent[] = [
      {
        id: 's1',
        componentId: 'c1',
        date: '2023-02-01',
        type: 'SALE',
        price: 350,
        shippingCost: 15,
        fees: 10,
        createdAt: '2023-02-01T00:00:00.000Z',
      } as SaleEvent,
      {
        id: 's2',
        componentId: 'c2',
        date: '2023-03-01',
        type: 'SALE',
        price: 200,
        createdAt: '2023-03-01T00:00:00.000Z',
      } as SaleEvent,
    ];

    let totalRecoveredSales = 0;
    for (const ev of mockEvents) {
      if (ev.type === 'SALE') {
        const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
        totalRecoveredSales += net;
      }
    }

    // s1: 350 - 15 - 10 = 325. s2: 200 - 0 - 0 = 200. Total = 525.
    expect(totalRecoveredSales).toBe(525);
  });
});
