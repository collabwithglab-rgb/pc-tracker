import itLocale from './it.json';
import enLocale from './en.json';
import esLocale from './es.json';
import frLocale from './fr.json';
import { SupportedLocale } from '../types';
import { getBcp47, resolveFallbackChain } from './registry';

/** Insieme canonico delle chiavi: definito dal dizionario master (it.json). */
export type TranslationKey = keyof typeof itLocale;
export type TranslationParams = Record<string, string | number>;
type Dictionary = Partial<Record<string, string>>;

/**
 * Dizionari registrati. `Record<SupportedLocale, …>` rende obbligatoria una voce
 * per ogni lingua dichiarata: dimenticarla è un errore di compilazione.
 *
 * Nota: i dizionari sono inclusi staticamente (~90 KB ciascuno). Per un'app desktop
 * locale con poche lingue è la scelta più semplice e senza flash di contenuto.
 * Oltre 4-5 lingue conviene passare a `import()` dinamico per lingua.
 */
const DICTIONARIES: Record<SupportedLocale, Dictionary> = {
  it: itLocale,
  en: enLocale,
  es: esLocale,
  fr: frLocale,
};

/**
 * Sostituisce i segnaposto dinamici {param} con i rispettivi valori.
 * Un segnaposto senza valore resta visibile (trasparenza, nessun testo perso).
 */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const val = params[key];
      return val !== undefined && val !== null ? String(val) : '';
    }
    return match;
  });
}

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralCategory(locale: SupportedLocale, count: number): Intl.LDMLPluralRule {
  const bcp47 = getBcp47(locale);
  let rules = pluralRulesCache.get(bcp47);
  if (!rules) {
    rules = new Intl.PluralRules(bcp47);
    pluralRulesCache.set(bcp47, rules);
  }
  return rules.select(count);
}

/**
 * Traduzione pura, utilizzabile anche fuori da React (store, servizi).
 *
 * Risoluzione:
 *  1. scorre la catena di fallback della lingua (es. en → it; futuro de → en → it);
 *  2. per ogni lingua, se `params.count` è numerico prova prima la variante plurale
 *     `<chiave>_<categoria CLDR>` (es. `_one`), poi la chiave base;
 *  3. se nessun dizionario contiene la chiave, restituisce la chiave stessa (mai crash).
 */
export function translate(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const count = params && typeof params.count === 'number' ? params.count : undefined;

  for (const code of resolveFallbackChain(locale)) {
    const dict = DICTIONARIES[code];
    if (!dict) continue;

    if (count !== undefined) {
      const pluralText = dict[`${key}_${getPluralCategory(code, count)}`];
      if (pluralText) return interpolate(pluralText, params);
    }

    const text = dict[key];
    if (text) return interpolate(text, params);
  }

  return interpolate(key, params);
}

/** Solo per test: verifica la presenza di una chiave in un dizionario specifico. */
export function hasTranslation(locale: SupportedLocale, key: string): boolean {
  return Boolean(DICTIONARIES[locale]?.[key]);
}

/**
 * Solo per test: esegue `translate` con un dizionario temporaneo, per simulare
 * lingue parziali senza aggiungerle al bundle.
 */
export function withTemporaryDictionary<T>(
  locale: SupportedLocale,
  dictionary: Dictionary,
  run: () => T
): T {
  const original = DICTIONARIES[locale];
  DICTIONARIES[locale] = dictionary;
  try {
    return run();
  } finally {
    DICTIONARIES[locale] = original;
  }
}
