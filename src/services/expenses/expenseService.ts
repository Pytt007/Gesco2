/**
 * GESCO — Service Dépenses & Tableau de Bord Financier
 * 100% connecté à Supabase — Aucune donnée locale fictive
 */

import {
  ExpenseRecord,
  ExpenseInput,
  ExpenseUpdateInput,
  ExpenseCategoryItem,
  ExpenseKPIs,
  ExpenseFilter,
  ExpensePaymentMode,
  ExpenseDashboardStats,
  MonthlyExpenseData,
  CategoryDistributionData,
  ExpenseAlert,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Labels statiques (non-données) ──────────────────────────────────────────

export const EXPENSE_PAYMENT_MODE_LABELS: Record<ExpensePaymentMode, string> = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  TRANSFER: 'Virement',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
};

// ─── Mapping DB → Modèle ──────────────────────────────────────────────────────

function mapCategoryFromDb(d: any): ExpenseCategoryItem {
  return {
    id: d.id,
    name: d.name,
    color: d.color || '#6b7280',
    isSystem: d.is_system ?? false,
    createdAt: d.created_at,
  };
}

function mapExpenseFromDb(d: any): ExpenseRecord {
  return {
    id: d.id,
    date: d.date,
    categoryId: d.category_id,
    categoryName: d.expense_categories?.name || d.category_name || '—',
    categoryColor: d.expense_categories?.color || d.category_color || '#6b7280',
    description: d.description,
    amount: d.amount || 0,
    paymentMode: d.payment_mode as ExpensePaymentMode,
    supplier: d.supplier || undefined,
    attachmentUrl: d.attachment_url || undefined,
    status: d.status || 'VALIDATED',
    academicYearId: d.academic_year_id,
    createdBy: d.created_by || '—',
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    cancelledAt: d.cancelled_at || undefined,
    cancelReason: d.cancel_reason || undefined,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const expenseService = {

  async getCategories(): Promise<ExpenseCategoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      if (!error && data) {
        return data.map(mapCategoryFromDb);
      }
    } catch { /* Supabase injoignable */ }
    return [];
  },

  async addCategory(name: string, color: string = '#3b82f6'): Promise<ServiceResponse<ExpenseCategoryItem>> {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Le nom de la catégorie est obligatoire.' };

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name: cleanName, color, is_system: false }])
        .select()
        .single();
      if (!error && data) {
        return { success: true, data: mapCategoryFromDb(data), message: 'Nouvelle catégorie ajoutée.' };
      }
      return { success: false, error: error?.message || 'Impossible de créer la catégorie.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erreur réseau.' };
    }
  },

  async getBudget(academicYearId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('expense_budgets')
        .select('amount')
        .eq('academic_year_id', academicYearId)
        .single();
      if (!error && data) return data.amount || 0;
    } catch { /* Supabase injoignable */ }
    return 0;
  },

  async setBudget(academicYearId: string, amount: number): Promise<ServiceResponse<number>> {
    if (amount < 0) return { success: false, error: 'Le budget ne peut pas être négatif.' };
    try {
      const { error } = await supabase
        .from('expense_budgets')
        .upsert([{ academic_year_id: academicYearId, amount }], { onConflict: 'academic_year_id' });
      if (!error) return { success: true, data: amount, message: 'Budget mis à jour.' };
      return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getExpenses(filter: ExpenseFilter = {}): Promise<ExpenseRecord[]> {
    try {
      let query = supabase
        .from('expenses')
        .select('*, expense_categories(name, color)')
        .order('date', { ascending: false });

      if (filter.academicYearId) {
        query = query.eq('academic_year_id', filter.academicYearId);
      }
      if (filter.categoryId && filter.categoryId !== 'ALL') {
        query = query.eq('category_id', filter.categoryId);
      }
      if (filter.status && filter.status !== 'ALL') {
        query = query.eq('status', filter.status);
      }
      if (filter.month) {
        query = query.gte('date', `${filter.month}-01`).lte('date', `${filter.month}-31`);
      }
      if (filter.search) {
        query = query.ilike('description', `%${filter.search}%`);
      }

      const { data, error } = await query;
      if (!error && data) return data.map(mapExpenseFromDb);
    } catch { /* Supabase injoignable */ }
    return [];
  },

  async createExpense(input: ExpenseInput): Promise<ServiceResponse<ExpenseRecord>> {
    if (!input.description?.trim()) return { success: false, error: 'La description est obligatoire.' };
    if (input.amount <= 0) return { success: false, error: 'Le montant doit être supérieur à 0.' };
    if (!input.date) return { success: false, error: 'La date est obligatoire.' };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          date: input.date,
          category_id: input.categoryId,
          description: input.description.trim(),
          amount: input.amount,
          payment_mode: input.paymentMode,
          supplier: input.supplier?.trim() || null,
          attachment_url: input.attachmentUrl || null,
          status: 'VALIDATED',
          academic_year_id: input.academicYearId,
          created_by: input.createdBy || 'Gestionnaire',
        }])
        .select('*, expense_categories(name, color)')
        .single();
      if (!error && data) {
        return { success: true, data: mapExpenseFromDb(data), message: 'Dépense enregistrée avec succès.' };
      }
      return { success: false, error: error?.message || 'Impossible de créer la dépense.' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateExpense(id: string, input: ExpenseUpdateInput): Promise<ServiceResponse<ExpenseRecord>> {
    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (input.description !== undefined) updates.description = input.description.trim();
      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.date !== undefined) updates.date = input.date;
      if (input.paymentMode !== undefined) updates.payment_mode = input.paymentMode;
      if (input.supplier !== undefined) updates.supplier = input.supplier.trim() || null;
      if (input.categoryId !== undefined) updates.category_id = input.categoryId;
      if (input.status !== undefined) updates.status = input.status;

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select('*, expense_categories(name, color)')
        .single();
      if (!error && data) return { success: true, data: mapExpenseFromDb(data), message: 'Dépense mise à jour.' };
      return { success: false, error: error?.message || 'Dépense introuvable.' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async cancelExpense(id: string, reason?: string): Promise<ServiceResponse<ExpenseRecord>> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || 'Annulation par le gestionnaire',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, expense_categories(name, color)')
        .single();
      if (!error && data) return { success: true, data: mapExpenseFromDb(data), message: 'Dépense annulée.' };
      return { success: false, error: error?.message || 'Dépense introuvable.' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Calcul des statistiques complètes du Tableau de Bord — 100% Supabase
   */
  async getDashboardStats(filter: ExpenseFilter = {}): Promise<ExpenseDashboardStats> {
    const emptyStats: ExpenseDashboardStats = {
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
    };

    try {
      const yearId = filter.academicYearId || '2024-2025';
      const allExpenses = await this.getExpenses({ academicYearId: yearId });
      const activeExpenses = allExpenses.filter((e) => e.status !== 'CANCELLED');

      const now = new Date();
      const targetMonthPrefix = filter.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const monthExpenses = activeExpenses.filter((e) => e.date.startsWith(targetMonthPrefix));
      const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const totalYear = activeExpenses.reduce((s, e) => s + e.amount, 0);

      const annualBudget = await this.getBudget(yearId);
      const remainingBudget = Math.max(0, annualBudget - totalYear);
      const budgetUsedPct = annualBudget > 0 ? Math.min(100, Math.round((totalYear / annualBudget) * 100)) : 0;
      const totalExpenseCount = activeExpenses.length;

      const monthNames = [
        { key: '09', label: 'Sept' }, { key: '10', label: 'Oct' }, { key: '11', label: 'Nov' },
        { key: '12', label: 'Déc' }, { key: '01', label: 'Janv' }, { key: '02', label: 'Fév' },
        { key: '03', label: 'Mars' }, { key: '04', label: 'Avr' }, { key: '05', label: 'Mai' },
        { key: '06', label: 'Juin' }, { key: '07', label: 'Juil' }, { key: '08', label: 'Août' },
      ];

      const yearNum = parseInt(yearId.split('-')[1] || String(now.getFullYear()));

      const monthlyEvolution: MonthlyExpenseData[] = monthNames.map((m) => {
        const monthYearStr = parseInt(m.key) >= 9 ? `${yearNum - 1}-${m.key}` : `${yearNum}-${m.key}`;
        const exps = activeExpenses.filter((e) => e.date.startsWith(monthYearStr));
        return {
          month: monthYearStr,
          label: m.label,
          amount: exps.reduce((s, e) => s + e.amount, 0),
          count: exps.length,
        };
      });

      const activeMonthsCount = monthlyEvolution.filter((m) => m.amount > 0).length || 1;
      const averagePerMonth = Math.round(totalYear / activeMonthsCount);

      const catMap: Record<string, { name: string; amount: number; color: string }> = {};
      activeExpenses.forEach((e) => {
        if (!catMap[e.categoryId]) catMap[e.categoryId] = { name: e.categoryName, amount: 0, color: e.categoryColor || '#3b82f6' };
        catMap[e.categoryId].amount += e.amount;
      });

      const categoryDistribution: CategoryDistributionData[] = Object.entries(catMap).map(([id, item]) => ({
        categoryId: id,
        name: item.name,
        amount: item.amount,
        percentage: totalYear > 0 ? Math.round((item.amount / totalYear) * 100) : 0,
        color: item.color,
      })).sort((a, b) => b.amount - a.amount);

      const topExpenses = [...activeExpenses].sort((a, b) => b.amount - a.amount).slice(0, 10);

      const alerts: ExpenseAlert[] = [];
      if (annualBudget > 0 && totalYear > annualBudget) {
        alerts.push({
          id: 'alt-budget-exceeded',
          type: 'BUDGET_EXCEEDED',
          severity: 'danger',
          title: '⚠ Budget annuel dépassé',
          message: `Les dépenses (${totalYear.toLocaleString('fr-FR')} FCFA) dépassent le budget de ${(totalYear - annualBudget).toLocaleString('fr-FR')} FCFA.`,
        });
      }

      return {
        totalMonth, totalYear, annualBudget, remainingBudget,
        totalExpenseCount, averagePerMonth, budgetUsedPct,
        monthlyEvolution, categoryDistribution, topExpenses, alerts,
      };
    } catch {
      return emptyStats;
    }
  },

  async getKPIs(academicYearId: string = '2024-2025'): Promise<ExpenseKPIs> {
    const stats = await this.getDashboardStats({ academicYearId });
    const byCategory: Record<string, number> = {};
    stats.categoryDistribution.forEach((c) => { byCategory[c.name] = c.amount; });
    return {
      totalMonth: stats.totalMonth,
      totalYear: stats.totalYear,
      annualBudget: stats.annualBudget,
      remainingBudget: stats.remainingBudget,
      budgetUsedPct: stats.budgetUsedPct,
      byCategory,
      countPending: 0,
      countValidated: stats.totalExpenseCount,
      countCancelled: 0,
    };
  },
};
