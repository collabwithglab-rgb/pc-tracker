# PROMPT PER CHATGPT: VERIFICA CONGIUNTA TRANCHE 8D & TRANCHE 8E
## Windows Service Diagnostics, Event Log Correlation, Optimization & UI Presentation
> **Progetto:** PC Hardware & Upgrade Tracker + PC Care Center (Tauri v2 + React 18 + TypeScript strict + Vanilla CSS + IndexedDB)  
> **Stato Attuale:** IMPLEMENTAZIONE COMPLETATA — IN ATTESA DI AUDIT E VERIFICA CONGIUNTA  
> **Baseline di Riferimento:** 994/994 test unitari e di integrazione passati (100% verdi su 73 file di test) | TypeScript strict 0 errori | Build Vite OK (3.45s) | Privacy Audit 100% superato | Git Working Tree pulito.  
> **Tag Git Locali di Riferimento:**  
> - `TRANCHE-8D-DA-VERIFICARE-CON-CHATGPT` (Commit `4b7b2cc`)  
> - `TRANCHE-8E-DA-VERIFICARE-CON-CHATGPT` (Commit `e9f4f83`)  

---

## ISTRUZIONI PER CHATGPT
Agisci come **Senior Systems Architect & Code Reviewer**. Ti viene sottoposta l'implementazione completa e congiunta delle ultime due tranche del modulo **PC Care Center**:
- **TRANCHE 8D (Health & Optimization Integration)**: Sotto-tranche 8D-1 (Event Log Findings), 8D-2 & 8D-2.1 (Windows Services & Hardware vs Telemetry Gap), 8D-3 (Correlation Enrichment & Anti-Double-Penalty), 8D-4 (Optimization & Recommendation Integration).
- **TRANCHE 8E (UI Presentation & Verification)**: Modali di ispezione nativi dedicati per Event Log e Servizi Windows SCM, visualizzazione delle correlazioni, callout zero data loss per i finding assorbiti, gestione del cap di campionamento a 50 record e validazione visuale.

Verifica che l'implementazione rispetti fedelmente le specifiche architetturali, i vincoli di non-causalità, la separazione semantica tra fatti/finding/raccomandazioni, la politica anti-doppia penalità e l'assenza di allucinazioni o design ansiogeno.

---

## 1. ARCHITETTURA E REGOLE CHIAVE IMPLEMENTATE

### 1.1 Tranche 8D-3: Enrichment Engine & Anti-Double-Penalty (`src/domain/healthEngine.ts`)
8D-3 opera come funzione pura di consolidamento ed arricchimento a valle delle valutazioni primarie:
1. **Immutabilità della Severità dell'Anchor**: 8D-3 è un *Enrichment Engine*, non un *Severity Engine*. L'anchor finding mantiene la sua severità primaria definita dal dominio: `enrichedAnchor.severity === anchor.severity`. Se l'anchor è `WARNING` e il secondario assorbito era `CRITICAL`, l'anchor **rimane `WARNING`**. La severità originale del secondario viene integralmente registrata in `absorbedFinding.originalSeverity`.
2. **Precedenza Semantica per la Selezione dell'Anchor**: La selezione non avviene per severità maggiore, ma tramite precedenza hardware-first:
   $$\text{Device Faults (Rank 1)} > \text{Direct Hardware/SMART (Rank 2)} > \text{Event Log (Rank 3)} > \text{Services (Rank 4)} > \text{Maintenance/Sysfiles (Rank 5)}$$
   *Regola di Salvaguardia:* Se non è possibile stabilire una precedenza univoca o in presenza di parità di rank, **nessun assorbimento viene eseguito**: entrambi i finding restano indipendenti e vengono collegati con evidenza `RELATED_SIGNAL`.
3. **Wording Neutro per Tuning / Undervolt (Anti-Causalità)**:
   - È categoricamente vietato l'uso di formule causali o presuntive come *"profilo undervolt attivo"*, *"disattivato"* o *"coincidenza temporale"*.
   - Formula obbligatoria adottata: *"profilo di tuning CPU presente nel contesto di analisi"* (o *"profilo undervolt presente nel contesto di analisi"*), con dicitura neutra: *"Evidenze convergenti registrate nello stesso sottosistema, senza presupporre causalità univoca o instabilità irreversibile dell'hardware."*
