import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { Header } from './Header';
import { DashboardPage } from '../../pages/DashboardPage';
import { CurrentRigPage } from '../../pages/CurrentRigPage';
import { ArchivePage } from '../../pages/ArchivePage';
import { ComponentDetailPage } from '../../pages/ComponentDetailPage';
import { UpgradesPage } from '../../pages/UpgradesPage';
import { StatsPage } from '../../pages/StatsPage';
import { MaintenancePage } from '../../pages/MaintenancePage';
import { SettingsPage } from '../../pages/SettingsPage';
import { TimeTravelPage } from '../../pages/TimeTravelPage';
import { MarketplacePage } from '../../pages/MarketplacePage';
import { WikiPage } from '../../pages/WikiPage';
import { usePCStore } from '../../store';
import {
  ComponentFormModal,
  DeleteConfirmModal,
  InstallModal,
  UninstallModal,
  ReplaceModal,
  SaleModal,
  ExtraExpenseModal,
  GiftModal,
  DisposalModal,
  MovementSelectorModal,
  UpgradeWizardModal,
  ListingGeneratorModal,
} from '../components';
import { CheckpointModal, PostUpgradePromptModal } from '../checkpoint';
import { QuickSetupModal } from '../quickSetup';
import { ImportBackupModal } from '../backup';
import { RigExportModal } from '../export';
import { Toast } from '../common/Toast';
import { WhatsNewModal } from '../common/WhatsNewModal';
import { Component, ComponentCategory, InstallEvent, Upgrade, ImportPreview } from '../../types';
import { isDesktopApp, checkForAppUpdates, pickAndReadBackupFileWithDialog, AppUpdateInfo } from '../../services';
import { APP_VERSION } from '../../constants/version';
import { validateImportJSON, executeImport } from '../../storage';

