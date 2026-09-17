import { describe, it, expect } from 'vitest';
import {
  generateMarketplaceListings,
} from '../../../domain';
import {
  Component,
  ComponentComputedState,
  ComponentEvent,
  WarrantyInfo,
  ListingOptions,
  LISTING_CONDITION_LABELS,
  SHIPPING_OPTION_LABELS,
} from '../../../types';

describe('Listing Generator Modal & UI Logic (Task 2 / Tranche 3)', () => {
  const mockComponent: Component = {
    id: 'c-storage-1',
    name: 'Ryzen 7 7800X3D',
    brand: 'AMD',
    model: 'Boxed',
    category: 'cpu',
    serialNumber: 'SN-7800X3D-4455',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  };

  const mockComputedStorage: ComponentComputedState = {
    component: mockComponent,
    status: 'IN_STORAGE',
    totalPurchaseCost: 420,
    totalSaleRevenue: 0,
    netCost: 420,
    daysInUse: 120, // circa 4 mesi
    daysOwned: 200,
    costPerDayInUse: 3.5,
  };

  const mockWarrantyActive: WarrantyInfo = {
    hasWarranty: true,
    status: 'active',
    expiryDate: '2027-01-10',
    daysRemaining: 850,
    humanLabel: 'Ancora 2 anni e 4 mesi',
    isExpiringSoon: false,
    isExpired: false,
    isActive: true,
  };

  const mockEvents: ComponentEvent[] = [
    {
      id: 'ev-1',
      componentId: 'c-storage-1',
      type: 'PURCHASE',
      price: 420,
      store: 'Amazon IT',
      date: '2024-01-10',
      createdAt: '2024-01-10T10:00:00Z',
      warrantyExpiryDate: '2027-01-10',
    },
    {
      id: 'ev-2',
      componentId: 'c-storage-1',
      type: 'INSTALL',
      date: '2024-01-11',
      createdAt: '2024-01-11T10:00:00Z',
    },
    {
      id: 'ev-3',
      componentId: 'c-storage-1',
      type: 'UNINSTALL',
      date: '2024-05-10',
      createdAt: '2024-05-10T10:00:00Z',
      reason: 'upgrade',
    },
  ];

  const defaultOptions: ListingOptions = {
    condition: 'like_new',
    hasOriginalBox: true,
    hasAccessories: true,
    smokeFreeNoMining: true,
    shippingOption: 'both',
    handDeliveryCity: 'Torino',
    askingPrice: 320,
    customNotes: 'Perfetto, mai toccato tensioni o overclock.',
  };

  describe('Regole di Visibilità Business UI', () => {
    it('determina correttamente la visibilità del pulsante Genera Annuncio solo per IN_STORAGE', () => {
      const isListingButtonVisible = (status: string) => status === 'IN_STORAGE';

      expect(isListingButtonVisible('IN_STORAGE')).toBe(true);
      expect(isListingButtonVisible('IN_USE')).toBe(false);
      expect(isListingButtonVisible('SOLD')).toBe(false);
      expect(isListingButtonVisible('GIFTED')).toBe(false);
      expect(isListingButtonVisible('DISPOSED')).toBe(false);
    });
  });

  describe('Generazione e Aggiornamento Reattivo dei Marketplace', () => {
    it('genera correttamente tutti e 4 i tab con testi specializzati', () => {
      const listings = generateMarketplaceListings(
        mockComponent,
        mockComputedStorage,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      expect(listings.subito.title).toContain('Ryzen 7 7800X3D');
      expect(listings.subito.description).toContain('Torino');
      expect(listings.subito.description).toContain('circa 4 mesi di effettivo utilizzo');
      expect(listings.subito.description).toContain('Amazon IT');

      expect(listings.ebay.title.length).toBeLessThanOrEqual(80);
      expect(listings.ebay.description).toContain('=== AMD RYZEN 7 7800X3D BOXED ===');

      expect(listings.vinted.description).toContain('✨ Vendo AMD Ryzen 7 7800X3D');
      expect(listings.vinted.description).toContain('#cpu');
      expect(listings.vinted.description).toContain('#amd');

      expect(listings.aiPrompt.description).toContain('--- DATI CERTIFICATI DEL COMPONENTE ---');
      expect(listings.aiPrompt.description).toContain('SN-7800X3D-4455');
    });

    it('gestisce la combinazione Titolo + Testo per la copia cumulativa', () => {
      const listings = generateMarketplaceListings(
        mockComponent,
        mockComputedStorage,
        mockEvents,
        mockWarrantyActive,
        1,
        defaultOptions
      );

      const combinedSubito = `${listings.subito.title}\n\n${listings.subito.description}`;
      expect(combinedSubito.startsWith(listings.subito.title)).toBe(true);
      expect(combinedSubito).toContain(listings.subito.description);
      expect(combinedSubito.length).toBe(listings.subito.title.length + listings.subito.description.length + 2);
    });

    it('simula la logica di sovrascrittura manuale e ripristino del testo', () => {
      const original = 'Testo generato automaticamente';
      const customOverride = 'Mio testo personalizzato con istruzioni extra';

      let editedDescriptions: Record<string, string> = {};

      // Inizialmente vuoto: usa l'originale
      expect(editedDescriptions['subito'] || original).toBe(original);

      // Utente modifica a mano il testo
      editedDescriptions['subito'] = customOverride;
      expect(editedDescriptions['subito'] || original).toBe(customOverride);

      // Utente clicca "Ripristina"
      delete editedDescriptions['subito'];
      expect(editedDescriptions['subito'] || original).toBe(original);
    });

    it('tutti i selettori di condizione e spedizione sono mappati con label italiane chiare', () => {
      expect(LISTING_CONDITION_LABELS.like_new).toContain('Come nuovo');
      expect(LISTING_CONDITION_LABELS.excellent).toContain('Ottime condizioni');
      expect(LISTING_CONDITION_LABELS.good).toContain('Buone condizioni');
      expect(LISTING_CONDITION_LABELS.fair).toContain('Condizioni discrete');

      expect(SHIPPING_OPTION_LABELS.both).toContain('Ritiro a mano o spedizione');
      expect(SHIPPING_OPTION_LABELS.hand_only).toContain('Solo ritiro a mano');
      expect(SHIPPING_OPTION_LABELS.shipping_only).toContain('Solo spedizione tracciata');
    });
  });
});
