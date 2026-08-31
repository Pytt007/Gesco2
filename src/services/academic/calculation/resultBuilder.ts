// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Result Builder
// src/services/academic/calculation/resultBuilder.ts
//
// Construit le résultat final complet à partir des sorties intermédiaires
// du FormulaEngine et de l'AppreciationMapper.
// Ce module est pur : pas d'effet de bord, déterministe.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssessmentTemplate,
  SubjectGradeInput,
  SubjectResult,
  CalculationResult,
  CalculationError,
  CalculationErrorCode,
  AbsenceStatus,
} from './types';
import type { FormulaInput } from './formulaEngine';
import { executeFormula, isFormulaValid } from './formulaEngine';
import {
  mapPrimaryAppreciation,
  mapPreschoolOverallAppreciation,
  isValidPreschoolAppreciation,
} from './appreciationMapper';
import { isScoreInBounds } from './scoreNormalizer';

// ─── Constructeurs d'erreurs et avertissements ────────────────────────────────

/** @internal */
function makeError(
  code: CalculationErrorCode,
  message: string,
  subjectId?: string,
  subjectName?: string,
): CalculationError {
  return { code, message, subjectId, subjectName };
}

// ─── Fonctions utilitaires privées ────────────────────────────────────────────

/**
 * Détermine si un élève est considéré comme absent (ABSENT ou EXCUSED).
 * @internal
 */
function isAbsent(status: AbsenceStatus): boolean {
  return status === 'ABSENT' || status === 'EXCUSED';
}

/**
 * Construit la liste de SubjectResult à partir du template et des notes saisies.
 * Gère les absences, les validations de barème, les matières manquantes.
 *
 * @internal
 */
