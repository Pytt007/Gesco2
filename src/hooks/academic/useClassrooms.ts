// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useClassrooms (src/hooks/academic/useClassrooms.ts)
// Gestion de la liste des classes, recherche, filtres, pagination et tri
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  searchClassrooms,
  createClassroom as createClassroomService,
  updateClassroom as updateClassroomService,
  archiveClassroom as archiveClassroomService,
  restoreClassroom as restoreClassroomService,
  Classroom,
  ClassroomFilters,
} from '../../services/academic/classroomsService';

export interface UseClassroomsOptions {
  pageSize?: number;
  initialAcademicYearId?: string;
  initialLevelId?: string;
}

export function useClassrooms(options: UseClassroomsOptions = {}) {
  const { pageSize = 20, initialAcademicYearId, initialLevelId } = options;

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string | undefined>(initialAcademicYearId);
  const [levelFilter, setLevelFilter] = useState<string | undefined>(initialLevelId);
  const [sortBy, setSortBy] = useState<'name' | 'capacity' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchClassroomsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ClassroomFilters = {
        page,
        pageSize,
        searchQuery,
        academicYearId: academicYearFilter,
        levelId: levelFilter,
        sortBy,
        sortOrder,
      };

      const res = await searchClassrooms(filters);

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de chargement des classes.');
      } else {
        setClassrooms(res.data.classrooms);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des classes.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, academicYearFilter, levelFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchClassroomsList();
  }, [fetchClassroomsList]);

  const createClassroom = useCallback(
    async (classroomData: Partial<Classroom>): Promise<boolean> => {
      setSaving(true);
      setIsCreating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createClassroomService(classroomData);
        if (!res.success) {
          setError(res.error || 'Erreur de création de la classe.');
          setSaving(false);
          setIsCreating(false);
          return false;
        }
        setSuccess('Classe créée avec succès.');
        await fetchClassroomsList();
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
    [fetchClassroomsList]
  );

  const updateClassroom = useCallback(
    async (id: string, updates: Partial<Classroom>): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateClassroomService(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Classe mise à jour.');
        await fetchClassroomsList();
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
    [fetchClassroomsList]
  );

  const archiveClassroom = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsDeleting(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await archiveClassroomService(id);
        if (!res.success) {
          setError(res.error || 'Erreur d\'archivage.');
          setSaving(false);
          setIsDeleting(false);
          return false;
        }
        setSuccess('Classe archivée / désactivée.');
        await fetchClassroomsList();
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
    [fetchClassroomsList]
  );

  const restoreClassroom = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await restoreClassroomService(id);
        if (!res.success) {
          setError(res.error || 'Erreur de restauration.');
          setSaving(false);
          setIsUpdating(false);
          return false;
        }
        setSuccess('Classe restaurée.');
        await fetchClassroomsList();
        setSaving(false);
        setIsUpdating(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de restauration.');
        setSaving(false);
        setIsUpdating(false);
        return false;
      }
    },
    [fetchClassroomsList]
  );

  return {
    classrooms: classrooms || [],
    totalCount: totalCount || 0,
    page,
    totalPages,
    loading,
    saving,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    searchQuery,
    academicYearFilter,
    levelFilter,
    sortBy,
    sortOrder,
    setSearchQuery,
    setAcademicYearFilter,
    setLevelFilter,
    setSortBy,
    setSortOrder,
    setPage,
    refresh: fetchClassroomsList,
    createClassroom,
    updateClassroom,
    archiveClassroom,
    restoreClassroom,
  };
}
