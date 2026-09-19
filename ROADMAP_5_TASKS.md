# ⚠️ ROADMAP TEMPORANEA: 5 NUOVE FUNZIONALITÀ (5 SESSIONI)

> **AVVISO DI AUTODISTRUZIONE**:
> Questo documento è un registro di lavoro operativo temporaneo ideato per pianificare, tracciare e sviluppare **5 funzionalità ad alto valore aggiunto** suddivise rigorosamente in **5 sessioni di lavoro indipendenti**, garantendo continuità e zero perdita del filo logico tra una sessione e l'altra.
>
> **Questo file verrà AUTOMATICAMENTE ELIMINATO (autodistrutto) dal repository al termine della Sessione 5**, una volta che tutti e 5 i task saranno stati implementati, testati al 100% e rilasciati.

---

## 📊 Tabella di Avanzamento Generale

| Sessione | Task / Funzionalità | Stato | Test Unitari | Rilascio |
| :---: | :--- | :---: | :---: | :---: |
| **Sessione 1** | 🛡️ **Task 1**: Gestione Garanzie & Cassaforte Ricevute (Receipt Vault) | ✅ *Completata* | `358/358 pass` | Pronto per Release |
| **Sessione 2** | 🏷️ **Task 2**: Generatore Automatico Annunci Vendita (Subito/eBay/Vinted) & Hub Vendite | ✅ *Completata* | `384/384 pass` | Pronto per Release |
| **Sessione 3** | ⚡ **Task 3**: Power Budget & Stima Consumi / TDP del Rig Attuale | ✅ *Completata* | `407/407 pass` | Pronto per Release |
| **Sessione 4** | 🧰 **Task 4**: Registro Manutenzione (Pasta Termica), Tuning Journal & Windows Tools | ✅ *Completata* | `463/463 pass` | Pronto per Release |
| **Sessione 5** | ⚡ **Task 5**: Command Palette (`Ctrl+K`) & Confronto Rig Affiancato | ⏳ *In attesa* | `0/0` | - |

---

## 🛠️ Dettaglio dei 5 Task Operativi

---

### 🛡️ SESSIONE 1 — Task 1: Gestione Garanzie & Cassaforte Ricevute (Receipt Vault) — [COMPLETATA ✅]
**Obiettivo**: Rendere PC Tracker il punto di riferimento per l'assistenza post-vendita e l'RMA dei componenti, con allegati salvati localmente.

#### Stato di Avanzamento:
- [x] **Tranche 1**: Tipi di dominio (`receipt.ts`), motore puro `warrantyEngine.ts` con gestione anni bisestili/mesi e countdown in italiano, estensione `archiveEngine.ts`, 18 test unitari dedicati.
- [x] **Tranche 2**: Store IndexedDB `receipts` (schema v3) con indice `componentId`, migrazione atomica, cascade delete all'eliminazione componente, validazione anti-leak e limiti 10MB/50MB nel backup/import, 12 test storage dedicati.
- [x] **Tranche 3**: Azioni asincrone reattive in `PCContext.tsx` (`getComponentWarranty`, `getComponentReceipts`, `uploadReceipt`, `deleteReceipt`), integrazione preset temporali e upload ricevute in `ComponentFormModal.tsx` e `EventEditModal.tsx`.
- [x] **Tranche 4**: Interfaccia utente con schede "Garanzia & Assistenza (RMA)" e "Cassaforte Ricevute & Fatture" in `ComponentDetailPage.tsx`, visualizzatore modale responsive con zoom per immagini e iframe PDF `ReceiptVaultModal.tsx`, filtro garanzia rapido e badge dedicati in `ArchivePage.tsx`, test integrati UI (9 test).
- [x] **Tranche 5**: Audit di privacy superato, 358/358 test passati, sincronizzazione cloud Git.

