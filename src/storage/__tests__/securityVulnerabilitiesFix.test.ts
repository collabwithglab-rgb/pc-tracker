import { describe, it, expect } from 'vitest';
import { escapeCSVCell, validateImportJSON } from '../backupService';
import { DatabaseSchema } from '../../types';

describe('Security & Vulnerability Fixes Suite', () => {
  describe('CSV Formula Injection Defense (CWE-1236)', () => {
    it('should neutralize formula prefixes in text strings', () => {
      expect(escapeCSVCell('=1+1')).toBe("'=1+1");
      expect(escapeCSVCell('+cmd|calc')).toBe("'+cmd|calc");
      expect(escapeCSVCell('-cmd|calc')).toBe("'-cmd|calc");
      expect(escapeCSVCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(escapeCSVCell('\tmalicious')).toBe("'\tmalicious");
    });

    it('should leave normal text and numbers unaffected', () => {
      expect(escapeCSVCell('GeForce RTX 4090')).toBe('GeForce RTX 4090');
      expect(escapeCSVCell('Corsair Vengeance 32GB')).toBe('Corsair Vengeance 32GB');
      expect(escapeCSVCell(123.45)).toBe('123.45');
      expect(escapeCSVCell(-50)).toBe('-50');
      expect(escapeCSVCell(null)).toBe('');
      expect(escapeCSVCell(undefined)).toBe('');
    });
  });

  describe('Prototype Pollution Defense in Backup Import (CWE-1321)', () => {
    it('should prevent prototype pollution from malicious JSON payloads', () => {
      const maliciousJson = JSON.stringify({
        schemaVersion: 1,
        appVersion: '0.1.0',
        components: [],
        events: [],
        __proto__: { polluted: 'true' },
      });

      const result = validateImportJSON(maliciousJson);
      // The result should not pollute Object.prototype
      expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
      expect(result.isValid).toBe(true);
    });
  });

  describe('Receipt Data URL MIME Validation (XSS / Injection Defense)', () => {
    const baseValidBackup: DatabaseSchema = {
      schemaVersion: 1,
      appVersion: '0.1.0',
      settings: {
        rigName: 'Test Rig',
        rigDescription: '',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
        uiDensity: 'comfortable',
        reducedMotion: 'system',
        accentColor: 'cyan',
        environmentTheme: 'obsidian',
        typographyPreset: 'default',
        defaultStartSection: 'dashboard',
        dashboardRecentCount: 7,
        showRigSynthesis: true,
        archiveDefaultSort: 'purchase_date_desc',
        archiveDefaultView: 'cards',
        confirmEventDeletion: true,
        autoCloseMovementModal: true,
      },
      components: [
        {
          id: 'comp-1',
          name: 'RTX 4090',
          brand: 'NVIDIA',
          model: 'FE',
          category: 'gpu',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      events: [
        {
          id: 'ev-1',
          componentId: 'comp-1',
          date: '2024-01-01',
          type: 'PURCHASE',
          price: 1800,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      upgrades: [],
      checkpoints: [],
    };

    it('should reject receipts with data:text/html or script payloads', () => {
      const backupWithMaliciousReceipt = {
        ...baseValidBackup,
        receipts: [
          {
            id: 'rec-1',
            componentId: 'comp-1',
            fileName: 'invoice.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            dataUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
            uploadedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = validateImportJSON(JSON.stringify(backupWithMaliciousReceipt));
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('MIME type non autorizzato');
      }
    });

    it('should accept receipts with legitimate PDF or image data URLs', () => {
      const backupWithValidReceipt = {
        ...baseValidBackup,
        receipts: [
          {
            id: 'rec-1',
            componentId: 'comp-1',
            fileName: 'invoice.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
            uploadedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = validateImportJSON(JSON.stringify(backupWithValidReceipt));
      expect(result.isValid).toBe(true);
    });
  });
});
