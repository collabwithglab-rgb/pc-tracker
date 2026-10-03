import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SupportedLocale, SupportedCurrency, TranslationKey, TranslationParams, I18nContextValue } from './types';
import { PCContext } from '../store/PCContext';
import { LOCALE_REGISTRY, SUPPORTED_LOCALES, isSupportedLocale, detectSystemLocale } from './registry';
import {
  CURRENCY_REGISTRY,
  SUPPORTED_CURRENCIES,
  AVAILABLE_CURRENCIES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  getCurrencySymbol,
} from './currencyRegistry';
import { translate, interpolate } from './translator';
import { formatCurrency, formatDate } from './format';

// Re-export per compatibilità con gli import esistenti (`from '../locales'` / `'../i18nContext'`).
export {
  interpolate,
  formatCurrency,
  formatDate,
  detectSystemLocale,
  CURRENCY_REGISTRY,
  SUPPORTED_CURRENCIES,
  AVAILABLE_CURRENCIES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  getCurrencySymbol,
};

/** Elenco lingue selezionabili, derivato dal registro (nessuna lista duplicata). */
export const AVAILABLE_LOCALES = SUPPORTED_LOCALES.map((code) => LOCALE_REGISTRY[code]);

/**
 * Cache non critica della sola preferenza UI, per evitare un flash di lingua o valuta errata
 * prima che IndexedDB sia caricato. La fonte di verità resta `settings` (IndexedDB).
 */
const LOCALE_STORAGE_KEY = 'pc_tracker_preferred_locale';
const CURRENCY_STORAGE_KEY = 'pc_tracker_preferred_currency';

function readCachedLocale(): SupportedLocale | null {
  try {
    const cached = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(cached) ? cached : null;
  } catch {
    return null;
  }
}

function readCachedCurrency(): SupportedCurrency | null {
  try {
    const cached = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isSupportedCurrency(cached) ? cached : null;
  } catch {
    return null;
  }
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
  initialCurrency?: SupportedCurrency;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLocale,
  initialCurrency,
}) => {
  // Integrazione sicura e non-bloccante con PCContext
  const pcContext = useContext(PCContext);

  // Lingua prima del caricamento di IndexedDB (o in test isolati senza PCProvider):
  // prop esplicita → cache UI → lingua di sistema.
  const [standaloneLocale, setStandaloneLocale] = useState<SupportedLocale>(
    () => initialLocale ?? readCachedLocale() ?? detectSystemLocale()
  );

  // Valuta prima del caricamento di IndexedDB: prop esplicita → cache UI → default (EUR).
  const [standaloneCurrency, setStandaloneCurrency] = useState<SupportedCurrency>(
    () => initialCurrency ?? readCachedCurrency() ?? DEFAULT_CURRENCY
  );

  const persistedLocale = pcContext?.settings?.language;
  const currentLocale: SupportedLocale = isSupportedLocale(persistedLocale)
    ? persistedLocale
    : standaloneLocale;

  const persistedCurrency = pcContext?.settings?.currency;
  const currentCurrency: SupportedCurrency = isSupportedCurrency(persistedCurrency)
    ? persistedCurrency
    : standaloneCurrency;

  const currentCurrencySymbol = getCurrencySymbol(currentCurrency);
  const dateFormatPreference = pcContext?.settings?.dateFormat;

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, currentLocale);
    } catch {
      // Ignora restrizioni localStorage
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLocale;
    }
  }, [currentLocale]);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currentCurrency);
    } catch {
      // Ignora restrizioni localStorage
    }
  }, [currentCurrency]);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (!isSupportedLocale(newLocale)) return;
      setStandaloneLocale(newLocale);
      if (pcContext?.updateSettings) {
        await pcContext.updateSettings({ language: newLocale });
      }
    },
    [pcContext]
  );

  const setCurrency = useCallback(
    async (newCurrency: SupportedCurrency) => {
      if (!isSupportedCurrency(newCurrency)) return;
      setStandaloneCurrency(newCurrency);
      if (pcContext?.updateSettings) {
        await pcContext.updateSettings({
          currency: newCurrency,
          currencySymbol: getCurrencySymbol(newCurrency),
        });
      }
    },
    [pcContext]
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => translate(currentLocale, key, params),
    [currentLocale]
  );

  const contextFormatCurrency = useCallback(
    (amount: number, customLocale?: SupportedLocale, currency?: string): string =>
      formatCurrency(amount, customLocale ?? currentLocale, currency ?? currentCurrency),
    [currentLocale, currentCurrency]
  );

  const contextFormatDate = useCallback(
    (dateIso: string | undefined | null, customLocale?: SupportedLocale): string =>
      formatDate(dateIso, customLocale ?? currentLocale, dateFormatPreference),
    [currentLocale, dateFormatPreference]
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      currentLocale,
      setLocale,
      t,
      formatCurrency: contextFormatCurrency,
      formatDate: contextFormatDate,
      availableLocales: AVAILABLE_LOCALES,
      isLocaleLoaded: true,
      currentCurrency,
      currentCurrencySymbol,
      setCurrency,
      availableCurrencies: AVAILABLE_CURRENCIES,
    }),
    [
      currentLocale,
      setLocale,
      t,
      contextFormatCurrency,
      contextFormatDate,
      currentCurrency,
      currentCurrencySymbol,
      setCurrency,
    ]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation deve essere utilizzato all’interno di un I18nProvider.');
  }
  return context;
}

export const useI18n = useTranslation;

/**
 * Variante tollerante di `useTranslation` per i primitivi condivisi (Modal, Toast) che possono
 * essere renderizzati anche fuori da `I18nProvider` (es. test isolati): in tal caso usa la lingua di sistema.
 */
export function useOptionalTranslation(): (key: TranslationKey, params?: TranslationParams) => string {
  const context = useContext(I18nContext);
  if (context) return context.t;
  return (key, params) => translate(detectSystemLocale(), key, params);
}
