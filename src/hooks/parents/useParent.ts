// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useParent (src/hooks/parents/useParent.ts)
// Chargement et mise à jour de la fiche individuelle d'un responsable légal
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getParentById,
  updateParent,
  archiveParent,
  restoreParent,
  Parent,
} from '../../services/parents/parentsService';

export function useParent(parentId?: string) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchParent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getParentById(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Responsable légal introuvable.');
        setParent(null);
      } else {
        setParent(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la fiche responsable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (parentId) {
      fetchParent(parentId);
    }
  }, [parentId, fetchParent]);

  const update = useCallback(
    async (updates: Partial<Parent>): Promise<boolean> => {
      if (!parentId) return false;
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateParent(parentId, updates);
        if (!res.success || !res.data) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          return false;
        }
        setParent(res.data);
        setSuccess('Fiche responsable mise à jour avec succès.');
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [parentId]
  );

  const archive = useCallback(async (): Promise<boolean> => {
    if (!parentId) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveParent(parentId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
      setSuccess('Responsable légal archivé.');
      await fetchParent(parentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'archivage.');
      setSaving(false);
      return false;
    }
  }, [parentId, fetchParent]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!parentId) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreParent(parentId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de la restauration.');
        setSaving(false);
        return false;
      }
      setSuccess('Responsable légal restauré.');
      await fetchParent(parentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la restauration.');
      setSaving(false);
      return false;
    }
  }, [parentId, fetchParent]);

  return {
    parent,
    loading,
    saving,
    error,
    success,
    refresh: () => parentId && fetchParent(parentId),
    update,
    archive,
    restore,
  };
}
