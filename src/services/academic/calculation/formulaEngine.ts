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

// ─── Validation et Parseur d'Expression de Formule ──────────────────────────

export interface FormulaValidationResult {
  isValid: boolean;
  formulaType: FormulaType;
  error?: string;
  warning?: string;
  isCustom: boolean;
  nominalDivisor?: number;
  nominalMultiplier?: number;
}

/**
 * Valide syntaxiquement une expression de formule et extrait ses métadonnées.
 */
export function validateFormulaExpression(expression: string): FormulaValidationResult {
  if (!expression || expression.trim() === '') {
    return {
      isValid: false,
      formulaType: 'CUSTOM',
      isCustom: true,
      error: "L'expression de la formule ne peut pas être vide.",
    };
  }

  const expr = expression.trim();

  // 1. APPRECIATION_ENGINE
  if (expr === 'APPRECIATION_ENGINE') {
    return { isValid: true, formulaType: 'APPRECIATION', isCustom: false };
  }

  // 2. AVERAGE(grades)
  if (/^AVERAGE\(grades\)$/i.test(expr)) {
    return { isValid: true, formulaType: 'AVERAGE', isCustom: false };
  }

  // 3. SUM(grades)
  if (/^SUM\(grades\)$/i.test(expr)) {
    return { isValid: true, formulaType: 'SUM', isCustom: false };
  }

  // 4. SUM(grades)/N
  const sumDivMatch = expr.match(/^SUM\(grades\)\/(\d+(?:\.\d+)?)$/i);
  if (sumDivMatch) {
    const divisor = parseFloat(sumDivMatch[1]);
    if (divisor === 0) {
      return {
        isValid: false,
        formulaType: 'SUM_DIVISOR',
        isCustom: false,
        error: 'Division par zéro interdite dans la formule SUM_DIVISOR.',
      };
    }
    return {
      isValid: true,
      formulaType: 'SUM_DIVISOR',
      nominalDivisor: divisor,
      isCustom: false,
    };
  }

  // 5. (SUM(coeff*grade)/N)*M
  const sumMultMatch = expr.match(/^\(SUM\(coeff\*grade\)\/(\d+(?:\.\d+)?)\)\*(\d+(?:\.\d+)?)$/i);
  if (sumMultMatch) {
    const divisor = parseFloat(sumMultMatch[1]);
    const multiplier = parseFloat(sumMultMatch[2]);
    if (divisor === 0) {
      return {
        isValid: false,
        formulaType: 'SUM_MULTIPLIER',
        isCustom: false,
        error: 'Division par zéro interdite dans la formule SUM_MULTIPLIER.',
      };
    }
    return {
      isValid: true,
      formulaType: 'SUM_MULTIPLIER',
      nominalDivisor: divisor,
      nominalMultiplier: multiplier,
      isCustom: false,
    };
  }

  // 6. Formule CUSTOM : Validation de sécurité et de syntaxe arithmétique
  // Contrôle des parenthèses
  let parenDepth = 0;
  for (const ch of expr) {
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (parenDepth < 0) {
      return {
        isValid: false,
        formulaType: 'CUSTOM',
        isCustom: true,
        error: 'Parenthèses mal équilibrées dans la formule personnalisée.',
      };
    }
  }
  if (parenDepth !== 0) {
    return {
      isValid: false,
      formulaType: 'CUSTOM',
      isCustom: true,
      error: 'Parenthèses non fermées dans la formule personnalisée.',
    };
  }

  // Validation des tokens autorisés
  const tempSanitized = expr
    .replace(/SUM\(coeff\*grade\)/gi, '0')
    .replace(/SUM\(grades\)/gi, '0')
    .replace(/AVERAGE\(grades\)/gi, '0')
    .replace(/COUNT\(grades\)/gi, '0');

  // Vérification de sécurité contre les injections de script et mots-clés dangereux
  if (/\b(alert|eval|window|document|function|console|require|import|process|global|script)\b/i.test(expr)) {
    return {
      isValid: false,
      formulaType: 'CUSTOM',
      isCustom: true,
      error: 'Mots-clés interdits ou potentiellement dangereux détectés dans la formule personnalisée.',
    };
  }

  // Vérifier la division par zéro littérale
  if (/\/\s*0(?![0-9.])/.test(tempSanitized)) {
    return {
      isValid: false,
      formulaType: 'CUSTOM',
      isCustom: true,
      error: 'Division statique par zéro détectée dans la formule personnalisée.',
    };
  }

  // Si des lettres ou caractères suspects subsistent en dehors des chiffres et opérateurs de base
  if (/[a-zA-Z_$]/.test(tempSanitized)) {
    return {
      isValid: true,
      formulaType: 'CUSTOM',
      isCustom: true,
      warning: 'Identifiant personnalisé détecté dans l\'expression CUSTOM. Un fallback sur la moyenne sera utilisé si l\'expression n\'est pas directement calculable.',
    };
  }

  return {
    isValid: true,
    formulaType: 'CUSTOM',
    isCustom: true,
    warning: 'Formule personnalisée non-standard détectée. Vérifiez attentivement les résultats de calcul.',
  };
}

