// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Données (Tables JSONB)
// Couche d'accès générique aux tables Supabase (id + school_year + data JSONB)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';

export async function fetchTableRows<T extends { id: string }>(
  tableName: string,
  schoolYear: string
): Promise<T[]> {
  const { data: rows, error } = await supabase
    .from(tableName)
    .select('id, data')
    .eq('school_year', schoolYear)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (rows || []).map((row) => ({ id: row.id, ...(row.data as object) } as T));
}

export async function insertTableRecord<T extends { id: string }>(
  tableName: string,
  schoolYear: string,
  item: T
): Promise<{ error?: string }> {
  const { id, ...rest } = item;
  const { error } = await supabase
    .from(tableName)
    .insert({ id, school_year: schoolYear, data: rest });

  if (error) return { error: error.message };
  return {};
}

export async function updateTableRecord<T extends { id: string }>(
  tableName: string,
  schoolYear: string,
  item: T
): Promise<{ error?: string }> {
  const { id, ...rest } = item;
  const { error } = await supabase
    .from(tableName)
    .update({ data: rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('school_year', schoolYear);

  if (error) return { error: error.message };
  return {};
}

export async function deleteTableRecord(
  tableName: string,
  schoolYear: string,
  id: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)
    .eq('school_year', schoolYear);

  if (error) return { error: error.message };
  return {};
}

export async function upsertTableRecord<T extends { id: string }>(
  tableName: string,
  schoolYear: string,
  item: T
): Promise<{ error?: string }> {
  const { id, ...rest } = item;
  const { error } = await supabase
    .from(tableName)
    .upsert({ id, school_year: schoolYear, data: rest, updated_at: new Date().toISOString() });

  if (error) return { error: error.message };
  return {};
}
