// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tie Resolver
// src/services/academic/ranking/tieResolver.ts
//
// Détection et résolution des ex æquo + formatage des rangs en français.
// Module pur sans effet de bord.
// ─────────────────────────────────────────────────────────────────────────────

import type { CalculatedRank, ScoreEntry, IRankingStrategy } from './rankingStrategies';

/**
 * Groupe d'ex æquo partageant la même moyenne.
 */
export interface TieGroup {
  score: number;
  rank: number;
  count: number;
  studentIds: string[];
}

/**
 * Formate un rang numérique en chaîne lisible en français.
 * Ex: 1 -> "1er" (ou "1ère"), 2 -> "2ème", 1 (ex æquo) -> "1er ex", 3 (ex æquo) -> "3ème ex".
 *
 * @param rank      - Rang numérique (1-based) ou null.
 * @param isExAequo - Si true, ajoute le suffixe "ex".
 * @param gender    - Genre de l'élève ('M' | 'F') pour accorder "1er" / "1ère".
 * @returns Libellé formaté (ex: "1er ex", "2ème").
 *
 * @example
 * formatRankFrench(1, false, 'M') // → "1er"
 * formatRankFrench(1, false, 'F') // → "1ère"
 * formatRankFrench(1, true,  'M') // → "1er ex"
 * formatRankFrench(2, true)       // → "2ème ex"
 * formatRankFrench(null, false)   // → "—"
 */
export function formatRankFrench(
  rank: number | null,
  isExAequo = false,
  gender?: 'M' | 'F',
): string {
  if (rank === null || rank === undefined || rank <= 0) {
    return '—';
  }

  let suffix: string;
  if (rank === 1) {
    suffix = gender === 'F' ? 'ère' : 'er';
  } else {
    suffix = 'ème';
  }

  const base = `${rank}${suffix}`;
  return isExAequo ? `${base} ex` : base;
}

/**
 * Détecte et regroupe tous les ex æquo d'une liste de notes.
 *
 * @param entries - Entrées prétriées par score décroissant.
 * @returns Liste des groupes d'ex æquo (groupes ayant count > 1).
 */
export function detectTieGroups(entries: ScoreEntry[], ranksMap: Map<string, CalculatedRank>): TieGroup[] {
  const scoreMap = new Map<number, { rank: number; studentIds: string[] }>();

  for (const entry of entries) {
    const calculated = ranksMap.get(entry.studentId);
    if (!calculated) continue;

    const existing = scoreMap.get(entry.score);
    if (existing) {
      existing.studentIds.push(entry.studentId);
    } else {
      scoreMap.set(entry.score, {
        rank: calculated.rank,
        studentIds: [entry.studentId],
      });
    }
  }

  const tieGroups: TieGroup[] = [];
  scoreMap.forEach((val, score) => {
    if (val.studentIds.length > 1) {
      tieGroups.push({
        score,
        rank: val.rank,
        count: val.studentIds.length,
        studentIds: val.studentIds,
      });
    }
  });

  return tieGroups;
}

/**
 * Calcule les rangs et résout les ex æquo en appliquant la stratégie fournie.
 *
 * @param entries  - Entrées de score (doivent être triées desc par score).
 * @param strategy - Stratégie de classement à appliquer.
 * @returns Map indexée par studentId vers le résultat de rang calculé.
 */
export function resolveRanks(
  entries: ScoreEntry[],
  strategy: IRankingStrategy,
): Map<string, CalculatedRank> {
  return strategy.calculateRanks(entries);
}
