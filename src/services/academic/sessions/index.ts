// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Sessions Module (Public Façade)
// src/services/academic/sessions/index.ts
// ─────────────────────────────────────────────────────────────────────────────

export {
  searchSessions,
  getSessions,
  getSession,
  createSession,
  updateSession,
  lockSession,
  unlockSession,
  publishSession,
  archiveSession,
  duplicateSession,
  getSessionsByClass,
  getSessionsByYear,
  getSessionsByType,
  clearSessionsCache,
} from './assessmentSessionsService';

export type {
  AssessmentSessionStatus,
  AssessmentSession,
  AssessmentSessionFilters,
  AssessmentSessionListResult,
} from './types';
