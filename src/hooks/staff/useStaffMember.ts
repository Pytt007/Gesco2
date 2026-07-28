// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaffMember (src/hooks/staff/useStaffMember.ts)
// Chargement et mise à jour de la fiche individuelle d'un employé
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getStaffById,
  updateStaff,
  archiveStaff,
  restoreStaff,
  StaffMember,
} from '../../services/staff/staffService';

export function useStaffMember(staffId?: string) {
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStaffMember = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStaffById(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Membre du personnel introuvable.');
        setStaffMember(null);
      } else {
        setStaffMember(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la fiche employé.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staffId) {
      fetchStaffMember(staffId);
    }
  }, [staffId, fetchStaffMember]);

  const update = useCallback(
    async (updates: Partial<StaffMember>): Promise<boolean> => {
      if (!staffId) return false;
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateStaff(staffId, updates);
        if (!res.success || !res.data) {
          setError(res.error || 'Erreur lors de la mise à jour.');
          setSaving(false);
          return false;
        }
        setStaffMember(res.data);
        setSuccess('Fiche employé mise à jour avec succès.');
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [staffId]
  );

  const archive = useCallback(async (): Promise<boolean> => {
    if (!staffId) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveStaff(staffId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de l\'archivage.');
        setSaving(false);
        return false;
      }
      setSuccess('Membre du personnel archivé.');
      await fetchStaffMember(staffId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'archivage.');
      setSaving(false);
      return false;
    }
  }, [staffId, fetchStaffMember]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!staffId) return false;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await restoreStaff(staffId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de la restauration.');
        setSaving(false);
        return false;
      }
      setSuccess('Membre du personnel restauré.');
      await fetchStaffMember(staffId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la restauration.');
      setSaving(false);
      return false;
    }
  }, [staffId, fetchStaffMember]);

  return {
    staffMember,
    loading,
    saving,
    error,
    success,
    refresh: () => staffId && fetchStaffMember(staffId),
    update,
    archive,
    restore,
  };
}
