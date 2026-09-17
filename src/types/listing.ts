export type ListingCondition = 'like_new' | 'excellent' | 'good' | 'fair';

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  like_new: 'Come nuovo / Impeccabile',
  excellent: 'Ottime condizioni (perfettamente funzionante)',
  good: 'Buone condizioni (normali segni di utilizzo)',
  fair: 'Condizioni discrete (usura estetica visibile)',
};

export type ShippingOption = 'both' | 'hand_only' | 'shipping_only';

export const SHIPPING_OPTION_LABELS: Record<ShippingOption, string> = {
  both: 'Ritiro a mano o spedizione tracciata',
  hand_only: 'Solo ritiro a mano',
  shipping_only: 'Solo spedizione tracciata',
};

export type MarketplacePlatform = 'subito' | 'ebay' | 'vinted' | 'ai_prompt';

export interface ListingOptions {
  condition: ListingCondition;
  hasOriginalBox: boolean;
  hasAccessories: boolean;
  smokeFreeNoMining: boolean;
  shippingOption: ShippingOption;
  askingPrice?: number;
  customNotes?: string;
  handDeliveryCity?: string;
}

export interface MarketplaceListingOutput {
  title: string;
  description: string;
  platform: MarketplacePlatform;
  characterCount: number;
}

export interface AllMarketplaceListings {
  subito: MarketplaceListingOutput;
  ebay: MarketplaceListingOutput;
  vinted: MarketplaceListingOutput;
  aiPrompt: MarketplaceListingOutput;
}
