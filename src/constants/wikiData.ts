import { WikiArticle, WikiCategoryMeta } from '../types/wiki';

export const WIKI_CATEGORIES: WikiCategoryMeta[] = [
  {
    id: 'all',
    label: 'Tutti gli Argomenti',
    description: 'Visualizza l\'intera knowledge base di PC Tracker',
  },
  {
    id: 'releases',
    label: '🚀 Versioni & Release',
    description: 'Note di rilascio, novità hardware e guide operative di ogni aggiornamento',
  },
  {
    id: 'getting-started',
    label: 'Primi Passi & Setup',
    description: 'Guida all\'avvio rapido e inserimento del primo PC',
  },
  {
    id: 'event-lifecycle',
    label: 'Ciclo Vitale & Eventi',
    description: 'La logica temporale che guida la vita dei componenti',
  },
  {
    id: 'finances',
    label: 'Finanze & Metriche',
    description: 'Spiegazione formale di costi, ricavi e ammortamento',
  },
  {
    id: 'time-travel',
    label: 'Time Travel & Checkpoint',
    description: 'Esplorazione del passato e fotografie storiche congelate',
  },
  {
    id: 'upgrades',
    label: 'Upgrade & Sostituzioni',
    description: 'Sostituzioni rapide e calcolo del costo generazionale',
  },
  {
    id: 'marketplace',
    label: 'Vendite & Annunci',
    description: 'Magazzino, annunci Subito/eBay e recupero del capitale',
  },
  {
    id: 'maintenance',
    label: 'Manutenzione Windows',
    description: 'Ottimizzazione cache shader, DNS e registro termico',
  },
  {
    id: 'backup-privacy',
    label: 'Backup & Privacy Locale',
    description: 'Architettura 100% locale su IndexedDB e salvataggi JSON',
  },
  {
    id: 'glossary',
    label: '📖 Glossario Hardware',
    description: 'Acronimi e termini tecnici spiegati in breve per veri enthusiast',
  },
  {
    id: 'faq',
    label: 'Domande Frequenti (FAQ)',
    description: 'Risposte rapide a domande comuni su hardware e software',
  },
];

