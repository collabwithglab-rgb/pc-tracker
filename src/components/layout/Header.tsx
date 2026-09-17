import React from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { exportDatabaseToJSON } from '../../storage';
import { saveBackupFileWithDialog } from '../../services';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewMovement?: () => void;
  onImportBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onNewMovement, onImportBackup }) => {
  const handleQuickBackup = async () => {
    try {
      const jsonString = await exportDatabaseToJSON();
      const today = new Date().toISOString().split('T')[0];
      const filename = `pc-tracker-backup-${today}.json`;
      await saveBackupFileWithDialog(filename, jsonString);
    } catch (err) {
      alert(`Errore durante il backup: ${(err as Error).message}`);
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.titleBlock}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      <div style={styles.actions}>
        <button
          onClick={handleQuickBackup}
          className="btn btn-secondary micro-press"
          title="Scarica backup JSON immediato da IndexedDB"
          style={{ fontSize: '13px', padding: '7px 12px' }}
          id="btn-header-backup-json"
        >
          <Download size={15} />
          <span>Backup JSON</span>
        </button>

        {onImportBackup && (
          <button
            onClick={onImportBackup}
            className="btn btn-secondary micro-press"
            title="Importa o ripristina database da file JSON"
            style={{ fontSize: '13px', padding: '7px 12px' }}
            id="btn-header-import-json"
          >
            <Upload size={15} />
            <span>Importa JSON</span>
          </button>
        )}

        <button
          className="btn btn-primary micro-press"
          onClick={onNewMovement}
          title="Registra acquisto, vendita, spesa o movimentazione hardware"
          style={{ fontSize: '13px', padding: '7px 14px' }}
        >
          <Plus size={15} strokeWidth={2.2} />
          <span>Nuovo Movimento</span>
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '16px 28px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    gap: '16px',
    flexWrap: 'wrap',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
};