export const AppShell: React.FC = () => {
  const {
    settings,
    components,
    events,
    upgrades,
    checkpoints,
    currentRigCost,
    isLoading,
    showNotification,
    reloadFromDB,
    getInstalledComponents,
    getComponentComputed,
    getComponentWarranty,
    getComponentReceipts,
  } = usePCStore();
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [hasInitializedStartSection, setHasInitializedStartSection] = useState(false);

  // Stato Quick Setup intelligente (Onboarding)
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [hasCheckedQuickSetup, setHasCheckedQuickSetup] = useState(false);

  useEffect(() => {
    // Inizializza la schermata iniziale UNA SOLA VOLTA al completamento del caricamento iniziale da IndexedDB
    if (!isLoading && !hasInitializedStartSection) {
      if (settings.defaultStartSection) {
        setCurrentSection(settings.defaultStartSection);
      }
      setHasInitializedStartSection(true);
    }
  }, [isLoading, hasInitializedStartSection, settings.defaultStartSection]);

  // Trigger automatico Quick Setup al primo avvio su installazione vergine (0 componenti e non ancora completato)
  useEffect(() => {
    if (!isLoading && !hasCheckedQuickSetup) {
      if (!settings.quickSetupCompleted && components.length === 0) {
        setIsQuickSetupOpen(true);
      }
      setHasCheckedQuickSetup(true);
    }
  }, [isLoading, hasCheckedQuickSetup, settings.quickSetupCompleted, components.length]);

  // Stato Notifiche Aggiornamenti (Auto-Updater & Bollino Rosso)
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo>({
    available: false,
    currentVersion: APP_VERSION,
  });

  // Stato Modale WhatsNew (Novità dell'aggiornamento)
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [hasCheckedWhatsNew, setHasCheckedWhatsNew] = useState(false);

  // Controllo aggiornamenti silenzioso all'avvio
  useEffect(() => {
    if (!isLoading) {
      checkForAppUpdates()
        .then((res) => {
          if (res.available && res.newVersion) {
            setUpdateInfo(res);
            showNotification(
              'success',
              `Nuova versione disponibile: v${res.newVersion}! Vai in Impostazioni per aggiornare.`
            );
          }
        })
        .catch((err) => {
          console.warn('[AppShell] Controllo aggiornamenti:', err);
        });
    }
  }, [isLoading]);

  // Rilevamento automatico post-aggiornamento: mostra WhatsNew se la versione corrente non è mai stata vista
  useEffect(() => {
    if (!isLoading && !hasCheckedWhatsNew) {
      try {
        const lastSeenVersion = localStorage.getItem('pctracker_last_seen_version');
        // Se non è mai stata salvata ed è un'installazione vergine (quick setup non completato e 0 componenti), non disturbare l'onboarding
        if (!lastSeenVersion && !settings.quickSetupCompleted && components.length === 0) {
          localStorage.setItem('pctracker_last_seen_version', APP_VERSION);
        } else if (lastSeenVersion !== APP_VERSION) {
          // L'utente ha appena aggiornato ad una nuova versione di PC Tracker!
          setIsWhatsNewOpen(true);
        }
      } catch {
        // Nessun errore se localStorage è ristretto
      }
      setHasCheckedWhatsNew(true);
    }
  }, [isLoading, hasCheckedWhatsNew, settings.quickSetupCompleted, components.length]);

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Modali di gestione componente (Anagrafica & Eliminazione)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState<Component | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);

  // Modali Lifecycle: Installazione, Rimozione, Sostituzione
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installTargetCategory, setInstallTargetCategory] = useState<ComponentCategory | null>(null);
  const [installPreSelectedComponent, setInstallPreSelectedComponent] = useState<Component | null>(null);
  const [componentToUninstall, setComponentToUninstall] = useState<Component | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{
    component: Component;
    lastInstallEvent?: InstallEvent;
  } | null>(null);

  // Modali Movimentazioni Hardware & Economiche
  const [isMovementSelectorOpen, setIsMovementSelectorOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [salePreSelectedComponent, setSalePreSelectedComponent] = useState<Component | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expensePreSelectedComponent, setExpensePreSelectedComponent] = useState<Component | null>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftPreSelectedComponent, setGiftPreSelectedComponent] = useState<Component | null>(null);
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [disposalPreSelectedComponent, setDisposalPreSelectedComponent] = useState<Component | null>(null);

  // Modale Wizard Upgrade / Cambio Generazionale
  const [isUpgradeWizardOpen, setIsUpgradeWizardOpen] = useState(false);
  const [isUpgradeOpenedFromSelector, setIsUpgradeOpenedFromSelector] = useState(false);
  const [upgradeWizardPreSelectedOldComponent, setUpgradeWizardPreSelectedOldComponent] = useState<Component | null>(null);

  // Modale Suggerimento Checkpoint Post-Upgrade (Non bloccante)
  const [isPostUpgradePromptOpen, setIsPostUpgradePromptOpen] = useState(false);
  const [isPostUpgradeCheckpointModalOpen, setIsPostUpgradeCheckpointModalOpen] = useState(false);
  const [completedUpgrade, setCompletedUpgrade] = useState<Upgrade | null>(null);

  // Stato Modale Esporta Scheda PC (Gemini AI, Discord, WhatsApp, PDF)
  const [isRigExportOpen, setIsRigExportOpen] = useState(false);

  // Stato Modale Generatore Annunci Marketplace
  const [listingTargetComponent, setListingTargetComponent] = useState<Component | null>(null);
  const [listingReceiptCount, setListingReceiptCount] = useState<number>(0);

  useEffect(() => {
    if (listingTargetComponent) {
      getComponentReceipts(listingTargetComponent.id)
        .then((rc) => setListingReceiptCount(rc.length))
        .catch(() => setListingReceiptCount(0));
    } else {
      setListingReceiptCount(0);
    }
  }, [listingTargetComponent]);

  // Stato Modale Import Backup JSON (Header, QuickSetup e Drag & Drop)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<ImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImportText = (text: string, fileName: string) => {
    try {
      const result = validateImportJSON(text);
      if (!result.isValid) {
        showNotification('error', `File di backup non valido (${fileName}): ${result.error}`);
        return;
      }
      setImportFileName(fileName);
      setImportPreviewData(result);
      setIsImportModalOpen(true);
    } catch (err) {
      showNotification('error', `Errore durante la lettura del file: ${(err as Error).message}`);
    }
  };

  const triggerImportFlow = async () => {
    if (isDesktopApp()) {
      const result = await pickAndReadBackupFileWithDialog();
      if (result.canceled) return;
      if (result.success && result.content) {
        processImportText(result.content, result.fileName || 'backup.json');
        return;
      }
      if (result.error) {
        showNotification('error', result.error);
        return;
      }
    }
    fileInputRef.current?.click();
  };

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

  const handleConfirmImport = async () => {
    if (!importPreviewData) return;
    setIsImporting(true);
    try {
      await executeImport(importPreviewData.parsedData);
      await reloadFromDB();
      const countC = importPreviewData.counts.components;
      const countE = importPreviewData.counts.events;
      const countU = importPreviewData.counts.upgrades;
      setIsImportModalOpen(false);
      setImportPreviewData(null);
      showNotification(
        'success',
        `Backup ripristinato con successo: ${countC} componenti, ${countE} eventi, ${countU} upgrade.`
      );
    } catch (err) {
      setIsImportModalOpen(false);
      showNotification('error', `Errore durante l'importazione: ${(err as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Drag and drop globale di file .json di backup sulla finestra dell'applicazione
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.json')) {
          try {
            const text = await file.text();
            processImportText(text, file.name);
          } catch (err) {
            showNotification('error', `Errore nella lettura del file trascinato: ${(err as Error).message}`);
          }
        }
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const getSectionMetadata = (section: NavSection) => {
    switch (section) {
      case 'dashboard':
        return {
          title: settings.rigName ? `Panoramica • ${settings.rigName}` : 'Panoramica Generale',
          subtitle: settings.rigDescription || 'Metriche finanziarie, stato dell’hardware e ultimi movimenti',
        };
      case 'current-rig':
        return {
          title: settings.rigName || 'Il Mio PC Attuale',
          subtitle: settings.rigDescription || 'Configurazione hardware attualmente assemblata e in uso',
        };
      case 'time-travel':
        return {
          title: 'Time Travel',
          subtitle: 'Navigazione temporale, configurazioni storiche e checkpoint',
        };
      case 'archive':
        return {
          title: 'Archivio Componenti',
          subtitle: 'Tutti i pezzi mai posseduti, suddivisi per stato e categoria',
        };
      case 'upgrades':
        return {
          title: 'Storico Upgrade',
          subtitle: 'Cronologia dei cambi generazionali e bilanci di sostituzione',
        };
      case 'marketplace':
        return {
          title: 'Vendite & Annunci',
          subtitle: 'Gestione hardware a magazzino, annunci di vendita e recupero capitale',
        };
      case 'stats':
        return {
          title: 'Statistiche & Finanze',
          subtitle: 'Andamento della spesa nel tempo e grafici di ripartizione',
        };
      case 'maintenance':
        return {
          title: 'Windows Maintenance Center',
          subtitle: 'Registro interventi, diagnostica di sistema, strumenti Windows e tuning journal',
        };
      case 'wiki':
        return {
          title: 'Wiki & Guida Ufficiale',
          subtitle: 'Manuale d\'uso interattivo, tutorial passo-passo, spiegazione formule e trucchi pro',
        };
      case 'settings':
        return {
          title: 'Impostazioni',
          subtitle: 'Personalizzazione del setup, preferenze interfaccia e gestione dati',
        };
    }
  };

  const metadata = getSectionMetadata(currentSection);

  useEffect(() => {
    // Sincronizza preferenze Reduced Motion a livello di root HTML
    document.documentElement.setAttribute('data-reduced-motion', settings.reducedMotion);

    // Sincronizza preferenza Densità grafica
    if (settings.uiDensity === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }

    // Sincronizza Palette Accent, Ambiente Cromatico & Preset Tipografico
    document.documentElement.setAttribute('data-accent', settings.accentColor || 'cyan');
    document.documentElement.setAttribute('data-environment', settings.environmentTheme || 'obsidian');
    document.documentElement.setAttribute('data-typography', settings.typographyPreset || 'default');
  }, [settings.reducedMotion, settings.uiDensity, settings.accentColor, settings.environmentTheme, settings.typographyPreset]);

  const [wikiTargetArticleId, setWikiTargetArticleId] = useState<string | null>(null);
  const [wikiReferrerSection, setWikiReferrerSection] = useState<NavSection | null>(null);

  const handleSelectSection = (section: NavSection) => {
    if (section !== 'wiki') {
      setWikiTargetArticleId(null);
      setWikiReferrerSection(null);
    }
    setCurrentSection(section);
    setSelectedComponentId(null);
  };

  const handleOpenWikiArticle = (articleId?: string) => {
    if (currentSection !== 'wiki') {
      setWikiReferrerSection(currentSection);
    }
    setWikiTargetArticleId(articleId || null);
    setCurrentSection('wiki');
    setSelectedComponentId(null);
  };

  const handleBackToReferrer = () => {
    if (wikiReferrerSection) {
      setCurrentSection(wikiReferrerSection);
      setWikiReferrerSection(null);
      setWikiTargetArticleId(null);
    }
  };

  const handleSelectComponent = (id: string) => {
    setSelectedComponentId(id);
    setCurrentSection('archive');
  };

  const handleBackToArchive = () => {
    setSelectedComponentId(null);
  };

  const handleOpenInstallModal = (category?: ComponentCategory, component?: Component) => {
    setInstallTargetCategory(category || null);
    setInstallPreSelectedComponent(component || null);
    setIsInstallModalOpen(true);
  };

  const handleOpenUninstallModal = (component: Component) => {
    setComponentToUninstall(component);
  };

  const handleOpenReplaceModal = (component: Component, lastInstallEvent?: InstallEvent) => {
    setReplaceTarget({ component, lastInstallEvent });
  };

  const handleOpenMovementSelector = () => {
    setIsMovementSelectorOpen(true);
  };

  const handleSelectUpgradeFromSelector = () => {
    setIsMovementSelectorOpen(false);
    setUpgradeWizardPreSelectedOldComponent(null);
    setIsUpgradeOpenedFromSelector(true);
    setIsUpgradeWizardOpen(true);
  };

  const handleOpenSaleModal = (component?: Component) => {
    setSalePreSelectedComponent(component || null);
    setIsSaleModalOpen(true);
  };

  const handleOpenExpenseModal = (component?: Component) => {
    setExpensePreSelectedComponent(component || null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenGiftModal = (component?: Component) => {
    setGiftPreSelectedComponent(component || null);
    setIsGiftModalOpen(true);
  };

  const handleOpenDisposalModal = (component?: Component) => {
    setDisposalPreSelectedComponent(component || null);
    setIsDisposalModalOpen(true);
  };

  const handleOpenUpgradeWizard = (component?: Component) => {
    setIsUpgradeOpenedFromSelector(false);
    setUpgradeWizardPreSelectedOldComponent(component || null);
    setIsUpgradeWizardOpen(true);
  };

  const renderContent = () => {
    // Se è selezionato un componente ed è in corso la visualizzazione archivio
    if (selectedComponentId && currentSection === 'archive') {
      return (
        <ComponentDetailPage
          componentId={selectedComponentId}
          onBack={handleBackToArchive}
          onEdit={(comp) => setComponentToEdit(comp)}
          onDelete={(comp) => setComponentToDelete(comp)}
          onInstall={(comp) => handleOpenInstallModal(undefined, comp)}
          onUninstall={(comp) => handleOpenUninstallModal(comp)}
          onReplace={(comp) => handleOpenReplaceModal(comp)}
          onUpgrade={(comp) => handleOpenUpgradeWizard(comp)}
          onSale={(comp) => handleOpenSaleModal(comp)}
          onExtraExpense={(comp) => handleOpenExpenseModal(comp)}
          onGift={(comp) => handleOpenGiftModal(comp)}
          onDisposal={(comp) => handleOpenDisposalModal(comp)}
        />
      );
    }

    switch (currentSection) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleSelectSection}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenMovementSelector={handleOpenMovementSelector}
            onSelectComponent={handleSelectComponent}
            onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
            onOpenExportModal={() => setIsRigExportOpen(true)}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'current-rig':
        return (
          <CurrentRigPage
            onSelectComponent={handleSelectComponent}
            onOpenInstallModal={(category) => handleOpenInstallModal(category)}
            onOpenUninstallModal={handleOpenUninstallModal}
            onOpenReplaceModal={handleOpenReplaceModal}
            onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
            onOpenExportModal={() => setIsRigExportOpen(true)}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'time-travel':
        return <TimeTravelPage onOpenWikiArticle={handleOpenWikiArticle} />;
      case 'archive':
        return (
          <ArchivePage
            onSelectComponent={handleSelectComponent}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenEditModal={(comp) => setComponentToEdit(comp)}
            onOpenDeleteModal={(comp) => setComponentToDelete(comp)}
            onInstallComponent={(comp) => handleOpenInstallModal(undefined, comp)}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'upgrades':
        return (
          <UpgradesPage
            onSelectComponent={handleSelectComponent}
            onOpenUpgradeWizard={() => handleOpenUpgradeWizard()}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'marketplace':
        return (
          <MarketplacePage
            onSelectComponent={handleSelectComponent}
            onOpenSaleModal={(comp) => handleOpenSaleModal(comp)}
            onOpenListingModal={(comp) => setListingTargetComponent(comp)}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'stats':
        return (
          <StatsPage
            onSelectComponent={handleSelectComponent}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      case 'maintenance':
        return <MaintenancePage onOpenWikiArticle={handleOpenWikiArticle} />;
      case 'wiki':
        return (
          <WikiPage
            initialArticleId={wikiTargetArticleId}
            referrerSection={wikiReferrerSection}
            onBackToReferrer={handleBackToReferrer}
            onNavigate={handleSelectSection}
            onOpenMovementSelector={handleOpenMovementSelector}
            onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
            hasUpdateAvailable={updateInfo.available}
            onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
            updateInfo={updateInfo}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
      default:
        return (
          <CurrentRigPage
            onSelectComponent={handleSelectComponent}
            onOpenInstallModal={(category) => handleOpenInstallModal(category)}
            onOpenUninstallModal={handleOpenUninstallModal}
            onOpenReplaceModal={handleOpenReplaceModal}
            onOpenQuickSetup={() => setIsQuickSetupOpen(true)}
            onOpenExportModal={() => setIsRigExportOpen(true)}
            onOpenWikiArticle={handleOpenWikiArticle}
          />
        );
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        hasUpdateAvailable={updateInfo.available}
        onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
      />
      <div style={styles.main}>
        <Header
          title={selectedComponentId && currentSection === 'archive' ? 'Dettaglio Componente' : metadata.title}
          subtitle={selectedComponentId && currentSection === 'archive' ? 'Scheda tecnica e cronologia' : metadata.subtitle}
          onNewMovement={handleOpenMovementSelector}
          onImportBackup={triggerImportFlow}
          onOpenWiki={currentSection !== 'wiki' ? () => handleOpenWikiArticle() : undefined}
        />
        <main style={styles.content}>{renderContent()}</main>
      </div>

      {/* Selettore Globale Operazioni "+ Nuovo Movimento" */}
      <MovementSelectorModal
        isOpen={isMovementSelectorOpen}
        onClose={() => setIsMovementSelectorOpen(false)}
        onSelectUpgrade={handleSelectUpgradeFromSelector}
        onSuccessPurchase={(created) => {
          setSelectedComponentId(created.id);
          setCurrentSection('archive');
        }}
        onOpenWikiGuide={handleOpenWikiArticle}
      />

      {/* Modale Registrazione Vendita */}
      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSalePreSelectedComponent(null);
        }}
        preSelectedComponent={salePreSelectedComponent}
      />

      {/* Modale Registrazione Spesa Extra */}
      <ExtraExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpensePreSelectedComponent(null);
        }}
        preSelectedComponent={expensePreSelectedComponent}
      />

      {/* Modale Registrazione Regalo */}
      <GiftModal
        isOpen={isGiftModalOpen}
        onClose={() => {
          setIsGiftModalOpen(false);
          setGiftPreSelectedComponent(null);
        }}
        preSelectedComponent={giftPreSelectedComponent}
      />

      {/* Modale Registrazione Smaltimento */}
      <DisposalModal
        isOpen={isDisposalModalOpen}
        onClose={() => {
          setIsDisposalModalOpen(false);
          setDisposalPreSelectedComponent(null);
        }}
        preSelectedComponent={disposalPreSelectedComponent}
      />

      {/* Modale Creazione Componente */}
      <ComponentFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          setSelectedComponentId(created.id);
          setCurrentSection('archive');
        }}
      />

      {/* Modale Modifica Componente */}
      <ComponentFormModal
        isOpen={Boolean(componentToEdit)}
        onClose={() => setComponentToEdit(null)}
        componentToEdit={componentToEdit}
      />

      {/* Modale Conferma Eliminazione Componente */}
      <DeleteConfirmModal
        isOpen={Boolean(componentToDelete)}
        onClose={() => setComponentToDelete(null)}
        component={componentToDelete}
        onDeleted={() => {
          if (selectedComponentId === componentToDelete?.id) {
            setSelectedComponentId(null);
          }
        }}
      />

      {/* Modale Installazione nel PC */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => {
          setIsInstallModalOpen(false);
          setInstallTargetCategory(null);
          setInstallPreSelectedComponent(null);
        }}
        preSelectedComponent={installPreSelectedComponent}
        targetCategory={installTargetCategory}
      />

      {/* Modale Rimozione / Smontaggio dal PC */}
      <UninstallModal
        isOpen={Boolean(componentToUninstall)}
        onClose={() => setComponentToUninstall(null)}
        component={componentToUninstall}
      />

      {/* Modale Sostituzione Rapida */}
      <ReplaceModal
        isOpen={Boolean(replaceTarget)}
        onClose={() => setReplaceTarget(null)}
        oldComponent={replaceTarget?.component || null}
        lastInstallEvent={replaceTarget?.lastInstallEvent}
      />

      {/* Modale Wizard Upgrade / Cambio Generazionale */}
      <UpgradeWizardModal
        isOpen={isUpgradeWizardOpen}
        onClose={() => {
          setIsUpgradeWizardOpen(false);
          setUpgradeWizardPreSelectedOldComponent(null);
          setIsUpgradeOpenedFromSelector(false);
        }}
        onBack={
          isUpgradeOpenedFromSelector
            ? () => {
                setIsUpgradeWizardOpen(false);
                setIsUpgradeOpenedFromSelector(false);
                setIsMovementSelectorOpen(true);
              }
            : undefined
        }
        preSelectedOldComponent={upgradeWizardPreSelectedOldComponent}
        onSuccess={(createdUpgrade) => {
          setCurrentSection('upgrades');
          setCompletedUpgrade(createdUpgrade);
          setIsPostUpgradePromptOpen(true);
        }}
      />

      {/* Prompt Suggerimento Checkpoint Post-Upgrade */}
      <PostUpgradePromptModal
        isOpen={isPostUpgradePromptOpen}
        onClose={() => {
          setIsPostUpgradePromptOpen(false);
          setCompletedUpgrade(null);
        }}
        onConfirmSave={() => {
          setIsPostUpgradeCheckpointModalOpen(true);
        }}
        upgradeTitle="Nuova Generazione Hardware"
      />

      {/* Modale Checkpoint Post-Upgrade */}
      <CheckpointModal
        isOpen={isPostUpgradeCheckpointModalOpen}
        onClose={() => {
          setIsPostUpgradeCheckpointModalOpen(false);
          setCompletedUpgrade(null);
        }}
        initialName={completedUpgrade ? `Upgrade generazionale (${completedUpgrade.date})` : 'Nuova Generazione Hardware'}
        position={completedUpgrade ? { date: completedUpgrade.date, boundary: 'end_of_day' } : undefined}
        relatedUpgradeId={completedUpgrade?.id}
        trigger="suggested_upgrade"
      />

      {/* Modale Quick Setup Intelligente (Onboarding & Rilevamento Hardware) */}
      <QuickSetupModal
        isOpen={isQuickSetupOpen}
        onClose={() => setIsQuickSetupOpen(false)}
        onCompleted={() => {
          setCurrentSection('current-rig');
        }}
        onImportBackup={triggerImportFlow}
        onOpenWikiGuide={handleOpenWikiArticle}
      />

      {/* Modale Esportazione & Condivisione Scheda PC (Gemini AI, Discord, WhatsApp, PDF) */}
      <RigExportModal
        isOpen={isRigExportOpen}
        onClose={() => setIsRigExportOpen(false)}
        installedComponents={getInstalledComponents()}
        rigName={settings.rigName}
        rigDescription={settings.rigDescription}
        buildYear={settings.buildYear}
        currentRigCost={currentRigCost}
        onNotify={(type, text) => showNotification(type, text)}
      />

      {/* Modale Unificato Ripristino Backup JSON */}
      <ImportBackupModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreviewData(null);
        }}
        onConfirm={handleConfirmImport}
        previewData={importPreviewData}
        fileName={importFileName}
        currentCounts={{
          components: components.length,
          events: events.length,
          upgrades: upgrades.length,
          checkpoints: checkpoints.length,
        }}
        isImporting={isImporting}
      />

      {/* Input File nascosto per fallback Web */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Modale Generatore Annunci di Vendita Marketplace (Subito, eBay, Vinted, Prompt IA) */}
      {listingTargetComponent && getComponentComputed(listingTargetComponent.id) && (
        <ListingGeneratorModal
          isOpen={Boolean(listingTargetComponent)}
          onClose={() => setListingTargetComponent(null)}
          component={listingTargetComponent}
          computed={getComponentComputed(listingTargetComponent.id)!}
          events={events.filter((e) => e.componentId === listingTargetComponent.id)}
          warranty={getComponentWarranty(listingTargetComponent.id)}
          receiptCount={listingReceiptCount}
        />
      )}

      {/* Modale Novità dell'Aggiornamento (What's New / Mini-Wiki) */}
      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        initialVersion={APP_VERSION}
      />

      {/* Notifiche Toast */}
      <Toast />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-app)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    padding: '28px 36px',
    flex: 1,
    maxWidth: '1680px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
};
