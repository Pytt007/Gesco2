import { useState, useEffect, useCallback } from 'react';
import { CanteenFeeSchedule, CanteenFeeInput } from '../../services/canteen/types';
import { canteenFeesService } from '../../services/canteen/canteenFeesService';
import { useToast } from '../../context/ToastContext';

export function useCanteenFees(academicYearId: string = 'ay-2026') {
  const [schedules, setSchedules] = useState<CanteenFeeSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await canteenFeesService.getSchedulesByYear(academicYearId);
      setSchedules(data);
    } catch (e) {
      setError('Erreur lors du chargement des tarifs cantine.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = useCallback(async (input: CanteenFeeInput) => {
    const result = await canteenFeesService.createSchedule(input);
    if (result.success) {
      showToast(result.message || 'Tarif créé.', 'success');
      await fetchSchedules();
    } else {
      showToast(result.error || 'Erreur lors de la création.', 'error');
    }
    return result;
  }, [fetchSchedules, showToast]);

  const updateSchedule = useCallback(async (id: string, input: Partial<CanteenFeeInput>) => {
    const result = await canteenFeesService.updateSchedule(id, input);
    if (result.success) {
      showToast(result.message || 'Tarif mis à jour.', 'success');
      await fetchSchedules();
    } else {
      showToast(result.error || 'Erreur lors de la mise à jour.', 'error');
    }
    return result;
  }, [fetchSchedules, showToast]);

  const archiveSchedule = useCallback(async (id: string) => {
    const result = await canteenFeesService.archiveSchedule(id);
    if (result.success) {
      showToast(result.message || 'Tarif archivé.', 'success');
      await fetchSchedules();
    } else {
      showToast(result.error || 'Erreur lors de l\'archivage.', 'error');
    }
    return result;
  }, [fetchSchedules, showToast]);

  const duplicatePreviousYear = useCallback(async (sourceYearId: string, targetYearId: string) => {
    const result = await canteenFeesService.duplicatePreviousYearSchedules(sourceYearId, targetYearId);
    if (result.success) {
      showToast(result.message || 'Tarifs dupliqués.', 'success');
      await fetchSchedules();
    } else {
      showToast(result.error || 'Erreur lors de la duplication.', 'error');
    }
    return result;
  }, [fetchSchedules, showToast]);

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    archiveSchedule,
    duplicatePreviousYear,
  };
}
