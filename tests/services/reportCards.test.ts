import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportCardsService } from '../../src/services/academic/reports/reportCardsService';

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
    const val = await reportCardsService.validateClassReportCards('sess-unit-1');
    expect(val.isReadyForGeneration).toBe(true);

    const res = await reportCardsService.generateClassReportCards('sess-unit-1', 'cls-1', 'CP1', 'Admin');
    expect(res.generatedCount).toBeGreaterThan(0);
    expect(res.combinedHtml).toContain('<!DOCTYPE html>');
  });
});
