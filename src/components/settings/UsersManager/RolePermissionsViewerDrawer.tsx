// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Fenêtre Modale de Visualisation des Permissions d'un Rôle
// (src/components/settings/UsersManager/RolePermissionsViewerDrawer.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { X, Shield, Edit3, CheckCircle2, Lock, Eye, ArrowRight } from 'lucide-react';
import { DEFAULT_RBAC_ROLES, MODULES_META } from '../../../constants/rbac';
import { usePermissionContext } from '../../../context/PermissionContext';
import type { UserRole } from '../../../types';

interface RolePermissionsViewerDrawerProps {
  roleId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullEditor: () => void;
  isAdmin: boolean;
}

export default function RolePermissionsViewerDrawer({
  roleId,
  isOpen,
  onClose,
  onOpenFullEditor,
  isAdmin,
}: RolePermissionsViewerDrawerProps) {
  const { roles } = usePermissionContext();

  if (!isOpen) return null;

  const role = roles.find((r) => r.id === roleId) || DEFAULT_RBAC_ROLES.find((r) => r.id === roleId) || DEFAULT_RBAC_ROLES[0];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="modal shadow-lg"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '88vh',
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          animation: 'scaleUp 0.2s ease-out',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '24px 28px',
            background: `linear-gradient(135deg, ${role.color}25 0%, #0f172a 100%)`,
            borderBottom: `3px solid ${role.color}`,
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 20,
              top: 20,
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '2.5rem' }}>{role.emoji}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                  {role.label}
                </h3>
                <span
                  className="badge"
                  style={{
                    background: role.color,
                    color: '#ffffff',
                    borderRadius: 999,
                    padding: '3px 10px',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                  }}
                >
                  {role.isSystem ? 'Rôle Système' : 'Personnalisé'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                {role.description}
              </p>
            </div>
          </div>
        </div>

        {/* Action Header : Ouvrir l'Éditeur Complet */}
        {isAdmin && (
          <div
            style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
              Vous souhaitez ajuster les permissions de ce rôle ?
            </span>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onClose();
                onOpenFullEditor();
              }}
              style={{
                borderRadius: 8,
                fontSize: '0.78125rem',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 800,
              }}
            >
              <Edit3 size={14} /> Modifier ce rôle
            </button>
          </div>
        )}

        {/* Arbre des Modules Autorisés & Actions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Modules Métiers &amp; Actions Autorisées
          </div>

          {MODULES_META.map((mod) => {
            const modPerm = role.permissions?.[mod.id];
            const isEnabled = modPerm?.enabled ?? false;

            const activeActions = mod.actions.filter((a) => modPerm?.actions?.[a.id]);

            return (
              <div
                key={mod.id}
                style={{
                  borderRadius: 12,
                  border: isEnabled ? `1px solid ${mod.color}40` : '1px solid #f1f5f9',
                  background: isEnabled ? `${mod.color}06` : '#fafafa',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.25rem' }}>{mod.emoji}</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: isEnabled ? '#0f172a' : '#94a3b8' }}>
                      {mod.label}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      background: isEnabled ? '#dcfce7' : '#f1f5f9',
                      color: isEnabled ? '#15803d' : '#94a3b8',
                    }}
                  >
                    {isEnabled ? `✓ Autorisé (${activeActions.length}/${mod.actions.length})` : '✕ Accès Refusé'}
                  </span>
                </div>

                {isEnabled && activeActions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                    {activeActions.map((act) => (
                      <span
                        key={act.id}
                        style={{
                          fontSize: '0.71875rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                        }}
                      >
                        {act.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Restrictions contextuelles */}
                {modPerm?.restrictions && Object.keys(modPerm.restrictions).length > 0 && (
                  <div style={{ fontSize: '0.71875rem', color: '#b45309', fontWeight: 700, display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                    {modPerm.restrictions.ownClassOnly && <span>🔒 Uniquement ses classes</span>}
                    {modPerm.restrictions.ownSubjectOnly && <span>🔒 Uniquement ses matières</span>}
                    {modPerm.restrictions.readOnly && <span>👁️ Lecture seule</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: 10, padding: '6px 18px' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
