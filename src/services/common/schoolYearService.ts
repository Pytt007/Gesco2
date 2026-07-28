// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Année Scolaire
// Couche de persistance du paramètre d'année scolaire active
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

export interface SchoolYearSettings {
  id: string | null;
  currentSchoolYear: string;
}

export async function fetchSchoolYearSetting(): Promise<SchoolYearSettings> {
  const { data } = await supabase
    .from('school_settings')
    .select('id, current_school_year')
    .limit(1);

  if (data && data.length > 0) {
    return {
      id: data[0].id,
      currentSchoolYear: data[0].current_school_year || '2024-2025',
    };
  }

  return { id: null, currentSchoolYear: '2024-2025' };
}

export async function persistSchoolYearSetting(
  settingsId: string | null,
  year: string
): Promise<string | null> {
  if (settingsId) {
    await supabase
      .from('school_settings')
      .update({ current_school_year: year, updated_at: new Date().toISOString() })
      .eq('id', settingsId);
    return settingsId;
  } else {
    const { data } = await supabase
      .from('school_settings')
      .insert({ current_school_year: year })
      .select('id')
      .single();
    return data?.id || null;
  }
}
