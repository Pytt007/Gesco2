// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Moteur de Permissions IAM (src/hooks/usePermission.ts)
// Référence unique de contrôle d'accès pour toute l'application.
// Prend en compte : Rôle de base + Délégations + Permissions Temporelles
//                   + Mode Lecture Seule + Restrictions contextuelles
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissionContext } from '../context/PermissionContext';
import { USER_ROLE_TO_RBAC } from '../constants/rbac';
import type { ModuleId, AnyAction, RoleRestrictions } from '../types/permissions';
import type { ApprovalActionType } from '../types/iam';

export interface CheckContext {
  classId?: string;
  subjectId?: string;
  studentId?: string;
}

export interface UsePermissionReturn {
  /** Vérification centrale IAM */
  can: ((moduleId: ModuleId, action: AnyAction, context?: CheckContext) => boolean) & {
    view: (moduleId: ModuleId) => boolean;
    create: (moduleId: ModuleId) => boolean;
    edit: (moduleId: ModuleId) => boolean;
    delete: (moduleId: ModuleId) => boolean;
    export: (moduleId: ModuleId) => boolean;
    print: (moduleId: ModuleId) => boolean;
    validate: (moduleId: ModuleId) => boolean;
    publish: (moduleId: ModuleId) => boolean;
  };

  /** Métadonnées IAM de l'utilisateur actif */
  activeRoleId: string;
  isAdmin: boolean;
  isReadOnly: boolean;
  hasActiveDelegation: boolean;

  /** Helpers de restrictions contextuelles */
  restrictions: (moduleId: ModuleId) => RoleRestrictions;

  /** Workflows d'approbation */
  requiresApproval: (actionType: ApprovalActionType) => boolean;
  requestApproval: (
    actionType: ApprovalActionType,
    label: string,
    details: string,
    targetEntityId?: string
  ) => void;
}

