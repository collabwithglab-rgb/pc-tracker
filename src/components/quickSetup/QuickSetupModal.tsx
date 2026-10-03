import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Cpu,
  HardDrive,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ArrowRight,
  Monitor,
  Check,
  Plus,
  Upload,
  BookOpen,
} from 'lucide-react';
import { ComponentCategory, Component } from '../../types';
import { usePCStore, QuickSetupImportItem } from '../../store';
import { detectHardware, DetectedComponent } from '../../services';
import { useTranslation, TranslationKey } from '../../locales';

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  onImportBackup?: () => void;
  onOpenWikiGuide?: (articleId: string) => void;
}

interface EditableDetectedItem extends DetectedComponent {
  id: string;
  selected: boolean;
  isEditing?: boolean;
  alreadyInstalled?: boolean;
  isIntegrated?: boolean;
  purchasePrice?: string;
}

interface ManualComponentItem {
  category: ComponentCategory;
  label: string;
  brand: string;
  model: string;
  price: string;
  enabled: boolean;
}

const CATEGORY_COLORS: Record<ComponentCategory, { bg: string; color: string; border: string }> = {
  cpu: { bg: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-primary)', border: 'rgba(56, 189, 248, 0.3)' },
  gpu: { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.3)' },
  ram: { bg: 'rgba(129, 140, 248, 0.12)', color: 'var(--accent-indigo)', border: 'rgba(129, 140, 248, 0.3)' },
  storage: { bg: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent-ruby)', border: 'rgba(244, 63, 94, 0.3)' },
  motherboard: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)', border: 'rgba(245, 158, 11, 0.3)' },
  psu: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  case: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  cooling: { bg: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-primary)', border: 'rgba(56, 189, 248, 0.3)' },
  monitor: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  peripherals: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  accessories: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  other: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
};

/**
 * Funzione pura per Smart Diff: verifica se un componente candidato è già montato nel PC.
 */
