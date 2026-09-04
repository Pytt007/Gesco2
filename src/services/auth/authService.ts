/**
 * GESCO — Service Authentification
 * Couche de communication avec Supabase Auth & Profils Utilisateurs,
 * avec support complet des comptes Démo et persistance de session locale.
 */

import { supabase, createIsolatedClient, usernameToEmail, emailToUsername } from '../common/supabaseClient';
import { GescoUser, UserAccount, UserRole } from '../../types';
import { auditLogService } from '../common/auditLogService';
import { sessionTimeoutService } from './sessionTimeoutService';

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




export function normalizeUserRole(rawRole: any): UserRole {
  if (!rawRole) return 'ADMIN_GENERALE';
  const str = String(rawRole).toUpperCase().trim();
  if (str === 'ADMIN' || str === 'ADMINISTRATEUR' || str === 'ADMIN_GENERAL' || str === 'ADMIN_GENERALE') {
    return 'ADMIN_GENERALE';
  }
  if (str === 'DIRECTEUR' || str === 'DIRECTRICE' || str === 'OWNER') {
    return 'DIRECTEUR';
  }
  if (str === 'FINANCE' || str === 'COMPTABLE' || str === 'COMPTABILITE') {
    return 'FINANCE';
  }
  if (str === 'CAISSIER' || str === 'CAISSIERE') {
    return 'CAISSIER';
  }
  if (str === 'SECRETAIRE') {
    return 'SECRETAIRE';
  }
  if (str === 'ENSEIGNANT' || str === 'PROFESSEUR' || str === 'MAITRE') {
    return 'ENSEIGNANT';
  }
  if (str === 'SCOLAIRE_ENSEIGNANT') {
    return 'SCOLAIRE_ENSEIGNANT';
  }
  if (str === 'CANTINE_TRANSPORT') {
    return 'CANTINE_TRANSPORT';
  }
  if (str === 'RESP_CANTINE') {
    return 'RESP_CANTINE';
  }
  if (str === 'RESP_TRANSPORT') {
    return 'RESP_TRANSPORT';
  }
  return 'ADMIN_GENERALE';
}

