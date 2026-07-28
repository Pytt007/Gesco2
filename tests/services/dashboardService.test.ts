import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMainKPIs,
  getFinancialKPIs,
  getStudentStatistics,
  getFinancialCharts,
  getAlerts,
  getRecentActivities,
  getCalendarEvents,
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
    expect(charts.monthlyRevenues.length).toBe(6);
    expect(charts.monthlyExpenses.length).toBe(6);
  });

  it('getAlerts returns priority sorted alerts', async () => {
    const alerts = await getAlerts(schoolYear);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severityPriority).toBeLessThanOrEqual(alerts[alerts.length - 1].severityPriority);
  });

  it('getRecentActivities returns audit log records', async () => {
    const logs = await getRecentActivities(schoolYear, 5);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].id).toBeDefined();
  });

  it('getCalendarEvents returns upcoming events', async () => {
    const events = await getCalendarEvents(schoolYear);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].title).toBeDefined();
  });
});
