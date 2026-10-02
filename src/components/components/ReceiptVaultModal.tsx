import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ComponentReceipt } from '../../types';
import { formatDate } from '../../utils';
import { usePCStore } from '../../store';
import { useI18n } from '../../locales';
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
  const { t } = useI18n();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!receipt) return null;

  const isPdf =
    receipt.fileType === 'application/pdf' &&
    receipt.dataUrl.toLowerCase().startsWith('data:application/pdf;');
  const sizeMb = (receipt.fileSize / (1024 * 1024)).toFixed(2);
  const formattedDate = formatDate(receipt.uploadedAt, settings.dateFormat);

  const handleDownload = () => {
    // Sanitizzazione nome file anti path-traversal (CWE-22 / CWE-73)
    const safeFileName =
      receipt.fileName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'ricevuta_documento';
    const link = document.createElement('a');
    link.href = receipt.dataUrl;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm(t('modal_vault_delete_confirm', { fileName: receipt.fileName }))) {
      try {
        setIsDeleting(true);
        await onDelete(receipt.id);
        onClose();
      } catch (err) {
        alert((err as Error).message || t('modal_vault_delete_error'));
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
      subtitle={t('modal_vault_subtitle', { size: sizeMb, date: formattedDate, component: componentName })}
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
              title={t('modal_vault_download_title')}
            >
              <Download size={14} />
              <span>{t('modal_vault_download')}</span>
            </button>

            {!isPdf && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="btn btn-ghost micro-press"
                  style={{ padding: '6px 8px' }}
                  title={t('modal_vault_zoom_out')}
                  aria-label={t('modal_vault_zoom_out')}
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
                  title={t('modal_vault_zoom_in')}
                  aria-label={t('modal_vault_zoom_in')}
                >
                  <ZoomIn size={14} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="btn btn-ghost micro-press"
                    style={{ padding: '6px 8px', fontSize: '11px' }}
                    title={t('modal_vault_zoom_reset')}
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
              title={t('modal_vault_delete_title')}
            >
              <Trash2 size={14} />
              <span>{isDeleting ? t('modal_delete_comp_btn_deleting') : t('modal_vault_delete')}</span>
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
              sandbox="allow-scripts allow-same-origin allow-downloads"
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {t('modal_vault_pdf_browser_unsupported')}
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
