import { WikiArticle, WikiCategoryMeta } from '../types/wiki';

export const WIKI_CATEGORIES_EN: WikiCategoryMeta[] = [
  {
    id: 'all',
    label: 'All Topics',
    description: 'Browse the entire PC Tracker knowledge base',
  },
  {
    id: 'releases',
    label: '🚀 Releases & Changelog',
    description: 'Release notes, hardware highlights and operating guides for every update',
  },
  {
    id: 'getting-started',
    label: 'Getting Started & Setup',
    description: 'Quick start guide and adding your first PC',
  },
  {
    id: 'event-lifecycle',
    label: 'Lifecycle & Events',
    description: 'The chronological timeline logic powering hardware tracking',
  },
  {
    id: 'finances',
    label: 'Finances & Metrics',
    description: 'Formal explanation of costs, recovery and depreciation',
  },
  {
    id: 'time-travel',
    label: 'Time Travel & Checkpoints',
    description: 'Historical navigation and frozen rig milestones',
  },
  {
    id: 'upgrades',
    label: 'Upgrades & Replacements',
    description: 'Component swaps and generational cost calculation',
  },
  {
    id: 'marketplace',
    label: 'Sales & Listings',
    description: 'Storage inventory, marketplace listings and capital recovery',
  },
  {
    id: 'maintenance',
    label: 'Windows Care & Health',
    description: 'Shader cache optimization, DNS tuning and thermal logs',
  },
  {
    id: 'backup-privacy',
    label: 'Backup & Local Privacy',
    description: '100% local architecture on IndexedDB with JSON exports',
  },
  {
    id: 'glossary',
    label: '📖 Hardware Glossary',
    description: 'Technical terms and enthusiast acronyms explained clearly',
  },
  {
    id: 'faq',
    label: 'Frequently Asked Questions (FAQ)',
    description: 'Quick answers to common hardware and software questions',
  },
];

