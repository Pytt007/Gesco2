// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook React Catalogue des Matières (src/hooks/academic/catalog/useSubjects.ts)
// Interface réactive pour la recherche, pagination, filtres et CRUD des matières
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  Subject,
  SubjectFilters,
  searchSubjects,
  createSubject as createSubjectService,
  updateSubject as updateSubjectService,
  archiveSubject as archiveSubjectService,
  restoreSubject as restoreSubjectService,
} from '../../../services/academic/catalog';

export interface UseSubjectsReturn {
  subjects: Subject[];
  totalCount: number;
  page: number;
  totalPages: number;
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  success: string | null;
  filters: SubjectFilters;
  setFilters: (filters: Partial<SubjectFilters>) => void;
  setPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  createSubject: (data: Partial<Subject>) => Promise<boolean>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<boolean>;
  archiveSubject: (id: string) => Promise<boolean>;
  restoreSubject: (id: string) => Promise<boolean>;
}

/**
 * Hook personnalisé réactif pour la recherche et la gestion des matières du catalogue
 * @param initialFilters Filtres initiaux optionnels
 */
export function useSubjects(initialFilters: SubjectFilters = {}): UseSubjectsReturn {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPageState] = useState<number>(initialFilters.page || 1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filters, setFiltersState] = useState<SubjectFilters>({
    page: 1,
    pageSize: 20,
    isActive: true,
    ...initialFilters,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchSubjects({ ...filters, page });
      if (res.success && res.data) {
        setSubjects(res.data.subjects);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.error || 'Impossible de charger les matières.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des matières.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const setFilters = useCallback((newFilters: Partial<SubjectFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters, page: 1 }));
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
    setFiltersState((prev) => ({ ...prev, page: newPage }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters({ searchQuery });
  }, [setFilters]);

  const handleCreate = useCallback(async (data: Partial<Subject>): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createSubjectService(data);
      if (res.success && res.data) {
        setSuccess(res.message || 'Matière créée avec succès.');
        await fetchSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur lors de la création de la matière.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de création.');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [fetchSubjects]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<Subject>): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateSubjectService(id, updates);
      if (res.success && res.data) {
        setSuccess(res.message || 'Matière mise à jour avec succès.');
        await fetchSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur de mise à jour.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de mise à jour.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchSubjects]);

  const handleArchive = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveSubjectService(id);
      if (res.success) {
        setSuccess(res.message || 'Matière désactivée.');
        await fetchSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur d\'archivage.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur d\'archivage.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [fetchSubjects]);

  const handleRestore = useCallback(async (id: string): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreSubjectService(id);
      if (res.success) {
        setSuccess(res.message || 'Matière restaurée avec succès.');
        await fetchSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur de restauration.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de restauration.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchSubjects]);

  return {
    subjects,
    totalCount,
    page,
    totalPages,
    loading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    filters,
    setFilters,
    setPage,
    setSearchQuery,
    refresh: fetchSubjects,
    createSubject: handleCreate,
    updateSubject: handleUpdate,
    archiveSubject: handleArchive,
    restoreSubject: handleRestore,
  };
}
