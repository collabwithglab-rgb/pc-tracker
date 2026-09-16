import React from 'react';
import { usePCStore } from '../../store';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { notification, dismissNotification } = usePCStore();
  const [isExiting, setIsExiting] = React.useState(false);
  const exitTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!notification) {
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    const autoDismissTimer = window.setTimeout(() => {
      triggerExit();
    }, 3800);

    return () => {
      window.clearTimeout(autoDismissTimer);
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, [notification]);

  const triggerExit = () => {
    setIsExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      dismissNotification();
      setIsExiting(false);
    }, 140); // Durata calcolata in sintonia con --motion-toast-out
  };

  if (!notification) return null;

  const isSuccess = notification.type === 'success';

  return (
    <div style={styles.toastContainer}>
      <div
        className={isExiting ? 'toast-leaving' : 'toast-entering'}
        style={{
          ...styles.toast,
          borderColor: isSuccess ? 'var(--accent-emerald)' : 'var(--accent-ruby)',
        }}
        role="status"
        aria-live="polite"
      >
        {isSuccess ? (
          <CheckCircle2 size={18} color="var(--accent-emerald)" />
        ) : (
          <AlertCircle size={18} color="var(--accent-ruby)" />
        )}
        <span style={styles.message}>{notification.message}</span>
        <button
          onClick={triggerExit}
          style={styles.closeBtn}
          title="Chiudi notifica"
          aria-label="Chiudi notifica"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toastContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 18px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: 500,
  },
  message: {
    maxWidth: '360px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
  },
};