4. **Conservazione Strutturata dei Dati Assorbiti (Zero Data Loss)**:
   Quando un finding secondario viene assorbito in un `DIRECT_MATCH`, tutti i suoi dati confluiscono nell'interfaccia `AbsorbedFindingEvidence`:
   ```typescript
   export interface AbsorbedFindingEvidence {
     subsumedFindingId: string;
     originalSeverity: HealthSeverity;
     area: HealthAffectedArea;
     title: string;
     evidence: string;
     explanation: string;
     recommendedActionId?: string;
     metadata?: Record<string, string | number | boolean>;
   }
   ```
   Se l'anchor non possiede un `recommendedActionId` proprio, eredita in fallback quello del secondario assorbito, garantendo la continuità dell'azione per 8D-4.
5. **Score Policy (Anti-Double-Penalty)**:
   - La penalità sullo score di salute complessivo (0-100) viene applicata **esclusivamente dai finding primari rimasti nell'array finale**.
   - Gli oggetti `DiagnosticCorrelation` hanno penalità intrinseca = 0.
   - Il finding secondario assorbito viene escluso dall'array finale, azzerando la sua penalità ed evitando la duplicazione della sanzione sullo stesso problema fisico.
   - `RELATED_SIGNAL` e `WEAK_CONTEXT` generano 0 variazioni di punteggio.
6. **Ordinamento Canonico Deterministico**:
   - Preservato l'ordine naturale dei sottosistemi di `healthEngine`: `Storage → RAM → Commit → Device Faults → GPU/Thermal → Maintenance → Security → Event Log → Services`.
   - `correlations[]` internamente ordinate per forza (`DIRECT_MATCH` > `RELATED_SIGNAL` > `WEAK_CONTEXT`) e tie-breaker alfabetico su `correlationId`.

---

### 1.2 Tranche 8D-4: Optimization & Recommendation Integration (`src/domain/optimizationEngine.ts`)
Convergenza deterministica tra fatti diagnostici, finding di salute e catalogo raccomandazioni pure:
1. **Storage & Integrità File System**:
   - Analisi congiunta di eventi NTFS (Event 55, Event 98) e Disk I/O (Event 7, 11, 51).
   - Deduplicazione per lettera di unità tramite funzione pura `resolveDriveLetter(rawFinding, targetContext, smartCounters, activeVolumes)`.
   - Generazione di `opt-chkdsk-scan-{drive}` non distruttiva (`chkdsk.exe <Drive>: /scan`) e `opt-backup-disk-{drive}` in presenza di bad block fisici confermati (Event 7).
2. **Ripristino Servizi di Sistema Windows**:
   - Generazione mirata per i servizi critici catalogo non operativi:
     - `opt-service-restore-vss`: Ripristino Volume Shadow Copy per salvaguardia snapshot e Punti di Ripristino.
     - `opt-service-restore-eventlog`: Avvio Registro Eventi Windows per telemetria e diagnostica kernel.
     - `opt-service-restore-wuauserv`: Abilitazione Windows Update per patch di sicurezza cumulative.
     - `opt-service-restore-winmgmt`: Ripristino WMI per interrogazioni hardware e diagnostica.
3. **Prestazioni Grafiche & Driver Recovery**:
   - `opt-clean-shader-cache`: Contestualizzazione dinamica in presenza di eventi Display 4101 (TDR), con incremento dinamico della priorità da 65 a 75.
   - `opt-gpu-driver-recovery`: Generazione assistita di ripristino pulito driver video (`reinstall-gpu-driver`) in presenza di correlazione `DIRECT_MATCH` o periferica grafica in stato di errore Code 43.
4. **Stabilità Tuning CPU**:
   - `opt-cpu-tuning-review`: Proposta di riesame profilo di tuning CPU (`inspect-tuning-profile`) su presenza di eventi WHEA (Event 17, 18, 19, 47) con obbligo di wording neutro.
