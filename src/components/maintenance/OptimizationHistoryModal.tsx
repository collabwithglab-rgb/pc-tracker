import React from 'react';
import {
  AlertCircle,
  Clock,
  Trash2,
  ShieldAlert,
  Info,
  Zap,
} from 'lucide-react';
import { OptimizationExecutionRecord } from '../../types';
import { Modal } from '../common/Modal';
import {
  getOutcomeBadgeClass,
  getOutcomeLabel,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
  getVerificationTypeLabel,
} from '../../domain/optimizationHistoryEngine';

interface OptimizationHistoryModalProps {
  record: OptimizationExecutionRecord | null;
  onClose: () => void;
  onDeleteRecord?: (id: string) => void;
}

export const OptimizationHistoryModal: React.FC<OptimizationHistoryModalProps> = ({
  record,
  onClose,
  onDeleteRecord,
}) => {
  if (!record) return null;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const beforeSummary = typeof record.evidenceBefore === 'object' && record.evidenceBefore !== null
    ? record.evidenceBefore.summary
    : record.evidenceBefore;

  const afterSummary = typeof record.evidenceAfter === 'object' && record.evidenceAfter !== null
    ? record.evidenceAfter.summary
    : record.evidenceAfter;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Dettaglio Esecuzione Ottimizzazione"
      subtitle={`${record.recommendationTitle} — ${formatDate(record.timestampStarted)}`}
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* HEADER META PILLS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', alignItems: 'center' }}>
          <span className={`badge ${getOutcomeBadgeClass(record.outcome)}`}>
            {getOutcomeLabel(record.outcome)}
          </span>
          <span className={`badge ${getVerificationStatusBadgeClass(record.verificationStatus)}`}>
            Verifica: {getVerificationStatusLabel(record.verificationStatus)}
          </span>
          <span className="badge badge-subtle">
            Tipo: {getVerificationTypeLabel(record.verificationType)}
          </span>
          <span className="badge badge-cyan" style={{ textTransform: 'uppercase' }}>
            {record.category}
          </span>
          {record.durationMs !== undefined && record.durationMs > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {record.durationMs} ms
            </span>
          )}
        </div>

        {/* 1. PERCHÉ: TRIGGER & MOTIVAZIONE */}
        <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Perché è stata proposta
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {record.triggerReason}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Evidenza rilevata:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{record.triggerEvidence}</span>
          </div>
        </div>

        {/* 2. COSA È STATO ESEGUITO */}
        <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Cosa è stato eseguito
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {record.actionDescription}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {record.target && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target / Area: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{record.target}</strong>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Disponibilità azione: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{record.actionAvailability}</strong>
            </div>
            {record.actionId && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ID Azione: </span>
                <code style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>{record.actionId}</code>
              </div>
            )}
          </div>
        </div>

        {/* 3. RISULTATO TECNICO ED EVENTUALI ERRORI / ANNULLAMENTI */}
        {record.outcome === 'failed' && record.errorMessage && (
          <div style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-ruby)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="var(--accent-ruby)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-ruby)' }}>Errore Tecnico Rilevato</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {record.errorMessage}
              </div>
            </div>
          </div>
        )}

        {record.outcome === 'cancelled' && record.cancellationReason && (
          <div style={{ padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--accent-amber)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
            <ShieldAlert size={18} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-amber)' }}>Operazione Annullata</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {record.cancellationReason}
              </div>
            </div>
          </div>
        )}

        {/* 4. VERIFICA POST-AZIONE: CONFRONTO BEFORE / AFTER */}
        <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Verifica dell'Efficacia
            </div>
            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              {record.verificationMethod}
            </span>
          </div>

          {/* Confronto Before / After */}
          <div style={{ display: 'grid', gridTemplateColumns: beforeSummary && afterSummary ? '1fr 1fr' : '1fr', gap: 'var(--space-sm)' }}>
            {beforeSummary && (
              <div style={{ padding: 'var(--space-sm)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Prima dell'azione
                </div>
                <div style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {beforeSummary}
                </div>
              </div>
            )}

            {afterSummary && (
              <div style={{ padding: 'var(--space-sm)', backgroundColor: 'rgba(16, 185, 129, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Dopo l'azione
                </div>
                <div style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {afterSummary}
                </div>
              </div>
            )}
          </div>

          {/* Variazione quantitativa oggettiva */}
          {record.metricsDelta && record.metricsDelta.description && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Zap size={14} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                {record.metricsDelta.description}
              </span>
            </div>
          )}

          {/* Azione manuale ancora necessaria se pending */}
          {record.verificationStatus === 'pending' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '6px 10px', backgroundColor: 'rgba(245, 158, 11, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <Info size={14} color="var(--accent-amber)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Verifica in attesa: questa ottimizzazione richiede verifica manuale, monitoraggio delle temperature successive o ispezione visiva da parte dell'utente.
              </span>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-xs)' }}>
          {onDeleteRecord && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onDeleteRecord(record.id);
                onClose();
              }}
              style={{ color: 'var(--accent-ruby)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
              title="Elimina questa registrazione dallo storico"
            >
              <Trash2 size={14} style={{ marginRight: '4px' }} /> Elimina Record
            </button>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginLeft: 'auto' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
