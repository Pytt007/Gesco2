// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useDashboardCharts
// Chargement des graphiques financiers via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getFinancialCharts, DashboardPoint } from '../../services/dashboard/dashboardService';

export function useDashboardCharts(schoolYear: string) {
  const [data, setData] = useState<DashboardPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCharts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const charts = await getFinancialCharts(schoolYear);
      setData(charts.chartSeries || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[useDashboardCharts] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des graphiques.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchCharts,
  };
}
