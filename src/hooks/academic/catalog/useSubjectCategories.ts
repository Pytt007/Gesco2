// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook React Catégories de Matières (src/hooks/academic/catalog/useSubjectCategories.ts)
// Interface réactive pour les catégories et domaines du catalogue pédagogique
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  SubjectCategory,
  getCategories,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  archiveCategory as archiveCategoryService,
  restoreCategory as restoreCategoryService,
} from '../../../services/academic/catalog';

export interface UseSubjectCategoriesReturn {
  categories: SubjectCategory[];
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  success: string | null;
  refresh: () => Promise<void>;
  createCategory: (data: Partial<SubjectCategory>) => Promise<boolean>;
  updateCategory: (id: string, updates: Partial<SubjectCategory>) => Promise<boolean>;
  archiveCategory: (id: string) => Promise<boolean>;
  restoreCategory: (id: string) => Promise<boolean>;
}

/**
 * Hook personnalisé réactif pour la gestion des catégories de matières
 */
export function useSubjectCategories(): UseSubjectCategoriesReturn {
  const [categories, setCategories] = useState<SubjectCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setError(res.error || 'Impossible de charger les catégories.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des catégories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = useCallback(async (data: Partial<SubjectCategory>): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createCategoryService(data);
      if (res.success && res.data) {
        setSuccess(res.message || 'Catégorie créée avec succès.');
        await fetchCategories();
        return true;
      } else {
        setError(res.error || 'Erreur lors de la création de la catégorie.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création de la catégorie.');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [fetchCategories]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<SubjectCategory>): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateCategoryService(id, updates);
      if (res.success && res.data) {
        setSuccess(res.message || 'Catégorie mise à jour avec succès.');
        await fetchCategories();
        return true;
      } else {
        setError(res.error || 'Erreur lors de la mise à jour de la catégorie.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de mise à jour.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchCategories]);

  const handleArchive = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveCategoryService(id);
      if (res.success) {
        setSuccess(res.message || 'Catégorie désactivée.');
        await fetchCategories();
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
  }, [fetchCategories]);

  const handleRestore = useCallback(async (id: string): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreCategoryService(id);
      if (res.success) {
        setSuccess(res.message || 'Catégorie restaurée avec succès.');
        await fetchCategories();
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
  }, [fetchCategories]);

  return {
    categories,
    loading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchCategories,
    createCategory: handleCreate,
    updateCategory: handleUpdate,
    archiveCategory: handleArchive,
    restoreCategory: handleRestore,
  };
}
