import { supabase } from './supabaseClient';

/** Read a server-owned settings array. Never substitute stale in-memory data on failure. */
export async function readSettingsArray<T>(id: string): Promise<T[]> {
  const { data, error } = await supabase.from('school_settings').select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [];
  if (!Array.isArray(data.data)) throw new Error(`Données invalides pour ${id}.`);
  return data.data as T[];
}

/** An acknowledged write is required before a mutation can report success. */
export async function writeSettingsArray<T>(id: string, rows: T[]): Promise<void> {
  const { data, error } = await supabase.from('school_settings').upsert({
    id, data: rows, updated_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || `Sauvegarde de ${id} non confirmée par Neon.`);
}
