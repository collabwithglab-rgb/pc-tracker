/**
 * Tipi per l'Optimization Engine e le Raccomandazioni di Sistema (PC Care Center - Tranche 3)
 */

export type OptimizationRisk = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

export type ActionAvailability =
  | 'READ_ONLY'           // Sola lettura o diagnostica (nessuna modifica al sistema)
  | 'ONE_CLICK'           // Esecuzione immediata in 1-click in user-space non distruttiva
  | 'USER_CONFIRMED'      // Azione mutante che richiede conferma esplicita prima di procedere
  | 'ASSISTED'            // Richiede autorizzazione esplicita Windows UAC o assistita da OS
  | 'MANUAL'              // Guida passo-passo per l'utente (es. BIOS/UEFI, manutenzione fisica)
  // Alias retrocompatibili
  | 'AUTOMATED_SAFE'
  | 'ASSISTED_UAC'
  | 'MANUAL_GUIDED'
  | 'EXTERNAL_LINK';

export type RollbackAvailability =
  | 'AUTOMATIC'           // L'applicazione può ripristinare il valore precedente in 1-click
  | 'MANUAL_RESTORE'      // Ripristinabile tramite Punto di Ripristino di Windows
  | 'NOT_APPLICABLE';     // Operazione di pulizia o diagnostica innocua e non-distruttiva

export type OptimizationCategory =
  | 'storage'
  | 'maintenance'
  | 'system'
  | 'performance'
  | 'security'
  | 'thermal';

export interface OptimizationRecommendation {
  id: string;                     // Identificativo univoco deterministico
  title: string;
  category: OptimizationCategory;
  reason: string;                 // Perché viene proposta
  evidence: string;               // Fatto oggettivo o metrica che la motiva
  expectedBenefit: string;        // Guadagno atteso concreto (spazio, temperature, stabilità)
  risk: OptimizationRisk;
  confidence: 'HIGH' | 'MEDIUM';
  actionAvailability: ActionAvailability;
  rollbackAvailability: RollbackAvailability;
  actionId?: string;              // Riferimento al catalogo azioni native Windows
  parameters?: Record<string, string | number | boolean>;
}

export interface OptimizationReport {
  evaluatedAt: string;
  recommendations: OptimizationRecommendation[];
  totalCount: number;
  byCategory: Record<OptimizationCategory, number>;
  byRisk: Record<OptimizationRisk, number>;
}
