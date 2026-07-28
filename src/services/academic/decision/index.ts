// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Decision Engine Module (Public Façade)
// src/services/academic/decision/index.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Point d'entrée principal ─────────────────────────────────────────────────
export { evaluateDecision, evaluateBatchDecisions } from './decisionEngine';

// ── Moteur de Recommandation de Promotion ────────────────────────────────────
export {
  recommendPromotion,
  recommendBatchPromotions,
  LEVEL_PROGRESSION_MAP,
} from './promotionEngine';

// ── Gestion et Validation des Règles DB ─────────────────────────────────────
export {
  getDecisionRules,
  validateDecisionRules,
  clearRulesCache,
  setCachedRules,
  DEFAULT_DECISION_RULES,
} from './decisionRules';
export type { RuleValidationError, ValidationResult } from './decisionRules';

// ── Moteurs Spécifiques par Cycle ────────────────────────────────────────────
export { isPreschoolLevel, evaluatePreschoolDecision } from './preschoolDecision';
export { evaluatePrimaryDecision } from './primaryDecision';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  DecisionType,
  DecisionRule,
  DecisionEngineInput,
  DecisionEngineOutput,
  PromotionAction,
  PromotionRecommendation,
} from './types';
