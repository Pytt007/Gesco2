// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentAssignment (src/hooks/academic/useStudentAssignment.ts)
// Consultation et gestion de l'affectation active d'un élève individuel
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getStudentAssignment,
  transferStudent,
  archiveAssignment,
  restoreAssignment,
  StudentAssignment,
} from '../../services/academic/studentAssignmentsService';

export function useStudentAssignment(studentId?: string, academicYearId?: string) {
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchActiveAssignment = useCallback(async (stdId: string, yrId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentAssignment(stdId, yrId);
      if (res.success) {
        setAssignment(res.data || null);
      } else {
        setError(res.error || 'Erreur de recherche d\'affectation.');
        setAssignment(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement de l\'affectation.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId && academicYearId) {
      fetchActiveAssignment(studentId, academicYearId);
    }
  }, [studentId, academicYearId, fetchActiveAssignment]);

  const transfer = useCallback(
    async (newClassroomId: string, date?: string): Promise<boolean> => {
      if (!studentId || !academicYearId) return false;
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await transferStudent(studentId, newClassroomId, academicYearId, date);
        if (!res.success || !res.data) {
          setError(res.error || 'Erreur lors du transfert.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setAssignment(res.data);
        setSuccess('Élève transféré vers la nouvelle classe.');
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
    [studentId, academicYearId]
  );

  const archive = useCallback(async (): Promise<boolean> => {
    if (!assignment?.id) return false;
    setSaving(true);
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveAssignment(assignment.id);
      if (!res.success) {
        setError(res.error || 'Erreur d\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
      setSuccess('Affectation archivée.');
      if (studentId && academicYearId) await fetchActiveAssignment(studentId, academicYearId);
      setSaving(false);
      setIsDeleting(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur d\'archivage.');
      setSaving(false);
      setIsDeleting(false);
      return false;
    }
  }, [assignment, studentId, academicYearId, fetchActiveAssignment]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!assignment?.id) return false;
    setSaving(true);
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreAssignment(assignment.id);
      if (!res.success) {
        setError(res.error || 'Erreur de restauration.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
      setSuccess('Affectation restaurée.');
      if (studentId && academicYearId) await fetchActiveAssignment(studentId, academicYearId);
      setSaving(false);
      setIsUpdating(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de restauration.');
      setSaving(false);
      setIsUpdating(false);
      return false;
    }
  }, [assignment, studentId, academicYearId, fetchActiveAssignment]);

  return {
    assignment,
    loading,
    saving,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: () => studentId && academicYearId && fetchActiveAssignment(studentId, academicYearId),
    transfer,
    archive,
    restore,
  };
}
