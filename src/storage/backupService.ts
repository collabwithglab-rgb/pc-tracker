import {
  Component,
  ComponentEvent,
  Upgrade,
  Checkpoint,
  DatabaseSchema,
  ImportValidationResult,
  ValidationResult,
  PurchaseEvent,
  SaleEvent,
  ExtraExpenseEvent,
  ComponentReceipt,
  ALLOWED_RECEIPT_MIME_TYPES,
  AllowedReceiptMimeType,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  MAX_TOTAL_RECEIPTS_BACKUP_BYTES,
} from '../types';
import {
  STORES,
  getAllFromStore,
  getByIdFromStore,
  putItem,
  replaceAllDataAtomic,
} from './indexedDB';
import { CURRENT_SCHEMA_VERSION, migrateDatabase } from './migrations';
import { APP_VERSION } from '../constants/version';
import {
  validateLifecycleSequence,
  isValidISODateString,
  computeComponentStatus,
  computeComponentNetCost,
  computeDaysInUse,
  validateCheckpoint,
  sortCheckpointsChronologically,
  isAnchorEventValid,
  isRelatedUpgradeValid,
} from '../domain';
import { normalizeSettings } from './storageService';

/**
 * Recupera il timestamp ISO dell'ultimo export effettuato con successo dall'applicazione,
 * memorizzato in IndexedDB (STORES.METADATA).
 * Restituisce null se non è ancora stato eseguito alcun export in questa installazione locale.
 */
export async function getLastExportedAt(): Promise<string | null> {
  try {
    const entry = await getByIdFromStore<{ key: string; value: string }>(
      STORES.METADATA,
      'lastExportedAt'
    );
    return entry?.value || null;
  } catch {
    return null;
  }
}

/**
 * Registra in modo persistente in IndexedDB il timestamp dell'ultimo export effettuato.
 */
export async function setLastExportedAt(isoDate: string): Promise<void> {
  try {
    await putItem(STORES.METADATA, { key: 'lastExportedAt', value: isoDate });
  } catch {
    // Silenzioso se operazione in contesto non-IDB
  }
}

/**
 * Ordina in modo deterministico e stabile le collezioni hardware prima della serializzazione JSON.
 * - Componenti ordinati per ID crescente.
 * - Eventi ordinati per data crescente, tipo e ID.
 * - Upgrade ordinati per data crescente e ID.
 * - Checkpoint ordinati per data crescente, sequenza eventi anchor, createdAt e ID.
 */
export function sortDataDeterministically(data: {
  components: Component[];
  events: ComponentEvent[];
  upgrades?: Upgrade[];
  checkpoints?: Checkpoint[];
  receipts?: ComponentReceipt[];
}): void {
  data.components.sort((a, b) => a.id.localeCompare(b.id));

  data.events.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    const typeComp = a.type.localeCompare(b.type);
    if (typeComp !== 0) return typeComp;
    return a.id.localeCompare(b.id);
  });

  if (data.upgrades) {
    data.upgrades.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.id.localeCompare(b.id);
    });
  }

  if (data.checkpoints) {
    const sorted = sortCheckpointsChronologically(data.checkpoints, data.events);
    data.checkpoints.length = 0;
    data.checkpoints.push(...sorted);
  }

  if (data.receipts) {
    data.receipts.sort((a, b) => {
      const compComp = a.componentId.localeCompare(b.componentId);
      if (compComp !== 0) return compComp;
      const dateComp = a.uploadedAt.localeCompare(b.uploadedAt);
      if (dateComp !== 0) return dateComp;
      return a.id.localeCompare(b.id);
    });
  }
}

/**
 * Esporta tutti i dati correnti da IndexedDB in una stringa JSON deterministica e formattata.
 * Include:
 * - schemaVersion (1)
 * - appVersion ("0.1.0")
 * - exportedAt (ISO timestamp generato al momento dell'export)
 * - settings normalizzati
 * - components (ordinati stabilmente per ID)
 * - events (ordinati stabilmente per data, tipo, ID)
 * - upgrades (ordinati stabilmente per data, ID)
 * - checkpoints (ordinati stabilmente per data, anchor event, createdAt, ID)
 *
 * Registra inoltre `lastExportedAt` in STORES.METADATA per tenere traccia persistente
 * dell'ultimo export eseguito.
 */
