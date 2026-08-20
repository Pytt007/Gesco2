import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../hooks/useSettings';
import { useUsers, useRoles, usePermissions } from '../hooks/users';
import { UserRole, UserAccount, SchoolYearItem } from '../types';
import { ROLE_MODULES } from '../constants/permissions';
import {
  Building, Calendar, Clock, Sliders, Users, Shield, Plus, Save,
  Trash2, Lock, Eye, EyeOff, X, Search, Settings2, Check, RotateCcw, ShieldCheck,
  Upload, Image, Copy,
} from 'lucide-react';
import DuplicateSchoolYearWizardModal from '../components/settings/DuplicateSchoolYearWizardModal';
import PermissionsManager from '../components/settings/PermissionsManager/index';
import UsersManager from '../components/settings/UsersManager/index';
import UsersAndRolesManager from '../components/settings/UsersManager/UsersAndRolesManager';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const ALL_SYSTEM_MODULES = [
  'Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel',
  'Cantine', 'Transport', 'Activités', 'Scolarité', 'Dépenses',
  'Rapports', 'Historique', 'Statistiques', 'Paramètres', 'Notes',
];

const ROLES: { value: UserRole; label: string; color: string; description: string }[] = [
  { value: 'ADMIN_GENERALE', label: 'Administrateur Général', color: '#4f46e5', description: 'Accès complet à toutes les fonctionnalités.' },
  { value: 'FINANCE', label: 'Finance', color: '#10b981', description: 'Accès Scolarité, Dépenses, Rapports, Statistiques.' },
  { value: 'SCOLAIRE_ENSEIGNANT', label: 'Scolaire / Enseignant', color: '#f59e0b', description: 'Accès Élèves, Classes, Notes, Activités.' },
  { value: 'CANTINE_TRANSPORT', label: 'Cantine & Transport', color: '#0ea5e9', description: 'Accès Cantine et Transport uniquement.' },
];

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();
  const confirm = useConfirm();

  // Hooks d'Architecture 5 Couches
  const {
    loading: settingsLoading, saving: settingsSaving, schoolInfo, schoolYears, academicTerms, generalConfig,
    reload: reloadSettings,
    saveSchoolInfo, addSchoolYear, activateSchoolYear, closeSchoolYear, archiveSchoolYear, updateSchoolYear, deleteSchoolYear, saveTerms, saveGeneralConfig,
  } = useSettings();

  const [blockedDeleteSummary, setBlockedDeleteSummary] = useState<{
    yearLabel: string;
    error: string;
    summary: {
      classesCount: number;
      studentsCount: number;
      gradesCount: number;
      bulletinsCount: number;
      paymentsCount: number;
      documentsCount: number;
      totalRecordsCount: number;
    };
  } | null>(null);

  const [duplicateYearTarget, setDuplicateYearTarget] = useState<SchoolYearItem | null>(null);

  const {
    users: userAccountsList, allUsers, loading: usersLoading, saving: usersSaving,
    error: usersError, success: usersSuccess, search, setSearch, filterRole, setFilterRole,
    refresh: refreshUsers,
    createUser: createAccountViaHook, updateUserRole: updateRoleViaHook, archiveUser: archiveAccountViaHook,
  } = useUsers({ pageSize: 50 });

  // Synchronisation temps réel automatique
  useRealtimeSync({
    tables: ['school_settings', 'profiles'],
    onDataChange: () => {
      reloadSettings();
      refreshUsers();
    },
  });

  const { roles: roleDetailsList } = useRoles();
  const { allPermissions, checkPermission } = usePermissions();

  const [activeTab, setActiveTab] = useState<'school' | 'years' | 'terms' | 'config' | 'accounts' | 'permissions'>('school');

  // Formulaire Établissement
  const [infoForm, setInfoForm] = useState({
    name: '', logoUrl: '', address: '', phone: '', email: '',
    city: '', country: '', currency: '', language: '',
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Le fichier doit être une image valide (PNG, JPEG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      addNotification('error', 'La taille du logo ne doit pas dépasser 3 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setInfoForm((prev) => ({ ...prev, logoUrl: base64Url }));
      addNotification('success', 'Nouveau logo sélectionné. Cliquez sur Sauvegarder pour valider !');
    };
    reader.readAsDataURL(file);
  };

  // Formulaire Nouvelle Année
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearForm, setNewYearForm] = useState({ label: '', startDate: '', endDate: '' });

  // Formulaire Configuration Générale
  const [configForm, setConfigForm] = useState({
    numberingPrefixStudent: '', numberingPrefixStaff: '',
    timezone: '', dateFormat: '', enableEmailAlerts: true, enableSmsAlerts: false,
  });

  // Formulaire Trimestres
  const [termsForm, setTermsForm] = useState(academicTerms);

  // Formulaire Nouvel Utilisateur
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '', username: '', password: '', role: 'FINANCE' as UserRole,
  });

  // Habilitations Personnalisées par Rôle (Persistence LocalStorage)
  const STORAGE_KEY_ROLE_MODULES = 'gesco_custom_role_modules';
  const [customRoleModules, setCustomRoleModules] = useState<Record<UserRole, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE_MODULES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ROLE_MODULES;
  });

  const toggleModuleForRole = (roleValue: UserRole, mod: string) => {
    if (!isAdmin) {
      addNotification('error', 'Seul un Administrateur Général peut modifier les habilitations.');
      return;
    }
    setCustomRoleModules((prev) => {
      const currentMods = prev[roleValue] || [];
      const updated = currentMods.includes(mod)
        ? currentMods.filter((m) => m !== mod)
        : [...currentMods, mod];

      const newObj = { ...prev, [roleValue]: updated };
      try {
        localStorage.setItem(STORAGE_KEY_ROLE_MODULES, JSON.stringify(newObj));
      } catch {}
      return newObj;
    });
    addNotification('success', `Habilitation "${mod}" mise à jour.`);
  };

  const handleResetRoleModules = () => {
    if (!isAdmin) return;
    setCustomRoleModules(ROLE_MODULES);
    try {
      localStorage.removeItem(STORAGE_KEY_ROLE_MODULES);
    } catch {}
    addNotification('success', 'Habilitations réinitialisées aux valeurs par défaut.');
  };

  useEffect(() => {
    if (schoolInfo) setInfoForm(schoolInfo);
    if (generalConfig) setConfigForm(generalConfig);
    if (academicTerms) setTermsForm(academicTerms);
  }, [schoolInfo, generalConfig, academicTerms]);

  // Notifications basées sur les états exposés par les Hooks
  useEffect(() => {
    if (usersError) addNotification('error', usersError);
    if (usersSuccess) addNotification('success', usersSuccess);
  }, [usersError, usersSuccess, addNotification]);

  const isAdmin = currentUser?.role === 'ADMIN_GENERALE';

  // Actions Établissement
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveSchoolInfo(infoForm);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      window.dispatchEvent(new CustomEvent('gesco_school_info_updated', { detail: infoForm }));
      addNotification('success', 'Informations et logo de l\'établissement enregistrés avec succès !');
    }
  };

  // Actions Années Scolaires
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addSchoolYear(newYearForm);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      addNotification('success', `Année scolaire ${newYearForm.label} ajoutée !`);
      setShowAddYearModal(false);
      setNewYearForm({ label: '', startDate: '', endDate: '' });
    }
  };

  // Actions Configuration Générale
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveGeneralConfig(configForm);
    if (res.error) addNotification('error', res.error);
    else addNotification('success', 'Configuration générale mise à jour !');
  };

  // Actions Trimestres
  const handleSaveTermsSubmit = async () => {
    const res = await saveTerms(termsForm);
    if (res.error) addNotification('error', res.error);
    else addNotification('success', 'Configuration des périodes mise à jour !');
  };

  // Actions Utilisateurs (via useUsers Hook)
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.fullName.trim()) { addNotification('error', 'Nom complet requis.'); return; }
    if (!newUserForm.username.trim()) { addNotification('error', 'Identifiant requis.'); return; }
    if (newUserForm.password.length < 6) { addNotification('error', 'Mot de passe minimum 6 caractères.'); return; }

    const ok = await createAccountViaHook(
      newUserForm.username.trim().toLowerCase(),
      newUserForm.password.trim(),
      newUserForm.role,
      newUserForm.fullName.trim()
    );

    if (ok) {
      setShowAddUserModal(false);
      setNewUserForm({ fullName: '', username: '', password: '', role: 'FINANCE' });
    }
  };

  const handleUpdateRoleSubmit = async (userId: string, role: UserRole) => {
    await updateRoleViaHook(userId, role);
  };

  const handleArchiveUserSubmit = async (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      addNotification('error', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Suppression de compte',
      message: `Voulez-vous vraiment supprimer le compte utilisateur de ${user.fullName} ?`,
      confirmText: 'Oui, supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    await archiveAccountViaHook(user.id);
  };

  if (settingsLoading || usersLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── BANNIÈRE HERO SAAS ─────────────────────────────────────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings2 size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Paramètres
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>
                Configuration globale du système &amp; habilitations
              </p>
            </div>
          </div>
          {isAdmin && activeTab === 'accounts' && (
            <button id="btn-open-add-user" className="btn btn-sm" onClick={() => setShowAddUserModal(true)}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontWeight: 700, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Créer un Accès
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div style={{
          background: 'var(--color-warning-light)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem 1rem',
          fontSize: '0.8125rem',
          color: '#78350f',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Shield size={16} /> La modification des paramètres généraux est réservée à l'Administrateur Général.
        </div>
      )}

      {/* Onglets de navigation — style underline premium sans emojis */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
        {[
          { id: 'school',   label: 'Établissement',       icon: <Building size={15} /> },
          { id: 'years',    label: 'Années Scolaires',   icon: <Calendar size={15} /> },
          { id: 'terms',    label: 'Trimestres',          icon: <Clock size={15} /> },
          { id: 'config',   label: 'Config. Générale',   icon: <Sliders size={15} /> },
          { id: 'accounts', label: 'Utilisateurs & Rôles',icon: <Users size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '0.75rem 1.125rem',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              marginBottom: '-2px',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 1. INFORMATIONS ÉTABLISSEMENT */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveInfo} className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="card-header" style={{ padding: '18px 24px', background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>Informations Générales &amp; Identité Visuelle</h3>
          </div>
          <div className="card-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* WIDGET UPLOAD LOGO ÉTABLISSEMENT */}
            <div style={{
              background: 'var(--bg-surface-hover, #f8fafc)',
              border: '1px dashed var(--border)',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  background: 'var(--bg-surface, #ffffff)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}>
                  {infoForm.logoUrl ? (
                    <img src={infoForm.logoUrl} alt="Logo Établissement" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem' }}>
                      G
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    Logo Officiel de l'Établissement
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78125rem', color: 'var(--text-muted, #64748b)', maxWidth: 450 }}>
                    Ce logo apparaîtra automatiquement sur l'en-tête de vos bulletins de notes, reçus de paiement et documents imprimables officiels.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className="btn btn-primary btn-sm fw-bold" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: '8px 14px', borderRadius: 10 }}>
                    <Upload size={14} /> Uploader un Logo
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {infoForm.logoUrl && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm fw-bold"
                      onClick={() => setInfoForm((prev) => ({ ...prev, logoUrl: '' }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* FORMULAIRE DES CHAMPS DE SAISIE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'Établissement *</label>
                <input
                  className="form-input"
                  value={infoForm.name}
                  onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                  disabled={!isAdmin}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Officiel *</label>
                <input
                  className="form-input"
                  type="email"
                  value={infoForm.email}
                  onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
                  disabled={!isAdmin}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  className="form-input"
                  value={infoForm.phone}
                  onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse Physique</label>
                <input
                  className="form-input"
                  value={infoForm.address}
                  onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input
                  className="form-input"
                  value={infoForm.city}
                  onChange={(e) => setInfoForm({ ...infoForm, city: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pays</label>
                <input
                  className="form-input"
                  value={infoForm.country}
                  onChange={(e) => setInfoForm({ ...infoForm, country: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Devise Comptable</label>
                <select
                  className="form-select"
                  value={infoForm.currency}
                  onChange={(e) => setInfoForm({ ...infoForm, currency: e.target.value })}
                  disabled={!isAdmin}
                >
                  <option value="FCFA">FCFA (Franc CFA)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Langue du Système</label>
                <select
                  className="form-select"
                  value={infoForm.language}
                  onChange={(e) => setInfoForm({ ...infoForm, language: e.target.value })}
                  disabled={!isAdmin}
                >
                  <option value="Français (FR)">Français (FR)</option>
                  <option value="English (EN)">English (EN)</option>
                </select>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="card-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary fw-bold" disabled={settingsSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '10px 20px' }}>
                <Save size={15} /> Sauvegarder les Informations
              </button>
            </div>
          )}
        </form>
      )}

      {/* 2. ANNÉES SCOLAIRES */}
      {activeTab === 'years' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Gestion des années scolaires. <strong>Une seule année scolaire peut être active simultanément.</strong>
            </p>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddYearModal(true)}>
                <Plus size={14} /> Nouvelle Année Scolaire
              </button>
            )}
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Libellé</th>
                    <th>Date Début</th>
                    <th>Date Fin</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolYears.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                        <Calendar size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                        <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          Aucune année scolaire enregistrée
                        </div>
                        <p style={{ fontSize: '0.8125rem', marginTop: 4, color: 'var(--text-muted)' }}>
                          Cliquez sur le bouton « Nouvelle Année Scolaire » ci-dessus pour configurer votre première année d'exercice.
                        </p>
                      </td>
                    </tr>
                  )}
                  {schoolYears.map((year) => (
                    <tr key={year.id}>
                      <td style={{ fontWeight: 700 }}>{year.label}</td>
                      <td>{year.startDate}</td>
                      <td>{year.endDate}</td>
                      <td>
                        {year.isActive ? (
                          <span className="badge badge-success" style={{ fontWeight: 800 }}>🟢 Active</span>
                        ) : year.isArchived ? (
                          <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800 }}>📦 Archivée</span>
                        ) : year.isClosed ? (
                          <span className="badge badge-neutral" style={{ fontWeight: 800 }}>🔒 Clôturée</span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontWeight: 800 }}>⏳ Préparation</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          {isAdmin && (
                            <button
                              className="btn btn-outline btn-sm fw-bold"
                              style={{ borderColor: '#6366f1', color: '#4f46e5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setDuplicateYearTarget(year)}
                            >
                              <Copy size={13} /> Dupliquer
                            </button>
                          )}
                          {isAdmin && !year.isActive && (
                            <button
                              className="btn btn-outline btn-sm fw-bold"
                              onClick={async () => {
                                const res = await activateSchoolYear(year.id);
                                if (res.error) addNotification('error', res.error);
                                else addNotification('success', `Année ${year.label} activée !`);
                              }}
                            >
                              Activer
                            </button>
                          )}
                          {isAdmin && !year.isClosed && (
                            <button
                              className="btn btn-ghost btn-sm text-warning fw-bold"
                              onClick={async () => {
                                const isConfirmed = await confirm({
                                  title: "Clôture d'année scolaire",
                                  message: `Clôturer l'année ${year.label} ? Les données passeront en lecture seule.`,
                                  confirmText: 'Oui, clôturer',
                                  cancelText: 'Annuler',
                                  variant: 'warning',
                                });
                                if (isConfirmed) {
                                  const res = await closeSchoolYear(year.id);
                                  if (res.error) addNotification('error', res.error);
                                  else addNotification('success', `Année ${year.label} clôturée avec succès.`);
                                }
                              }}
                            >
                              🔒 Clôturer
                            </button>
                          )}
                          {isAdmin && year.isClosed && !year.isArchived && (
                            <button
                              className="btn btn-ghost btn-sm fw-bold"
                              style={{ color: '#8b5cf6' }}
                              onClick={async () => {
                                const isConfirmed = await confirm({
                                  title: "Archivage d'année scolaire",
                                  message: `Archiver l'année ${year.label} ? Elle sera retirée des listes opérationnelles tout en conservant le consulter de l'historique.`,
                                  confirmText: 'Oui, archiver',
                                  cancelText: 'Annuler',
                                  variant: 'primary',
                                });
                                if (isConfirmed) {
                                  const res = await archiveSchoolYear(year.id);
                                  if (res.error) addNotification('error', res.error);
                                  else addNotification('success', `Année ${year.label} archivée avec succès.`);
                                }
                              }}
                            >
                              📦 Archiver
                            </button>
                          )}
                          {isAdmin && !year.isActive && (
                            <button
                              className="btn btn-ghost btn-sm text-danger fw-bold"
                              onClick={async () => {
                                const res = await deleteSchoolYear(year.id);
                                if (res?.summary?.hasData) {
                                  setBlockedDeleteSummary({
                                    yearLabel: year.label,
                                    error: res.error || 'Impossible de supprimer cette année scolaire.',
                                    summary: res.summary,
                                  });
                                } else if (res?.error) {
                                  addNotification('error', res.error);
                                } else {
                                  addNotification('success', `Année ${year.label} supprimée.`);
                                }
                              }}
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SÉCURITÉ : BLOCAGE DE SUPPRESSION SI DONNÉES PRÉSENTES ────────────── */}
      {blockedDeleteSummary && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div className="card shadow-2xl" style={{ maxWidth: 540, width: '100%', borderRadius: 20, border: 'none', background: '#ffffff', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#ffffff' }}>Suppression Bloquée (Sécurité)</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#fecaca', fontWeight: 600 }}>Année Scolaire {blockedDeleteSummary.yearLabel}</p>
                </div>
              </div>
              <button onClick={() => setBlockedDeleteSummary(null)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 16px', color: '#991b1b', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.4 }}>
                ⚠️ Impossible de supprimer cette année scolaire. Cette année contient des données historiques. Veuillez utiliser l'action « Clôturer » ou « Archiver ».
              </div>

              <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Résumé des Données Détectées dans le Système :
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Classes :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.classesCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Élèves Inscrits :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.studentsCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Notes &amp; Évaluations :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.gradesCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Bulletins Générés :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.bulletinsCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Versements &amp; Reçus :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.paymentsCount}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Documents Liés :</span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>{blockedDeleteSummary.summary.documentsCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-primary fw-bold" onClick={() => setBlockedDeleteSummary(null)} style={{ borderRadius: 10, padding: '10px 20px' }}>
                  Compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASSISTANT DUPLICATION D'ANNÉE SCOLAIRE ──────────────────────── */}
      {duplicateYearTarget && (
        <DuplicateSchoolYearWizardModal
          sourceYear={duplicateYearTarget}
          existingYears={schoolYears}
          onClose={() => setDuplicateYearTarget(null)}
          onSuccess={(newYearLabel) => {
            addNotification('success', `Année scolaire ${newYearLabel} préparée et dupliquée avec succès !`);
            addSchoolYear({
              label: newYearLabel,
              startDate: '2026-09-15',
              endDate: '2027-06-30',
            });
          }}
        />
      )}

      {/* 3. TRIMESTRES / SEMESTRES */}
      {activeTab === 'terms' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9375rem', margin: 0 }}>Découpage des Périodes Académiques</h3>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const nextSeq = termsForm.length + 1;
                  setTermsForm([
                    ...termsForm,
                    {
                      id: `term-${Date.now()}`,
                      name: `${nextSeq}${nextSeq === 1 ? 'er' : 'ème'} Trimestre`,
                      sequenceOrder: nextSeq,
                      startDate: '',
                      endDate: '',
                      isClosed: false,
                    },
                  ]);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Ajouter une Période
              </button>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {termsForm.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Aucune période académique configurée
                </div>
                <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                  Cliquez sur « Ajouter une Période » pour définir vos trimestres ou semestres.
                </p>
              </div>
            )}
            {termsForm.map((term, index) => (
              <div key={term.id} style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 1fr 1fr 100px 40px',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
              }}>
                <div style={{ fontWeight: 500, textAlign: 'center' }}>#{term.sequenceOrder}</div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Intitulé</label>
                  <input
                    className="form-input"
                    value={term.name}
                    onChange={(e) => {
                      const copy = [...termsForm];
                      copy[index].name = e.target.value;
                      setTermsForm(copy);
                    }}
                    disabled={!isAdmin}
                    placeholder="ex: 1er Trimestre"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Début</label>
                  <input
                    type="date"
                    className="form-input"
                    value={term.startDate}
                    onChange={(e) => {
                      const copy = [...termsForm];
                      copy[index].startDate = e.target.value;
                      setTermsForm(copy);
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Fin</label>
                  <input
                    type="date"
                    className="form-input"
                    value={term.endDate}
                    onChange={(e) => {
                      const copy = [...termsForm];
                      copy[index].endDate = e.target.value;
                      setTermsForm(copy);
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Statut</label>
                  <span className={`badge ${term.isClosed ? 'badge-neutral' : 'badge-success'}`}>
                    {term.isClosed ? 'Clôturé' : 'En cours'}
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ paddingTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      onClick={() => {
                        const updated = termsForm.filter((_, i) => i !== index).map((t, i) => ({ ...t, sequenceOrder: i + 1 }));
                        setTermsForm(updated);
                      }}
                      title="Supprimer cette période"
                      style={{ padding: '6px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveTermsSubmit} disabled={settingsSaving}>
                <Save size={15} /> Enregistrer le Découpage
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. CONFIGURATION GÉNÉRALE */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem' }}>Préférences Système & Numérotation</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Préfixe Matricule Élèves</label>
              <input
                className="form-input"
                value={configForm.numberingPrefixStudent}
                onChange={(e) => setConfigForm({ ...configForm, numberingPrefixStudent: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Préfixe Matricule Personnel</label>
              <input
                className="form-input"
                value={configForm.numberingPrefixStaff}
                onChange={(e) => setConfigForm({ ...configForm, numberingPrefixStaff: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fuseau Horaire</label>
              <select
                className="form-select"
                value={configForm.timezone}
                onChange={(e) => setConfigForm({ ...configForm, timezone: e.target.value })}
                disabled={!isAdmin}
              >
                <option value="GMT+0 (Abidjan / Dakar)">GMT+0 (Abidjan / Dakar)</option>
                <option value="GMT+1 (Paris / Douala)">GMT+1 (Paris / Douala)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Format de Date</label>
              <select
                className="form-select"
                value={configForm.dateFormat}
                onChange={(e) => setConfigForm({ ...configForm, dateFormat: e.target.value })}
                disabled={!isAdmin}
              >
                <option value="DD/MM/YYYY">JJ/MM/AAAA (ex: 23/07/2026)</option>
                <option value="YYYY-MM-DD">AAAA-MM-JJ (ex: 2026-07-23)</option>
              </select>
            </div>
          </div>
          {isAdmin && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
                <Save size={15} /> Enregistrer la Configuration
              </button>
            </div>
          )}
        </form>
      )}

      {/* 5. UTILISATEURS & ACCÈS (Module Reconstruit Notion / Linear / Stripe feel) */}
      {activeTab === 'accounts' && <UsersManager />}

      {/* Modal Créer Année Scolaire */}
      {showAddYearModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddYearModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Nouvelle Année Scolaire</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddYearModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateYear}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Libellé (ex: 2026-2027) *</label>
                  <input
                    className="form-input"
                    value={newYearForm.label}
                    onChange={(e) => setNewYearForm({ ...newYearForm, label: e.target.value })}
                    placeholder="2026-2027"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de Début *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newYearForm.startDate}
                    onChange={(e) => setNewYearForm({ ...newYearForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de Fin *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newYearForm.endDate}
                    onChange={(e) => setNewYearForm({ ...newYearForm, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddYearModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={settingsSaving}>Créer L'Année</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Créer Nouvel Accès (Connecté via useUsers) */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddUserModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Créer un Nouvel Accès</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddUserModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: 'var(--color-success-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#065f46',
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <Shield size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  Votre session Admin est maintenue. Vous resterez connecté après la création du compte.
                </div>

                <div className="form-group">
                  <label className="form-label">Nom Complet *</label>
                  <input
                    className="form-input"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    placeholder="Ex: Jean Dupont"
                    id="input-new-user-fullname"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Identifiant (login) *</label>
                  <input
                    className="form-input"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="Ex: jean.dupont"
                    autoCapitalize="none"
                    id="input-new-user-username"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mot de Passe * (min. 6 caractères)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="••••••••"
                      style={{ paddingRight: '2.5rem' }}
                      id="input-new-user-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle / Niveau d'Accès</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ROLES.map((role) => (
                      <label
                        key={role.value}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${newUserForm.role === role.value ? role.color : 'var(--border)'}`,
                          background: newUserForm.role === role.value ? `${role.color}0e` : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={newUserForm.role === role.value}
                          onChange={() => setNewUserForm({ ...newUserForm, role: role.value })}
                          style={{ marginTop: '2px' }}
                          id={`radio-role-${role.value}`}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: newUserForm.role === role.value ? role.color : 'var(--text-primary)' }}>
                            {role.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{role.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddUserModal(false)}>Annuler</button>
                <button
                  id="btn-save-new-user"
                  type="submit"
                  className="btn btn-primary"
                  disabled={usersSaving}
                >
                  {usersSaving ? (
                    <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Création...</>
                  ) : (
                    <><Save size={14} /> Créer le Compte</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
