// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook Tableau de Bord
// Charge les métriques et graphiques via dashboardService
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { fetchDashboardMetrics, DashboardStats } from '../services/common/dashboardService';

export function useDashboardData(schoolYear: string) {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFeesCollected: 0,
    totalFeesRemaining: 0,
    totalExpenses: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchDashboardMetrics(schoolYear)
      .then((metrics) => {
        if (!cancelled) {
          setStats(metrics);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useDashboardData] Erreur:', err);
          setError(err.message || 'Erreur de chargement');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schoolYear]);

  return { stats, loading, error };
}
