import {
  Component,
  ComponentCategory,
  ComponentEvent,
  ComponentStatus,
  InstallEvent,
  PurchaseEvent,
  UninstallEvent,
  SaleEvent,
  ExtraExpenseEvent,
  GiftEvent,
  DisposalEvent,
  UpgradeExecutionInput,
} from '../types';
import { sortEventsChronologically, computeComponentStatus } from './lifecycleEngine';

export const VALID_CATEGORIES: ComponentCategory[] = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case',
  'cooling',
  'monitor',
  'peripherals',
  'accessories',
  'other',
];

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Verifica se una stringa rappresenta una data valida nel formato rigoroso ISO YYYY-MM-DD.
 * Controlla sia la conformità al formato regex sia la validità del calendario gregoriano (es. rifiuta 2024-02-31 o 2023-02-29).
 */
export function isValidISODateString(dateStr: string | undefined | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateStr.trim().match(isoRegex);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Valida i campi di un componente.
 */
export function validateComponent(
  data: Partial<Component>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // Nome obbligatorio e non vuoto
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Il nome del componente è obbligatorio.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Il nome del componente deve contenere almeno 2 caratteri.';
  }

  // Categoria obbligatoria e valida
  if (!data.category) {
    errors.category = 'La categoria è obbligatoria.';
  } else if (!VALID_CATEGORIES.includes(data.category)) {
    errors.category = 'Categoria non valida.';
  }

  // Marca non vuota se specificata
  if (data.brand !== undefined && data.brand.trim().length === 0) {
    errors.brand = 'La marca non può essere uno spazio vuoto.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida i campi di un evento PURCHASE contestuale o manuale.
 */
export function validatePurchaseEvent(
  data: Partial<PurchaseEvent>,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // Integrità referenziale se gli ID dei componenti sono forniti
  if (data.componentId && existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente di riferimento inesistente (${data.componentId}).`;
  }

  // Prezzo obbligatorio e non negativo
  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.price = 'Il prezzo di acquisto è obbligatorio.';
  } else if (data.price < 0) {
    errors.price = 'Il prezzo di acquisto non può essere negativo.';
  }

  // Data evento obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di acquisto è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'La data inserita non è valida (formato atteso: YYYY-MM-DD).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di INSTALLAZIONE e verifica le regole di lifecycle del pezzo.
 */
export function validateInstallEvent(
  data: Partial<InstallEvent>,
  currentStatus: ComponentStatus,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  // Regola di Lifecycle 1: Non si può installare un componente già IN_USE
  if (currentStatus === 'IN_USE') {
    errors.status = 'Il componente è già attualmente montato nel PC. È necessario rimuoverlo prima di una nuova installazione.';
  }

  // Regola di Lifecycle 2: Non si può installare un componente terminale
  if (currentStatus === 'SOLD') {
    errors.status = 'Impossibile installare un componente già venduto.';
  } else if (currentStatus === 'GIFTED') {
    errors.status = 'Impossibile installare un componente regalato.';
  } else if (currentStatus === 'DISPOSED') {
    errors.status = 'Impossibile installare un componente smaltito.';
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di installazione è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data di installazione non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di RIMOZIONE (UNINSTALL) e verifica che il pezzo sia attualmente montato.
 */
export function validateUninstallEvent(
  data: Partial<UninstallEvent>,
  currentStatus: ComponentStatus,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  // Regola di Lifecycle: Si può rimuovere solo un componente attualmente IN_USE
  if (currentStatus !== 'IN_USE') {
    errors.status = 'Il componente non risulta montato nel PC; impossibile rimuoverlo.';
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di rimozione è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data di rimozione non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di VENDITA (SALE) e verifica che il componente non sia già dismesso.
 */
export function validateSaleEvent(
  data: Partial<SaleEvent>,
  currentStatus: ComponentStatus,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  // Regola di Lifecycle: non si può vendere un pezzo già venduto, regalato o smaltito
  if (currentStatus === 'SOLD') {
    errors.status = 'Questo componente risulta già venduto.';
  } else if (currentStatus === 'GIFTED') {
    errors.status = 'Impossibile vendere un componente già regalato.';
  } else if (currentStatus === 'DISPOSED') {
    errors.status = 'Impossibile vendere un componente già smaltito.';
  }

  // Prezzo obbligatorio e non negativo
  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.price = 'Il prezzo di vendita è obbligatorio.';
  } else if (data.price < 0) {
    errors.price = 'Il prezzo di vendita non può essere negativo.';
  }

  // Spese di spedizione non negative se inserite
  if (data.shippingCost !== undefined && (isNaN(data.shippingCost) || data.shippingCost < 0)) {
    errors.shippingCost = 'Le spese di spedizione non possono essere negative.';
  }

  // Commissioni non negative se inserite
  if (data.fees !== undefined && (isNaN(data.fees) || data.fees < 0)) {
    errors.fees = 'Le commissioni non possono essere negative.';
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di vendita è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data di vendita non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di SPESA EXTRA (accessori, cavi, modding, pad termici).
 */
export function validateExtraExpenseEvent(
  data: Partial<ExtraExpenseEvent>,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  // Importo obbligatorio e strettamente positivo
  if (data.amount === undefined || data.amount === null || isNaN(data.amount)) {
    errors.amount = 'L’importo della spesa è obbligatorio.';
  } else if (data.amount <= 0) {
    errors.amount = 'L’importo della spesa deve essere maggiore di zero.';
  }

  // Descrizione obbligatoria
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'La descrizione della spesa è obbligatoria.';
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data della spesa è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data della spesa non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di REGALO (GIFT).
 */
export function validateGiftEvent(
  data: Partial<GiftEvent>,
  currentStatus: ComponentStatus,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  if (currentStatus === 'SOLD') {
    errors.status = 'Impossibile regalare un componente già venduto.';
  } else if (currentStatus === 'GIFTED') {
    errors.status = 'Questo componente risulta già regalato.';
  } else if (currentStatus === 'DISPOSED') {
    errors.status = 'Impossibile regalare un componente già smaltito.';
  }

  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di donazione è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data di donazione non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un evento di SMALTIMENTO (DISPOSAL).
 */
export function validateDisposalEvent(
  data: Partial<DisposalEvent>,
  currentStatus: ComponentStatus,
  existingComponentIds?: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = 'ID componente obbligatorio.';
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = `Componente ${data.componentId} inesistente.`;
  }

  if (currentStatus === 'SOLD') {
    errors.status = 'Impossibile smaltire un componente già venduto.';
  } else if (currentStatus === 'GIFTED') {
    errors.status = 'Impossibile smaltire un componente già regalato.';
  } else if (currentStatus === 'DISPOSED') {
    errors.status = 'Questo componente risulta già smaltito.';
  }

  const validMethods = ['recycled', 'broken_discarded', 'eco_center'];
  if (!data.disposalMethod || !validMethods.includes(data.disposalMethod)) {
    errors.disposalMethod = 'Metodo di smaltimento non valido.';
  }

  if (!data.date || data.date.trim().length === 0) {
    errors.date = 'La data di smaltimento è obbligatoria.';
  } else if (!isValidISODateString(data.date)) {
    errors.date = 'Data di smaltimento non valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida un qualsiasi evento generico e garantisce l'integrità referenziale.
 */
export function validateEvent(
  event: Partial<ComponentEvent>,
  existingComponentIds: Set<string>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!event.componentId) {
    errors.componentId = 'ID componente mancante per questo evento.';
  } else if (!existingComponentIds.has(event.componentId)) {
    errors.componentId = `Integrità referenziale violata: componente ${event.componentId} non trovato.`;
  }

  if (!event.date || event.date.trim().length === 0) {
    errors.date = 'Data evento obbligatoria.';
  } else if (!isValidISODateString(event.date)) {
    errors.date = 'Data evento non valida.';
  }

  if (!event.type) {
    errors.type = 'Tipo evento non specificato.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida la coerenza dell'intera sequenza di ciclo di vita di un componente.
 * Regole formali di dominio:
 * 1. Non possono esistere due montaggi (INSTALL) consecutivi senza uno smontaggio (UNINSTALL) intermedio.
 * 2. Non si può smontare (UNINSTALL) un componente che non risulta precedentemente montato.
 * 3. Nessun evento può verificarsi cronologicamente dopo uno stato terminale (SALE, GIFT, DISPOSAL).
 */
export function validateLifecycleSequence(events: ComponentEvent[]): {
  isValid: boolean;
  error?: string;
} {
  const sorted = sortEventsChronologically(events);
  let isMounted = false;
  let terminalEvent: ComponentEvent | null = null;

  for (const ev of sorted) {
    if (terminalEvent) {
      return {
        isValid: false,
        error: `L'evento ${ev.type} del ${ev.date} non può avvenire dopo che il componente è stato dismesso (${terminalEvent.type} del ${terminalEvent.date}).`,
      };
    }

    if (ev.type === 'INSTALL') {
      if (isMounted) {
        return {
          isValid: false,
          error: `Evento di montaggio del ${ev.date} non valido: il componente risulta già montato nel PC.`,
        };
      }
      isMounted = true;
    } else if (ev.type === 'UNINSTALL') {
      if (!isMounted) {
        return {
          isValid: false,
          error: `Evento di rimozione del ${ev.date} non valido: il componente non risulta montato nel PC alla data indicata.`,
        };
      }
      isMounted = false;
    } else if (ev.type === 'SALE' || ev.type === 'GIFT' || ev.type === 'DISPOSAL') {
      terminalEvent = ev;
      isMounted = false;
    }
  }

  return { isValid: true };
}

