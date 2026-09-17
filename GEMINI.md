# GEMINI.md — Memoria Tecnica Permanente e Regole del Progetto

> **IMPORTANTE PER QUALSIASI AGENTE AI O SVILUPPATORE CHE LAVORA SU QUESTO PROGETTO**:
> Questo file è la fonte primaria di verità per l'architettura, le decisioni tecniche, le regole di design e le convenzioni di codice. Prima di qualsiasi modifica strutturale o aggiunta di funzionalità, consulta questo documento e mantienilo rigorosamente aggiornato.

---

## 1. Obiettivo dell'Applicazione

Sviluppare un'applicazione locale, personale e indipendente per tracciare e gestire la vita completa del proprio PC, di tutti i componenti posseduti nel tempo, degli acquisti, delle vendite, delle dismissioni e di ogni singolo upgrade hardware.

L'applicazione risponde a domande concrete:
- Quali componenti sono attualmente montati nel PC?
- Quali componenti componevano il PC in una determinata data storica passata (es. a metà 2024)?
- Quali componenti ho posseduto in passato e cosa ne ho fatto (magazzino, venduti, regalati, smaltiti)?
- Quanto ho pagato ciascun pezzo, quando l'ho comprato, montato e rimosso?
- Quanto ho recuperato vendendolo e qual è stato il suo costo netto reale?
- Per quanti giorni l'ho usato e qual è stato il suo costo al giorno (€/die)?
- Quanto mi è costato esattamente ogni upgrade (es. passaggio da RTX 3080 a RTX 4090)?
- Quanto ho speso complessivamente negli anni (Totale Acquistato Storico)?
- Quanto ho recuperato complessivamente (Totale Recuperato dalle Vendite)?
- Qual è il bilancio reale a fondo perduto della mia passione per il PC (Costo Netto Storico)?
- Quanto sono costati i pezzi attualmente all'interno del case (Costo Configurazione Attuale)?

---

## 2. Filosofia del Progetto

1. **Local-First & Single Source of Truth**: Nessun server esterno, nessun account, nessun cloud obbligatorio, nessun login. Tutti i dati dell'applicazione risiedono **esclusivamente su IndexedDB** come unica fonte di verità. È vietato duplicare o specchiare i dati principali su LocalStorage.
2. **Event-Driven Lifecycle (Identità + Cronologia)**: Non esistono liste statiche e separate di componenti "attuali", "vecchi" o "venduti". **Ogni componente ha un'identità stabile e una sequenza ordinata di eventi nel tempo** (`PURCHASE`, `INSTALL`, `UNINSTALL`, `SALE`, `EXTRA_EXPENSE`, `GIFT`, `DISPOSAL`). Lo stato attuale, la configurazione passata e tutte le metriche finanziarie sono calcolati deterministicamente tramite funzioni pure.
3. **Semplicità ed Eleganza**: Pochi elementi ben progettati, interfaccia scattante con estetica "Dark Hardware Enthusiast". Non deve sembrare un gestionale aziendale grigio, ma una dashboard personale di alto livello.
4. **Resilienza Totale dei Dati**: Backup esportabili in un click in formato JSON standard versionato (`schemaVersion: 1`), con validazione automatica prima del ripristino per azzerare il rischio di perdita dati.

### 2.1 Tassonomia dei Dataset e Natura General-Purpose dell'App
L'applicazione è progettata come software **general-purpose** per qualsiasi appassionato di hardware. Non impone né presume una configurazione fissa o universale:
- **Dataset Utente**: I dati reali memorizzati nell'installazione locale dell'utente finale. Può contenere 0, 5, 29, 50 o più componenti, con o senza eventi di upgrade.
- **Dataset di Sviluppo/Verifica**: Il dataset reale del PC di riferimento usato durante lo sviluppo (29 componenti, 62 eventi, 5 upgrade) utilizzato per validare la precisione dei motori di calcolo finanziari e di ciclo di vita. **NON è un "dataset canonico" dell'app** e non deve essere hardcodato come aspettativa universale.
- **Seed/Demo Dataset**: Eventuale dataset dimostrativo iniziale opzionale per installazioni vergini o presentazioni.


