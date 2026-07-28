/**
 * GESCO — Contexte d'Authentification avec Fallback Démo
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  resolveUserFromSupabase,
  fetchCurrentSession,
  subscribeToAuthStateChange,
  loginWithPassword,
  logoutUser,
  fetchUserAccounts,
  createAccount,
  deleteAccount,
  updateUserPassword,
  updateAccountRole,
  DEMO_ADMIN_USER,
} from '../services/auth/authService';
import { DEFAULT_PERMISSIONS } from '../constants/permissions';
import { GescoUser, UserAccount, UserRole } from '../types';

interface AuthContextValue {
  currentUser: GescoUser | null;
  userAccounts: UserAccount[];
  loading: boolean;
  permissions: string[];
  canAccess: (viewId: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (username: string, password: string, role: UserRole, fullName: string) => Promise<{ error?: string }>;
  deleteUser: (userId: string) => Promise<{ error?: string }>;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateUserRole: (userId: string, role: UserRole) => Promise<{ error?: string }>;
  refreshUserAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ✅ SEC-001 : Aucun utilisateur pré-chargé par défaut — toujours null
  const [currentUser, setCurrentUser] = useState<GescoUser | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUserAccounts = useCallback(async () => {
    try {
      const accounts = await fetchUserAccounts();
      setUserAccounts(accounts);
    } catch { /* Fallback */ }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentSession().then(async (res) => {
      if (cancelled) return;
      const session = res?.data?.session;
      if (session?.user) {
        const user = await resolveUserFromSupabase(session.user);
        if (!cancelled) setCurrentUser(user);
      } else {
        // ✅ SEC-001 : Pas de session → l'utilisateur reste null (non connecté)
        if (!cancelled) setCurrentUser(null);
      }
      if (!cancelled) setLoading(false);
    }).catch(() => {
      // En cas d'erreur réseau, on reste non connecté
      if (!cancelled) {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    const subscription = subscribeToAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        const user = await resolveUserFromSupabase(session.user);
        if (!cancelled) setCurrentUser(user);
      } else {
        if (!cancelled) setCurrentUser(null);
      }
    });

    return () => {
      cancelled = true;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) refreshUserAccounts();
  }, [currentUser, refreshUserAccounts]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await loginWithPassword(username, password);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserAccounts([]);
  }, []);

  const createUser = useCallback(async (
    username: string,
    password: string,
    role: UserRole,
    fullName: string
  ): Promise<{ error?: string }> => {
    const res = await createAccount(username, password, role, fullName);
    if (!res.error) {
      await refreshUserAccounts();
    }
    return res;
  }, [refreshUserAccounts]);

  const deleteUser = useCallback(async (userId: string): Promise<{ error?: string }> => {
    const res = await deleteAccount(userId);
    if (!res.error) {
      setUserAccounts((prev) => prev.filter((u) => u.id !== userId));
    }
    return res;
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<{ error?: string }> => {
    return updateUserPassword(newPassword);
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: UserRole): Promise<{ error?: string }> => {
    const res = await updateAccountRole(userId, role);
    if (!res.error) {
      setUserAccounts((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    }
    return res;
  }, []);

  const permissions = currentUser ? (DEFAULT_PERMISSIONS[currentUser.role] || DEFAULT_PERMISSIONS.ADMIN_GENERALE) : DEFAULT_PERMISSIONS.ADMIN_GENERALE;
  const canAccess = useCallback((viewId: string) => permissions.includes(viewId), [permissions]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      userAccounts,
      loading,
      permissions,
      canAccess,
      login,
      logout,
      createUser,
      deleteUser,
      changePassword,
      updateUserRole,
      refreshUserAccounts,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
