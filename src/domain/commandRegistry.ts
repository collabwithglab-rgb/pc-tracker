import {
  CommandItem,
  Component,
  ComponentStatus,
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_STATUS_LABELS,
  ComponentComputedState,
} from '../types';

export const STATIC_NAVIGATION_COMMANDS: CommandItem[] = [
  // 1. Sezioni Principali
  {
    id: 'nav-dashboard',
    label: 'Panoramica',
    subtitle: 'Dashboard principale, metriche finanziarie e ultimi movimenti',
    category: 'navigation',
    keywords: ['panoramica', 'dashboard', 'home', 'kpi', 'spesa', 'totale', 'finanze', 'rig'],
    target: { section: 'dashboard' },
  },
  {
    id: 'nav-current-rig',
    label: 'Il Mio PC',
    subtitle: 'Configurazione hardware attualmente montata e in uso',
    category: 'navigation',
    keywords: ['pc', 'rig', 'mio pc', 'montato', 'componenti attuali', 'configurazione', 'hardware'],
    target: { section: 'current-rig' },
  },
  {
    id: 'nav-time-travel',
    label: 'Time Travel',
    subtitle: 'Navigazione temporale, configurazioni storiche e checkpoint',
    category: 'navigation',
    keywords: ['time travel', 'tempo', 'storia', 'passato', 'checkpoint', 'timeline', 'data'],
    target: { section: 'time-travel' },
  },
  {
    id: 'nav-upgrades',
    label: 'Storico Upgrade',
    subtitle: 'Cronologia dei cambi generazionali e bilanci di sostituzione',
    category: 'navigation',
    keywords: ['upgrade', 'aggiornamenti', 'cambi', 'sostituzioni', 'generazioni', 'bilancio'],
    target: { section: 'upgrades' },
  },
  {
    id: 'nav-archive',
    label: 'Archivio Pezzi',
    subtitle: 'Tutti i pezzi mai posseduti suddivisi per stato e categoria',
    category: 'navigation',
    keywords: ['archivio', 'pezzi', 'componenti', 'tutti', 'catalogo', 'storico', 'inventario'],
    target: { section: 'archive' },
  },
  {
    id: 'nav-marketplace',
    label: 'Vendite & Annunci',
    subtitle: 'Gestione hardware a magazzino, annunci di vendita e recupero capitale',
    category: 'navigation',
    keywords: ['vendite', 'annunci', 'marketplace', 'magazzino', 'subito', 'ebay', 'venduti', 'ricavo'],
    target: { section: 'marketplace' },
  },
  {
    id: 'nav-stats',
    label: 'Statistiche & Finanze',
    subtitle: 'Andamento della spesa nel tempo, longevità e grafici di ripartizione',
    category: 'navigation',
    keywords: ['statistiche', 'finanze', 'grafici', 'costi', 'longevità', 'spesa', 'quote'],
    target: { section: 'stats' },
  },
  {
    id: 'nav-maintenance',
    label: 'Manutenzione PC',
    subtitle: 'Registro interventi, diagnostica di sistema, strumenti Windows e tuning',
    category: 'navigation',
    keywords: ['manutenzione', 'maintenance', 'pulizia', 'pasta termica', 'windows', 'tuning', 'salute'],
    target: { section: 'maintenance' },
  },
  {
    id: 'nav-wiki',
    label: 'Wiki & Guida',
    subtitle: 'Manuale d\'uso interattivo, tutorial passo-passo e spiegazione formule',
    category: 'navigation',
    keywords: ['wiki', 'guida', 'manuale', 'aiuto', 'help', 'tutorial', 'formule', 'faq'],
    target: { section: 'wiki' },
  },
  {
    id: 'nav-settings',
    label: 'Impostazioni',
    subtitle: 'Personalizzazione del setup, preferenze interfaccia e gestione dati',
    category: 'navigation',
    keywords: ['impostazioni', 'settings', 'configurazione', 'opzioni', 'preferenze', 'aspetto'],
    target: { section: 'settings' },
  },

  // 2. Deep Navigation (Sub-Tabs)
  {
    id: 'deep-maintenance-registro',
    label: 'Registro Manutenzione',
    subtitle: 'Cronologia interventi di pulizia, cambio pasta termica e controlli',
    category: 'deep-navigation',
    keywords: ['registro', 'interventi', 'pasta termica', 'manutenzione', 'log', 'pulizia'],
    target: { section: 'maintenance', subTab: 'registro' },
  },
  {
    id: 'deep-maintenance-scan',
    label: 'Scan Diagnostico',
    subtitle: 'Controllo rapido integrità volumi, cestino e spazio disco',
    category: 'deep-navigation',
    keywords: ['scan', 'diagnostica', 'controllo', 'disco', 'salute', 'spazio', 'volumi'],
    target: { section: 'maintenance', subTab: 'scan' },
  },
  {
    id: 'deep-maintenance-tools',
    label: 'Strumenti Windows',
    subtitle: 'TRIM SSD, pulizia disco, controllo file di sistema (SFC) e CHKDSK',
    category: 'deep-navigation',
    keywords: ['strumenti', 'windows', 'tools', 'trim', 'sfc', 'chkdsk', 'cestino', 'ibernazione', 'pulizia disco'],
    target: { section: 'maintenance', subTab: 'tools' },
  },
  {
    id: 'deep-maintenance-tuning',
    label: 'Tuning Journal',
    subtitle: 'Profili di overclock, undervolt, test di stabilità e benchmark',
    category: 'deep-navigation',
    keywords: ['tuning', 'overclock', 'undervolt', 'benchmark', 'profili', 'stabilità', 'curva ventole'],
    target: { section: 'maintenance', subTab: 'tuning' },
  },
  {
    id: 'deep-settings-preferences',
    label: 'Preferenze',
    subtitle: 'Identità del PC, valuta, formato data e opzioni di avvio',
    category: 'deep-navigation',
    keywords: ['preferenze', 'identità', 'nome pc', 'valuta', 'formato data', 'avvio', 'opzioni'],
    target: { section: 'settings', subTab: 'preferences' },
  },
  {
    id: 'deep-settings-appearance',
    label: 'Aspetto',
    subtitle: 'Palette colori accento, tema scuro ambientale e preset tipografici',
    category: 'deep-navigation',
    keywords: ['aspetto', 'tema', 'colori', 'accent', 'dark', 'font', 'densità', 'interfaccia'],
    target: { section: 'settings', subTab: 'appearance' },
  },
  {
    id: 'deep-settings-backup',
    label: 'Backup & Ripristino',
    subtitle: 'Esportazione e importazione JSON, download CSV e controllo aggiornamenti',
    category: 'deep-navigation',
    keywords: ['backup', 'ripristino', 'esporta', 'importa', 'json', 'csv', 'aggiornamenti', 'salva'],
    target: { section: 'settings', subTab: 'backup' },
  },
  {
    id: 'deep-settings-data',
    label: 'Dati & Database',
    subtitle: 'Stato dello storage locale IndexedDB e azzeramento database',
    category: 'deep-navigation',
    keywords: ['dati', 'database', 'indexeddb', 'reset', 'azzeramento', 'cancellazione'],
    target: { section: 'settings', subTab: 'data' },
  },
  {
    id: 'deep-marketplace-storage',
    label: 'Magazzino',
    subtitle: 'Hardware riposto a magazzino pronto per essere venduto o riutilizzato',
    category: 'deep-navigation',
    keywords: ['magazzino', 'storage', 'cassetto', 'invenduti', 'disponibili', 'in vendita'],
    target: { section: 'marketplace', subTab: 'storage' },
  },
  {
    id: 'deep-marketplace-sold',
    label: 'Venduti',
    subtitle: 'Componenti ceduti, storico acquirenti e capitale recuperato',
    category: 'deep-navigation',
    keywords: ['venduti', 'sold', 'ricavo', 'vendite completate', 'acquirenti', 'piattaforme'],
    target: { section: 'marketplace', subTab: 'sold' },
  },
];

