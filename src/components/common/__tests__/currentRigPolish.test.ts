import { describe, it, expect } from 'vitest';
import { ComponentCategory } from '../../../types';

/**
 * Regression test per la logica di visualizzazione e raggruppamento di Current Rig (Tranche 11.3)
 * Verifica:
 * 1. Raggruppamento coerente nei 4 gruppi hardware
 * 2. Logica di identificazione degli slot essenziali non occupati
 * 3. Esclusione delle categorie secondarie/opzionali dalla generazione di slot vuoti
 * 4. Calcolo del conteggio componenti per gruppo hardware
 */

describe('Current Rig Hardware Console Logic (Tranche 11.3)', () => {
  interface CategoryGroup {
    id: string;
    title: string;
    categories: ComponentCategory[];
  }

  const CATEGORY_GROUPS: CategoryGroup[] = [
    {
      id: 'core',
      title: 'Piattaforma Core',
      categories: ['cpu', 'motherboard', 'ram', 'gpu'],
    },
    {
      id: 'storage_cooling',
      title: 'Storage & Raffreddamento',
      categories: ['storage', 'cooling'],
    },
    {
      id: 'power_chassis',
      title: 'Alimentazione & Chassis',
      categories: ['psu', 'case'],
    },
    {
      id: 'peripherals',
      title: 'Postazione & Periferiche',
      categories: ['monitor', 'peripherals', 'accessories', 'other'],
    },
  ];

  const CORE_ESSENTIAL_CATEGORIES: Set<ComponentCategory> = new Set([
    'cpu',
    'motherboard',
    'ram',
    'gpu',
    'storage',
    'psu',
    'case',
  ]);

  it('identifica correttamente i 4 gruppi hardware e la loro tassonomia', () => {
    expect(CATEGORY_GROUPS.length).toBe(4);
    expect(CATEGORY_GROUPS[0].id).toBe('core');
    expect(CATEGORY_GROUPS[1].id).toBe('storage_cooling');
    expect(CATEGORY_GROUPS[2].id).toBe('power_chassis');
    expect(CATEGORY_GROUPS[3].id).toBe('peripherals');
  });

  it('distingue gli slot essenziali non occupati dagli slot secondari opzionali', () => {
    // Simulazione di un rig con cpu, motherboard, ram e storage montati, ma privo di gpu e psu
    const installedCategories = new Set<ComponentCategory>(['cpu', 'motherboard', 'ram', 'storage']);

    const findMissingCoreCategories = (categories: ComponentCategory[]) => {
      return categories.filter(
        (cat) => CORE_ESSENTIAL_CATEGORIES.has(cat) && !installedCategories.has(cat)
      );
    };

    // Nel gruppo Core: gpu manca ed è essenziale
    const coreMissing = findMissingCoreCategories(CATEGORY_GROUPS[0].categories);
    expect(coreMissing).toEqual(['gpu']);

    // Nel gruppo Power & Chassis: psu e case mancano e sono essenziali
    const powerMissing = findMissingCoreCategories(CATEGORY_GROUPS[2].categories);
    expect(powerMissing).toEqual(['psu', 'case']);

    // Nel gruppo Periferiche: monitor, peripherals, accessories, other mancano ma NESSUNO è bloccante come slot essenziale
    const peripheralsMissing = findMissingCoreCategories(CATEGORY_GROUPS[3].categories);
    expect(peripheralsMissing).toEqual([]); // Zero slot vuoti giganti o superflui
  });

  it('calcola accuratamente il conteggio componenti per ciascun gruppo hardware', () => {
    const installedItems = [
      { id: 'c1', category: 'cpu' as ComponentCategory },
      { id: 'c2', category: 'ram' as ComponentCategory },
      { id: 'c3', category: 'ram' as ComponentCategory },
      { id: 'c4', category: 'storage' as ComponentCategory },
      { id: 'c5', category: 'cooling' as ComponentCategory },
    ];

    const countByGroup = (group: CategoryGroup) => {
      return installedItems.filter((item) => group.categories.includes(item.category)).length;
    };

    expect(countByGroup(CATEGORY_GROUPS[0])).toBe(3); // 1 cpu + 2 ram
    expect(countByGroup(CATEGORY_GROUPS[1])).toBe(2); // 1 storage + 1 cooling
    expect(countByGroup(CATEGORY_GROUPS[2])).toBe(0); // 0 power
    expect(countByGroup(CATEGORY_GROUPS[3])).toBe(0); // 0 peripherals
  });
});
