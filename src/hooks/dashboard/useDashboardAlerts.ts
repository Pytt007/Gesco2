// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useDashboardAlerts
// Gestion et tri des alertes système via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAlerts, DashboardAlertItem } from '../../services/dashboard/dashboardService';

export function useDashboardAlerts(schoolYear: string) {
  const [data, setData] = useState<DashboardAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const alertList = await getAlerts(schoolYear);
      setData(alertList);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[useDashboardAlerts] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des alertes.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const criticalCount = useMemo(() => {
    return data.filter((a) => a.type === 'CRITICAL').length;
  }, [data]);

  return {
    data,
    criticalCount,
    loading,
    error,
    lastUpdated,
    refresh: fetchAlerts,
  };
}
