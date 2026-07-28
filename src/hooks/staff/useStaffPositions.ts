// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaffPositions (src/hooks/staff/useStaffPositions.ts)
// Chargement et gestion des fonctions et postes de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listPositions,
  createPosition as createPositionService,
  updatePosition as updatePositionService,
  archivePosition as archivePositionService,
  StaffPosition,
} from '../../services/staff/staffPositionsService';

export function useStaffPositions() {
  const [positions, setPositions] = useState<StaffPosition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositionsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPositions();
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors du chargement des postes.');
        setPositions([]);
      } else {
        setPositions(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des postes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositionsList();
  }, [fetchPositionsList]);

  const createPosition = useCallback(
    async (positionData: Partial<StaffPosition>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await createPositionService(positionData);
        if (!res.success) {
          setError(res.error || 'Erreur de création.');
          setSaving(false);
          return false;
        }
        await fetchPositionsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création.');
        setSaving(false);
        return false;
      }
    },
    [fetchPositionsList]
  );

  const updatePosition = useCallback(
    async (id: string, updates: Partial<StaffPosition>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await updatePositionService(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          return false;
        }
        await fetchPositionsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [fetchPositionsList]
  );

  const archivePosition = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await archivePositionService(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'archivage.');
          setSaving(false);
          return false;
        }
        await fetchPositionsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
    },
    [fetchPositionsList]
  );

  return {
    positions,
    loading,
    saving,
    error,
    refresh: fetchPositionsList,
    createPosition,
    updatePosition,
    archivePosition,
  };
}
