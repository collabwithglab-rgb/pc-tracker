export type WikiCategory =
  | 'all'
  | 'getting-started'
  | 'event-lifecycle'
  | 'finances'
  | 'time-travel'
  | 'upgrades'
  | 'marketplace'
  | 'maintenance'
  | 'backup-privacy'
  | 'faq';

export type WikiBadge =
  | 'TUTORIAL'
  | 'CONCETTO CHIAVE'
  | 'TIP PRO'
  | 'FAQ'
  | 'FINANZE'
  | 'WINDOWS';

export type WikiActionType = 'new-movement' | 'quick-setup';

export interface WikiActionLink {
  label: string;
  targetSection?: string;
  actionType?: WikiActionType;
  iconName?: 'Cpu' | 'History' | 'ArrowUpRight' | 'Archive' | 'Tag' | 'BarChart3' | 'Wrench' | 'Settings' | 'Plus' | 'Sparkles';
}

export interface WikiFormula {
  title: string;
  equation: string;
  explanation: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  category: WikiCategory;
  badge: WikiBadge;
  readTime: string;
  summary: string;
  content: string[];
  steps?: string[];
  formula?: WikiFormula;
  tips?: string[];
  keywords: string[];
  actionLinks?: WikiActionLink[];
}

export interface WikiCategoryMeta {
  id: WikiCategory;
  label: string;
  description: string;
}
