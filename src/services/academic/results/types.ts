// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Results Module Types
// src/services/academic/results/types.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Statuts de correction des copies et résultats */
export type CorrectionStatus =
  | 'NOT_STARTED' // Non commencé
  | 'IN_PROGRESS' // Saisie en cours
  | 'COMPLETED'   // Saisie terminée / soumis pour validation
  | 'VALIDATED'   // Validé par la direction ou le responsable pédagogique
  | 'PUBLISHED';  // Publié / disponible sur les bulletins et bilans

/** Statuts de présence d'un élève à une épreuve/matière */
export type AbsenceStatus =
  | 'PRESENT'        // Présent
  | 'ABSENT'         // Absent non justifié
  | 'EXCUSED_ABSENT' // Absent justifié
  | 'DISPENSED';      // Dispensé (ex: EPS)

/** Note individuelle par matière pour un élève */
export interface AssessmentScore {
  id: string;
  assessmentResultId: string;
  subjectId: string;
  subjectName?: string;
  maxScore?: number;      // Barème maximum (ex: 10, 20, 50)
  status: CorrectionStatus;
  score: number | null;   // Note numérique (null si absent ou non corrigé)
  appreciation?: string | null;
  comment?: string | null;
  absenceStatus: AbsenceStatus;
  correctedBy?: string | null;
  correctedAt?: string | null;
  createdAt?: string;
}

/** Résultat d'évaluation global d'un élève pour une session */
export interface AssessmentResult {
  id: string;
  assessmentSessionId: string;
  studentId: string;
  studentName?: string;
  correctionStatus: CorrectionStatus;
  isCompleted: boolean;
  total: number | null;      // Total des points obtenus
  average: number | null;    // Moyenne générale (/10 ou /20)
  rank: number | null;       // Rang dans la classe
  formattedRank?: string | null; // Rang formaté (ex: "1er ex", "3ème")
  appreciation: string | null;   // Appréciation générale
  mention?: string | null;       // Mention attribuée (ex: "Très Bien")
  decision: string | null;       // Décision pédagogique (PASSE, REDOUBLE, ACQUIS...)
  published: boolean;
  validatedBy?: string | null;
  validatedAt?: string | null;
  scores: AssessmentScore[];
  createdAt?: string;
  updatedAt?: string;
}

/** Statistiques de progression de correction pour une classe / session */
export interface CorrectionProgress {
  classroomId?: string;
  classroomName?: string;
  assessmentSessionId: string;
  sessionTitle?: string;
  totalStudents: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  validatedCount: number;
  percentage: number; // Pourcentage d'avancement des copies corrigées (0 - 100%)
}

/** Input de mise à jour/saisie rapide d'une note par matière */
export interface ScoreInput {
  subjectId: string;
  score: number | null;
  absenceStatus?: AbsenceStatus;
  appreciation?: string;
  comment?: string;
  maxScore?: number;
}
