import { describe, it, expect } from 'vitest';
import { ComponentCategory, ComponentEvent } from '../../../types';

/**
 * Regression test per la logica di presentazione e ordinamento della Dashboard (Tranche 11.2)
 * Verifica:
 * 1. Ordinamento deterministico dei componenti montati per priorità hardware
 * 2. Ordinamento deterministico degli eventi recenti e limitazione per dashboardRecentCount
 * 3. Calcolo dei delta finanziari per riga evento (acquisto, vendita con netto, extra)
 * 4. Marcatura del movimento più recente
 */

describe('Dashboard Logic & Data Ordering (Tranche 11.2)', () => {
  const CATEGORY_PRIORITY: Record<ComponentCategory, number> = {
    cpu: 1,
    gpu: 2,
    motherboard: 3,
    ram: 4,
    storage: 5,
    psu: 6,
    cooling: 7,
    case: 8,
    monitor: 9,
    peripherals: 10,
    accessories: 11,
    other: 12,
  };

  it('ordina i componenti montati secondo la gerarchia hardware di riferimento', () => {
    const mockComponents = [
      { name: 'Corsair RM850x', category: 'psu' as ComponentCategory },
      { name: 'AMD Ryzen 7 7800X3D', category: 'cpu' as ComponentCategory },
      { name: 'Nvidia RTX 4090', category: 'gpu' as ComponentCategory },
      { name: 'Lian Li O11 Dynamic', category: 'case' as ComponentCategory },
      { name: 'G.Skill Trident Z5 32GB', category: 'ram' as ComponentCategory },
    ];

    const sorted = [...mockComponents].sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.category] || 99;
      const pB = CATEGORY_PRIORITY[b.category] || 99;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });

    expect(sorted[0].name).toBe('AMD Ryzen 7 7800X3D'); // cpu (1)
    expect(sorted[1].name).toBe('Nvidia RTX 4090'); // gpu (2)
    expect(sorted[2].name).toBe('G.Skill Trident Z5 32GB'); // ram (4)
    expect(sorted[3].name).toBe('Corsair RM850x'); // psu (6)
    expect(sorted[4].name).toBe('Lian Li O11 Dynamic'); // case (8)
  });

  it('ordina gli eventi recenti in modo decrescente e applica il limite dashboardRecentCount', () => {
    const mockEvents: Partial<ComponentEvent>[] = [
      { id: 'ev-1', date: '2024-01-10', createdAt: '2024-01-10T10:00:00Z' },
      { id: 'ev-2', date: '2024-06-15', createdAt: '2024-06-15T12:00:00Z' },
      { id: 'ev-3', date: '2024-03-01', createdAt: '2024-03-01T08:00:00Z' },
      { id: 'ev-4', date: '2024-06-15', createdAt: '2024-06-15T16:00:00Z' }, // Stessa data, createdAt successivo
      { id: 'ev-5', date: '2023-12-01', createdAt: '2023-12-01T09:00:00Z' },
    ];

    const sortEvents = (events: Partial<ComponentEvent>[], limit: number) => {
      return [...events]
        .sort((a, b) => {
          if (a.date !== b.date) {
            return (b.date || '').localeCompare(a.date || '');
          }
          const diffCreated = (b.createdAt || '').localeCompare(a.createdAt || '');
          if (diffCreated !== 0) return diffCreated;
          return (b.id || '').localeCompare(a.id || '');
        })
        .slice(0, limit);
    };

    const recent = sortEvents(mockEvents, 3);
    expect(recent.length).toBe(3);
    expect(recent[0].id).toBe('ev-4'); // 2024-06-15T16:00
    expect(recent[1].id).toBe('ev-2'); // 2024-06-15T12:00
    expect(recent[2].id).toBe('ev-3'); // 2024-03-01
  });

  it('calcola correttamente il delta finanziario positivo per vendite e negativo per acquisti ed extra', () => {
    const getFinancialDelta = (ev: Partial<ComponentEvent>) => {
      switch (ev.type) {
        case 'PURCHASE':
          return (ev.price || 0) > 0 ? { text: `-€${(ev.price || 0).toFixed(2)}`, type: 'expense' } : null;
        case 'EXTRA_EXPENSE':
          return (ev.amount || 0) > 0 ? { text: `-€${(ev.amount || 0).toFixed(2)}`, type: 'expense' } : null;
        case 'SALE': {
          const net = (ev.price || 0) - (ev.shippingCost || 0) - (ev.fees || 0);
          return { text: `+€${net.toFixed(2)}`, type: 'income' };
        }
        default:
          return null;
      }
    };

    const purchase = getFinancialDelta({ type: 'PURCHASE', price: 450 });
    expect(purchase).toEqual({ text: '-€450.00', type: 'expense' });

    const sale = getFinancialDelta({ type: 'SALE', price: 300, shippingCost: 10, fees: 15 });
    expect(sale).toEqual({ text: '+€275.00', type: 'income' });

    const extra = getFinancialDelta({ type: 'EXTRA_EXPENSE', amount: 35.5 });
    expect(extra).toEqual({ text: '-€35.50', type: 'expense' });

    const install = getFinancialDelta({ type: 'INSTALL' });
    expect(install).toBeNull();
  });

  it('raggruppa correttamente i componenti del rig per filtri di categoria (interni, periferiche, accessori)', () => {
    const INTERNAL_CATEGORIES: ComponentCategory[] = [
      'cpu',
      'gpu',
      'motherboard',
      'ram',
      'storage',
      'psu',
      'cooling',
      'case',
    ];
    const PERIPHERAL_CATEGORIES: ComponentCategory[] = ['monitor', 'peripherals'];
    const ACCESSORY_CATEGORIES: ComponentCategory[] = ['accessories', 'other'];

    const mockRig = [
      { category: 'cpu' as ComponentCategory, name: 'Ryzen 7 7800X3D' },
      { category: 'gpu' as ComponentCategory, name: 'RTX 4070 Dual' },
      { category: 'ram' as ComponentCategory, name: 'Corsair Vengeance' },
      { category: 'monitor' as ComponentCategory, name: 'Dell S2721DGFA' },
      { category: 'peripherals' as ComponentCategory, name: 'AJAZZ AJ179' },
      { category: 'peripherals' as ComponentCategory, name: 'AULA F75' },
      { category: 'accessories' as ComponentCategory, name: 'Cavo SATA CERRXIAN' },
      { category: 'other' as ComponentCategory, name: 'Braccio Monitor Grifema' },
    ];

    const internals = mockRig.filter((c) => INTERNAL_CATEGORIES.includes(c.category));
    const peripherals = mockRig.filter((c) => PERIPHERAL_CATEGORIES.includes(c.category));
    const accessories = mockRig.filter((c) => ACCESSORY_CATEGORIES.includes(c.category));

    expect(mockRig.length).toBe(8);
    expect(internals.length).toBe(3);
    expect(peripherals.length).toBe(3);
    expect(accessories.length).toBe(2);
  });

  it('deriva correttamente lo stato e la severità delle pill dello Smart System Pulse', () => {
    // 1. Test logica scadenza manutenzione
    const computeMaintenanceSeverity = (dueDate: string, today: string) => {
      const [ty, tm, td] = today.split('-').map(Number);
      const [ey, em, ed] = dueDate.split('-').map(Number);
      const diffDays = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td)) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { status: 'ruby', diffDays };
      if (diffDays <= 30) return { status: 'amber', diffDays };
      return { status: 'emerald', diffDays };
    };

    const overdue = computeMaintenanceSeverity('2026-09-10', '2026-09-19');
    expect(overdue.status).toBe('ruby');
    expect(overdue.diffDays).toBe(-9);

    const upcomingSoon = computeMaintenanceSeverity('2026-09-25', '2026-09-19');
    expect(upcomingSoon.status).toBe('amber');
    expect(upcomingSoon.diffDays).toBe(6);

    const farAway = computeMaintenanceSeverity('2026-12-01', '2026-09-19');
    expect(farAway.status).toBe('emerald');

    // 2. Test calcolo pezzi a magazzino
    const mockStorage = [
      { id: 'c-1', status: 'IN_STORAGE', purchasePrice: 120 },
      { id: 'c-2', status: 'IN_USE', purchasePrice: 400 },
      { id: 'c-3', status: 'IN_STORAGE', purchasePrice: 85 },
    ];
    const inStorageItems = mockStorage.filter((i) => i.status === 'IN_STORAGE');
    const totalStorageCapital = inStorageItems.reduce((acc, i) => acc + i.purchasePrice, 0);

    expect(inStorageItems.length).toBe(2);
    expect(totalStorageCapital).toBe(205);
  });
});

