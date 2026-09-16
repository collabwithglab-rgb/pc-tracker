# Roadmap di Sviluppo — PC Hardware & Upgrade Tracker

La roadmap è organizzata in fasi sequenziali, indipendenti, verificabili e modulari. Ogni fase ha obiettivi chiari e criteri di accettazione specifici.

---

## Panoramica delle Fasi

| Fase | Nome Fase | Descrizione Sintetica | Output Verificabile |
| :---: | :--- | :--- | :--- |
| **0** | **Progettazione & Architettura** *(Attuale)* | Specifiche, data model event-driven, UX/UI, `GEMINI.md` | Documentazione e modello dati approvati |
| **1** | **Fondamenta del Progetto** | Scaffolding Vite + React + TS, Design System Vanilla CSS | App funzionante con shell e tema dark |
| **2** | **Core Dominio & Persistenza** | Motore eventi, calcoli finanziari, IndexedDB Single Source of Truth | Logica pura testabile e salvataggio locale |
| **3** | **Layout & Navigazione** | Shell dell'applicazione, header, sidebar, navigazione reattiva | Navigazione fluida tra tutte le sezioni |
| **4** | **Dashboard & KPI** | 4 metriche finanziarie chiave, snapshot rig, feed attività | Dashboard reattiva con calcoli rigorosi |
| **5** | **Configurazione Attuale ("Il Mio PC")** | Gestione visiva dei componenti montati, slot categorie | Vista rig organizzata con status `IN_USE` |
| **6** | **Archivio & Scheda Dettaglio** | Lista completa, filtri per stato, scheda pezzo con Timeline | Timeline interattiva e filtri veloci |
| **7** | **Flusso "+ Nuovo Movimento" & Upgrade** | Modale unificata per acquisti, vendite, cambi e upgrade guidati | Inserimento veloce a zero attrito |
| **8** | **Statistiche & Analisi Finanziaria** | Spesa nel tempo per anno/mese, categorie, grafici | Analisi economica retrospettiva |
| **9** | **Backup, Export & Ripristino** | Download JSON da IndexedDB, ripristino con validazione, CSV | Protezione totale contro perdita dati |
| **10** | **Importazione Dati Reali del Tuo PC** | Analisi del foglio di calcolo fornito dall'utente e caricamento | Database popolato con lo storico reale |
| **11** | **Rifinitura Estetica, Responsive & Polish** | Micro-animazioni, scorciatoie tastiera, responsive testing | Esperienza d'uso premium completata |

---

## Dettaglio Operativo per Singola Fase

### FASE 0 — Progettazione & Architettura (FASE ATTUALE)
- [x] Studio approfondito dei requisiti e filosofia del progetto.
- [x] Progettazione modello dati basato su Event Sourcing e ciclo di vita.
- [x] Scelta dello stack tecnologico motivata (Vite + React + TypeScript + Vanilla CSS + IndexedDB).
- [x] Specificazione di IndexedDB come **unica fonte di verità** (nessun mirroring dati su localStorage).
- [x] Separazione esplicita degli eventi `GIFT` e `DISPOSAL` con stati derivati `GIFTED` e `DISPOSED`.
- [x] Formalizzazione dell'algoritmo di ricostruzione storica della configurazione a data $T$ (`getConfigurationAtDate`).
- [x] Formalizzazione matematica delle 4 metriche finanziarie chiave (Acquistato, Recuperato, Netto, Costo Attuale).
- [x] Redazione e revisione di `docs/architecture.md`, `docs/data-model.md`, `docs/ux.md`, `docs/roadmap.md`.
- [x] Creazione e aggiornamento di `GEMINI.md` come memoria permanente di progetto.
- [x] **Revisione e approvazione finale da parte dell'utente per l'inizio della Fase 1** (Approvata).

---

