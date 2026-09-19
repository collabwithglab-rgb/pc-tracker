import { ComponentCategory } from './component';

export type RigSourceType = 'current' | 'checkpoint' | 'date';

export type RigSourceSelection =
  | { type: 'current' }
  | { type: 'checkpoint'; checkpointId: string }
  | { type: 'date'; date: string };

export interface RigNormalizedComponent {
  componentId: string;
  name: string;
  brand?: string;
  model?: string;
  category: ComponentCategory;
  slotOrLocation?: string;
  purchasePrice?: number;
  estimatedWatts?: number | null;
}

export type ComponentDiffStatus =
  | 'unchanged'
  | 'replaced'
  | 'added'
  | 'removed';

export interface ComponentDiffEntry {
  category: ComponentCategory;
  status: ComponentDiffStatus;
  oldComponent?: RigNormalizedComponent;
  newComponent?: RigNormalizedComponent;
  priceDifference?: number;
  wattsDifference?: number | null;
}

export interface RigComparisonSummary {
  costA: number;
  costB: number;
  deltaCost: number;
  deltaCostPercent: number | null;
  countA: number;
  countB: number;
  deltaCount: number;
  wattsA: number | null;
  wattsB: number | null;
  deltaWatts: number | null;
  replacedCount: number;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export interface RigComparisonResult {
  titleA: string;
  titleB: string;
  dateA?: string;
  dateB?: string;
  summary: RigComparisonSummary;
  entries: ComponentDiffEntry[];
}