#### Specifiche Tecniche Completate:
1. **Monitoraggio Garanzie Residue**:
   - Calcolo automatico dei giorni di garanzia rimanenti rispetto alla data di acquisto e alla data di scadenza (`warrantyExpiryDate`).
   - Badge visivi dinamici:
     - 🟢 *In garanzia (es. "Ancora 1 anno e 4 mesi")*
     - 🟡 *In scadenza (es. "Scade tra 25 giorni")*
     - ⚪ *Garanzia terminata*
   - Filtro rapido nell'Archivio: *"Tutte le garanzie"*, *"Garanzia attiva"*, *"In scadenza (≤ 30 gg)"*, *"Garanzia terminata"*.
2. **Cassaforte Ricevute / Fatture (Receipt Vault)**:
   - Possibilità di allegare una ricevuta o fattura d'acquisto (formati supportati: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, max 10MB).
   - Memorizzazione **100% locale in IndexedDB** (rispettando il principio *Local-First* di `GEMINI.md`, zero server, zero cloud).
   - Finestra di visualizzazione / anteprima rapida della ricevuta nella scheda del componente con zoom e PDF viewer.
   - Pulsante "Scarica File" per estrarre il file originale in caso di RMA o vendita, ed eliminazione con conferma.
3. **Criteri di Accettazione & Test**:
   - Suite completa con 358 test passati (100% verdi).
   - Verifica assenza leak nei backup e rispetto dei limiti di dimensione.

---

### 🏷️ SESSIONE 2 — Task 2: Generatore Automatico Annunci di Vendita — [COMPLETATA ✅]
**Obiettivo**: Consentire la messa in vendita istantanea di qualsiasi componente a magazzino (`IN_STORAGE`) con un clic.

#### Stato di Avanzamento:
- [x] **Tranche 1**: Tipi di dominio (`listing.ts`), motore puro `listingEngine.ts` con calcolo tempo reale di utilizzo (`formatUsageDuration`), titoli ottimizzati con rispetto dei limiti di caratteri (Subito 100 char, eBay 80 char), template completi per Subito.it, eBay, Vinted e Super-Prompt per modelli IA di frontiera, 18 test unitari dedicati.
- [x] **Tranche 2**: Componente modale interattivo `ListingGeneratorModal.tsx` con tab dedicate (Subito, eBay, Vinted, Prompt IA), opzioni reattive (condizione estetica, scatola originale, accessori, ambiente non fumatori/no mining, modalità consegna/città, prezzo, note), modifica manuale con pulsante "Ripristina" e stili Vanilla CSS "Less, but better".
- [x] **Tranche 3**: Integrazione del pulsante "Genera Annuncio" nella scheda componente (`ComponentDetailPage.tsx`) per i pezzi a magazzino (`IN_STORAGE`), e 5 test di integrazione logica UI in `listingGeneratorModal.test.ts`.
- [x] **Tranche 4**: Validazione globale, audit di privacy superato, 381/381 test passati (100% verdi).
- [x] **Tranche 5**: Ristrutturazione della Sidebar a 4 macro-aree tematiche (con predisposizione ordinata per Sessioni 3, 4 e 5), creazione del nuovo hub dedicato **Vendite & Annunci** (`MarketplacePage`) con KPI finanziari di mercato, tab hardware a magazzino / venduto, pulsante rapido di generazione annuncio e badge contatore dinamico. 384/384 test passati (100% verdi).

#### Specifiche Tecniche Completate:
1. **Pulsante "Genera Annuncio" nella Scheda Componente**:
   - Visibile e reattivo per tutti i componenti in stato `IN_STORAGE`.
2. **Generatore di Testo Intelligente per Marketplace & Prompt IA**:
   - **Titolo ottimizzato**: include Marca, Modello esatto, Categoria, highlight scatola e garanzia residua.
   - **Corpo annuncio precompilato**:
     - Tempo reale e documentato di utilizzo dagli eventi (*"usato per circa 11 mesi in postazione desktop pulita, ambiente non fumatori e senza overclock"*).
     - Stato garanzia residua ufficiale con data esatta di scadenza e menzione della disponibilità della ricevuta d'acquisto nella cassaforte locale.
     - Stato estetico/funzionale, presenza di scatola originale integra e accessori completi.
     - Formula di compravendita standard personalizzabile (*"Ritiro a mano o spedizione tracciata"* con indicazione città).
     - Clausola di compravendita tra privati con formula *"visto e piaciuto"* a tutela dell'utente.
   - **Super-Prompt per IA (ChatGPT / Claude / Gemini)**: prompt ingegnerizzato pronto da incollare con tutte le specifiche certificate per chi desidera copywriting personalizzato da modelli di frontiera (0 MB VRAM, zero API key richieste).
