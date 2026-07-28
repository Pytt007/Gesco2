// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook générique de Gestion des Données
// Intermédiaire entre l'UI et dataService (aucune requête SQL/Supabase directe)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  fetchTableRows,
  insertTableRecord,
  updateTableRecord,
  deleteTableRecord,
  upsertTableRecord,
} from '../services/storage/dataService';

/**
 * Hook générique pour lire/écrire dans une table GESCO via dataService
 */
export function useSupabaseData<T extends { id: string }>(
  tableName: string,
  schoolYear: string
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTableRows<T>(tableName, schoolYear);
      setData(rows);
    } catch (err: any) {
      console.error(`[useSupabaseData:${tableName}]`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName, schoolYear]);

  useEffect(() => { load(); }, [load]);

  /** Ajouter un enregistrement */
  const add = useCallback(async (item: T): Promise<{ error?: string }> => {
    const result = await insertTableRecord(tableName, schoolYear, item);
    if (result.error) return result;
    setData((prev) => [...prev, item]);
    return {};
  }, [tableName, schoolYear]);

  /** Mettre à jour un enregistrement */
  const update = useCallback(async (item: T): Promise<{ error?: string }> => {
    const result = await updateTableRecord(tableName, schoolYear, item);
    if (result.error) return result;
    setData((prev) => prev.map((d) => (d.id === item.id ? item : d)));
    return {};
  }, [tableName, schoolYear]);

  /** Supprimer un enregistrement */
  const remove = useCallback(async (id: string): Promise<{ error?: string }> => {
    const result = await deleteTableRecord(tableName, schoolYear, id);
    if (result.error) return result;
    setData((prev) => prev.filter((d) => d.id !== id));
    return {};
  }, [tableName, schoolYear]);

  /** Upsert (insert ou update) */
  const upsert = useCallback(async (item: T): Promise<{ error?: string }> => {
    const result = await upsertTableRecord(tableName, schoolYear, item);
    if (result.error) return result;
    setData((prev) => {
      const exists = prev.some((d) => d.id === item.id);
      return exists ? prev.map((d) => (d.id === item.id ? item : d)) : [...prev, item];
    });
    return {};
  }, [tableName, schoolYear]);

  return { data, loading, error, add, update, remove, upsert, reload: load };
}
