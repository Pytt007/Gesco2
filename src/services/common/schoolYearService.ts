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
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('id, data')
      .eq('id', 'active_school_year')
      .maybeSingle();

    if (!error && data?.data?.currentSchoolYear) {
      return {
        id: data.id,
        currentSchoolYear: data.data.currentSchoolYear,
      };
    }
  } catch {
    // Fallback to default
  }

  return { id: 'active_school_year', currentSchoolYear: '2024-2025' };
}

export async function persistSchoolYearSetting(
  settingsId: string | null,
  year: string
): Promise<string | null> {
  try {
    const targetId = settingsId || 'active_school_year';
    await supabase
      .from('school_settings')
      .upsert({
        id: targetId,
        data: { currentSchoolYear: year },
        updated_at: new Date().toISOString(),
      });
    return targetId;
  } catch {
    return settingsId;
  }
}

