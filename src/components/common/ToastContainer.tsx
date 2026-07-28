// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Toast Notifications & Micro-Delight Feedback (ToastContainer.tsx)
// Feedback visuel gratifiant lors de l'accomplissement d'actions clés
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Sparkles, PartyPopper } from 'lucide-react';

const ICONS = {
  success: <Sparkles size={18} style={{ color: '#10b981', flexShrink: 0 }} />,
  error:   <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />,
  warning: <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />,
  info:    <Info size={18} style={{ color: '#0ea5e9', flexShrink: 0 }} />,
};

export default function ToastContainer() {
  const { notifications, removeNotification } = useToast();

  return (
    <div className="toast-container">
      {notifications.map((n) => {
        const isSuccess = n.type === 'success';
        return (
          <div
            key={n.id}
            className={`toast toast-${n.type}`}
            role="alert"
            style={{
              borderRadius: '12px',
              borderLeft: isSuccess ? '4px solid #10b981' : undefined,
              boxShadow: isSuccess ? '0 10px 30px rgba(16, 185, 129, 0.25)' : 'var(--shadow-lg)',
              background: isSuccess ? 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)' : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              animation: 'slideInRight 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {ICONS[n.type]}
            
            <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
              <span className="toast-message" style={{ fontWeight: isSuccess ? 700 : 500, color: '#0f172a' }}>
                {n.message}
              </span>
              {isSuccess && (
                <div style={{ fontSize: '0.6875rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                  ✓ Action enregistrée dans GESCO
                </div>
              )}
            </div>

            <button
              onClick={() => removeNotification(n.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                flexShrink: 0,
                marginLeft: 8,
              }}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
