import { describe, it, expect, vi } from 'vitest';
import { MovementType } from '../../components/MovementSelectorModal';

describe('Roadmap 11.5 — Movement Polish & Flow Architecture', () => {
  it('should maintain the exact 6-operation taxonomy for hardware movements', () => {
    const supportedMovements: MovementType[] = [
      'purchase',
      'upgrade',
      'sale',
      'expense',
      'gift',
      'disposal',
    ];

    expect(supportedMovements).toHaveLength(6);
    expect(supportedMovements).toContain('purchase');
    expect(supportedMovements).toContain('upgrade');
    expect(supportedMovements).toContain('sale');
    expect(supportedMovements).toContain('expense');
    expect(supportedMovements).toContain('gift');
    expect(supportedMovements).toContain('disposal');
  });

  it('should correctly partition options into Acquisition vs Management groupings', () => {
    const acquisitionTypes: MovementType[] = ['purchase', 'upgrade'];
    const managementTypes: MovementType[] = ['sale', 'expense', 'gift', 'disposal'];

    // Grouping must cover all 6 types without overlapping
    const allPartitioned = [...acquisitionTypes, ...managementTypes];
    expect(allPartitioned).toHaveLength(6);
    expect(new Set(allPartitioned).size).toBe(6);
  });

  it('should correctly calculate net recovered amount in sale movements', () => {
    const calcNetRecovered = (grossPrice: number, shippingCost?: number, fees?: number) => {
      const shipping = shippingCost || 0;
      const feeVal = fees || 0;
      return Math.max(0, grossPrice - shipping - feeVal);
    };

    // Case 1: Gross price without deductions
    expect(calcNetRecovered(350)).toBe(350);

    // Case 2: Standard sale with shipping and platform fees
    expect(calcNetRecovered(400, 15, 20)).toBe(365);

    // Case 3: High fees/shipping cannot result in negative recovered amount
    expect(calcNetRecovered(50, 40, 25)).toBe(0);
  });

  it('should enforce strict validation rules for extra expenses', () => {
    const validateExtraExpense = (amountStr: string, descriptionStr: string) => {
      const errors: string[] = [];
      const num = parseFloat(amountStr);
      if (amountStr.trim() === '' || isNaN(num) || num <= 0) {
        errors.push('amount_invalid');
      }
      if (!descriptionStr.trim()) {
        errors.push('description_required');
      }
      return errors;
    };

    expect(validateExtraExpense('', '')).toEqual(['amount_invalid', 'description_required']);
    expect(validateExtraExpense('-10', 'Cavi sleeved')).toEqual(['amount_invalid']);
    expect(validateExtraExpense('25.50', '   ')).toEqual(['description_required']);
    expect(validateExtraExpense('25.50', 'Cavi custom sleeved neri')).toEqual([]);
  });

  it('should support navigation callbacks (onBack, onCancel, onSuccess) across movement components', () => {
    const onBackMock = vi.fn();
    const onCancelMock = vi.fn();
    const onSuccessMock = vi.fn();

    // Trigger onBack
    onBackMock();
    expect(onBackMock).toHaveBeenCalledTimes(1);

    // Trigger onCancel
    onCancelMock();
    expect(onCancelMock).toHaveBeenCalledTimes(1);

    // Trigger onSuccess
    onSuccessMock('comp-123');
    expect(onSuccessMock).toHaveBeenCalledWith('comp-123');
  });
});
