import { ComponentCategory } from './component';

export interface CategorySpendingStats {
  category: ComponentCategory;
  totalSpent: number;
  percentage: number; // 0 - 100
  componentsCount: number;
}

export interface YearSpendingStats {
  year: string;
  totalSpent: number;
  percentage: number; // 0 - 100
  isPeakYear: boolean;
}

export interface LongevityStats {
  mostUsedComponent: {
    id: string;
    name: string;
    category: ComponentCategory;
    daysInUse: number;
  } | null;
  avgDaysInUseActive: number; // Media dei componenti effettivamente usati (daysInUse > 0)
  avgDaysInUseAll: number; // Media su tutti i componenti
  medianDaysInUse: number; // Mediana giorni d'uso
  neverMountedCount: number; // Numero di componenti a 0 giorni d'uso (mai montati / scorta)
  bestCostPerDayComponent: {
    id: string;
    name: string;
    category: ComponentCategory;
    daysInUse: number;
    costPerDay: number;
    netCost: number;
  } | null;
  componentDurations: Array<{
    id: string;
    name: string;
    category: ComponentCategory;
    daysInUse: number;
    costPerDay: number | null; // null se 0 giorni
    status: string;
  }>;
}

export interface TopExpensiveComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  totalHistoricalCost: number; // PURCHASE + EXTRA_EXPENSE
  netCost: number; // totalHistoricalCost - netSaleRevenue
  isSold: boolean;
}

export interface SoldComponentStats {
  id: string;
  name: string;
  category: ComponentCategory;
  totalCost: number;
  netRevenue: number;
  deltaBalance: number; // netRevenue - totalCost (negativo se perdita, positivo se guadagno)
  recoveryPercentage: number; // (netRevenue / totalCost) * 100
}

export interface UpgradeStatsSummary {
  totalUpgrades: number;
  totalInvested: number;
  totalRecovered: number;
  totalNetCost: number;
  mostUpgradedCategory: ComponentCategory | null;
  categoryCount: Partial<Record<ComponentCategory, number>>;
}

export interface RigStatsSummary {
  timeRange: {
    firstYear: string | null;
    lastYear: string | null;
    totalYearsCount: number;
    totalComponentsCount: number;
  };
  financial: {
    totalPurchased: number;
    totalRecovered: number;
    historicalNetCost: number;
    currentRigCost: number;
    soldComponentsCount: number;
    totalCostOfSold: number;
    recoveryRateOnSold: number; // Percentuale recuperata sui soli componenti venduti
  };
  categories: CategorySpendingStats[];
  years: YearSpendingStats[];
  peakYear: YearSpendingStats | null;
  longevity: LongevityStats;
  topExpensive: TopExpensiveComponent[];
  soldComponents: SoldComponentStats[];
  upgrades: UpgradeStatsSummary;
}
