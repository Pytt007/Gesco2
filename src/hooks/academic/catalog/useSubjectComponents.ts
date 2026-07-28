// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook React Sous-Matières Composantes (src/hooks/academic/catalog/useSubjectComponents.ts)
// Interface réactive pour la gestion des sous-matières des matières composées
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  SubjectComponent,
  getComponents,
  getComponentsBySubject,
  addComponent as addComponentService,
  removeComponent as removeComponentService,
  updateComponentOrder as updateOrderService,
} from '../../../services/academic/catalog';

export interface UseSubjectComponentsReturn {
  components: SubjectComponent[];
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  success: string | null;
  refresh: () => Promise<void>;
  addComponent: (childSubjectId: string, sortOrder?: number) => Promise<boolean>;
  removeComponent: (childSubjectId: string) => Promise<boolean>;
  updateOrder: (componentId: string, sortOrder: number) => Promise<boolean>;
}

/**
 * Hook personnalisé réactif pour la gestion des sous-matières composantes
 * @param parentSubjectId Identifiant de la matière composée (ex: EDM)
 */
export function useSubjectComponents(parentSubjectId?: string): UseSubjectComponentsReturn {
  const [components, setComponents] = useState<SubjectComponent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (parentSubjectId) {
        res = await getComponentsBySubject(parentSubjectId);
      } else {
        res = await getComponents();
      }

      if (res.success && res.data) {
        setComponents(res.data);
      } else {
        setError(res.error || 'Impossible de charger les sous-matières.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des composants.');
    } finally {
      setLoading(false);
    }
  }, [parentSubjectId]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleAddComponent = useCallback(async (childSubjectId: string, sortOrder: number = 1): Promise<boolean> => {
    if (!parentSubjectId) {
      setError('Identifiant de la matière parente requis.');
      return false;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await addComponentService(parentSubjectId, childSubjectId, sortOrder);
      if (res.success && res.data) {
        setSuccess(res.message || 'Sous-matière ajoutée avec succès.');
        await fetchComponents();
        return true;
      } else {
        setError(res.error || 'Erreur lors de l\'ajout de la sous-matière.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur d\'ajout de la sous-matière.');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [parentSubjectId, fetchComponents]);

  const handleRemoveComponent = useCallback(async (childSubjectId: string): Promise<boolean> => {
    if (!parentSubjectId) {
      setError('Identifiant de la matière parente requis.');
      return false;
    }

    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await removeComponentService(parentSubjectId, childSubjectId);
      if (res.success) {
        setSuccess(res.message || 'Sous-matière retirée.');
        await fetchComponents();
        return true;
      } else {
        setError(res.error || 'Erreur de suppression.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de suppression.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [parentSubjectId, fetchComponents]);

  const handleUpdateOrder = useCallback(async (componentId: string, sortOrder: number): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateOrderService(componentId, sortOrder);
      if (res.success) {
        setSuccess(res.message || 'Ordre mis à jour.');
        await fetchComponents();
        return true;
      } else {
        setError(res.error || 'Erreur de mise à jour de l\'ordre.');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de mise à jour de l\'ordre.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchComponents]);

  return {
    components,
    loading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    success,
    refresh: fetchComponents,
    addComponent: handleAddComponent,
    removeComponent: handleRemoveComponent,
    updateOrder: handleUpdateOrder,
  };
}