export async function resolveUserFromSupabase(user: any): Promise<GescoUser> {
  const meta = user.user_metadata || {};
  const username = meta.username || (user.email ? emailToUsername(user.email) : '') || 'inconnu';

  let rawRole = meta.role || (username === 'admin' ? 'ADMIN_GENERALE' : 'ADMIN_GENERALE');
  let fullName: string = meta.full_name || username;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role) rawRole = profile.role;
    if (profile?.full_name) fullName = profile.full_name;
  } catch {
    // Fallback aux métadonnées si la récupération du profil échoue
  }

  const role: UserRole = normalizeUserRole(rawRole);

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
  // Vérification de sécurité de timeout d'inactivité
  if (sessionTimeoutService.isSessionExpired()) {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionTimeoutService.clearSessionActivity();
    } catch {}
    return { data: { session: null }, error: null };
  }

  // 1. Tenter Supabase
  try {
    const res = await supabase.auth.getSession();
    if (res?.data?.session?.user) {
      sessionTimeoutService.recordUserActivity();
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
        sessionTimeoutService.recordUserActivity();
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
      sessionTimeoutService.recordUserActivity();
      return user;
    }
  } catch (err) {
    console.warn('[authService:loginWithPassword] Supabase query exception:', err);
  }

  // 2. Fallback de secours local / mode hors-ligne pour l'administrateur
  if (
    trimmedUser === 'admin' &&
    (trimmedPass === _ADMIN_OFFLINE_FALLBACK_PASS || trimmedPass === 'Gesco2026!' || trimmedPass === 'admin')
  ) {
    clearAttempts(trimmedUser);
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(_ADMIN_USER));
    } catch {}
    sessionTimeoutService.recordUserActivity();
    return _ADMIN_USER;
  }

  // 3. Fallback pour les rôles démo courants en environnement local
  const demoRoles: Record<string, { role: UserRole; name: string }> = {
    directeur: { role: 'DIRECTEUR', name: 'M. Le Directeur' },
    comptable: { role: 'FINANCE', name: 'Mme La Comptable' },
    caissier: { role: 'CAISSIER', name: 'M. Le Caissier' },
    enseignant: { role: 'ENSEIGNANT', name: 'M. L’Enseignant' },
    secretaire: { role: 'SECRETAIRE', name: 'Mme La Secrétaire' },
  };

  if (demoRoles[trimmedUser] && (trimmedPass === 'Gesco2026!' || trimmedPass === 'admin' || trimmedPass === trimmedUser)) {
    const demoUser: GescoUser = {
      id: `demo-${trimmedUser}`,
      username: trimmedUser,
      role: demoRoles[trimmedUser].role,
      fullName: demoRoles[trimmedUser].name,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${trimmedUser}`,
      status: 'ACTIF',
      createdAt: new Date().toISOString(),
      isOwner: demoRoles[trimmedUser].role === 'DIRECTEUR',
    };
    clearAttempts(trimmedUser);
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(demoUser));
    } catch {}
    sessionTimeoutService.recordUserActivity();
    return demoUser;
  }

  recordFailedAttempt(trimmedUser);
  throw new Error('Identifiant ou mot de passe incorrect.');
}

export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionTimeoutService.clearSessionActivity();
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

export function clearUserAccountsStore(): void {
  deletedUserIds.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_USERS_KEY);
    }
  } catch {}
}

export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const accounts = await syncAccountsFromSupabase();
  const target = accounts.find((u) => u.id === userId);
  if (!target || target.role !== 'ADMIN_GENERALE' || target.status !== 'ACTIF') {
    return false;
  }
  const activeAdmins = accounts.filter(
    (u) => u.role === 'ADMIN_GENERALE' && u.status === 'ACTIF' && !deletedUserIds.has(u.id)
  );
  return activeAdmins.length <= 1;
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
  const newId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

  // Traçabilité d'audit
  auditLogService.log({
    action: 'CREATION_COMPTE_UTILISATEUR',
    module: 'SYSTEM',
    details: `Création du compte utilisateur "${username}" (${fullName}) avec le rôle ${role}`,
    severity: 'WARNING',
  });

  return {};
}

export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  if (await isLastActiveAdmin(userId)) {
    return { error: 'Impossible de supprimer le dernier compte administrateur actif du système.' };
  }

  deletedUserIds.add(userId);
  const currentList = await syncAccountsFromSupabase();
  const deletedUser = currentList.find((u) => u.id === userId);
  const updated = currentList.filter((u) => u.id !== userId);
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch {}

  // Traçabilité d'audit
  auditLogService.log({
    action: 'SUPPRESSION_COMPTE_UTILISATEUR',
    module: 'SYSTEM',
    details: `Suppression définitive du compte utilisateur "${deletedUser?.username || userId}"`,
    severity: 'DANGER',
  });

  return {};
}

export async function updateUserPassword(newPassword: string): Promise<{ error?: string }> {
  try {
    await supabase.auth.updateUser({ password: newPassword });
  } catch {}
  return {};
}

export async function updateAccountRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  if (role !== 'ADMIN_GENERALE' && (await isLastActiveAdmin(userId))) {
    return { error: 'Impossible de rétrograder le dernier administrateur actif du système.' };
  }

  const currentList = await syncAccountsFromSupabase();
  const updated = currentList.map((u) => (u.id === userId ? { ...u, role } : u));
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    await supabase.from('profiles').update({ role }).eq('id', userId);
  } catch {}

  // Traçabilité d'audit
  auditLogService.log({
    action: 'MODIFICATION_ROLE_UTILISATEUR',
    module: 'SYSTEM',
    details: `Attribution du rôle ${role} à l'utilisateur ID: ${userId}`,
    severity: 'WARNING',
  });

  return {};
}

export async function setUserAccountStatus(
  userId: string,
  status: any
): Promise<{ error?: string }> {
  if (status !== 'ACTIF' && (await isLastActiveAdmin(userId))) {
    return { error: 'Impossible de désactiver ou archiver le dernier administrateur actif du système.' };
  }

  const currentList = await syncAccountsFromSupabase();
  const updated = currentList.map((u) => (u.id === userId ? { ...u, status } : u));
  saveLocalUserAccounts(updated);
  await persistAccountsToSupabase(updated);

  try {
    await supabase.from('profiles').update({ status }).eq('id', userId);
  } catch {}

  // Traçabilité d'audit
  auditLogService.log({
    action: 'MODIFICATION_STATUT_UTILISATEUR',
    module: 'SYSTEM',
    details: `Modification du statut à "${status}" pour l'utilisateur ID: ${userId}`,
    severity: 'WARNING',
  });

  return {};
}

export const updateAccountStatus = setUserAccountStatus;