/**
 * Verifica se l'eliminazione di uno specifico evento preserva l'integrità del ciclo di vita.
 * Se la sequenza residua viola le regole del ciclo di vita, l'eliminazione viene impedita
 * fornendo una spiegazione trasparente e comprensibile.
 */
export function canDeleteEvent(
  eventIdToDelete: string,
  componentEvents: ComponentEvent[]
): { canDelete: boolean; error?: string } {
  const target = componentEvents.find((e) => e.id === eventIdToDelete);
  if (!target) {
    return { canDelete: false, error: 'Evento non trovato nel componente.' };
  }

  const remaining = componentEvents.filter((e) => e.id !== eventIdToDelete);
  const result = validateLifecycleSequence(remaining);
  if (!result.isValid) {
    return {
      canDelete: false,
      error: `Impossibile eliminare l'evento: ${result.error}`,
    };
  }

  return { canDelete: true };
}

/**
 * Verifica se la modifica di un evento preserva l'integrità del ciclo di vita.
 */
export function canUpdateEvent(
  updatedEvent: ComponentEvent,
  componentEvents: ComponentEvent[]
): { canUpdate: boolean; error?: string } {
  const updatedList = componentEvents.map((e) =>
    e.id === updatedEvent.id ? updatedEvent : e
  );
  const result = validateLifecycleSequence(updatedList);
  if (!result.isValid) {
    return {
      canUpdate: false,
      error: `Modifica non consentita: ${result.error}`,
    };
  }

  return { canUpdate: true };
}

