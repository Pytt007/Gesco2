// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useDashboardKPIs
// Chargement et rafraîchissement des KPIs principaux et financiers via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getMainKPIs, getFinancialKPIs, MainKPIs, FinancialKPIs } from '../../services/dashboard/dashboardService';

export function useDashboardKPIs(schoolYear: string) {
  const [mainKPIs, setMainKPIs] = useState<MainKPIs | null>(null);
  const [financialKPIs, setFinancialKPIs] = useState<FinancialKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mainData, finData] = await Promise.all([
        getMainKPIs(schoolYear),
        getFinancialKPIs(schoolYear),
      ]);
      setMainKPIs(mainData);
      setFinancialKPIs(finData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[useDashboardKPIs] Erreur:', err);
      setError(err.message || 'Erreur lors du chargement des KPIs du Dashboard.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  return {
    data: {
      main: mainKPIs,
      financial: financialKPIs,
    },
    loading,
    error,
    lastUpdated,
    refresh: fetchKPIs,
  };
}