function buildSubjectResults(
  template: AssessmentTemplate,
  gradeInputs: SubjectGradeInput[],
): {
  subjectResults: SubjectResult[];
  errors: CalculationError[];
  warnings: string[];
  formulaInput: FormulaInput;
} {
  const errors: CalculationError[] = [];
  const warnings: string[] = [];
  const subjectResults: SubjectResult[] = [];

  // Indexer les notes saisies par subjectId pour un accès O(1)
  const inputMap = new Map<string, SubjectGradeInput>(
    gradeInputs.map((g) => [g.subjectId, g]),
  );

  const weightedGrades: number[] = [];
  const weightedMaximums: number[] = [];
  const rawGrades: number[] = [];
  let subjectCount = 0;

  for (const tplSubject of template.subjects) {
    const input = inputMap.get(tplSubject.subjectId);
    const subjectWarnings: string[] = [];

    // ── Matière manquante dans les entrées ────────────────────────────────────
    if (!input) {
      if (tplSubject.isRequired) {
        errors.push(
          makeError(
            'REQUIRED_SUBJECT_MISSING',
            `La matière "${tplSubject.subjectName}" est obligatoire et n'a pas été saisie.`,
            tplSubject.subjectId,
            tplSubject.subjectName,
          ),
        );
      } else {
        warnings.push(
          `La matière optionnelle "${tplSubject.subjectName}" n'a pas été saisie et sera ignorée.`,
        );
      }
      continue;
    }

    const { grade, appreciation, absenceStatus } = input;
    const absent = isAbsent(absenceStatus);

    // ── Mode APPRECIATION (Préscolaire) ───────────────────────────────────────
    if (tplSubject.assessmentMode === 'APPRECIATION') {
      if (!absent) {
        if (appreciation === null || appreciation === undefined) {
          if (tplSubject.isRequired) {
            errors.push(
              makeError(
                'REQUIRED_SUBJECT_MISSING',
                `L'appréciation de "${tplSubject.subjectName}" est obligatoire.`,
                tplSubject.subjectId,
                tplSubject.subjectName,
              ),
            );
          }
        } else if (!isValidPreschoolAppreciation(appreciation)) {
          errors.push(
            makeError(
              'APPRECIATION_INVALID',
              `Valeur d'appréciation invalide "${appreciation}" pour "${tplSubject.subjectName}". Valeurs attendues : TB, B, AB, P, I.`,
              tplSubject.subjectId,
              tplSubject.subjectName,
            ),
          );
        }
      }

      subjectResults.push({
        subjectId: tplSubject.subjectId,
        subjectName: tplSubject.subjectName,
        displayOrder: tplSubject.displayOrder,
        grade: null,
        appreciation: absent ? null : appreciation,
        weightedScore: null,
        maximumScore: tplSubject.maximumScore,
        coefficient: tplSubject.coefficient,
        absenceStatus,
        assessmentMode: 'APPRECIATION',
        isRequired: tplSubject.isRequired,
        warnings: subjectWarnings,
      });
      subjectCount++;
      continue;
    }

    // ── Mode GRADE (Numérique) ────────────────────────────────────────────────
    const isExcusedOrDispensed =
      absenceStatus === 'EXCUSED' ||
      absenceStatus === 'EXCUSED_ABSENT' ||
      absenceStatus === 'DISPENSED';

    const isUnexcused = absenceStatus === 'ABSENT';

    if (isExcusedOrDispensed) {
      // Élève absent justifié ou dispensé : matière exclue du calcul de la moyenne (sans pénalité 0)
      subjectResults.push({
        subjectId: tplSubject.subjectId,
        subjectName: tplSubject.subjectName,
        displayOrder: tplSubject.displayOrder,
        grade: null,
        appreciation: null,
        weightedScore: null,
        maximumScore: tplSubject.maximumScore,
        coefficient: tplSubject.coefficient,
        absenceStatus,
        assessmentMode: 'GRADE',
        isRequired: tplSubject.isRequired,
        warnings: [
          `Élève ${absenceStatus === 'DISPENSED' ? 'dispensé(e)' : 'absent(e) justifié(e)'} — coefficient exclu du diviseur de moyenne.`,
        ],
      });
      continue;
    }

    if (isUnexcused) {
      // Élève absent non justifié : pénalité score = 0 pondéré comptabilisé dans le diviseur
      const weighted = 0;
      const weightedMax = tplSubject.maximumScore * tplSubject.coefficient;
      weightedGrades.push(weighted);
      weightedMaximums.push(weightedMax);
      rawGrades.push(0);
      subjectCount++;

      subjectResults.push({
        subjectId: tplSubject.subjectId,
        subjectName: tplSubject.subjectName,
        displayOrder: tplSubject.displayOrder,
        grade: 0,
        appreciation: null,
        weightedScore: 0,
        maximumScore: tplSubject.maximumScore,
        coefficient: tplSubject.coefficient,
        absenceStatus: 'ABSENT',
        assessmentMode: 'GRADE',
        isRequired: tplSubject.isRequired,
        warnings: ['Élève absent non justifié — note 0 comptabilisée dans la moyenne.'],
      });
      continue;
    }

    if (grade === null || grade === undefined) {
      if (tplSubject.isRequired) {
        errors.push(
          makeError(
            'REQUIRED_SUBJECT_MISSING',
            `La note de "${tplSubject.subjectName}" est obligatoire mais absente.`,
            tplSubject.subjectId,
            tplSubject.subjectName,
          ),
        );
      } else {
        warnings.push(`Matière optionnelle "${tplSubject.subjectName}" sans note — ignorée.`);
      }
      continue;
    }

    // ── Validation du barème ──────────────────────────────────────────────────
    if (grade < 0) {
      errors.push(
        makeError(
          'GRADE_NEGATIVE',
          `La note de "${tplSubject.subjectName}" est négative (${grade}). Les notes doivent être ≥ 0.`,
          tplSubject.subjectId,
          tplSubject.subjectName,
        ),
      );
    } else if (!isScoreInBounds(grade, tplSubject.maximumScore)) {
      errors.push(
        makeError(
          'GRADE_EXCEEDS_MAXIMUM',
          `La note de "${tplSubject.subjectName}" (${grade}) dépasse le barème maximum (${tplSubject.maximumScore}).`,
          tplSubject.subjectId,
          tplSubject.subjectName,
        ),
      );
    }

    const weightedScore = parseFloat((grade * tplSubject.coefficient).toFixed(4));
    const weightedMax = parseFloat((tplSubject.maximumScore * tplSubject.coefficient).toFixed(4));

    weightedGrades.push(weightedScore);
    weightedMaximums.push(weightedMax);
    rawGrades.push(grade);
    subjectCount++;

    subjectResults.push({
      subjectId: tplSubject.subjectId,
      subjectName: tplSubject.subjectName,
      displayOrder: tplSubject.displayOrder,
      grade,
      appreciation: null,
      weightedScore,
      maximumScore: tplSubject.maximumScore,
      coefficient: tplSubject.coefficient,
      absenceStatus,
      assessmentMode: 'GRADE',
      isRequired: tplSubject.isRequired,
      warnings: subjectWarnings,
    });
  }

  // Trier par display_order
  subjectResults.sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    subjectResults,
    errors,
    warnings,
    formulaInput: {
      weightedGrades,
      weightedMaximums,
      rawGrades,
      subjectCount,
    },
  };
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Construit le résultat de calcul complet à partir du template, des notes saisies
 * et des résultats partiels produits par le FormulaEngine.
 *
 * @param template    - Modèle d'évaluation complet (depuis la BD).
 * @param gradeInputs - Notes/appréciations saisies par matière.
 * @returns CalculationResult complet, avec erreurs et avertissements.
 *
 * @example
 * const result = buildResult(cp1Template, [
 *   { subjectId: 'lecture', grade: 8, appreciation: null, absenceStatus: 'PRESENT' },
 *   ...
 * ]);
 * // result.average → 7.56
 * // result.resultScale → 'SCORE_10'
 * // result.appreciation → 'Bon travail'
 */
