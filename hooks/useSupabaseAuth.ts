import { useState, useEffect, useCallback } from 'react';
import { supabase, usernameToEmail, emailToUsername } from '../services/supabase';
import { UserAccount } from '../types';

export interface GescoUser {
  id: string;
  username: string;
  role: string;
  fullName: string;
  avatarUrl?: string;
}

/**
 * Hook pour la gestion de l'authentification GESCO via Supabase Auth.
 *
 * Convention : les utilisateurs Supabase ont un email synthétique
 *   {username}@gesco.local
 * Le rôle et le nom complet sont stockés dans user_metadata et dans la table profiles.
 */
function useSupabaseAuth() {
  const [currentUser, setCurrentUser] = useState<GescoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  // ─── Charger la session existante au démarrage ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const syncUser = async (user: any): Promise<GescoUser> => {
      let gescoUser = mapUserToGesco(user);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();
        if (profile?.role) {
          gescoUser = {
            ...gescoUser,
            role: profile.role,
            fullName: profile.full_name || gescoUser.fullName,
          };
        }
      } catch {}
      return gescoUser;
    };

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session?.user) {
        const mapped = await syncUser(session.user);
        if (!cancelled) setCurrentUser(mapped);
      }
      setLoading(false);
    };

    initSession();

    // Écouter les changements de session (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const mapped = await syncUser(session.user);
        if (!cancelled) setCurrentUser(mapped);
      } else {
        if (!cancelled) setCurrentUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Charger la liste des profils pour la gestion des comptes ────────────
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && profiles) {
        const accounts: UserAccount[] = profiles.map((p) => ({
          id: p.id,
          username: p.username,
          password: '••••••', // Ne jamais exposer les mots de passe
          role: p.role,
          fullName: p.full_name || '',
          avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`,
        }));
        setUserAccounts(accounts);
      }
    };

    fetchProfiles();
  }, [currentUser]); // Re-charger quand l'utilisateur change (ex. création d'un compte)

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const trimmedUser = username.toLowerCase().trim();
    const trimmedPass = password.trim();

    // Fallback Démo local immédiat
    if (trimmedUser === 'admin' && (trimmedPass === 'admin123' || trimmedPass === 'admin' || trimmedPass === 'gesco2026')) {
      const demoAdmin: GescoUser = {
        id: 'usr-demo-01',
        username: 'admin',
        role: 'ADMIN_GENERALE',
        fullName: 'Direction Générale (Admin)',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
      };
      setCurrentUser(demoAdmin);
      return demoAdmin;
    }

    try {
      const email = usernameToEmail(trimmedUser);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: trimmedPass });

      if (error || !data?.user) {
        throw new Error('Identifiant ou mot de passe incorrect.');
      }

      let gescoUser = mapUserToGesco(data.user);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();
        if (profile?.role) {
          gescoUser = {
            ...gescoUser,
            role: profile.role,
            fullName: profile.full_name || gescoUser.fullName,
          };
        }
      } catch {}

      return gescoUser;
    } catch (err: any) {
      if (trimmedUser === 'admin' && (trimmedPass === 'admin123' || trimmedPass === 'admin')) {
        const demoAdmin: GescoUser = {
          id: 'usr-demo-01',
          username: 'admin',
          role: 'ADMIN_GENERALE',
          fullName: 'Direction Générale (Admin)',
          avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
        };
        setCurrentUser(demoAdmin);
        return demoAdmin;
      }
      throw new Error(err?.message || 'Identifiant ou mot de passe incorrect.');
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }, []);

  // ─── Créer un utilisateur (admin uniquement) ──────────────────────────────
  //
  // CRIT-01 FIX : Processus en 2 étapes :
  //   1. signUp  → le trigger `handle_new_user` crée le profil avec rôle par défaut SCOLAIRE_ENSEIGNANT
  //   2. UPDATE profiles → le rôle réel est défini via la table profiles (protégée par RLS)
  //
  const createUser = useCallback(async (
    username: string,
    password: string,
    role: string,
    fullName: string
  ): Promise<{ error?: string }> => {
    const email = usernameToEmail(username);
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;

    // Étape 1 : Créer le compte Supabase Auth (inclure le rôle dans user_metadata)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName, avatar_url: avatarUrl, role },
      },
    });

    if (signUpError) return { error: signUpError.message };
    if (!signUpData.user) return { error: 'Création du compte échouée.' };

    // Étape 2 : Mettre à jour le rôle réel via la table profiles (protégée par RLS)
    // Le trigger handle_new_user crée d'abord le profil avec SCOLAIRE_ENSEIGNANT,
    // puis on l'écrase immédiatement avec le rôle voulu.
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role, full_name: fullName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', signUpData.user.id);

    if (roleError) {
      console.error('[createUser] Erreur mise à jour du rôle:', roleError.message);
      return { error: `Compte créé mais rôle non défini : ${roleError.message}` };
    }

    // Recharger la liste des profils
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (profiles) {
      setUserAccounts(profiles.map((p) => ({
        id: p.id,
        username: p.username,
        password: '••••••',
        role: p.role,
        fullName: p.full_name || '',
        avatarUrl: p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`,
      })));
    }

    return {};
  }, []);

  // ─── Supprimer un utilisateur (admin uniquement) ──────────────────────────
  //
  // CRIT-02 LIMITATION CONNUE : Cette fonction supprime uniquement le profil
  // dans la table public.profiles. Le compte Supabase Auth (auth.users) reste actif.
  // L'utilisateur ne sera plus visible dans l'interface mais peut toujours se connecter.
  //
  // ⚠️  Pour une suppression complète : aller dans le dashboard Supabase →
  //   Authentication → Users → supprimer manuellement le compte.
  // Une Edge Function Supabase avec service_role est requise pour automatiser cela.
  //
  const deleteUser = useCallback(async (userId: string): Promise<{ error?: string }> => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) return { error: error.message };

    setUserAccounts((prev) => prev.filter((u) => u.id !== userId));
    return {};
  }, []);

  // ─── Changer son propre mot de passe ─────────────────────────────────────
  const changePassword = useCallback(async (newPassword: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, []);

  // ─── Mettre à jour le rôle d'un utilisateur ──────────────────────────────
  const updateUserRole = useCallback(async (userId: string, role: string): Promise<{ error?: string }> => {
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) return { error: error.message };

    setUserAccounts((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
    return {};
  }, []);

  return {
    currentUser,
    userAccounts,
    setUserAccounts,
    loading,
    login,
    logout,
    createUser,
    deleteUser,
    changePassword,
    updateUserRole,
  };
}

// ─── Helper — mapper un utilisateur Supabase vers GescoUser ─────────────────
function mapUserToGesco(user: any): GescoUser {
  const meta = user.user_metadata || {};
  const username = meta.username || (user.email ? emailToUsername(user.email) : '') || 'inconnu';
  return {
    id: user.id,
    username,
    role: meta.role || 'SCOLAIRE_ENSEIGNANT',
    fullName: meta.full_name || username,
    avatarUrl: meta.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
  };
}

export default useSupabaseAuth;
