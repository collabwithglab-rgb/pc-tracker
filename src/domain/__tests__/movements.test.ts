import { describe, it, expect } from 'vitest';
import {
  validateSaleEvent,
  validateExtraExpenseEvent,
  validateGiftEvent,
  validateDisposalEvent,
} from '../validators';
import {
  computeTotalPurchased,
  computeTotalRecovered,
  computeHistoricalNetCost,
  computeCurrentRigCost,
} from '../financialEngine';
import { computeComponentStatus } from '../lifecycleEngine';
import {
  Component,
  ComponentEvent,
  PurchaseEvent,
  InstallEvent,
  SaleEvent,
  ExtraExpenseEvent,
  GiftEvent,
  DisposalEvent,
} from '../../types';

describe('Movement & Operation Validators', () => {
  const existingCompIds = new Set(['comp-1', 'comp-2', 'comp-3']);

  describe('validateSaleEvent', () => {
    it('approves a valid sale for an in-storage component', () => {
      const result = validateSaleEvent(
        {
          componentId: 'comp-1',
          date: '2024-05-10',
          price: 250,
          platform: 'Subito.it',
          shippingCost: 10,
          fees: 5,
        },
        'IN_STORAGE',
        existingCompIds
      );
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('approves a valid sale for an in-use component (which will be uninstalled)', () => {
      const result = validateSaleEvent(
        {
          componentId: 'comp-1',
          date: '2024-05-10',
          price: 300,
        },
        'IN_USE',
        existingCompIds
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects sale of a component that is already SOLD', () => {
      const result = validateSaleEvent(
        {
          componentId: 'comp-1',
          date: '2024-05-10',
          price: 200,
        },
        'SOLD',
        existingCompIds
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.status).toContain('già venduto');
    });

    it('rejects sale of a component that is already GIFTED or DISPOSED', () => {
      const resultGifted = validateSaleEvent(
        { componentId: 'comp-1', date: '2024-05-10', price: 200 },
        'GIFTED',
        existingCompIds
      );
      expect(resultGifted.isValid).toBe(false);

      const resultDisposed = validateSaleEvent(
        { componentId: 'comp-1', date: '2024-05-10', price: 200 },
        'DISPOSED',
        existingCompIds
      );
      expect(resultDisposed.isValid).toBe(false);
    });

    it('rejects negative price, negative shipping or negative fees', () => {
      const resultNegativePrice = validateSaleEvent(
        { componentId: 'comp-1', date: '2024-05-10', price: -50 },
        'IN_STORAGE',
        existingCompIds
      );
      expect(resultNegativePrice.isValid).toBe(false);
      expect(resultNegativePrice.errors.price).toBeDefined();

      const resultNegativeFees = validateSaleEvent(
        { componentId: 'comp-1', date: '2024-05-10', price: 100, fees: -10 },
        'IN_STORAGE',
        existingCompIds
      );
      expect(resultNegativeFees.isValid).toBe(false);
      expect(resultNegativeFees.errors.fees).toBeDefined();
    });

    it('rejects missing or invalid date', () => {
      const result = validateSaleEvent(
        { componentId: 'comp-1', date: 'invalid-date', price: 100 },
        'IN_STORAGE',
        existingCompIds
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.date).toBeDefined();
    });
  });

  describe('validateExtraExpenseEvent', () => {
    it('approves a valid extra expense with positive amount and description', () => {
      const result = validateExtraExpenseEvent(
        {
          componentId: 'comp-1',
          date: '2024-06-01',
          amount: 45.5,
          description: 'Cavi modding CableMod bianchi',
        },
        existingCompIds
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects amount <= 0 or missing amount', () => {
      const resultZero = validateExtraExpenseEvent(
        { componentId: 'comp-1', date: '2024-06-01', amount: 0, description: 'Cavi' },
        existingCompIds
      );
      expect(resultZero.isValid).toBe(false);
      expect(resultZero.errors.amount).toBeDefined();

      const resultNeg = validateExtraExpenseEvent(
        { componentId: 'comp-1', date: '2024-06-01', amount: -20, description: 'Cavi' },
        existingCompIds
      );
      expect(resultNeg.isValid).toBe(false);
    });

    it('rejects empty or missing description', () => {
      const result = validateExtraExpenseEvent(
        { componentId: 'comp-1', date: '2024-06-01', amount: 30, description: '   ' },
        existingCompIds
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });
  });

  describe('validateGiftEvent', () => {
    it('approves a valid gift for active/stored component', () => {
      const result = validateGiftEvent(
        {
          componentId: 'comp-1',
          date: '2024-07-15',
          recipient: 'Mio cugino',
        },
        'IN_STORAGE',
        existingCompIds
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects gifting an already terminal component', () => {
      const result = validateGiftEvent(
        { componentId: 'comp-1', date: '2024-07-15' },
        'SOLD',
        existingCompIds
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDisposalEvent', () => {
    it('approves a valid disposal method', () => {
      const result = validateDisposalEvent(
        {
          componentId: 'comp-1',
          date: '2024-08-01',
          disposalMethod: 'recycled',
        },
        'IN_STORAGE',
        existingCompIds
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects an invalid disposal method', () => {
      const result = validateDisposalEvent(
        {
          componentId: 'comp-1',
          date: '2024-08-01',
          // @ts-expect-error test invalid method
          disposalMethod: 'thrown_into_river',
        },
        'IN_STORAGE',
        existingCompIds
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.disposalMethod).toBeDefined();
    });
  });

  describe('Financial and Lifecycle impact of new movements', () => {
    const mockComponent: Component = {
      id: 'gpu-1',
      name: 'GeForce RTX 3070',
      brand: 'ASUS',
      model: 'Dual OC',
      category: 'gpu',
      createdAt: '2022-01-01T00:00:00.000Z',
      updatedAt: '2022-01-01T00:00:00.000Z',
    };

    const purchaseEv: PurchaseEvent = {
      id: 'ev-1',
      componentId: 'gpu-1',
      type: 'PURCHASE',
      date: '2022-01-01',
      price: 600,
      createdAt: '2022-01-01T00:00:00.000Z',
    };

    const installEv: InstallEvent = {
      id: 'ev-2',
      componentId: 'gpu-1',
      type: 'INSTALL',
      date: '2022-01-02',
      slotOrLocation: 'PCIe 1',
      createdAt: '2022-01-02T00:00:00.000Z',
    };

    it('accurately integrates extra expense in financial metrics', () => {
      const expenseEv: ExtraExpenseEvent = {
        id: 'ev-3',
        componentId: 'gpu-1',
        type: 'EXTRA_EXPENSE',
        date: '2022-02-15',
        amount: 50,
        description: 'Staffa metallica anti-sag',
        createdAt: '2022-02-15T00:00:00.000Z',
      };

      const events = [purchaseEv, installEv, expenseEv];
      expect(computeTotalPurchased(events)).toBe(650);
      expect(computeTotalRecovered(events)).toBe(0);
      expect(computeHistoricalNetCost(events)).toBe(650);
      expect(computeCurrentRigCost([mockComponent], events)).toBe(650);
    });

    it('accurately integrates sale net recovery and terminal state', () => {
      const saleEv: SaleEvent = {
        id: 'ev-4',
        componentId: 'gpu-1',
        type: 'SALE',
        date: '2023-01-01',
        price: 350,
        shippingCost: 10,
        fees: 15,
        createdAt: '2023-01-01T00:00:00.000Z',
      };

      const events: ComponentEvent[] = [purchaseEv, installEv, saleEv];

      // Net recovered = 350 - 10 - 15 = 325
      expect(computeTotalPurchased(events)).toBe(600);
      expect(computeTotalRecovered(events)).toBe(325);
      expect(computeHistoricalNetCost(events)).toBe(275);
      // Sold piece is no longer in current rig
      expect(computeCurrentRigCost([mockComponent], events)).toBe(0);

      const status = computeComponentStatus(events);
      expect(status).toBe('SOLD');
    });

    it('correctly shifts lifecycle status to GIFTED and DISPOSED', () => {
      const giftEv: GiftEvent = {
        id: 'ev-g',
        componentId: 'gpu-1',
        type: 'GIFT',
        date: '2023-05-01',
        recipient: 'Amico',
        createdAt: '2023-05-01T00:00:00.000Z',
      };
      expect(computeComponentStatus([purchaseEv, installEv, giftEv])).toBe('GIFTED');

      const dispEv: DisposalEvent = {
        id: 'ev-d',
        componentId: 'gpu-1',
        type: 'DISPOSAL',
        date: '2023-06-01',
        disposalMethod: 'recycled',
        createdAt: '2023-06-01T00:00:00.000Z',
      };
      expect(computeComponentStatus([purchaseEv, installEv, dispEv])).toBe('DISPOSED');
    });
  });
});
