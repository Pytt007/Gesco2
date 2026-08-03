// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Éditeur Complet des Rôles & Permissions (Drawer / Modal Plein Écran)
// (src/components/settings/UsersManager/FullRoleEditorDrawer.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { X, ShieldCheck, Layers } from 'lucide-react';
import PermissionsManager from '../PermissionsManager';

interface FullRoleEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FullRoleEditorDrawer({
  isOpen,
  onClose,
}: FullRoleEditorDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="modal"
        style={{
          width: '100%',
          maxWidth: 1240,
          maxHeight: '92vh',
          background: '#f8fafc',
          borderRadius: 24,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 28px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(99,102,241,0.3)',
              }}
            >
              <ShieldCheck size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1875rem', fontWeight: 900, color: '#ffffff' }}>
                Éditeur Complet des Rôles &amp; Modèles RBAC / IAM
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#a5b4fc' }}>
                Créez, dupliquez, personnalisez les permissions par module, exportez et importez la matrice.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm p-1"
            style={{ color: '#94a3b8' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area : PermissionsManager */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <PermissionsManager />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'right',
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ borderRadius: 10, padding: '8px 20px', fontWeight: 700 }}
          >
            Fermer l'Éditeur
          </button>
        </div>
      </div>
    </div>
  );
}
