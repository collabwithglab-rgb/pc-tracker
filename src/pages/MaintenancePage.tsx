import React, { useState, useEffect, useMemo } from 'react';
import { usePCStore } from '../store';
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
} from '../types';
import {
  formatDate as formatWithSettings,
} from '../utils';
import {
  sortMaintenanceEntriesChronologically,
  filterMaintenanceEntries,
  getLastMaintenanceOfType,
  getLastThermalPasteApplication,
  computeUpcomingMaintenance,
  computeTotalMaintenanceCost,
  getMaintenanceTypeBadgeClass,
  sortTuningProfiles,
  filterTuningProfiles,
  getTuningStabilityBadgeClass,
  formatBytes,
  computeDriveUsagePercentage,
  getLocalDateISO,
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
} from '../services/windowsToolsService';
import {
  MaintenanceEntryModal,
  TuningProfileModal,
  RecycleBinConfirmModal,
  ToolResultModal,
} from '../components/maintenance';
import {
  Wrench,
  Activity,
  Sliders,
  Terminal,
  Calendar,
  Sparkles,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Trash2,
  Moon,
  ShieldCheck,
  Search,
  Plus,
  Edit2,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

import { MaintenanceTab, VALID_MAINTENANCE_TABS } from '../types';
export type { MaintenanceTab };

interface MaintenancePageProps {
  onOpenWikiArticle?: (articleId: string) => void;
  requestedTab?: MaintenanceTab;
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

  const [activeTab, setActiveTab] = useState<MaintenanceTab>(
    requestedTab && VALID_MAINTENANCE_TABS.includes(requestedTab) ? requestedTab : 'registro'
  );

  useEffect(() => {
    if (requestedTab && VALID_MAINTENANCE_TABS.includes(requestedTab)) {
      setActiveTab(requestedTab);
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

  // Caricamento dati iniziali per la tab Strumenti
  const loadWindowsToolsData = async () => {
    try {
      const [vols, trim, bin, hiber] = await Promise.all([
        scanStorageVolumes(),
        queryTrimConfiguration(),
        queryRecycleBin(),
        getHibernateStatus(),
      ]);

      if (vols.data && vols.data.length > 0) {
        setVolumes(vols.data);
        setSelectedTrimDrive(vols.data[0].driveLetter);
        setSelectedChkdskDrive(vols.data[0].driveLetter);
      }
      if (trim.data) setTrimStatus(trim.data);
      if (bin.data) setRecycleBin(bin.data);
      if (hiber.data) setHibernate(hiber.data);
    } catch (err) {
      console.warn('Errore caricamento dati strumenti Windows:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tools' || activeTab === 'scan') {
      loadWindowsToolsData();
    }
  }, [activeTab]);

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

  const lastCleaning = useMemo(() => {
    return getLastMaintenanceOfType(maintenanceEntries, 'cleaning');
  }, [maintenanceEntries]);

  const lastThermalPaste = useMemo(() => {
    return getLastThermalPasteApplication(maintenanceEntries, components);
  }, [maintenanceEntries, components]);

  const totalCost = useMemo(() => {
    return computeTotalMaintenanceCost(maintenanceEntries);
  }, [maintenanceEntries]);

  const upcomingEntries = useMemo(() => {
    return computeUpcomingMaintenance(maintenanceEntries);
  }, [maintenanceEntries]);

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
      <nav className="settings-tablist" role="tablist" aria-label="Sezioni Manutenzione">
        <button
          type="button"
          role="tab"
          id="tab-registro"
          aria-selected={activeTab === 'registro'}
          onClick={() => handleTabChange('registro')}
          className={`settings-tab-btn ${activeTab === 'registro' ? 'is-active' : ''}`}
        >
          <Wrench size={15} />
          <span>Registro Manutenzione</span>
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
          id="tab-scan"
          aria-selected={activeTab === 'scan'}
          onClick={() => handleTabChange('scan')}
          className={`settings-tab-btn ${activeTab === 'scan' ? 'is-active' : ''}`}
        >
          <Activity size={15} />
          <span>Scan Now (Diagnostica)</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-tools"
          aria-selected={activeTab === 'tools'}
          onClick={() => handleTabChange('tools')}
          className={`settings-tab-btn ${activeTab === 'tools' ? 'is-active' : ''}`}
        >
          <Terminal size={15} />
          <span>Strumenti Windows</span>
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
            title="Cosa fanno gli strumenti di pulizia Windows? Leggi la guida ufficiale"
          >
            <BookOpen size={13} color="var(--accent-primary)" />
            <span>Guida Strumenti Windows</span>
          </button>
        )}
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: REGISTRO MANUTENZIONE */}
      {/* ========================================================================= */}
      {activeTab === 'registro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stat Cards KPI Manutenzione */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Ultima Pulizia */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Ultima Pulizia</span>
                <div className="stat-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)' }}>
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                {lastCleaning ? formatWithSettings(lastCleaning.date, settings.dateFormat) : 'Nessuna'}
              </div>
              <div className="stat-subtext" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lastCleaning ? getDaysAgo(lastCleaning.date) : 'Registra la prima pulizia'}
              </div>
            </div>

            {/* Pasta Termica */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Pasta Termica</span>
                <div className="stat-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' }}>
                  <Cpu size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.15rem', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastThermalPaste ? lastThermalPaste.productUsed || 'Applicata' : 'Nessuna'}
              </div>
              <div className="stat-subtext" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lastThermalPaste ? `${formatWithSettings(lastThermalPaste.date, settings.dateFormat)} (${getDaysAgo(lastThermalPaste.date)})` : 'Nessun cambio registrato'}
              </div>
            </div>

            {/* Spesa Manutenzione Totale */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Spesa Sostenuta</span>
                <div className="stat-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-ruby)' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '4px', color: 'var(--accent-ruby)' }}>
                € {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stat-subtext" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Pasta, pad, bombolette e detergenti
              </div>
            </div>

            {/* Scadenze in programma */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">In Programma</span>
                <div className="stat-icon-badge" style={{ background: 'rgba(129, 140, 248, 0.1)', color: 'var(--accent-purple)' }}>
                  <Calendar size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                {upcomingEntries.length}
              </div>
              <div className="stat-subtext" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {upcomingEntries.length > 0 ? 'Interventi con data promemoria' : 'Nessuna scadenza fissata'}
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
                <option value="all">Tutte le tipologie</option>
                {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map((t) => (
                  <option key={t} value={t}>
                    {MAINTENANCE_TYPE_LABELS[t]}
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
              <span>Registra Intervento</span>
            </button>
          </div>

          {/* Elenco Interventi di Manutenzione */}
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
                Nessun intervento registrato nel Registro Manutenzione
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 16px' }}>
                Registra la pulizia dei filtri, la sostituzione della pasta termica o le operazioni di
                manutenzione periodica per conservare lo storico del tuo hardware.
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
                Registra il primo intervento
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEntries.map((entry) => {
                const badgeClass = getMaintenanceTypeBadgeClass(entry.type);
                const linkedComps = (entry.componentIds || [])
                  .map((id) => components.find((c) => c.id === id)?.name)
                  .filter(Boolean);

                return (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.75rem' }}>
                          {MAINTENANCE_TYPE_LABELS[entry.type]}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {formatWithSettings(entry.date, settings.dateFormat)} ({getDaysAgo(entry.date)})
                        </span>
                        {(entry.source === 'tool' || entry.source === 'diagnostic') && (
                          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                            Strumento Windows
                          </span>
                        )}
                        {entry.cost !== undefined && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-ruby)' }}>
                            € {entry.cost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '6px', color: 'var(--text-muted)' }}
                          onClick={() => {
                            setEntryToEdit(entry);
                            setIsEntryModalOpen(true);
                          }}
                          title="Modifica intervento"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '6px', color: 'var(--accent-ruby)' }}
                          onClick={async () => {
                            if (window.confirm(`Eliminare l'intervento "${entry.title}"?`)) {
                              await deleteMaintenanceEntry(entry.id);
                            }
                          }}
                          title="Elimina intervento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {entry.title}
                      </div>
                      {entry.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          {entry.description}
                        </div>
                      )}
                    </div>

                    {/* Metadati aggiuntivi: Componenti, Prodotto Usato, Prossima Scadenza */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                      {entry.productUsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={12} color="var(--accent-amber)" />
                          <span>Prodotto: <strong style={{ color: 'var(--text-secondary)' }}>{entry.productUsed}</strong></span>
                        </div>
                      )}
                      {linkedComps.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Cpu size={12} color="var(--accent-primary)" />
                          <span>Componenti: <strong style={{ color: 'var(--text-secondary)' }}>{linkedComps.join(', ')}</strong></span>
                        </div>
                      )}
                      {entry.nextDueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="var(--accent-purple)" />
                          <span>Prossimo controllo: <strong style={{ color: 'var(--accent-purple)' }}>{formatWithSettings(entry.nextDueDate, settings.dateFormat)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCAN NOW (DIAGNOSTICA NON DISTRUTTIVA) */}
      {/* ========================================================================= */}
      {activeTab === 'scan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                          onClick={() => handleTabChange('tools')}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STRUMENTI WINDOWS (OPERAZIONI ESPLICITE E SICURE) */}
      {/* ========================================================================= */}
      {activeTab === 'tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <strong>Manutenzione Tecnica Diretta:</strong> ogni strumento viene eseguito singolarmente
            su richiesta esplicita. Le operazioni che necessitano di privilegi amministrativi mostrano la
            richiesta di elevazione UAC standard di Windows.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Tool 1: TRIM per Unità SSD */}
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

            {/* Tool 2: Cestino di Windows */}
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
                  Elimina definitivamente i file e le cartelle cestinate presenti su tutte le unità locali, liberando lo spazio occupato.
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

            {/* Tool 3: Ibernazione Windows */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Moon size={18} color="var(--accent-purple)" />
                    Ibernazione Windows (hiberfil.sys)
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                    Richiede UAC
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                  Disabilitando l'ibernazione su PC desktop è possibile recuperare vari gigabyte di spazio dal disco di sistema (pari a una porzione della RAM).
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
                  Disattiva Ibernazione
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={runningTool !== null || hibernate?.enabled === true}
                  onClick={() => handleToggleHibernate(true)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Abilita Ibernazione
                </button>
              </div>
            </div>

            {/* Tool 4: Pulizia Disco cleanmgr.exe */}
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
                  Avvia l'utility nativa ufficiale di Windows che consente di selezionare file temporanei, log di sistema,
                  cache delle miniature e vecchie installazioni di Windows in piena sicurezza.
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

            {/* Tool 5: Verifica Integrità File di Sistema (SFC /verifyonly) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="var(--accent-emerald)" />
                    Verifica File di Sistema (SFC)
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                    Richiede UAC
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                  Esegue <code style={{ color: 'var(--accent-primary)' }}>sfc /verifyonly</code> in modalità sola lettura,
                  verificando se i file protetti del sistema operativo sono integri senza apportare modifiche o sovrascritture arbitrarie.
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

            {/* Tool 6: Scansione File System (CHKDSK /scan) */}
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
                  Esegue <code style={{ color: 'var(--accent-primary)' }}>chkdsk /scan</code> in modalità online non distruttiva.
                  Rileva eventuali inconsistenze del file system NTFS senza bloccare il volume e senza forzare riparazioni premature.
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TUNING JOURNAL (PROFILI HARDWARE) */}
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
                <option value="all">Tutte le stabilità</option>
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
              <span>Nuovo Profilo Tuning</span>
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
                Nessun profilo di tuning registrato nel Journal
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 16px' }}>
                Annota i profili Curve Optimizer di AMD, gli undervolt GPU (es. 950mV @ 2650MHz), i sub-timings
                RAM e le curve ventole per non perdere mai le tue impostazioni ottimali.
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
                Registra il primo profilo
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
                    className="card"
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
    </div>
  );
};
