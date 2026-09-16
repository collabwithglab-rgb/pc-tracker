import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component } from '../../types';

// In-memory mock per gli Object Store IndexedDB (senza librerie esterne)
const inMemoryStores = new Map<string, Map<string, unknown>>();
function getStore(name: string): Map<string, unknown> {
  if (!inMemoryStores.has(name)) {
    inMemoryStores.set(name, new Map());
  }
  return inMemoryStores.get(name)!;
}

vi.mock('../indexedDB', () => ({
  STORES: {
    COMPONENTS: 'components',
    EVENTS: 'events',
    UPGRADES: 'upgrades',
    METADATA: 'metadata',
  },
  getAllFromStore: vi.fn(async (storeName: string) => Array.from(getStore(storeName).values())),
  getByIdFromStore: vi.fn(async (storeName: string, id: string) => getStore(storeName).get(id)),
  putItem: vi.fn(async (storeName: string, item: any) => {
    const key = storeName === 'metadata' ? item.key : item.id;
    getStore(storeName).set(key, item);
  }),
  putItems: vi.fn(async (storeName: string, items: any[]) => {
    for (const item of items) {
      const key = storeName === 'metadata' ? item.key : item.id;
      getStore(storeName).set(key, item);
    }
  }),
  deleteItemFromStore: vi.fn(async (storeName: string, id: string) => {
    getStore(storeName).delete(id);
  }),
  clearStore: vi.fn(async (storeName: string) => {
    getStore(storeName).clear();
  }),
  replaceAllDataAtomic: vi.fn(async (params: any) => {
    getStore('components').clear();
    getStore('events').clear();
    getStore('upgrades').clear();
    getStore('metadata').clear();
    for (const c of params.components) getStore('components').set(c.id, c);
    for (const e of params.events) getStore('events').set(e.id, e);
    for (const u of params.upgrades) getStore('upgrades').set(u.id, u);
    for (const m of params.metadataItems) getStore('metadata').set(m.key, m);
  }),
  resetDatabaseAtomic: vi.fn(async () => {
    getStore('components').clear();
    getStore('events').clear();
    getStore('upgrades').clear();
    getStore('metadata').clear();
    getStore('metadata').set('initialized', { key: 'initialized', value: true });
  }),
  saveComponentWithEventsAtomic: vi.fn(async (params: any) => {
    getStore('components').set(params.component.id, params.component);
    if (params.events) {
      for (const ev of params.events) {
        getStore('events').set(ev.id, ev);
      }
    }
  }),
}));

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  saveSettings,
  resetSettings,
  loadFullDatabase,
  resetDatabase,
  saveComponent,
  exportDatabaseToJSON,
  importDatabaseFromJSON,
} from '../storageService';
import { formatDate } from '../../utils';

