import { describe, it, expect } from 'vitest';
import {
  computeWarrantyInfo,
  calculateExpiryDateFromPreset,
  findPurchaseEvent,
  WARRANTY_PRESETS,
} from '../warrantyEngine';
import { filterComponentsForArchive } from '../archiveEngine';
import { Component, ComponentEvent, ComponentComputedState, WarrantyInfo } from '../../types';

describe('Warranty Engine (Calcolo Garanzie e Scadenze RMA)', () => {
  const referenceDate = '2026-09-18'; // Data di test controllata

  describe('calculateExpiryDateFromPreset', () => {
    it('calcola correttamente la scadenza per preset 24 mesi (Legge UE)', () => {
      const expiry = calculateExpiryDateFromPreset('2024-05-15', 24);
      expect(expiry).toBe('2026-05-15');
    });

    it('calcola correttamente la scadenza per preset 36 mesi (3 anni)', () => {
      const expiry = calculateExpiryDateFromPreset('2023-11-20', 36);
      expect(expiry).toBe('2026-11-20');
    });

    it('gestisce correttamente gli anni bisestili (29 febbraio -> 28 febbraio in anno non bisestile)', () => {
      const expiry = calculateExpiryDateFromPreset('2024-02-29', 12);
      expect(expiry).toBe('2025-02-28');
    });

    it('gestisce fine mese su anno bisestile (31 gennaio -> 29 febbraio 2024)', () => {
      const expiry = calculateExpiryDateFromPreset('2024-01-31', 1);
      expect(expiry).toBe('2024-02-29');
    });

    it('restituisce stringa vuota con date non valide o mesi negativi/zero', () => {
      expect(calculateExpiryDateFromPreset('invalid-date', 24)).toBe('');
      expect(calculateExpiryDateFromPreset('2024-01-01', 0)).toBe('');
      expect(calculateExpiryDateFromPreset('2024-01-01', -12)).toBe('');
    });

    it('i preset costanti contengono i valori standard del mercato hardware', () => {
      expect(WARRANTY_PRESETS.map((p) => p.months)).toEqual([24, 36, 60, 120]);
      expect(WARRANTY_PRESETS[0].label).toContain('2 Anni');
    });
  });

  describe('computeWarrantyInfo', () => {
    it('restituisce stato "none" quando la garanzia non è specificata o assente', () => {
      const info1 = computeWarrantyInfo(null, referenceDate);
      expect(info1.hasWarranty).toBe(false);
      expect(info1.status).toBe('none');
      expect(info1.daysRemaining).toBe(0);
      expect(info1.humanLabel).toBe('Nessuna garanzia impostata');
      expect(info1.isActive).toBe(false);

      const info2 = computeWarrantyInfo({ price: 200 }, referenceDate);
      expect(info2.status).toBe('none');

      const info3 = computeWarrantyInfo({ warrantyExpiryDate: 'invalid' }, referenceDate);
      expect(info3.status).toBe('none');
    });

    it('identifica correttamente garanzia scaduta nel passato', () => {
      // Scaduta da 1 giorno
      const info1 = computeWarrantyInfo({ warrantyExpiryDate: '2026-09-17' }, referenceDate);
      expect(info1.hasWarranty).toBe(true);
      expect(info1.status).toBe('expired');
      expect(info1.isExpired).toBe(true);
      expect(info1.isActive).toBe(false);
      expect(info1.isExpiringSoon).toBe(false);
      expect(info1.humanLabel).toBe('Scaduta da 1 giorno');

      // Scaduta da 15 giorni
      const info2 = computeWarrantyInfo({ warrantyExpiryDate: '2026-09-03' }, referenceDate);
      expect(info2.status).toBe('expired');
      expect(info2.humanLabel).toBe('Scaduta da 15 giorni');

      // Scaduta da 3 mesi
      const info3 = computeWarrantyInfo({ warrantyExpiryDate: '2026-06-18' }, referenceDate);
      expect(info3.status).toBe('expired');
      expect(info3.humanLabel).toContain('Scaduta da');

      // Scaduta da oltre 1 anno
      const info4 = computeWarrantyInfo({ warrantyExpiryDate: '2025-01-01' }, referenceDate);
      expect(info4.status).toBe('expired');
      expect(info4.humanLabel).toContain('oltre 1 anno');
    });

    it('identifica scadenza nel giorno stesso ("Scade oggi")', () => {
      const info = computeWarrantyInfo({ warrantyExpiryDate: '2026-09-18' }, referenceDate);
      expect(info.hasWarranty).toBe(true);
      expect(info.status).toBe('expiring');
      expect(info.daysRemaining).toBe(0);
      expect(info.humanLabel).toBe('Scade oggi');
      expect(info.isExpiringSoon).toBe(true);
      expect(info.isActive).toBe(true);
      expect(info.isExpired).toBe(false);
    });

    it('identifica scadenza a 24 ore ("Scade domani")', () => {
      const info = computeWarrantyInfo({ warrantyExpiryDate: '2026-09-19' }, referenceDate);
      expect(info.status).toBe('expiring');
      expect(info.daysRemaining).toBe(1);
      expect(info.humanLabel).toBe('Scade domani');
      expect(info.isExpiringSoon).toBe(true);
      expect(info.isActive).toBe(true);
    });

    it('identifica garanzia in scadenza ravvicinata (tra 2 e 30 giorni)', () => {
      const info = computeWarrantyInfo({ warrantyExpiryDate: '2026-10-08' }, referenceDate); // +20 giorni
      expect(info.status).toBe('expiring');
      expect(info.daysRemaining).toBe(20);
      expect(info.humanLabel).toBe('Scade tra 20 giorni');
      expect(info.isExpiringSoon).toBe(true);
      expect(info.isActive).toBe(true);
    });

    it('identifica garanzia pienamente attiva (> 30 giorni) con formattazione in mesi/anni', () => {
      // Circa 5 mesi
      const infoMonths = computeWarrantyInfo({ warrantyExpiryDate: '2027-02-18' }, referenceDate);
      expect(infoMonths.status).toBe('active');
      expect(infoMonths.isExpiringSoon).toBe(false);
      expect(infoMonths.isActive).toBe(true);
      expect(infoMonths.humanLabel).toBe('Ancora 5 mesi');

      // 1 anno e 4 mesi
      const infoYearMonths = computeWarrantyInfo({ warrantyExpiryDate: '2028-01-18' }, referenceDate);
      expect(infoYearMonths.status).toBe('active');
      expect(infoYearMonths.humanLabel).toBe('Ancora 1 anno e 4 mesi');

      // 2 anni esatti
      const infoTwoYears = computeWarrantyInfo({ warrantyExpiryDate: '2028-09-18' }, referenceDate);
      expect(infoTwoYears.status).toBe('active');
      expect(infoTwoYears.humanLabel).toBe('Ancora 2 anni');
    });
  });

  describe('findPurchaseEvent', () => {
    it('estrae il purchase event più recente tra gli eventi hardware', () => {
      const events: ComponentEvent[] = [
        {
          id: 'ev-1',
          componentId: 'c-1',
          type: 'PURCHASE',
          price: 500,
          date: '2023-01-10',
          createdAt: '2023-01-10T10:00:00Z',
          warrantyExpiryDate: '2025-01-10',
        },
        {
          id: 'ev-2',
          componentId: 'c-1',
          type: 'INSTALL',
          date: '2023-01-11',
          createdAt: '2023-01-11T10:00:00Z',
        },
      ];

      const found = findPurchaseEvent(events);
      expect(found).toBeDefined();
      expect(found?.id).toBe('ev-1');
      expect(found?.warrantyExpiryDate).toBe('2025-01-10');
    });

    it('restituisce undefined se nessun evento PURCHASE è presente', () => {
      const events: ComponentEvent[] = [
        {
          id: 'ev-install',
          componentId: 'c-1',
          type: 'INSTALL',
          date: '2023-01-11',
          createdAt: '2023-01-11T10:00:00Z',
        },
      ];
      expect(findPurchaseEvent(events)).toBeUndefined();
    });
  });

  describe('filterComponentsForArchive con filtro Garanzia', () => {
    const comp1: Component = {
      id: 'c-active',
      name: 'ASUS RTX 4080',
      brand: 'ASUS',
      model: 'TUF',
      category: 'gpu',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const comp2: Component = {
      id: 'c-expiring',
      name: 'Samsung 990 Pro',
      brand: 'Samsung',
      model: '2TB',
      category: 'storage',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    const comp3: Component = {
      id: 'c-expired',
      name: 'Corsair RM850x',
      brand: 'Corsair',
      model: '850W',
      category: 'psu',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    };
    const comp4: Component = {
      id: 'c-none',
      name: 'Cavi Custom Mod',
      brand: 'CableMod',
      model: 'Pro',
      category: 'accessories',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    const components = [comp1, comp2, comp3, comp4];
    const computedMap: Record<string, ComponentComputedState> = {
      'c-active': { status: 'IN_USE' } as any,
      'c-expiring': { status: 'IN_USE' } as any,
      'c-expired': { status: 'IN_STORAGE' } as any,
      'c-none': { status: 'IN_USE' } as any,
    };

    const warrantyMap: Record<string, WarrantyInfo> = {
      'c-active': computeWarrantyInfo({ warrantyExpiryDate: '2027-09-18' }, referenceDate), // active
      'c-expiring': computeWarrantyInfo({ warrantyExpiryDate: '2026-10-01' }, referenceDate), // expiring (13 days)
      'c-expired': computeWarrantyInfo({ warrantyExpiryDate: '2024-01-01' }, referenceDate), // expired
      'c-none': computeWarrantyInfo(null, referenceDate), // none
    };

    it('filtra solo componenti con garanzia attiva (include active ed expiring)', () => {
      const res = filterComponentsForArchive(
        components,
        computedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'active' },
        warrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c-active', 'c-expiring']);
    });

    it('filtra solo componenti in scadenza (< 30 giorni)', () => {
      const res = filterComponentsForArchive(
        components,
        computedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'expiring' },
        warrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c-expiring']);
    });

    it('filtra solo componenti con garanzia terminata (expired)', () => {
      const res = filterComponentsForArchive(
        components,
        computedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'expired' },
        warrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c-expired']);
    });

    it('con warranty: "all" restituisce tutti i componenti', () => {
      const res = filterComponentsForArchive(
        components,
        computedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'all' },
        warrantyMap
      );
      expect(res.length).toBe(4);
    });
  });
});
