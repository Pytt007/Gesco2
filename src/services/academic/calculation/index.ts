// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Calculation Engine : Index (Exports publics)
// src/services/academic/calculation/index.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Façade principale (point d'entrée recommandé) ─────────────────────────────
export {
  calculate,
  validateInputs,
  isResultValid,
  formatAverage,
} from './calculationEngine';

// ── Types (réexportés depuis la façade) ───────────────────────────────────────
export type {
  AssessmentTemplate,
  SubjectGradeInput,
  CalculationResult,
  CalculationError,
  CalculationErrorCode,
  TemplateSubject,
  FormulaConfig,
  AssessmentTypeRules,
  SubjectResult,
  ScaleType,
  AssessmentMode,
  FormulaType,
  AbsenceStatus,
  PreschoolAppreciation,
  PrimaryAppreciation,
  CalculationOptions,
} from './calculationEngine';

// ── Sous-modules (accès avancé pour tests et extensions) ─────────────────────
export { executeFormula, detectFormulaType, isFormulaValid } from './formulaEngine';
export type { FormulaInput, FormulaResult } from './formulaEngine';

export {
  normalizeScore,
  scoreOn10ToOn20,
  computePercentage,
  isScoreInBounds,
} from './scoreNormalizer';
export type { NormalizationResult, NormalizationOptions } from './scoreNormalizer';

export {
  mapPrimaryAppreciation,
  mapPreschoolOverallAppreciation,
  isValidPreschoolAppreciation,
  getPreschoolAppreciationLabel,
  PRESCHOOL_APPRECIATION_VALUES,
  PRESCHOOL_APPRECIATION_LABELS,
  PRESCHOOL_APPRECIATION_ORDER,
} from './appreciationMapper';

export { buildResult } from './resultBuilder';
