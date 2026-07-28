// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useCorrectionProgress (src/hooks/academic/results/useCorrectionProgress.ts)
// Hook réactif pour le suivi en temps réel du taux d'avancement des corrections.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getCorrectionProgress, CorrectionProgress } from '../../../services/academic/results';

export function useCorrectionProgress(sessionId?: string) {
  const [progress, setProgress] = useState<CorrectionProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgressData = useCallback(async () => {
    if (!sessionId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getCorrectionProgress(sessionId);
      if (res.success && res.data) {
        setProgress(res.data);
      } else {
        setError(res.error || 'Erreur lors du calcul de la progression.');
        setProgress(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de communication avec le service.');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  return {
    progress,
    loading,
    error,
    refresh: fetchProgressData,
  };
}
