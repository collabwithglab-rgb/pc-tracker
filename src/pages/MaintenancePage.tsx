import React, { useState, useEffect, useMemo } from 'react';
import { usePCStore } from '../store';
import { useTranslation } from '../locales';
import {
  MaintenanceEntry,
  MaintenanceEntryInput,
  MaintenanceType,
  MAINTENANCE_TYPE_LABELS,
  TuningProfile,
  TUNING_TYPE_LABELS,
  TuningStability,
  TUNING_STABILITY_LABELS,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  WindowsToolResult,
  VolumeDriveInfo,
  RecycleBinInfo,
  HibernateStatus,
  TrimConfigStatus,
  ScanNowResult,
  SecurityAuditData,
  DiskSmartHealth,
  WinGetUpdateItem,
  SystemFactsInput,
  MonitoringSnapshot,
  SystemDiagnosticsSnapshot,
  StartupAppsSnapshot,
  NetworkDiagnosticsResult,
  WindowsUpdateStatus,
  DisplayDiagnosticsSnapshot,
  AudioDiagnosticsSnapshot,
  NetworkAdapterSnapshot,
  WifiSignalSnapshot,
} from '../types';
import {
  formatDate as formatWithSettings,
} from '../utils';
import {
  sortMaintenanceEntriesChronologically,
  filterMaintenanceEntries,
  getMaintenanceTypeBadgeClass,
  sortTuningProfiles,
  filterTuningProfiles,
  getTuningStabilityBadgeClass,
  formatBytes,
  computeDriveUsagePercentage,
  getLocalDateISO,
  classifyDiskHealth,
  formatTemperatureCelsius,
  formatWearPercentage,
  evaluateSecurityAuditStatus,
  computeMaintenanceConditionSummary,
  getNetworkQualityMeta,
  formatLatencyMs,
} from '../domain';
import {
  scanStorageVolumes,
  queryTrimConfiguration,
  runSsdTrim,
  queryRecycleBin,
  emptyRecycleBin,
  getHibernateStatus,
  setHibernateEnabled,
  openDiskCleanup,
  verifySystemFiles,
  checkDiskReadonly,
  executeDiagnosticScanNow,
  createRestorePoint,
  querySecurityAudit,
  getStorageSmartHealth,
  enableUltimatePerformance,
  cleanGpuShaderCache,
  cleanComponentStore,
  rebootToUefi,
  checkWinGetUpdates,
  queryStartupApps,
  openStartupSettings,
  runNetworkDiagnostics,
  queryWindowsUpdateStatus,
  queryDisplayDiagnostics,
  detectAudioGlitchesOrStatus,
  openDisplaySettings,
  openSoundSettings,
  queryNetworkAdapterDetails,
  queryWifiSignalMetrics,
} from '../services/windowsToolsService';
import { getMonitoringSnapshot } from '../services/monitoringService';
import { getSystemDiagnosticsSnapshot } from '../services/diagnosticsService';
import {
  MaintenanceEntryModal,
  TuningProfileModal,
  RecycleBinConfirmModal,
  ToolResultModal,
  BiosParameterCardModal,
  CareOverviewTab,
  CareLiveTab,
  EventLogInspectionModal,
  WindowsServicesInspectionModal,
  StartupAppsInspectionModal,
} from '../components/maintenance';
import { Modal } from '../components/common/Modal';
import {
  Wrench,
  Activity,
  Sliders,
  Terminal,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Trash2,
  Moon,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Edit2,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Shield,
  Zap,
  Gauge,
  Power,
  Download,
  RotateCcw,
  FileText,
  Wifi,
  Monitor,
  Volume2,
  Network,
} from 'lucide-react';


import {
  MaintenanceTab,
  LegacyMaintenanceTab,
  normalizeMaintenanceTab,
} from '../types';
export type { MaintenanceTab };

