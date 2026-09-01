/**
 * GESCO — Service de Calculs Statistiques et d'Agrégation
 * Fournit des méthodes robustes garantissant l'absence de division par zéro (NaN / Infinity)
 */

import {
  ClassStatisticsResult,
  GenderDistributionResult,
  FinancialKPIResult,
} from './types';

export const statsCalculationService = {
  /**
   * Calcule un taux de réussite (pourcentage entre 0 et 100)
   * Protégé contre totalCount <= 0
   */
  calculateSuccessRate(passedCount: number, totalCount: number, decimals: number = 1): number {
    if (!totalCount || totalCount <= 0 || !passedCount || passedCount <= 0) {
      return 0;
    }
    const rate = Math.min(100, Math.max(0, (passedCount / totalCount) * 100));
    return Number(rate.toFixed(decimals));
  },

  /**
   * Calcule une moyenne arithmétique ou pondérée
   * Protégé contre les tableaux vides ou somme des poids nulle
   */
  calculateAverage(scores: number[], weights?: number[], decimals: number = 2): number {
    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return 0;
    }

    const validScores: number[] = [];
    const validWeights: number[] = [];

    scores.forEach((s, idx) => {
      if (typeof s === 'number' && !isNaN(s) && isFinite(s)) {
        validScores.push(s);
        const w = weights && typeof weights[idx] === 'number' && !isNaN(weights[idx]) && weights[idx] > 0
          ? weights[idx]
          : 1;
        validWeights.push(w);
      }
    });

    if (validScores.length === 0) {
      return 0;
    }

    const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) {
      return 0;
    }

    const weightedSum = validScores.reduce((sum, score, idx) => sum + score * validWeights[idx], 0);
    const avg = weightedSum / totalWeight;
    return Number(avg.toFixed(decimals));
  },

  /**
   * Calcule un taux d'assiduité / présence (en pourcentage 0-100)
   * Protégé contre totalSessions <= 0
   */
  calculateAttendanceRate(presentCount: number, totalSessions: number, decimals: number = 1): number {
    if (!totalSessions || totalSessions <= 0 || !presentCount || presentCount <= 0) {
      return 0;
    }
    const rate = Math.min(100, Math.max(0, (presentCount / totalSessions) * 100));
    return Number(rate.toFixed(decimals));
  },

  /**
   * Calcule le taux de recouvrement financier
   * Protégé contre totalDueAmount <= 0
   */
  calculateRecoveryRate(collectedAmount: number, totalDueAmount: number, decimals: number = 1): number {
    if (!totalDueAmount || totalDueAmount <= 0 || !collectedAmount || collectedAmount <= 0) {
      return 0;
    }
    const rate = Math.min(100, Math.max(0, (collectedAmount / totalDueAmount) * 100));
    return Number(rate.toFixed(decimals));
  },

  /**
   * Calcule la répartition filles / garçons et leurs ratios
   */
  calculateGenderDistribution(
    students: Array<{ gender?: string }>,
    decimals: number = 1
  ): GenderDistributionResult {
    if (!students || !Array.isArray(students) || students.length === 0) {
      return {
        girls: 0,
        boys: 0,
        total: 0,
        girlRatio: 0,
        boyRatio: 0,
      };
    }

    let girls = 0;
    let boys = 0;

    students.forEach((s) => {
      const g = (s?.gender || '').toUpperCase();
      if (g === 'F' || g === 'FEMALE' || g === 'FÉMININ' || g === 'FEMININ') {
        girls++;
      } else if (g === 'M' || g === 'MALE' || g === 'MASCULIN') {
        boys++;
      }
    });

    const total = girls + boys || students.length;
    const girlRatio = total > 0 ? Number(((girls / total) * 100).toFixed(decimals)) : 0;
    const boyRatio = total > 0 ? Number(((boys / total) * 100).toFixed(decimals)) : 0;

    return {
      girls,
      boys,
      total,
      girlRatio,
      boyRatio,
    };
  },

  /**
   * Calcule les statistiques complètes d'un ensemble de notes
   */
  calculateClassStatistics(scores: number[], passThreshold: number = 10): ClassStatisticsResult {
    const validScores = (scores || [])
      .filter((s) => typeof s === 'number' && !isNaN(s) && isFinite(s))
      .sort((a, b) => a - b);

    if (validScores.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        passRate: 0,
        totalStudents: 0,
        passedCount: 0,
        failedCount: 0,
      };
    }

    const totalStudents = validScores.length;
    const sum = validScores.reduce((a, b) => a + b, 0);
    const average = Number((sum / totalStudents).toFixed(2));
    const min = validScores[0];
    const max = validScores[validScores.length - 1];

    // Médiane
    const mid = Math.floor(totalStudents / 2);
    const median = totalStudents % 2 !== 0
      ? validScores[mid]
      : Number(((validScores[mid - 1] + validScores[mid]) / 2).toFixed(2));

    const passedCount = validScores.filter((s) => s >= passThreshold).length;
    const failedCount = totalStudents - passedCount;
    const passRate = Number(((passedCount / totalStudents) * 100).toFixed(1));

    return {
      average,
      min,
      max,
      median,
      passRate,
      totalStudents,
      passedCount,
      failedCount,
    };
  },

  /**
   * Calcule les KPIs financiers consolidés
   */
  calculateFinancialKPIs(enrollments: Array<{ totalPaid?: number; remainingBalance?: number; netTotalDue?: number }>): FinancialKPIResult {
    if (!enrollments || !Array.isArray(enrollments) || enrollments.length === 0) {
      return {
        totalDue: 0,
        totalPaid: 0,
        remainingBalance: 0,
        recoveryRate: 0,
      };
    }

    const totalPaid = enrollments.reduce((sum, e) => sum + (e.totalPaid || 0), 0);
    const remainingBalance = enrollments.reduce((sum, e) => sum + (e.remainingBalance || 0), 0);
    const totalDue = enrollments.reduce((sum, e) => sum + (e.netTotalDue || (e.totalPaid || 0) + (e.remainingBalance || 0)), 0);
    const recoveryRate = this.calculateRecoveryRate(totalPaid, totalDue);

    return {
      totalDue,
      totalPaid,
      remainingBalance,
      recoveryRate,
    };
  },
};
