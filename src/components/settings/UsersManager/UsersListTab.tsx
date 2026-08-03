// ─────────────────────────────────────────────────────────────────────────────
// GESCO — UsersListTab (src/components/settings/UsersManager/UsersListTab.tsx)
// Espace 1 : Liste épurée des comptes d'utilisateurs (Notion/Linear feel)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Search, Plus, UserCheck, UserX, KeyRound, Trash2, Edit3 } from 'lucide-react';
import { UserAccount } from '../../../types';
import { DEFAULT_PROFILES } from './UserModal';

interface UsersListTabProps {
  users: UserAccount[];
  loading: boolean;
  onAddUser: () => void;
  onEditUser: (user: UserAccount) => void;
  onToggleStatus: (userId: string, currentStatus?: string) => void;
  onResetPassword: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
}

export const UsersListTab: React.FC<UsersListTabProps> = ({
  users,
  loading,
  onAddUser,
  onEditUser,
  onToggleStatus,
  onResetPassword,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Filtrage des utilisateurs
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Mapper de profil d'accès
  const getProfileBadge = (role: string) => {
    const found = DEFAULT_PROFILES.find((p) => p.value === role);
    if (found) {
      return (
        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>{found.icon}</span> {found.label}
        </span>
      );
    }
    return <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{role}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── BARRE DE RECHERCHE ET ACTIONS PRINCIPALES ──────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Champ de recherche avec icône parfaitement intégrée */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: 320 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                color: '#94a3b8',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              placeholder="Rechercher un membre par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 36,
                paddingRight: 12,
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.84375rem',
                color: '#0f172a',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>

          {/* Filtre par Profil */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            style={{
              height: 38,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              padding: '0 12px',
              fontSize: '0.84375rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Tous les profils</option>
            {DEFAULT_PROFILES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.icon} {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bouton d'Ajout Membre */}
        <button
          type="button"
          onClick={onAddUser}
          style={{
            height: 38,
            borderRadius: 10,
            border: 'none',
            background: '#2563eb',
            color: '#ffffff',
            padding: '0 18px',
            fontSize: '0.84375rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
          }}
        >
          <Plus size={16} /> Ajouter un membre
        </button>
      </div>

      {/* ── TABLE ÉPURÉE DES COMPTES UTILISATEURS ──────────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive" style={{ overflow: 'visible' }}>
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.84375rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 20px', fontSize: '0.71875rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                  NOM &amp; EMAIL
                </th>
                <th style={{ padding: '12px 20px', fontSize: '0.71875rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                  PROFIL D'ACCÈS
                </th>
                <th style={{ padding: '12px 20px', fontSize: '0.71875rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                  STATUT
                </th>
                <th className="text-end" style={{ padding: '12px 20px', fontSize: '0.71875rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    Chargement des membres...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuspended = u.status === 'SUSPENDU';
                  const isOwner = u.isOwner;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Nom & Email */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.875rem',
                            }}
                          >
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem' }}>
                              {u.fullName || u.username} {isOwner && <span title="Propriétaire du compte">👑</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>
                              {u.email || `@${u.username}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Profil d'accès */}
                      <td style={{ padding: '14px 20px' }}>
                        {getProfileBadge(u.role)}
                      </td>

                      {/* Statut (🟢 Actif, 🟡 Suspendu) */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: isSuspended ? '#fef3c7' : '#dcfce7',
                            color: isSuspended ? '#d97706' : '#15803d',
                            border: isSuspended ? '1px solid #fcd34d' : '1px solid #86efac',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isSuspended ? '🟡 Suspendu' : '🟢 Actif'}
                        </span>
                      </td>

                      {/* Actions Simplifiées */}
                      <td className="text-end" style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm p-1 px-2"
                            onClick={() => onEditUser(u)}
                            style={{ borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            className={`btn ${isSuspended ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm p-1 px-2`}
                            onClick={() => onToggleStatus(u.id, u.status)}
                            disabled={isOwner}
                            style={{ borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}
                            title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                          >
                            {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm p-1 px-2"
                            onClick={() => onResetPassword(u)}
                            style={{ borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound size={14} />
                          </button>

                          {!isOwner && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm p-1 px-2"
                              onClick={() => onDeleteUser(u.id)}
                              style={{ borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}
                              title="Supprimer le compte"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
