# PC Tracker — Hardware & Upgrade Lifecycle Manager

[![CI](https://github.com/collabwithglab-rgb/pc-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/collabwithglab-rgb/pc-tracker/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/collabwithglab-rgb/pc-tracker?color=38bdf8)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-blue.svg)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-emerald.svg)](LICENSE)

**PC Tracker** è un'applicazione desktop Windows locale, autonoma e indipendente per tracciare e gestire la vita completa del proprio computer, dei componenti hardware posseduti nel tempo, degli acquisti, delle vendite e di ogni singolo cambio generazionale (upgrade).

---

## 📥 Download

Scarica l'installer Windows (`.exe`) più recente direttamente dalla pagina delle release:

👉 **[Scarica PC Tracker (Ultima Versione)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)**

*L'applicazione si installa localmente in modalità `currentUser` senza richiedere privilegi di amministratore e si avvia come istanza pulita pronta all'uso.*

---

## ⚡ Caratteristiche Principali

- **Local-First & Single Source of Truth**: Nessun cloud obbligatorio, nessun account o login remoto. Tutti i dati risiedono esclusivamente nel database locale IndexedDB.
- **Event-Driven Lifecycle**: Ogni componente hardware ha un'identità stabile e una cronologia temporale ordinata (`PURCHASE`, `INSTALL`, `UNINSTALL`, `SALE`, `EXTRA_EXPENSE`, `GIFT`, `DISPOSAL`).
- **Metriche Finanziarie Formalizzate**:
  - *Totale Acquistato Storico*: Spesa lorda complessiva sostenuta negli anni.
  - *Totale Recuperato dalle Vendite*: Incasso netto recuperato vendendo pezzi dismessi.
  - *Costo Netto Storico*: Spesa reale a fondo perduto sostenuta per la propria postazione.
  - *Costo Configurazione Attuale*: Valore d'acquisto dei soli componenti attualmente montati nel case.
- **Time Travel & Checkpoint**: Ricostruzione point-in-time del PC a qualsiasi data del passato o salvataggio di fotografie storiche (checkpoint immutabili).
- **Design System "Dark Hardware Enthusiast"**: Interfaccia scattante, curata nei dettagli tipografici, con tema scuro e accenti cromatici funzionali (Ciano per componenti attivi, Smeraldo per ricavi, Rubino per spese, Ambra per magazzino).
- **Resilienza e Backup**: Esportazione e importazione istantanea del database in formato JSON versionato e CSV.

---

## 🛠️ Stack Tecnologico

- **Desktop Framework**: [Tauri 2](https://v2.tauri.app/) (Rust + Windows WebView2)
- **Frontend Core**: React 18 con TypeScript (`strict: true`)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS nativo con Custom Properties e Design Tokens
- **Iconografia**: [Lucide React](https://lucide.dev/)
- **Test Suite**: [Vitest](https://vitest.dev/) (285 test di dominio e integrità referenziale)

---

## 🚀 Sviluppo Locale

### Prerequisiti
- [Node.js](https://nodejs.org/) v20+
- [Rust](https://www.rust-lang.org/) (target `x86_64-pc-windows-msvc` o `x86_64-pc-windows-gnu`)

### Installazione e Avvio
```bash
# Clona il repository
git clone https://github.com/collabwithglab-rgb/pc-tracker.git
cd pc-tracker

# Installa le dipendenze
npm install

# Avvia l'ambiente di sviluppo desktop (Vite + Tauri dev)
npm run tauri:dev

# Esegui la suite completa di test (285 unit test)
npm test

# Esegui il controllo di tipo TypeScript
npm run build
```

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta il file `LICENSE` per ulteriori dettagli.
