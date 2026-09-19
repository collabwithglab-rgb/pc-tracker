import React, { useState, useEffect, useRef } from 'react';
import { usePCStore } from '../store';
import {
  Sliders,
  Palette,
  Download,
  Database,
  Upload,
  Trash2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Info,
  Type,
  Moon,
  Layers,
  FileSpreadsheet,
  Cpu,
  Package,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import {
  exportDatabaseToJSON,
  validateImportJSON,
  executeImport,
  resetDatabase,
  getLastExportedAt,
  exportComponentsToCSV,
  exportEventsToCSV,
} from '../storage';
import {
  saveBackupFileWithDialog,
  pickAndReadBackupFileWithDialog,
  isDesktopApp,
  checkForAppUpdates,
  downloadAndInstallUpdate,
  AppUpdateInfo,
  APP_VERSION,
} from '../services';
import { formatDate } from '../utils';
import {
  AccentColorPreference,
  EnvironmentThemePreference,
  TypographyPresetPreference,
  ImportPreview,
  SettingsTab,
  VALID_SETTINGS_TABS,
} from '../types';

export type { SettingsTab };

interface AccentPaletteConfig {
  id: AccentColorPreference;
  name: string;
  color: string;
  tagline: string;
  isDefault?: boolean;
}

const ACCENT_PALETTES: AccentPaletteConfig[] = [
  {
    id: 'cyan',
    name: 'Electric Cyan',
    color: '#38bdf8',
    tagline: 'Freddo, tecnico e luminoso. Il look distintivo originale di PC Tracker.',
    isDefault: true,
  },
  {
    id: 'arctic',
    name: 'Arctic Blue',
    color: '#60a5fa',
    tagline: 'Blu glaciale profondo, sobrio ed equilibrato.',
  },
  {
    id: 'violet',
    name: 'Nebula Violet',
    color: '#c084fc',
    tagline: 'Viola cosmico raffinato ad alta visibilità, estetica cyberpunk elegante.',
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    color: '#10b981',
    tagline: 'Verde ottico pulito, ispirato all’hardware industriale.',
  },
  {
    id: 'amber',
    name: 'Cyber Amber',
    color: '#f59e0b',
    tagline: 'Ambra caldo, display analogici e retro-tech ad alto contrasto.',
  },
  {
    id: 'crimson',
    name: 'Crimson Red',
    color: '#fb7185',
    tagline: 'Rosso corsaro ad alta energia, enthusiast setup reattivo.',
  },
];

interface EnvironmentThemeConfig {
  id: EnvironmentThemePreference;
  name: string;
  bgApp: string;
  bgSurface: string;
  tagline: string;
  isDefault?: boolean;
}

const ENVIRONMENT_PRESETS: EnvironmentThemeConfig[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    bgApp: '#080c14',
    bgSurface: '#0f1626',
    tagline: 'Nero titanio profondo. L’ambiente originale e distintivo di PC Tracker.',
    isDefault: true,
  },
  {
    id: 'graphite',
    name: 'Graphite',
    bgApp: '#0c0d10',
    bgSurface: '#14161d',
    tagline: 'Antracite neutro opaco. Sobrio ed essenziale, senza dominanti cromatiche.',
  },
  {
    id: 'slate',
    name: 'Slate',
    bgApp: '#090d13',
    bgSurface: '#101721',
    tagline: 'Ardesia industriale fredda. Bilanciamento tra contrasto e comfort visivo.',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    bgApp: '#050811',
    bgSurface: '#0c1222',
    tagline: 'Blu notte abissale. Toni scuri rilassanti ad alto contrasto per lunghe sessioni.',
  },
  {
    id: 'carbon',
    name: 'Carbon',
    bgApp: '#070707',
    bgSurface: '#111111',
    tagline: 'Carbone OLED pitch black ad altissimo contrasto per display scuri assoluti.',
  },
];

interface TypographyPresetConfig {
  id: TypographyPresetPreference;
  title: string;
  subtitle: string;
  fontStack: string;
  description: string;
  sampleText: string;
  isDefault?: boolean;
}

const TYPOGRAPHY_PRESETS: TypographyPresetConfig[] = [
  {
    id: 'default',
    title: 'Enthusiast Hybrid',
    subtitle: 'Outfit + Inter + JetBrains Mono',
    fontStack: 'Outfit (Titoli) • Inter (Testo) • JetBrains Mono (Dati)',
    description: 'Titoli geometrici ad alto impatto con corpo ad elevata leggibilità. L’identità visiva originale di PC Tracker.',
    sampleText: 'PC Tracker • RTX 4090 • €1.890,00',
    isDefault: true,
  },
  {
    id: 'minimal',
    title: 'Minimal Clean',
    subtitle: 'Inter + Inter + JetBrains Mono',
    fontStack: 'Inter (Titoli & Testo) • JetBrains Mono (Dati)',
    description: 'Titoli e testo unificati in un solo font neo-grotesco neutro. Massima sobrietà, pulizia e compattezza visiva.',
    sampleText: 'PC Tracker • RTX 4090 • €1.890,00',
  },
  {
    id: 'system',
    title: 'System Native',
    subtitle: 'System UI + System Monospace',
    fontStack: 'Segoe UI / Apple SF / Roboto • System Mono',
    description: '100% font nativi del sistema operativo. Zero latenza, zero overhead, compatibilità desktop ottimale.',
    sampleText: 'PC Tracker • RTX 4090 • €1.890,00',
  },
];