### FASE 1 — Fondamenta del Progetto (COMPLETATA)
- [x] Setup ambiente Vite con TypeScript strict mode (`strict: true`).
- [x] Configurazione variabili CSS (`variables.css`, `global.css`, `components.css`) con design tokens (colori dark enthusiast, spaziature, ombre, glow).
- [x] Struttura cartelle modulare (`src/components`, `src/domain`, `src/storage`, `src/store`, `src/types`, `src/styles`, `src/pages`).
- [x] Tipografia e stili base (font moderni Inter/Outfit/JetBrains Mono, scrollbar personalizzata dark).
- [x] Shell applicativa iniziale (`AppShell`, `Sidebar`, `Header`, 6 placeholder delle sezioni).
- [x] Contratti TypeScript completi (`Component`, `ComponentEvent` discriminated union, `Upgrade`, `DatabaseSchema`).
- [x] Infrastruttura IndexedDB nativa come Single Source of Truth (`indexedDB.ts`, `storageService.ts`, `migrations.ts`).
- [x] Fondamenta dei Domain Engine (`financialEngine.ts`, `lifecycleEngine.ts`, `historyEngine.ts`, `upgradeEngine.ts`).
- [x] Suite di test unitari automatici su Vitest: 12 test passati con successo al 100%.
- [x] Verifica rendering browser: avvio server Vite, navigazione funzionante, zero errori console.
- [x] Creazione dello script `avvia-pc-tracker.bat` per avvio rapido con doppio click su Windows.
- [x] **Criterio di verifica superato**: L'app compila senza errori TypeScript, i test unitari passano al 100%, l'app renderizza la shell dark e IndexedDB è attivo.

---

### FASE 2 — Gestione Componenti, CRUD & Persistenza IndexedDB (COMPLETATA)
- [x] Flusso atomico e a basso attrito di creazione componente con primo acquisto opzionale contestuale.
- [x] Modulo di validazione pura (`validators.ts`) per campi obbligatori, categorie valide, prezzi non negativi e date ISO.
- [x] Generazione di identificativi univoci e stabili UUID (`generateId`).
- [x] Rafforzamento dell'integrità referenziale in `storageService.ts` (impossibile associare eventi a componenti inesistenti).
- [x] Cancellazione a cascata atomica di componenti ed eventi associati.
- [x] Modale `ComponentFormModal` sia per creazione che per modifica anagrafica.
- [x] Modale `DeleteConfirmModal` con avviso trasparente sul numero di eventi eliminati a cascata.
- [x] Pagina `ArchivePage` con stato vuoto personalizzato ("Non hai ancora aggiunto componenti"), ricerca testuale, filtro categorie e filtro stati.
- [x] Pagina `ComponentDetailPage` con indicatori finanziari del pezzo, scheda tecnica e cronologia eventi.
- [x] Sistema di notifiche visive non bloccanti (`Toast.tsx`).
- [x] Test automatici estesi a 22 test (unitari + validazione + integrità referenziale + cascade delete) passati al 100%.
- [x] Verifica completa nel browser reale: creazione, modifica, persistenza al ricaricamento di pagina, eliminazione e console a 0 errori.
- [x] **Criterio di verifica superato**: L'utente può creare, modificare, consultare ed eliminare componenti con persistenza reale su IndexedDB e dati intatti dopo il refresh.

---

