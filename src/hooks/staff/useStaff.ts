// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaff (src/hooks/staff/useStaff.ts)
// Gestion de la liste des membres du personnel, recherche, pagination et filtres
// Ne contient AUCUN appel Supabase/SQL direct (appelle exclusivement staffService)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listStaff,
  createStaff,
  updateStaff,
  archiveStaff,
  restoreStaff,
  deleteStaff,
  StaffMember,
  StaffFilters,
  StaffStatus,
} from '../../services/staff/staffService';

export interface UseStaffOptions {
  pageSize?: number;
  initialStatus?: StaffStatus | 'all';
}

export function useStaff(options: UseStaffOptions = {}) {
  const { pageSize = 20, initialStatus = 'Actif' } = options;

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>(initialStatus);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'lastName' | 'firstName' | 'employeeNumber' | 'hireDate'>('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: StaffFilters = {
        page,
        pageSize,
        searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
      };

      const res = await listStaff(filters);

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors de la récupération des membres du personnel.');
      } else {
        setStaffMembers(res.data.staffMembers);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la liste du personnel.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const create = useCallback(
    async (staffData: Partial<StaffMember>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createStaff(staffData);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la création de la fiche employé.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Membre du personnel créé avec succès.');
        await fetchStaffList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création.');
        setSaving(false);
        return false;
      }
    },
    [fetchStaffList]
  );

  const update = useCallback(
    async (id: string, updates: Partial<StaffMember>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateStaff(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Fiche employé mise à jour.');
        await fetchStaffList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [fetchStaffList]
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveStaff(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'archivage.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Membre du personnel archivé.');
        await fetchStaffList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
    },
    [fetchStaffList]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await restoreStaff(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la restauration.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Membre du personnel réactivé.');
        await fetchStaffList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la restauration.');
        setSaving(false);
        return false;
      }
    },
    [fetchStaffList]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await deleteStaff(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la suppression.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Membre du personnel supprimé.');
        await fetchStaffList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression.');
        setSaving(false);
        return false;
      }
    },
    [fetchStaffList]
  );

  return {
    staffMembers: staffMembers || [],
    staff: staffMembers || [],
    totalCount: totalCount || 0,
    page,
    totalPages,
    loading,
    saving,
    error,
    success,
    searchQuery,
    statusFilter,
    roleFilter,
    sortBy,
    sortOrder,
    setSearchQuery,
    setStatusFilter,
    setRoleFilter,
    setSortBy,
    setSortOrder,
    setPage,
    refresh: fetchStaffList,
    create,
    update,
    archive,
    restore,
    deleteStaff: remove,
    remove,
  };
}
