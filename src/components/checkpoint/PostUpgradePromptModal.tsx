import React from 'react';
import { Modal } from '../common/Modal';
import { Sparkles, Bookmark } from 'lucide-react';

interface PostUpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSave: () => void;
  upgradeTitle?: string;
}

export const PostUpgradePromptModal: React.FC<PostUpgradePromptModalProps> = ({
  isOpen,
  onClose,
  onConfirmSave,
  upgradeTitle,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuova Generazione Hardware Rilevata"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={styles.banner}>
          <div style={styles.iconWrapper}>
            <Sparkles size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.bannerTitle}>
              {upgradeTitle || 'Upgrade Generazionale Completato'}
            </div>
            <div style={styles.bannerText}>
              Questo upgrade segna una nuova generazione del tuo PC. Vuoi salvare questa configurazione come milestone Checkpoint nella timeline storica?
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Ignora
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirmSave();
            }}
            className="btn btn-primary"
          >
            <Bookmark size={15} />
            <span>Salva Checkpoint</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
  },
  iconWrapper: {
    padding: '4px',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  bannerText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '8px',
  },
};
