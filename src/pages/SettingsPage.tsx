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
  Wrench,
  Globe,
} from 'lucide-react';
import { useTranslation, detectSystemLocale, SupportedLocale } from '../locales';
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
  SchedulerNotificationMode,
  SchedulerLeadTimeDays,
  DEFAULT_SCHEDULER_SETTINGS,
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
    schedulerSettings,
    updateSchedulerSettings,
  } = usePCStore();
  const { currentLocale, setLocale, t } = useTranslation();

  const handleSelectLanguage = async (code: SupportedLocale) => {
    try {
      await setLocale(code);
      const confirmMsg =
        code === 'en'
          ? 'Language updated to English 🇬🇧'
          : 'Lingua aggiornata in Italiano 🇮🇹';
      showNotification('success', confirmMsg);
    } catch (err) {
      showNotification('error', `Errore cambio lingua: ${(err as Error).message}`);
    }
  };

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

  // Feedback discreto per modifiche scheduler (Tranche 4)
  const [schedulerFeedback, setSchedulerFeedback] = useState<string | null>(null);
  const schedulerFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSchedulerFeedback = (msg: string = 'Preferenze salvate.') => {
    if (schedulerFeedbackTimerRef.current) {
      clearTimeout(schedulerFeedbackTimerRef.current);
    }
    setSchedulerFeedback(msg);
    schedulerFeedbackTimerRef.current = setTimeout(() => {
      setSchedulerFeedback(null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (schedulerFeedbackTimerRef.current) {
        clearTimeout(schedulerFeedbackTimerRef.current);
      }
    };
  }, []);

  const handleToggleScheduler = async () => {
    const nextState = !schedulerSettings.enabled;
    await updateSchedulerSettings({ enabled: nextState });
    showSchedulerFeedback(nextState ? 'Promemoria manutenzione attivati.' : 'Promemoria disattivati.');
  };

  const handleUpdateSchedulerMode = async (mode: SchedulerNotificationMode) => {
    await updateSchedulerSettings({ notificationMode: mode });
    showSchedulerFeedback('Modalità notifiche aggiornata.');
  };

  const handleUpdateLeadTime = async (days: SchedulerLeadTimeDays) => {
    await updateSchedulerSettings({ leadTimeDays: days });
    showSchedulerFeedback('Anticipo promemoria aggiornato.');
  };

  const handleResetSchedulerDefaults = async () => {
    await updateSchedulerSettings(DEFAULT_SCHEDULER_SETTINGS);
    showSchedulerFeedback('Impostazioni predefinite ripristinate.');
  };

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
    showNotification('success', t('settings_notify_identity_saved'));
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
      setStatusMessage({ type: 'success', text: t('settings_notify_backup_exported') });
    } catch (err) {
      setStatusMessage({ type: 'error', text: t('settings_notify_backup_export_error', { error: (err as Error).message }) });
    }
  };

  // Elabora testo JSON di backup per validazione e apertura preview
  const processImportText = (text: string, fileName: string) => {
    try {
      const result = validateImportJSON(text);

      if (!result.isValid) {
        setStatusMessage({
          type: 'error',
          text: t('settings_notify_backup_invalid', { fileName, error: result.error || '' }),
        });
        return;
      }

      setImportFileName(fileName);
      setImportPreviewData(result);
      setIsImportPreviewOpen(true);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: t('settings_notify_backup_read_error', { error: (err as Error).message }),
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
        text: t('settings_notify_backup_restored', {
          components: countC,
          events: countE,
          upgrades: countU,
        }),
      });
    } catch (err) {
      setIsImportPreviewOpen(false);
      setStatusMessage({
        type: 'error',
        text: t('settings_notify_backup_restore_error', { error: (err as Error).message }),
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
        text: t('settings_notify_csv_components_exported', { count: components.length }),
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: t('settings_notify_csv_components_error', { error: (err as Error).message }),
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
        text: t('settings_notify_csv_events_exported', { count: events.length }),
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: t('settings_notify_csv_events_error', { error: (err as Error).message }),
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
      <nav className="settings-tablist" role="tablist" aria-label={t('settings_tab_preferences')}>
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
          <span>{t('settings_tab_preferences')}</span>
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
          <span>{t('settings_tab_appearance')}</span>
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
          <span>{t('settings_tab_backup')}</span>
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
          <span>{t('settings_tab_data')}</span>
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
                <span>{t('settings_identity_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_identity_desc')}
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
                    {formRigName.trim() || t('settings_identity_default_name')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formRigDescription.trim() || t('settings_identity_no_desc')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span className="badge badge-in-use" style={{ fontSize: '11px' }}>
                  {t('settings_identity_in_use_count', { count: installed.length })}
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
                    {t('settings_identity_build_year_badge', {
                      year: parsedYear,
                      age: rigAgeYears !== null ? (rigAgeYears === 0 ? t('settings_identity_age_under_year') : t('settings_identity_age_years', { years: rigAgeYears })) : ''
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Modulo di configurazione */}
            <form onSubmit={handleSaveIdentity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label" htmlFor="rigName">
                    {t('settings_identity_name_label')}
                  </label>
                  <input
                    id="rigName"
                    type="text"
                    maxLength={60}
                    className="form-input"
                    placeholder={t('settings_identity_name_placeholder')}
                    value={formRigName}
                    onChange={(e) => setFormRigName(e.target.value)}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {t('settings_identity_name_hint')}
                  </span>
                </div>

                <div>
                  <label className="form-label" htmlFor="buildYear">
                    {t('settings_identity_year_label')}
                  </label>
                  <input
                    id="buildYear"
                    type="number"
                    min={1990}
                    max={currentYear + 1}
                    className="form-input"
                    placeholder={currentLocale === 'en' ? `e.g. ${currentYear - 1}` : `es. ${currentYear - 1}`}
                    value={formBuildYear}
                    onChange={(e) => setFormBuildYear(e.target.value)}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {t('settings_identity_year_hint')}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="rigDescription">
                  {t('settings_identity_desc_label')}
                </label>
                <input
                  id="rigDescription"
                  type="text"
                  maxLength={100}
                  className="form-input"
                  placeholder={t('settings_identity_desc_placeholder')}
                  value={formRigDescription}
                  onChange={(e) => setFormRigDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>
                  <CheckCircle2 size={15} />
                  <span>{t('settings_identity_save_btn')}</span>
                </button>

                {onOpenQuickSetup && (
                  <button
                    type="button"
                    onClick={onOpenQuickSetup}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title={t('settings_identity_detect_tooltip')}
                  >
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>{t('settings_identity_detect_btn')}</span>
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
                    <span>{t('settings_identity_saved_msg')}</span>
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Gruppo: Lingua dell'Interfaccia (Interface Language) */}
          <div className="settings-group" id="settings-group-language">
            <div className="settings-group-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 className="settings-group-title">
                  <Globe size={18} color="var(--accent-primary)" />
                  <span>{t('settings_language_title')}</span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {t('settings_language_detected', { lang: detectSystemLocale().toUpperCase() })}
                  </span>
                </div>
              </div>
              <p className="settings-group-desc">
                {t('settings_language_desc')}
              </p>
            </div>

            <div
              className="settings-option-grid"
              role="radiogroup"
              aria-label={t('settings_language_title')}
            >
              {[
                {
                  code: 'it' as const,
                  name: 'Italiano',
                  flag: '🇮🇹',
                  desc: t('settings_language_it_desc'),
                  bcp47: 'it-IT',
                },
                {
                  code: 'en' as const,
                  name: 'English',
                  flag: '🇬🇧',
                  desc: t('settings_language_en_desc'),
                  bcp47: 'en-US',
                },
              ].map((lang) => {
                const isActive = (settings.language || currentLocale) === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    id={`btn-lang-${lang.code}`}
                  >
                    <div className="settings-option-top">
                      <span
                        className="settings-option-title"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      {isActive && (
                        <span className="settings-option-badge">
                          {t('settings_language_active')}
                        </span>
                      )}
                    </div>
                    <p className="settings-option-desc">{lang.desc}</p>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {lang.bcp47}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gruppo 2: Comportamento Interfaccia */}
          <div className="settings-group">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Sliders size={18} color="var(--accent-primary)" />
                <span>{t('settings_ui_behavior_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_ui_behavior_desc')}
              </p>
            </div>

            {/* Schermata iniziale */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                {t('settings_default_screen_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_default_screen_label')}>
                {[
                  { id: 'dashboard' as const, title: t('settings_screen_dashboard_title'), desc: t('settings_screen_dashboard_desc') },
                  { id: 'current-rig' as const, title: t('settings_screen_rig_title'), desc: t('settings_screen_rig_desc') },
                  { id: 'archive' as const, title: t('settings_screen_archive_title'), desc: t('settings_screen_archive_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active')}</span>}
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
                {t('settings_date_format_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_date_format_label')}>
                {[
                  { id: 'DD/MM/YYYY' as const, title: t('settings_date_format_it_title'), desc: t('settings_date_format_example', { example: formatDate(new Date().toISOString(), 'DD/MM/YYYY') }) },
                  { id: 'YYYY-MM-DD' as const, title: t('settings_date_format_iso_title'), desc: t('settings_date_format_example', { example: formatDate(new Date().toISOString(), 'YYYY-MM-DD') }) },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active_m')}</span>}
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
                {t('settings_density_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_density_label')}>
                {[
                  { id: 'comfortable' as const, title: t('settings_density_comfortable_title'), desc: t('settings_density_comfortable_desc') },
                  { id: 'compact' as const, title: t('settings_density_compact_title'), desc: t('settings_density_compact_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active')}</span>}
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
                {t('settings_motion_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_motion_label')}>
                {[
                  { id: 'system' as const, title: t('settings_motion_system_title'), desc: t('settings_motion_system_desc') },
                  { id: 'always' as const, title: t('settings_motion_always_title'), desc: t('settings_motion_always_desc') },
                  { id: 'never' as const, title: t('settings_motion_never_title'), desc: t('settings_motion_never_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active')}</span>}
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
                <span>{t('settings_views_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_views_desc')}
              </p>
            </div>

            {/* Widget Sintesi Rig */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                {t('settings_widget_rig_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_widget_rig_label')}>
                {[
                  { val: true, title: t('settings_widget_rig_show_title'), desc: t('settings_widget_rig_show_desc') },
                  { val: false, title: t('settings_widget_rig_hide_title'), desc: t('settings_widget_rig_hide_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active_m')}</span>}
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
                {t('settings_recent_count_label')}
              </label>
              <div className="settings-option-grid-compact" role="radiogroup" aria-label={t('settings_recent_count_label')}>
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
                        {count === 7 ? t('settings_badge_default') : t('settings_recent_count_events', { count })}
                      </span>
                      {isActive && <span className="settings-option-badge" style={{ marginTop: '2px' }}>{t('settings_badge_active_m')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vista Predefinita Archivio */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                {t('settings_archive_view_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_archive_view_label')}>
                {[
                  { id: 'cards' as const, title: t('settings_archive_view_cards_title'), desc: t('settings_archive_view_cards_desc') },
                  { id: 'table' as const, title: t('settings_archive_view_table_title'), desc: t('settings_archive_view_table_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active')}</span>}
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
                {t('settings_archive_sort_label')}
              </label>
              <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_archive_sort_label')}>
                {[
                  { id: 'purchase_date_desc' as const, title: t('settings_archive_sort_recent_title'), desc: t('settings_archive_sort_recent_desc') },
                  { id: 'name_asc' as const, title: t('settings_archive_sort_name_title'), desc: t('settings_archive_sort_name_desc') },
                  { id: 'cost_desc' as const, title: t('settings_archive_sort_cost_title'), desc: t('settings_archive_sort_cost_desc') },
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
                        {isActive && <span className="settings-option-badge">{t('settings_badge_active_m')}</span>}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gruppo 4: Cura del PC — Promemoria Manutenzione */}
          <div className="settings-group" id="settings-group-care">
            <div className="settings-group-header">
              <h2 className="settings-group-title">
                <Wrench size={18} color="var(--accent-primary)" />
                <span>{t('settings_care_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_care_desc')}
              </p>
            </div>

            {/* Master Toggle */}
            <div className="settings-switch-row">
              <div style={{ minWidth: 0 }}>
                <span
                  id="scheduler-toggle-label"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                  }}
                >
                  {t('settings_care_reminders_label')}
                </span>
                <span
                  id="scheduler-toggle-desc"
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginTop: '2px',
                  }}
                >
                  {t('settings_care_reminders_desc')}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                id="scheduler-master-toggle"
                aria-checked={schedulerSettings.enabled}
                aria-labelledby="scheduler-toggle-label"
                aria-describedby="scheduler-toggle-desc"
                className="settings-switch-btn"
                onClick={handleToggleScheduler}
              >
                <span className="settings-switch-track" aria-hidden="true">
                  <span className="settings-switch-thumb" />
                </span>
                <span>{schedulerSettings.enabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {!schedulerSettings.enabled && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                }}
              >
                <Info size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span>
                  {t('settings_care_reminders_off_notice')}
                </span>
              </div>
            )}

            {/* Modalità Notifiche */}
            <div
              className={!schedulerSettings.enabled ? 'settings-subgroup-disabled' : ''}
              aria-disabled={!schedulerSettings.enabled}
              style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label
                  id="scheduler-notification-mode-label"
                  className="form-label"
                  style={{ marginBottom: '2px', display: 'block' }}
                >
                  {t('settings_care_notif_mode_label')}
                </label>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>
                  {t('settings_care_notif_mode_sub')}
                </span>
              </div>

              <div
                className="settings-option-grid"
                role="radiogroup"
                aria-labelledby="scheduler-notification-mode-label"
              >
                {[
                  {
                    id: 'important_only' as const,
                    title: t('settings_care_notif_important_title'),
                    badge: t('settings_recommended_badge'),
                    desc: t('settings_care_notif_important_desc'),
                  },
                  {
                    id: 'all' as const,
                    title: t('settings_care_notif_all_title'),
                    desc: t('settings_care_notif_all_desc'),
                  },
                  {
                    id: 'verification_only' as const,
                    title: t('settings_care_notif_verification_title'),
                    desc: t('settings_care_notif_verification_desc'),
                  },
                  {
                    id: 'none' as const,
                    title: t('settings_care_notif_silent_title'),
                    desc: t('settings_care_notif_silent_desc'),
                  },
                ].map((opt) => {
                  const isActive = schedulerSettings.notificationMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      disabled={!schedulerSettings.enabled}
                      aria-checked={isActive}
                      onClick={() => handleUpdateSchedulerMode(opt.id)}
                      className={`settings-option-btn ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="settings-option-top">
                        <span className="settings-option-title">{opt.title}</span>
                        {isActive ? (
                          <span className="settings-option-badge">{t('settings_badge_active')}</span>
                        ) : opt.badge ? (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: 'var(--accent-primary-subtle)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--accent-primary-border)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {opt.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="settings-option-desc">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anticipo Promemoria */}
            <div
              className={!schedulerSettings.enabled ? 'settings-subgroup-disabled' : ''}
              aria-disabled={!schedulerSettings.enabled}
              style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label
                  htmlFor="scheduler-lead-time-select"
                  className="form-label"
                  style={{ marginBottom: '2px', display: 'block' }}
                >
                  {t('settings_care_lead_time_label')}
                </label>
                <span
                  id="scheduler-lead-time-desc"
                  style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}
                >
                  {t('settings_care_lead_time_sub')}
                </span>
              </div>

              <div style={{ maxWidth: '320px' }}>
                <select
                  id="scheduler-lead-time-select"
                  disabled={!schedulerSettings.enabled}
                  aria-describedby="scheduler-lead-time-desc"
                  className="form-select"
                  value={schedulerSettings.leadTimeDays}
                  onChange={(e) => handleUpdateLeadTime(Number(e.target.value) as SchedulerLeadTimeDays)}
                >
                  <option value={0}>{t('settings_care_lead_time_0')}</option>
                  <option value={1}>{t('settings_care_lead_time_1')}</option>
                  <option value={3}>{t('settings_care_lead_time_3')}</option>
                  <option value={7}>{t('settings_care_lead_time_7')}</option>
                </select>
              </div>
            </div>

            {/* Azione di Reset e Feedback discreto */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={handleResetSchedulerDefaults}
                className="btn btn-secondary"
                style={{ fontSize: '12.5px', padding: '6px 14px', gap: '6px' }}
                title={t('settings_care_reset_defaults_title')}
              >
                <RotateCcw size={13} />
                <span>{t('settings_care_reset_defaults')}</span>
              </button>

              {schedulerFeedback && (
                <span className="settings-feedback-badge" role="status" aria-live="polite">
                  <CheckCircle2 size={14} />
                  <span>{schedulerFeedback}</span>
                </span>
              )}
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
                <span>{t('settings_appearance_accent_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_appearance_accent_desc')}
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_appearance_accent_title')}>
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
                      {isActive && <span className="settings-option-badge">{t('settings_badge_active')}</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t('settings_badge_default')}</span>
                      )}
                    </div>
                    <p className="settings-option-desc">{t(`settings_accent_${preset.id}_tagline` as any) || preset.tagline}</p>
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
                <span>{t('settings_appearance_theme_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_appearance_theme_desc')}
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_appearance_theme_title')}>
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
                      {isActive && <span className="settings-option-badge">{t('settings_badge_active_m')}</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t('settings_badge_default')}</span>
                      )}
                    </div>
                    <p className="settings-option-desc">{t(`settings_env_${preset.id}_tagline` as any) || preset.tagline}</p>
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
                <span>{t('settings_appearance_typography_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_appearance_typography_desc')}
              </p>
            </div>

            <div className="settings-option-grid" role="radiogroup" aria-label={t('settings_appearance_typography_title')}>
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
                      <span className="settings-option-title">{t(`settings_typo_${preset.id}_title` as any) || preset.title}</span>
                      {isActive && <span className="settings-option-badge">{t('settings_badge_active_m')}</span>}
                      {!isActive && preset.isDefault && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t('settings_badge_default')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                      {t(`settings_typo_${preset.id}_fontstack` as any) || preset.fontStack}
                    </div>
                    <p className="settings-option-desc">{t(`settings_typo_${preset.id}_desc` as any) || preset.description}</p>
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
                title={t('settings_backup_wiki_title')}
              >
                <BookOpen size={13} />
                <span>{t('settings_backup_wiki_btn')}</span>
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
                    <span>{t('settings_backup_group_title')}</span>
                  </h2>
                  <p className="settings-group-desc">
                    {t('settings_backup_group_desc')}
                  </p>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('settings_backup_last_export_label')}
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {lastExportedAtState
                      ? new Date(lastExportedAtState).toLocaleString(currentLocale === 'en' ? 'en-US' : 'it-IT', { dateStyle: 'short', timeStyle: 'short' })
                      : t('settings_backup_last_export_none')}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button type="button" onClick={handleExport} className="btn btn-primary" id="btn-export-json">
                  <Download size={15} />
                  <span>{t('settings_backup_export_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportClick}
                  className="btn btn-secondary"
                  id="btn-import-json"
                >
                  <Upload size={15} />
                  <span>{t('settings_backup_import_btn')}</span>
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
                    <span>{t('settings_backup_csv_title')}</span>
                  </h2>
                  <p className="settings-group-desc">
                    {t('settings_backup_csv_desc')}
                  </p>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('settings_backup_csv_purpose_label')}
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {t('settings_backup_csv_purpose_desc')}
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
                  <span>{t('settings_backup_csv_comps_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportEventsCSV}
                  className="btn btn-secondary"
                  id="btn-export-events-csv"
                >
                  <Download size={15} />
                  <span>{t('settings_backup_csv_events_btn')}</span>
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
                      <span>{t('settings_updater_title')}</span>
                    </h2>
                    {(hasUpdateAvailable || updateState.info?.available) && (
                      <span className="settings-update-badge" title={t('settings_updater_ready_tooltip')}>
                        <span className="sidebar-update-dot" style={{ width: '6px', height: '6px', margin: 0 }} />
                        <span>{t('settings_updater_ready_badge')}</span>
                      </span>
                    )}
                  </div>
                  <p className="settings-group-desc">
                    {t('settings_updater_desc')}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {t('settings_updater_current_ver')}
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
                        title={t('settings_updater_changelog_tooltip')}
                      >
                        <Sparkles size={12} color="var(--accent-primary)" />
                        <span>{t('settings_updater_changelog_btn')}</span>
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('settings_updater_env_label')}
                    </span>
                    <strong style={{ fontSize: '13px', color: isDesktopApp() ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      {isDesktopApp() ? t('settings_updater_env_desktop') : t('settings_updater_env_web')}
                    </strong>
                  </div>

                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('settings_updater_channel_label')}
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
                      <span>{t('settings_updater_new_version_available', { version: updateState.info.newVersion || '' })}</span>
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
                    <span>{t('settings_updater_up_to_date')}</span>
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
                      <span>{t('settings_updater_downloading')}</span>
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
                  <span>{updateState.checking ? t('settings_updater_checking_btn') : t('settings_updater_check_btn')}</span>
                </button>

                {updateState.info?.available && !updateState.downloading && (
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    className="btn btn-primary"
                    id="btn-install-update"
                  >
                    <Download size={15} />
                    <span>{t('settings_updater_install_btn', { version: updateState.info.newVersion || '' })}</span>
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
                <span>{t('settings_data_group_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_data_group_desc')}
              </p>
            </div>

            <div className="settings-stat-grid">
              <div className="settings-stat-box">
                <span className="settings-stat-label">{t('settings_data_stat_components')}</span>
                <span className="settings-stat-val">{components.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">{t('settings_data_stat_events')}</span>
                <span className="settings-stat-val">{events.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">{t('settings_data_stat_upgrades')}</span>
                <span className="settings-stat-val">{upgrades.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">{t('settings_data_stat_checkpoints')}</span>
                <span className="settings-stat-val">{checkpoints.length}</span>
              </div>
              <div className="settings-stat-box">
                <span className="settings-stat-label">{t('settings_data_stat_schema')}</span>
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
                <span>{t('settings_data_maintenance_title')}</span>
              </h2>
              <p className="settings-group-desc">
                {t('settings_data_maintenance_desc')}
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
                    <span>{t('settings_data_reset_settings_title')}</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    {t('settings_data_reset_settings_desc')}
                    <br />
                    <strong style={{ color: 'var(--accent-emerald)' }}>{t('settings_data_reset_settings_safe_notice')}</strong>
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
                  <span>{t('settings_data_reset_settings_btn')}</span>
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
                  <span>{t('settings_data_danger_title')}</span>
                </h2>
                <p className="settings-group-desc" style={{ color: 'var(--text-muted)' }}>
                  {t('settings_data_danger_desc')}
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
                <span>{t('settings_data_danger_btn')}</span>
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
        title={t('settings_modal_preview_title')}
        subtitle={importFileName ? t('settings_modal_preview_file', { fileName: importFileName }) : t('settings_modal_preview_sub')}
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{t('settings_modal_preview_schema')}</span>
                <strong style={{ fontSize: '14px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  v{importPreviewData.schemaVersion}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{t('settings_modal_preview_export_date')}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {importPreviewData.exportedAt
                    ? new Date(importPreviewData.exportedAt).toLocaleDateString(currentLocale === 'en' ? 'en-US' : 'it-IT')
                    : t('settings_modal_preview_unspecified')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{t('settings_modal_preview_rig_setup')}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {importPreviewData.settingsSummary?.rigName || t('settings_modal_preview_no_name')}
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
                  <span>{t('settings_modal_preview_incoming')}</span>
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>{importPreviewData.counts.components}</strong> {t('settings_data_stat_components')}</li>
                  <li><strong>{importPreviewData.counts.events}</strong> {t('settings_data_stat_events')}</li>
                  <li><strong>{importPreviewData.counts.upgrades}</strong> {t('settings_data_stat_upgrades')}</li>
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
                  <span>{t('settings_modal_preview_current')}</span>
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>{components.length}</strong> {t('settings_data_stat_components')}</li>
                  <li><strong>{events.length}</strong> {t('settings_data_stat_events')}</li>
                  <li><strong>{upgrades.length}</strong> {t('settings_data_stat_upgrades')}</li>
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
                {t('settings_modal_preview_atomic_warning')}
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
                {t('settings_modal_preview_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn btn-primary"
                id="btn-confirm-import"
              >
                <Upload size={15} />
                <span>{t('settings_modal_preview_confirm_btn')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal di Conferma Ripristino Solo Impostazioni */}
      <Modal
        isOpen={isResetSettingsConfirmOpen}
        onClose={() => setIsResetSettingsConfirmOpen(false)}
        title={t('settings_modal_reset_settings_title')}
        subtitle={t('settings_modal_reset_settings_sub')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('settings_modal_reset_settings_p1')}
            <br />
            {t('settings_modal_reset_settings_p2')}
            <br />
            <strong style={{ color: 'var(--accent-emerald)' }}>
              {t('settings_modal_reset_settings_p3')}
            </strong>
          </p>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setIsResetSettingsConfirmOpen(false)}
              className="btn btn-secondary"
            >
              {t('settings_modal_reset_settings_cancel_btn')}
            </button>
            <button
              type="button"
              onClick={handleExecuteResetSettings}
              className="btn btn-primary"
            >
              <RotateCcw size={15} />
              <span>{t('settings_modal_reset_settings_confirm_btn')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal di Conferma Svuotamento Database */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title={t('settings_modal_reset_db_title')}
        subtitle={t('settings_modal_reset_db_sub')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-ruby)' }}>
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {t('settings_modal_reset_db_warning')}
            </span>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="btn btn-secondary"
            >
              {t('settings_modal_reset_db_cancel_btn')}
            </button>
            <button
              type="button"
              onClick={handleExecuteReset}
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--accent-ruby)', borderColor: 'var(--accent-ruby)' }}
            >
              <Trash2 size={15} />
              <span>{t('settings_modal_reset_db_confirm_btn')}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
