// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useSchoolCycles (src/hooks/academic/useSchoolCycles.ts)
// Chargement et gestion des cycles scolaires (Préscolaire, Primaire)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getCycles,
  createCycle as createCycleService,
  updateCycle as updateCycleService,
  archiveCycle as archiveCycleService,
  SchoolCycle,
} from '../../services/academic/schoolCyclesService';

export function useSchoolCycles() {
  const [cycles, setCycles] = useState<SchoolCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCyclesList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCycles();
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de chargement des cycles scolaires.');
        setCycles([]);
      } else {
        setCycles(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des cycles scolaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCyclesList();
  }, [fetchCyclesList]);

  const createCycle = useCallback(
    async (cycleData: Partial<SchoolCycle>): Promise<boolean> => {
      setSaving(true);
      setIsCreating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createCycleService(cycleData);
        if (!res.success) {
          setError(res.error || 'Erreur de création.');
          setSaving(false);
          setIsCreating(false);
          return false;
        }
        setSuccess('Cycle créé avec succès.');
        await fetchCyclesList();
        setSaving(false);
        setIsCreating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création.');
        setSaving(false);
        setIsCreating(false);
        return false;
      }
    },
    [fetchCyclesList]
  );

  const updateCycle = useCallback(
    async (id: string, updates: Partial<SchoolCycle>): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateCycleService(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Cycle mis à jour.');
        await fetchCyclesList();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchCyclesList]
  );

  const archiveCycle = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsDeleting(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveCycleService(id);
        if (!res.success) {
          setError(res.error || 'Erreur d\'archivage.');
          setSaving(false);
          setIsDeleting(false);
          return false;
        }
        setSuccess('Cycle archivé / désactivé.');
        await fetchCyclesList();
        setSaving(false);
        setIsDeleting(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
    },
    [fetchCyclesList]
  );

  return {
    cycles,
    loading,
    saving,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchCyclesList,
    createCycle,
    updateCycle,
    archiveCycle,
  };
}
