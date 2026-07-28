// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Ranking Engine (Moteur de Classement Académique)
// src/services/academic/ranking/rankingEngine.ts
//
// Moteur autonome de calcul des classements académiques.
// Indépendant du Calculation Engine (consomme ses résultats).
//
// Architecture :
//   UI ➔ Hooks ➔ Services ➔ Ranking Engine ➔ Calculation Engine ➔ Database
//
// Règles d'or :
//   - Pureté (aucun appel Supabase / aucun effet de bord).
//   - Déterministe & facilement testable.
//   - Stratégies extensibles sans modifier le moteur (Standard, Dense, Competition, Custom).
//   - Préscolaire (PRESCHOOL) et types non classés : strictement aucun classement produit.
//   - Performance : O(n log n) pour des classes jusqu'à 100+ élèves.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationMetadata,
  StudentEvaluationInput,
  RankedStudentResult,
  RankingEngineResult,
  RankingError,
} from './types';
import { RankingStrategyRegistry } from './rankingStrategies';
import type { ScoreEntry } from './rankingStrategies';
import { formatRankFrench, detectTieGroups } from './tieResolver';
import { computeRankingStatistics } from './rankingStatistics';

// ─── Re-exports publics ───────────────────────────────────────────────────────
export type {
  EvaluationMetadata,
  StudentEvaluationInput,
  RankedStudentResult,
  RankingStatistics,
  RankingError,
  RankingEngineResult,
  RankingStrategyType,
} from './types';

// ─── API Principale ───────────────────────────────────────────────────────────

/**
 * Calcule le classement global et les statistiques d'une évaluation pour une classe.
 *
 * @param evaluationInfo - Métadonnées de l'évaluation (type, stratégie, statut d'activation).
 * @param students       - Résultats de calcul des élèves issus du CalculationEngine.
 * @returns RankingEngineResult complet contenant les rangs et les statistiques de classe.
 *
 * @example
 * const result = rankEvaluations(
 *   { assessmentTypeCode: 'MONTHLY', rankingStrategy: 'STANDARD' },
 *   [
 *     { studentId: 'e1', calculationResult: { average: 15.5, ... } },
 *     { studentId: 'e2', calculationResult: { average: 15.5, ... } },
 *     { studentId: 'e3', calculationResult: { average: 12.0, ... } },
 *   ]
 * );
 * // result.rankedStudents[0].formattedRank -> "1er ex"
 * // result.rankedStudents[1].formattedRank -> "1er ex"
 * // result.rankedStudents[2].formattedRank -> "3ème"
 *
 * @example
 * // Préscolaire -> Aucun classement généré
 * const psResult = rankEvaluations(
 *   { assessmentTypeCode: 'PRESCHOOL' },
 *   [ { studentId: 'e1', calculationResult: { average: null, ... } } ]
 * );
 * // psResult.isRanked -> false
 * // psResult.rankedStudents[0].rank -> null
 */
