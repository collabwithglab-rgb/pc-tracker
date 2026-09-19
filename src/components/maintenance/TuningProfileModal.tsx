import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { usePCStore } from '../../store';
import {
  TuningProfile,
  TuningProfileInput,
  TuningType,
  TUNING_TYPE_LABELS,
  TuningStability,
  TUNING_STABILITY_LABELS,
  ComponentCategory,
} from '../../types';
import { getLocalDateISO } from '../../domain';
import { Sliders, Cpu, Gauge, Zap, Thermometer, FileText, Plus, Trash2 } from 'lucide-react';

interface TuningProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileToEdit?: TuningProfile | null;
  initialValues?: Partial<TuningProfileInput>;
}

const CATEGORY_OPTIONS: { value: ComponentCategory; label: string }[] = [
  { value: 'cpu', label: 'CPU (Processore)' },
  { value: 'gpu', label: 'GPU (Scheda Video)' },
  { value: 'ram', label: 'RAM (Memoria)' },
  { value: 'cooling', label: 'Cooling (Dissipazione)' },
  { value: 'motherboard', label: 'Scheda Madre / BIOS' },
  { value: 'other', label: 'Altro' },
];

export const TuningProfileModal: React.FC<TuningProfileModalProps> = ({
  isOpen,
  onClose,
  profileToEdit,
  initialValues,
}) => {
  const { components, addTuningProfile, updateTuningProfile } = usePCStore();

  const [name, setName] = useState<string>('');
  const [componentId, setComponentId] = useState<string>('');
  const [category, setCategory] = useState<ComponentCategory>('cpu');
  const [date, setDate] = useState<string>(getLocalDateISO());
  const [type, setType] = useState<TuningType>('curve_optimizer');
  const [stability, setStability] = useState<TuningStability>('stable');

  // Parametri dinamici chiave-valore
  const [paramRows, setParamRows] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);

  // Temperature & Potenza
  const [tempIdle, setTempIdle] = useState<string>('');
  const [tempLoad, setTempLoad] = useState<string>('');
  const [tempAmbient, setTempAmbient] = useState<string>('');
  const [observedPowerWatts, setObservedPowerWatts] = useState<string>('');

  // Benchmark
  const [benchmarkName, setBenchmarkName] = useState<string>('');
  const [benchmarkScore, setBenchmarkScore] = useState<string>('');
  const [benchmarkNotes, setBenchmarkNotes] = useState<string>('');

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (profileToEdit) {
      setName(profileToEdit.name);
      setComponentId(profileToEdit.componentId || '');
      setCategory(profileToEdit.category);
      setDate(profileToEdit.date);
      setType(profileToEdit.type);
      setStability(profileToEdit.stability);

      const params = Object.entries(profileToEdit.parameters || {}).map(([k, v]) => ({
        key: k,
        value: String(v),
      }));
      setParamRows(params.length > 0 ? params : [{ key: '', value: '' }]);

      setTempIdle(profileToEdit.temperatures?.idle !== undefined ? String(profileToEdit.temperatures.idle) : '');
      setTempLoad(profileToEdit.temperatures?.load !== undefined ? String(profileToEdit.temperatures.load) : '');
      setTempAmbient(profileToEdit.temperatures?.ambient !== undefined ? String(profileToEdit.temperatures.ambient) : '');
      setObservedPowerWatts(profileToEdit.observedPowerWatts !== undefined ? String(profileToEdit.observedPowerWatts) : '');

      if (profileToEdit.benchmarks && profileToEdit.benchmarks.length > 0) {
        setBenchmarkName(profileToEdit.benchmarks[0].name);
        setBenchmarkScore(String(profileToEdit.benchmarks[0].score));
        setBenchmarkNotes(profileToEdit.benchmarks[0].notes || '');
      } else {
        setBenchmarkName('');
        setBenchmarkScore('');
        setBenchmarkNotes('');
      }

      setNotes(profileToEdit.notes || '');
    } else {
      setName(initialValues?.name || '');
      const initCompId = initialValues?.componentId || '';
      setComponentId(initCompId);
      const initCat = initialValues?.category || (initCompId ? components.find((c) => c.id === initCompId)?.category || 'cpu' : 'cpu');
      setCategory(initCat);
      setDate(initialValues?.date || getLocalDateISO());

      let initType: TuningType = initialValues?.type || 'curve_optimizer';
      let initParams: { key: string; value: string }[] = [{ key: 'Curve Optimizer Offset', value: '-20' }];

      if (initialValues?.parameters && Object.keys(initialValues.parameters).length > 0) {
        initParams = Object.entries(initialValues.parameters).map(([k, v]) => ({ key: k, value: String(v) }));
      } else if (initCat === 'gpu') {
        initType = 'gpu_undervolt';
        initParams = [
          { key: 'Target Voltage (mV)', value: '950' },
          { key: 'Core Clock (MHz)', value: '2650' },
        ];
      } else if (initCat === 'ram') {
        initType = 'memory_xmp_expo';
        initParams = [
          { key: 'Frequency', value: '6000 MT/s' },
          { key: 'Timings', value: 'CL30-38-38-96' },
        ];
      } else if (initCat === 'cooling') {
        initType = 'fan_profile';
        initParams = [{ key: 'Fan Curve', value: 'Silent (40% < 60°C)' }];
      } else if (initCat === 'cpu') {
        initType = 'curve_optimizer';
        initParams = [{ key: 'Curve Optimizer Offset', value: '-25' }];
      }

      setType(initType);
      setParamRows(initParams);
      setStability(initialValues?.stability || 'stable');
      setTempIdle(initialValues?.temperatures?.idle !== undefined ? String(initialValues.temperatures.idle) : '');
      setTempLoad(initialValues?.temperatures?.load !== undefined ? String(initialValues.temperatures.load) : '');
      setTempAmbient(initialValues?.temperatures?.ambient !== undefined ? String(initialValues.temperatures.ambient) : '');
      setObservedPowerWatts(initialValues?.observedPowerWatts !== undefined ? String(initialValues.observedPowerWatts) : '');
      setBenchmarkName('');
      setBenchmarkScore('');
      setBenchmarkNotes('');
      setNotes(initialValues?.notes || '');
    }
    setErrors({});
  }, [isOpen, profileToEdit, initialValues, components]);

  const handleComponentChange = (compVal: string) => {
    setComponentId(compVal);
    if (compVal) {
      const comp = components.find((c) => c.id === compVal);
      if (comp) {
        setCategory(comp.category);
        if (comp.category === 'cpu') {
          setType('curve_optimizer');
          setParamRows([{ key: 'Curve Optimizer Offset', value: '-25' }]);
        } else if (comp.category === 'gpu') {
          setType('gpu_undervolt');
          setParamRows([
            { key: 'Target Voltage (mV)', value: '950' },
            { key: 'Core Clock (MHz)', value: '2650' },
          ]);
        } else if (comp.category === 'ram') {
          setType('memory_xmp_expo');
          setParamRows([
            { key: 'Frequency', value: '6000 MT/s' },
            { key: 'Timings', value: 'CL30-38-38-96' },
          ]);
        } else if (comp.category === 'cooling') {
          setType('fan_profile');
          setParamRows([{ key: 'Fan Curve', value: 'Silent (40% < 60°C)' }]);
        }
      }
    }
  };

  const addParamRow = () => {
    setParamRows((prev) => [...prev, { key: '', value: '' }]);
  };

  const removeParamRow = (index: number) => {
    setParamRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateParamRow = (index: number, field: 'key' | 'value', val: string) => {
    setParamRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Il nome del profilo è obbligatorio.';
    }
    if (!date) {
      newErrors.date = 'La data è obbligatoria.';
    }

    // Convert parameters
    const parameters: Record<string, string | number> = {};
    for (const row of paramRows) {
      const k = row.key.trim();
      if (k) {
        const num = Number(row.value.trim().replace(',', '.'));
        parameters[k] = !isNaN(num) && row.value.trim() !== '' ? num : row.value.trim();
      }
    }

    let parsedIdle: number | undefined;
    if (tempIdle.trim()) {
      parsedIdle = parseFloat(tempIdle.replace(',', '.'));
      if (isNaN(parsedIdle)) {
        newErrors.tempIdle = 'Temperatura non valida.';
      }
    }

    let parsedLoad: number | undefined;
    if (tempLoad.trim()) {
      parsedLoad = parseFloat(tempLoad.replace(',', '.'));
      if (isNaN(parsedLoad)) {
        newErrors.tempLoad = 'Temperatura non valida.';
      }
    }

    let parsedAmbient: number | undefined;
    if (tempAmbient.trim()) {
      parsedAmbient = parseFloat(tempAmbient.replace(',', '.'));
      if (isNaN(parsedAmbient)) {
        newErrors.tempAmbient = 'Temperatura non valida.';
      }
    }

    let parsedPower: number | undefined;
    if (observedPowerWatts.trim()) {
      parsedPower = parseFloat(observedPowerWatts.replace(',', '.'));
      if (isNaN(parsedPower) || parsedPower < 0) {
        newErrors.observedPowerWatts = 'Valore di potenza non valido.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const temperatures =
        parsedIdle !== undefined || parsedLoad !== undefined || parsedAmbient !== undefined
          ? {
              idle: parsedIdle,
              load: parsedLoad,
              ambient: parsedAmbient,
            }
          : undefined;

      const benchmarks = benchmarkName.trim()
        ? [
            {
              name: benchmarkName.trim(),
              score: benchmarkScore.trim() || 'N/D',
              notes: benchmarkNotes.trim() || undefined,
            },
          ]
        : undefined;

      const payload: TuningProfileInput = {
        name: name.trim(),
        componentId: componentId || undefined,
        category,
        date,
        type,
        parameters,
        stability,
        benchmarks,
        temperatures,
        observedPowerWatts: parsedPower,
        notes: notes.trim() || undefined,
      };

      if (profileToEdit) {
        await updateTuningProfile(profileToEdit.id, payload);
      } else {
        await addTuningProfile(payload);
      }
      onClose();
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profileToEdit ? 'Modifica Profilo di Tuning' : 'Registra Profilo di Tuning'}
      subtitle="Traccia impostazioni BIOS, Curve Optimizer, Undervolt, RAM e profili ventole"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} className="form-layout" style={{ gap: '16px' }}>
        {errors.submit && (
          <div className="status-banner status-error" style={{ marginBottom: '8px' }}>
            {errors.submit}
          </div>
        )}

        {/* Riga 1: Nome Profilo & Data */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tune-name">
              <Sliders size={14} style={{ marginRight: '6px' }} />
              Nome Profilo *
            </label>
            <input
              id="tune-name"
              type="text"
              className={`input-field ${errors.name ? 'input-error' : ''}`}
              placeholder="es. AMD CO -25 All-Core, Undervolt 950mV 2650MHz..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-date">
              Data *
            </label>
            <input
              id="tune-date"
              type="date"
              className={`input-field ${errors.date ? 'input-error' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>
        </div>

        {/* Riga 2: Componente & Categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tune-component">
              <Cpu size={14} style={{ marginRight: '6px' }} />
              Componente Associato
            </label>
            <select
              id="tune-component"
              className="input-field select-field"
              value={componentId}
              onChange={(e) => handleComponentChange(e.target.value)}
            >
              <option value="">-- Nessun componente specifico --</option>
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-category">
              Categoria Hardware *
            </label>
            <select
              id="tune-category"
              className="input-field select-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as ComponentCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Riga 3: Tipologia & Stabilità */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tune-type">
              <Gauge size={14} style={{ marginRight: '6px' }} />
              Tipologia Tuning *
            </label>
            <select
              id="tune-type"
              className="input-field select-field"
              value={type}
              onChange={(e) => setType(e.target.value as TuningType)}
            >
              {(Object.keys(TUNING_TYPE_LABELS) as TuningType[]).map((t) => (
                <option key={t} value={t}>
                  {TUNING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-stability">
              Stabilità Verificata *
            </label>
            <select
              id="tune-stability"
              className="input-field select-field"
              value={stability}
              onChange={(e) => setStability(e.target.value as TuningStability)}
            >
              {(Object.keys(TUNING_STABILITY_LABELS) as TuningStability[]).map((s) => (
                <option key={s} value={s}>
                  {TUNING_STABILITY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parametri Tecnici Personalizzati (Key/Value) */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Parametri Tecnici Registrati (Offset, Frequenze, Voltaggi)
            </label>
            <button
              type="button"
              onClick={addParamRow}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              <Plus size={12} style={{ marginRight: '4px' }} />
              Aggiungi Parametro
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paramRows.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nome parametro (es. Curve Optimizer, Offset mV)"
                  value={row.key}
                  onChange={(e) => updateParamRow(idx, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Valore (es. -25, 1.25V, 2650 MHz)"
                  value={row.value}
                  onChange={(e) => updateParamRow(idx, 'value', e.target.value)}
                />
                {paramRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParamRow(idx)}
                    className="btn btn-ghost"
                    style={{ padding: '6px', color: 'var(--text-muted, #64748b)' }}
                    title="Rimuovi parametro"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Temperature & Potenza Rilevata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tune-idle">
              <Thermometer size={14} style={{ marginRight: '4px' }} />
              Idle (°C)
            </label>
            <input
              id="tune-idle"
              type="text"
              className={`input-field ${errors.tempIdle ? 'input-error' : ''}`}
              placeholder="es. 38"
              value={tempIdle}
              onChange={(e) => setTempIdle(e.target.value)}
            />
            {errors.tempIdle && <span className="error-text" style={{ fontSize: '0.7rem' }}>{errors.tempIdle}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-load">
              <Thermometer size={14} style={{ marginRight: '4px' }} />
              Load (°C)
            </label>
            <input
              id="tune-load"
              type="text"
              className={`input-field ${errors.tempLoad ? 'input-error' : ''}`}
              placeholder="es. 74"
              value={tempLoad}
              onChange={(e) => setTempLoad(e.target.value)}
            />
            {errors.tempLoad && <span className="error-text" style={{ fontSize: '0.7rem' }}>{errors.tempLoad}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-ambient">
              Ambiente (°C)
            </label>
            <input
              id="tune-ambient"
              type="text"
              className={`input-field ${errors.tempAmbient ? 'input-error' : ''}`}
              placeholder="es. 22"
              value={tempAmbient}
              onChange={(e) => setTempAmbient(e.target.value)}
            />
            {errors.tempAmbient && <span className="error-text" style={{ fontSize: '0.7rem' }}>{errors.tempAmbient}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tune-power">
              <Zap size={14} style={{ marginRight: '4px' }} />
              Potenza Max (W)
            </label>
            <input
              id="tune-power"
              type="text"
              className={`input-field ${errors.observedPowerWatts ? 'input-error' : ''}`}
              placeholder="es. 125"
              value={observedPowerWatts}
              onChange={(e) => setObservedPowerWatts(e.target.value)}
            />
            {errors.observedPowerWatts && <span className="error-text" style={{ fontSize: '0.7rem' }}>{errors.observedPowerWatts}</span>}
          </div>
        </div>

        {/* Benchmark e Risultati */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="bench-name">
              Benchmark Utilizzato
            </label>
            <input
              id="bench-name"
              type="text"
              className="input-field"
              placeholder="es. Cinebench R23, Time Spy"
              value={benchmarkName}
              onChange={(e) => setBenchmarkName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bench-score">
              Score / FPS
            </label>
            <input
              id="bench-score"
              type="text"
              className="input-field"
              placeholder="es. 38,450 pts"
              value={benchmarkScore}
              onChange={(e) => setBenchmarkScore(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bench-notes">
              Note Benchmark / Stabilità
            </label>
            <input
              id="bench-notes"
              type="text"
              className="input-field"
              placeholder="es. 30min OCCT senza errori"
              value={benchmarkNotes}
              onChange={(e) => setBenchmarkNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Note Generali */}
        <div className="form-group">
          <label className="form-label" htmlFor="tune-notes">
            <FileText size={14} style={{ marginRight: '6px' }} />
            Note Generali sul Profilo
          </label>
          <textarea
            id="tune-notes"
            className="input-field textarea-field"
            rows={2}
            placeholder="Dettagli aggiuntivi, versione BIOS utilizzata, programma di tuning..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Azioni Modale */}
        <div className="modal-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : profileToEdit ? 'Aggiorna Profilo' : 'Salva nel Journal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