export async function exportDatabaseToJSON(): Promise<string> {
  const [components, events, upgrades, checkpoints, metadataList] = await Promise.all([
    getAllFromStore<Component>(STORES.COMPONENTS),
    getAllFromStore<ComponentEvent>(STORES.EVENTS),
    getAllFromStore<Upgrade>(STORES.UPGRADES),
    getAllFromStore<Checkpoint>(STORES.CHECKPOINTS),
    getAllFromStore<{ key: string; value: unknown }>(STORES.METADATA),
  ]);

  // Recupero sicuro delle ricevute (con fallback retrocompatibile per mock nei test)
  let receipts: ComponentReceipt[] = [];
  if (STORES.RECEIPTS) {
    try {
      receipts = await getAllFromStore<ComponentReceipt>(STORES.RECEIPTS);
    } catch {
      receipts = [];
    }
  }

  const settingsEntry = metadataList.find((m) => m.key === 'settings');
  const settings = normalizeSettings(settingsEntry?.value);

  // Ordinamento deterministico delle collezioni
  sortDataDeterministically({ components, events, upgrades, checkpoints, receipts });

  const exportTimestamp = new Date().toISOString();

  // Persiste il timestamp dell'ultimo export locale in IndexedDB
  await setLastExportedAt(exportTimestamp);

  const payload: DatabaseSchema = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: exportTimestamp,
    settings,
    components,
    events,
    upgrades,
    checkpoints,
    receipts: receipts.length > 0 ? receipts : undefined,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Fase 1: Parsing e Validazione completa del file JSON di backup, SENZA alterare il database.
 * Controlla:
 * 1. Formato JSON valido
 * 2. Presenza array obbligatori 'components' ed 'events'
 * 3. Version checking: rifiuto versioni future o non supportate
 * 4. Unicità di tutti gli ID (componenti, eventi, upgrade)
 * 5. Integrità referenziale (eventi -> componenti; upgrade -> old/new components)
 * 6. Date ISO YYYY-MM-DD reali e conformi al calendario gregoriano
 * 7. Coerenza del ciclo di vita con il motore formale (validateLifecycleSequence)
 *
 * Restituisce `ImportPreview` in caso di successo (con conteggi e metadati)
 * oppure `ImportError` con messaggio dettagliato del motivo di rifiuto.
 */
export function validateImportJSON(jsonString: string): ImportValidationResult {
  try {
    // Protezione incondizionata contro Prototype Pollution (CWE-1321)
    const rawData = JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    }) as Record<string, unknown>;

    if (!rawData || typeof rawData !== 'object') {
      return { isValid: false, error: 'File non valido o non in formato JSON.' };
    }

    // 1. Version checking
    if (rawData.schemaVersion !== undefined) {
      if (typeof rawData.schemaVersion !== 'number' || isNaN(rawData.schemaVersion) || rawData.schemaVersion < 1) {
        return { isValid: false, error: 'Versione schema del backup non valida o corrotta.' };
      }
      if (rawData.schemaVersion > CURRENT_SCHEMA_VERSION) {
        return {
          isValid: false,
          error: `Versione backup non supportata: il file usa lo schema v${rawData.schemaVersion}, mentre l'applicazione supporta fino a v${CURRENT_SCHEMA_VERSION}. Aggiorna l'applicazione prima di procedere.`,
        };
      }
    }

    // 2. Struttura collezioni obbligatorie
    if (!Array.isArray(rawData.components) || !Array.isArray(rawData.events)) {
      return {
        isValid: false,
        error: "Il file JSON non contiene gli array obbligatori 'components' o 'events'.",
      };
    }

    if (rawData.upgrades !== undefined && !Array.isArray(rawData.upgrades)) {
      return {
        isValid: false,
        error: "La sezione 'upgrades' del file non è un array valido.",
      };
    }

    if (rawData.checkpoints !== undefined && !Array.isArray(rawData.checkpoints)) {
      return {
        isValid: false,
        error: "La sezione 'checkpoints' del file non è un array valido.",
      };
    }

    const migratedData = migrateDatabase(rawData);
    if (!migratedData.checkpoints) {
      migratedData.checkpoints = [];
    }

    // 3. Unicità e validità ID Componenti
    const compIds = new Set<string>();
    for (const comp of migratedData.components) {
      if (!comp.id || typeof comp.id !== 'string' || comp.id.trim().length === 0) {
        return { isValid: false, error: 'Rilevato un componente privo di ID univoco valido.' };
      }
      if (compIds.has(comp.id)) {
        return { isValid: false, error: `ID componente duplicato rilevato nel backup: "${comp.id}".` };
      }
      compIds.add(comp.id);
    }

    // 4. Unicità ID Eventi, Integrità Referenziale e Formato Date ISO
    const eventIds = new Set<string>();
    for (const ev of migratedData.events) {
      if (!ev.id || typeof ev.id !== 'string' || ev.id.trim().length === 0) {
        return { isValid: false, error: 'Rilevato un evento privo di ID univoco valido.' };
      }
      if (eventIds.has(ev.id)) {
        return { isValid: false, error: `ID evento duplicato rilevato nel backup: "${ev.id}".` };
      }
      eventIds.add(ev.id);

      if (!ev.componentId || !compIds.has(ev.componentId)) {
        return {
          isValid: false,
          error: `Integrità referenziale violata: l'evento "${ev.id}" fa riferimento a un componentId inesistente ("${ev.componentId}").`,
        };
      }

      if (!isValidISODateString(ev.date)) {
        return {
          isValid: false,
          error: `Data non valida per l'evento "${ev.id}": "${ev.date}" (formato atteso: YYYY-MM-DD valido nel calendario gregoriano).`,
        };
      }
    }

    // 5. Unicità ID Upgrade, Integrità Referenziale e Date
    const upgradeIds = new Set<string>();
    for (const up of migratedData.upgrades || []) {
      if (!up.id || typeof up.id !== 'string' || up.id.trim().length === 0) {
        return { isValid: false, error: 'Rilevato un upgrade privo di ID univoco valido.' };
      }
      if (upgradeIds.has(up.id)) {
        return { isValid: false, error: `ID upgrade duplicato rilevato nel backup: "${up.id}".` };
      }
      upgradeIds.add(up.id);

      if (!up.oldComponentId || !compIds.has(up.oldComponentId)) {
        return {
          isValid: false,
          error: `Integrità referenziale violata: l'upgrade "${up.id}" fa riferimento a un oldComponentId inesistente ("${up.oldComponentId}").`,
        };
      }
      if (!up.newComponentId || !compIds.has(up.newComponentId)) {
        return {
          isValid: false,
          error: `Integrità referenziale violata: l'upgrade "${up.id}" fa riferimento a un newComponentId inesistente ("${up.newComponentId}").`,
        };
      }

      if (!isValidISODateString(up.date)) {
        return {
          isValid: false,
          error: `Data non valida per l'upgrade "${up.id}": "${up.date}" (formato atteso: YYYY-MM-DD).`,
        };
      }
    }

    // 6. Unicità ID Checkpoint, Validazione Formale e Integrità Referenziale
    const checkpointIds = new Set<string>();

    for (const cp of migratedData.checkpoints || []) {
      if (!cp.id || typeof cp.id !== 'string' || cp.id.trim().length === 0) {
        return { isValid: false, error: 'Rilevato un checkpoint privo di ID univoco valido.' };
      }
      if (checkpointIds.has(cp.id)) {
        return { isValid: false, error: `ID checkpoint duplicato rilevato nel backup: "${cp.id}".` };
      }
      checkpointIds.add(cp.id);

      // Validazione formale del checkpoint tramite checkpointEngine
      const cpValidation = validateCheckpoint(cp);
      if (!cpValidation.isValid) {
        const firstError = Object.values(cpValidation.errors)[0];
        return {
          isValid: false,
          error: `Checkpoint "${cp.id}" (${cp.name || 'Senza nome'}) non valido: ${firstError}`,
        };
      }

      // Validazione anchorEventId (se specificato)
      if (cp.anchorEventId) {
        const anchorCheck = isAnchorEventValid(cp.anchorEventId, migratedData.events, cp.referenceDate);
        if (!anchorCheck.isValid) {
          return {
            isValid: false,
            error: `Integrità referenziale violata: nel checkpoint "${cp.id}", ${anchorCheck.error}`,
          };
        }
      }

      // Validazione relatedUpgradeId (se specificato)
      if (cp.relatedUpgradeId) {
        const upgradeCheck = isRelatedUpgradeValid(cp.relatedUpgradeId, migratedData.upgrades || []);
        if (!upgradeCheck.isValid) {
          return {
            isValid: false,
            error: `Integrità referenziale violata: nel checkpoint "${cp.id}", ${upgradeCheck.error}`,
          };
        }
      }

      // NOTA ARCHITETTURALE (Regola 7):
      // componentsSnapshot[].componentId è un SOFT LINK storico.
      // Se un componente è stato rimosso o non esiste più nel catalogo components,
      // il Checkpoint rimane valido ed autosufficiente grazie allo snapshot congelato.
    }

    // 7. Coerenza del ciclo di vita per ciascun componente (validateLifecycleSequence)
    const eventsByComp = new Map<string, ComponentEvent[]>();
    for (const ev of migratedData.events) {
      const list = eventsByComp.get(ev.componentId) || [];
      list.push(ev);
      eventsByComp.set(ev.componentId, list);
    }

    for (const [cId, compEvents] of eventsByComp.entries()) {
      const lifecycleCheck = validateLifecycleSequence(compEvents);
      if (!lifecycleCheck.isValid) {
        return {
          isValid: false,
          error: `Coerenza ciclo di vita violata per il componente "${cId}": ${lifecycleCheck.error}`,
        };
      }
    }

    // 8. Unicità ID Ricevute, Integrità Referenziale e Limiti Dimensione (Cassaforte Ricevute)
    if (rawData.receipts !== undefined && !Array.isArray(rawData.receipts)) {
      return {
        isValid: false,
        error: "La sezione 'receipts' del file non è un array valido.",
      };
    }

    const receiptIds = new Set<string>();
    let totalReceiptsBytes = 0;
    let totalReceiptsDataUrlChars = 0;

    for (const r of migratedData.receipts || []) {
      if (!r.id || typeof r.id !== 'string' || r.id.trim().length === 0) {
        return { isValid: false, error: 'Rilevata una ricevuta priva di ID univoco valido.' };
      }
      if (receiptIds.has(r.id)) {
        return { isValid: false, error: `ID ricevuta duplicato rilevato nel backup: "${r.id}".` };
      }
      receiptIds.add(r.id);

      if (!r.componentId || !compIds.has(r.componentId)) {
        return {
          isValid: false,
          error: `Integrità referenziale violata: la ricevuta "${r.id}" fa riferimento a un componentId inesistente ("${r.componentId}").`,
        };
      }

      if (!r.fileName || typeof r.fileName !== 'string' || r.fileName.trim().length === 0) {
        return { isValid: false, error: `La ricevuta "${r.id}" non ha un nome file valido.` };
      }

      if (!r.fileType || !ALLOWED_RECEIPT_MIME_TYPES.includes(r.fileType as AllowedReceiptMimeType)) {
        return {
          isValid: false,
          error: `Tipo file non supportato per la ricevuta "${r.fileName}" (${r.fileType}). Formati ammessi: PDF, PNG, JPEG, WebP.`,
        };
      }

      if (typeof r.fileSize !== 'number' || isNaN(r.fileSize) || r.fileSize <= 0) {
        return { isValid: false, error: `Dimensione non valida per la ricevuta "${r.fileName}".` };
      }

      if (r.fileSize > MAX_RECEIPT_FILE_SIZE_BYTES) {
        return {
          isValid: false,
          error: `La ricevuta "${r.fileName}" supera il limite massimo consentito di 10MB (${(r.fileSize / (1024 * 1024)).toFixed(1)}MB).`,
        };
      }

      totalReceiptsBytes += r.fileSize;
      if (totalReceiptsBytes > MAX_TOTAL_RECEIPTS_BACKUP_BYTES) {
        return {
          isValid: false,
          error: `Il totale degli allegati ricevute supera il limite di sicurezza di 50MB per il backup.`,
        };
      }

      if (!r.dataUrl || typeof r.dataUrl !== 'string' || !r.dataUrl.startsWith('data:')) {
        return {
          isValid: false,
          error: `Contenuto Data URL non valido o corrotto per la ricevuta "${r.fileName}".`,
        };
      }

      // Validazione dimensione effettiva della stringa Data URL (Prevenzione attacchi di memoria / bypass fileSize)
      const maxSingleReceiptDataUrlChars = Math.ceil(MAX_RECEIPT_FILE_SIZE_BYTES * 1.4) + 1024;
      if (r.dataUrl.length > maxSingleReceiptDataUrlChars) {
        return {
          isValid: false,
          error: `Il payload Data URL per la ricevuta "${r.fileName}" supera la dimensione massima di 10MB.`,
        };
      }
      totalReceiptsDataUrlChars += r.dataUrl.length;
      const maxTotalReceiptsDataUrlChars = Math.ceil(MAX_TOTAL_RECEIPTS_BACKUP_BYTES * 1.4) + 4096;
      if (totalReceiptsDataUrlChars > maxTotalReceiptsDataUrlChars) {
        return {
          isValid: false,
          error: `Il totale dei dati delle ricevute allegate supera il limite di sicurezza di 50MB per il backup.`,
        };
      }

      // Validazione rigorosa Data URL e prefisso MIME consentito (Prevenzione XSS / data URL injection)
      const allowedDataUrlPrefixes = [
        'data:application/pdf;',
        'data:image/png;',
        'data:image/jpeg;',
        'data:image/webp;',
      ];
      const hasAllowedMime = allowedDataUrlPrefixes.some((prefix) =>
        r.dataUrl.toLowerCase().startsWith(prefix)
      );
      if (!hasAllowedMime) {
        return {
          isValid: false,
          error: `Data URL non conforme o MIME type non autorizzato per la ricevuta "${r.fileName}". Formati ammessi: PDF, PNG, JPEG, WebP.`,
        };
      }
    }

    // Estrazione metadati opzionali di sintesi per la preview
    const rawSettings = (migratedData.settings || {}) as unknown as Record<string, unknown>;
    const settingsSummary = {
      rigName: typeof rawSettings.rigName === 'string' && rawSettings.rigName.trim() ? rawSettings.rigName.trim() : undefined,
      buildYear: typeof rawSettings.buildYear === 'number' ? rawSettings.buildYear : undefined,
      currencySymbol: typeof rawSettings.currencySymbol === 'string' ? rawSettings.currencySymbol : '€',
    };

    const exportedAtString =
      typeof rawData.exportedAt === 'string'
        ? rawData.exportedAt
        : typeof rawData.lastModified === 'string'
        ? rawData.lastModified
        : undefined;

    return {
      isValid: true,
      schemaVersion: migratedData.schemaVersion || CURRENT_SCHEMA_VERSION,
      appVersion: typeof rawData.appVersion === 'string' ? rawData.appVersion : '0.1.0',
      exportedAt: exportedAtString,
      counts: {
        components: migratedData.components.length,
        events: migratedData.events.length,
        upgrades: (migratedData.upgrades || []).length,
        checkpoints: (migratedData.checkpoints || []).length,
        receipts: (migratedData.receipts || []).length,
      },
      settingsSummary,
      parsedData: migratedData,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Errore durante la validazione del file JSON: ${(err as Error).message}`,
    };
  }
}

/**
 * Fase 2: Esegue l'import effettivo e atomico su IndexedDB in una singola transazione multi-store.
 * Chiamato SOLO dopo la preview e la conferma esplicita dell'utente.
 * In caso di errore durante la transazione IDB, viene eseguito il rollback automatico
 * e il database preesistente rimane intatto.
 */
export async function executeImport(data: DatabaseSchema): Promise<void> {
  await replaceAllDataAtomic({
    components: data.components,
    events: data.events,
    upgrades: data.upgrades || [],
    checkpoints: data.checkpoints || [],
    receipts: data.receipts || [],
    metadataItems: [
      { key: 'settings', value: normalizeSettings(data.settings) },
      { key: 'initialized', value: true },
    ],
  });
}

/**
 * Esegue validazione e import in un'unica operazione (API retrocompatibile).
 */
export async function importDatabaseFromJSON(jsonString: string): Promise<ValidationResult> {
  const validation = validateImportJSON(jsonString);
  if (!validation.isValid) {
    return { isValid: false, error: validation.error };
  }

  try {
    await executeImport(validation.parsedData);
    return {
      isValid: true,
      counts: validation.counts,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Errore durante l'importazione: ${(err as Error).message}`,
    };
  }
}

