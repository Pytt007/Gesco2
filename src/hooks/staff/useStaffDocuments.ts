// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaffDocuments (src/hooks/staff/useStaffDocuments.ts)
// Chargement, téléversement et suppression des documents administratifs RH
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  listDocuments,
  uploadDocument as uploadDocumentService,
  deleteDocument as deleteDocumentService,
  StaffDocumentData,
} from '../../services/staff/staffDocumentsService';

export function useStaffDocuments(staffId?: string) {
  const [documents, setDocuments] = useState<StaffDocumentData[]>([]);
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
      } else {
        setError(res.error || 'Erreur lors du chargement des documents.');
        setDocuments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des documents RH.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staffId) {
      fetchDocs(staffId);
    }
  }, [staffId, fetchDocs]);

  const uploadDocument = useCallback(
    async (doc: StaffDocumentData): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await uploadDocumentService(doc);
        if (!res.success) {
          setError(res.error || 'Erreur lors du téléversement.');
          setSaving(false);
          return false;
        }
        if (staffId) await fetchDocs(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du téléversement du document.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchDocs]
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const res = await deleteDocumentService(documentId);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la suppression.');
          setSaving(false);
          return false;
        }
        if (staffId) await fetchDocs(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchDocs]
  );

  return {
    documents,
    loading,
    saving,
    error,
    refresh: () => staffId && fetchDocs(staffId),
    uploadDocument,
    deleteDocument,
  };
}
