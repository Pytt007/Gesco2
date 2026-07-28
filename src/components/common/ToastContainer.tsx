import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
  error:   <XCircle size={16}     style={{ color: 'var(--color-danger)', flexShrink: 0 }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
  info:    <Info size={16}         style={{ color: 'var(--color-info)', flexShrink: 0 }} />,
};

export default function ToastContainer() {
  const { notifications, removeNotification } = useToast();

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast-${n.type}`} role="alert">
          {ICONS[n.type]}
          <span className="toast-message">{n.message}</span>
          <button
            onClick={() => removeNotification(n.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
              flexShrink: 0,
            }}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
