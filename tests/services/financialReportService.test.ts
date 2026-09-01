import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportService } from '../../src/services/reports/reportService';
import { studentFinancialEnrollmentService } from '../../src/services/finance/studentFinancialEnrollmentService';
import { canteenEnrollmentService } from '../../src/services/canteen/canteenEnrollmentService';
import { transportEnrollmentService } from '../../src/services/transport/transportEnrollmentService';
import { expenseService, clearExpensesStore } from '../../src/services/expenses';

describe('Financial Reporting & Cash Flow Reconciliation (P2-17)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearExpensesStore();
  });

  it('generates tuition payment summary (rpt-fin-01)', async () => {
    const report = await reportService.generateReport('rpt-fin-01', { academicYearId: 'ay-2026' });
    expect(report.reportId).toBe('rpt-fin-01');
    expect(report.title).toContain('Paiements de Scolarité');
    expect(report.summaryCards?.length).toBe(4);
    expect(report.headers).toContain('Montant Payé');
  });

  it('generates tuition collection registry (rpt-fin-03)', async () => {
    const report = await reportService.generateReport('rpt-fin-03', { academicYearId: 'ay-2026' });
    expect(report.reportId).toBe('rpt-fin-03');
    expect(report.title).toContain('Recettes de Scolarité');
    expect(report.headers).toContain('Montant Encaissé');
  });

  it('generates canteen collection registry (rpt-fin-04)', async () => {
    const report = await reportService.generateReport('rpt-fin-04', { academicYearId: 'ay-2026' });
    expect(report.reportId).toBe('rpt-fin-04');
    expect(report.title).toContain('Recettes de Cantine');
    expect(report.headers).toContain('Formule');
  });

  it('generates transport collection registry (rpt-fin-05)', async () => {
    const report = await reportService.generateReport('rpt-fin-05', { academicYearId: 'ay-2026' });
    expect(report.reportId).toBe('rpt-fin-05');
    expect(report.title).toContain('Recettes de Transport');
    expect(report.headers).toContain('Ligne');
  });

  it('accurately reconciles revenues vs expenses and computes net cash flow (rpt-fin-07)', async () => {
    // 1. Ajouter une dépense validée
    await expenseService.createExpense({
      date: '2026-03-01',
      categoryId: 'cat-1',
      description: 'Maintenance Informatique',
      amount: 50000,
      paymentMode: 'CASH',
      academicYearId: 'ay-2026',
    });

    const report = await reportService.generateReport('rpt-fin-07', { academicYearId: 'ay-2026' });
    expect(report.reportId).toBe('rpt-fin-07');
    expect(report.title).toContain('Recettes vs Dépenses');

    const totalRevenueCard = report.summaryCards?.find((c) => c.label.includes('Recettes Perçues'));
    const totalExpensesCard = report.summaryCards?.find((c) => c.label.includes('Dépenses Réalisées'));
    const netSoldeCard = report.summaryCards?.find((c) => c.label.includes('Solde Net Trésorerie'));

    expect(totalRevenueCard).toBeDefined();
    expect(totalExpensesCard).toBeDefined();
    expect(totalExpensesCard?.value).toContain('50\u202F000');
    expect(netSoldeCard).toBeDefined();
  });
});