### FASE 3 — Gestione Configurazione Attuale ("Il Mio PC"), Installazione & Rimozione (COMPLETATA)
- [x] Sviluppo schermata funzionale `CurrentRigPage` ("Il Mio PC") organizzata per raggruppamenti hardware (Core, Storage & Cooling, Power & Chassis, Periferiche).
- [x] Card hardware dedicata per ogni componente installato (`IN_USE`) con slot/location, data installazione e calcolo dinamico giorni di utilizzo ("in uso da X giorni").
- [x] Gestione elegante degli slot vuoti con stato visivo personalizzato e azione rapida "+ Monta in questo slot".
- [x] Flusso di installazione (`InstallModal`): data obbligatoria/modificabile, slot opzionale, selezione componente disponibile dal magazzino (`IN_STORAGE`).
- [x] Validazione nel Domain Layer (`validateInstallEvent`): blocco doppia installazione, blocco componenti terminali (`SOLD`, `GIFTED`, `DISPOSED`).
- [x] Flusso di rimozione (`UninstallModal`): data, motivo ('upgrade' | 'maintenance' | 'storage' | 'defect' | 'other'), note; il componente passa a `IN_STORAGE`.
- [x] Validazione rimozione nel Domain Layer (`validateUninstallEvent`): blocco rimozione se il pezzo non è montato.
- [x] Flusso di sostituzione rapida (`ReplaceModal`): combinazione atomica di `UNINSTALL` vecchio + `INSTALL` nuovo pezzo.
- [x] Aggiornamento `ArchivePage` con azione rapida "Monta" e `ComponentDetailPage` con azioni "Monta nel PC" / "Smonta dal PC" / "Sostituisci" e timeline arricchita.
- [x] Suite test automatici Vitest dedicata (`installLifecycle.test.ts`) con 9 test specifici superati.
- [x] Collaudo End-to-End nel browser reale e persistenza IndexedDB confermata con refresh. Database finale pulito e console a 0 errori e 0 warning.
- [x] **Criterio di verifica superato**: L'utente può aprire "Il Mio PC", montare pezzi dal magazzino, rimuoverli, sostituirli, consultare i giorni di utilizzo e ritrovare la cronologia intatta.

---

### FASE 3.5 — Design Audit, UI Polish & Visual Quality Gate (COMPLETATA)
- [x] Audit critico e stesura del documento di riferimento `docs/design-audit.md`.
- [x] Aggiunta della regola permanente "Anti AI-Slop" e "Less, but better" in `GEMINI.md` (Sezione 6.1).
- [x] Risoluzione della duplicazione "++" sui pulsanti d'azione (Header, Archivio, Il Mio PC) per un rendering pulito `[Icon] Label`.
- [x] Centralizzazione delle classi form in `components.css` (`.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-actions`, `.form-error-banner`), eliminando oltre 400 righe di stili inline duplicati nei modali.
- [x] Ottimizzazione del dimensionamento dei modali con eliminazione dello scrolling superfluo su schermi 840px.
- [x] Riprogettazione sidebar con sezioni chiare (`PRINCIPALE`, `SISTEMA`), chip icon terminale e firma personale discreta: `Made by Peppe` • `[@peppesthoughtss ↗](https://www.instagram.com/peppesthoughtss/)`.
- [x] Palette dark calibrata (`#080c14`, `#0f1626`, `#151f32`) con bordi sottili al 7% di opacità e pulsante primario solido ad alto contrasto.
- [x] Superamento del Quality Gate a 10 criteri visivi nel browser reale con zero errori in console.
- [x] **Criterio di verifica superato**: L'app si presenta come un prodotto software personale, coerente, curato ed elegante, privo di cliché o elementi visivamente superflui.

---

### FASE 4 — Dashboard Generale, KPI Finanziari & Ultimi Movimenti
- Sviluppo delle Hero Metric Cards basate su `financialEngine`:
  - Totale Acquistato Storico, Totale Recuperato dalle Vendite, Costo Netto Storico, Costo Configurazione Attuale, Componenti Attivi nel PC, Componenti a Magazzino.
- Sezione griglia rapida "Rig Attuale in Sintesi": visualizzazione immediata delle parti principali del PC montato.
- Feed "Ultimi Movimenti": elenco cronologico reattivo delle azioni recenti (acquisti, montaggi, smontaggi).
- **Criterio di verifica**: Le 4 metriche finanziarie formali e lo stato del PC si aggiornano in tempo reale e deterministicamente senza errori.

---

