import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../hooks/useSettings';
import { useUsers, useRoles, usePermissions } from '../hooks/users';
import { UserRole, UserAccount } from '../types';
import { ROLE_MODULES } from '../constants/permissions';
import {
  Building, Calendar, Clock, Sliders, Users, Shield, Plus, Save,
  Trash2, Lock, Eye, EyeOff, X, Search
} from 'lucide-react';

const ROLES: { value: UserRole; label: string; color: string; description: string }[] = [
  { value: 'ADMIN_GENERALE', label: 'Administrateur Général', color: '#4f46e5', description: 'Accès complet à toutes les fonctionnalités.' },
  { value: 'FINANCE', label: 'Finance', color: '#10b981', description: 'Accès Scolarité, Dépenses, Rapports, Statistiques.' },
  { value: 'SCOLAIRE_ENSEIGNANT', label: 'Scolaire / Enseignant', color: '#f59e0b', description: 'Accès Élèves, Classes, Notes, Activités.' },
  { value: 'CANTINE_TRANSPORT', label: 'Cantine & Transport', color: '#0ea5e9', description: 'Accès Cantine et Transport uniquement.' },
];

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();

  // Hooks d'Architecture 5 Couches
  const {
    loading: settingsLoading, saving: settingsSaving, schoolInfo, schoolYears, academicTerms, generalConfig,
    saveSchoolInfo, addSchoolYear, activateSchoolYear, closeSchoolYear, saveTerms, saveGeneralConfig,
  } = useSettings();

  const {
    users: userAccountsList, allUsers, loading: usersLoading, saving: usersSaving,
    error: usersError, success: usersSuccess, search, setSearch, filterRole, setFilterRole,
    createUser: createAccountViaHook, updateUserRole: updateRoleViaHook, archiveUser: archiveAccountViaHook,
  } = useUsers({ pageSize: 50 });

  const { roles: roleDetailsList } = useRoles();
  const { allPermissions, checkPermission } = usePermissions();

  const [activeTab, setActiveTab] = useState<'school' | 'years' | 'terms' | 'config' | 'accounts' | 'permissions'>('school');

  // Formulaire Établissement
  const [infoForm, setInfoForm] = useState({
    name: '', logoUrl: '', address: '', phone: '', email: '',
    city: '', country: '', currency: '', language: '',
  });

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
    if (res.error) addNotification('error', res.error);
    else addNotification('success', 'Informations de l\'établissement enregistrées !');
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
    if (!window.confirm(`Supprimer le compte de ${user.fullName} ?`)) return;
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
      {/* En-tête de la page */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration globale du système & habilitations</p>
        </div>
        {isAdmin && activeTab === 'accounts' && (
          <button id="btn-open-add-user" className="btn btn-primary btn-sm" onClick={() => setShowAddUserModal(true)}>
            <Plus size={14} /> Créer un Accès
          </button>
        )}
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

      {/* Onglets de navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {[
          { id: 'school', label: '🏢 Établissement', icon: Building },
          { id: 'years', label: '📅 Années Scolaires', icon: Calendar },
          { id: 'terms', label: '⏱️ Trimestres & Semestres', icon: Clock },
          { id: 'config', label: '⚙️ Config. Générale', icon: Sliders },
          { id: 'accounts', label: '👥 Comptes Utilisateurs', icon: Users },
          { id: 'permissions', label: '🔒 Habilitations par Rôle', icon: Lock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.25rem',
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
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. INFORMATIONS ÉTABLISSEMENT */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveInfo} className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem' }}>Informations Générales de l'Établissement</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
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
          {isAdmin && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
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
                  {schoolYears.map((year) => (
                    <tr key={year.id}>
                      <td style={{ fontWeight: 700 }}>{year.label}</td>
                      <td>{year.startDate}</td>
                      <td>{year.endDate}</td>
                      <td>
                        {year.isActive ? (
                          <span className="badge badge-success">✓ Active</span>
                        ) : year.isClosed ? (
                          <span className="badge badge-neutral">Clôturée</span>
                        ) : (
                          <span className="badge badge-warning">En attente</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {isAdmin && !year.isActive && !year.isClosed && (
                            <button
                              className="btn btn-outline btn-sm"
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
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={async () => {
                                if (window.confirm(`Clôturer définitivement l'année ${year.label} ?`)) {
                                  const res = await closeSchoolYear(year.id);
                                  if (res.error) addNotification('error', res.error);
                                  else addNotification('success', `Année ${year.label} clôturée.`);
                                }
                              }}
                            >
                              Clôturer
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

      {/* 3. TRIMESTRES / SEMESTRES */}
      {activeTab === 'terms' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem' }}>Découpage des Périodes Académiques</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {termsForm.map((term, index) => (
              <div key={term.id} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 1fr 1fr 120px',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
              }}>
                <div style={{ fontWeight: 800, textAlign: 'center' }}>#{term.sequenceOrder}</div>
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

      {/* 5. COMPTES UTILISATEURS (Connecté via useUsers Hook) */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Barre de Recherche et Filtres */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Rechercher un utilisateur par nom ou identifiant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 160 }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">Tous les Rôles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {userAccountsList.length === 0 ? (
            <div className="empty-state card">
              <div className="card-body">
                <div className="empty-state-icon">👤</div>
                <div className="empty-state-title">Aucun utilisateur trouvé</div>
              </div>
            </div>
          ) : (
            userAccountsList.map((user) => {
              const roleInfo = ROLES.find((r) => r.value === user.role);
              return (
                <div key={user.id} className="card card-hover" style={{ borderLeft: `4px solid ${roleInfo?.color || 'var(--border)'}` }}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                      alt={user.fullName}
                      style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {user.fullName}
                        {user.id === currentUser?.id && (
                          <span className="badge badge-info" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>Vous</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, marginTop: '0.25rem',
                        color: roleInfo?.color || 'var(--text-secondary)',
                        background: `${roleInfo?.color || '#6b7280'}18`,
                        padding: '0.15rem 0.5rem', borderRadius: '99px',
                      }}>
                        {roleInfo?.label || user.role}
                      </span>
                    </div>

                    {isAdmin && user.id !== currentUser?.id && (
                      <div className="flex gap-2" style={{ flexShrink: 0 }}>
                        <select
                          className="form-select"
                          value={user.role}
                          onChange={(e) => handleUpdateRoleSubmit(user.id, e.target.value as UserRole)}
                          style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem', width: 'auto' }}
                          disabled={usersSaving}
                          id={`select-user-role-${user.id}`}
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleArchiveUserSubmit(user)}
                          disabled={usersSaving}
                          id={`btn-delete-user-${user.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. HABILITATIONS PAR RÔLE (Connecté via usePermissions Hook) */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {ROLES.map((role) => (
            <div key={role.value} className="card card-hover" style={{ borderTop: `4px solid ${role.color}` }}>
              <div className="card-header" style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 800 }}>{role.label}</h4>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{role.description}</p>
              </div>
              <div className="card-body" style={{ paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {ROLE_MODULES[role.value].map((mod) => (
                    <span key={mod} className="badge badge-info" style={{ fontSize: '0.6875rem', background: `${role.color}15`, color: role.color, border: `1px solid ${role.color}25` }}>
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
