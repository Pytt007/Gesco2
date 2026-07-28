// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Ranking Statistics
// src/services/academic/ranking/rankingStatistics.ts
//
// Calcul des statistiques globales de la classe pour une évaluation.
// Module pur sans effet de bord.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  StudentEvaluationInput,
  RankedStudentResult,
  RankingStatistics,
} from './types';
import type { TieGroup } from './tieResolver';

/**
 * Arrondit un nombre à N décimales.
 * @internal
 */
function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calcule la médiane d'un tableau de nombres trié.
 * @internal
 */
function computeMedian(sortedNumbers: number[]): number | null {
  if (sortedNumbers.length === 0) return null;
  const mid = Math.floor(sortedNumbers.length / 2);
  if (sortedNumbers.length % 2 !== 0) {
    return roundToTwo(sortedNumbers[mid]);
  }
  return roundToTwo((sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2);
}

/**
 * Calcule l'ensemble des statistiques de la classe pour une évaluation.
 *
 * @param inputs         - Liste brute des entrées des élèves.
 * @param rankedResults  - Résultats individuels de classement.
 * @param tieGroups      - Groupes d'ex æquo détectés.
 * @returns RankingStatistics complet.
 *
 * @example
 * const stats = computeRankingStatistics(inputs, rankedResults, tieGroups);
 * // stats.classAverage -> 12.45
 * // stats.medianAverage -> 12.50
 * // stats.presentCount -> 25
 */
export function computeRankingStatistics(
  inputs: StudentEvaluationInput[],
  rankedResults: RankedStudentResult[],
  tieGroups: TieGroup[],
): RankingStatistics {
  const totalStudents = inputs.length;

  // Filtrer les élèves ayant une moyenne valide et classés
  const rankedAverages: number[] = [];
  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  for (const input of inputs) {
    const calc = input.calculationResult;

    // Déterminer la présence globale à partir des résultats ou du statut global
    const globalStatus = input.globalAbsenceStatus;
    if (globalStatus === 'EXCUSED') {
      excusedCount++;
    } else if (globalStatus === 'ABSENT') {
      absentCount++;
    } else {
      // Analyser si au moins une matière a été notée ou si c'est un calcul valide
      const hasSubjectAbsences = calc.subjectResults.some(
        (s) => s.absenceStatus === 'ABSENT' || s.absenceStatus === 'EXCUSED',
      );

      if (hasSubjectAbsences && calc.subjectResults.every((s) => s.absenceStatus === 'EXCUSED')) {
        excusedCount++;
      } else if (hasSubjectAbsences && calc.subjectResults.every((s) => s.absenceStatus === 'ABSENT')) {
        absentCount++;
      } else {
        presentCount++;
      }
    }
  }

  // Extraire les moyennes valides des élèves classés
  for (const r of rankedResults) {
    if (r.isRanked && r.average !== null && !isNaN(r.average)) {
      rankedAverages.push(r.average);
    }
  }

  const totalRanked = rankedAverages.length;
  const totalUnranked = totalStudents - totalRanked;

  if (totalRanked === 0) {
    return {
      totalStudents,
      totalRanked: 0,
      totalUnranked: totalStudents,
      highestAverage: null,
      lowestAverage: null,
      classAverage: null,
      medianAverage: null,
      presentCount,
      absentCount,
      excusedCount,
      exAequoGroupsCount: 0,
    };
  }

  // Trier les moyennes pour max, min, et médiane (du plus petit au plus grand)
  const sortedAverages = [...rankedAverages].sort((a, b) => a - b);
  const lowestAverage = sortedAverages[0];
  const highestAverage = sortedAverages[sortedAverages.length - 1];

  const sumAverages = sortedAverages.reduce((acc, val) => acc + val, 0);
  const classAverage = roundToTwo(sumAverages / totalRanked);
  const medianAverage = computeMedian(sortedAverages);

  return {
    totalStudents,
    totalRanked,
    totalUnranked,
    highestAverage: roundToTwo(highestAverage),
    lowestAverage: roundToTwo(lowestAverage),
    classAverage,
    medianAverage,
    presentCount,
    absentCount,
    excusedCount,
    exAequoGroupsCount: tieGroups.length,
  };
}
