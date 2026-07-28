/**
 * GESCO — Master Hook Dashboard (src/hooks/dashboard/useDashboard.ts)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DashboardKPIsMaster,
  AlertMasterItem,
  ActivityItem,
  CalendarEventMaster,
  GlobalSearchResult,
  dashboardService,
} from '../../services/dashboard/dashboardService';

export function useDashboard(academicYearId: string = 'ay-2026') {
  const [kpis, setKpis] = useState<DashboardKPIsMaster | null>(null);
  const [alerts, setAlerts] = useState<AlertMasterItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventMaster[]>([]);
  
  // Recherche globale
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, alertData, activityData, eventData] = await Promise.all([
        dashboardService.getMasterKPIs(academicYearId),
        dashboardService.getDashboardAlerts(academicYearId),
        dashboardService.getRecentActivities(),
        dashboardService.getCalendarEvents(),
      ]);

      setKpis(kpiData);
      setAlerts(alertData);
      setRecentActivities(activityData);
      setCalendarEvents(eventData);
    } catch {
      setError('Erreur lors du chargement des données du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Recherche globale avec debounce / async
  const handleGlobalSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await dashboardService.globalSearch(query);
      setSearchResults(res);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    kpis,
    alerts,
    recentActivities,
    calendarEvents,
    searchQuery,
    searchResults,
    isSearching,
    loading,
    error,
    handleGlobalSearch,
    clearSearch: () => { setSearchQuery(''); setSearchResults([]); },
    reloadAll: fetchAllData,
  };
}
