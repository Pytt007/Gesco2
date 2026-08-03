// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assistant de Création Utilisateur (4 Étapes)
// (src/components/settings/UsersManager/UserRegistrationWizardModal.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  User, Shield, KeyRound, Phone, Mail, CheckCircle2, ArrowRight,
  ArrowLeft, X, Sparkles, UserCheck, Eye, EyeOff
} from 'lucide-react';
import { UserRole, UserAccount } from '../../../types';
import { DEFAULT_RBAC_ROLES, MODULES_META } from '../../../constants/rbac';

import { useToast } from '../../../context/ToastContext';

interface UserRegistrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    avatarUrl?: string;
  }) => Promise<boolean>;
}

export default function UserRegistrationWizardModal({
  isOpen,
  onClose,
  onSubmit,
}: UserRegistrationWizardModalProps) {
  const { addNotification } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'SECRETAIRE' as UserRole,
    avatarSeed: Math.random().toString(36).substring(7),
  });

  if (!isOpen) return null;

  const handleFirstNameChange = (val: string) => {
    setForm((prev) => {
      const generatedUsername = `${val.toLowerCase().replace(/[^a-z]/g, '')}.${prev.lastName.toLowerCase().replace(/[^a-z]/g, '')}`;
      return {
        ...prev,
        firstName: val,
        username: prev.username || generatedUsername,
      };
    });
  };

  const handleLastNameChange = (val: string) => {
    setForm((prev) => {
      const generatedUsername = `${prev.firstName.toLowerCase().replace(/[^a-z]/g, '')}.${val.toLowerCase().replace(/[^a-z]/g, '')}`;
      return {
        ...prev,
        lastName: val,
        username: prev.username || generatedUsername,
      };
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim()) {
        addNotification('error', 'Veuillez remplir au moins le nom, le prénom et l\'identifiant.');
        return;
      }
    }
    setStep((prev) => (prev + 1) as any);
  };

  const handlePrev = () => {
    setStep((prev) => (prev - 1) as any);
  };

  const handleFinish = async () => {
    setLoading(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${form.avatarSeed || form.username}`;

    const ok = await onSubmit({
      fullName,
      username: form.username.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      password: form.password || 'Gesco2026!',
      avatarUrl,
    });

    setLoading(false);
    if (ok) {
      onClose();
      setStep(1);
    }
  };

  const selectedRoleMeta = DEFAULT_RBAC_ROLES.find((r) => r.id === form.role) || DEFAULT_RBAC_ROLES[1];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540, borderRadius: 20, padding: 0, overflow: 'hidden' }}>

        {/* Header Modal */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 900, color: '#fff' }}>
                Création d'un Compte Utilisateur
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#a5b4fc' }}>
                Étape {step} sur 4 · {['Informations', 'Modèle de Rôle', 'Permissions', 'Résumé'][step - 1]}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm p-1" onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { num: 1, label: 'Informations' },
            { num: 2, label: 'Modèle Rôle' },
            { num: 3, label: 'Permissions' },
            { num: 4, label: 'Résumé' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '10px 4px',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: step === s.num ? '#6366f1' : step > s.num ? '#16a34a' : '#94a3b8',
                borderBottom: step === s.num ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {step > s.num ? '✓ ' : `${s.num}. `}{s.label}
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>

          {/* ÉTAPE 1 : INFORMATIONS */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Fatou"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="COULIBALY"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Identifiant de Connexion (@username) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
                  placeholder="f.coulibaly"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="f.coulibaly@ecole.com"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+225 07 00 00 00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mot de Passe Initial</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Par défaut : Gesco2026!"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : SÉLECTION DU MODÈLE DE RÔLE */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Sélectionnez le modèle de rôle à attribuer. Les modèles définissent le jeu de permissions par défaut.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { value: 'SECRETAIRE', label: 'Secrétaire', emoji: '👩‍💼', color: '#0284c7', desc: 'Scolarité, Élèves, Présences' },
                  { value: 'CAISSIER', label: 'Caissier', emoji: '💰', color: '#16a34a', desc: 'Encaissements & Recettes' },
                  { value: 'ENSEIGNANT', label: 'Enseignant', emoji: '👨‍🏫', color: '#f59e0b', desc: 'Notes, Bulletins, Emploi du Temps' },
                  { value: 'RESP_CANTINE', label: 'Resp. Cantine', emoji: '🍽️', color: '#ea580c', desc: 'Gestion des abonnements cantine' },
                  { value: 'RESP_TRANSPORT', label: 'Resp. Transport', emoji: '🚌', color: '#7c3aed', desc: 'Gestion des circuits transport' },
                  { value: 'ADMIN_GENERALE', label: 'Administrateur', emoji: '⚙️', color: '#0f172a', desc: 'Accès complet au système' },
                ].map((r) => {
                  const isSelected = form.role === r.value;
                  return (
                    <div
                      key={r.value}
                      onClick={() => setForm({ ...form, role: r.value as UserRole })}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: isSelected ? `2px solid ${r.color}` : '1px solid #e2e8f0',
                        background: isSelected ? `${r.color}0d` : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>{r.emoji}</span>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: isSelected ? r.color : '#0f172a' }}>
                          {r.label}
                        </div>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.71875rem', color: '#64748b' }}>
                        {r.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PERMISSIONS SPÉCIFIQUES */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.8125rem', color: '#1e40af' }}>
                💡 <strong>Permissions héritées du rôle "{selectedRoleMeta.label}" :</strong> Les accès aux modules de base sont automatiquement accordés.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MODULES_META.slice(0, 6).map((mod) => (
                  <div key={mod.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1rem' }}>{mod.emoji}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{mod.label}</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Hérité du rôle</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : RÉSUMÉ */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${form.avatarSeed || form.username}`}
                  alt="Avatar"
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #6366f1', margin: '0 auto 10px' }}
                />
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.125rem', color: '#0f172a' }}>
                  {form.firstName} {form.lastName}
                </h4>
                <span style={{ fontSize: '0.8125rem', color: '#6366f1', fontWeight: 700 }}>
                  @{form.username}
                </span>
              </div>

              <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', padding: 14, fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Rôle Métier :</span>
                  <span style={{ fontWeight: 800, color: selectedRoleMeta.color }}>{selectedRoleMeta.emoji} {selectedRoleMeta.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Email :</span>
                  <span style={{ fontWeight: 700 }}>{form.email || 'Non renseigné'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Téléphone :</span>
                  <span style={{ fontWeight: 700 }}>{form.phone || 'Non renseigné'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Statut initial :</span>
                  <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>ACTIF</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
        }}>
          {step > 1 ? (
            <button className="btn btn-secondary btn-sm" onClick={handlePrev} disabled={loading} style={{ borderRadius: 8 }}>
              <ArrowLeft size={14} /> Précédent
            </button>
          ) : <div />}

          {step < 4 ? (
            <button className="btn btn-primary btn-sm" onClick={handleNext} style={{ borderRadius: 8, padding: '8px 16px' }}>
              Suivant <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-success btn-sm text-white fw-bold" onClick={handleFinish} disabled={loading} style={{ borderRadius: 8, padding: '8px 20px' }}>
              {loading ? 'Création...' : '✓ Créer le Compte'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
