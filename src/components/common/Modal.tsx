import React, { ReactNode, useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  onBack?: () => void;
  backTitle?: string;
}

const FOCUSABLE_ELEMENTS_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '540px',
  onBack,
  backTitle,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Salva l'elemento che aveva il focus prima dell'apertura per ripristinarlo alla chiusura
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus iniziale: sposta il focus all'interno del dialog
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusableElements.length > 0) {
        // Privilegia il primo campo input/select/azione non-close e non-back
        const preferredElement =
          focusableElements.find(
            (el) =>
              !el.classList.contains('modal-close-btn') &&
              !el.classList.contains('modal-back-btn')
          ) || focusableElements[0];
        preferredElement.focus({ preventScroll: true });
      } else {
        modalRef.current.focus({ preventScroll: true });
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: se siamo sul primo elemento, cicla all'ultimo
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: se siamo sull'ultimo elemento, cicla al primo
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);

      // Ripristina il focus sull'elemento scatenante
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Focus automatico quando il contenuto interno cambia (es. navigazione selector -> form o viceversa)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusableElements.length > 0) {
        const preferredElement =
          focusableElements.find(
            (el) =>
              !el.classList.contains('modal-close-btn') &&
              !el.classList.contains('modal-back-btn')
          ) || focusableElements[0];
        preferredElement.focus({ preventScroll: true });
      }
    }, 30);
    return () => clearTimeout(focusTimer);
  }, [title, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="modal-dialog"
        tabIndex={-1}
        style={{ ...styles.modal, maxWidth, outline: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="modal-back-btn"
                title={backTitle || 'Torna indietro'}
                aria-label={backTitle || 'Torna indietro'}
              >
                <ArrowLeft size={14} />
                <span>Indietro</span>
              </button>
            )}
            <div>
              <h2 id="modal-title" style={styles.title}>{title}</h2>
              {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={styles.closeBtn}
            title="Chiudi finestra (Esc)"
            aria-label="Chiudi modale"
          >
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-overlay)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-modal)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '88vh',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '16.5px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.25,
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    lineHeight: 1.4,
  },
  closeBtn: {
    padding: '5px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  body: {
    padding: '18px 20px',
    overflowY: 'auto',
  },
};
