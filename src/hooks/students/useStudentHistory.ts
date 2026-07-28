// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStudentHistory
// Historique chronologique des changements de statut et événements d'un élève
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getStudentHistory, StudentStatusHistoryItem } from '../../services/students/studentHistoryService';

export function useStudentHistory(studentId?: string) {
  const [history, setHistory] = useState<StudentStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentHistory(id);
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'historique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchHistory(studentId);
    }
  }, [studentId, fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh: () => studentId && fetchHistory(studentId),
  };
}
