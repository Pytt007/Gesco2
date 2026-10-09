/**
 * GESCO — Service Authentification
 * Neon Auth et profils autorisés en base.
 */

import { supabase, createIsolatedClient, usernameToEmail } from '../common/supabaseClient';
import { GescoUser, UserAccount, UserRole } from '../../types';
import { sessionTimeoutService } from './sessionTimeoutService';

export function normalizeUserRole(rawRole: any): UserRole {
  if (!rawRole) throw new Error('Aucun rôle autorisé pour ce compte.');
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
  throw new Error('Rôle utilisateur non reconnu.');
}

function mapProfile(profile: any): UserAccount {
  const role = normalizeUserRole(profile.role);
  return {
    id: profile.id, username: profile.username, fullName: profile.full_name,
    role, status: profile.status, avatarUrl: profile.avatar_url || '',
    email: profile.email || '', createdAt: profile.created_at,
    isOwner: role === 'ADMIN_GENERALE' || role === 'DIRECTEUR',
  };
}

export async function resolveUserFromSupabase(user: any): Promise<GescoUser> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) throw new Error(error.message);
  if (!data || data.status !== 'ACTIF') throw new Error('Ce compte ne dispose pas d’un accès actif à GESCO.');
  return mapProfile(data);
}

export async function fetchCurrentSession() {
  // Old browser-only sessions never grant access.
  try { localStorage.removeItem('gesco_auth_session'); } catch {}
  if (sessionTimeoutService.isSessionExpired()) {
    await supabase.auth.signOut();
    sessionTimeoutService.clearSessionActivity();
    return { data: { session: null }, error: null };
  }
  const result = await supabase.auth.getSession();
  if (result.error) throw new Error(result.error.message);
  if (result.data.session) sessionTimeoutService.recordUserActivity();
  return result;
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
  const identifier = username.toLowerCase().trim();
  checkRateLimit(identifier);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(identifier), password });
    if (error || !data.user) throw new Error(error?.message || 'Connexion refusée.');
    const user = await resolveUserFromSupabase(data.user);
    clearAttempts(identifier);
    sessionTimeoutService.recordUserActivity();
    return user;
  } catch (error) {
    recordFailedAttempt(identifier);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  clearUserAccountsStore();
  sessionTimeoutService.clearSessionActivity();
}

export function clearUserAccountsStore(): void {
  try {
    localStorage.removeItem('gesco_memory_users');
    localStorage.removeItem('gesco_auth_session');
  } catch {}
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map(mapProfile);
}

export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const accounts = await fetchUserAccounts();
  const admins = accounts.filter(user => user.role === 'ADMIN_GENERALE' && user.status === 'ACTIF');
  return admins.length === 1 && admins[0].id === userId;
}

function errorResult(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : 'Enregistrement refusé par le serveur.' };
}

export async function createAccount(username: string, password: string, role: UserRole, fullName: string): Promise<{ error?: string }> {
  try {
    normalizeUserRole(role);
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) throw new Error('Identifiant : 3 à 64 lettres, chiffres, points, tirets ou underscores.');
    if (password.length < 12) throw new Error('Le mot de passe doit contenir au moins 12 caractères.');
    // Check the current administrator before creating an auth identity.
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Connexion requise.');
    const actor = await resolveUserFromSupabase(session.session.user);
    if (actor.role !== 'ADMIN_GENERALE') throw new Error('Seul un administrateur peut créer un compte.');
    const email = usernameToEmail(username);
    // credentials: omit prevents signup from replacing the administrator's cookie.
    const { data, error } = await createIsolatedClient().auth.signUp({
      email, password, options: { data: { displayName: fullName } },
    });
    if (error || !data.user) throw new Error(error?.message || 'Création de l’identité refusée.');
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id, username: username.toLowerCase(), email, full_name: fullName,
      role, status: 'ACTIF',
    });
    if (profileError) throw new Error('Identité créée sans accès GESCO : ' + profileError.message);
    return {};
  } catch (error) { return errorResult(error); }
}

export async function updateUserPassword(newPassword: string, currentPassword?: string): Promise<{ error?: string }> {
  if (newPassword.length < 12) return { error: 'Le mot de passe doit contenir au moins 12 caractères.' };
  if (!currentPassword) return { error: 'Le mot de passe actuel est requis.' };
  const { error } = await supabase.auth.getBetterAuthInstance().changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  return error ? { error: error.message } : {};
}

async function updateProfile(id: string, updates: Record<string, string>): Promise<{ error?: string }> {
  try {
    if (await isLastActiveAdmin(id)) throw new Error('Le dernier administrateur actif doit être conservé.');
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select('id').single();
    if (error || !data) throw new Error(error?.message || 'Compte introuvable ou modification non autorisée.');
    return {};
  } catch (error) { return errorResult(error); }
}

export async function deleteAccount(userId: string): Promise<{ error?: string }> {
  return updateProfile(userId, { status: 'DESACTIVE' });
}
export async function updateAccountRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  try { normalizeUserRole(role); } catch (error) { return errorResult(error); }
  return updateProfile(userId, { role });
}
export async function setUserAccountStatus(userId: string, status: string): Promise<{ error?: string }> {
  if (!['ACTIF', 'SUSPENDU', 'VERROUILLE', 'INVITATION_ENVOYEE', 'DESACTIVE'].includes(status)) return { error: 'Statut non reconnu.' };
  return updateProfile(userId, { status });
}
export const updateAccountStatus = setUserAccountStatus;
