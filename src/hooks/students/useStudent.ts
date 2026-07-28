// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudent
// Chargement et mise à jour de la fiche individuelle d'un élève
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getStudentById, updateStudent } from '../../services/students/studentsService';
import { Student } from '../../types';

export function useStudent(studentId?: string) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStudent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentById(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Élève introuvable.');
      } else {
        setStudent(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération de la fiche élève.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchStudent(studentId);
    }
  }, [studentId, fetchStudent]);

  const update = useCallback(async (updates: Partial<Student>): Promise<boolean> => {
    if (!studentId) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateStudent(studentId, updates);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
      setStudent(res.data);
      setSuccess('Fiche élève mise à jour.');
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de mise à jour.');
      setSaving(false);
      return false;
    }
  }, [studentId]);

  return {
    student,
    loading,
    saving,
    error,
    success,
    refresh: () => studentId && fetchStudent(studentId),
    update,
  };
}