/**
 * Détermine le type de formule depuis l'expression stockée en BD.
 */
export function detectFormulaType(expression: string): FormulaType {
  const res = validateFormulaExpression(expression);
  return res.formulaType;
}

/**
 * Évalue une expression arithmétique CUSTOM de manière strictement sandboxée (sans eval).
 */
export function evaluateCustomMath(
  expression: string,
  variables: {
    sumGrades: number;
    avgGrades: number;
    countGrades: number;
    sumCoeffGrades: number;
  }
): { value: number; trace: string } {
  let sanitized = expression
    .replace(/SUM\(coeff\*grade\)/gi, `${variables.sumCoeffGrades}`)
    .replace(/SUM\(grades\)/gi, `${variables.sumGrades}`)
    .replace(/AVERAGE\(grades\)/gi, `${variables.avgGrades}`)
    .replace(/COUNT\(grades\)/gi, `${variables.countGrades}`);

  const tokens: (string | number)[] = [];
  const regex = /\s*([0-9]+(?:\.[0-9]+)?|[+\-*/()]|[^0-9+\-*/()\s]+)\s*/g;
  let match;
  while ((match = regex.exec(sanitized)) !== null) {
    const token = match[1];
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
      tokens.push(parseFloat(token));
    } else if (['+', '-', '*', '/', '(', ')'].includes(token)) {
      tokens.push(token);
    } else {
      throw new Error(`[FormulaEngine] Token non autorisé dans l'expression CUSTOM : "${token}"`);
    }
  }

  let pos = 0;

  function peek(): string | number | undefined {
    return tokens[pos];
  }

  function consume(): string | number {
    return tokens[pos++];
  }

  function parseFactor(): number {
    const token = peek();
    if (typeof token === 'number') {
      consume();
      return token;
    }
    if (token === '(') {
      consume();
      const result = parseExpression();
      if (peek() !== ')') {
        throw new Error('[FormulaEngine] Parenthèse fermante manquante.');
      }
      consume();
      return result;
    }
    if (token === '-') {
      consume();
      return -parseFactor();
    }
    if (token === '+') {
      consume();
      return parseFactor();
    }
    throw new Error(`[FormulaEngine] Facteur inattendu : "${token}"`);
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseFactor();
      if (op === '*') {
        left = left * right;
      } else if (op === '/') {
        if (right === 0) throw new Error('[FormulaEngine] Division par zéro dans la formule CUSTOM.');
        left = left / right;
      }
    }
    return left;
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      if (op === '+') {
        left = left + right;
      } else if (op === '-') {
        left = left - right;
      }
    }
    return left;
  }

  const calculated = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`[FormulaEngine] Caractères résiduels dans l'expression CUSTOM.`);
  }

  const rounded = parseFloat(calculated.toFixed(4));
  return {
    value: rounded,
    trace: `CUSTOM : ${expression} → ${sanitized} = ${rounded}`,
  };
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
 */
