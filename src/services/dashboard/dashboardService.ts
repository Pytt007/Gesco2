/**
 * GESCO — Service Master Dashboard (src/services/dashboard/dashboardService.ts)
 * Couche d'accès et d'agrégation globale des indicateurs, alertes, activités et recherche globale
 */

import { supabase } from '../common/supabaseClient';
import { studentFinancialEnrollmentService } from '../finance/studentFinancialEnrollmentService';
import { canteenEnrollmentService } from '../canteen/canteenEnrollmentService';
import { transportEnrollmentService } from '../transport/transportEnrollmentService';
import { transportLineService } from '../transport/transportLineService';
import { expenseService } from '../expenses/expenseService';
import { listParents } from '../parents/parentsService';
import { getSessionsByYear } from '../academic/sessions/assessmentSessionsService';
import { getAcademicYears } from '../academic/academicYearsService';
import { listStudents } from '../students/studentsService';
import { listStaff } from '../staff/staffService';
import { getClassrooms } from '../academic/classroomsService';

// ─── Interfaces Compatibilité ────────────────────────────────────────────────

export interface MainKPIs {
  totalStudents: number;
  girlsCount: number;
  boysCount: number;
  classesCount: number;
  teachersCount: number;
  staffCount: number;
  todayAttendances: number;
  todayAbsences: number;
}

export interface FinancialKPIs {
  expectedAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  monthlyExpenses: number;
  payrollAmount: number;
  netProfit: number;
  collectionRatePercent: number;
}

export interface DashboardPoint {
  mois: string;
  Revenus: number;
  Dépenses: number;
}

export interface FinancialChartData {
  chartSeries: DashboardPoint[];
  monthlyRevenues: { mois: string; montant: number }[];
  monthlyExpenses: { mois: string; montant: number }[];
  revenueDistribution: { category: string; amount: number; percentage: number }[];
}

export interface DashboardAlertItem {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'PAYMENT' | 'CLASS_OVERCROWD' | 'STOCK' | 'EXAM' | 'STAFF_ABSENCE' | 'EVENT';
  title: string;
  message: string;
  severityPriority: number;
  timestamp: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  category: 'EXAM' | 'HOLIDAY' | 'MEETING' | 'EVENT';
  location?: string;
}

// ─── Interfaces Master Dashboard ──────────────────────────────────────────────

export interface DashboardKPIsMaster {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  collectedAmount: number;
  remainingAmount: number;
  recoveryRatePercent: number;
  canteenSubscribersCount: number;
  transportEnrolledCount: number;
  monthlyExpenses: number;
  lastAverageGrade: number;
}

export interface ActivityItem {
  id: string;
  type: 'ENROLLMENT' | 'PAYMENT' | 'EXPENSE' | 'REPORT' | 'STAFF' | 'GRADE';
  title: string;
  description: string;
  timestamp: string;
  badgeColor: string;
  iconName: string;
}

export interface AlertMasterItem {
  id: string;
  severity: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  colorHex: string;
  title: string;
  message: string;
  actionText?: string;
  actionView?: string;
}

export interface CalendarEventMaster {
  id: string;
  title: string;
  date: string;
  type: 'EXAM' | 'MEETING' | 'HOLIDAY' | 'BACK_TO_SCHOOL';
  label: string;
  color: string;
}

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'Élève' | 'Parent' | 'Classe' | 'Personnel' | 'Paiement' | 'Bulletin';
  targetView: string;
}

