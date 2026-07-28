/**
 * GESCO — Hook Custom Emploi du Temps
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ScheduleSlotRecord,
  ScheduleSlotInput,
  TimetableDisplayMode,
  ClassItem,
  TeacherItem,
  SubjectItem,
} from '../../services/timetable/types';
import { timetableService } from '../../services/timetable/timetableService';
import { useToast } from '../../context/ToastContext';

export function useTimetable(academicYearId: string = 'ay-2026') {
  const [displayMode, setDisplayMode] = useState<TimetableDisplayMode>('BY_CLASS');
  
  const classes = timetableService.getClasses();
  const teachers = timetableService.getTeachers();
  const subjects = timetableService.getSubjects();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');

  const [slots, setSlots] = useState<ScheduleSlotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (displayMode === 'BY_CLASS') {
        if (!selectedClassId) { setSlots([]); return; }
        const data = await timetableService.getScheduleByClass(selectedClassId, academicYearId);
        setSlots(data);
      } else {
        if (!selectedTeacherId) { setSlots([]); return; }
        const data = await timetableService.getScheduleByTeacher(selectedTeacherId, academicYearId);
        setSlots(data);
      }
    } catch {
      setError('Erreur lors du chargement de l\'emploi du temps.');
    } finally {
      setLoading(false);
    }
  }, [displayMode, selectedClassId, selectedTeacherId, academicYearId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const addSlot = useCallback(async (input: ScheduleSlotInput) => {
    const res = await timetableService.addSlot({ ...input, academicYearId });
    if (res.success) {
      showToast(res.message || 'Cours ajouté.', 'success');
      await fetchSlots();
    } else {
      showToast(res.error || 'Erreur lors de l\'ajout.', 'error');
    }
    return res;
  }, [academicYearId, fetchSlots, showToast]);

  const updateSlot = useCallback(async (id: string, input: ScheduleSlotInput) => {
    const res = await timetableService.updateSlot(id, { ...input, academicYearId });
    if (res.success) {
      showToast(res.message || 'Cours mis à jour.', 'success');
      await fetchSlots();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [academicYearId, fetchSlots, showToast]);

  const deleteSlot = useCallback(async (id: string) => {
    const res = await timetableService.deleteSlot(id);
    if (res.success) {
      showToast('Cours supprimé.', 'success');
      await fetchSlots();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [fetchSlots, showToast]);

  const copySchedule = useCallback(async (sourceClassId: string, targetClassId: string) => {
    const res = await timetableService.copyClassSchedule(sourceClassId, targetClassId, academicYearId);
    if (res.success) {
      showToast(res.message || 'Planning copié.', 'success');
      await fetchSlots();
    } else {
      showToast(res.error || 'Erreur lors de la copie.', 'error');
    }
    return res;
  }, [academicYearId, fetchSlots, showToast]);

  return {
    displayMode,
    setDisplayMode,
    classes,
    teachers,
    subjects,
    selectedClassId,
    setSelectedClassId,
    selectedTeacherId,
    setSelectedTeacherId,
    slots,
    loading,
    error,
    reload: fetchSlots,
    addSlot,
    updateSlot,
    deleteSlot,
    copySchedule,
  };
}