describe('Settings Storage & Normalization Engine (Tranche 1 & 2)', () => {
  beforeEach(async () => {
    inMemoryStores.clear();
    await resetDatabase();
  });

  it('1. fornisce i valori di default corretti e completi', () => {
    expect(DEFAULT_SETTINGS.rigName).toBe('');
    expect(DEFAULT_SETTINGS.rigDescription).toBe('');
    expect(DEFAULT_SETTINGS.buildYear).toBeUndefined();
    expect(DEFAULT_SETTINGS.currencySymbol).toBe('€');
    expect(DEFAULT_SETTINGS.dateFormat).toBe('DD/MM/YYYY');
    expect(DEFAULT_SETTINGS.uiDensity).toBe('comfortable');
    expect(DEFAULT_SETTINGS.reducedMotion).toBe('system');
    expect(DEFAULT_SETTINGS.accentColor).toBe('cyan');
    expect(DEFAULT_SETTINGS.environmentTheme).toBe('obsidian');
    expect(DEFAULT_SETTINGS.typographyPreset).toBe('default');
    expect(DEFAULT_SETTINGS.defaultStartSection).toBe('dashboard');
    expect(DEFAULT_SETTINGS.dashboardRecentCount).toBe(7);
    expect(DEFAULT_SETTINGS.showRigSynthesis).toBe(true);
    expect(DEFAULT_SETTINGS.archiveDefaultSort).toBe('purchase_date_desc');
    expect(DEFAULT_SETTINGS.archiveDefaultView).toBe('cards');
    expect(DEFAULT_SETTINGS.confirmEventDeletion).toBe(true);
    expect(DEFAULT_SETTINGS.autoCloseMovementModal).toBe(true);
  });

  it('2. esegue il merge con payload legacy garantendo retrocompatibilità', () => {
    const legacyPayload = {
      currencySymbol: '€',
      dateFormat: 'DD/MM/YYYY',
    };

    const normalized = normalizeSettings(legacyPayload);

    expect(normalized.currencySymbol).toBe('€');
    expect(normalized.dateFormat).toBe('DD/MM/YYYY');
    expect(normalized.rigName).toBe('');
    expect(normalized.rigDescription).toBe('');
    expect(normalized.uiDensity).toBe('comfortable');
    expect(normalized.accentColor).toBe('cyan');
    expect(normalized.environmentTheme).toBe('obsidian');
    expect(normalized.typographyPreset).toBe('default');
    expect(normalized.dashboardRecentCount).toBe(7);
    expect(normalized.showRigSynthesis).toBe(true);
  });

  it('3. gestisce payload nulli, indefiniti o corrotti con fallback sicuro sui default', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('invalid string')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(12345)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('4. valida e normalizza i campi di identità del setup (rigName, rigDescription, buildYear)', () => {
    const valid = normalizeSettings({
      rigName: '  Workstation Pro 2024  ',
      rigDescription: '  Editing e Gaming  ',
      buildYear: 2023,
    });

    expect(valid.rigName).toBe('Workstation Pro 2024');
    expect(valid.rigDescription).toBe('Editing e Gaming');
    expect(valid.buildYear).toBe(2023);

    // Anno non valido o fuori range (es. 1800 o NaN)
    const invalidYear = normalizeSettings({
      buildYear: 1800,
    });
    expect(invalidYear.buildYear).toBeUndefined();

    const nanYear = normalizeSettings({
      buildYear: ('not a number' as unknown) as number,
    });
    expect(nanYear.buildYear).toBeUndefined();
  });

  it('5. persiste le impostazioni in IndexedDB e le ricarica correttamente con loadFullDatabase', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      rigName: 'Monolith Alpha',
      rigDescription: 'Postazione Principale',
      buildYear: 2024,
    });

    const db = await loadFullDatabase();
    expect(db.settings.rigName).toBe('Monolith Alpha');
    expect(db.settings.rigDescription).toBe('Postazione Principale');
    expect(db.settings.buildYear).toBe(2024);
  });

  it('6. esegue il reset esclusivo di AppSettings senza intaccare i dati hardware o gli eventi', async () => {
    // 1. Inserisci un componente hardware nel database
    const dummyComp: Component = {
      id: 'test-comp-1',
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      model: '7800X3D',
      category: 'cpu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveComponent(dummyComp);

    // 2. Personalizza le impostazioni
    await saveSettings({
      ...DEFAULT_SETTINGS,
      rigName: 'Custom Name',
      rigDescription: 'Custom Desc',
      buildYear: 2022,
    });

    let db = await loadFullDatabase();
    expect(db.components.length).toBe(1);
    expect(db.settings.rigName).toBe('Custom Name');

    // 3. Esegui resetSettings (Ripristina Impostazioni Predefinite)
    const resetResult = await resetSettings();
    expect(resetResult.rigName).toBe('');

    // 4. Verifica che le impostazioni siano tornate ai default MA il componente sia intatto
    db = await loadFullDatabase();
    expect(db.settings.rigName).toBe('');
    expect(db.settings.rigDescription).toBe('');
    expect(db.settings.buildYear).toBeUndefined();
    expect(db.components.length).toBe(1);
    expect(db.components[0].name).toBe('AMD Ryzen 7 7800X3D');
  });

  it('7. include le impostazioni nei backup JSON e le ripristina fedelmente', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      rigName: 'Backup Rig Test',
      rigDescription: 'Test Backup Description',
      buildYear: 2021,
    });

    const exportedJSON = await exportDatabaseToJSON();
    expect(exportedJSON).toContain('Backup Rig Test');
    expect(exportedJSON).toContain('Test Backup Description');

    // Modifica le impostazioni locali
    await saveSettings({
      ...DEFAULT_SETTINGS,
      rigName: 'Altro Nome',
    });

    // Ripristina dal JSON esportato in precedenza
    const importResult = await importDatabaseFromJSON(exportedJSON);
    expect(importResult.isValid).toBe(true);

    const db = await loadFullDatabase();
    expect(db.settings.rigName).toBe('Backup Rig Test');
    expect(db.settings.rigDescription).toBe('Test Backup Description');
    expect(db.settings.buildYear).toBe(2021);
  });

  it('8. formatta correttamente le date con formatDate sia in DD/MM/YYYY che in YYYY-MM-DD', () => {
    // Standard ISO string (YYYY-MM-DD)
    expect(formatDate('2024-10-24', 'DD/MM/YYYY')).toBe('24/10/2024');
    expect(formatDate('2024-10-24', 'YYYY-MM-DD')).toBe('2024-10-24');

    // ISO timestamp con orario
    expect(formatDate('2024-05-12T14:30:00.000Z', 'DD/MM/YYYY')).toBe('12/05/2024');
    expect(formatDate('2024-05-12T14:30:00.000Z', 'YYYY-MM-DD')).toBe('2024-05-12');

    // Casi limite
    expect(formatDate('')).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('9. valida, normalizza e persiste la preferenza uiDensity', async () => {
    expect(normalizeSettings({ uiDensity: 'compact' }).uiDensity).toBe('compact');
    expect(normalizeSettings({ uiDensity: 'comfortable' }).uiDensity).toBe('comfortable');
    expect(normalizeSettings({ uiDensity: 'invalid' as any }).uiDensity).toBe('comfortable');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      uiDensity: 'compact',
    });

    const db = await loadFullDatabase();
    expect(db.settings.uiDensity).toBe('compact');
  });

  it('10. valida, normalizza e persiste la preferenza reducedMotion', async () => {
    expect(normalizeSettings({ reducedMotion: 'always' }).reducedMotion).toBe('always');
    expect(normalizeSettings({ reducedMotion: 'never' }).reducedMotion).toBe('never');
    expect(normalizeSettings({ reducedMotion: 'system' }).reducedMotion).toBe('system');
    expect(normalizeSettings({ reducedMotion: 'invalid' as any }).reducedMotion).toBe('system');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      reducedMotion: 'always',
    });

    const db = await loadFullDatabase();
    expect(db.settings.reducedMotion).toBe('always');
  });

  it('11. valida, normalizza e persiste la preferenza dateFormat', async () => {
    expect(normalizeSettings({ dateFormat: 'YYYY-MM-DD' }).dateFormat).toBe('YYYY-MM-DD');
    expect(normalizeSettings({ dateFormat: 'DD/MM/YYYY' }).dateFormat).toBe('DD/MM/YYYY');
    expect(normalizeSettings({ dateFormat: 'invalid' as any }).dateFormat).toBe('DD/MM/YYYY');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      dateFormat: 'YYYY-MM-DD',
    });

    const db = await loadFullDatabase();
    expect(db.settings.dateFormat).toBe('YYYY-MM-DD');
  });

  it('12. valida, normalizza e persiste la preferenza accentColor per tutte le 6 palette curate con fallback solido', async () => {
    // Tutte le 6 palette curate valide
    expect(normalizeSettings({ accentColor: 'cyan' }).accentColor).toBe('cyan');
    expect(normalizeSettings({ accentColor: 'arctic' }).accentColor).toBe('arctic');
    expect(normalizeSettings({ accentColor: 'violet' }).accentColor).toBe('violet');
    expect(normalizeSettings({ accentColor: 'emerald' }).accentColor).toBe('emerald');
    expect(normalizeSettings({ accentColor: 'amber' }).accentColor).toBe('amber');
    expect(normalizeSettings({ accentColor: 'crimson' }).accentColor).toBe('crimson');

    // Valori invalidi o sconosciuti -> fallback su 'cyan' (Default)
    expect(normalizeSettings({ accentColor: 'neon-yellow' as any }).accentColor).toBe('cyan');
    expect(normalizeSettings({ accentColor: 12345 as any }).accentColor).toBe('cyan');
    expect(normalizeSettings({ accentColor: null as any }).accentColor).toBe('cyan');

    // Persistenza in IndexedDB
    await saveSettings({
      ...DEFAULT_SETTINGS,
      accentColor: 'violet',
    });

    let db = await loadFullDatabase();
    expect(db.settings.accentColor).toBe('violet');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      accentColor: 'emerald',
    });

    db = await loadFullDatabase();
    expect(db.settings.accentColor).toBe('emerald');
  });

  it('13. valida, normalizza e persiste la preferenza typographyPreset per tutti i 3 preset con fallback solido', async () => {
    // Tutti i 3 preset validi
    expect(normalizeSettings({ typographyPreset: 'default' }).typographyPreset).toBe('default');
    expect(normalizeSettings({ typographyPreset: 'minimal' }).typographyPreset).toBe('minimal');
    expect(normalizeSettings({ typographyPreset: 'system' }).typographyPreset).toBe('system');

    // Valori non ammessi (es. font scaricati da internet arbitrari) -> fallback su 'default'
    expect(normalizeSettings({ typographyPreset: 'comic-sans' as any }).typographyPreset).toBe('default');
    expect(normalizeSettings({ typographyPreset: 'roboto-mono' as any }).typographyPreset).toBe('default');
    expect(normalizeSettings({ typographyPreset: undefined }).typographyPreset).toBe('default');

    // Persistenza in IndexedDB
    await saveSettings({
      ...DEFAULT_SETTINGS,
      typographyPreset: 'minimal',
    });

    let db = await loadFullDatabase();
    expect(db.settings.typographyPreset).toBe('minimal');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      typographyPreset: 'system',
    });

    db = await loadFullDatabase();
    expect(db.settings.typographyPreset).toBe('system');
  });

  it('14. include accentColor e typographyPreset nei backup JSON e li ripristina fedelmente', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      rigName: 'Personal Rig Studio',
      accentColor: 'crimson',
      typographyPreset: 'system',
    });

    const exportedJSON = await exportDatabaseToJSON();
    expect(exportedJSON).toContain('"accentColor": "crimson"');
    expect(exportedJSON).toContain('"typographyPreset": "system"');

    // Sovrascrivi impostazioni locali
    await saveSettings({
      ...DEFAULT_SETTINGS,
      accentColor: 'cyan',
      typographyPreset: 'default',
    });

    // Ripristina da JSON
    const importResult = await importDatabaseFromJSON(exportedJSON);
    expect(importResult.isValid).toBe(true);

    const db = await loadFullDatabase();
    expect(db.settings.accentColor).toBe('crimson');
    expect(db.settings.typographyPreset).toBe('system');
  });

  it('15. il reset esclusivo delle impostazioni ripristina accentColor a cyan e typographyPreset a default', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      accentColor: 'amber',
      typographyPreset: 'minimal',
    });

    let db = await loadFullDatabase();
    expect(db.settings.accentColor).toBe('amber');
    expect(db.settings.typographyPreset).toBe('minimal');

    const resetResult = await resetSettings();
    expect(resetResult.accentColor).toBe('cyan');
    expect(resetResult.typographyPreset).toBe('default');

    db = await loadFullDatabase();
    expect(db.settings.accentColor).toBe('cyan');
    expect(db.settings.typographyPreset).toBe('default');
  });

  it('16. valida, normalizza e persiste la preferenza environmentTheme con supporto ai 5 preset e fallback solido', async () => {
    // 1. Tutti i 5 preset ambientali validi
    expect(normalizeSettings({ environmentTheme: 'obsidian' }).environmentTheme).toBe('obsidian');
    expect(normalizeSettings({ environmentTheme: 'graphite' }).environmentTheme).toBe('graphite');
    expect(normalizeSettings({ environmentTheme: 'slate' }).environmentTheme).toBe('slate');
    expect(normalizeSettings({ environmentTheme: 'midnight' }).environmentTheme).toBe('midnight');
    expect(normalizeSettings({ environmentTheme: 'carbon' }).environmentTheme).toBe('carbon');

    // 2. Valori non ammessi (es. light, neon, colori liberi) -> fallback su 'obsidian'
    expect(normalizeSettings({ environmentTheme: 'light' as any }).environmentTheme).toBe('obsidian');
    expect(normalizeSettings({ environmentTheme: '#ffffff' as any }).environmentTheme).toBe('obsidian');
    expect(normalizeSettings({ environmentTheme: undefined }).environmentTheme).toBe('obsidian');

    // 3. Persistenza in IndexedDB
    await saveSettings({
      ...DEFAULT_SETTINGS,
      environmentTheme: 'midnight',
    });

    let db = await loadFullDatabase();
    expect(db.settings.environmentTheme).toBe('midnight');

    // 4. Backup e Restore JSON
    const exported = await exportDatabaseToJSON();
    expect(exported).toContain('"environmentTheme": "midnight"');

    await saveSettings({
      ...DEFAULT_SETTINGS,
      environmentTheme: 'obsidian',
    });

    await importDatabaseFromJSON(exported);
    db = await loadFullDatabase();
    expect(db.settings.environmentTheme).toBe('midnight');

    // 5. Reset impostazioni predefinite
    const resetRes = await resetSettings();
    expect(resetRes.environmentTheme).toBe('obsidian');
    db = await loadFullDatabase();
    expect(db.settings.environmentTheme).toBe('obsidian');
  });
});
