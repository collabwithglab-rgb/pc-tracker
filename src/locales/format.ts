import { DateFormatPreference, SupportedLocale } from '../types';
import { getBcp47, MASTER_LOCALE } from './registry';

/**
 * FORMATTAZIONE LOCALE — valute e date secondo il tag BCP-47 della lingua.
 *
 * - I formattatori Intl sono costosi da costruire: vengono memorizzati in cache
 *   per (bcp47 + opzioni), così liste lunghe (archivio, timeline) non li ricreano.
 * - Le date di dominio sono stringhe `YYYY-MM-DD` senza orario: vanno formattate
 *   come date di calendario, MAI convertite tramite il fuso orario locale
 *   (altrimenti a ovest di UTC "2026-10-02" diventa "01/10/2026").
 */

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getCurrencyFormatter(bcp47: string, currency: string): Intl.NumberFormat {
  const cacheKey = `${bcp47}|${currency}`;
  let formatter = numberFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(bcp47, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    numberFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}

function getDateFormatter(bcp47: string, utc: boolean): Intl.DateTimeFormat {
  const cacheKey = `${bcp47}|${utc ? 'utc' : 'local'}`;
  let formatter = dateFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(bcp47, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(utc ? { timeZone: 'UTC' } : {}),
    });
    dateFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Formatta valute secondo lo standard BCP-47 (fallback sicuro su 0 per NaN/undefined).
 */
export function formatCurrency(
  amount: number,
  localeCode: SupportedLocale = MASTER_LOCALE,
  currency: string = 'EUR'
): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return getCurrencyFormatter(getBcp47(localeCode), currency).format(safeAmount);
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * Formatta una data ISO secondo le convenzioni della lingua.
 *
 * - `YYYY-MM-DD` (data di calendario del dominio): formattata in UTC a partire dalle
 *   sue componenti → identica in qualunque fuso orario.
 * - Timestamp completo (`...T...Z`): istante reale, formattato nel fuso locale.
 * - `dateFormat === 'YYYY-MM-DD'`: rispetta la preferenza ISO esplicita dell'utente.
 */
export function formatDate(
  dateIso: string | undefined | null,
  localeCode: SupportedLocale = MASTER_LOCALE,
  dateFormat?: DateFormatPreference
): string {
  if (!dateIso) return '-';
  const trimmed = dateIso.trim();
  const dateOnly = DATE_ONLY_REGEX.exec(trimmed);

  let date: Date;
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  } else {
    date = new Date(trimmed);
  }
  if (isNaN(date.getTime())) return dateIso;

  if (dateFormat === 'YYYY-MM-DD') {
    const y = dateOnly ? date.getUTCFullYear() : date.getFullYear();
    const m = (dateOnly ? date.getUTCMonth() : date.getMonth()) + 1;
    const d = dateOnly ? date.getUTCDate() : date.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return getDateFormatter(getBcp47(localeCode), Boolean(dateOnly)).format(date);
}