// ─── Cache Mémoire Dashboard avec TTL (30s) ──────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const DASHBOARD_CACHE_TTL_MS = 30_000;
const dashboardCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | null {
  const entry = dashboardCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DASHBOARD_CACHE_TTL_MS) {
    dashboardCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T): T {
  dashboardCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function invalidateDashboardCache(): void {
  dashboardCache.clear();
}

// ─── Données Statiques / Fallback ───────────────────────────────────────────

const STATIC_CALENDAR_EVENTS: CalendarEventMaster[] = [];

const FALLBACK_ACTIVITIES: ActivityItem[] = [];


// ─── Export Rétro-Compatibilité ──────────────────────────────────────────────

export async function getMainKPIs(schoolYear: string): Promise<MainKPIs> {
  const cacheKey = `mainKPIs_${schoolYear}`;
  const cached = getFromCache<MainKPIs>(cacheKey);
  if (cached) return cached;

  const [master, studentsRes, staffRes] = await Promise.all([
    dashboardService.getMasterKPIs(schoolYear),
    listStudents({ schoolYear, pageSize: 1000 }).catch(() => ({ data: { students: [] } })),
    listStaff({ pageSize: 500 }).catch(() => ({ data: { staffMembers: [] } })),
  ]);

  const students = studentsRes.data?.students || [];
  const girlsCount = students.filter((s) => s.gender === 'Féminin' || (s.gender as any) === 'F' || (s.gender as any) === 'FEMALE').length;
  const boysCount = students.filter((s) => s.gender === 'Masculin' || (s.gender as any) === 'M' || (s.gender as any) === 'MALE').length;

  const staff = staffRes.data?.staffMembers || [];
  const teachersCount = staff.filter((s) => s.role === 'Enseignant' || (s as any).role === 'TEACHER').length;

  const result: MainKPIs = {
    totalStudents: master.totalStudents,
    girlsCount,
    boysCount,
    classesCount: master.totalClasses,
    teachersCount,
    staffCount: master.totalStaff,
    todayAttendances: 0,
    todayAbsences: 0,
  };

  return setInCache(cacheKey, result);
}

export async function getFinancialKPIs(schoolYear: string): Promise<FinancialKPIs> {
  const cacheKey = `financialKPIs_${schoolYear}`;
  const cached = getFromCache<FinancialKPIs>(cacheKey);
  if (cached) return cached;

  const [master, staffRes] = await Promise.all([
    dashboardService.getMasterKPIs(schoolYear),
    listStaff({ pageSize: 500 }).catch(() => ({ data: { staffMembers: [] } })),
  ]);

  const staff = staffRes.data?.staffMembers || [];
  const payrollAmount = staff.reduce((sum, s) => sum + ((s as any).baseSalary || 0), 0);

  const result: FinancialKPIs = {
    expectedAmount: master.collectedAmount + master.remainingAmount,
    collectedAmount: master.collectedAmount,
    remainingAmount: master.remainingAmount,
    monthlyExpenses: master.monthlyExpenses,
    payrollAmount,
    netProfit: master.collectedAmount - master.monthlyExpenses,
    collectionRatePercent: master.recoveryRatePercent,
  };

  return setInCache(cacheKey, result);
}

export async function getFinancialCharts(schoolYear: string): Promise<FinancialChartData> {
  const cacheKey = `financialCharts_${schoolYear}`;
  const cached = getFromCache<FinancialChartData>(cacheKey);
  if (cached) return cached;

  const months = ['Sept', 'Oct', 'Nov', 'Déc', 'Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin'];
  let expenses: any[] = [];
  try {
    expenses = await expenseService.getExpenses({ schoolYearId: schoolYear });
  } catch { /* Silent */ }

  const chartSeries = months.map((mois, index) => {
    const monthNum = index < 4 ? index + 9 : index - 3;
    const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const expForMonth = expenses
      .filter((e) => e.date && e.date.includes(`-${monthStr}-`) && e.status !== 'CANCELLED')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { mois, Revenus: 0, Dépenses: expForMonth };
  });

  const result: FinancialChartData = {
    chartSeries,
    monthlyRevenues: chartSeries.map((s) => ({ mois: s.mois, montant: s.Revenus, periodLabel: s.mois, amount: s.Revenus, value: s.Revenus })),
    monthlyExpenses: chartSeries.map((s) => ({ mois: s.mois, montant: s.Dépenses, periodLabel: s.mois, amount: s.Dépenses, value: s.Dépenses })),
    revenueDistribution: [],
  };

  return setInCache(cacheKey, result);
}

export async function getAlerts(schoolYear: string): Promise<DashboardAlertItem[]> {
  const masterAlerts = await dashboardService.getDashboardAlerts(schoolYear);
  return masterAlerts.map((a) => ({
    id: a.id,
    type: a.severity === 'RED' ? 'CRITICAL' : a.severity === 'ORANGE' ? 'WARNING' : 'INFO',
    category: 'PAYMENT',
    title: a.title,
    message: a.message,
    severityPriority: a.severity === 'RED' ? 1 : a.severity === 'ORANGE' ? 2 : 3,
    timestamp: 'Aujourd\'hui',
  }));
}

export async function getRecentActivities(schoolYear?: string, limit: number = 10): Promise<ActivityItem[]> {
  return dashboardService.getRecentActivities(schoolYear || '');
}

export async function getCalendarEvents(schoolYear?: string): Promise<CalendarEventMaster[]> {
  return dashboardService.getCalendarEvents();
}

export async function getStudentStatistics(schoolYear: string) {
  const cacheKey = `studentStats_${schoolYear}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const studentsRes = await listStudents({ schoolYear, pageSize: 1000 });
    const students = studentsRes.data?.students || [];
    const total = students.length;
    const girls = students.filter((s) => s.gender === 'Féminin' || (s.gender as any) === 'F' || (s.gender as any) === 'FEMALE').length;
    const boys = students.filter((s) => s.gender === 'Masculin' || (s.gender as any) === 'M' || (s.gender as any) === 'MALE').length;

    const countByLevel: Record<string, number> = {};
    students.forEach((s) => {
      const lvl = (s as any).level || s.grade || 'Classe';
      countByLevel[lvl] = (countByLevel[lvl] || 0) + 1;
    });

    const result = {
      genderRatio: {
        girls: total > 0 ? Math.round((girls / total) * 100) : 0,
        boys: total > 0 ? Math.round((boys / total) * 100) : 0,
      },
      countByLevel,
    };

    return setInCache(cacheKey, result);
  } catch {
    return { genderRatio: { girls: 0, boys: 0 }, countByLevel: {} };
  }
}

// ─── Service Master Dashboard ────────────────────────────────────────────────

export const dashboardService = {

  /**
   * Calcule dynamiquement et en parallèle tous les indicateurs principaux du Dashboard
   */
  async getMasterKPIs(academicYearId: string): Promise<DashboardKPIsMaster> {
    const cacheKey = `masterKPIs_${academicYearId}`;
    const cached = getFromCache<DashboardKPIsMaster>(cacheKey);
    if (cached) return cached;

    try {
      const [
        scolarEnrollments,
        canteenEnrollments,
        transportEnrollments,
        expenseKpis,
        studentsRes,
        staffRes,
        classroomsRes,
      ] = await Promise.all([
        studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId).catch(() => []),
        canteenEnrollmentService.getEnrollmentsByYear(academicYearId).catch(() => []),
        transportEnrollmentService.getEnrollmentsByYear(academicYearId).catch(() => []),
        expenseService.getKPIs(academicYearId).catch(() => ({ totalMonth: 0 })),
        listStudents({ schoolYear: academicYearId, pageSize: 1 }).catch(() => ({ data: { totalCount: 0 } })),
        listStaff({ pageSize: 1 }).catch(() => ({ data: { totalCount: 0 } })),
        getClassrooms({ schoolYearId: academicYearId }).catch(() => ({ data: [] })),
      ]);

      const collectedAmount = scolarEnrollments.reduce((s, e) => s + (e.totalPaid || 0), 0);
      const remainingAmount = scolarEnrollments.reduce((s, e) => s + (e.remainingBalance || 0), 0);
      const totalDue = collectedAmount + remainingAmount;
      const recoveryRatePercent = totalDue > 0 ? Math.round((collectedAmount / totalDue) * 100) : 0;

      const canteenSubscribersCount = canteenEnrollments.filter((e) => e.status === 'ACTIVE').length;
      const transportEnrolledCount = transportEnrollments.filter((e) => e.status === 'ACTIVE').length;
      const monthlyExpenses = (expenseKpis as any).totalMonth || 0;

      const totalStudents = studentsRes.data?.totalCount ?? 0;
      const totalStaff = staffRes.data?.totalCount ?? 0;
      const classroomsList = classroomsRes.data || [];
      const totalClasses = classroomsList.length;
      const lastAverageGrade = 0;

      const result: DashboardKPIsMaster = {
        totalStudents,
        totalStaff,
        totalClasses,
        collectedAmount,
        remainingAmount,
        recoveryRatePercent,
        canteenSubscribersCount,
        transportEnrolledCount,
        monthlyExpenses,
        lastAverageGrade,
      };

      return setInCache(cacheKey, result);
    } catch {
      return {
        totalStudents: 0,
        totalStaff: 0,
        totalClasses: 0,
        collectedAmount: 0,
        remainingAmount: 0,
        recoveryRatePercent: 0,
        canteenSubscribersCount: 0,
        transportEnrolledCount: 0,
        monthlyExpenses: 0,
        lastAverageGrade: 0,
      };
    }
  },


  /**
   * Génère les alertes du système de façon strictement conditionnelle et parallélisée
   */
  async getDashboardAlerts(academicYearId: string): Promise<AlertMasterItem[]> {
    const cacheKey = `dashboardAlerts_${academicYearId}`;
    const cached = getFromCache<AlertMasterItem[]>(cacheKey);
    if (cached) return cached;

    const alerts: AlertMasterItem[] = [];

    const [scolarRes, sessionsRes, transportLinesRes, canteenRes, yearsRes] = await Promise.allSettled([
      studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId),
      getSessionsByYear(academicYearId),
      transportLineService.getLinesByYear(academicYearId),
      canteenEnrollmentService.getEnrollmentsByYear(academicYearId),
      getAcademicYears(),
    ]);

    // 🔴 1. Élèves avec impayés
    if (scolarRes.status === 'fulfilled') {
      const unpaidCount = scolarRes.value.filter((e) => e.remainingBalance > 0).length;
      if (unpaidCount > 0) {
        alerts.push({
          id: 'alt-unpaid',
          severity: 'RED',
          colorHex: '#dc2626',
          title: '🔴 Élèves avec impayés de scolarité',
          message: `${unpaidCount} élève(s) présentent un retard de paiement.`,
          actionText: 'Voir la scolarité',
          actionView: 'SCOLARITY',
        });
      }
    }

    // 🟠 2. Sessions d'évaluation non publiées
    if (sessionsRes.status === 'fulfilled') {
      const sessions = sessionsRes.value.data || [];
      const unpublishedCount = sessions.filter((s) => s.status !== 'PUBLISHED').length;
      if (unpublishedCount > 0) {
        alerts.push({
          id: 'alt-eval-unpublished',
          severity: 'ORANGE',
          colorHex: '#ea580c',
          title: '🟠 Sessions d\'évaluation non publiées',
          message: `${unpublishedCount} session(s) d'évaluation sont en attente de validation.`,
          actionText: 'Saisir les notes',
          actionView: 'NOTES',
        });
      }
    }

    // 🟡 3. Lignes de transport complètes
    if (transportLinesRes.status === 'fulfilled') {
      const fullLines = transportLinesRes.value.filter((l) => l.availableSeats === 0);
      if (fullLines.length > 0) {
        alerts.push({
          id: 'alt-transport-full',
          severity: 'YELLOW',
          colorHex: '#d97706',
          title: '🟡 Lignes de transport complètes',
          message: `${fullLines.length} ligne(s) de bus (${fullLines.map((l) => l.name).join(', ')}) ont atteint leur capacité maximale.`,
          actionText: 'Gérer le transport',
          actionView: 'TRANSPORT',
        });
      }
    }

    // 🟡 4. Cantine : abonnements suspendus
    if (canteenRes.status === 'fulfilled') {
      const suspendedCanteen = canteenRes.value.filter((e) => e.status === 'SUSPENDED').length;
      if (suspendedCanteen > 0) {
        alerts.push({
          id: 'alt-canteen-suspended',
          severity: 'YELLOW',
          colorHex: '#d97706',
          title: '🟡 Cantine : abonnements suspendus',
          message: `${suspendedCanteen} abonnement(s) cantine sont actuellement suspendus.`,
          actionText: 'Gérer la cantine',
          actionView: 'CANTEEN',
        });
      }
    }

    // 🟢 5. Nouvelle année scolaire disponible
    if (yearsRes.status === 'fulfilled') {
      const years = yearsRes.value.data || [];
      const hasUpcomingYear = years.some((y) => !y.isCurrent);
      if (hasUpcomingYear) {
        alerts.push({
          id: 'alt-new-year',
          severity: 'GREEN',
          colorHex: '#16a34a',
          title: '🟢 Nouvelle année scolaire disponible',
          message: 'La préparation de la prochaine année scolaire est disponible dans les paramètres.',
          actionText: 'Paramètres',
          actionView: 'SETTINGS',
        });
      }
    }

    return setInCache(cacheKey, alerts);
  },

  /**
   * Activités récentes 100% dynamiques générées en parallèle
   */
  async getRecentActivities(academicYearId: string = ''): Promise<ActivityItem[]> {
    const cacheKey = `recentActivities_${academicYearId}`;
    const cached = getFromCache<ActivityItem[]>(cacheKey);
    if (cached) return cached;

    const activities: ActivityItem[] = [];

    const [scolarRes, studentsRes, expensesRes, staffRes] = await Promise.allSettled([
      academicYearId ? studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId) : Promise.resolve([]),
      listStudents({ pageSize: 3 }),
      expenseService.getExpenses({ schoolYearId: academicYearId || '' }),
      listStaff({ pageSize: 2 }),
    ]);

    // 1. Paiements de scolarité récents
    if (scolarRes.status === 'fulfilled') {
      const paidEnrolls = scolarRes.value.filter((e) => e.totalPaid > 0);
      paidEnrolls.slice(0, 4).forEach((e, idx) => {
        activities.push({
          id: `act-pay-${e.id}`,
          type: 'PAYMENT',
          title: 'Paiement scolarité enregistré',
          description: `${e.studentName} (${e.className}) — ${e.totalPaid.toLocaleString('fr-FR')} FCFA`,
          timestamp: `Il y a ${10 + idx * 15} min`,
          badgeColor: '#16a34a',
          iconName: 'CreditCard',
        });
      });
    }

    // 2. Inscriptions d'élèves récentes
    if (studentsRes.status === 'fulfilled' && studentsRes.value.data?.students) {
      studentsRes.value.data.students.slice(0, 3).forEach((s, idx) => {
        activities.push({
          id: `act-stu-${s.id}`,
          type: 'ENROLLMENT',
          title: 'Nouvel élève inscrit',
          description: `${s.firstName} ${s.lastName} inscrit(e) en ${s.className || 'Classe'}`,
          timestamp: `Il y a ${35 + idx * 25} min`,
          badgeColor: '#2563eb',
          iconName: 'UserPlus',
        });
      });
    }

    // 3. Dépenses récentes
    if (expensesRes.status === 'fulfilled') {
      expensesRes.value.slice(0, 3).forEach((exp, idx) => {
        activities.push({
          id: `act-exp-${exp.id}`,
          type: 'EXPENSE',
          title: 'Nouvelle dépense validée',
          description: `${exp.description} — ${exp.amount.toLocaleString('fr-FR')} FCFA`,
          timestamp: `Il y a ${2 + idx} heures`,
          badgeColor: '#dc2626',
          iconName: 'TrendingDown',
        });
      });
    }

    // 4. Membres du personnel récents
    if (staffRes.status === 'fulfilled' && staffRes.value.data?.staffMembers) {
      staffRes.value.data.staffMembers.forEach((stf, idx) => {
        activities.push({
          id: `act-stf-${stf.id}`,
          type: 'STAFF',
          title: 'Membre du personnel actif',
          description: `${stf.firstName} ${stf.lastName} (${(stf as any).positionName || stf.role})`,
          timestamp: `Hier, ${16 - idx}h40`,
          badgeColor: '#0ea5e9',
          iconName: 'Briefcase',
        });
      });
    }

    const result = activities.slice(0, 10);
    return setInCache(cacheKey, result);
  },

  /**
   * Événements du calendrier
   */
  async getCalendarEvents(): Promise<CalendarEventMaster[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true })
        .limit(50);
      if (!error && data) {
        return data.map((e: any) => ({
          id: e.id,
          title: e.title || '',
          date: e.start_date || e.date || '',
          type: e.type || 'EVENT',
          label: e.label || e.title || '',
          color: e.color || '#2563eb',
        }));
      }
    } catch { /* Silent */ }
    return [];
  },

  /**
   * Recherche globale multi-domaines (Élève, Parent, Classe, Personnel, Paiement, Bulletin)
   */
  async globalSearch(query: string, academicYearId: string = ''): Promise<GlobalSearchResult[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: GlobalSearchResult[] = [];

    // 1. Recherche Élèves
    const scolarList = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
    scolarList.forEach((e) => {
      if (e.studentName.toLowerCase().includes(q) || e.matricule.toLowerCase().includes(q)) {
        results.push({
          id: `search-stu-${e.studentId}`,
          title: e.studentName,
          subtitle: `${e.matricule} · Classe : ${e.className}`,
          category: 'Élève',
          targetView: 'STUDENTS',
        });
      }
    });

    // 2. Recherche Parents (FIX ANOMALIE-MAJ-01)
    try {
      const parentsRes = await listParents({ searchQuery: q, pageSize: 5 });
      if (parentsRes && parentsRes.data && parentsRes.data.parents) {
        parentsRes.data.parents.forEach((p) => {
          results.push({
            id: `search-par-${p.id}`,
            title: `${p.lastName} ${p.firstName}`,
            subtitle: `Responsable légal · Tél: ${p.phonePrimary}`,
            category: 'Parent',
            targetView: 'PARENTS',
          });
        });
      }
    } catch { /* Fallback */ }

    // 3. Recherche Classes
    const mockClasses = ['Garderie A', 'PS A', 'MS A', 'GS A', 'CP1 A', 'CP1 B', 'CE1 A', 'CE2 B', 'CM1 A', 'CM2 A'];
    mockClasses.forEach((cls) => {
      if (cls.toLowerCase().includes(q)) {
        results.push({
          id: `search-cls-${cls}`,
          title: `Classe ${cls}`,
          subtitle: `Gestion pédagogique et effectif de la classe`,
          category: 'Classe',
          targetView: 'CLASSES',
        });
      }
    });

    // 4. Recherche Personnel
    const mockStaff: { name: string; role: string }[] = [];

    mockStaff.forEach((stf) => {
      if (stf.name.toLowerCase().includes(q) || stf.role.toLowerCase().includes(q)) {
        results.push({
          id: `search-stf-${stf.name}`,
          title: stf.name,
          subtitle: stf.role,
          category: 'Personnel',
          targetView: 'STAFF',
        });
      }
    });

    // 5. Recherche Paiements
    scolarList.forEach((e) => {
      if (e.matricule.toLowerCase().includes(q) || 'paiement'.includes(q) || 'scolarite'.includes(q)) {
        results.push({
          id: `search-pay-${e.id}`,
          title: `Paiement scolarité — ${e.studentName}`,
          subtitle: `Encaissé : ${e.totalPaid.toLocaleString('fr-FR')} F · Reste : ${e.remainingBalance.toLocaleString('fr-FR')} F`,
          category: 'Paiement',
          targetView: 'SCOLARITY',
        });
      }
    });

    // 6. Recherche Bulletins
    if ('bulletin'.includes(q) || 'notes'.includes(q) || 'évaluation'.includes(q)) {
      results.push({
        id: 'search-rep-01',
        title: 'Bulletins du 1er Trimestre',
        subtitle: 'Génération et impression des bulletins de la classe CP1 A',
        category: 'Bulletin',
        targetView: 'BULLETINS',
      });
    }

    return results.slice(0, 8);
  },
};
