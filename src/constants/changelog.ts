/**
 * Registro Ufficiale dei Changelog e Note di Rilascio di PC Tracker.
 * 
 * Ogni release documenta in modo chiaro e categorizzato:
 * - added: nuove funzionalità aggiunte
 * - improved: ottimizzazioni e miglioramenti all'esperienza utente
 * - fixed: correzioni di bug e anomalie
 * - wikiUrl: predisposizione per collegare la Mini-Wiki e le guide della release
 */

export interface ChangelogItem {
  title: string;
  description: string;
  tag?: string;
}

export interface ReleaseChangelog {
  version: string;
  date: string;
  title: string;
  summary: string;
  added: ChangelogItem[];
  improved: ChangelogItem[];
  fixed: ChangelogItem[];
  wikiUrl?: string; // Predisposizione per la Mini-Wiki ufficiale
  wikiArticleId?: string; // ID dell'articolo di guida nella Mini-Wiki
}

export const APP_CHANGELOG: ReleaseChangelog[] = [
  {
    version: '3.1.0',
    date: '2026-09-24',
    title: 'PC Care Center (Beta) — Telemetria Live Win32/NVML, Health & Optimization Engine',
    summary:
      'Una svolta fondamentale per PC Tracker: nasce il PC Care Center con monitoraggio hardware nativo in tempo reale (CPU, RAM, GPU NVIDIA via NVML e Dischi), motore di salute predittiva (Health Score 0-100) e centro di ottimizzazione proattiva con azioni motivate a 1-click.',
    wikiArticleId: 'release-v3.1.0',
    wikiUrl: 'https://github.com/collabwithglab-rgb/pc-tracker/wiki',
    added: [
      {
        title: 'Monitoraggio Hardware Nativo & Telemetria Live',
        description:
          'Snapshot ad alte prestazioni con campionamento Win32 (carico CPU con GetSystemTimes, memoria fisica e commit con GlobalMemoryStatusEx, dischi) e telemetria dinamica GPU NVIDIA NVML (carico VRAM, temperature, ventole, clock).',
        tag: 'Telemetria',
      },
      {
        title: 'Health Engine Predittivo & Health Score (0-100)',
        description:
          'Valutazione deterministica e continua dell\'integrità del sistema: telemetria S.M.A.R.T. dischi, saturazione RAM, temperature massime rispetto alla Personal Baseline, usura pasta termica e filtri antipolvere, integrità SFC e Secure Boot.',
        tag: 'Salute PC',
      },
      {
        title: 'Optimization Engine & Personal Baseline',
        description:
          'Suggerimenti di ottimizzazione intelligenti e motivati con badge di rischio (TRIM SSD, pulizia avanzata Cleanmgr, punti di ripristino, riparazione SFC, cache shader DirectX e profilo massime prestazioni) integrati con il Profilo Daily di riferimento.',
        tag: 'Ottimizzazione',
      },
      {
        title: 'Smart Pause & Resource Guard',
        description:
          'Architettura zero-bloat con sospensione automatica del polling quando l\'applicazione è minimizzata o in background, per azzerare qualsiasi impatto su CPU e prestazioni in gioco.',
        tag: 'Prestazioni',
      },
      {
        title: 'Navigazione Unificata PC Care Center a 5 Schede',
        description:
          'Nuova schermata modulare suddivisa in Panoramica, Monitoraggio Live, Registro Manutenzione, Strumenti Windows e Registro Tuning con indicatori reattivi e supporto deep-link.',
        tag: 'Interfaccia',
      },
    ],
    improved: [
      {
        title: 'Dashboard Pulse Signal ("Cura del PC & Salute")',
        description:
          'Pillola dinamica nella dashboard principale che segnala istantaneamente lo stato di salute generale del computer e guida alla risoluzione con 1 click.',
        tag: 'Dashboard',
      },
      {
        title: 'Command Palette Deep Navigation (Ctrl+K)',
        description:
          'Comandi diretti aggiunti per saltare immediatamente a "Panoramica Cura del PC" e "Monitoraggio Hardware Live".',
        tag: 'Produttività',
      },
    ],
    fixed: [
      {
        title: 'Architettura Zero Mock & Fallback Graceful',
        description:
          'Eliminazione rigorosa di qualsiasi valore fittizio: le piattaforme non-desktop o prive di GPU NVIDIA visualizzano chiaramente lo stato "Non disponibile" senza inventare metriche simulate.',
        tag: 'Affidabilità',
      },
      {
        title: 'Integrità Memoria & Zero Inquinamento Database',
        description:
          'La telemetria in tempo reale risiede esclusivamente in un buffer volatile a 30 campioni, mantenendo IndexedDB come Single Source of Truth immacolata e reattiva.',
        tag: 'Stabilità',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-19',
    title: 'Command Palette Globale (Ctrl+K), Rig Comparison & Deep Navigation',
    summary:
      'Una release fondamentale per produttività ed analisi hardware: la nuova Command Palette universale per navigare e cercare in un istante, il motore di confronto Rig Comparison con diff costi e consumi, e una Navigation Foundation a 3 livelli sincronizzata.',
    wikiArticleId: 'release-v0.3.0',
    wikiUrl: 'https://github.com/collabwithglab-rgb/pc-tracker/wiki',
    added: [
      {
        title: 'Command Palette Globale (Ctrl+K / Cmd+K)',
        description:
          'Interfaccia Spotlight-style accessibile da qualsiasi pagina per eseguire comandi rapidi, deep link verso sotto-schede e ricerca istantanea dei componenti reali.',
        tag: 'Produttività',
      },
      {
        title: 'Rig Comparison (Confronto Configurazioni Hardware)',
        description:
          'Diff punto a punto tra il PC Attuale, Checkpoint storici congelati o date di timeline con calcolo delta spesa (€ e %), variazione pezzi e delta Power Budget in Watt (W).',
        tag: 'Analisi',
      },
      {
        title: 'Navigation Foundation & Deep Tab Navigation',
        description:
          'Architettura di navigazione reattiva con supporto a NavigationTarget fortemente tipizzati, sincronizzazione immediata dei subTab anche a pagina montata e ritorno contestuale.',
        tag: 'Navigazione',
      },
    ],
    improved: [
      {
        title: 'Pulsante Inverti ⇄ (Swap) a 1 Click',
        description:
          'Inversione istantanea della baseline di confronto con ricalcolo speculare immediato di tutti i differenziali economici e di assorbimento.',
        tag: 'UX',
      },
      {
        title: 'Punti di Ingresso Diretti al Confronto',
        description:
          'Pulsante "Confronta Rig" nell\'header della configurazione operativa e "Confronta con PC Attuale" direttamente nei banner dei checkpoint.',
        tag: 'Interfaccia',
      },
    ],
    fixed: [
      {
        title: 'Resilienza Calcoli su Configurazioni a Costo Zero',
        description:
          'Prevenzione assoluta di divisioni per zero ed emissioni di NaN su configurazioni senza spesa registrata.',
        tag: 'Affidabilità',
      },
    ],
  },
  {
    version: '0.2.2',
    date: '2026-09-18',
    title: 'Hardware Intelligence, Power Budget & Hub Vendite',
    summary:
      'Un aggiornamento monumentale per PC Tracker: arrivano il monitoraggio completo dei consumi TDP, il generatore professionale di annunci di vendita e la cassaforte locale delle ricevute.',
    wikiArticleId: 'release-v0.2.2',
    wikiUrl: 'https://github.com/collabwithglab-rgb/pc-tracker/wiki',
    added: [
      {
        title: 'Power Budget & Stima Consumi TDP',
        description:
          'Calcolo automatico dell\'assorbimento energetico di picco, sotto carico tipico e in idle. Verifica dell\'adeguatezza dell\'alimentatore (PSU) con margine di sicurezza e consigli hardware.',
        tag: 'Hardware',
      },
      {
        title: 'Generatore Automatico Annunci Vendita',
        description:
          'Creazione in un clic di annunci ottimizzati per Subito.it, eBay e Vinted con titoli conformi ai limiti di caratteri, durata reale di utilizzo e super-prompt per IA.',
        tag: 'Marketplace',
      },
      {
        title: 'Gestione Garanzie & Cassaforte Ricevute (Receipt Vault)',
        description:
          'Tracciamento delle scadenze di garanzia con conto alla rovescia in italiano e archiviazione locale su IndexedDB di scontrini, fatture e documenti RMA in formato PDF e immagini.',
        tag: 'Sicurezza',
      },
      {
        title: 'Sistema di Notifica Aggiornamenti & Note di Rilascio',
        description:
          'Bollino rosso lampeggiante quando è disponibile una nuova patch su GitHub e modale automatica con il riassunto di tutte le novità post-aggiornamento.',
        tag: 'Sistema',
      },
    ],
    improved: [
      {
        title: 'Auto-Updater con Firma Crittografica Minisign Ed25519',
        description:
          'Verifica e installazione sicura delle nuove versioni desktop per Windows direttamente da GitHub Releases con riavvio automatico.',
      },
      {
        title: 'Navigazione Riorganizzata a 4 Macro-Aree',
        description:
          'Sidebar ridisegnata con badge dinamici per i componenti a magazzino pronti per la vendita e gerarchia visiva ad alto contrasto.',
      },
      {
        title: 'Performance di rendering e stabilità IndexedDB',
        description:
          'Ottimizzazione del caricamento dei componenti con indici dedicati e transazioni isolate per prevenire blocchi di memoria.',
      },
    ],
    fixed: [
      {
        title: 'Correzione calcolo date di garanzia negli anni bisestili',
        description:
          'Risolto un disallineamento temporale nel computo esatto dei mesi di garanzia residua.',
      },
      {
        title: 'Rendering anteprima PDF nella cassaforte ricevute',
        description:
          'Migliorata la compatibilità cross-browser per la visualizzazione integrata delle fatture in formato PDF.',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-17',
    title: 'Time Travel, Checkpoint Engine & Time Machine Storica',
    summary:
      'Introduzione della Time Machine hardware per viaggiare nel passato e ricostruire la composizione esatta del PC in qualsiasi data storica.',
    wikiArticleId: 'release-v0.2.0',
    wikiUrl: 'https://github.com/collabwithglab-rgb/pc-tracker/wiki',
    added: [
      {
        title: 'Time Travel Point-in-Time Rig Reconstruction',
        description:
          'Possibilità di selezionare qualsiasi data nel passato per visualizzare l\'esatto stato del computer.',
        tag: 'Timeline',
      },
      {
        title: 'Checkpoint Immutabili con Snapshot Congelati',
        description:
          'Salvataggio di fotografie storiche volontarie della configurazione con rilevamento discrepanze informative.',
        tag: 'Backup',
      },
    ],
    improved: [
      {
        title: 'Motore Finanziario a 4 Metriche Rigorose',
        description:
          'Distinzione netta tra Speso Storico, Recuperato da Vendite, Costo Netto Storico e Costo Configurazione Attuale.',
      },
    ],
    fixed: [
      {
        title: 'Ordinamento cronologico micro-eventi nella stessa giornata',
        description:
          'Risolto il tracciamento corretto di montaggi e smontaggi multipli eseguiti nella medesima data.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-15',
    title: 'PC Tracker First Release: Fondamenta Local-First',
    summary:
      'Prima versione ufficiale dell\'applicazione per tracciare la vita completa del proprio computer, componenti, spese e upgrade.',
    wikiArticleId: 'release-v0.1.0',
    wikiUrl: 'https://github.com/collabwithglab-rgb/pc-tracker/wiki',
    added: [
      {
        title: 'Architettura Event-Driven su IndexedDB',
        description:
          'Identità stabili dei componenti con cronologia eventi (Acquisto, Montaggio, Smontaggio, Vendita, Extra).',
        tag: 'Core',
      },
      {
        title: 'Wizard Upgrade Generazionali',
        description:
          'Passaggio fluido da vecchio a nuovo componente con calcolo del costo netto di sostituzione.',
        tag: 'Hardware',
      },
    ],
    improved: [
      {
        title: 'Design Dark Hardware Enthusiast',
        description:
          'Palette ciano, smeraldo e rubino senza framework esterni, 100% Vanilla CSS con micro-interazioni Apple-like.',
      },
    ],
    fixed: [
      {
        title: 'Validazione JSON di backup',
        description:
          'Ripristino con anteprima dettagliata e schema versioning per prevenire la sovrascrittura accidentale dei dati.',
      },
    ],
  },
];

/**
 * Restituisce le note di rilascio per la versione specificata, o l'ultima disponibile come fallback.
 */
export function getChangelogForVersion(version: string): ReleaseChangelog {
  const cleanVersion = version.startsWith('v') ? version.substring(1) : version;
  const found = APP_CHANGELOG.find((c) => c.version === cleanVersion);
  return found || APP_CHANGELOG[0];
}
