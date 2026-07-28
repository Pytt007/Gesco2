// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useSchoolLevels (src/hooks/academic/useSchoolLevels.ts)
// Chargement, filtrage par cycle et recherche des niveaux scolaires
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getLevels,
  getLevelsByCycle,
  createLevel as createLevelService,
  updateLevel as updateLevelService,
  archiveLevel as archiveLevelService,
  SchoolLevel,
} from '../../services/academic/schoolLevelsService';

export function useSchoolLevels(initialCycleId?: string) {
  const [levels, setLevels] = useState<SchoolLevel[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(initialCycleId);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLevelsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = selectedCycleId
        ? await getLevelsByCycle(selectedCycleId)
        : await getLevels();

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de chargement des niveaux scolaires.');
        setLevels([]);
      } else {
        setLevels(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des niveaux.');
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchLevelsList();
  }, [fetchLevelsList]);

  // Filtrage local mémoïsé par recherche
  const filteredLevels = useMemo(() => {
    if (!searchQuery.trim()) return levels;
    const q = searchQuery.toLowerCase().trim();
    return levels.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.shortName.toLowerCase().includes(q)
    );
  }, [levels, searchQuery]);

  const createLevel = useCallback(
    async (levelData: Partial<SchoolLevel>): Promise<boolean> => {
      setSaving(true);
      setIsCreating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createLevelService(levelData);
        if (!res.success) {
          setError(res.error || 'Erreur de création du niveau.');
          setSaving(false);
          setIsCreating(false);
          return false;
        }
        setSuccess('Niveau scolaire créé avec succès.');
        await fetchLevelsList();
        setSaving(false);
        setIsCreating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de création.');
        setSaving(false);
        setIsCreating(false);
        return false;
      }
    },
    [fetchLevelsList]
  );

  const updateLevel = useCallback(
    async (id: string, updates: Partial<SchoolLevel>): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateLevelService(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Niveau scolaire mis à jour.');
        await fetchLevelsList();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchLevelsList]
  );

  const archiveLevel = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsDeleting(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveLevelService(id);
        if (!res.success) {
          setError(res.error || 'Erreur d\'archivage.');
          setSaving(false);
          setIsDeleting(false);
          return false;
        }
        setSuccess('Niveau scolaire archivé.');
        await fetchLevelsList();
        setSaving(false);
        setIsDeleting(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur d\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
    },
    [fetchLevelsList]
  );

  return {
    levels: filteredLevels,
    rawLevels: levels,
    selectedCycleId,
    searchQuery,
    loading,
    saving,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    setSelectedCycleId,
    setSearchQuery,
    refresh: fetchLevelsList,
    createLevel,
    updateLevel,
    archiveLevel,
  };
}
