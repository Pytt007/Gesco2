/**
 * GESCO — Hook Custom Tableau de Bord Dépenses
 */

import { useState, useEffect, useCallback } from 'react';
import { ExpenseDashboardStats, ExpenseFilter } from '../../services/expenses/types';
import { expenseService } from '../../services/expenses/expenseService';

export function useExpenseDashboard(academicYearId: string = 'ay-2026') {
  const [stats, setStats] = useState<ExpenseDashboardStats>({
    totalMonth: 0,
    totalYear: 0,
    annualBudget: 0,
    remainingBudget: 0,
    totalExpenseCount: 0,
    averagePerMonth: 0,
    budgetUsedPct: 0,
    monthlyEvolution: [],
    categoryDistribution: [],
    topExpenses: [],
    alerts: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expenseService.getDashboardStats({
        academicYearId,
        categoryId: selectedCategory,
        month: selectedMonth || undefined,
      });
      setStats(data);
    } catch {
      setError('Erreur lors du calcul des statistiques des dépenses.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId, selectedCategory, selectedMonth]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    selectedMonth,
    setSelectedMonth,
    reload: loadStats,
  };
}
