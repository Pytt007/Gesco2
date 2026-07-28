// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAcademicYear (src/hooks/academic/useAcademicYear.ts)
// Chargement et gestion d'une année scolaire individuelle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  archiveAcademicYear,
  AcademicYear,
} from '../../services/academic/academicYearsService';

export function useAcademicYear(yearId?: string) {
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchYear = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAcademicYear(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Année scolaire introuvable.');
        setAcademicYear(null);
      } else {
        setAcademicYear(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'année scolaire.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (yearId) {
      fetchYear(yearId);
    }
  }, [yearId, fetchYear]);

  const update = useCallback(
    async (updates: Partial<AcademicYear>): Promise<boolean> => {
      if (!yearId) return false;
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateAcademicYear(yearId, updates);
        if (!res.success || !res.data) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setAcademicYear(res.data);
        setSuccess('Année scolaire mise à jour avec succès.');
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [yearId]
  );

  const activate = useCallback(async (): Promise<boolean> => {
    if (!yearId) return false;
    setSaving(true);
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await activateAcademicYear(yearId);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur d\'activation.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
      setAcademicYear(res.data);
      setSuccess('Année scolaire activée.');
      setSaving(false);
      setIsUpdating(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation.');
      setSaving(false);
      setIsUpdating(false);
      return false;
    }
  }, [yearId]);

  const archive = useCallback(async (): Promise<boolean> => {
    if (!yearId) return false;
    setSaving(true);
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveAcademicYear(yearId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
      setSuccess('Année scolaire archivée.');
      await fetchYear(yearId);
      setSaving(false);
      setIsDeleting(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur d\'archivage.');
      setSaving(false);
      setIsDeleting(false);
      return false;
    }
  }, [yearId, fetchYear]);

  return {
    academicYear,
    loading,
    saving,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: () => yearId && fetchYear(yearId),
    update,
    activate,
    archive,
  };
}
