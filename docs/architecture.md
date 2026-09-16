# Architettura dell'Applicazione — PC Hardware & Upgrade Tracker

## 1. Visione e Filosofia Architetturale

L'applicazione nasce come strumento personale, locale, veloce e focalizzato per tracciare la vita del proprio PC, dei singoli componenti, degli upgrade e della dimensione economica nel tempo.

### Principi Guida
1. **Local-First & Single Source of Truth**: Tutti i dati risiedono sul dispositivo dell'utente all'interno di un'unica fonte di verità locale (**IndexedDB**). Nessuna duplicazione dei dati su altri sistemi di persistenza. Nessuna dipendenza da server remoti o account cloud.
2. **Event-Driven Lifecycle**: I componenti non sono righe statiche in tabelle separate ("attuali", "vecchi", "venduti"). Ogni componente possiede un'identità stabile e una sequenza ordinata di eventi immutabili nel tempo (`PURCHASE`, `INSTALL`, `UNINSTALL`, `SALE`, `EXTRA_EXPENSE`, `GIFT`, `DISPOSAL`). Lo stato attuale, la configurazione storica ad una data specifica e tutte le metriche finanziarie sono calcolati deterministicamente tramite **funzioni pure**.
3. **Semplicità e Robustezza**: Stack moderno, essenziale, leggibile e manutenibile. Pochi elementi ben progettati senza sovrastrutture enterprise inutili.
4. **Resilienza e Portabilità**: I dati possono essere esportati e reimportati in qualsiasi momento in formato JSON standard con controllo di versione dello schema (`schemaVersion: 1`).

---

## 2. Valutazione dello Stack Tecnologico e Flessibilità

Lo stack tecnologico di riferimento per l'applicazione è:

- **Build Tool & Dev Server**: [Vite](https://vitejs.dev/) (veloce, moderno, standard industriale per SPA locali).
- **Core Library**: **React 18+ con TypeScript** (reattività fluida, componenti modulari, type safety rigorosa su contratti di eventi, valute e calcoli).
- **Styling**: **Vanilla CSS nativo** con Custom Properties (CSS variables) e moduli CSS. Nessun framework CSS esterno (vietato Tailwind, vietato Bootstrap, vietato MUI).
- **Iconografia**: [Lucide React](https://lucide.dev/) (icone pulite, leggere, orientate all'hardware e alle metriche).
- **Persistenza**: **IndexedDB come unica fonte di verità** per i dati del dominio (componenti, eventi, upgrade). `localStorage` può essere utilizzato esclusivamente per piccole preferenze grafiche non critiche dell'interfaccia (es. stato aperto/chiuso della sidebar), ma **mai** per duplicare i dati principali dell'applicazione.

> [!NOTE]
> **Flessibilità dello Stack**: Le decisioni tecnologiche adottate non sono irrevocabili. Tuttavia, qualsiasi futura variazione dello stack (es. introduzione di nuovi strumenti o migrazioni) **dovrà essere rigorosamente motivata da un requisito concreto e validato**, e non effettuata arbitrariamente.

---

## 3. Architettura a Livelli (Layered Architecture)

L'architettura separa rigorosamente la presentazione visiva dalla logica pura di calcolo e dalla persistenza:

```
┌─────────────────────────────────────────────────────────┐
│                      Livello UI                         │
│   Dashboard | Il Mio PC | Archivio | Dettaglio | Modali │
└───────────────────────────┬─────────────────────────────┘
                            │ invoca
┌───────────────────────────▼─────────────────────────────┐
│                Livello Dominio (Puro TS)                │
│  - FinancialEngine: metriche economiche indipendenti    │
│  - LifecycleEngine: stato calcolato, giorni di uso      │
│  - HistoryEngine: ricostruzione configurazione a data T │
│  - UpgradeEngine: delta e costo netto di sostituzione   │
└───────────────────────────┬─────────────────────────────┘
                            │ gestito da
┌───────────────────────────▼─────────────────────────────┐
│                  Livello Stato (Store)                  │
│   PCContext / Store Reattivo con azioni atomiche        │
└───────────────────────────┬─────────────────────────────┘
                            │ persiste su
┌───────────────────────────▼─────────────────────────────┐
│              Livello Persistenza & Backup               │
│   StorageAdapter -> IndexedDB (Single Source of Truth)  │
│   BackupService -> Import/Export JSON validato          │
│   (LocalStorage: solo preferenze UI non critiche)       │
└─────────────────────────────────────────────────────────┘
```

### 1. Livello Persistenza (`src/storage/`)
- **IndexedDB**: Motore di memorizzazione asincrono per tutti i record dell'applicazione. Non soffre dei limiti di 5MB tipici di localStorage ed è ideale per conservare lo storico completo degli anni.
- **Nessuna Duplicazione**: I dati del PC risiedono unicamente in IndexedDB.
- **Backup Service**: Funzione di esportazione istantanea in file JSON con timestamp (`pc-tracker-backup-YYYY-MM-DD.json`) e ripristino con validazione dello schema.

### 2. Livello Stato (`src/store/`)
- Contesto React reattivo che carica i dati da IndexedDB all'avvio e memorizza lo stato corrente in memoria per un rendering fulmineo.
- Ogni azione atomica (es. `addEvent`, `createComponent`, `recordUpgrade`) aggiorna la memoria e salva in modo asincrono su IndexedDB.

### 3. Livello Dominio & Motori di Calcolo (`src/domain/`)
- **Completamente disaccoppiato dall'interfaccia utente (funzioni pure in TypeScript)**:
  - `financialEngine.ts`: Calcola in modo inequivocabile le metriche finanziarie (Totale acquistato storico, Totale recuperato dalle vendite, Costo netto storico, Costo configurazione attuale).
  - `lifecycleEngine.ts`: Calcola lo stato del componente (`IN_USE`, `IN_STORAGE`, `SOLD`, `GIFTED`, `DISPOSED`), le date chiave e la durata di permanenza.
  - `historyEngine.ts`: Ricostruisce la configurazione esatta del PC ad una qualsiasi data storica $T$ (`getConfigurationAtDate(components, events, targetDate)`).
  - `upgradeEngine.ts`: Calcola il bilancio di spesa tra componente dismesso e componente nuovo.

### 4. Livello Presentazione (`src/components/`, `src/pages/`)
- Componenti UI visuali e reattivi a tema "Dark Hardware Enthusiast".

---

## 4. Ricostruzione Storica della Configurazione (Time-Travel Capabilities)

L'architettura non richiede di salvare "fotografie" o snapshot duplicati nel tempo. 
Poiché ogni evento di installazione (`INSTALL`), rimozione (`UNINSTALL`), vendita (`SALE`), regalo (`GIFT`) o smaltimento (`DISPOSAL`) possiede una data precisa (formato ISO `YYYY-MM-DD`), è sempre possibile determinare con precisione matematica quali componenti componevano il computer in qualsiasi data del passato.

---

## 5. Sicurezza e Resilienza dei Dati

1. **Auto-save su IndexedDB**: Salvataggio trasparente dopo ogni operazione.
2. **Backup JSON Esportabile**: Esportazione manuale con 1 click sempre visibile nell'header.
3. **Validazione Rigorosa in Importazione**: Nessun dato locale viene toccato fino a quando il file di backup non ha superato la validazione dello schema e l'utente non ha confermato l'anteprima di ripristino.
