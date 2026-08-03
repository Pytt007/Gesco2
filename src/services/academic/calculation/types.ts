// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Calculation Engine : Types Partagés
// src/services/academic/calculation/types.ts
//
// Tous les types utilisés dans le moteur de calcul.
// Aucune logique métier ici — uniquement des contrats de données.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Échelles de notation ─────────────────────────────────────────────────────

/** Échelle de notation supportée par le moteur. */
export type ScaleType = 'APPRECIATION' | 'SCORE_10' | 'SCORE_20';

/** Mode de saisie d'une note pour une matière. */
export type AssessmentMode = 'GRADE' | 'APPRECIATION';

/** Type de formule de calcul. */
export type FormulaType =
  | 'AVERAGE'       // Moyenne simple = SUM / count
  | 'SUM'           // Somme brute
  | 'SUM_DIVISOR'   // SUM / diviseur explicite (ex: /9, /10)
  | 'SUM_MULTIPLIER'// (SUM / max) × multiplicateur (ex: /170 × 20)
  | 'APPRECIATION'  // Moteur d'appréciation préscolaire
  | 'CUSTOM';       // Expression personnalisée interprétée

// ─── Statuts d'absence ────────────────────────────────────────────────────────

/** Statut de présence/absence d'un élève pour une matière ou une évaluation. */
export type AbsenceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'EXCUSED_ABSENT' | 'DISPENSED';

// ─── Entrée du moteur ─────────────────────────────────────────────────────────

/** Matière appartenant au modèle d'évaluation, telle que lue depuis la BD. */
export interface TemplateSubject {
  subjectId: string;
  subjectName: string;
  displayOrder: number;
  maximumScore: number;
  coefficient: number;
  assessmentMode: AssessmentMode;
  isRequired: boolean;
}

/** Formule de calcul associée à un modèle, telle que lue depuis la BD. */
export interface FormulaConfig {
  id: string;
  code: string;
  name: string;
  /** Expression lisible par le moteur. Ex: 'SUM(grades)/9' ou '(SUM(coeff*grade)/170)*20'. */
  formulaExpression: string;
  resultScale: ScaleType;
  version: number;
}

/** Modèle d'évaluation complet transmis au moteur. */
export interface AssessmentTemplate {
  id: string;
  code: string;
  name: string;
  assessmentTypeCode: string;  // 'PRESCHOOL' | 'MONTHLY' | 'IEP' | 'MOCK_EXAM'
  levelCode: string;           // 'PS' | 'CP1' | 'CM2' etc.
  subjects: TemplateSubject[];
  formula: FormulaConfig;
  /** Règles issues de assessment_type_rules. */
  rules: AssessmentTypeRules;
}

/** Règles métier du type d'évaluation (pilotées par la BD). */
export interface AssessmentTypeRules {
  generatesRanking: boolean;
  generatesAverage: boolean;
  affectsPromotion: boolean;
  allowsAbsenceStatus: boolean;
  allowsExcusedAbsence: boolean;
  unlimitedOccurrences: boolean;
}

// ─── Notes saisies ────────────────────────────────────────────────────────────

/** Note saisie par le professeur pour une matière et un élève. */
export interface SubjectGradeInput {
  subjectId: string;
  /** Note numérique. NULL si APPRECIATION ou si absent. */
  grade: number | null;
  /** Appréciation préscolaire. NULL si mode GRADE. */
  appreciation: PreschoolAppreciation | null;
  /** Statut d'absence de l'élève pour cette matière. */
  absenceStatus: AbsenceStatus;
}

/** Appréciations qualitatives préscolaires. */
export type PreschoolAppreciation = 'TB' | 'B' | 'AB' | 'P' | 'I';

// ─── Sortie du moteur ─────────────────────────────────────────────────────────

/** Résultat détaillé par matière. */
export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  displayOrder: number;
  grade: number | null;
  appreciation: PreschoolAppreciation | null;
  weightedScore: number | null;      // grade × coefficient
  maximumScore: number;
  coefficient: number;
  absenceStatus: AbsenceStatus;
  assessmentMode: AssessmentMode;
  isRequired: boolean;
  /** Avertissements éventuels pour cette matière (note manquante, dépassement…). */
  warnings: string[];
}

/** Appréciation primaire calculée depuis la moyenne. */
export type PrimaryAppreciation =
  | 'Excellent travail'
  | 'Bon travail'
  | 'Travail satisfaisant'
  | 'Résultats passables'
  | 'Travail insuffisant';

/** Résultat global retourné par le Calculation Engine. */
export interface CalculationResult {
  /** Somme pondérée des notes (coeff × grade). */
  totalObtained: number;
  /** Somme pondérée maximale théorique. */
  totalMaximum: number;
  /** Moyenne calculée selon la formule du modèle. */
  average: number | null;
  /** Échelle du résultat (SCORE_10 / SCORE_20 / APPRECIATION). */
  resultScale: ScaleType;
  /** Appréciation globale qualitative (préscolaire ou primaire). */
  appreciation: PreschoolAppreciation | PrimaryAppreciation | null;
  /** Résultats matière par matière. */
  subjectResults: SubjectResult[];
  /** Formule utilisée. */
  formulaUsed: string;
  /** Erreurs bloquantes détectées (ex: note > barème). */
  errors: CalculationError[];
  /** Avertissements non bloquants. */
  warnings: string[];
  /** Indique si le calcul a pu être réalisé malgré d'éventuels avertissements. */
  isValid: boolean;
}

// ─── Erreurs ──────────────────────────────────────────────────────────────────

export type CalculationErrorCode =
  | 'GRADE_EXCEEDS_MAXIMUM'
  | 'GRADE_NEGATIVE'
  | 'REQUIRED_SUBJECT_MISSING'
  | 'FORMULA_MISSING'
  | 'TEMPLATE_MISSING'
  | 'INVALID_FORMULA_EXPRESSION'
  | 'SUBJECT_NOT_IN_TEMPLATE'
  | 'INCONSISTENT_DATA'
  | 'APPRECIATION_INVALID';

/** Erreur structurée produite par le moteur. */
export interface CalculationError {
  code: CalculationErrorCode;
  message: string;
  subjectId?: string;
  subjectName?: string;
}
