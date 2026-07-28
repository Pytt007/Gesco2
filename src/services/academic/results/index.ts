// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Results Module (Public Façade)
// src/services/academic/results/index.ts
// ─────────────────────────────────────────────────────────────────────────────

export {
  getResult,
  getResults,
  getStudentResults,
  getResultsBySession,
  getResultsByClass,
  saveDraft,
  submitForValidation,
  validateResult,
  publishResult,
  getCorrectionProgress,
  clearResultsCache,
} from './assessmentResultsService';

export {
  validateScoreInput,
  sanitizeScore,
} from './assessmentScoresService';

export type {
  CorrectionStatus,
  AbsenceStatus,
  AssessmentScore,
  AssessmentResult,
  CorrectionProgress,
  ScoreInput,
} from './types';
