// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentParents (src/hooks/parents/useStudentParents.ts)
// Chargement et gestion des responsables légaux associés à un élève donné
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getParentsOfStudent,
  linkStudent as linkStudentService,
  unlinkStudent as unlinkStudentService,
  setPrimaryParent as setPrimaryParentService,
  updateRelationship as updateRelationshipService,
  ParentOfStudentInfo,
  RelationshipType,
  StudentParentRelationship,
} from '../../services/parents/parentRelationshipService';

export function useStudentParents(studentId?: string) {
  const [parentsInfo, setParentsInfo] = useState<ParentOfStudentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentParents = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getParentsOfStudent(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors du chargement des responsables.');
        setParentsInfo([]);
      } else {
        setParentsInfo(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des responsables.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchStudentParents(studentId);
    }
  }, [studentId, fetchStudentParents]);

  const primaryParent = useMemo(() => {
    return parentsInfo.find((p) => p.isPrimary) || parentsInfo[0] || null;
  }, [parentsInfo]);

  const linkStudent = useCallback(
    async (
      parentId: string,
      relationshipType: RelationshipType = 'Tuteur Légal',
      isPrimary: boolean = false,
      isPayer: boolean = false,
      isEmergencyContact: boolean = true
    ): Promise<boolean> => {
      if (!studentId) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await linkStudentService(studentId, parentId, relationshipType, isPrimary, isPayer, isEmergencyContact);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'association du responsable.');
          setSaving(false);
          return false;
        }
        await fetchStudentParents(studentId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'association.');
        setSaving(false);
        return false;
      }
    },
    [studentId, fetchStudentParents]
  );

  const unlinkStudent = useCallback(
    async (parentId: string): Promise<boolean> => {
      if (!studentId) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await unlinkStudentService(studentId, parentId);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la dissociation.');
          setSaving(false);
          return false;
        }
        await fetchStudentParents(studentId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la dissociation.');
        setSaving(false);
        return false;
      }
    },
    [studentId, fetchStudentParents]
  );

  const setPrimaryParent = useCallback(
    async (parentId: string): Promise<boolean> => {
      if (!studentId) return false;
      setSaving(true);
      setError(null);
      try {
        const res = await setPrimaryParentService(studentId, parentId);
        if (!res.success) {
          setError(res.error || 'Impossible de définir le responsable principal.');
          setSaving(false);
          return false;
        }
        await fetchStudentParents(studentId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du changement du responsable principal.');
        setSaving(false);
        return false;
      }
    },
    [studentId, fetchStudentParents]
  );

  const updateRelationship = useCallback(
    async (relationshipId: string, updates: Partial<StudentParentRelationship>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await updateRelationshipService(relationshipId, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          return false;
        }
        if (studentId) await fetchStudentParents(studentId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [studentId, fetchStudentParents]
  );

  return {
    parentsInfo,
    primaryParent,
    loading,
    saving,
    error,
    refresh: () => studentId && fetchStudentParents(studentId),
    linkStudent,
    unlinkStudent,
    setPrimaryParent,
    updateRelationship,
  };
}
