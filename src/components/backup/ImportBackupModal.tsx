import React from 'react';
import { Upload, AlertTriangle, Package, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { ImportPreview } from '../../types/database';
import { useTranslation, getBcp47 } from '../../locales';

interface ImportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  previewData: ImportPreview | null;
  fileName: string;
  currentCounts: {
    components: number;
    events: number;
    upgrades: number;
    checkpoints?: number;
  };
  isImporting?: boolean;
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  fileName,
  currentCounts,
  isImporting = false,
}) => {
  const { t, currentLocale } = useTranslation();
  if (!previewData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('import_backup_title')}
      subtitle={`${t('import_backup_subtitle')} (${fileName})`}
      maxWidth="580px"
    >
      <div style={styles.container}>
        {/* Metadati Backup */}
        <div style={styles.metadataCard}>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>{t('import_backup_meta_schema')}</span>
            <strong style={styles.metaValue}>v{previewData.schemaVersion}</strong>
          </div>
          {previewData.appVersion && (
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>{t('import_backup_meta_app')}</span>
              <strong style={styles.metaValue}>v{previewData.appVersion}</strong>
            </div>
          )}
          {previewData.exportedAt && (
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>{t('import_backup_meta_exported')}</span>
              <strong style={styles.metaValue}>
                {new Date(previewData.exportedAt).toLocaleString(getBcp47(currentLocale), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
          )}
          {previewData.settingsSummary?.rigName && (
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>{t('import_backup_meta_rig')}</span>
              <strong style={styles.metaValue}>{previewData.settingsSummary.rigName}</strong>
            </div>
          )}
        </div>

        {/* Confronto Dati */}
        <div style={styles.compareGrid}>
          {/* Card In Arrivo */}
          <div style={styles.incomingCard}>
            <div style={styles.incomingHeader}>
              <Package size={15} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '12.5px' }}>
                {t('import_backup_incoming_title')}
              </span>
            </div>
            <ul style={styles.countList}>
              <li>
                <strong>{previewData.counts.components}</strong> {t('import_backup_count_components')}
              </li>
              <li>
                <strong>{previewData.counts.events}</strong> {t('import_backup_count_events')}
              </li>
              <li>
                <strong>{previewData.counts.upgrades}</strong> {t('import_backup_count_upgrades')}
              </li>
              {previewData.counts.checkpoints !== undefined && (
                <li>
                  <strong>{previewData.counts.checkpoints}</strong> {t('import_backup_count_checkpoints')}
                </li>
              )}
            </ul>
          </div>

          {/* Card Dati Attuali */}
          <div style={styles.currentCard}>
            <div style={styles.currentHeader}>
              <AlertTriangle size={15} color="var(--accent-ruby)" />
              <span style={{ fontWeight: 600, color: 'var(--accent-ruby)', fontSize: '12.5px' }}>
                {t('import_backup_current_title')}
              </span>
            </div>
            <ul style={styles.countList}>
              <li>
                <strong>{currentCounts.components}</strong> {t('import_backup_count_components')}
              </li>
              <li>
                <strong>{currentCounts.events}</strong> {t('import_backup_count_events')}
              </li>
              <li>
                <strong>{currentCounts.upgrades}</strong> {t('import_backup_count_upgrades')}
              </li>
              {currentCounts.checkpoints !== undefined && (
                <li>
                  <strong>{currentCounts.checkpoints}</strong> {t('import_backup_count_checkpoints')}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Avviso Atomicità */}
        <div style={styles.noticeBox}>
          <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {t('import_backup_atomic_prefix')} <strong>{t('import_backup_atomic_strong')}</strong>{t('import_backup_atomic_suffix')}
          </span>
        </div>

        {/* Azioni */}
        <div className="form-actions" style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary micro-press"
            disabled={isImporting}
          >
            {t('import_backup_cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary micro-press"
            disabled={isImporting}
            id="btn-confirm-import-backup"
          >
            <Upload size={15} />
            <span>{isImporting ? t('import_backup_restoring') : t('import_backup_btn')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  metadataCard: {
    padding: '12px 14px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12.5px',
  },
  metaLabel: {
    color: 'var(--text-muted)',
  },
  metaValue: {
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  compareGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  incomingCard: {
    padding: '12px 14px',
    backgroundColor: 'var(--accent-primary-subtle)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent-primary-border)',
  },
  incomingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  currentCard: {
    padding: '12px 14px',
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(244, 63, 94, 0.25)',
  },
  currentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  countList: {
    margin: 0,
    paddingLeft: '16px',
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'var(--bg-surface-subtle)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
};
