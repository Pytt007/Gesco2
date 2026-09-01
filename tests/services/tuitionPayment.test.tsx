import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import {
  tuitionPaymentService,
  clearTuitionPaymentsStore,
} from '../../src/services/finance/tuitionPaymentService';
import {
  studentFinancialEnrollmentService,
  clearFinancialEnrollmentsStore,
} from '../../src/services/finance/studentFinancialEnrollmentService';
import { clearFeeSchedulesStore } from '../../src/services/finance/tuitionFeesService';
import { useTuitionPayment } from '../../src/hooks/finance/useTuitionPayment';
import { TuitionPaymentView } from '../../src/components/finance/TuitionPaymentView';
import { ToastProvider } from '../../src/context/ToastContext';
import { SchoolYearProvider } from '../../src/context/SchoolYearContext';
import { AllProviders } from '../testUtils';

describe('Tuition Fee Payment Module Layer (Paiement de la scolarité)', () => {
  beforeEach(() => {
    clearFeeSchedulesStore();
    clearFinancialEnrollmentsStore();
    clearTuitionPaymentsStore();
  });

  describe('Tuition Payment Service (tuitionPaymentService)', () => {
    it('records a tuition payment (< 30 sec), updates financial status and generates an official receipt with QR Code', async () => {
      // 1. Create a financial enrollment for student st-001 (CP1, net total: 360,000 FCFA)
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });
      const enrollment = enrollmentRes.data!;

      // 2. Record payment of 100,000 FCFA via Orange Money
      const payRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollment.id,
        amount: 100000,
        paymentDate: '2026-07-28',
        paymentMode: 'ORANGE_MONEY',
        referenceNumber: 'OM-99887766',
        remarks: 'Paiement Échéance 1 & 2',
        recordedBy: 'Caissier Principal',
      });

      expect(payRes.success).toBe(true);
      expect(payRes.data).toBeDefined();

      const { payment, receipt } = payRes.data!;
      expect(payment.amount).toBe(100000);
      expect(payment.paymentMode).toBe('ORANGE_MONEY');
      expect(payment.status).toBe('VALIDATED');
      expect(receipt.receiptNumber).toContain('REC-2026');
      expect(receipt.academicYear).toBe('ay-2026');
      expect(receipt.htmlContent).toContain('ay-2026');
      expect(receipt.checksum).toContain('GESCO-SHA256-');
      expect(receipt.qrCodeUrl).toContain('data:image/');
      expect(receipt.htmlContent).toContain('100');

      // Verify updated financial situation
      const updatedList = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
      const updatedEnrollment = updatedList.find((e) => e.id === enrollment.id)!;
      expect(updatedEnrollment.totalPaid).toBe(100000);
      expect(updatedEnrollment.remainingBalance).toBe(260000);

      // Verify installment 1 status is marked PAID
      expect(updatedEnrollment.installments[0].status).toBe('PAID');
    });

    it('dynamically adapts receipt academic year to future or custom school years (P2-08)', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-custom-year',
        academicYearId: '2027-2028',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const payRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: 50000,
        paymentDate: '2027-10-15',
        paymentMode: 'CASH',
      });

      expect(payRes.success).toBe(true);
      expect(payRes.data?.receipt.academicYear).toBe('2027-2028');
      expect(payRes.data?.receipt.htmlContent).toContain('2027-2028');
    });

    it('supports all 6 payment modes: CASH, ORANGE_MONEY, MTN_MONEY, WAVE, TRANSFER, CHECK', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const modes: any[] = ['CASH', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'TRANSFER', 'CHECK'];
      for (const mode of modes) {
        const payRes = await tuitionPaymentService.recordPayment({
          enrollmentId: enrollmentRes.data!.id,
          amount: 10000,
          paymentDate: '2026-07-28',
          paymentMode: mode,
        });
        expect(payRes.success).toBe(true);
        expect(payRes.data?.payment.paymentMode).toBe(mode);
      }
    });

    it('handles offline payments with PENDING_SYNC status and outbox queue sync (P1-06)', async () => {
      clearTuitionPaymentsStore();

      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-offline-01',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      // Mock isOnline to false
      vi.spyOn(tuitionPaymentService, 'isOnline').mockReturnValue(false);

      const payRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: 25000,
        paymentDate: '2026-08-01',
        paymentMode: 'CASH',
      });

      expect(payRes.success).toBe(true);
      expect(payRes.data?.payment.status).toBe('PENDING_SYNC');
      expect(tuitionPaymentService.getPendingSyncCount()).toBe(1);

      const pendingList = tuitionPaymentService.getPendingPayments();
      expect(pendingList.length).toBe(1);
      expect(pendingList[0].amount).toBe(25000);

      // Parent still immediately receives valid receipt and QR code
      expect(payRes.data?.receipt.receiptNumber).toBeDefined();
      expect(payRes.data?.receipt.qrCodeUrl).toContain('data:image/');

      // Now restore online status and trigger sync
      vi.spyOn(tuitionPaymentService, 'isOnline').mockReturnValue(true);
      const syncResult = await tuitionPaymentService.syncPendingPayments();

      expect(syncResult.syncedCount).toBe(1);
      expect(tuitionPaymentService.getPendingSyncCount()).toBe(0);
    });

    it('rejects negative or zero payment amounts', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const res = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: -5000,
        paymentDate: '2026-07-28',
        paymentMode: 'CASH',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('supérieur à zéro');
    });

    it('requires explicit manager confirmation if payment amount exceeds remaining balance (trop-perçu)', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      // Net total is 360,000 FCFA. Attempt payment of 500,000 FCFA without confirmOverpayment flag
      const unconfirmedRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: 500000,
        paymentDate: '2026-07-28',
        paymentMode: 'CASH',
        confirmOverpayment: false,
      });

      expect(unconfirmedRes.success).toBe(false);
      expect(unconfirmedRes.error).toContain('trop-perçu');

      // Now with explicit confirmation
      const confirmedRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: 500000,
        paymentDate: '2026-07-28',
        paymentMode: 'CASH',
        confirmOverpayment: true,
      });

      expect(confirmedRes.success).toBe(true);
    });

    it('cancels a validated payment with traceable audit log instead of deleting it', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const payRes = await tuitionPaymentService.recordPayment({
        enrollmentId: enrollmentRes.data!.id,
        amount: 50000,
        paymentDate: '2026-07-28',
        paymentMode: 'CASH',
      });
      const paymentId = payRes.data!.payment.id;

      // Cancel payment with audit reason
      const cancelRes = await tuitionPaymentService.cancelPayment(paymentId, 'Direction', 'Erreur de saisie caisse');
      expect(cancelRes.success).toBe(true);

      // Verify payment status is CANCELLED and audit fields are populated
      const paymentsHistory = await tuitionPaymentService.getPaymentsByEnrollment(enrollmentRes.data!.id);
      const cancelledPayment = paymentsHistory.find((p) => p.id === paymentId)!;
      expect(cancelledPayment.status).toBe('CANCELLED');
      expect(cancelledPayment.cancelledBy).toBe('Direction');
      expect(cancelledPayment.cancellationReason).toBe('Erreur de saisie caisse');

      // Verify enrollment balance was adjusted back
      const updatedList = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
      const updatedEnrollment = updatedList.find((e) => e.id === enrollmentRes.data!.id)!;
      expect(updatedEnrollment.totalPaid).toBe(0);
      expect(updatedEnrollment.remainingBalance).toBe(360000);
    });
  });

  describe('Tuition Payment React Hook Layer (useTuitionPayment)', () => {
    it('handles student selection, payment recording, and receipt state reactively', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const { result } = renderHook(() => useTuitionPayment('ay-2026'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.selectedEnrollment).toBeDefined();

      let recRes: any = null;
      await act(async () => {
        recRes = await result.current.recordPayment({
          enrollmentId: result.current.selectedEnrollment!.id,
          amount: 40000,
          paymentDate: '2026-07-28',
          paymentMode: 'WAVE',
        });
      });

      expect(recRes).toBeDefined();
      expect(result.current.activeReceipt).toBeDefined();
      expect(result.current.paymentsHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Tuition Payment UI Component Layer (TuitionPaymentView)', () => {
    it('renders title, student search bar, student profile card, and installments table', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      render(
        <AllProviders>
          <TuitionPaymentView />
        </AllProviders>
      );

      expect(screen.getByText('Paiement de la scolarité')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Rechercher élève/i)).toBeInTheDocument();
        expect(screen.getByText(/Élève sélectionné/i)).toBeInTheDocument();
      });
    });
  });
});
