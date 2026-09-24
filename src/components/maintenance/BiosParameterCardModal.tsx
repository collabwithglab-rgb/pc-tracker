import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { TuningProfile, TUNING_TYPE_LABELS, TUNING_STABILITY_LABELS } from '../../types';
import {
  generateBiosParameterCardMarkdown,
  getTuningStabilityBadgeClass,
} from '../../domain';
import {
  Copy,
  Check,
  Download,
  Printer,
  Sliders,
  Cpu,
  Zap,
  Thermometer,
  Award,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';

interface BiosParameterCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TuningProfile | null;
  componentName?: string;
  onShowNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const BiosParameterCardModal: React.FC<BiosParameterCardModalProps> = ({
  isOpen,
  onClose,
  profile,
  componentName,
  onShowNotification,
}) => {
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const stabBadge = getTuningStabilityBadgeClass(profile.stability);
  const paramEntries = Object.entries(profile.parameters || {});

  const markdownContent = generateBiosParameterCardMarkdown(profile, componentName);

  const handleCopyMarkdown = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(markdownContent);
      }
      setCopied(true);
      onShowNotification?.('success', 'Scheda parametri BIOS copiata in Markdown negli appunti.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onShowNotification?.('error', 'Impossibile copiare negli appunti.');
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'tuning-profile'}-bios-card.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowNotification?.('success', 'File Markdown scaricato con successo.');
    } catch {
      onShowNotification?.('error', 'Errore durante il download del file.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scheda Parametri BIOS & Hardware"
      subtitle="Report esportabile dei parametri di setup, timing, tensioni e stabilità"
      maxWidth="720px"
    >
      <div className="bios-card-printable-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Action Toolbar */}
        <div
          className="bios-card-actions-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Esporta o stampa la configurazione verificata:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyMarkdown}
              title="Copia in formato Markdown"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copied ? 'Copiato!' : 'Copia Markdown'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadMarkdown}
              title="Scarica documento .md"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}
            >
              <Download size={13} />
              <span>Scarica .md</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="Stampa scheda o salva come PDF dal browser"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}
            >
              <Printer size={13} />
              <span>Stampa / PDF</span>
            </button>
          </div>
        </div>

        {/* The Card Sheet */}
        <div
          className="bios-parameter-card-sheet"
          style={{
            padding: '20px',
            background: 'var(--bg-surface-elevated, #111827)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Header Profilo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                  {profile.category.toUpperCase()}
                </span>
                <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                  {TUNING_TYPE_LABELS[profile.type]}
                </span>
                <span className={`badge ${stabBadge}`} style={{ fontSize: '0.72rem' }}>
                  {profile.stability === 'daily' ? '⭐ DAILY DRIVER' : TUNING_STABILITY_LABELS[profile.stability]}
                </span>
              </div>

              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {profile.name}
              </div>

              {componentName && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} color="var(--accent-primary)" />
                  <span>Componente: <strong>{componentName}</strong></span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} />
                <span>Data: <strong style={{ color: 'var(--text-secondary)' }}>{profile.date}</strong></span>
              </div>
              {profile.biosVersion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)' }}>
                  <Layers size={13} />
                  <span>BIOS: <strong style={{ fontFamily: 'var(--font-mono)' }}>{profile.biosVersion}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Tabella Parametri Configurati */}
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} color="var(--accent-primary)" />
              <span>Parametri Tecnici Registrati ({paramEntries.length})</span>
            </div>

            {paramEntries.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                Nessun parametro specifico inserito.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Parametro
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Valore Configurato
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramEntries.map(([k, v], idx) => (
                      <tr
                        key={k}
                        style={{
                          borderBottom: idx < paramEntries.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                          {k}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rilevamenti, Potenza & Temperature se presenti */}
          {(profile.temperatures || profile.observedPowerWatts !== undefined) && (
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Thermometer size={15} color="var(--accent-amber)" />
                <span>Rilevamenti Termici & Consumi</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                }}
              >
                {profile.temperatures?.idle !== undefined && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TEMP IDLE</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {profile.temperatures.idle}°C
                    </div>
                  </div>
                )}
                {profile.temperatures?.load !== undefined && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TEMP LOAD</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-ruby)', fontFamily: 'var(--font-mono)' }}>
                      {profile.temperatures.load}°C
                    </div>
                  </div>
                )}
                {profile.temperatures?.ambient !== undefined && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TEMPERATURA AMBIENTE</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {profile.temperatures.ambient}°C
                    </div>
                  </div>
                )}
                {profile.observedPowerWatts !== undefined && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={11} color="var(--accent-amber)" />
                      <span>POTENZA OSSERVATA</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                      {profile.observedPowerWatts} W
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Benchmark se presenti */}
          {profile.benchmarks && profile.benchmarks.length > 0 && (
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} color="var(--accent-emerald)" />
                <span>Benchmark Registrati</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {profile.benchmarks.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{b.name}</strong>
                      {b.notes && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.75rem' }}>
                          ({b.notes})
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {b.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note generali se presenti */}
          {profile.notes && (
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={13} />
                <span>Note di Configurazione & Stabilità:</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {profile.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};
