// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useRoles
// Gestion de la liste et de l'état des rôles système
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { updateAccountRole } from '../../services/auth/authService';
import { UserRole } from '../../types';
import { ROLE_LABELS, ROLE_MODULES } from '../../constants/permissions';

export interface RoleDetail {
  value: UserRole;
  label: string;
  modules: string[];
  isActive: boolean;
}

const INITIAL_ROLES: RoleDetail[] = [
  { value: 'ADMIN_GENERALE', label: ROLE_LABELS.ADMIN_GENERALE, modules: ROLE_MODULES.ADMIN_GENERALE, isActive: true },
  { value: 'FINANCE', label: ROLE_LABELS.FINANCE, modules: ROLE_MODULES.FINANCE, isActive: true },
  { value: 'SCOLAIRE_ENSEIGNANT', label: ROLE_LABELS.SCOLAIRE_ENSEIGNANT, modules: ROLE_MODULES.SCOLAIRE_ENSEIGNANT, isActive: true },
  { value: 'CANTINE_TRANSPORT', label: ROLE_LABELS.CANTINE_TRANSPORT, modules: ROLE_MODULES.CANTINE_TRANSPORT, isActive: true },
];

export function useRoles() {
  const [roles, setRoles] = useState<RoleDetail[]>(INITIAL_ROLES);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoles(INITIAL_ROLES);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des rôles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const toggleRoleStatus = useCallback(async (roleValue: UserRole, activeState: boolean): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      setRoles((prev) => prev.map((r) => (r.value === roleValue ? { ...r, isActive: activeState } : r)));
      setSuccess(`Statut du rôle ${roleValue} mis à jour.`);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du statut du rôle.');
      setSaving(false);
      return false;
    }
  }, []);

  const assignRoleToUser = useCallback(async (userId: string, role: UserRole): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateAccountRole(userId, role);
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return false;
      }
      setSuccess('Rôle attribué à l\'utilisateur avec succès.');
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'attribution du rôle.');
      setSaving(false);
      return false;
    }
  }, []);

  return {
    roles,
    loading,
    saving,
    error,
    success,
    selectedRole,
    setSelectedRole,
    refreshRoles: fetchRoles,
    toggleRoleStatus,
    assignRoleToUser,
  };
}
