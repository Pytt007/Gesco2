// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Scores Service (src/services/academic/results/assessmentScoresService.ts)
// Service de gestion fine et de validation des notes par matière.
// ─────────────────────────────────────────────────────────────────────────────

import { ServiceResponse } from '../academicYearsService';
import { AssessmentScore, ScoreInput, AbsenceStatus } from './types';

/**
 * Valide la conformité d'une note saisie par rapport au barème et au statut d'absence.
 * @param input ScoreInput à valider
 * @param defaultMaxScore Barème par défaut si non spécifié (défaut = 20)
 */
export function validateScoreInput(
  input: ScoreInput,
  defaultMaxScore = 20
): ServiceResponse<boolean> {
  const max = input.maxScore ?? defaultMaxScore;

  // 1. Validation de présence
  const absence = input.absenceStatus ?? 'PRESENT';
  if (absence === 'ABSENT' || absence === 'EXCUSED_ABSENT') {
    return { success: true, data: true };
  }

  // 2. Si présent, vérifier si la note est fournie
  if (input.score === null || input.score === undefined) {
    return { success: true, data: true };
  }

  // 3. Empêcher les notes négatives
  if (input.score < 0) {
    return {
      success: false,
      error: `La note ne peut pas être négative (valeur saisie : ${input.score}).`,
    };
  }

  // 4. Empêcher une note supérieure au barème
  if (input.score > max) {
    return {
      success: false,
      error: `La note (${input.score}) dépasse le barème maximum autorisé (${max}).`,
    };
  }

  return { success: true, data: true };
}

/**
 * Normalise un objet AssessmentScore avant enregistrement.
 */
export function sanitizeScore(
  input: ScoreInput,
  resultId: string,
  existingScoreId?: string
): AssessmentScore {
  const max = input.maxScore ?? 20;
  const absence = input.absenceStatus ?? 'PRESENT';

  let finalScore: number | null = input.score ?? null;
  if (absence === 'ABSENT' || absence === 'EXCUSED_ABSENT') {
    finalScore = null;
  } else if (finalScore !== null) {
    finalScore = Math.min(Math.max(0, finalScore), max);
  }

  return {
    id: existingScoreId || crypto.randomUUID(),
    assessmentResultId: resultId,
    subjectId: input.subjectId,
    maxScore: max,
    status: finalScore !== null || absence !== 'PRESENT' ? 'COMPLETED' : 'IN_PROGRESS',
    score: finalScore,
    appreciation: input.appreciation ?? null,
    comment: input.comment ?? null,
    absenceStatus: absence,
    correctedBy: null,
    correctedAt: finalScore !== null ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  };
}
