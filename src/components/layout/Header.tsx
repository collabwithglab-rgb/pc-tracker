import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Upload, BookOpen, Search, Sparkles, Bell } from 'lucide-react';
import { exportDatabaseToJSON } from '../../storage';
import { saveBackupFileWithDialog } from '../../services';
import { useTranslation } from '../../locales';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewMovement?: () => void;
  onImportBackup?: () => void;
  onOpenWiki?: () => void;
  onOpenSearch?: () => void;
  onQuickSetup?: () => void;
  onOpenWhatsNew?: () => void;
  hasUpdateAvailable?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewMovement,
  onImportBackup,
  onOpenWiki,
  onOpenSearch,
  onQuickSetup,
  onOpenWhatsNew,
  hasUpdateAvailable = false,
}) => {
  const { t } = useTranslation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  const handleQuickBackup = async () => {
    try {
      const jsonString = await exportDatabaseToJSON();
      const today = new Date().toISOString().split('T')[0];
      const filename = `pc-tracker-backup-${today}.json`;
      await saveBackupFileWithDialog(filename, jsonString);
    } catch (err) {
      alert(t('backup_save_error', { error: (err as Error).message }));
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.titleBlock}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      <div style={styles.actions}>
        {/* Placeholder Ricerca / Quick Search Trigger */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            style={styles.searchBarBtn}
            className="micro-press"
            title={`${t('header_search_placeholder')} (Ctrl+K)`}
            id="btn-header-search"
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={styles.searchBarPlaceholder}>{t('header_search_placeholder')}</span>
            <kbd style={styles.searchKbd}>Ctrl+K</kbd>
          </button>
        )}

        {/* Quick Setup */}
        {onQuickSetup && (
          <button
            type="button"
            onClick={onQuickSetup}
            className="btn btn-secondary micro-press"
            title={t('header_quick_setup')}
            style={{ fontSize: '13px', padding: '7px 12px' }}
            id="btn-header-quick-setup"
          >
            <Sparkles size={15} color="var(--accent-primary)" />
            <span>{t('header_quick_setup')}</span>
          </button>
        )}

        {/* Novità / What's New */}
        {onOpenWhatsNew && (
          <button
            type="button"
            onClick={onOpenWhatsNew}
            className="btn btn-secondary micro-press"
            title={t('header_whats_new')}
            style={{ fontSize: '13px', padding: '7px 12px', position: 'relative' }}
            id="btn-header-whats-new"
          >
            <Sparkles size={15} />
            <span>{t('header_whats_new')}</span>
            {hasUpdateAvailable && (
              <span className="sidebar-update-dot" style={{ width: '6px', height: '6px' }} />
            )}
          </button>
        )}

        {/* Guida & Wiki */}
        {onOpenWiki && (
          <button
            onClick={onOpenWiki}
            className="btn btn-secondary micro-press"
            title={t('header_tooltip_wiki')}
            style={{ fontSize: '13px', padding: '7px 12px' }}
            id="btn-header-open-wiki"
          >
            <BookOpen size={15} />
            <span>{t('header_wiki_guide')}</span>
          </button>
        )}

        {/* Esporta Backup */}
        <button
          onClick={handleQuickBackup}
          className="btn btn-secondary micro-press"
          title={t('header_tooltip_quick_backup')}
          style={{ fontSize: '13px', padding: '7px 12px' }}
          id="btn-header-backup-json"
        >
          <Download size={15} />
          <span>{t('header_export_backup')}</span>
        </button>

        {/* Importa JSON */}
        {onImportBackup && (
          <button
            onClick={onImportBackup}
            className="btn btn-secondary micro-press"
            title={t('header_tooltip_import')}
            style={{ fontSize: '13px', padding: '7px 12px' }}
            id="btn-header-import-json"
          >
            <Upload size={15} />
            <span>{t('header_import_json')}</span>
          </button>
        )}

        {/* Centro Notifiche */}
        <div style={{ position: 'relative' }} ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="btn btn-secondary micro-press"
            title={t('header_notifications')}
            style={{ fontSize: '13px', padding: '7px 11px' }}
            id="btn-header-notifications"
            aria-label={t('header_notifications')}
          >
            <Bell size={15} />
          </button>
          {isNotificationsOpen && (
            <div style={styles.notificationDropdown} id="header-notifications-dropdown">
              <div style={styles.notificationHeader}>
                <Bell size={14} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600, fontSize: '12.5px' }}>{t('header_notifications')}</span>
              </div>
              <div style={styles.notificationBody}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('header_system_optimal')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* + Nuovo Movimento */}
        <button
          className="btn btn-primary micro-press"
          onClick={onNewMovement}
          title={t('header_tooltip_new_movement')}
          style={{ fontSize: '13px', padding: '7px 14px' }}
          id="btn-header-new-movement"
        >
          <Plus size={15} strokeWidth={2.2} />
          <span>{t('header_new_movement')}</span>
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '16px 36px',
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
    gap: '3px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchBarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 12px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '13px',
    transition: 'border-color var(--transition-fast)',
  },
  searchBarPlaceholder: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  searchKbd: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--bg-surface)',
    padding: '2px 5px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    marginLeft: '4px',
  },
  notificationDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '280px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    padding: '12px 14px',
    zIndex: 100,
  },
  notificationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: '8px',
    color: 'var(--text-primary)',
  },
  notificationBody: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
};
