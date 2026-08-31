/**
 * GESCO — Hook de Sauvegarde Automatique Locale (Auto-Save & Anti-Perte de Saisie)
 * Sauvegarde les formulaires longs (Wizard d'inscription, Saisie de notes) en temps réel
 * et alerte l'utilisateur en cas de fermeture accidentelle du navigateur.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface DraftAutosaveOptions {
  intervalMs?: number;
  isDirty?: boolean;
  enabled?: boolean;
}

export function useDraftAutosave<T>(
  draftKey: string,
  data: T,
  options: DraftAutosaveOptions = {}
) {
  const {
    intervalMs = 3000,
    isDirty = true,
    enabled = true,
  } = options;

  const storageKey = `gesco_draft_${draftKey}`;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Sauvegarde automatique périodique
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const timer = setInterval(() => {
      try {
        if (dataRef.current) {
          localStorage.setItem(storageKey, JSON.stringify({
            savedAt: new Date().toISOString(),
            data: dataRef.current,
          }));
        }
      } catch (err) {
        console.warn('[useDraftAutosave] Échec de la sauvegarde locale:', err);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, isDirty, intervalMs, storageKey]);

  // Alerte de confirmation de fermeture de page si des modifications sont non enregistrées
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isDirty]);

  /**
   * Tente de récupérer un brouillon précédemment sauvegardé
   */
  const getSavedDraft = useCallback((): { data: T; savedAt: string } | null => {
    try {
      const item = localStorage.getItem(storageKey);
      if (item) {
        return JSON.parse(item);
      }
    } catch {
      // Ignorer si corrompu
    }
    return null;
  }, [storageKey]);

  /**
   * Efface le brouillon une fois le formulaire validé avec succès
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silent
    }
  }, [storageKey]);

  return {
    getSavedDraft,
    clearDraft,
  };
}

export default useDraftAutosave;
