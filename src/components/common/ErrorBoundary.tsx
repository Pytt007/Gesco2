import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { errorTelemetryService } from '../../services/monitoring/errorTelemetryService';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showHomeButton?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GESCO ErrorBoundary] Exception interceptée avec succès:', error, errorInfo);
    errorTelemetryService.captureException(error, {
      componentStack: errorInfo?.componentStack || undefined,
      severity: 'FATAL',
    });
    (this as any).setState({ errorInfo });
  }

  private handleRetry = () => {
    if ((this as any).props.onReset) {
      (this as any).props.onReset();
    }
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    (this as any).setState((prev: ErrorBoundaryState) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    const currentState = (this as any).state as ErrorBoundaryState;
    const currentProps = (this as any).props as ErrorBoundaryProps;

    if (currentState.hasError) {
      const title = currentProps.fallbackTitle || "Une interruption est survenue dans cette vue";
      const message = currentProps.fallbackMessage || "Un composant a rencontré un état imprévu. L'application reste active et vos autres données sont sécurisées.";

      return (
        <div style={{
          width: '100%',
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '540px',
            background: 'var(--bg-surface, #ffffff)',
            color: 'var(--text-main, #0f172a)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              margin: '0 0 0.5rem',
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.02em',
            }}>
              {title}
            </h3>

            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted, #64748b)',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}>
              {message}
            </p>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} /> Réessayer la vue
              </button>

              <button
                onClick={this.handleReload}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Recharger la page
              </button>

              {currentProps.showHomeButton !== false && (
                <button
                  onClick={this.handleGoHome}
                  className="btn btn-ghost"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  <Home size={16} /> Accueil
                </button>
              )}
            </div>

            {currentState.error && (
              <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <button
                  onClick={this.toggleDetails}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--text-muted, #64748b)',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {currentState.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {currentState.showDetails ? 'Masquer le détail technique' : 'Détail technique du diagnostic'}
                </button>

                {currentState.showDetails && (
                  <pre style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    overflowX: 'auto',
                    maxHeight: '140px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {currentState.error.name}: {currentState.error.message}
                    {currentState.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return currentProps.children;
  }
}

export default ErrorBoundary;
