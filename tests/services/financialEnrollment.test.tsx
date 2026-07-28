import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import {
  studentFinancialEnrollmentService,
  clearFinancialEnrollmentsStore,
} from '../../src/services/finance/studentFinancialEnrollmentService';
import { tuitionFeesService, clearFeeSchedulesStore } from '../../src/services/finance/tuitionFeesService';
import { useStudentFinancialEnrollment } from '../../src/hooks/finance/useStudentFinancialEnrollment';
import { FinancialEnrollmentView } from '../../src/components/finance/FinancialEnrollmentView';
import { ToastProvider } from '../../src/context/ToastContext';
import { SchoolYearProvider } from '../../src/context/SchoolYearContext';

describe('Student Financial Enrollment Module Layer (Inscription Financière d’un Élève)', () => {
  beforeEach(() => {
    clearFeeSchedulesStore();
    clearFinancialEnrollmentsStore();
  });

  describe('Financial Enrollment Service (studentFinancialEnrollmentService)', () => {
    it('creates a financial enrollment automatically with tariffs auto-retrieved, discount applied and 8 installments generated', async () => {
      const res = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1', // CP1
        discountType: 'FIXED',
        discountValue: 20000,
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const data = res.data!;
      expect(data.studentId).toBe('st-001');
      expect(data.levelCode).toBe('CP1');
      expect(data.registrationFee).toBe(60000);
      expect(data.tuitionFee).toBe(300000);
      expect(data.totalAnnualFee).toBe(360000);
      expect(data.discountAmount).toBe(20000);
      expect(data.netTotalDue).toBe(340000);
      expect(data.installmentsCount).toBe(8);
      expect(data.installments.length).toBe(8);

      // Verify sum of 8 installments equals netTotalDue
      const sumInstallments = data.installments.reduce((sum, i) => sum + i.amountDue, 0);
      expect(sumInstallments).toBe(data.netTotalDue);
    });

    it('calculates percentage discount accurately based on tuition fee', async () => {
      const res = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-002',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1', // CP1 (Tuition: 300,000)
        discountType: 'PERCENTAGE',
        discountValue: 10, // 10% of 300,000 = 30,000
      });

      expect(res.success).toBe(true);
      expect(res.data?.discountAmount).toBe(30000);
      expect(res.data?.netTotalDue).toBe(330000);
    });

    it('prevents enrolling a student twice for the same academic year', async () => {
      await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const secondRes = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('déjà un dossier financier');
    });

    it('prevents negative discount value or discount exceeding total annual fee', async () => {
      const res1 = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-003',
        academicYearId: 'ay-2026',
        classroomId: 'cls-3',
        discountType: 'FIXED',
        discountValue: -5000,
      });
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('négative');

      const res2 = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-003',
        academicYearId: 'ay-2026',
        classroomId: 'cls-3',
        discountType: 'FIXED',
        discountValue: 99999999,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('dépasser');
    });

    it('rejects enrollment if level tariff schedule is missing for the academic year', async () => {
      // Get schedules for ay-2099 and archive level CP1
      const schedules = await tuitionFeesService.getSchedulesByYear('ay-2099');
      const cp1 = schedules.find((s) => s.levelCode === 'CP1');
      if (cp1) {
        await tuitionFeesService.archiveSchedule(cp1.id);
      }

      const res = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-004',
        academicYearId: 'ay-2099',
        classroomId: 'cls-1', // CP1
        discountType: 'NONE',
        discountValue: 0,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Aucun tarif configuré');
    });

    it('updates enrollment discount and custom installments cleanly', async () => {
      const created = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const updateRes = await studentFinancialEnrollmentService.updateEnrollment(created.data!.id, {
        discountType: 'FIXED',
        discountValue: 50000,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.discountAmount).toBe(50000);
      expect(updateRes.data?.netTotalDue).toBe(310000);
    });

    it('archives student financial enrollment cleanly', async () => {
      const created = await studentFinancialEnrollmentService.createEnrollment({
        studentId: 'st-001',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        discountType: 'NONE',
        discountValue: 0,
      });

      const archiveRes = await studentFinancialEnrollmentService.archiveEnrollment(created.data!.id);
      expect(archiveRes.success).toBe(true);

      const list = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
      expect(list.some((e) => e.id === created.data!.id)).toBe(false);
    });
  });

  describe('Financial Enrollment React Hook Layer (useStudentFinancialEnrollment)', () => {
    it('manages enrollments list, summary status and creation reactively', async () => {
      const { result } = renderHook(() => useStudentFinancialEnrollment('ay-2026'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      let createdObj: any = null;
      await act(async () => {
        createdObj = await result.current.createEnrollment({
          studentId: 'st-001',
          academicYearId: 'ay-2026',
          classroomId: 'cls-1',
          discountType: 'FIXED',
          discountValue: 10000,
        });
      });

      expect(createdObj).toBeDefined();
      expect(result.current.enrollments.length).toBeGreaterThan(0);
      expect(result.current.summaryStatus.totalNetRevenue).toBeGreaterThan(0);
    });
  });

  describe('Financial Enrollment UI Component Layer (FinancialEnrollmentView)', () => {
    it('renders title, summary indicator cards and new enrollment button', async () => {
      render(
        <ToastProvider>
          <SchoolYearProvider>
            <FinancialEnrollmentView />
          </SchoolYearProvider>
        </ToastProvider>
      );

      expect(screen.getByText('Inscription financière')).toBeInTheDocument();
      expect(screen.getByText('Nouvelle Inscription Financière')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Élèves Inscrits')).toBeInTheDocument();
        expect(screen.getByText('Montant Total Net Due')).toBeInTheDocument();
      });
    });
  });
});