export const STATIC_ACTION_COMMANDS: CommandItem[] = [
  {
    id: 'action-new-movement',
    label: 'Nuovo Movimento',
    subtitle: 'Registra acquisto, vendita, spesa extra, regalo o dismissione',
    category: 'actions',
    keywords: ['nuovo movimento', 'registra', 'movimento', 'spesa', 'acquisto', 'vendita', 'smontaggio'],
    actionId: 'new-movement',
    shortcutHint: 'Azione Rapida',
  },
  {
    id: 'action-add-component',
    label: 'Aggiungi Componente',
    subtitle: 'Crea una nuova anagrafica componente nel database',
    category: 'actions',
    keywords: ['aggiungi componente', 'nuovo pezzo', 'crea componente', 'inserisci pezzo'],
    actionId: 'add-component',
  },
  {
    id: 'action-quick-backup',
    label: 'Salva Backup JSON',
    subtitle: 'Esporta un salvataggio sicuro e verificato di tutti i tuoi dati',
    category: 'actions',
    keywords: ['salva backup', 'backup json', 'esporta json', 'download backup', 'salvataggio'],
    actionId: 'quick-backup',
  },
  {
    id: 'action-import-backup',
    label: 'Ripristina Backup',
    subtitle: 'Importa un file di backup JSON precedentemente esportato',
    category: 'actions',
    keywords: ['ripristina backup', 'importa backup', 'carica json', 'restore database'],
    actionId: 'import-backup',
  },
  {
    id: 'action-create-checkpoint',
    label: 'Crea Checkpoint',
    subtitle: 'Salva un’istantanea congelata della configurazione hardware attuale',
    category: 'actions',
    keywords: ['crea checkpoint', 'salva snapshot', 'fotografia rig', 'salva stato', 'istantanea'],
    actionId: 'create-checkpoint',
  },
  {
    id: 'action-open-wiki',
    label: 'Apri Guida & Wiki',
    subtitle: 'Consulta manuali, tutorial e documentazione integrata',
    category: 'actions',
    keywords: ['apri guida', 'wiki ufficiale', 'tutorial', 'manuale utente'],
    actionId: 'open-wiki',
  },
  {
    id: 'action-open-settings',
    label: 'Apri Impostazioni',
    subtitle: 'Vai al pannello delle impostazioni dell’applicazione',
    category: 'actions',
    keywords: ['apri impostazioni', 'configurazione', 'personalizzazione'],
    actionId: 'open-settings',
  },
];