---

## 3. Stack Tecnologico e Regola di Flessibilità

- **Runtime & Build Tool**: [Vite](https://vitejs.dev/) (veloce, moderno, compatto, standard per SPA locali).
- **Core Library**: React 18+ con TypeScript.
- **Tipizzazione**: TypeScript rigoroso (`strict: true`), con contratti di tipo forti per eventi, entità e metriche.
- **Styling**: **Vanilla CSS nativo** con Custom Properties (CSS variables) e moduli CSS. Nessun framework CSS esterno (vietato Tailwind, vietato Bootstrap, vietato MUI).
- **Iconografia**: [Lucide React](https://lucide.dev/) (icone pulite, leggere e moderne per hardware e finanza).
- **Persistenza Locale**: **IndexedDB come unica fonte di verità** per l'intero database dell'app. `localStorage` può essere utilizzato solo per memorizzare preferenze non critiche dell'interfaccia (es. stato aperto/chiuso della sidebar), ma mai per i dati di dominio.

> [!IMPORTANT]
> **Regola sulle Decisioni Tecnologiche**: Le scelte dello stack attuale non sono irrevocabili. Tuttavia, **qualsiasi futura variazione dello stack deve essere motivata da un requisito concreto e validato**, e non effettuata arbitrariamente o per moda tecnologica.

---

## 4. Modello Dati, Ciclo di Vita e Finanze

Tutti i tipi risiedono in `src/types/`.

### 4.1 Entità Fondamentali (Identità Stabili)
1. **Component**:
   - `id`: identificativo univoco e stabile (UUID / NanoId).
   - `name`, `brand`, `model`: specifiche testuali.
   - `category`: categoria hardware (`cpu`, `gpu`, `motherboard`, `ram`, `storage`, `psu`, `case`, `cooling`, `monitor`, `peripherals`, `accessories`, `other`).
   - `serialNumber`, `notes`: metadati opzionali.
2. **ComponentEvent**:
   - `id`: identificativo univoco e stabile (UUID).
   - `componentId`: riferimento univoco al componente collegato.
   - `date`: data dell'evento in formato ISO (`YYYY-MM-DD`).
   - `type`: tipo evento supportato:
     - `PURCHASE`: `price`, `store`, `orderNumber`, `link`, `condition`, `warrantyExpiryDate`.
     - `INSTALL`: `slotOrLocation` (es. "Slot M.2 1", "PCIe 1").
     - `UNINSTALL`: `reason` ('upgrade' | 'maintenance' | 'storage' | 'defect').
     - `SALE`: `price`, `platform`, `buyer`, `shippingCost`, `fees`.
     - `EXTRA_EXPENSE`: `amount`, `description` (es. cavi custom, waterblock, pad termici).
     - `GIFT`: `recipient` (persona/ente a cui è stato donato), `notes`.
     - `DISPOSAL`: `disposalMethod` ('recycled' | 'broken_discarded' | 'eco_center'), `notes`.
3. **Upgrade**:
   - `id`: UUID stabile.
   - `date`: YYYY-MM-DD.
   - `category`: categoria hardware.
   - `oldComponentId`: ID del pezzo sostituito.
   - `newComponentId`: ID del nuovo pezzo subentrato.
   - `notes`: note sul cambio generazionale.

---

### 4.2 Stati Derivati del Componente
Lo stato di un componente **non viene mai salvato come campo statico**, ma calcolato analizzando cronologicamente i suoi eventi:
- Se l'ultimo evento è `SALE` $\rightarrow$ **`SOLD`** (Venduto).
- Se l'ultimo evento è `GIFT` $\rightarrow$ **`GIFTED`** (Regalato).
- Se l'ultimo evento è `DISPOSAL` $\rightarrow$ **`DISPOSED`** (Smaltito).
- Se l'ultimo evento tra montaggi e smontaggi è `INSTALL` $\rightarrow$ **`IN_USE`** (Montato nel PC).
- Se l'ultimo evento è `UNINSTALL` o solo `PURCHASE` $\rightarrow$ **`IN_STORAGE`** (Nel cassetto / magazzino).

---

### 4.3 Ricostruzione Storica della Configurazione (Point-in-Time PC Rig)
Il modello permette a una funzione pura in `src/domain/historyEngine.ts` di ricostruire la configurazione del PC a qualsiasi data target $T$ (`YYYY-MM-DD`):
- Per ogni componente $C$, si prendono gli eventi con data $\le T$.
- Se non è mai stato acquistato prima di $T$, non esisteva.
- Se prima di $T$ ha subito `SALE`, `GIFT` o `DISPOSAL`, era già dismesso.
- Se l'ultimo evento rilevante prima o al giorno $T$ è `INSTALL`, il componente **era montato nel PC alla data $T$**.
- Se l'ultimo evento è `UNINSTALL`, il componente **era a magazzino alla data $T$**.

---

### 4.4 Metriche Finanziarie Formalizzate (Distinte e Non Ambigue)
Tutti i calcoli sono isolati in `src/domain/financialEngine.ts` e indipendenti dalla UI:

1. **Totale Acquistato Storico**:
   $$\sum_{\text{eventi } PURCHASE} \text{price} + \sum_{\text{eventi } EXTRA\_EXPENSE} \text{amount}$$
   *Significato*: Tutto il denaro speso per acquistare hardware e accessori PC nel corso degli anni.
2. **Totale Recuperato dalle Vendite**:
   $$\sum_{\text{eventi } SALE} (\text{price} - (\text{shippingCost} \lor 0) - (\text{fees} \lor 0))$$
   *Significato*: Il totale netto incassato dalla vendita di componenti dismessi.
3. **Costo Netto Storico**:
   $$\text{Totale Acquistato Storico} - \text{Totale Recuperato dalle Vendite}$$
   *Significato*: La spesa reale a fondo perduto sostenuta per il proprio PC nel corso degli anni.
4. **Costo Configurazione Attuale**:
   $$\sum_{C \in \text{Componenti con stato } IN\_USE} (\text{PURCHASE.price}(C) + \sum \text{EXTRA\_EXPENSE.amount}(C))$$
   *Significato*: Il costo di acquisto storico dei soli pezzi che compongono la macchina attualmente montata.
5. **Costo Netto di un Singolo Componente**:
   $$\text{Costo Acquisto Totale}(C) - \text{Ricavo Netto Vendita}(C)$$
6. **Costo Netto di un Upgrade**:
   $$\text{Costo Acquisto Nuovo} - \text{Ricavo Netto Vendita Vecchio}$$

> [!WARNING]
> **Valore di Mercato Attuale**: NON implementare calcoli automatici di "valore di mercato corrente" per i componenti, in quanto privi di un feed dati oggettivo ed affidabile. Rimane una possibile estensione futura.

---

### 4.5 Semantica Fondamentale: Checkpoint vs Time Travel
È stabilita una distinzione formale ed inviolabile tra la navigazione temporale (Time Travel) e i punti di controllo (Checkpoint):

1. **Event-driven Time Travel (Verità Ricostruita)**:
   - Quando l'utente naviga nel passato lungo la timeline:
     $$\text{Events} + \text{Components} + \text{historyEngine} \rightarrow \text{Configurazione ricostruita alla data/punto temporale}$$
   - È il comportamento dinamico standard di Time Travel. Se gli eventi storici vengono corretti retroattivamente, la ricostruzione riflette la correzione.

2. **Checkpoint (Memoria Storica Esplicita)**:
   - Quando l'utente apre/seleziona un Checkpoint, il sistema mostra la **fotografia salvata nel Checkpoint** (`componentsSnapshot` + `summary`).
   - Il Checkpoint è un'istantanea storica volontaria, immutabile e congelata al momento della sua creazione.
   - **NON viene ricalcolato automaticamente dagli Events correnti e non è una Source of Truth alternativa.**
   - Include `anchorEventId` per discriminare univocamente stati differenti verificatisi nella stessa data (`referenceDate`).

3. **Gestione Discrepanze Storiche**:
   - Se eventi passati vengono modificati o eliminati e `historyEngine` ricostruisce, per quella stessa data, una configurazione diversa da quella congelata nel Checkpoint:
     - Il Checkpoint **NON cambia**.
     - Lo snapshot **NON viene riscritto né alterato**.
     - Il sistema espone una **discrepanza informativa** (`detectCheckpointDiscrepancy`) per trasparenza.
     - **VIETATO sostituire silenziosamente lo snapshot del Checkpoint con il risultato ricalcolato da `historyEngine`**.

---

## 5. Struttura dei File del Progetto

```
Build Pc (All Components & Updates)- justpeppe_z/
├── docs/                        # Documentazione tecnica di riferimento
│   ├── architecture.md          # Scelte architetturali, livelli e flessibilità
│   ├── data-model.md            # Specifiche dettagliate del modello dati
│   ├── ux.md                    # Linee guida UX, palette colori e flussi
│   └── roadmap.md               # Piano di sviluppo diviso in fasi
├── GEMINI.md                    # Memoria permanente e regole di progetto (questo file)
├── package.json                 # Dipendenze e script Vite/React/TS
├── tsconfig.json                # Configurazione TypeScript rigorosa
├── vite.config.ts               # Configurazione di build Vite
├── index.html                   # Entry point HTML dell'applicazione
└── src/
    ├── domain/                  # MOTORE LOGICO PURO (nessun elemento grafico)
    │   ├── financialEngine.ts   # 4 metriche finanziarie formali e costi netti
    │   ├── lifecycleEngine.ts   # Calcolo stato, permanenza, giorni utilizzo
    │   ├── historyEngine.ts     # Ricostruzione configurazione del PC a data T
    │   └── upgradeEngine.ts     # Logica di calcolo dei salti di upgrade
    ├── types/                   # Definizioni TypeScript e contratti di dominio
    │   ├── component.ts
    │   ├── events.ts
    │   ├── upgrade.ts
    │   └── database.ts
    ├── storage/                 # ADAPTER DI PERSISTENZA E BACKUP
    │   ├── storageService.ts    # Lettura/scrittura su IndexedDB (Single Source of Truth)
    │   ├── backupService.ts     # Esportazione JSON, importazione, validazione
    │   └── migrations.ts        # Migrazioni di schema dati
    ├── store/                   # STATO REATTIVO DELL'APPLICAZIONE
    │   └── pcStore.tsx          # Contesto React con azioni atomiche
    ├── styles/                  # DESIGN SYSTEM VANILLA CSS
    │   ├── variables.css        # Token di design (colori dark enthusiast, spaziature)
    │   ├── global.css           # Reset, stili base, scrollbar, tipografia
    │   └── components.css       # Classi riutilizzabili (card, badge, bottoni)
    ├── components/              # COMPONENTI UI RIUTILIZZABILI
    │   ├── common/              # Button, Modal, Badge, Card, Toast, Input
    │   ├── layout/              # AppShell, Sidebar, Header, PageContainer
    │   ├── timeline/            # Visualizzatore timeline verticale
    │   ├── movementModal/       # Modale "+ Nuovo Movimento" e Wizard Upgrade
    │   └── cards/               # StatCard, ComponentCard, UpgradeCard
    └── pages/                   # VISTE PRINCIPALI DELL'APPLICAZIONE
        ├── DashboardPage.tsx    # Panoramica, 4 metriche KPI, rig attuale, ultimi movimenti
        ├── CurrentRigPage.tsx   # Configurazione attuale raggruppata per categoria
        ├── ArchivePage.tsx      # Archivio storico filtrabile e ricercabile
        ├── ComponentDetailPage.tsx # Scheda pezzo con timeline e metadati
        ├── UpgradesPage.tsx     # Storico generazionale degli upgrade
        ├── StatsPage.tsx        # Grafici e analisi di spesa nel tempo
        └── SettingsBackupPage.tsx # Gestione backup, import JSON/CSV, reset
```

---

## 6. Regole UX/UI

1. **Tema Dark Enthusiast**: Sfondo `#0a0e17`, card `#111827`, bordi `#1e293b`.
2. **Accenti Cromatici Funzionali**:
   - Ciano (`#38bdf8`): Elementi primari, componenti in uso (`IN_USE`).
   - Smeraldo (`#10b981`): Vendite (`SALE`), ricavi, bilancio positivo.
   - Rubino (`#f43f5e`): Spese, acquisti (`PURCHASE`, `EXTRA_EXPENSE`).
   - Ambra (`#f59e0b`): Magazzino (`IN_STORAGE`), garanzie.
   - Viola (`#818cf8`): Componenti regalati (`GIFTED`).
   - Grigio (`#64748b`): Componenti smaltiti (`DISPOSED`).
3. **Gerarchia Visiva e Leggibilità**: Le cifre monetarie usano font a spaziatura fissa (`JetBrains Mono`) per rendere i decimali allineati e leggibili.
4. **Form a Basso Attrito**: Il form "+ Nuovo Movimento" richiede solo data e nome componente; tutto il resto è opzionale o valorizzato con default intelligenti.
5. **Feedback Immediato**: Ogni salvataggio o cancellazione mostra un toast non bloccante.

### 6.1 Anti AI-Slop Rule & Filosofia "Less, but Better"
1. **Vietato l'AI-Slop**: NON produrre UI generiche basate su parole come "modern", "beautiful", "premium" senza una concreta decisione progettuale. Ogni elemento visivo deve avere una ragion d'essere.
2. **Niente Cliché SaaS/Crypto**: Evitare gradienti neon casuali, ombre fosforescenti, icone emoji temporanee e card tutte uguali.
3. **Approccio "Less, but Better"**:
   - Preferire: meno elementi, migliore gerarchia, migliore tipografia, migliore spacing, migliori proporzioni e coerenza sistemica.
   - Evitare: più effetti, più colori, più card, più gradienti, più decorazioni fini a se stesse.
   - Se un elemento grafico o un bordo può essere rimosso senza perdere funzionalità o chiarezza, **rimuoverlo**.
4. **Source-Owned UI Centralizzata**:
   - Vietato duplicare oggetti di stile inline tra componenti diversi.
   - Form, input, label, bottoni e card devono attingere esclusivamente alle classi e variabili centralizzate in `src/styles/`.
5. **Visual Quality Gate**:
   - Prima di considerare completata qualsiasi fase con impatto UI, eseguire una verifica visiva nel browser reale verificando gerarchia, ritmo tipografico, accessibilità da tastiera (`:focus-visible`), micro-interazioni (`:active`) e assenza di elementi visivamente ridondanti.


---

## 7. Regole di Persistenza e Backup

1. **Single Source of Truth**: Tutti i dati dell'applicazione risiedono in IndexedDB. Mai duplicare i dati principali su LocalStorage.
2. **Schema Versioning Obbligatorio**: Ogni dump JSON contiene `schemaVersion: 1`. Se il modello dati cambia, incrementa `schemaVersion` e crea una funzione in `src/storage/migrations.ts`.
3. **Validazione Prima del Ripristino**: Mai sovrascrivere i dati locali con un JSON importato senza prima validare la struttura. Mostrare sempre un'anteprima prima di procedere.
4. **Backup a Portata di Mano**: Il pulsante per scaricare il JSON di backup deve essere presente nell'header con timestamp (`pc-tracker-backup-YYYY-MM-DD.json`).

---

## 8. Principi di Modifica del Codice

1. **Mai calcolare lo stato modificando un campo statico del componente**: Non aggiungere un campo `status` nel database. Lo stato si calcola sempre a partire dalla cronologia eventi tramite `lifecycleEngine.ts`.
2. **Isolare la logica finanziaria**: I calcoli monetari devono risiedere esclusivamente in `financialEngine.ts` con test a corredo.
3. **Nessun framework CSS esterno**: Non installare Tailwind o framework CSS monolitici. Usa solo Vanilla CSS con le variabili di `src/styles/variables.css`.
4. **Preservare l'indipendenza locale**: Non introdurre dipendenze da server remoti obbligatorie.

---

## 9. Cose da Evitare Assolutamente

- ❌ **NON** dividere il database in tabelle statiche di "componenti attuali" e "componenti venduti".
- ❌ **NON** duplicare i dati principali su LocalStorage oltre ad IndexedDB.
- ❌ **NON** confondere tra loro le diverse metriche finanziarie (Acquistato vs Venduto vs Netto vs Attuale).
- ❌ **NON** calcolare stime arbitrarie di valore di mercato corrente senza fonti dati oggettive.
- ❌ **NON** inventare componenti reali del PC dell'utente senza che siano stati forniti.
- ❌ **NON** aggiungere autenticazione, backend remoti o database complessi non necessari.
- ❌ **NON** installare TailwindCSS o librerie UI pesanti.
- ❌ **NON** permettere la modifica diretta di calcoli finanziari senza passare dagli eventi.
- ❌ **NON** sovrascrivere la memoria locale senza un meccanismo di backup/conferma.
- ❌ **NON** considerare il dataset di sviluppo (29/62/5) come un "dataset canonico universale" o hardcodare le sue metriche come aspettative globali dell'applicazione.

---

## 10. Regole di Automazione Git & Release (Hands-Off per l'Utente)

L'utente finale non deve eseguire comandi Git o preoccuparsi della gestione di repository, commit, tag e pipeline. L'assistente se ne occupa in piena autonomia secondo questa logica permanente:

1. **Gestione del Flusso a Tranche vs Sezione Completa**:
   - Quando un lavoro o una funzionalità viene suddivisa in più tranche (es. 1/5, 2/5, ecc.), **NON fare commit/push parziali per ogni singola micro-tranche**, evitando rumore nella cronologia e trigger inutili di CI.
   - Solo al **completamento dell'intera sezione/milestone** (dopo aver verificato `npm test`, `tsc --noEmit` e `npm run audit:privacy`), l'assistente valuta autonomamente l'azione migliore:
     - **Push Codice Sorgente (`git push origin main`)**: se si tratta di avanzamenti tecnici interni, pulizia o preparazioni architetturali.
     - **Nuova Release Desktop Ufficiale (`vX.Y.Z` con push del Tag)**: se la sezione conclusa introduce nuove funzionalità visibili, miglioramenti d'uso o correzioni tangibili pronte per essere usate dagli utenti dell'applicazione desktop su Windows.

2. **Creazione e Distribuzione Autonoma di Nuove Release Desktop**:
   - Sia in autonomia al termine di una sezione importante, sia quando l'utente richiede una nuova versione scaricabile per sé o per gli amici (es. *"Prepara una nuova versione"* o *"Rilascia l'aggiornamento"*), l'assistente:
     1. Incrementa la versione semver in modo coerente su tutti i file: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `src/services/updaterService.ts`.
     2. Esegue la validazione locale completa (`test`, `tsc`, `audit:privacy`).
     3. Crea il commit di release, genera il tag Git corrispondente (es. `v0.1.2`) ed esegue il push sia del ramo `main` che del tag (`git push origin main --tags`).
     4. GitHub Actions si attiva in automatico, compila l'installer Windows x64 NSIS, applica la firma crittografica Minisign Ed25519 e pubblica la nuova release con `latest.json`.
     5. Tutti i PC con PC Tracker installato ricevono e applicano l'aggiornamento automatico senza alcun intervento manuale sul codice.