/**
 * Valida in modo rigoroso l'operazione di Upgrade generazionale.
 * Verifica la non-terminalità del vecchio componente (IN_USE e IN_STORAGE sono permessi),
 * la coerenza del nuovo componente (in magazzino o appena creato), la validità temporale
 * e la correttezza dell'eventuale vendita contestuale.
 */
export function validateUpgrade(
  input: UpgradeExecutionInput,
  components: Component[],
  events: ComponentEvent[]
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // 1. Validazione vecchio componente
  if (!input.oldComponentId) {
    errors.oldComponentId = 'Seleziona il componente da sostituire.';
  } else {
    const oldComp = components.find((c) => c.id === input.oldComponentId);
    if (!oldComp) {
      errors.oldComponentId = 'Il componente da sostituire non esiste nel database.';
    } else {
      const oldEvents = events.filter((e) => e.componentId === input.oldComponentId);
      const oldStatus = computeComponentStatus(oldEvents);

      if (oldStatus === 'SOLD') {
        errors.oldComponentId = 'Impossibile sostituire un componente già venduto.';
      } else if (oldStatus === 'GIFTED') {
        errors.oldComponentId = 'Impossibile sostituire un componente già regalato.';
      } else if (oldStatus === 'DISPOSED') {
        errors.oldComponentId = 'Impossibile sostituire un componente già smaltito.';
      }

      // Controllo temporale: data upgrade >= data primo acquisto vecchio componente
      const oldPurchases = oldEvents.filter((e) => e.type === 'PURCHASE');
      if (oldPurchases.length > 0) {
        const sortedPurchases = sortEventsChronologically(oldPurchases);
        if (input.date && input.date < sortedPurchases[0].date) {
          errors.date = `La data dell'upgrade (${input.date}) non può precedere l'acquisto del vecchio componente (${sortedPurchases[0].date}).`;
        }
      }
    }
  }

  // 2. Validazione modalità e nuovo componente
  if (input.mode === 'existing') {
    if (!input.newComponentId) {
      errors.newComponentId = 'Seleziona il nuovo componente dal magazzino.';
    } else if (input.oldComponentId && input.newComponentId === input.oldComponentId) {
      errors.newComponentId = 'Il nuovo componente non può coincidere con il componente da sostituire.';
    } else {
      const newComp = components.find((c) => c.id === input.newComponentId);
      if (!newComp) {
        errors.newComponentId = 'Il componente subentrante selezionato non esiste.';
      } else {
        const newEvents = events.filter((e) => e.componentId === input.newComponentId);
        const newStatus = computeComponentStatus(newEvents);

        if (newStatus === 'SOLD') {
          errors.newComponentId = 'Il componente selezionato risulta già venduto.';
        } else if (newStatus === 'GIFTED') {
          errors.newComponentId = 'Il componente selezionato risulta già regalato.';
        } else if (newStatus === 'DISPOSED') {
          errors.newComponentId = 'Il componente selezionato risulta già smaltito.';
        } else if (newStatus === 'IN_USE') {
          errors.newComponentId = 'Il componente selezionato è già attualmente montato nel PC.';
        }

        // Controllo temporale: data upgrade >= data acquisto nuovo componente
        const newPurchases = newEvents.filter((e) => e.type === 'PURCHASE');
        if (newPurchases.length > 0) {
          const sortedPurchases = sortEventsChronologically(newPurchases);
          if (input.date && input.date < sortedPurchases[0].date) {
            errors.date = `La data dell'upgrade (${input.date}) non può precedere l'acquisto del nuovo componente (${sortedPurchases[0].date}).`;
          }
        }
      }
    }
  } else if (input.mode === 'new') {
    if (!input.newComponentData) {
      errors.newComponentData = 'I dati del nuovo componente sono obbligatori.';
    } else {
      const data = input.newComponentData;
      if (!data.name || data.name.trim().length < 2) {
        errors.newComponentName = 'Il nome del nuovo componente deve contenere almeno 2 caratteri.';
      }
      if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
        errors.newComponentCategory = 'Categoria del nuovo componente non valida.';
      }
      if (data.purchasePrice !== undefined && (isNaN(data.purchasePrice) || data.purchasePrice < 0)) {
        errors.newComponentPrice = 'Il prezzo di acquisto del nuovo pezzo non può essere negativo.';
      }
    }
  } else {
    errors.mode = 'Modalità di upgrade non valida.';
  }

  // 3. Validazione Data
  if (!input.date || input.date.trim().length === 0) {
    errors.date = 'La data dell’upgrade è obbligatoria.';
  } else if (!isValidISODateString(input.date)) {
    errors.date = 'Data dell’upgrade non valida (formato atteso: YYYY-MM-DD).';
  }

  // 4. Validazione Vendita Contestuale (se richiesta)
  if (input.saleOldComponent) {
    if (input.salePrice === undefined || input.salePrice === null || isNaN(input.salePrice) || input.salePrice < 0) {
      errors.salePrice = 'Il prezzo di vendita del vecchio pezzo deve essere un valore numerico non negativo.';
    }
    if (input.shippingCost !== undefined && (isNaN(input.shippingCost) || input.shippingCost < 0)) {
      errors.shippingCost = 'Le spese di spedizione non possono essere negative.';
    }
    if (input.fees !== undefined && (isNaN(input.fees) || input.fees < 0)) {
      errors.fees = 'Le commissioni non possono essere negative.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

