// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Sessions Module Types
// src/services/academic/sessions/types.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statuts possibles d'une session d'évaluation
 */
export type AssessmentSessionStatus =
  | 'DRAFT'      // Brouillon (en préparation)
  | 'OPEN'       // Ouverte (saisie des notes autorisée)
  | 'CLOSED'     // Clôturée (saisie terminée)
  | 'PUBLISHED'  // Publiée (bulletins, classement & statistiques actifs)
  | 'ARCHIVED';  // Archivée (lecture seule, historique)

/**
 * Représentation d'une session d'évaluation réelle
 */
export interface AssessmentSession {
  id: string;
  academicYearId: string;
  assessmentTypeId: string;
  assessmentPeriodId?: string | null;
  assessmentTemplateId?: string | null;
  classroomId: string;
  classroomName?: string;
  title: string;
  description?: string | null;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;   // ISO YYYY-MM-DD
  status: AssessmentSessionStatus;
  locked: boolean;   // true = modification des notes, suppression et ajout d'élèves interdits
  published: boolean;// true = bulletins et classements définitifs autorisés
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filtres applicables pour la recherche de sessions d'évaluation
 */
export interface AssessmentSessionFilters {
  academicYearId?: string;
  assessmentTypeId?: string;
  assessmentPeriodId?: string;
  classroomId?: string;
  status?: AssessmentSessionStatus | 'all';
  locked?: boolean | 'all';
  published?: boolean | 'all';
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'startDate' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Structure de résultat paginé pour les sessions d'évaluation
 */
export interface AssessmentSessionListResult {
  sessions: AssessmentSession[];
  totalCount: number;
  page: number;
  totalPages: number;
}
