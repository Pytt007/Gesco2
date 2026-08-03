// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types RBAC Granulaires (src/types/permissions/index.ts)
// Moteur d'autorisations : Rôle → Module → Action → Restriction
// ─────────────────────────────────────────────────────────────────────────────

// ─── Identifiants de Modules ──────────────────────────────────────────────────

export type ModuleId =
  | 'STUDENTS'
  | 'CLASSES'
  | 'STAFF'
  | 'ATTENDANCE'
  | 'TIMETABLE'
  | 'FINANCE'
  | 'CANTEEN'
  | 'TRANSPORT'
  | 'EXPENSES'
  | 'NOTES'
  | 'REPORTS'
  | 'STATISTICS'
  | 'HISTORY'
  | 'SETTINGS';

// ─── Actions par Module ───────────────────────────────────────────────────────

export type StudentAction =
  | 'view' | 'create' | 'edit' | 'archive' | 'delete' | 'restore'
  | 'export' | 'import' | 'print' | 'generate_doc' | 'view_history'
  | 'change_class' | 'transfer' | 'edit_photo' | 'edit_contacts';

export type ClassAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'assign_teacher' | 'close' | 'print';

export type StaffAction =
  | 'view' | 'create' | 'edit' | 'archive' | 'delete' | 'export' | 'print';

export type AttendanceAction =
  | 'view' | 'create' | 'edit' | 'validate' | 'export' | 'print';

export type TimetableAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'print';

export type FinanceAction =
  | 'view' | 'collect' | 'edit_payment' | 'cancel_payment' | 'delete_payment'
  | 'create_discount' | 'edit_discount' | 'edit_schedule' | 'print_receipt' | 'export';

export type CanteenAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'print' | 'export';

export type TransportAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'print' | 'export';

export type ExpenseAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'validate' | 'export';

export type NoteAction =
  | 'view' | 'create_eval' | 'enter' | 'edit' | 'validate' | 'publish'
  | 'unpublish' | 'delete' | 'print';

export type ReportAction = 'view' | 'generate' | 'export' | 'print';

export type StatAction = 'view' | 'export';

export type AuditAction = 'view' | 'export';

export type SettingsAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'backup' | 'restore'
  | 'change_year' | 'edit_permissions';

// Union de toutes les actions (pour le hook générique)
export type AnyAction =
  | StudentAction | ClassAction | StaffAction | AttendanceAction | TimetableAction
  | FinanceAction | CanteenAction | TransportAction | ExpenseAction
  | NoteAction | ReportAction | StatAction | AuditAction | SettingsAction;

// ─── Structure Permission par Module ─────────────────────────────────────────

export interface RoleRestrictions {
  ownClassOnly?: boolean;     // Enseignant → uniquement ses classes
  ownSubjectOnly?: boolean;   // Enseignant → uniquement ses matières
  ownStudentsOnly?: boolean;  // Enseignant → uniquement ses élèves
  readOnly?: boolean;         // Caissier → lecture seule sur certains éléments
  noTariffEdit?: boolean;     // Caissier → ne peut pas modifier les frais
  noPaymentDelete?: boolean;  // Caissier → ne peut pas supprimer les paiements
}

export interface ModulePermission {
  enabled: boolean;                    // Accès global au module (dans la sidebar)
  actions: Record<string, boolean>;    // Permissions granulaires par action
  restrictions?: RoleRestrictions;     // Restrictions contextuelles
}

export type RolePermissions = Record<ModuleId, ModulePermission>;

// ─── Définition d'un Rôle ────────────────────────────────────────────────────

export interface RoleDefinition {
  id: string;                 // Identifiant unique ('DIRECTEUR', 'CAISSIER', ...)
  label: string;              // Nom affiché
  emoji: string;              // Icône emoji
  description: string;        // Description courte
  isSystem: boolean;          // Les rôles système ne peuvent pas être supprimés
  color: string;              // Couleur hexadécimale
  permissions: RolePermissions;
}

// ─── Journal d'Audit Permissions ─────────────────────────────────────────────

export type PermissionAuditAction =
  | 'create_role' | 'edit_role' | 'delete_role' | 'duplicate_role'
  | 'grant_permission' | 'revoke_permission' | 'toggle_module'
  | 'import' | 'reset';

export interface PermissionAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: PermissionAuditAction;
  roleId: string;
  roleLabel: string;
  detail?: string;
}

// ─── Store de Permissions ─────────────────────────────────────────────────────

export interface PermissionStore {
  version: number;
  roles: RoleDefinition[];
  auditLog: PermissionAuditEntry[];
  lastUpdated: string;
}

// ─── Métadonnées des Modules (Labels + Actions) ───────────────────────────────

export interface ActionMeta {
  id: string;
  label: string;
  description?: string;
  dangerous?: boolean;     // Actions dangereuses (rouge)
}

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  emoji: string;
  color: string;
  viewId: string;          // Correspond aux IDs de l'App.tsx
  actions: ActionMeta[];
}
