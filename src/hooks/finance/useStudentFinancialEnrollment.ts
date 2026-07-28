import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StudentFinancialEnrollment,
  FinancialEnrollmentInput,
  studentFinancialEnrollmentService,
} from '../../services/finance';

/**
 * Hook React pour la gestion de l'inscription financière des élèves
 */
export function useStudentFinancialEnrollment(academicYearId: string = 'ay-2026') {
  const [enrollments, setEnrollments] = useState<StudentFinancialEnrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId);
      setEnrollments(list);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des dossiers financiers');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Statut financier global
  const summaryStatus = useMemo(() => {
    const totalEnrollmentsCount = enrollments.length;
    const totalNetRevenue = enrollments.reduce((sum, e) => sum + e.netTotalDue, 0);
    const totalPaidRevenue = enrollments.reduce((sum, e) => sum + e.totalPaid, 0);
    const totalRemainingRevenue = enrollments.reduce((sum, e) => sum + e.remainingBalance, 0);

    return {
      totalEnrollmentsCount,
      totalNetRevenue,
      totalPaidRevenue,
      totalRemainingRevenue,
    };
  }, [enrollments]);

  // Création du dossier financier d'un élève
  const createEnrollment = useCallback(
    async (input: FinancialEnrollmentInput) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await studentFinancialEnrollmentService.createEnrollment({ ...input, academicYearId });
        if (res.success) {
          await fetchEnrollments();
          return res.data || true;
        } else {
          setError(res.error || 'Erreur lors de la création du dossier financier');
          return null;
        }
      } finally {
        setSubmitting(false);
      }
    },
    [academicYearId, fetchEnrollments]
  );

  // Modification d'un dossier financier
  const updateEnrollment = useCallback(
    async (id: string, input: Partial<FinancialEnrollmentInput>) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await studentFinancialEnrollmentService.updateEnrollment(id, input);
        if (res.success) {
          await fetchEnrollments();
          return true;
        } else {
          setError(res.error || 'Erreur lors de la mise à jour');
          return false;
        }
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEnrollments]
  );

  // Archivage d'un dossier financier
  const archiveEnrollment = useCallback(
    async (id: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await studentFinancialEnrollmentService.archiveEnrollment(id);
        if (res.success) {
          await fetchEnrollments();
          return true;
        } else {
          setError(res.error || 'Erreur lors de l’archivage');
          return false;
        }
      } finally {
        setSubmitting(false);
      }
    },
    [fetchEnrollments]
  );

  return {
    enrollments,
    loading,
    error,
    submitting,
    summaryStatus,
    refresh: fetchEnrollments,
    createEnrollment,
    updateEnrollment,
    archiveEnrollment,
  };
}
