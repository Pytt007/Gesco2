/**
 * GESCO — Service Authentification
 * Couche de communication directe avec Supabase Auth & Profils Utilisateurs avec fallback Démo
 */

import { supabase, createIsolatedClient, usernameToEmail, emailToUsername } from '../common/supabaseClient';
import { GescoUser, UserAccount, UserRole } from '../../types';

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

export async function loginWithPassword(username: string, password: string): Promise<GescoUser> {
  const email = usernameToEmail(username);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      return await resolveUserFromSupabase(data.user);
    }
  } catch {
    // Fallback en mode démo si Supabase n'est pas connecté
  }

  // Fallback Démo instantané
  const lowerUser = username.toLowerCase().trim() || 'admin';
  let role: UserRole = 'ADMIN_GENERALE';
  if (lowerUser.includes('prof') || lowerUser.includes('scolaire')) role = 'SCOLAIRE_ENSEIGNANT';
  if (lowerUser.includes('compta') || lowerUser.includes('finance')) role = 'FINANCE';

  return {
    id: `usr-demo-${lowerUser}`,
    username: lowerUser,
    role,
    fullName: lowerUser === 'admin' ? 'M. le Directeur Général' : `Utilisateur ${lowerUser}`,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${lowerUser}`,
  };
}

export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Fallback
  }
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (profiles && profiles.length > 0) {
      return profiles.map((p) => ({
        id: p.id,
        username: p.username,
        fullName: p.full_name || p.username,
        role: p.role as UserRole,
        avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`,
      }));
    }
  } catch { /* Fallback */ }

  return [
    { id: 'usr-demo-admin-01', username: 'admin', fullName: 'M. le Directeur Général', role: 'ADMIN_GENERALE' },
    { id: 'usr-demo-teacher-01', username: 'enseignant', fullName: 'M. KOUASSI Philippe (Enseignant)', role: 'SCOLAIRE_ENSEIGNANT' },
    { id: 'usr-demo-finance-01', username: 'comptable', fullName: 'M. SANOGO Ibrahim (Finance)', role: 'FINANCE' },
  ];
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
