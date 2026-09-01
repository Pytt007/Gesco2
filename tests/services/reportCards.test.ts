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
    expect(res.stats).toBeDefined();
    expect(res.stats?.classAverage).toBe(8.5);
    expect(res.stats?.highestAverage).toBe(8.5);
    expect(res.stats?.successRate).toBe(100);
  });

  it('identifies incomplete student records and reasons accurately', async () => {
    vi.spyOn(assessmentResultsService, 'getResultsBySession').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'res-inc-1',
          sessionId: 'sess-inc',
          studentId: 'st-inc-1',
          studentName: 'Incomplete Student',
          isCompleted: false,
          correctionStatus: 'IN_PROGRESS',
          total: null,
          average: null,
          rank: null,
          appreciation: null,
          decision: null,
          scores: [],
        } as any,
      ],
    });

    const val = await reportCardsService.validateClassReportCards('sess-inc');
    expect(val.isReadyForGeneration).toBe(false);
    expect(val.incompleteCount).toBe(1);
    expect(val.incompleteStudents[0].reasons).toContain('MISSING_SCORES');
    expect(val.incompleteStudents[0].reasons).toContain('CALCULATION_PENDING');
    expect(val.incompleteStudents[0].reasons).toContain('RANK_MISSING');
    expect(val.incompleteStudents[0].reasons).toContain('APPRECIATION_MISSING');
    expect(val.incompleteStudents[0].reasons).toContain('DECISION_MISSING');
  });

  it('generates a preview document for an individual student', async () => {
    vi.spyOn(assessmentResultsService, 'getResultsBySession').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'res-preview-1',
          sessionId: 'sess-prev',
          studentId: 'st-prev-1',
          studentName: 'Preview Student',
          average: 14.5,
          rank: 2,
          appreciation: 'Bien',
          decision: 'Passe',
          scores: [],
        } as any,
      ],
    });

    const preview = await reportCardsService.previewStudentReportCard('sess-prev', 'st-prev-1', 'CM1');
    expect(preview).toBeDefined();
    expect(preview.fullHtml).toContain('Preview Student');
  });
});
