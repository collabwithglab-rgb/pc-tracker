import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ComponentReceipt } from '../../types';
import { formatDate } from '../../utils';
import { usePCStore } from '../../store';
import { Download, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ReceiptVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ComponentReceipt | null;
  componentName: string;
  onDelete?: (receiptId: string) => Promise<void>;
}

export const ReceiptVaultModal: React.FC<ReceiptVaultModalProps> = ({
  isOpen,
  onClose,
  receipt,
  componentName,
  onDelete,
}) => {
  const { settings } = usePCStore();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!receipt) return null;

  const isPdf = receipt.fileType === 'application/pdf';
  const sizeMb = (receipt.fileSize / (1024 * 1024)).toFixed(2);
  const formattedDate = formatDate(receipt.uploadedAt, settings.dateFormat);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = receipt.dataUrl;
    link.download = receipt.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm(`Sei sicuro di voler eliminare definitivamente il documento "${receipt.fileName}"?`)) {
      try {
        setIsDeleting(true);
        await onDelete(receipt.id);
        onClose();
      } catch (err) {
        alert((err as Error).message || 'Errore durante l\'eliminazione del documento.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receipt.fileName}
      subtitle={`${sizeMb} MB • Caricato il ${formattedDate} • ${componentName}`}
      maxWidth="880px"
    >
      <div className="receipt-viewer-body">
        {/* Toolbar Azioni File (Download, Zoom per immagini, Elimina) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '13px', padding: '6px 12px' }}
              title="Scarica il file originale sul tuo computer"
            >
              <Download size={14} />
              <span>Scarica File</span>
            </button>

            {!isPdf && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="btn btn-ghost micro-press"
                  style={{ padding: '6px 8px' }}
                  title="Riduci zoom"
                  aria-label="Riduci zoom"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '42px', textAlign: 'center' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="btn btn-ghost micro-press"
                  style={{ padding: '6px 8px' }}
                  title="Aumenta zoom"
                  aria-label="Aumenta zoom"
                >
                  <ZoomIn size={14} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="btn btn-ghost micro-press"
                    style={{ padding: '6px 8px', fontSize: '11px' }}
                    title="Reimposta zoom a 100%"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-ghost micro-press"
              style={{ color: 'var(--accent-ruby)', fontSize: '13px', padding: '6px 10px' }}
              title="Elimina questo documento dalla cassaforte"
            >
              <Trash2 size={14} />
              <span>{isDeleting ? 'Eliminazione...' : 'Elimina Ricevuta'}</span>
            </button>
          )}
        </div>

        {/* Visualizzatore Contenuto (PDF nativo o Immagine ad alta risoluzione) */}
        {isPdf ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <iframe
              src={receipt.dataUrl}
              title={receipt.fileName}
              className="receipt-iframe"
            />
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Se il visualizzatore PDF del browser è disattivato, puoi scaricare il file tramite il pulsante "Scarica File".
            </p>
          </div>
        ) : (
          <div className="receipt-image-wrapper">
            <img
              src={receipt.dataUrl}
              alt={receipt.fileName}
              className="receipt-image-preview"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
