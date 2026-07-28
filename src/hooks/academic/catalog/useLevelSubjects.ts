// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook React Matières par Niveau (src/hooks/academic/catalog/useLevelSubjects.ts)
// Interface réactive pour la gestion du programme de matières par niveau (PS à CM2)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  LevelSubject,
  assignSubjectToLevel as assignSubjectService,
  removeSubjectFromLevel as removeSubjectService,
  updateLevelSubjectOrder as updateOrderService,
  getSubjectsByLevel as getSubjectsByLevelService,
  getLevelsBySubject as getLevelsBySubjectService,
} from '../../../services/academic/catalog';

export interface UseLevelSubjectsReturn {
  levelSubjects: LevelSubject[];
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  success: string | null;
  refresh: () => Promise<void>;
  assignSubject: (subjectId: string, isRequired?: boolean, sortOrder?: number) => Promise<boolean>;
  removeSubject: (subjectId: string) => Promise<boolean>;
  updateOrder: (levelSubjectId: string, sortOrder: number) => Promise<boolean>;
  fetchSubjectsByLevel: (targetLevelId: string) => Promise<LevelSubject[]>;
  fetchLevelsBySubject: (targetSubjectId: string) => Promise<LevelSubject[]>;
}

/**
 * Hook personnalisé réactif pour la gestion des matières affectées aux niveaux scolaires
 * @param levelId Identifiant du niveau (ex: CP1)
 * @param subjectId Identifiant de la matière (ex: Mathématiques)
 */
export function useLevelSubjects(levelId?: string, subjectId?: string): UseLevelSubjectsReturn {
  const [levelSubjects, setLevelSubjects] = useState<LevelSubject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLevelSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (levelId) {
        const res = await getSubjectsByLevelService(levelId);
        if (res.success && res.data) {
          setLevelSubjects(res.data);
        } else {
          setError(res.error || 'Erreur lors du chargement des matières du niveau.');
        }
      } else if (subjectId) {
        const res = await getLevelsBySubjectService(subjectId);
        if (res.success && res.data) {
          setLevelSubjects(res.data);
        } else {
          setError(res.error || 'Erreur lors du chargement des niveaux pour cette matière.');
        }
      } else {
        setLevelSubjects([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [levelId, subjectId]);

  useEffect(() => {
    fetchLevelSubjects();
  }, [fetchLevelSubjects]);

  const handleAssignSubject = useCallback(async (
    targetSubjectId: string,
    isRequired: boolean = true,
    sortOrder: number = 1
  ): Promise<boolean> => {
    if (!levelId) {
      setError('Identifiant niveau scolaire requis pour l\'affectation.');
      return false;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await assignSubjectService(levelId, targetSubjectId, isRequired, sortOrder);
      if (res.success && res.data) {
        setSuccess(res.message || 'Matière affectée au niveau avec succès.');
        await fetchLevelSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur lors de l\'affectation de la matière.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur d\'affectation.');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [levelId, fetchLevelSubjects]);

  const handleRemoveSubject = useCallback(async (targetSubjectId: string): Promise<boolean> => {
    if (!levelId) {
      setError('Identifiant niveau scolaire requis.');
      return false;
    }

    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await removeSubjectService(levelId, targetSubjectId);
      if (res.success) {
        setSuccess(res.message || 'Matière retirée du niveau.');
        await fetchLevelSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur de retrait.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de retrait.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [levelId, fetchLevelSubjects]);

  const handleUpdateOrder = useCallback(async (levelSubjectId: string, sortOrder: number): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateOrderService(levelSubjectId, sortOrder);
      if (res.success) {
        setSuccess(res.message || 'Ordre mis à jour.');
        await fetchLevelSubjects();
        return true;
      } else {
        setError(res.error || 'Erreur de mise à jour de l\'ordre.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de mise à jour.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchLevelSubjects]);

  const fetchSubjectsByLevel = useCallback(async (targetLevelId: string): Promise<LevelSubject[]> => {
    const res = await getSubjectsByLevelService(targetLevelId);
    return res.data || [];
  }, []);

  const fetchLevelsBySubject = useCallback(async (targetSubjectId: string): Promise<LevelSubject[]> => {
    const res = await getLevelsBySubjectService(targetSubjectId);
    return res.data || [];
  }, []);

  return {
    levelSubjects,
    loading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchLevelSubjects,
    assignSubject: handleAssignSubject,
    removeSubject: handleRemoveSubject,
    updateOrder: handleUpdateOrder,
    fetchSubjectsByLevel,
    fetchLevelsBySubject,
  };
}
