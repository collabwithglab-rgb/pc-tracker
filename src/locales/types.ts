import { SupportedLocale } from '../types';
import type { TranslationKey, TranslationParams } from './translator';
import type { LocaleDefinition } from './registry';

export type { SupportedLocale, TranslationKey, TranslationParams };

/** @deprecated Usare `LocaleDefinition` da `./registry`. Alias mantenuto per compatibilità. */
export type LocaleMetadata = LocaleDefinition;
export type { LocaleDefinition };

export interface I18nContextValue {
  currentLocale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void> | void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatCurrency: (amount: number, customLocale?: SupportedLocale, currency?: string) => string;
  /** Rispetta lingua attiva e preferenza formato data dell'utente; sicura rispetto al fuso orario. */
  formatDate: (dateIso: string | undefined | null, customLocale?: SupportedLocale) => string;
  availableLocales: LocaleDefinition[];
  isLocaleLoaded: boolean;
}

export type HardwareGlossary = typeof import('./glossary.json');
