// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useAssessmentSessions (src/hooks/academic/sessions/useAssessmentSessions.ts)
// Gestion réactive de la liste des sessions d'évaluation, recherche, filtres et pagination.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  searchSessions,
  createSession,
  updateSession,
  lockSession,
  unlockSession,
  publishSession,
  archiveSession,
  duplicateSession,
  AssessmentSession,
  AssessmentSessionFilters,
  AssessmentSessionStatus,
} from '../../../services/academic/sessions';

export function useAssessmentSessions(initialFilters: AssessmentSessionFilters = {}) {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(initialFilters.page || 1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialFilters.pageSize || 20);

  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState<AssessmentSessionStatus | 'all'>(initialFilters.status || 'all');
  const [classroomIdFilter, setClassroomIdFilter] = useState<string | undefined>(initialFilters.classroomId);
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState<string | undefined>(initialFilters.academicYearId);
  const [assessmentTypeIdFilter, setAssessmentTypeIdFilter] = useState<string | undefined>(initialFilters.assessmentTypeId);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSessionsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchSessions({
        page,
        pageSize,
        searchQuery,
        status: statusFilter,
        classroomId: classroomIdFilter,
        academicYearId: academicYearIdFilter,
        assessmentTypeId: assessmentTypeIdFilter,
      });

      if (res.success && res.data) {
        setSessions(res.data.sessions);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.error || 'Erreur lors du chargement des sessions d\'évaluation.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de communication avec le service de sessions.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    statusFilter,
    classroomIdFilter,
    academicYearIdFilter,
    assessmentTypeIdFilter,
  ]);

  useEffect(() => {
    fetchSessionsData();
  }, [fetchSessionsData]);

  const create = useCallback(
    async (sessionData: Partial<AssessmentSession>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createSession(sessionData);
        if (!res.success) {
          setError(res.error || 'Erreur de création de la session.');
          setSaving(false);
          return false;
        }
        setSuccess('Session d\'évaluation créée avec succès.');
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de création.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const update = useCallback(
    async (id: string, updates: Partial<AssessmentSession>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateSession(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          return false;
        }
        setSuccess('Session d\'évaluation mise à jour.');
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const lock = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await lockSession(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors du verrouillage.');
          setSaving(false);
          return false;
        }
        setSuccess('Session verrouillée.');
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du verrouillage.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const unlock = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await unlockSession(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors du déverrouillage.');
          setSaving(false);
          return false;
        }
        setSuccess('Session déverrouillée.');
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du déverrouillage.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const publish = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await publishSession(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la publication.');
          setSaving(false);
          return false;
        }
        setSuccess('Session publiée.');
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la publication.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
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
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur d\'archivage.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  const duplicate = useCallback(
    async (id: string, targetClassroomId?: string, newTitle?: string): Promise<boolean> => {
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
        await fetchSessionsData();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de duplication.');
        setSaving(false);
        return false;
      }
    },
    [fetchSessionsData]
  );

  return {
    sessions,
    totalCount,
    page,
    totalPages,
    pageSize,
    searchQuery,
    statusFilter,
    classroomIdFilter,
    academicYearIdFilter,
    assessmentTypeIdFilter,
    loading,
    saving,
    error,
    success,
    setSearchQuery,
    setStatusFilter,
    setClassroomIdFilter,
    setAcademicYearIdFilter,
    setAssessmentTypeIdFilter,
    setPage,
    setPageSize,
    refresh: fetchSessionsData,
    create,
    update,
    lock,
    unlock,
    publish,
    archive,
    duplicate,
  };
}
