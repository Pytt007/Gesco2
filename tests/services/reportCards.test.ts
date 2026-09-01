import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportCardsService } from '../../src/services/academic/reports/reportCardsService';
import * as assessmentResultsService from '../../src/services/academic/results/assessmentResultsService';

describe('Report Cards Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps levels to categories and templates correctly', () => {
    expect(reportCardsService.resolveLevelCategory('PS')).toBe('PRESCHOOL');
    expect(reportCardsService.resolveLevelCategory('CP1')).toBe('CP');
    expect(reportCardsService.resolveLevelCategory('CE2')).toBe('CE');
    expect(reportCardsService.resolveLevelCategory('CM2')).toBe('CM');

    expect(reportCardsService.getTemplateCodeForLevel('PRESCHOOL')).toBe('BULLETIN_PRESCHOOL');
    expect(reportCardsService.getTemplateCodeForLevel('CP')).toBe('BULLETIN_CP');
  });

  it('validates class readiness and generates batch report cards', async () => {
    // 1. Session vide
    const valEmpty = await reportCardsService.validateClassReportCards('empty-session');
    expect(valEmpty.isReadyForGeneration).toBe(false);

    // 2. Session avec résultats complets mockés
    vi.spyOn(assessmentResultsService, 'getResultsBySession').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'res-unit-1',
          sessionId: 'sess-unit-1',
          studentId: 'st-unit-1',
          studentName: 'Kouassi Yves',
          studentMatricule: 'MAT-2026-001',
          isCompleted: true,
          correctionStatus: 'VALIDATED',
          total: 85,
          average: 8.5,
          rank: 1,
          classSize: 1,
          gender: 'Masculin',
          appreciation: 'Très bon travail',
          decision: 'Admis',
          mention: 'Bien',
          scores: [
            { subjectId: 'math', score: 18, maxScore: 20, appreciation: 'Excellent' },
            { subjectId: 'fr', score: 16, maxScore: 20, appreciation: 'Très bien' },
          ],
          subjectResults: [],
        } as any,
      ],
    });

    const val = await reportCardsService.validateClassReportCards('sess-unit-1');
    expect(val.isReadyForGeneration).toBe(true);

    const res = await reportCardsService.generateClassReportCards('sess-unit-1', 'cls-1', 'CP1', 'Admin');
    expect(res.generatedCount).toBeGreaterThan(0);
    expect(res.combinedHtml).toContain('<!DOCTYPE html>');
  });
});
