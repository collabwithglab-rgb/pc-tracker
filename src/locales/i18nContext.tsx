import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SupportedLocale, TranslationKey, TranslationParams, I18nContextValue } from './types';
import { PCContext } from '../store/PCContext';
import { LOCALE_REGISTRY, SUPPORTED_LOCALES, isSupportedLocale, detectSystemLocale } from './registry';
import { translate, interpolate } from './translator';
import { formatCurrency, formatDate } from './format';

// Re-export per compatibilità con gli import esistenti (`from '../locales'` / `'../i18nContext'`).
export { interpolate, formatCurrency, formatDate, detectSystemLocale };

/** Elenco lingue selezionabili, derivato dal registro (nessuna lista duplicata). */
export const AVAILABLE_LOCALES = SUPPORTED_LOCALES.map((code) => LOCALE_REGISTRY[code]);

/**
 * Cache non critica della sola preferenza UI, per evitare un flash di lingua errata
 * prima che IndexedDB sia caricato. La fonte di verità resta `settings.language` (IndexedDB).
 */
const STORAGE_KEY = 'pc_tracker_preferred_locale';

function readCachedLocale(): SupportedLocale | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return isSupportedLocale(cached) ? cached : null;
  } catch {
    return null;
  }
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale }) => {
  // Integrazione sicura e non-bloccante con PCContext
  const pcContext = useContext(PCContext);

  // Lingua prima del caricamento di IndexedDB (o in test isolati senza PCProvider):
  // prop esplicita → cache UI → lingua di sistema.
  const [standaloneLocale, setStandaloneLocale] = useState<SupportedLocale>(
    () => initialLocale ?? readCachedLocale() ?? detectSystemLocale()
  );

  const persistedLocale = pcContext?.settings?.language;
  const currentLocale: SupportedLocale = isSupportedLocale(persistedLocale) ? persistedLocale : standaloneLocale;
  const dateFormatPreference = pcContext?.settings?.dateFormat;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currentLocale);
    } catch {
      // Ignora restrizioni localStorage
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLocale;
    }
  }, [currentLocale]);

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

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => translate(currentLocale, key, params),
    [currentLocale]
  );

  const contextFormatCurrency = useCallback(
    (amount: number, customLocale?: SupportedLocale, currency: string = 'EUR'): string =>
      formatCurrency(amount, customLocale ?? currentLocale, currency),
    [currentLocale]
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
    }),
    [currentLocale, setLocale, t, contextFormatCurrency, contextFormatDate]
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
