// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Modal Design System de Changement de Rôle (Zero browser prompt)
// (src/components/settings/UsersManager/RoleChangeModal.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { X, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { DEFAULT_RBAC_ROLES } from '../../../constants/rbac';
import type { UserRole, UserAccount } from '../../../types';

interface RoleChangeModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, newRole: UserRole) => void;
}

export default function RoleChangeModal({
  user,
  isOpen,
  onClose,
  onConfirm,
}: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || 'FINANCE');

  if (!isOpen || !user) return null;

  const currentRoleMeta = DEFAULT_RBAC_ROLES.find((r) => r.id === user.role) || DEFAULT_RBAC_ROLES[0];

  const handleSave = () => {
    onConfirm(user.id, selectedRole);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1300,
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
          maxWidth: 540,
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
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1875rem', fontWeight: 900, color: '#ffffff' }}>
                Changer le Modèle de Rôle
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#a5b4fc' }}>
                Affecter un nouveau rôle à <strong>{user.fullName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
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
        </div>

        {/* Sélection des Rôles sous forme de cartes */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Sélectionnez le nouveau modèle de rôle :
          </div>

          {DEFAULT_RBAC_ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            const isCurrent = user.role === role.id;

            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id as UserRole)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: isSelected ? `2px solid ${role.color}` : '1px solid #e2e8f0',
                  background: isSelected ? `${role.color}0a` : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '1.75rem' }}>{role.emoji}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>
                        {role.label}
                      </span>
                      {isCurrent && (
                        <span className="badge" style={{ background: '#e2e8f0', color: '#475569', borderRadius: 10, padding: '2px 6px', fontSize: '0.625rem', fontWeight: 800 }}>
                          Rôle Actuel
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78125rem', color: '#64748b' }}>
                      {role.description}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: isSelected ? `2px solid ${role.color}` : '2px solid #cbd5e1',
                    background: isSelected ? role.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Check size={14} color="#ffffff" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
          }}
        >
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: 10 }}>
            Annuler
          </button>
          <button
            className="btn btn-primary btn-sm fw-bold"
            onClick={handleSave}
            style={{ borderRadius: 10, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Valider le rôle <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
