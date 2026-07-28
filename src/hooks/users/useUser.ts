// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useUser
// Gestion de l'état d'un utilisateur individuel (consultation, détails, profil)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { fetchUserAccounts, updateAccountRole, updateUserPassword } from '../../services/auth/authService';
import { UserAccount, UserRole } from '../../types';

export function useUser(userId?: string) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUser = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const accounts = await fetchUserAccounts();
      const found = accounts.find((u) => u.id === id) || null;
      if (!found) {
        setError(`Utilisateur #${id} introuvable.`);
      }
      setUser(found);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération de l\'utilisateur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadUser(userId);
    }
  }, [userId, loadUser]);

  const changeRole = useCallback(async (newRole: UserRole): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateAccountRole(user.id, newRole);
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return false;
      }
      setUser((prev) => (prev ? { ...prev, role: newRole } : null));
      setSuccess('Rôle utilisateur modifié avec succès.');
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de rôle.');
      setSaving(false);
      return false;
    }
  }, [user]);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateUserPassword(newPassword);
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return false;
      }
      setSuccess('Mot de passe mis à jour.');
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du mot de passe.');
      setSaving(false);
      return false;
    }
  }, []);

  return {
    user,
    loading,
    saving,
    error,
    success,
    loadUser,
    changeRole,
    changePassword,
  };
}
