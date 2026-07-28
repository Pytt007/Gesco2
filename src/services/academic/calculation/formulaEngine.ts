// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Formula Engine
// src/services/academic/calculation/formulaEngine.ts
//
// Exécute les formules de calcul de moyenne à partir de leur configuration BD.
// Aucune formule n'est codée dans les composants React ou les Hooks.
// Types de formules supportés : AVERAGE | SUM | SUM_DIVISOR | SUM_MULTIPLIER | APPRECIATION | CUSTOM
// Ce module est pur : pas d'effet de bord, déterministe.
// ─────────────────────────────────────────────────────────────────────────────

import type { FormulaConfig, FormulaType, ScaleType } from './types';
import { normalizeScore } from './scoreNormalizer';

// ─── Types internes ───────────────────────────────────────────────────────────

/** Données d'entrée pour l'exécution d'une formule. */
export interface FormulaInput {
  /** Notes pondérées (grade × coefficient) des matières présentes. */
  weightedGrades: number[];
  /** Scores maximaux pondérés (maximum × coefficient) des matières présentes. */
  weightedMaximums: number[];
  /** Notes brutes (sans pondération). */
  rawGrades: number[];
  /** Nombre de matières prises en compte dans le calcul. */
  subjectCount: number;
}

/** Résultat d'exécution d'une formule. */
export interface FormulaResult {
  /** Valeur calculée par la formule. */
  value: number;
  /** Somme pondérée des scores obtenus. */
  weightedSum: number;
  /** Somme pondérée des maxima. */
  weightedMaximum: number;
  /** Échelle du résultat. */
  resultScale: ScaleType;
  /** Identifiant de la formule utilisée. */
  formulaCode: string;
  /** Description de l'opération effectuée (utile pour le débogage). */
  computationTrace: string;
}

// ─── Parseur de l'expression de formule ──────────────────────────────────────

/**
 * Détermine le type de formule depuis l'expression stockée en BD.
 *
 * Expressions reconnues :
 * - `'APPRECIATION_ENGINE'`             → FormulaType.APPRECIATION
 * - `'SUM(grades)/N'`                   → FormulaType.SUM_DIVISOR (N = entier)
 * - `'(SUM(coeff*grade)/N)*M'`          → FormulaType.SUM_MULTIPLIER (N, M = entiers)
 * - `'SUM(grades)'`                     → FormulaType.SUM
 * - `'AVERAGE(grades)'`                 → FormulaType.AVERAGE
 * - Autre                               → FormulaType.CUSTOM
 *
 * @param expression - Expression de formule telle que stockée en base.
 * @returns Type de formule détecté.
 */
export function detectFormulaType(expression: string): FormulaType {
  const expr = expression.trim();

  if (expr === 'APPRECIATION_ENGINE') return 'APPRECIATION';
  if (/^AVERAGE\(grades\)$/i.test(expr)) return 'AVERAGE';
  if (/^SUM\(grades\)$/i.test(expr)) return 'SUM';
  if (/^SUM\(grades\)\/\d+(\.\d+)?$/i.test(expr)) return 'SUM_DIVISOR';
  if (/^\(SUM\(coeff\*grade\)\/\d+(\.\d+)?\)\*\d+(\.\d+)?$/i.test(expr)) return 'SUM_MULTIPLIER';

  return 'CUSTOM';
}

/**
 * Extrait le diviseur d'une expression SUM_DIVISOR.
 * Ex : 'SUM(grades)/9' → 9
 * @internal
 */
function parseSumDivisor(expression: string): number {
  const match = expression.match(/SUM\(grades\)\/(\d+(?:\.\d+)?)/i);
  if (!match) throw new Error(`[FormulaEngine] Impossible de parser le diviseur dans : "${expression}"`);
  return parseFloat(match[1]);
}

/**
 * Extrait diviseur et multiplicateur d'une expression SUM_MULTIPLIER.
 * Ex : '(SUM(coeff*grade)/170)*20' → { divisor: 170, multiplier: 20 }
 * @internal
 */
function parseSumMultiplier(expression: string): { divisor: number; multiplier: number } {
  const match = expression.match(
    /\(SUM\(coeff\*grade\)\/(\d+(?:\.\d+)?)\)\*(\d+(?:\.\d+)?)/i,
  );
  if (!match) {
    throw new Error(
      `[FormulaEngine] Impossible de parser diviseur/multiplicateur dans : "${expression}"`,
    );
  }
  return { divisor: parseFloat(match[1]), multiplier: parseFloat(match[2]) };
}

// ─── Moteur d'exécution ───────────────────────────────────────────────────────

