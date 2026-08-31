/**
 * GESCO — Service Authentification
 * Couche de communication avec Supabase Auth & Profils Utilisateurs,
 * avec support complet des comptes Démo et persistance de session locale.
 */

import { supabase, createIsolatedClient, usernameToEmail, emailToUsername } from '../common/supabaseClient';
import { GescoUser, UserAccount, UserRole } from '../../types';

const STORAGE_SESSION_KEY = 'gesco_auth_session';
const STORAGE_USERS_KEY = 'gesco_memory_users';

// ── COMPTE ADMINISTRATEUR INITIAL ─────────────────────────────────────────────
// ⚠️ SÉCURITÉ : Les mots de passe de secours sont privés au module et ne doivent JAMAIS être exportés.
// Ce fallback n'est actif QUE si Supabase est injoignable (mode hors-ligne total).
// Modifier ce mot de passe de secours dès le premier déploiement en production.
const _ADMIN_OFFLINE_FALLBACK_PASS = import.meta.env.VITE_ADMIN_OFFLINE_PASS || 'Gesco2026!';

const _ADMIN_USER: GescoUser = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  role: 'ADMIN_GENERALE',
  fullName: 'Direction Générale (Admin)',
  avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
  status: 'ACTIF',
  createdAt: '2026-01-01T00:00:00Z',
  isOwner: true,
};

// Exporté uniquement pour les composants qui affichent la liste des utilisateurs (sans les mots de passe)
export const DEMO_ADMIN_USER: GescoUser = _ADMIN_USER;




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
  // 1. Tenter Supabase
  try {
    const res = await supabase.auth.getSession();
    if (res?.data?.session?.user) {
      return res;
    }
  } catch {
    // Ignorer erreur réseau
  }

  // 2. Tenter session locale persistée
  try {
    const saved = localStorage.getItem(STORAGE_SESSION_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.id && user?.username) {
        return {
          data: {
            session: {
              user: {
                id: user.id,
                email: usernameToEmail(user.username),
                user_metadata: user,
              }
            }
          },
          error: null
        };
      }
    }
  } catch {}

  return { data: { session: null }, error: null };
}

export function subscribeToAuthStateChange(callback: (event: string, session: any) => void) {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  } catch {
    return { unsubscribe: () => {} };
  }
}

// ── Rate limiting basique ───────────────────────────────────────────────────
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
  if (rec.count >= 5) rec.lockedUntil = now + 60_000;
  else if (rec.count >= 3) rec.lockedUntil = now + 30_000;
  _loginAttempts[username] = rec;
}

function clearAttempts(username: string): void {
  delete _loginAttempts[username];
}

// ── Authentification Robuste ────────────────────────────────────────────────
export async function loginWithPassword(username: string, password: string): Promise<GescoUser> {
  const trimmedUser = username.toLowerCase().trim();
  const trimmedPass = password.trim();

  // Vérifier le rate-limit
  checkRateLimit(trimmedUser);

  // 1. Authentification via Supabase Auth (source de vérité principale)
  try {
    const email = usernameToEmail(trimmedUser);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: trimmedPass });
    if (!error && data?.user) {
      clearAttempts(trimmedUser);
      const user = await resolveUserFromSupabase(data.user);
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      } catch {}
      return user;
    }
  } catch {
    // Supabase injoignable — fallback de secours hors-ligne pour le seul compte admin
    // ⚠️ Ce bloc ne s'active QUE si le réseau est totalement absent.
    if (
      trimmedUser === 'admin' &&
      trimmedPass === _ADMIN_OFFLINE_FALLBACK_PASS
    ) {
      clearAttempts(trimmedUser);
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(_ADMIN_USER));
      } catch {}
      return _ADMIN_USER;
    }
  }

  recordFailedAttempt(trimmedUser);
  throw new Error('Identifiant ou mot de passe incorrect.');
}

export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {}
  try {
    await supabase.auth.signOut();
  } catch {}
}

// ─── GESTION DE LA LISTE DES COMPTES ─────────────────────────────────────────
const deletedUserIds = new Set<string>();

// Aucun compte local fictif — source unique : Supabase `profiles`
function getLocalUserAccounts(): UserAccount[] {
  try {
    const saved = localStorage.getItem(STORAGE_USERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}


function saveLocalUserAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
  } catch {}
}

// Synchronisation robuste des comptes utilisateurs via Supabase
async function syncAccountsFromSupabase(): Promise<UserAccount[]> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, avatar_url')
      .order('created_at', { ascending: true });

    if (!error && profiles && profiles.length > 0) {
      const mapped = profiles
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
      saveLocalUserAccounts(mapped);
      return mapped;
    }

    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'custom_user_accounts')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      saveLocalUserAccounts(settingsRow.data);
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[authService] Account sync warning:', err);
  }

  return getLocalUserAccounts().filter((u) => !deletedUserIds.has(u.id));
}

async function persistAccountsToSupabase(accounts: UserAccount[]) {
  try {
    await supabase
      .from('school_settings')
      .upsert({
        id: 'custom_user_accounts',
        data: accounts,
        updated_at: new Date().toISOString(),
      });
  } catch (e) {
    console.warn('[authService] persistAccountsToSupabase warning:', e);
  }
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  return syncAccountsFromSupabase();
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

  const currentList = await syncAccountsFromSupabase();
  const updated = [...currentList, newUser];
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    const email = usernameToEmail(username);
    await supabase.auth.signUp({ email, password, options: { data: { username, role, full_name: fullName } } });
    await supabase.from('profiles').upsert([{ id: newId, username, full_name: fullName, role }]);
  } catch {
    // Mode local
  }

  return {};
}

export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  deletedUserIds.add(userId);
  const currentList = await syncAccountsFromSupabase();
  const updated = currentList.filter((u) => u.id !== userId);
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch {}

  return {};
}

export async function updateUserPassword(newPassword: string): Promise<{ error?: string }> {
  try {
    await supabase.auth.updateUser({ password: newPassword });
  } catch {}
  return {};
}

export async function updateAccountRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  const currentList = await syncAccountsFromSupabase();
  const updated = currentList.map((u) => (u.id === userId ? { ...u, role } : u));
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    await supabase.from('profiles').update({ role }).eq('id', userId);
  } catch {}
  return {};
}
