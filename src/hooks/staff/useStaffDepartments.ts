// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaffDepartments (src/hooks/staff/useStaffDepartments.ts)
// Chargement et gestion des services et départements de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listDepartments,
  createDepartment as createDepartmentService,
  updateDepartment as updateDepartmentService,
  archiveDepartment as archiveDepartmentService,
  StaffDepartment,
} from '../../services/staff/staffDepartmentsService';

export function useStaffDepartments() {
  const [departments, setDepartments] = useState<StaffDepartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartmentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDepartments();
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors du chargement des départements.');
        setDepartments([]);
      } else {
        setDepartments(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des départements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartmentsList();
  }, [fetchDepartmentsList]);

  const createDepartment = useCallback(
    async (deptData: Partial<StaffDepartment>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await createDepartmentService(deptData);
        if (!res.success) {
          setError(res.error || 'Erreur de création.');
          setSaving(false);
          return false;
        }
        await fetchDepartmentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création.');
        setSaving(false);
        return false;
      }
    },
    [fetchDepartmentsList]
  );

  const updateDepartment = useCallback(
    async (id: string, updates: Partial<StaffDepartment>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await updateDepartmentService(id, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour.');
          setSaving(false);
          return false;
        }
        await fetchDepartmentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [fetchDepartmentsList]
  );

  const archiveDepartment = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await archiveDepartmentService(id);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'archivage.');
          setSaving(false);
          return false;
        }
        await fetchDepartmentsList();
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
    },
    [fetchDepartmentsList]
  );

  return {
    departments,
    loading,
    saving,
    error,
    refresh: fetchDepartmentsList,
    createDepartment,
    updateDepartment,
    archiveDepartment,
  };
}
