import { NavigationTarget } from './navigation';
import { ComponentCategory } from './component';

export type CommandCategory =
  | 'navigation'
  | 'deep-navigation'
  | 'components'
  | 'actions';

export const COMMAND_CATEGORY_LABELS: Record<CommandCategory, string> = {
  'navigation': 'Navigazione Principale',
  'deep-navigation': 'Sotto-Sezioni & Strumenti',
  'components': 'Componenti Hardware',
  'actions': 'Azioni Rapide',
};

export type CommandActionId =
  | 'new-movement'
  | 'new-maintenance'
  | 'new-tuning'
  | 'add-component'
  | 'quick-backup'
  | 'import-backup'
  | 'create-checkpoint'
  | 'compare-rigs'
  | 'open-wiki'
  | 'open-settings';

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  category: CommandCategory;
  keywords: string[];
  shortcutHint?: string;
  target?: NavigationTarget;
  actionId?: CommandActionId;
  componentMeta?: {
    id: string;
    brand: string;
    model: string;
    category: ComponentCategory;
    status?: string;
  };
}

export interface CommandSearchResult {
  item: CommandItem;
  score: number;
}
