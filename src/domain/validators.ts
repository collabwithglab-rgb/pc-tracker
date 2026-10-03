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
  SupportedLocale,
} from '../types';
import { sortEventsChronologically, computeComponentStatus } from './lifecycleEngine';
import { translate } from '../locales/translator';

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
 * Nota i18n: ogni validatore accetta un parametro finale opzionale `locale`
 * (default 'it'). I messaggi sono risolti dal traduttore puro, quindi il dominio
 * resta privo di dipendenze React e i messaggi seguono la lingua dell'utente.
 */

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
  data: Partial<Component>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // Nome obbligatorio e non vuoto
  if (!data.name || data.name.trim().length === 0) {
    errors.name = translate(locale, 'val_component_name_required');
  } else if (data.name.trim().length < 2) {
    errors.name = translate(locale, 'val_component_name_min');
  }

  // Categoria obbligatoria e valida
  if (!data.category) {
    errors.category = translate(locale, 'val_category_required');
  } else if (!VALID_CATEGORIES.includes(data.category)) {
    errors.category = translate(locale, 'val_category_invalid');
  }

  // Marca non vuota se specificata
  if (data.brand !== undefined && data.brand.trim().length === 0) {
    errors.brand = translate(locale, 'val_brand_blank');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // Integrità referenziale se gli ID dei componenti sono forniti
  if (data.componentId && existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_ref_component_missing', { id: data.componentId });
  }

  // Prezzo obbligatorio e non negativo
  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.price = translate(locale, 'val_purchase_price_required');
  } else if (data.price < 0) {
    errors.price = translate(locale, 'val_purchase_price_negative');
  }

  // Data evento obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_purchase_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_date_invalid_format');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  // Regola di Lifecycle 1: Non si può installare un componente già IN_USE
  if (currentStatus === 'IN_USE') {
    errors.status = translate(locale, 'val_install_already_mounted');
  }

  // Regola di Lifecycle 2: Non si può installare un componente terminale
  if (currentStatus === 'SOLD') {
    errors.status = translate(locale, 'val_install_sold');
  } else if (currentStatus === 'GIFTED') {
    errors.status = translate(locale, 'val_install_gifted');
  } else if (currentStatus === 'DISPOSED') {
    errors.status = translate(locale, 'val_install_disposed');
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_install_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_install_date_invalid');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  // Regola di Lifecycle: Si può rimuovere solo un componente attualmente IN_USE
  if (currentStatus !== 'IN_USE') {
    errors.status = translate(locale, 'val_uninstall_not_mounted');
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_uninstall_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_uninstall_date_invalid');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  // Regola di Lifecycle: non si può vendere un pezzo già venduto, regalato o smaltito
  if (currentStatus === 'SOLD') {
    errors.status = translate(locale, 'val_sale_already_sold');
  } else if (currentStatus === 'GIFTED') {
    errors.status = translate(locale, 'val_sale_gifted');
  } else if (currentStatus === 'DISPOSED') {
    errors.status = translate(locale, 'val_sale_disposed');
  }

  // Prezzo obbligatorio e non negativo
  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.price = translate(locale, 'val_sale_price_required');
  } else if (data.price < 0) {
    errors.price = translate(locale, 'val_sale_price_negative');
  }

  // Spese di spedizione non negative se inserite
  if (data.shippingCost !== undefined && (isNaN(data.shippingCost) || data.shippingCost < 0)) {
    errors.shippingCost = translate(locale, 'val_shipping_negative');
  }

  // Commissioni non negative se inserite
  if (data.fees !== undefined && (isNaN(data.fees) || data.fees < 0)) {
    errors.fees = translate(locale, 'val_fees_negative');
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_sale_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_sale_date_invalid');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  // Importo obbligatorio e strettamente positivo
  if (data.amount === undefined || data.amount === null || isNaN(data.amount)) {
    errors.amount = translate(locale, 'val_expense_amount_required');
  } else if (data.amount <= 0) {
    errors.amount = translate(locale, 'val_expense_amount_positive');
  }

  // Descrizione obbligatoria
  if (!data.description || data.description.trim().length === 0) {
    errors.description = translate(locale, 'val_expense_description_required');
  }

  // Data obbligatoria e valida
  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_expense_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_expense_date_invalid');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  if (currentStatus === 'SOLD') {
    errors.status = translate(locale, 'val_gift_sold');
  } else if (currentStatus === 'GIFTED') {
    errors.status = translate(locale, 'val_gift_already_gifted');
  } else if (currentStatus === 'DISPOSED') {
    errors.status = translate(locale, 'val_gift_disposed');
  }

  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_gift_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_gift_date_invalid');
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
  existingComponentIds?: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!data.componentId) {
    errors.componentId = translate(locale, 'val_component_id_required');
  } else if (existingComponentIds && !existingComponentIds.has(data.componentId)) {
    errors.componentId = translate(locale, 'val_component_not_exists', { id: data.componentId });
  }

  if (currentStatus === 'SOLD') {
    errors.status = translate(locale, 'val_disposal_sold');
  } else if (currentStatus === 'GIFTED') {
    errors.status = translate(locale, 'val_disposal_gifted');
  } else if (currentStatus === 'DISPOSED') {
    errors.status = translate(locale, 'val_disposal_already_disposed');
  }

  const validMethods = ['recycled', 'broken_discarded', 'eco_center'];
  if (!data.disposalMethod || !validMethods.includes(data.disposalMethod)) {
    errors.disposalMethod = translate(locale, 'val_disposal_method_invalid');
  }

  if (!data.date || data.date.trim().length === 0) {
    errors.date = translate(locale, 'val_disposal_date_required');
  } else if (!isValidISODateString(data.date)) {
    errors.date = translate(locale, 'val_disposal_date_invalid');
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
  existingComponentIds: Set<string>,
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  if (!event.componentId) {
    errors.componentId = translate(locale, 'val_event_component_missing');
  } else if (!existingComponentIds.has(event.componentId)) {
    errors.componentId = translate(locale, 'val_event_ref_violation', { id: event.componentId });
  }

  if (!event.date || event.date.trim().length === 0) {
    errors.date = translate(locale, 'val_event_date_required');
  } else if (!isValidISODateString(event.date)) {
    errors.date = translate(locale, 'val_event_date_invalid');
  }

  if (!event.type) {
    errors.type = translate(locale, 'val_event_type_missing');
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
export function validateLifecycleSequence(
  events: ComponentEvent[],
  locale: SupportedLocale = 'it'
): {
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
        error: translate(locale, 'val_seq_after_terminal', {
          type: ev.type,
          date: ev.date,
          terminalType: terminalEvent.type,
          terminalDate: terminalEvent.date,
        }),
      };
    }

    if (ev.type === 'INSTALL') {
      if (isMounted) {
        return {
          isValid: false,
          error: translate(locale, 'val_seq_double_install', { date: ev.date }),
        };
      }
      isMounted = true;
    } else if (ev.type === 'UNINSTALL') {
      if (!isMounted) {
        return {
          isValid: false,
          error: translate(locale, 'val_seq_uninstall_not_mounted', { date: ev.date }),
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
  componentEvents: ComponentEvent[],
  locale: SupportedLocale = 'it'
): { canDelete: boolean; error?: string } {
  const target = componentEvents.find((e) => e.id === eventIdToDelete);
  if (!target) {
    return { canDelete: false, error: translate(locale, 'val_event_not_found') };
  }

  const remaining = componentEvents.filter((e) => e.id !== eventIdToDelete);
  const result = validateLifecycleSequence(remaining, locale);
  if (!result.isValid) {
    return {
      canDelete: false,
      error: translate(locale, 'val_delete_blocked', { reason: result.error ?? '' }),
    };
  }

  return { canDelete: true };
}

/**
 * Verifica se la modifica di un evento preserva l'integrità del ciclo di vita.
 */
export function canUpdateEvent(
  updatedEvent: ComponentEvent,
  componentEvents: ComponentEvent[],
  locale: SupportedLocale = 'it'
): { canUpdate: boolean; error?: string } {
  const updatedList = componentEvents.map((e) =>
    e.id === updatedEvent.id ? updatedEvent : e
  );
  const result = validateLifecycleSequence(updatedList, locale);
  if (!result.isValid) {
    return {
      canUpdate: false,
      error: translate(locale, 'val_update_blocked', { reason: result.error ?? '' }),
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
  events: ComponentEvent[],
  locale: SupportedLocale = 'it'
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  // 1. Validazione vecchio componente
  if (!input.oldComponentId) {
    errors.oldComponentId = translate(locale, 'val_upgrade_select_old');
  } else {
    const oldComp = components.find((c) => c.id === input.oldComponentId);
    if (!oldComp) {
      errors.oldComponentId = translate(locale, 'val_upgrade_old_missing');
    } else {
      const oldEvents = events.filter((e) => e.componentId === input.oldComponentId);
      const oldStatus = computeComponentStatus(oldEvents);

      if (oldStatus === 'SOLD') {
        errors.oldComponentId = translate(locale, 'val_upgrade_old_sold');
      } else if (oldStatus === 'GIFTED') {
        errors.oldComponentId = translate(locale, 'val_upgrade_old_gifted');
      } else if (oldStatus === 'DISPOSED') {
        errors.oldComponentId = translate(locale, 'val_upgrade_old_disposed');
      }

      // Controllo temporale: data upgrade >= data primo acquisto vecchio componente
      const oldPurchases = oldEvents.filter((e) => e.type === 'PURCHASE');
      if (oldPurchases.length > 0) {
        const sortedPurchases = sortEventsChronologically(oldPurchases);
        if (input.date && input.date < sortedPurchases[0].date) {
          errors.date = translate(locale, 'val_upgrade_date_before_old', {
            date: input.date,
            purchaseDate: sortedPurchases[0].date,
          });
        }
      }
    }
  }

  // 2. Validazione modalità e nuovo componente
  if (input.mode === 'existing') {
    if (!input.newComponentId) {
      errors.newComponentId = translate(locale, 'val_upgrade_select_new');
    } else if (input.oldComponentId && input.newComponentId === input.oldComponentId) {
      errors.newComponentId = translate(locale, 'val_upgrade_same_component');
    } else {
      const newComp = components.find((c) => c.id === input.newComponentId);
      if (!newComp) {
        errors.newComponentId = translate(locale, 'val_upgrade_new_missing');
      } else {
        const newEvents = events.filter((e) => e.componentId === input.newComponentId);
        const newStatus = computeComponentStatus(newEvents);

        if (newStatus === 'SOLD') {
          errors.newComponentId = translate(locale, 'val_upgrade_new_sold');
        } else if (newStatus === 'GIFTED') {
          errors.newComponentId = translate(locale, 'val_upgrade_new_gifted');
        } else if (newStatus === 'DISPOSED') {
          errors.newComponentId = translate(locale, 'val_upgrade_new_disposed');
        } else if (newStatus === 'IN_USE') {
          errors.newComponentId = translate(locale, 'val_upgrade_new_in_use');
        }

        // Controllo temporale: data upgrade >= data acquisto nuovo componente
        const newPurchases = newEvents.filter((e) => e.type === 'PURCHASE');
        if (newPurchases.length > 0) {
          const sortedPurchases = sortEventsChronologically(newPurchases);
          if (input.date && input.date < sortedPurchases[0].date) {
            errors.date = translate(locale, 'val_upgrade_date_before_new', {
              date: input.date,
              purchaseDate: sortedPurchases[0].date,
            });
          }
        }
      }
    }
  } else if (input.mode === 'new') {
    if (!input.newComponentData) {
      errors.newComponentData = translate(locale, 'val_upgrade_new_data_required');
    } else {
      const data = input.newComponentData;
      if (!data.name || data.name.trim().length < 2) {
        errors.newComponentName = translate(locale, 'val_upgrade_new_name_min');
      }
      if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
        errors.newComponentCategory = translate(locale, 'val_upgrade_new_category_invalid');
      }
      if (data.purchasePrice !== undefined && (isNaN(data.purchasePrice) || data.purchasePrice < 0)) {
        errors.newComponentPrice = translate(locale, 'val_upgrade_new_price_negative');
      }
    }
  } else {
    errors.mode = translate(locale, 'val_upgrade_mode_invalid');
  }

  // 3. Validazione Data
  if (!input.date || input.date.trim().length === 0) {
    errors.date = translate(locale, 'val_upgrade_date_required');
  } else if (!isValidISODateString(input.date)) {
    errors.date = translate(locale, 'val_upgrade_date_invalid');
  }

  // 4. Validazione Vendita Contestuale (se richiesta)
  if (input.saleOldComponent) {
    if (input.salePrice === undefined || input.salePrice === null || isNaN(input.salePrice) || input.salePrice < 0) {
      errors.salePrice = translate(locale, 'val_upgrade_sale_price_invalid');
    }
    if (input.shippingCost !== undefined && (isNaN(input.shippingCost) || input.shippingCost < 0)) {
      errors.shippingCost = translate(locale, 'val_shipping_negative');
    }
    if (input.fees !== undefined && (isNaN(input.fees) || input.fees < 0)) {
      errors.fees = translate(locale, 'val_fees_negative');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
