// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Calculation Engine (Point d'entrée principal)
// src/services/academic/calculation/calculationEngine.ts
//
// Façade principale du moteur de calcul académique.
// Reçoit un modèle d'évaluation et des notes saisies.
// Retourne un résultat complet : moyenne, appréciation, erreurs, avertissements.
//
// Architecture :
//   calculationEngine  ← façade principale
//   ├─ formulaEngine   ← exécution des formules
//   ├─ scoreNormalizer ← normalisation des scores
//   ├─ resultBuilder   ← construction du résultat structuré
//   └─ appreciationMapper ← appréciation qualitative
//
// ⚠️ Ce module est PURE : aucun appel Supabase. Aucun effet de bord.
//    Tous les appels à la BD passent par les Services.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssessmentTemplate,
  SubjectGradeInput,
  CalculationResult,
  CalculationError,
} from './types';
import { buildResult } from './resultBuilder';
import { isFormulaValid } from './formulaEngine';

// ─── Re-exports publics ───────────────────────────────────────────────────────
// Permettre aux Hooks d'importer les types sans dépendre des sous-modules.
export type {
  AssessmentTemplate,
  SubjectGradeInput,
  CalculationResult,
  CalculationError,
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
  CalculationErrorCode,
} from './types';

// ─── API principale ───────────────────────────────────────────────────────────

/**
 * Options avancées de calcul.
 */
export interface CalculationOptions {
  /**
   * Si true, le calcul s'arrête dès la première erreur bloquante.
   * Si false (défaut), toutes les erreurs sont collectées avant de retourner.
   */
  failFast?: boolean;
  /**
   * Si true, les matières optionnelles sans note sont ignorées silencieusement.
   * Défaut : true.
   */
  ignoreOptionalMissingGrades?: boolean;
}

/**
 * Calcule les résultats académiques complets pour un élève et une évaluation.
 *
 * Le moteur :
 *   1. Valide le modèle et la formule.
 *   2. Valide chaque note (barème, valeur négative, matière manquante).
 *   3. Gère les statuts d'absence (PRESENT | ABSENT | EXCUSED).
 *   4. Exécute la formule de calcul (SUM_DIVISOR, SUM_MULTIPLIER, APPRECIATION…).
 *   5. Calcule l'appréciation qualitative (primaire ou préscolaire).
 *   6. Retourne un CalculationResult structuré avec erreurs et avertissements.
 *
 * @param template    - Modèle d'évaluation complet (matières + formule + règles).
 * @param gradeInputs - Notes/appréciations saisies, une entrée par matière.
 * @param options     - Options avancées optionnelles.
 * @returns CalculationResult complet, toujours non null.
 *
 * @example
 * // CP1 Composition Mensuelle
 * const result = calculate(cp1MonthlyTemplate, [
 *   { subjectId: 'lecture',  grade: 8,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'ecriture', grade: 7.5, appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'copie',    grade: 9,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'ortho',    grade: 6,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'expr',     grade: 7,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'math',     grade: 8.5, appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'chant',    grade: 8,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'dessin',   grade: 7,   appreciation: null, absenceStatus: 'PRESENT' },
 *   { subjectId: 'ecm',      grade: 9,   appreciation: null, absenceStatus: 'PRESENT' },
 * ]);
 * // result.average → 7.78
 * // result.resultScale → 'SCORE_10'
 * // result.appreciation → 'Bon travail'
 * // result.isValid → true
 *
 * @example
 * // Préscolaire — Évaluation par appréciation
 * const result = calculate(psPreschoolTemplate, [
 *   { subjectId: 'graphisme', grade: null, appreciation: 'TB', absenceStatus: 'PRESENT' },
 *   { subjectId: 'lecture',   grade: null, appreciation: 'B',  absenceStatus: 'PRESENT' },
 *   { subjectId: 'langage',   grade: null, appreciation: 'AB', absenceStatus: 'PRESENT' },
 *   { subjectId: 'math',      grade: null, appreciation: 'B',  absenceStatus: 'PRESENT' },
 *   { subjectId: 'aem',       grade: null, appreciation: 'TB', absenceStatus: 'PRESENT' },
 *   { subjectId: 'aec',       grade: null, appreciation: 'B',  absenceStatus: 'PRESENT' },
 * ]);
 * // result.appreciation → 'B'
 * // result.resultScale → 'APPRECIATION'
 */
export function calculate(
  template: AssessmentTemplate,
  gradeInputs: SubjectGradeInput[],
  _options: CalculationOptions = {},
): CalculationResult {
  return buildResult(template, gradeInputs);
}

/**
 * Valide uniquement les données d'entrée sans effectuer de calcul.
 * Utile pour la validation en temps réel dans les formulaires de saisie.
 *
 * @param template    - Modèle d'évaluation complet.
 * @param gradeInputs - Notes/appréciations à valider.
 * @returns Liste d'erreurs détectées (vide si tout est valide).
 *
 * @example
 * const errors = validateInputs(template, inputs);
 * if (errors.length === 0) { // prêt à calculer }
 */
export function validateInputs(
  template: AssessmentTemplate,
  gradeInputs: SubjectGradeInput[],
): CalculationError[] {
  if (!template?.id) {
    return [{ code: 'TEMPLATE_MISSING', message: 'Modèle d\'évaluation absent.' }];
  }
  if (!isFormulaValid(template.formula)) {
    return [{ code: 'FORMULA_MISSING', message: `Formule absente pour le modèle "${template.code}".` }];
  }
  // Lance le calcul complet et retourne uniquement les erreurs
  const result = buildResult(template, gradeInputs);
  return result.errors;
}

/**
 * Vérifie si un résultat de calcul est exploitable (sans erreur bloquante).
 *
 * @param result - Résultat retourné par calculate().
 * @returns true si le résultat est valide et peut être affiché/enregistré.
 */
export function isResultValid(result: CalculationResult): boolean {
  return result.isValid && result.errors.length === 0;
}

/**
 * Formate la moyenne pour l'affichage selon l'échelle.
 *
 * @param result - Résultat de calcul.
 * @returns Chaîne formatée (ex: "8.50/10", "17.00/20", "B (Bien)").
 *
 * @example
 * formatAverage({ average: 8.5, resultScale: 'SCORE_10', ... }) // → "8.50 / 10"
 * formatAverage({ average: null, resultScale: 'APPRECIATION', appreciation: 'B', ... }) // → "B"
 */
export function formatAverage(result: CalculationResult): string {
  if (result.resultScale === 'APPRECIATION') {
    return result.appreciation ? String(result.appreciation) : '—';
  }
  if (result.average === null) return '—';
  const max = result.resultScale === 'SCORE_20' ? 20 : 10;
  return `${result.average.toFixed(2)} / ${max}`;
}
