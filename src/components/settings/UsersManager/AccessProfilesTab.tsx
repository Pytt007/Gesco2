// ─────────────────────────────────────────────────────────────────────────────
// GESCO — AccessProfilesTab (src/components/settings/UsersManager/AccessProfilesTab.tsx)
// Espace 2 : Gestion des profils d'accès simples (Notion/Linear feel sans jargon)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Shield, Users, Edit3, Lock } from 'lucide-react';
import { UserAccount } from '../../../types';
import { DEFAULT_PROFILES, ProfileOption } from './UserModal';

interface AccessProfilesTabProps {
  users: UserAccount[];
  onEditProfile: (profile: ProfileOption) => void;
}

export const AccessProfilesTab: React.FC<AccessProfilesTabProps> = ({
  users,
  onEditProfile,
}) => {
  // Calculer le nombre d'utilisateurs par profil
  const getUserCountByRole = (roleValue: string) => {
    return users.filter((u) => u.role === roleValue).length;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── EN-TÊTE ESPACE PROFILS ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
            Profils d'Accès Standards
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
            Chaque profil détermine la liste des modules accessibles pour les membres attribués.
          </p>
        </div>
      </div>

      {/* ── LISTES DES PROFILS ÉPURÉS (NOTION CARDS) ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEFAULT_PROFILES.map((profile) => {
          const userCount = getUserCountByRole(profile.value);
          const isAdmin = profile.value === 'ADMIN_GENERALE';

          return (
            <div
              key={profile.value}
              className="card shadow-sm"
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Icône & Titre Profil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 260 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  {profile.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                      {profile.label}
                    </h4>
                    {isAdmin && (
                      <span className="badge bg-primary" style={{ fontSize: '0.6875rem' }}>
                        Accès Total
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                    {profile.description}
                  </div>
                </div>
              </div>

              {/* Compteur & Bouton Modifier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={15} className="text-muted" />
                  <span>{userCount} membre{userCount > 1 ? 's' : ''}</span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm fw-bold"
                  onClick={() => onEditProfile(profile)}
                  style={{ borderRadius: 8, padding: '7px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Edit3 size={14} /> Modifier les accès
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
