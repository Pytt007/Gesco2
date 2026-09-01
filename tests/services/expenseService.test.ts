import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expenseService, clearExpensesStore } from '../../src/services/expenses';

describe('Expense Service & Validation Layer (P2-12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearExpensesStore();
  });

  describe('createExpense validation', () => {
    it('rejects missing description', async () => {
      const res = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: '   ',
        amount: 50000,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('description est obligatoire');
    });

    it('rejects zero or negative amounts', async () => {
      const resZero = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: 'Papeterie',
        amount: 0,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });
      expect(resZero.success).toBe(false);
      expect(resZero.error).toContain('supérieur à 0');

      const resNeg = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: 'Papeterie',
        amount: -15000,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });
      expect(resNeg.success).toBe(false);
      expect(resNeg.error).toContain('supérieur à 0');
    });

    it('rejects missing category or payment mode', async () => {
      const resCat = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: '',
        description: 'Papeterie',
        amount: 15000,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });
      expect(resCat.success).toBe(false);
      expect(resCat.error).toContain('catégorie de dépense est obligatoire');

      const resMode = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: 'Papeterie',
        amount: 15000,
        paymentMode: undefined as any,
        academicYearId: 'ay-2026',
      });
      expect(resMode.success).toBe(false);
      expect(resMode.error).toContain('mode de règlement est obligatoire');
    });

    it('successfully creates an expense with valid inputs', async () => {
      const res = await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: 'Achat de rames de papier A4',
        amount: 75000,
        paymentMode: 'TRANSFER',
        supplier: 'Librairie de France',
        academicYearId: 'ay-2026',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.amount).toBe(75000);
      expect(res.data?.status).toBe('VALIDATED');

      const list = await expenseService.getExpenses({ academicYearId: 'ay-2026' });
      expect(list.length).toBe(1);
      expect(list[0].amount).toBe(75000);
    });
  });

  describe('updateExpense & cancelExpense', () => {
    it('validates amount on update and updates successfully', async () => {
      const created = await expenseService.createExpense({
        date: '2026-03-02',
        categoryId: 'cat-2',
        description: 'Réparation climatiseur',
        amount: 45000,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });

      const badUpdate = await expenseService.updateExpense(created.data!.id, {
        amount: -5000,
      });
      expect(badUpdate.success).toBe(false);
      expect(badUpdate.error).toContain('supérieur à 0');

      const goodUpdate = await expenseService.updateExpense(created.data!.id, {
        amount: 55000,
        description: 'Réparation climatiseur salle des profs',
      });
      expect(goodUpdate.success).toBe(true);
      expect(goodUpdate.data?.amount).toBe(55000);
      expect(goodUpdate.data?.description).toBe('Réparation climatiseur salle des profs');
    });

    it('cancels an expense and records the cancellation reason', async () => {
      const created = await expenseService.createExpense({
        date: '2026-03-03',
        categoryId: 'cat-3',
        description: 'Acompte bus sortie scolaire',
        amount: 100000,
        paymentMode: 'CHECK',
        academicYearId: 'ay-2026',
      });

      const cancelRes = await expenseService.cancelExpense(created.data!.id, 'Sortie reportée par la direction');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.data?.status).toBe('CANCELLED');
      expect(cancelRes.data?.cancelReason).toBe('Sortie reportée par la direction');
      expect(cancelRes.data?.cancelledAt).toBeDefined();
    });
  });

  describe('budgets & dashboard metrics', () => {
    it('manages budget and computes dashboard statistics', async () => {
      await expenseService.setBudget('ay-2026', 500000);
      expect(await expenseService.getBudget('ay-2026')).toBe(500000);

      await expenseService.createExpense({
        date: '2026-03-01',
        categoryId: 'cat-1',
        description: 'Fournitures',
        amount: 150000,
        paymentMode: 'CASH',
        academicYearId: 'ay-2026',
      });

      const stats = await expenseService.getDashboardStats({ academicYearId: 'ay-2026', month: '2026-03' });
      expect(stats.totalYear).toBe(150000);
      expect(stats.totalMonth).toBe(150000);
      expect(stats.annualBudget).toBe(500000);
      expect(stats.remainingBudget).toBe(350000);
      expect(stats.budgetUsedPct).toBe(30);
    });
  });
});
