# ⚠️ ROADMAP TEMPORANEA: 5 NUOVE FUNZIONALITÀ (5 SESSIONI)

> **AVVISO DI AUTODISTRUZIONE**:
> Questo documento è un registro di lavoro operativo temporaneo ideato per pianificare, tracciare e sviluppare **5 funzionalità ad alto valore aggiunto** suddivise rigorosamente in **5 sessioni di lavoro indipendenti**, garantendo continuità e zero perdita del filo logico tra una sessione e l'altra.
>
> **Questo file verrà AUTOMATICAMENTE ELIMINATO (autodistrutto) dal repository al termine della Sessione 5**, una volta che tutti e 5 i task saranno stati implementati, testati al 100% e rilasciati.

---

## 📊 Tabella di Avanzamento Generale

| Sessione | Task / Funzionalità | Stato | Test Unitari | Rilascio |
| :---: | :--- | :---: | :---: | :---: |
| **Sessione 1** | 🛡️ **Task 1**: Gestione Garanzie & Cassaforte Ricevute (Receipt Vault) | ⏳ *In attesa* | `0/0` | - |
| **Sessione 2** | 🏷️ **Task 2**: Generatore Automatico Annunci Vendita (Subito/eBay/Vinted) | ⏳ *In attesa* | `0/0` | - |
| **Sessione 3** | ⚡ **Task 3**: Power Budget & Stima Consumi / TDP del Rig Attuale | ⏳ *In attesa* | `0/0` | - |
| **Sessione 4** | 🧰 **Task 4**: Registro Manutenzione (Pasta Termica) & Profili Tuning/UV | ⏳ *In attesa* | `0/0` | - |
| **Sessione 5** | ⚡ **Task 5**: Command Palette (`Ctrl+K`) & Confronto Rig Affiancato | ⏳ *In attesa* | `0/0` | - |

---

## 🛠️ Dettaglio dei 5 Task Operativi

---

### 🛡️ SESSIONE 1 — Task 1: Gestione Garanzie & Cassaforte Ricevute (Receipt Vault)
**Obiettivo**: Rendere PC Tracker il punto di riferimento per l'assistenza post-vendita e l'RMA dei componenti, con allegati salvati localmente.

#### Specifiche Tecniche:
1. **Monitoraggio Garanzie Residue**:
   - Calcolo automatico dei giorni di garanzia rimanenti rispetto alla data di acquisto e alla data di scadenza (`warrantyExpiryDate`).
   - Badge visivi dinamici:
     - 🟢 *In garanzia (es. "Ancora 1 anno e 4 mesi")*
     - 🟡 *In scadenza (es. "Scade tra 25 giorni")*
     - ⚪ *Garanzia terminata*
   - Filtro rapido nell'Archivio: *"Solo componenti con garanzia attiva"*.
2. **Cassaforte Ricevute / Fatture (Receipt Vault)**:
   - Possibilità di allegare una ricevuta o fattura d'acquisto (formati supportati: `.pdf`, `.png`, `.jpg`, `.webp`).
   - Memorizzazione **100% locale in IndexedDB** come Blob / DataURL (rispettando il principio *Local-First* di `GEMINI.md`, zero server, zero cloud).
   - Finestra di visualizzazione / anteprima rapida della ricevuta nella scheda del componente.
   - Pulsante "Scarica Ricevuta" per estrarre il file originale in caso di RMA o vendita.
3. **Criteri di Accettazione & Test**:
   - Suite test per il calcolo delle scadenze garanzia.
   - Test per salvataggio, lettura ed eliminazione allegati su IndexedDB.
   - Verifica assenza leak nei backup e rispetto dei limiti di dimensione.

---

### 🏷️ SESSIONE 2 — Task 2: Generatore Automatico Annunci di Vendita
**Obiettivo**: Consentire la messa in vendita istantanea di qualsiasi componente a magazzino (`IN_STORAGE`) con un clic.

#### Specifiche Tecniche:
1. **Pulsante "Genera Annuncio" nella Scheda Componente**:
   - Visibile per tutti i componenti in stato `IN_STORAGE`.
2. **Generatore di Testo Intelligente per Marketplace**:
   - **Titolo ottimizzato**: include Marca, Modello esatto, Categoria e specifiche chiave (es. *"ASUS ROG Strix RTX 4080 16GB - Perfetta con Scatola"*).
   - **Corpo annuncio precompilato**:
     - Tempo reale e verificato di utilizzo calcolato dagli eventi (`"Usata per 11 mesi in ambiente non fumatori e senza overclock estremo"`).
     - Stato della garanzia residua (*"Ancora in garanzia ufficiale fino al 15/11/2026"* con menzione presenza ricevuta).
     - Stato estetico/funzionale e presenza di scatola originale / accessori.
     - Formula di compravendita standard personalizzabile (*"Ritiro a mano o spedizione tracciata"*).
3. **Formattazioni Specializzate**:
   - Tab **Subito.it / Vinted** (testo pulito con elenchi puntati ad alta leggibilità).
   - Tab **eBay** (descrizione formattata).
   - Pulsante *"Copia Annuncio"* con feedback visivo immediato.
4. **Criteri di Accettazione & Test**:
   - Test unitari sul generatore del testo con vari scenari (con garanzia, senza garanzia, con scatola, ecc.).

---

### ⚡ SESSIONE 3 — Task 3: Power Budget & Calcolo Consumi / TDP del Rig Attuale
**Obiettivo**: Fornire una stima chiara e immediata del consumo energetico del PC montato rispetto all'alimentatore installato.

#### Specifiche Tecniche:
1. **Motore di Calcolo (`powerBudgetEngine.ts`)**:
   - Campo opzionale `tdp` (Watt) nelle specifiche del componente (o stima euristica per le categorie CPU e GPU più comuni).
   - Somma del TDP a pieno carico: $\text{TDP CPU} + \text{TDP GPU} + \text{TDP Scheda Madre/RAM/Storage/Ventole} (\sim 50\text{--}70\text{W})$.
2. **Confronto con la PSU Montata**:
   - Rileva automaticamente l'alimentatore installato (`IN_USE` con categoria `psu`) e la sua potenza nominale (es. `850W`).
   - Calcolo del margine di sicurezza percentuale:
     $$\text{Margine} = \frac{\text{Watt PSU} - \text{TDP Stimato}}{\text{Watt PSU}} \times 100$$
   - Valutazione visiva con barra di carico ad anello o orizzontale:
     - 🟢 *Ottimale (Margine 35-50%: efficienza massima della curva di alimentazione)*
     - 🟡 *Accettabile (Margine 20-35%)*
     - 🔴 *Attenzione / Sottodimensionato (Margine < 20%)*
3. **Widget Visivo**:
   - Inserimento del badge o micro-widget "Power Budget" nella vista **Il Mio PC** e nel widget di sintesi della **Dashboard**.
4. **Criteri di Accettazione & Test**:
   - Test unitari per il calcolo della potenza, gestione PSU mancante, stima margini.

---

### 🧰 SESSIONE 4 — Task 4: Registro Manutenzione & Profili Tuning/UV
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
