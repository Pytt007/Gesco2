// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAssessmentResults (src/hooks/academic/results/useAssessmentResults.ts)
// Hook réactif pour la gestion des résultats d'évaluation d'une session ou classe.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getResultsBySession,
  saveDraft,
  submitForValidation,
  validateResult,
  publishResult,
  AssessmentResult,
  ScoreInput,
} from '../../../services/academic/results';

export function useAssessmentResults(sessionId?: string) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchResultsData = useCallback(async () => {
    if (!sessionId) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getResultsBySession(sessionId);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setError(res.error || 'Erreur lors du chargement des résultats.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des résultats.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchResultsData();
  }, [fetchResultsData]);

  const saveStudentDraft = useCallback(
    async (
      studentId: string,
      scores: ScoreInput[],
      level = 'CP1',
      assessmentType = 'MONTHLY'
    ): Promise<boolean> => {
      if (!sessionId) return false;
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await saveDraft(sessionId, studentId, scores, level, assessmentType);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la sauvegarde du brouillon.');
          setSaving(false);
          return false;
        }
        setSuccess('Brouillon sauvegardé et notes recalculées.');
        await fetchResultsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de sauvegarde.');
        setSaving(false);
        return false;
      }
    },
    [sessionId, fetchResultsData]
  );

  const submitStudent = useCallback(
    async (resultId: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await submitForValidation(resultId);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la soumission.');
          setSaving(false);
          return false;
        }
        setSuccess('Résultat soumis pour validation.');
        await fetchResultsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de soumission.');
        setSaving(false);
        return false;
      }
    },
    [fetchResultsData]
  );

  const validateStudent = useCallback(
    async (resultId: string, validatorName = 'Direction'): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await validateResult(resultId, validatorName);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la validation.');
          setSaving(false);
          return false;
        }
        setSuccess('Résultat validé par la direction.');
        await fetchResultsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de validation.');
        setSaving(false);
        return false;
      }
    },
    [fetchResultsData]
  );

  const publishSessionResults = useCallback(
    async (resultId: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await publishResult(resultId);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la publication.');
          setSaving(false);
          return false;
        }
        setSuccess('Résultats publiés avec succès.');
        await fetchResultsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de publication.');
        setSaving(false);
        return false;
      }
    },
    [fetchResultsData]
  );

  return {
    results,
    loading,
    saving,
    error,
    success,
    refresh: fetchResultsData,
    saveStudentDraft,
    submitStudent,
    validateStudent,
    publishSessionResults,
  };
}