export const WIKI_ARTICLES_EN: WikiArticle[] = [
  // --- GETTING STARTED & SETUP ---
  {
    id: 'first-rig-setup',
    title: 'Getting Started: How to configure your PC on PC Tracker',
    category: 'getting-started',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Quick guide to add your computer components and start tracking your build.',
    content: [
      'PC Tracker is designed for maximum flexibility: you can set up your current computer in under two minutes using the guided Quick Setup wizard, or add individual parts manually via the "+ New Movement" button.',
      'During initial setup, for each component entered (CPU, GPU, RAM, Storage, etc.), both a purchase event (PURCHASE) and an installation event (INSTALL) in the corresponding slot are created automatically.',
    ],
    steps: [
      'Use the "Quick Setup" wizard to bulk-populate the primary components of your computer.',
      'Alternatively, click "+ New Movement" at the top right to add a single component with purchase date and price.',
      'Check the "My Current Rig" screen to confirm all components are marked with IN USE status.',
      'Download an initial safety backup by clicking the "Backup JSON" button in the header.',
    ],
    tips: [
      'Do not worry if you do not remember the exact cent of the price or the exact day: you can always edit or refine details later from the component detail page.',
      'You can customize the name and description of your computer from the Settings section.',
    ],
    keywords: ['getting started', 'setup', 'onboarding', 'first steps', 'new build', 'configuration', 'create pc'],
    actionLinks: [
      { label: 'Launch Quick Setup', actionType: 'quick-setup', iconName: 'Sparkles' },
      { label: 'Open My Current Rig', targetSection: 'current-rig', iconName: 'Cpu' },
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'event-driven-philosophy',
    title: 'The Event-Driven Philosophy: Why static lists are obsolete',
    category: 'getting-started',
    badge: 'CONCETTO CHIAVE',
    readTime: '3 min',
    summary: 'Discover why PC Tracker relies on chronological events instead of static checkboxes.',
    content: [
      'In traditional inventory spreadsheets, when you sell a part you delete a row or manually change a dropdown from "Current" to "Sold". This permanently erases the history of your machine and makes it impossible to know what you had installed 6 months ago.',
      'In PC Tracker, every hardware component possesses a permanent identity and an ordered chronological sequence of events: PURCHASE, INSTALL, UNINSTALL, SALE, EXTRA_EXPENSE, GIFT, and DISPOSAL.',
      'Current status, days in service and all financial metrics are calculated instantaneously and deterministically by replaying event history.',
    ],
    tips: [
      'There is no need to "move" a component to a different list: just register the corresponding movement (e.g. "Uninstall" or "Sale") and the app updates everything automatically.',
    ],
    keywords: ['philosophy', 'event-driven', 'events', 'timeline', 'history', 'identity', 'architecture'],
    actionLinks: [
      { label: 'Explore Component Archive', targetSection: 'archive', iconName: 'Archive' },
      { label: 'Open Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },

  // --- LIFECYCLE & EVENTS ---
  {
    id: 'component-states-explained',
    title: 'The 5 Dynamic States of a Hardware Component',
    category: 'event-lifecycle',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'How the calculation engine automatically determines whether a part is In Use, in Storage, Sold, Gifted or Disposed.',
    content: [
      'Based on the latest chronological event recorded, each component assumes one of the following 5 states:',
      '• IN USE (IN_USE): The latest event is INSTALL. The component is actively installed in your current PC and contributes to Current Rig Cost.',
      '• IN STORAGE (IN_STORAGE): The latest event is UNINSTALL (or PURCHASE only). The piece is physically in your possession (in a drawer or shelf), ready to be re-installed or listed for sale.',
      '• SOLD (SOLD): The latest event is SALE. The part left your ownership and net sales proceeds have been collected.',
      '• GIFTED (GIFTED): The latest event is GIFT. The component was given away to a friend, family member or cause.',
      '• DISPOSED (DISPOSED): The latest event is DISPOSAL. The part was defective or obsolete and was recycled or discarded.',
    ],
    tips: [
      'If you uninstall a component and reinstall it three months later, PC Tracker accurately counts only the actual days it spent inside the case, excluding the storage interval!',
    ],
    keywords: ['states', 'in use', 'in storage', 'storage', 'sold', 'gifted', 'disposed', 'lifecycle'],
    actionLinks: [
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'receipts-and-warranties',
    title: 'Receipt Vault & Warranty Expiration Tracking',
    category: 'event-lifecycle',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'How to safeguard receipts, invoices and monitor legal and manufacturer warranties for your hardware.',
    content: [
      'For every component you can record its warranty expiration date and attach digital documents (receipt photos, order screenshots or PDF/PNG/JPG invoices).',
      'Receipts are securely stored directly inside your local IndexedDB database, ensuring instant offline access even if you lose original store links.',
      'On each component detail card you will see an active warranty progress bar with remaining days and visual amber/orange alerts when expiration approaches.',
    ],
    steps: [
      'Open the Component Archive and select the desired component.',
      'In the "Warranty & Documents" section, verify or set the warranty end date.',
      'Drag and drop or browse the receipt/invoice file: it will be stored in your local Vault.',
      'If you need to resell the part or open an RMA ticket, you can view and download the original file with one click.',
    ],
    tips: [
      'JSON backups include receipt metadata; for very large files keep original copies in your personal documents folder.',
    ],
    keywords: ['receipt', 'invoice', 'warranty', 'rma', 'vault', 'documents', 'expiration'],
    actionLinks: [
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
    ],
  },

  // --- FINANCES & METRICS ---
  {
    id: 'the-four-financial-metrics',
    title: 'The 4 Formal Financial Metrics Explained',
    category: 'finances',
    badge: 'FINANZE',
    readTime: '3 min',
    summary: 'Zero confusion between gross purchases, recovered money, historical net cost and current hardware value.',
    content: [
      'To manage hardware finances without ambiguity, PC Tracker implements 4 isolated, pure metrics, each with a distinct economic meaning:',
      '1. Total Historical Purchased: The sum of all purchase prices and extra expenses (sleeved cables, thermal pads, fittings) throughout history.',
      '2. Total Recovered from Sales: The net revenue collected from selling decommissioned hardware (after subtracting shipping costs and platform fees).',
      '3. Historical Net Cost: The difference between all money spent and all money recovered. Represents the real sunken cost of your PC hobby across years.',
      '4. Current Rig Cost: The historical purchase cost of only the components currently installed inside your computer.',
    ],
    formula: {
      title: 'Financial Engine Equations',
      equation: 'Total Purchased = Σ(Purchase Prices) + Σ(Extra Expenses)\nTotal Recovered = Σ(Sale Price - Shipping - Fees)\nHistorical Net Cost = Total Purchased - Total Recovered\nCurrent Rig Cost = Σ(Purchase Price of IN_USE components)',
      explanation: 'All calculations are isolated in src/domain/financialEngine.ts and guarantee exact mathematical consistency.',
    },
    tips: [
      'Extra expenses (e.g. return shipping, thermal paste, modular cables) increase Total Purchased and Net Cost, giving you a 100% honest balance.',
    ],
    keywords: ['finances', 'metrics', 'total purchased', 'total recovered', 'net cost', 'current cost', 'formulas', 'money'],
    actionLinks: [
      { label: 'Open Stats & Finances', targetSection: 'stats', iconName: 'BarChart3' },
      { label: 'Open Overview', targetSection: 'dashboard', iconName: 'Cpu' },
    ],
  },
  {
    id: 'daily-cost-and-retention',
    title: 'Cost per Day (€/day) and True Hardware Depreciation',
    category: 'finances',
    badge: 'FINANZE',
    readTime: '2 min',
    summary: 'Discover how much using each component truly cost you every single day.',
    content: [
      'Enthusiasts often wonder if an expensive component was truly worth the price. Cost per Day measures real return on hardware investment.',
      'If you bought a graphics card for €800, used it for 730 days (2 years) and sold it for €400 net, its real net cost was €400 total, which equals just €0.55 per day!',
    ],
    formula: {
      title: 'Cost per Day Formula',
      equation: 'Cost per Day = (Purchase Cost - Net Sale Proceeds) / Active Days in Service',
      explanation: 'Days in service strictly count the time the component was actually installed in the rig.',
    },
    tips: [
      'You can sort the Component Archive by cost per day to discover which component gave you the highest longevity-to-price ratio in your build history.',
    ],
    keywords: ['daily cost', 'days in use', 'depreciation', 'value over time', 'retention'],
    actionLinks: [
      { label: 'View Usage Stats', targetSection: 'stats', iconName: 'BarChart3' },
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
    ],
  },

  // --- TIME TRAVEL & CHECKPOINTS ---
  {
    id: 'time-travel-slider',
    title: 'Time Travel: Reconstruct your PC on Any Past Date',
    category: 'time-travel',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Use the temporal slider to see what components composed your computer on any specific day.',
    content: [
      'Time Travel is one of the signature features of PC Tracker: powered by historyEngine, the application reconstructs your computer on any past date T.',
      'The engine gathers all events recorded on or before date T: if a component\'s latest event at that date was INSTALL, it was inside the rig; if UNINSTALL, it was in storage; if prior to purchase or after sale, it did not exist in your rig.',
    ],
    steps: [
      'Navigate to the "Time Travel" section from the sidebar.',
      'Drag the temporal slider to your desired date (or click a milestone on the timeline).',
      'Inspect the computer configuration reconstructed deterministically for that day.',
      'Verify the total build cost and component specifications at that historical moment.',
    ],
    tips: [
      'If you retroactively correct an old installation date, Time Travel automatically adjusts to reflect the update.',
    ],
    keywords: ['time travel', 'past', 'reconstruction', 'historical date', 'timeline', 'past rig'],
    actionLinks: [
      { label: 'Open Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },
  {
    id: 'checkpoints-immutability',
    title: 'Historical Checkpoints vs Dynamic Time Travel',
    category: 'time-travel',
    badge: 'CONCETTO CHIAVE',
    readTime: '3 min',
    summary: 'Why Checkpoints are frozen snapshots and how informative discrepancies work.',
    content: [
      'Understanding the conceptual difference between Time Travel and Checkpoints is crucial:',
      '• Time Travel (Dynamic): A live calculation. If you alter historical events, Time Travel adapts to the new reality.',
      '• Checkpoint (Immutable Snapshot): An explicit snapshot saved at a chosen moment (e.g. "Early 2024 Rig"). It contains a frozen component snapshot and a unique anchorEventId.',
      'What happens if past events are later edited or deleted? Under PC Tracker design rules, the Checkpoint is NEVER silently modified or overwritten. Instead, the system displays an "Informative Discrepancy" badge for full transparency, letting you know that current event history diverges from the frozen snapshot.',
    ],
    tips: [
      'Create a Checkpoint every time you finish a major build milestone or key upgrade, creating a permanent landmark of your computer journey.',
    ],
    keywords: ['checkpoint', 'snapshot', 'discrepancy', 'immutable', 'anchorEventId', 'historical memory'],
    actionLinks: [
      { label: 'Manage Checkpoints in Time Travel', targetSection: 'time-travel', iconName: 'History' },
    ],
  },

  // --- UPGRADES & REPLACEMENTS ---
  {
    id: 'upgrade-wizard-guide',
    title: 'How to Record Hardware Swaps with the Upgrade Wizard',
    category: 'upgrades',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Guided procedure to replace a component (e.g. RTX 3080 to RTX 4090) in a single atomic step.',
    content: [
      'When replacing hardware, manually registering the purchase, uninstalling the old part and installing the new one requires multiple steps. The Upgrade Wizard automates everything in one go.',
      'In a single operation:',
      '1. Uninstalls the outgoing part and moves it to storage.',
      '2. Records purchase details and metadata for the incoming part.',
      '3. Installs the new piece into the corresponding rig slot.',
      '4. Establishes a formal generational upgrade link with calculated net outlay.',
    ],
    steps: [
      'Go to "Upgrade History" and click "+ New Upgrade" (or open any in-use component card and click "Replace / Upgrade").',
      'Select the outgoing component you are taking out.',
      'Enter the model, brand, price and purchase date for the incoming piece.',
      'Confirm: the old part moves to storage and the new one immediately appears in your active rig.',
    ],
    tips: [
      'If you plan to sell the old part immediately, you will find it ready in "Sales & Listings" to generate marketplace ads.',
    ],
    keywords: ['upgrade', 'replacement', 'swap', 'wizard', 'new component', 'rtx', 'generation'],
    actionLinks: [
      { label: 'Open Upgrade History', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'upgrade-net-cost',
    title: 'Formula for Net Upgrade Cost',
    category: 'upgrades',
    badge: 'FINANZE',
    readTime: '2 min',
    summary: 'How to accurately calculate the net expense of generational hardware upgrades.',
    content: [
      'If you purchase a new graphics card for €1,200 and sell your old card for €600 net, your upgrade did not cost €1,200, but exactly the €600 difference.',
      'PC Tracker calculates Net Upgrade Cost by comparing the purchase price of the new part against the net proceeds generated from selling the predecessor.',
    ],
    formula: {
      title: 'Net Upgrade Cost Formula',
      equation: 'Net Upgrade Cost = Purchase Cost of New Part - Net Sale Proceeds of Old Part',
      explanation: 'If the predecessor has not yet been sold (stored in inventory), the cost temporarily reflects the purchase outlay of the new piece.',
    },
    tips: [
      'In the "Upgrade History" section you can review all generational swaps made over the years and total net capital outlay.',
    ],
    keywords: ['net upgrade cost', 'upgrade cost', 'differential', 'generational upgrade', 'calculation'],
    actionLinks: [
      { label: 'View Upgrade History', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
    ],
  },

  // --- SALES & LISTINGS ---
  {
    id: 'listing-generator-guide',
    title: 'Listing Generator with AI Prompt Builder for Subito, eBay and Vinted',
    category: 'marketplace',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Generate polished, effective listings tailored for online hardware marketplaces.',
    content: [
      'When hardware is stored in inventory, putting it up for sale is quick and effortless with the built-in Listing Generator.',
      'Select your target platform (Subito.it, eBay, Vinted, Facebook Marketplace), specify condition (Like new, Excellent, With box, With warranty) and get a formatted listing description ready to copy.',
      'Additionally, the AI Prompt Builder allows you to copy an advanced prompt to paste into ChatGPT or Claude for custom hardware spec summaries.',
    ],
    steps: [
      'Navigate to "Sales & Listings" from the sidebar.',
      'Select the stored part you want to sell and click "Generate Listing".',
      'Configure platform, condition, asking price and included accessories.',
      'Click "Copy Listing Text" and paste it straight onto your chosen sales platform.',
    ],
    tips: [
      'Listings stating the exact purchase date and remaining warranty months sell on average 40% faster!',
    ],
    keywords: ['guide', 'marketplace', 'sales', 'listings', 'ad', 'subito', 'ebay', 'vinted', 'prompt builder', 'description'],
    actionLinks: [
      { label: 'Open Sales & Listings', targetSection: 'marketplace', iconName: 'Tag' },
    ],
  },
  {
    id: 'fees-and-shipping',
    title: 'Net Sale Calculation with Platform Fees and Shipping',
    category: 'marketplace',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'Record sales accounting for service fees and shipping costs for a spotless financial ledger.',
    content: [
      'When selling hardware online, the buyer\'s total payment rarely equals the money that ends up in your wallet:',
      '• Platform service fees (e.g. buyer protection, payment fees, selling commission).',
      '• Packaging and shipping expenses paid by the seller.',
      'When recording a sale in PC Tracker, you can enter shipping and fee deductions separately. The app calculates Net Proceeds and updates Total Recovered automatically.',
    ],
    formula: {
      title: 'Net Sale Revenue Formula',
      equation: 'Net Sale Revenue = Gross Sale Price - Seller Shipping Paid - Platform Fees',
      explanation: 'Total Recovered from Sales sums exclusively real net cash received.',
    },
    tips: [
      'If you sell locally in person for cash, simply leave shipping and fee fields at €0.',
    ],
    keywords: ['fees', 'shipping', 'net revenue', 'net sale', 'platform fees', 'commission'],
    actionLinks: [
      { label: 'Open Sales & Listings', targetSection: 'marketplace', iconName: 'Tag' },
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },

  // --- WINDOWS MAINTENANCE ---
  {
    id: 'windows-tools-explained',
    title: 'Native Windows Tools: Shader Cache, DNS and Display Drivers',
    category: 'maintenance',
    badge: 'WINDOWS',
    readTime: '3 min',
    summary: 'What native maintenance routines in PC Tracker do to keep Windows fast and responsive.',
    content: [
      'The "PC Care & Health" center provides safe, native commands to optimize Windows performance:',
      '• DirectX Shader Cache Cleanup: Deletes the D3DSCache folder in AppData. Resolves micro-stutter and visual glitches after driver updates.',
      '• Nvidia / AMD Shader Cache Cleanup: Clears graphics driver caches (NV_Cache and DxCache). Useful if games crash on launch after swapping GPUs.',
      '• DNS Cache Flush: Runs `ipconfig /flushdns` to fix connection hiccups and clear outdated network records.',
      '• Temp Folder Cleanup: Cleans user temporary directories to free disk space and remove leftover installer files.',
      '• Display Driver Restart Shortcut: Reminds you of the native `Win + Ctrl + Shift + B` shortcut that restarts the Windows graphics subsystem in 1 second during screen freezes.',
    ],
    tips: [
      'All cleanup scripts are 100% safe: they target only regenerable cache files and never touch personal files, game saves or settings.',
    ],
    keywords: ['maintenance', 'windows', 'shader cache', 'directx', 'nvidia', 'amd', 'dns', 'display driver', 'temp cleanup'],
    actionLinks: [
      { label: 'Open PC Care Center', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'thermal-maintenance-schedule',
    title: 'Thermal Logs, Thermal Paste Replacements and Dust Cleaning',
    category: 'maintenance',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'Schedule periodic cleanings to keep temperatures low and ensure quiet operation.',
    content: [
      'Dust buildup in radiators and dried thermal paste are the primary causes of thermal throttling and fan noise.',
      'In the PC Care Center you can:',
      '1. Log dust filter cleanings (recommended every 3-6 months).',
      '2. Track CPU and GPU thermal paste repasting dates (recommended every 18-24 months with high-grade paste).',
      '3. Record stable undervolting settings and benchmark temperatures in the Tuning Journal.',
    ],
    tips: [
      'Record baseline temperatures right after applying fresh paste: this serves as your benchmark to see if thermal performance degrades over time.',
    ],
    keywords: ['thermal paste', 'dust', 'temperatures', 're-paste', 'cleaning', 'filters', 'undervolt', 'tuning'],
    actionLinks: [
      { label: 'Open Maintenance Journal', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },

  // --- BACKUP & PRIVACY ---
  {
    id: 'local-first-and-privacy',
    title: '100% Local on IndexedDB: Total Privacy and Zero Cloud',
    category: 'backup-privacy',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Your data lives exclusively on your computer. No accounts, no remote servers, no tracking.',
    content: [
      'PC Tracker is built around the Local-First paradigm:',
      '• All components, events, expenses and receipts reside in the IndexedDB persistence engine inside your local browser or webview runtime.',
      '• There are no cloud servers, remote databases or login systems. Nobody else can see your hardware, prices or upgrade history.',
      '• The application works entirely offline: you can launch it with zero network connectivity.',
    ],
    tips: [
      'Because there is no cloud server silently syncing your data, backup responsibility is in your hands. Export a regular JSON backup for peace of mind!',
    ],
    keywords: ['privacy', 'local', 'local-first', 'indexeddb', 'offline', 'no cloud', 'security'],
    actionLinks: [
      { label: 'Go to Settings', targetSection: 'settings', iconName: 'Settings' },
    ],
  },
  {
    id: 'backup-restore-safeguards',
    title: 'Versioned JSON Backups & Pre-Import Validation Safeguards',
    category: 'backup-privacy',
    badge: 'TUTORIAL',
    readTime: '2 min',
    summary: 'How to export and restore your database safely with automatic schema validation.',
    content: [
      'PC Tracker backups are saved in standard, human-readable JSON with a schema version header (`schemaVersion: 1`).',
      'Before restoring any backup file, the system executes an automated structural audit: verifies ID integrity, validates event relationships and displays a detailed preview of components and movements.',
      'If a file is corrupted or invalid, the import is blocked to safeguard your existing local database.',
    ],
    steps: [
      'To download an instant backup, click "Backup JSON" in the top header.',
      'The file is saved with today\'s timestamp (e.g. `pc-tracker-backup-2026-10-02.json`).',
      'To restore on another machine or after reinstalling Windows, click "Import JSON" in the header or in Settings.',
      'Review the pre-import preview and confirm to restore your data.',
    ],
    tips: [
      'Keep periodic copies of your backup JSON file on a USB drive or secure local storage.',
    ],
    keywords: ['backup', 'restore', 'import', 'export', 'json', 'validation', 'data safety'],
    actionLinks: [
      { label: 'Open Settings & Backup', targetSection: 'settings', iconName: 'Settings' },
    ],
  },

  // --- FAQ ---
  {
    id: 'faq-ram-kit',
    title: 'How should I track a multi-stick RAM Kit (2 or 4 modules)?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Is it better to add a memory kit as a single item or track each stick individually?',
    content: [
      'Best practice is to register the kit as a single component (e.g. "Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz CL30"), with the total price paid.',
      'This simplifies warranty and invoice tracking, as RAM kits are sold, warrantied and replaced in matched sets.',
      'If you bought individual sticks at different times or from different stores, register them as distinct components to track separate installation slots (e.g. "Slot DDR5 A2" and "Slot DDR5 B2").',
    ],
    tips: [
      'In the component Notes field you can record primary timings (tCL, tRCD, tRP, tRAS) and operating voltage.',
    ],
    keywords: ['ram', 'ram kit', 'dual channel', 'sticks', 'memory', 'ddr4', 'ddr5', 'faq'],
    actionLinks: [
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'faq-used-and-free',
    title: 'Can I track used components or hardware received as gifts at €0?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'How to handle second-hand parts, gifts or hardware salvaged from older PCs.',
    content: [
      'Absolutely! PC Tracker natively accommodates every acquisition method:',
      '• Used Components: In the purchase event, select condition "Used" and record the price paid to the seller.',
      '• Gifted or Free Hardware: You can set the purchase price to €0.00. The part joins the build without inflating Total Historical Purchased.',
      '• Donated or Passed-Down Hardware: If you gift a part to a friend later on, use the "Gift (GIFT)" movement to log the recipient.',
    ],
    tips: [
      'Even for used parts, you can record the original store purchase date (if the seller provides the invoice) to monitor remaining manufacturer warranty.',
    ],
    keywords: ['used', 'gift', 'zero euro', 'second hand', 'free', 'condition', 'faq'],
    actionLinks: [
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'faq-wrong-dates',
    title: 'What should I do if I entered a wrong date or price in the past?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'How to correct or remove past events safely without breaking database integrity.',
    content: [
      'No worries: you can correct any information at any time!',
      '1. Open the "Component Archive" and click the affected component.',
      '2. Scroll down to the vertical event history timeline.',
      '3. Click the event you want to adjust to update the date, price, slot or notes (or delete it if added by mistake).',
      'The lifecycle and financial engines will recalculate component status, days in use and overall metrics instantly.',
    ],
    tips: [
      'Thanks to the event-driven architecture, retroactive adjustments propagate cleanly and deterministically across the whole app.',
    ],
    keywords: ['error', 'mistake', 'correct', 'edit event', 'delete', 'wrong date', 'wrong price', 'faq'],
    actionLinks: [
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'faq-offline-use',
    title: 'Does PC Tracker work completely without an internet connection?',
    category: 'faq',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'Offline compatibility and network independence.',
    content: [
      'Yes, 100%! PC Tracker is entirely local software. All interface assets, calculation engines and the IndexedDB database run on your computer.',
      'No internet connection is required to browse, create, edit, search, take checkpoints or run Windows maintenance routines.',
      'The only optional feature that accesses the network is the updater check (when enabled).',
    ],
    tips: [
      'You can run PC Tracker on a mobile laptop or isolated testbench PC without losing any functionality.',
    ],
    keywords: ['offline', 'internet', 'connection', 'network', 'standalone', 'faq'],
    actionLinks: [
      { label: 'Open Settings', targetSection: 'settings', iconName: 'Settings' },
    ],
  },

  // --- HARDWARE GLOSSARY ---
  {
    id: 'glossary-tdp-tgp',
    title: 'TDP vs TGP: Power Consumption and Thermal Dissipation',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'What Thermal Design Power for CPUs and Total Graphics Power for GPUs signify.',
    content: [
      'TDP (Thermal Design Power) indicates the maximum heat in Watts that a CPU cooling solution must be capable of dissipating under heavy workloads.',
      'TGP (Total Graphics Power) measures the total power draw of the entire graphics card: GPU silicon, VRAM chips, VRM power delivery, fans and RGB lighting.',
    ],
    tips: [
      'When sizing your power supply (PSU) or CPU cooler, always check peak boost consumption (Package Power or Power Limit), not just base TDP.',
    ],
    keywords: ['tdp', 'tgp', 'power draw', 'watt', 'heat', 'cooling', 'psu', 'glossary'],
    actionLinks: [
      { label: 'Open My Current Rig', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-undervolt',
    title: 'Undervolting: Lowering Temperatures and Power with Full Performance',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'The voltage/frequency curve optimization technique favored by enthusiasts.',
    content: [
      'Undervolting involves reducing operating voltage (Vcore for CPU, VGPU for GPU) while maintaining stock or boost clock frequencies.',
      'Because power dissipation scales quadratically with voltage, a minor reduction of 50-100mV can drop operating temperatures by 5-10°C, prevent thermal throttling and drastically reduce fan noise.',
    ],
    tips: [
      'Always verify stability with stress tests and benchmarks, and log verified settings in the Tuning Journal.',
    ],
    keywords: ['undervolt', 'voltage', 'vcore', 'temperatures', 'acoustics', 'efficiency', 'curve', 'glossary'],
    actionLinks: [
      { label: 'Open PC Care Center', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-thermal-throttling',
    title: 'Thermal Throttling: Hardware Self-Protection Mechanism',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'How and why processors and graphics cards reduce clocks when exceeding thermal limits.',
    content: [
      'When silicon reaches its maximum junction temperature (TjMax, typically 90°C to 105°C), on-die sensors command an immediate drop in clock frequency and voltage to prevent irreversible damage.',
      'This phenomenon, known as "thermal throttling", manifests as stutter in games and extended completion times in rendering.',
    ],
    tips: [
      'If your PC experiences thermal throttling, inspect radiators for dust and consider fresh thermal paste in the PC Care Center.',
    ],
    keywords: ['thermal throttling', 'throttling', 'high temps', 'overheating', 'stutter', 'tjmax', 'glossary'],
    actionLinks: [
      { label: 'Open PC Care Center', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-coil-whine',
    title: 'Coil Whine: Origin of Electrical Whining and How to Mitigate It',
    category: 'glossary',
    badge: 'FAQ',
    readTime: '1 min',
    summary: 'What causes electrical buzzing in GPUs at high framerates and how to reduce it.',
    content: [
      'Coil whine is a high-frequency acoustic vibration produced by inductor coils on GPU VRM circuits or inside the power supply when high currents flow through them.',
      'It is a completely normal, harmless physical phenomenon that has zero impact on component longevity or performance.',
    ],
    tips: [
      'Enabling G-Sync/FreeSync or capping maximum framerates (e.g. to 144 or 165 FPS) drastically reduces inductor current load, mitigating or eliminating whine.',
    ],
    keywords: ['coil whine', 'buzzing', 'inductors', 'vrm', 'gpu', 'electrical noise', 'glossary'],
    actionLinks: [
      { label: 'Open PC Care Center', targetSection: 'maintenance', iconName: 'Wrench' },
    ],
  },
  {
    id: 'glossary-xmp-expo',
    title: 'XMP vs EXPO: Memory Overclocking Profiles',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'The difference between Intel Extreme Memory Profiles and AMD Extended Profiles for Overclocking.',
    content: [
      'Out of the box, memory kits boot at conservative JEDEC baseline frequencies (e.g. 4800MHz on DDR5). To reach advertised speeds (e.g. 6000MHz), enabling the memory profile in BIOS is required.',
      '• XMP: Intel profile standard designed for Core platforms.',
      '• EXPO: Royalty-free AMD profile standard designed for AM5 / Ryzen platforms, featuring sub-timings tuned specifically for Zen architecture.',
    ],
    tips: [
      'Modern motherboards seamlessly support loading XMP kits on AMD Ryzen and EXPO kits on Intel systems.',
    ],
    keywords: ['xmp', 'expo', 'memory overclock', 'ram speed', 'bios', 'memory profile', 'jedec', 'glossary'],
    actionLinks: [
      { label: 'Open My Current Rig', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-cas-latency',
    title: 'CAS Latency (CL) & Memory Timings',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Understanding CL30, CL36 or CL40 ratings and calculating true latency in nanoseconds.',
    content: [
      'CAS Latency (CL) indicates the number of clock cycles RAM takes to deliver data to the processor after receiving a read command.',
      'At equal operating frequency (e.g. 6000MHz), lower CL (e.g. CL30 vs CL36) translates to lower true response latency.',
    ],
    formula: {
      title: 'True Memory Latency Formula (in Nanoseconds)',
      equation: 'True Latency (ns) = (CL * 2000) / Rated Frequency in MHz\nExample DDR5-6000 CL30: (30 * 2000) / 6000 = 10.00 ns\nExample DDR5-6000 CL36: (36 * 2000) / 6000 = 12.00 ns',
      explanation: 'Slightly lower frequency with tight CL timings can offer superior access latency compared to high-MHz kits with loose timings.',
    },
    tips: [
      'For AMD Ryzen 7000 and 9000 processors, DDR5-6000 CL30 represents the sweet spot for memory sub-timings and 1:1 memory controller ratio.',
    ],
    keywords: ['cas latency', 'cl', 'timings', 'cl30', 'cl36', 'ram latency', 'nanoseconds', 'glossary'],
    actionLinks: [
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'glossary-bottleneck',
    title: 'Hardware Bottlenecks: CPU vs GPU Balancing',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'How to identify which component is restricting your system\'s maximum performance.',
    content: [
      'A bottleneck occurs when overall system performance is limited by the slowest component in the chain, leaving others underutilized.',
      '• CPU Bottleneck: Typically happens at low resolutions (1080p) in competitive high-FPS titles. The GPU sits at 60-70% usage because the processor cannot prepare frames fast enough.',
      '• GPU Bottleneck: Occurs at high resolutions (1440p / 4K) or with Ray Tracing enabled. The graphics card maxes out at 99-100% while the CPU stays relaxed.',
    ],
    tips: [
      'Every gaming PC has a limiting factor: the optimal state is a GPU running at ~99% at your monitor\'s native resolution.',
    ],
    keywords: ['bottleneck', 'cpu limit', 'gpu limit', 'balancing', 'framerate', 'glossary'],
    actionLinks: [
      { label: 'View Upgrade History', targetSection: 'upgrades', iconName: 'ArrowUpRight' },
    ],
  },
  {
    id: 'glossary-rma',
    title: 'RMA (Return Merchandise Authorization): Warranties and Returns',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '1 min',
    summary: 'What Return Merchandise Authorization is and how formal manufacturer replacements work.',
    content: [
      'An RMA is the unique authorization number provided by hardware manufacturers (e.g. Corsair, Seasonic, ASUS, MSI) to permit shipping defective hardware for repair or replacement.',
      'Many brands offer extended 3 to 10 year warranties (especially on RAM kits, liquid coolers and power supplies) that continue after the initial retailer warranty expires.',
    ],
    tips: [
      'Always store your purchase invoices in the PC Tracker Receipt Vault: you can initiate an RMA with one-click proof of purchase.',
    ],
    keywords: ['rma', 'warranty', 'return', 'repair', 'replacement', 'manufacturer', 'support', 'glossary'],
    actionLinks: [
      { label: 'Open Component Archive', targetSection: 'archive', iconName: 'Archive' },
    ],
  },
  {
    id: 'glossary-pcie-gen',
    title: 'PCI Express: Differences between PCIe 4.0 and PCIe 5.0',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Bandwidth doubling per lane and compatibility across modern GPUs and NVMe SSDs.',
    content: [
      'Each PCI Express generation doubles theoretical throughput per lane:',
      '• PCIe 4.0: ~2 GB/s per lane (~32 GB/s on x16 slot). Ideal for current gaming graphics cards and SSDs up to 7,500 MB/s.',
      '• PCIe 5.0: ~4 GB/s per lane (~64 GB/s on x16 slot). Enables next-gen NVMe SSDs to exceed 14,000 MB/s sequential read.',
      'PCIe slots are completely backward and forward compatible: a PCIe 4.0 card works in a PCIe 5.0 slot and vice versa without issues.',
    ],
    tips: [
      'In modern games, the real-world performance difference between PCIe 4.0 x16 and PCIe 5.0 x16 for GPUs is under 1%. There is no need to swap motherboards just for PCIe 5.0 GPU support!',
    ],
    keywords: ['pcie', 'pci express', 'pcie 4.0', 'pcie 5.0', 'bandwidth', 'lanes', 'nvme gen5', 'glossary'],
    actionLinks: [
      { label: 'Open My Current Rig', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
  {
    id: 'glossary-dual-channel',
    title: 'Dual Channel: Why Two Memory Sticks Double Bandwidth',
    category: 'glossary',
    badge: 'TIP PRO',
    readTime: '2 min',
    summary: 'The importance of installing memory modules in the correct motherboard slots.',
    content: [
      'Dual Channel enables the processor\'s integrated memory controller to communicate across two distinct 64-bit channels simultaneously, doubling theoretical memory bandwidth over a single module.',
      'On 4-slot motherboards, memory sticks must be inserted in the manufacturer\'s recommended slots (on virtually all modern boards: slots 2 and 4, known as A2 and B2).',
    ],
    tips: [
      'Avoid running a modern gaming PC on a single 16GB or 32GB stick: Single Channel halves memory bandwidth and causes severe 1% Low framerate drops in games.',
    ],
    keywords: ['dual channel', 'memory channels', 'slot a2 b2', 'single channel', 'ram bandwidth', 'glossary'],
    actionLinks: [
      { label: 'New Movement', actionType: 'new-movement', iconName: 'Plus' },
    ],
  },
  {
    id: 'glossary-80-plus-atx3',
    title: '80 Plus Certifications & ATX 3.0 Power Supply Standards',
    category: 'glossary',
    badge: 'CONCETTO CHIAVE',
    readTime: '2 min',
    summary: 'Energy efficiency ratings (Bronze, Gold, Platinum) and transient power spike handling with 12V-2x6 connectors.',
    content: [
      'The 80 Plus rating measures how efficiently a power supply converts AC wall power into DC power for PC components:',
      '• 80 Plus Gold: Guarantees at least 90% efficiency at 50% load, reducing waste heat and electric bill consumption.',
      '• ATX 3.0 / 3.1 Standard: Built to absorb transient power spikes (up to 200% of rated capacity) and equipped with native 16-pin (12V-2x6 / 12VHPWR) cables for high-draw GPUs.',
    ],
    tips: [
      'A quality PSU delivers clean power to all components and often survives multiple PC generations: it is the longest-lasting investment in any build.',
    ],
    keywords: ['power supply', 'psu', '80 plus', 'gold', 'platinum', 'atx 3.0', '12vhpwr', '12v-2x6', 'efficiency', 'spikes', 'glossary'],
    actionLinks: [
      { label: 'Open My Current Rig', targetSection: 'current-rig', iconName: 'Cpu' },
    ],
  },
];