5. **Ordinamento Deterministico delle Priorità (`sortRecommendationsByPriority`)**:
   Scala di priorità rigorosa:
   - 100: `opt-sfc-repair`
   - 96: `opt-service-restore-eventlog`
   - 95: `opt-service-restore-winmgmt`
   - 94: `opt-backup-disk-*`
   - 90: `opt-cleanmgr-*`
   - 88: `opt-chkdsk-scan-*`
   - 81: `opt-empty-recycle-bin`
   - 80: `opt-create-restore-point`
   - 79: `opt-service-restore-vss`
   - 78: `opt-cpu-tuning-review`
   - 77: `opt-gpu-driver-recovery`
   - 76: `opt-service-restore-wuauserv`
   - 75: `opt-trim-*` / `opt-clean-shader-cache` (contextualized TDR)
   - Tie-breaker alfabetico su `rec.id` in caso di parità.

---

### 1.3 Tranche 8E: UI Presentation & Verification (`src/components/maintenance/`)
1. **`EventLogInspectionModal.tsx`**:
   - Visualizzazione dei record raggruppati tramite funzione pura `groupAndDeduplicateEvents`.
   - Conteggio occorrenze, range temporale (`firstSeen` - `lastSeen`), target context (lettera disco, bus ID, nome driver).
   - Filtro rapido per categorie hardware (WHEA, Storage, Display, Kernel-Power) e ricerca testuale.
   - **Cap di Campionamento a 50 Eventi Trasparente**: Quando `snapshot.truncated === true`, la UI espone esplicitamente: *"Almeno 50 eventi rilevati (campionamento limitato ai più recenti)"*, impedendo che il cap di sicurezza venga scambiato per il conteggio totale reale.
   - Gestione empty state e sessioni web senza campionamento con avviso sobrio.
2. **`WindowsServicesInspectionModal.tsx`**:
   - Visualizzazione dei 6 servizi catalogo nativi (`EventLog`, `Winmgmt`, `wuauserv`, `TrustedInstaller`, `VSS`, `WinDefend`).
   - Implementazione del **Modello a 3 Classi**:
     - *Always Running* (`EventLog`, `Winmgmt`): se `stopped` $\rightarrow$ anomalia con badge rubino.
     - *On-Demand* (`wuauserv`, `TrustedInstaller`, `VSS`): se `stopped` $\rightarrow$ stato fisiologico *"A Riposo"* con badge discreto; anomalia solo se `startType === disabled` o `exitCode != 0`.
     - *Contextual* (`WinDefend`): se `stopped` $\rightarrow$ spiegazione della possibile presenza di antivirus di terze parti registrato in Security Center.
   - Protezione da falsi allarmi su stati non campionati: se `currentState === 'unknown'`, etichettato come *"Non Rilevato"* con badge neutro (zero allarmi critici ingiustificati).
   - Esposizione dati Win32: PID, tipo avvio (auto, demand, disabled), Win32 Exit Code.
3. **`CareOverviewTab.tsx` (Dashboard Panoramica & Salute)**:
   - 5 card di telemetria nativa collegate: Dispositivi DevNode, Memoria Commit (RAM), Alimentazione & Batteria, Registro Eventi (Wevtapi), Servizi di Sistema (Advapi32 SCM).
   - Sezione correlazioni diagnostiche pure con badge di intensità (`DIRECT_MATCH`, `RELATED_SIGNAL`, `WEAK_CONTEXT`).
   - Callout box per finding secondari assorbiti (`absorbedFinding`): espone chiaramente titolo, motivazione e severità originale, garantendo **Zero Data Loss** per l'utente.
   - Pillole `care-truncation-pill` sui finding interessati da campionamento parziale.
4. **Anteprima Live Browser & Hardening**:
   - Toggle esplicito per ambienti demo/web: *"Attiva Anteprima Live (Dati Dimostrativi)"* con badge color ambra per esplorare l'interfaccia senza confondere i dati fittizi con la telemetria reale di Windows.
5. **Suite Test UI Dedicata**:
   - `src/components/maintenance/__tests__/careDiagnosticsUI.test.ts` (11 test passati al 100%) che certifica formattazione, cap di campionamento, modello a 3 classi, gestione `unknown`, rendering correlazioni e zero data loss.

