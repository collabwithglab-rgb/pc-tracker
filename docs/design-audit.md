# Design Audit & Quality Gate — PC Tracker (Fase 3.5)

Questo documento traccia l'audit visivo critico dell'applicazione, individua i difetti tipici delle interfacce generate rapidamente da assistenti AI e definisce la direzione artistica permanente e i principi "Less, but better" del progetto.

---

## 1. Diagnosi del Problema Visivo: Cosa Rendeva l'UI "AI-Generated"

Analizzando l'interfaccia iniziale con occhio critico, emergono diversi pattern tipici di interfacce prototipali o generate da modelli linguistici:

1. **Il Cliché del "Neon SaaS / Crypto Template"**:
   - Il pulsante principale adottava il tipico gradiente ciano-blu (`linear-gradient(135deg, #38bdf8, #2563eb)`) con una vistosa ombra luminescente (`box-shadow: 0 4px 15px rgba(56, 189, 248, 0.45)`).
   - L'icona del brand era un'emoji `⚡` all'interno di un quadratino con glow sfumato: una soluzione temporanea e generica.
   - I badge di stato avevano sfondi luminescenti saturi che distoglievano l'attenzione dal contenuto centrale.

2. **Frammentazione del Codice di Stile (Inline Style Sprawl)**:
   - Ogni modale (`ComponentFormModal`, `InstallModal`, `UninstallModal`, `ReplaceModal`, `DeleteConfirmModal`) conteneva 80-120 righe duplicate di stili inline `Record<string, React.CSSProperties>`.
   - Mancava una classe centralizzata per input, select, etichette e bottoni: qualsiasi ritocco rischiava di creare discrepanze tra una schermata e l'altra.

3. **Gerarchia Visiva Confusa ed Elementi Ridondanti**:
   - Header con bottoni di peso visivo disallineato affiancati in modo rigido.
   - Schede hardware con icone di azione compresse in angoli stretti, in contrasto con card adiacenti vuote con pulsanti enormi a tutta larghezza.
   - Assenza di una chiara differenziazione gerarchica tra il titolo principale del pezzo, il modello secondario e i metadati funzionali (giorni, slot, prezzo).

4. **Sidebar Piatta e Anonima**:
   - Nessun raggruppamento semantico tra navigazione delle funzionalità primarie (Dashboard, Il Mio PC, Archivio, Upgrade, Statistiche) e utility di sistema (Backup & Dati).
   - Nessun tocco personale che facesse sembrare l'app un progetto artigianale curato.

5. **Assenza di Micro-Feedback Interattivo**:
   - Nessuna risposta al click del mouse (`:active { transform: scale(0.98); }`).
   - Focus ring inconsistente per chi naviga da tastiera (`:focus-visible`).
   - Assenza di rispetto per le preferenze di sistema `prefers-reduced-motion`.

---

## 2. Direzione Artistica: "Sophisticated Dark Hardware Enthusiast"

L'identità visiva è ispirata a strumenti software ad alta precisione ingegneristica (Linear, Raycast, Apple Developer Tools, Supabase):

- **Superfici Profonde**: Sfondo applicativo scuro e neutro (`#070a13` / `#0a0e17`), con card su superfici calibrate (`#0f172a` / `#111c30`) e contrasto visivo controllato, senza neri puri che stancano la vista.
- **Bordi Sottili e Deliberati**: Bordature da 1px con opacità controllata (`rgba(255, 255, 255, 0.07)` o `#1e293b`), capaci di definire la struttura senza creare un reticolo soffocante di riquadri.
- **Accenti Funzionali e Non Decorativi**:
  - **Ciano (`#38bdf8`)**: Riservato unicamente al componente attualmente montato nel PC (`IN_USE`) e a primari contestuali.
  - **Ambra (`#f59e0b`)**: Riservato al magazzino (`IN_STORAGE`) e avvisi di manutenzione.
  - **Smeraldo (`#10b981`)**: Riservato alle vendite (`SALE`) e recuperi economici positivi.
  - **Rubino (`#f43f5e`)**: Riservato ad acquisti (`PURCHASE`), spese extra e azioni distruttive.
  - **Nessun glow diffuso arbitrario**: Gli elementi luminosi devono avere una funzione di stato concreta.
- **Tipografia Ponderata**:
  - **Heading (Outfit)**: Pesi 600/700 con tracking leggermente compresso (`-0.025em`) per una resa tecnica e contemporanea.
  - **Body & Labels (Inter)**: Pesi 400 e 500, con altezze riga generose (`line-height: 1.5 - 1.6`) per massima leggibilità.
  - **Dati & Cifre (JetBrains Mono)**: Con `font-feature-settings: 'tnum' 1, 'zero' 1` per allineare perfettamente importi, date e giorni.

---

## 3. Filosofia "Less, but Better"

In ossequio ai principi di Dieter Rams, ogni elemento grafico deve giustificare la propria esistenza:

| Prima (Approccio AI Generico) | Ora (Approccio "Less, but Better") |
| :--- | :--- |
| Gradiente vistoso con ombra al neon per il bottone primario | Bottone solido ad alto contrasto con micro-riflesso superiore e transizione precisa |
| Emoji ⚡ come logo aziendale fake | Chip hardware geometrico minimalista con tipografia "PC Tracker" calibrata |
| 10 stili inline sparsi per i campi di input nei vari modali | Classi CSS riutilizzabili centralizzate (`.form-group`, `.form-input`, `.form-label`) |
| Card vuota in "Il Mio PC" con pulsante enorme | Slot hardware con stile "blueprint / alloggiamento" discreto e orientato all'azione |
| Bordi ovunque con contrasto eccessivo | Gerarchia di profondità con contrasti calibrati e bordi a bassa opacità |
| Badge con sfondi luminescenti accesi | Badge compatti a bassa saturazione con testo nitido e micro-bordo |

---

## 4. Checklist del Quality Gate Visivo

Prima di considerare conclusa qualsiasi fase grafica, verificare:

- [x] **Test del Designer**: Questa schermata sembra disegnata con intenzione da un designer software o creata in fretta da un prompt AI?
- [x] **Economia degli Elementi**: Ci sono card, bordi o bottoni superflui che possono essere rimossi senza perdita di chiarezza?
- [x] **Gerarchia**: L'occhio dell'utente sa immediatamente quale sia l'informazione principale della pagina?
- [x] **Coerenza di Famiglia**: Header, sidebar, card, modali e bottoni appartengono inequivocabilmente allo stesso prodotto?
- [x] **Firma Personale**: La sidebar contiene il tocco personale discreto *"Made by Peppe"* con link a Instagram in nuova scheda?
- [x] **Accessibilità & Ergonomia**: Il focus da tastiera (`:focus-visible`) è visibile e chiaro? Gli input hanno etichette associate?
- [x] **Stato Vuoto Elegante**: Con 0 dati presenti, l'applicazione appare comunque solida, curata e accogliente?
- [x] **Console Pulita**: 0 errori runtime, 0 warning di rendering o CSS.
