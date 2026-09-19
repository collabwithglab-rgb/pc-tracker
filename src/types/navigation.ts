export type NavSection =
  | 'dashboard'
  | 'current-rig'
  | 'time-travel'
  | 'archive'
  | 'upgrades'
  | 'marketplace'
  | 'stats'
  | 'maintenance'
  | 'wiki'
  | 'settings';

export type MaintenanceTab = 'registro' | 'scan' | 'tools' | 'tuning';
export type SettingsTab = 'preferences' | 'appearance' | 'backup' | 'data';
export type MarketplaceTab = 'storage' | 'sold';

export type NavigationSubTab =
  | MaintenanceTab
  | SettingsTab
  | MarketplaceTab;

export const VALID_MAINTENANCE_TABS: readonly MaintenanceTab[] = [
  'registro',
  'scan',
  'tools',
  'tuning',
] as const;

export const VALID_SETTINGS_TABS: readonly SettingsTab[] = [
  'preferences',
  'appearance',
  'backup',
  'data',
] as const;

export const VALID_MARKETPLACE_TABS: readonly MarketplaceTab[] = [
  'storage',
  'sold',
] as const;

export type NavigationTarget =
  | {
      section: 'maintenance';
      subTab?: MaintenanceTab;
      componentId?: never;
      referrer?: NavSection;
    }
  | {
      section: 'settings';
      subTab?: SettingsTab;
      componentId?: never;
      referrer?: NavSection;
    }
  | {
      section: 'marketplace';
      subTab?: MarketplaceTab;
      componentId?: never;
      referrer?: NavSection;
    }
  | {
      section: 'archive';
      subTab?: never;
      componentId?: string;
      referrer?: NavSection;
    }
  | {
      section: 'wiki';
      subTab?: never;
      componentId?: never;
      referrer?: NavSection;
      articleId?: string;
    }
  | {
      section: 'dashboard' | 'current-rig' | 'time-travel' | 'upgrades' | 'stats';
      subTab?: never;
      componentId?: string;
      referrer?: NavSection;
    };
