// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useParentChildren (src/hooks/parents/useParentChildren.ts)
// Chargement de la liste des enfants (élèves) rattachés à un responsable légal
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { getChildren, LinkedStudentInfo } from '../../services/parents/parentRelationshipService';

export function useParentChildren(parentId?: string) {
  const [children, setChildren] = useState<LinkedStudentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChildren(id);
      if (!res.success || !res.data) {
        setError(res.error || 'Erreur lors du chargement des enfants.');
        setChildren([]);
      } else {
        setChildren(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des enfants rattachés.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (parentId) {
      fetchChildren(parentId);
    }
  }, [parentId, fetchChildren]);

  return {
    children,
    loading,
    error,
    refresh: () => parentId && fetchChildren(parentId),
  };
}
