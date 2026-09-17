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
} from 'lucide-react';
import { ComponentCategory } from '../../types';
import { usePCStore, QuickSetupImportItem } from '../../store';
import { detectHardware, DetectedComponent } from '../../services';

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface EditableDetectedItem extends DetectedComponent {
  id: string;
  selected: boolean;
  isEditing?: boolean;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  cpu: 'Processore (CPU)',
  gpu: 'Scheda Video (GPU)',
  ram: 'Memoria RAM',
  storage: 'Disco / SSD',
  motherboard: 'Scheda Madre',
  psu: 'Alimentatore',
  case: 'Case',
  cooling: 'Dissipatore',
  monitor: 'Monitor',
  peripherals: 'Periferica',
  accessories: 'Accessorio',
  other: 'Altro',
};

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

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { settings, updateSettings, importQuickSetupData } = usePCStore();

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
    }
  }, [isOpen]);

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
      const mapped: EditableDetectedItem[] = rawDetected.map((item, idx) => ({
        ...item,
        id: `detected-${idx}-${item.category}`,
        selected: true,
        isEditing: false,
      }));

      // Assicura almeno 1.4 secondi per percepire la scansione senza lag eccessivo
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
    field: 'brand' | 'model' | 'category',
    val: string
  ) => {
    setDetectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'brand') return { ...item, manufacturer: val };
        if (field === 'model') return { ...item, model: val };
        if (field === 'category') return { ...item, category: val as ComponentCategory };
        return item;
      })
    );
  };

  const handleConfirmImport = async () => {
    try {
      setIsSubmitting(true);
      const selected = detectedItems.filter((i) => i.selected);

      const itemsToImport: QuickSetupImportItem[] = selected.map((item) => ({
        category: item.category,
        brand: item.manufacturer.trim() || 'Generic',
        model: item.model.trim() || 'Hardware Component',
        serialNumber: item.serialNumber,
        notes: `Rilevato tramite ${item.source}`,
      }));

      await importQuickSetupData({
        rigName: rigName.trim() || 'Gaming PC',
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
        return 'Benvenuto in PC Tracker';
      case 2:
        return 'Identifica il tuo PC';
      case 3:
        return 'Scansione Hardware in Corso...';
      case 4:
        return 'Hardware Rilevato';
      case 5:
        return 'Il tuo PC è pronto!';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return 'Il tuo storico hardware, finalmente organizzato.';
      case 2:
        return 'Configuriamo le informazioni di base del tuo computer.';
      case 3:
        return 'Analisi locale in corso tramite Windows. Nessun dato cloud.';
      case 4:
        return `${detectedItems.length} componenti identificati automaticamente`;
      case 5:
        return 'Configurazione iniziale completata con successo.';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkipEntireSetup}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      maxWidth="620px"
      onBack={step === 2 ? () => setStep(1) : undefined}
      backTitle={step === 2 ? 'Indietro' : undefined}
    >
      <div style={styles.container}>
        {/* STEP 1: Benvenuto */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <div style={styles.heroBadge}>
              <Cpu size={36} color="var(--accent-primary)" />
            </div>

            <div style={styles.heroText}>
              <h2 style={styles.heroTitle}>Configuriamo il tuo PC in meno di 2 minuti</h2>
              <p style={styles.heroDescription}>
                PC Tracker analizzerà localmente il tuo computer Windows per riconoscere
                processore, scheda video, memoria, dischi e scheda madre.
              </p>
            </div>

            <div style={styles.guaranteeBox}>
              <div style={styles.guaranteeItem}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span><strong>100% Locale</strong>: nessun dato inviato a server esterni o cloud.</span>
              </div>
              <div style={styles.guaranteeItem}>
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span><strong>Nessun dato inventato</strong>: confermi tu ogni componente prima del salvataggio.</span>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                style={styles.skipBtn}
                onClick={handleSkipEntireSetup}
              >
                Salta e configura a mano
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleStartSetup}
                autoFocus
              >
                Inizia configurazione
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Setup Personale */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <div style={styles.formGroup}>
              <label htmlFor="quick-setup-rigname" style={styles.label}>
                Nome del PC
              </label>
              <input
                id="quick-setup-rigname"
                type="text"
                className="form-input"
                style={styles.input}
                value={rigName}
                onChange={(e) => setRigName(e.target.value)}
                placeholder="Es. Gaming PC"
                autoFocus
              />
              <span style={styles.hint}>Il nome che identifica la tua postazione principale.</span>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="quick-setup-description" style={styles.label}>
                Descrizione (Opzionale)
              </label>
              <input
                id="quick-setup-description"
                type="text"
                className="form-input"
                style={styles.input}
                value={rigDescription}
                onChange={(e) => setRigDescription(e.target.value)}
                placeholder="Es. PC principale da gaming e produttività"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="quick-setup-buildyear" style={styles.label}>
                Anno di Assemblaggio / Build
              </label>
              <input
                id="quick-setup-buildyear"
                type="number"
                min="2000"
                max={currentYear + 1}
                className="form-input"
                style={styles.input}
                value={buildYear}
                onChange={(e) => setBuildYear(parseInt(e.target.value, 10) || currentYear)}
              />
              <span style={styles.hint}>
                Usato per impostare la data dei primi eventi di installazione nel tuo PC.
              </span>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                Indietro
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleRunScan}
              >
                Rileva hardware
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Rilevamento in Corso */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <div style={styles.scanChecklist}>
              {[
                { name: 'Processore (CPU)', icon: <Cpu size={18} /> },
                { name: 'Scheda Video (GPU)', icon: <Monitor size={18} /> },
                { name: 'Memoria RAM', icon: <Layers size={18} /> },
                { name: 'Dischi Storage', icon: <HardDrive size={18} /> },
                { name: 'Scheda Madre', icon: <Sparkles size={18} /> },
              ].map((item, idx) => {
                const isPassed = scanStepIndex > idx;
                const isCurrent = scanStepIndex === idx;

                return (
                  <div
                    key={item.name}
                    style={{
                      ...styles.scanRow,
                      opacity: isPassed || isCurrent ? 1 : 0.4,
                    }}
                  >
                    <div style={styles.scanRowLeft}>
                      <span style={{ color: isPassed ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        {item.icon}
                      </span>
                      <span style={styles.scanRowName}>{item.name}</span>
                    </div>
                    <div>
                      {isPassed ? (
                        <span style={styles.badgeSuccess}>
                          <Check size={14} /> Trovato
                        </span>
                      ) : isCurrent ? (
                        <span style={styles.badgeLoading}>Analisi...</span>
                      ) : (
                        <span style={styles.badgePending}>In coda</span>
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
            {/* Disclaimer onesto su componenti non rilevati automaticamente */}
            <div style={styles.disclaimerBox}>
              <AlertCircle size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
              <p style={styles.disclaimerText}>
                <strong>Alimentatore, case, dissipatore e periferiche</strong> puoi aggiungerli manualmente
                in qualsiasi momento: Windows non ne conosce i modelli con certezza e noi non inventiamo dati.
              </p>
            </div>

            {/* Lista componenti rilevati con checkbox e modifica inline */}
            <div style={styles.itemsList}>
              {detectedItems.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>Nessun componente rilevato automaticamente.</p>
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
                        opacity: item.selected ? 1 : 0.6,
                      }}
                    >
                      {item.isEditing ? (
                        <div style={styles.editCardContent}>
                          <div style={styles.editRow}>
                            <div style={{ flex: 1 }}>
                              <label style={styles.microLabel}>Produttore</label>
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
                              <label style={styles.microLabel}>Modello</label>
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
                              <label style={styles.microLabel}>Categoria</label>
                              <select
                                className="form-input"
                                value={item.category}
                                onChange={(e) =>
                                  handleUpdateItemField(item.id, 'category', e.target.value)
                                }
                                style={styles.microInput}
                              >
                                {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                                  <option key={catKey} value={catKey}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div style={styles.editActions}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={styles.microBtn}
                                onClick={() => handleToggleEdit(item.id)}
                              >
                                Fatto
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
                                  {CATEGORY_LABELS[item.category] || item.category}
                                </span>
                                <span style={styles.componentName}>
                                  {item.manufacturer} {item.model}
                                </span>
                              </div>
                              <span style={styles.sourceText}>
                                Fonte: {item.source} {item.capacity ? `• ${item.capacity}` : ''}
                              </span>
                            </div>
                          </label>

                          <button
                            type="button"
                            className="btn btn-outline"
                            style={styles.editBtn}
                            onClick={() => handleToggleEdit(item.id)}
                            title="Modifica nome o dettagli del componente"
                          >
                            <Pencil size={13} />
                            Modifica
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSkipEntireSetup}
              >
                Salta importazione
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={styles.actionBtn}
                onClick={handleConfirmImport}
                disabled={isSubmitting || detectedItems.filter((i) => i.selected).length === 0}
              >
                {isSubmitting
                  ? 'Salvataggio...'
                  : `Importa ${detectedItems.filter((i) => i.selected).length} componenti`}
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
              <h2 style={styles.heroTitle}>Il tuo PC è pronto!</h2>
              <p style={styles.heroDescription}>
                Abbiamo registrato <strong>{rigName}</strong> con {importedCount} componenti
                attualmente installati e pronti per essere tracciati.
              </p>
            </div>

            <div style={styles.summaryStatsRow}>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>{importedCount}</span>
                <span style={styles.summaryStatLabel}>Componenti importati</span>
              </div>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>0</span>
                <span style={styles.summaryStatLabel}>Dati inventati</span>
              </div>
              <div style={styles.summaryStat}>
                <span style={styles.summaryStatVal}>100%</span>
                <span style={styles.summaryStatLabel}>Locale & Privato</span>
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
                Vai al mio PC
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
    gap: '20px',
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
    gap: '8px',
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
    marginTop: '10px',
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
    padding: '12px 0',
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
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  disclaimerText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
    margin: 0,
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '340px',
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
    padding: '12px 14px',
    transition: 'border-color 0.15s ease, opacity 0.15s ease',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  itemLeftLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    gap: '4px',
    minWidth: 0,
  },
  badgeAndName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  componentName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sourceText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  editBtn: {
    padding: '4px 8px',
    fontSize: '12px',
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
  },
  microLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '2px',
    display: 'block',
  },
  microInput: {
    padding: '6px 10px',
    fontSize: '13px',
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
