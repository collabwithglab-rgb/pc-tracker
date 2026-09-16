import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent, Upgrade, Checkpoint } from '../../types';
import {
  validateCheckpointName,
  validateCheckpoint,
  isAnchorEventValid,
  isRelatedUpgradeValid,
  createCheckpointFromRig,
  sortCheckpointsChronologically,
  shouldSuggestCheckpoint,
  detectCheckpointDiscrepancy,
} from '../checkpointEngine';

describe('Checkpoint Engine (Tranche 10.1)', () => {
  // Fixture minime artificiali indipendenti da qualsiasi dataset specifico
  const sampleComponents: Component[] = [
    {
      id: 'comp-cpu',
      name: 'Test CPU 7800X3D',
      brand: 'AMD',
      model: '100-100000910WOF',
      category: 'cpu',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 'comp-gpu-1',
      name: 'Test GPU RTX 3080',
      brand: 'Nvidia',
      model: 'FE',
      category: 'gpu',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 'comp-gpu-2',
      name: 'Test GPU RTX 4090',
      brand: 'Gigabyte',
      model: 'Gaming OC',
      category: 'gpu',
      createdAt: '2024-06-01T10:00:00Z',
      updatedAt: '2024-06-01T10:00:00Z',
    },
  ];

  const sampleEvents: ComponentEvent[] = [
    {
      id: 'ev-cpu-buy',
      componentId: 'comp-cpu',
      type: 'PURCHASE',
      price: 380,
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'ev-cpu-inst',
      componentId: 'comp-cpu',
      type: 'INSTALL',
      slotOrLocation: 'Socket AM5',
      date: '2024-01-10',
      createdAt: '2024-01-10T11:00:00Z',
    },
    {
      id: 'ev-gpu1-buy',
      componentId: 'comp-gpu-1',
      type: 'PURCHASE',
      price: 700,
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'ev-gpu1-inst',
      componentId: 'comp-gpu-1',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-01-10',
      createdAt: '2024-01-10T11:30:00Z',
    },
    // Eventi intra-giornalieri del 2024-06-15: Sostituzione GPU
    {
      id: 'ev-gpu1-uninst',
      componentId: 'comp-gpu-1',
      type: 'UNINSTALL',
      reason: 'upgrade',
      date: '2024-06-15',
      createdAt: '2024-06-15T09:00:00Z',
    },
    {
      id: 'ev-gpu2-buy',
      componentId: 'comp-gpu-2',
      type: 'PURCHASE',
      price: 1800,
      date: '2024-06-15',
      createdAt: '2024-06-15T11:00:00Z',
    },
    {
      id: 'ev-gpu2-inst',
      componentId: 'comp-gpu-2',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-06-15',
      createdAt: '2024-06-15T14:00:00Z',
    },
    // Spesa accessoria per cavo 12VHPWR
    {
      id: 'ev-gpu2-extra',
      componentId: 'comp-gpu-2',
      type: 'EXTRA_EXPENSE',
      amount: 35,
      description: 'Cavo 12VHPWR angolato',
      date: '2024-06-15',
      createdAt: '2024-06-15T14:30:00Z',
    },
  ];

  const sampleUpgrade: Upgrade = {
    id: 'upg-1',
    category: 'gpu',
    date: '2024-06-15',
    oldComponentId: 'comp-gpu-1',
    newComponentId: 'comp-gpu-2',
    notes: 'Passaggio da RTX 3080 a RTX 4090',
  };

  describe('1. Validazione Nome Checkpoint', () => {
    it('rifiuta nomi vuoti o composti solo da spazi', () => {
      expect(validateCheckpointName('').isValid).toBe(false);
      expect(validateCheckpointName('   ').isValid).toBe(false);
      expect(validateCheckpointName(null).isValid).toBe(false);
      expect(validateCheckpointName(undefined).isValid).toBe(false);
    });

    it('rifiuta nomi troppo corti (< 2 caratteri)', () => {
      const res = validateCheckpointName('A');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('almeno 2 caratteri');
    });

    it('rifiuta nomi eccessivamente lunghi (> 100 caratteri)', () => {
      const longName = 'A'.repeat(101);
      const res = validateCheckpointName(longName);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('non può superare 100 caratteri');
    });

    it('accetta nomi validi tra 2 e 100 caratteri', () => {
      expect(validateCheckpointName('PC Setup 2024').isValid).toBe(true);
      expect(validateCheckpointName('Build Iniziale AM5').isValid).toBe(true);
    });
  });

  describe('2. Validazione Struttura Checkpoint & Date', () => {
    it('rifiuta date non valide o non ISO (es. 2024-02-31 o stringhe generiche)', () => {
      const base: Partial<Checkpoint> = {
        name: 'Test Valido',
        referenceDate: '2024-02-31', // calendario gregoriano non valido
        trigger: 'manual',
        componentsSnapshot: [],
        summary: { componentCount: 0, rigPurchaseCost: 0 },
      };

      const res = validateCheckpoint(base);
      expect(res.isValid).toBe(false);
      expect(res.errors.referenceDate).toBeDefined();
    });

    it('rifiuta trigger non consentito', () => {
      const base: Partial<Checkpoint> = {
        name: 'Test Valido',
        referenceDate: '2024-01-15',
        trigger: 'invalid_trigger' as any,
        componentsSnapshot: [],
        summary: { componentCount: 0, rigPurchaseCost: 0 },
      };

      const res = validateCheckpoint(base);
      expect(res.isValid).toBe(false);
      expect(res.errors.trigger).toBeDefined();
    });

    it('rifiuta summary o snapshot malformati', () => {
      const base: Partial<Checkpoint> = {
        name: 'Test Valido',
        referenceDate: '2024-01-15',
        trigger: 'manual',
        componentsSnapshot: 'not-an-array' as any,
        summary: { componentCount: -1, rigPurchaseCost: -50 },
      };

      const res = validateCheckpoint(base);
      expect(res.isValid).toBe(false);
      expect(res.errors.componentsSnapshot).toBeDefined();
      expect(res.errors['summary.componentCount']).toBeDefined();
      expect(res.errors['summary.rigPurchaseCost']).toBeDefined();
    });

    it('accetta un checkpoint formalmente valido', () => {
      const valid: Partial<Checkpoint> = {
        name: 'Build Iniziale',
        referenceDate: '2024-01-15',
        trigger: 'manual',
        componentsSnapshot: [
          {
            componentId: 'c-1',
            name: 'Ryzen 7',
            brand: 'AMD',
            model: '7800X3D',
            category: 'cpu',
            purchasePrice: 380,
          },
        ],
        summary: { componentCount: 1, rigPurchaseCost: 380 },
      };

      const res = validateCheckpoint(valid);
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });
  });

  describe('3. Validazione Anchor Event & Related Upgrade', () => {
    it('accetta anchorEventId null o undefined', () => {
      expect(isAnchorEventValid(null, sampleEvents).isValid).toBe(true);
      expect(isAnchorEventValid(undefined, sampleEvents).isValid).toBe(true);
    });

    it('rifiuta anchorEventId non esistente', () => {
      const res = isAnchorEventValid('ev-inesistente', sampleEvents);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('non esiste nella cronologia');
    });

    it('rifiuta anchorEventId con data discorde rispetto alla referenceDate del checkpoint', () => {
      const res = isAnchorEventValid('ev-gpu1-buy', sampleEvents, '2024-06-15');
      // ev-gpu1-buy ha data 2024-01-10
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('data diversa rispetto alla data di riferimento');
    });

    it('accetta anchorEventId coerente con la data di riferimento', () => {
      const res = isAnchorEventValid('ev-gpu2-inst', sampleEvents, '2024-06-15');
      expect(res.isValid).toBe(true);
    });

    it('valida correttamente l’esistenza di relatedUpgradeId', () => {
      expect(isRelatedUpgradeValid(null, [sampleUpgrade]).isValid).toBe(true);
      expect(isRelatedUpgradeValid('upg-1', [sampleUpgrade]).isValid).toBe(true);
      expect(isRelatedUpgradeValid('upg-999', [sampleUpgrade]).isValid).toBe(false);
    });
  });

  describe('4. Creazione Snapshot da Rig Montato', () => {
    it('crea snapshot corretto congelando i campi essenziali e calcolando i costi comprensivi di extra', () => {
      const installed = [sampleComponents[0], sampleComponents[2]]; // CPU + GPU 2
      const cp = createCheckpointFromRig({
        name: 'Rig dopo Upgrade RTX 4090',
        referenceDate: '2024-06-15',
        trigger: 'suggested_upgrade',
        relatedUpgradeId: 'upg-1',
        anchorEventId: 'ev-gpu2-extra',
        installedComponents: installed,
        events: sampleEvents,
      });

      expect(cp.name).toBe('Rig dopo Upgrade RTX 4090');
      expect(cp.referenceDate).toBe('2024-06-15');
      expect(cp.trigger).toBe('suggested_upgrade');
      expect(cp.relatedUpgradeId).toBe('upg-1');
      expect(cp.anchorEventId).toBe('ev-gpu2-extra');
      expect(cp.componentsSnapshot).toHaveLength(2);

      // Verifica CPU
      const cpuEntry = cp.componentsSnapshot.find((e) => e.componentId === 'comp-cpu');
      expect(cpuEntry).toBeDefined();
      expect(cpuEntry?.name).toBe('Test CPU 7800X3D');
      expect(cpuEntry?.slotOrLocation).toBe('Socket AM5');
      expect(cpuEntry?.purchasePrice).toBe(380);

      // Verifica GPU 2: prezzo d'acquisto 1800 + 35 extra expense = 1835
      const gpuEntry = cp.componentsSnapshot.find((e) => e.componentId === 'comp-gpu-2');
      expect(gpuEntry).toBeDefined();
      expect(gpuEntry?.name).toBe('Test GPU RTX 4090');
      expect(gpuEntry?.slotOrLocation).toBe('PCIe 1');
      expect(gpuEntry?.purchasePrice).toBe(1835);

      // Verifica summary
      expect(cp.summary.componentCount).toBe(2);
      expect(cp.summary.rigPurchaseCost).toBe(2215); // 380 + 1835
      expect(cp.summary.categoryCounts?.cpu).toBe(1);
      expect(cp.summary.categoryCounts?.gpu).toBe(1);
    });

    it('gestisce configurazioni vuote (0 componenti)', () => {
      const cp = createCheckpointFromRig({
        name: 'Case Svuotato',
        referenceDate: '2024-07-01',
        installedComponents: [],
        events: sampleEvents,
      });

      expect(cp.componentsSnapshot).toHaveLength(0);
      expect(cp.summary.componentCount).toBe(0);
      expect(cp.summary.rigPurchaseCost).toBe(0);
    });
  });

  describe('5. Ordinamento Cronologico Deterministico & Risoluzione Infra-giornaliera', () => {
    it('gestisce liste vuote (0 checkpoint) o con 1 solo elemento senza errori', () => {
      expect(sortCheckpointsChronologically([])).toEqual([]);
      const single: Checkpoint[] = [
        {
          id: 'cp-1',
          name: 'Primo',
          referenceDate: '2024-01-01',
          createdAt: '2024-01-01T10:00:00Z',
          trigger: 'manual',
          componentsSnapshot: [],
          summary: { componentCount: 0, rigPurchaseCost: 0 },
        },
      ];
      expect(sortCheckpointsChronologically(single)).toHaveLength(1);
    });

    it('ordina per data crescente tra giorni differenti', () => {
      const list: Checkpoint[] = [
        {
          id: 'cp-b',
          name: 'Giugno 2024',
          referenceDate: '2024-06-15',
          createdAt: '2024-06-15T12:00:00Z',
          trigger: 'manual',
          componentsSnapshot: [],
          summary: { componentCount: 0, rigPurchaseCost: 0 },
        },
        {
          id: 'cp-a',
          name: 'Gennaio 2024',
          referenceDate: '2024-01-10',
          createdAt: '2024-01-10T12:00:00Z',
          trigger: 'manual',
          componentsSnapshot: [],
          summary: { componentCount: 0, rigPurchaseCost: 0 },
        },
      ];

      const sorted = sortCheckpointsChronologically(list);
      expect(sorted[0].id).toBe('cp-a');
      expect(sorted[1].id).toBe('cp-b');
    });

    it('risolve univocamente checkpoint multipli nella stessa data grazie ad anchorEventId', () => {
      // Nel sampleEvents del 2024-06-15:
      // 1. ev-gpu1-uninst (09:00:00Z)
      // 2. ev-gpu2-buy    (11:00:00Z)
      // 3. ev-gpu2-inst   (14:00:00Z)
      // Creiamo due checkpoint: uno dopo lo smontaggio della vecchia GPU (tra 1 e 2), uno dopo l'installazione della nuova GPU (dopo 3)
      const cpAfterTeardown: Checkpoint = {
        id: 'cp-teardown',
        name: 'Dopo Smontaggio Vecchia GPU',
        referenceDate: '2024-06-15',
        createdAt: '2024-06-15T15:00:00Z', // createdAt successivo non deve ingannare l'ordine logico
        anchorEventId: 'ev-gpu1-uninst',
        trigger: 'manual',
        componentsSnapshot: [],
        summary: { componentCount: 1, rigPurchaseCost: 380 },
      };

      const cpAfterInstall: Checkpoint = {
        id: 'cp-installed',
        name: 'Dopo Installazione Nuova GPU',
        referenceDate: '2024-06-15',
        createdAt: '2024-06-15T10:00:00Z',
        anchorEventId: 'ev-gpu2-inst',
        trigger: 'suggested_upgrade',
        componentsSnapshot: [],
        summary: { componentCount: 2, rigPurchaseCost: 2180 },
      };

      // Se passati nell'ordine inverso, l'ordinamento deve posizionare cp-teardown prima di cp-installed
      const sorted = sortCheckpointsChronologically([cpAfterInstall, cpAfterTeardown], sampleEvents);
      expect(sorted[0].id).toBe('cp-teardown');
      expect(sorted[1].id).toBe('cp-installed');
    });

    it('usa createdAt come fallback per checkpoint nella stessa data senza anchorEventId', () => {
      const cpEarly: Checkpoint = {
        id: 'cp-1',
        name: 'Mattina',
        referenceDate: '2024-05-01',
        createdAt: '2024-05-01T08:00:00Z',
        trigger: 'manual',
        componentsSnapshot: [],
        summary: { componentCount: 0, rigPurchaseCost: 0 },
      };

      const cpLate: Checkpoint = {
        id: 'cp-2',
        name: 'Sera',
        referenceDate: '2024-05-01',
        createdAt: '2024-05-01T20:00:00Z',
        trigger: 'manual',
        componentsSnapshot: [],
        summary: { componentCount: 0, rigPurchaseCost: 0 },
      };

      const sorted = sortCheckpointsChronologically([cpLate, cpEarly]);
      expect(sorted[0].id).toBe('cp-1');
      expect(sorted[1].id).toBe('cp-2');
    });
  });

  describe('6. Suggerimento Automatico Creazione Checkpoint', () => {
    it('suggerisce checkpoint dopo un Upgrade', () => {
      const res = shouldSuggestCheckpoint({ upgrade: sampleUpgrade });
      expect(res.shouldSuggest).toBe(true);
      expect(res.reason).toBe('upgrade');
    });

    it('suggerisce checkpoint dopo l’installazione di una scheda madre o CPU', () => {
      const resMotherboard = shouldSuggestCheckpoint({
        event: { id: 'e-1', componentId: 'c-mb', type: 'INSTALL', date: '2024-01-01', createdAt: '' },
        component: { id: 'c-mb', name: 'B650', brand: 'MSI', model: 'Tomahawk', category: 'motherboard', createdAt: '', updatedAt: '' },
      });
      expect(resMotherboard.shouldSuggest).toBe(true);
      expect(resMotherboard.reason).toBe('major_change');

      const resCpu = shouldSuggestCheckpoint({
        event: { id: 'e-2', componentId: 'c-cpu', type: 'INSTALL', date: '2024-01-01', createdAt: '' },
        component: { id: 'c-cpu', name: 'Ryzen 7', brand: 'AMD', model: '7800X3D', category: 'cpu', createdAt: '', updatedAt: '' },
      });
      expect(resCpu.shouldSuggest).toBe(true);
      expect(resCpu.reason).toBe('major_change');
    });

    it('non suggerisce checkpoint per componenti secondari o non-install', () => {
      const resRam = shouldSuggestCheckpoint({
        event: { id: 'e-3', componentId: 'c-ram', type: 'PURCHASE', date: '2024-01-01', createdAt: '', price: 100 },
        component: { id: 'c-ram', name: 'RAM', brand: 'Corsair', model: '32GB', category: 'ram', createdAt: '', updatedAt: '' },
      });
      expect(resRam.shouldSuggest).toBe(false);
    });
  });

  describe('7. Discrepanze Informative tra Checkpoint e Ricostruzione', () => {
    it('rileva se la configurazione ricostruita dagli eventi attuali differisce dallo snapshot congelato senza alterare il checkpoint', () => {
      // Checkpoint con CPU + GPU 1
      const cp: Checkpoint = {
        id: 'cp-initial',
        name: 'Setup Iniziale',
        referenceDate: '2024-01-15',
        createdAt: '2024-01-15T12:00:00Z',
        trigger: 'manual',
        componentsSnapshot: [
          {
            componentId: 'comp-cpu',
            name: 'Test CPU 7800X3D',
            brand: 'AMD',
            model: '100-100000910WOF',
            category: 'cpu',
            purchasePrice: 380,
          },
          {
            componentId: 'comp-gpu-1',
            name: 'Test GPU RTX 3080',
            brand: 'Nvidia',
            model: 'FE',
            category: 'gpu',
            purchasePrice: 700,
          },
        ],
        summary: {
          componentCount: 2,
          rigPurchaseCost: 1080,
        },
      };

      // Supponiamo che nel database attuale la GPU 1 sia stata retroattivamente rimossa o sostituita:
      // la configurazione ricostruita ha solo la CPU
      const reconstructedRig: Component[] = [sampleComponents[0]];

      const discrepancy = detectCheckpointDiscrepancy(cp, reconstructedRig, sampleEvents);

      expect(discrepancy.hasDiscrepancies).toBe(true);
      expect(discrepancy.missingInReconstruction).toHaveLength(1);
      expect(discrepancy.missingInReconstruction[0].componentId).toBe('comp-gpu-1');
      expect(discrepancy.addedInReconstruction).toHaveLength(0);
      // Costo ricostruito (380) - Costo salvato nel checkpoint (1080) = -700
      expect(discrepancy.costDifference).toBe(-700);

      // Verifica fondamentale: il checkpoint non è stato mutato
      expect(cp.componentsSnapshot).toHaveLength(2);
      expect(cp.summary.rigPurchaseCost).toBe(1080);
    });

    it('rileva discrepanze nulle quando snapshot e ricostruzione coincidono perfettamente', () => {
      const cp: Checkpoint = {
        id: 'cp-cpu-only',
        name: 'CPU Only',
        referenceDate: '2024-01-15',
        createdAt: '2024-01-15T12:00:00Z',
        trigger: 'manual',
        componentsSnapshot: [
          {
            componentId: 'comp-cpu',
            name: 'Test CPU 7800X3D',
            brand: 'AMD',
            model: '100-100000910WOF',
            category: 'cpu',
            purchasePrice: 380,
          },
        ],
        summary: {
          componentCount: 1,
          rigPurchaseCost: 380,
        },
      };

      const reconstructedRig: Component[] = [sampleComponents[0]];
      const discrepancy = detectCheckpointDiscrepancy(cp, reconstructedRig, sampleEvents);

      expect(discrepancy.hasDiscrepancies).toBe(false);
      expect(discrepancy.missingInReconstruction).toHaveLength(0);
      expect(discrepancy.addedInReconstruction).toHaveLength(0);
      expect(discrepancy.costDifference).toBe(0);
    });
  });
});
