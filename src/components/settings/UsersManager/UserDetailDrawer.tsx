// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Fenêtre Modale Utilisateur 5 Onglets (Centrée au milieu de l'écran)
// (src/components/settings/UsersManager/UserDetailDrawer.tsx)
// Onglets : Informations | Rôle | Permissions | Historique (Timeline) | Journal d'audit
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  X, Shield, User, KeyRound, Phone, Mail, Clock, Lock, Unlock,
  Crown, RefreshCw, FileText, CheckCircle2, AlertTriangle, ChevronRight,
  ShieldCheck, Activity, Trash2, Edit2, Calendar, Eye
} from 'lucide-react';
import { UserAccount, UserRole, UserAccountStatus } from '../../../types';
import { DEFAULT_RBAC_ROLES, MODULES_META } from '../../../constants/rbac';
import { usePermissionContext } from '../../../context/PermissionContext';
import { useConfirm } from '../../../context/ConfirmContext';

interface UserDetailDrawerProps {
  user: UserAccount | null;
  currentUser: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole: (userId: string, role: UserRole) => Promise<boolean>;
  onToggleStatus: (userId: string, currentStatus: UserAccountStatus) => void;
  onResetPassword: (userId: string) => void;
  onTransferOwnership?: (newOwnerId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onOpenFullEditor: () => void;
  onOpenRoleViewer: () => void;
  onOpenRoleChange?: (user: UserAccount) => void;
}

type UserDrawerTab = 'INFO' | 'ROLE' | 'PERMISSIONS' | 'HISTORY' | 'AUDIT';

export default function UserDetailDrawer({
  user,
  currentUser,
  isOpen,
  onClose,
  onUpdateRole,
  onToggleStatus,
  onResetPassword,
  onTransferOwnership,
  onDeleteUser,
  onOpenFullEditor,
  onOpenRoleViewer,
  onOpenRoleChange,
}: UserDetailDrawerProps) {
  const { iamAuditLogs } = usePermissionContext();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<UserDrawerTab>('INFO');
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  if (!isOpen || !user) return null;

  const isCurrentUserOwner = currentUser?.isOwner || currentUser?.role === 'ADMIN_GENERALE';
  const isTargetOwner = user.isOwner;

  const roleMeta = DEFAULT_RBAC_ROLES.find((r) => r.id === user.role) || DEFAULT_RBAC_ROLES[0];

  const getStatusBadge = (status: UserAccountStatus) => {
    switch (status) {
      case 'ACTIF':
        return { label: 'ACTIF', bg: '#dcfce7', color: '#15803d' };
      case 'SUSPENDU':
        return { label: 'SUSPENDU', bg: '#fee2e2', color: '#b91c1c' };
      case 'VERROUILLE':
        return { label: 'VERROUILLÉ', bg: '#fef3c7', color: '#92400e' };
      case 'INVITATION_ENVOYEE':
        return { label: 'INVITÉ', bg: '#e0f2fe', color: '#0369a1' };
      case 'DESACTIVE':
        return { label: 'DÉSACTIVÉ', bg: '#f1f5f9', color: '#64748b' };
      default:
        return { label: status || 'ACTIF', bg: '#dcfce7', color: '#15803d' };
    }
  };

  const statusBadge = getStatusBadge(user.status);

  // Journal d'audit filtré uniquement pour cet utilisateur
  const userAuditLogs = iamAuditLogs.filter(
    (log) => log.userId === user.id || log.targetUserId === user.id || log.userName === user.fullName
  );

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
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
          maxWidth: 640,
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
        {/* Header Modal Centré */}
        <div
          style={{
            padding: '24px 28px',
            background: isTargetOwner
              ? 'linear-gradient(135deg, #78350f 0%, #0f172a 100%)'
              : `linear-gradient(135deg, ${roleMeta.color}25 0%, #0f172a 100%)`,
            borderBottom: `3px solid ${roleMeta.color}`,
            color: '#ffffff',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
              alt={user.fullName}
              style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid #ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>{user.fullName}</h3>
                {isTargetOwner && (
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 900 }}>
                    👑 PROPRIÉTAIRE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#a5b4fc', marginTop: 2 }}>@{user.username}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <span className="badge" style={{ background: roleMeta.color, color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 800 }}>
                  {roleMeta.emoji} {roleMeta.label}
                </span>
                <span className="badge" style={{ background: statusBadge.bg, color: statusBadge.color, borderRadius: 12, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 800 }}>
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Rapides Admin Header */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onResetPassword(user.id)}
            style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <KeyRound size={13} /> Reset Pass
          </button>

          {!isTargetOwner && (
            <button
              className={`btn btn-sm ${user.status === 'SUSPENDU' ? 'btn-success' : 'btn-outline-warning'}`}
              onClick={() => onToggleStatus(user.id, user.status)}
              style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {user.status === 'SUSPENDU' ? <Unlock size={13} /> : <Lock size={13} />}
              {user.status === 'SUSPENDU' ? 'Activer' : 'Suspendre'}
            </button>
          )}

          {isCurrentUserOwner && !isTargetOwner && onTransferOwnership && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Transfert de Propriété',
                  message: `Voulez-vous vraiment transférer la propriété officielle de l'établissement à ${user.fullName} ?`,
                  confirmText: 'Transférer la Propriété',
                  cancelText: 'Annuler',
                  variant: 'warning',
                });
                if (ok) onTransferOwnership(user.id);
              }}
              style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#6366f1', borderColor: '#6366f1' }}
            >
              <Crown size={13} /> Transférer Propriété
            </button>
          )}

          {!isTargetOwner && onDeleteUser && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Suppression de Compte',
                  message: `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.fullName} ?`,
                  confirmText: 'Oui, Supprimer',
                  cancelText: 'Annuler',
                  variant: 'danger',
                });
                if (ok) onDeleteUser(user.id);
              }}
              style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 8px', color: '#dc2626' }}
              title="Supprimer le compte"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Navigation 5 Onglets */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', overflowX: 'auto' }}>
          {[
            { id: 'INFO', label: 'Informations' },
            { id: 'ROLE', label: 'Rôle' },
            { id: 'PERMISSIONS', label: 'Permissions' },
            { id: 'HISTORY', label: 'Historique' },
            { id: 'AUDIT', label: 'Audit' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                flex: 1,
                padding: '12px 6px',
                border: 'none',
                borderBottom: activeTab === t.id ? '3px solid #6366f1' : '3px solid transparent',
                background: 'transparent',
                color: activeTab === t.id ? '#6366f1' : '#64748b',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Corps Modal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* 1. INFORMATIONS */}
          {activeTab === 'INFO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card p-3" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                  Coordonnées Personnelles &amp; Dates
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Nom complet :</span>
                    <strong style={{ color: '#0f172a' }}>{user.fullName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> Email :</span>
                    <strong style={{ color: '#0f172a' }}>{user.email || 'Non renseigné'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> Téléphone :</span>
                    <strong style={{ color: '#0f172a' }}>{user.phone || 'Non renseigné'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Membre depuis :</span>
                    <strong style={{ color: '#0f172a' }}>{new Date(user.createdAt || Date.now()).toLocaleDateString('fr-FR')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Dernière connexion :</span>
                    <strong style={{ color: '#0f172a' }}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : 'Récemment'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. RÔLE */}
          {activeTab === 'ROLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                className="card p-4"
                style={{
                  borderRadius: 14,
                  border: `2px solid ${roleMeta.color}30`,
                  background: `${roleMeta.color}05`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2rem' }}>{roleMeta.emoji}</span>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: roleMeta.color }}>
                      {roleMeta.label}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                      {roleMeta.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={onOpenRoleViewer}
                    style={{ borderRadius: 8, fontSize: '0.78125rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
                  >
                    <Eye size={14} /> Voir les permissions
                  </button>

                  {!isTargetOwner && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        if (onOpenRoleChange) onOpenRoleChange(user);
                        else setShowRoleSelect(!showRoleSelect);
                      }}
                      style={{ borderRadius: 8, fontSize: '0.78125rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                      <Edit2 size={14} /> Changer le rôle
                    </button>
                  )}
                </div>

                {showRoleSelect && (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Nouveau Modèle de Rôle :</label>
                    <select
                      className="form-select"
                      value={user.role}
                      onChange={(e) => {
                        onUpdateRole(user.id, e.target.value as UserRole);
                        setShowRoleSelect(false);
                      }}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      {DEFAULT_RBAC_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. PERMISSIONS */}
          {activeTab === 'PERMISSIONS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Permissions Héritées ({roleMeta.label})
                </div>
                {isCurrentUserOwner && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={onOpenFullEditor}
                    style={{ borderRadius: 8, fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800 }}
                  >
                    <ShieldCheck size={13} /> Modifier les permissions
                  </button>
                )}
              </div>

              {MODULES_META.map((mod) => {
                const modPerm = roleMeta.permissions?.[mod.id];
                const isEnabled = modPerm?.enabled ?? false;
                return (
                  <div
                    key={mod.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isEnabled ? `1px solid ${mod.color}30` : '1px solid #f1f5f9',
                      background: isEnabled ? `${mod.color}08` : '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{mod.emoji}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isEnabled ? '#0f172a' : '#94a3b8' }}>
                        {mod.label}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        background: isEnabled ? '#dcfce7' : '#f1f5f9',
                        color: isEnabled ? '#15803d' : '#94a3b8',
                      }}
                    >
                      {isEnabled ? '✓ Accès' : '✕ Refusé'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. HISTORIQUE (Timeline Chronologique) */}
          {activeTab === 'HISTORY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Timeline Chronologique des Activités
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', paddingLeft: 16, borderLeft: '2px solid #e2e8f0' }}>
                {[
                  { title: 'Connexion au système', detail: 'IP : 127.0.0.1 · Chrome / Windows', time: 'Aujourd\'hui à 14:52', type: 'LOGIN' },
                  { title: 'Consultation du registre des élèves', detail: 'Scolarité → Recherche', time: 'Hier à 16:30', type: 'ACTION' },
                  { title: 'Changement de rôle vers ' + roleMeta.label, detail: 'Effectué par l\'Administrateur', time: 'Il y a 3 jours', type: 'ROLE' },
                  { title: 'Création du compte', detail: 'Compte initialisé', time: new Date(user.createdAt || Date.now()).toLocaleDateString('fr-FR'), type: 'CREATE' },
                ].map((ev, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -23,
                        top: 2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: ev.type === 'LOGIN' ? '#16a34a' : ev.type === 'ROLE' ? '#6366f1' : '#0284c7',
                        border: '2px solid #ffffff',
                      }}
                    />
                    <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#0f172a' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{ev.detail}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 2 }}>{ev.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. JOURNAL D'AUDIT FILTRÉ */}
          {activeTab === 'AUDIT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Journal d'Audit Sécurisé pour {user.fullName}
              </div>

              {userAuditLogs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0', fontSize: '0.8125rem' }}>
                  Aucune entrée d'audit enregistrée spécifiquement pour cet utilisateur.
                </p>
              ) : (
                userAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '0.78125rem',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>
                      [{log.category}] {log.detail}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.71875rem', marginTop: 4 }}>
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: 10, padding: '6px 18px' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