/**
 * Trasforma la lista dei componenti reali del database in comandi cercabili per la palette.
 */
export function buildComponentCommands(
  components: Component[],
  getComputed?: (id: string) => ComponentComputedState | undefined
): CommandItem[] {
  return components.map((c) => {
    const computed = getComputed ? getComputed(c.id) : undefined;
    const status: ComponentStatus = computed?.status || 'IN_STORAGE';
    const statusLabel = COMPONENT_STATUS_LABELS[status] || status;
    const catLabel = COMPONENT_CATEGORY_LABELS[c.category] || c.category;

    const brandModel = `${c.brand} ${c.model}`.trim();
    const displayName = brandModel || c.name;

    return {
      id: `component-${c.id}`,
      label: displayName,
      subtitle: `${catLabel} • ${statusLabel}${c.name && c.name !== displayName ? ` (${c.name})` : ''}`,
      category: 'components',
      keywords: [
        c.name,
        c.brand,
        c.model,
        displayName,
        c.category,
        catLabel,
        status,
        statusLabel,
        c.serialNumber || '',
      ].filter(Boolean),
      target: {
        section: 'archive',
        componentId: c.id,
      },
      componentMeta: {
        id: c.id,
        brand: c.brand,
        model: c.model,
        category: c.category,
        status,
      },
    };
  });
}

/**
 * Calcola il punteggio di rilevanza deterministico per un comando rispetto alla query di ricerca.
 * 
 * Criteri di ranking (in ordine di priorità):
 * 1. Match esatto sulla label (100 punti)
 * 2. Label inizia con la query (80 punti)
 * 3. Label contiene la query come sottostringa (60 punti)
 * 4. Brand o modello contengono la query (50 punti per i componenti)
 * 5. Una keyword contiene la query (40 punti)
 * 6. Nome categoria contiene la query (30 punti)
 */
export function computeCommandScore(item: CommandItem, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;

  const labelNorm = item.label.toLowerCase();

  // 1. Match Esatto Label
  if (labelNorm === normalizedQuery) {
    return 100;
  }

  // 2. Prefisso Label
  if (labelNorm.startsWith(normalizedQuery)) {
    return 80;
  }

  // 3. Substring Label
  if (labelNorm.includes(normalizedQuery)) {
    return 60;
  }

  // 4. Match Marca o Modello nei Componenti
  if (item.componentMeta) {
    const bm = `${item.componentMeta.brand} ${item.componentMeta.model}`.toLowerCase();
    if (bm.includes(normalizedQuery)) {
      return 50;
    }
  }

  // 5. Match Keywords
  const matchesKeyword = item.keywords.some((kw) => kw.toLowerCase().includes(normalizedQuery));
  if (matchesKeyword) {
    return 40;
  }

  // 6. Match Categoria
  if (item.category.toLowerCase().includes(normalizedQuery)) {
    return 30;
  }

  return 0;
}

/**
 * Ricerca e ordina deterministicamente i comandi registrati.
 * 
 * @param query Testo digitato dall'utente
 * @param allCommands Insieme completo di comandi statici e dinamici
 * @param limit Numero massimo di risultati restituiti (default: 15)
 */
export function searchCommands(
  query: string,
  allCommands: CommandItem[],
  limit: number = 15
): CommandItem[] {
  const q = query.trim().toLowerCase();

  if (!q) {
    // A query vuota mostra i comandi predefiniti (sezioni di navigazione + azioni rapide), fino al limite
    return allCommands.slice(0, limit);
  }

  // Calcola punteggio per ciascun comando
  const scoredItems: { item: CommandItem; score: number; originalIndex: number }[] = [];

  for (let i = 0; i < allCommands.length; i++) {
    const item = allCommands[i];
    const score = computeCommandScore(item, q);
    if (score > 0) {
      scoredItems.push({ item, score, originalIndex: i });
    }
  }

  // Ordinamento deterministico: punteggio decrescente, poi indice originale crescente (stable sort)
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scoredItems.slice(0, limit).map((s) => s.item);
}
