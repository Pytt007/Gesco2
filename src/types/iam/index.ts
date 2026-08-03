// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Architecture IAM (Identity & Access Management) (src/types/iam/index.ts)
// Modèle complet : UTILISATEUR → RÔLE → MODULE → ACTION → RESTRICTION → CONTEXTE
// + Permissions Temporelles, Délégations, Mode Lecture Seule, Workflows d'Approbation, Audit IAM
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole } from '../auth';
import type { ModuleId, AnyAction, RolePermissions, RoleRestrictions } from '../permissions';

// ─── 1. ENTITÉ UTILISATEUR & RÔLE IAM ────────────────────────────────────────

export interface IAMUserContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  activeClassIds?: string[];    // IDs des classes attribuées (Enseignant)
  activeSubjectIds?: string[];  // IDs des matières attribuées (Enseignant)
  isReadOnly?: boolean;         // Mode Lecture Seule global activé pour cet utilisateur
}

// ─── 2. PERMISSIONS TEMPORELLES ───────────────────────────────────────────────

export interface TemporaryPermission {
  id: string;
  userId: string;
  userName: string;
  moduleId: ModuleId;
  action: string;
  startDate: string;            // ISO String
  endDate: string;              // ISO String
  grantedBy: string;
  grantedByName: string;
  reason: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

// ─── 3. DÉLÉGATION DE POUVOIR ────────────────────────────────────────────────

export interface DelegationRule {
  id: string;
  delegatorId: string;          // Utilisateur qui délègue (ex: Directeur)
  delegatorName: string;
  delegateeId: string;          // Utilisateur qui reçoit la délégation (ex: Adjoint)
  delegateeName: string;
  roleId: string;               // Rôle délégué ou permissions spécifiques
  roleLabel: string;
  startDate: string;            // ISO String
  endDate: string;              // ISO String
  reason: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
}

// ─── 4. WORKFLOW D'APPROBATION ────────────────────────────────────────────────

export type ApprovalActionType =
  | 'EDIT_PUBLISHED_GRADES'
  | 'VALIDATE_BULLETINS'
  | 'DELETE_STUDENT_PERMANENT'
  | 'CANCEL_PAYMENT'
  | 'EDIT_TARIFF';

export interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  label: string;
  requesterId: string;
  requesterName: string;
  targetEntityId?: string;
  targetEntityLabel?: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
}

// ─── 5. AUDIT IAM ÉTENDU ──────────────────────────────────────────────────────

export type IAMAuditCategory =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'PERMISSION_CHANGE'
  | 'DELEGATION_GRANT'
  | 'DELEGATION_REVOKE'
  | 'TEMP_PERMISSION_GRANT'
  | 'TEMP_PERMISSION_EXPIRE'
  | 'APPROVAL_SUBMIT'
  | 'APPROVAL_DECISION';

export interface IAMAuditEntry {
  id: string;
  timestamp: string;
  category: IAMAuditCategory;
  userId: string;
  userName: string;
  userRole: string;
  targetRoleId?: string;
  targetUserId?: string;
  ipAddress?: string;
  detail: string;
  metadata?: Record<string, any>;
}

// ─── 6. ÉTATT GLOBAL IAM STORE ────────────────────────────────────────────────

export interface IAMStoreState {
  temporaryPermissions: TemporaryPermission[];
  delegations: DelegationRule[];
  approvalRequests: ApprovalRequest[];
  auditLogs: IAMAuditEntry[];
  readOnlyUsers: string[];      // IDs des utilisateurs en mode lecture seule
}
