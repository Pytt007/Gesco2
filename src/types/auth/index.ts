// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types Authentification & Rôles
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN_GENERALE' | 'FINANCE' | 'SCOLAIRE_ENSEIGNANT' | 'CANTINE_TRANSPORT';

export interface GescoUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}
