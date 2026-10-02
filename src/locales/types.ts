import itLocale from './it.json';
import { SupportedLocale } from '../types';

export type { SupportedLocale };

export type TranslationKey = keyof typeof itLocale;

export interface LocaleMetadata {
  code: SupportedLocale;
  label: string;
  nativeName: string;
  flag: string;
  bcp47: string;
}

export interface I18nContextValue {
  currentLocale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void> | void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, customLocale?: string, currency?: string) => string;
  formatDate: (dateIso: string, customLocale?: string) => string;
  availableLocales: LocaleMetadata[];
  isLocaleLoaded: boolean;
}

export type HardwareGlossary = typeof import('./glossary.json');
