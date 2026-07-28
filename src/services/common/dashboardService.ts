// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Tableau de Bord
// Couche de récupération des statistiques agrégées pour le Dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

export interface DashboardPoint {
  mois: string;
  Revenus: number;
  Dépenses: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalFeesCollected: number;
  totalFeesRemaining: number;
  totalExpenses: number;
  chartData: DashboardPoint[];
}

export async function fetchDashboardMetrics(schoolYear: string): Promise<DashboardStats> {
  const [studentsRes, feesRes, expensesRes] = await Promise.all([
    supabase.from('students').select('id, data').eq('school_year', schoolYear),
    supabase.from('school_fees').select('data').eq('school_year', schoolYear),
    supabase.from('expenses').select('data').eq('school_year', schoolYear),
  ]);

  const students = studentsRes.data || [];
  const fees = feesRes.data || [];
  const expenses = expensesRes.data || [];

  const totalStudents = students.length;

  const totalFeesCollected = fees.reduce((sum: number, row: any) => {
    const d = row.data as any;
    return sum + (typeof d?.totalPaid === 'number' ? d.totalPaid : 0);
  }, 0);

  const totalFeesRemaining = fees.reduce((sum: number, row: any) => {
    const d = row.data as any;
    return sum + (typeof d?.remainingGlobal === 'number' ? d.remainingGlobal : 0);
  }, 0);

  const totalExpenses = expenses.reduce((sum: number, row: any) => {
    const d = row.data as any;
    return sum + (typeof d?.amount === 'number' ? d.amount : 0);
  }, 0);

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const now = new Date();
  const chartData: DashboardPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthRevenu = fees.reduce((sum: number, row: any) => {
      const data = row.data as any;
      const installments = data?.installments || {};
      const instSum = (Object.values(installments) as any[]).reduce((s: number, v: any) => {
        if (typeof v === 'number') return s + v;
        if (typeof v?.amount === 'number' && v?.date?.startsWith(monthKey)) return s + v.amount;
        return s;
      }, 0);
      return sum + instSum;
    }, 0);

    const monthExpense = expenses.reduce((sum: number, row: any) => {
      const d = row.data as any;
      if (d?.date?.startsWith(monthKey)) return sum + (d?.amount ?? 0);
      return sum;
    }, 0);

    return { mois: months[d.getMonth()], Revenus: monthRevenu, Dépenses: monthExpense };
  });

  return {
    totalStudents,
    totalFeesCollected,
    totalFeesRemaining,
    totalExpenses,
    chartData,
  };
}
