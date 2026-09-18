import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  BookOpen,
  PlusCircle,
  Zap,
  Wrench,
  Check,
} from 'lucide-react';
import { Modal } from './Modal';
import { APP_CHANGELOG, getChangelogForVersion, ReleaseChangelog } from '../../constants/changelog';
import { APP_VERSION } from '../../constants/version';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVersion?: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  initialVersion = APP_VERSION,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion);

  const currentChangelog: ReleaseChangelog = getChangelogForVersion(selectedVersion);

  const handleConfirm = () => {
    try {
      localStorage.setItem('pctracker_last_seen_version', APP_VERSION);
    } catch {
      // Nessuna eccezione in ambienti con restrizioni localStorage
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleConfirm}
      title="Novità dell'Aggiornamento"
      subtitle={`Scopri tutte le novità, i miglioramenti e i fix introdotti in PC Tracker`}
      maxWidth="720px"
    >
      <div className="whatsnew-modal-content">
        {/* Selettore rapido versioni per consultare anche i changelog passati */}
        {APP_CHANGELOG.length > 1 && (
          <div style={styles.versionTabsRow}>
            <span style={styles.versionTabsLabel}>Versione:</span>
            <div style={styles.versionTabsContainer}>
              {APP_CHANGELOG.map((rel) => {
                const isSelected = rel.version === currentChangelog.version;
                const isCurrentInstalled = rel.version === APP_VERSION;
                return (
                  <button
                    key={rel.version}
                    type="button"
                    onClick={() => setSelectedVersion(rel.version)}
                    className="micro-press"
                    style={{
                      ...styles.versionTabBtn,
                      ...(isSelected ? styles.versionTabBtnActive : {}),
                    }}
                  >
                    <span>v{rel.version}</span>
                    {isCurrentInstalled && (
                      <span style={styles.currentInstalledBadge}>Attuale</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero Card Release */}
        <div className="whatsnew-hero">
          <div className="whatsnew-hero-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="whatsnew-version-pill">v{currentChangelog.version}</span>
              <span className="whatsnew-date-pill">Rilasciato il {currentChangelog.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600 }}>
              <Sparkles size={14} />
              <span>Release Ufficiale</span>
            </div>
          </div>

          <h3 className="whatsnew-title">{currentChangelog.title}</h3>
          <p className="whatsnew-summary">{currentChangelog.summary}</p>
        </div>

        {/* Sezione 1: Aggiunte & Nuove Funzionalità */}
        {currentChangelog.added.length > 0 && (
          <div className="whatsnew-section">
            <div className="whatsnew-section-header" style={{ color: 'var(--accent-primary)' }}>
              <PlusCircle size={15} />
              <span>Nuove Funzionalità & Aggiunte</span>
              <span className="whatsnew-section-badge whatsnew-section-badge-added">
                {currentChangelog.added.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentChangelog.added.map((item, idx) => (
                <div key={idx} className="whatsnew-item-card">
                  <div className="whatsnew-item-title-row">
                    <span className="whatsnew-item-title">{item.title}</span>
                    {item.tag && <span className="whatsnew-item-tag">{item.tag}</span>}
                  </div>
                  <p className="whatsnew-item-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezione 2: Miglioramenti & Ottimizzazioni */}
        {currentChangelog.improved.length > 0 && (
          <div className="whatsnew-section">
            <div className="whatsnew-section-header" style={{ color: 'var(--accent-emerald)' }}>
              <Zap size={15} />
              <span>Miglioramenti & Ottimizzazioni</span>
              <span className="whatsnew-section-badge whatsnew-section-badge-improved">
                {currentChangelog.improved.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentChangelog.improved.map((item, idx) => (
                <div key={idx} className="whatsnew-item-card">
                  <div className="whatsnew-item-title-row">
                    <span className="whatsnew-item-title">{item.title}</span>
                    {item.tag && <span className="whatsnew-item-tag">{item.tag}</span>}
                  </div>
                  <p className="whatsnew-item-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezione 3: Bug Fix & Correzioni */}
        {currentChangelog.fixed.length > 0 && (
          <div className="whatsnew-section">
            <div className="whatsnew-section-header" style={{ color: 'var(--accent-amber)' }}>
              <Wrench size={15} />
              <span>Bug Fix & Hardening</span>
              <span className="whatsnew-section-badge whatsnew-section-badge-fixed">
                {currentChangelog.fixed.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentChangelog.fixed.map((item, idx) => (
                <div key={idx} className="whatsnew-item-card">
                  <div className="whatsnew-item-title-row">
                    <span className="whatsnew-item-title">{item.title}</span>
                    {item.tag && <span className="whatsnew-item-tag">{item.tag}</span>}
                  </div>
                  <p className="whatsnew-item-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Box Predisposizione Mini-Wiki */}
        <div className="whatsnew-wiki-box">
          <div className="whatsnew-wiki-info">
            <div style={styles.wikiIconWrapper}>
              <BookOpen size={18} color="var(--accent-primary)" />
            </div>
            <div className="whatsnew-wiki-text">
              <strong>Mini-Wiki & Guide Operative</strong>
              <span>Consulta la documentazione online per approfondire l'uso delle nuove funzionalità.</span>
            </div>
          </div>

          <a
            href={currentChangelog.wikiUrl || 'https://github.com/collabwithglab-rgb/pc-tracker/wiki'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary micro-press"
            style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
          >
            <span>Apri Mini-Wiki</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Footer Azioni */}
      <div style={styles.footer}>
        <span style={styles.footerHint}>
          Puoi rileggere queste note in qualsiasi momento dalla sezione Impostazioni.
        </span>

        <button
          type="button"
          onClick={handleConfirm}
          className="btn btn-primary micro-press"
          id="btn-whatsnew-confirm"
          style={{ padding: '8px 20px', gap: '8px' }}
        >
          <Check size={16} strokeWidth={2.4} />
          <span>Ho capito, andiamo!</span>
        </button>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  versionTabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
    overflowX: 'auto',
  },
  versionTabsLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
    fontWeight: 600,
    flexShrink: 0,
  },
  versionTabsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  versionTabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  versionTabBtnActive: {
    backgroundColor: 'var(--accent-primary-subtle)',
    border: '1px solid var(--accent-primary-border)',
    color: 'var(--accent-primary)',
    fontWeight: 700,
  },
  currentInstalledBadge: {
    fontSize: '9px',
    fontFamily: 'var(--font-sans)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: 'var(--accent-primary)',
    padding: '1px 4px',
    borderRadius: 'var(--radius-xs)',
    fontWeight: 700,
  },
  wikiIconWrapper: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid var(--border-subtle)',
    flexWrap: 'wrap',
  },
  footerHint: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
};
