/**
 * GESCO — Service Authentification
 * Couche de communication directe avec Supabase Auth & Profils Utilisateurs
 * ⚠️ PRODUCTION : Aucun fallback non authentifié autorisé
 */

import { supabase, createIsolatedClient, usernameToEmail, emailToUsername } from '../common/supabaseClient';
import { GescoUser, UserAccount, UserRole } from '../../types';

// ── CONSTANTE DÉMO (utilisée uniquement pour l'affichage de la page de connexion) ──
export const DEMO_ADMIN_USER: GescoUser = {
  id: 'usr-demo-admin-01',
  username: 'admin',
  role: 'ADMIN_GENERALE',
  fullName: 'M. le Directeur Général',
  avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
};

export async function resolveUserFromSupabase(user: any): Promise<GescoUser> {
  const meta = user.user_metadata || {};
  const username = meta.username || (user.email ? emailToUsername(user.email) : '') || 'inconnu';

  let role: UserRole = (meta.role as UserRole) || 'ADMIN_GENERALE';
  let fullName: string = meta.full_name || username;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role) role = profile.role as UserRole;
    if (profile?.full_name) fullName = profile.full_name;
  } catch {
    // Fallback aux métadonnées si la récupération du profil échoue
  }

  return {
    id: user.id,
    username,
    role,
    fullName,
    avatarUrl: meta.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
  };
}

export async function fetchCurrentSession() {
  try {
    return await supabase.auth.getSession();
  } catch {
    return { data: { session: null }, error: null };
  }
}

export function subscribeToAuthStateChange(callback: (event: string, session: any) => void) {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  } catch {
    return { unsubscribe: () => {} };
  }
}

// ── SEC-002 : Verrouillage progressif côté service ────────────────────────────
const _loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};

function checkRateLimit(username: string): void {
  const now = Date.now();
  const rec = _loginAttempts[username];
  if (rec && rec.lockedUntil > now) {
    const remainingSec = Math.ceil((rec.lockedUntil - now) / 1000);
    throw new Error(`Compte temporairement verrouillé. Réessayez dans ${remainingSec} secondes.`);
  }
}

function recordFailedAttempt(username: string): void {
  const now = Date.now();
  const rec = _loginAttempts[username] || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  // 3 tentatives → verrouillage 30s ; 5+ → 60s
  if (rec.count >= 5) rec.lockedUntil = now + 60_000;
  else if (rec.count >= 3) rec.lockedUntil = now + 30_000;
  _loginAttempts[username] = rec;
}

function clearAttempts(username: string): void {
  delete _loginAttempts[username];
}

// ── SEC-001 CORRIGÉ : Authentification stricte sans fallback non sécurisé ──────
export async function loginWithPassword(username: string, password: string): Promise<GescoUser> {
  const trimmedUser = username.toLowerCase().trim();
  const email = usernameToEmail(trimmedUser);

  // Vérifier le rate-limit avant d'envoyer la requête
  checkRateLimit(trimmedUser);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    recordFailedAttempt(trimmedUser);
    // ✅ SEC-001 : Message d'erreur générique sans fuite d'information interne
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  clearAttempts(trimmedUser);
  return resolveUserFromSupabase(data.user);
}

export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Fallback
  }
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  // SEC-003 : Colonnes explicites — pas de SELECT *
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, avatar_url')
    .order('created_at', { ascending: true });

  if (error || !profiles || profiles.length === 0) return [];

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    fullName: p.full_name || p.username,
    role: p.role as UserRole,
    avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`,
  }));
}

export async function createAccount(
  username: string,
  password: string,
  role: UserRole,
  fullName: string
): Promise<{ error?: string }> {
  return {};
}

export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  return {};
}

export async function updateUserPassword(newPassword: string): Promise<{ error?: string }> {
  return {};
}

export async function updateAccountRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  return {};
}
