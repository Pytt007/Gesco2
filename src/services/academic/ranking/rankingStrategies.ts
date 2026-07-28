// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Ranking Strategies
// src/services/academic/ranking/rankingStrategies.ts
//
// Stratégies de calcul des rangs (Strategy Pattern).
// Architecture ouverte au principe OCP (Open/Closed Principle) :
//   nouvelles stratégies ajoutables via le registre sans modifier le moteur.
// ─────────────────────────────────────────────────────────────────────────────

import type { RankingStrategyType } from './types';

/** Entrée minimale pour une note à classer. */
export interface ScoreEntry {
  studentId: string;
  score: number;
}

/** Résultat du calcul de rang pour une entrée. */
export interface CalculatedRank {
  studentId: string;
  rank: number;
  isExAequo: boolean;
  exAequoCount: number;
}

/** Interface obligatoire pour toute stratégie de classement. */
export interface IRankingStrategy {
  readonly code: RankingStrategyType;
  readonly name: string;
  readonly description: string;
  /**
   * Attribue un rang à chaque entrée en fonction des scores.
   * Les entrées doivent être prétriées par score décroissant.
   */
  calculateRanks(entries: ScoreEntry[]): Map<string, CalculatedRank>;
}

// ─── 1. Stratégie STANDARD (17, 17, 15 ➔ 1, 1, 3) ───────────────────────────

/**
 * Stratégie Standard (Competition Ranking avec sauts de rang).
 * Ex: Si 2 élèves ont la 1ère moyenne, tous deux sont 1er, et l'élève suivant est 3ème.
 * Standard pédagogique officiel des écoles en Côte d'Ivoire.
 */
export class StandardRankingStrategy implements IRankingStrategy {
  readonly code: RankingStrategyType = 'STANDARD';
  readonly name = 'Classement Standard';
  readonly description = 'Rang avec sauts en cas d\'ex æquo (1, 1, 3)';

  calculateRanks(entries: ScoreEntry[]): Map<string, CalculatedRank> {
    const result = new Map<string, CalculatedRank>();
    if (entries.length === 0) return result;

    // Compter les occurrences de chaque score
    const scoreCounts = new Map<number, number>();
    for (const e of entries) {
      scoreCounts.set(e.score, (scoreCounts.get(e.score) ?? 0) + 1);
    }

    let currentRank = 1;
    let i = 0;

    while (i < entries.length) {
      const currentScore = entries[i].score;
      const count = scoreCounts.get(currentScore) ?? 1;
      const isExAequo = count > 1;

      // Attribuer le même rang à toutes les entrées ayant le même score
      for (let j = 0; j < count; j++) {
        const entry = entries[i + j];
        result.set(entry.studentId, {
          studentId: entry.studentId,
          rank: currentRank,
          isExAequo,
          exAequoCount: count,
        });
      }

      i += count;
      currentRank += count; // Saut de rang égal au nombre d'ex æquo
    }

    return result;
  }
}

// ─── 2. Stratégie DENSE (17, 17, 15 ➔ 1, 1, 2) ───────────────────────────────

/**
 * Stratégie Dense (aucun saut de rang).
 * Ex: Si 2 élèves ont la 1ère moyenne, tous deux sont 1er, et l'élève suivant est 2ème.
 */
export class DenseRankingStrategy implements IRankingStrategy {
  readonly code: RankingStrategyType = 'DENSE';
  readonly name = 'Classement Dense';
  readonly description = 'Rang sans saut en cas d\'ex æquo (1, 1, 2)';

  calculateRanks(entries: ScoreEntry[]): Map<string, CalculatedRank> {
    const result = new Map<string, CalculatedRank>();
    if (entries.length === 0) return result;

    const scoreCounts = new Map<number, number>();
    for (const e of entries) {
      scoreCounts.set(e.score, (scoreCounts.get(e.score) ?? 0) + 1);
    }

    let currentRank = 1;
    let i = 0;

    while (i < entries.length) {
      const currentScore = entries[i].score;
      const count = scoreCounts.get(currentScore) ?? 1;
      const isExAequo = count > 1;

      for (let j = 0; j < count; j++) {
        const entry = entries[i + j];
        result.set(entry.studentId, {
          studentId: entry.studentId,
          rank: currentRank,
          isExAequo,
          exAequoCount: count,
        });
      }

      i += count;
      currentRank += 1; // Pas de saut : rang suivant séquentiel +1
    }

    return result;
  }
}

