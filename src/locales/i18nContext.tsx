import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import itLocale from './it.json';
import enLocale from './en.json';
import { SupportedLocale, TranslationKey, LocaleMetadata, I18nContextValue } from './types';
import { PCContext } from '../store/PCContext';

export const AVAILABLE_LOCALES: LocaleMetadata[] = [
  { code: 'it', label: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT' },
  { code: 'en', label: 'Inglese', nativeName: 'English', flag: '🇬🇧', bcp47: 'en-US' },
  { code: 'de', label: 'Tedesco', nativeName: 'Deutsch', flag: '🇩🇪', bcp47: 'de-DE' },
  { code: 'fr', label: 'Francese', nativeName: 'Français', flag: '🇫🇷', bcp47: 'fr-FR' },
  { code: 'es', label: 'Spagnolo', nativeName: 'Español', flag: '🇪🇸', bcp47: 'es-ES' },
  { code: 'zh', label: 'Cinese', nativeName: '简体中文', flag: '🇨🇳', bcp47: 'zh-CN' },
  { code: 'ja', label: 'Giapponese', nativeName: '日本語', flag: '🇯🇵', bcp47: 'ja-JP' },
];

const BCP47_MAP: Record<SupportedLocale, string> = {
  it: 'it-IT',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

const DICTIONARIES: Record<SupportedLocale, Record<string, string>> = {
  it: itLocale,
  en: enLocale,
  de: enLocale, // Fallback strutturale ordinato per fasi successive
  fr: enLocale,
  es: enLocale,
  zh: enLocale,
  ja: enLocale,
};

const STORAGE_KEY = 'pc_tracker_preferred_locale';

/**
 * Rileva la lingua di sistema Windows dal browser/runtime
 */
export function detectSystemLocale(): SupportedLocale {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return 'it';
  }
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('it')) return 'it';
  return 'en'; // fallback internazionale predefinito se non italiano o altre lingue supportate
}

/**
 * Sostituisce i segnaposto dinamici {param} con i rispettivi valori
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

/**
 * Formatta valute secondo lo standard BCP-47 locale
 */
export function formatCurrency(
  amount: number,
  localeCode: SupportedLocale = 'it',
  currency: string = 'EUR'
): string {
  const bcp = BCP47_MAP[localeCode] || 'it-IT';
  return new Intl.NumberFormat(bcp, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatta date ISO secondo le convenzioni locali
 */
export function formatDate(
  dateIso: string,
  localeCode: SupportedLocale = 'it'
): string {
  if (!dateIso) return '-';
  const date = new Date(dateIso);
  if (isNaN(date.getTime())) return dateIso;
  const bcp = BCP47_MAP[localeCode] || 'it-IT';
  return new Intl.DateTimeFormat(bcp, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale }) => {
  // Integrazione sicura e non-bloccante con PCContext
  const pcContext = useContext(PCContext);

  // Stato locale di fallback (utilizzabile anche in test isolati senza PCProvider)
  const [standaloneLocale, setStandaloneLocale] = useState<SupportedLocale>(() => {
    if (initialLocale) return initialLocale;
    try {
      const cached = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (cached && DICTIONARIES[cached]) return cached;
    } catch {
      // Ignora restrizioni localStorage
    }
    return 'it';
  });

  // La lingua attiva è derivata primariamente da IndexedDB (PCContext) se montato
  const currentLocale: SupportedLocale = pcContext?.settings?.language || standaloneLocale;

  // Sincronizza localStorage quando cambia la lingua per evitare flash al boot
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currentLocale);
      document.documentElement.lang = currentLocale;
    } catch {
      // Ignora
    }
  }, [currentLocale]);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (!DICTIONARIES[newLocale]) return;
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
      } catch {
        // Ignora
      }

      setStandaloneLocale(newLocale);

      if (pcContext?.updateSettings) {
        await pcContext.updateSettings({ language: newLocale });
      }
    },
    [pcContext]
  );

  /**
   * Funzione pura di traduzione con Safe Fallback:
   * currentLocale -> it.json -> key originaria
   */
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = DICTIONARIES[currentLocale] || itLocale;
      let text = dict[key];

      // Fallback trasparente sulla lingua madre italiana
      if (!text && currentLocale !== 'it') {
        text = itLocale[key];
      }

      // Se la chiave è sconosciuta, ritorna la chiave stessa come safe fallback
      if (!text) {
        text = key;
      }

      return interpolate(text, params);
    },
    [currentLocale]
  );

  const contextFormatCurrency = useCallback(
    (amount: number, customLocale?: string, currency: string = 'EUR'): string => {
      const target = (customLocale as SupportedLocale) || currentLocale;
      return formatCurrency(amount, target, currency);
    },
    [currentLocale]
  );

  const contextFormatDate = useCallback(
    (dateIso: string, customLocale?: string): string => {
      const target = (customLocale as SupportedLocale) || currentLocale;
      return formatDate(dateIso, target);
    },
    [currentLocale]
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
