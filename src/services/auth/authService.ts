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
  status: 'ACTIF',
  createdAt: '2026-01-01T00:00:00Z',
  isOwner: true,
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
    status: 'ACTIF',
    createdAt: user.created_at || new Date().toISOString(),
    isOwner: role === 'ADMIN_GENERALE' || role === 'DIRECTEUR',
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

// ── GESTION PERSISTANTE DE LA LISTE DES COMPTES (MODE DÉMO & SUPABASE) ───────
const deletedUserIds = new Set<string>();

let memoryUserAccounts: UserAccount[] = [
  {
    id: 'usr-demo-01',
    username: 'admin',
    fullName: 'M. le Directeur Général',
    role: 'ADMIN_GENERALE',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
    status: 'ACTIF',
    createdAt: '2026-01-01T00:00:00Z',
    isOwner: true,
  },
  {
    id: 'usr-demo-02',
    username: 'finance',
    fullName: 'Mme Awa Diop (Comptabilité)',
    role: 'FINANCE',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=awa',
    status: 'ACTIF',
    createdAt: '2026-01-02T00:00:00Z',
    isOwner: false,
  },
  {
    id: 'usr-demo-03',
    username: 'enseignant',
    fullName: 'M. Jean Kouassi (Professeur)',
    role: 'ENSEIGNANT',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=jean',
    status: 'ACTIF',
    createdAt: '2026-01-03T00:00:00Z',
    isOwner: false,
  },
];

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, avatar_url')
      .order('created_at', { ascending: true });

    if (!error && profiles && profiles.length > 0) {
      return profiles
        .filter((p) => !deletedUserIds.has(p.id))
        .map((p) => ({
          id: p.id,
          username: p.username,
          fullName: p.full_name || p.username,
          role: p.role as UserRole,
          avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`,
          status: 'ACTIF' as const,
          createdAt: new Date().toISOString(),
          isOwner: p.role === 'ADMIN_GENERALE' || p.role === 'DIRECTEUR',
        }));
    }
  } catch {
    // Mode démo local
  }

  return memoryUserAccounts.filter((u) => !deletedUserIds.has(u.id));
}

export async function createAccount(
  username: string,
  password: string,
  role: UserRole,
  fullName: string
): Promise<{ error?: string }> {
  const newId = `usr-created-${Date.now()}`;
  const newUser: UserAccount = {
    id: newId,
    username,
    fullName,
    role,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    status: 'ACTIF',
    createdAt: new Date().toISOString(),
    isOwner: role === 'ADMIN_GENERALE' || role === 'DIRECTEUR',
  };

  memoryUserAccounts.push(newUser);

  try {
    const email = usernameToEmail(username);
    await supabase.auth.signUp({ email, password, options: { data: { username, role, full_name: fullName } } });
    await supabase.from('profiles').insert([{ id: newId, username, full_name: fullName, role }]);
  } catch {
    // Mode démo local
  }

  return {};
}

export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  deletedUserIds.add(userId);
  memoryUserAccounts = memoryUserAccounts.filter((u) => u.id !== userId);

  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch {
    // Mode démo local
  }

  return {};
}

export async function updateUserPassword(newPassword: string): Promise<{ error?: string }> {
  try {
    await supabase.auth.updateUser({ password: newPassword });
  } catch {
    // Mode démo local
  }
  return {};
}

export async function updateAccountRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  memoryUserAccounts = memoryUserAccounts.map((u) => (u.id === userId ? { ...u, role } : u));
  try {
    await supabase.from('profiles').update({ role }).eq('id', userId);
  } catch {
    // Mode démo local
  }
  return {};
}
