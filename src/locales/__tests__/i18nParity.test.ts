import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import esLocale from '../es.json';
import frLocale from '../fr.json';
import { interpolate, formatCurrency, formatDate, detectSystemLocale } from '../i18nContext';

describe('i18n Quality Gate — Parità, Integrità e Formattazione', () => {
  const itKeys = Object.keys(itLocale).sort();
  const enKeys = Object.keys(enLocale).sort();
  const esKeys = Object.keys(esLocale).sort();
  const frKeys = Object.keys(frLocale).sort();

  it('1. garantisce la parità 1:1 delle chiavi tra tutti i dizionari (it, en, es, fr al 100%)', () => {
    // Tutte le chiavi in it.json devono esistere in en, es, fr
    for (const [code, dict, keys] of [
      ['en', enLocale, enKeys],
      ['es', esLocale, esKeys],
      ['fr', frLocale, frKeys],
    ] as const) {
      const missing = itKeys.filter((key) => !(key in dict));
      expect(missing, `Chiavi mancanti in ${code}.json: ${missing.join(', ')}`).toEqual([]);

      const extra = keys.filter((key) => !(key in itLocale));
      expect(extra, `Chiavi orfane in ${code}.json non presenti in it.json: ${extra.join(', ')}`).toEqual([]);

      expect(keys.length, `Conteggio chiavi diverso in ${code}.json`).toBe(itKeys.length);
    }
  });

  it('2. garantisce che nessuna traduzione sia una stringa vuota o contenga solo spazi bianchi', () => {
    const allDicts = [
      ['it', itLocale],
      ['en', enLocale],
      ['es', esLocale],
      ['fr', frLocale],
    ] as const;

    for (const [code, dict] of allDicts) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value).toBe('string');
        expect(value.trim().length, `Stringa vuota in ${code}.json per la chiave: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('3. verifica la rigorosa conservazione dei parametri dinamici di interpolazione {param}', () => {
    const extractTokens = (str: string) => {
      const matches = str.match(/\{(\w+)\}/g) || [];
      return matches.map((m) => m.slice(1, -1)).sort();
    };

    const targetDicts = [
      ['en', enLocale],
      ['es', esLocale],
      ['fr', frLocale],
    ] as const;

    for (const key of itKeys) {
      const itVal = (itLocale as Record<string, string>)[key];
      const itTokens = extractTokens(itVal);

      for (const [code, dict] of targetDicts) {
        const val = (dict as Record<string, string>)[key];
        const tokens = extractTokens(val);
        expect(
          tokens,
          `I token non coincidono per la chiave "${key}": IT ha [${itTokens}], ${code.toUpperCase()} ha [${tokens}]`
        ).toEqual(itTokens);
      }
    }
  });

  it('4. interpola correttamente i parametri dinamici con interpolate()', () => {
    expect(interpolate('Ciao {name}, hai {count} notifiche.', { name: 'Giuseppe', count: 3 })).toBe(
      'Ciao Giuseppe, hai 3 notifiche.'
    );

    expect(interpolate('{count} componenti', { count: 0 })).toBe('0 componenti');

    // Se il parametro manca, mantiene intatto il segnaposto per trasparenza
    expect(interpolate('Prezzo: {price} €', {})).toBe('Prezzo: {price} €');

    // Senza parametri ritorna il template
    expect(interpolate('Solo testo')).toBe('Solo testo');
  });

  it('5. formatta correttamente valute secondo il BCP-47 della lingua selezionata', () => {
    const formattedIt = formatCurrency(12500.5, 'it');
    expect(formattedIt).toContain('12.500,50');
    expect(formattedIt).toContain('€');

    const formattedEn = formatCurrency(12500.5, 'en');
    expect(formattedEn).toContain('12,500.50');
    expect(formattedEn).toContain('€');

    const formattedEs = formatCurrency(12500.5, 'es');
    expect(formattedEs).toContain('12.500,50');
    expect(formattedEs).toContain('€');

    const formattedFr = formatCurrency(12500.5, 'fr');
    expect(formattedFr).toContain('12');
    expect(formattedFr).toContain('500,50');
    expect(formattedFr).toContain('€');
  });

  it('6. formatta date storiche ISO preservando affidabilità locale', () => {
    expect(formatDate('2026-10-02', 'it')).toBe('02/10/2026');
    expect(formatDate('2026-10-02', 'en')).toBe('10/02/2026');
    expect(formatDate('2026-10-02', 'es')).toBe('02/10/2026');
    expect(formatDate('2026-10-02', 'fr')).toBe('02/10/2026');

    expect(formatDate('')).toBe('-');
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('7. detectSystemLocale rileva le lingue primarie e fallback internazionale', () => {
    const originalNavigator = globalThis.navigator;
    const mockNavigator = (language: string, languages?: string[]) =>
      Object.defineProperty(globalThis, 'navigator', {
        value: { language, languages: languages ?? [language] },
        configurable: true,
      });

    try {
      mockNavigator('it-IT');
      expect(detectSystemLocale()).toBe('it');

      mockNavigator('en-US');
      expect(detectSystemLocale()).toBe('en');

      mockNavigator('es-ES');
      expect(detectSystemLocale()).toBe('es');

      mockNavigator('fr-FR');
      expect(detectSystemLocale()).toBe('fr');

      // Lingua senza dizionario (tedesco, polacco) → fallback internazionale EN
      mockNavigator('de-DE');
      expect(detectSystemLocale()).toBe('en');
      mockNavigator('pl-PL');
      expect(detectSystemLocale()).toBe('en');

      // Scorre le preferenze in ordine: tedesco non supportato, poi spagnolo → ES
      mockNavigator('de-DE', ['de-DE', 'es-ES', 'it-IT']);
      expect(detectSystemLocale()).toBe('es');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });

  it('8. valida la presenza e integrità del glossario hardware blindato (glossary.json)', async () => {
    const glossary = await import('../glossary.json');
    expect(glossary.version).toBe('1.0.0');
    expect(glossary.description).toBeDefined();

    // Termini intoccabili non traducibili richiesti
    const requiredAcronyms = ['CPU', 'GPU', 'RAM', 'SSD', 'NVMe', 'PCIe', 'S.M.A.R.T.', 'TRIM', 'NVML'];
    for (const term of requiredAcronyms) {
      expect(glossary.hardware_acronyms[term as keyof typeof glossary.hardware_acronyms], `Termine mancante: ${term}`).toBeDefined();
      expect(glossary.hardware_acronyms[term as keyof typeof glossary.hardware_acronyms].translatable).toBe(false);
    }

    // Unità tecniche intoccabili
    const requiredUnits = ['W', 'GHz', 'MHz', 'MT/s', 'CL'];
    for (const unit of requiredUnits) {
      expect(glossary.technical_units[unit as keyof typeof glossary.technical_units], `Unità mancante: ${unit}`).toBeDefined();
      expect(glossary.technical_units[unit as keyof typeof glossary.technical_units].translatable).toBe(false);
    }
  });

  it('9. verifica il mapping obbligatorio dei termini Windows e System di sistema', async () => {
    const glossary = await import('../glossary.json');
    const requiredWindowsTerms = ['Thermal Throttling', 'Commit Charge', 'Pagefile', 'Idle', 'Working Set', 'Paging File'];

    for (const term of requiredWindowsTerms) {
      const entry = glossary.windows_system_terms[term as keyof typeof glossary.windows_system_terms];
      expect(entry, `Termine Windows mancante: ${term}`).toBeDefined();
      expect(entry.translatable).toBe(false);
      expect(entry.canonical).toBeDefined();
      expect(entry.definition.length).toBeGreaterThan(0);
    }
  });

  it('10. assicura che i termini protetti siano inclusi nella lista blindata protected_terms', async () => {
    const glossary = await import('../glossary.json');
    expect(Array.isArray(glossary.protected_terms)).toBe(true);

    const essentialTerms = ['CPU', 'GPU', 'RAM', 'SSD', 'NVMe', 'PCIe', 'S.M.A.R.T.', 'TRIM', 'NVML', 'W', 'GHz', 'Thermal Throttling', 'Commit Charge', 'Pagefile', 'Idle'];
    for (const term of essentialTerms) {
      expect(glossary.protected_terms).toContain(term);
    }
  });
});

