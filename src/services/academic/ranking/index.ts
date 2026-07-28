// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Ranking Engine Module (Exports publics)
// src/services/academic/ranking/index.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Façade principale (Point d'entrée recommandé) ─────────────────────────────
export { rankEvaluations } from './rankingEngine';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  EvaluationMetadata,
  StudentEvaluationInput,
  RankedStudentResult,
  RankingStatistics,
  RankingError,
  RankingEngineResult,
  RankingStrategyType,
} from './types';

// ── Stratégies et Registre ───────────────────────────────────────────────────
export {
  RankingStrategyRegistry,
  StandardRankingStrategy,
  DenseRankingStrategy,
  CompetitionRankingStrategy,
  CustomRankingStrategy,
} from './rankingStrategies';
export type {
  IRankingStrategy,
  ScoreEntry,
  CalculatedRank,
} from './rankingStrategies';

// ── Helpers ───────────────────────────────────────────────────────────────────
export { formatRankFrench, detectTieGroups, resolveRanks } from './tieResolver';
export type { TieGroup } from './tieResolver';

export { computeRankingStatistics } from './rankingStatistics';