---

## 2. STATO DEI TEST E GARANZIE TECNICHE

```bash
# 1. Esecuzione Test Suite Completa
npm test
> 994 passed across 73 test files (0 failures, 4.73s)

# 2. Controllo Tipi TypeScript Rigoroso
npx tsc --noEmit
> 0 errori (strict: true)

# 3. Compilazione Bundle di Produzione Vite
npm run build
> dist/index.html (1.37 kB), dist/assets/ (113 kB CSS, JS chunks compilati in 3.45s)

# 4. Privacy Audit Deterministico
npm run audit:privacy
> SUPERATO: nessun dato personale o file non autorizzato rilevato.
  ✓ Nessun file .json o .csv in public/ o dist/
  ✓ Zero stringhe personali o seed hardware negli asset web compilati
  ✓ Runtime PCContext.tsx pulito al 100%

# 5. Git Status Locale
git status
> On branch main, working tree clean (ahead of origin/main by 30 commits locali congelati)
```

---

## 3. CHECKLIST DI VERIFICA RICHIESTA A CHATGPT

Esamina i punti sopra esposti e fornisci il tuo giudizio tecnico dettagliato rispondendo ai seguenti 6 punti:

1. **Valutazione Enrichment Engine & Anti-Double-Penalty (Tranche 8D-3)**:
   - La separazione tra *Anchor Finding* e *Absorbed Finding* risolve correttamente il rischio di alterazione indebita della severità primaria?
   - La gerarchia di precedenza semantica dell'anchor (`Device Faults > Direct Hardware > Event Log > Services > Subsystem`) è solida ed esente da ambiguità?
   - La politica di assegnare penalità 0 a `DiagnosticCorrelation` e rimuovere il secondario assorbito dall'array finale elimina al 100% il rischio di doppia penalizzazione sullo score di salute?

2. **Valutazione Catalogo e Priorità Raccomandazioni (Tranche 8D-4)**:
   - La gestione dello storage (`resolveDriveLetter`, `chkdsk /scan` sola lettura, `backup-disk` su Event 7) e dei servizi essenziali (VSS, EventLog, wuauserv, winmgmt) è corretta e sicura per l'utente?
   - La scala di priorità (da 100 per SFC repair a 75 per TRIM/shader cache) riflette un ordine logico coerente di manutenzione?

3. **Valutazione Rispetto della Regola di Non-Causalità e Wording Neutro**:
   - L'adozione della dicitura obbligatoria *"profilo di tuning CPU presente nel contesto di analisi"* e l'assenza di conclusioni apodittiche (*"l'undervolt ha rotto la CPU"*) rispetta pienamente i principi di sobrietà tecnica ed anti-ansia dell'applicazione?

4. **Valutazione Presentazione UI e Modali (Tranche 8E)**:
   - L'interpretazione dei servizi Windows tramite il modello a 3 classi (in particolare la distinzione tra `stopped` fisiologico su servizi On-Demand come `wuauserv` ed errore critico su servizi Always-Running) evita con successo falsi allarmi e panico nell'utente?
   - L'indicazione trasparente del cap di campionamento (*"Almeno 50 eventi rilevati (campionamento limitato ai più recenti)"*) adempie al requisito di verità diagnostica?
   - La presentazione nel callout dei dati assorbiti (`absorbedFinding`) soddisfa il principio di *Zero Data Loss*?

5. **Valutazione di Robustezza Globale (994 test, TypeScript strict, Privacy Audit)**:
   - Ci sono lacune architetturali, edge case scoperti o inconsistenze residue tra quanto progettato in `docs/tranche8-audit-and-design-hardening.md` e quanto implementato?

6. **Delibera Finale**:
   - Rilascia il verdetto esplicito: **APPROVAZIONE CONGIUNTA 8D + 8E (GO)** oppure **RICHIESTA CORREZIONI (NO-GO)**.
   - Fornisci raccomandazioni su eventuali accortezze prima della sincronizzazione cloud (`git push origin main` - Livello 2) e della preparazione della Release Desktop v3.2.0 (Livello 3).