interface SettingsPageProps {
  onOpenQuickSetup?: () => void;
  hasUpdateAvailable?: boolean;
  onOpenWhatsNew?: () => void;
  updateInfo?: AppUpdateInfo | null;
  onOpenWikiArticle?: (articleId: string) => void;
  requestedTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onOpenQuickSetup,
  hasUpdateAvailable = false,
  onOpenWhatsNew,
  updateInfo,
  onOpenWikiArticle,
  requestedTab,
  onTabChange,
}) => {
  const {
    settings,
    updateSettings,
    resetSettingsToDefault,
    reloadFromDB,
    getInstalledComponents,
    components,
    events,
    upgrades,
    checkpoints,
    showNotification,
  } = usePCStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    requestedTab && VALID_SETTINGS_TABS.includes(requestedTab) ? requestedTab : 'preferences'
  );

  useEffect(() => {
    if (requestedTab && VALID_SETTINGS_TABS.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Form State per "Setup & Identità"
  const [formRigName, setFormRigName] = useState(settings.rigName || '');
  const [formRigDescription, setFormRigDescription] = useState(settings.rigDescription || '');
  const [formBuildYear, setFormBuildYear] = useState<string>(
    settings.buildYear ? String(settings.buildYear) : ''
  );
  const [isIdentitySaved, setIsIdentitySaved] = useState(false);

  // Sincronizza stato locale se settings cambiano dall'esterno
  useEffect(() => {
    setFormRigName(settings.rigName || '');
    setFormRigDescription(settings.rigDescription || '');
    setFormBuildYear(settings.buildYear ? String(settings.buildYear) : '');
  }, [settings]);

  // Modali di conferma per operazioni su dati
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetSettingsConfirmOpen, setIsResetSettingsConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stato per Backup & Export
  const [lastExportedAtState, setLastExportedAtState] = useState<string | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<ImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stato per Auto-Updater
  const [updateState, setUpdateState] = useState<{
    checking: boolean;
    info: AppUpdateInfo | null;
    downloading: boolean;
    percent: number;
    error?: string;
  }>({
    checking: false,
    info: updateInfo || null,
    downloading: false,
    percent: 0,
    error: updateInfo?.error,
  });

  // Sincronizza lo stato dell'aggiornamento se passato o mutato dal genitore (AppShell)
  useEffect(() => {
    if (updateInfo) {
      setUpdateState((prev) => ({
        ...prev,
        info: updateInfo,
        error: updateInfo.error,
      }));
    }
  }, [updateInfo]);

  // Caricamento persistito di lastExportedAt da IndexedDB
  useEffect(() => {
    let mounted = true;
    getLastExportedAt().then((val) => {
      if (mounted) {
        setLastExportedAtState(val);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const installed = getInstalledComponents();
  const currentYear = new Date().getFullYear();

  // Calcolo età rig se buildYear è valido
  const parsedYear = formBuildYear ? parseInt(formBuildYear, 10) : undefined;
  const validYear =
    parsedYear && !isNaN(parsedYear) && parsedYear >= 1990 && parsedYear <= currentYear;
  const rigAgeYears = validYear ? currentYear - parsedYear! : null;

  // Handler salvataggio identità PC
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();

    const buildYearValue =
      formBuildYear.trim() === ''
        ? undefined
        : parseInt(formBuildYear.trim(), 10);

    if (buildYearValue !== undefined) {
      if (isNaN(buildYearValue) || buildYearValue < 1990 || buildYearValue > currentYear) {
        setStatusMessage({
          type: 'error',
          text: `Anno di assemblaggio non valido (deve essere compreso tra 1990 e ${currentYear}).`,
        });
        return;
      }
    }

    await updateSettings({
      rigName: formRigName.trim() || undefined,
      rigDescription: formRigDescription.trim() || undefined,
      buildYear: buildYearValue,
    });

    setIsIdentitySaved(true);
    showNotification('success', 'Identità del PC aggiornata con successo!');
    setTimeout(() => setIsIdentitySaved(false), 2500);
  };

  // Handler esportazione backup JSON deterministico
  const handleExport = async () => {
    try {
      const json = await exportDatabaseToJSON();
      const today = new Date().toISOString().split('T')[0];
      const filename = `pc-tracker-backup-${today}.json`;
      const saveRes = await saveBackupFileWithDialog(filename, json);
      if (saveRes.canceled) return;
      const updatedLastExport = await getLastExportedAt();
      setLastExportedAtState(updatedLastExport);
      setStatusMessage({ type: 'success', text: 'Backup JSON esportato con successo!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Errore durante l'esportazione: ${(err as Error).message}` });
    }
  };

  // Elabora testo JSON di backup per validazione e apertura preview
  const processImportText = (text: string, fileName: string) => {
    try {
      const result = validateImportJSON(text);

      if (!result.isValid) {
        setStatusMessage({
          type: 'error',
          text: `File di backup non valido (${fileName}): ${result.error}`,
        });
        return;
      }

      setImportFileName(fileName);
      setImportPreviewData(result);
      setIsImportPreviewOpen(true);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Errore durante la lettura del file: ${(err as Error).message}`,
      });
    }
  };

  // Handler click su "Importa Backup JSON" (nativo su desktop, file input su web)
  const handleImportClick = async () => {
    if (isDesktopApp()) {
      const result = await pickAndReadBackupFileWithDialog();
      if (result.canceled) return;
      if (result.success && result.content) {
        processImportText(result.content, result.fileName || 'backup.json');
        return;
      }
      if (result.error) {
        setStatusMessage({ type: 'error', text: result.error });
        return;
      }
    }
    // Fallback web: trigger dell'input file nascosto
    fileInputRef.current?.click();
  };

  // Handler selezione file JSON fallback da input HTML
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      processImportText(text, file.name);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler conferma ed esecuzione atomica importazione
  const handleConfirmImport = async () => {
    if (!importPreviewData) return;

    try {
      await executeImport(importPreviewData.parsedData);
      await reloadFromDB();
      const countC = importPreviewData.counts.components;
      const countE = importPreviewData.counts.events;
      const countU = importPreviewData.counts.upgrades;
      setIsImportPreviewOpen(false);
      setImportPreviewData(null);
      const updatedLastExport = await getLastExportedAt();
      setLastExportedAtState(updatedLastExport);
      setStatusMessage({
        type: 'success',
        text: `Backup ripristinato con successo: ${countC} componenti, ${countE} eventi, ${countU} upgrade.`,
      });
    } catch (err) {
      setIsImportPreviewOpen(false);
      setStatusMessage({
        type: 'error',
        text: `Errore durante l'importazione: ${(err as Error).message}. Il database locale non è stato alterato.`,
      });
    }
  };

  // Handler esportazione CSV Componenti
  const handleExportComponentsCSV = async () => {
    try {
      const csv = exportComponentsToCSV(components, events);
      const today = new Date().toISOString().split('T')[0];
      const filename = `pc-tracker-components-${today}.csv`;
      await saveBackupFileWithDialog(filename, csv);
      setStatusMessage({
        type: 'success',
        text: `CSV Componenti esportato (${components.length} componenti)!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Errore durante l'esportazione CSV componenti: ${(err as Error).message}`,
      });
    }
  };

  // Handler esportazione CSV Eventi
  const handleExportEventsCSV = async () => {
    try {
      const csv = exportEventsToCSV(events, components);
      const today = new Date().toISOString().split('T')[0];
      const filename = `pc-tracker-events-${today}.csv`;
      await saveBackupFileWithDialog(filename, csv);
      setStatusMessage({
        type: 'success',
        text: `CSV Eventi Storici esportato (${events.length} eventi)!`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Errore durante l'esportazione CSV eventi: ${(err as Error).message}`,
      });
    }
  };

  // Handlers Auto-Updater
  const handleCheckForUpdates = async () => {
    setUpdateState((prev) => ({ ...prev, checking: true, error: undefined }));
    try {
      const info = await checkForAppUpdates();
      setUpdateState({ checking: false, info, downloading: false, percent: 0, error: info.error });
    } catch (err) {
      setUpdateState({ checking: false, info: null, downloading: false, percent: 0, error: (err as Error).message });
    }
  };

  const handleInstallUpdate = async () => {
    setUpdateState((prev) => ({ ...prev, downloading: true, percent: 0, error: undefined }));
    try {
      const res = await downloadAndInstallUpdate((_down, _tot, percent) => {
        setUpdateState((prev) => ({ ...prev, percent }));
      });
      if (!res.success) {
        setUpdateState((prev) => ({ ...prev, downloading: false, error: res.error }));
      }
    } catch (err) {
      setUpdateState((prev) => ({ ...prev, downloading: false, error: (err as Error).message }));
    }
  };

  // Handler azzeramento completo database
  const handleExecuteReset = async () => {
    setIsResetConfirmOpen(false);
    await resetDatabase();
    await reloadFromDB();
    const updatedLastExport = await getLastExportedAt();
    setLastExportedAtState(updatedLastExport);
    setStatusMessage({ type: 'success', text: 'Database IndexedDB azzerato con successo.' });
  };

  // Handler ripristino esclusive impostazioni predefinite
  const handleExecuteResetSettings = async () => {
    setIsResetSettingsConfirmOpen(false);
    await resetSettingsToDefault();
    setStatusMessage({
      type: 'success',
      text: 'Impostazioni applicative ripristinate ai valori predefiniti. I tuoi dati hardware sono rimasti intatti.',
    });
  };

  return (
    <div className="settings-container">
      {/* Notifica di stato locale opzionale */}
      {statusMessage && (
        <div
          className="card"
          style={{
            borderLeft: `4px solid ${
              statusMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-ruby)'
            }`,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          ) : (
            <AlertTriangle size={18} color="var(--accent-ruby)" />
          )}
          <span style={{ fontSize: '13.5px' }}>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigazione Tab Bar Orizzontale */}
      <nav className="settings-tablist" role="tablist" aria-label="Sezioni Impostazioni">
        <button
          type="button"
          role="tab"
          id="tab-preferences"
          aria-selected={activeTab === 'preferences'}
          aria-controls="panel-preferences"
          onClick={() => handleTabChange('preferences')}
          className={`settings-tab-btn ${activeTab === 'preferences' ? 'is-active' : ''}`}
        >
          <Sliders size={15} />
          <span>Preferenze</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-appearance"
          aria-selected={activeTab === 'appearance'}
          aria-controls="panel-appearance"
          onClick={() => handleTabChange('appearance')}
          className={`settings-tab-btn ${activeTab === 'appearance' ? 'is-active' : ''}`}
        >
          <Palette size={15} />
          <span>Aspetto</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-backup"
          aria-selected={activeTab === 'backup'}
          aria-controls="panel-backup"
          onClick={() => handleTabChange('backup')}
          className={`settings-tab-btn ${activeTab === 'backup' ? 'is-active' : ''}`}
        >
          <Download size={15} />
          <span>Backup & Export</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-data"
          aria-selected={activeTab === 'data'}
          aria-controls="panel-data"
          onClick={() => handleTabChange('data')}
          className={`settings-tab-btn ${activeTab === 'data' ? 'is-active' : ''}`}
        >
          <Database size={15} />
          <span>Dati & Database</span>
        </button>
      </nav>

      {/* ==========================================================================
          SEZIONE 1: PREFERENZE (SETUP, COMPORTAMENTO, VISTE)
          ========================================================================== */}
      {activeTab === 'preferences' && (
        <section id="panel-preferences" role="tabpanel" aria-labelledby="tab-preferences" className="settings-section">
          {/* Gruppo 1: Setup & Identità PC */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Cpu size={18} color="var(--accent-primary)" />
                <span>Identità del PC</span>
              </h2>
              <p className="settings-group-desc">
                Definisce il nome e l'utilizzo del tuo setup, visibili nell'header, nella sidebar e nei riepiloghi.
              </p>
            </div>

            {/* Chip preview sobrio e compatto */}
            <div className="settings-identity-chip">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-primary-subtle)',
                    border: '1px solid var(--accent-primary-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Cpu size={20} color="var(--accent-primary)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    {formRigName.trim() || 'Il Mio PC'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formRigDescription.trim() || 'Nessuna descrizione impostata'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span className="badge badge-in-use" style={{ fontSize: '11px' }}>
                  {installed.length} componenti in uso
                </span>
                {validYear && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Build {parsedYear} {rigAgeYears !== null && `(${rigAgeYears === 0 ? '<1 anno' : `${rigAgeYears}a`})`}
                  </span>
                )}
              </div>
            </div>

            {/* Modulo di configurazione */}
            <form onSubmit={handleSaveIdentity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label" htmlFor="rigName">
                    Nome del PC o Setup
                  </label>
                  <input
                    id="rigName"
                    type="text"
                    maxLength={60}
                    className="form-input"
                    placeholder="es. Monolith Rig, Workstation Ryzen 9..."
                    value={formRigName}
                    onChange={(e) => setFormRigName(e.target.value)}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Lascia vuoto per il predefinito "Il Mio PC".
                  </span>
                </div>

                <div>
                  <label className="form-label" htmlFor="buildYear">
                    Anno di Inizio Build
                  </label>
                  <input
                    id="buildYear"
                    type="number"
                    min={1990}
                    max={currentYear + 1}
                    className="form-input"
                    placeholder={`es. ${currentYear - 1}`}
                    value={formBuildYear}
                    onChange={(e) => setFormBuildYear(e.target.value)}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Anno di assemblaggio della configurazione iniziale.
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="rigDescription">
                  Descrizione o Utilizzo Principale
                </label>
                <input
                  id="rigDescription"
                  type="text"
                  maxLength={100}
                  className="form-input"
                  placeholder="es. Postazione Gaming 4K & Produzione..."
                  value={formRigDescription}
                  onChange={(e) => setFormRigDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>
                  <CheckCircle2 size={15} />
                  <span>Salva Identità PC</span>
                </button>

                {onOpenQuickSetup && (
                  <button
                    type="button"
                    onClick={onOpenQuickSetup}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Avvia o riesegui il Quick Setup per rilevare l'hardware Windows"
                  >
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Rileva Hardware (Quick Setup)</span>
                  </button>
                )}

                {isIdentitySaved && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      color: 'var(--accent-emerald)',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Modifiche salvate in IndexedDB!</span>
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Gruppo 2: Comportamento Interfaccia */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Sliders size={18} color="var(--accent-primary)" />
                <span>Comportamento Interfaccia</span>
              </h2>
              <p className="settings-group-desc">
                Regola la schermata di apertura, gli standard temporali, la densità grafica e la riduzione del movimento.
              </p>
            </div>

            {/* Schermata iniziale */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Schermata Iniziale Predefinita
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Schermata Iniziale Predefinita">
                {[
                  { id: 'dashboard' as const, title: 'Dashboard', desc: 'Panoramica finanziaria con 4 KPI e ultimi movimenti' },
                  { id: 'current-rig' as const, title: 'Il Mio PC Attuale', desc: 'Configurazione hardware assemblata per categorie' },
                  { id: 'archive' as const, title: 'Archivio Pezzi', desc: 'Libreria completa di tutti i componenti posseduti' },
                ].map((opt) => {
                  const isActive = (settings.defaultStartSection || 'dashboard') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ defaultStartSection: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attiva</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato data */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Formato Date di Calendario
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Formato Date di Calendario">
                {[
                  { id: 'DD/MM/YYYY' as const, title: 'Italiano Standard (DD/MM/YYYY)', desc: `Esempio: ${formatDate(new Date().toISOString(), 'DD/MM/YYYY')}` },
                  { id: 'YYYY-MM-DD' as const, title: 'ISO Internazionale (YYYY-MM-DD)', desc: `Esempio: ${formatDate(new Date().toISOString(), 'YYYY-MM-DD')}` },
                ].map((opt) => {
                  const isActive = (settings.dateFormat || 'DD/MM/YYYY') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ dateFormat: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attivo</span>}
                      </div>
                      <p className="settings-option-desc" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Densità grafica */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Densità Grafica
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Densità Grafica">
                {[
                  { id: 'comfortable' as const, title: 'Confortevole (Default)', desc: 'Spaziature ariose e margini ottimali per monitor desktop standard' },
                  { id: 'compact' as const, title: 'Compatta', desc: 'Padding e altezze ridotti per visualizzare più righe contemporaneamente' },
                ].map((opt) => {
                  const isActive = (settings.uiDensity || 'comfortable') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ uiDensity: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attiva</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animazioni & Movimento */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Animazioni & Riduzione Movimento
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Animazioni e Movimento">
                {[
                  { id: 'system' as const, title: 'Segui Sistema (Default)', desc: 'Rispetta le preferenze di accessibilità del sistema operativo' },
                  { id: 'always' as const, title: 'Riduci Sempre', desc: 'Disattiva le transizioni per una risposta immediata e senza animazioni' },
                  { id: 'never' as const, title: 'Sempre Attive', desc: 'Abilita sempre le animazioni fluide della Motion Constitution' },
                ].map((opt) => {
                  const isActive = (settings.reducedMotion || 'system') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ reducedMotion: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attiva</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gruppo 3: Preferenze Viste (Dashboard & Archivio) */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Layers size={18} color="var(--accent-primary)" />
                <span>Preferenze Viste (Dashboard & Archivio)</span>
              </h2>
              <p className="settings-group-desc">
                Configura i widget e le modalità di ordinamento e visualizzazione delle viste principali.
              </p>
            </div>

            {/* Widget Sintesi Rig */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Widget "Rig Attuale in Sintesi" (Dashboard)
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Widget Rig Attuale in Sintesi">
                {[
                  { val: true, title: 'Mostra Widget', desc: 'Visualizza la sintesi dei componenti montati nel case con giorni d\'uso e spesa' },
                  { val: false, title: 'Nascondi Widget', desc: 'Rimuove il widget per una Dashboard più compatta e focalizzata sui movimenti' },
                ].map((opt) => {
                  const isActive = (settings.showRigSynthesis !== false) === opt.val;
                  return (
                    <button
                      key={String(opt.val)}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ showRigSynthesis: opt.val })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attivo</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Movimenti Recenti Dashboard */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Numero Movimenti Recenti nel Feed (Dashboard)
              </label>
              <div className="settings-option-grid-compact" role="radiogroup" aria-label="Numero Movimenti Recenti">
                {[5, 7, 10, 15].map((count) => {
                  const isActive = (settings.dashboardRecentCount || 7) === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ dashboardRecentCount: count })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                      style={{ textAlign: 'center', alignItems: 'center' }}
                    >
                      <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {count}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {count === 7 ? 'Default' : `${count} eventi`}
                      </span>
                      {isActive && <span className="settings-option-badge" style={{ marginTop: '2px' }}>Attivo</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vista Predefinita Archivio */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Vista Predefinita Archivio Hardware
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Vista Predefinita Archivio">
                {[
                  { id: 'cards' as const, title: 'Griglia Schede (Cards)', desc: 'Visualizzazione spaziosa con badge di stato e azioni rapide' },
                  { id: 'table' as const, title: 'Tabella Compatta (Table)', desc: 'Scansione tabellare ad alta densità per confrontare molti componenti' },
                ].map((opt) => {
                  const isActive = (settings.archiveDefaultView || 'cards') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ archiveDefaultView: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attiva</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ordinamento Predefinito Archivio */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Ordinamento Predefinito Archivio
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label="Ordinamento Predefinito Archivio">
                {[
                  { id: 'purchase_date_desc' as const, title: 'Acquisto più Recente', desc: 'I pezzi acquistati più recentemente compaiono per primi' },
                  { id: 'name_asc' as const, title: 'Nome Alfabetico (A-Z)', desc: 'Ordinamento per nome del pezzo con tie-breaker deterministico' },
                  { id: 'cost_desc' as const, title: 'Costo Storico Decrescente', desc: 'I pezzi con la spesa totale d\'acquisto più alta in cima' },
                ].map((opt) => {
                  const isActive = (settings.archiveDefaultSort || 'purchase_date_desc') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ archiveDefaultSort: opt.id })}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive && <span className="settings-option-badge">Attivo</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==========================================================================
          SEZIONE 2: ASPETTO (PALETTE, AMBIENTE, TIPOGRAFIA)
          ========================================================================== */}
      {activeTab === 'appearance' && (
        <section id="panel-appearance" role="tabpanel" aria-labelledby="tab-appearance" className="settings-section">
          {/* Gruppo 1: Palette Accent */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Palette size={18} color="var(--accent-primary)" />
                <span>Palette Accent</span>
              </h2>
              <p className="settings-group-desc">
                Determina il colore degli elementi interattivi, degli indicatori di stato primari e dei bordi di selezione. Risponde istantaneamente.
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label="Palette Accent">
              {ACCENT_PALETTES.map((preset) => {
                const isActive = (settings.accentColor || 'cyan') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => updateSettings({ accentColor: preset.id })}
                    className={`settings-palette-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="settings-option-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          className="settings-palette-dot"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="settings-option-title">{preset.name}</span>
                      </div>
                      {isActive && <span className="settings-option-badge">Attiva</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Default</span>
                      )}
                    </div>
                    <p className="settings-option-desc">{preset.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gruppo 2: Ambiente Cromatico Dark */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Moon size={18} color="var(--accent-primary)" />
                <span>Ambiente Cromatico (Sfondo & Superfici)</span>
              </h2>
              <p className="settings-group-desc">
                Regola la tonalità scura dello sfondo principale e delle superfici delle card. Rimane sempre fedele al design Dark Hardware.
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label="Ambiente Cromatico">
              {ENVIRONMENT_PRESETS.map((preset) => {
                const isActive = (settings.environmentTheme || 'obsidian') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => updateSettings({ environmentTheme: preset.id })}
                    className={`settings-palette-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="settings-option-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="settings-env-swatch">
                          <span className="settings-env-swatch-app" style={{ backgroundColor: preset.bgApp }} />
                          <span className="settings-env-swatch-surface" style={{ backgroundColor: preset.bgSurface }} />
                        </div>
                        <span className="settings-option-title">{preset.name}</span>
                      </div>
                      {isActive && <span className="settings-option-badge">Attivo</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Default</span>
                      )}
                    </div>
                    <p className="settings-option-desc">{preset.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gruppo 3: Tipografia Offline */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Type size={18} color="var(--accent-primary)" />
                <span>Preset Tipografico</span>
              </h2>
              <p className="settings-group-desc">
                Combinazione di caratteri per titoli, testo e specifiche hardware. Funziona al 100% offline senza download runtime.
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label="Preset Tipografico">
              {TYPOGRAPHY_PRESETS.map((preset) => {
                const isActive = (settings.typographyPreset || 'default') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => updateSettings({ typographyPreset: preset.id })}
                    className={`settings-palette-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="settings-option-top">
                      <span className="settings-option-title">{preset.title}</span>
                      {isActive && <span className="settings-option-badge">Attivo</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Default</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                      {preset.fontStack}
                    </div>
                    <p className="settings-option-desc">{preset.description}</p>
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: preset.id === 'system' ? 'ui-monospace, monospace' : 'var(--font-mono)',
                      }}
                    >
                      {preset.sampleText}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==========================================================================
          SEZIONE 3: BACKUP & EXPORT
          ========================================================================== */}
      {activeTab === 'backup' && (
        <section id="panel-backup" role="tabpanel" aria-labelledby="tab-backup" className="settings-section">
          {onOpenWikiArticle && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button
                type="button"
                className="contextual-help-pill"
                onClick={() => onOpenWikiArticle('backup-restore-safeguards')}
                title="Consulta la guida sulla resilienza, sicurezza e ripristino del backup"
              >
                <BookOpen size={13} />
                <span>Guida Backup & Resilienza Dati</span>
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Gruppo 1: Backup di Sistema (JSON) */}
            <div className="settings-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="settings-group-header">
                  <h2 className="settings-group-title">
                    <Download size={18} color="var(--accent-primary)" />
                    <span>Backup di Sistema Completo (JSON)</span>
                  </h2>
                  <p className="settings-group-desc">
                    Crea o ripristina uno snapshot completo e deterministico del database IndexedDB (componenti, cronologia eventi, upgrade generazionali e impostazioni). È l'unico formato valido per il ripristino dell'app.
                  </p>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ultimo Export Locale
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {lastExportedAtState
                      ? new Date(lastExportedAtState).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Nessuna esportazione registrata finora'}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button type="button" onClick={handleExport} className="btn btn-primary" id="btn-export-json">
                  <Download size={15} />
                  <span>Esporta Backup JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportClick}
                  className="btn btn-secondary"
                  id="btn-import-json"
                >
                  <Upload size={15} />
                  <span>Importa Backup JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Gruppo 2: Esportazione Analitica (CSV) */}
            <div className="settings-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="settings-group-header">
                  <h2 className="settings-group-title">
                    <FileSpreadsheet size={18} color="var(--accent-primary)" />
                    <span>Esportazione Analitica (CSV)</span>
                  </h2>
                  <p className="settings-group-desc">
                    Esporta i record hardware in formato tabellare conforme allo standard RFC 4180 con codifica UTF-8 BOM, ottimizzato per Microsoft Excel, Google Sheets e LibreOffice Calc.
                  </p>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Finalità Analitica
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Destinato esclusivamente alla consultazione esterna • Non idoneo al ripristino dati
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleExportComponentsCSV}
                  className="btn btn-secondary"
                  id="btn-export-components-csv"
                >
                  <Download size={15} />
                  <span>Esporta Componenti CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportEventsCSV}
                  className="btn btn-secondary"
                  id="btn-export-events-csv"
                >
                  <Download size={15} />
                  <span>Esporta Eventi CSV</span>
                </button>
              </div>
            </div>

            {/* Gruppo 3: Aggiornamenti Software & Informazioni Build (Auto-Updater) */}
            <div
              className={`settings-group ${(hasUpdateAvailable || updateState.info?.available) ? 'settings-group-update-ready' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gridColumn: '1 / -1' }}
            >
              <div>
                <div className="settings-group-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 className="settings-group-title">
                      <RefreshCw size={18} color="var(--accent-primary)" className={updateState.checking ? 'spin' : ''} />
                      <span>Aggiornamenti Software & Canale di Rilascio</span>
                    </h2>
                    {(hasUpdateAvailable || updateState.info?.available) && (
                      <span className="settings-update-badge" title="Nuova versione pronta per il download">
                        <span className="sidebar-update-dot" style={{ width: '6px', height: '6px', margin: 0 }} />
                        <span>Aggiornamento Pronto</span>
                      </span>
                    )}
                  </div>
                  <p className="settings-group-desc">
                    Verifica e installa le nuove versioni ufficiali di PC Tracker distribuite tramite GitHub Releases. Gli aggiornamenti sono firmati digitalmente per garantire sicurezza e integrità del codice.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Versione Corrente
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        v{APP_VERSION}
                      </strong>
                    </div>
                    {onOpenWhatsNew && (
                      <button
                        type="button"
                        onClick={onOpenWhatsNew}
                        className="btn btn-secondary micro-press"
                        style={{ fontSize: '11.5px', padding: '3px 8px', gap: '5px', alignSelf: 'flex-start' }}
                        id="btn-settings-whatsnew"
                        title="Visualizza note di rilascio & novità della versione corrente"
                      >
                        <Sparkles size={12} color="var(--accent-primary)" />
                        <span>Novità & Changelog</span>
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ambiente Attivo
                    </span>
                    <strong style={{ fontSize: '13px', color: isDesktopApp() ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      {isDesktopApp() ? 'Windows Desktop (Tauri Nativo)' : 'Browser Web Locale'}
                    </strong>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Canale Ufficiale GitHub
                    </span>
                    <a
                      href="https://github.com/collabwithglab-rgb/pc-tracker/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>collabwithglab-rgb/pc-tracker</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Banner di notifica aggiornamento disponibile */}
                {updateState.info?.available && (
                  <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-status-success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-status-success)', fontWeight: 600, fontSize: '14px' }}>
                      <Sparkles size={16} />
                      <span>Nuova versione disponibile: v{updateState.info.newVersion}!</span>
                    </div>
                    {updateState.info.releaseNotes && (
                      <p style={{ marginTop: '6px', fontSize: '12.5px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {updateState.info.releaseNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Banner di conferma: già all'ultima versione */}
                {updateState.info && !updateState.info.available && !updateState.error && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--color-status-success)" />
                    <span>Sei all'ultima versione disponibile. Nessun aggiornamento in sospeso.</span>
                  </div>
                )}

                {/* Banner errore */}
                {updateState.error && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-status-danger)', color: 'var(--color-status-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>{updateState.error}</span>
                  </div>
                )}

                {/* Barra di avanzamento download */}
                {updateState.downloading && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>Download e installazione in corso...</span>
                      <span>{updateState.percent}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${updateState.percent}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.2s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={updateState.checking || updateState.downloading}
                  className="btn btn-secondary"
                  id="btn-check-updates"
                >
                  <RefreshCw size={15} className={updateState.checking ? 'spin' : ''} />
                  <span>{updateState.checking ? 'Controllo in corso...' : 'Verifica Aggiornamenti'}</span>
                </button>

                {updateState.info?.available && !updateState.downloading && (
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    className="btn btn-primary"
                    id="btn-install-update"
                  >
                    <Download size={15} />
                    <span>Scarica e Riavvia (v{updateState.info.newVersion})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==========================================================================
          SEZIONE 4: DATI & DATABASE
          ========================================================================== */}
      {activeTab === 'data' && (
        <section id="panel-data" role="tabpanel" aria-labelledby="tab-data" className="settings-section">
          {/* Gruppo 1: Stato Database Locale */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Database size={18} color="var(--accent-primary)" />
                <span>Stato Database Locale</span>
              </h2>
              <p className="settings-group-desc">
                Metriche del database IndexedDB locale (<code style={{ color: 'var(--accent-primary)' }}>pc_tracker_db</code>). Nessun dato lascia il tuo computer.
              </p>
            </div>

            <div className="settings-stat-grid">
              <div className="settings-stat-box">
                <span className="settings-stat-label">Componenti</span>
                <span className="settings-stat-val">{components.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">Eventi Storici</span>
                <span className="settings-stat-val">{events.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">Upgrade</span>
                <span className="settings-stat-val">{upgrades.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">Checkpoint</span>
                <span className="settings-stat-val">{checkpoints.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">Schema Dati</span>
                <span className="settings-stat-val" style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>
                  JSON Schema v1
                </span>
              </div>
            </div>
          </div>

          {/* Gruppo 2: Manutenzione & Dataset */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Sparkles size={18} color="var(--accent-primary)" />
                <span>Manutenzione & Dataset</span>
              </h2>
              <p className="settings-group-desc">
                Opzioni di manutenzione e ripristino delle impostazioni dell'applicazione.
              </p>
            </div>

            {/* Griglia per Manutenzione & Reset */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

              {/* Card 2: Ripristina Solo Impostazioni */}
              <div
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RotateCcw size={16} color="var(--accent-amber)" />
                    <span>Ripristina Impostazioni Predefinite</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    Reimposta solo nome PC, descrizione, anno e preferenze grafiche ai valori iniziali.
                    <br />
                    <strong style={{ color: 'var(--accent-emerald)' }}>I tuoi componenti, eventi e upgrade rimarranno intatti.</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetSettingsConfirmOpen(true)}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '13px' }}
                  id="btn-reset-settings"
                >
                  <RotateCcw size={15} />
                  <span>Ripristina Default</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gruppo 3: Zona di Pericolo */}
          <div className="settings-group settings-danger-group" style={{ backgroundColor: 'rgba(244, 63, 94, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="settings-group-title" style={{ color: 'var(--accent-ruby)', marginBottom: '4px' }}>
                  <AlertTriangle size={18} color="var(--accent-ruby)" />
                  <span>Zona di Pericolo: Svuotamento Database</span>
                </h2>
                <p className="settings-group-desc" style={{ color: 'var(--text-muted)' }}>
                  Elimina irreversibilmente tutti i componenti, gli eventi e gli upgrade memorizzati su IndexedDB locale.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="btn btn-ghost"
                style={{ color: 'var(--accent-ruby)', border: '1px solid rgba(244, 63, 94, 0.4)', backgroundColor: 'rgba(244, 63, 94, 0.05)' }}
                id="btn-reset-db"
              >
                <Trash2 size={15} />
                <span>Azzera Database Locale</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Scheda Discreta Informazioni Applicazione (Sempre presente in calce) */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={15} color="var(--accent-primary)" />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>PC Tracker</strong> • v{APP_VERSION} • IndexedDB Single Source of Truth
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Made by Peppe —</span>
          <a
            href="https://www.instagram.com/peppesthoughtss/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            <span>@peppesthoughtss</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* ==========================================================================
          MODALI DI CONFERMA & IMPORT PREVIEW
          ========================================================================== */}

      {/* Modal di Anteprima e Conferma Ripristino Backup JSON */}
      <Modal
        isOpen={isImportPreviewOpen}
        onClose={() => {
          setIsImportPreviewOpen(false);
          setImportPreviewData(null);
        }}
        title="Anteprima Ripristino Backup JSON"
        subtitle={importFileName ? `File selezionato: ${importFileName}` : 'Verifica i contenuti prima di confermare la sostituzione'}
      >
        {importPreviewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Riepilogo Metadati File */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                padding: '12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Versione Schema</span>
                <strong style={{ fontSize: '14px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  v{importPreviewData.schemaVersion}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Data Esportazione</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {importPreviewData.exportedAt
                    ? new Date(importPreviewData.exportedAt).toLocaleDateString('it-IT')
                    : 'Non specificata'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Setup Rig</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {importPreviewData.settingsSummary?.rigName || '(Nessun nome)'}
                </span>
              </div>
            </div>

            {/* Confronto Dati: Nel Backup vs Attuali */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--accent-primary-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-primary-border)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Package size={14} />
                  <span>Dati nel Backup (in arrivo)</span>
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>{importPreviewData.counts.components}</strong> Componenti</li>
                  <li><strong>{importPreviewData.counts.events}</strong> Eventi Storici</li>
                  <li><strong>{importPreviewData.counts.upgrades}</strong> Upgrade</li>
                </ul>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(244, 63, 94, 0.06)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-ruby)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={14} />
                  <span>Dati Attuali (da sostituire)</span>
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>{components.length}</strong> Componenti</li>
                  <li><strong>{events.length}</strong> Eventi Storici</li>
                  <li><strong>{upgrades.length}</strong> Upgrade</li>
                </ul>
              </div>
            </div>

            {/* Avviso di sostituzione atomica */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              <AlertTriangle size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                L'operazione è <strong>atomica</strong>: sostituirà integralmente il database locale IndexedDB con i dati del file selezionato. Se non hai effettuato un export recente dei dati correnti, le modifiche locali andranno perse.
              </span>
            </div>

            <div className="form-actions" style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsImportPreviewOpen(false);
                  setImportPreviewData(null);
                }}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn btn-primary"
                id="btn-confirm-import"
              >
                <Upload size={15} />
                <span>Conferma e Sostituisci Dati</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal di Conferma Ripristino Solo Impostazioni */}
      <Modal
        isOpen={isResetSettingsConfirmOpen}
        onClose={() => setIsResetSettingsConfirmOpen(false)}
        title="Ripristina Impostazioni Predefinite"
        subtitle="Ripristino esclusivo delle preferenze grafiche e dell'identità del setup"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Vuoi ripristinare le impostazioni dell'applicazione ai valori di default?
            <br />
            Il nome del PC, la descrizione e le preferenze grafiche verranno azzerati.
            <br />
            <strong style={{ color: 'var(--accent-emerald)' }}>
              Nessun componente, evento o upgrade hardware verrà modificato o cancellato.
            </strong>
          </p>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setIsResetSettingsConfirmOpen(false)}
              className="btn btn-secondary"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleExecuteResetSettings}
              className="btn btn-primary"
            >
              <RotateCcw size={15} />
              <span>Conferma Ripristino Impostazioni</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal di Conferma Svuotamento Database */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Conferma Svuotamento Database"
        subtitle="Questa azione è irreversibile e cancellerà tutti i dati locali"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-ruby)' }}>
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Sei sicuro di voler svuotare completamente il database locale IndexedDB?
              Tutti i componenti, gli eventi e gli upgrade verranno eliminati e il database rimarrà vuoto.
            </span>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="btn btn-secondary"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleExecuteReset}
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--accent-ruby)', borderColor: 'var(--accent-ruby)' }}
            >
              <Trash2 size={15} />
              <span>Svuota Completamente Database</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