interface MaintenancePageProps {
  onOpenWikiArticle?: (articleId: string) => void;
  requestedTab?: MaintenanceTab | LegacyMaintenanceTab;
  onTabChange?: (tab: MaintenanceTab) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  onOpenWikiArticle,
  requestedTab,
  onTabChange,
}) => {
  const {
    maintenanceEntries,
    tuningProfiles,
    components,
    deleteMaintenanceEntry,
    deleteTuningProfile,
    settings,
    showNotification,
  } = usePCStore();
  const { t, formatCurrency } = useTranslation();

  const [activeTab, setActiveTab] = useState<MaintenanceTab>(
    requestedTab ? normalizeMaintenanceTab(requestedTab) : 'registro'
  );

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(normalizeMaintenanceTab(requestedTab));
    }
  }, [requestedTab]);

  const handleTabChange = (tab: MaintenanceTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Modali
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<MaintenanceEntry | null>(null);
  const [entryInitialValues, setEntryInitialValues] = useState<Partial<MaintenanceEntryInput> | undefined>(undefined);

  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<TuningProfile | null>(null);

  const [isBiosCardModalOpen, setIsBiosCardModalOpen] = useState(false);
  const [biosCardProfile, setBiosCardProfile] = useState<TuningProfile | null>(null);

  const [isRecycleBinModalOpen, setIsRecycleBinModalOpen] = useState(false);

  const [isEmptyingBin, setIsEmptyingBin] = useState(false);

  const [toolResult, setToolResult] = useState<WindowsToolResult | null>(null);
  const [toolResultTitle, setToolResultTitle] = useState<string>('');
  const [isToolResultOpen, setIsToolResultOpen] = useState(false);

  // Filtri Registro
  const [maintSearch, setMaintSearch] = useState('');
  const [maintTypeFilter, setMaintTypeFilter] = useState<string>('all');

  // Filtri Tuning
  const [tuningSearch, setTuningSearch] = useState('');
  const [tuningCatFilter, setTuningCatFilter] = useState<string>('all');
  const [tuningStabFilter, setTuningStabFilter] = useState<string>('all');

  // Stato Scan Now
  const [scanResult, setScanResult] = useState<ScanNowResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Stato Strumenti Windows
  const [volumes, setVolumes] = useState<VolumeDriveInfo[]>([]);
  const [trimStatus, setTrimStatus] = useState<TrimConfigStatus | null>(null);
  const [recycleBin, setRecycleBin] = useState<RecycleBinInfo | null>(null);
  const [hibernate, setHibernate] = useState<HibernateStatus | null>(null);
  const [selectedTrimDrive, setSelectedTrimDrive] = useState<string>('C:');
  const [selectedChkdskDrive, setSelectedChkdskDrive] = useState<string>('C:');
  const [runningTool, setRunningTool] = useState<string | null>(null);

  // Nuovi stati Tranche 3: Sicurezza, S.M.A.R.T., WinGet & Modali di sicurezza
  const [securityAudit, setSecurityAudit] = useState<SecurityAuditData | null>(null);
  const [isLoadingSecurityAudit, setIsLoadingSecurityAudit] = useState(false);
  const [smartHealthList, setSmartHealthList] = useState<DiskSmartHealth[]>([]);
  const [isLoadingSmartHealth, setIsLoadingSmartHealth] = useState(false);
  const [wingetUpdates, setWingetUpdates] = useState<WinGetUpdateItem[] | null>(null);
  const [isLoadingWinGet, setIsLoadingWinGet] = useState(false);

  const [isUefiConfirmModalOpen, setIsUefiConfirmModalOpen] = useState(false);
  const [isRestorePointModalOpen, setIsRestorePointModalOpen] = useState(false);
  const [restorePointDesc, setRestorePointDesc] = useState('PC Tracker Safety Point');
  const [monitoringSnapshot, setMonitoringSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] = useState<SystemDiagnosticsSnapshot | null>(null);
  const [isEventLogModalOpen, setIsEventLogModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  // Stati Tranche 10: Startup Apps, Windows Update & Network Diagnostics
  const [startupAppsSnapshot, setStartupAppsSnapshot] = useState<StartupAppsSnapshot | null>(null);
  const [isStartupModalOpen, setIsStartupModalOpen] = useState(false);
  const [windowsUpdateStatus, setWindowsUpdateStatus] = useState<WindowsUpdateStatus | null>(null);
  const [networkTarget, setNetworkTarget] = useState('1.1.1.1');
  const [networkResult, setNetworkResult] = useState<NetworkDiagnosticsResult | null>(null);
  const [isRunningNetworkTest, setIsRunningNetworkTest] = useState(false);

  // Stati Tranche 11: Display Diagnostics & Audio Latency
  const [displayDiagnostics, setDisplayDiagnostics] = useState<DisplayDiagnosticsSnapshot | null>(null);
  const [audioDiagnostics, setAudioDiagnostics] = useState<AudioDiagnosticsSnapshot | null>(null);

  // Stati Tranche 12: Network Adapter Link Speed & Wi-Fi Signal Intelligence
  const [networkAdapter, setNetworkAdapter] = useState<NetworkAdapterSnapshot | null>(null);
  const [wifiSignal, setWifiSignal] = useState<WifiSignalSnapshot | null>(null);

  // Caricamento dati iniziali per la tab Strumenti e Panoramica
  const loadWindowsToolsData = async () => {
    try {
      const [vols, trim, bin, hiber, smart, sec, snap, diag, startup, update, display, audio, netAdapter, wifi] = await Promise.all([
        scanStorageVolumes(),
        queryTrimConfiguration(),
        queryRecycleBin(),
        getHibernateStatus(),
        getStorageSmartHealth(),
        querySecurityAudit(),
        getMonitoringSnapshot(),
        getSystemDiagnosticsSnapshot(),
        queryStartupApps(),
        queryWindowsUpdateStatus(),
        queryDisplayDiagnostics(),
        detectAudioGlitchesOrStatus(),
        queryNetworkAdapterDetails(),
        queryWifiSignalMetrics(),
      ]);

      if (vols.data && vols.data.length > 0) {
        setVolumes(vols.data);
        setSelectedTrimDrive(vols.data[0].driveLetter);
        setSelectedChkdskDrive(vols.data[0].driveLetter);
      }
      if (trim.data) setTrimStatus(trim.data);
      if (bin.data) setRecycleBin(bin.data);
      if (hiber.data) setHibernate(hiber.data);
      if (smart.data) setSmartHealthList(smart.data);
      if (sec.data) setSecurityAudit(sec.data);
      if (snap) setMonitoringSnapshot(snap);
      if (diag) setDiagnosticsSnapshot(diag);
      if (startup) setStartupAppsSnapshot(startup);
      if (update) setWindowsUpdateStatus(update);
      if (display) setDisplayDiagnostics(display);
      if (audio) setAudioDiagnostics(audio);
      if (netAdapter) setNetworkAdapter(netAdapter);
      if (wifi) setWifiSignal(wifi);
    } catch (err) {
      console.warn('Errore caricamento dati strumenti Windows:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'windows' || activeTab === 'panoramica') {
      loadWindowsToolsData();
    }
  }, [activeTab]);

  const careFacts: SystemFactsInput = useMemo(() => {
    return {
      monitoring: monitoringSnapshot,
      drives: volumes,
      smartDisks: smartHealthList,
      securityAudit: securityAudit,
      systemFilesStatus: scanResult?.systemFilesStatus || 'not_tested',
      maintenanceEntries: maintenanceEntries,
      tuningProfiles: tuningProfiles,
      currentRigComponents: components,
      recycleBin: recycleBin,
      wingetUpdates: wingetUpdates,
      diagnostics: diagnosticsSnapshot,
      startupApps: startupAppsSnapshot,
      windowsUpdate: windowsUpdateStatus,
      networkDiagnostics: networkResult,
      displayDiagnostics: displayDiagnostics,
      audioDiagnostics: audioDiagnostics,
      networkAdapter: networkAdapter,
      wifiSignal: wifiSignal,
    };
  }, [
    monitoringSnapshot,
    volumes,
    smartHealthList,
    securityAudit,
    scanResult,
    maintenanceEntries,
    tuningProfiles,
    components,
    recycleBin,
    wingetUpdates,
    diagnosticsSnapshot,
    startupAppsSnapshot,
    windowsUpdateStatus,
    networkResult,
    displayDiagnostics,
    audioDiagnostics,
    networkAdapter,
    wifiSignal,
  ]);

  const handleOpenDisplaySettings = async () => {
    try {
      await openDisplaySettings();
    } catch (err) {
      showNotification('error', `Impossibile aprire impostazioni schermo: ${(err as Error).message}`);
    }
  };

  const handleOpenSoundSettings = async () => {
    try {
      await openSoundSettings();
    } catch (err) {
      showNotification('error', `Impossibile aprire impostazioni audio: ${(err as Error).message}`);
    }
  };

  const handleRunNetworkDiagnostics = async () => {
    setIsRunningNetworkTest(true);
    try {
      const host = networkTarget.trim() || '1.1.1.1';
      const res = await runNetworkDiagnostics(host);
      setNetworkResult(res);
      if (res.status === 'error') {
        showNotification('error', res.errorDetails || 'Network diagnostics error');
      }
    } catch (err) {
      showNotification('error', (err as Error).message);
    } finally {
      setIsRunningNetworkTest(false);
    }
  };

  const handleOpenStartupSettings = async () => {
    try {
      await openStartupSettings();
    } catch (err) {
      showNotification('error', `Impossibile aprire impostazioni: ${(err as Error).message}`);
    }
  };

  // Esecuzione Scan Now
  const handleRunScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await executeDiagnosticScanNow();
      setScanResult(res);
      if (res.drives.length > 0) {
        setVolumes(res.drives);
      }
      if (res.recycleBin) setRecycleBin(res.recycleBin);
      if (res.hibernate) setHibernate(res.hibernate);
      if (res.trimConfiguration) setTrimStatus(res.trimConfiguration);
    } catch (err) {
      showNotification('error', `Errore durante la diagnostica: ${(err as Error).message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Esecuzione TRIM
  const handleExecuteTrim = async () => {
    setRunningTool('trim');
    try {
      const res = await runSsdTrim(selectedTrimDrive);
      setToolResult(res);
      setToolResultTitle(`Ottimizzazione TRIM — Unità ${selectedTrimDrive}`);
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore esecuzione TRIM: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Esecuzione Svuotamento Cestino
  const handleConfirmEmptyBin = async () => {
    setIsEmptyingBin(true);
    try {
      const res = await emptyRecycleBin();
      setIsRecycleBinModalOpen(false);
      setToolResult(res);
      setToolResultTitle('Svuotamento Cestino di Windows');
      setIsToolResultOpen(true);
      // Ricarica info Cestino
      const updated = await queryRecycleBin();
      if (updated.data) setRecycleBin(updated.data);
    } catch (err) {
      showNotification('error', `Errore svuotamento Cestino: ${(err as Error).message}`);
    } finally {
      setIsEmptyingBin(false);
    }
  };

  // Switch Ibernazione
  const handleToggleHibernate = async (enable: boolean) => {
    setRunningTool('hibernate');
    try {
      const res = await setHibernateEnabled(enable);
      setToolResult(res);
      setToolResultTitle(enable ? 'Abilitazione Ibernazione' : 'Disabilitazione Ibernazione');
      setIsToolResultOpen(true);
      const updated = await getHibernateStatus();
      if (updated.data) setHibernate(updated.data);
    } catch (err) {
      showNotification('error', `Errore modifica ibernazione: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Pulizia Disco cleanmgr
  const handleOpenCleanmgr = async () => {
    setRunningTool('cleanmgr');
    try {
      const res = await openDiskCleanup();
      setToolResult(res);
      setToolResultTitle('Pulizia Disco di Windows (cleanmgr.exe)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore avvio pulizia disco: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Esecuzione SFC /verifyonly
  const handleRunSfc = async () => {
    setRunningTool('sfc');
    try {
      const res = await verifySystemFiles();
      setToolResult(res);
      setToolResultTitle('Verifica Integrità File di Sistema (SFC)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore esecuzione SFC: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Esecuzione CHKDSK /scan
  const handleRunChkdsk = async () => {
    setRunningTool('chkdsk');
    try {
      const res = await checkDiskReadonly(selectedChkdskDrive);
      setToolResult(res);
      setToolResultTitle(`Scansione File System — Unità ${selectedChkdskDrive}`);
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore esecuzione CHKDSK: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Punto di Ripristino di Sicurezza
  const handleCreateRestorePoint = async () => {
    setIsRestorePointModalOpen(false);
    setRunningTool('restore_point');
    try {
      const res = await createRestorePoint(restorePointDesc);
      setToolResult(res);
      setToolResultTitle('Punto di Ripristino di Sistema');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore creazione punto di ripristino: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Ricarica Audit Sicurezza
  const handleRunSecurityAudit = async () => {
    setIsLoadingSecurityAudit(true);
    try {
      const res = await querySecurityAudit();
      if (res.data) setSecurityAudit(res.data);
      setToolResult(res);
      setToolResultTitle('Audit Sicurezza & Integrità Kernel');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore audit sicurezza: ${(err as Error).message}`);
    } finally {
      setIsLoadingSecurityAudit(false);
    }
  };

  // Ricarica S.M.A.R.T. Dischi (con opzione elevazione esplicita su richiesta dell'utente)
  const handleRefreshSmartHealth = async (elevate = false) => {
    setIsLoadingSmartHealth(true);
    try {
      const res = await getStorageSmartHealth(elevate);
      if (res.status === 'cancelled') {
        return;
      }
      if (res.data) setSmartHealthList(res.data);
      if (elevate) {
        showNotification('success', 'Dati S.M.A.R.T. avanzati acquisiti con successo.');
      } else {
        showNotification('success', 'Dati S.M.A.R.T. aggiornati.');
      }
    } catch (err) {
      showNotification('error', `Errore interrogazione S.M.A.R.T.: ${(err as Error).message}`);
    } finally {
      setIsLoadingSmartHealth(false);
    }
  };

  // Ultimate Performance
  const handleEnableUltimatePerformance = async () => {
    setRunningTool('ultimate_perf');
    try {
      const res = await enableUltimatePerformance();
      setToolResult(res);
      setToolResultTitle('Schema Prestazioni Eccellenti (Ultimate Performance)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore sblocco schema energetico: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Pulizia Shader Cache GPU
  const handleCleanGpuShaderCache = async () => {
    setRunningTool('shader_cache');
    try {
      const res = await cleanGpuShaderCache();
      setToolResult(res);
      setToolResultTitle('Pulizia Shader Cache GPU (DirectX)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore pulizia cache shader: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Pulizia WinSxS Component Store
  const handleCleanComponentStore = async () => {
    setRunningTool('component_store');
    try {
      const res = await cleanComponentStore();
      setToolResult(res);
      setToolResultTitle('Pulizia Repository WinSxS Component Store (DISM)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore pulizia WinSxS: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Riavvio Diretto BIOS/UEFI
  const handleConfirmRebootUefi = async () => {
    setIsUefiConfirmModalOpen(false);
    setRunningTool('reboot_uefi');
    try {
      const res = await rebootToUefi();
      setToolResult(res);
      setToolResultTitle('Riavvio nel BIOS / UEFI');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore riavvio UEFI: ${(err as Error).message}`);
    } finally {
      setRunningTool(null);
    }
  };

  // Controllo Aggiornamenti WinGet
  const handleCheckWinGetUpdates = async () => {
    setIsLoadingWinGet(true);
    try {
      const res = await checkWinGetUpdates();
      if (res.data) setWingetUpdates(res.data);
      setToolResult(res);
      setToolResultTitle('Controllo Aggiornamenti Software (WinGet)');
      setIsToolResultOpen(true);
    } catch (err) {
      showNotification('error', `Errore controllo WinGet: ${(err as Error).message}`);
    } finally {
      setIsLoadingWinGet(false);
    }
  };

  // Scorciatoie Applet di Sistema
  const handleOpenApplet = (appletCmd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appletCmd);
    }
    showNotification('success', `Comando "${appletCmd}" copiato negli appunti (premi Win+R e incolla).`);
  };

  // Handler "Registra nel Registro Manutenzione" dal ToolResultModal
  const handleRegisterFromToolResult = (res: WindowsToolResult) => {
    setIsToolResultOpen(false);
    let type: MaintenanceType = 'system_maintenance';
    let title = toolResultTitle || 'Operazione Windows';

    if (toolResultTitle.toLowerCase().includes('trim')) {
      type = 'storage_maintenance';
      title = `Ottimizzazione TRIM unità ${selectedTrimDrive}`;
    } else if (toolResultTitle.toLowerCase().includes('sfc')) {
      type = 'system_maintenance';
      title = 'Verifica integrità file di sistema (SFC)';
    } else if (toolResultTitle.toLowerCase().includes('chkdsk')) {
      type = 'system_maintenance';
      title = `Scansione file system (CHKDSK) unità ${selectedChkdskDrive}`;
    } else if (toolResultTitle.toLowerCase().includes('cestino')) {
      type = 'system_maintenance';
      title = 'Svuotamento Cestino di Windows';
    }

    setEntryToEdit(null);
    setEntryInitialValues({
      date: getLocalDateISO(),
      type,
      title,
      description: res.message + (res.details ? `\n\nDettagli:\n${res.details}` : ''),
      source: 'tool',
    });
    setIsEntryModalOpen(true);
  };

  // Statistiche Registro Manutenzione
  const sortedEntries = useMemo(() => {
    return sortMaintenanceEntriesChronologically(maintenanceEntries, 'desc');
  }, [maintenanceEntries]);

  const filteredEntries = useMemo(() => {
    return filterMaintenanceEntries(sortedEntries, {
      type: maintTypeFilter !== 'all' ? (maintTypeFilter as MaintenanceType) : undefined,
      searchQuery: maintSearch,
    });
  }, [sortedEntries, maintTypeFilter, maintSearch]);



  const conditionSummary = useMemo(() => {
    return computeMaintenanceConditionSummary(maintenanceEntries, components);
  }, [maintenanceEntries, components]);


  // Statistiche Tuning Journal
  const sortedTuningProfiles = useMemo(() => {
    return sortTuningProfiles(tuningProfiles);
  }, [tuningProfiles]);

  const filteredTuningProfiles = useMemo(() => {
    return filterTuningProfiles(sortedTuningProfiles, {
      category: tuningCatFilter !== 'all' ? (tuningCatFilter as ComponentCategory) : undefined,
      stability: tuningStabFilter !== 'all' ? (tuningStabFilter as TuningStability) : undefined,
      searchQuery: tuningSearch,
    });
  }, [sortedTuningProfiles, tuningCatFilter, tuningStabFilter, tuningSearch]);

  const getDaysAgo = (dateStr: string) => {
    const diff = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return 'Oggi';
    if (diff === 1) return 'Ieri';
    return `${diff} giorni fa`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Tablist orizzontale */}
      <nav className="settings-tablist" role="tablist" aria-label="Sezioni Cura del PC">
        <button
          type="button"
          role="tab"
          id="tab-panoramica"
          aria-selected={activeTab === 'panoramica'}
          onClick={() => handleTabChange('panoramica')}
          className={`settings-tab-btn ${activeTab === 'panoramica' ? 'is-active' : ''}`}
        >
          <ShieldCheck size={15} />
          <span>{t('maintenance_tab_overview')}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-live"
          aria-selected={activeTab === 'live'}
          onClick={() => handleTabChange('live')}
          className={`settings-tab-btn ${activeTab === 'live' ? 'is-active' : ''}`}
        >
          <Activity size={15} />
          <span>{t('maintenance_tab_live')}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-registro"
          aria-selected={activeTab === 'registro'}
          onClick={() => handleTabChange('registro')}
          className={`settings-tab-btn ${activeTab === 'registro' ? 'is-active' : ''}`}
        >
          <Wrench size={15} />
          <span>{t('nav_maintenance')}</span>
          {maintenanceEntries.length > 0 && (
            <span
              style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-primary)',
              }}
            >
              {maintenanceEntries.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-windows"
          aria-selected={activeTab === 'windows'}
          onClick={() => handleTabChange('windows')}
          className={`settings-tab-btn ${activeTab === 'windows' ? 'is-active' : ''}`}
        >
          <Terminal size={15} />
          <span>{t('maintenance_tab_tools')}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-tuning"
          aria-selected={activeTab === 'tuning'}
          onClick={() => handleTabChange('tuning')}
          className={`settings-tab-btn ${activeTab === 'tuning' ? 'is-active' : ''}`}
        >
          <Sliders size={15} />
          <span>Tuning Journal</span>
          {tuningProfiles.length > 0 && (
            <span
              style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
              }}
            >
              {tuningProfiles.length}
            </span>
          )}
        </button>

        {onOpenWikiArticle && (
          <button
            type="button"
            className="contextual-help-pill micro-press"
            style={{ marginLeft: 'auto', alignSelf: 'center' }}
            onClick={() => onOpenWikiArticle('windows-tools-explained')}
            title={t('maintenance_wiki_tooltip')}
          >
            <BookOpen size={13} color="var(--accent-primary)" />
            <span>{t('maintenance_wiki_btn')}</span>
          </button>
        )}
      </nav>

      {/* ========================================================================= */}
      {/* TAB 0: PANORAMICA & SALUTE */}
      {/* ========================================================================= */}
      {activeTab === 'panoramica' && (
        <CareOverviewTab
          facts={careFacts}
          onRefreshFacts={loadWindowsToolsData}
          onSwitchTab={(tab) => handleTabChange(tab)}
          onOpenWikiArticle={onOpenWikiArticle}
          onShowNotification={showNotification}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 0.5: MONITORAGGIO LIVE */}
      {/* ========================================================================= */}
      {activeTab === 'live' && (
        <CareLiveTab />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: REGISTRO MANUTENZIONE */}
      {/* ========================================================================= */}
      {activeTab === 'registro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Sezione Sintetica: Condizione Attuale del PC */}
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Activity size={16} color="var(--accent-primary)" />
              <span>Condizione Attuale Hardware & Manutenzione</span>
            </div>

            <div className="maintenance-condition-container">
              {/* 1. Pulizia Generale & Filtri */}
              <div className="maintenance-condition-tile">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Pulizia & Filtri Case
                    </span>
                    <span className={`badge ${conditionSummary.lastCleaning.condition.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                      {conditionSummary.lastCleaning.condition.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {conditionSummary.lastCleaning.entry
                      ? formatWithSettings(conditionSummary.lastCleaning.entry.date, settings.dateFormat)
                      : 'Nessuna registrata'}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {conditionSummary.lastCleaning.entry
                      ? `${getDaysAgo(conditionSummary.lastCleaning.entry.date)} (${conditionSummary.lastCleaning.condition.description})`
                      : 'Registra la prima pulizia dei filtri'}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  Soglia: &lt;60 gg Fresca • &lt;120 gg Buona • &gt;120 gg Da verificare
                </div>
              </div>

              {/* 2. Pasta Termica */}
              <div className="maintenance-condition-tile">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Pasta Termica
                    </span>
                    <span className={`badge ${conditionSummary.lastThermalPaste.condition.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                      {conditionSummary.lastThermalPaste.condition.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conditionSummary.lastThermalPaste.productUsed || (conditionSummary.lastThermalPaste.entry ? 'Applicata' : 'Nessuna')}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {conditionSummary.lastThermalPaste.entry
                      ? `${formatWithSettings(conditionSummary.lastThermalPaste.entry.date, settings.dateFormat)} (${getDaysAgo(conditionSummary.lastThermalPaste.entry.date)})${conditionSummary.lastThermalPaste.componentName ? ` su ${conditionSummary.lastThermalPaste.componentName}` : ''}`
                      : 'Nessun cambio pasta termica registrato'}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  Soglia: &lt;6 mesi Fresca • &lt;1 anno Buona • &gt;2 anni Sostituzione
                </div>
              </div>

              {/* 3. Prossima Manutenzione Programmata */}
              <div className="maintenance-condition-tile">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Prossima Scadenza
                    </span>
                    {conditionSummary.earliestUpcoming ? (
                      <span
                        className={`badge ${conditionSummary.earliestUpcoming.isOverdue ? 'badge-ruby' : 'badge-purple'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {conditionSummary.earliestUpcoming.isOverdue
                          ? `Scaduta da ${Math.abs(conditionSummary.earliestUpcoming.daysRemaining)} gg`
                          : `Tra ${conditionSummary.earliestUpcoming.daysRemaining} gg`}
                      </span>
                    ) : (
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Nessuna</span>
                    )}
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conditionSummary.earliestUpcoming
                      ? conditionSummary.earliestUpcoming.entry.title
                      : 'Nessun promemoria attivo'}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {conditionSummary.earliestUpcoming
                      ? `Scadenza: ${formatWithSettings(conditionSummary.earliestUpcoming.entry.nextDueDate!, settings.dateFormat)}`
                      : 'Aggiungi una data promemoria a un intervento'}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  {conditionSummary.upcomingCount} {conditionSummary.upcomingCount === 1 ? 'intervento pianificato' : 'interventi pianificati'}
                </div>
              </div>

              {/* 4. Spesa Totale Cumulativa */}
              <div className="maintenance-condition-tile">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="stat-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Spesa Cumulativa
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-ruby)', display: 'inline-flex', alignItems: 'center' }}>
                      <DollarSign size={13} />
                    </span>
                  </div>

                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-ruby)', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(conditionSummary.totalCost)}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Materiali, paste termiche, pad e detergenti
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  {conditionSummary.totalEntriesCount} {conditionSummary.totalEntriesCount === 1 ? 'intervento registrato' : 'interventi registrati'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar (Ricerca, Filtro Tipo, + Registra Intervento) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                  placeholder="Cerca intervento, prodotto, componente..."
                  value={maintSearch}
                  onChange={(e) => setMaintSearch(e.target.value)}
                />
              </div>

              <select
                className="input-field select-field"
                style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                value={maintTypeFilter}
                onChange={(e) => setMaintTypeFilter(e.target.value)}
              >
                <option value="all">{t('maintenance_filter_all_types')}</option>
                {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map((typeKey) => (
                  <option key={typeKey} value={typeKey}>
                    {MAINTENANCE_TYPE_LABELS[typeKey]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEntryToEdit(null);
                setEntryInitialValues(undefined);
                setIsEntryModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
            >
              <Plus size={16} />
              <span>{t('maintenance_btn_new_entry')}</span>
            </button>
          </div>

          {/* Elenco Interventi di Manutenzione (Timeline Stream) */}
          {filteredEntries.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'var(--text-muted)',
              }}
            >
              <Wrench size={38} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('maintenance_log_empty_title')}
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 16px' }}>
                {t('maintenance_log_empty_desc')}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEntryToEdit(null);
                  setEntryInitialValues(undefined);
                  setIsEntryModalOpen(true);
                }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                {t('maintenance_log_empty_btn')}
              </button>
            </div>
          ) : (
            <div className="maintenance-timeline-wrap">
              {filteredEntries.map((entry) => {
                const badgeClass = getMaintenanceTypeBadgeClass(entry.type);
                const nodeClass = badgeClass.replace('badge-', 'node-');
                const linkedComps = (entry.componentIds || [])
                  .map((id) => components.find((c) => c.id === id)?.name)
                  .filter(Boolean);

                return (
                  <div key={entry.id} className="maintenance-timeline-item">
                    {/* Indicatore Nodo Timeline */}
                    <div className={`maintenance-timeline-node ${nodeClass}`} />

                    {/* Riga Intestazione Evento */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatWithSettings(entry.date, settings.dateFormat)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({getDaysAgo(entry.date)})
                        </span>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>
                          {MAINTENANCE_TYPE_LABELS[entry.type]}
                        </span>
                        {(entry.source === 'tool' || entry.source === 'diagnostic') && (
                          <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                            Strumento Windows
                          </span>
                        )}
                        {entry.cost !== undefined && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-ruby)', fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(entry.cost)}
                          </span>
                        )}
                        {entry.nextDueDate && (
                          <span className="badge badge-purple" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />
                            <span>Promemoria: {formatWithSettings(entry.nextDueDate, settings.dateFormat)}</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px 6px', color: 'var(--text-muted)' }}
                          onClick={() => {
                            setEntryToEdit(entry);
                            setIsEntryModalOpen(true);
                          }}
                          title={t('maintenance_entry_edit_tooltip')}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px 6px', color: 'var(--accent-ruby)' }}
                          onClick={async () => {
                            if (window.confirm(t('maintenance_entry_delete_confirm', { title: entry.title }))) {
                              await deleteMaintenanceEntry(entry.id);
                            }
                          }}
                          title={t('maintenance_entry_delete_tooltip')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Titolo e Descrizione */}
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {entry.title}
                      </div>
                      {entry.description && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>
                          {entry.description}
                        </div>
                      )}
                    </div>

                    {/* Metadati (Componenti, Prodotto Usato, Note) */}
                    {(entry.productUsed || linkedComps.length > 0 || entry.notes) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                        {entry.productUsed && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} color="var(--accent-amber)" />
                            <span>Prodotto: <strong style={{ color: 'var(--text-secondary)' }}>{entry.productUsed}</strong></span>
                          </div>
                        )}
                        {linkedComps.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Cpu size={11} color="var(--accent-primary)" />
                            <span>Componenti: <strong style={{ color: 'var(--text-secondary)' }}>{linkedComps.join(', ')}</strong></span>
                          </div>
                        )}
                        {entry.notes && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={11} color="var(--text-muted)" />
                            <span>Note: <span style={{ color: 'var(--text-secondary)' }}>{entry.notes}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* ========================================================================= */}
      {/* TAB 2: SISTEMA WINDOWS (DIAGNOSTICA SCAN NOW & STRUMENTI) */}
      {/* ========================================================================= */}
      {activeTab === 'windows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Banner informativo */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '20px',
              borderLeft: '4px solid var(--accent-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="var(--accent-primary)" />
                  Diagnostica di Sistema • Scan Now
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '640px', lineHeight: 1.45 }}>
                  Esegue un controllo diagnostico completo e <strong>100% non distruttivo</strong>. Non esegue
                  alcuna cancellazione, riavvio, riparazione automatica né modifiche arbitrarie allo stato del sistema operativo.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunScanNow}
                disabled={isScanning}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
              >
                <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
                <span>{isScanning ? 'Diagnosi in corso...' : 'Avvia Diagnostica Completa'}</span>
              </button>
            </div>
          </div>

          {/* Risultato della Scansione */}
          {scanResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Esito Generale */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  background:
                    scanResult.overallStatus === 'healthy'
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${
                    scanResult.overallStatus === 'healthy'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(245, 158, 11, 0.25)'
                  }`,
                }}
              >
                {scanResult.overallStatus === 'healthy' ? (
                  <CheckCircle size={24} color="var(--accent-emerald)" />
                ) : (
                  <AlertTriangle size={24} color="var(--accent-amber)" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {scanResult.overallStatus === 'healthy'
                      ? 'Tutti i controlli diagnostici hanno dato esito positivo'
                      : 'Rilevate possibili aree di attenzione e manutenzione'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Scansione eseguita il {new Date(scanResult.scannedAt).toLocaleDateString()} alle{' '}
                    {new Date(scanResult.scannedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Sezione Raccomandazioni Tecniche se presenti */}
              {scanResult.recommendedActions && scanResult.recommendedActions.length > 0 && (
                <div className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Raccomandazioni Rilevate
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scanResult.recommendedActions.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {rec.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {rec.description}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const el = document.getElementById('windows-direct-tools');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                        >
                          Vai a Strumenti
                          <ChevronRight size={12} style={{ marginLeft: '4px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stato Volumi e Spazio Disco */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={16} color="var(--accent-primary)" />
                  Volumi di Archiviazione Rilevati ({scanResult.drives.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {scanResult.drives.map((drive) => {
                    const usedPercent = computeDriveUsagePercentage(drive.freeBytes, drive.totalBytes);
                    const isHighUsage = usedPercent >= 85;

                    return (
                      <div
                        key={drive.driveLetter}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              Unità {drive.driveLetter}
                            </span>
                            {drive.label && (
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                ({drive.label})
                              </span>
                            )}
                            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                              {drive.busType || drive.mediaType || 'Disco'}
                            </span>
                            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                              {drive.healthStatus || 'Healthy'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Libero: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(drive.freeBytes)}</strong> su {formatBytes(drive.totalBytes)}
                          </div>
                        </div>

                        {/* Barra di utilizzo spazio disco */}
                        <div
                          style={{
                            height: '8px',
                            borderRadius: '4px',
                            background: '#1e293b',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${usedPercent}%`,
                              background: isHighUsage ? 'var(--accent-ruby)' : 'var(--accent-primary)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Utilizzato: {usedPercent.toFixed(1)}%</span>
                          <span>File System: {drive.fileSystem}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Griglia KPI: TRIM OS, Cestino, Ibernazione */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* TRIM OS Status */}
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Configurazione TRIM Windows
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <CheckCircle size={18} color="var(--accent-emerald)" />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {scanResult.trimConfiguration.enabled ? 'Attivo nel Kernel' : 'Disattivato'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {scanResult.trimConfiguration.details}
                  </div>
                </div>

                {/* Cestino Windows */}
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Cestino di Windows
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <Trash2 size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatBytes(scanResult.recycleBin.totalSizeBytes)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {scanResult.recycleBin.itemCount} elementi presenti nel Cestino
                  </div>
                </div>

                {/* Ibernazione */}
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Ibernazione Windows (hiberfil.sys)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <Moon size={18} color={scanResult.hibernate.enabled ? 'var(--accent-amber)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {scanResult.hibernate.enabled ? 'Abilitata' : 'Disabilitata'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {scanResult.hibernate.fileSizeGb ? `Spazio occupato: ~${scanResult.hibernate.fileSizeGb} GB` : 'Nessun file hiberfil.sys su disco'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'var(--text-muted)',
              }}
            >
              <Activity size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nessuna scansione diagnostica eseguita nella sessione corrente
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                Fai clic su "Avvia Diagnostica Completa" per eseguire il controllo non distruttivo dello stato del sistema.
              </div>
            </div>
          )}

          {/* Sezione Strumenti Windows di Manutenzione Diretta */}
          {/* Sezione Strumenti Windows di Manutenzione Diretta, Tweak & Diagnostica */}
          <div id="windows-direct-tools" style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={18} color="var(--accent-primary)" />
                  <span>Strumenti Windows, Ottimizzazioni & Tweak</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Suite di diagnostica hardware, sicurezza kernel, pulizia profonda e quality-of-life per Windows 10/11.
                </div>
              </div>

              {/* Azione Rapida: Crea Punto di Ripristino di Sicurezza */}
              <button
                type="button"
                className="btn btn-secondary micro-press"
                onClick={() => setIsRestorePointModalOpen(true)}
                disabled={runningTool !== null}
                style={{ borderColor: 'rgba(56, 189, 248, 0.3)', color: 'var(--accent-primary)', fontSize: '12.5px' }}
              >
                <Shield size={14} />
                <span>+ Crea Punto di Ripristino</span>
              </button>
            </div>

            {/* ======================================================== */}
            {/* AREA 1: INTEGRITÀ HARDWARE, S.M.A.R.T. & SICUREZZA KERNEL */}
            {/* ======================================================== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <ShieldCheck size={16} color="var(--accent-emerald)" />
                <span>1. Integrità Hardware, S.M.A.R.T. & Sicurezza Kernel</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {/* Tool: S.M.A.R.T. Dischi Fisici */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={18} color="var(--accent-primary)" />
                        Salute S.M.A.R.T. Dischi Nativi
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Read-Only
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Interroga i contatori di affidabilità e i sensori hardware dei controller SSD NVMe e SATA (usura %, temperatura, errori I/O).
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {smartHealthList.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                          Nessun dato S.M.A.R.T. caricato. Fai clic su Aggiorna per interrogare i dischi.
                        </div>
                      ) : (
                        smartHealthList.map((d) => {
                          const health = classifyDiskHealth(d);
                          return (
                            <div
                              key={d.deviceId}
                              style={{
                                padding: '8px 10px',
                                background: 'var(--bg-input)',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {d.friendlyName}
                                </span>
                                <span className={`badge ${health.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                  {health.label}
                                </span>
                              </div>
                              {d.smartStatus === 'permission_required' ? (
                                <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <ShieldAlert size={12} />
                                  <span>Contatori usura/temp non disponibili senza privilegi di amministratore.</span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span>Temp: <strong style={{ color: 'var(--text-secondary)' }}>{formatTemperatureCelsius(d.temperatureCelsius)}</strong></span>
                                  <span>Usura: <strong style={{ color: 'var(--text-secondary)' }}>{formatWearPercentage(d.wearPercentage)}</strong></span>
                                  <span>Errori: <strong style={{ color: (d.readErrorsTotal + d.writeErrorsTotal > 0) ? 'var(--accent-ruby)' : 'var(--text-secondary)' }}>{d.readErrorsTotal + d.writeErrorsTotal}</strong></span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {smartHealthList.some((d) => d.smartStatus === 'permission_required') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isLoadingSmartHealth}
                        onClick={() => handleRefreshSmartHealth(true)}
                        style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ShieldCheck size={13} />
                        <span>{isLoadingSmartHealth ? 'Lettura in corso...' : 'Leggi dati SMART (richiede UAC)'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        disabled={isLoadingSmartHealth}
                        onClick={() => handleRefreshSmartHealth(false)}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <RefreshCw size={11} className={isLoadingSmartHealth ? 'spin' : ''} style={{ marginRight: '4px' }} />
                        Ricarica solo stato base
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={isLoadingSmartHealth}
                      onClick={() => handleRefreshSmartHealth(false)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <RefreshCw size={13} className={isLoadingSmartHealth ? 'spin' : ''} style={{ marginRight: '6px' }} />
                      {isLoadingSmartHealth ? 'Interrogazione in corso...' : 'Ricarica Dati S.M.A.R.T.'}
                    </button>
                  )}
                </div>

                {/* Tool: Audit Sicurezza & Kernel */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} color="var(--accent-emerald)" />
                        Audit Sicurezza & Kernel Windows
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Read-Only
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Controlla lo stato di protezione hardware: Secure Boot UEFI, TPM 2.0, Virtualization-Based Security (VBS), HVCI e integrità file hosts.
                    </div>

                    {securityAudit && (() => {
                      const evalAudit = evaluateSecurityAuditStatus(securityAudit);
                      return (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Punteggio Sicurezza:</span>
                            <span className={`badge ${evalAudit.isOptimal ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {evalAudit.score}/{evalAudit.maxScore} controlli superati
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Secure Boot UEFI:</span>
                            <strong style={{ color: securityAudit.secureBootEnabled ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                              {securityAudit.secureBootEnabled ? '✓ Attivo' : '✗ Non attivo'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Modulo TPM 2.0:</span>
                            <strong style={{ color: (securityAudit.tpmPresent && securityAudit.tpmReady) ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                              {(securityAudit.tpmPresent && securityAudit.tpmReady) ? '✓ Pronto' : '✗ Assente/Non pronto'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Isolamento Core / VBS:</span>
                            <strong style={{ color: securityAudit.vbsRunning ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {securityAudit.vbsRunning ? '✓ Attivo' : 'Non attivo'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Integrità File Hosts:</span>
                            <strong style={{ color: securityAudit.hostsFileClean ? 'var(--accent-emerald)' : 'var(--accent-ruby)' }}>
                              {securityAudit.hostsFileClean ? '✓ Pulito' : `⚠️ ${securityAudit.hostsCustomEntriesCount} regole custom`}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={isLoadingSecurityAudit}
                    onClick={handleRunSecurityAudit}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <RefreshCw size={13} className={isLoadingSecurityAudit ? 'spin' : ''} style={{ marginRight: '6px' }} />
                    {isLoadingSecurityAudit ? 'Analisi sicurezza in corso...' : 'Esegui Audit Sicurezza Completo'}
                  </button>
                </div>

                {/* Tool: Verifica Integrità File di Sistema (SFC /verifyonly) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} color="var(--accent-cyan)" />
                        Verifica File di Sistema (SFC)
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Esegue <code style={{ color: 'var(--accent-primary)' }}>sfc /verifyonly</code> in modalità sola lettura,
                      verificando l'integrità dei binari di sistema protetti senza apportare modifiche o sovrascritture arbitrarie.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleRunSfc}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'sfc' ? 'Verifica in corso (può richiedere 1-2 min)...' : 'Esegui sfc /verifyonly'}
                  </button>
                </div>

                {/* Tool: Scansione File System (CHKDSK /scan) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={18} color="var(--accent-amber)" />
                        Scansione File System (CHKDSK)
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Esegue <code style={{ color: 'var(--accent-primary)' }}>chkdsk /scan</code> online non distruttivo per rilevare inconsistenze NTFS.
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>
                        Seleziona Volume
                      </label>
                      <select
                        className="input-field select-field"
                        value={selectedChkdskDrive}
                        onChange={(e) => setSelectedChkdskDrive(e.target.value)}
                      >
                        {volumes.map((v) => (
                          <option key={v.driveLetter} value={v.driveLetter}>
                            {v.driveLetter} {v.label ? `(${v.label})` : ''} — {v.fileSystem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleRunChkdsk}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'chkdsk' ? 'Scansione in corso...' : `Esegui chkdsk /scan su ${selectedChkdskDrive}`}
                  </button>
                </div>

                {/* Tool: Registro Eventi di Sistema (Event Log Wevtapi) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="var(--accent-primary)" />
                        Registro Eventi Hardware (Event Log)
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                        Read-Only Win32
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Interroga il registro eventi di sistema nativo (Wevtapi.dll) per WHEA, errori disco/NTFS, TDR scheda video e Kernel-Power 41, con deduplicazione intelligente.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEventLogModalOpen(true)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Ispeziona Log di Sistema (WHEA/Disk/TDR)
                  </button>
                </div>

                {/* Tool: Servizi di Sistema Critici (SCM Advapi32) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Terminal size={18} color="var(--accent-emerald)" />
                        Servizi di Sistema Critici (SCM)
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Read-Only SCM
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Verifica lo stato e il modello operativo dei 6 servizi critici di sistema (EventLog, WMI, Windows Update, TrustedInstaller, VSS, Windows Defender).
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsServicesModalOpen(true)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Verifica Servizi di Sistema (SCM)
                  </button>
                </div>

                {/* Tool: Stato Windows Update (Pendente Reboots & Installazioni) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} color="var(--accent-primary)" />
                        {t('windows_update_title')}
                      </div>
                      <span className={`badge ${windowsUpdateStatus?.rebootPending ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.68rem' }}>
                        {windowsUpdateStatus?.rebootPending ? t('windows_update_status_reboot') : t('windows_update_status_updated')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('windows_update_desc')}
                    </div>

                    {windowsUpdateStatus && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                        {windowsUpdateStatus.rebootPending && (
                          <div
                            style={{
                              padding: '8px 10px',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '4px',
                              color: 'var(--accent-amber)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{t('windows_update_reboot_pending')}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('windows_update_last_check')}</span>
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {windowsUpdateStatus.lastCheckTime || 'N/D'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{t('windows_update_last_install')}</span>
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {windowsUpdateStatus.lastInstallTime || 'N/D'}
                          </strong>
                        </div>
                        {windowsUpdateStatus.pendingFileRenameCount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('windows_update_pending_files')}</span>
                            <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                              {windowsUpdateStatus.pendingFileRenameCount}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      const res = await queryWindowsUpdateStatus();
                      if (res) setWindowsUpdateStatus(res);
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <RefreshCw size={13} style={{ marginRight: '6px' }} />
                    {t('windows_update_refresh_btn')}
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* AREA 2: PULIZIA PROFONDA & RECUPERO SPAZIO REALE */}
            {/* ======================================================== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                <span>2. Pulizia Profonda & Recupero Spazio Reale</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {/* Tool: Pulizia WinSxS Component Store (DISM) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={18} color="var(--accent-cyan)" />
                        Pulizia WinSxS Component Store (DISM)
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Esegue <code style={{ color: 'var(--accent-primary)' }}>dism /online /cleanup-image /startcomponentcleanup</code> per rimuovere
                      versioni obsolete di aggiornamenti Windows archiviate nel repository WinSxS (spesso libera 4-15 GB).
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleCleanComponentStore}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'component_store' ? 'Pulizia DISM in corso...' : 'Esegui Pulizia WinSxS Component Store'}
                  </button>
                </div>

                {/* Tool: Pulizia Shader Cache GPU */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={18} color="var(--accent-amber)" />
                        Pulizia Shader Cache GPU (DirectX)
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Standard
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Pulisce in sicurezza le cache shader DirectX/GPU compresse in AppData. Elimina micro-stuttering e cali di framerate causati da vecchi shader dopo l'aggiornamento dei driver video.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleCleanGpuShaderCache}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'shader_cache' ? 'Pulizia cache in corso...' : 'Pulisci Shader Cache GPU'}
                  </button>
                </div>

                {/* Tool: Ibernazione Windows */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Moon size={18} color="var(--accent-purple, #a855f7)" />
                        Ibernazione Windows (hiberfil.sys)
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Disabilitando l'ibernazione su PC desktop è possibile recuperare svariati gigabyte di spazio su disco C: (pari a una porzione della memoria RAM installata).
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stato:</span>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: hibernate?.enabled ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                        }}
                      >
                        {hibernate?.enabled ? 'Attivo' : 'Disattivato (Spazio Liberato)'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={runningTool !== null || hibernate?.enabled === false}
                      onClick={() => handleToggleHibernate(false)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Disattiva
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={runningTool !== null || hibernate?.enabled === true}
                      onClick={() => handleToggleHibernate(true)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Abilita
                    </button>
                  </div>
                </div>

                {/* Tool: Cestino di Windows */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trash2 size={18} color="var(--accent-ruby)" />
                        Cestino di Windows
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Standard
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Elimina definitivamente file e cartelle cestinate presenti su tutte le unità locali, liberando lo spazio occupato.
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stato attuale:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {recycleBin ? `${recycleBin.itemCount} elementi (${formatBytes(recycleBin.totalSizeBytes)})` : 'In caricamento...'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        const b = await queryRecycleBin();
                        if (b.data) setRecycleBin(b.data);
                      }}
                      title="Aggiorna conteggio"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={runningTool !== null || !recycleBin || recycleBin.itemCount === 0}
                      onClick={() => setIsRecycleBinModalOpen(true)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Svuota Cestino...
                    </button>
                  </div>
                </div>

                {/* Tool: Pulizia Disco cleanmgr */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="var(--accent-cyan)" />
                        Pulizia Disco (cleanmgr.exe)
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Standard
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Avvia l'utility nativa ufficiale di Windows che consente di selezionare file temporanei, log di sistema e cache miniature.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleOpenCleanmgr}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={14} style={{ marginRight: '6px' }} />
                    Apri Pulizia disco di Windows
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* AREA 3: PERFORMANCE & GAMING TWEAKS REALI */}
            {/* ======================================================== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <Zap size={16} color="var(--accent-amber)" />
                <span>3. Performance & Gaming Tweaks Reali</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {/* Tool: Ultimate Performance Power Plan */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={18} color="var(--accent-amber)" />
                        Schema Prestazioni Eccellenti
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Sblocca e attiva lo schema energetico nativo per workstation (<code style={{ color: 'var(--accent-primary)' }}>Ultimate Performance</code>).
                      Elimina le micro-latenze di transizione energetica dei core CPU su desktop gaming di fascia alta.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleEnableUltimatePerformance}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'ultimate_perf' ? 'Attivazione in corso...' : 'Sblocca & Attiva Ultimate Performance'}
                  </button>
                </div>

                {/* Tool: Ottimizzazione TRIM SSD */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={18} color="var(--accent-primary)" />
                        Ottimizzazione TRIM (SSD)
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Invia comandi ReTrim nativi al controller SSD per informarlo dei blocchi logici non più in uso,
                      ottimizzando le prestazioni di scrittura nel tempo.
                    </div>

                    {trimStatus && (
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        TRIM Windows OS:{' '}
                        <strong style={{ color: trimStatus.enabled ? 'var(--accent-emerald)' : 'var(--accent-ruby)' }}>
                          {trimStatus.enabled ? '✓ Attivo' : '✗ Disattivato'}
                        </strong>
                      </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>
                        Seleziona Unità SSD
                      </label>
                      <select
                        className="input-field select-field"
                        value={selectedTrimDrive}
                        onChange={(e) => setSelectedTrimDrive(e.target.value)}
                      >
                        {volumes.map((v) => (
                          <option key={v.driveLetter} value={v.driveLetter}>
                            {v.driveLetter} {v.label ? `(${v.label})` : ''} — {v.busType || v.mediaType || 'Disco'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={handleExecuteTrim}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {runningTool === 'trim' ? 'Esecuzione TRIM in corso...' : `Esegui TRIM su ${selectedTrimDrive}`}
                  </button>
                </div>

                {/* Tool: Diagnostica Monitor & Frequenze di Aggiornamento */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Monitor size={18} color="var(--accent-cyan)" />
                        {t('care_display_hub_title')}
                      </div>
                      {displayDiagnostics && (
                        <span
                          className={`badge ${displayDiagnostics.monitors.some(m => m.isRefreshRateLimited) ? 'badge-amber' : 'badge-emerald'}`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {displayDiagnostics.monitors.some(m => m.isRefreshRateLimited)
                            ? t('care_display_limited_badge')
                            : t('care_display_optimal_badge')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('care_display_hub_desc')}
                    </div>

                    {displayDiagnostics && displayDiagnostics.monitors.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {displayDiagnostics.monitors.map((mon) => (
                          <div
                            key={mon.id}
                            style={{
                              padding: '10px 12px',
                              background: 'var(--bg-input)',
                              borderRadius: '6px',
                              border: mon.isRefreshRateLimited ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                {mon.monitorName || mon.adapterName}
                              </span>
                              {mon.isPrimary && (
                                <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
                                  {t('care_display_primary_badge')}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', fontSize: '0.74rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_display_res_label')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {mon.currentResolution.width}x{mon.currentResolution.height}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_display_refresh_label')} </span>
                                <strong
                                  style={{
                                    color: mon.isRefreshRateLimited ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                  }}
                                >
                                  {mon.currentRefreshRate} Hz
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_display_max_label')} </span>
                                <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                                  {mon.maxSupportedRefreshRate} Hz
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_display_dpi_label')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {mon.dpiScalePercent}%
                                </strong>
                              </div>
                            </div>

                            {mon.isRefreshRateLimited && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  padding: '6px 8px',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  borderRadius: '4px',
                                  color: 'var(--accent-amber)',
                                  fontSize: '0.72rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                                <span>{t('care_display_limited_badge')}: {mon.currentRefreshRate} Hz &lt; {mon.maxSupportedRefreshRate} Hz</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleOpenDisplaySettings}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={13} style={{ marginRight: '6px' }} />
                    {t('care_display_open_settings')}
                  </button>
                </div>

                {/* Tool: Sottosistema Audio & Sample Rate */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Volume2 size={18} color="var(--accent-emerald)" />
                        {t('care_audio_hub_title')}
                      </div>
                      {audioDiagnostics && (
                        <span
                          className={`badge ${audioDiagnostics.engineStatus === 'optimal' ? 'badge-emerald' : audioDiagnostics.engineStatus === 'standard' ? 'badge-cyan' : 'badge-amber'}`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {audioDiagnostics.engineStatus.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('care_audio_hub_desc')}
                    </div>

                    {audioDiagnostics && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'var(--bg-input)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('care_audio_default_label')}
                            </span>
                            <span
                              className={`badge ${audioDiagnostics.audioServiceRunning ? 'badge-emerald' : 'badge-ruby'}`}
                              style={{ fontSize: '0.62rem' }}
                            >
                              Audiosrv: {audioDiagnostics.audioServiceRunning ? 'Attivo' : 'Arrestato'}
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {audioDiagnostics.defaultDeviceName || 'Endpoint Audio Windows'}
                          </div>

                          {audioDiagnostics.devices && audioDiagnostics.devices.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', fontSize: '0.74rem', marginTop: '4px' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_audio_sample_rate')} </span>
                                <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                                  {audioDiagnostics.devices[0]?.sampleRateHz
                                    ? `${(audioDiagnostics.devices[0].sampleRateHz / 1000).toFixed(1)} kHz`
                                    : 'N/D'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_audio_bit_depth')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {audioDiagnostics.devices[0]?.bitDepth
                                    ? `${audioDiagnostics.devices[0].bitDepth}-bit`
                                    : 'N/D'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_audio_channels')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {audioDiagnostics.devices[0]?.channels === 2
                                    ? 'Stereo (2.0)'
                                    : audioDiagnostics.devices[0]?.channels
                                      ? `${audioDiagnostics.devices[0].channels} Ch`
                                      : 'N/D'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_audio_active_devices')} </span>
                                <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                                  {audioDiagnostics.devices.length}
                                </strong>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleOpenSoundSettings}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={13} style={{ marginRight: '6px' }} />
                    {t('care_audio_open_settings')}
                  </button>
                </div>

                {/* Tool: Scheda di Rete & Connettività */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Network size={18} color="var(--accent-primary)" />
                        {t('care_network_hub_title')}
                      </div>
                      {networkAdapter && (
                        <span
                          className={`badge ${networkAdapter.isLinkSpeedDowngraded ? 'badge-ruby' : networkAdapter.linkSpeedMbps && networkAdapter.linkSpeedMbps >= 1000 ? 'badge-emerald' : 'badge-cyan'}`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {networkAdapter.isLinkSpeedDowngraded
                            ? t('care_network_link_downgraded_badge')
                            : networkAdapter.linkSpeedMbps
                              ? `${networkAdapter.linkSpeedMbps} Mbps`
                              : networkAdapter.adapterType.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('care_network_hub_desc')}
                    </div>

                    {networkAdapter ? (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                          style={{
                            padding: '10px 12px',
                            background: 'var(--bg-input)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('care_network_adapter_label')}
                            </span>
                            <span
                              className={`badge ${networkAdapter.status === 'connected' ? 'badge-emerald' : 'badge-amber'}`}
                              style={{ fontSize: '0.62rem' }}
                            >
                              {networkAdapter.adapterType.toUpperCase()} • {networkAdapter.status.toUpperCase()}
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {networkAdapter.adapterName}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', fontSize: '0.74rem', marginTop: '4px' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>{t('care_network_link_speed_label')} </span>
                              <strong style={{
                                color: networkAdapter.isLinkSpeedDowngraded ? 'var(--accent-ruby)' : 'var(--accent-primary)',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {networkAdapter.linkSpeedMbps ? `${networkAdapter.linkSpeedMbps} Mbps` : 'N/D'}
                              </strong>
                            </div>

                            {networkAdapter.ipv4 && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_network_ipv4_label')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {networkAdapter.ipv4}
                                </strong>
                              </div>
                            )}

                            {networkAdapter.gateway && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_network_gateway_label')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {networkAdapter.gateway}
                                </strong>
                              </div>
                            )}

                            {networkAdapter.macAddress && (
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>{t('care_network_mac_label')} </span>
                                <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                  {networkAdapter.macAddress}
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* Se presente segnale Wi-Fi */}
                          {wifiSignal && wifiSignal.isConnected && (
                            <div style={{
                              marginTop: '8px',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Wifi size={12} color="var(--accent-cyan)" />
                                  SSID: <strong style={{ color: 'var(--text-primary)' }}>{wifiSignal.ssid || 'N/D'}</strong>
                                </span>
                                <span
                                  className={`badge ${wifiSignal.signalQualityPercent >= 60 ? 'badge-emerald' : wifiSignal.signalQualityPercent >= 45 ? 'badge-amber' : 'badge-ruby'}`}
                                  style={{ fontSize: '0.62rem' }}
                                >
                                  {wifiSignal.signalQualityPercent}% ({wifiSignal.rssiDbm} dBm)
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', fontSize: '0.74rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>{t('care_network_wifi_band_label')} </span>
                                  <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                                    {wifiSignal.band}
                                  </strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>{t('care_network_wifi_standard_label')} </span>
                                  <strong style={{ color: 'var(--text-secondary)' }}>
                                    {wifiSignal.standard}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {t('care_network_not_connected')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRunNetworkDiagnostics}
                    disabled={isRunningNetworkTest}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <RefreshCw size={13} className={isRunningNetworkTest ? 'spin' : ''} style={{ marginRight: '6px' }} />
                    {isRunningNetworkTest ? t('network_diagnostics_running') : t('network_diagnostics_run_btn')}
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* AREA 4: QUALITY OF LIFE & STRUMENTI RAPIDI */}
            {/* ======================================================== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <Gauge size={16} color="var(--accent-primary)" />
                <span>4. Quality of Life & Strumenti Rapidi</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {/* Tool: Riavvio Diretto BIOS / UEFI */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCcw size={18} color="var(--accent-amber)" />
                        Riavvio Diretto nel BIOS / UEFI
                      </div>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                        Richiede UAC
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Riavvia istantaneamente il computer entrando direttamente nel setup BIOS/UEFI della scheda madre.
                      Perfetto per chi effettua overclock o cambio profili RAM senza dover premere tasti durante il boot.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={runningTool !== null}
                    onClick={() => setIsUefiConfirmModalOpen(true)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Power size={14} style={{ marginRight: '6px' }} />
                    Riavvia nel BIOS / UEFI...
                  </button>
                </div>

                {/* Tool: Controllo Aggiornamenti WinGet */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={18} color="var(--accent-emerald)" />
                        Aggiornamenti Software (WinGet)
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        Standard
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      Interroga il Windows Package Manager (<code style={{ color: 'var(--accent-primary)' }}>winget upgrade</code>) per verificare
                      se ci sono nuove versioni disponibili per le applicazioni installate e i runtime di sistema.
                    </div>

                    {wingetUpdates && (
                      <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Aggiornamenti rilevati: <strong style={{ color: wingetUpdates.length > 0 ? 'var(--accent-primary)' : 'var(--accent-emerald)' }}>{wingetUpdates.length} pacchetti</strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isLoadingWinGet}
                    onClick={handleCheckWinGetUpdates}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <RefreshCw size={13} className={isLoadingWinGet ? 'spin' : ''} style={{ marginRight: '6px' }} />
                    {isLoadingWinGet ? 'Controllo in corso...' : 'Verifica Aggiornamenti WinGet'}
                  </button>
                </div>

                {/* Tool: Startup Intelligence (Applicazioni all'Avvio) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={18} color="var(--accent-cyan)" />
                        {t('startup_apps_title')}
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                        Read-Only Registry
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('startup_apps_desc')}
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span>
                          {t('startup_apps_total')}: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{startupAppsSnapshot?.totalApps ?? 0}</strong>
                        </span>
                        <span>
                          {t('startup_apps_enabled')}: <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{startupAppsSnapshot?.enabledCount ?? 0}</strong>
                        </span>
                        <span>
                          {t('startup_apps_disabled')}: <strong style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{startupAppsSnapshot?.disabledCount ?? 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsStartupModalOpen(true)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {t('startup_apps_inspect_btn')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleOpenStartupSettings}
                      title={t('startup_apps_open_settings_btn')}
                      style={{ padding: '0 10px' }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>

                {/* Tool: Diagnostica Rete & Latenza ICMP */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wifi size={18} color="var(--accent-primary)" />
                        {t('network_diagnostics_title')}
                      </div>
                      {networkResult ? (
                        <span className={`badge ${getNetworkQualityMeta(networkResult.qualityRating).badgeClass}`} style={{ fontSize: '0.68rem' }}>
                          {getNetworkQualityMeta(networkResult.qualityRating).label}
                        </span>
                      ) : (
                        <span className="badge badge-subtle" style={{ fontSize: '0.68rem' }}>
                          On-Demand ICMP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {t('network_diagnostics_desc')}
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={t('network_diagnostics_target_placeholder')}
                          value={networkTarget}
                          onChange={(e) => setNetworkTarget(e.target.value)}
                          style={{ height: '32px', fontSize: '0.8rem', flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isRunningNetworkTest}
                          onClick={handleRunNetworkDiagnostics}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <RefreshCw size={12} className={isRunningNetworkTest ? 'spin' : ''} style={{ marginRight: '4px' }} />
                          {isRunningNetworkTest ? t('network_diagnostics_running') : t('network_diagnostics_run_btn')}
                        </button>
                      </div>

                      {networkResult && (
                        <div
                          style={{
                            padding: '8px 10px',
                            background: 'var(--bg-input)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                            gap: '8px',
                            fontSize: '0.74rem',
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{t('network_diagnostics_rtt_min')}:</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatLatencyMs(networkResult.rttMinMs)}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{t('network_diagnostics_rtt_avg')}:</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
                              {formatLatencyMs(networkResult.rttAvgMs)}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{t('network_diagnostics_rtt_max')}:</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatLatencyMs(networkResult.rttMaxMs)}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{t('network_diagnostics_jitter')}:</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {formatLatencyMs(networkResult.jitterMs)}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{t('network_diagnostics_loss')}:</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: networkResult.packetLossPercent > 0 ? 'var(--accent-ruby)' : 'var(--accent-emerald)' }}>
                              {networkResult.packetLossPercent}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Applet Rapidi di Sistema Windows */}
              <div
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Scorciatoie Rapide Applet Native di Sistema:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenApplet('perfmon /rel')}
                    title="Monitoraggio Affidabilità e Cronologia Problemi di Windows"
                  >
                    <Activity size={13} style={{ marginRight: '4px' }} />
                    Affidabilità Sistema (perfmon /rel)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenApplet('devmgmt.msc')}
                    title="Gestione Dispositivi e Driver Hardware"
                  >
                    <Cpu size={13} style={{ marginRight: '4px' }} />
                    Gestione Dispositivi
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenApplet('dxdiag')}
                    title="Strumento di Diagnostica DirectX"
                  >
                    <Terminal size={13} style={{ marginRight: '4px' }} />
                    Diagnostica DirectX (dxdiag)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenApplet('mrt.exe')}
                    title="Strumento Rimozione Malware di Windows"
                  >
                    <ShieldCheck size={13} style={{ marginRight: '4px' }} />
                    Rimozione Malware (MRT)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenApplet('msconfig')}
                    title="Configurazione di Sistema"
                  >
                    <Sliders size={13} style={{ marginRight: '4px' }} />
                    Configurazione di Sistema (msconfig)
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TUNING JOURNAL (PROFILI HARDWARE) */}
      {/* ========================================================================= */}
      {activeTab === 'tuning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Bar (Ricerca, Filtri Categoria e Stabilità, + Nuovo Profilo) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                  placeholder="Cerca profilo, parametro, benchmark..."
                  value={tuningSearch}
                  onChange={(e) => setTuningSearch(e.target.value)}
                />
              </div>

              <select
                className="input-field select-field"
                style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                value={tuningCatFilter}
                onChange={(e) => setTuningCatFilter(e.target.value)}
              >
                <option value="all">Tutte le categorie</option>
                <option value="cpu">CPU</option>
                <option value="gpu">GPU</option>
                <option value="ram">RAM</option>
                <option value="cooling">Cooling</option>
                <option value="motherboard">Motherboard</option>
              </select>

              <select
                className="input-field select-field"
                style={{ width: 'auto', height: '36px', fontSize: '0.85rem' }}
                value={tuningStabFilter}
                onChange={(e) => setTuningStabFilter(e.target.value)}
              >
                <option value="all">{t('maintenance_tuning_filter_all_stability')}</option>
                {(Object.keys(TUNING_STABILITY_LABELS) as TuningStability[]).map((s) => (
                  <option key={s} value={s}>
                    {TUNING_STABILITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setProfileToEdit(null);
                setIsTuningModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
            >
              <Plus size={16} />
              <span>{t('maintenance_btn_new_tuning')}</span>
            </button>
          </div>

          {/* Elenco Profili di Tuning */}
          {filteredTuningProfiles.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'var(--text-muted)',
              }}
            >
              <Sliders size={38} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('maintenance_tuning_empty_title')}
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 16px' }}>
                {t('maintenance_tuning_empty_desc')}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setProfileToEdit(null);
                  setIsTuningModalOpen(true);
                }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                {t('maintenance_tuning_empty_btn')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
              {filteredTuningProfiles.map((prof) => {
                const stabBadge = getTuningStabilityBadgeClass(prof.stability);
                const comp = prof.componentId ? components.find((c) => c.id === prof.componentId) : null;
                const paramEntries = Object.entries(prof.parameters || {});

                return (
                  <div
                    key={prof.id}
                    className={`card ${prof.stability === 'daily' ? 'tuning-card-daily' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '18px',
                    }}
                  >
                    <div>
                      {/* Header Profilo */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                              {COMPONENT_CATEGORY_LABELS[prof.category]}
                            </span>
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                              {TUNING_TYPE_LABELS[prof.type]}
                            </span>
                            <span className={`badge ${stabBadge}`} style={{ fontSize: '0.7rem' }}>
                              {TUNING_STABILITY_LABELS[prof.stability]}
                            </span>
                            {prof.stability === 'daily' && (
                              <span
                                className="badge badge-emerald"
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                ⭐ DAILY DRIVER
                              </span>
                            )}
                            {prof.biosVersion && (
                              <span
                                className="badge badge-purple"
                                style={{
                                  fontSize: '0.68rem',
                                  fontFamily: 'var(--font-mono)',
                                }}
                                title={`Versione BIOS registrata: ${prof.biosVersion}`}
                              >
                                BIOS {prof.biosVersion}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {prof.name}
                          </div>
                          {comp && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Componente: <strong>{comp.name}</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px', color: 'var(--accent-cyan)' }}
                            onClick={() => {
                              setBiosCardProfile(prof);
                              setIsBiosCardModalOpen(true);
                            }}
                            title="Esporta Scheda Parametri BIOS (Markdown / Stampa)"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px', color: 'var(--text-muted)' }}
                            onClick={() => {
                              setProfileToEdit(prof);
                              setIsTuningModalOpen(true);
                            }}
                            title="Modifica profilo"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '6px', color: 'var(--accent-ruby)' }}
                            onClick={async () => {
                              if (window.confirm(`Eliminare il profilo di tuning "${prof.name}"?`)) {
                                await deleteTuningProfile(prof.id);
                              }
                            }}
                            title="Elimina profilo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Griglia Parametri Tecnici */}
                      {paramEntries.length > 0 && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          {paramEntries.map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                              <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Temperature & Consumi se registrati */}
                      {(prof.temperatures || prof.observedPowerWatts !== undefined) && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                            gap: '8px',
                            marginTop: '10px',
                          }}
                        >
                          {prof.temperatures?.idle !== undefined && (
                            <div style={{ padding: '6px', background: 'var(--bg-input)', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>IDLE</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {prof.temperatures.idle}°C
                              </div>
                            </div>
                          )}
                          {prof.temperatures?.load !== undefined && (
                            <div style={{ padding: '6px', background: 'var(--bg-input)', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>LOAD</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-ruby)' }}>
                                {prof.temperatures.load}°C
                              </div>
                            </div>
                          )}
                          {prof.observedPowerWatts !== undefined && (
                            <div style={{ padding: '6px', background: 'var(--bg-input)', borderRadius: '4px', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>POTENZA</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                                {prof.observedPowerWatts} W
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Benchmark */}
                      {prof.benchmarks && prof.benchmarks.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong>Benchmark:</strong> {prof.benchmarks[0].name} —{' '}
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{prof.benchmarks[0].score}</span>
                          {prof.benchmarks[0].notes && ` (${prof.benchmarks[0].notes})`}
                        </div>
                      )}

                      {/* Note Generali */}
                      {prof.notes && (
                        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                          {prof.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      Registrato il {formatWithSettings(prof.date, settings.dateFormat)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALI CONDIVISE */}
      {/* ========================================================================= */}

      {/* Modale Inserimento/Modifica Intervento Manutenzione */}
      <MaintenanceEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEntryToEdit(null);
          setEntryInitialValues(undefined);
        }}
        entryToEdit={entryToEdit}
        initialValues={entryInitialValues}
      />

      {/* Modale Inserimento/Modifica Profilo di Tuning */}
      <TuningProfileModal
        isOpen={isTuningModalOpen}
        onClose={() => {
          setIsTuningModalOpen(false);
          setProfileToEdit(null);
        }}
        profileToEdit={profileToEdit}
      />

      {/* Modale Esportazione Scheda Parametri BIOS */}
      <BiosParameterCardModal
        isOpen={isBiosCardModalOpen}
        onClose={() => {
          setIsBiosCardModalOpen(false);
          setBiosCardProfile(null);
        }}
        profile={biosCardProfile}
        componentName={
          biosCardProfile?.componentId
            ? components.find((c) => c.id === biosCardProfile.componentId)?.name
            : undefined
        }
      />

      {/* Modale Conferma Svuotamento Cestino */}
      <RecycleBinConfirmModal
        isOpen={isRecycleBinModalOpen}
        onClose={() => setIsRecycleBinModalOpen(false)}
        onConfirm={handleConfirmEmptyBin}
        binInfo={recycleBin}
        isLoading={isEmptyingBin}
      />

      {/* Modale Risultato Strumento Windows */}
      <ToolResultModal
        isOpen={isToolResultOpen}
        onClose={() => {
          setIsToolResultOpen(false);
          setToolResult(null);
        }}
        result={toolResult}
        toolTitle={toolResultTitle}
        onRegisterInMaintenance={handleRegisterFromToolResult}
      />

      {/* Modale Conferma Riavvio Diretto BIOS/UEFI */}
      <Modal
        isOpen={isUefiConfirmModalOpen}
        onClose={() => setIsUefiConfirmModalOpen(false)}
        title="Riavvio Diretto nel BIOS / UEFI"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={24} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Il computer verrà riavviato immediatamente e istruirà il firmware della scheda madre ad accedere
              direttamente alla schermata del <strong>BIOS/UEFI</strong> al boot successivo.
            </div>
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          >
            ⚠️ <strong>Attenzione:</strong> salva tutti i file aperti e chiudi le applicazioni attive prima di procedere.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUefiConfirmModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleConfirmRebootUefi}
              style={{ backgroundColor: 'var(--accent-amber)', color: '#000', fontWeight: 600 }}
            >
              Riavvia Ora nel BIOS
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale Creazione Punto di Ripristino */}
      <Modal
        isOpen={isRestorePointModalOpen}
        onClose={() => setIsRestorePointModalOpen(false)}
        title="Crea Punto di Ripristino di Sistema"
        maxWidth="480px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateRestorePoint();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Crea uno snapshot istantaneo dello stato del registro di Windows e dei file di sistema.
            Richiede privilegi amministrativi (UAC).
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>
              Nome / Descrizione Punto di Ripristino
            </label>
            <input
              type="text"
              className="input-field"
              value={restorePointDesc}
              onChange={(e) => setRestorePointDesc(e.target.value)}
              placeholder="es. PC Tracker Pre-Tweak Safety Point"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRestorePointModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={runningTool !== null || !restorePointDesc.trim()}
            >
              Crea Punto di Ripristino
            </button>
          </div>
        </form>
      </Modal>

      {/* Modale Ispezione Event Log Windows */}
      <EventLogInspectionModal
        isOpen={isEventLogModalOpen}
        onClose={() => setIsEventLogModalOpen(false)}
        eventLogSnapshot={diagnosticsSnapshot?.eventLog}
      />

      {/* Modale Stato Servizi Windows SCM */}
      <WindowsServicesInspectionModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        servicesSnapshot={diagnosticsSnapshot?.systemServices}
      />

      {/* Modale Ispezione Applicazioni di Avvio */}
      <StartupAppsInspectionModal
        isOpen={isStartupModalOpen}
        onClose={() => setIsStartupModalOpen(false)}
        snapshot={startupAppsSnapshot}
        onOpenSettings={handleOpenStartupSettings}
      />
    </div>
  );
};