export function executeFormula(formula: FormulaConfig, input: FormulaInput): FormulaResult {
  const { formulaExpression, resultScale, code } = formula;

  if (!formulaExpression || formulaExpression.trim() === '') {
    throw new Error(`[FormulaEngine] L'expression de la formule "${code}" est vide.`);
  }

  const validation = validateFormulaExpression(formulaExpression);
  if (!validation.isValid) {
    throw new Error(`[FormulaEngine] Expression de formule invalide pour "${code}" : ${validation.error}`);
  }

  const formulaType = validation.formulaType;
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
        throw new Error('[FormulaEngine] Impossible de calculer une moyenne AVERAGE avec 0 matière');
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
      const nominalDivisor = parseSumDivisor(formulaExpression);
      if (nominalDivisor === 0) throw new Error(`[FormulaEngine] Diviseur égal à zéro dans : "${formulaExpression}"`);

      // Si des matières sont excusées, le diviseur s'adapte au nombre de matières réelles
      const effectiveDivisor = (input.subjectCount > 0 && input.subjectCount < nominalDivisor)
        ? input.subjectCount
        : nominalDivisor;

      const value = input.subjectCount === 0 ? 0 : parseFloat((weightedSum / effectiveDivisor).toFixed(4));
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `SUM_DIVISOR : ${weightedSum} / ${effectiveDivisor} = ${value}`,
      };
    }

    // ── SUM_MULTIPLIER : (SUM(coeff*grade)/N)*M ──────────────────────────────
    case 'SUM_MULTIPLIER': {
      const { divisor: nominalDivisor, multiplier } = parseSumMultiplier(formulaExpression);
      if (nominalDivisor === 0) throw new Error(`[FormulaEngine] Diviseur égal à zéro dans : "${formulaExpression}"`);

      // Diviseur effectif : utilise le maximum pondéré réellement évalué si des matières sont excusées
      const effectiveDivisor = (weightedMaximum > 0 && weightedMaximum < nominalDivisor)
        ? weightedMaximum
        : nominalDivisor;

      const value = effectiveDivisor === 0 ? 0 : parseFloat(((weightedSum / effectiveDivisor) * multiplier).toFixed(4));
      return {
        value,
        weightedSum,
        weightedMaximum,
        resultScale,
        formulaCode: code,
        computationTrace: `SUM_MULTIPLIER : (${weightedSum} / ${effectiveDivisor}) × ${multiplier} = ${value}`,
      };
    }

    // ── CUSTOM : expression personnalisée évaluée en sandbox ───────────────────
    case 'CUSTOM': {
      const count = input.subjectCount > 0 ? input.subjectCount : 1;
      const avg = input.subjectCount > 0 ? weightedSum / input.subjectCount : 0;

      try {
        const { value, trace } = evaluateCustomMath(formulaExpression, {
          sumGrades: weightedSum,
          avgGrades: avg,
          countGrades: input.subjectCount,
          sumCoeffGrades: weightedSum,
        });

        return {
          value,
          weightedSum,
          weightedMaximum,
          resultScale,
          formulaCode: code,
          computationTrace: trace,
        };
      } catch (err: any) {
        // Fallback sécurisé sur AVERAGE si expression descriptive non-arithmétique
        const fallbackValue = parseFloat((weightedSum / count).toFixed(4));
        console.warn(`[FormulaEngine] Formule CUSTOM "${formulaExpression}" non-arithmétique : fallback sur AVERAGE.`);
        return {
          value: fallbackValue,
          weightedSum,
          weightedMaximum,
          resultScale,
          formulaCode: code,
          computationTrace: `CUSTOM (fallback AVERAGE) : ${weightedSum} / ${count} = ${fallbackValue}`,
        };
      }
    }
  }
}

/**
 * Valide qu'une configuration de formule est complète et utilisable.
 */
export function isFormulaValid(formula: FormulaConfig | null | undefined): boolean {
  if (!formula) return false;
  if (!formula.formulaExpression || formula.formulaExpression.trim() === '') return false;
  if (!formula.resultScale) return false;
  return true;
}