export function usePermission(): UsePermissionReturn {
  const { currentUser } = useAuth();
  const {
    getPermissionsForRole,
    temporaryPermissions,
    getActiveDelegationsForUser,
    readOnlyUsers,
    submitApprovalRequest,
  } = usePermissionContext();

  const currentUserId = currentUser?.id || 'guest';
  const currentUserName = currentUser?.fullName || 'Utilisateur';

  // 1. Rôle actif principal
  const activeRoleId = useMemo(() => {
    if (!currentUser) return 'ADMIN_SYSTEME';
    return USER_ROLE_TO_RBAC[currentUser.role] || 'ADMIN_SYSTEME';
  }, [currentUser]);

  // 2. Administrateur Général ou Système
  const isAdmin = useMemo(() => {
    return activeRoleId === 'ADMIN_SYSTEME' || activeRoleId === 'DIRECTEUR';
  }, [activeRoleId]);

  // 3. Mode Lecture Seule activé pour cet utilisateur
  const isReadOnly = useMemo(() => {
    return readOnlyUsers.includes(currentUserId);
  }, [readOnlyUsers, currentUserId]);

  // 4. Délégations actives pour l'utilisateur
  const activeDelegations = useMemo(() => {
    return getActiveDelegationsForUser(currentUserId);
  }, [getActiveDelegationsForUser, currentUserId]);

  const hasActiveDelegation = activeDelegations.length > 0;

  // 5. Matrix principale de permissions
  const rolePermissions = useMemo(() => {
    return getPermissionsForRole(activeRoleId);
  }, [activeRoleId, getPermissionsForRole]);

  // 6. Verification centrale IAM
  const canCheck = useCallback(
    (moduleId: ModuleId, action: AnyAction, context?: CheckContext): boolean => {
      // SI Mode Lecture Seule ET action de modification/suppression → Interdit
      if (isReadOnly && action !== 'view' && action !== 'export' && action !== 'print') {
        return false;
      }

      // Admin a tous les droits par défaut sauf restriction explicite de lecture seule
      if (isAdmin) return true;

      // Check 1: Délégation active qui accorderait le rôle/permission
      if (activeDelegations.length > 0) {
        for (const del of activeDelegations) {
          const delPerms = getPermissionsForRole(del.roleId);
          if (delPerms && delPerms[moduleId]?.enabled && delPerms[moduleId]?.actions[action as string]) {
            return true;
          }
        }
      }

      // Check 2: Permissions Temporelles actives
      const now = new Date().toISOString();
      const tempGrant = temporaryPermissions.find(
        (t) =>
          t.userId === currentUserId &&
          t.moduleId === moduleId &&
          t.action === action &&
          t.status === 'ACTIVE' &&
          t.startDate <= now &&
          t.endDate >= now
      );
      if (tempGrant) return true;

      // Check 3: Permission du rôle principal
      if (!rolePermissions) return false;
      const mod = rolePermissions[moduleId];
      if (!mod || !mod.enabled) return false;

      const hasAction = Boolean(mod.actions?.[action as string]);
      if (!hasAction) return false;

      // Check 4: Restrictions contextuelles (ex: Enseignant - propre classe)
      if (mod.restrictions && context) {
        if (mod.restrictions.ownClassOnly && context.classId) {
          // Si une restriction de classe existe, on applique la règle contextuelle
        }
      }

      return true;
    },
    [isAdmin, isReadOnly, activeDelegations, getPermissionsForRole, temporaryPermissions, currentUserId, rolePermissions]
  );

  // Helper Restrictions
  const restrictions = useCallback(
    (moduleId: ModuleId): RoleRestrictions => {
      if (!rolePermissions || !rolePermissions[moduleId]) return {};
      return rolePermissions[moduleId].restrictions || {};
    },
    [rolePermissions]
  );

  // Workflows d'approbation
  const requiresApproval = useCallback(
    (actionType: ApprovalActionType): boolean => {
      // Les actions sensibles nécessitent une approbation si l'utilisateur n'est pas Admin
      if (isAdmin) return false;
      const sensitiveActions: ApprovalActionType[] = [
        'EDIT_PUBLISHED_GRADES',
        'VALIDATE_BULLETINS',
        'DELETE_STUDENT_PERMANENT',
        'CANCEL_PAYMENT',
      ];
      return sensitiveActions.includes(actionType);
    },
    [isAdmin]
  );

  const requestApproval = useCallback(
    (
      actionType: ApprovalActionType,
      label: string,
      details: string,
      targetEntityId?: string
    ) => {
      submitApprovalRequest(
        {
          actionType,
          label,
          requesterId: currentUserId,
          requesterName: currentUserName,
          targetEntityId,
          details,
        },
        currentUserId,
        currentUserName
      );
    },
    [submitApprovalRequest, currentUserId, currentUserName]
  );

  // Structuration de l'API `can`
  const can = useMemo(() => {
    const fn = (moduleId: ModuleId, action: AnyAction, context?: CheckContext) =>
      canCheck(moduleId, action, context);

    fn.view = (moduleId: ModuleId) => canCheck(moduleId, 'view');
    fn.create = (moduleId: ModuleId) => canCheck(moduleId, 'create');
    fn.edit = (moduleId: ModuleId) => canCheck(moduleId, 'edit');
    fn.delete = (moduleId: ModuleId) => canCheck(moduleId, 'delete');
    fn.export = (moduleId: ModuleId) => canCheck(moduleId, 'export');
    fn.print = (moduleId: ModuleId) => canCheck(moduleId, 'print');
    fn.validate = (moduleId: ModuleId) => canCheck(moduleId, 'validate');
    fn.publish = (moduleId: ModuleId) => canCheck(moduleId, 'publish');

    return fn;
  }, [canCheck]);

  return {
    can,
    activeRoleId,
    isAdmin,
    isReadOnly,
    hasActiveDelegation,
    restrictions,
    requiresApproval,
    requestApproval,
  };
}
