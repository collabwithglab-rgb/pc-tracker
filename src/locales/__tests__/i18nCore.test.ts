import { describe, it, expect, afterEach } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import esLocale from '../es.json';
import frLocale from '../fr.json';
import {
  LOCALE_REGISTRY,
  SUPPORTED_LOCALES,
  MASTER_LOCALE,
  resolveFallbackChain,
  resolveContentLocale,
  isSupportedLocale,
  getBcp47,
} from '../registry';
import { translate, withTemporaryDictionary, TranslationKey } from '../translator';
import { formatDate, formatCurrency } from '../format';
import { AVAILABLE_LOCALES } from '../i18nContext';
import { getWikiCategories, getAllWikiArticles } from '../../domain/wikiEngine';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from '../../constants/wikiData';
import { WIKI_ARTICLES_EN, WIKI_CATEGORIES_EN } from '../../constants/wikiDataEn';

const IT = itLocale as Record<string, string>;
const EN = enLocale as Record<string, string>;
const ES = esLocale as Record<string, string>;
const FR = frLocale as Record<string, string>;

describe('i18n Core â€” Registro, Fallback, Plurali, Date e Contenuti', () => {
  describe('1. Registro lingue (unica fonte di veritÃ )', () => {
    it('ogni lingua registrata ha BCP-47, nome nativo e descrizione nel selettore', () => {
      expect(SUPPORTED_LOCALES).toEqual(Object.keys(LOCALE_REGISTRY));
      for (const code of SUPPORTED_LOCALES) {
        const def = LOCALE_REGISTRY[code];
        expect(def.code).toBe(code);
        expect(def.bcp47).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
        expect(def.nativeName.trim().length).toBeGreaterThan(0);
        // Il selettore delle Impostazioni costruisce questa chiave dinamicamente
        expect(IT[`settings_language_${code}_desc`]).toBeTruthy();
        expect(EN[`settings_language_${code}_desc`]).toBeTruthy();
      }
    });

    it('il selettore UI deriva dal registro, senza liste duplicate', () => {
      expect(AVAILABLE_LOCALES.map((l) => l.code)).toEqual(SUPPORTED_LOCALES);
    });

    it('non accetta lingue senza dizionario reale', () => {
      expect(isSupportedLocale('it')).toBe(true);
      expect(isSupportedLocale('en')).toBe(true);
      expect(isSupportedLocale('es')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(true);
      for (const phantom of ['de', 'zh', 'ja', 'pt', 'ru', '', null, 42]) {
        expect(isSupportedLocale(phantom)).toBe(false);
      }
    });

    it('la catena di fallback termina sempre con la lingua master senza duplicati', () => {
      expect(resolveFallbackChain('it')).toEqual(['it']);
      expect(resolveFallbackChain('en')).toEqual(['en', 'it']);
      for (const code of SUPPORTED_LOCALES) {
        const chain = resolveFallbackChain(code);
        expect(chain[0]).toBe(code);
        expect(chain[chain.length - 1]).toBe(MASTER_LOCALE);
        expect(new Set(chain).size).toBe(chain.length);
      }
    });

    it('rispetta i fallback intermedi dichiarati (meccanismo usato da future lingue, es. de â†’ en â†’ it)', () => {
      // Simulazione: una lingua parziale che dichiara EN come fallback intermedio.
      // Usiamo 'it' come "lingua parziale" perchÃ© Ã¨ l'unico codice che possiamo svuotare
      // senza toccare EN: la catena diventa it â†’ en (il master deduplicato).
      const original = LOCALE_REGISTRY.it.fallback;
      LOCALE_REGISTRY.it.fallback = ['en'];
      try {
        expect(resolveFallbackChain('it')).toEqual(['it', 'en']);
        withTemporaryDictionary('it', { nav_dashboard: 'Cruscotto' }, () => {
          expect(translate('it', 'nav_dashboard')).toBe('Cruscotto'); // lingua propria
          expect(translate('it', 'action_close')).toBe(EN.action_close); // intermedio EN, non la chiave
        });
      } finally {
        LOCALE_REGISTRY.it.fallback = original;
      }
    });

    it('resolveContentLocale sceglie il primo contenuto compatibile con la catena', () => {
      expect(resolveContentLocale('en', ['it', 'en'])).toBe('en');
      expect(resolveContentLocale('en', ['it'])).toBe('it');
      expect(resolveContentLocale('it', ['en'])).toBe('it'); // master come ultima risorsa
    });
  });

  describe('2. Traduttore puro con fallback a cascata', () => {
    it('una traduzione parziale ricade sulla lingua successiva della catena, mai sulla chiave', () => {
      const partialEn = { nav_dashboard: 'Dashboard EN' };
      withTemporaryDictionary('en', partialEn, () => {
        expect(translate('en', 'nav_dashboard')).toBe('Dashboard EN');
        // Chiave non tradotta in EN â†’ testo italiano dal master
        expect(translate('en', 'action_close')).toBe(IT.action_close);
      });
    });

    it('una chiave sconosciuta restituisce la chiave stessa (zero crash)', () => {
      expect(translate('en', 'chiave_inesistente_xyz' as TranslationKey)).toBe('chiave_inesistente_xyz');
    });

    it('interpola i parametri anche nel testo di fallback', () => {
      withTemporaryDictionary('en', {}, () => {
        expect(translate('en', 'count_components', { count: 3 })).toBe('3 componenti');
      });
    });
  });

  describe('3. Pluralizzazione CLDR (Intl.PluralRules)', () => {
    it('ogni variante _one ha la chiave base, entrambe con {count}, in tutte le lingue', () => {
      const oneKeys = Object.keys(IT).filter((k) => k.endsWith('_one'));
      expect(oneKeys.length).toBeGreaterThan(10);
      for (const oneKey of oneKeys) {
        const base = oneKey.slice(0, -'_one'.length);
        for (const dict of [IT, EN, ES, FR]) {
          expect(dict[base], `Chiave base mancante per ${oneKey}`).toBeTruthy();
          expect(dict[oneKey]).toContain('{count}');
          expect(dict[base]).toContain('{count}');
        }
      }
    });

    it('seleziona singolare e plurale secondo le regole della lingua', () => {
      expect(translate('it', 'count_components', { count: 1 })).toBe('1 componente');
      expect(translate('it', 'count_components', { count: 0 })).toBe('0 componenti');
      expect(translate('it', 'count_components', { count: 5 })).toBe('5 componenti');
      expect(translate('en', 'count_components', { count: 1 })).toBe('1 component');
      expect(translate('en', 'count_components', { count: 0 })).toBe('0 components');
      expect(translate('en', 'pulse_storage', { count: 1 })).toBe(EN.pulse_storage_one.replace('{count}', '1'));
      expect(translate('en', 'pulse_storage', { count: 4 })).toBe(EN.pulse_storage.replace('{count}', '4'));
    });

    it('le vecchie coppie _singular/_plural sono state migrate', () => {
      const legacy = Object.keys(IT).filter((k) => /_(singular|plural)$/.test(k));
      expect(legacy).toEqual([]);
    });
  });

  describe('4. Date indipendenti dal fuso orario', () => {
    const originalTz = process.env.TZ;
    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it('una data di calendario resta identica a ovest di UTC (bug off-by-one)', () => {
      process.env.TZ = 'America/Los_Angeles';
      // Dimostra che il fuso Ã¨ attivo: il parsing nativo slitta al giorno prima
      expect(new Date('2026-10-02').getDate()).toBe(1);
      expect(formatDate('2026-10-02', 'it')).toBe('02/10/2026');
      expect(formatDate('2026-10-02', 'en')).toBe('10/02/2026');
      expect(formatDate('2026-01-01', 'it')).toBe('01/01/2026');
    });

    it('vale anche a est di UTC', () => {
      process.env.TZ = 'Asia/Tokyo';
      expect(formatDate('2026-10-02', 'it')).toBe('02/10/2026');
      expect(formatDate('2026-12-31', 'en')).toBe('12/31/2026');
    });

    it('rispetta la preferenza utente ISO YYYY-MM-DD', () => {
      process.env.TZ = 'America/Los_Angeles';
      expect(formatDate('2026-10-02', 'it', 'YYYY-MM-DD')).toBe('2026-10-02');
      expect(formatDate('2026-10-02', 'en', 'YYYY-MM-DD')).toBe('2026-10-02');
    });

    it('gestisce input vuoti o invalidi senza eccezioni', () => {
      expect(formatDate('', 'it')).toBe('-');
      expect(formatDate(null, 'en')).toBe('-');
      expect(formatDate('non-una-data', 'en')).toBe('non-una-data');
    });

    it('formatta le valute con il BCP-47 del registro', () => {
      expect(getBcp47('it')).toBe('it-IT');
      expect(getBcp47('en')).toBe('en-US');
      expect(formatCurrency(1250.5, 'it')).toContain('1250,50');
      expect(formatCurrency(1250.5, 'en')).toContain('1,250.50');
      expect(formatCurrency(NaN, 'en')).toContain('0.00');
    });
  });

  describe('5. Contenuti Wiki per lingua', () => {
    it('IT ed EN hanno le stesse categorie e gli stessi articoli (stessi ID)', () => {
      expect(WIKI_CATEGORIES_EN.map((c) => c.id).sort()).toEqual(WIKI_CATEGORIES.map((c) => c.id).sort());
      expect(WIKI_ARTICLES_EN.map((a) => a.id).sort()).toEqual(WIKI_ARTICLES.map((a) => a.id).sort());
      const itCats = new Map(WIKI_ARTICLES.map((a) => [a.id, a.category]));
      for (const a of WIKI_ARTICLES_EN) {
        expect(a.category, `Categoria diversa per ${a.id}`).toBe(itCats.get(a.id));
      }
    });

    it('serve il contenuto della lingua attiva', () => {
      expect(getWikiCategories('en')).toBe(WIKI_CATEGORIES_EN);
      expect(getWikiCategories('it')).toBe(WIKI_CATEGORIES);
      const enIds = new Set(getAllWikiArticles('en').map((a) => a.id));
      for (const a of WIKI_ARTICLES_EN) expect(enIds.has(a.id)).toBe(true);
    });
  });
});
