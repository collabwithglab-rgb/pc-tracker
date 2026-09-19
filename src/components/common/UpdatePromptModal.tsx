import React from 'react';
import {
  Sparkles,
  Download,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Modal } from './Modal';
import { AppUpdateInfo } from '../../services/updaterService';
import { getChangelogForVersion } from '../../constants/changelog';

interface UpdatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo;
  onInstallUpdate: () => Promise<void>;
  downloading?: boolean;
  percent?: number;
  error?: string;
  onSkipVersion: (version: string) => void;
  onOpenChangelog?: () => void;
  onOpenWikiArticle?: (articleId: string) => void;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onInstallUpdate,
  downloading = false,
  percent = 0,
  error,
  onSkipVersion,
  onOpenChangelog,
  onOpenWikiArticle,
}) => {
  const newVersion = updateInfo.newVersion || 'Nuova';
  const matchingChangelog = getChangelogForVersion(newVersion);
  const isChangelogAvailable = matchingChangelog.version === newVersion.replace(/^v/, '');

  const handleSkip = () => {
    if (updateInfo.newVersion) {
      onSkipVersion(updateInfo.newVersion);
    }
  };

  const handleOpenChangelogOrWiki = () => {
    onClose();
    if (onOpenWikiArticle && matchingChangelog.wikiArticleId) {
      onOpenWikiArticle(matchingChangelog.wikiArticleId);
    } else if (onOpenChangelog) {
      onOpenChangelog();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={downloading ? () => {} : onClose}
      title="Nuovo Aggiornamento Disponibile"
      subtitle="Una nuova versione ufficiale di PC Tracker è pronta per l'installazione."
      maxWidth="620px"
    >
      <div className="update-prompt-container">
        {/* Banner Differenziale Versione */}
        <div className="update-prompt-version-banner">
          <div className="update-prompt-version-flow">
            <div className="update-prompt-version-pill current">
              <span className="label">Installata</span>
              <span className="val">v{updateInfo.currentVersion}</span>
            </div>
            <ArrowRight size={18} className="update-prompt-flow-arrow" />
            <div className="update-prompt-version-pill target">
              <span className="label">Disponibile</span>
              <span className="val">v{newVersion}</span>
            </div>
          </div>

          <div className="update-prompt-badge-group">
            <span className="update-prompt-status-tag recommended">
              <Sparkles size={12} />
              <span>Consigliato</span>
            </span>
            <span className="update-prompt-status-tag verified">
              <ShieldCheck size={12} />
              <span>Firma Minisign Ed25519</span>
            </span>
          </div>
        </div>

        {/* Anteprima Novità (Changelog Preview o Release Notes) */}
        <div className="update-prompt-preview-card">
          <div className="update-prompt-preview-header">
            <span className="update-prompt-preview-title">
              {isChangelogAvailable ? matchingChangelog.title : 'Principali Novità Introdotte'}
            </span>
            {isChangelogAvailable && (
              <span className="update-prompt-preview-date">
                Rilasciato il {matchingChangelog.date}
              </span>
            )}
          </div>

          <p className="update-prompt-preview-summary">
            {isChangelogAvailable
              ? matchingChangelog.summary
              : updateInfo.releaseNotes ||
                'Questo aggiornamento include ottimizzazioni per la stabilità, miglioramenti delle prestazioni e correzioni per il tuo PC.'}
          </p>

          {/* Top 3 Novità Principali se presenti nel changelog */}
          {isChangelogAvailable && matchingChangelog.added.length > 0 && (
            <div className="update-prompt-highlights">
              {matchingChangelog.added.slice(0, 3).map((item, idx) => (
                <div key={idx} className="update-prompt-highlight-item">
                  <CheckCircle2 size={14} className="update-prompt-check-icon" />
                  <div className="update-prompt-highlight-content">
                    <div className="update-prompt-highlight-title-row">
                      <strong>{item.title}</strong>
                      {item.tag && <span className="update-prompt-tag">{item.tag}</span>}
                    </div>
                    <span>{item.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifica di integrità locale */}
        <div className="update-prompt-integrity-notice">
          <ShieldCheck size={15} color="var(--accent-emerald)" />
          <span>
            I tuoi dati hardware memorizzati su <strong>IndexedDB</strong> sono al 100% preservati e non verranno alterati.
          </span>
        </div>

        {/* Messaggio di Errore se fallito */}
        {error && (
          <div className="update-prompt-error-card">
            <AlertTriangle size={16} color="var(--accent-ruby)" />
            <span>{error}</span>
          </div>
        )}

        {/* Barra di Progresso Download & Installazione */}
        {downloading && (
          <div className="update-prompt-progress-container">
            <div className="update-prompt-progress-header">
              <span className="update-prompt-progress-label">
                Download e installazione del pacchetto Windows...
              </span>
              <span className="update-prompt-progress-percent">{percent}%</span>
            </div>
            <div className="update-prompt-progress-track">
              <div
                className="update-prompt-progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="update-prompt-progress-sub">
              L'applicazione si riavvierà automaticamente al termine del download.
            </span>
          </div>
        )}

        {/* Footer Controlli e Azioni */}
        <div className="update-prompt-footer">
          <div className="update-prompt-footer-left">
            {!downloading && (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="update-prompt-skip-btn micro-press"
                  title={`Non mostrare più questo avviso all'avvio per la versione v${newVersion}`}
                  id="btn-update-prompt-skip"
                >
                  Salta questa versione
                </button>

                {(onOpenChangelog || onOpenWikiArticle) && (
                  <button
                    type="button"
                    onClick={handleOpenChangelogOrWiki}
                    className="update-prompt-details-btn micro-press"
                    id="btn-update-prompt-details"
                  >
                    <BookOpen size={13} />
                    <span>Dettagli completi</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="update-prompt-footer-right">
            {!downloading && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary micro-press"
                id="btn-update-prompt-later"
              >
                <Clock size={15} />
                <span>Ricordamelo più tardi</span>
              </button>
            )}

            <button
              type="button"
              onClick={onInstallUpdate}
              disabled={downloading}
              className="btn btn-primary micro-press"
              id="btn-update-prompt-install"
              style={{ minWidth: '150px' }}
            >
              <Download size={16} />
              <span>{downloading ? 'Installazione...' : 'Aggiorna Ora'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
