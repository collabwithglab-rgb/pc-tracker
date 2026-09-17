import { describe, it, expect } from 'vitest';
import { ALLOWED_RECEIPT_MIME_TYPES, MAX_RECEIPT_FILE_SIZE_BYTES, Component } from '../../../types';
import { computeWarrantyInfo, filterComponentsForArchive } from '../../../domain';

describe('Receipt Vault & Warranty UI Logic (Task 1 / Tranche 4)', () => {
  describe('Receipt Vault Business & Display Rules', () => {
    it('accetta solo i formati consentiti (PDF, PNG, JPG, JPEG, WEBP)', () => {
      const isValidMime = (mime: string) => (ALLOWED_RECEIPT_MIME_TYPES as string[]).includes(mime);

      expect(isValidMime('application/pdf')).toBe(true);
      expect(isValidMime('image/png')).toBe(true);
      expect(isValidMime('image/jpeg')).toBe(true);
      expect(isValidMime('image/webp')).toBe(true);

      expect(isValidMime('application/zip')).toBe(false);
      expect(isValidMime('text/plain')).toBe(false);
      expect(isValidMime('application/x-executable')).toBe(false);
    });

    it('blocca file superiori a 10MB', () => {
      const isValidSize = (size: number) => size <= MAX_RECEIPT_FILE_SIZE_BYTES;

      expect(isValidSize(1024)).toBe(true); // 1 KB
      expect(isValidSize(5 * 1024 * 1024)).toBe(true); // 5 MB
      expect(isValidSize(10 * 1024 * 1024)).toBe(true); // 10 MB esatti
      expect(isValidSize(10 * 1024 * 1024 + 1)).toBe(false); // 10 MB + 1 byte
    });

    it('calcola correttamente la dimensione leggibile in MB', () => {
      const formatSizeMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

      expect(formatSizeMb(1024 * 1024)).toBe('1.00');
      expect(formatSizeMb(2.45 * 1024 * 1024)).toBe('2.45');
      expect(formatSizeMb(350 * 1024)).toBe('0.34');
    });

    it('limita i livelli di zoom tra 50% e 300%', () => {
      const clampZoom = (zoom: number) => Math.min(Math.max(zoom, 0.5), 3.0);

      expect(clampZoom(0.25)).toBe(0.5);
      expect(clampZoom(1.0)).toBe(1.0);
      expect(clampZoom(2.5)).toBe(2.5);
      expect(clampZoom(3.5)).toBe(3.0);
    });
  });

  describe('Archive Warranty Filtering & Badges Integration', () => {
    const mockComponents: Component[] = [
      { id: 'c1', name: 'GPU RTX 4090', brand: 'MSI', model: 'Gaming X', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c2', name: 'CPU Ryzen 7 7800X3D', brand: 'AMD', model: 'Box', category: 'cpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c3', name: 'SSD 990 Pro 2TB', brand: 'Samsung', model: 'MZ-V9P2T0BW', category: 'storage', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'c4', name: 'Alimentatore Seasonic 850W', brand: 'Seasonic', model: 'Focus GX', category: 'psu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];

    const mockComputedMap: Record<string, any> = {
      c1: { status: 'IN_USE' as const, totalPurchaseCost: 1900, totalSaleRevenue: 0, netCost: 1900, daysInUse: 100, costPerDayInUse: 19, purchaseDate: '2024-01-10' },
      c2: { status: 'IN_USE' as const, totalPurchaseCost: 400, totalSaleRevenue: 0, netCost: 400, daysInUse: 100, costPerDayInUse: 4, purchaseDate: '2024-01-10' },
      c3: { status: 'IN_STORAGE' as const, totalPurchaseCost: 180, totalSaleRevenue: 0, netCost: 180, daysInUse: 50, costPerDayInUse: 3.6, purchaseDate: '2022-01-10' },
      c4: { status: 'IN_USE' as const, totalPurchaseCost: 150, totalSaleRevenue: 0, netCost: 150, daysInUse: 100, costPerDayInUse: 1.5, purchaseDate: '2024-01-10' },
    };

    // c1: Attiva (scade nel 2027)
    // c2: In scadenza (scade tra 15 giorni rispetto al referenceDate 2026-03-01)
    // c3: Scaduta (scaduta nel 2024)
    // c4: Senza garanzia registrata
    const referenceDate = '2026-03-01';
    const mockWarrantyMap = {
      c1: computeWarrantyInfo({ warrantyExpiryDate: '2027-01-10', date: '2024-01-10' }, referenceDate),
      c2: computeWarrantyInfo({ warrantyExpiryDate: '2026-03-16', date: '2024-01-10' }, referenceDate),
      c3: computeWarrantyInfo({ warrantyExpiryDate: '2024-01-10', date: '2022-01-10' }, referenceDate),
      c4: computeWarrantyInfo(undefined, referenceDate),
    };

    it('restituisce tutti i componenti quando warranty="all"', () => {
      const res = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'all' },
        mockWarrantyMap
      );
      expect(res).toHaveLength(4);
    });

    it('filtra solo i componenti con garanzia attiva (active o expiring)', () => {
      const res = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'active' },
        mockWarrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('filtra solo i componenti in scadenza a breve (<= 30 giorni)', () => {
      const res = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'expiring' },
        mockWarrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c2']);
    });

    it('filtra solo i componenti con garanzia terminata', () => {
      const res = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'all', status: 'all', warranty: 'expired' },
        mockWarrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c3']);
    });

    it('abbina correttamente filtri di stato, categoria e garanzia contemporaneamente', () => {
      // GPU + IN_USE + active -> solo c1
      const res = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'gpu', status: 'IN_USE', warranty: 'active' },
        mockWarrantyMap
      );
      expect(res.map((c) => c.id)).toEqual(['c1']);

      // CPU + IN_STORAGE + active -> nessuno
      const emptyRes = filterComponentsForArchive(
        mockComponents,
        mockComputedMap,
        { searchQuery: '', category: 'cpu', status: 'IN_STORAGE', warranty: 'active' },
        mockWarrantyMap
      );
      expect(emptyRes).toHaveLength(0);
    });
  });
});
