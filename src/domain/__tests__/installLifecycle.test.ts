import { describe, it, expect } from 'vitest';
import {
  validateInstallEvent,
  validateUninstallEvent,
} from '../validators';
import {
  computeComponentStatus,
  computeDaysInUse,
  computeComponentComputedState,
} from '../lifecycleEngine';
import { Component, ComponentEvent, InstallEvent, UninstallEvent, PurchaseEvent } from '../../types';

describe('Fase 3: Lifecycle Engine & Install/Uninstall Rules', () => {
  const dummyComponent: Component = {
    id: 'cpu-1',
    name: 'AMD Ryzen 7 7800X3D',
    brand: 'AMD',
    model: '7800X3D',
    category: 'cpu',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const now = '2024-01-01T00:00:00.000Z';

  it('un componente appena acquistato ha stato IN_STORAGE', () => {
    const purchase: PurchaseEvent = {
      id: 'ev-1',
      componentId: 'cpu-1',
      type: 'PURCHASE',
      date: '2024-01-10',
      price: 380,
      createdAt: now,
    };

    const status = computeComponentStatus([purchase]);
    expect(status).toBe('IN_STORAGE');
  });

  it('installazione valida fa passare il componente a IN_USE', () => {
    const purchase: PurchaseEvent = {
      id: 'ev-1',
      componentId: 'cpu-1',
      type: 'PURCHASE',
      date: '2024-01-10',
      price: 380,
      createdAt: now,
    };

    const currentStatus = computeComponentStatus([purchase]);
    const installData: Partial<InstallEvent> = {
      componentId: 'cpu-1',
      date: '2024-01-12',
      slotOrLocation: 'AM5 Socket',
    };

    const validation = validateInstallEvent(installData, currentStatus);
    expect(validation.isValid).toBe(true);

    const install: InstallEvent = {
      id: 'ev-2',
      componentId: 'cpu-1',
      type: 'INSTALL',
      date: '2024-01-12',
      slotOrLocation: 'AM5 Socket',
      createdAt: now,
    };

    const newStatus = computeComponentStatus([purchase, install]);
    expect(newStatus).toBe('IN_USE');
  });

  it('uninstall valida fa passare il componente a IN_STORAGE', () => {
    const purchase: PurchaseEvent = {
      id: 'ev-1',
      componentId: 'cpu-1',
      type: 'PURCHASE',
      date: '2024-01-10',
      price: 380,
      createdAt: now,
    };
    const install: InstallEvent = {
      id: 'ev-2',
      componentId: 'cpu-1',
      type: 'INSTALL',
      date: '2024-01-12',
      slotOrLocation: 'AM5 Socket',
      createdAt: now,
    };

    const currentStatus = computeComponentStatus([purchase, install]);
    expect(currentStatus).toBe('IN_USE');

    const uninstallData: Partial<UninstallEvent> = {
      componentId: 'cpu-1',
      date: '2024-03-01',
      reason: 'upgrade',
    };

    const validation = validateUninstallEvent(uninstallData, currentStatus);
    expect(validation.isValid).toBe(true);

    const uninstall: UninstallEvent = {
      id: 'ev-3',
      componentId: 'cpu-1',
      type: 'UNINSTALL',
      date: '2024-03-01',
      reason: 'upgrade',
      createdAt: now,
    };

    const finalStatus = computeComponentStatus([purchase, install, uninstall]);
    expect(finalStatus).toBe('IN_STORAGE');
  });

  it('rifiuta la doppia installazione di un componente già IN_USE', () => {
    const events: ComponentEvent[] = [
      {
        id: 'ev-1',
        componentId: 'cpu-1',
        type: 'INSTALL',
        date: '2024-01-12',
        createdAt: now,
      },
    ];

    const currentStatus = computeComponentStatus(events);
    expect(currentStatus).toBe('IN_USE');

    const duplicateInstall: Partial<InstallEvent> = {
      componentId: 'cpu-1',
      date: '2024-01-15',
    };

    const validation = validateInstallEvent(duplicateInstall, currentStatus);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.status).toContain('già attualmente montato');
  });

  it('rifiuta la rimozione di un componente non montato (IN_STORAGE)', () => {
    const events: ComponentEvent[] = [
      {
        id: 'ev-1',
        componentId: 'cpu-1',
        type: 'PURCHASE',
        date: '2024-01-10',
        price: 380,
        createdAt: now,
      },
    ];

    const currentStatus = computeComponentStatus(events);
    expect(currentStatus).toBe('IN_STORAGE');

    const invalidUninstall: Partial<UninstallEvent> = {
      componentId: 'cpu-1',
      date: '2024-01-15',
      reason: 'storage',
    };

    const validation = validateUninstallEvent(invalidUninstall, currentStatus);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.status).toContain('non risulta montato nel PC');
  });

  it('rifiuta installazione di componenti terminali (SOLD, GIFTED, DISPOSED)', () => {
    const soldValidation = validateInstallEvent(
      { componentId: 'comp-1', date: '2024-05-01' },
      'SOLD'
    );
    expect(soldValidation.isValid).toBe(false);
    expect(soldValidation.errors.status).toContain('venduto');

    const giftedValidation = validateInstallEvent(
      { componentId: 'comp-1', date: '2024-05-01' },
      'GIFTED'
    );
    expect(giftedValidation.isValid).toBe(false);
    expect(giftedValidation.errors.status).toContain('regalato');

    const disposedValidation = validateInstallEvent(
      { componentId: 'comp-1', date: '2024-05-01' },
      'DISPOSED'
    );
    expect(disposedValidation.isValid).toBe(false);
    expect(disposedValidation.errors.status).toContain('smaltito');
  });

  it('supporta la sequenza cronologica complessa INSTALL → UNINSTALL → INSTALL', () => {
    const events: ComponentEvent[] = [
      {
        id: 'ev-1',
        componentId: 'cpu-1',
        type: 'PURCHASE',
        date: '2024-01-01',
        price: 400,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'ev-2',
        componentId: 'cpu-1',
        type: 'INSTALL',
        date: '2024-01-05',
        slotOrLocation: 'Build Principale',
        createdAt: '2024-01-05T00:00:00.000Z',
      },
      {
        id: 'ev-3',
        componentId: 'cpu-1',
        type: 'UNINSTALL',
        date: '2024-01-15', // 10 giorni di utilizzo
        reason: 'maintenance',
        createdAt: '2024-01-15T00:00:00.000Z',
      },
      {
        id: 'ev-4',
        componentId: 'cpu-1',
        type: 'INSTALL',
        date: '2024-02-01', // rimontato
        slotOrLocation: 'Build Secondaria',
        createdAt: '2024-02-01T00:00:00.000Z',
      },
    ];

    const currentStatus = computeComponentStatus(events);
    expect(currentStatus).toBe('IN_USE');

    // Calcolo giorni di utilizzo con data di riferimento fissata a 2024-02-11 (10 giorni nel secondo montaggio)
    // Totale atteso: 10 giorni (gennaio) + 10 giorni (febbraio) = 20 giorni
    const days = computeDaysInUse(events, '2024-02-11');
    expect(days).toBe(20);
  });

  it('calcola correttamente i giorni di utilizzo e il costo per giorno', () => {
    const events: ComponentEvent[] = [
      {
        id: 'ev-1',
        componentId: 'cpu-1',
        type: 'PURCHASE',
        date: '2024-01-01',
        price: 300,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'ev-2',
        componentId: 'cpu-1',
        type: 'INSTALL',
        date: '2024-01-01',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'ev-3',
        componentId: 'cpu-1',
        type: 'UNINSTALL',
        date: '2024-04-10', // 100 giorni esatti (dal 1 gen al 10 apr in anno bisestile 2024: 31 gen + 29 feb + 31 mar + 9 apr = 100 giorni)
        reason: 'storage',
        createdAt: '2024-04-10T00:00:00.000Z',
      },
    ];

    const computed = computeComponentComputedState(dummyComponent, events);
    expect(computed.status).toBe('IN_STORAGE');
    expect(computed.daysInUse).toBe(100);
    // Costo acquisto 300 / 100 giorni = 3.00 €/giorno
    expect(computed.costPerDayInUse).toBe(3);
  });

  it('gestisce correttamente date storiche nel passato per INSTALL', () => {
    const historicalInstall: Partial<InstallEvent> = {
      componentId: 'cpu-1',
      date: '2021-06-15',
      slotOrLocation: 'PCIe 4.0 x16',
    };

    const validation = validateInstallEvent(historicalInstall, 'IN_STORAGE');
    expect(validation.isValid).toBe(true);
  });
});
