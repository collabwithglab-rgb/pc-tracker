import React from 'react';
import { Modal } from '../common/Modal';
import { Trash2, AlertTriangle } from 'lucide-react';
import { formatBytes } from '../../domain';
import { RecycleBinInfo } from '../../types';

interface RecycleBinConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  binInfo: RecycleBinInfo | null;
  isLoading?: boolean;
}

export const RecycleBinConfirmModal: React.FC<RecycleBinConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  binInfo,
  isLoading = false,
}) => {
  const sizeFormatted = binInfo ? formatBytes(binInfo.totalSizeBytes) : '0 B';
  const itemCount = binInfo?.itemCount ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Svuota Cestino di Windows"
      subtitle="Conferma eliminazione definitiva dei file cestinati"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
          }}
        >
          <AlertTriangle size={24} color="var(--accent-ruby, #f43f5e)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary, #f1f5f9)', lineHeight: 1.4 }}>
            <strong>Operazione irreversibile:</strong> tutti gli elementi presenti nel Cestino verranno
            eliminati definitivamente dal disco e non potranno più essere ripristinati.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'var(--bg-input, #0f172a)',
            padding: '12px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #1e293b)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Elementi nel Cestino
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', marginTop: '2px' }}>
              {itemCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Spazio Occupato
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-cyan, #38bdf8)', marginTop: '2px' }}>
              {sizeFormatted}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Annulla
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading || itemCount === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={15} />
            {isLoading ? 'Svuotamento in corso...' : 'Svuota Cestino Definitivamente'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
