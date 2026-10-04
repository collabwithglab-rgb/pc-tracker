import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  PlusCircle,
  Zap,
  Wrench,
  Check,
} from 'lucide-react';
import { Modal } from './Modal';
import { APP_CHANGELOG, getChangelogForVersion, ReleaseChangelog } from '../../constants/changelog';
import { APP_VERSION } from '../../constants/version';
import { useTranslation } from '../../locales';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVersion?: string;
  onOpenWikiArticle?: (articleId: string) => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  initialVersion = APP_VERSION,
  onOpenWikiArticle,
}) => {
  const { t, formatDate } = useTranslation();
  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion);

  // Sincronizza la versione selezionata all'apertura
  React.useEffect(() => {
    if (isOpen) {
      setSelectedVersion(initialVersion);
    }
  }, [isOpen, initialVersion]);

  const currentChangelog: ReleaseChangelog = getChangelogForVersion(selectedVersion);

  const handleConfirm = () => {
    try {
      localStorage.setItem('pctracker_last_seen_version', APP_VERSION);
    } catch {
      // Nessuna eccezione in ambienti con restrizioni localStorage
    }
    onClose();
  };

  const handleOpenWiki = () => {
    const targetArticleId = currentChangelog.wikiArticleId || `release-v${currentChangelog.version}`;
    handleConfirm();
    if (onOpenWikiArticle) {
      onOpenWikiArticle(targetArticleId);
    }
  };

  const formattedDate = formatDate(currentChangelog.date);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleConfirm}
      title={t('whats_new_title')}
      subtitle={t('whats_new_subtitle')}
      maxWidth="720px"
    >
      <div className="whatsnew-modal-content">
        {/* Selettore rapido versioni per consultare anche i changelog passati */}
        {APP_CHANGELOG.length > 1 && (
          <div className="whatsnew-version-tabs-row">
            <span className="whatsnew-version-tabs-label">{t('whats_new_version_label')}</span>
            <div className="whatsnew-version-tabs-container">
              {APP_CHANGELOG.map((rel) => {
                const isSelected = rel.version === currentChangelog.version;
                const isCurrentInstalled = rel.version === APP_VERSION;
                return (
                  <button
                    key={rel.version}
                    type="button"
                    onClick={() => setSelectedVersion(rel.version)}
                    className={`whatsnew-version-tab-btn micro-press ${isSelected ? 'whatsnew-version-tab-btn-active' : ''}`}
                  >
                    <span>v{rel.version}</span>
                    {isCurrentInstalled && (
                      <span className="whatsnew-current-badge">{t('whats_new_current_badge')}</span>
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
              <span className="whatsnew-date-pill">{t('whats_new_released_on', { date: formattedDate })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600 }}>
              <Sparkles size={14} />
              <span>{t('whats_new_official_release')}</span>
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
              <span>{t('whats_new_section_added')}</span>
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
              <span>{t('whats_new_section_improved')}</span>
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
              <span>{t('whats_new_section_fixed')}</span>
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
            <div className="whatsnew-wiki-icon-wrapper">
              <BookOpen size={18} color="var(--accent-primary)" />
            </div>
            <div className="whatsnew-wiki-text">
              <strong>{t('whats_new_wiki_title')}</strong>
              <span>{t('whats_new_wiki_desc')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenWiki}
            className="btn btn-secondary micro-press"
            id="btn-whatsnew-open-wiki"
            style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0, gap: '6px' }}
            title={t('whats_new_wiki_tooltip')}
          >
            <BookOpen size={13} color="var(--accent-primary)" />
            <span>{t('whats_new_wiki_btn')}</span>
          </button>
        </div>
      </div>

      {/* Footer Azioni */}
      <div className="whatsnew-footer">
        <span className="whatsnew-footer-hint">
          {t('whats_new_footer_hint')}
        </span>

        <button
          type="button"
          onClick={handleConfirm}
          className="btn btn-primary micro-press"
          id="btn-whatsnew-confirm"
          style={{ padding: '8px 20px', gap: '8px' }}
        >
          <Check size={16} strokeWidth={2.4} />
          <span>{t('whats_new_close')}</span>
        </button>
      </div>
    </Modal>
  );
};

