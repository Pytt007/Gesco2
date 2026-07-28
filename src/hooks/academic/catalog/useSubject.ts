// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook React Détails Matière (src/hooks/academic/catalog/useSubject.ts)
// Interface réactive pour la consultation et mise à jour d'une matière unique
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  Subject,
  getSubject as getSubjectService,
  updateSubject as updateSubjectService,
  archiveSubject as archiveSubjectService,
  restoreSubject as restoreSubjectService,
} from '../../../services/academic/catalog';

export interface UseSubjectReturn {
  subject: Subject | null;
  loading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  success: string | null;
  refresh: () => Promise<void>;
  updateSubject: (updates: Partial<Subject>) => Promise<boolean>;
  archiveSubject: () => Promise<boolean>;
  restoreSubject: () => Promise<boolean>;
}

/**
 * Hook personnalisé réactif pour la consultation et modification d'une matière spécifique
 * @param subjectId Identifiant de la matière
 */
export function useSubject(subjectId: string | null): UseSubjectReturn {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(subjectId));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSubject = useCallback(async () => {
    if (!subjectId) {
      setSubject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getSubjectService(subjectId);
      if (res.success && res.data) {
        setSubject(res.data);
      } else {
        setError(res.error || `Impossible de charger la matière ${subjectId}.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  const handleUpdate = useCallback(async (updates: Partial<Subject>): Promise<boolean> => {
    if (!subjectId) return false;
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateSubjectService(subjectId, updates);
      if (res.success && res.data) {
        setSuccess(res.message || 'Matière mise à jour avec succès.');
        setSubject(res.data);
        return true;
      } else {
        setError(res.error || 'Erreur lors de la mise à jour de la matière.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de mise à jour.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [subjectId]);

  const handleArchive = useCallback(async (): Promise<boolean> => {
    if (!subjectId) return false;
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveSubjectService(subjectId);
      if (res.success) {
        setSuccess(res.message || 'Matière archivée.');
        await fetchSubject();
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
  }, [subjectId, fetchSubject]);

  const handleRestore = useCallback(async (): Promise<boolean> => {
    if (!subjectId) return false;
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreSubjectService(subjectId);
      if (res.success) {
        setSuccess(res.message || 'Matière restaurée.');
        await fetchSubject();
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
  }, [subjectId, fetchSubject]);

  return {
    subject,
    loading,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchSubject,
    updateSubject: handleUpdate,
    archiveSubject: handleArchive,
    restoreSubject: handleRestore,
  };
}
