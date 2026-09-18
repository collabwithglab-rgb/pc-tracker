import { ComponentCategory, Component } from './component';

export interface Upgrade {
  id: string; // UUID stabile
  date: string; // ISO 'YYYY-MM-DD'
  category: ComponentCategory;
  oldComponentId: string; // ID componente sostituito
  newComponentId: string; // ID componente subentrato
  notes?: string;
}

export interface UpgradeComputedSummary {
  upgrade: Upgrade;
  oldComponent?: Component;
  newComponent: Component;
  newComponentCost: number;
  oldComponentRecovered: number;
  netUpgradeCost: number; // newComponentCost - oldComponentRecovered
}

export interface NewComponentUpgradeInput {
  name: string;
  brand: string;
  model: string;
  category: ComponentCategory;
  purchasePrice?: number;
  store?: string;
  condition?: 'new' | 'used';
  warrantyExpiryDate?: string;
  notes?: string;
}

export interface UpgradeExecutionInput {
  oldComponentId: string;
  mode: 'existing' | 'new';
  newComponentId?: string; // se mode === 'existing'
  newComponentData?: NewComponentUpgradeInput; // se mode === 'new'
  date: string; // ISO 'YYYY-MM-DD'
  slotOrLocation?: string;
  notes?: string;

  // Vendita contestuale opzionale del vecchio componente
  saleOldComponent?: boolean;
  salePrice?: number;
  shippingCost?: number;
  fees?: number;
  platform?: string;
  buyer?: string;
  saleNotes?: string;
}

