import { supabase } from './supabaseClient';

/** Fetch every page. An empty server result stays empty; network errors never become local successes. */
export async function readRows(table: string, select = '*'): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(select).order('id').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
export async function readRow(table: string, id: string, select = '*'): Promise<any> {
  const { data, error } = await supabase.from(table).select(select).eq('id', id).single();
  if (error || !data) throw new Error(error?.message || 'Enregistrement introuvable.');
  return data;
}
export async function insertRow(table: string, value: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(table).insert(value).select('*').single();
  if (error || !data) throw new Error(error?.message || 'Création non confirmée par le serveur.');
  return data;
}
export async function updateRow(table: string, id: string, updates: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select('*').single();
  if (error || !data) throw new Error(error?.message || 'Modification non autorisée ou enregistrement introuvable.');
  return data;
}
export async function deleteRow(table: string, id: string): Promise<void> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Suppression non confirmée.');
}
export const ok = <T>(data: T, message?: string) => ({ success: true as const, data, message });
export const failure = (error: unknown) => ({ success: false as const, error: error instanceof Error ? error.message : String(error) });
