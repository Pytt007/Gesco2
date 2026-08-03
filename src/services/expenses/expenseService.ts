/**
 * GESCO — Service Dépenses & Tableau de Bord Financier
 */

import {
  ExpenseRecord,
  ExpenseInput,
  ExpenseUpdateInput,
  ExpenseCategoryItem,
  ExpenseKPIs,
  ExpenseFilter,
  ExpensePaymentMode,
  ExpenseStatus,
  ExpenseDashboardStats,
  MonthlyExpenseData,
  CategoryDistributionData,
  ExpenseAlert,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Catégories par défaut ───────────────────────────────────────────────────

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryItem[] = [
  { id: 'cat-salaires', name: 'Salaires', color: '#4f46e5', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-cie', name: 'CIE', color: '#eab308', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-sodeci', name: 'SODECI', color: '#06b6d4', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-internet', name: 'Internet', color: '#3b82f6', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-telephone', name: 'Téléphone', color: '#6366f1', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-fourn-scol', name: 'Fournitures', color: '#10b981', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-fourn-bur', name: 'Fournitures de bureau', color: '#14b8a6', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-entretien', name: 'Entretien', color: '#f59e0b', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-carburant', name: 'Carburant', color: '#ef4444', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-repar-vehic', name: 'Réparations', color: '#dc2626', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-assurances', name: 'Assurances', color: '#8b5cf6', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-impots', name: 'Impôts', color: '#9333ea', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-cnps', name: 'CNPS', color: '#a855f7', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-banque', name: 'Banque', color: '#64748b', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-divers', name: 'Divers', color: '#6b7280', isSystem: true, createdAt: '2026-01-01T00:00:00Z' },
];

export const EXPENSE_PAYMENT_MODE_LABELS: Record<ExpensePaymentMode, string> = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  TRANSFER: 'Virement',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
};

// ─── Stockage Local ─────────────────────────────────────────────────────────

const categoryStore: Map<string, ExpenseCategoryItem> = new Map();
const expenseStore: Map<string, ExpenseRecord> = new Map();
const budgetStore: Map<string, number> = new Map();

function initDemoData() {
  if (categoryStore.size === 0) {
    DEFAULT_EXPENSE_CATEGORIES.forEach((c) => categoryStore.set(c.id, c));
  }

  if (!budgetStore.has('2024-2025')) {
    budgetStore.set('2024-2025', 20000000);
  }

  if (expenseStore.size === 0) {
    const demos: ExpenseRecord[] = [
      // ─── 2024-2025 / ay-2026 ───
      {
        id: 'exp-001',
        date: '2025-02-05',
        categoryId: 'cat-cie',
        categoryName: 'CIE',
        categoryColor: '#eab308',
        description: 'Facture d\'électricité du mois de Janvier',
        amount: 345000,
        paymentMode: 'CASH',
        supplier: 'CIE Côte d\'Ivoire',
        status: 'VALIDATED',
        academicYearId: '2024-2025',
        createdBy: 'Comptable',
        createdAt: '2025-02-05T10:00:00Z',
        updatedAt: '2025-02-05T10:00:00Z',
      },
      {
        id: 'exp-002',
        date: '2025-02-10',
        categoryId: 'cat-salaires',
        categoryName: 'Salaires',
        categoryColor: '#4f46e5',
        description: 'Salaires enseignants et personnel administratif - Janvier',
        amount: 6800000,
        paymentMode: 'TRANSFER',
        supplier: 'Banque Atlantique',
        status: 'VALIDATED',
        academicYearId: '2024-2025',
        createdBy: 'Directeur',
        createdAt: '2025-02-10T14:30:00Z',
        updatedAt: '2025-02-10T14:30:00Z',
      },
      {
        id: 'exp-003',
        date: '2025-02-15',
        categoryId: 'cat-fourn-bur',
        categoryName: 'Fournitures',
        categoryColor: '#14b8a6',
        description: 'Achat de ramettes de papier, feutres et consommables',
        amount: 285000,
        paymentMode: 'ORANGE_MONEY',
        supplier: 'Librairie de France',
        status: 'VALIDATED',
        academicYearId: '2024-2025',
        createdBy: 'Gestionnaire',
        createdAt: '2025-02-15T09:15:00Z',
        updatedAt: '2025-02-15T09:15:00Z',
      },

      // ─── 2023-2024 ───
      {
        id: 'exp-101',
        date: '2024-03-05',
        categoryId: 'cat-sodeci',
        categoryName: 'SODECI',
        categoryColor: '#06b6d4',
        description: 'Facture d\'eau Février 2024',
        amount: 195000,
        paymentMode: 'CHECK',
        supplier: 'SODECI',
        status: 'VALIDATED',
        academicYearId: '2023-2024',
        createdBy: 'Comptable',
        createdAt: '2024-03-05T09:00:00Z',
        updatedAt: '2024-03-05T09:00:00Z',
      },
      {
        id: 'exp-102',
        date: '2024-03-10',
        categoryId: 'cat-salaires',
        categoryName: 'Salaires',
        categoryColor: '#4f46e5',
        description: 'Salaires personnel - Février 2024',
        amount: 6200000,
        paymentMode: 'TRANSFER',
        supplier: 'Société Générale',
        status: 'VALIDATED',
        academicYearId: '2023-2024',
        createdBy: 'Directeur',
        createdAt: '2024-03-10T11:00:00Z',
        updatedAt: '2024-03-10T11:00:00Z',
      },

      // ─── 2022-2023 ───
      {
        id: 'exp-201',
        date: '2023-04-12',
        categoryId: 'cat-entretien',
        categoryName: 'Entretien',
        categoryColor: '#f59e0b',
        description: 'Peinture et rénovation des salles de classe',
        amount: 450000,
        paymentMode: 'CASH',
        supplier: 'Entreprise Bâtiment CI',
        status: 'VALIDATED',
        academicYearId: '2022-2023',
        createdBy: 'Gestionnaire',
        createdAt: '2023-04-12T10:00:00Z',
        updatedAt: '2023-04-12T10:00:00Z',
      },
    ];

    demos.forEach((d) => expenseStore.set(d.id, d));
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const expenseService = {

  async getCategories(): Promise<ExpenseCategoryItem[]> {
    initDemoData();
    try {
      if (supabase) {
        const { data, error } = await supabase.from('expense_categories').select('*').order('name');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            color: d.color || '#6b7280',
            isSystem: d.is_system ?? false,
            createdAt: d.created_at,
          }));
        }
      }
    } catch { /* Fallback local */ }

    return Array.from(categoryStore.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async addCategory(name: string, color: string = '#3b82f6'): Promise<ServiceResponse<ExpenseCategoryItem>> {
    initDemoData();
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Le nom de la catégorie est obligatoire.' };

    const existing = Array.from(categoryStore.values()).find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) return { success: false, error: `La catégorie "${cleanName}" existe déjà.` };

    const item: ExpenseCategoryItem = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      color,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    categoryStore.set(item.id, item);
    return { success: true, data: item, message: 'Nouvelle catégorie ajoutée.' };
  },

  getBudget(academicYearId: string = '2024-2025'): number {
    initDemoData();
    return budgetStore.get(academicYearId) || 20000000;
  },

  setBudget(academicYearId: string, amount: number): ServiceResponse<number> {
    if (amount < 0) return { success: false, error: 'Le budget ne peut pas être négatif.' };
    budgetStore.set(academicYearId, amount);
    return { success: true, data: amount, message: 'Budget mis à jour.' };
  },

  async getExpenses(filter: ExpenseFilter = {}): Promise<ExpenseRecord[]> {
    initDemoData();
    const yearId = filter.academicYearId || '2024-2025';
    let list = Array.from(expenseStore.values()).filter(
      (e) => !e.academicYearId || e.academicYearId === yearId || (yearId === '2024-2025' && e.academicYearId === 'ay-2026')
    );

    if (filter.categoryId && filter.categoryId !== 'ALL') {
      list = list.filter((e) => e.categoryId === filter.categoryId);
    }

    if (filter.status && filter.status !== 'ALL') {
      list = list.filter((e) => e.status === filter.status);
    }

    if (filter.month) {
      list = list.filter((e) => e.date.startsWith(filter.month!));
    }

    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.categoryName.toLowerCase().includes(q) ||
          (e.supplier || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createExpense(input: ExpenseInput): Promise<ServiceResponse<ExpenseRecord>> {
    initDemoData();

    if (!input.description || !input.description.trim()) {
      return { success: false, error: 'La description est obligatoire.' };
    }
    if (input.amount <= 0) {
      return { success: false, error: 'Le montant doit être strictement supérieur à 0.' };
    }
    if (!input.date) {
      return { success: false, error: 'La date de dépense est obligatoire.' };
    }

    const categories = await this.getCategories();
    const category = categories.find((c) => c.id === input.categoryId);
    if (!category) {
      return { success: false, error: 'La catégorie sélectionnée n\'existe pas.' };
    }

    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: ExpenseRecord = {
      id,
      date: input.date,
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      description: input.description.trim(),
      amount: input.amount,
      paymentMode: input.paymentMode,
      supplier: input.supplier?.trim() || undefined,
      attachmentUrl: input.attachmentUrl,
      status: 'VALIDATED',
      academicYearId: input.academicYearId || 'ay-2026',
      createdBy: input.createdBy || 'Gestionnaire',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expenseStore.set(id, record);
    return { success: true, data: record, message: 'Dépense enregistrée avec succès.' };
  },

  async updateExpense(id: string, input: ExpenseUpdateInput): Promise<ServiceResponse<ExpenseRecord>> {
    initDemoData();
    const record = expenseStore.get(id);
    if (!record) return { success: false, error: 'Dépense introuvable.' };

    if (record.status === 'CANCELLED') {
      return { success: false, error: 'Impossible de modifier une dépense annulée.' };
    }

    if (input.amount !== undefined && input.amount <= 0) {
      return { success: false, error: 'Le montant doit être supérieur à 0.' };
    }

    if (input.categoryId) {
      const categories = await this.getCategories();
      const cat = categories.find((c) => c.id === input.categoryId);
      if (!cat) return { success: false, error: 'Catégorie non trouvée.' };
      record.categoryId = cat.id;
      record.categoryName = cat.name;
      record.categoryColor = cat.color;
    }

    if (input.description !== undefined) record.description = input.description.trim();
    if (input.amount !== undefined) record.amount = input.amount;
    if (input.date !== undefined) record.date = input.date;
    if (input.paymentMode !== undefined) record.paymentMode = input.paymentMode;
    if (input.supplier !== undefined) record.supplier = input.supplier.trim() || undefined;
    if (input.status !== undefined) record.status = input.status;

    record.updatedAt = new Date().toISOString();
    expenseStore.set(id, record);

    return { success: true, data: record, message: 'Dépense mise à jour.' };
  },

  async cancelExpense(id: string, reason?: string): Promise<ServiceResponse<ExpenseRecord>> {
    initDemoData();
    const record = expenseStore.get(id);
    if (!record) return { success: false, error: 'Dépense introuvable.' };
    if (record.status === 'CANCELLED') return { success: false, error: 'Cette dépense est déjà annulée.' };

    record.status = 'CANCELLED';
    record.cancelledAt = new Date().toISOString();
    record.cancelReason = reason || 'Annulation par le gestionnaire';
    record.updatedAt = new Date().toISOString();

    expenseStore.set(id, record);
    return { success: true, data: record, message: 'Dépense annulée.' };
  },

  /**
   * Calcul des statistiques complètes du Tableau de Bord
   */
  async getDashboardStats(filter: ExpenseFilter = {}): Promise<ExpenseDashboardStats> {
    initDemoData();
    const yearId = filter.academicYearId || 'ay-2026';
    const all = Array.from(expenseStore.values()).filter((e) => e.academicYearId === yearId);

    // Filtrer les dépenses actives (exclure annulées)
    let activeExpenses = all.filter((e) => e.status !== 'CANCELLED');

    if (filter.categoryId && filter.categoryId !== 'ALL') {
      activeExpenses = activeExpenses.filter((e) => e.categoryId === filter.categoryId);
    }

    const now = new Date();
    const targetMonthPrefix = filter.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Dépenses du mois
    const monthExpenses = activeExpenses.filter((e) => e.date.startsWith(targetMonthPrefix));
    const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);

    // 2. Dépenses de l'année
    const totalYear = activeExpenses.reduce((s, e) => s + e.amount, 0);

    // 3. Budget & reste
    const annualBudget = this.getBudget(yearId);
    const remainingBudget = Math.max(0, annualBudget - totalYear);
    const budgetUsedPct = annualBudget > 0 ? Math.min(100, Math.round((totalYear / annualBudget) * 100)) : 0;

    // 4. Nombre total de dépenses
    const totalExpenseCount = activeExpenses.length;

    // 5. Évolution mensuelle (12 mois)
    const monthNames = [
      { key: '09', label: 'Sept' },
      { key: '10', label: 'Oct' },
      { key: '11', label: 'Nov' },
      { key: '12', label: 'Déc' },
      { key: '01', label: 'Janv' },
      { key: '02', label: 'Fév' },
      { key: '03', label: 'Mars' },
      { key: '04', label: 'Avr' },
      { key: '05', label: 'Mai' },
      { key: '06', label: 'Juin' },
      { key: '07', label: 'Juil' },
      { key: '08', label: 'Août' },
    ];

    const yearNum = parseInt(yearId.split('-')[1] || '2026');

    const monthlyEvolution: MonthlyExpenseData[] = monthNames.map((m) => {
      const monthYearStr = parseInt(m.key) >= 9 ? `${yearNum - 1}-${m.key}` : `${yearNum}-${m.key}`;
      const exps = activeExpenses.filter((e) => e.date.startsWith(monthYearStr));
      const amount = exps.reduce((s, e) => s + e.amount, 0);
      return {
        month: monthYearStr,
        label: m.label,
        amount,
        count: exps.length,
      };
    });

    const activeMonthsCount = monthlyEvolution.filter((m) => m.amount > 0).length || 1;
    const averagePerMonth = Math.round(totalYear / activeMonthsCount);

    // 6. Répartition par catégorie
    const catMap: Record<string, { name: string; amount: number; color: string }> = {};
    activeExpenses.forEach((e) => {
      if (!catMap[e.categoryId]) {
        catMap[e.categoryId] = {
          name: e.categoryName,
          amount: 0,
          color: e.categoryColor || '#3b82f6',
        };
      }
      catMap[e.categoryId].amount += e.amount;
    });

    const categoryDistribution: CategoryDistributionData[] = Object.entries(catMap).map(([id, item]) => ({
      categoryId: id,
      name: item.name,
      amount: item.amount,
      percentage: totalYear > 0 ? Math.round((item.amount / totalYear) * 100) : 0,
      color: item.color,
    })).sort((a, b) => b.amount - a.amount);

    // 7. Top 10 Dépenses les plus importantes
    const topExpenses = [...activeExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // 8. Détection automatique des Alertes
    const alerts: ExpenseAlert[] = [];

    // Alerte 1 : Budget annuel dépassé
    if (totalYear > annualBudget) {
      const excess = totalYear - annualBudget;
      alerts.push({
        id: 'alt-budget-exceeded',
        type: 'BUDGET_EXCEEDED',
        severity: 'danger',
        title: '⚠ Budget annuel dépassé',
        message: `Les dépenses annuelles (${totalYear.toLocaleString('fr-FR')} FCFA) dépassent le budget prévu de ${excess.toLocaleString('fr-FR')} FCFA.`,
      });
    }

    // Alerte 2 : Catégorie dépassant une proportion critique (> 40% du budget ou > 5,000,000 F)
    categoryDistribution.forEach((cat) => {
      if (annualBudget > 0 && cat.amount > annualBudget * 0.45) {
        alerts.push({
          id: `alt-cat-${cat.categoryId}`,
          type: 'CATEGORY_OVERSPENT',
          severity: 'warning',
          title: `⚠ Post de dépense élevé : ${cat.name}`,
          message: `La catégorie "${cat.name}" représente ${cat.percentage}% du total des dépenses (${cat.amount.toLocaleString('fr-FR')} FCFA).`,
        });
      }
    });

    // Alerte 3 : Dépenses inhabituelles (dépense individuelle > 3x la dépense moyenne unitaire)
    const avgExpenseAmount = totalExpenseCount > 0 ? totalYear / totalExpenseCount : 0;
    activeExpenses.forEach((e) => {
      if (avgExpenseAmount > 0 && e.amount >= avgExpenseAmount * 3 && e.amount >= 1000000) {
        alerts.push({
          id: `alt-exp-${e.id}`,
          type: 'UNUSUAL_EXPENSE',
          severity: 'info',
          title: `⚠ Dépense inhabituelle détectée`,
          message: `La dépense "${e.description}" (${e.amount.toLocaleString('fr-FR')} FCFA, ${e.categoryName}) est nettement supérieure aux montants habituels.`,
          details: `Date : ${e.date} · Fournisseur : ${e.supplier || '—'}`,
        });
      }
    });

    return {
      totalMonth,
      totalYear,
      annualBudget,
      remainingBudget,
      totalExpenseCount,
      averagePerMonth,
      budgetUsedPct,
      monthlyEvolution,
      categoryDistribution,
      topExpenses,
      alerts,
    };
  },

  async getKPIs(academicYearId: string = 'ay-2026'): Promise<ExpenseKPIs> {
    const stats = await this.getDashboardStats({ academicYearId });
    const byCategory: Record<string, number> = {};
    stats.categoryDistribution.forEach((c) => {
      byCategory[c.name] = c.amount;
    });
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
