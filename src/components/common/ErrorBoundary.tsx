import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * ErrorBoundary globale con design Dark Hardware Enthusiast.
 * Intercetta crash imprevisti dell'albero React preservando i dati su IndexedDB
 * ed evitando schermate bianche prive di spiegazioni.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log diagnostico in console per facilitare il debugging
    console.error('[PC Tracker ErrorBoundary] Errore non gestito intercettato:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Si è verificato un errore imprevisto';
      const errorMessage = this.state.error?.message || 'Errore sconosciuto';

      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header con icona */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#f43f5e',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  {title}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  I tuoi dati su IndexedDB sono integri e protetti.
                </p>
              </div>
            </div>

            {/* Messaggio errore */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {errorMessage}
            </div>

            {/* Pulsanti azione */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn btn-primary"
                style={{ fontSize: '13.5px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCcw size={15} />
                <span>Riprova operazione</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-secondary"
                style={{ fontSize: '13.5px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={15} />
                <span>Ricarica applicazione</span>
              </button>
            </div>

            {/* Dettagli tecnici collassabili */}
            {this.state.error?.stack && (
              <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {this.state.showDetails ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici (stack trace)'}
                </button>
                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.4,
                    }}
                  >
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
