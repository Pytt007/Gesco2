// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Store & Contexte IAM (src/context/PermissionContext.tsx)
// Moteur IAM Complet : RBAC 4 Niveaux + Delegations + Permissions Temporelles
// + Mode Lecture Seule + Workflows d'Approbation + Audit IAM Log
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode,
} from 'react';
import { DEFAULT_RBAC_ROLES, MODULES_META } from '../constants/rbac';
import type {
  RoleDefinition, PermissionAuditEntry, PermissionAuditAction,
  RolePermissions, ModuleId,
} from '../types/permissions';
import type {
  TemporaryPermission, DelegationRule, ApprovalRequest,
  ApprovalActionType, IAMAuditEntry, IAMAuditCategory,
} from '../types/iam';

// ─── Interfaces Context IAM ───────────────────────────────────────────────────

interface PermissionContextValue {
  // Rôles RBAC
  roles: RoleDefinition[];

  // IAM Features
  temporaryPermissions: TemporaryPermission[];
  delegations: DelegationRule[];
  approvalRequests: ApprovalRequest[];
  iamAuditLogs: IAMAuditEntry[];
  readOnlyUsers: string[];

  // Actions Rôles
  getRoleById: (id: string) => RoleDefinition | undefined;
  getPermissionsForRole: (roleId: string) => RolePermissions | undefined;
  addRole: (role: Omit<RoleDefinition, 'isSystem'>, userId: string, userName: string) => void;
  duplicateRole: (roleId: string, newLabel: string, userId: string, userName: string) => string | null;
  deleteRole: (roleId: string, userId: string, userName: string) => { error?: string };
  renameRole: (roleId: string, newLabel: string, userId: string, userName: string) => void;
  toggleModule: (roleId: string, moduleId: ModuleId, userId: string, userName: string) => void;
  toggleAction: (roleId: string, moduleId: ModuleId, action: string, userId: string, userName: string) => void;
  setAllActions: (roleId: string, moduleId: ModuleId, value: boolean, userId: string, userName: string) => void;

  // Actions Permissions Temporelles
  grantTemporaryPermission: (
    perm: Omit<TemporaryPermission, 'id' | 'status'>,
    adminId: string,
    adminName: string
  ) => void;
  revokeTemporaryPermission: (id: string, adminId: string, adminName: string) => void;

  // Actions Délégations
  createDelegation: (
    delegation: Omit<DelegationRule, 'id' | 'status' | 'createdAt'>,
    userId: string,
    userName: string
  ) => void;
  revokeDelegation: (id: string, userId: string, userName: string) => void;
  getActiveDelegationsForUser: (userId: string) => DelegationRule[];

  // Actions Workflows d'Approbation
  submitApprovalRequest: (
    req: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>,
    userId: string,
    userName: string
  ) => void;
  processApprovalRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminId: string,
    adminName: string,
    rejectionReason?: string
  ) => void;

  // Mode Lecture Seule
  toggleUserReadOnly: (targetUserId: string, adminId: string, adminName: string) => void;

  // Export / Import / Reset
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (jsonStr: string, userId: string, userName: string) => { error?: string };
  resetToDefaults: (userId: string, userName: string) => void;
}

// ─── Keys LocalStorage ────────────────────────────────────────────────────────

const ROLES_KEY       = 'gesco_rbac_store_v2';
const TEMP_PERMS_KEY  = 'gesco_iam_temp_perms_v1';
const DELEGATIONS_KEY = 'gesco_iam_delegations_v1';
const APPROVALS_KEY   = 'gesco_iam_approvals_v1';
const AUDIT_KEY       = 'gesco_iam_audit_v2';
const READONLY_KEY    = 'gesco_iam_readonly_users_v1';

// ─── Helpers Chargement LocalStorage ──────────────────────────────────────────

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* fallback */ }
  return fallback;
}

function saveStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota */ }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadRoles(): RoleDefinition[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.permissions) {
        return parsed;
      }
    }
  } catch { /* fallback */ }
  return DEFAULT_RBAC_ROLES.map((r) => ({ ...r }));
}

