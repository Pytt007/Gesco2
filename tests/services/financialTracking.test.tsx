import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import {
  financialTrackingService,
} from '../../src/services/finance/financialTrackingService';
import {
  studentFinancialEnrollmentService,
  clearFinancialEnrollmentsStore,
} from '../../src/services/finance/studentFinancialEnrollmentService';
import { clearFeeSchedulesStore } from '../../src/services/finance/tuitionFeesService';
import { clearTuitionPaymentsStore } from '../../src/services/finance/tuitionPaymentService';
import { useFinancialTracking } from '../../src/hooks/finance/useFinancialTracking';
import { FinancialTrackingView } from '../../src/components/finance/FinancialTrackingView';
import { ToastProvider } from '../../src/context/ToastContext';
import { SchoolYearProvider } from '../../src/context/SchoolYearContext';
import { AllProviders } from '../testUtils';

describe('Student Financial Tracking Module Layer (Suivi des paiements)', () => {
  beforeEach(() => {
    clearFeeSchedulesStore();
    clearFinancialEnrollmentsStore();
    clearTuitionPaymentsStore();
  });

  describe('Financial Tracking Service (financialTrackingService)', () => {
    it('calculates the 7 KPIs and recovery rate correctly', async () => {
      // 1. Create 3 student enrollments
      // Student 1: Net due = 360,000 FCFA
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      // Student 2: Net due = 360,000 FCFA
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-002',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');

      // Make Student 1 fully paid
      enrollments[0].totalPaid = 360000;
      enrollments[0].remainingBalance = 0;

      // Make Student 2 partially paid
      enrollments[1].totalPaid = 100000;
      enrollments[1].remainingBalance = 260000;

      const kpis = financialTrackingService.calculateKPIs(enrollments);

      expect(kpis.totalStudents).toBe(2);
      expect(kpis.paidStudents).toBe(1);
      expect(kpis.partialStudents).toBe(1);
      expect(kpis.unpaidStudents).toBe(0);
      expect(kpis.totalCollected).toBe(460000);
      expect(kpis.totalRemaining).toBe(260000);
      expect(kpis.totalNetDue).toBe(720000);
      expect(kpis.recoveryRate).toBe(63.9);
    });

    it('filters enrollments by text search, level code, and status', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');

      // Filter by text match on name
      const filteredByName = financialTrackingService.filterEnrollments(enrollments, {
        search: 'Kouassi',
      });
      expect(filteredByName.length).toBe(1);

      // Filter by status PAID
      const filteredByPaid = financialTrackingService.filterEnrollments(enrollments, {
        status: 'PAID',
      });
      expect(filteredByPaid.length).toBe(0); // Currently unpaid
    });

    it('detects alerts for high remaining balances (>= 200,000 FCFA)', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
      const alerts = financialTrackingService.detectAlerts(enrollments);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.type === 'HIGH_BALANCE')).toBe(true);
    });

    it('generates an official financial statement HTML with QR Code', async () => {
      const enrollmentRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const html = financialTrackingService.generateFinancialStatementHtml(enrollmentRes.data!, []);

      expect(html).toContain('RELEVÉ HISTORIQUE DES RÈGLEMENTS DE SCOLARITÉ');
      expect(html.toLowerCase()).toContain('kouassi');
      expect(html).toContain('GESCO');
    });
  });

  describe('Financial Tracking Hook Layer (useFinancialTracking)', () => {
    it('provides reactive KPIs, alerts, and filter controls', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const { result } = renderHook(() => useFinancialTracking('ay-2026'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.enrollments.length).toBe(1);
      expect(result.current.kpis.totalStudents).toBe(1);
      expect(result.current.alerts.length).toBeGreaterThan(0);

      act(() => {
        result.current.updateFilter('status', 'PAID');
      });

      expect(result.current.filteredEnrollments.length).toBe(0);
    });
  });

  describe('Financial Tracking UI Component Layer (FinancialTrackingView)', () => {
    it('renders title "Suivi des paiements", KPI cards, search bar and student table', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      render(
        <AllProviders>
          <FinancialTrackingView />
        </AllProviders>
      );

      expect(screen.getByText('Suivi des paiements')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Effectif')).toBeInTheDocument();
        expect(screen.getByText('Recouvrement')).toBeInTheDocument();
      });
    });
  });
});
