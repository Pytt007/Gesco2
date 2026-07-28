// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useRecentActivities
// Chargement du flux des activités récentes (audit_logs) via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getRecentActivities } from '../../services/dashboard/dashboardService';
import { ActivityLog } from '../../types';

export function useRecentActivities(schoolYear: string, limit: number = 10) {
  const [data, setData] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await getRecentActivities(schoolYear, limit);
      setData(logs);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[useRecentActivities] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des activités régleurs.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchActivities,
  };
}
