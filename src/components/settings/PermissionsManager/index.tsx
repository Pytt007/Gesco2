// ─────────────────────────────────────────────────────────────────────────────
// GESCO — PermissionsManager / index.tsx
// Moteur IAM (Identity & Access Management) Complet.
// Onglets : Matrice & Rôles | Délégations & Temporelles | Workflows d'Approbation | Journal d'Audit IAM
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, FileCheck, History, Layers } from 'lucide-react';
import { usePermissionContext } from '../../../context/PermissionContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import RoleList from './RoleList';
import PermissionTree from './PermissionTree';
import DelegationsTab from './DelegationsTab';
import ApprovalsTab from './ApprovalsTab';
import AuditTab from './AuditTab';
import type { ModuleId } from '../../../types/permissions';

type IAMMainTab = 'MATRIX' | 'DELEGATIONS' | 'APPROVALS' | 'AUDIT';

export function PermissionsManager() {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();
  const {
    roles,
    delegations,
    approvalRequests,
    iamAuditLogs,
    addRole,
    duplicateRole,
    deleteRole,
    renameRole,
    toggleModule,
    toggleAction,
    setAllActions,
    exportJSON,
    exportCSV,
    importJSON,
    resetToDefaults,
  } = usePermissionContext();

  const [activeMainTab, setActiveMainTab] = useState<IAMMainTab>('MATRIX');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('DIRECTEUR');

  const isAdmin = currentUser?.role === 'ADMIN_GENERALE';
  const currentUserId = currentUser?.id || 'admin';
  const currentUserName = currentUser?.fullName || 'Administrateur';

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const handleAddRole = (roleData: any) => {
    addRole(roleData, currentUserId, currentUserName);
    setSelectedRoleId(roleData.id);
    addNotification('success', `Rôle "${roleData.label}" créé avec succès.`);
  };

  const handleDuplicateRole = (roleId: string, newLabel: string) => {
    const newId = duplicateRole(roleId, newLabel, currentUserId, currentUserName);
    if (newId) {
      setSelectedRoleId(newId);
      addNotification('success', `Rôle "${newLabel}" dupliqué avec succès.`);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    const res = deleteRole(roleId, currentUserId, currentUserName);
    if (res.error) {
      addNotification('error', res.error);
    } else {
      setSelectedRoleId('DIRECTEUR');
      addNotification('success', 'Rôle supprimé.');
    }
  };

  const handleRenameRole = (roleId: string, newLabel: string) => {
    renameRole(roleId, newLabel, currentUserId, currentUserName);
    addNotification('success', 'Rôle renommé.');
  };

  const handleToggleModule = (moduleId: ModuleId) => {
    if (!isAdmin) return;
    toggleModule(selectedRole.id, moduleId, currentUserId, currentUserName);
  };

  const handleToggleAction = (moduleId: ModuleId, action: string) => {
    if (!isAdmin) return;
    toggleAction(selectedRole.id, moduleId, action, currentUserId, currentUserName);
  };

  const handleSetAllActions = (moduleId: ModuleId, value: boolean) => {
    if (!isAdmin) return;
    setAllActions(selectedRole.id, moduleId, value, currentUserId, currentUserName);
  };

  const handleImportJSON = (jsonStr: string) => {
    const res = importJSON(jsonStr, currentUserId, currentUserName);
    if (res.error) {
      addNotification('error', res.error);
      return res;
    }
    addNotification('success', 'Matrice d\'habilitations importée avec succès.');
    return {};
  };

  const handleReset = () => {
    if (!isAdmin) return;
    resetToDefaults(currentUserId, currentUserName);
    setSelectedRoleId('DIRECTEUR');
    addNotification('success', 'Habilitations réinitialisées aux valeurs par défaut.');
  };

  const pendingApprovalsCount = approvalRequests.filter((r) => r.status === 'PENDING').length;
  const activeDelegationsCount = delegations.filter((d) => d.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Général Moteur IAM */}
      <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #0f172a, #312e81)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(15,23,42,0.25)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#0f172a' }}>
                  Moteur IAM (Identity &amp; Access Management)
                </h3>
                <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 999, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 800 }}>
                  GESCO Enterprise
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Utilisateur → Rôle → Module → Action → Restriction → Contexte
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets Principaux IAM */}
      <div style={{ display: 'flex', gap: 8, padding: 6, background: '#f1f5f9', borderRadius: 14, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${activeMainTab === 'MATRIX' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveMainTab('MATRIX')}
          style={{ borderRadius: 10, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Layers size={15} /> Matrice &amp; Rôles ({roles.length})
        </button>
        <button
          className={`btn btn-sm ${activeMainTab === 'DELEGATIONS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveMainTab('DELEGATIONS')}
          style={{ borderRadius: 10, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <UserCheck size={15} /> Délégations &amp; Temporelles
          {activeDelegationsCount > 0 && (
            <span style={{ background: '#2563eb', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: '0.6875rem' }}>
              {activeDelegationsCount}
            </span>
          )}
        </button>
        <button
          className={`btn btn-sm ${activeMainTab === 'APPROVALS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveMainTab('APPROVALS')}
          style={{ borderRadius: 10, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FileCheck size={15} /> Workflows d'Approbation
          {pendingApprovalsCount > 0 && (
            <span style={{ background: '#ea580c', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: '0.6875rem' }}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>
        <button
          className={`btn btn-sm ${activeMainTab === 'AUDIT' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveMainTab('AUDIT')}
          style={{ borderRadius: 10, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={15} /> Journal d'Audit IAM ({iamAuditLogs.length})
        </button>
      </div>

      {/* Contenu de l'Onglet Actif */}
      {activeMainTab === 'MATRIX' && (
        <div style={{ display: 'flex', gap: '1.5rem', minHeight: 600 }}>
          <RoleList
            roles={roles}
            selectedRoleId={selectedRole?.id || 'DIRECTEUR'}
            onSelectRole={setSelectedRoleId}
            onAddRole={handleAddRole}
            onDuplicateRole={handleDuplicateRole}
            onRenameRole={handleRenameRole}
            onDeleteRole={handleDeleteRole}
            onExportJSON={exportJSON}
            onExportCSV={exportCSV}
            onImportJSON={handleImportJSON}
            onReset={handleReset}
            isAdmin={isAdmin}
          />

          {selectedRole ? (
            <PermissionTree
              role={selectedRole}
              onToggleModule={handleToggleModule}
              onToggleAction={handleToggleAction}
              onSetAllActions={handleSetAllActions}
              isAdmin={isAdmin}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Sélectionnez un rôle à gauche pour afficher ses permissions.
            </div>
          )}
        </div>
      )}

      {activeMainTab === 'DELEGATIONS' && <DelegationsTab />}

      {activeMainTab === 'APPROVALS' && <ApprovalsTab />}

      {activeMainTab === 'AUDIT' && <AuditTab />}

    </div>
  );
}

export default PermissionsManager;
