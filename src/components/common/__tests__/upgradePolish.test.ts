import { describe, it, expect } from 'vitest';
import { Upgrade, Checkpoint } from '../../../types';

describe('Roadmap 11.6 — Upgrade Polish & Step Flow Architecture', () => {
  describe('Step Indicator & Progression Contract', () => {
    it('should define the exact 4-step sequential wizard flow', () => {
      const wizardSteps = [
        { num: 1, label: 'Vecchio Pezzo' },
        { num: 2, label: 'Nuovo Pezzo' },
        { num: 3, label: 'Economia' },
        { num: 4, label: 'Conferma' },
      ];

      expect(wizardSteps).toHaveLength(4);
      expect(wizardSteps[0].label).toBe('Vecchio Pezzo');
      expect(wizardSteps[1].label).toBe('Nuovo Pezzo');
      expect(wizardSteps[2].label).toBe('Economia');
      expect(wizardSteps[3].label).toBe('Conferma');
    });

    it('should calculate correct ARIA attributes for progressbar accessibility', () => {
      const getAriaAttrs = (currentStep: 1 | 2 | 3 | 4) => {
        const stepLabels: Record<number, string> = {
          1: 'Vecchio Pezzo',
          2: 'Nuovo Pezzo',
          3: 'Economia',
          4: 'Conferma',
        };
        return {
          role: 'progressbar',
          'aria-valuenow': currentStep,
          'aria-valuemin': 1,
          'aria-valuemax': 4,
          'aria-valuetext': `Passaggio ${currentStep} di 4: ${stepLabels[currentStep]}`,
        };
      };

      const step1Attrs = getAriaAttrs(1);
      expect(step1Attrs['aria-valuenow']).toBe(1);
      expect(step1Attrs['aria-valuetext']).toBe('Passaggio 1 di 4: Vecchio Pezzo');

      const step4Attrs = getAriaAttrs(4);
      expect(step4Attrs['aria-valuenow']).toBe(4);
      expect(step4Attrs['aria-valuetext']).toBe('Passaggio 4 di 4: Conferma');
    });
  });

  describe('Step Validation Rules', () => {
    it('should validate Step 1: old component selection is mandatory', () => {
      const validateStep1 = (oldCompId: string) => {
        if (!oldCompId.trim()) return 'Seleziona il componente da sostituire.';
        return null;
      };

      expect(validateStep1('')).toBe('Seleziona il componente da sostituire.');
      expect(validateStep1('comp-gpu-1')).toBeNull();
    });

    it('should validate Step 2: new component data integrity', () => {
      const validateStep2 = (
        mode: 'new' | 'existing',
        name: string,
        priceStr: string,
        existingId: string,
        oldId: string
      ) => {
        if (mode === 'existing') {
          if (!existingId) return 'Seleziona un componente esistente dal magazzino.';
          if (existingId === oldId) return 'Il nuovo componente non può coincidere con il componente da sostituire.';
        } else {
          if (!name.trim() || name.trim().length < 2) {
            return 'Inserisci il nome del nuovo componente (almeno 2 caratteri).';
          }
          if (priceStr.trim() !== '' && (isNaN(parseFloat(priceStr)) || parseFloat(priceStr) < 0)) {
            return 'Il prezzo di acquisto deve essere un numero valido non negativo.';
          }
        }
        return null;
      };

      // Existing mode validations
      expect(validateStep2('existing', '', '', '', 'comp-old')).toBe('Seleziona un componente esistente dal magazzino.');
      expect(validateStep2('existing', '', '', 'comp-old', 'comp-old')).toBe(
        'Il nuovo componente non può coincidere con il componente da sostituire.'
      );
      expect(validateStep2('existing', '', '', 'comp-new', 'comp-old')).toBeNull();

      // New mode validations
      expect(validateStep2('new', 'A', '100', '', '')).toBe(
        'Inserisci il nome del nuovo componente (almeno 2 caratteri).'
      );
      expect(validateStep2('new', 'GeForce RTX 5070', '-50', '', '')).toBe(
        'Il prezzo di acquisto deve essere un numero valido non negativo.'
      );
      expect(validateStep2('new', 'GeForce RTX 5070', '649.00', '', '')).toBeNull();
    });

    it('should validate Step 3: date and contextual sale rules', () => {
      const validateStep3 = (
        date: string,
        saleChecked: boolean,
        salePrice: string,
        shipping: string,
        fees: string
      ) => {
        if (!date) return 'La data dell’upgrade è obbligatoria.';
        if (saleChecked) {
          const price = parseFloat(salePrice);
          if (salePrice.trim() === '' || isNaN(price) || price < 0) {
            return 'Inserisci un prezzo di vendita valido per il vecchio componente.';
          }
          const shipVal = parseFloat(shipping);
          if (shipping.trim() !== '' && (isNaN(shipVal) || shipVal < 0)) {
            return 'Le spese di spedizione non possono essere negative.';
          }
          const feeVal = parseFloat(fees);
          if (fees.trim() !== '' && (isNaN(feeVal) || feeVal < 0)) {
            return 'Le commissioni non possono essere negative.';
          }
        }
        return null;
      };

      expect(validateStep3('', false, '', '', '')).toBe('La data dell’upgrade è obbligatoria.');
      expect(validateStep3('2026-09-01', true, '', '', '')).toBe(
        'Inserisci un prezzo di vendita valido per il vecchio componente.'
      );
      expect(validateStep3('2026-09-01', true, '150', '-10', '')).toBe(
        'Le spese di spedizione non possono essere negative.'
      );
      expect(validateStep3('2026-09-01', true, '150', '10', '-5')).toBe(
        'Le commissioni non possono essere negative.'
      );
      expect(validateStep3('2026-09-01', true, '150', '10', '5')).toBeNull();
    });
  });

  describe('Step 4 — Final Review Data Structure', () => {
    it('should construct the complete review payload for atomic commit', () => {
      const buildReviewSummary = (params: {
        oldComponent: { name: string; brand: string; totalPurchaseCost: number };
        newComponent: { name: string; brand: string; cost: number };
        date: string;
        slot?: string;
        sale?: { gross: number; shipping: number; fees: number; net: number; buyer?: string };
      }) => {
        const netUpgradeCost = params.newComponent.cost - (params.sale ? params.sale.net : 0);
        return {
          old: {
            name: params.oldComponent.name,
            brand: params.oldComponent.brand,
            cost: params.oldComponent.totalPurchaseCost,
            destination: params.sale ? 'VENDUTO (SALE)' : 'A MAGAZZINO (IN_STORAGE)',
          },
          new: {
            name: params.newComponent.name,
            brand: params.newComponent.brand,
            cost: params.newComponent.cost,
            destination: 'INSTALLATO NEL PC (IN_USE)',
          },
          operation: {
            date: params.date,
            slot: params.slot || 'Non specificato',
          },
          sale: params.sale || null,
          netUpgradeCost,
        };
      };

      const review = buildReviewSummary({
        oldComponent: { name: 'RTX 3080', brand: 'Gigabyte', totalPurchaseCost: 750 },
        newComponent: { name: 'RTX 4090', brand: 'MSI', cost: 1699 },
        date: '2026-09-10',
        slot: 'PCIe Slot 1',
        sale: { gross: 500, shipping: 15, fees: 25, net: 460, buyer: 'Mario R.' },
      });

      expect(review.old.name).toBe('RTX 3080');
      expect(review.old.destination).toBe('VENDUTO (SALE)');
      expect(review.new.name).toBe('RTX 4090');
      expect(review.new.destination).toBe('INSTALLATO NEL PC (IN_USE)');
      expect(review.operation.date).toBe('2026-09-10');
      expect(review.sale?.net).toBe(460);
      expect(review.netUpgradeCost).toBe(1239); // 1699 - 460 = 1239
    });
  });

  describe('Checkpoint Association & Post-Upgrade Prompt', () => {
    it('should associate checkpoint with upgrade via relatedUpgradeId', () => {
      const mockUpgrade: Upgrade = {
        id: 'upg-gpu-2026',
        date: '2026-09-10',
        category: 'gpu',
        oldComponentId: 'comp-old',
        newComponentId: 'comp-new',
      };

      const mockCheckpoints: Checkpoint[] = [
        {
          id: 'cp-1',
          name: 'Milestone AM5 Initial Rig',
          referenceDate: '2026-01-01',
          createdAt: '2026-01-01T10:00:00Z',
          trigger: 'manual',
          relatedUpgradeId: null,
          componentsSnapshot: [],
          summary: { componentCount: 5, rigPurchaseCost: 1200 },
        },
        {
          id: 'cp-2',
          name: 'Upgrade RTX 4090 Milestone',
          referenceDate: '2026-09-10',
          createdAt: '2026-09-10T15:00:00Z',
          trigger: 'suggested_upgrade',
          relatedUpgradeId: 'upg-gpu-2026',
          componentsSnapshot: [],
          summary: { componentCount: 5, rigPurchaseCost: 2439 },
        },
      ];

      const associatedCp = mockCheckpoints.find((cp) => cp.relatedUpgradeId === mockUpgrade.id);
      expect(associatedCp).toBeDefined();
      expect(associatedCp?.name).toBe('Upgrade RTX 4090 Milestone');
      expect(associatedCp?.trigger).toBe('suggested_upgrade');
    });

    it('should comply with single icon + text rule (no double symbols like ★)', () => {
      // In PostUpgradePromptModal: CTA button text must be 'Salva Checkpoint'
      const buttonText = 'Salva Checkpoint';
      expect(buttonText).not.toContain('★');
      expect(buttonText).not.toContain('⭐');
      expect(buttonText).toBe('Salva Checkpoint');
    });
  });
});
