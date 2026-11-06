import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

type WithId = { id: string };

/**
 * Hook générique qui synchronise avec Supabase ET maintient une copie locale dans localStorage
 * pour garantir la persistance des données lors des rafraîchissements de page (F5),
 * même en cas d'absence de connexion ou d'erreur RLS Supabase.
 */
function useSupabaseTable<T extends WithId>(
  tableName: string,
  schoolYear: string,
  initialValue: T[] = []
): [T[], React.Dispatch<React.SetStateAction<T[]>>, boolean] {
  const localKey = `gesco_${tableName}_${schoolYear}`;

  const getLocalBackup = useCallback((): T[] => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(`[useSupabaseTable] LocalStorage read error for "${tableName}":`, e);
    }
    return initialValue;
  }, [localKey, initialValue]);

  const [data, setData] = useState<T[]>(getLocalBackup);
  const [loading, setLoading] = useState(true);
  const prevDataRef = useRef<T[]>(data);

  // ─── Chargement initial depuis Supabase avec fallback localStorage ───────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from(tableName)
          .select('id, data')
          .eq('school_year', schoolYear)
          .order('created_at', { ascending: true });

        if (cancelled) return;

        if (error) {
          console.warn(`[useSupabaseTable] Supabase fetch error for "${tableName}", fallback to localStorage:`, error.message);
          const localData = getLocalBackup();
          setData(localData);
          prevDataRef.current = localData;
        } else if (rows && rows.length > 0) {
          const items = rows.map((r: { id: string; data: T }) => ({
            ...r.data,
            id: r.id,
          })) as T[];
          setData(items);
          prevDataRef.current = items;
          try {
            localStorage.setItem(localKey, JSON.stringify(items));
          } catch {}
        } else {
          // Si Supabase renvoie 0 ligne, vérifier si localStorage contient des données
          const localData = getLocalBackup();
          if (localData.length > 0) {
            setData(localData);
            prevDataRef.current = localData;
            // Tenter d'envoyer les données locales vers Supabase
            syncToSupabase(tableName, schoolYear, [], localData);
          } else {
            setData(initialValue);
            prevDataRef.current = initialValue;
          }
        }
      } catch (err) {
        if (!cancelled) {
          const localData = getLocalBackup();
          setData(localData);
          prevDataRef.current = localData;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    // 1. Écouter les changements d'authentification pour recharger
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchData();
      }
    });

    // 2. Écouter les modifications de la table en temps réel (Realtime)
    const timer = window.setInterval(() => { if (!cancelled && document.visibilityState === 'visible') fetchData(); }, 30000);

    return () => {
      cancelled = true;
      authSub.unsubscribe();
      window.clearInterval(timer);
    };
  }, [tableName, schoolYear, localKey, getLocalBackup, initialValue]);

  // ─── Setter synchronisé avec localStorage ET Supabase ─────────────────────
  const setValue: React.Dispatch<React.SetStateAction<T[]>> = useCallback(
    (valueOrUpdater) => {
      setData((prev) => {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (p: T[]) => T[])(prev)
            : valueOrUpdater;

        // 1. Sauvegarde Immédiate dans localStorage (instantané & persistant sur F5)
        try {
          localStorage.setItem(localKey, JSON.stringify(newValue));
        } catch (e) {
          console.error(`[useSupabaseTable] LocalStorage write error for "${tableName}":`, e);
        }

        // 2. Synchronisation asynchrone avec Supabase
        syncToSupabase(tableName, schoolYear, prev, newValue);
        prevDataRef.current = newValue;
        return newValue;
      });
    },
    [tableName, schoolYear, localKey]
  );

  return [data, setValue, loading];
}

// ─── Diffing et sync ─────────────────────────────────────────────────────────

async function syncToSupabase<T extends WithId>(
  tableName: string,
  schoolYear: string,
  prevItems: T[],
  newItems: T[]
) {
  try {
    const prevIds = new Set(prevItems.map((i) => i.id));
    const newIds = new Set(newItems.map((i) => i.id));

    // 1. Supprimer les éléments retirés
    const toDelete = [...prevIds].filter((id) => !newIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('school_year', schoolYear)
        .in('id', toDelete);
      if (error) console.error(`[sync] delete "${tableName}":`, error.message);
    }

    // 2. Upsert les éléments nouveaux ou modifiés
    const upsertRows = newItems.map((item) => ({
      id: item.id,
      school_year: schoolYear,
      data: item,
      updated_at: new Date().toISOString(),
    }));

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert(upsertRows, { onConflict: 'id, school_year' });
      if (error) console.error(`[sync] upsert "${tableName}":`, error.message);
    }
  } catch (err) {
    console.error(`[syncToSupabase] exception pour "${tableName}":`, err);
  }
}

export default useSupabaseTable;
