// ─────────────────────────────────────────────────────────────────────────────
// GESCO — UserModal (src/components/settings/UsersManager/UserModal.tsx)
// Modale épurée de création / édition d'un compte membre (Notion/Linear feel)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone } from 'lucide-react';
import { UserAccount, UserRole } from '../../../types';

export interface ProfileOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export const DEFAULT_PROFILES: ProfileOption[] = [
  { value: 'ADMIN_GENERALE', label: 'Administrateur Général', icon: '👑', description: 'Accès total à l\'ensemble du logiciel' },
  { value: 'SCOLAIRE_ADMIN', label: 'Accès Scolaire', icon: '🎓', description: 'Élèves, classes, notes, bulletins et discipline' },
  { value: 'FINANCE', label: 'Accès Finance', icon: '💰', description: 'Comptabilité, paiements et tarifs' },
  { value: 'CANTINE_TRANSPORT', label: 'Accès Cantine & Transport', icon: '🍽', description: 'Inscriptions cantine et circuits transport' },
  { value: 'SCOLAIRE_ENSEIGNANT', label: 'Enseignant', icon: '👨‍🏫', description: 'Saisie des notes et suivi des élèves attribués' },
];

interface UserModalProps {
  isOpen: boolean;
  user?: UserAccount | null;
  onClose: () => void;
  onSubmit: (userData: {
    fullName: string;
    username: string;
    email?: string;
    phone?: string;
    role: UserRole;
    password?: string;
  }) => Promise<boolean>;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  user,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('SCOLAIRE_ADMIN');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole((user.role as UserRole) || 'SCOLAIRE_ADMIN');
      setPassword('');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('SCOLAIRE_ADMIN');
      setPassword('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    const username = email ? email.split('@')[0] : fullName.toLowerCase().replace(/\s+/g, '.');
    const ok = await onSubmit({
      fullName: fullName.trim(),
      username,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
      password: password || undefined,
    });
    setSubmitting(false);

    if (ok) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card shadow-lg"
        style={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 16,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Header Modale */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>
              {user ? 'Modifier le membre' : 'Ajouter un nouveau membre'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              {user ? 'Ajustez le profil ou les coordonnées.' : 'Remplissez les informations pour créer un accès.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-light btn-sm p-1"
            onClick={onClose}
            style={{ borderRadius: 8, color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleFormSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Nom & Prénom */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', marginBottom: 6, display: 'block' }}>
                Nom &amp; Prénom <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  required
                  placeholder="ex: M. Kouamé BROU"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    paddingLeft: 36,
                    paddingRight: 12,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', marginBottom: 6, display: 'block' }}>
                Adresse Email
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="ex: k.brou@gesco.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    paddingLeft: 36,
                    paddingRight: 12,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', marginBottom: 6, display: 'block' }}>
                Téléphone (optionnel)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="ex: 07 01 02 03 04"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    paddingLeft: 36,
                    paddingRight: 12,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Profil d'accès */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', marginBottom: 6, display: 'block' }}>
                Profil d'Accès <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  padding: '0 12px',
                  outline: 'none',
                }}
              >
                {DEFAULT_PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mot de passe initial (si création) */}
            {!user && (
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#334155', marginBottom: 6, display: 'block' }}>
                  Mot de passe provisoire
                </label>
                <input
                  type="password"
                  placeholder="Par défaut: gesco2026"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-bold"
              onClick={onClose}
              style={{ borderRadius: 8, padding: '7px 18px' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm fw-bold"
              style={{ borderRadius: 8, padding: '7px 22px', background: '#2563eb' }}
            >
              {submitting ? 'Enregistrement...' : user ? 'Mettre à jour' : 'Ajouter le membre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
