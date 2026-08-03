// ─────────────────────────────────────────────────────────────────────────────
// GESCO — EditProfileModal (src/components/settings/UsersManager/EditProfileModal.tsx)
// Modale épurée d'attribution des modules accessibles par profil (Notion feel)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { X, Shield, CheckSquare, Square } from 'lucide-react';
import { ProfileOption } from './UserModal';

export interface AssignableModule {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const ALL_ASSIGNABLE_MODULES: AssignableModule[] = [
  { id: 'STUDENTS', name: 'Élèves', icon: '🎓', description: 'Inscriptions, fiches et dossiers' },
  { id: 'CLASSES', name: 'Classes', icon: '🏫', description: 'Gestion des classes et effectifs' },
  { id: 'TEACHERS', name: 'Enseignants', icon: '👨‍🏫', description: 'Affectations et corps enseignant' },
  { id: 'GRADES', name: 'Notes & Évaluations', icon: '📝', description: 'Saisie et validation des évaluations' },
  { id: 'REPORTS', name: 'Bulletins', icon: '📄', description: 'Impression et calculs des bulletins' },
  { id: 'DISCIPLINE', name: 'Discipline', icon: '⚖️', description: 'Assiduité, retards et sanctions' },
  { id: 'LIBRARY', name: 'Bibliothèque', icon: '📚', description: 'Emprunts et manuels scolaires' },
  { id: 'FINANCE', name: 'Finance', icon: '💰', description: 'Comptabilité, écolages et tarifs' },
  { id: 'CANTEEN', name: 'Cantine', icon: '🍽', description: 'Restauration et abonnements' },
  { id: 'TRANSPORT', name: 'Transport', icon: '🚌', description: 'Circuits et cartes de transport' },
  { id: 'SETTINGS', name: 'Paramètres', icon: '⚙️', description: 'Configuration générale et années' },
  { id: 'USERS', name: 'Utilisateurs', icon: '👤', description: 'Comptes et profils d\'accès' },
];

interface EditProfileModalProps {
  isOpen: boolean;
  profile: ProfileOption | null;
  assignedModuleIds?: string[];
  onClose: () => void;
  onSave: (profileValue: string, moduleIds: string[]) => Promise<boolean>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  assignedModuleIds = ['STUDENTS', 'CLASSES', 'GRADES', 'REPORTS'],
  onClose,
  onSave,
}) => {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.value === 'ADMIN_GENERALE') {
        setSelectedModules(ALL_ASSIGNABLE_MODULES.map((m) => m.id));
      } else if (profile.value === 'FINANCE') {
        setSelectedModules(['FINANCE', 'CANTEEN', 'TRANSPORT']);
      } else if (profile.value === 'CANTINE_TRANSPORT') {
        setSelectedModules(['CANTEEN', 'TRANSPORT']);
      } else if (profile.value === 'SCOLAIRE_ENSEIGNANT') {
        setSelectedModules(['GRADES', 'STUDENTS']);
      } else {
        setSelectedModules(assignedModuleIds);
      }
    }
  }, [profile, assignedModuleIds, isOpen]);

  if (!isOpen || !profile) return null;

  const isAdminProfile = profile.value === 'ADMIN_GENERALE';

  const toggleModule = (id: string) => {
    if (isAdminProfile) return; // Admin a accès total
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(profile.value, selectedModules);
    setSaving(false);
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
          maxWidth: 620,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{profile.icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>
                Accès du profil : {profile.label}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Cochez ou décochez les modules accessibles pour ce profil d'accès.
              </p>
            </div>
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

        {/* Grille des modules attribuables */}
        <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
          {isAdminProfile && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '0.8125rem',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              👑 Le profil Administrateur Général possède un accès complet et inconditionnel à l'ensemble du système.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {ALL_ASSIGNABLE_MODULES.map((mod) => {
              const isChecked = selectedModules.includes(mod.id);

              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isChecked ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    background: isChecked ? '#f0f7ff' : '#ffffff',
                    cursor: isAdminProfile ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: 2 }}>{mod.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: isChecked ? '#1d4ed8' : '#0f172a' }}>
                      {mod.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      {mod.description}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    disabled={isAdminProfile}
                    style={{ width: 18, height: 18, accentColor: '#2563eb', marginTop: 2 }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700 }}>
            {selectedModules.length} module(s) sélectionné(s)
          </span>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-bold"
              onClick={onClose}
              style={{ borderRadius: 8, padding: '7px 18px' }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="btn btn-primary btn-sm fw-bold"
              style={{ borderRadius: 8, padding: '7px 22px', background: '#2563eb' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
