/**
 * GESCO — Types du Centre des Rapports
 */

export type ReportCategory =
  | 'PEDAGOGY'
  | 'FINANCE'
  | 'STUDENTS'
  | 'STAFF'
  | 'CANTEEN'
  | 'TRANSPORT';

export interface ReportCategoryDefinition {
  key: ReportCategory;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const REPORT_CATEGORIES: ReportCategoryDefinition[] = [
  { key: 'PEDAGOGY',  label: 'Pédagogie',  emoji: '🎓', description: 'Résultats, classements, moyennes et bulletins', color: '#2563eb' },
  { key: 'FINANCE',   label: 'Finances',   emoji: '💰', description: 'Recettes, dépenses, créances et bilans',       color: '#16a34a' },
  { key: 'STUDENTS',  label: 'Élèves',     emoji: '👨‍🎓', description: 'Effectifs, niveaux, inscrits et archives',    color: '#0ea5e9' },
  { key: 'STAFF',     label: 'Personnel',  emoji: '👨‍🏫', description: 'Enseignants, administration et salaires',       color: '#9333ea' },
  { key: 'CANTEEN',   label: 'Cantine',    emoji: '🍽', description: 'Abonnés, paiements, repas et menus',           color: '#f59e0b' },
  { key: 'TRANSPORT', label: 'Transport',  emoji: '🚌', description: 'Lignes, élèves transportés et règlements',     color: '#dc2626' },
];

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: string;
  isFavorite?: boolean;
  requiresClass?: boolean;
  requiresPeriod?: boolean;
}

export interface ReportFilterState {
  academicYearId: string;
  classId?: string;
  levelCode?: string;
  period?: string;
  assessmentType?: string;
  searchQuery?: string;
}

export interface GeneratedReportSummary {
  label: string;
  value: string;
  color?: string;
}

export interface GeneratedReportContent {
  reportId: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  academicYear: string;
  summaryCards: GeneratedReportSummary[];
  headers: string[];
  rows: (string | number)[][];
}
