import { useState, useEffect, useCallback, useMemo } from 'react';
import { TuitionFeeSchedule, TuitionFeeInput, tuitionFeesService } from '../../services/finance';

/**
 * Hook React pour la gestion et la configuration des frais de scolarité
 */
export function useTuitionFees(academicYearId: string = 'ay-2026') {
  const [schedules, setSchedules] = useState<TuitionFeeSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tuitionFeesService.getSchedulesByYear(academicYearId);
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des frais de scolarité');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Calcul du total cumulé de l'établissement pour la grille annuelle
  const grandTotals = useMemo(() => {
    const totalRegistration = schedules.reduce((sum, s) => sum + s.registrationFee, 0);
    const totalTuition = schedules.reduce((sum, s) => sum + s.tuitionFee, 0);
    const totalAnnual = schedules.reduce((sum, s) => sum + s.totalAnnualFee, 0);
    return {
      totalRegistration,
      totalTuition,
      totalAnnual,
    };
  }, [schedules]);

  // Création d'un tarif par niveau
  const createFeeSchedule = useCallback(
    async (input: TuitionFeeInput) => {
      setSaving(true);
      setError(null);
      try {
        const res = await tuitionFeesService.createSchedule({ ...input, academicYearId });
        if (res.success) {
          await fetchSchedules();
          return true;
        } else {
          setError(res.error || 'Erreur lors de la création');
          return false;
        }
      } finally {
        setSaving(false);
      }
    },
    [academicYearId, fetchSchedules]
  );

  // Modification d'un tarif existant
  const updateFeeSchedule = useCallback(
    async (id: string, input: Partial<TuitionFeeInput>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await tuitionFeesService.updateSchedule(id, input);
        if (res.success) {
          await fetchSchedules();
          return true;
        } else {
          setError(res.error || 'Erreur lors de la mise à jour');
          return false;
        }
      } finally {
        setSaving(false);
      }
    },
    [fetchSchedules]
  );

  // Archivage d'un tarif
  const archiveFeeSchedule = useCallback(
    async (id: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await tuitionFeesService.archiveSchedule(id);
        if (res.success) {
          await fetchSchedules();
          return true;
        } else {
          setError(res.error || 'Erreur lors de l’archivage');
          return false;
        }
      } finally {
        setSaving(false);
      }
    },
    [fetchSchedules]
  );

  // Duplication des tarifs de l'année précédente
  const duplicatePreviousYear = useCallback(
    async (sourceYearId: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await tuitionFeesService.duplicatePreviousYearSchedules(sourceYearId, academicYearId);
        if (res.success) {
          await fetchSchedules();
          return true;
        } else {
          setError(res.error || 'Erreur lors de la duplication des tarifs');
          return false;
        }
      } finally {
        setSaving(false);
      }
    },
    [academicYearId, fetchSchedules]
  );

  return {
    schedules,
    loading,
    error,
    saving,
    grandTotals,
    refresh: fetchSchedules,
    createFeeSchedule,
    updateFeeSchedule,
    archiveFeeSchedule,
    duplicatePreviousYear,
  };
}
