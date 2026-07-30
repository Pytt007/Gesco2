// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Context & Hook de Confirmation Natif (src/context/ConfirmContext.tsx)
// Remplaçant élégant et premium pour window.confirm dans toute l'application
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Info, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const normalizedOptions: ConfirmOptions =
        typeof options === 'string'
          ? { message: options, title: 'Confirmation requise', variant: 'warning' }
          : { title: 'Confirmation requise', variant: 'warning', confirmText: 'Confirmer', cancelText: 'Annuler', ...options };

      setModalState({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState) {
      modalState.resolve(true);
      setModalState(null);
    }
  };

  const handleCancel = () => {
    if (modalState) {
      modalState.resolve(false);
      setModalState(null);
    }
  };

  const variant = modalState?.options.variant || 'warning';
  
  const iconConfig = {
    danger: { icon: ShieldAlert, bg: '#fef2f2', color: '#ef4444', btnBg: '#ef4444' },
    warning: { icon: AlertTriangle, bg: '#fffbeb', color: '#f59e0b', btnBg: '#f59e0b' },
    info: { icon: Info, bg: '#eff6ff', color: '#3b82f6', btnBg: '#2563eb' },
    success: { icon: CheckCircle2, bg: '#f0fdf4', color: '#10b981', btnBg: '#10b981' },
  }[variant];

  const IconComponent = iconConfig.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* ── MODALE DE CONFIRMATION NATIVE PREMIUM ──────────────────────────── */}
      {modalState?.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              margin: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermeture X */}
            <button
              onClick={handleCancel}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {/* Badge Icône */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: iconConfig.bg,
                color: iconConfig.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: `0 8px 20px ${iconConfig.color}25`,
              }}
            >
              <IconComponent size={28} />
            </div>

            {/* Titre */}
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {modalState.options.title || 'Confirmation requise'}
            </h3>

            {/* Message */}
            <p style={{ margin: '0 0 24px', fontSize: '0.9375rem', color: '#475569', lineHeight: 1.5 }}>
              {modalState.options.message}
            </p>

            {/* Boutons d'Action */}
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={handleCancel}
              >
                {modalState.options.cancelText || 'Annuler'}
              </button>

              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: iconConfig.btnBg,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${iconConfig.color}40`,
                  transition: 'all 0.15s ease',
                }}
                onClick={handleConfirm}
              >
                {modalState.options.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm doit être utilisé au sein d\'un ConfirmProvider');
  }
  return context.confirm;
}
