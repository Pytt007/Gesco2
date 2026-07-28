// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Decision Engine (src/services/academic/decision/decisionEngine.ts)
// Façade principale de calcul de la décision pédagogique.
// ─────────────────────────────────────────────────────────────────────────────

import { DecisionEngineInput, DecisionEngineOutput, DecisionRule } from './types';
import { getDecisionRules, validateDecisionRules } from './decisionRules';
import { isPreschoolLevel, evaluatePreschoolDecision } from './preschoolDecision';
import { evaluatePrimaryDecision } from './primaryDecision';

/**
 * Calcule la décision pédagogique finale d'un élève.
 *
 * @param input - Données de l'élève (moyenne, rang, niveau, type d'évaluation, année scolaire)
 * @param rulesOverride - Optionnel : Liste de règles à utiliser (pour tests ou simulation sans DB)
 * @returns DecisionEngineOutput structuré avec décision, commentaire, couleur, icône et règles appliquées.
 *
 * @example
 * const result = await evaluateDecision({
 *   average: 14.50,
 *   rank: 3,
 *   assessmentType: 'MONTHLY',
 *   level: 'CP1',
 *   academicYear: '2026-2027',
 * });
 * // result.decision -> 'PASSE'
 */
export async function evaluateDecision(
  input: DecisionEngineInput,
  rulesOverride?: DecisionRule[]
): Promise<DecisionEngineOutput> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validation de l'input
  if (!input) {
    return {
      decision: 'NON_APPLICABLE',
      comment: 'Entrée invalide : données d\'évaluation absentes.',
      color: '#9ca3af',
      icon: 'slash',
      ruleApplied: null,
      isValid: false,
      errors: ['Données d\'entrée du Decision Engine nulles ou indéfinies.'],
      warnings: [],
    };
  }

  if (!input.level || !input.assessmentType) {
    return {
      decision: 'NON_APPLICABLE',
      comment: 'Entrée incomplète : le niveau et le type d\'évaluation sont obligatoires.',
      color: '#9ca3af',
      icon: 'slash',
      ruleApplied: null,
      isValid: false,
      errors: ['Le niveau et le type d\'évaluation doivent être renseignés.'],
      warnings: [],
    };
  }

  // 2. Chargement et validation des règles
  const rules = rulesOverride || (await getDecisionRules());
  const validation = validateDecisionRules(rules);

  if (!validation.isValid) {
    for (const err of validation.errors) {
      warnings.push(`[Erreur Règle DB]: ${err.message}`);
    }
  }
  for (const warn of validation.warnings) {
    warnings.push(warn);
  }

  // 3. Traitement spécifique PRÉSCOLAIRE
  if (isPreschoolLevel(input.level, input.assessmentType)) {
    const matchingRule = rules.find(
      (r) => r.decision === 'ACQUIS' && r.isActive
    );
    const preschoolResult = evaluatePreschoolDecision(input, matchingRule);
    return {
      ...preschoolResult,
      errors: [...errors, ...preschoolResult.errors],
      warnings: [...warnings, ...preschoolResult.warnings],
    };
  }

  // 4. Traitement spécifique PRIMAIRE (CP1 à CM2)
  const primaryResult = evaluatePrimaryDecision(input, rules);

  return {
    ...primaryResult,
    errors: [...errors, ...primaryResult.errors],
    warnings: [...warnings, ...primaryResult.warnings],
  };
}

/**
 * Traite un lot d'élèves pour une évaluation globale de classe.
 * @param inputs Liste des entrées d'élèves
 * @param rulesOverride Optionnel : règles surchargées
 */
export async function evaluateBatchDecisions(
  inputs: DecisionEngineInput[],
  rulesOverride?: DecisionRule[]
): Promise<DecisionEngineOutput[]> {
  const rules = rulesOverride || (await getDecisionRules());
  return Promise.all(inputs.map((input) => evaluateDecision(input, rules)));
}
