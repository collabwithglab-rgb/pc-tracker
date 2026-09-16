import { describe, it, expect } from 'vitest';
import {
  getLocalDateISO,
  computeComponentStatus,
  computeDaysInUse,
  isValidISODateString,
  validatePurchaseEvent,
  validateInstallEvent,
  validateSaleEvent,
  validateUpgrade,
} from '../index';
import { getComponentStatusAtDate } from '../historyEngine';
import { validateImportJSON } from '../../storage/storageService';
import { Component, ComponentEvent } from '../../types';

describe('Data Integrity Audit Pass (AUD-005, AUD-006, AUD-007, AUD-009)', () => {
  // --------------------------------------------------------------------------
  // AUD-005: Timezone-safe local date in lifecycleEngine
  // --------------------------------------------------------------------------
  describe('AUD-005: Timezone-safe local date helper', () => {
    it('genera correttamente il formato YYYY-MM-DD usando i valori locali senza deviazioni UTC', () => {
      // Simula una data con ore a cavallo di mezzanotte
      const d = new Date(2024, 1, 5, 0, 30, 0); // 5 Febbraio 2024, 00:30 locali
      const iso = getLocalDateISO(d);
      expect(iso).toBe('2024-02-05');

      const endOfYear = new Date(2024, 11, 31, 23, 45, 0); // 31 Dicembre 2024
      expect(getLocalDateISO(endOfYear)).toBe('2024-12-31');
    });

    it('computeDaysInUse calcola i giorni di utilizzo coerentemente con la data di riferimento', () => {
      const events: ComponentEvent[] = [
        {
          id: 'ev-1',
          componentId: 'c1',
          type: 'INSTALL',
          date: '2024-01-01',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ];
      // Dal 2024-01-01 al 2024-01-11 = 10 giorni
      const days = computeDaysInUse(events, '2024-01-11');
      expect(days).toBe(10);
    });
  });

  // --------------------------------------------------------------------------
  // AUD-006: Allineamento Lifecycle vs History su eventi stesso giorno
  // --------------------------------------------------------------------------
  describe('AUD-006: Allineamento Lifecycle vs History su eventi stesso giorno', () => {
    it('entrambi i motori considerano SOLD prioritario su eventi dello stesso giorno (INSTALL/UNINSTALL + SALE)', () => {
      const compId = 'comp-same-day-gpu';
      const events: ComponentEvent[] = [
        {
          id: 'ev-p',
          componentId: compId,
          type: 'PURCHASE',
          date: '2024-05-10',
          price: 500,
          createdAt: '2024-05-10T08:00:00.000Z',
        },
        {
          id: 'ev-u',
          componentId: compId,
          type: 'UNINSTALL',
          date: '2024-05-10',
          createdAt: '2024-05-10T12:00:00.000Z',
        },
        {
          id: 'ev-s',
          componentId: compId,
          type: 'SALE',
          date: '2024-05-10',
          price: 400,
          createdAt: '2024-05-10T10:00:00.000Z', // Notare createdAt precedente a UNINSTALL
        },
      ];

      // Sia computeComponentStatus (lifecycle) che getComponentStatusAtDate (history) devono restituire SOLD
      const lifecycleStatus = computeComponentStatus(events);
      const historyStatus = getComponentStatusAtDate(compId, events, '2024-05-10');

      expect(lifecycleStatus).toBe('SOLD');
      expect(historyStatus).toBe('SOLD');
      expect(lifecycleStatus).toBe(historyStatus);
    });

    it('entrambi i motori considerano GIFTED prioritario su UNINSTALL nello stesso giorno', () => {
      const compId = 'comp-gift';
      const events: ComponentEvent[] = [
        { id: 'p', componentId: compId, type: 'PURCHASE', date: '2024-01-01', price: 100, createdAt: '2024-01-01' },
        { id: 'i', componentId: compId, type: 'INSTALL', date: '2024-01-02', createdAt: '2024-01-02' },
        { id: 'u', componentId: compId, type: 'UNINSTALL', date: '2024-06-01', createdAt: '2024-06-01T10:00:00Z' },
        { id: 'g', componentId: compId, type: 'GIFT', date: '2024-06-01', createdAt: '2024-06-01T12:00:00Z' },
      ];

      expect(computeComponentStatus(events)).toBe('GIFTED');
      expect(getComponentStatusAtDate(compId, events, '2024-06-01')).toBe('GIFTED');
    });

    it('entrambi i motori considerano DISPOSED prioritario su UNINSTALL nello stesso giorno', () => {
      const compId = 'comp-disp';
      const events: ComponentEvent[] = [
        { id: 'p', componentId: compId, type: 'PURCHASE', date: '2024-01-01', price: 100, createdAt: '2024-01-01' },
        { id: 'i', componentId: compId, type: 'INSTALL', date: '2024-01-02', createdAt: '2024-01-02' },
        { id: 'u', componentId: compId, type: 'UNINSTALL', date: '2024-06-01', createdAt: '2024-06-01T10:00:00Z' },
        { id: 'd', componentId: compId, type: 'DISPOSAL', date: '2024-06-01', disposalMethod: 'recycled', createdAt: '2024-06-01T12:00:00Z' },
      ];

      expect(computeComponentStatus(events)).toBe('DISPOSED');
      expect(getComponentStatusAtDate(compId, events, '2024-06-01')).toBe('DISPOSED');
    });
  });

  // --------------------------------------------------------------------------
  // AUD-007: Validazione Import Rigorosa in validateImportJSON
  // --------------------------------------------------------------------------
  describe('AUD-007: Validazione Import Rigorosa', () => {
    it('rifiuta JSON con ID componenti duplicati', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [
          { id: 'c1', name: 'CPU 1', category: 'cpu' },
          { id: 'c1', name: 'CPU Duplicate', category: 'cpu' },
        ],
        events: [],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('ID componente duplicato');
      }
    });

    it('rifiuta JSON con integrità referenziale violata (event.componentId inesistente)', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [{ id: 'c1', name: 'CPU 1', category: 'cpu' }],
        events: [
          {
            id: 'e1',
            componentId: 'c-ghost',
            type: 'PURCHASE',
            date: '2024-01-01',
          },
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Integrità referenziale violata');
      }
    });

    it('rifiuta JSON con integrità referenziale violata negli upgrade (oldComponentId o newComponentId inesistente)', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [{ id: 'c1', name: 'CPU 1', category: 'cpu' }],
        events: [{ id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01' }],
        upgrades: [
          {
            id: 'up-1',
            date: '2024-02-01',
            category: 'cpu',
            oldComponentId: 'c1',
            newComponentId: 'c-ghost-2',
          },
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Integrità referenziale violata');
      }
    });

    it('rifiuta JSON con data non valida o inesistente negli eventi', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [{ id: 'c1', name: 'CPU 1', category: 'cpu' }],
        events: [
          {
            id: 'e1',
            componentId: 'c1',
            type: 'PURCHASE',
            date: '2024-02-31', // 31 Febbraio non esiste
          },
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Data non valida');
      }
    });

    it('rifiuta JSON che viola la coerenza del ciclo di vita (es. UNINSTALL prima di INSTALL)', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        components: [{ id: 'c1', name: 'CPU 1', category: 'cpu' }],
        events: [
          { id: 'e1', componentId: 'c1', type: 'PURCHASE', date: '2024-01-01' },
          { id: 'e2', componentId: 'c1', type: 'UNINSTALL', date: '2024-02-01' },
        ],
      });

      const res = validateImportJSON(json);
      expect(res.isValid).toBe(false);
      if (!res.isValid) {
        expect(res.error).toContain('Coerenza ciclo di vita violata');
      }
    });
  });

  // --------------------------------------------------------------------------
  // AUD-009: Date Validator rigoroso con isValidISODateString
  // --------------------------------------------------------------------------
  describe('AUD-009: Date Validator rigoroso', () => {
    it('accetta solo stringhe ISO valide nel formato YYYY-MM-DD e date gregoriane reali', () => {
      expect(isValidISODateString('2024-01-15')).toBe(true);
      expect(isValidISODateString('2024-02-29')).toBe(true); // 2024 è bisestile
      expect(isValidISODateString('2020-02-29')).toBe(true); // 2020 è bisestile

      // Date impossibili
      expect(isValidISODateString('2024-02-31')).toBe(false); // Febbraio ha max 29 gg
      expect(isValidISODateString('2023-02-29')).toBe(false); // 2023 NON è bisestile
      expect(isValidISODateString('2024-04-31')).toBe(false); // Aprile ha 30 giorni
      expect(isValidISODateString('2024-06-31')).toBe(false); // Giugno ha 30 giorni
      expect(isValidISODateString('2024-13-01')).toBe(false); // Mese 13 non esiste
      expect(isValidISODateString('2024-00-10')).toBe(false); // Mese 00 non esiste
      expect(isValidISODateString('2024-05-00')).toBe(false); // Giorno 00 non esiste

      // Formati non ISO
      expect(isValidISODateString('15/01/2024')).toBe(false);
      expect(isValidISODateString('2024/01/15')).toBe(false);
      expect(isValidISODateString('2024-1-5')).toBe(false);
      expect(isValidISODateString('invalid-date')).toBe(false);
      expect(isValidISODateString('')).toBe(false);
      expect(isValidISODateString(null as any)).toBe(false);
      expect(isValidISODateString(undefined as any)).toBe(false);
    });

    it('validatePurchaseEvent e validateInstallEvent rifiutano date fasulle come 2024-02-31', () => {
      const purchaseRes = validatePurchaseEvent({
        componentId: 'c1',
        price: 100,
        date: '2024-02-31',
      });
      expect(purchaseRes.isValid).toBe(false);
      expect(purchaseRes.errors.date).toBeDefined();

      const installRes = validateInstallEvent(
        { componentId: 'c1', date: '2023-02-29' },
        'IN_STORAGE'
      );
      expect(installRes.isValid).toBe(false);
      expect(installRes.errors.date).toBeDefined();
    });

    it('validateSaleEvent e validateUpgrade rifiutano date con formato errato o calendario impossibile', () => {
      const saleRes = validateSaleEvent(
        { componentId: 'c1', price: 50, date: '2024-04-31' },
        'IN_STORAGE'
      );
      expect(saleRes.isValid).toBe(false);
      expect(saleRes.errors.date).toBeDefined();

      const mockComp: Component = {
        id: 'c1',
        name: 'GPU',
        brand: 'B',
        model: 'M',
        category: 'gpu',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      const upgradeRes = validateUpgrade(
        {
          oldComponentId: 'c1',
          date: '2024-11-31', // Novembre ha 30 giorni
          mode: 'new',
          newComponentData: {
            name: 'New GPU',
            brand: 'B2',
            model: 'M2',
            category: 'gpu',
            purchasePrice: 200,
          },
        },
        [mockComp],
        [{ id: 'p', componentId: 'c1', type: 'PURCHASE', price: 100, date: '2024-01-01', createdAt: '2024-01-01' }]
      );
      expect(upgradeRes.isValid).toBe(false);
      expect(upgradeRes.errors.date).toBeDefined();
    });
  });
});
