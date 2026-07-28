// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Primary Decision Module (src/services/academic/decision/primaryDecision.ts)
// Logique d'évaluation des décisions pour le cycle primaire (CP1 à CM2).
// Piloté intégralement par les règles configurées en base de données.
// ─────────────────────────────────────────────────────────────────────────────

import { DecisionEngineInput, DecisionEngineOutput, DecisionRule, DecisionType } from './types';

/**
 * Évalue la décision pour un élève du primaire (CP1 à CM2) en fonction des règles fournies.
 *
 * @param input Données d'évaluation de l'élève (moyenne, rang, niveau, type d'évaluation)
 * @param rules Liste des règles actives
 */
export function evaluatePrimaryDecision(
  input: DecisionEngineInput,
  rules: DecisionRule[]
): DecisionEngineOutput {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Cas sans moyenne (élève absent ou non évalué)
  if (input.average === null || input.average === undefined || isNaN(input.average)) {
    return {
      decision: 'EN_ATTENTE',
      comment: 'Décision en attente : moyenne générale non calculée ou élève absent.',
      color: '#6b7280',
      icon: 'clock',
      ruleApplied: null,
      isValid: true,
      errors: [],
      warnings: ['Élève sans moyenne générale.'],
    };
  }

  const avg = input.average;
  const rank = input.rank ?? null;

  // 2. Filtrage des règles applicables par niveau et type d'évaluation
  const matchingRules = rules.filter((rule) => {
    if (!rule.isActive) return false;

    // Filtre par niveau si défini dans la règle
    if (rule.levelId && rule.levelId.toLowerCase() !== input.level.toLowerCase()) {
      return false;
    }

    // Filtre par type d'évaluation si défini dans la règle
    if (rule.assessmentTypeId && rule.assessmentTypeId.toLowerCase() !== input.assessmentType.toLowerCase()) {
      return false;
    }

    // Filtre par plage de moyenne [minimumAverage, maximumAverage]
    // Utilisation de 0.0001 de tolérance pour éviter les erreurs d'arrondi flottant (ex: 9.99 vs 10.00)
    if (avg < rule.minimumAverage - 0.0001 || avg > rule.maximumAverage + 0.0001) {
      return false;
    }

    // Filtre par plage de rang si définie dans la règle
    if (rank !== null && rank !== undefined) {
      if (rule.minimumRank !== null && rule.minimumRank !== undefined && rank < rule.minimumRank) {
        return false;
      }
      if (rule.maximumRank !== null && rule.maximumRank !== undefined && rank > rule.maximumRank) {
        return false;
      }
    }

    return true;
  });

  // 3. Tri des règles correspondantes par spécificité (niveau > type d'évaluation > sortOrder)
  matchingRules.sort((a, b) => {
    const specA = (a.levelId ? 2 : 0) + (a.assessmentTypeId ? 1 : 0);
    const specB = (b.levelId ? 2 : 0) + (b.assessmentTypeId ? 1 : 0);
    if (specA !== specB) return specB - specA; // Spécificité décroissante
    return a.sortOrder - b.sortOrder;           // Ordre de priorité croissant
  });

  // 4. Si une règle correspond
  if (matchingRules.length > 0) {
    const selectedRule = matchingRules[0];
    const comment = selectedRule.description || buildDefaultComment(selectedRule.decision, avg);

    return {
      decision: selectedRule.decision,
      comment,
      color: selectedRule.color,
      icon: selectedRule.icon,
      ruleApplied: selectedRule,
      isValid: true,
      errors,
      warnings,
    };
  }

  // 5. Aucune règle trouvée en base → Fallback dynamique et warning
  warnings.push(`Aucune règle de décision explicite trouvée en base pour la moyenne ${avg}/20 (Niveau: ${input.level}).`);

  let fallbackDecision: DecisionType = 'PASSE';
  let fallbackColor = '#10b981';
  let fallbackIcon = 'check-circle';

  if (avg >= 10.00) {
    fallbackDecision = 'PASSE';
    fallbackColor = '#10b981';
    fallbackIcon = 'check-circle';
  } else {
    fallbackDecision = 'REDOUBLE';
    fallbackColor = '#ef4444';
    fallbackIcon = 'alert-triangle';
  }

  return {
    decision: fallbackDecision,
    comment: buildDefaultComment(fallbackDecision, avg),
    color: fallbackColor,
    icon: fallbackIcon,
    ruleApplied: null,
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * Construit un commentaire automatique si aucun texte personnalisé n'est fourni.
 */
function buildDefaultComment(decision: DecisionType, average: number): string {
  switch (decision) {
    case 'PASSE':
      return `Admis en classe supérieure avec une moyenne générale de ${average.toFixed(2)}/20.`;
    case 'REDOUBLE':
      return `Proposé au redoublement (moyenne générale de ${average.toFixed(2)}/20 insuffisante).`;
    case 'AJOURNÉ':
      return `Résultat ajourné (moyenne générale de ${average.toFixed(2)}/20 à confirmer).`;
    case 'ACQUIS':
      return `Compétences fondamentales validées (${average.toFixed(2)}/20).`;
    case 'EN_ATTENTE':
      return 'Évaluation en attente de délibération.';
    default:
      return `Décision : ${decision} (${average.toFixed(2)}/20).`;
  }
}
