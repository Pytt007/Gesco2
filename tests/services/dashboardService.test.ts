import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMainKPIs,
  getFinancialKPIs,
  getStudentStatistics,
  getFinancialCharts,
  getAlerts,
  getRecentActivities,
  getCalendarEvents,
  invalidateDashboardCache,
  dashboardService,
} from '../../src/services/dashboard/dashboardService';

describe('Dashboard Service Layer', () => {
  const schoolYear = '2026-2027';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getMainKPIs returns formatted main KPIs', async () => {
    const kpis = await getMainKPIs(schoolYear);
    expect(kpis).toBeDefined();
    expect(kpis.totalStudents).toBeGreaterThanOrEqual(0);
    expect(kpis.girlsCount).toBeGreaterThanOrEqual(0);
    expect(kpis.boysCount).toBeGreaterThanOrEqual(0);
    expect(kpis.todayAttendances).toBeGreaterThanOrEqual(0);
  });

  it('getFinancialKPIs returns financial metrics', async () => {
    const fin = await getFinancialKPIs(schoolYear);
    expect(fin).toBeDefined();
    expect(fin.expectedAmount).toBeGreaterThanOrEqual(0);
    expect(fin.collectedAmount).toBeGreaterThanOrEqual(0);
    expect(fin.collectionRatePercent).toBeGreaterThanOrEqual(0);
  });

  it('getStudentStatistics returns level distributions', async () => {
    const stats = await getStudentStatistics(schoolYear);
    expect(stats).toBeDefined();
    expect(stats.genderRatio).toBeDefined();
    expect(stats.countByLevel).toBeDefined();
  });

  it('getFinancialCharts returns revenue and expense time-series', async () => {
    const charts = await getFinancialCharts(schoolYear);
    expect(Array.isArray(charts.monthlyRevenues)).toBe(true);
    expect(Array.isArray(charts.monthlyExpenses)).toBe(true);
    expect(charts.monthlyRevenues.length).toBeGreaterThanOrEqual(6);
  });

  it('getAlerts returns priority sorted alerts', async () => {
    const alerts = await getAlerts(schoolYear);
    expect(Array.isArray(alerts)).toBe(true);
    if (alerts.length > 1) {
      expect(alerts[0].severityPriority).toBeLessThanOrEqual(alerts[alerts.length - 1].severityPriority);
    }
  });

  it('getRecentActivities returns audit log records', async () => {
    const logs = await getRecentActivities(schoolYear, 5);
    expect(Array.isArray(logs)).toBe(true);
  });

  it('getCalendarEvents returns upcoming events', async () => {
    const events = await getCalendarEvents(schoolYear);
    expect(Array.isArray(events)).toBe(true);
  });

  it('supports cache invalidation and instant cached retrieval (P1-03)', async () => {
    const kpis1 = await getMainKPIs(schoolYear);
    const kpis2 = await getMainKPIs(schoolYear);
    expect(kpis1).toEqual(kpis2);

    const master1 = await dashboardService.getMasterKPIs(schoolYear);
    const master2 = await dashboardService.getMasterKPIs(schoolYear);
    expect(master1).toEqual(master2);

    // Invalidation
    invalidateDashboardCache();
    const master3 = await dashboardService.getMasterKPIs(schoolYear);
    expect(master3).toBeDefined();
    expect(master3.totalStudents).toBeGreaterThanOrEqual(0);
  });
});
