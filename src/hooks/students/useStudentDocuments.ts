// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentDocuments
// Pièces jointes et gestion documentaire d'un élève
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  StudentDocumentData,
} from '../../services/students/studentDocumentsService';

export function useStudentDocuments(studentId?: string) {
  const [documents, setDocuments] = useState<StudentDocumentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDocuments(id);
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchDocs(studentId);
    }
  }, [studentId, fetchDocs]);

  const upload = useCallback(async (doc: StudentDocumentData): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await uploadDocument(doc);
      if (!res.success) {
        setError(res.error || 'Erreur lors du téléversement.');
        setSaving(false);
        return false;
      }
      if (studentId) await fetchDocs(studentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléversement.');
      setSaving(false);
      return false;
    }
  }, [studentId, fetchDocs]);

  const remove = useCallback(async (documentId: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const res = await deleteDocument(documentId);
      if (!res.success) {
        setError(res.error || 'Erreur lors de la suppression.');
        setSaving(false);
        return false;
      }
      if (studentId) await fetchDocs(studentId);
      setSaving(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
      setSaving(false);
      return false;
    }
  }, [studentId, fetchDocs]);

  return {
    documents,
    loading,
    saving,
    error,
    refresh: () => studentId && fetchDocs(studentId),
    upload,
    remove,
  };
}
