// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types Authentification, Utilisateurs & IAM (src/types/auth/index.ts)
// Architecture : PROPRIÉTAIRE (OWNER) | UTILISATEURS | MODÈLES DE RÔLES
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'ADMIN_GENERALE'
  | 'FINANCE'
  | 'SCOLAIRE_ENSEIGNANT'
  | 'CANTINE_TRANSPORT'
  | 'DIRECTEUR'
  | 'SECRETAIRE'
  | 'CAISSIER'
  | 'ENSEIGNANT'
  | 'RESP_CANTINE'
  | 'RESP_TRANSPORT';

export type UserAccountStatus =
  | 'ACTIF'
  | 'SUSPENDU'
  | 'VERROUILLE'
  | 'INVITATION_ENVOYEE'
  | 'DESACTIVE';

export interface UserConnectionHistory {
  id: string;
  timestamp: string;
  ipAddress?: string;
  browser?: string;
  status: 'SUCCESS' | 'FAILED' | 'LOGOUT';
}

export interface GescoUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  roleId?: string;               // Lien vers le modèle de rôle RBAC
  isOwner?: boolean;             // Identifie le Propriétaire officiel de l'établissement
  status: UserAccountStatus;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginBrowser?: string;
  specificPermissions?: Record<string, boolean>; // Overrides contextuels
}

export interface UserAccount extends GescoUser {
  connectionHistory?: UserConnectionHistory[];
}

export interface InitialSetupData {
  schoolName: string;
  schoolCode: string;
  ownerFullName: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
  academicYearLabel: string;
}
