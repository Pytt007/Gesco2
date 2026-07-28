// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useCalendarEvents
// Événements à venir via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getCalendarEvents, CalendarEventItem } from '../../services/dashboard/dashboardService';

export function useCalendarEvents(schoolYear: string) {
  const [data, setData] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCalendarEvents(schoolYear);
      setData(list);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[useCalendarEvents] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des événements du calendrier.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchEvents,
  };
}
