// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useClassroom (src/hooks/academic/useClassroom.ts)
// Chargement et gestion d'une classe individuelle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getClassroom,
  updateClassroom,
  archiveClassroom,
  restoreClassroom,
  Classroom,
} from '../../services/academic/classroomsService';

export function useClassroom(classroomId?: string) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchClassroomDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClassroom(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Classe introuvable.');
        setClassroom(null);
      } else {
        setClassroom(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la classe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (classroomId) {
      fetchClassroomDetails(classroomId);
    }
  }, [classroomId, fetchClassroomDetails]);

  const update = useCallback(
    async (updates: Partial<Classroom>): Promise<boolean> => {
      if (!classroomId) return false;
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateClassroom(classroomId, updates);
        if (!res.success || !res.data) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setClassroom(res.data);
        setSuccess('Classe mise à jour avec succès.');
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
    [classroomId]
  );

  const archive = useCallback(async (): Promise<boolean> => {
    if (!classroomId) return false;
    setSaving(true);
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveClassroom(classroomId);
      if (!res.success) {
        setError(res.error || 'Erreur d\'archivage.');
        setSaving(false);
        setIsDeleting(false);
        return false;
      }
      setSuccess('Classe archivée.');
      await fetchClassroomDetails(classroomId);
      setSaving(false);
      setIsDeleting(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur d\'archivage.');
      setSaving(false);
      setIsDeleting(false);
      return false;
    }
  }, [classroomId, fetchClassroomDetails]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!classroomId) return false;
    setSaving(true);
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreClassroom(classroomId);
      if (!res.success) {
        setError(res.error || 'Erreur de restauration.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
      setSuccess('Classe restaurée.');
      await fetchClassroomDetails(classroomId);
      setSaving(false);
      setIsUpdating(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de restauration.');
      setSaving(false);
      setIsUpdating(false);
      return false;
    }
  }, [classroomId, fetchClassroomDetails]);

  return {
    classroom,
    loading,
    saving,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: () => classroomId && fetchClassroomDetails(classroomId),
    update,
    archive,
    restore,
  };
}
