// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Preschool Decision Module (src/services/academic/decision/preschoolDecision.ts)
// Règles de décision strictement réservées au cycle préscolaire.
// Règle d'or : Quelle que soit la moyenne/évaluation, la décision est TOUJOURS 'ACQUIS'.
// Interdiction absolue de proposer 'REDOUBLE'.
// ─────────────────────────────────────────────────────────────────────────────

import { DecisionEngineInput, DecisionEngineOutput, DecisionRule } from './types';

/** Noms et préfixes de niveaux associés au cycle préscolaire */
const PRESCHOOL_LEVEL_KEYWORDS = [
  'GARDERIE',
  'PTESECTION',
  'PETITE SECTION',
  'MOYSECTION',
  'MOYENNE SECTION',
  'GRDSECTION',
  'GRANDE SECTION',
  'PRESCOLAIRE',
  'PRESCHOOL',
  'PS',
  'MS',
  'GS',
];

/**
 * Détermine si un niveau ou un type d'évaluation correspond au cycle préscolaire.
 * @param level Nom du niveau (ex: 'Ptesection A', 'Garderie')
 * @param assessmentType Code type d'évaluation (ex: 'PRESCHOOL')
 */
export function isPreschoolLevel(level?: string | null, assessmentType?: string | null): boolean {
  if (assessmentType && assessmentType.toUpperCase() === 'PRESCHOOL') {
    return true;
  }
  if (!level) return false;
  const normalized = level.toUpperCase().trim();
  return PRESCHOOL_LEVEL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * Évalue la décision pédagogique pour un élève du préscolaire.
 * Règle d'or : Retourne impérativement 'ACQUIS' et interdit strictement 'REDOUBLE'.
 *
 * @param input Données de l'élève
 * @param matchingRule Règle de décision optionnelle associée
 */
export function evaluatePreschoolDecision(
  input: DecisionEngineInput,
  matchingRule?: DecisionRule | null
): DecisionEngineOutput {
  const warnings: string[] = [];

  if (input.average === null || input.average === undefined) {
    warnings.push('Évaluation préscolaire basée sur les compétences qualitatives.');
  }

  const defaultRule: DecisionRule = matchingRule || {
    id: 'rule-preschool-guarantee',
    code: 'RULE_PRESCHOOL_ACQUIS',
    assessmentTypeId: 'PRESCHOOL',
    levelId: null,
    minimumAverage: 0.00,
    maximumAverage: 20.00,
    minimumRank: null,
    maximumRank: null,
    decision: 'ACQUIS',
    description: 'Compétences du cycle préscolaire acquises (Pas de redoublement au préscolaire).',
    color: '#3b82f6',
    icon: 'award',
    sortOrder: 1,
    version: 1,
    isActive: true,
  };

  return {
    decision: 'ACQUIS',
    comment: 'Compétences et objectifs pédagogiques du préscolaire validés avec succès.',
    color: '#3b82f6',
    icon: 'award',
    ruleApplied: defaultRule,
    isValid: true,
    errors: [],
    warnings,
  };
}
