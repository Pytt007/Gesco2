import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StudentFinancialEnrollment,
  TuitionPaymentRecord,
  RecordPaymentInput,
  ReceiptData,
  tuitionPaymentService,
  studentFinancialEnrollmentService,
} from '../../services/finance';
import { pdfRenderer } from '../../services/documents/pdfRenderer';

/**
 * Hook React pour la saisie et l'enregistrement rapide des règlements de scolarité (< 30 sec)
 */
export function useTuitionPayment(academicYearId: string = 'ay-2026') {
  const [enrollments, setEnrollments] = useState<StudentFinancialEnrollment[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<TuitionPaymentRecord[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<boolean>(false);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId);
      setEnrollments(list);
      if (list.length > 0 && !selectedEnrollmentId) {
        setSelectedEnrollmentId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des dossiers financiers.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId, selectedEnrollmentId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Dossier financier de l'élève actuellement sélectionné
  const selectedEnrollment = useMemo(() => {
    return enrollments.find((e) => e.id === selectedEnrollmentId) || enrollments[0] || null;
  }, [enrollments, selectedEnrollmentId]);

  // Chargement de l'historique des versements pour le dossier sélectionné
  const fetchPaymentsHistory = useCallback(async () => {
    if (!selectedEnrollmentId) return;
    try {
      const history = await tuitionPaymentService.getPaymentsByEnrollment(selectedEnrollmentId);
      setPaymentsHistory(history);
    } catch {
      // Fallback
    }
  }, [selectedEnrollmentId]);

  useEffect(() => {
    fetchPaymentsHistory();
  }, [fetchPaymentsHistory]);

  // Enregistrement d'un nouveau versement
  const recordPayment = useCallback(
    async (input: RecordPaymentInput) => {
      setRecording(true);
      setError(null);
      try {
        const res = await tuitionPaymentService.recordPayment(input);
        if (res.success && res.data) {
          setActiveReceipt(res.data.receipt);
          await fetchEnrollments();
          await fetchPaymentsHistory();
          return res.data;
        } else {
          setError(res.error || 'Erreur lors de l’enregistrement du versement.');
          return null;
        }
      } finally {
        setRecording(false);
      }
    },
    [fetchEnrollments, fetchPaymentsHistory]
  );

  // Annulation d'un versement avec traçabilité d'audit
  const cancelPayment = useCallback(
    async (paymentId: string, reason: string, cancelledBy: string = 'Direction') => {
      setRecording(true);
      setError(null);
      try {
        const res = await tuitionPaymentService.cancelPayment(paymentId, cancelledBy, reason);
        if (res.success) {
          await fetchEnrollments();
          await fetchPaymentsHistory();
          return true;
        } else {
          setError(res.error || 'Erreur lors de l’annulation du versement.');
          return false;
        }
      } finally {
        setRecording(false);
      }
    },
    [fetchEnrollments, fetchPaymentsHistory]
  );

  // Impression directe du reçu de paiement
  const printReceipt = useCallback((receiptHtml: string) => {
    pdfRenderer.printDocument(receiptHtml);
  }, []);

  // Téléchargement PDF du reçu
  const downloadReceiptPDF = useCallback(async (receiptHtml: string, receiptNo: string) => {
    await pdfRenderer.downloadPdf(receiptHtml, `Recu_${receiptNo}.pdf`);
  }, []);

  return {
    enrollments,
    selectedEnrollment,
    paymentsHistory,
    activeReceipt,
    loading,
    error,
    recording,
    setSelectedEnrollmentId,
    setActiveReceipt,
    refresh: fetchEnrollments,
    recordPayment,
    cancelPayment,
    printReceipt,
    downloadReceiptPDF,
  };
}
