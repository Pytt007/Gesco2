/**
 * GESCO — Hook Custom Dépenses
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExpenseRecord,
  ExpenseCategoryItem,
  ExpenseInput,
  ExpenseUpdateInput,
  ExpenseKPIs,
  ExpenseFilter,
  ExpenseStatus,
} from '../../services/expenses/types';
import { expenseService } from '../../services/expenses/expenseService';
import { useToast } from '../../context/ToastContext';

export function useExpenses(academicYearId: string = 'ay-2026') {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [kpis, setKpis] = useState<ExpenseKPIs>({
    totalMonth: 0,
    totalYear: 0,
    annualBudget: 0,
    remainingBudget: 0,
    budgetUsedPct: 0,
    byCategory: {},
    countPending: 0,
    countValidated: 0,
    countCancelled: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Format "YYYY-MM"

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catList, expList, kpiData] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenses({
          academicYearId,
          categoryId: selectedCategory,
          status: selectedStatus,
          month: selectedMonth || undefined,
          search: searchQuery,
        }),
        expenseService.getKPIs(academicYearId),
      ]);

      setCategories(catList);
      setExpenses(expList);
      setKpis(kpiData);
    } catch {
      setError('Erreur lors du chargement des dépenses.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId, selectedCategory, selectedStatus, selectedMonth, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ajouter une catégorie
  const addCategory = useCallback(async (name: string, color?: string) => {
    const res = await expenseService.addCategory(name, color);
    if (res.success) {
      showToast(res.message || 'Catégorie créée.', 'success');
      await loadData();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [loadData, showToast]);

  // Créer dépense
  const createExpense = useCallback(async (input: ExpenseInput) => {
    const res = await expenseService.createExpense({ ...input, academicYearId });
    if (res.success) {
      showToast(res.message || 'Dépense enregistrée.', 'success');
      await loadData();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [academicYearId, loadData, showToast]);

  // Modifier dépense
  const updateExpense = useCallback(async (id: string, input: ExpenseUpdateInput) => {
    const res = await expenseService.updateExpense(id, input);
    if (res.success) {
      showToast(res.message || 'Dépense mise à jour.', 'success');
      await loadData();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [loadData, showToast]);

  // Annuler dépense (PAS DE SUPPRESSION)
  const cancelExpense = useCallback(async (id: string, reason?: string) => {
    const res = await expenseService.cancelExpense(id, reason);
    if (res.success) {
      showToast('Dépense annulée avec succès.', 'success');
      await loadData();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [loadData, showToast]);

  // Mettre à jour le budget annuel
  const updateBudget = useCallback(async (newBudget: number) => {
    const res = expenseService.setBudget(academicYearId, newBudget);
    if (res.success) {
      showToast('Budget mis à jour.', 'success');
      await loadData();
    } else {
      showToast(res.error || 'Erreur.', 'error');
    }
    return res;
  }, [academicYearId, loadData, showToast]);

  return {
    expenses: expenses || [],
    categories: categories || [],
    kpis,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedMonth,
    setSelectedMonth,
    reload: loadData,
    addCategory,
    createExpense,
    updateExpense,
    cancelExpense,
    updateBudget,
  };
}
