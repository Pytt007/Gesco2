// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudents (src/hooks/students/useStudents.ts)
// Gestion de la liste des élèves, recherche, filtres, tri, pagination et CRUD
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listStudents,
  createStudent,
  updateStudent,
  archiveStudent,
  restoreStudent,
} from '../../services/students/studentsService';
import { logStudentEvent } from '../../services/students/studentHistoryService';
import { Student } from '../../types';

export interface UseStudentsOptions {
  schoolYear?: string;
  pageSize?: number;
}

export function useStudents(options: UseStudentsOptions = {}) {
  const { schoolYear = '2026-2027', pageSize = 15 } = options;

  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'matricule' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchStudentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({
        schoolYear,
        page,
        pageSize,
        searchQuery,
        status: statusFilter,
        gender: genderFilter,
        sortBy,
        sortOrder,
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors de la récupération des élèves.');
      } else {
        setStudents(res.data.students);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des élèves.');
    } finally {
      setLoading(false);
    }
  }, [schoolYear, page, pageSize, searchQuery, statusFilter, genderFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudentsList();
  }, [fetchStudentsList]);

  const create = useCallback(async (data: Partial<Student>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await createStudent(data);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de création.');
        setSaving(false);
        return false;
      }
      await logStudentEvent(res.data.id, 'Inscription', 'Actif', undefined, `Inscrit en ${res.data.grade}`);
      setSuccess(res.message || 'Élève créé.');
      await fetchStudentsList();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de création.');
      setSaving(false);
      return false;
    }
  }, [fetchStudentsList]);

  const update = useCallback(async (id: string, updates: Partial<Student>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateStudent(id, updates);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }

      if (updates.grade) {
        await logStudentEvent(id, 'Changement de Classe', updates.status || 'Actif', undefined, `Affecté en classe ${updates.grade}`);
      }

      setSuccess(res.message || 'Mise à jour réussie.');
      await fetchStudentsList();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de mise à jour.');
      setSaving(false);
      return false;
    }
  }, [fetchStudentsList]);

  const archive = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveStudent(id);
      if (!res.success) {
        setError(res.error || 'Erreur d\'archivage.');
        setSaving(false);
        return false;
      }
      await logStudentEvent(id, 'Archivage', 'Archivé', 'Actif', 'Élève archivé');
      setSuccess(res.message || 'Élève archivé.');
      await fetchStudentsList();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur d\'archivage.');
      setSaving(false);
      return false;
    }
  }, [fetchStudentsList]);

  const restore = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreStudent(id);
      if (!res.success) {
        setError(res.error || 'Erreur de restauration.');
        setSaving(false);
        return false;
      }
      await logStudentEvent(id, 'Désarchivage', 'Actif', 'Archivé', 'Élève restauré');
      setSuccess(res.message || 'Élève restauré.');
      await fetchStudentsList();
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de restauration.');
      setSaving(false);
      return false;
    }
  }, [fetchStudentsList]);

  return {
    students,
    totalCount,
    page,
    totalPages,
    loading,
    saving,
    error,
    success,
    searchQuery,
    statusFilter,
    genderFilter,
    sortBy,
    sortOrder,
    setSearchQuery,
    setStatusFilter,
    setGenderFilter,
    setSortBy,
    setSortOrder,
    setPage,
    refresh: fetchStudentsList,
    create,
    update,
    archive,
    restore,
  };
}
