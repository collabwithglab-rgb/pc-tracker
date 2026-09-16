import { describe, it, expect } from 'vitest';
import { Component, ComponentEvent, Checkpoint } from '../../types';
import {
  createCheckpointFromCurrentRig,
  createCheckpointFromTemporalPosition,
  updateCheckpointMetadata,
  detectCheckpointDiscrepancy,
  getConfigurationAtPosition,
  getRigSummaryAtPosition,
  getTimelineBounds,
  getTimelineEvents,
} from '../index';

describe('Time Travel UI & Checkpoint Domain Integration (Tranche 10.4)', () => {
  const compCpu: Component = {
    id: 'c-cpu',
    name: 'AMD Ryzen 7 7800X3D',
    brand: 'AMD',
    model: '100-100000910WOF',
    category: 'cpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuOld: Component = {
    id: 'c-gpu-old',
    name: 'Nvidia RTX 3080',
    brand: 'Nvidia',
    model: 'FE 10GB',
    category: 'gpu',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const compGpuNew: Component = {
    id: 'c-gpu-new',
    name: 'Nvidia RTX 4090',
    brand: 'Gigabyte',
    model: 'Gaming OC 24GB',
    category: 'gpu',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  };

  const sampleEvents: ComponentEvent[] = [
    {
      id: 'ev-cpu-buy',
      componentId: 'c-cpu',
      type: 'PURCHASE',
      price: 380,
      date: '2024-01-10',
      createdAt: '2024-01-10T09:00:00Z',
    },
    {
      id: 'ev-cpu-inst',
      componentId: 'c-cpu',
      type: 'INSTALL',
      slotOrLocation: 'Socket AM5',
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'ev-gpu-old-buy',
      componentId: 'c-gpu-old',
      type: 'PURCHASE',
      price: 700,
      date: '2024-01-15',
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: 'ev-gpu-old-inst',
      componentId: 'c-gpu-old',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-01-15',
      createdAt: '2024-01-15T11:00:00Z',
    },
    // Giornata con eventi multipli
    {
      id: 'ev-gpu-old-uninst',
      componentId: 'c-gpu-old',
      type: 'UNINSTALL',
      reason: 'upgrade',
      date: '2024-06-15',
      createdAt: '2024-06-15T09:00:00Z',
    },
    {
      id: 'ev-gpu-new-buy',
      componentId: 'c-gpu-new',
      type: 'PURCHASE',
      price: 1800,
      date: '2024-06-15',
      createdAt: '2024-06-15T10:00:00Z',
    },
    {
      id: 'ev-gpu-new-inst',
      componentId: 'c-gpu-new',
      type: 'INSTALL',
      slotOrLocation: 'PCIe 1',
      date: '2024-06-15',
      createdAt: '2024-06-15T14:00:00Z',
    },
  ];

  describe('1. Creazione Checkpoint da Current Rig (Domain Delegate)', () => {
    it('costruisce il Checkpoint corrente delegando al domain layer senza assunzioni UI', () => {
      const cp = createCheckpointFromCurrentRig({
        name: 'Build Attuale con RTX 4090',
        components: [compCpu, compGpuOld, compGpuNew],
        events: sampleEvents,
      });

      expect(cp.name).toBe('Build Attuale con RTX 4090');
      expect(cp.summary.componentCount).toBe(2); // CPU + GPU nuova
      expect(cp.summary.rigPurchaseCost).toBe(2180); // 380 + 1800
      expect(cp.componentsSnapshot.map((c) => c.componentId).sort()).toEqual(['c-cpu', 'c-gpu-new'].sort());
    });

    it('gestisce creazione da Current Rig con 0 componenti montati (rig vuoto)', () => {
      const cpEmpty = createCheckpointFromCurrentRig({
        name: 'Macchina Vergine',
        components: [],
        events: [],
      });

      expect(cpEmpty.summary.componentCount).toBe(0);
      expect(cpEmpty.summary.rigPurchaseCost).toBe(0);
      expect(cpEmpty.componentsSnapshot).toHaveLength(0);
    });
  });

  describe('2. Creazione Checkpoint da Time Travel (Temporal Position)', () => {
    it('cattura esattamente la posizione storica intermedia visualizzata', () => {
      // Navighiamo al 2024-06-15 dopo lo smontaggio della vecchia GPU ma prima dell’installazione della nuova
      const position = {
        date: '2024-06-15',
        anchorEventId: 'ev-gpu-old-uninst',
        boundary: 'after_event' as const,
      };

      const installed = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        sampleEvents,
        position
      );
      expect(installed.map((c) => c.id)).toEqual(['c-cpu']); // solo CPU montata!

      const cp = createCheckpointFromTemporalPosition({
        name: 'Work In Progress: GPU Smontata',
        position,
        installedComponents: installed,
        events: sampleEvents,
      });

      expect(cp.referenceDate).toBe('2024-06-15');
      expect(cp.anchorEventId).toBe('ev-gpu-old-uninst');
      expect(cp.summary.componentCount).toBe(1);
      expect(cp.summary.rigPurchaseCost).toBe(380);
      expect(cp.componentsSnapshot[0].componentId).toBe('c-cpu');
    });
  });

  describe('3. Modifica Metadati e Immutabilità dello Snapshot Checkpoint', () => {
    it('aggiorna nome e note preservando rigorosamente lo snapshot e i costi congelati', () => {
      const initialCp: Checkpoint = createCheckpointFromCurrentRig({
        name: 'Nome Originale',
        notes: 'Vecchia nota',
        components: [compCpu],
        events: sampleEvents,
      });

      const updated = updateCheckpointMetadata(initialCp, {
        name: 'Nuovo Nome Milestone',
        notes: 'Nota aggiornata con dettagli',
      });

      expect(updated.name).toBe('Nuovo Nome Milestone');
      expect(updated.notes).toBe('Nota aggiornata con dettagli');
      // Snapshot immutabile
      expect(updated.componentsSnapshot).toBe(initialCp.componentsSnapshot);
      expect(updated.summary).toBe(initialCp.summary);
      expect(updated.referenceDate).toBe(initialCp.referenceDate);
      expect(updated.anchorEventId).toBe(initialCp.anchorEventId);
    });

    it('rifiuta nomi non validi (< 2 caratteri o > 100)', () => {
      const initialCp: Checkpoint = createCheckpointFromCurrentRig({
        name: 'Nome Valido',
        components: [compCpu],
        events: sampleEvents,
      });

      expect(() => updateCheckpointMetadata(initialCp, { name: ' ' })).toThrow(/non può essere vuoto/);
      expect(() => updateCheckpointMetadata(initialCp, { name: 'A' })).toThrow(/almeno 2 caratteri/);
    });
  });

  describe('4. Navigazione Temporale & Date Estreme / Vuote', () => {
    it('gestisce dataset vuoto (0 componenti, 0 eventi, 0 checkpoint)', () => {
      const bounds = getTimelineBounds([]);
      expect(bounds.minDate).toBeNull();
      expect(bounds.maxDate).toBeNull();

      const eventsList = getTimelineEvents([]);
      expect(eventsList).toHaveLength(0);

      const rig = getConfigurationAtPosition([], [], { date: '2024-01-01', boundary: 'end_of_day' });
      expect(rig).toHaveLength(0);

      const summary = getRigSummaryAtPosition([], [], { date: '2024-01-01', boundary: 'end_of_day' });
      expect(summary.componentCount).toBe(0);
      expect(summary.rigPurchaseCost).toBe(0);
    });

    it('naviga accuratamente tra start_of_day, after_event, before_event ed end_of_day', () => {
      const targetDate = '2024-06-15';

      // 1. Inizio giornata
      const configStart = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        sampleEvents,
        { date: targetDate, boundary: 'start_of_day' }
      );
      expect(configStart.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-old'].sort());

      // 2. Subito prima dell’installazione della nuova GPU
      const configBeforeInst = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        sampleEvents,
        { date: targetDate, anchorEventId: 'ev-gpu-new-inst', boundary: 'before_event' }
      );
      expect(configBeforeInst.map((c) => c.id)).toEqual(['c-cpu']);

      // 3. Subito dopo l'installazione della nuova GPU
      const configAfterInst = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        sampleEvents,
        { date: targetDate, anchorEventId: 'ev-gpu-new-inst', boundary: 'after_event' }
      );
      expect(configAfterInst.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-new'].sort());

      // 4. Fine giornata
      const configEnd = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        sampleEvents,
        { date: targetDate, boundary: 'end_of_day' }
      );
      expect(configEnd.map((c) => c.id).sort()).toEqual(['c-cpu', 'c-gpu-new'].sort());
    });
  });

  describe('5. Rilevazione Discrepanze Checkpoint vs Ricostruzione', () => {
    it('rileva discrepanze economiche e componenti quando gli eventi cambiano retroattivamente', () => {
      const cp: Checkpoint = createCheckpointFromCurrentRig({
        name: 'Checkpoint Pre-Modifica',
        components: [compCpu, compGpuNew],
        events: sampleEvents,
        referenceDate: '2024-06-15',
      });

      // Simuliamo che un evento di acquisto storico venga retroattivamente ribassato da 1800 a 1600
      const alteredEvents = sampleEvents.map((e) =>
        e.id === 'ev-gpu-new-buy' ? { ...e, price: 1600 } : e
      );

      const reconstructed = getConfigurationAtPosition(
        [compCpu, compGpuOld, compGpuNew],
        alteredEvents,
        { date: '2024-06-15', boundary: 'end_of_day' }
      );

      const discrepancy = detectCheckpointDiscrepancy(cp, reconstructed, alteredEvents);

      // Componenti identici, ma delta costo di -200€
      expect(discrepancy.hasDiscrepancies).toBe(false);
      expect(discrepancy.costDifference).toBe(-200);

      // Il checkpoint originale resta inviolato
      expect(cp.summary.rigPurchaseCost).toBe(2180);
    });
  });
});