export const WIKI_ARTICLES: WikiArticle[] = [
  // --- PRIMI PASSI & SETUP ---
  {
    id: 'first-rig-setup',
    title: 'Primi Passi: Come configurare il tuo PC su PC Tracker',
    category: 'getting-started',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Guida rapida per inserire i componenti del tuo computer e iniziare a tracciare la tua configurazione.',
    content: [
      'PC Tracker è progettato per darti la massima flessibilità: puoi configurare il tuo computer attuale in meno di due minuti usando il Quick Setup guidato, oppure inserire i singoli pezzi manualmente tramite il pulsante "+ Nuovo Movimento".',
      'Durante la prima configurazione, per ogni componente inserito (CPU, GPU, RAM, Storage, ecc.) verrà creato automaticamente sia l\'evento di acquisto (PURCHASE) che l\'evento di montaggio (INSTALL) nello slot corrispondente.',
    ],
    steps: [
      'Usa il wizard "Quick Setup" per compilare in blocco i componenti principali del tuo computer.',
      'In alternativa, clicca in alto a destra su "+ Nuovo Movimento" per aggiungere un singolo pezzo, specificando data di acquisto e prezzo.',
      'Controlla la schermata "Il Mio PC" per verificare che tutti i componenti siano contrassegnati con lo stato IN USO.',
      'Scarica un primo backup di sicurezza cliccando sul pulsante "Backup JSON" nell\'intestazione.',
    ],
    tips: [
      'Non preoccuparti se non ricordi il centesimo esatto del prezzo o il giorno preciso: puoi sempre modificare o arricchire i dettagli in seguito dalla scheda del pezzo.',
      'Puoi personalizzare il nome e la descrizione del tuo computer dalla sezione Impostazioni.',
    ],
    keywords: ['primi passi', 'setup', 'onboarding', 'avvio', 'iniziare', 'nuovo', 'configurazione', 'creare pc'],
    actionLinks: [
      { label: 'Avvia Quick Setup', actionType: 'quick-setup', iconName: 'Sparkles' },
      { label: 'Apri Il Mio PC', targetSection: 'current-rig', iconName: 'Cpu' },
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'event-driven-philosophy',
    title: 'La Filosofia Event-Driven: Perché non esistono liste statiche',
    category: 'getting-started',
    badge: 'CONCETTO CHIAVE',
    readTime: '3 min',
    summary: 'Scopri perché PC Tracker usa gli eventi nel tempo invece di semplici caselle di spunta statiche.',
    content: [
      'Nei gestionali tradizionali o nei fogli Excel, quando vendi un componente cancelli una riga o cambi manualmente un menu a tendina da "Attuale" a "Venduto". Questo approccio cancella per sempre la storia del tuo computer e rende impossibile sapere cosa avevi montato 6 mesi fa.',
      'In PC Tracker ogni pezzo hardware possiede un\'identità permanente e una cronologia ordinata di eventi nel tempo: PURCHASE (acquisto), INSTALL (montaggio), UNINSTALL (smontaggio), SALE (vendita), EXTRA_EXPENSE (spesa accessoria), GIFT (regalo) e DISPOSAL (smaltimento).',
      'Lo stato attuale, il tempo di utilizzo e tutte le metriche finanziarie vengono calcolate istantaneamente e deterministicamente ripercorrendo la storia degli eventi.',
    ],
    tips: [
      'Non serve "spostare" un pezzo in una lista diversa: basta registrare l\'evento corrispondente (es. "Smontaggio" o "Vendita") e l\'applicazione aggiornerà tutto da sola.',
    ],
    keywords: ['filosofia', 'event-driven', 'eventi', 'cronologia', 'storia', 'identita', 'architettura'],
    actionLinks: [
      { label: 'Esplora Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
      { label: 'Apri Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },

  // --- CICLO VITALE & EVENTI ---
  {
    id: 'component-states-explained',
    title: 'I 5 Stati Dinamici di un Componente Hardware',
    category: 'event-lifecycle',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Come il motore di calcolo determina automaticamente se un pezzo è In Uso, a Magazzino, Venduto, Regalato o Smaltito.',
    content: [
      'In base all\'ultimo evento cronologico registrato, ogni pezzo assume uno dei seguenti 5 stati:',
      '• IN USO (IN_USE): L\'ultimo evento è INSTALL. Il pezzo fa parte attiva del tuo computer attuale e contribuisce al Costo Configurazione Attuale.',
      '• A MAGAZZINO (IN_STORAGE): L\'ultimo evento è UNINSTALL (oppure solo PURCHASE). Il pezzo è fisicamente in tuo possesso (nel cassetto o sulla mensola), pronto per essere rimontato o messo in vendita.',
      '• VENDUTO (SOLD): L\'ultimo evento è SALE. Il pezzo ha lasciato la tua disponibilità e il ricavo netto è stato incassato.',
      '• REGALATO (GIFTED): L\'ultimo evento è GIFT. Il pezzo è stato ceduto gratuitamente a un amico, familiare o ente.',
      '• SMALTITO (DISPOSED): L\'ultimo evento è DISPOSAL. Il pezzo era guasto o obsoleto ed è stato smaltito ecologicamente.',
    ],
    tips: [
      'Se smonti un pezzo e lo rimonti dopo tre mesi, PC Tracker calcolerà con esattezza solo i giorni effettivi in cui è rimasto installato nel case, escludendo il periodo trascorso a magazzino!',
    ],
    keywords: ['stati', 'in uso', 'in storage', 'magazzino', 'venduto', 'regalato', 'smaltito', 'ciclo vitale'],
    actionLinks: [
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'receipts-and-warranties',
    title: 'Vault Ricevute & Monitoraggio Scadenza Garanzie',
    category: 'event-lifecycle',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'Come salvare scontrini, fatture e tenere d\'occhio la garanzia legale o commerciale dei tuoi componenti.',
    content: [
      'Per ogni componente puoi registrare la data di scadenza della garanzia ed allegare documenti digitali (foto dello scontrino, screenshot della ricevuta o fattura PDF/PNG/JPG).',
      'Le ricevute vengono convertite in modo sicuro e memorizzate direttamente all\'interno del tuo database IndexedDB locale, garantendoti l\'accesso immediato anche senza connessione o se perdi il link originale.',
      'Dalla scheda tecnica di ciascun pezzo vedrai una barra di avanzamento della garanzia con i giorni rimanenti e un avviso visivo giallo/arancione quando la scadenza si avvicina.',
    ],
    steps: [
      'Apri l\'Archivio Pezzi e clicca sul componente desiderato.',
      'Nella sezione "Garanzia & Documenti", verifica o inserisci la data di fine copertura.',
      'Trascina o seleziona il file dello scontrino/fattura: verrà custodito nel Vault locale.',
      'Se devi vendere il pezzo o aprire un ticket RMA, potrai visualizzare e scaricare la ricevuta originale con un click.',
    ],
    tips: [
      'I backup JSON includono i metadati delle ricevute; per file molto voluminosi mantieni copie di sicurezza delle immagini nella tua cartella personale.',
    ],
    keywords: ['ricevuta', 'scontrino', 'fattura', 'garanzia', 'rma', 'vault', 'documenti', 'scadenza'],
    actionLinks: [
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
    ],
  },

  // --- FINANZE & METRICHE ---
  {
    id: 'the-four-financial-metrics',
    title: 'Le 4 Metriche Finanziarie Formali Spiegate',
    category: 'finances',
    badge: 'FINANZE',
    readTime: '3 min',
    summary: 'Zero confusione tra spesa lorda, denaro recuperato, costo netto storico e valore dell\'hardware attuale.',
    content: [
      'Per gestire le finanze dell\'hardware senza ambiguità, PC Tracker implementa 4 metriche pure e isolate, ciascuna con un significato economico preciso:',
      '1. Totale Acquistato Storico: La somma di tutti i prezzi di acquisto e delle spese accessorie (cavi sleeve, raccordi, pad termici) sostenute nella storia.',
      '2. Totale Recuperato dalle Vendite: Il denaro netto effettivamente incassato rivendendo i pezzi dismessi (già decurtato di spese di spedizione e commissioni di piattaforma).',
      '3. Costo Netto Storico: La differenza tra tutto ciò che hai speso e tutto ciò che hai incassato. Rappresenta il vero "fondo perduto" speso per la tua passione nel corso degli anni.',
      '4. Costo Configurazione Attuale: Il costo storico di acquisto dei soli componenti che si trovano fisicamente montati all\'interno del computer in questo momento.',
    ],
    formula: {
      title: 'Equazioni Finanziarie del Motore di Calcolo',
      equation: 'Totale Acquistato = Σ(Prezzi Acquisto) + Σ(Spese Extra)\nTotale Recuperato = Σ(Prezzo Vendita - Spedizione - Commissioni)\nCosto Netto Storico = Totale Acquistato - Totale Recuperato\nCosto Configurazione Attuale = Σ(Prezzo Acquisto dei pezzi IN USO)',
      explanation: 'Tutti i calcoli sono isolati in src/domain/financialEngine.ts e garantiscono coerenza matematica al centesimo.',
    },
    tips: [
      'Le spese extra (es. spedizione per un reso, pasta termica, cavi modulari) aumentano il Totale Acquistato e il Costo Netto, permettendoti di avere un bilancio onesto al 100%.',
    ],
    keywords: ['finanze', 'metriche', 'totale acquistato', 'totale recuperato', 'costo netto', 'costo attuale', 'formule', 'soldi'],
    actionLinks: [
      { label: 'Apri Statistiche & Finanze', targetSection: 'stats', iconName: 'BarChart3' },
      { label: 'Apri Panoramica', targetSection: 'dashboard', iconName: 'Cpu' },
    ],
  },
  {
    id: 'daily-cost-and-retention',
    title: 'Costo al Giorno (€/die) e Ammortamento Reale',
    category: 'finances',
    badge: 'FINANZE',
    readTime: '2 min',
    summary: 'Scopri quanto ti è costato realmente usare un componente ogni singolo giorno.',
    content: [
      'Spesso ci si chiede se un acquisto costoso sia stato davvero conveniente. Il Costo Giornaliero (€/die) misura il reale ritorno d\'investimento hardware.',
      'Se hai comprato una scheda video a 800€, l\'hai usata per 730 giorni (2 anni) e l\'hai rivenduta a 400€ netti, il suo costo effettivo è stato di 400€ totali, pari a soli 0,55 € al giorno!',
    ],
    formula: {
      title: 'Formula del Costo al Giorno',
      equation: 'Costo al Giorno (€/die) = (Costo Acquisto - Ricavo Vendita Netto) / Giorni di Utilizzo Effettivo',
      explanation: 'I giorni di utilizzo tengono conto solo dei periodi in cui il componente è stato effettivamente montato nel PC.',
    },
    tips: [
      'Puoi ordinare l\'Archivio Pezzi per costo al giorno per scoprire quale componente ha avuto il miglior rapporto longevità/prezzo nella storia del tuo computer.',
    ],
    keywords: ['costo al giorno', 'giorni utilizzo', 'die', 'ammortamento', 'convenienza', 'valore nel tempo'],
    actionLinks: [
      { label: 'Vedi Statistiche di Utilizzo', targetSection: 'stats', iconName: 'BarChart3' },
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
    ],
  },

  // --- TIME TRAVEL & CHECKPOINT ---
  {
    id: 'time-travel-slider',
    title: 'Time Travel: Ricostruire il PC in Qualsiasi Data Passata',
    category: 'time-travel',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Usa lo slider temporale per vedere com\'era composto il tuo computer esattamente in un giorno specifico.',
    content: [
      'Il Time Travel è una delle funzioni più potenti di PC Tracker: sfruttando il motore historyEngine, l\'applicazione può ricostruire lo stato del computer in qualunque data passata T.',
      'Il motore seleziona tutti gli eventi registrati prima o al giorno T: se per un componente l\'ultimo evento a quella data era INSTALL, il pezzo comparirà nel case storico; se era UNINSTALL, comparirà a magazzino; se era prima dell\'acquisto o dopo la vendita, non comparirà affatto.',
    ],
    steps: [
      'Vai nella sezione "Time Travel" dalla barra laterale.',
      'Trascina il cursore temporale sulla data desiderata (oppure clicca su una data chiave nella timeline).',
      'Osserva la configurazione del computer ricostruita deterministicamente per quel giorno.',
      'Verifica il costo totale dei componenti montati a quella data e le relative specifiche.',
    ],
    tips: [
      'Se modifichi retroattivamente la data di un vecchio montaggio, il Time Travel si aggiornerà automaticamente per riflettere la correzione.',
    ],
    keywords: ['time travel', 'viaggio nel tempo', 'passato', 'ricostruzione', 'data storica', 'timeline', 'rig passato'],
    actionLinks: [
      { label: 'Apri Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },
  {
    id: 'checkpoints-immutability',
    title: 'Checkpoint Storici vs Time Travel Dinamico',
    category: 'time-travel',
    badge: 'CONCETTO CHIAVE',
    readTime: '3 min',
    summary: 'Perché i Checkpoint sono fotografie congelate e cosa significano le discrepanze informative.',
    content: [
      'È fondamentale comprendere la differenza concettuale tra Time Travel e Checkpoint:',
      '• Time Travel (Dinamico): È un calcolo matematico sempre vivo. Se cambi la cronologia degli eventi, la ricostruzione temporale si adegua.',
      '• Checkpoint (Fotografia Immutabile): È un\'istantanea volontaria scattata e salvata in un momento preciso (ad esempio "Configurazione Inizio 2024"). Contiene uno snapshot statico e un anchorEventId univoco.',
      'Cosa succede se modifichi o cancelli eventi passati dopo aver salvato un Checkpoint? La regola fondamentale di PC Tracker impone che il Checkpoint NON venga mai alterato o sovrascritto silenziosamente. Invece, il sistema evidenzierà una "Discrepanza Informativa" per trasparenza, informandoti che la cronologia odierna differisce dallo snapshot congelato a suo tempo.',
    ],
    tips: [
      'Crea un Checkpoint ogni volta che completi una build importante o fai un upgrade significativo, così avrai una pietra miliare permanente del tuo computer.',
    ],
    keywords: ['checkpoint', 'snapshot', 'fotografia', 'discrepanza', 'immutabile', 'anchorEventId', 'memoria storica'],
    actionLinks: [
      { label: 'Gestisci Checkpoint in Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },

  // --- UPGRADE & SOSTITUZIONI ---
  {
    id: 'upgrade-wizard-guide',
    title: 'Come Registrare un Cambio Hardware con l\'Upgrade Wizard',
    category: 'upgrades',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Procedura guidata per sostituire un componente (es. da RTX 3080 a RTX 4090) in un unico passaggio atomico.',
    content: [
      'Quando cambi un componente nel tuo computer, fare manualmente acquisto, smontaggio del vecchio e montaggio del nuovo richiede più passaggi. L\'Upgrade Wizard automatizza l\'intero processo in un click.',
      'In una sola operazione:',
      '1. Smonta il componente precedente e lo sposta automaticamente a magazzino.',
      '2. Registra l\'anagrafica e l\'acquisto del nuovo componente.',
      '3. Installa istantaneamente il nuovo pezzo nello slot del computer.',
      '4. Crea un legame formale di Upgrade generazionale tra i due componenti con il calcolo dell\'esborso netto.',
    ],
    steps: [
      'Vai nella sezione "Storico Upgrade" e clicca su "+ Nuovo Upgrade" (oppure apri la scheda di un componente in uso e clicca "Sostituisci / Upgrade").',
      'Seleziona il pezzo uscente che stai rimuovendo.',
      'Inserisci nome, prezzo e data del nuovo pezzo subentrante.',
      'Conferma l\'operazione: il vecchio pezzo andrà a magazzino e il nuovo comparirà subito nel tuo PC.',
    ],
    tips: [
      'Se intendi rivendere subito il vecchio pezzo, lo troverai immediatamente disponibile nella sezione "Vendite & Annunci" pronto per generare l\'annuncio.',
    ],
    keywords: ['upgrade', 'sostituzione', 'cambio', 'wizard', 'nuovo pezzo', 'rtx', 'generazione'],
    actionLinks: [
      { label: 'Apri Storico Upgrade', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'upgrade-net-cost',
    title: 'Formula del Costo Netto di un Upgrade',
    category: 'upgrades',
    badge: 'FINANZE',
    readTime: '2 min',
    summary: 'Come calcolare con precisione quanto hai speso per il salto generazionale hardware.',
    content: [
      'Se compri una scheda video nuova per 1.200€ e vendi la tua vecchia scheda per 600€ netti, l\'upgrade non ti è costato 1.200€, ma esattamente 600€ di differenza.',
      'PC Tracker calcola il Costo Netto dell\'Upgrade mettendo in relazione il costo del nuovo componente con il ricavo netto generato dalla vendita del componente sostituito.',
    ],
    formula: {
      title: 'Formula Costo Netto Upgrade',
      equation: 'Costo Netto Upgrade = Costo Acquisto Nuovo Pezzo - Ricavo Netto Vendita Vecchio Pezzo',
      explanation: 'Se il pezzo vecchio non è ancora stato venduto (è a magazzino), il costo riflette temporaneamente l\'esborso di acquisto del nuovo pezzo.',
    },
    tips: [
      'Nella sezione "Storico Upgrade" puoi consultare l\'elenco di tutti i salti generazionali effettuati negli anni e l\'esborso totale netto sostenuto.',
    ],
    keywords: ['costo netto upgrade', 'spesa upgrade', 'differenza', 'esborso reale', 'upgrade calcolo'],
    actionLinks: [
      { label: 'Vedi Storico Upgrade', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
    ],
  },

  // --- MARKETPLACE & VENDITE ---
  {
    id: 'listing-generator-guide',
    title: 'Generatore Annunci con AI Prompt Builder per Subito, eBay e Vinted',
    category: 'marketplace',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Crea annunci di vendita accattivanti, puliti e formattati su misura per le piattaforme italiane.',
    content: [
      'Quando un componente è a magazzino, puoi metterlo in vendita con facilità. Il Marketplace integrato include un Generatore di Annunci professionale.',
      'Puoi selezionare la piattaforma target (Subito.it, eBay, Vinted, Facebook Marketplace), specificare le condizioni d\'uso (Come nuovo, Ottimo, Con scatola originale, Con garanzia residua) e ottenere una descrizione pronta all\'uso con formattazione ottimale.',
      'Inoltre, l\'AI Prompt Builder ti permette di copiare con un click un prompt avanzato da incollare in ChatGPT o Claude per arricchire ulteriormente il testo con specifiche da vero appassionato.',
    ],
    steps: [
      'Vai nella sezione "Vendite & Annunci" dalla barra laterale.',
      'Seleziona il pezzo a magazzino che vuoi vendere e clicca su "Genera Annuncio".',
      'Personalizza piattaforma, condizioni, prezzo richiesto e dettagli accessori.',
      'Clicca su "Copia Testo Annuncio" e incollalo direttamente su Subito o sulla tua piattaforma preferita.',
    ],
    tips: [
      'Un annuncio che specifica la data esatta di acquisto e i mesi di garanzia residua si vende in media il 40% più velocemente!',
    ],
    keywords: ['guida', 'marketplace', 'vendite', 'annunci', 'annuncio', 'subito', 'ebay', 'vinted', 'facebook', 'prompt builder', 'descrizione'],
    actionLinks: [
      { label: 'Apri Vendite & Annunci', targetSection: 'marketplace', iconName: 'Tag' },
    ],
  },
  {
    id: 'fees-and-shipping',
    title: 'Calcolo Netto Vendita con Commissioni e Spedizione',
    category: 'marketplace',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'Registra le vendite tenendo conto di commissioni di servizio e costi postali per un bilancio perfetto.',
    content: [
      'Quando vendi un componente su piattaforme online, il prezzo pagato dall\'acquirente non corrisponde quasi mai a quanto ti entra in tasca:',
      '• Commissioni di piattaforma (es. TuttoSubito, tariffe eBay, protezione acquisti).',
      '• Costi di spedizione ed imballaggio sostenuti direttamente da te.',
      'Quando registri una vendita su PC Tracker, puoi specificare separatamente sia il costo di spedizione che le commissioni. L\'applicazione calcolerà il Ricavo Netto e aggiornerà il Totale Recuperato.',
    ],
    formula: {
      title: 'Formula Ricavo Netto Vendita',
      equation: 'Ricavo Netto = Prezzo di Vendita - Spese di Spedizione a Tuo Carico - Commissioni Piattaforma',
      explanation: 'Il Totale Recuperato delle Vendite sommerà unicamente il valore netto reale incassato.',
    },
    tips: [
      'Se vendi a mano con scambio di persona in contanti, imposta semplicemente le commissioni e le spese di spedizione a 0€.',
    ],
    keywords: ['commissioni', 'spedizione', 'ricavo netto', 'vendita netta', 'tasse subito', 'tariffe ebay'],
    actionLinks: [
      { label: 'Apri Vendite & Annunci', targetSection: 'marketplace', iconName: 'Tag' },
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },

  // --- MANUTENZIONE WINDOWS ---
  {
    id: 'windows-tools-explained',
    title: 'Strumenti Nativi Windows: Shader Cache, DNS e Driver Video',
    category: 'maintenance',
    badge: 'WINDOWS',
    readTime: '3 min',
    summary: 'Cosa fanno i comandi nativi di pulizia e manutenzione del sistema integrati in PC Tracker.',
    content: [
      'Il "Windows Maintenance Center" di PC Tracker mette a disposizione strumenti rapidi e sicuri per mantenere il PC fluido e scattante:',
      '• Pulizia Shader Cache DirectX: Elimina la cartella D3DSCache in AppData. Risolve micro-stuttering e glitch grafici nei giochi dopo l\'aggiornamento di Windows o dei driver.',
      '• Pulizia Shader Cache Nvidia / AMD: Svuota le cache dei driver grafici (NV_Cache e DxCache). Utile se i giochi crashano all\'avvio dopo un cambio GPU.',
      '• Svuotamento Cache DNS (Flush DNS): Esegue `ipconfig /flushdns` per risolvere problemi di connessione e aggiornare i record di rete obsoleti.',
      '• Svuotamento Cartelle Temp: Esegue la pulizia delle cartelle temporanee utente per recuperare spazio su disco ed eliminare file orfani.',
      '• Scorciatoia Riavvio Driver Grafico: Ti ricorda la combinazione nativa `Win + Ctrl + Shift + B`, che riavvia il sottosistema video di Windows in 1 secondo in caso di freeze dello schermo.',
    ],
    tips: [
      'Tutti gli script di pulizia sono sicuri al 100%: operano solo sulle cache rigenerabili e non toccano file personali, salvataggi o impostazioni di gioco.',
    ],
    keywords: ['manutenzione', 'windows', 'shader cache', 'directx', 'nvidia', 'amd', 'dns', 'driver video', 'pulizia temp'],
    actionLinks: [
      { label: 'Apri Centro Manutenzione', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'thermal-maintenance-schedule',
    title: 'Registro Termico, Sostituzione Pasta Termica e Pulizia Polvere',
    category: 'maintenance',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Pianifica le pulizie periodiche per mantenere basse temperature e preservare la silenziosità della build.',
    content: [
      'Polvere nei radiatori e pasta termica secca sono le prime cause di thermal throttling e rumorosità eccessiva delle ventole.',
      'Nel Centro Manutenzione puoi:',
      '1. Registrare gli interventi di pulizia filtri antipolvere (consigliata ogni 3-6 mesi).',
      '2. Monitorare quando hai effettuato l\'ultimo re-pasting di CPU o GPU (consigliato ogni 18-24 mesi con paste di alta qualità).',
      '3. Salvare note sul Tuning Journal (es. impostazioni di Undervolt stabili, profili curve ventole nel BIOS, temperature massime registrate in Cinebench).',
    ],
    tips: [
      'Segna le temperature di riferimento subito dopo aver applicato la pasta termica nuova: ti serviranno da benchmark per capire se nei mesi successivi le prestazioni termiche degradano.',
    ],
    keywords: ['pasta termica', 'polvere', 'temperature', 're-paste', 'pulizia', 'filtri', 'undervolt', 'tuning'],
    actionLinks: [
      { label: 'Apri Registro Manutenzione', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },

  // --- BACKUP & PRIVACY ---
  {
    id: 'local-first-and-privacy',
    title: '100% Locale su IndexedDB: Privacy Assoluta e Zero Cloud',
    category: 'backup-privacy',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'I tuoi dati risiedono unicamente sul tuo computer. Nessun account, nessun server remoto, nessun tracciamento.',
    content: [
      'PC Tracker è costruito secondo il paradigma Local-First:',
      '• Tutti i componenti, gli eventi, le spese e le ricevute sono memorizzati nel motore di persistenza IndexedDB all\'interno del browser o della webview locale.',
      '• Non esiste alcun server centrale, nessun database remoto e nessun sistema di autenticazione. Nessuno può vedere il tuo hardware, i tuoi prezzi o la tua cronologia.',
      '• L\'applicazione funziona interamente offline: puoi avviarla senza connessione a internet in totale autonomia.',
    ],
    tips: [
      'Poiché non esiste un cloud remoto che sincronizza i dati, la responsabilità dei backup è nelle tue mani. Fai un export JSON regolare per stare tranquillo!',
    ],
    keywords: ['privacy', 'locale', 'local-first', 'indexeddb', 'offline', 'nessun cloud', 'sicurezza'],
    actionLinks: [
      { label: 'Vai alle Impostazioni', targetSection: 'settings', iconName: 'Settings' },
    ],
  },
  {
    id: 'backup-restore-safeguards',
    title: 'Backup JSON Versionati & Validazione Anti-Corruzione',
    category: 'backup-privacy',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Come esportare e ripristinare il tuo database in totale sicurezza con validazione automatica pre-import.',
    content: [
      'I backup di PC Tracker sono salvati in formato JSON chiaro e leggibile con un numero di versione dello schema (`schemaVersion: 1`).',
      'Prima di ripristinare un file di backup, il sistema esegue una validazione strutturale automatica: verifica l\'integrità degli ID, controlla le relazioni tra eventi e componenti e mostra un\'anteprima dettagliata con il numero di pezzi ed eventi contenuti nel file.',
      'Se il file risulta corrotto o non conforme, l\'importazione viene bloccata preventivamente per proteggere i tuoi dati locali.',
    ],
    steps: [
      'Per scaricare un backup immediato, clicca sul pulsante "Backup JSON" nell\'intestazione in alto.',
      'Il file verrà salvato con il timestamp del giorno (es. `pc-tracker-backup-2026-09-18.json`).',
      'Per ripristinare un backup su un altro PC o dopo un formattone, clicca su "Importa JSON" nell\'header oppure vai in Impostazioni.',
      'Esamina l\'anteprima e conferma per sovrascrivere o unire i dati.',
    ],
    tips: [
      'Conserva una copia periodica del tuo file JSON su una chiavetta USB o sul tuo storage personale.',
    ],
    keywords: ['backup', 'ripristino', 'import', 'export', 'json', 'validazione', 'sicurezza dati'],
    actionLinks: [
      { label: 'Apri Impostazioni & Backup', targetSection: 'settings', iconName: 'Settings' },
    ],
  },

  // --- FAQ ---
  {
    id: 'faq-ram-kit',
    title: 'Come conviene tracciare un Kit di RAM (2 o 4 banchi)?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'È meglio inserire il kit come singolo pezzo o dividere i banchi singolarmente?',
    content: [
      'La prassi consigliata è inserire il kit come un unico componente (es. "Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz CL30"), con il prezzo complessivo pagato.',
      'Questo semplifica enormemente il tracciamento di garanzia e fattura, poiché i kit di RAM vengono solitamente venduti, garantiti e sostituiti in coppia.',
      'Se invece acquisti banchi singoli separati in momenti o negozi diversi, registrali come componenti distinti per assegnare a ciascuno la propria data e il proprio slot di montaggio (es. "Slot DDR5 A2" e "Slot DDR5 B2").',
    ],
    tips: [
      'Nel campo Note del componente puoi annotare i timing esatti (tCL, tRCD, tRP, tRAS) e il voltaggio del profilo EXPO o XMP.',
    ],
    keywords: ['ram', 'kit ram', 'dual channel', 'banchi', 'memoria', 'ddr4', 'ddr5', 'faq'],
    actionLinks: [
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'faq-used-and-free',
    title: 'Posso inserire componenti acquistati usati o ricevuti in regalo a 0€?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Come gestire pezzi di seconda mano, regali o componenti recuperati da vecchi computer.',
    content: [
      'Certamente! PC Tracker gestisce nativamente qualsiasi tipo di acquisizione:',
      '• Componenti Usati: Nell\'evento di acquisto seleziona la condizione "Usato" e inserisci il prezzo effettivamente pagato al venditore.',
      '• Componenti Regalati o a 0€: Puoi impostare il prezzo di acquisto a 0,00 €. Il pezzo farà parte della configurazione del PC senza appesantire il Totale Acquistato Storico.',
      '• Componenti Dismessi o Ceduti: Se in futuro decidi di regalare un pezzo a un amico, puoi usare l\'evento "Regalo (GIFT)", indicando il destinatario.',
    ],
    tips: [
      'Anche per i pezzi usati puoi registrare la data di acquisto originale (se il venditore ti fornisce la ricevuta) per continuare a monitorare la garanzia residua del produttore.',
    ],
    keywords: ['usato', 'regalo', 'zero euro', 'seconda mano', 'gratis', 'condizione', 'faq'],
    actionLinks: [
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'faq-wrong-dates',
    title: 'Cosa fare se ho sbagliato a inserire una data o un prezzo passato?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Come correggere o eliminare eventi passati senza rischiare di rompere il database.',
    content: [
      'Nessun problema: puoi correggere qualunque informazione in qualsiasi momento!',
      '1. Apri la schermata "Archivio Pezzi" e clicca sul componente interessato.',
      '2. Scorri fino alla timeline verticale della cronologia eventi.',
      '3. Clicca sull\'evento che desideri modificare per correggere la data, il prezzo, lo slot o le note (oppure eliminalo se inserito per errore).',
      'Il motore di ciclo vitale e il motore finanziario ricalcoleranno istantaneamente lo stato del pezzo, i giorni di utilizzo e le metriche complessive.',
    ],
    tips: [
      'Grazie all\'architettura event-driven, una correzione retroattiva si propaga in modo pulito e deterministico su tutta l\'applicazione.',
    ],
    keywords: ['errore', 'sbaglio', 'correggere', 'modificare evento', 'cancellare', 'data errata', 'prezzo errato', 'faq'],
    actionLinks: [
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'faq-offline-use',
    title: 'PC Tracker funziona anche senza connessione internet?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Compatibilità con l\'uso offline e indipendenza dalla rete.',
    content: [
      'Sì, al 100%! PC Tracker è un software interamente locale. Tutti i file dell\'interfaccia, i motori di calcolo e il database IndexedDB girano sul tuo computer.',
      'Non è richiesta alcuna connessione internet per visualizzare, inserire o modificare i tuoi dati, fare ricerche, scattare checkpoint o eseguire le routine di manutenzione Windows.',
      'L\'unica funzionalità che può utilizzare la rete è il controllo opzionale degli aggiornamenti software (se abilitato).',
    ],
    tips: [
      'Puoi portare l\'applicazione su un portatile in mobilità o su un PC da banco di test isolato senza perdere nessuna funzionalità.',
    ],
    keywords: ['offline', 'internet', 'connessione', 'rete', 'funzionamento', 'faq'],
    actionLinks: [
      { label: 'Apri Impostazioni', targetSection: 'settings', iconName: 'Settings' },
    ],
  },

  // --- GLOSSARIO HARDWARE ---
  {
    id: 'glossary-tdp-tgp',
    title: 'TDP vs TGP: Potenza e Dissipazione Termica',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'Cosa indicano il Thermal Design Power di CPU e il Total Graphics Power delle schede video.',
    content: [
      'Il TDP (Thermal Design Power) indica il calore massimo in Watt che il sistema di raffreddamento della CPU deve essere in grado di dissipare sotto carichi di lavoro intensi.',
      'Il TGP (Total Graphics Power) misura invece il consumo energetico complessivo dell\'intera scheda video: non solo il silicio della GPU, ma anche le memorie VRAM, le fasi di alimentazione VRM, le ventole e i LED RGB.',
    ],
    tips: [
      'Quando scegli l\'alimentatore (PSU) o un dissipatore ad aria/liquido, controlla sempre il picco massimo assorbito (Package Power o Power Limit) e non solo il TDP base.',
    ],
    keywords: ['tdp', 'tgp', 'consumo', 'watt', 'calore', 'dissipazione', 'potenza', 'alimentatore', 'glossario'],
    actionLinks: [
      { label: 'Apri Il Mio PC', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-undervolt',
    title: 'Undervolt: Ridurre Temperature e Consumi a Parità di Prestazioni',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'La tecnica di ottimizzazione della curva tensione/frequenza più usata dagli appassionati.',
    content: [
      'L\'undervolting consiste nel ridurre la tensione elettrica (Vcore per la CPU o VGPU per la scheda grafica) fornita dal circuito di alimentazione, mantenendo inalterate le frequenze di clock.',
      'Poiché la potenza termica dissipata scala in modo quadratico con il voltaggio, un calo di appena 50-100mV consente di abbattere le temperature di 5-10°C, eliminare il thermal throttling e ridurre drasticamente il rumore delle ventole.',
    ],
    tips: [
      'Testa sempre la stabilità del sistema con benchmark e sessioni prolungate di gioco, e annota le impostazioni stabili nel Tuning Journal del Centro Manutenzione.',
    ],
    keywords: ['undervolt', 'voltaggio', 'tensione', 'vcore', 'temperature', 'silenziosita', 'efficienza', 'curva', 'glossario'],
    actionLinks: [
      { label: 'Apri Centro Manutenzione', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-thermal-throttling',
    title: 'Thermal Throttling: Meccanismo di Autoprotezione Termica',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'Come e perché processore e scheda video tagliano le frequenze quando superano le temperature critiche.',
    content: [
      'Quando un chip raggiunge la temperatura limite di giunzione (TjMax, tipicamente tra 90°C e 105°C), i sensori interni ordinano un calo repentino di frequenza e tensione per evitare danni irreversibili al silicio.',
      'Questo fenomeno, detto "thermal throttling", si manifesta nei videogiochi con improvvisi cali di framerate (stuttering) e nei rendering con tempi di completamento sensibilmente dilatati.',
    ],
    tips: [
      'Se il tuo PC soffre di thermal throttling, verifica che i radiatori non siano intasati da polvere o valuta una sostituzione della pasta termica nel Centro Manutenzione.',
    ],
    keywords: ['thermal throttling', 'throttling', 'temperature alte', 'surriscaldamento', 'calo frame', 'stuttering', 'tjmax', 'glossario'],
    actionLinks: [
      { label: 'Apri Centro Manutenzione', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-coil-whine',
    title: 'Coil Whine: Origine del Ronzio Elettrico e Mitigazione',
    category: 'glossary',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Cosa provoca il tipico sibilo/ronzio nelle schede video ad alti framerate e come attenuarlo.',
    content: [
      'Il coil whine è una vibrazione fisica ad altissima frequenza che interessa gli induttori (bobine) dei circuiti VRM sulla scheda video o nell\'alimentatore quando attraversati da correnti intense.',
      'Si tratta di un fenomeno del tutto fisiologico e innocuo che non compromette la vita utile o le prestazioni dell\'hardware.',
    ],
    tips: [
      'Attivare G-Sync/FreeSync o limitare il framerate massimo (es. a 144 FPS) riduce drasticamente l\'assorbimento negli induttori attenuando o azzerando il ronzio.',
    ],
    keywords: ['coil whine', 'fischio', 'ronzio', 'induttori', 'vrm', 'scheda video', 'rumore elettrico', 'glossario'],
    actionLinks: [
      { label: 'Apri Centro Manutenzione', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-xmp-expo',
    title: 'XMP vs EXPO: Profili di Overclock della Memoria RAM',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'La differenza tra i profili Intel Extreme Memory Profile e AMD Extended Profiles for Overclocking.',
    content: [
      'Di fabbrica, qualsiasi kit di RAM si avvia alle frequenze conservative stabilite dallo standard JEDEC (es. 4800MHz per DDR5). Per sfruttare la velocità nominale acquistata (es. 6000MHz), è indispensabile abilitare il profilo nel BIOS.',
      '• XMP: Standard sviluppato da Intel per le piattaforme Core.',
      '• EXPO: Standard royalty-free sviluppato da AMD per la piattaforma AM5 / Ryzen 7000-9000, con timing ottimizzati specificamente per l\'architettura Zen.',
    ],
    tips: [
      'Le schede madri recenti permettono di abilitare kit XMP su processori AMD (tramite DOCP/EXPO emulation) e moduli EXPO su Intel in totale trasparenza.',
    ],
    keywords: ['xmp', 'expo', 'overclock ram', 'frequenza ram', 'bios', 'profilo memoria', 'jedec', 'docp', 'glossario'],
    actionLinks: [
      { label: 'Apri Il Mio PC', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-cas-latency',
    title: 'CAS Latency (CL) & Timing delle Memorie RAM',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Come interpretare la sigla CL30, CL36 o CL40 e il calcolo della latenza reale in nanosecondi.',
    content: [
      'La CAS Latency (CL) indica il numero di cicli di clock che la RAM impiega per fornire un dato al processore una volta inviato il comando di lettura.',
      'A parità di frequenza operativa (es. 6000MHz), un valore CL più basso (es. CL30 rispetto a CL36) corrisponde a una latenza effettiva minore e a migliori tempi di risposta del sistema.',
    ],
    formula: {
      title: 'Formula Latenza Reale della Memoria (in Nanosecondi)',
      equation: 'Latenza Reale (ns) = (CL * 2000) / Frequenza Nominale in MHz\nEsempio DDR5-6000 CL30: (30 * 2000) / 6000 = 10,00 ns\nEsempio DDR5-6000 CL36: (36 * 2000) / 6000 = 12,00 ns',
      explanation: 'Una memoria con frequenza leggermente inferiore ma CL molto basso può risultare più veloce nei tempi di accesso rispetto a una memoria ad alti MHz con CL elevato.',
    },
    tips: [
      'Per i processori AMD Ryzen serie 7000 e 9000, il miglior compromesso qualità/prezzo e prestazioni è rappresentato da moduli DDR5 a 6000MHz con timing CL30.',
    ],
    keywords: ['cas latency', 'cl', 'timing', 'cl30', 'cl36', 'latenza ram', 'nanosecondi', 'formula ram', 'glossario'],
    actionLinks: [
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'glossary-bottleneck',
    title: 'Bottleneck Hardware: Collo di Bottiglia tra CPU e GPU',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'Come capire quale componente sta limitando le prestazioni massime del tuo computer.',
    content: [
      'Si parla di collo di bottiglia (bottleneck) quando le prestazioni complessive del sistema sono vincolate dal componente più lento della catena, lasciando gli altri sottoutilizzati.',
      '• CPU Bottleneck: Si verifica tipicamente a risoluzioni basse (1080p) con impostazioni competitive ad altissimo framerate. La scheda grafica lavora al 60-70% perché il processore non riesce a preparare abbastanza frame.',
      '• GPU Bottleneck: Si verifica a risoluzioni elevate (1440p / 4K) o con Ray Tracing attivo. La GPU lavora al 99-100% delle sue capacità mentre la CPU è rilassata.',
    ],
    tips: [
      'In qualsiasi computer da gaming esisterà sempre un componente limitante: la configurazione ideale è quella con GPU al 99% alla risoluzione desiderata.',
    ],
    keywords: ['bottleneck', 'collo di bottiglia', 'cpu limit', 'gpu limit', 'bilanciamento', 'framerate', 'glossario'],
    actionLinks: [
      { label: 'Vedi Storico Upgrade', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
    ],
  },
  {
    id: 'glossary-rma',
    title: 'RMA (Return Merchandise Authorization): Garanzie e Resi',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'Cos\'è e come funziona la procedura formale di reso o sostituzione con il produttore hardware.',
    content: [
      'L\'RMA è il codice univoco di autorizzazione al reso fornito dal produttore dell\'hardware (es. Corsair, Seasonic, ASUS, MSI) per consentire la spedizione di un pezzo difettoso ai centri di assistenza.',
      'Molti marchi offrono garanzie estese da 3 a 10 anni (specialmente su memorie RAM, dissipatori a liquido e alimentatori) che subentrano dopo i 24 mesi di garanzia legale del venditore.',
    ],
    tips: [
      'Carica sempre la foto dello scontrino o fattura nel Vault Ricevute di PC Tracker: ti consentirà di avviare una pratica RMA in 2 minuti fornendo prova immediata di acquisto.',
    ],
    keywords: ['rma', 'garanzia', 'reso', 'riparazione', 'sostituzione', 'guasto', 'produttore', 'assistenza', 'glossario'],
    actionLinks: [
      { label: 'Apri Archivio Pezzi', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'glossary-pcie-gen',
    title: 'PCI Express: Differenze tra PCIe 4.0 e PCIe 5.0',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Raddoppio della banda passante per linea e compatibilità tra GPU e SSD NVMe moderni.',
    content: [
      'Ogni generazione del bus PCI Express raddoppia la velocità di trasferimento teorica per singola corsia (lane):',
      '• PCIe 4.0: ~2 GB/s per corsia (~32 GB/s su slot x16). Ideale per tutte le attuali schede video gaming e per SSD con velocità fino a 7.500 MB/s.',
      '• PCIe 5.0: ~4 GB/s per corsia (~64 GB/s su slot x16). Consente agli SSD NVMe di superare i 14.000 MB/s di lettura sequenziale.',
      'Gli slot PCIe sono completamente retrocompatibili: un componente PCIe 4.0 può essere installato in uno slot PCIe 5.0 e viceversa senza alcun problema.',
    ],
    tips: [
      'Nei videogiochi attuali, la differenza prestazionale tra PCIe 4.0 x16 e PCIe 5.0 x16 è inferiore all\'1%. Non serve cambiare scheda madre solo per il PCIe 5.0 sulla GPU!',
    ],
    keywords: ['pcie', 'pci express', 'pcie 4.0', 'pcie 5.0', 'banda passante', 'linee pcie', 'nvme gen5', 'corsie', 'glossario'],
    actionLinks: [
      { label: 'Apri Il Mio PC', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-dual-channel',
    title: 'Dual Channel: Perché Montare 2 Banchi Raddoppia la Banda',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'L\'importanza di montare i banchi di memoria negli slot corretti della scheda madre.',
    content: [
      'Il Dual Channel permette al memory controller integrato nella CPU di dialogare simultaneamente con due canali a 64-bit distinti, raddoppiando l\'ampiezza di banda complessiva rispetto all\'uso di un solo banco (Single Channel).',
      'Sulle schede madri a 4 slot, per attivare il Dual Channel i due moduli devono essere inseriti negli slot corretti indicati dal produttore (nella quasi totalità delle schede: slot 2 e slot 4, ovvero A2 e B2).',
    ],
    tips: [
      'Evita categoricamente di assemblare un PC gaming con un singolo banco da 16GB o 32GB: il Single Channel dimezza il transfer rate della RAM e causa gravi cali di 1% Low nei giochi.',
    ],
    keywords: ['dual channel', 'canali memoria', 'slot a2 b2', 'single channel', 'banda ram', 'prestazioni ram', 'glossario'],
    actionLinks: [
      { label: 'Nuovo Movimento', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'glossary-80-plus-atx3',
    title: 'Certificazioni 80 Plus & Standard ATX 3.0 degli Alimentatori',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Efficienza energetica (Bronze, Gold, Platinum) e gestione dei picchi transitori con connettore 12V-2x6.',
    content: [
      'La certificazione 80 Plus misura l\'efficienza con cui l\'alimentatore converte la corrente alternata (dalla presa a muro) in corrente continua per i componenti del PC:',
      '• 80 Plus Gold: Garantisce almeno il 90% di efficienza al 50% di carico, riducendo la dispersione termica e i consumi in bolletta.',
      '• Standard ATX 3.0 / 3.1: Specifica introdotta per gestire i picchi transitori di assorbimento (power spikes fino al 200% della potenza nominale) e dotata del connettore nativo a 16-pin (12V-2x6 / 12VHPWR) per alimentare le schede video più energivore.',
    ],
    tips: [
      'Un alimentatore di qualità garantisce una tensione pulita a tutte le componenti e può sopravvivere a più generazioni di PC: è l\'investimento più duraturo dell\'intera build.',
    ],
    keywords: ['alimentatore', 'psu', '80 plus', 'gold', 'platinum', 'atx 3.0', '12vhpwr', '12v-2x6', 'efficienza', 'picchi transitori', 'glossario'],
    actionLinks: [
      { label: 'Apri Il Mio PC', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
];
