// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentAssignments (src/hooks/academic/useStudentAssignments.ts)
// Affectation, transfert et recherche des affectations d'élèves
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getAssignments,
  getAssignmentsByClass,
  getAssignmentsByYear,
  assignStudent as assignStudentService,
  transferStudent as transferStudentService,
  archiveAssignment as archiveAssignmentService,
  restoreAssignment as restoreAssignmentService,
  StudentAssignment,
} from '../../services/academic/studentAssignmentsService';

export function useStudentAssignments(initialClassroomId?: string, initialAcademicYearId?: string) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [classroomIdFilter, setClassroomIdFilter] = useState<string | undefined>(initialClassroomId);
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState<string | undefined>(initialAcademicYearId);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAssignmentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (classroomIdFilter) {
        res = await getAssignmentsByClass(classroomIdFilter);
      } else if (academicYearIdFilter) {
        res = await getAssignmentsByYear(academicYearIdFilter);
      } else {
        res = await getAssignments();
      }

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors de la récupération des affectations.');
        setAssignments([]);
      } else {
        setAssignments(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des affectations.');
    } finally {
      setLoading(false);
    }
  }, [classroomIdFilter, academicYearIdFilter]);

  useEffect(() => {
    fetchAssignmentsList();
  }, [fetchAssignmentsList]);

  const assignStudent = useCallback(
    async (studentId: string, classroomId: string, academicYearId: string, date?: string): Promise<boolean> => {
      setSaving(true);
      setIsCreating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await assignStudentService(studentId, classroomId, academicYearId, date);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'affectation.');
          setSaving(false);
          setIsCreating(false);
          return false;
        }
        setSuccess('Élève affecté à la classe avec succès.');
        await fetchAssignmentsList();
        setSaving(false);
        setIsCreating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'affectation de l\'élève.');
        setSaving(false);
        setIsCreating(false);
        return false;
      }
    },
    [fetchAssignmentsList]
  );

  const transferStudent = useCallback(
    async (studentId: string, newClassroomId: string, academicYearId: string, date?: string): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await transferStudentService(studentId, newClassroomId, academicYearId, date);
        if (!res.success) {
          setError(res.error || 'Erreur lors du transfert.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Élève transféré vers la nouvelle classe.');
        await fetchAssignmentsList();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du transfert.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchAssignmentsList]
  );

  const archiveAssignment = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsDeleting(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveAssignmentService(id);
        if (!res.success) {
          setError(res.error || 'Erreur d\'archivage.');
          setSaving(false);
          setIsDeleting(false);
          return false;
        }
        setSuccess('Affectation archivée.');
        await fetchAssignmentsList();
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
    [fetchAssignmentsList]
  );

  const restoreAssignment = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await restoreAssignmentService(id);
        if (!res.success) {
          setError(res.error || 'Erreur de restauration.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Affectation restaurée.');
        await fetchAssignmentsList();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de restauration.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchAssignmentsList]
  );

  return {
    assignments,
    classroomIdFilter,
    academicYearIdFilter,
    loading,
    saving,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    setClassroomIdFilter,
    setAcademicYearIdFilter,
    refresh: fetchAssignmentsList,
    assignStudent,
    transferStudent,
    archiveAssignment,
    restoreAssignment,
  };
}
