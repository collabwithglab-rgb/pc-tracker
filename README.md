# PC Tracker — Hardware & Upgrade Lifecycle Manager

[![Release](https://img.shields.io/github/v/release/collabwithglab-rgb/pc-tracker?color=38bdf8&label=Release&logo=windows)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)
[![CI](https://github.com/collabwithglab-rgb/pc-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/collabwithglab-rgb/pc-tracker/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-1136%20Vitest%20%7C%2056%20Rust%20passed-10b981.svg)](https://github.com/collabwithglab-rgb/pc-tracker)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20100%25-3178c6.svg)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078d4.svg?logo=windows)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)
[![Architecture](https://img.shields.io/badge/architecture-Local--First%20%7C%20Zero--Telemetry-purple.svg)](https://github.com/collabwithglab-rgb/pc-tracker)
[![License](https://img.shields.io/badge/license-MIT-emerald.svg)](LICENSE)

> **PC Tracker** is a high-performance, local-first Windows desktop application engineered for hardware enthusiasts, custom PC builders, and gamers. It tracks the complete lifespan of every component you own, calculates true lifecycle finances across generational upgrades, monitors real-time Win32 hardware telemetry, and performs deterministic diagnostic health checks on your rig.

---

## 📥 Download & Installation

Get the latest signed Windows installer (`.exe`) directly from the official GitHub release:

👉 **[Download PC Tracker v3.2.1 (Latest Release)](https://github.com/collabwithglab-rgb/pc-tracker/releases/latest)**

- **Zero Admin Rights Required**: Installs seamlessly into the local user space (`%LOCALAPPDATA%`).
- **Cryptographically Signed Auto-Updates**: Features background update checks verified via Minisign Ed25519 signatures.
- **Instant Clean Start**: Launches immediately with a clean, fully functional state.

---

## 💡 The Core Philosophy: Local-First & Zero-Telemetry

Modern software often locks personal data behind cloud logins, subscription gates, or telemetry-heavy tracking. **PC Tracker does the exact opposite**:

1. **100% Local-First & Single Source of Truth**: All configuration records, financial metrics, and logs live **strictly on your machine inside IndexedDB**. No mandatory accounts, no cloud sync, and zero outbound network telemetry.
2. **Event-Driven Lifecycle Architecture**: Hardware components are never treated as disposable static entries in a spreadsheet. Every piece of hardware possesses an immutable, ordered chain of chronological events (`PURCHASE`, `INSTALL`, `UNINSTALL`, `SALE`, `EXTRA_EXPENSE`, `GIFT`, `DISPOSAL`).
3. **Mathematical Financial Determinism**: States, current builds, and monetary metrics are dynamically derived by pure functions without speculative market guesswork or ambiguous calculations.
4. **"Anti AI-Slop" & "Less, but Better" Design**: Handcrafted native Vanilla CSS design system with an authentic *Dark Hardware Enthusiast* aesthetic (`#080c14` backdrop, `#0f1626` cards, fine 1px borders, functional color tokens, and JetBrains Mono monospace figures).

---

## 🌟 Key Features & Functional Tour

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PC TRACKER ECOSYSTEM                           │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ 🖥️ My Current Rig             │ Dynamic visual build grouped by slots       │
│ 💰 4-Metric Financial Engine  │ Purchase, Recovered, Net Cost, Active Rig   │
│ ⏳ Time Travel & Checkpoints  │ Point-in-Time rig reconstruction at date T  │
│ ⚡ Power Budget & PSU Sizing   │ Real-time TDP, 12V rails & PCIe connectors  │
│ 🧾 Receipt Vault & Warranty   │ In-DB blob storage & expiry countdowns      │
│ 🛒 Marketplace Generator      │ One-click listings for eBay, Subito, forums │
│ 🔍 Global Command Palette     │ Ctrl+K deep search & quick actions          │
│ ⚖️ Rig Comparison Tool        │ Specular build delta (Hardware, Cost, TDP)  │
│ 📊 Historical Analytics       │ Multi-year spend distribution & leaderboards│
│ 🩺 PC Care Center (Tranche 12)│ Win32 telemetry, NVML, AMD ADL, Health 0-100│
│ 🛡️ Deep Diagnostics Win32     │ CfgMgr32, PSAPI, WHEA, SCM, Wi-Fi, Ethernet │
│ 📦 Portable Backup & Restore  │ Versioned JSON schemaVersion: 1 & CSV export│
└───────────────────────────────┴─────────────────────────────────────────────┘
```

### 1. 🖥️ "My Current Rig" & Hardware Lifecycle
- **Visual Build Layout**: Organized hardware views divided into logical categories: Core (CPU, Motherboard, RAM, GPU), Storage & Cooling, Power & Chassis, and Displays & Peripherals.
- **Active Utilization Counter**: Accurately tracks how many days each individual component has been actively installed inside your computer.
- **Quick Swap & Slot Management**: Mount spare parts from storage, uninstall active parts, or execute atomic replacement workflows (`UNINSTALL` old + `INSTALL` new) in a single click.

### 2. 💰 4-Metric Disambiguated Financial Engine
Isolates personal hardware expenditures into four mathematically distinct indicators:
1. **Historical Total Purchased**: Gross total expenditure across all hardware purchases and extra modifications (custom cables, thermal pads, waterblocks).
2. **Total Recovered from Sales**: Actual net revenue collected from selling retired components (factoring in shipping costs and platform commission fees).
3. **Historical Net Cost**: The true lifetime "out-of-pocket" investment in your PC passion (`Total Purchased - Total Recovered`).
4. **Current Rig Value / Cost**: Historical acquisition cost of only the components currently inside your machine.

### 3. ⏳ Point-in-Time Time Travel & Historical Checkpoints
- **Dynamic Time Travel**: Slide to any historical date in time (`YYYY-MM-DD`) and let the pure domain engine reconstruct your computer's exact configuration as it was on that specific day.
- **Immutable Checkpoints**: Snapshot your build at key milestones (e.g., *"RTX 4090 Upgrade"*, *"Winter 2024 Build"*) with a frozen components snapshot.
- **Discrepancy Detection**: If past events are retroactively corrected, PC Tracker flags informative discrepancies between reconstructed time travel and frozen checkpoints without silently altering history.

### 4. ⚡ Power Budget & PSU Sizing Engine
- **Accurate TDP Summation**: Evaluates aggregate thermal design power under full continuous load.
- **PSU Headroom Evaluation**: Visualizes load percentages on your power supply unit (Optimal 50–70%, Safe 70–85%, Warning >85%).
- **PCIe Auxiliary Power Checks**: Tracks 8-pin PCIe and 12V-2x6 / 12VHPWR connector requirements against available modular cables.

### 5. 🧾 Receipt Vault & Warranty Countdown
- **Zero External Dependencies**: Stores actual receipt files (PNG, JPG, WebP, PDF) directly within your local IndexedDB as isolated Blobs.
- **Warranty Status**: Real-time expiration badges (*Valid*, *Expiring within 30 days*, *Expired*) with precise days-remaining counters.

### 6. 🛒 Marketplace Listing Generator
- Ready to sell an old GPU, CPU, or motherboard? Generate professionally structured, persuasive classified listings in seconds.
- Multi-platform output presets customized for **eBay**, **Subito.it**, **Vinted**, and **Facebook Marketplace / Hardware Forums**.
- Includes automatic warranty mentions, condition details, bulleted specifications, and pre-formatted disclaimers.

### 7. 🔍 Global Command Palette (`Ctrl+K` / `Cmd+K`)
- Navigate the entire app without leaving the keyboard.
- Instant fuzzy search across your complete inventory of components, checkpoints, settings, and tools.
- Direct quick actions: launch movements, trigger backups, switch locales, or open diagnostics.

### 8. ⚖️ Rig Comparison Tool
- Side-by-side specular diffing between your current build and any past checkpoint or target configuration.
- Immediate clarity on hardware deltas, monetary differentials (+/- €/$), and power consumption changes.
- Swap button (`⇄`) to instantly invert baseline comparisons.

---

## 🩺 PC Care Center & Native Diagnostics Engine (Win32)

Built upon lightweight Rust FFI bindings and zero background bloatware, the **PC Care Center** monitors and evaluates system health with complete independence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PC CARE CENTER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Win32 API (GetSystemTimes, GlobalMemoryStatusEx, PSAPI, CfgMgr32, EVTX)    │
│  NVIDIA NVML (Dynamic FFI)  │  AMD Radeon ADL (Dynamic FFI)                 │
│  Windows IP Helper (NetAPI) │  Native Wi-Fi wlanapi.dll                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC HEALTH ENGINE (0-100)                      │
│      Strict Penalty Rules • Diagnostic Coverage • Anti-Double Penalty       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│       Care Overview (Health Score, Findings & One-Click System Tools)       │
│       Live Monitoring (CPU, RAM, GPU NVML/ADL, Storage S.M.A.R.T.)          │
│       Hardware Diagnostics (Displays, WASAPI, Ethernet Link, Wi-Fi)         │
│       Startup Apps (StartupApproved\Run) & ICMP Network Benchmark           │
│       Smart Maintenance Scheduler (In-App Reminders with Persistent Snooze) │
│       Health Report Export (Structured Markdown & Versioned JSON)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Live Multi-Vendor GPU Telemetry**: Dynamic runtime FFI for both **NVIDIA GPUs** (via `nvml.dll`) and **AMD Radeon GPUs** (via `atiadlxx.dll` / `atiadlxy.dll`). Monitors VRAM utilization, core clocks, edge temperatures, hotspot (Tjunction) temperatures, and fan RPMs without requiring heavy vendor software.
- **Deterministic Health Score (0–100)**: Transparent, rule-based scoring engine with diagnostic coverage indicators. Sensor unavailability does not penalize your score.
- **Core Hardware Faults (`CfgMgr32`)**: Queries Windows Configuration Manager to intercept driver errors (Code 43, Code 10, Code 28) before they cause crashes.
- **Memory Commit Charge Guard (`PSAPI`)**: Monitors physical RAM and Windows commit limits to warn before out-of-memory pagefile exhaustion occurs.
- **Deep Event Log Correlation**: Native queries for critical hardware events: **WHEA** (Machine Check / PCIe AER), **Kernel-Power Event ID 41** (unexpected shutdowns and BSODs), and NTFS disk corruptions.
- **Startup Intelligence**: Decodes registry entries in `StartupApproved\Run` to classify startup application boot impact.
- **Network Quality & ICMP Benchmarks**: On-demand ICMP ping tests measuring latency, jitter, and packet loss against Cloudflare (`1.1.1.1`), Google (`8.8.8.8`), and OpenDNS (`208.67.222.222`).
- **Ethernet Link Speed Downgrade Detection**: Flags when a Gigabit/Multi-Gigabit network card is throttled to 100 Mbps Fast Ethernet due to a faulty cable or switch port.
- **Wi-Fi Signal Intelligence (`wlanapi.dll`)**: Scans live Wi-Fi RSSI (dBm), signal quality, frequency bands (2.4 GHz, 5 GHz, 6 GHz), and 802.11 standards (Wi-Fi 5, 6, 6E, 7).
- **Display & Audio Diagnostics**: Detects refresh rate limiter traps (e.g., a 144Hz monitor running at 60Hz) and inspects WASAPI Core Audio endpoints.
- **Comprehensive Health Report Export**: Export your PC's full diagnostic state into a clean Markdown (`.md`) or structured JSON report with a single click.

---

## 🔒 Privacy, Security & Data Sovereignty

| Feature | PC Tracker Guarantee |
| :--- | :--- |
| **Data Storage** | 100% Local (IndexedDB & Local AppData). No remote databases. |
| **Tracking / Ads** | Zero trackers, zero analytics scripts, zero telemetry beacons. |
| **Network Requests** | Only queries GitHub Releases during update checks (or ICMP ping when requested). |
| **Backup Standard** | Versioned JSON format (`schemaVersion: 1`) with pre-import validation. |
| **Privacy Audit Gate**| Automated CI test (`npm run audit:privacy`) ensuring zero personal data leaks. |

---

## 🌐 Internationalization & Currencies

- **Languages**: Full multi-language architecture featuring **Italian (`it`)** and **English (`en`)**, with automated CLDR pluralization rules (`Intl.PluralRules`) and fallback chains.
- **Anti-Regression Ratchet Test**: Automated testing prevents unauthorized hardcoded strings from entering the codebase.
- **Multi-Currency Support**: Switch between **EUR (€)**, **USD ($)**, **GBP (£)**, **CHF (CHF)**, **CAD (CA$)**, **AUD (A$)**, **JPY (¥)**, and custom currencies with real-time UI formatting.

---

## 🛠️ Technology Stack

- **Runtime & Desktop Shell**: [Tauri 2](https://v2.tauri.app/) (Rust core + Microsoft Edge WebView2 on Windows).
- **Frontend Core**: React 18 with TypeScript in strict mode (`strict: true`).
- **Build Tool**: [Vite](https://vitejs.dev/) with optimized ESBuild chunking.
- **Design System**: Native **Vanilla CSS** with modular custom properties and design tokens (zero runtime CSS libraries).
- **Icons**: [Lucide React](https://lucide.dev/) hardware and finance iconography.
- **Quality Gates**:
  - **Vitest**: 1,136 domain, lifecycle, financial, and UI test cases.
  - **Cargo Test**: 56 native Rust unit tests covering Win32 FFI, telemetry parsing, and registry decoders.
  - **Type Safety**: Zero TypeScript compiler warnings (`tsc --noEmit`).

---

## 💻 Local Development & Build

### Prerequisites
1. **Node.js**: v20 or newer
2. **Rust**: Stable toolchain with `x86_64-pc-windows-msvc` target
3. **Windows 10/11 x64**

### Getting Started

```powershell
# 1. Clone the repository
git clone https://github.com/collabwithglab-rgb/pc-tracker.git
cd pc-tracker

# 2. Install dependencies
npm install

# 3. Launch Tauri desktop app in live-reload dev mode
npm run tauri:dev

# 4. Run the complete frontend test suite (1136 tests)
npm test

# 5. Run the Rust test suite (56 tests)
cargo test --manifest-path src-tauri/Cargo.toml

# 6. Run the privacy & data-leak audit gate
npm run audit:privacy

# 7. Build the production Windows NSIS installer
npm run tauri:build
```

---

## 🤝 Contributing

Contributions, bug reports, and hardware suggestions are welcome!
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all test suites pass (`npm test`, `cargo test`, `npm run audit:privacy`).
4. Commit your changes (`git commit -m 'feat: add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  <b>PC Tracker</b> — Engineered with precision by <b><a href="https://github.com/collabwithglab-rgb">Peppe</a></b> (<i><a href="https://www.instagram.com/peppesthoughtss/">@peppesthoughtss</a></i>)
</p>
