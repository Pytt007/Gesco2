// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useMedicalRecord
// Dossier médical confidentiel d'un élève
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  MedicalRecordData,
} from '../../services/students/medicalRecordsService';

export function useMedicalRecord(studentId?: string) {
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMedicalRecord(id);
      if (res.success && res.data) {
        setMedicalRecord(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du dossier médical.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchRecord(studentId);
    }
  }, [studentId, fetchRecord]);

  const create = useCallback(async (data: MedicalRecordData): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await createMedicalRecord(data);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur de création.');
        setSaving(false);
        return false;
      }
      setMedicalRecord(res.data);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de création.');
      setSaving(false);
      return false;
    }
  }, []);

  const update = useCallback(async (id: string, updates: Partial<MedicalRecordData>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateMedicalRecord(id, updates);
      if (!res.success) {
        setError(res.error || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
      if (studentId) await fetchRecord(studentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur de mise à jour.');
      setSaving(false);
      return false;
    }
  }, [studentId, fetchRecord]);

  return {
    medicalRecord,
    loading,
    saving,
    error,
    refresh: () => studentId && fetchRecord(studentId),
    create,
    update,
  };
}
