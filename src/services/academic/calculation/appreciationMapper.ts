// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Appreciation Mapper
// src/services/academic/calculation/appreciationMapper.ts
//
// Convertit une note numérique ou qualitative en appréciation textuelle.
// Les seuils proviennent de la base de données (via les paramètres du moteur).
// Ce module est pur : pas d'effet de bord, déterministe.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScaleType,
  PreschoolAppreciation,
  PrimaryAppreciation,
} from './types';

// ─── Seuils par défaut (MENA Côte d'Ivoire) ──────────────────────────────────
// Ces seuils peuvent être surchargés par la configuration de la BD.

/**
 * Seuils des appréciations primaires sur une note /10.
 * Source : référentiel pédagogique MENA / IEF Côte d'Ivoire.
 */
const DEFAULT_PRIMARY_THRESHOLDS_10: Array<{ min: number; label: PrimaryAppreciation }> = [
  { min: 9,   label: 'Excellent travail' },
  { min: 7.5, label: 'Bon travail' },
  { min: 6,   label: 'Travail satisfaisant' },
  { min: 5,   label: 'Résultats passables' },
  { min: 0,   label: 'Travail insuffisant' },
];

/**
 * Seuils des appréciations primaires sur une note /20.
 * Source : référentiel pédagogique MENA / IEF Côte d'Ivoire.
 */
const DEFAULT_PRIMARY_THRESHOLDS_20: Array<{ min: number; label: PrimaryAppreciation }> = [
  { min: 18,  label: 'Excellent travail' },
  { min: 15,  label: 'Bon travail' },
  { min: 12,  label: 'Travail satisfaisant' },
  { min: 10,  label: 'Résultats passables' },
  { min: 0,   label: 'Travail insuffisant' },
];

/**
 * Valeurs numériques équivalentes pour chaque appréciation préscolaire.
 * Utilisées pour calculer une appréciation globale en préscolaire.
 */
export const PRESCHOOL_APPRECIATION_VALUES: Record<PreschoolAppreciation, number> = {
  TB:  4,
  B:   3,
  AB:  2,
  P:   1,
  I:   0,
};

/** Libellés complets des appréciations préscolaires. */
export const PRESCHOOL_APPRECIATION_LABELS: Record<PreschoolAppreciation, string> = {
  TB: 'Très Bien',
  AB: 'Assez Bien',
  B:  'Bien',
  P:  'Passable',
  I:  'Insuffisant',
};

/** Ordre de tri des appréciations préscolaires (du meilleur au moins bon). */
export const PRESCHOOL_APPRECIATION_ORDER: PreschoolAppreciation[] = ['TB', 'B', 'AB', 'P', 'I'];

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Retourne l'appréciation primaire correspondant à une moyenne numérique.
 *
 * @param average    - Moyenne numérique calculée.
 * @param resultScale - Échelle de la moyenne (SCORE_10 ou SCORE_20).
 * @param thresholds - Seuils personnalisés (depuis la BD). Si absent, utilise les valeurs MENA.
 * @returns Appréciation textuelle ou null si la moyenne est nulle/invalide.
 *
 * @example
 * mapPrimaryAppreciation(8.5, 'SCORE_10') // → 'Bon travail'
 * mapPrimaryAppreciation(14, 'SCORE_20')  // → 'Bon travail'
 */
export function mapPrimaryAppreciation(
  average: number,
  resultScale: ScaleType,
  thresholds?: Array<{ min: number; label: PrimaryAppreciation }>,
): PrimaryAppreciation {
  const scale =
    thresholds ??
    (resultScale === 'SCORE_20'
      ? DEFAULT_PRIMARY_THRESHOLDS_20
      : DEFAULT_PRIMARY_THRESHOLDS_10);

  // Trouver le premier seuil satisfait (les seuils sont triés du plus haut au plus bas)
  for (const threshold of scale) {
    if (average >= threshold.min) {
      return threshold.label;
    }
  }
  return 'Travail insuffisant';
}

/**
 * Calcule l'appréciation préscolaire globale à partir d'une liste d'appréciations par matière.
 * Utilise la moyenne des valeurs numériques équivalentes pour déterminer l'appréciation globale.
 *
 * @param appreciations - Liste des appréciations saisies (une par matière).
 * @returns Appréciation globale (TB | B | AB | P | I).
 *
 * @example
 * mapPreschoolOverallAppreciation(['TB', 'B', 'TB', 'AB']) // → 'B'
 */
export function mapPreschoolOverallAppreciation(
  appreciations: PreschoolAppreciation[],
): PreschoolAppreciation {
  if (appreciations.length === 0) return 'I';

  const sum = appreciations.reduce(
    (acc, a) => acc + PRESCHOOL_APPRECIATION_VALUES[a],
    0,
  );
  const avg = sum / appreciations.length;

  // Reconvertir la valeur numérique moyenne en appréciation
  if (avg >= 3.5) return 'TB';
  if (avg >= 2.5) return 'B';
  if (avg >= 1.5) return 'AB';
  if (avg >= 0.5) return 'P';
  return 'I';
}

/**
 * Valide qu'une appréciation préscolaire saisie est une valeur autorisée.
 *
 * @param value - Valeur à valider.
 * @returns true si la valeur est une appréciation préscolaire valide.
 *
 * @example
 * isValidPreschoolAppreciation('TB')  // → true
 * isValidPreschoolAppreciation('XYZ') // → false
 */
export function isValidPreschoolAppreciation(
  value: unknown,
): value is PreschoolAppreciation {
  return (
    typeof value === 'string' &&
    Object.keys(PRESCHOOL_APPRECIATION_VALUES).includes(value)
  );
}

/**
 * Retourne le libellé complet d'une appréciation préscolaire.
 *
 * @param code - Code court de l'appréciation (TB, B, AB, P, I).
 * @returns Libellé complet ou le code lui-même si inconnu.
 *
 * @example
 * getPreschoolAppreciationLabel('TB') // → 'Très Bien'
 */
export function getPreschoolAppreciationLabel(code: PreschoolAppreciation): string {
  return PRESCHOOL_APPRECIATION_LABELS[code] ?? code;
}