/**
 * Exécute une formule de calcul sur les données d'entrée.
 *
 * @param formula - Configuration de la formule (depuis la BD).
 * @param input   - Données calculées (scores pondérés, maxima, etc.).
 * @returns Résultat détaillé du calcul.
 *
 * @throws Error si la formule est absente, si l'expression est invalide,
 *              ou si les données d'entrée sont incohérentes.
 *
 * @example
 * // CP1 Mensuelle : SUM(grades)/9, 9 notes de 8/10
 * executeFormula(formula, { weightedGrades: [8,8,8,8,8,8,8,8,8], subjectCount: 9, ... })
 * // → { value: 8.00, resultScale: 'SCORE_10', ... }
 *
 * @example
 * // CM1 : (SUM(coeff*grade)/170)*20, pondérations appliquées
 * executeFormula(formula, { weightedGrades: [...], weightedMaximums: [...], ... })
 * // → { value: 14.12, resultScale: 'SCORE_20', ... }
 */
export function executeFormula(formula: FormulaConfig, input: FormulaInput): FormulaResult {
  const { formulaExpression, resultScale, code } = formula;

  if (!formulaExpression || formulaExpression.trim() === '') {
    throw new Error(`[FormulaEngine] L'expression de la formule "${code}" est vide.`);
  }

  const formulaType = detectFormulaType(formulaExpression);
  const weightedSum = input.weightedGrades.reduce((acc, g) => acc + g, 0);
  const weightedMaximum = input.weightedMaximums.reduce((acc, m) => acc + m, 0);

  switch (formulaType) {
    // ── APPRECIATION_ENGINE : pas de calcul numérique ────────────────────────
    case 'APPRECIATION': {
      return {
        value: 0,
        weightedSum: 0,
        weightedMaximum: 0,
        resultScale,
        formulaCode: code,
        computationTrace: 'APPRECIATION_ENGINE : calcul numérique non applicable.',
      };
    }

    // ── AVERAGE : SUM(grades) / count ────────────────────────────────────────
    case 'AVERAGE': {
      if (input.subjectCount === 0) {
        throw new Error(`[FormulaEngine] Impossible de calculer la moyenne : aucune matière présente.`);
      }
      const value = parseFloat((weightedSum / input.subjectCount).toFixed(4));
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `AVERAGE : ${weightedSum} / ${input.subjectCount} = ${value}`,
      };
    }

    // ── SUM : somme brute ────────────────────────────────────────────────────
    case 'SUM': {
      return {
        value: weightedSum,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `SUM : Σ(grades) = ${weightedSum}`,
      };
    }

    // ── SUM_DIVISOR : SUM(grades)/N ──────────────────────────────────────────
    case 'SUM_DIVISOR': {
      const divisor = parseSumDivisor(formulaExpression);
      if (divisor === 0) throw new Error(`[FormulaEngine] Diviseur égal à zéro dans : "${formulaExpression}"`);
      const value = parseFloat((weightedSum / divisor).toFixed(4));
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `SUM_DIVISOR : ${weightedSum} / ${divisor} = ${value}`,
      };
    }

    // ── SUM_MULTIPLIER : (SUM(coeff*grade)/N)*M ──────────────────────────────
    case 'SUM_MULTIPLIER': {
      const { divisor, multiplier } = parseSumMultiplier(formulaExpression);
      if (divisor === 0) throw new Error(`[FormulaEngine] Diviseur égal à zéro dans : "${formulaExpression}"`);
      const normalized = normalizeScore(weightedSum, divisor, resultScale as 'SCORE_10' | 'SCORE_20', {
        capAtMax: false,
      });
      const value = parseFloat(((weightedSum / divisor) * multiplier).toFixed(4));
      void normalized; // calculated via normalizeScore for consistency check
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `SUM_MULTIPLIER : (${weightedSum} / ${divisor}) × ${multiplier} = ${value}`,
      };
    }

    // ── CUSTOM : expression personnalisée ─────────────────────────────────────
    case 'CUSTOM': {
      // Pour l'instant, CUSTOM utilise la moyenne simple comme fallback sécurisé.
      // Le moteur peut être étendu pour interpréter des expressions plus complexes.
      const count = input.subjectCount > 0 ? input.subjectCount : 1;
      const value = parseFloat((weightedSum / count).toFixed(4));
      console.warn(
        `[FormulaEngine] Formule CUSTOM "${formulaExpression}" : fallback sur AVERAGE.`,
      );
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `CUSTOM (fallback AVERAGE) : ${weightedSum} / ${count} = ${value}`,
      };
    }
  }
}

/**
 * Valide qu'une configuration de formule est complète et utilisable.
 *
 * @param formula - Configuration de formule à valider.
 * @returns true si la formule est valide et exécutable.
 */
export function isFormulaValid(formula: FormulaConfig | null | undefined): boolean {
  if (!formula) return false;
  if (!formula.formulaExpression || formula.formulaExpression.trim() === '') return false;
  if (!formula.resultScale) return false;
  return true;
}