3. **Formattazioni Specializzate**:
   - Tab **Subito.it**: elenchi puntati ad alta leggibilità, emoji funzionali e sezioni ordinate.
   - Tab **eBay**: struttura a blocchi tecnici con separatori formattati.
   - Tab **Vinted**: testo sintetico, friendly e hashtag tematici hardware/gaming in calce.
   - Pulsanti di copia con feedback visivo immediato (*"Copia Titolo"*, *"Copia Descrizione"*, *"Copia Titolo + Testo"*).
4. **Criteri di Accettazione & Test**:
   - 23 test unitari e di integrazione dedicati (`listingEngine.test.ts` e `listingGeneratorModal.test.ts`).
   - Suite complessiva portata a 381 test (100% passati).

---

### ⚡ SESSIONE 3 — Task 3: Power Budget & Calcolo Consumi / TDP del Rig Attuale — [COMPLETATA ✅]
**Obiettivo**: Fornire una stima chiara, trasparente e rigorosa del fabbisogno energetico di picco del PC montato rispetto alla capacità nominale dell'alimentatore installato.

#### Stato di Avanzamento:
- [x] **Tranche 1**: Tipi di dominio (`src/types/power.ts`), contratti di tipo con discriminazione rigorosa delle fonti (`declared`, `estimated`, `userDefined`, `unknown`), estensione retrocompatibile del modello `Component` con campi opzionali `powerRating` e `powerRatingSource`.
- [x] **Tranche 2**: Motore puro deterministico `src/domain/powerBudgetEngine.ts` con estrazione conservativa TDP da specifiche di fabbrica (CPU e GPU diffuse, note di targa, PL2 Turbo peak) e capacità nominale PSU (es. C750W, RM850x), calcolo utilizzo PSU, headroom in Watt e stato qualitativo prudente (high, reduced, critical, unknown), con esclusione totale di dati inventati per motherboard, RAM, storage e cooling (valori null distinti da zero).
- [x] **Tranche 3**: Suite completa di test unitari `src/domain/__tests__/powerBudgetEngine.test.ts` su Vitest coprente tutti i 13 scenari di specifica + test di regressione centesimale su dataset reale `userRigSeed.json`.
- [x] **Tranche 4**: Interfaccia utente con card dedicata "Power Budget & Stima Consumi" (`PowerBudgetCard.tsx`) in *Il Mio PC* (`CurrentRigPage.tsx`) con 4 KPI reattivi, scomposizione per categoria, badge qualitativo e avviso di completezza, oltre a micro-pill compatto nella sintesi del rig in *DashboardPage.tsx*.
- [x] **Tranche 5**: Stili Vanilla CSS centralizzati (`components.css`) in stile Dark Hardware Enthusiast "Less, but better", verifica responsive mobile (375x812), test di adattamento temi cromatici (Nebula Violet, Emerald Matrix), 407/407 test passati al 100%, typecheck e build di produzione a zero errori.

#### Specifiche Tecniche Completate:
1. **Motore di Calcolo (`powerBudgetEngine.ts`)**:
   - Rileva e somma i carichi dei componenti con potenza dichiarata o impostata dall'utente nel Rig Attuale (`IN_USE`).
   - Nessun valore inventato per componenti ausiliari (Mobo, RAM, SSD, Ventole mantengono `watts: null` e fonte `unknown`).
2. **Confronto con la PSU Montata**:
   - Rileva automaticamente l'alimentatore installato e la sua potenza nominale (es. `750W` per NZXT C750).
   - Calcolo del margine di sicurezza (Headroom in Watt) e percentuale stimata di utilizzo.
   - Terminologia prudente (Ampio margine stimato $\ge 150\text{W}$, Margine ridotto $50\text{--}149\text{W}$, Margine critico $< 50\text{W}$).
