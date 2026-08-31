import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Vérification périodique des mises à jour toutes les heures
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[GESCO PWA] Erreur d\'enregistrement SW:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '400px',
        background: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-main, #0f172a)',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Mise à jour disponible
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
              Une nouvelle version de GESCO est prête.
            </p>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          onClick={() => setNeedRefresh(false)}
          style={{
            background: 'none',
            border: '1px solid var(--border, #e2e8f0)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-muted, #64748b)',
            cursor: 'pointer',
          }}
        >
          Plus tard
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Mettre à jour
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
