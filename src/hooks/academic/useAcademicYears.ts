// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAcademicYears (src/hooks/academic/useAcademicYears.ts)
// Gestion de la liste des années scolaires, activation et année courante
// Ne contient aucun appel Supabase/SQL direct (appelle academicYearsService)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear as activateAcademicYearService,
  archiveAcademicYear as archiveAcademicYearService,
  AcademicYear,
} from '../../services/academic/academicYearsService';

export function useAcademicYears() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchYearsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, currentRes] = await Promise.all([
        getAcademicYears(),
        getCurrentAcademicYear(),
      ]);

      if (listRes.success && listRes.data) {
        setAcademicYears(listRes.data);
      } else if (!listRes.success) {
        setError(listRes.error || 'Erreur de chargement des années scolaires.');
      }

      if (currentRes.success) {
        setCurrentAcademicYear(currentRes.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des années scolaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYearsData();
  }, [fetchYearsData]);

  const create = useCallback(
    async (yearData: Partial<AcademicYear>): Promise<boolean> => {
      setSaving(true);
      setIsCreating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createAcademicYear(yearData);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la création.');
          setSaving(false);
          setIsCreating(false);
          return false;
        }
        setSuccess('Année scolaire créée avec succès.');
        await fetchYearsData();
        setSaving(false);
        setIsCreating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de création.');
        setSaving(false);
        setIsCreating(false);
        return false;
      }
    },
    [fetchYearsData]
  );

  const update = useCallback(
    async (id: string, updates: Partial<AcademicYear>): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateAcademicYear(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Année scolaire mise à jour.');
        await fetchYearsData();
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
    [fetchYearsData]
  );

  const activate = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await activateAcademicYearService(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'activation.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Année scolaire activée comme année courante.');
        await fetchYearsData();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'activation.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchYearsData]
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsDeleting(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveAcademicYearService(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'archivage.');
          setSaving(false);
          setIsDeleting(false);
          return false;
        }
        setSuccess('Année scolaire clôturée / archivée.');
        await fetchYearsData();
        setSaving(false);
        setIsDeleting(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur d\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
    },
    [fetchYearsData]
  );

  return {
    academicYears,
    currentAcademicYear,
    loading,
    saving,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchYearsData,
    create,
    update,
    activate,
    archive,
  };
}