export function buildResult(
  template: AssessmentTemplate,
  gradeInputs: SubjectGradeInput[],
): CalculationResult {
  const allErrors: CalculationError[] = [];
  const allWarnings: string[] = [];

  // ── Validation du modèle ──────────────────────────────────────────────────
  if (!template || !template.id) {
    allErrors.push(makeError('TEMPLATE_MISSING', 'Le modèle d\'évaluation est absent ou invalide.'));
    return emptyResult(allErrors, allWarnings);
  }

  // ── Validation de la formule ──────────────────────────────────────────────
  if (!isFormulaValid(template.formula)) {
    allErrors.push(
      makeError(
        'FORMULA_MISSING',
        `Aucune formule de calcul valide trouvée pour le modèle "${template.code}".`,
      ),
    );
    return emptyResult(allErrors, allWarnings);
  }

  // ── Construction des résultats par matière ────────────────────────────────
  const { subjectResults, errors, warnings, formulaInput } = buildSubjectResults(
    template,
    gradeInputs,
  );

  allErrors.push(...errors);
  allWarnings.push(...warnings);

  // ── Mode Préscolaire (APPRECIATION_ENGINE) ────────────────────────────────
  const isPreschool = template.formula.formulaExpression.trim() === 'APPRECIATION_ENGINE';

  if (isPreschool) {
    const appreciations = subjectResults
      .filter((r) => r.appreciation !== null)
      .map((r) => r.appreciation!);

    const overallAppreciation =
      appreciations.length > 0 ? mapPreschoolOverallAppreciation(appreciations) : null;

    return {
      totalObtained: 0,
      totalMaximum: 0,
      average: null,
      resultScale: 'APPRECIATION',
      appreciation: overallAppreciation,
      subjectResults,
      formulaUsed: template.formula.formulaExpression,
      errors: allErrors,
      warnings: allWarnings,
      isValid: allErrors.length === 0,
    };
  }

  // ── Mode Numérique ────────────────────────────────────────────────────────
  // Stopper le calcul si des erreurs bloquantes sont présentes
  if (allErrors.length > 0) {
    return emptyResult(allErrors, allWarnings, subjectResults, template.formula.formulaExpression);
  }

  let formulaResult;
  try {
    formulaResult = executeFormula(template.formula, formulaInput);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    allErrors.push(makeError('INVALID_FORMULA_EXPRESSION', message));
    return emptyResult(allErrors, allWarnings, subjectResults, template.formula.formulaExpression);
  }

  // Arrondir la moyenne finale à 2 décimales (ou null si aucune matière évaluée)
  const average =
    formulaInput.subjectCount === 0 ? null : parseFloat(formulaResult.value.toFixed(2));

  // Appréciation primaire
  const appreciation =
    average !== null && formulaResult.resultScale !== 'APPRECIATION'
      ? mapPrimaryAppreciation(average, formulaResult.resultScale)
      : null;

  return {
    totalObtained: parseFloat(formulaResult.weightedSum.toFixed(2)),
    totalMaximum: parseFloat(formulaResult.weightedMaximum.toFixed(2)),
    average,
    resultScale: formulaResult.resultScale,
    appreciation,
    subjectResults,
    formulaUsed: formulaResult.computationTrace,
    errors: allErrors,
    warnings: allWarnings,
    isValid: allErrors.length === 0,
  };
}

// ─── Résultat vide (en cas d'erreur précoce) ──────────────────────────────────

/** @internal */
function emptyResult(
  errors: CalculationError[],
  warnings: string[],
  subjectResults: SubjectResult[] = [],
  formulaUsed = '',
): CalculationResult {
  return {
    totalObtained: 0,
    totalMaximum: 0,
    average: null,
    resultScale: 'SCORE_20',
    appreciation: null,
    subjectResults,
    formulaUsed,
    errors,
    warnings,
    isValid: false,
  };
}
