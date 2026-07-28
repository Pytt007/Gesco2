// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Score Normalizer
// src/services/academic/calculation/scoreNormalizer.ts
//
// Convertit un score brut (sur une base quelconque) vers une échelle normalisée.
// Ex : 85/170 → 10/20, 72/90 → 8/10
// Ce module est pur : pas d'effet de bord, déterministe.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScaleType } from './types';

// ─── Types internes ───────────────────────────────────────────────────────────

/** Options de normalisation. */
export interface NormalizationOptions {
  /** Nombre de décimales dans le résultat (défaut : 2). */
  decimalPlaces?: number;
  /** Arrondir au quart le plus proche (0.25, 0.50, 0.75) — usage IEP. */
  roundToQuarter?: boolean;
  /** Empêcher un résultat supérieur au maximum de l'échelle cible. */
  capAtMax?: boolean;
}

/** Résultat d'une normalisation. */
export interface NormalizationResult {
  /** Score normalisé sur l'échelle cible. */
  normalizedScore: number;
  /** Score brut d'entrée. */
  rawScore: number;
  /** Base maximale d'entrée. */
  rawMaximum: number;
  /** Maximum de l'échelle cible (10 ou 20). */
  targetMaximum: number;
  /** Pourcentage de réussite (0–100). */
  percentage: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SCALE_MAXIMUMS: Record<Exclude<ScaleType, 'APPRECIATION'>, number> = {
  SCORE_10: 10,
  SCORE_20: 20,
};

// ─── Fonctions utilitaires privées ────────────────────────────────────────────

/**
 * Arrondit une valeur au nombre de décimales spécifié.
 * @internal
 */
function roundToDecimals(value: number, places: number): number {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

/**
 * Arrondit une valeur au quart le plus proche (0, 0.25, 0.50, 0.75).
 * Pratique courante dans les bulletins scolaires ivoiriens.
 * @internal
 */
function roundToNearestQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Normalise un score brut vers une échelle cible (SCORE_10 ou SCORE_20).
 * Formule : (rawScore / rawMaximum) × targetMaximum
 *
 * @param rawScore    - Score brut obtenu (ex : 85 sur 170).
 * @param rawMaximum  - Maximum possible du score brut (ex : 170).
 * @param targetScale - Échelle cible de normalisation.
 * @param options     - Options d'arrondi et de plafonnement.
 * @returns Résultat de normalisation détaillé.
 *
 * @throws Error si rawMaximum ≤ 0 ou si rawScore < 0.
 *
 * @example
 * normalizeScore(85, 170, 'SCORE_20')   // → { normalizedScore: 10.00, ... }
 * normalizeScore(72, 90, 'SCORE_10')    // → { normalizedScore: 8.00, ... }
 * normalizeScore(8, 10, 'SCORE_20')     // → { normalizedScore: 16.00, ... }
 */
export function normalizeScore(
  rawScore: number,
  rawMaximum: number,
  targetScale: Exclude<ScaleType, 'APPRECIATION'>,
  options: NormalizationOptions = {},
): NormalizationResult {
  if (rawMaximum <= 0) {
    throw new RangeError(
      `[ScoreNormalizer] rawMaximum doit être positif. Reçu : ${rawMaximum}`,
    );
  }
  if (rawScore < 0) {
    throw new RangeError(
      `[ScoreNormalizer] rawScore ne peut pas être négatif. Reçu : ${rawScore}`,
    );
  }

  const { decimalPlaces = 2, roundToQuarter = false, capAtMax = true } = options;
  const targetMaximum = SCALE_MAXIMUMS[targetScale];
  const percentage = (rawScore / rawMaximum) * 100;

  let normalized = (rawScore / rawMaximum) * targetMaximum;

  if (capAtMax && normalized > targetMaximum) {
    normalized = targetMaximum;
  }

  if (roundToQuarter) {
    normalized = roundToNearestQuarter(normalized);
  } else {
    normalized = roundToDecimals(normalized, decimalPlaces);
  }

  return {
    normalizedScore: normalized,
    rawScore,
    rawMaximum,
    targetMaximum,
    percentage: roundToDecimals(percentage, 2),
  };
}

/**
 * Convertit une note sur 10 en note sur 20 (simple ×2).
 * Raccourci fréquent pour l'affichage des bulletins primaires.
 *
 * @param scoreOn10 - Note sur 10.
 * @param options   - Options d'arrondi.
 * @returns Note sur 20.
 *
 * @example
 * scoreOn10ToOn20(7.5) // → 15.00
 */
export function scoreOn10ToOn20(
  scoreOn10: number,
  options: Pick<NormalizationOptions, 'decimalPlaces' | 'roundToQuarter'> = {},
): number {
  const result = normalizeScore(scoreOn10, 10, 'SCORE_20', options);
  return result.normalizedScore;
}

/**
 * Calcule le pourcentage de réussite d'un score.
 *
 * @param score   - Score obtenu.
 * @param maximum - Score maximal possible.
 * @returns Pourcentage arrondi à 2 décimales.
 *
 * @example
 * computePercentage(13, 20) // → 65.00
 */
export function computePercentage(score: number, maximum: number): number {
  if (maximum <= 0) return 0;
  return roundToDecimals((score / maximum) * 100, 2);
}

/**
 * Vérifie si un score est dans les bornes valides [0, maximum].
 *
 * @param score   - Score à valider.
 * @param maximum - Maximum autorisé.
 * @returns true si le score est valide.
 *
 * @example
 * isScoreInBounds(8, 10)   // → true
 * isScoreInBounds(-1, 10)  // → false
 * isScoreInBounds(11, 10)  // → false
 */
export function isScoreInBounds(score: number, maximum: number): boolean {
  return score >= 0 && score <= maximum;
}
