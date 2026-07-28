/**
 * GESCO — Hook Paiements Transport
 */

import { useState, useCallback } from 'react';
import {
  TransportEnrollment,
  TransportReceiptData,
  RecordTransportPaymentInput,
} from '../../services/transport/types';
import { transportEnrollmentService } from '../../services/transport/transportEnrollmentService';
import { transportPaymentService } from '../../services/transport/transportPaymentService';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../useSettings';

export function useTransportPayment(academicYearId: string = 'ay-2026') {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TransportEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<TransportEnrollment | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [receipt, setReceipt] = useState<TransportReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { schoolInfo } = useSettings();

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await transportEnrollmentService.search(query, academicYearId);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [academicYearId]);

  const handleSelectEnrollment = useCallback(async (enrollment: TransportEnrollment) => {
    setSelectedEnrollment(enrollment);
    setSearchResults([]);
    setSearchQuery('');
    const history = await transportPaymentService.getPaymentsByEnrollment(enrollment.id);
    setPaymentHistory(history);
  }, []);

  const handleSubmitPayment = useCallback(async (input: RecordTransportPaymentInput) => {
    setIsSubmitting(true);
    try {
      const schoolSettings = {
        name: schoolInfo?.name,
        address: schoolInfo?.address,
        phone: schoolInfo?.phone,
        academicYear: '2026-2027',
      };
      const result = await transportPaymentService.recordPayment(input, schoolSettings);
      if (result.success && result.data) {
        showToast('Paiement transport enregistré avec succès.', 'success');
        setReceipt(result.data.receipt);
        setIsReceiptOpen(true);
        setIsPaymentModalOpen(false);

        // Rafraîchir l'inscription
        const updated = await transportEnrollmentService.getEnrollmentByStudent(
          selectedEnrollment?.studentId || '',
          academicYearId
        );
        if (updated) setSelectedEnrollment(updated);
        const history = await transportPaymentService.getPaymentsByEnrollment(input.enrollmentId);
        setPaymentHistory(history);
      } else {
        showToast(result.error || 'Erreur lors du paiement.', 'error');
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedEnrollment, academicYearId, schoolInfo, showToast]);

  const handleNewPayment = useCallback(() => {
    setSelectedEnrollment(null);
    setPaymentHistory([]);
    setReceipt(null);
    setIsReceiptOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery, searchResults, selectedEnrollment, paymentHistory,
    receipt, isReceiptOpen, isPaymentModalOpen, isSearching, isSubmitting,
    handleSearch,
    handleSelectEnrollment,
    handleOpenPaymentModal: () => setIsPaymentModalOpen(true),
    handleClosePaymentModal: () => setIsPaymentModalOpen(false),
    handleSubmitPayment,
    handleCloseReceipt: () => { setIsReceiptOpen(false); setReceipt(null); },
    handleNewPayment,
  };
}
