import { SupportedLocale } from '../types';

/**
 * REGISTRO LINGUE — Unica fonte di verità per le lingue supportate.
 *
 * Per aggiungere una lingua:
 *  1. aggiungere il codice a `SupportedLocale` in `src/types/database.ts`
 *     (TypeScript imporrà la voce mancante qui sotto e in `translator.ts`);
 *  2. aggiungere la voce in `LOCALE_REGISTRY` con la sua catena di fallback;
 *  3. creare `src/locales/<code>.json` e registrarlo in `translator.ts`.
 *
 * Nessun altro punto del codice deve elencare le lingue a mano.
 * Il modulo è puro (nessuna dipendenza React/IndexedDB): può essere importato
 * dallo storage layer e dal dominio senza creare cicli.
 */
export interface LocaleDefinition {
  code: SupportedLocale;
  /** Nome della lingua nella lingua stessa (mostrato nel selettore). */
  nativeName: string;
  flag: string;
  /** Tag BCP-47 usato da Intl.NumberFormat / DateTimeFormat / PluralRules. */
  bcp47: string;
  /**
   * Lingue intermedie da consultare se una chiave manca, in ordine.
   * L'italiano (dizionario master) viene sempre aggiunto in coda automaticamente.
   * Esempio futuro: de → ['en'] produce la catena de → en → it → chiave.
   */
  fallback: SupportedLocale[];
}

/** Lingua master: definisce l'insieme canonico delle chiavi (TranslationKey). */
export const MASTER_LOCALE: SupportedLocale = 'it';

/** Lingua usata quando la lingua di sistema non è supportata. */
export const INTERNATIONAL_FALLBACK_LOCALE: SupportedLocale = 'en';

export const LOCALE_REGISTRY: Record<SupportedLocale, LocaleDefinition> = {
  it: { code: 'it', nativeName: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT', fallback: [] },
  en: { code: 'en', nativeName: 'English', flag: '🇬🇧', bcp47: 'en-US', fallback: [] },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALE_REGISTRY) as SupportedLocale[];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LOCALE_REGISTRY, value);
}

export function getBcp47(locale: SupportedLocale): string {
  return (LOCALE_REGISTRY[locale] ?? LOCALE_REGISTRY[MASTER_LOCALE]).bcp47;
}

/**
 * Catena di risoluzione deterministica e senza duplicati:
 * [lingua richiesta, ...fallback dichiarati, lingua master].
 */
export function resolveFallbackChain(locale: SupportedLocale): SupportedLocale[] {
  const def = LOCALE_REGISTRY[locale];
  const chain: SupportedLocale[] = def ? [locale, ...def.fallback] : [];
  chain.push(MASTER_LOCALE);
  return chain.filter((code, idx) => chain.indexOf(code) === idx);
}

/**
 * Sceglie, tra le lingue per cui esiste un contenuto (es. articoli Wiki),
 * la prima compatibile con la catena di fallback della lingua attiva.
 */
export function resolveContentLocale(
  locale: SupportedLocale,
  availableContentLocales: readonly SupportedLocale[]
): SupportedLocale {
  const match = resolveFallbackChain(locale).find((code) => availableContentLocales.includes(code));
  return match ?? MASTER_LOCALE;
}

/**
 * Rileva la lingua preferita del sistema (Windows → WebView2 → navigator.languages).
 * Scorre tutte le preferenze dell'utente in ordine e restituisce la prima supportata;
 * se nessuna è supportata usa la lingua internazionale (inglese).
 */
export function detectSystemLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return MASTER_LOCALE;

  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  if (navigator.language) candidates.push(navigator.language);
  if (candidates.length === 0) return MASTER_LOCALE;

  for (const tag of candidates) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (isSupportedLocale(primary)) return primary;
  }
  return INTERNATIONAL_FALLBACK_LOCALE;
}