/**
 * Funzione helper per l'escaping RFC 4180 dei campi CSV.
 * Se una cella contiene virgole, virgolette doppie o newline, viene racchiusa tra doppi apici
 * e ogni doppio apice interno viene raddoppiato ("").
 */
export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Protezione contro CSV Formula Injection (CWE-1236):
  // Se una cella testuale inizia con caratteri suscettibili di esecuzione formula in Excel/Calc (=, +, -, @, \t, \r),
  // anteponiamo un apice singolo per neutralizzarne l'esecuzione e forzare il rendering testuale.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Esporta la lista dei componenti in formato CSV conforme a RFC 4180 con BOM UTF-8 (\uFEFF).
 * Destinato ad analisi e lettura su Excel / fogli di calcolo esterni, NON al restore.
 */
export function exportComponentsToCSV(
  components: Component[],
  events: ComponentEvent[]
): string {
  // Mappatura eventi per componente per calcolare lo stato e le metriche chiave
  const eventsByComp = new Map<string, ComponentEvent[]>();
  for (const ev of events) {
    const list = eventsByComp.get(ev.componentId) || [];
    list.push(ev);
    eventsByComp.set(ev.componentId, list);
  }

  const headers = [
    'ID',
    'Nome',
    'Marca',
    'Modello',
    'Categoria',
    'Numero Serie',
    'Stato',
    'Data Acquisto',
    'Prezzo Acquisto',
    'Spese Extra',
    'Ricavo Vendita',
    'Costo Netto',
    'Giorni Utilizzo',
    'Note',
    'Data Creazione',
  ];

  // Ordinamento alfabetico/deterministico per nome e ID
  const sortedComponents = [...components].sort((a, b) => {
    const nameComp = a.name.localeCompare(b.name);
    if (nameComp !== 0) return nameComp;
    return a.id.localeCompare(b.id);
  });

  const rows: string[] = [];
  rows.push(headers.map(escapeCSVCell).join(','));

  for (const comp of sortedComponents) {
    const compEvents = eventsByComp.get(comp.id) || [];
    const status = computeComponentStatus(compEvents);

    const purchaseEvents = compEvents.filter((e): e is PurchaseEvent => e.type === 'PURCHASE');
    const firstPurchase = purchaseEvents[0];
    const totalPurchasePrice = purchaseEvents.reduce((sum, e) => sum + (e.price || 0), 0);
    const sale = compEvents.find((e) => e.type === 'SALE') as SaleEvent | undefined;
    const extraExpenses = compEvents
      .filter((e) => e.type === 'EXTRA_EXPENSE')
      .reduce((sum, e) => sum + ((e as ExtraExpenseEvent).amount || 0), 0);

    const netCost = computeComponentNetCost(comp.id, events);
    const daysInUse = computeDaysInUse(compEvents);

    const row = [
      comp.id,
      comp.name,
      comp.brand || '',
      comp.model || '',
      comp.category,
      comp.serialNumber || '',
      status,
      firstPurchase ? firstPurchase.date : '',
      purchaseEvents.length > 0 ? totalPurchasePrice.toFixed(2) : '',
      extraExpenses > 0 ? extraExpenses.toFixed(2) : '0.00',
      sale ? sale.price.toFixed(2) : '',
      netCost.toFixed(2),
      daysInUse,
      comp.notes || '',
      comp.createdAt || '',
    ];

    rows.push(row.map(escapeCSVCell).join(','));
  }

  // Prefisso BOM UTF-8 per garantire la corretta visualizzazione degli accenti in Microsoft Excel
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Esporta la cronologia di tutti gli eventi hardware in formato CSV conforme a RFC 4180 con BOM UTF-8.
 * Destinato ad analisi e visualizzazione tabellare esterna, NON al restore.
 */
export function exportEventsToCSV(
  events: ComponentEvent[],
  components: Component[]
): string {
  const compMap = new Map<string, Component>();
  for (const c of components) {
    compMap.set(c.id, c);
  }

  const headers = [
    'ID Evento',
    'ID Componente',
    'Nome Componente',
    'Categoria',
    'Tipo Evento',
    'Data',
    'Prezzo (€)',
    'Negozio',
    'Numero Ordine',
    'Link',
    'Condizione',
    'Scadenza Garanzia',
    'Slot / Posizione',
    'Motivo Smontaggio',
    'Piattaforma Vendita',
    'Acquirente',
    'Spese Spedizione (€)',
    'Commissioni (€)',
    'Importo Spesa Extra (€)',
    'Descrizione Spesa',
    'Destinatario Regalo',
    'Metodo Smaltimento',
    'Note',
    'Data Registrazione',
  ];

  // Ordinamento cronologico decrescente (eventi più recenti in cima) per analisi analitica
  const sortedEvents = [...events].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return b.id.localeCompare(a.id);
  });

  const rows: string[] = [];
  rows.push(headers.map(escapeCSVCell).join(','));

  for (const ev of sortedEvents) {
    const comp = compMap.get(ev.componentId);
    const p = ev as unknown as Record<string, unknown>;

    const row = [
      ev.id,
      ev.componentId,
      comp ? comp.name : 'Componente Rimosso',
      comp ? comp.category : '',
      ev.type,
      ev.date,
      typeof p.price === 'number' ? p.price.toFixed(2) : '',
      typeof p.store === 'string' ? p.store : '',
      typeof p.orderNumber === 'string' ? p.orderNumber : '',
      typeof p.link === 'string' ? p.link : '',
      typeof p.condition === 'string' ? p.condition : '',
      typeof p.warrantyExpiryDate === 'string' ? p.warrantyExpiryDate : '',
      typeof p.slotOrLocation === 'string' ? p.slotOrLocation : '',
      typeof p.reason === 'string' ? p.reason : '',
      typeof p.platform === 'string' ? p.platform : '',
      typeof p.buyer === 'string' ? p.buyer : '',
      typeof p.shippingCost === 'number' ? p.shippingCost.toFixed(2) : '',
      typeof p.fees === 'number' ? p.fees.toFixed(2) : '',
      typeof p.amount === 'number' ? p.amount.toFixed(2) : '',
      typeof p.description === 'string' ? p.description : '',
      typeof p.recipient === 'string' ? p.recipient : '',
      typeof p.disposalMethod === 'string' ? p.disposalMethod : '',
      typeof p.notes === 'string' ? p.notes : '',
      typeof p.createdAt === 'string' ? p.createdAt : '',
    ];

    rows.push(row.map(escapeCSVCell).join(','));
  }

  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Sanitizza il nome file rimuovendo caratteri non ammessi e path traversal.
 */
export function sanitizeDownloadFileName(fileName: string): string {
  return fileName.replace(/\.\./g, '').replace(/[/\\?%*:|"<>]/g, '_').replace(/^\.+/, '') || 'download';
}

/**
 * Helper per avviare il download locale di un file nel browser.
 */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const sanitizedFileName = sanitizeDownloadFileName(fileName);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizedFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
