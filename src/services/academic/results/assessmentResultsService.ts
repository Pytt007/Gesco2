// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Results Service (src/services/academic/results/assessmentResultsService.ts)
// Service principal de gestion des résultats, saisie des notes et avancement des corrections.
// Intègre la chaîne complète de l'Academic Engine :
//   Calculation Engine ➔ Ranking Engine ➔ Appreciation Engine ➔ Decision Engine
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { ServiceResponse } from '../academicYearsService';
import { getSession } from '../sessions/assessmentSessionsService';
import { mapPrimaryAppreciation, CalculationResult } from '../calculation';
import { rankEvaluations, StudentEvaluationInput } from '../ranking';
import { evaluateDecision } from '../decision';
import { validateScoreInput, sanitizeScore } from './assessmentScoresService';
import {
  AssessmentResult,
  AssessmentScore,
  CorrectionProgress,
  CorrectionStatus,
  ScoreInput,
} from './types';

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[assessmentResultsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

function mapRowToResult(row: any): AssessmentResult {
  return {
    id: row.id,
    assessmentSessionId: row.assessment_session_id,
    studentId: row.student_id,
    studentName: row.student_name,
    correctionStatus: row.correction_status as CorrectionStatus,
    isCompleted: Boolean(row.is_completed),
    total: row.total !== null ? Number(row.total) : null,
    average: row.average !== null ? Number(row.average) : null,
    rank: row.rank !== null ? Number(row.rank) : null,
    formattedRank: row.rank ? (row.rank === 1 ? '1er' : `${row.rank}ème`) : null,
    appreciation: row.appreciation ?? null,
    mention: row.mention ?? null,
    decision: row.decision ?? null,
    published: Boolean(row.published),
    validatedBy: row.validated_by ?? null,
    validatedAt: row.validated_at ?? null,
    scores: Array.isArray(row.assessment_scores)
      ? row.assessment_scores.map((s: any) => ({
          id: s.id,
          assessmentResultId: s.assessment_result_id,
          subjectId: s.subject_id,
          subjectName: s.subject_name,
          maxScore: s.max_score ? Number(s.max_score) : 20,
          status: s.status as CorrectionStatus,
          score: s.score !== null ? Number(s.score) : null,
          appreciation: s.appreciation ?? null,
          comment: s.comment ?? null,
          absenceStatus: s.absence_status ?? 'PRESENT',
          correctedBy: s.corrected_by ?? null,
          correctedAt: s.corrected_at ?? null,
          createdAt: s.created_at,
        }))
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Cache local des résultats d'évaluation */
const localResultsCache: Map<string, AssessmentResult> = new Map();

/**
 * Réinitialise le cache des résultats (utile pour les tests unitaires)
 */
export function clearResultsCache(): void {
  localResultsCache.clear();
}

/**
 * Récupère un résultat individuel par son ID.
 */
export async function getResult(id: string): Promise<ServiceResponse<AssessmentResult>> {
  try {
    if (!id) return createError(null, 'Identifiant de résultat requis.');

    const { data, error } = await supabase
      .from('assessment_results')
      .select('*, assessment_scores(*)')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const result = mapRowToResult(data);
      localResultsCache.set(id, result);
      return createSuccess(result);
    }

    const cached = localResultsCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Résultat introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur de récupération du résultat.');
  }
}

/**
 * Récupère les résultats d'une session d'évaluation.
 * @param sessionId Identifiant de la session
 */
export async function getResultsBySession(sessionId: string): Promise<ServiceResponse<AssessmentResult[]>> {
  try {
    if (!sessionId) return createError(null, 'Identifiant de session requis.');

    const { data: rows, error } = await supabase
      .from('assessment_results')
      .select('*, assessment_scores(*)')
      .eq('assessment_session_id', sessionId);

    if (!error && rows && rows.length > 0) {
      const list = rows.map(mapRowToResult);
      list.forEach((r) => localResultsCache.set(r.id, r));
      return createSuccess(list);
    }

    const cachedList = Array.from(localResultsCache.values()).filter(
      (r) => r.assessmentSessionId === sessionId
    );
    return createSuccess(cachedList);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des résultats de la session.');
  }
}

/**
 * Récupère les résultats d'une classe.
 */
export async function getResultsByClass(classroomId: string): Promise<ServiceResponse<AssessmentResult[]>> {
  return getResultsBySession(classroomId);
}

/**
 * Récupère l'historique des résultats d'un élève.
 */
export async function getStudentResults(studentId: string): Promise<ServiceResponse<AssessmentResult[]>> {
  try {
    if (!studentId) return createError(null, 'Identifiant élève requis.');

    const cachedList = Array.from(localResultsCache.values()).filter(
      (r) => r.studentId === studentId
    );
    return createSuccess(cachedList);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des résultats de l\'élève.');
  }
}

/**
 * Récupère les résultats filtrés.
 */
export async function getResults(filters: { sessionId?: string; studentId?: string } = {}): Promise<ServiceResponse<AssessmentResult[]>> {
  if (filters.sessionId) return getResultsBySession(filters.sessionId);
  if (filters.studentId) return getStudentResults(filters.studentId);
  return createSuccess(Array.from(localResultsCache.values()));
}

/**
 * SAUVEGARDE EN BROUILLON (saveDraft)
 * Enregistre les notes et exécute automatiquement la chaîne d'intégration Academic Engine :
 * Calculation Engine ➔ Ranking Engine ➔ Appreciation Engine ➔ Decision Engine
 */
export async function saveDraft(
  sessionId: string,
  studentId: string,
  scoresInputs: ScoreInput[],
  level = 'CP1',
  assessmentType = 'MONTHLY'
): Promise<ServiceResponse<AssessmentResult>> {
  try {
    if (!sessionId || !studentId) {
      return createError(null, 'La session et l\'élève sont obligatoires.');
    }

    // 1. Vérification session verrouillée
    const sessionRes = await getSession(sessionId);
    if (sessionRes.success && sessionRes.data && sessionRes.data.locked) {
      return createError(null, 'La session est verrouillée. Modification des notes interdite.');
    }

    // 2. Recherche du résultat existant
    const existingListRes = await getResultsBySession(sessionId);
    const existingResult = existingListRes.data?.find((r) => r.studentId === studentId);

    if (existingResult && existingResult.published) {
      return createError(null, 'Impossible de modifier un résultat déjà publié.');
    }

    const resultId = existingResult?.id || crypto.randomUUID();

    // 3. Validation des bornes
    for (const input of scoresInputs) {
      const valRes = validateScoreInput(input);
      if (!valRes.success) {
        return createError(null, valRes.error);
      }
    }

    // 4. Structuration des scores par matière
    const newScores: AssessmentScore[] = scoresInputs.map((input) => {
      const existingScore = existingResult?.scores.find((s) => s.subjectId === input.subjectId);
      return sanitizeScore(input, resultId, existingScore?.id);
    });

    const allScored = newScores.length > 0 && newScores.every((s) => s.score !== null || s.absenceStatus !== 'PRESENT');
    const anyScored = newScores.some((s) => s.score !== null || s.absenceStatus !== 'PRESENT');

    let status: CorrectionStatus = 'IN_PROGRESS';
    if (!anyScored) status = 'NOT_STARTED';
    else if (allScored) status = 'COMPLETED';

    const draftResult: AssessmentResult = {
      id: resultId,
      assessmentSessionId: sessionId,
      studentId,
      correctionStatus: status,
      isCompleted: allScored,
      total: null,
      average: null,
      rank: null,
      formattedRank: null,
      appreciation: null,
      decision: null,
      published: false,
      scores: newScores,
      createdAt: existingResult?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localResultsCache.set(resultId, draftResult);

    // 5. Recalcul automatique (Calculation + Ranking + Decision Engine)
    await recalculateSessionResults(sessionId, level, assessmentType);

    const finalUpdated = localResultsCache.get(resultId) || draftResult;

    // 6. Persistance Supabase — table assessment_results (colonnes réelles: session_id, student_id, score)
    try {
      if (supabase) {
        // Calculer la moyenne pour la colonne score
        const scoredItems = finalUpdated.scores.filter((s) => s.score !== null);
        const avgScore = scoredItems.length > 0
          ? Number((scoredItems.reduce((acc, s) => acc + (s.score ?? 0), 0) / scoredItems.length).toFixed(2))
          : 0;

        const dbRow = {
          id: resultId,
          session_id: sessionId || null,
          student_id: studentId || null,
          score: avgScore,
          comment: finalUpdated.appreciation || null,
          is_absent: finalUpdated.scores.some((s) => s.absenceStatus === 'ABSENT'),
        };

        const { error: dbErr } = await supabase.from('assessment_results').upsert(dbRow, { onConflict: 'id' });
        if (dbErr) console.warn('[assessmentResultsService] Supabase upsert warning:', dbErr.message);
      }
    } catch (dbErr) {
      console.warn('[assessmentResultsService] Supabase persist fallback:', dbErr);
    }

    return createSuccess(finalUpdated, 'Brouillon sauvegardé et résultats recalculés.');
  } catch (err) {
    return createError(err, 'Erreur lors de la sauvegarde du brouillon.');
  }
}

/**
 * Soumet les notes d'un élève pour validation (statut COMPLETED).
 */
export async function submitForValidation(resultId: string): Promise<ServiceResponse<AssessmentResult>> {
  try {
    const res = await getResult(resultId);
    if (!res.success || !res.data) return createError(null, 'Résultat introuvable.');

    if (res.data.published) {
      return createError(null, 'Résultat déjà publié.');
    }

    const updated: AssessmentResult = {
      ...res.data,
      correctionStatus: 'COMPLETED',
      isCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    localResultsCache.set(resultId, updated);
    return createSuccess(updated, 'Résultat soumis pour validation.');
  } catch (err) {
    return createError(err, 'Erreur lors de la soumission.');
  }
}

/**
 * Valide un résultat individuel (statut VALIDATED).
 */
export async function validateResult(
  resultId: string,
  validatorName = 'Direction'
): Promise<ServiceResponse<AssessmentResult>> {
  try {
    const res = await getResult(resultId);
    if (!res.success || !res.data) return createError(null, 'Résultat introuvable.');

    const updated: AssessmentResult = {
      ...res.data,
      correctionStatus: 'VALIDATED',
      validatedBy: validatorName,
      validatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localResultsCache.set(resultId, updated);
    return createSuccess(updated, 'Résultat validé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la validation.');
  }
}

/**
 * Publie les résultats d'une session.
 * Vérifie qu me aucune copie n'est non validée et que la session n'est pas verrouillée.
 */
export async function publishResult(resultId: string): Promise<ServiceResponse<AssessmentResult>> {
  try {
    const res = await getResult(resultId);
    if (!res.success || !res.data) return createError(null, 'Résultat introuvable.');

    const sessionRes = await getSession(res.data.assessmentSessionId);
    if (sessionRes.success && sessionRes.data && sessionRes.data.locked) {
      return createError(null, 'La session est verrouillée.');
    }

    const allResultsRes = await getResultsBySession(res.data.assessmentSessionId);
    const unvalidated = allResultsRes.data?.filter(
      (r) => r.correctionStatus !== 'VALIDATED' && r.correctionStatus !== 'PUBLISHED'
    );

    if (unvalidated && unvalidated.length > 0) {
      return createError(
        null,
        `Impossible de publier : ${unvalidated.length} copie(s) ne sont pas encore validées par la direction.`
      );
    }

    const updated: AssessmentResult = {
      ...res.data,
      correctionStatus: 'PUBLISHED',
      published: true,
      updatedAt: new Date().toISOString(),
    };

    localResultsCache.set(resultId, updated);
    return createSuccess(updated, 'Résultat publié.');
  } catch (err) {
    return createError(err, 'Erreur lors de la publication.');
  }
}

/**
 * Calcule l'avancement global des corrections pour une session donnée.
 */
export async function getCorrectionProgress(sessionId: string): Promise<ServiceResponse<CorrectionProgress>> {
  try {
    if (!sessionId) return createError(null, 'Identifiant de session requis.');

    const res = await getResultsBySession(sessionId);
    const results = res.data || [];

    const totalStudents = results.length;
    const completedCount = results.filter(
      (r) => r.correctionStatus === 'COMPLETED' || r.correctionStatus === 'VALIDATED' || r.correctionStatus === 'PUBLISHED'
    ).length;
    const inProgressCount = results.filter((r) => r.correctionStatus === 'IN_PROGRESS').length;
    const notStartedCount = results.filter((r) => r.correctionStatus === 'NOT_STARTED').length;
    const validatedCount = results.filter((r) => r.correctionStatus === 'VALIDATED' || r.correctionStatus === 'PUBLISHED').length;

    const percentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

    return createSuccess({
      assessmentSessionId: sessionId,
      totalStudents,
      completedCount,
      inProgressCount,
      notStartedCount,
      validatedCount,
      percentage,
    });
  } catch (err) {
    return createError(err, 'Erreur lors du calcul de la progression.');
  }
}

/**
 * Helper interne déclenchant automatiquement :
 * Calculation Engine ➔ Ranking Engine ➔ Appreciation Engine ➔ Decision Engine
 */
async function recalculateSessionResults(
  sessionId: string,
  level: string,
  assessmentType: string
): Promise<void> {
  const allResults = Array.from(localResultsCache.values()).filter(
    (r) => r.assessmentSessionId === sessionId
  );

  if (allResults.length === 0) return;

  const studentInputs: StudentEvaluationInput[] = [];

  for (const r of allResults) {
    let totalObtained = 0;
    let validScoreCount = 0;
    let hasAbsence = false;

    for (const scoreObj of r.scores) {
      if (scoreObj.absenceStatus === 'ABSENT' || scoreObj.absenceStatus === 'EXCUSED_ABSENT') {
        hasAbsence = true;
      } else if (scoreObj.score !== null) {
        totalObtained += scoreObj.score;
        validScoreCount++;
      }
    }

    const average = validScoreCount > 0 ? Number((totalObtained / validScoreCount).toFixed(2)) : null;
    const appreciationText = average !== null ? mapPrimaryAppreciation(average, 'SCORE_20') : 'Non évalué';

    (r as any)._calcTotal = totalObtained;
    (r as any)._calcAverage = average;
    (r as any)._calcAppreciation = appreciationText;

    const calcResult: CalculationResult = {
      average: average,
      totalObtained: totalObtained,
      totalMaximum: Math.max(20, r.scores.length * 20),
      resultScale: 'SCORE_20',
      appreciation: appreciationText as any,
      subjectResults: r.scores.map((s, idx) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName || s.subjectId,
        displayOrder: idx + 1,
        grade: s.score,
        appreciation: null,
        weightedScore: s.score,
        maximumScore: s.maxScore ?? 20,
        coefficient: 1,
        absenceStatus: s.absenceStatus === 'ABSENT' ? 'ABSENT' : s.absenceStatus === 'EXCUSED_ABSENT' ? 'EXCUSED' : 'PRESENT',
        assessmentMode: 'GRADE',
        isRequired: true,
        warnings: [],
      })),
      formulaUsed: 'AVERAGE',
      errors: [],
      warnings: [],
      isValid: true,
    };

    studentInputs.push({
      studentId: r.studentId,
      studentName: r.studentName,
      calculationResult: calcResult,
    });
  }

  // 2. Ranking Engine : Calcul des rangs
  const isPreschool = ['Garderie', 'Ptesection', 'Moysection', 'Grdsection', 'PS', 'MS', 'GS'].includes(level);
  const rankingRes = rankEvaluations(
    {
      assessmentTypeCode: assessmentType,
      rankingEnabled: !isPreschool,
      rankingStrategy: 'STANDARD',
    },
    studentInputs
  );

  const rankedMap = new Map<string, { rank: number | null; formattedRank: string | null }>();
  if (rankingRes && rankingRes.rankedStudents) {
    for (const rItem of rankingRes.rankedStudents) {
      rankedMap.set(rItem.studentId, {
        rank: rItem.rank,
        formattedRank: rItem.formattedRank,
      });
    }
  }

  // 3. Decision Engine : Évaluation des décisions pédagogiques
  for (const r of allResults) {
    const avg = (r as any)._calcAverage;
    const rankInfo = rankedMap.get(r.studentId);

    const decisionRes = await evaluateDecision({
      average: avg,
      rank: rankInfo?.rank ?? null,
      level,
      assessmentType,
      academicYear: (r as any).academicYearId || '',
      studentId: r.studentId,
    });

    const updated: AssessmentResult = {
      ...r,
      total: (r as any)._calcTotal,
      average: avg,
      rank: rankInfo?.rank ?? null,
      formattedRank: rankInfo?.formattedRank ?? (rankInfo?.rank ? `${rankInfo.rank}ème` : null),
      appreciation: (r as any)._calcAppreciation,
      decision: decisionRes.decision,
      updatedAt: new Date().toISOString(),
    };

    localResultsCache.set(r.id, updated);
  }
}
