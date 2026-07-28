import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StudentFinancialEnrollment,
  FinancialKPIs,
  FinancialTrackingFilter,
  FinancialAlertItem,
  financialTrackingService,
  studentFinancialEnrollmentService,
  tuitionPaymentService,
} from '../../services/finance';
import { pdfRenderer } from '../../services/documents/pdfRenderer';

/**
 * Hook React pour le Tableau de Suivi Financier des Élèves
 */
export function useFinancialTracking(academicYearId: string = 'ay-2026') {
  const [enrollments, setEnrollments] = useState<StudentFinancialEnrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // État des filtres
  const [filters, setFilters] = useState<FinancialTrackingFilter>({
    search: '',
    classroomId: '',
    levelCode: 'ALL',
    status: 'ALL',
    academicYearId,
  });

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId);
      setEnrollments(list);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du suivi financier.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Liste filtrée réactive
  const filteredEnrollments = useMemo(() => {
    return financialTrackingService.filterEnrollments(enrollments, filters);
  }, [enrollments, filters]);

  // KPIs réactifs calculés sur la sélection filtrée
  const kpis: FinancialKPIs = useMemo(() => {
    return financialTrackingService.calculateKPIs(filteredEnrollments);
  }, [filteredEnrollments]);

  // Alertes financières (échéances dépassées, montants élevés)
  const alerts: FinancialAlertItem[] = useMemo(() => {
    return financialTrackingService.detectAlerts(enrollments);
  }, [enrollments]);

  // Mise à jour des filtres
  const updateFilter = useCallback((key: keyof FinancialTrackingFilter, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      classroomId: '',
      levelCode: 'ALL',
      status: 'ALL',
      academicYearId,
    });
  }, [academicYearId]);

  // Exportation CSV / Excel
  const exportExcel = useCallback(() => {
    financialTrackingService.exportToCSV(filteredEnrollments, `Suivi_Financier_${academicYearId}.csv`);
  }, [filteredEnrollments, academicYearId]);

  // Génération et impression du relevé individuel
  const printStatement = useCallback(async (enrollment: StudentFinancialEnrollment) => {
    const payments = await tuitionPaymentService.getPaymentsByEnrollment(enrollment.id);
    const html = financialTrackingService.generateFinancialStatementHtml(enrollment, payments);
    pdfRenderer.printHtml(html);
  }, []);

  // Téléchargement du relevé individuel en PDF
  const downloadStatementPDF = useCallback(async (enrollment: StudentFinancialEnrollment) => {
    const payments = await tuitionPaymentService.getPaymentsByEnrollment(enrollment.id);
    const html = financialTrackingService.generateFinancialStatementHtml(enrollment, payments);
    pdfRenderer.downloadPdf(html, `Releve_Financier_${enrollment.matricule}.pdf`);
  }, []);

  return {
    enrollments,
    filteredEnrollments,
    kpis,
    alerts,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    refresh: fetchEnrollments,
    exportExcel,
    printStatement,
    downloadStatementPDF,
  };
}
