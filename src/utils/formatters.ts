import { DateFormatPreference } from '../types';

/**
 * Formatta una data ISO (YYYY-MM-DD o ISO timestamp) secondo la preferenza dell'utente.
 * - 'DD/MM/YYYY' => 24/10/2024
 * - 'YYYY-MM-DD' => 2024-10-24
 *
 * Deterministica, immune da sfasamenti di fuso orario UTC.
 */
export function formatDate(
  dateString: string | undefined | null,
  format: DateFormatPreference = 'DD/MM/YYYY'
): string {
  if (!dateString) return '-';

  // Se contiene orario (ISO 8601), estrai solo la porzione data YYYY-MM-DD
  const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString.trim();
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateString;

  const [year, month, day] = parts;
  if (!year || !month || !day) return dateString;

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Default: DD/MM/YYYY
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}
