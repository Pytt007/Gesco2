// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAssessmentSession (src/hooks/academic/sessions/useAssessmentSession.ts)
// Gestion réactive d'une session d'évaluation individuelle par identifiant.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getSession,
  updateSession,
  lockSession,
  unlockSession,
  publishSession,
  archiveSession,
  duplicateSession,
  AssessmentSession,
} from '../../../services/academic/sessions';

export function useAssessmentSession(id?: string) {
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSessionDetails = useCallback(async () => {
    if (!id) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getSession(id);
      if (res.success && res.data) {
        setSession(res.data);
      } else {
        setError(res.error || `Erreur de chargement de la session ${id}.`);
        setSession(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la session.');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  const update = useCallback(
    async (updates: Partial<AssessmentSession>): Promise<boolean> => {
      if (!id) return false;
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateSession(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          return false;
        }
        setSuccess('Session mise à jour avec succès.');
        await fetchSessionDetails();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [id, fetchSessionDetails]
  );

  const lock = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await lockSession(id);
      if (!res.success) {
        setError(res.error || 'Erreur de verrouillage.');
        setSaving(false);
        return false;
      }
      setSuccess('Session verrouillée.');
      await fetchSessionDetails();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du verrouillage.');
      setSaving(false);
      return false;
    }
  }, [id, fetchSessionDetails]);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await unlockSession(id);
      if (!res.success) {
        setError(res.error || 'Erreur de déverrouillage.');
        setSaving(false);
        return false;
      }
      setSuccess('Session déverrouillée.');
      await fetchSessionDetails();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du déverrouillage.');
      setSaving(false);
      return false;
    }
  }, [id, fetchSessionDetails]);

  const publish = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await publishSession(id);
      if (!res.success) {
        setError(res.error || 'Erreur de publication.');
        setSaving(false);
        return false;
      }
      setSuccess('Session publiée avec succès.');
      await fetchSessionDetails();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication.');
      setSaving(false);
      return false;
    }
  }, [id, fetchSessionDetails]);

  const archive = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await archiveSession(id);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
      setSuccess('Session archivée.');
      await fetchSessionDetails();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur d\'archivage.');
      setSaving(false);
      return false;
    }
  }, [id, fetchSessionDetails]);

  const duplicate = useCallback(
    async (targetClassroomId?: string, newTitle?: string): Promise<boolean> => {
      if (!id) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await duplicateSession(id, targetClassroomId, newTitle);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la duplication.');
          setSaving(false);
          return false;
        }
        setSuccess('Session dupliquée avec succès.');
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de duplication.');
        setSaving(false);
        return false;
      }
    },
    [id]
  );

  return {
    session,
    loading,
    saving,
    error,
    success,
    refresh: fetchSessionDetails,
    update,
    lock,
    unlock,
    publish,
    archive,
    duplicate,
  };
}
