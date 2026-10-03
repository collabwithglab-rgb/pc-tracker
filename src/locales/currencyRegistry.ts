import { SupportedCurrency } from '../types';

export interface CurrencyDefinition {
  code: SupportedCurrency;
  symbol: string;
  nativeName: string;
  englishName: string;
  flag: string;
  fractionDigits: number;
  nameKey: string;
}

/**
 * Registro Unificato delle Valute Supportate in PC Tracker.
 * Single Source of Truth per simboli, decimali e metadati internazionali.
 */
export const CURRENCY_REGISTRY: Record<SupportedCurrency, CurrencyDefinition> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    nativeName: 'Euro',
    englishName: 'Euro',
    flag: '🇪🇺',
    fractionDigits: 2,
    nameKey: 'currency_eur',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    nativeName: 'US Dollar',
    englishName: 'US Dollar',
    flag: '🇺🇸',
    fractionDigits: 2,
    nameKey: 'currency_usd',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    nativeName: 'British Pound',
    englishName: 'British Pound',
    flag: '🇬🇧',
    fractionDigits: 2,
    nameKey: 'currency_gbp',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    nativeName: 'Schweizer Franken',
    englishName: 'Swiss Franc',
    flag: '🇨🇭',
    fractionDigits: 2,
    nameKey: 'currency_chf',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    nativeName: '日本円',
    englishName: 'Japanese Yen',
    flag: '🇯🇵',
    fractionDigits: 0,
    nameKey: 'currency_jpy',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    nativeName: '人民币',
    englishName: 'Chinese Yuan',
    flag: '🇨🇳',
    fractionDigits: 2,
    nameKey: 'currency_cny',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    nativeName: 'Canadian Dollar',
    englishName: 'Canadian Dollar',
    flag: '🇨🇦',
    fractionDigits: 2,
    nameKey: 'currency_cad',
  },
  AUD: {
    code: 'AUD',
    symbol: 'AU$',
    nativeName: 'Australian Dollar',
    englishName: 'Australian Dollar',
    flag: '🇦🇺',
    fractionDigits: 2,
    nameKey: 'currency_aud',
  },
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'JPY',
  'CNY',
  'CAD',
  'AUD',
] as const;

export const AVAILABLE_CURRENCIES: readonly CurrencyDefinition[] = SUPPORTED_CURRENCIES.map(
  (code) => CURRENCY_REGISTRY[code]
);

/**
 * Type-guard deterministico per verificare se un codice valuta è supportato.
 */
export function isSupportedCurrency(code: unknown): code is SupportedCurrency {
  return typeof code === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/**
 * Recupera la definizione della valuta, con fallback sicuro su EUR.
 */
export function getCurrencyDefinition(code?: unknown): CurrencyDefinition {
  if (isSupportedCurrency(code)) {
    return CURRENCY_REGISTRY[code];
  }
  return CURRENCY_REGISTRY[DEFAULT_CURRENCY];
}

/**
 * Restituisce il simbolo ufficiale della valuta richiesta (o di default).
 */
export function getCurrencySymbol(code?: unknown): string {
  return getCurrencyDefinition(code).symbol;
}

/**
 * Restituisce il numero di cifre decimali standard per la valuta (es. 0 per JPY, 2 per EUR).
 */
export function getCurrencyFractionDigits(code?: unknown): number {
  return getCurrencyDefinition(code).fractionDigits;
}

/**
 * Tenta di dedurre la valuta a partire da un simbolo legacy (backward compatibility).
 */
export function inferCurrencyFromSymbol(symbol?: unknown): SupportedCurrency {
  if (typeof symbol !== 'string') return DEFAULT_CURRENCY;
  const clean = symbol.trim();
  switch (clean) {
    case '$':
      return 'USD';
    case '£':
      return 'GBP';
    case 'CHF':
      return 'CHF';
    case '¥':
      return 'JPY';
    case 'CA$':
      return 'CAD';
    case 'AU$':
      return 'AUD';
    case '€':
    default:
      return DEFAULT_CURRENCY;
  }
}
