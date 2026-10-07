import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ fail: false, from: vi.fn(), selectArgs: [] as string[] }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: { from: state.from },
}));

import { expenseService, clearExpensesStore } from '../../src/services/expenses';

function query() {
  const chain: any = {
    select: vi.fn((columns: string) => { state.selectArgs.push(columns); return chain; }),
    order: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(async () => state.fail
      ? { data: null, error: { message: 'Neon indisponible' } }
      : { data: { id: 'expense-1', amount: 75_000, status: 'VALIDATED' }, error: null }),
    maybeSingle: vi.fn(async () => state.fail
      ? { data: null, error: { message: 'Neon indisponible' } }
      : { data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(state.fail
      ? { data: null, error: { message: 'Neon indisponible' } }
      : { data: [], error: null }).then(resolve),
  };
  return chain;
}

beforeEach(() => {
  state.fail = false;
  state.selectArgs = [];
  state.from.mockReset().mockImplementation(query);
  clearExpensesStore();
});

const input = {
  date: '2026-10-07',
  categoryId: 'category-1',
  description: 'Fournitures',
  amount: 75_000,
  paymentMode: 'CASH' as const,
  academicYearId: 'year-1',
};

describe('Dépenses enregistrées exclusivement dans Neon', () => {
  it('rejette les champs invalides avant toute écriture', async () => {
    expect((await expenseService.createExpense({ ...input, amount: 0 })).success).toBe(false);
    expect((await expenseService.createExpense({ ...input, description: ' ' })).success).toBe(false);
    expect(state.from).not.toHaveBeenCalled();
  });

  it('ne confirme jamais une écriture refusée par Neon', async () => {
    state.fail = true;
    expect(await expenseService.createExpense(input)).toMatchObject({ success: false, error: 'Neon indisponible' });
    expect(await expenseService.updateExpense('expense-1', { amount: 50_000 })).toMatchObject({ success: false, error: 'Neon indisponible' });
    expect(await expenseService.cancelExpense('expense-1')).toMatchObject({ success: false, error: 'Neon indisponible' });
    expect(await expenseService.setBudget('year-1', 100_000)).toMatchObject({ success: false, error: 'Neon indisponible' });
    expect(await expenseService.addCategory('Fournitures')).toMatchObject({ success: false, error: 'Neon indisponible' });
  });

  it('remonte une erreur de lecture au lieu de présenter de fausses données vides', async () => {
    state.fail = true;
    await expect(expenseService.getExpenses()).rejects.toMatchObject({ message: 'Neon indisponible' });
    await expect(expenseService.getCategories()).rejects.toMatchObject({ message: 'Neon indisponible' });
    await expect(expenseService.getBudget('year-1')).rejects.toMatchObject({ message: 'Neon indisponible' });
  });

  it('accepte une écriture confirmée et relit Neon après effacement de la mémoire locale', async () => {
    expect((await expenseService.createExpense(input)).success).toBe(true);
    clearExpensesStore();
    expect(await expenseService.getExpenses({ academicYearId: 'year-1' })).toEqual([]);
    expect(state.selectArgs.every(columns => !columns.includes('expense_categories('))).toBe(true);
  });
});
