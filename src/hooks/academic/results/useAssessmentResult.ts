// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAssessmentResult (src/hooks/academic/results/useAssessmentResult.ts)
// Hook réactif pour la consultation et la saisie individuelle d'un résultat d'élève.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getResult,
  saveDraft,
  submitForValidation,
  validateResult,
  publishResult,
  AssessmentResult,
  ScoreInput,
} from '../../../services/academic/results';

export function useAssessmentResult(resultId?: string) {
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSingleResult = useCallback(async () => {
    if (!resultId) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getResult(resultId);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || `Erreur de chargement du résultat ${resultId}.`);
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du résultat.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchSingleResult();
  }, [fetchSingleResult]);

  const saveScores = useCallback(
    async (
      scores: ScoreInput[],
      level = 'CP1',
      assessmentType = 'MONTHLY'
    ): Promise<boolean> => {
      if (!result?.assessmentSessionId || !result?.studentId) return false;
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await saveDraft(
          result.assessmentSessionId,
          result.studentId,
          scores,
          level,
          assessmentType
        );
        if (!res.success) {
          setError(res.error || 'Erreur lors de la sauvegarde.');
          setSaving(false);
          return false;
        }
        setSuccess('Notes sauvegardées.');
        await fetchSingleResult();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de sauvegarde.');
        setSaving(false);
        return false;
      }
    },
    [result, fetchSingleResult]
  );

  const submit = useCallback(async (): Promise<boolean> => {
    if (!resultId) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await submitForValidation(resultId);
      if (!res.success) {
        setError(res.error || 'Erreur de soumission.');
        setSaving(false);
        return false;
      }
      setSuccess('Résultat soumis pour validation.');
      await fetchSingleResult();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de soumission.');
      setSaving(false);
      return false;
    }
  }, [resultId, fetchSingleResult]);

  const validate = useCallback(
    async (validatorName = 'Direction'): Promise<boolean> => {
      if (!resultId) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await validateResult(resultId, validatorName);
        if (!res.success) {
          setError(res.error || 'Erreur de validation.');
          setSaving(false);
          return false;
        }
        setSuccess('Résultat validé.');
        await fetchSingleResult();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de validation.');
        setSaving(false);
        return false;
      }
    },
    [resultId, fetchSingleResult]
  );

  const publish = useCallback(async (): Promise<boolean> => {
    if (!resultId) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await publishResult(resultId);
      if (!res.success) {
        setError(res.error || 'Erreur de publication.');
        setSaving(false);
        return false;
      }
      setSuccess('Résultat publié.');
      await fetchSingleResult();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de publication.');
      setSaving(false);
      return false;
    }
  }, [resultId, fetchSingleResult]);

  return {
    result,
    loading,
    saving,
    error,
    success,
    refresh: fetchSingleResult,
    saveScores,
    submit,
    validate,
    publish,
  };
}
