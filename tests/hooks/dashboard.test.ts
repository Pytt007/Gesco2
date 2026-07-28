import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardAlerts } from '../../src/hooks/dashboard/useDashboardAlerts';
import { useCalendarEvents } from '../../src/hooks/dashboard/useCalendarEvents';

describe('Dashboard Hooks Layer', () => {
  const schoolYear = '2026-2027';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useDashboardAlerts', () => {
    it('loads alerts and exposes data', async () => {
      const { result } = renderHook(() => useDashboardAlerts(schoolYear));
      expect(result.current.data).toBeDefined();
    });
  });

  describe('useCalendarEvents', () => {
    it('loads upcoming calendar events', async () => {
      const { result } = renderHook(() => useCalendarEvents(schoolYear));
      expect(result.current.data).toBeDefined();
    });
  });
});
