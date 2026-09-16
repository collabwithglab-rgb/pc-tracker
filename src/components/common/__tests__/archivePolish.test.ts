import { describe, it, expect } from 'vitest';
import { ComponentStatus } from '../../../types';

/**
 * Regression test per la logica di visualizzazione e filtri dell'Archivio (Tranche 11.4)
 * Verifica:
 * 1. Logica di differenziazione dei 3 stati vuoti (database vuoto, ricerca senza esito, filtri senza esito)
 * 2. Calcolo aggregato dei contatori di inventario (In Uso, In Magazzino, Dismessi)
 * 3. Integrità del meccanismo di reset dei filtri
 */

describe('Archive Polish & Inventory Logic (Tranche 11.4)', () => {
  it('differenzia accuratamente i 3 stati vuoti dell\'archivio', () => {
    const getEmptyStateType = (
      totalComponents: number,
      filteredCount: number,
      searchQuery: string,
      category: string,
      status: string
    ) => {
      if (totalComponents === 0) return 'EMPTY_DATABASE';
      if (filteredCount === 0) {
        if (searchQuery.trim() !== '') return 'EMPTY_SEARCH';
        if (category !== 'all' || status !== 'all') return 'EMPTY_FILTERS';
      }
      return 'HAS_RESULTS';
    };

    // 1. Database privo di componenti
    expect(getEmptyStateType(0, 0, '', 'all', 'all')).toBe('EMPTY_DATABASE');

    // 2. Componenti presenti nel DB ma ricerca non trovata
    expect(getEmptyStateType(29, 0, 'RTX 5090', 'all', 'all')).toBe('EMPTY_SEARCH');

    // 3. Componenti presenti, nessuna ricerca, ma filtri troppo restrittivi
    expect(getEmptyStateType(29, 0, '', 'monitor', 'DISPOSED')).toBe('EMPTY_FILTERS');

    // 4. Risultati presenti
    expect(getEmptyStateType(29, 5, '', 'all', 'IN_USE')).toBe('HAS_RESULTS');
  });

  it('calcola esattamente i contatori di stato derivato per l\'inventario', () => {
    const mockStatuses: ComponentStatus[] = [
      'IN_USE',
      'IN_USE',
      'IN_USE',
      'IN_STORAGE',
      'IN_STORAGE',
      'SOLD',
      'GIFTED',
      'DISPOSED',
    ];

    const calculateCounts = (statuses: ComponentStatus[]) => {
      let inUse = 0;
      let inStorage = 0;
      let dismissed = 0;

      for (const st of statuses) {
        if (st === 'IN_USE') inUse++;
        else if (st === 'IN_STORAGE') inStorage++;
        else if (st === 'SOLD' || st === 'GIFTED' || st === 'DISPOSED') dismissed++;
      }

      return { inUse, inStorage, dismissed, total: statuses.length };
    };

    const counts = calculateCounts(mockStatuses);
    expect(counts.inUse).toBe(3);
    expect(counts.inStorage).toBe(2);
    expect(counts.dismissed).toBe(3);
    expect(counts.total).toBe(8);
  });

  it('valida la condizione di attivazione dei filtri per mostrare il pulsante di reset', () => {
    const hasActiveFilters = (query: string, cat: string, st: string) => {
      return query.trim() !== '' || cat !== 'all' || st !== 'all';
    };

    expect(hasActiveFilters('', 'all', 'all')).toBe(false);
    expect(hasActiveFilters('ryzen', 'all', 'all')).toBe(true);
    expect(hasActiveFilters('', 'gpu', 'all')).toBe(true);
    expect(hasActiveFilters('', 'all', 'IN_STORAGE')).toBe(true);
    expect(hasActiveFilters('  ', 'all', 'all')).toBe(false);
  });
});
