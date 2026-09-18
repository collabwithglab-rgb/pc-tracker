import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { WindowsToolResult } from '../../types';
import { formatDurationMs } from '../../domain';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  BookOpen,
} from 'lucide-react';

interface ToolResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: WindowsToolResult | null;
  toolTitle?: string;
  onRegisterInMaintenance?: (result: WindowsToolResult) => void;
}

export const ToolResultModal: React.FC<ToolResultModalProps> = ({
  isOpen,
  onClose,
  result,
  toolTitle,
  onRegisterInMaintenance,
}) => {
  const [showRawOutput, setShowRawOutput] = useState<boolean>(false);

  if (!result) return null;

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle size={22} color="var(--accent-emerald, #10b981)" />;
      case 'warning':
        return <AlertTriangle size={22} color="var(--accent-amber, #f59e0b)" />;
      case 'failed':
        return <XCircle size={22} color="var(--accent-ruby, #f43f5e)" />;
      case 'cancelled':
        return <Clock size={22} color="var(--text-muted, #94a3b8)" />;
      case 'not_supported':
      default:
        return <AlertTriangle size={22} color="var(--accent-purple, #818cf8)" />;
    }
  };

  const getStatusLabel = () => {
    switch (result.status) {
      case 'success':
        return 'Operazione Completata con Successo';
      case 'warning':
        return 'Avviso / Attenzione Richiesta';
      case 'failed':
        return 'Operazione Non Riuscita';
      case 'cancelled':
        return 'Operazione Annullata';
      case 'not_supported':
        return 'Operazione Non Supportata';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={toolTitle || 'Esito Operazione Windows'}
      subtitle={`Eseguito con Windows Native API • Durata: ${formatDurationMs(result.durationMs)}`}
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status Header Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            background:
              result.status === 'success'
                ? 'rgba(16, 185, 129, 0.08)'
                : result.status === 'failed'
                ? 'rgba(244, 63, 94, 0.08)'
                : 'rgba(148, 163, 184, 0.08)',
            border: `1px solid ${
              result.status === 'success'
                ? 'rgba(16, 185, 129, 0.25)'
                : result.status === 'failed'
                ? 'rgba(244, 63, 94, 0.25)'
                : 'rgba(148, 163, 184, 0.25)'
            }`,
          }}
        >
          {getStatusIcon()}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #f1f5f9)' }}>
              {getStatusLabel()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
              {result.requiresElevation ? 'Esecuzione con privilegi elevati (UAC)' : 'Esecuzione standard'}
            </div>
          </div>
        </div>

        {/* Messaggio Ufficiale */}
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
            Rapporto Operazione
          </label>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              background: 'var(--bg-input, #0f172a)',
              border: '1px solid var(--border-color, #1e293b)',
              color: 'var(--text-primary, #f1f5f9)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
            }}
          >
            {result.message}
          </div>
        </div>

        {/* Output Dettagliato Monospace se presente */}
        {result.details && (
          <div>
            <button
              type="button"
              onClick={() => setShowRawOutput(!showRawOutput)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan, #38bdf8)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                padding: '4px 0',
              }}
            >
              <Terminal size={14} />
              <span>{showRawOutput ? 'Nascondi output console' : 'Visualizza output console'}</span>
              {showRawOutput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showRawOutput && (
              <pre
                style={{
                  marginTop: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: '#060a12',
                  border: '1px solid var(--border-color, #1e293b)',
                  color: '#94a3b8',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.details}
              </pre>
            )}
          </div>
        )}

        {/* Banner Registra nel Registro Manutenzione */}
        {onRegisterInMaintenance && result.status === 'success' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="var(--accent-cyan, #38bdf8)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                Vuoi registrare questa operazione nel Registro Manutenzione?
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onRegisterInMaintenance(result)}
              style={{ fontSize: '0.75rem' }}
            >
              Registra nel Registro
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};