3. **Widget Visivo & Sintesi Dashboard**:
   - Widget reattivo ed elegante in *Il Mio PC* e pill informativo non invasivo in *Dashboard*.
4. **Criteri di Accettazione & Test**:
   - 407/407 test passati al 100%, zero warning TypeScript, zero errori console browser.

---

### 🧰 SESSIONE 4 — Task 4: Registro Manutenzione, Tuning Journal & Windows Tools — [COMPLETATA ✅]
**Obiettivo**: Tracciare la cura fisica del PC e i parametri prestazionali/termici senza disperdere appunti su foglietti volanti.

#### Specifiche Tecniche:
1. **Log Manutenzione Fisica**:
   - Date e note di:
     - Sostituzione pasta termica / pad termici (su CPU o GPU).
     - Pulizia filtri antipolvere del case o radiatori AIO.
     - Manutenzione ventole / liquido custom loop.
   - Calcolo del tempo trascorso (*"Pasta termica applicata 10 mesi fa"*).
   - Promemoria visivo discreto (es. avviso amichevole se sono passati più di 18-24 mesi).
2. **Scheda Tuning & Profili Stabili**:
   - Note tecniche stabili per componente:
     - CPU: profilo undervolt / Curve Optimizer (es. `All-core -25, PPT 142W`).
     - GPU: profilo MSI Afterburner (es. `0.925V @ 2650MHz, Mem +800MHz`).
     - RAM: profilo XMP/EXPO o timing primari.
   - Punteggi Benchmark di riferimento (es. *Cinebench R23*, *TimeSpy Extreme*, temperatura max sotto stress).
3. **Criteri di Accettazione & Test**:
   - Test di persistenza e calcolo date per gli intervalli di manutenzione.

---

### ⚡ SESSIONE 5 — Task 5: Command Palette (`Ctrl+K`) & Confronto Rig Affiancato
**Obiettivo**: Velocità d'uso da power-user e analisi comparativa visiva tra configurazioni nel tempo.

#### Specifiche Tecniche:
1. **Command Palette Globale (`Ctrl+K` / `Cmd+K`)**:
   - Finestra modale universale a comparsa istantanea con input autofocus.
   - Ricerca full-text istantanea:
     - Digita il nome di un pezzo e premi Invio per saltare direttamente alla sua scheda dettaglio.
     - Digita comandi d'azione: *"Nuovo Movimento"*, *"Nuovo Acquisto"*, *"Esporta Scheda"*, *"Backup JSON"*, *"Impostazioni"*.
   - Navigazione 100% da tastiera (frecce Su/Giù ed Invio).
2. **Confronto Rig Affiancato (Side-by-Side Rig Comparison)**:
   - Possibilità di selezionare due punti temporali (es. *Rig Attuale vs Checkpoint 2023*, oppure *Due Date Storiche*).
   - Tabella comparativa a due colonne:
     - Evidenziazione cromatica: componenti rimasti invariati (=), componenti sostituiti/rimossi (-), nuovi componenti (+).
     - Delta di costo totale tra le due configurazioni.
3. **Criteri di Accettazione & Test**:
   - Test navigazione da tastiera e algoritmo di diff per il confronto rig.
4. **🔥 AUTODISTRUZIONE**:
   - Al completamento e rilascio di questa Sessione 5, questo file (`ROADMAP_5_TASKS.md`) verrà cancellato dal repository.

---

## 📋 Regole di Conduzione di Ciascuna Sessione

1. **Focus Singolo**: In ciascuna sessione si affronta e si chiude **un solo task** (dall'architettura ai test e all'interfaccia).
2. **Rigorosità dei Test**: Prima o contestualmente al codice UI, implementare i test del domain engine su Vitest (devono sempre passare tutti al 100%).
3. **Rispetto delle Regole `GEMINI.md`**:
   - Local-first in IndexedDB (nessun dato o file salvato su cloud).
   - Vanilla CSS senza framework esterni (Tailwind/Bootstrap vietati).
   - Stile Dark Hardware Enthusiast "Less, but better" (zero AI-slop).
4. **Aggiornamento dello Stato**: Al termine di ogni sessione, aggiornare la tabella di avanzamento in cima a questo documento prima di chiudere la sessione.