// ─── CONTEXT PROVIDER ─────────────────────────────────────────────────────────

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<RoleDefinition[]>(loadRoles);

  const [temporaryPermissions, setTemporaryPermissions] = useState<TemporaryPermission[]>(() =>
    loadStorage(TEMP_PERMS_KEY, [])
  );

  const [delegations, setDelegations] = useState<DelegationRule[]>(() =>
    loadStorage(DELEGATIONS_KEY, [])
  );

  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(() =>
    loadStorage(APPROVALS_KEY, [])
  );

  const [iamAuditLogs, setIamAuditLogs] = useState<IAMAuditEntry[]>(() =>
    loadStorage(AUDIT_KEY, [])
  );

  const [readOnlyUsers, setReadOnlyUsers] = useState<string[]>(() =>
    loadStorage(READONLY_KEY, [])
  );

  // ── Logger d'Audit IAM ──────────────────────────────────────────────────────
  const logIAMAudit = useCallback((
    category: IAMAuditCategory,
    userId: string,
    userName: string,
    detail: string,
    metadata?: Record<string, any>
  ) => {
    const newEntry: IAMAuditEntry = {
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
      category,
      userId,
      userName,
      userRole: 'ADMIN',
      detail,
      metadata,
    };
    setIamAuditLogs((prev) => {
      const next = [newEntry, ...prev].slice(0, 500);
      saveStorage(AUDIT_KEY, next);
      return next;
    });
  }, []);

  // ── Nettoyage automatique des expirations ─────────────────────────────────
  useEffect(() => {
    const now = new Date().toISOString();

    // Mettre à jour les temp perms expirées
    setTemporaryPermissions((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.status === 'ACTIVE' && p.endDate < now) {
          changed = true;
          return { ...p, status: 'EXPIRED' as const };
        }
        return p;
      });
      if (changed) saveStorage(TEMP_PERMS_KEY, next);
      return next;
    });

    // Mettre à jour les délégations expirées
    setDelegations((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (d.status === 'ACTIVE' && d.endDate < now) {
          changed = true;
          return { ...d, status: 'EXPIRED' as const };
        }
        return d;
      });
      if (changed) saveStorage(DELEGATIONS_KEY, next);
      return next;
    });
  }, []);

  // ── Actions Rôles ──────────────────────────────────────────────────────────

  const updateRoles = useCallback((updater: (prev: RoleDefinition[]) => RoleDefinition[]) => {
    setRoles((prev) => {
      const next = updater(prev);
      saveStorage(ROLES_KEY, next);
      return next;
    });
  }, []);

  const getRoleById = useCallback((id: string) => {
    return roles.find((r) => r.id === id);
  }, [roles]);

  const getPermissionsForRole = useCallback((roleId: string) => {
    return roles.find((r) => r.id === roleId)?.permissions;
  }, [roles]);

  const addRole = useCallback((
    role: Omit<RoleDefinition, 'isSystem'>,
    userId: string,
    userName: string
  ) => {
    const newRole: RoleDefinition = { ...role, isSystem: false };
    updateRoles((prev) => [...prev, newRole]);
    logIAMAudit('ROLE_CREATE', userId, userName, `Création du rôle personnalisé "${newRole.label}"`);
  }, [updateRoles, logIAMAudit]);

  const duplicateRole = useCallback((
    roleId: string,
    newLabel: string,
    userId: string,
    userName: string
  ): string | null => {
    const source = roles.find((r) => r.id === roleId);
    if (!source) return null;

    const newId = `CUSTOM_${Date.now()}`;
    const newRole: RoleDefinition = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      label: newLabel,
      isSystem: false,
    };
    updateRoles((prev) => [...prev, newRole]);
    logIAMAudit('ROLE_CREATE', userId, userName, `Duplication du rôle "${source.label}" vers "${newLabel}"`);
    return newId;
  }, [roles, updateRoles, logIAMAudit]);

  const deleteRole = useCallback((
    roleId: string,
    userId: string,
    userName: string
  ): { error?: string } => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return { error: 'Rôle introuvable.' };
    if (role.isSystem) return { error: 'Les rôles système ne peuvent pas être supprimés.' };

    updateRoles((prev) => prev.filter((r) => r.id !== roleId));
    logIAMAudit('ROLE_DELETE', userId, userName, `Suppression du rôle "${role.label}"`);
    return {};
  }, [roles, updateRoles, logIAMAudit]);

  const renameRole = useCallback((
    roleId: string,
    newLabel: string,
    userId: string,
    userName: string
  ) => {
    updateRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, label: newLabel } : r))
    );
    logIAMAudit('ROLE_UPDATE', userId, userName, `Modification du libellé du rôle vers "${newLabel}"`);
  }, [updateRoles, logIAMAudit]);

  const toggleModule = useCallback((
    roleId: string,
    moduleId: ModuleId,
    userId: string,
    userName: string
  ) => {
    updateRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      const currentlyEnabled = r.permissions[moduleId]?.enabled ?? false;
      const newEnabled = !currentlyEnabled;
      const actions = { ...r.permissions[moduleId]?.actions };
      if (newEnabled && !Object.values(actions).some(Boolean)) {
        actions['view'] = true;
      }
      return {
        ...r,
        permissions: {
          ...r.permissions,
          [moduleId]: {
            ...r.permissions[moduleId],
            enabled: newEnabled,
            actions,
          },
        },
      };
    }));

    logIAMAudit('PERMISSION_CHANGE', userId, userName, `Basculement du module ${moduleId} pour le rôle ${roleId}`);
  }, [updateRoles, logIAMAudit]);

  const toggleAction = useCallback((
    roleId: string,
    moduleId: ModuleId,
    action: string,
    userId: string,
    userName: string
  ) => {
    updateRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      const currentVal = r.permissions[moduleId]?.actions[action] ?? false;
      const newActions = { ...r.permissions[moduleId]?.actions, [action]: !currentVal };
      const moduleEnabled = r.permissions[moduleId]?.enabled || !currentVal;

      return {
        ...r,
        permissions: {
          ...r.permissions,
          [moduleId]: {
            ...r.permissions[moduleId],
            enabled: moduleEnabled,
            actions: newActions,
          },
        },
      };
    }));

    logIAMAudit('PERMISSION_CHANGE', userId, userName, `Modification permission ${moduleId}.${action} pour ${roleId}`);
  }, [updateRoles, logIAMAudit]);

  const setAllActions = useCallback((
    roleId: string,
    moduleId: ModuleId,
    value: boolean,
    userId: string,
    userName: string
  ) => {
    updateRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      const meta = MODULES_META.find((m) => m.id === moduleId);
      const newActions: Record<string, boolean> = {};
      meta?.actions.forEach((a) => { newActions[a.id] = value; });

      return {
        ...r,
        permissions: {
          ...r.permissions,
          [moduleId]: {
            ...r.permissions[moduleId],
            enabled: value,
            actions: newActions,
          },
        },
      };
    }));

    logIAMAudit('PERMISSION_CHANGE', userId, userName, `${value ? 'Activation' : 'Désactivation'} totale de ${moduleId} pour ${roleId}`);
  }, [updateRoles, logIAMAudit]);

  // ── Permissions Temporelles ───────────────────────────────────────────────

  const grantTemporaryPermission = useCallback((
    perm: Omit<TemporaryPermission, 'id' | 'status'>,
    adminId: string,
    adminName: string
  ) => {
    const newPerm: TemporaryPermission = {
      ...perm,
      id: generateId('temp'),
      status: 'ACTIVE',
    };
    setTemporaryPermissions((prev) => {
      const next = [newPerm, ...prev];
      saveStorage(TEMP_PERMS_KEY, next);
      return next;
    });
    logIAMAudit('TEMP_PERMISSION_GRANT', adminId, adminName, `Permission temporaire accordée à ${perm.userName} pour ${perm.moduleId}.${perm.action}`);
  }, [logIAMAudit]);

  const revokeTemporaryPermission = useCallback((id: string, adminId: string, adminName: string) => {
    setTemporaryPermissions((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status: 'REVOKED' as const } : p));
      saveStorage(TEMP_PERMS_KEY, next);
      return next;
    });
    logIAMAudit('PERMISSION_CHANGE', adminId, adminName, `Révocation permission temporaire ID ${id}`);
  }, [logIAMAudit]);

  // ── Délégations ──────────────────────────────────────────────────────────

  const createDelegation = useCallback((
    delegation: Omit<DelegationRule, 'id' | 'status' | 'createdAt'>,
    userId: string,
    userName: string
  ) => {
    const newDelegation: DelegationRule = {
      ...delegation,
      id: generateId('deleg'),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setDelegations((prev) => {
      const next = [newDelegation, ...prev];
      saveStorage(DELEGATIONS_KEY, next);
      return next;
    });
    logIAMAudit('DELEGATION_GRANT', userId, userName, `Délégation de pouvoir accordée de ${delegation.delegatorName} à ${delegation.delegateeName}`);
  }, [logIAMAudit]);

  const revokeDelegation = useCallback((id: string, userId: string, userName: string) => {
    setDelegations((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, status: 'REVOKED' as const } : d));
      saveStorage(DELEGATIONS_KEY, next);
      return next;
    });
    logIAMAudit('DELEGATION_REVOKE', userId, userName, `Révocation de la délégation ID ${id}`);
  }, [logIAMAudit]);

  const getActiveDelegationsForUser = useCallback((userId: string) => {
    const now = new Date().toISOString();
    return delegations.filter(
      (d) => d.delegateeId === userId && d.status === 'ACTIVE' && d.startDate <= now && d.endDate >= now
    );
  }, [delegations]);

  // ── Workflows d'Approbation ───────────────────────────────────────────────

  const submitApprovalRequest = useCallback((
    req: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>,
    userId: string,
    userName: string
  ) => {
    const newReq: ApprovalRequest = {
      ...req,
      id: generateId('appr'),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setApprovalRequests((prev) => {
      const next = [newReq, ...prev];
      saveStorage(APPROVALS_KEY, next);
      return next;
    });
    logIAMAudit('APPROVAL_SUBMIT', userId, userName, `Demande d'approbation soumise pour : ${req.label}`);
  }, [logIAMAudit]);

  const processApprovalRequest = useCallback((
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminId: string,
    adminName: string,
    rejectionReason?: string
  ) => {
    setApprovalRequests((prev) => {
      const next = prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: decision,
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminId,
          reviewedByName: adminName,
          rejectionReason,
        };
      });
      saveStorage(APPROVALS_KEY, next);
      return next;
    });
    logIAMAudit('APPROVAL_DECISION', adminId, adminName, `Demande d'approbation ${requestId} : ${decision}`);
  }, [logIAMAudit]);

  // ── Mode Lecture Seule ───────────────────────────────────────────────────

  const toggleUserReadOnly = useCallback((targetUserId: string, adminId: string, adminName: string) => {
    setReadOnlyUsers((prev) => {
      const isAlready = prev.includes(targetUserId);
      const next = isAlready ? prev.filter((id) => id !== targetUserId) : [...prev, targetUserId];
      saveStorage(READONLY_KEY, next);
      return next;
    });
    logIAMAudit('PERMISSION_CHANGE', adminId, adminName, `Bascule du mode lecture seule pour l'utilisateur ID ${targetUserId}`);
  }, [logIAMAudit]);

  // ── Export / Import ──────────────────────────────────────────────────────

  const exportJSON = useCallback(() => {
    const data = {
      version: 2,
      type: 'GESCO_IAM_EXPORT',
      exportedAt: new Date().toISOString(),
      roles,
      temporaryPermissions,
      delegations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gesco_iam_matrix_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [roles, temporaryPermissions, delegations]);

  const exportCSV = useCallback(() => {
    const rows: string[] = ['roleId;roleLabel;module;action;granted'];
    roles.forEach((role) => {
      MODULES_META.forEach((mod) => {
        const modPerms = role.permissions[mod.id as ModuleId];
        if (!modPerms) return;
        mod.actions.forEach((act) => {
          const granted = modPerms.actions[act.id] ? '1' : '0';
          rows.push(`${role.id};${role.label};${mod.id};${act.id};${granted}`);
        });
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gesco_iam_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [roles]);

  const importJSON = useCallback((
    jsonStr: string,
    userId: string,
    userName: string
  ): { error?: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.roles || !Array.isArray(data.roles)) {
        return { error: 'Format invalide : le fichier doit contenir un tableau "roles".' };
      }
      const customImported = data.roles.filter((r: RoleDefinition) => !r.isSystem);
      const systemRoles = roles.filter((r) => r.isSystem);
      updateRoles(() => [...systemRoles, ...customImported]);
      logIAMAudit('PERMISSION_CHANGE', userId, userName, `Import de ${customImported.length} rôle(s) personnalisé(s)`);
      return {};
    } catch {
      return { error: 'Fichier JSON invalide ou corrompu.' };
    }
  }, [roles, updateRoles, logIAMAudit]);

  const resetToDefaults = useCallback((userId: string, userName: string) => {
    const defaults = DEFAULT_RBAC_ROLES.map((r) => ({ ...r }));
    updateRoles(() => defaults);
    logIAMAudit('PERMISSION_CHANGE', userId, userName, 'Réinitialisation des habilitations aux valeurs système');
  }, [updateRoles, logIAMAudit]);

  // ── Memoized Value ────────────────────────────────────────────────────────

  const value = useMemo<PermissionContextValue>(() => ({
    roles,
    temporaryPermissions,
    delegations,
    approvalRequests,
    iamAuditLogs,
    readOnlyUsers,

    getRoleById,
    getPermissionsForRole,
    addRole,
    duplicateRole,
    deleteRole,
    renameRole,
    toggleModule,
    toggleAction,
    setAllActions,

    grantTemporaryPermission,
    revokeTemporaryPermission,

    createDelegation,
    revokeDelegation,
    getActiveDelegationsForUser,

    submitApprovalRequest,
    processApprovalRequest,

    toggleUserReadOnly,

    exportJSON,
    exportCSV,
    importJSON,
    resetToDefaults,
  }), [
    roles, temporaryPermissions, delegations, approvalRequests, iamAuditLogs, readOnlyUsers,
    getRoleById, getPermissionsForRole, addRole, duplicateRole, deleteRole, renameRole,
    toggleModule, toggleAction, setAllActions,
    grantTemporaryPermission, revokeTemporaryPermission,
    createDelegation, revokeDelegation, getActiveDelegationsForUser,
    submitApprovalRequest, processApprovalRequest, toggleUserReadOnly,
    exportJSON, exportCSV, importJSON, resetToDefaults,
  ]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissionContext must be used within <PermissionProvider>');
  return ctx;
}
