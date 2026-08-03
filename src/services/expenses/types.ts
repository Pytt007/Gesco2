/**
 * GESCO — Types du module Dépenses & Tableau de Bord Dépenses
 */

// ─────────────────────────────────────────────────────────────────────────────
// Énumérations & Types de base
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseStatus = 'PENDING' | 'VALIDATED' | 'CANCELLED';

export type ExpensePaymentMode =
  | 'CASH'
  | 'CHECK'
  | 'TRANSFER'
  | 'ORANGE_MONEY'
  | 'MTN_MONEY'
  | 'WAVE';

// ─────────────────────────────────────────────────────────────────────────────
// Catégorie
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  color: string;     // Couleur hex pour les badges et graphiques
  isSystem: boolean; // Les catégories système ne peuvent pas être supprimées
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dépense
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseRecord {
  id: string;
  date: string;                    // ISO date YYYY-MM-DD
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  description: string;
  amount: number;                  // Toujours ≥ 0
  paymentMode: ExpensePaymentMode;
  supplier?: string;               // Fournisseur (optionnel)
  attachmentUrl?: string;          // URL pièce justificative (optionnel)
  status: ExpenseStatus;
  academicYearId: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMode: ExpensePaymentMode;
  supplier?: string;
  attachmentUrl?: string;
  academicYearId: string;
  createdBy?: string;
}

export interface ExpenseUpdateInput {
  date?: string;
  categoryId?: string;
  description?: string;
  amount?: number;
  paymentMode?: ExpensePaymentMode;
  supplier?: string;
  status?: ExpenseStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget & KPIs de base
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseBudget {
  academicYearId: string;
  annualBudget: number;
  updatedAt: string;
}

export interface ExpenseKPIs {
  totalMonth: number;        // Dépenses du mois courant
  totalYear: number;         // Dépenses annuelles
  annualBudget: number;      // Budget prévu
  remainingBudget: number;   // Budget restant
  budgetUsedPct: number;     // % budget utilisé
  byCategory: Record<string, number>; // Montant par catégorie (validées)
  countPending: number;
  countValidated: number;
  countCancelled: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tableau de Bord Dépenses (Analytics & Alertes)
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseAlertType = 'BUDGET_EXCEEDED' | 'CATEGORY_OVERSPENT' | 'UNUSUAL_EXPENSE';

export interface ExpenseAlert {
  id: string;
  type: ExpenseAlertType;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
}

export interface MonthlyExpenseData {
  month: string;      // Format "YYYY-MM"
  label: string;      // Ex : "Sept", "Oct"
  amount: number;
  count: number;
}

export interface CategoryDistributionData {
  categoryId: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface ExpenseDashboardStats {
  totalMonth: number;              // Dépenses du mois sélectionné/courant
  totalYear: number;               // Dépenses de l'année scolaire
  annualBudget: number;            // Budget annuel prévu
  remainingBudget: number;         // Budget restant (Budget - Dépenses)
  totalExpenseCount: number;       // Nombre total de dépenses (non annulées)
  averagePerMonth: number;         // Dépense moyenne par mois
  budgetUsedPct: number;           // Pourcentage de budget consommé
  monthlyEvolution: MonthlyExpenseData[];
  categoryDistribution: CategoryDistributionData[];
  topExpenses: ExpenseRecord[];    // Top 10 dépenses les plus importantes
  alerts: ExpenseAlert[];          // Détection automatique des alertes
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtres
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseFilter {
  search?: string;
  categoryId?: string | 'ALL';
  status?: ExpenseStatus | 'ALL';
  month?: string;   // Format : "YYYY-MM"
  academicYearId?: string;
  schoolYearId?: string;
}