function checkAlreadyInRig(candidate: DetectedComponent, installed: Component[]): boolean {
  const normCandModel = candidate.model.toLowerCase().replace(/[^a-z0-9]/g, '');

  return installed.some((comp) => {
    if (comp.category !== candidate.category) return false;
    const normCompModel = comp.model.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normCompName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normCompModel.length >= 4 && normCandModel.length >= 4) {
      if (normCompModel.includes(normCandModel) || normCandModel.includes(normCompModel)) {
        return true;
      }
    }
    if (normCompName.length >= 4 && normCandModel.length >= 4) {
      if (normCompName.includes(normCandModel) || normCandModel.includes(normCompName)) {
        return true;
      }
    }
    if (candidate.category === 'ram' && comp.category === 'ram') {
      if (candidate.capacity && (comp.name.includes(candidate.capacity) || comp.model.includes(candidate.capacity))) {
        return true;
      }
    }
    return false;
  });
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  onImportBackup,
  onOpenWikiGuide,
}) => {
  const { settings, updateSettings, importQuickSetupData, getInstalledComponents } = usePCStore();
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Setup Personale
  const [rigName, setRigName] = useState(settings.rigName || 'Gaming PC');
  const [rigDescription, setRigDescription] = useState(settings.rigDescription || 'PC principale');
  const [buildYear, setBuildYear] = useState<number>(settings.buildYear || currentYear);

  // Scansione & Candidati
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [detectedItems, setDetectedItems] = useState<EditableDetectedItem[]>([]);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Componenti Manuali (Case, PSU, Dissipatore)
  const [showManualSection, setShowManualSection] = useState(false);
  const [manualItems, setManualItems] = useState<ManualComponentItem[]>([
    { category: 'psu', label: t('quicksetup_manual_psu_label'), brand: '', model: '', price: '', enabled: false },
    { category: 'case', label: t('quicksetup_manual_case_label'), brand: '', model: '', price: '', enabled: false },
    { category: 'cooling', label: t('quicksetup_manual_cooling_label'), brand: '', model: '', price: '', enabled: false },
  ]);

  // Reset dello stato quando il modale si apre
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRigName(settings.rigName || 'Gaming PC');
      setRigDescription(settings.rigDescription || 'PC principale');
      setBuildYear(settings.buildYear || currentYear);
      setScanStepIndex(0);
      setDetectedItems([]);
      setImportedCount(0);
      setIsSubmitting(false);
      setShowManualSection(false);
      setManualItems([
        { category: 'psu', label: t('quicksetup_manual_psu_label'), brand: '', model: '', price: '', enabled: false },
        { category: 'case', label: t('quicksetup_manual_case_label'), brand: '', model: '', price: '', enabled: false },
        { category: 'cooling', label: t('quicksetup_manual_cooling_label'), brand: '', model: '', price: '', enabled: false },
      ]);
    }
  }, [isOpen, t]);

  const handleStartSetup = () => {
    setStep(2);
  };

  const handleSkipEntireSetup = async () => {
    await updateSettings({ quickSetupCompleted: true });
    onClose();
  };

  const handleRunScan = async () => {
    setStep(3);
    setScanStepIndex(0);

    // Animazione di scansione sequenziale
    const interval = setInterval(() => {
      setScanStepIndex((prev) => (prev < 5 ? prev + 1 : prev));
    }, 280);

    try {
      const rawDetected = await detectHardware();
      const installedComps = getInstalledComponents().map((item) => item.component);
      const hasDiscreteGpu = rawDetected.some(
        (d) => d.category === 'gpu' && d.extraDetails?.is_discrete === 'true'
      );

      const mapped: EditableDetectedItem[] = rawDetected.map((item, idx) => {
        const alreadyInstalled = checkAlreadyInRig(item, installedComps);
        const isIntegrated =
          item.category === 'gpu' &&
          (item.extraDetails?.is_integrated === 'true' ||
            (!item.extraDetails?.is_discrete && hasDiscreteGpu));

        return {
          ...item,
          id: `detected-${idx}-${item.category}`,
          alreadyInstalled,
          isIntegrated,
          // Se è già installato nel PC o è una iGPU secondaria, non selezionare di default
          selected: !alreadyInstalled && !isIntegrated,
          isEditing: false,
          purchasePrice: '',
        };
      });

      setTimeout(() => {
        clearInterval(interval);
        setDetectedItems(mapped);
        setStep(4);
      }, 1400);
    } catch (err) {
      clearInterval(interval);
      setStep(4);
    }
  };

  const handleToggleSelect = (id: string) => {
    setDetectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleEdit = (id: string) => {
    setDetectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEditing: !item.isEditing } : item))
    );
  };

  const handleUpdateItemField = (
    id: string,
    field: 'brand' | 'model' | 'category' | 'price',
    val: string
  ) => {
    setDetectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'brand') return { ...item, manufacturer: val };
        if (field === 'model') return { ...item, model: val };
        if (field === 'category') return { ...item, category: val as ComponentCategory };
        if (field === 'price') return { ...item, purchasePrice: val };
        return item;
      })
    );
  };

  const handleUpdateManualField = (
    idx: number,
    field: 'brand' | 'model' | 'price' | 'enabled',
    val: string | boolean
  ) => {
    setManualItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return { ...item, [field]: val };
      })
    );
  };

  const handleConfirmImport = async () => {
    try {
      setIsSubmitting(true);
      const selected = detectedItems.filter((i) => i.selected);

      const itemsToImport: QuickSetupImportItem[] = [];

      // 1. Componenti rilevati
      for (const item of selected) {
        const priceNum = item.purchasePrice ? parseFloat(item.purchasePrice) : undefined;
        const slot =
          item.extraDetails?.interface === 'NVMe'
            ? t('quicksetup_slot_nvme')
            : item.extraDetails?.interface === 'SATA'
            ? t('quicksetup_slot_sata')
            : undefined;

        itemsToImport.push({
          category: item.category,
          brand: item.manufacturer.trim() || 'Generic',
          model: item.model.trim() || 'Hardware Component',
          serialNumber: item.serialNumber,
          purchasePrice: priceNum && !isNaN(priceNum) && priceNum > 0 ? priceNum : undefined,
          slotOrLocation: slot,
          notes: t('quicksetup_note_detected_via', { source: item.source }),
        });
      }

      // 2. Componenti manuali opzionali
      for (const m of manualItems) {
        if (m.enabled && (m.model.trim() || m.brand.trim())) {
          const priceNum = m.price ? parseFloat(m.price) : undefined;
          itemsToImport.push({
            category: m.category,
            brand: m.brand.trim() || 'Generic',
            model: m.model.trim() || m.label,
            purchasePrice: priceNum && !isNaN(priceNum) && priceNum > 0 ? priceNum : undefined,
            notes: t('quicksetup_note_manual'),
          });
        }
      }

      await importQuickSetupData({
        rigName: rigName.trim() || t('store_quick_setup_default_rig_name'),
        rigDescription: rigDescription.trim(),
        buildYear,
        components: itemsToImport,
      });

      setImportedCount(itemsToImport.length);
      setStep(5);
    } catch (err) {
      console.error('Errore importazione Quick Setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalFinish = () => {
    if (onCompleted) {
      onCompleted();
    }
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return t('quicksetup_step1_title');
      case 2:
        return t('quicksetup_step2_title');
      case 3:
        return t('quicksetup_step3_title');
      case 4:
        return t('quicksetup_step4_title');
      case 5:
        return t('quicksetup_step5_title');
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return t('quicksetup_step1_subtitle');
      case 2:
        return t('quicksetup_step2_subtitle');
      case 3:
        return t('quicksetup_step3_subtitle');
      case 4:
        return t('quicksetup_step4_subtitle', { count: detectedItems.length });
      case 5:
        return t('quicksetup_step5_subtitle');
    }
  };

  const selectedDetectedCount = detectedItems.filter((i) => i.selected).length;
  const selectedManualCount = manualItems.filter(
    (m) => m.enabled && (m.model.trim() || m.brand.trim())
  ).length;
  const totalToImport = selectedDetectedCount + selectedManualCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkipEntireSetup}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      maxWidth="640px"
      onBack={step === 2 ? () => setStep(1) : undefined}
      backTitle={step === 2 ? t('quicksetup_back_btn') : undefined}
    >
      <div style={styles.container}>
        {/* STEP 1: Benvenuto */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <div style={styles.heroBadge}>
              <Cpu size={36} color="var(--accent-primary)" />
            </div>

            <div style={styles.heroText}>
              <h2 style={styles.heroTitle}>{t('quicksetup_step1_hero_title')}</h2>
              <p style={styles.heroDescription}>
                {t('quicksetup_step1_hero_desc')}
              </p>
            </div>

            <div style={styles.guaranteeBox}>
              <div style={styles.guaranteeItem}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span>{t('quicksetup_guarantee_local')}</span>
              </div>
              <div style={styles.guaranteeItem}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span>{t('quicksetup_guarantee_no_fake')}</span>
              </div>
              <div style={styles.guaranteeItem}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span>{t('quicksetup_guarantee_control')}</span>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                style={styles.skipBtn}
                onClick={handleSkipEntireSetup}
              >
                {t('quicksetup_skip_btn')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleStartSetup}
                autoFocus
              >
                {t('quicksetup_start_btn')}
                <ArrowRight size={16} />
              </button>
            </div>

            {(onImportBackup || onOpenWikiGuide) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                {onImportBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onImportBackup();
                    }}
                    className="btn btn-secondary micro-press"
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--text-secondary)',
                    }}
                    id="btn-quicksetup-import-backup"
                  >
                    <Upload size={13} color="var(--accent-primary)" />
                    <span>{t('quicksetup_restore_backup_prefix')} <strong>{t('quicksetup_restore_backup_bold')}</strong></span>
                  </button>
                )}

                {onOpenWikiGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWikiGuide('first-rig-setup');
                    }}
                    className="btn btn-secondary micro-press"
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--text-secondary)',
                    }}
                    id="btn-quicksetup-wiki-guide"
                  >
                    <BookOpen size={13} color="var(--accent-primary)" />
                    <span>{t('quicksetup_guide_btn')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Identifica il PC */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="qs-rig-name">
                {t('quicksetup_rig_name_label')}
              </label>
              <input
                id="qs-rig-name"
                type="text"
                className="form-input"
                value={rigName}
                onChange={(e) => setRigName(e.target.value)}
                placeholder={t('quicksetup_rig_name_placeholder')}
                style={styles.input}
                maxLength={40}
                autoFocus
              />
              <span style={styles.hint}>{t('quicksetup_rig_name_hint')}</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="qs-rig-desc">
                {t('quicksetup_rig_desc_label')}
              </label>
              <input
                id="qs-rig-desc"
                type="text"
                className="form-input"
                value={rigDescription}
                onChange={(e) => setRigDescription(e.target.value)}
                placeholder={t('quicksetup_rig_desc_placeholder')}
                style={styles.input}
                maxLength={60}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="qs-build-year">
                {t('quicksetup_build_year_label')}
              </label>
              <input
                id="qs-build-year"
                type="number"
                className="form-input"
                value={buildYear}
                onChange={(e) => setBuildYear(parseInt(e.target.value, 10) || currentYear)}
                min={2000}
                max={currentYear + 1}
                style={{ ...styles.input, maxWidth: '140px' }}
              />
              <span style={styles.hint}>
                {t('quicksetup_build_year_hint')}
              </span>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                {t('quicksetup_back_btn')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleRunScan}
              >
                <Sparkles size={16} />
                {t('quicksetup_detect_hardware_btn')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Scansione PC */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <div style={styles.heroText}>
              <h3 style={styles.heroTitle}>{t('quicksetup_step3_hero_title')}</h3>
              <p style={styles.heroDescription}>
                {t('quicksetup_step3_hero_desc')}
              </p>
            </div>

            <div style={styles.scanChecklist}>
              {[
                { label: t('quicksetup_scan_cpu'), icon: Cpu, doneStep: 0 },
                { label: t('quicksetup_scan_mobo'), icon: Layers, doneStep: 1 },
                { label: t('quicksetup_scan_gpu'), icon: Monitor, doneStep: 2 },
                { label: t('quicksetup_scan_ram'), icon: Layers, doneStep: 3 },
                { label: t('quicksetup_scan_storage'), icon: HardDrive, doneStep: 4 },
              ].map((item) => {
                const isCompleted = scanStepIndex > item.doneStep;
                const isCurrent = scanStepIndex === item.doneStep;
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    style={{
                      ...styles.scanRow,
                      opacity: isCompleted || isCurrent ? 1 : 0.4,
                    }}
                  >
                    <div style={styles.scanRowLeft}>
                      <Icon
                        size={18}
                        color={isCompleted ? 'var(--accent-emerald)' : 'var(--accent-primary)'}
                      />
                      <span style={styles.scanRowName}>{item.label}</span>
                    </div>
                    <div>
                      {isCompleted ? (
                        <span style={styles.badgeSuccess}>
                          <Check size={14} />
                          {t('quicksetup_scan_detected')}
                        </span>
                      ) : isCurrent ? (
                        <span style={styles.badgeLoading}>{t('quicksetup_scan_reading')}</span>
                      ) : (
                        <span style={styles.badgePending}>{t('quicksetup_scan_queued')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.progressBarWrapper}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(100, ((scanStepIndex + 1) / 5) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Revisione & Conferma */}
        {step === 4 && (
          <div style={styles.stepContent}>
            {/* Disclaimer trasparente */}
            <div style={styles.disclaimerBox}>
              <AlertCircle size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
              <p style={styles.disclaimerText}>
                {t('quicksetup_step4_disclaimer')}
              </p>
            </div>

            {/* Lista componenti rilevati con checkbox, badge intelligenti e modifica inline */}
            <div style={styles.itemsList}>
              {detectedItems.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>{t('quicksetup_step4_empty')}</p>
                </div>
              ) : (
                detectedItems.map((item) => {
                  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;

                  return (
                    <div
                      key={item.id}
                      style={{
                        ...styles.itemCard,
                        borderColor: item.selected ? 'var(--border-default)' : 'var(--border-subtle)',
                        opacity: item.selected ? 1 : 0.65,
                      }}
                    >
                      {item.isEditing ? (
                        <div style={styles.editCardContent}>
                          <div style={styles.editRow}>
                            <div style={{ flex: 1 }}>
                              <label style={styles.microLabel}>{t('quicksetup_edit_brand')}</label>
                              <input
                                type="text"
                                className="form-input"
                                value={item.manufacturer}
                                onChange={(e) =>
                                  handleUpdateItemField(item.id, 'brand', e.target.value)
                                }
                                style={styles.microInput}
                              />
                            </div>
                            <div style={{ flex: 2 }}>
                              <label style={styles.microLabel}>{t('quicksetup_edit_model')}</label>
                              <input
                                type="text"
                                className="form-input"
                                value={item.model}
                                onChange={(e) =>
                                  handleUpdateItemField(item.id, 'model', e.target.value)
                                }
                                style={styles.microInput}
                              />
                            </div>
                          </div>

                          <div style={styles.editRow}>
                            <div style={{ flex: 1 }}>
                              <label style={styles.microLabel}>{t('quicksetup_edit_category')}</label>
                              <select
                                className="form-input"
                                value={item.category}
                                onChange={(e) =>
                                  handleUpdateItemField(item.id, 'category', e.target.value)
                                }
                                style={styles.microInput}
                              >
                                {Object.keys(CATEGORY_COLORS).map((catKey) => (
                                  <option key={catKey} value={catKey}>
                                    {t(`category_${catKey}` as TranslationKey)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={styles.microLabel}>{t('quicksetup_edit_price_optional')}</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={t('quicksetup_edit_price_placeholder')}
                                className="form-input"
                                value={item.purchasePrice || ''}
                                onChange={(e) =>
                                  handleUpdateItemField(item.id, 'price', e.target.value)
                                }
                                style={styles.microInput}
                              />
                            </div>

                            <div style={styles.editActions}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={styles.microBtn}
                                onClick={() => handleToggleEdit(item.id)}
                              >
                                {t('quicksetup_edit_done_btn')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={styles.itemRow}>
                          <label style={styles.itemLeftLabel}>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleSelect(item.id)}
                              style={styles.checkbox}
                            />
                            <div style={styles.itemTextGroup}>
                              <div style={styles.badgeAndName}>
                                <span
                                  style={{
                                    ...styles.categoryBadge,
                                    backgroundColor: catStyle.bg,
                                    color: catStyle.color,
                                    borderColor: catStyle.border,
                                  }}
                                >
                                  {t(`category_${item.category}` as TranslationKey)}
                                </span>

                                <span style={styles.componentName}>
                                  {item.manufacturer} {item.model}
                                </span>

                                {/* Smart Diff: badge già presente */}
                                {item.alreadyInstalled && (
                                  <span style={styles.badgeAlreadyInstalled}>
                                    {t('quicksetup_already_installed')}
                                  </span>
                                )}

                                {/* Badge iGPU Integrata */}
                                {item.isIntegrated && (
                                  <span style={styles.badgeIGPU}>
                                    {t('quicksetup_igpu_badge')}
                                  </span>
                                )}

                                {/* Specifiche arricchite (VRAM, BIOS, Threads, NVMe) */}
                                {item.category === 'gpu' && item.capacity && (
                                  <span style={{ ...styles.specBadge, color: 'var(--accent-emerald)' }}>
                                    {item.capacity} VRAM
                                  </span>
                                )}
                                {item.extraDetails?.bios_version && (
                                  <span style={styles.specBadge}>
                                    BIOS v{item.extraDetails.bios_version}
                                  </span>
                                )}
                                {item.extraDetails?.logical_processors && (
                                  <span style={styles.specBadge}>
                                    {item.extraDetails.logical_processors} Threads
                                  </span>
                                )}
                                {item.extraDetails?.interface && (
                                  <span style={styles.specBadge}>
                                    {item.extraDetails.interface}
                                  </span>
                                )}
                              </div>

                              <span style={styles.sourceText}>
                                {t('quicksetup_source_label')} {item.source}
                                {item.capacity && item.category !== 'gpu' ? ` • ${item.capacity}` : ''}
                                {item.purchasePrice ? ` • ${t('quicksetup_price_label')} €${item.purchasePrice}` : ''}
                              </span>
                            </div>
                          </label>

                          <button
                            type="button"
                            className="btn btn-outline"
                            style={styles.editBtn}
                            onClick={() => handleToggleEdit(item.id)}
                            title={t('quicksetup_edit_btn')}
                          >
                            <Pencil size={13} />
                            {t('quicksetup_edit_btn')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sezione Quick-Add per Componenti Non Rilevabili (Case, PSU, Cooling) */}
            <div style={styles.manualAccordionBox}>
              <button
                type="button"
                style={styles.manualAccordionToggle}
                onClick={() => setShowManualSection((prev) => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={15} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {t('quicksetup_manual_accordion_title')}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>
                  {showManualSection ? t('quicksetup_manual_accordion_close') : t('quicksetup_manual_accordion_open')}
                </span>
              </button>

              {showManualSection && (
                <div style={styles.manualFormContainer}>
                  {manualItems.map((m, idx) => (
                    <div key={m.category} style={styles.manualItemRow}>
                      <label style={styles.manualCheckLabel}>
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={(e) => handleUpdateManualField(idx, 'enabled', e.target.checked)}
                          style={styles.checkbox}
                        />
                        <span style={styles.manualCategoryLabel}>{m.label}</span>
                      </label>

                      {m.enabled && (
                        <div style={styles.manualInputsGroup}>
                          <input
                            type="text"
                            placeholder={t('quicksetup_manual_brand_placeholder')}
                            value={m.brand}
                            onChange={(e) => handleUpdateManualField(idx, 'brand', e.target.value)}
                            className="form-input"
                            style={styles.microInput}
                          />
                          <input
                            type="text"
                            placeholder={t('quicksetup_manual_model_placeholder')}
                            value={m.model}
                            onChange={(e) => handleUpdateManualField(idx, 'model', e.target.value)}
                            className="form-input"
                            style={styles.microInput}
                          />
                          <input
                            type="number"
                            placeholder={t('quicksetup_manual_price_placeholder')}
                            value={m.price}
                            onChange={(e) => handleUpdateManualField(idx, 'price', e.target.value)}
                            className="form-input"
                            style={{ ...styles.microInput, maxWidth: '120px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pulsanti di azione */}
            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSkipEntireSetup}
              >
                {t('quicksetup_skip_import')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleConfirmImport}
                disabled={isSubmitting || totalToImport === 0}
              >
                {isSubmitting
                  ? t('quicksetup_saving')
                  : t('quicksetup_import_components_btn', { count: totalToImport })}
                <Check size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Completamento */}
        {step === 5 && (
          <div style={styles.stepContent}>
            <div style={styles.completeIconWrap}>
              <CheckCircle2 size={48} color="var(--accent-emerald)" />
            </div>

            <div style={styles.heroText}>
              <h2 style={styles.heroTitle}>{t('quicksetup_step5_hero_title')}</h2>
              <p style={styles.heroDescription}>
                {t('quicksetup_step5_hero_desc', { rigName, count: importedCount })}
              </p>
            </div>

            <div style={styles.summaryStatsRow}>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>{importedCount}</span>
                <span style={styles.summaryStatLabel}>{t('quicksetup_step5_stat_imported')}</span>
              </div>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>0</span>
                <span style={styles.summaryStatLabel}>{t('quicksetup_step5_stat_fake')}</span>
              </div>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>100%</span>
                <span style={styles.summaryStatLabel}>{t('quicksetup_step5_stat_local')}</span>
              </div>
            </div>

            <div style={styles.buttonRowCenter}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ ...styles.actionBtn, minWidth: '220px' }}
                onClick={handleFinalFinish}
                autoFocus
              >
                {t('quicksetup_step5_finish_btn')}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  heroBadge: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-xl)',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  heroText: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  heroTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  heroDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  guaranteeBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
  },
  guaranteeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    gap: '12px',
  },
  buttonRowCenter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px',
  },
  actionBtn: {
    padding: '10px 20px',
  },
  skipBtn: {
    fontSize: '13px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: 'var(--radius-md)',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  scanChecklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px 0',
  },
  scanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    transition: 'opacity 0.2s ease',
  },
  scanRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  scanRowName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  badgeSuccess: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--accent-emerald)',
  },
  badgeLoading: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--accent-primary)',
  },
  badgePending: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  progressBarWrapper: {
    height: '4px',
    backgroundColor: 'var(--border-subtle)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--accent-primary)',
    transition: 'width 0.3s ease',
  },
  disclaimerBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  disclaimerText: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    margin: 0,
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--text-secondary)',
  },
  itemCard: {
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    padding: '10px 12px',
    transition: 'border-color 0.15s ease, opacity 0.15s ease',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  itemLeftLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--accent-primary)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  itemTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  badgeAndName: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  badgeAlreadyInstalled: {
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-subtle)',
  },
  badgeIGPU: {
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: 'var(--accent-amber)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  specBadge: {
    fontSize: '10.5px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-surface-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    fontFamily: 'var(--font-mono)',
  },
  componentName: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sourceText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  editBtn: {
    padding: '4px 8px',
    fontSize: '11.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  editCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  editRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  microLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '2px',
    display: 'block',
  },
  microInput: {
    padding: '6px 10px',
    fontSize: '12.5px',
    width: '100%',
  },
  editActions: {
    display: 'flex',
    alignItems: 'flex-end',
  },
  microBtn: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  manualAccordionBox: {
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  manualAccordionToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  manualFormContainer: {
    padding: '12px 14px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'var(--bg-surface)',
  },
  manualItemRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  manualCheckLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  manualCategoryLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  manualInputsGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr 1fr',
    gap: '8px',
    paddingLeft: '26px',
  },
  completeIconWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '10px 0',
  },
  summaryStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    textAlign: 'center',
  },
  summaryStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryStatVal: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    fontFamily: 'var(--font-mono)',
  },
  summaryStatLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
};
