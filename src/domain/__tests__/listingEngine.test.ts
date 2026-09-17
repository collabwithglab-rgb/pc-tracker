import { describe, it, expect } from 'vitest';
import {
  formatUsageDuration,
  clampText,
  buildComponentCleanName,
  generateListingTitle,
  generateSubitoListing,
  generateEbayListing,
  generateVintedListing,
  generateAIPrompt,
  generateMarketplaceListings,
} from '../listingEngine';
import {
  Component,
  ComponentComputedState,
  ComponentEvent,
  WarrantyInfo,
  ListingOptions,
} from '../../types';

describe('Listing Engine (Generatore Annunci Vendita e Prompt IA)', () => {
  const mockComponent: Component = {
    id: 'comp-gpu-1',
    name: 'GeForce RTX 4080 16GB',
    brand: 'ASUS',
    model: 'ROG Strix OC',
    category: 'gpu',
    serialNumber: 'SN-4080-ROG-9988',
    notes: 'Sostituita solo per upgrade a 4090, perfetta mai polvere.',
    createdAt: '2023-05-10T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  };

  const mockComputed: ComponentComputedState = {
    component: mockComponent,
    status: 'IN_STORAGE',
    totalPurchaseCost: 1350,
    totalSaleRevenue: 0,
    netCost: 1350,
    daysInUse: 340, // circa 11 mesi
    daysOwned: 450,
    costPerDayInUse: 3.97,
  };

  const mockWarrantyActive: WarrantyInfo = {
    hasWarranty: true,
    status: 'active',
    expiryDate: '2026-11-20',
    daysRemaining: 790,
    humanLabel: 'Ancora 2 anni e 2 mesi',
    isExpiringSoon: false,
    isExpired: false,
    isActive: true,
  };

  const mockPurchaseEvent: ComponentEvent = {
    id: 'ev-purchase-1',
    componentId: 'comp-gpu-1',
    type: 'PURCHASE',
    price: 1350,
    store: 'Amazon IT',
    date: '2023-05-10',
    createdAt: '2023-05-10T10:00:00Z',
    warrantyExpiryDate: '2026-11-20',
  };

  const mockEvents = [mockPurchaseEvent];

  const defaultOptions: ListingOptions = {
    condition: 'like_new',
    hasOriginalBox: true,
    hasAccessories: true,
    smokeFreeNoMining: true,
    shippingOption: 'both',
    askingPrice: 850,
    customNotes: 'Disponibile per qualsiasi test prima della consegna.',
    handDeliveryCity: 'Roma',
  };

  describe('formatUsageDuration', () => {
    it('gestisce componente mai montato o con giorni <= 0', () => {
      expect(formatUsageDuration(0)).toBe('Mai montato (nuovo / tenuto di scorta a magazzino)');
      expect(formatUsageDuration(-5)).toBe('Mai montato (nuovo / tenuto di scorta a magazzino)');
    });

    it('gestisce 1 solo giorno di utilizzo', () => {
      expect(formatUsageDuration(1)).toBe('1 solo giorno di effettivo utilizzo');
    });

    it('gestisce intervalli inferiori a un mese (< 30 giorni)', () => {
      expect(formatUsageDuration(12)).toBe('12 giorni di effettivo utilizzo');
      expect(formatUsageDuration(25)).toBe('25 giorni di effettivo utilizzo');
    });

    it('gestisce intervalli in mesi (< 12 mesi)', () => {
      expect(formatUsageDuration(32)).toBe('circa 1 mese di effettivo utilizzo');
      expect(formatUsageDuration(180)).toBe('circa 6 mesi di effettivo utilizzo');
      expect(formatUsageDuration(335)).toBe('circa 11 mesi di effettivo utilizzo');
    });

    it('gestisce intervalli pluriennali con mesi rimanenti', () => {
      // 365 gg = circa 1 anno
      expect(formatUsageDuration(365)).toBe('circa 1 anno di effettivo utilizzo');
      // 400 gg = circa 1 anno e 1 mese
      expect(formatUsageDuration(400)).toBe('circa 1 anno e 1 mese di effettivo utilizzo');
      // 730 gg = circa 2 anni
      expect(formatUsageDuration(730)).toBe('circa 2 anni di effettivo utilizzo');
      // 800 gg = circa 2 anni e 2 mesi
      expect(formatUsageDuration(800)).toBe('circa 2 anni e 2 mesi di effettivo utilizzo');
    });
  });

  describe('clampText & buildComponentCleanName', () => {
    it('clampText non tronca parole a metà se possibile', () => {
      const text = 'ASUS ROG Strix GeForce RTX 4080 16GB Gaming OC con Scatola Originale';
      const clamped = clampText(text, 50);
      expect(clamped.length).toBeLessThanOrEqual(50);
      expect(clamped.endsWith(' ')).toBe(false);
      expect(text.startsWith(clamped)).toBe(true);
    });

    it('buildComponentCleanName non duplica il brand se già presente nel nome', () => {
      const compWithBrand: Component = {
        ...mockComponent,
        name: 'ASUS GeForce RTX 4080',
        brand: 'ASUS',
        model: 'ROG Strix',
      };
      const clean = buildComponentCleanName(compWithBrand);
      expect(clean).not.toContain('ASUS ASUS');
      expect(clean).toContain('ASUS GeForce RTX 4080 ROG Strix');
    });

    it('buildComponentCleanName aggiunge il brand se mancante dal nome', () => {
      const compWithoutBrand: Component = {
        ...mockComponent,
        name: 'GeForce RTX 4080',
        brand: 'ASUS',
        model: '',
      };
      const clean = buildComponentCleanName(compWithoutBrand);
      expect(clean).toBe('ASUS GeForce RTX 4080');
    });
  });

  describe('generateListingTitle', () => {
    it('rispetta il limite di 80 caratteri per eBay', () => {
      const title = generateListingTitle(mockComponent, defaultOptions, 'ebay', mockWarrantyActive);
      expect(title.length).toBeLessThanOrEqual(80);
      expect(title).toContain('ASUS');
      expect(title).toContain('4080');
    });

    it('rispetta il limite di 100 caratteri per Subito e include highlight scatola', () => {
      const title = generateListingTitle(mockComponent, defaultOptions, 'subito', mockWarrantyActive);
      expect(title.length).toBeLessThanOrEqual(100);
      expect(title).toContain('Scatola');
    });

    it('mostra highlight condizione quando la scatola originale non è presente', () => {
      const optsWithoutBox: ListingOptions = {
        ...defaultOptions,
        hasOriginalBox: false,
        condition: 'excellent',
      };
      const title = generateListingTitle(mockComponent, optsWithoutBox, 'subito', mockWarrantyActive);
      expect(title).toContain('Ottime Condizioni');
      expect(title).not.toContain('Scatola');
    });
  });

  describe('generateSubitoListing', () => {
    it('genera correttamente tutte le sezioni richieste per Subito.it con garanzia attiva e ricevuta', () => {
      const listing = generateSubitoListing(
        mockComponent,
        mockComputed,
        mockEvents,
        mockWarrantyActive,
        1, // 1 ricevuta presente
        defaultOptions
      );

      expect(listing.platform).toBe('subito');
      expect(listing.title).toBeTruthy();
      expect(listing.characterCount).toBeGreaterThan(100);

      // Verifica presenza sezioni chiave
      expect(listing.description).toContain('⚙️ STATO E UTILIZZO REALE');
      expect(listing.description).toContain('🛡️ GARANZIA E RICEVUTE');
      expect(listing.description).toContain('Negozio d\'acquisto: Amazon IT');
      expect(listing.description).toContain('📦 DOTAZIONE E IMBALLO');
      expect(listing.description).toContain('🚚 CONSEGNA E SPEDIZIONE');
      expect(listing.description).toContain('🤝 CONDIZIONI DI VENDITA');

      // Verifica dati dinamici
      expect(listing.description).toContain('circa 11 mesi di effettivo utilizzo');
      expect(listing.description).toContain('20/11/2026'); // Data garanzia formattata DD/MM/YYYY
      expect(listing.description).toContain('Ricevuta/Fattura d\'acquisto: presente');
      expect(listing.description).toContain('Scatola originale: PRESENTE');
      expect(listing.description).toContain('SN-4080-ROG-9988');
      expect(listing.description).toContain('€850.00');
      expect(listing.description).toContain('Roma');
      expect(listing.description).toContain('visto e piaciuto');
    });

    it('gestisce scenario con garanzia scaduta e senza scatola', () => {
      const warrantyExpired: WarrantyInfo = {
        hasWarranty: true,
        status: 'expired',
        expiryDate: '2023-01-01',
        daysRemaining: 0,
        humanLabel: 'Scaduta da oltre 1 anno',
        isExpiringSoon: false,
        isExpired: true,
        isActive: false,
      };

      const optsNoBox: ListingOptions = {
        ...defaultOptions,
        hasOriginalBox: false,
        hasAccessories: false,
        shippingOption: 'shipping_only',
        askingPrice: undefined,
      };

      const listing = generateSubitoListing(
        mockComponent,
        mockComputed,
        [],
        warrantyExpired,
        0, // Nessuna ricevuta
        optsNoBox
      );

      expect(listing.description).toContain('Garanzia del produttore: periodo terminato');
      expect(listing.description).toContain('Scatola originale: non presente');
      expect(listing.description).toContain('imballo antistatico');
      expect(listing.description).toContain('Spedizione tracciata con corriere espresso');
      expect(listing.description).not.toContain('Prezzo richiesto');
    });

    it('gestisce scenario solo ritiro a mano', () => {
      const optsHandOnly: ListingOptions = {
        ...defaultOptions,
        shippingOption: 'hand_only',
        handDeliveryCity: 'Milano',
      };

      const listing = generateSubitoListing(
        mockComponent,
        mockComputed,
        [],
        undefined,
        0,
        optsHandOnly
      );

      expect(listing.description).toContain('Solo ritiro a mano a Milano');
      expect(listing.description).not.toContain('TuttoSubito');
    });
  });

  describe('generateEbayListing', () => {
    it('genera il formato a blocchi orizzontali per eBay', () => {
      const listing = generateEbayListing(
        mockComponent,
        mockComputed,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      expect(listing.platform).toBe('ebay');
      expect(listing.description).toContain('===');
      expect(listing.description).toContain('--- SPECIFICHE DELL\'OGGETTO & CONDIZIONI ---');
      expect(listing.description).toContain('--- DESCRIZIONE & STATO OPERATIVO ---');
      expect(listing.description).toContain('--- GARANZIA & DOCUMENTI ---');
      expect(listing.description).toContain('Amazon IT');
      expect(listing.description).toContain('--- SPEDIZIONE & IMBALLAGGIO ---');
      expect(listing.description).toContain('--- CLAUSOLA DI VENDITA ---');
      expect(listing.description).toContain('SN-4080-ROG-9988');
    });
  });

  describe('generateVintedListing', () => {
    it('genera il formato conciso con hashtag pertinenti per Vinted', () => {
      const listing = generateVintedListing(
        mockComponent,
        mockComputed,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      expect(listing.platform).toBe('vinted');
      expect(listing.description).toContain('✨ Vendo');
      expect(listing.description).toContain('🔹 Condizioni:');
      expect(listing.description).toContain('🔹 Utilizzo effettivo:');
      expect(listing.description).toContain('🔹 Acquistato su: Amazon IT');
      expect(listing.description).toContain('🔹 Scatola originale: Sì');

      // Verifica presenza hashtag per categoria gpu e brand asus
      expect(listing.description).toContain('#gpu');
      expect(listing.description).toContain('#pcgaming');
      expect(listing.description).toContain('#asus');
    });
  });

  describe('generateAIPrompt', () => {
    it('genera il Super-Prompt ottimizzato per ChatGPT / Claude / Gemini', () => {
      const listing = generateAIPrompt(
        mockComponent,
        mockComputed,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      expect(listing.platform).toBe('ai_prompt');
      expect(listing.title).toContain('Prompt IA');
      expect(listing.description).toContain('Agisci come un esperto venditore ed appassionato di hardware PC');
      expect(listing.description).toContain('--- DATI CERTIFICATI DEL COMPONENTE ---');
      expect(listing.description).toContain('SN-4080-ROG-9988');
      expect(listing.description).toContain('Amazon IT');
      expect(listing.description).toContain('circa 11 mesi di effettivo utilizzo');
      expect(listing.description).toContain('--- FORMATO RICHIESTO ---');
    });
  });

  describe('generateMarketplaceListings', () => {
    it('genera contemporaneamente tutte e 4 le varianti di annuncio', () => {
      const all = generateMarketplaceListings(
        mockComponent,
        mockComputed,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      expect(all.subito).toBeDefined();
      expect(all.subito.platform).toBe('subito');
      expect(all.ebay).toBeDefined();
      expect(all.ebay.platform).toBe('ebay');
      expect(all.vinted).toBeDefined();
      expect(all.vinted.platform).toBe('vinted');
      expect(all.aiPrompt).toBeDefined();
      expect(all.aiPrompt.platform).toBe('ai_prompt');
    });
  });
});
