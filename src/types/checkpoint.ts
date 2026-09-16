import { ComponentCategory } from './component';

/**
 * Modalità o motivazione che ha originato la creazione del Checkpoint.
 */
export type CheckpointTrigger =
  | 'manual'
  | 'suggested_upgrade'
  | 'suggested_major';

export const CHECKPOINT_TRIGGER_LABELS: Record<CheckpointTrigger, string> = {
  manual: 'Manuale',
  suggested_upgrade: 'Post-Upgrade',
  suggested_major: 'Modifica Strutturale',
};

/**
 * Snapshot leggero di un singolo componente montato nel PC al momento del Checkpoint.
 * Congela i metadati descrittivi ed economici essenziali per garantire fedeltà storica
 * anche in caso di successive modifiche o eliminazioni del Componente originale.
 */
export interface CheckpointComponentEntry {
  /** Riferimento opzionale (soft link) all'ID del componente */
  componentId: string;
  /** Nome descrittivo congelato (es. "AMD Ryzen 7 7800X3D") */
  name: string;
  /** Marca congelata (es. "AMD") */
  brand: string;
  /** Modello congelato (es. "100-100000910WOF") */
  model: string;
  /** Categoria hardware */
  category: ComponentCategory;
  /** Posizione/slot fisico congelato al momento del checkpoint (es. "Slot M.2 1", "PCIe 1") */
  slotOrLocation?: string;
  /** Costo storico d'acquisto congelato (in Euro) */
  purchasePrice?: number;
  /** Note opzionali congelate al momento del salvataggio */
  notes?: string;
}

/**
 * Riepilogo statistico e finanziario congelato del Checkpoint.
 */
export interface CheckpointSummary {
  /** Numero totale di componenti fisicamente montati */
  componentCount: number;
  /** Somma dei costi di acquisto storici di tutti i componenti montati nel checkpoint */
  rigPurchaseCost: number;
  /** Conteggio opzionale ripartito per categoria hardware */
  categoryCounts?: Partial<Record<ComponentCategory, number>>;
}

/**
 * Entità Checkpoint: rappresenta una fotografia immutabile e volontaria della configurazione
 * del PC salvata in un determinato punto della storia.
 *
 * NOTA ARCHITETTURALE:
 * Il Checkpoint NON è una nuova Source of Truth e non sostituisce il modello Event-driven.
 * Time Travel = verità storica ricostruita dinamicamente da Events + Components.
 * Checkpoint = memoria storica esplicita ed immutabile salvata dall'utente.
 */
export interface Checkpoint {
  /** Identificativo univoco e stabile (UUID v4) */
  id: string;
  /** Nome significativo assegnato dall'utente (es. "Build Iniziale AM5", "Upgrade RTX 4090") */
  name: string;
  /** Data di riferimento nel formato ISO 'YYYY-MM-DD' */
  referenceDate: string;
  /** Timestamp ISO di creazione del checkpoint */
  createdAt: string;
  /** Note o commenti contestuali opzionali */
  notes?: string;
  /** Motivazione della creazione (manuale, post-upgrade, modifica maggiore) */
  trigger: CheckpointTrigger;
  /**
   * Eventuale ID dell'evento a cui il checkpoint è agganciato cronologicamente.
   * Risolve l'ambiguità in giornate con più eventi consecutivi (es. smontaggio e montaggio).
   */
  anchorEventId?: string | null;
  /** Eventuale ID dell'upgrade associato (se trigger === 'suggested_upgrade') */
  relatedUpgradeId?: string | null;
  /** Snapshot immutabile dei componenti che componevano il PC al momento del checkpoint */
  componentsSnapshot: CheckpointComponentEntry[];
  /** Metriche di sintesi congelate */
  summary: CheckpointSummary;
}

/**
 * Parametri di input per la creazione guidata o manuale di un Checkpoint.
 */
export interface CreateCheckpointInput {
  name: string;
  referenceDate?: string;
  notes?: string;
  trigger?: CheckpointTrigger;
  anchorEventId?: string | null;
  relatedUpgradeId?: string | null;
}

/**
 * Risultato dell'analisi di discrepanza informativa tra il Checkpoint congelato
 * e la configurazione ricostruita dinamicamente dal motore degli eventi (History Engine).
 */
export interface CheckpointDiscrepancy {
  hasDiscrepancies: boolean;
  missingInReconstruction: CheckpointComponentEntry[];
  addedInReconstruction: Array<{ id: string; name: string; category: ComponentCategory }>;
  costDifference: number;
}
