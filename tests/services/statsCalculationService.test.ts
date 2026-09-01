import { describe, it, expect } from 'vitest';
import { statsCalculationService } from '../../src/services/stats';

describe('Stats Calculation Service & Zero Division Protection (P2-10)', () => {
  describe('calculateSuccessRate', () => {
    it('returns correct percentage for valid data', () => {
      expect(statsCalculationService.calculateSuccessRate(15, 20)).toBe(75);
      expect(statsCalculationService.calculateSuccessRate(1, 3)).toBe(33.3);
    });

    it('handles zero or negative denominators safely without NaN / Infinity', () => {
      expect(statsCalculationService.calculateSuccessRate(0, 0)).toBe(0);
      expect(statsCalculationService.calculateSuccessRate(5, 0)).toBe(0);
      expect(statsCalculationService.calculateSuccessRate(5, -10)).toBe(0);
      expect(statsCalculationService.calculateSuccessRate(-5, 20)).toBe(0);
    });
  });

  describe('calculateAverage', () => {
    it('computes arithmetic average accurately', () => {
      expect(statsCalculationService.calculateAverage([10, 12, 14])).toBe(12);
      expect(statsCalculationService.calculateAverage([15, 17, 19])).toBe(17);
    });

    it('computes weighted average accurately', () => {
      // (10*1 + 20*3) / 4 = 70/4 = 17.5
      expect(statsCalculationService.calculateAverage([10, 20], [1, 3])).toBe(17.5);
    });

    it('handles empty arrays, non-numeric and NaN values safely', () => {
      expect(statsCalculationService.calculateAverage([])).toBe(0);
      expect(statsCalculationService.calculateAverage([NaN, null as any, undefined as any])).toBe(0);
      expect(statsCalculationService.calculateAverage([10, NaN, 20])).toBe(15);
    });
  });

  describe('calculateAttendanceRate', () => {
    it('calculates presence percentage correctly', () => {
      expect(statsCalculationService.calculateAttendanceRate(18, 20)).toBe(90);
    });

    it('handles zero sessions safely', () => {
      expect(statsCalculationService.calculateAttendanceRate(0, 0)).toBe(0);
      expect(statsCalculationService.calculateAttendanceRate(10, 0)).toBe(0);
    });
  });

  describe('calculateRecoveryRate', () => {
    it('calculates financial recovery rate correctly', () => {
      expect(statsCalculationService.calculateRecoveryRate(85000, 100000)).toBe(85);
    });

    it('handles zero due amount safely', () => {
      expect(statsCalculationService.calculateRecoveryRate(0, 0)).toBe(0);
      expect(statsCalculationService.calculateRecoveryRate(50000, 0)).toBe(0);
    });
  });

  describe('calculateGenderDistribution', () => {
    it('calculates distribution and ratios correctly', () => {
      const students = [
        { gender: 'Féminin' },
        { gender: 'F' },
        { gender: 'FEMALE' },
        { gender: 'Masculin' },
        { gender: 'M' },
      ];
      const res = statsCalculationService.calculateGenderDistribution(students);
      expect(res.girls).toBe(3);
      expect(res.boys).toBe(2);
      expect(res.total).toBe(5);
      expect(res.girlRatio).toBe(60);
      expect(res.boyRatio).toBe(40);
    });

    it('handles empty student list safely', () => {
      const res = statsCalculationService.calculateGenderDistribution([]);
      expect(res.girls).toBe(0);
      expect(res.boys).toBe(0);
      expect(res.total).toBe(0);
      expect(res.girlRatio).toBe(0);
      expect(res.boyRatio).toBe(0);
    });
  });

  describe('calculateClassStatistics', () => {
    it('calculates full class statistics: average, min, max, median, passRate', () => {
      const scores = [8, 12, 14, 16, 18];
      const stats = statsCalculationService.calculateClassStatistics(scores);

      expect(stats.totalStudents).toBe(5);
      expect(stats.average).toBe(13.6);
      expect(stats.min).toBe(8);
      expect(stats.max).toBe(18);
      expect(stats.median).toBe(14);
      expect(stats.passedCount).toBe(4);
      expect(stats.failedCount).toBe(1);
      expect(stats.passRate).toBe(80);
    });

    it('handles empty scores safely', () => {
      const stats = statsCalculationService.calculateClassStatistics([]);
      expect(stats.totalStudents).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.passRate).toBe(0);
    });
  });

  describe('calculateFinancialKPIs', () => {
    it('consolidates financial enrollments correctly', () => {
      const enrollments = [
        { totalPaid: 50000, remainingBalance: 25000, netTotalDue: 75000 },
        { totalPaid: 25000, remainingBalance: 0, netTotalDue: 25000 },
      ];
      const res = statsCalculationService.calculateFinancialKPIs(enrollments);
      expect(res.totalPaid).toBe(75000);
      expect(res.remainingBalance).toBe(25000);
      expect(res.totalDue).toBe(100000);
      expect(res.recoveryRate).toBe(75);
    });

    it('handles empty enrollments safely', () => {
      const res = statsCalculationService.calculateFinancialKPIs([]);
      expect(res.totalDue).toBe(0);
      expect(res.totalPaid).toBe(0);
      expect(res.remainingBalance).toBe(0);
      expect(res.recoveryRate).toBe(0);
    });
  });
});
