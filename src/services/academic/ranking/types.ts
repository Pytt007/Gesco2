// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Ranking Engine : Types Partagés
// src/services/academic/ranking/types.ts
//
// Tous les types et contrats du moteur de classement.
// Purement déclaratif.
// ─────────────────────────────────────────────────────────────────────────────

import type { CalculationResult, AbsenceStatus } from '../calculation';

/** Stratégies de classement disponibles. */
export type RankingStrategyType = 'STANDARD' | 'DENSE' | 'COMPETITION' | 'CUSTOM';

/** Métadonnées de l'évaluation transmises au Ranking Engine. */
export interface EvaluationMetadata {
  /** Identifiant unique de l'évaluation (optionnel). */
  evaluationId?: string;
  /** Code du type d'évaluation : 'PRESCHOOL' | 'MONTHLY' | 'IEP' | 'MOCK_EXAM' etc. */
  assessmentTypeCode: string;
  /** Titre ou libellé de l'évaluation. */
  title?: string;
  /** Indique si le classement est activé pour ce type (provenant de assessment_type_rules). */
  rankingEnabled?: boolean;
  /** Stratégie de classement à utiliser (défaut : 'STANDARD'). */
  rankingStrategy?: RankingStrategyType;
}

/** Entrée individuelle pour un élève transmis au moteur. */
export interface StudentEvaluationInput {
  /** Identifiant unique de l'élève. */
  studentId: string;
  /** Nom et prénom de l'élève (optionnel pour l'affichage). */
  studentName?: string;
  /** Genre de l'élève (optionnel, pour l'accord grammatical du rang '1ère' / '1er'). */
  gender?: 'M' | 'F';
  /** Statut global d'absence pour l'évaluation complète (optionnel). */
  globalAbsenceStatus?: AbsenceStatus;
  /** Résultat académique calculé par le CalculationEngine. */
  calculationResult: CalculationResult;
}

/** Résultat de classement pour un élève. */
export interface RankedStudentResult {
  studentId: string;
  studentName?: string;
  average: number | null;
  /** Rang numérique (1-based). NULL si non classé (préscolaire, absent général, etc.). */
  rank: number | null;
  /** Rang formaté en français (ex: "1er", "1ère", "2ème", "1er ex", "3ème ex"). */
  formattedRank: string;
  /** Vrai si l'élève est en ex æquo avec au moins un autre élève. */
  isExAequo: boolean;
  /** Nombre total d'élèves partageant exactement ce même rang. */
  exAequoCount: number;
  /** Vrai si l'élève a été pris en compte dans le classement. */
  isRanked: boolean;
  /** Motif de non-classement (ex: "Préscolaire non classé", "Moyenne absente", "Absent à l'évaluation"). */
  unrankedReason?: string;
  /** Copie du résultat de calcul. */
  calculationResult: CalculationResult;
}

/** Statistiques globales de la classe pour l'évaluation. */
export interface RankingStatistics {
  /** Nombre total d'élèves dans la classe. */
  totalStudents: number;
  /** Nombre d'élèves ayant un rang attribué. */
  totalRanked: number;
  /** Nombre d'élèves non classés. */
  totalUnranked: number;
  /** Meilleure moyenne de la classe. NULL si aucun classé. */
  highestAverage: number | null;
  /** Plus faible moyenne de la classe. NULL si aucun classé. */
  lowestAverage: number | null;
  /** Moyenne générale de la classe (somme des moyennes / totalRanked). */
  classAverage: number | null;
  /** Médiane des moyennes de la classe. */
  medianAverage: number | null;
  /** Nombre d'élèves présents (au moins une matière notée/présente). */
  presentCount: number;
  /** Nombre d'élèves absents non justifiés. */
  absentCount: number;
  /** Nombre d'élèves absents justifiés. */
  excusedCount: number;
  /** Nombre de groupes d'ex æquo (ex: si 2 élèves 1er et 3 élèves 4ème = 2 groupes). */
  exAequoGroupsCount: number;
}

/** Erreur structurée du moteur de classement. */
export interface RankingError {
  code:
    | 'EMPTY_EVALUATION'
    | 'PRESCHOOL_NOT_RANKED'
    | 'INVALID_METADATA'
    | 'DUPLICATE_STUDENT_ID'
    | 'MISSING_AVERAGE'
    | 'UNKNOWN_STRATEGY';
  message: string;
  studentId?: string;
}

/** Résultat complet retourné par le RankingEngine. */
export interface RankingEngineResult {
  /** Métadonnées transmises. */
  evaluationInfo: EvaluationMetadata;
  /** Liste des élèves avec rangs attribués. */
  rankedStudents: RankedStudentResult[];
  /** Nombre total d'élèves ayant un rang. */
  totalRankedStudents: number;
  /** Statistiques globales de la classe. */
  statistics: RankingStatistics;
  /** Vrai si l'évaluation autorise et a produit un classement. */
  isRanked: boolean;
  /** Stratégie de classement appliquée. */
  strategyUsed: RankingStrategyType;
  /** Erreurs rencontrées. */
  errors: RankingError[];
  /** Avertissements non bloquants. */
  warnings: string[];
}
