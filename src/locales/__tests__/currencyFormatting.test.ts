import { describe, it, expect } from 'vitest';
import {
  CURRENCY_REGISTRY,
  SUPPORTED_CURRENCIES,
  AVAILABLE_CURRENCIES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  getCurrencyDefinition,
  getCurrencySymbol,
  getCurrencyFractionDigits,
  inferCurrencyFromSymbol,
} from '../currencyRegistry';
import { formatCurrency } from '../format';

describe('Currency Registry & Multi-Currency Engine', () => {
  describe('1. Registro Valute e Metadati', () => {
    it('include esattamente le 8 valute ufficiali', () => {
      expect(SUPPORTED_CURRENCIES).toEqual([
        'EUR',
        'USD',
        'GBP',
        'CHF',
        'JPY',
        'CNY',
        'CAD',
        'AUD',
      ]);
      expect(AVAILABLE_CURRENCIES.length).toBe(8);
      expect(DEFAULT_CURRENCY).toBe('EUR');
    });

    it('definisce correttamente i simboli e le frazioni decimali', () => {
      expect(CURRENCY_REGISTRY.EUR.symbol).toBe('€');
      expect(CURRENCY_REGISTRY.EUR.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.USD.symbol).toBe('$');
      expect(CURRENCY_REGISTRY.USD.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.GBP.symbol).toBe('£');
      expect(CURRENCY_REGISTRY.GBP.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.CHF.symbol).toBe('CHF');
      expect(CURRENCY_REGISTRY.CHF.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.JPY.symbol).toBe('¥');
      expect(CURRENCY_REGISTRY.JPY.fractionDigits).toBe(0);

      expect(CURRENCY_REGISTRY.CNY.symbol).toBe('¥');
      expect(CURRENCY_REGISTRY.CNY.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.CAD.symbol).toBe('CA$');
      expect(CURRENCY_REGISTRY.CAD.fractionDigits).toBe(2);

      expect(CURRENCY_REGISTRY.AUD.symbol).toBe('AU$');
      expect(CURRENCY_REGISTRY.AUD.fractionDigits).toBe(2);
    });

    it('verifica che ogni valuta abbia campi obbligatori completi e validi', () => {
      for (const curr of AVAILABLE_CURRENCIES) {
        expect(curr.code.length).toBe(3);
        expect(curr.symbol.length).toBeGreaterThan(0);
        expect(curr.nativeName.length).toBeGreaterThan(0);
        expect(curr.englishName.length).toBeGreaterThan(0);
        expect(curr.flag.length).toBeGreaterThan(0);
        expect(curr.nameKey.startsWith('currency_')).toBe(true);
      }
    });

    it('type-guard isSupportedCurrency valida solo codici supportati', () => {
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('GBP')).toBe(true);
      expect(isSupportedCurrency('JPY')).toBe(true);
      expect(isSupportedCurrency('XYZ')).toBe(false);
      expect(isSupportedCurrency('')).toBe(false);
      expect(isSupportedCurrency(null)).toBe(false);
      expect(isSupportedCurrency(undefined)).toBe(false);
      expect(isSupportedCurrency(123)).toBe(false);
    });

    it('getCurrencyDefinition fornisce fallback sicuro su EUR', () => {
      expect(getCurrencyDefinition('USD').code).toBe('USD');
      expect(getCurrencyDefinition('INVALID').code).toBe('EUR');
      expect(getCurrencyDefinition(undefined).code).toBe('EUR');
    });

    it('getCurrencySymbol e getCurrencyFractionDigits restituiscono metadati esatti', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('UNKNOWN')).toBe('€');

      expect(getCurrencyFractionDigits('JPY')).toBe(0);
      expect(getCurrencyFractionDigits('EUR')).toBe(2);
      expect(getCurrencyFractionDigits('USD')).toBe(2);
      expect(getCurrencyFractionDigits(undefined)).toBe(2);
    });

    it('inferCurrencyFromSymbol deduce la valuta da simboli legacy', () => {
      expect(inferCurrencyFromSymbol('$')).toBe('USD');
      expect(inferCurrencyFromSymbol('£')).toBe('GBP');
      expect(inferCurrencyFromSymbol('CHF')).toBe('CHF');
      expect(inferCurrencyFromSymbol('¥')).toBe('JPY');
      expect(inferCurrencyFromSymbol('CA$')).toBe('CAD');
      expect(inferCurrencyFromSymbol('AU$')).toBe('AUD');
      expect(inferCurrencyFromSymbol('€')).toBe('EUR');
      expect(inferCurrencyFromSymbol('unknown')).toBe('EUR');
      expect(inferCurrencyFromSymbol(undefined)).toBe('EUR');
    });
  });

  describe('2. Formattazione Internazionale con formatCurrency', () => {
    it('formatta Euro in italiano con virgola e simbolo €', () => {
      const res = formatCurrency(1249.5, 'it', 'EUR');
      expect(res).toMatch(/1\.?249,50/);
      expect(res).toContain('€');
    });

    it('formatta Dollaro USA in inglese con punto e simbolo $', () => {
      const res = formatCurrency(1249.5, 'en', 'USD');
      expect(res).toMatch(/1,249\.50/);
      expect(res).toContain('$');
    });

    it('formatta Sterlina Britannica in inglese con simbolo £', () => {
      const res = formatCurrency(899.99, 'en', 'GBP');
      expect(res).toContain('899.99');
      expect(res).toContain('£');
    });

    it('formatta Yen Giapponese a 0 cifre decimali (senza frazione)', () => {
      const resJa = formatCurrency(15000, 'it', 'JPY');
      // In JPY (0 decimali), l'intero è 15.000 senza decimali (,00) alla fine
      expect(resJa).not.toMatch(/,00/);
      expect(resJa).toContain('15.000');
    });

    it('formatta Franco Svizzero in tedesco con CHF', () => {
      const res = formatCurrency(550.25, 'de', 'CHF');
      expect(res).toContain('550');
      expect(res).toContain('CHF');
    });

    it('formatta Yuan Cinese in cinese con ¥', () => {
      const res = formatCurrency(2999.0, 'zh', 'CNY');
      expect(res).toContain('2,999.00');
      expect(res).toMatch(/[¥￥]/);
    });

    it('gestisce con sicurezza valori NaN, null, o undefined trattandoli come 0', () => {
      expect(formatCurrency(NaN, 'it', 'EUR')).toContain('0,00');
      expect(formatCurrency(undefined as unknown as number, 'it', 'EUR')).toContain('0,00');
      expect(formatCurrency(null as unknown as number, 'it', 'EUR')).toContain('0,00');
    });

    it('gestisce con sicurezza codici valuta invalidi o non supportati ricadendo su EUR senza crash', () => {
      const res = formatCurrency(100, 'it', 'INVALID_CURRENCY_XYZ');
      expect(res).toContain('100,00');
      expect(res).toContain('€');
    });
  });
});
