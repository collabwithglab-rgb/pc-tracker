import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import { interpolate, formatCurrency, formatDate, detectSystemLocale } from '../i18nContext';

describe('i18n Quality Gate — Parità, Integrità e Formattazione', () => {
  const itKeys = Object.keys(itLocale).sort();
  const enKeys = Object.keys(enLocale).sort();

  it('1. garantisce la parità 1:1 delle chiavi tra it.json e en.json (100% completezza)', () => {
    // Tutte le chiavi in it.json devono esistere in en.json
    const missingInEn = itKeys.filter((key) => !(key in enLocale));
    expect(missingInEn, `Chiavi mancanti in en.json: ${missingInEn.join(', ')}`).toEqual([]);

    // Nessuna chiave orfana in en.json che non esiste in it.json
    const extraInEn = enKeys.filter((key) => !(key in itLocale));
    expect(extraInEn, `Chiavi orfane in en.json non presenti in it.json: ${extraInEn.join(', ')}`).toEqual([]);

    // Conteggio identico
    expect(enKeys.length).toBe(itKeys.length);
  });

  it('2. garantisce che nessuna traduzione sia una stringa vuota o contenga solo spazi bianchi', () => {
    for (const [key, value] of Object.entries(itLocale)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `Stringa vuota in it.json per la chiave: ${key}`).toBeGreaterThan(0);
    }

    for (const [key, value] of Object.entries(enLocale)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `Stringa vuota in en.json per la chiave: ${key}`).toBeGreaterThan(0);
    }
  });

  it('3. verifica la rigorosa conservazione dei parametri dinamici di interpolazione {param}', () => {
    const extractTokens = (str: string) => {
      const matches = str.match(/\{(\w+)\}/g) || [];
      return matches.map((m) => m.slice(1, -1)).sort();
    };

    for (const key of itKeys) {
      const itVal = (itLocale as Record<string, string>)[key];
      const enVal = (enLocale as Record<string, string>)[key];

      const itTokens = extractTokens(itVal);
      const enTokens = extractTokens(enVal);

      expect(
        enTokens,
        `I token di interpolazione non coincidono per la chiave "${key}": IT ha [${itTokens}], EN ha [${enTokens}]`
      ).toEqual(itTokens);
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
  });

  it('6. formatta date storiche ISO preservando affidabilità locale', () => {
    expect(formatDate('2026-10-02', 'it')).toBe('02/10/2026');
    expect(formatDate('2026-10-02', 'en')).toBe('10/02/2026');

    expect(formatDate('')).toBe('-');
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('7. detectSystemLocale rileva le lingue primarie e fallback internazionale', () => {
    const originalNavigator = globalThis.navigator;

    try {
      // Mock IT
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'it-IT' },
        configurable: true,
      });
      expect(detectSystemLocale()).toBe('it');

      // Mock EN
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'en-US' },
        configurable: true,
      });
      expect(detectSystemLocale()).toBe('en');

      // Mock DE
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'de-DE' },
        configurable: true,
      });
      expect(detectSystemLocale()).toBe('de');

      // Mock Lingua non direttamente supportata (fallback su EN)
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'pl-PL' },
        configurable: true,
      });
      expect(detectSystemLocale()).toBe('en');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });
});