// ─── 3. Stratégie COMPETITION (17, 17, 15 ➔ 1, 2, 3 stricte) ─────────────────

/**
 * Stratégie Ordinale Stricte (aucun ex æquo).
 * Départage strict selon l'ordre d'arrivée/index.
 * Ex: Si 2 élèves ont la même moyenne, le 1er traité est 1er, le 2nd est 2ème.
 */
export class CompetitionRankingStrategy implements IRankingStrategy {
  readonly code: RankingStrategyType = 'COMPETITION';
  readonly name = 'Classement Ordinal Strict';
  readonly description = 'Rang strictement séquentiel sans ex æquo (1, 2, 3)';

  calculateRanks(entries: ScoreEntry[]): Map<string, CalculatedRank> {
    const result = new Map<string, CalculatedRank>();
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      result.set(entry.studentId, {
        studentId: entry.studentId,
        rank: i + 1,
        isExAequo: false,
        exAequoCount: 1,
      });
    }
    return result;
  }
}

// ─── 4. Stratégie CUSTOM (Extensible) ────────────────────────────────────────

/**
 * Stratégie Personnalisée extensible.
 * Permet d'injecter une fonction de calcul personnalisée à la volée.
 */
export class CustomRankingStrategy implements IRankingStrategy {
  readonly code: RankingStrategyType = 'CUSTOM';
  readonly name: string;
  readonly description: string;
  private readonly customCalculator: (entries: ScoreEntry[]) => Map<string, CalculatedRank>;

  constructor(
    name = 'Classement Personnalisé',
    description = 'Algorithme sur-mesure',
    calculator?: (entries: ScoreEntry[]) => Map<string, CalculatedRank>,
  ) {
    this.name = name;
    this.description = description;
    // Par défaut, fallback sur Standard si aucune fonction spécifique n'est injectée
    this.customCalculator = calculator ?? ((entries) => new StandardRankingStrategy().calculateRanks(entries));
  }

  calculateRanks(entries: ScoreEntry[]): Map<string, CalculatedRank> {
    return this.customCalculator(entries);
  }
}

// ─── REGISTRE DES STRATÉGIES (Registry Pattern) ──────────────────────────────

/**
 * Registre central des stratégies de classement.
 * Permet d'enregistrer de nouvelles stratégies sans modifier le moteur.
 */
export class RankingStrategyRegistry {
  private static strategies = new Map<RankingStrategyType, IRankingStrategy>([
    ['STANDARD', new StandardRankingStrategy()],
    ['DENSE', new DenseRankingStrategy()],
    ['COMPETITION', new CompetitionRankingStrategy()],
    ['CUSTOM', new CustomRankingStrategy()],
  ]);

  /** Récupère une stratégie par son code. Fallback sur STANDARD si inconnue. */
  static getStrategy(code?: RankingStrategyType): IRankingStrategy {
    if (!code) return this.strategies.get('STANDARD')!;
    const strategy = this.strategies.get(code);
    if (!strategy) {
      console.warn(`[RankingStrategyRegistry] Stratégie "${code}" inconnue. Fallback sur STANDARD.`);
      return this.strategies.get('STANDARD')!;
    }
    return strategy;
  }

  /** Enregistre ou remplace une stratégie dans le registre. */
  static registerStrategy(strategy: IRankingStrategy): void {
    this.strategies.set(strategy.code, strategy);
  }

  /** Récupère la liste de toutes les stratégies enregistrées. */
  static getAvailableStrategies(): IRankingStrategy[] {
    return Array.from(this.strategies.values());
  }
}
