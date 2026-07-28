// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentEnrollment
// Inscription courante et historique des inscriptions d'un élève
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentEnrollment,
  getEnrollmentHistory,
  createEnrollment,
  updateEnrollment,
  EnrollmentData,
} from '../../services/students/studentsService';

export function useStudentEnrollment(studentId?: string, schoolYearId: string = '2026-2027') {
  const [currentEnrollment, setCurrentEnrollment] = useState<EnrollmentData | null>(null);
  const [history, setHistory] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollmentInfo = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, historyRes] = await Promise.all([
        getCurrentEnrollment(id, schoolYearId),
        getEnrollmentHistory(id),
      ]);

      if (currentRes.success && currentRes.data) {
        setCurrentEnrollment(currentRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur d\'inscription.');
    } finally {
      setLoading(false);
    }
  }, [schoolYearId]);

  useEffect(() => {
    if (studentId) {
      fetchEnrollmentInfo(studentId);
    }
  }, [studentId, fetchEnrollmentInfo]);

  const create = useCallback(async (data: EnrollmentData): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await createEnrollment(data);
      if (!res.success) {
        setError(res.error || 'Impossible de créer l\'inscription.');
        setSaving(false);
        return false;
      }
      if (studentId) await fetchEnrollmentInfo(studentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription.');
      setSaving(false);
      return false;
    }
  }, [studentId, fetchEnrollmentInfo]);

  const update = useCallback(async (enrollmentId: string, updates: Partial<EnrollmentData>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateEnrollment(enrollmentId, updates);
      if (!res.success) {
        setError(res.error || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
      if (studentId) await fetchEnrollmentInfo(studentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de mise à jour.');
      setSaving(false);
      return false;
    }
  }, [studentId, fetchEnrollmentInfo]);

  return {
    currentEnrollment,
    history,
    loading,
    saving,
    error,
    refresh: () => studentId && fetchEnrollmentInfo(studentId),
    create,
    update,
  };
}