### FASE 6 — Archivio Componenti & Scheda Dettaglio con Timeline
- Catalogo filtrabile: filtri per stato esplicito (Tutti, In Uso, In Magazzino, Venduto, Regalato, Smaltito) e per categoria.
- Ricerca rapida full-text (nome, marca, negozio, note).
- Scheda di dettaglio del singolo componente:
  - Header con stato e badge.
  - KPI: Prezzo acquisto, Prezzo vendita netto, Costo netto, Giorni d'uso, Costo/giorno.
  - Timeline visiva verticale: icone distinte per `PURCHASE`, `INSTALL`, `UNINSTALL`, `SALE`, `GIFT`, `DISPOSAL`.
  - Form di modifica/aggiunta eventi manuali.
- **Criterio di verifica**: Apertura della scheda di un componente, visualizzazione della timeline completa e comprensione immediata della sua storia.

---

### FASE 7 — Flusso "+ Nuovo Movimento" & Wizard Upgrade
- Modal universale attivabile da qualsiasi schermata con tasto "+ Nuovo Movimento".
- Selezione tipo:
  - *Nuovo Acquisto* (registra componente + evento acquisto + eventuale installazione immediata).
  - *Installazione* (sceglie un pezzo dal magazzino e lo monta nel PC).
  - *Rimozione* (smonta un pezzo attivo e lo sposta in magazzino).
  - *Vendita* (registra prezzo incassato, acquirente/piattaforma e spese).
  - *Regalo / Smaltimento* (registra cessione gratuita o rottamazione ecologica).
  - *Upgrade Guidato* (seleziona vecchio componente, inserisce nuovo, calcola delta costo e aggiorna entrambi).
- Validazione intelligente dei campi e feedback toast.
- **Criterio di verifica**: Inserimento di un ciclo di vita completo (acquisto -> montaggio -> smontaggio -> vendita) con pochi click e calcolo automatico del netto.

---

### FASE 8 — Modulo Statistiche & Analisi Storica
- Sezione dedicata all'analisi retrospettiva:
  - Distribuzione spesa per categoria (percentuali su spesa storica).
  - Spesa per anno solare.
  - Classifiche: componenti più costosi, più longevi, miglior recupero.
  - Storico cronologico di tutti gli upgrade con bilancio economico.
- **Criterio di verifica**: Le statistiche riflettono fedelmente i dati storici senza discrepanze con i totali della dashboard.

---

### FASE 9 — Sistema di Backup, Import/Export & Sicurezza Dati
- Esportazione istantanea del database IndexedDB in file JSON (`pc-tracker-backup-YYYY-MM-DD.json`).
- Modulo di ripristino con validazione rigorosa (controllo `schemaVersion`, integrità referenziale).
- Finestra di anteprima prima dell'import: mostra quanti componenti ed eventi verranno caricati.
- Esportazione tabellare CSV per consultazione rapida su Excel o Google Sheets.
- **Criterio di verifica**: Esportando un backup, cancellando IndexedDB e reimportando il backup, lo stato dell'app torna identico al 100%.

---

### FASE 10 — Ricezione Dati Reali del Tuo PC & Migrazione
- **L'utente fornisce i dati reali del proprio PC (foglio Excel/CSV, appunti, storico acquisti)**.
- Analisi congiunta della struttura del vecchio foglio di calcolo.
- Creazione di uno script di importazione / mapping dedicato o procedura di inserimento guidato assistito.
- Verifica congiunta dei totali storici, dei componenti attuali e delle vendite passate.
- **Criterio di verifica**: Tutti i componenti e i movimenti reali dell'utente sono visibili, ordinati e con totali economici perfettamente allineati al centesimo.

---

### FASE 11 — Rifinitura Estetica, Responsive & Polish
- Verifiche di fluidità delle animazioni e delle transizioni CSS.
- Ottimizzazione responsive per schermi tablet e mobile.
- Supporto scorciatoie da tastiera (es. `Esc` per chiudere i modali, `N` per nuovo movimento).
- Script di avvio rapido `avvia-pc-tracker.bat` per lancio locale con doppio click.
