import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import { useUsers } from '../../../hooks/users';
import { UserAccount, UserRole } from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { UsersListTab } from './UsersListTab';
import { AccessProfilesTab } from './AccessProfilesTab';
import { UserModal, DEFAULT_PROFILES } from './UserModal';

type ActiveTab = 'USERS' | 'PROFILES';

export const UsersAccessLayout: React.FC = () => {
  const { addNotification } = useToast();
  const confirm = useConfirm();

  const {
    allUsers,
    loading,
    refresh,
    createUser,
    updateUserRole,
    updateUserStatus,
    archiveUser,
  } = useUsers({ pageSize: 100 });

  const [activeTab, setActiveTab] = useState<ActiveTab>('USERS');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Handlers Utilisateur
  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData: {
    fullName: string;
    username: string;
    email?: string;
    phone?: string;
    role: UserRole;
    password?: string;
  }) => {
    if (editingUser) {
      const ok = await updateUserRole(editingUser.id, userData.role);
      if (ok) {
        addNotification('success', `Profil de ${userData.fullName} mis à jour avec succès !`);
        refresh();
        return true;
      }
      return false;
    } else {
      if (!userData.password || userData.password.length < 12) {
        addNotification('error', 'Un mot de passe initial de 12 caractères minimum est obligatoire.');
        return false;
      }
      const pwd = userData.password;
      const ok = await createUser(userData.username, pwd, userData.role, userData.fullName);
      if (ok) {
        addNotification('success', `Nouveau membre ${userData.fullName} ajouté avec succès !`);
        refresh();
        return true;
      }
      return false;
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus?: string) => {
    const isSuspended = currentStatus === 'SUSPENDU';
    const actionName = isSuspended ? 'réactiver' : 'suspendre';
    const ok = await confirm({
      title: `${actionName.toUpperCase()} le compte`,
      message: `Voulez-vous vraiment ${actionName} cet accès utilisateur ?`,
      confirmText: isSuspended ? 'Réactiver' : 'Suspendre',
      cancelText: 'Annuler',
      variant: isSuspended ? 'info' : 'warning',
    });
    if (!ok) return;

    const statusResult = await updateUserStatus(userId, isSuspended ? 'ACTIF' : 'SUSPENDU');
    if (!statusResult) addNotification('error', 'Modification du statut refusée par le serveur.');
    else { addNotification('success', `Statut de l'utilisateur mis à jour (${actionName}).`); refresh(); }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({
      title: 'Supprimer le membre',
      message: 'Voulez-vous vraiment supprimer définitivement cet utilisateur ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await archiveUser(userId);
    if (res) {
      addNotification('success', 'Membre supprimé de l\'établissement.');
      refresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* ── BANDEAU EN-TÊTE ÉPURÉ NOTION / LINEAR FEEL ───────────────────── */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: 16,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 900, color: '#0f172a' }}>
                Utilisateurs &amp; Accès
              </h1>
              <span className="badge bg-light text-dark border" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                {allUsers.length} membre{allUsers.length > 1 ? 's' : ''}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84375rem', color: '#64748b' }}>
              Gérez les personnes de l'équipe et attribuez facilement leurs profils d'accès aux modules.
            </p>
          </div>

          {/* Onglets de navigation à 2 Espaces */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'USERS' ? 'btn-white shadow-sm fw-bold text-primary' : 'btn-light text-secondary'}`}
              onClick={() => setActiveTab('USERS')}
              style={{
                fontSize: '0.84375rem',
                padding: '7px 18px',
                borderRadius: 8,
                background: activeTab === 'USERS' ? '#ffffff' : 'transparent',
                color: activeTab === 'USERS' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === 'USERS' ? 900 : 700,
                border: activeTab === 'USERS' ? '1px solid #cbd5e1' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Users size={16} /> 👥 Utilisateurs ({allUsers.length})
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'PROFILES' ? 'btn-white shadow-sm fw-bold text-primary' : 'btn-light text-secondary'}`}
              onClick={() => setActiveTab('PROFILES')}
              style={{
                fontSize: '0.84375rem',
                padding: '7px 18px',
                borderRadius: 8,
                background: activeTab === 'PROFILES' ? '#ffffff' : 'transparent',
                color: activeTab === 'PROFILES' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === 'PROFILES' ? 900 : 700,
                border: activeTab === 'PROFILES' ? '1px solid #cbd5e1' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Shield size={16} /> 🛡️ Profils d'accès ({DEFAULT_PROFILES.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── ESPACE 1 : UTILISATEURS ────────────────────────────────────── */}
      {activeTab === 'USERS' && (
        <UsersListTab
          users={allUsers}
          loading={loading}
          onAddUser={handleAddUser}
          onEditUser={handleEditUser}
          onToggleStatus={handleToggleStatus}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* ── ESPACE 2 : PROFILS D'ACCÈS ──────────────────────────────────── */}
      {activeTab === 'PROFILES' && (
        <AccessProfilesTab users={allUsers} />
      )}

      {/* Modale d'ajout/édition de membre */}
      <UserModal
        isOpen={showUserModal}
        user={editingUser}
        onClose={() => setShowUserModal(false)}
        onSubmit={handleSaveUser}
      />

    </div>
  );
};

export default UsersAccessLayout;
