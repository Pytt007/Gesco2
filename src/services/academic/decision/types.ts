// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Decision Engine Module Types
// src/services/academic/decision/types.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensembles des décisions pédagogiques finales supportées par GESCO
 */
export type DecisionType =
  | 'ACQUIS'
  | 'PASSE'
  | 'REDOUBLE'
  | 'AJOURNÉ'
  | 'EN_ATTENTE'
  | 'NON_APPLICABLE';

/**
 * Structure d'une règle de décision stockée en base de données
 */
export interface DecisionRule {
  id: string;
  code: string;
  assessmentTypeId?: string | null;
  levelId?: string | null;
  minimumAverage: number;
  maximumAverage: number;
  minimumRank?: number | null;
  maximumRank?: number | null;
  decision: DecisionType;
  description?: string | null;
  color: string;
  icon: string;
  sortOrder: number;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Données d'entrée soumises au Decision Engine
 */
export interface DecisionEngineInput {
  /** Moyenne générale calculée (null si absent ou non évalué) */
  average: number | null;
  /** Rang calculé (optionnel, null si absent ou préscolaire) */
  rank?: number | null;
  /** Code du type d'évaluation (ex: 'MONTHLY', 'IEP', 'MOCK_EXAM', 'PRESCHOOL') */
  assessmentType: string;
  /** Code ou nom du niveau de classe (ex: 'Garderie', 'CP1', 'CE2', 'CM2') */
  level: string;
  /** Année scolaire de référence (ex: '2026-2027') */
  academicYear: string;
  /** Identifiant de l'élève (optionnel) */
  studentId?: string;
  /** Nom complet de l'élève (optionnel) */
  studentName?: string;
}

/**
 * Résultat retourné par le Decision Engine
 */
export interface DecisionEngineOutput {
  /** Décision pédagogique attribuée */
  decision: DecisionType;
  /** Commentaire ou justification textuelle explicative */
  comment: string;
  /** Code couleur hexadécimal ou CSS de la décision */
  color: string;
  /** Nom de l'icône associée (ex: 'check-circle', 'alert-triangle', 'award') */
  icon: string;
  /** Règle ayant servi à déterminer la décision (null si fallback ou erreur) */
  ruleApplied: DecisionRule | null;
  /** Indique si le calcul de la décision s'est déroulé sans erreur critique */
  isValid: boolean;
  /** Liste des erreurs survenues lors de l'évaluation */
  errors: string[];
  /** Liste des avertissements (ex: règle par défaut utilisée, absence de notes) */
  warnings: string[];
}

/**
 * Recommandations d'actions pour le Promotion Engine
 */
export type PromotionAction =
  | 'PROMOTION'           // Passage en classe supérieure
  | 'REDOUBLEMENT'        // Maintien dans la même classe
  | 'GRADUATION_ARCHIVE'  // Fin de cycle primaire (Ex: Sortie CM2)
  | 'PENDING'             // Décision en attente de validation / rattrapage
  | 'NONE';               // Aucune action nécessaire

/**
 * Résultat produit par le Promotion Engine
 */
export interface PromotionRecommendation {
  /** Identifiant de l'élève */
  studentId: string;
  /** Niveau actuel de l'élève */
  currentLevel: string;
  /** Décision pédagogique d'origine */
  decision: DecisionType;
  /** Action recommandée */
  action: PromotionAction;
  /** Niveau cible recommandé pour l'année suivante (null si archivage/redoublement) */
  targetLevel: string | null;
  /** Justification détaillée de la recommandation de promotion */
  explanation: string;
}