export function rankEvaluations(
  evaluationInfo: EvaluationMetadata,
  students: StudentEvaluationInput[],
): RankingEngineResult {
  const errors: RankingError[] = [];
  const warnings: string[] = [];

  // ── 1. Validations initiales ──────────────────────────────────────────────
  if (!evaluationInfo || !evaluationInfo.assessmentTypeCode) {
    errors.push({
      code: 'INVALID_METADATA',
      message: 'Métadonnées de l\'évaluation absentes ou code type manquant.',
    });
    return buildUnrankedResult(evaluationInfo, students, errors, warnings);
  }

  if (!students || students.length === 0) {
    warnings.push('Aucun élève fourni pour le classement.');
    return buildEmptyResult(evaluationInfo, warnings);
  }

  // Vérification des doublons de studentId
  const seenIds = new Set<string>();
  for (const s of students) {
    if (seenIds.has(s.studentId)) {
      errors.push({
        code: 'DUPLICATE_STUDENT_ID',
        message: `L'élève "${s.studentId}" apparaît plusieurs fois dans la liste.`,
        studentId: s.studentId,
      });
    }
    seenIds.add(s.studentId);
  }

  // ── 2. Vérification règle Préscolaire / Classement Désactivé ─────────────
  const isPreschool = evaluationInfo.assessmentTypeCode === 'PRESCHOOL';
  const isRankingDisabled = evaluationInfo.rankingEnabled === false || isPreschool;

  if (isRankingDisabled) {
    const reason = isPreschool
      ? 'Évaluation préscolaire : aucun classement numérique.'
      : 'Classement désactivé pour ce type d\'évaluation.';
    warnings.push(reason);

    const rankedStudents: RankedStudentResult[] = students.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      average: s.calculationResult.average,
      rank: null,
      formattedRank: '—',
      isExAequo: false,
      exAequoCount: 0,
      isRanked: false,
      unrankedReason: reason,
      calculationResult: s.calculationResult,
    }));

    const statistics = computeRankingStatistics(students, rankedStudents, []);

    return {
      evaluationInfo,
      rankedStudents,
      totalRankedStudents: 0,
      statistics,
      isRanked: false,
      strategyUsed: evaluationInfo.rankingStrategy ?? 'STANDARD',
      errors,
      warnings,
    };
  }

  // ── 3. Filtrage des élèves classables (moyenne numérique valide) ───────────
  const rankableEntries: ScoreEntry[] = [];
  const unrankableMap = new Map<string, string>(); // studentId -> reason

  for (const s of students) {
    const avg = s.calculationResult?.average;
    if (avg === null || avg === undefined || isNaN(avg)) {
      unrankableMap.set(s.studentId, 'Moyenne générale absente ou non calculée.');
    } else {
      rankableEntries.push({
        studentId: s.studentId,
        score: avg,
      });
    }
  }

  // ── 4. Tri par moyenne décroissante : O(n log n) ─────────────────────────
  rankableEntries.sort((a, b) => b.score - a.score);

  // ── 5. Récupération et application de la stratégie de classement ──────────
  const strategyType = evaluationInfo.rankingStrategy ?? 'STANDARD';
  const strategy = RankingStrategyRegistry.getStrategy(strategyType);

  const ranksMap = strategy.calculateRanks(rankableEntries);
  const tieGroups = detectTieGroups(rankableEntries, ranksMap);

  // Indexation rapide des entrées élèves par studentId
  const studentMap = new Map<string, StudentEvaluationInput>(
    students.map((s) => [s.studentId, s]),
  );

  // ── 6. Construction des résultats individuels ──────────────────────────────
  const rankedStudents: RankedStudentResult[] = [];

  // d'abord ajouter les élèves classés dans l'ordre du classement
  for (const entry of rankableEntries) {
    const student = studentMap.get(entry.studentId)!;
    const calcRank = ranksMap.get(entry.studentId)!;

    rankedStudents.push({
      studentId: student.studentId,
      studentName: student.studentName,
      average: entry.score,
      rank: calcRank.rank,
      formattedRank: formatRankFrench(calcRank.rank, calcRank.isExAequo, student.gender),
      isExAequo: calcRank.isExAequo,
      exAequoCount: calcRank.exAequoCount,
      isRanked: true,
      calculationResult: student.calculationResult,
    });
  }

  // puis ajouter les élèves non classés à la fin
  for (const student of students) {
    if (unrankableMap.has(student.studentId)) {
      const reason = unrankableMap.get(student.studentId)!;
      rankedStudents.push({
        studentId: student.studentId,
        studentName: student.studentName,
        average: student.calculationResult?.average ?? null,
        rank: null,
        formattedRank: '—',
        isExAequo: false,
        exAequoCount: 0,
        isRanked: false,
        unrankedReason: reason,
        calculationResult: student.calculationResult,
      });
    }
  }

  // ── 7. Calcul des statistiques ─────────────────────────────────────────────
  const statistics = computeRankingStatistics(students, rankedStudents, tieGroups);

  return {
    evaluationInfo,
    rankedStudents,
    totalRankedStudents: rankableEntries.length,
    statistics,
    isRanked: true,
    strategyUsed: strategy.code,
    errors,
    warnings,
  };
}

// ─── Helpers internes d'erreur / cas vides ────────────────────────────────────

/** @internal */
function buildEmptyResult(
  evaluationInfo: EvaluationMetadata,
  warnings: string[],
): RankingEngineResult {
  return {
    evaluationInfo,
    rankedStudents: [],
    totalRankedStudents: 0,
    statistics: {
      totalStudents: 0,
      totalRanked: 0,
      totalUnranked: 0,
      highestAverage: null,
      lowestAverage: null,
      classAverage: null,
      medianAverage: null,
      presentCount: 0,
      absentCount: 0,
      excusedCount: 0,
      exAequoGroupsCount: 0,
    },
    isRanked: false,
    strategyUsed: evaluationInfo?.rankingStrategy ?? 'STANDARD',
    errors: [],
    warnings,
  };
}

/** @internal */
function buildUnrankedResult(
  evaluationInfo: EvaluationMetadata,
  students: StudentEvaluationInput[],
  errors: RankingError[],
  warnings: string[],
): RankingEngineResult {
  const rankedStudents: RankedStudentResult[] = (students || []).map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    average: s.calculationResult?.average ?? null,
    rank: null,
    formattedRank: '—',
    isExAequo: false,
    exAequoCount: 0,
    isRanked: false,
    unrankedReason: 'Données d\'évaluation ou métadonnées invalides.',
    calculationResult: s.calculationResult,
  }));

  const statistics = computeRankingStatistics(students || [], rankedStudents, []);

  return {
    evaluationInfo: evaluationInfo || { assessmentTypeCode: 'UNKNOWN' },
    rankedStudents,
    totalRankedStudents: 0,
    statistics,
    isRanked: false,
    strategyUsed: evaluationInfo?.rankingStrategy ?? 'STANDARD',
    errors,
    warnings,
  };
}
