import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../common/Modal';
import {
  Component,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_STATUS_LABELS,
  Upgrade,
} from '../../types';
import { usePCStore } from '../../store';
import { formatDate as formatWithSettings } from '../../utils';
import { VALID_CATEGORIES } from '../../domain/validators';
import {
  ArrowRight,
  Sparkles,
  AlertCircle,
  Package,
  Wrench,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';

interface UpgradeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedOldComponent?: Component | null;
  onSuccess?: (upgrade: Upgrade) => void;
  onBack?: () => void;
}

export const UpgradeWizardModal: React.FC<UpgradeWizardModalProps> = ({
  isOpen,
  onClose,
  preSelectedOldComponent,
  onSuccess,
  onBack,
}) => {
  const {
    components,
    events,
    getComponentComputed,
    getNonTerminalComponents,
    executeUpgrade,
    settings,
  } = usePCStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus al primo elemento interattivo del nuovo step al cambio passaggio
  useEffect(() => {
    if (isOpen && stepContainerRef.current) {
      const focusTimer = setTimeout(() => {
        if (!stepContainerRef.current) return;
        const focusable = stepContainerRef.current.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        focusable?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [currentStep, isOpen]);

  // STEP 1: Vecchio componente
  const [oldComponentId, setOldComponentId] = useState<string>('');

  // STEP 2: Nuovo componente
  const [newMode, setNewMode] = useState<'existing' | 'new'>('new');
  const [existingNewComponentId, setExistingNewComponentId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newBrand, setNewBrand] = useState<string>('');
  const [newModel, setNewModel] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ComponentCategory>('gpu');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newStore, setNewStore] = useState<string>('');
  const [newCondition, setNewCondition] = useState<'new' | 'used'>('new');
  const [newWarranty, setNewWarranty] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // STEP 3: Economia & Dati
  const [upgradeDate, setUpgradeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slotOrLocation, setSlotOrLocation] = useState<string>('');
  const [upgradeNotes, setUpgradeNotes] = useState<string>('');
  const [saleOldComponent, setSaleOldComponent] = useState<boolean>(false);
  const [salePrice, setSalePrice] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<string>('');
  const [fees, setFees] = useState<string>('');
  const [salePlatform, setSalePlatform] = useState<string>('');
  const [saleBuyer, setSaleBuyer] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Stato di invio e gestione errori
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Componenti sostituibili: solo non terminali (IN_USE o IN_STORAGE)
  const nonTerminalComponents = useMemo(() => {
    return getNonTerminalComponents();
  }, [components, events]);

  // Componenti disponibili in magazzino per la modalità "Scegli dal magazzino"
  const availableStoredComponents = useMemo(() => {
    return components.filter((c) => {
      if (c.id === oldComponentId) return false;
      const status = getComponentComputed(c.id)?.status;
      return status === 'IN_STORAGE';
    });
  }, [components, oldComponentId, getComponentComputed]);

  // Reset dello stato quando il modal si apre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError('');
      setIsSubmitting(false);

      if (preSelectedOldComponent) {
        setOldComponentId(preSelectedOldComponent.id);
        setNewCategory(preSelectedOldComponent.category);
      } else if (nonTerminalComponents.length > 0) {
        setOldComponentId(nonTerminalComponents[0].id);
        setNewCategory(nonTerminalComponents[0].category);
      } else {
        setOldComponentId('');
      }

      setNewMode('new');
      setExistingNewComponentId('');
      setNewName('');
      setNewBrand('');
      setNewModel('');
      setNewPrice('');
      setNewStore('');
      setNewCondition('new');
      setNewWarranty('');
      setNewNotes('');

      setUpgradeDate(new Date().toISOString().split('T')[0]);
      setSlotOrLocation('');
      setUpgradeNotes('');
      setSaleOldComponent(false);
      setSalePrice('');
      setShippingCost('');
      setFees('');
      setSalePlatform('');
      setSaleBuyer('');
      setSaleNotes('');
    }
  }, [isOpen, preSelectedOldComponent]);

  // Dettagli del vecchio componente selezionato
  const selectedOldComp = components.find((c) => c.id === oldComponentId);
  const oldCompComputed = selectedOldComp ? getComponentComputed(selectedOldComp.id) : undefined;
  const isOldInUse = oldCompComputed?.status === 'IN_USE';

  // Pre-imposta categoria e slot quando cambia il vecchio componente
  useEffect(() => {
    if (selectedOldComp) {
      setNewCategory(selectedOldComp.category);
      // Se era montato, prendi lo slot dell'ultimo install
      const oldEvents = events.filter((e) => e.componentId === selectedOldComp.id);
      const lastInstall = oldEvents
        .filter((e) => e.type === 'INSTALL')
        .pop();
      if (lastInstall && 'slotOrLocation' in lastInstall && lastInstall.slotOrLocation) {
        setSlotOrLocation(lastInstall.slotOrLocation);
      }
    }
  }, [oldComponentId, selectedOldComp]);

  // Calcolo economico live derivato dal domain layer
  const calculatedNewCost = useMemo(() => {
    if (newMode === 'new') {
      return parseFloat(newPrice) || 0;
    }
    if (newMode === 'existing' && existingNewComponentId) {
      const newCompEvents = events.filter((e) => e.componentId === existingNewComponentId);
      return newCompEvents.reduce((acc, ev) => {
        if (ev.type === 'PURCHASE') return acc + (ev.price || 0);
        if (ev.type === 'EXTRA_EXPENSE') return acc + (ev.amount || 0);
        return acc;
      }, 0);
    }
    return 0;
  }, [newMode, newPrice, existingNewComponentId, events]);

  const calculatedOldRecovered = useMemo(() => {
    if (!saleOldComponent) return 0;
    const price = parseFloat(salePrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const platformFees = parseFloat(fees) || 0;
    return Math.max(0, price - shipping - platformFees);
  }, [saleOldComponent, salePrice, shippingCost, fees]);

  const calculatedNetUpgradeCost = calculatedNewCost - calculatedOldRecovered;

  // Validazione Step 1
  const handleNextFromStep1 = () => {
    setError('');
    if (!oldComponentId) {
      setError('Seleziona il componente da sostituire.');
      return;
    }
    setCurrentStep(2);
  };

  // Validazione Step 2
  const handleNextFromStep2 = () => {
    setError('');
    if (newMode === 'existing') {
      if (!existingNewComponentId) {
        setError('Seleziona un componente esistente dal magazzino.');
        return;
      }
      if (existingNewComponentId === oldComponentId) {
        setError('Il nuovo componente non può coincidere con il componente da sostituire.');
        return;
      }
    } else {
      if (!newName.trim() || newName.trim().length < 2) {
        setError('Inserisci il nome del nuovo componente (almeno 2 caratteri).');
        return;
      }
      if (newPrice.trim() !== '' && (isNaN(parseFloat(newPrice)) || parseFloat(newPrice) < 0)) {
        setError('Il prezzo di acquisto deve essere un numero valido non negativo.');
        return;
      }
    }
    setCurrentStep(3);
  };

  // Validazione Step 3
  const handleNextFromStep3 = () => {
    setError('');
    if (!upgradeDate) {
      setError('La data dell’upgrade è obbligatoria.');
      return;
    }
    if (saleOldComponent) {
      const price = parseFloat(salePrice);
      if (salePrice.trim() === '' || isNaN(price) || price < 0) {
        setError('Inserisci un prezzo di vendita valido per il vecchio componente.');
        return;
      }
      const shipping = parseFloat(shippingCost);
      if (shippingCost.trim() !== '' && (isNaN(shipping) || shipping < 0)) {
        setError('Le spese di spedizione non possono essere negative.');
        return;
      }
      const feeVal = parseFloat(fees);
      if (fees.trim() !== '' && (isNaN(feeVal) || feeVal < 0)) {
        setError('Le commissioni non possono essere negative.');
        return;
      }
    }
    setCurrentStep(4);
  };

  // Esecuzione Commit Atomico (Step 4)
  const handleExecuteUpgrade = async () => {
    if (isSubmitting) return; // Protezione doppio invio
    setError('');

    try {
      setIsSubmitting(true);

      const createdUpgrade = await executeUpgrade({
        oldComponentId,
        mode: newMode,
        newComponentId: newMode === 'existing' ? existingNewComponentId : undefined,
        newComponentData:
          newMode === 'new'
            ? {
                name: newName.trim(),
                brand: newBrand.trim(),
                model: newModel.trim(),
                category: newCategory,
                purchasePrice: newPrice.trim() !== '' ? parseFloat(newPrice) : undefined,
                store: newStore.trim() || undefined,
                condition: newCondition,
                warrantyExpiryDate: newWarranty || undefined,
                notes: newNotes.trim() || undefined,
              }
            : undefined,
        date: upgradeDate,
        slotOrLocation: slotOrLocation.trim() || undefined,
        notes: upgradeNotes.trim() || undefined,
        saleOldComponent,
        salePrice: saleOldComponent ? parseFloat(salePrice) || 0 : undefined,
        shippingCost: saleOldComponent && shippingCost.trim() !== '' ? parseFloat(shippingCost) : undefined,
        fees: saleOldComponent && fees.trim() !== '' ? parseFloat(fees) : undefined,
        platform: saleOldComponent ? salePlatform.trim() || undefined : undefined,
        buyer: saleOldComponent ? saleBuyer.trim() || undefined : undefined,
        saleNotes: saleOldComponent ? saleNotes.trim() || undefined : undefined,
      });

      onClose();
      onSuccess?.(createdUpgrade);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedNewExistingComp = components.find((c) => c.id === existingNewComponentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onBack={currentStep === 1 ? onBack : undefined}
      title="Wizard Cambio Generazionale / Upgrade"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Step Indicator Header Sottile & Segmentato */}
        <div
          className="wizard-step-indicator"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuetext={`Passaggio ${currentStep} di 4: ${
            currentStep === 1
              ? 'Vecchio Pezzo'
              : currentStep === 2
              ? 'Nuovo Pezzo'
              : currentStep === 3
              ? 'Economia'
              : 'Conferma'
          }`}
        >
          {[
            { num: 1, label: 'Vecchio Pezzo' },
            { num: 2, label: 'Nuovo Pezzo' },
            { num: 3, label: 'Economia' },
            { num: 4, label: 'Conferma' },
          ].map((s) => {
            const isCompleted = currentStep > s.num;
            const isActive = currentStep === s.num;

            return (
              <div key={s.num} className="wizard-step-segment">
                <div
                  className={`wizard-step-bar ${
                    isCompleted
                      ? 'wizard-step-bar-completed'
                      : isActive
                      ? 'wizard-step-bar-active'
                      : ''
                  }`}
                />
                <div
                  className={`wizard-step-meta ${
                    isCompleted
                      ? 'wizard-step-meta-completed'
                      : isActive
                      ? 'wizard-step-meta-active'
                      : ''
                  }`}
                >
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    {isCompleted ? '✓' : `${s.num}.`}
                  </span>
                  <span>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="form-error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Selezione Componente da Sostituire */}
        {currentStep === 1 && (
          <div ref={stepContainerRef} className="wizard-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Scegli il componente attualmente nel PC o conservato a magazzino che intendi sostituire:
            </p>

            {nonTerminalComponents.length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--accent-amber-subtle)',
                  color: 'var(--accent-amber)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                }}
              >
                Nessun componente attivo o a magazzino disponibile per l'upgrade.
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  Componente da Sostituire <span className="form-required">*</span>
                </label>
                <select
                  className="form-select"
                  value={oldComponentId}
                  onChange={(e) => setOldComponentId(e.target.value)}
                >
                  {nonTerminalComponents.map((c) => {
                    const computed = getComponentComputed(c.id);
                    const status = computed ? COMPONENT_STATUS_LABELS[computed.status] : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.brand}) — [{status}]
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Scheda riassuntiva del vecchio pezzo selezionato */}
            {selectedOldComp && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="category-chip">
                    {COMPONENT_CATEGORY_LABELS[selectedOldComp.category]}
                  </span>
                  {oldCompComputed && (
                    <span
                      className={`badge ${oldCompComputed.status === 'IN_USE' ? 'badge-in-use' : 'badge-in-storage'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {COMPONENT_STATUS_LABELS[oldCompComputed.status]}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedOldComp.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedOldComp.brand} {selectedOldComp.model && `• ${selectedOldComp.model}`}
                </div>

                {oldCompComputed && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Costo storico d'acquisto: <span className="font-mono">€ {oldCompComputed.totalPurchaseCost.toFixed(2)}</span>
                  </div>
                )}

                {isOldInUse ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                    <Wrench size={13} />
                    <span>Attualmente montato nel PC. Verrà automaticamente smontato dal rig.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-amber)', marginTop: '4px' }}>
                    <Package size={13} />
                    <span>Attualmente conservato a magazzino.</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              {onBack ? (
                <button type="button" className="btn btn-secondary" onClick={onBack}>
                  Indietro
                </button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Annulla
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextFromStep1}
                disabled={!oldComponentId}
              >
                <span>Avanti: Seleziona Nuovo</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Selezione o Creazione Nuovo Componente */}
        {currentStep === 2 && (
          <div ref={stepContainerRef} className="wizard-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Modalità Switch: Magazzino vs Nuovo Acquisto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setNewMode('new')}
                className="card-interactive"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: newMode === 'new' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: newMode === 'new' ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                  color: newMode === 'new' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                <Sparkles size={16} />
                <span>Nuovo Acquisto</span>
              </button>

              <button
                type="button"
                onClick={() => setNewMode('existing')}
                className="card-interactive"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: newMode === 'existing' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: newMode === 'existing' ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                  color: newMode === 'existing' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                <Package size={16} />
                <span>Pezzo dal Magazzino ({availableStoredComponents.length})</span>
              </button>
            </div>

            {/* Sottocaso: Scegli dal Magazzino */}
            {newMode === 'existing' ? (
              availableStoredComponents.length === 0 ? (
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--accent-amber-subtle)',
                    color: 'var(--accent-amber)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    lineHeight: 1.4,
                  }}
                >
                  Nessun pezzo disponibile attualmente a magazzino. Passa alla modalità <strong>Nuovo Acquisto</strong> per registrare il componente subentrante.
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    Componente dal Magazzino <span className="form-required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={existingNewComponentId}
                    onChange={(e) => setExistingNewComponentId(e.target.value)}
                  >
                    <option value="">-- Seleziona pezzo da magazzino --</option>
                    {availableStoredComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.brand}) — [{COMPONENT_CATEGORY_LABELS[c.category]}]
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : (
              /* Sottocaso: Nuovo Acquisto */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Nome Nuovo Pezzo <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="es. GeForce RTX 5070"
                      className="form-input"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select
                      className="form-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as ComponentCategory)}
                    >
                      {VALID_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {COMPONENT_CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input
                      type="text"
                      placeholder="es. MSI, ASUS, Corsair"
                      className="form-input"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Modello / Specifiche</label>
                    <input
                      type="text"
                      placeholder="es. Gaming OC 16GB"
                      className="form-input"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Prezzo Acquisto (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="es. 649.00"
                      className="form-input font-mono"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Negozio / Store</label>
                    <input
                      type="text"
                      placeholder="es. Amazon, LDLC, Usato"
                      className="form-input"
                      value={newStore}
                      onChange={(e) => setNewStore(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                Indietro
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNextFromStep2}>
                <span>Avanti: Economia & Data</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Economia, Data e Vendita Contestuale */}
        {currentStep === 3 && (
          <div ref={stepContainerRef} className="wizard-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">
                  Data Upgrade <span className="form-required">*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={upgradeDate}
                  onChange={(e) => setUpgradeDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slot / Posizione Montaggio</label>
                <input
                  type="text"
                  placeholder="es. PCIe Slot 1, Socket LGA 1700"
                  className="form-input"
                  value={slotOrLocation}
                  onChange={(e) => setSlotOrLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Checkbox Vendita Contestuale Vecchio Componente */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saleOldComponent}
                  onChange={(e) => setSaleOldComponent(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ho venduto contestualmente il vecchio componente ({selectedOldComp?.name})
                </span>
              </label>

              {saleOldComponent && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Prezzo Lordo (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="es. 300.00"
                        className="form-input font-mono"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Spedizione (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="es. 10.00"
                        className="form-input font-mono"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Commissioni (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="es. 15.00"
                        className="form-input font-mono"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Piattaforma</label>
                      <input
                        type="text"
                        placeholder="es. Subito, eBay, Subito.it"
                        className="form-input"
                        value={salePlatform}
                        onChange={(e) => setSalePlatform(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Acquirente</label>
                      <input
                        type="text"
                        placeholder="es. Marco R."
                        className="form-input"
                        value={saleBuyer}
                        onChange={(e) => setSaleBuyer(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Note Generali sull'Upgrade */}
            <div className="form-group">
              <label className="form-label">Note Generali sull'Upgrade (opzionale)</label>
              <textarea
                rows={2}
                placeholder="es. Passaggio generazionale per gaming in 4K a 144Hz..."
                className="form-textarea"
                value={upgradeNotes}
                onChange={(e) => setUpgradeNotes(e.target.value)}
              />
            </div>

            {/* Live Preview Economica Derivata */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Costo Nuovo
                </div>
                <div className="font-mono" style={{ fontSize: '15px', color: 'var(--accent-ruby)', fontWeight: 600 }}>
                  € {calculatedNewCost.toFixed(2)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Recupero Vecchio
                </div>
                <div className="font-mono" style={{ fontSize: '15px', color: calculatedOldRecovered > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {calculatedOldRecovered > 0 ? `+ € ${calculatedOldRecovered.toFixed(2)}` : '€ 0,00'}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Costo Netto Upgrade
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: '17px',
                    color: calculatedNetUpgradeCost <= 0 ? 'var(--accent-emerald)' : 'var(--text-primary)',
                    fontWeight: 700,
                  }}
                >
                  € {calculatedNetUpgradeCost.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                Indietro
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNextFromStep3}>
                <span>Avanti: Riepilogo & Conferma</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Riepilogo e Commit Atomico */}
        {currentStep === 4 && (
          <div ref={stepContainerRef} className="wizard-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Verifica il riepilogo prima di confermare e salvare il cambio generazionale:
            </p>

            {/* Confronto VECCHIO → NUOVO */}
            <div className="upgrade-transition-row" style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {/* Box Vecchio */}
              <div className="upgrade-component-box">
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Componente Precedente
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'break-word' }}>
                  {selectedOldComp?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedOldComp?.brand} {selectedOldComp?.model && `• ${selectedOldComp.model}`}
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {saleOldComponent ? (
                    <span>Recupero: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>+ € {calculatedOldRecovered.toFixed(2)}</strong></span>
                  ) : (
                    <span>Costo storico: <span className="font-mono">€ {(oldCompComputed?.totalPurchaseCost || 0).toFixed(2)}</span></span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: saleOldComponent ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginTop: '2px', fontWeight: 500 }}>
                  Destinazione: <strong>{saleOldComponent ? 'Venduto contestualmente' : 'A magazzino (In Storage)'}</strong>
                </div>
              </div>

              {/* Indicatore Transizione */}
              <div className="upgrade-arrow-badge">
                <div className="upgrade-arrow-badge-icon">
                  <ArrowRight size={16} />
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Sostituito con
                </span>
              </div>

              {/* Box Nuovo */}
              <div className="upgrade-component-box" style={{ borderColor: 'var(--border-default)' }}>
                <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Componente Subentrante
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'break-word' }}>
                  {newMode === 'new' ? newName : selectedNewExistingComp?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {newMode === 'new' ? `${newBrand} • ${newModel}` : `${selectedNewExistingComp?.brand} • ${selectedNewExistingComp?.model}`}
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Acquisto: <strong className="font-mono" style={{ color: 'var(--accent-ruby)' }}>€ {calculatedNewCost.toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px', fontWeight: 500 }}>
                  Destinazione: <strong>Installato nel PC (In Uso)</strong>
                </div>
              </div>
            </div>

            {/* Dettagli Operazione & Eventuale Vendita */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: saleOldComponent ? '1fr 1fr' : '1fr',
                gap: '10px',
              }}
            >
              {/* Box Operazione */}
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Operazione di Sostituzione
                </span>
                <div>
                  Data: <strong>{formatWithSettings(upgradeDate, settings.dateFormat)}</strong>
                </div>
                <div>
                  Slot / Socket: <strong>{slotOrLocation.trim() || 'Non specificato'}</strong>
                </div>
                {upgradeNotes.trim() && (
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Note: <em>{upgradeNotes.trim()}</em>
                  </div>
                )}
              </div>

              {/* Box Vendita (solo se presente) */}
              {saleOldComponent && (
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontSize: '10.5px', color: 'var(--accent-emerald)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Vendita Contestuale Vecchio
                  </span>
                  <div>
                    Lordo: <strong className="font-mono">€ {parseFloat(salePrice || '0').toFixed(2)}</strong>
                    {(parseFloat(shippingCost || '0') > 0 || parseFloat(fees || '0') > 0) && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>
                        (Sped: € {parseFloat(shippingCost || '0').toFixed(2)} | Comm: € {parseFloat(fees || '0').toFixed(2)})
                      </span>
                    )}
                  </div>
                  <div>
                    Recupero netto: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>+ € {calculatedOldRecovered.toFixed(2)}</strong>
                  </div>
                  {(salePlatform || saleBuyer) && (
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Canale: {salePlatform || 'Diretto'} {saleBuyer ? `• Acquirente: ${saleBuyer}` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Risultato Economico Finale */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Costo Netto Upgrade
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Costo nuovo (€ {calculatedNewCost.toFixed(2)}) − Recupero vecchio (€ {calculatedOldRecovered.toFixed(2)})
                </div>
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: calculatedNetUpgradeCost <= 0 ? 'var(--accent-emerald)' : 'var(--text-primary)',
                }}
              >
                € {calculatedNetUpgradeCost.toFixed(2)}
              </div>
            </div>

            {/* Nota Checkpoint Discreta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
              }}
            >
              <Bookmark size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>
                Dopo la registrazione potrai salvare questa nuova configurazione come Checkpoint milestone nella cronologia storica del PC.
              </span>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(3)}
                disabled={isSubmitting}
              >
                Indietro
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteUpgrade}
                disabled={isSubmitting}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Registrazione Atomica in corso...' : 'Conferma ed Esegui Upgrade'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
