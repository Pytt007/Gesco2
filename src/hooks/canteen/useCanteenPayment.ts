import { useState, useCallback } from 'react';
import { CanteenEnrollment, CanteenEnrollmentInput, CanteenReceiptData, RecordCanteenPaymentInput } from '../../services/canteen/types';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { canteenPaymentService } from '../../services/canteen/canteenPaymentService';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../useSettings';

export function useCanteenPayment(academicYearId: string = 'ay-2026') {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanteenEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CanteenEnrollment | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [receipt, setReceipt] = useState<CanteenReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { schoolInfo } = useSettings();

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await canteenEnrollmentService.search(query, academicYearId);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [academicYearId]);

  const handleSelectEnrollment = useCallback(async (enrollment: CanteenEnrollment) => {
    setSelectedEnrollment(enrollment);
    setSearchResults([]);
    setSearchQuery('');
    const history = await canteenPaymentService.getPaymentsByEnrollment(enrollment.id);
    setPaymentHistory(history);
  }, []);

  const handleOpenPaymentModal = useCallback(() => {
    setIsPaymentModalOpen(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setIsPaymentModalOpen(false);
  }, []);

  const handleSubmitPayment = useCallback(async (input: RecordCanteenPaymentInput) => {
    setIsSubmitting(true);
    try {
      const schoolSettings = {
        name: schoolInfo?.name,
        address: schoolInfo?.address,
        phone: schoolInfo?.phone,
        academicYear: '2026-2027',
      };
      const result = await canteenPaymentService.recordPayment(input, schoolSettings);
      if (result.success && result.data) {
        showToast('Paiement cantine enregistré avec succès.', 'success');
        setReceipt(result.data.receipt);
        setIsReceiptOpen(true);
        setIsPaymentModalOpen(false);

        // Rafraîchir l'inscription sélectionnée
        const updated = await canteenEnrollmentService.getEnrollmentByStudent(
          selectedEnrollment?.studentId || '',
          academicYearId
        );
        if (updated) {
          setSelectedEnrollment(updated);
        }
        const history = await canteenPaymentService.getPaymentsByEnrollment(input.enrollmentId);
        setPaymentHistory(history);
      } else {
        showToast(result.error || 'Erreur lors du paiement.', 'error');
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedEnrollment, academicYearId, schoolInfo, showToast]);

  const handleCloseReceipt = useCallback(() => {
    setIsReceiptOpen(false);
    setReceipt(null);
  }, []);

  const handleNewPayment = useCallback(() => {
    setSelectedEnrollment(null);
    setPaymentHistory([]);
    setReceipt(null);
    setIsReceiptOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    searchResults,
    selectedEnrollment,
    paymentHistory,
    receipt,
    isReceiptOpen,
    isPaymentModalOpen,
    isSearching,
    isSubmitting,
    handleSearch,
    handleSelectEnrollment,
    handleOpenPaymentModal,
    handleClosePaymentModal,
    handleSubmitPayment,
    handleCloseReceipt,
    handleNewPayment,
  };
}
