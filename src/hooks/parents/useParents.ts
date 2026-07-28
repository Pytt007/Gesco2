// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useParents (src/hooks/parents/useParents.ts)
// Gestion de la liste des responsables légaux, recherche, pagination et filtres
// Ne contient AUCUN appel Supabase/SQL direct (appelle exclusivement parentsService)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listParents,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
  Parent,
  ParentFilters,
} from '../../services/parents/parentsService';

export interface UseParentsOptions {
  pageSize?: number;
  initialStatus?: 'Actif' | 'Inactif' | 'Archivé' | 'all';
}

export function useParents(options: UseParentsOptions = {}) {
  const { pageSize = 20, initialStatus = 'Actif' } = options;

  const [parents, setParents] = useState<Parent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'Actif' | 'Inactif' | 'Archivé' | 'all'>(initialStatus);
  const [sortBy, setSortBy] = useState<'name' | 'firstName' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchParentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ParentFilters = {
        page,
        pageSize,
        searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
      };

      const res = await listParents(filters);

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors de la récupération des responsables légaux.');
      } else {
        setParents(res.data.parents);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des responsables.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchParentsList();
  }, [fetchParentsList]);

  const create = useCallback(
    async (parentData: Partial<Parent>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createParent(parentData);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la création du responsable.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Responsable légal créé avec succès.');
        await fetchParentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création.');
        setSaving(false);
        return false;
      }
    },
    [fetchParentsList]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Parent>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateParent(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Fiche responsable mise à jour.');
        await fetchParentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [fetchParentsList]
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveParent(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'archivage.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Responsable légal archivé.');
        await fetchParentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
    },
    [fetchParentsList]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await restoreParent(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la restauration.');
          setSaving(false);
          return false;
        }
        setSuccess(res.message || 'Responsable légal réactivé.');
        await fetchParentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la restauration.');
        setSaving(false);
        return false;
      }
    },
    [fetchParentsList]
  );

  return {
    parents,
    totalCount,
    page,
    totalPages,
    loading,
    saving,
    error,
    success,
    searchQuery,
    statusFilter,
    sortBy,
    sortOrder,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    setSortOrder,
    setPage,
    refresh: fetchParentsList,
    create,
    update,
    archive,
    restore,
  };
}
