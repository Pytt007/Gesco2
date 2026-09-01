// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useUsers
// Gestion de l'état, de la recherche, des filtres et du CRUD des utilisateurs
// Ne contient AUCUN appel Supabase/SQL direct (appelle exclusivement authService)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchUserAccounts,
  createAccount,
  deleteAccount,
  updateAccountRole,
  updateAccountStatus,
  isLastActiveAdmin,
} from '../../services/auth/authService';
import { UserAccount, UserRole } from '../../types';

export interface UseUsersOptions {
  pageSize?: number;
  initialRoleFilter?: string;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { pageSize = 10, initialRoleFilter = 'ALL' } = options;

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Recherche, filtres, tri et pagination
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>(initialRoleFilter);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'fullName' | 'username'>('fullName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Effacer les messages temporaires
  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Chargement de la liste des utilisateurs via authService
  const refreshUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserAccounts();
      setUsers(data);
    } catch (err: any) {
      console.error('[useUsers] Erreur lors du chargement des utilisateurs:', err);
      setError(err.message || 'Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // Filtrage et tri mémorisés
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (filterRole !== 'ALL' && u.role !== filterRole) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = u.fullName?.toLowerCase().includes(q);
          const matchUsername = u.username?.toLowerCase().includes(q);
          return matchName || matchUsername;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = (a[sortBy] || '').toLowerCase();
        const valB = (b[sortBy] || '').toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [users, search, filterRole, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Actions Utilisateur
  const createUser = useCallback(async (
    username: string,
    password: string,
    role: UserRole,
    fullName: string
  ): Promise<boolean> => {
    setSaving(true);
    clearStatus();
    try {
      const result = await createAccount(username, password, role, fullName);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return false;
      }
      setSuccess(`Compte créé avec succès pour ${fullName}.`);
      await refreshUsers();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte.');
      setSaving(false);
      return false;
    }
  }, [clearStatus, refreshUsers]);

  const updateUserRole = useCallback(async (userId: string, role: UserRole): Promise<boolean> => {
    setSaving(true);
    clearStatus();
    try {
      const result = await updateAccountRole(userId, role);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return false;
      }
      setSuccess('Rôle utilisateur mis à jour.');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du rôle.');
      setSaving(false);
      return false;
    }
  }, [clearStatus]);

  const archiveUser = useCallback(async (userId: string): Promise<boolean> => {
    setSaving(true);
    clearStatus();
    try {
      const result = await deleteAccount(userId);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return false;
      }
      setSuccess('Compte utilisateur archivé/supprimé.');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'archivage.');
      setSaving(false);
      return false;
    }
  }, [clearStatus]);

  const updateUserStatus = useCallback(async (
    userId: string,
    status: 'ACTIF' | 'INACTIF' | 'ARCHIVE'
  ): Promise<boolean> => {
    setSaving(true);
    clearStatus();
    try {
      const result = await updateAccountStatus(userId, status);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return false;
      }
      setSuccess(`Statut utilisateur mis à jour (${status}).`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: status as any } : u)));
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du statut.');
      setSaving(false);
      return false;
    }
  }, [clearStatus]);

  return {
    users: paginatedUsers,
    allUsers: filteredUsers,
    totalCount: filteredUsers.length,
    loading,
    saving,
    error,
    success,
    page,
    totalPages,
    search,
    filterRole,
    filterStatus,
    sortBy,
    sortOrder,
    selectedUser,
    refresh: refreshUsers,
    clearStatus,
    setSearch,
    setFilterRole,
    setFilterStatus,
    setSortBy,
    setSortOrder,
    setPage,
    setSelectedUser,
    createUser,
    updateUserRole,
    updateUserStatus,
    archiveUser,
    isLastAdmin: isLastActiveAdmin,
  };
}
