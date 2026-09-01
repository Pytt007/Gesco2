import React from 'react';
import { Clock, ShieldAlert, CheckCircle, LogOut } from 'lucide-react';

interface SessionTimeoutWarningModalProps {
  remainingSeconds: number;
  onStayConnected: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarningModal: React.FC<SessionTimeoutWarningModalProps> = ({
  remainingSeconds,
  onStayConnected,
  onLogout,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      aria-describedby="session-warning-desc"
    >
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '16px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div>
            <h3
              id="session-warning-title"
              style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#ffffff' }}
            >
              Session Inactive
            </h3>
            <span style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
              Sécurité du poste de travail
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p
            id="session-warning-desc"
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-muted, #64748b)',
              marginBottom: '1.25rem',
              lineHeight: 1.5,
            }}
          >
            Pour des raisons de sécurité, votre session sera automatiquement fermée en raison d'une inactivité prolongée.
          </p>

          {/* Countdown Clock Box */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <Clock size={22} color="#d97706" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', fontFamily: 'monospace' }}>
              {formattedTime}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={onLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 1.125rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--btn-secondary-bg, #f1f5f9)',
                color: 'var(--text-main, #334155)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={16} />
              Se déconnecter
            </button>
            <button
              onClick={onStayConnected}
              autoFocus
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.625rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle size={16} />
              Rester connecté
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarningModal;
