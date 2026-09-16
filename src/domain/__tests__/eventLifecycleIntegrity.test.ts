import { describe, it, expect } from 'vitest';
import {
  validateLifecycleSequence,
  canDeleteEvent,
  canUpdateEvent,
} from '../validators';
import { ComponentEvent } from '../../types';

describe('Event Lifecycle Sequence and Deletion Integrity', () => {
  const purchaseEv: ComponentEvent = {
    id: 'ev-purch-1',
    componentId: 'comp-1',
    type: 'PURCHASE',
    date: '2024-01-01',
    price: 300,
    createdAt: '2024-01-01T10:00:00Z',
  };

  const installEv: ComponentEvent = {
    id: 'ev-inst-1',
    componentId: 'comp-1',
    type: 'INSTALL',
    date: '2024-01-05',
    slotOrLocation: 'PCIe 1',
    createdAt: '2024-01-05T10:00:00Z',
  };

  const uninstallEv: ComponentEvent = {
    id: 'ev-uninst-1',
    componentId: 'comp-1',
    type: 'UNINSTALL',
    date: '2024-06-01',
    reason: 'upgrade',
    createdAt: '2024-06-01T10:00:00Z',
  };

  const saleEv: ComponentEvent = {
    id: 'ev-sale-1',
    componentId: 'comp-1',
    type: 'SALE',
    date: '2024-06-15',
    price: 220,
    createdAt: '2024-06-15T10:00:00Z',
  };

  const extraExpenseEv: ComponentEvent = {
    id: 'ev-extra-1',
    componentId: 'comp-1',
    type: 'EXTRA_EXPENSE',
    date: '2024-02-01',
    amount: 15,
    description: 'Pad termici custom',
    createdAt: '2024-02-01T10:00:00Z',
  };

  it('validates a correct, standard hardware lifecycle', () => {
    const sequence = [purchaseEv, installEv, extraExpenseEv, uninstallEv, saleEv];
    const result = validateLifecycleSequence(sequence);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('detects two consecutive INSTALLs without an UNINSTALL in between', () => {
    const install2: ComponentEvent = {
      id: 'ev-inst-2',
      componentId: 'comp-1',
      type: 'INSTALL',
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
    };
    const invalidSequence = [purchaseEv, installEv, install2];
    const result = validateLifecycleSequence(invalidSequence);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('risulta già montato');
  });

  it('detects an UNINSTALL when the component is not mounted', () => {
    const invalidSequence = [purchaseEv, uninstallEv];
    const result = validateLifecycleSequence(invalidSequence);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('non risulta montato');
  });

  it('detects any event occurring after a terminal state (SALE)', () => {
    const postSaleInstall: ComponentEvent = {
      id: 'ev-inst-post',
      componentId: 'comp-1',
      type: 'INSTALL',
      date: '2024-07-01',
      createdAt: '2024-07-01T10:00:00Z',
    };
    const invalidSequence = [purchaseEv, installEv, uninstallEv, saleEv, postSaleInstall];
    const result = validateLifecycleSequence(invalidSequence);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('non può avvenire dopo che il componente è stato dismesso');
  });

  describe('canDeleteEvent', () => {
    it('allows deleting an independent EXTRA_EXPENSE', () => {
      const sequence = [purchaseEv, installEv, extraExpenseEv, uninstallEv];
      const check = canDeleteEvent(extraExpenseEv.id, sequence);
      expect(check.canDelete).toBe(true);
    });

    it('allows deleting the latest terminal SALE event (reverting to storage)', () => {
      const sequence = [purchaseEv, installEv, uninstallEv, saleEv];
      const check = canDeleteEvent(saleEv.id, sequence);
      expect(check.canDelete).toBe(true);
    });

    it('PREVENTS deleting an INSTALL when an UNINSTALL depends on it', () => {
      const sequence = [purchaseEv, installEv, uninstallEv];
      const check = canDeleteEvent(installEv.id, sequence);
      expect(check.canDelete).toBe(false);
      expect(check.error).toContain('non risulta montato');
    });

    it('PREVENTS deleting an UNINSTALL when a subsequent INSTALL exists', () => {
      const install2: ComponentEvent = {
        id: 'ev-inst-2',
        componentId: 'comp-1',
        type: 'INSTALL',
        date: '2024-08-01',
        createdAt: '2024-08-01T10:00:00Z',
      };
      const sequence = [purchaseEv, installEv, uninstallEv, install2];
      const check = canDeleteEvent(uninstallEv.id, sequence);
      expect(check.canDelete).toBe(false);
      expect(check.error).toContain('risulta già montato');
    });

    it('allows deleting the last INSTALL when component is IN_USE (rolling back mount)', () => {
      const sequence = [purchaseEv, installEv];
      const check = canDeleteEvent(installEv.id, sequence);
      expect(check.canDelete).toBe(true);
    });
  });

  describe('canUpdateEvent', () => {
    it('allows updating non-critical fields such as price, store, notes', () => {
      const sequence = [purchaseEv, installEv, uninstallEv];
      const updatedPurchase = { ...purchaseEv, price: 350, notes: 'Prezzo corretto' };
      const check = canUpdateEvent(updatedPurchase, sequence);
      expect(check.canUpdate).toBe(true);
    });

    it('rejects an update that moves UNINSTALL before INSTALL date', () => {
      const sequence = [purchaseEv, installEv, uninstallEv];
      const brokenUninstall = { ...uninstallEv, date: '2024-01-02' }; // Prima di installEv (2024-01-05)
      const check = canUpdateEvent(brokenUninstall, sequence);
      expect(check.canUpdate).toBe(false);
      expect(check.error).toContain('non risulta montato');
    });
  });
});
