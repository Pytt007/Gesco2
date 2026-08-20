// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Paramètres
// Service métier gérant les 5 volets de configuration du système
// Persistance hybride robuste (localStorage + Supabase avec tolérance de panne schema)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';
import { SchoolInfo, SchoolYearItem, AcademicTerm, GeneralConfig } from '../../types';

const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  name: '',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  city: '',
  country: '',
  currency: 'FCFA',
  language: 'Français (FR)',
};

const DEFAULT_SCHOOL_YEARS: SchoolYearItem[] = [];

const DEFAULT_TERMS: AcademicTerm[] = [];

const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  numberingPrefixStudent: 'MAT-',
  numberingPrefixStaff: 'ENS-',
  timezone: 'GMT+0 (Abidjan / Dakar)',
  dateFormat: 'DD/MM/YYYY',
  enableEmailAlerts: false,
  enableSmsAlerts: false,
};

// ─── 1. Informations Établissement ───────────────────────────────────────────
export async function fetchSchoolInfo(): Promise<SchoolInfo> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_info')
      .maybeSingle();

    if (!error && data?.data) {
      const merged = { ...DEFAULT_SCHOOL_INFO, ...data.data };
      try { localStorage.setItem('gesco_school_info', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {
    // Supabase failure: use localStorage fallback below
  }

  try {
    const cached = localStorage.getItem('gesco_school_info');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.name !== "GESCO — Complexe Scolaire d'Excellence") {
        return { ...DEFAULT_SCHOOL_INFO, ...parsed };
      }
    }
  } catch {}

  return DEFAULT_SCHOOL_INFO;
}

export async function updateSchoolInfo(info: SchoolInfo): Promise<{ error?: string }> {
  try {
    try { localStorage.setItem('gesco_school_info', JSON.stringify(info)); } catch {}
    window.dispatchEvent(new CustomEvent('gesco_school_info_updated', { detail: info }));
    
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'school_info', data: info, updated_at: new Date().toISOString() });
    
    if (error) {
      console.warn('[settingsService] updateSchoolInfo error:', error.message);
    }
    broadcastDataChange('school_settings', 'update', { key: 'school_info', data: info });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de la mise à jour des paramètres.' };
  }
}

// ─── 2. Années Scolaires ──────────────────────────────────────────────────────
export async function fetchSchoolYearsList(): Promise<SchoolYearItem[]> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_years_list')
      .maybeSingle();

    if (!error && Array.isArray(data?.data)) {
      try { localStorage.setItem('gesco_school_years', JSON.stringify(data.data)); } catch {}
      return data.data;
    }
  } catch {
    // Supabase failure: use fallback
  }

  try {
    const cached = localStorage.getItem('gesco_school_years');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const hasLegacyMock = parsed.some((y: any) => y.id === 'sy-2022' || y.id === 'sy-2023' || y.id === 'sy-2024');
        if (!hasLegacyMock && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}

  return DEFAULT_SCHOOL_YEARS;
}

export async function saveSchoolYearsList(years: SchoolYearItem[]): Promise<{ error?: string }> {
  try {
    try { localStorage.setItem('gesco_school_years', JSON.stringify(years)); } catch {}
    window.dispatchEvent(new CustomEvent('gesco_school_years_updated', { detail: years }));

    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'school_years_list', data: years, updated_at: new Date().toISOString() });

    if (error) {
      console.warn('[settingsService] saveSchoolYearsList error:', error.message);
    }
    broadcastDataChange('school_settings', 'update', { key: 'school_years_list', data: years });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement des années scolaires.' };
  }
}

export async function setActiveSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => ({
    ...y,
    isActive: y.id === yearId,
    status: y.id === yearId ? ('Active' as const) : y.isArchived ? ('Archivée' as const) : y.isClosed ? ('Clôturée' as const) : ('Préparation' as const),
  }));
  return saveSchoolYearsList(updated);
}

export async function closeSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, isClosed: true, isActive: false, status: 'Clôturée' as const } : y));
  return saveSchoolYearsList(updated);
}

export async function archiveSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, isArchived: true, isClosed: true, isActive: false, status: 'Archivée' as const } : y));
  return saveSchoolYearsList(updated);
}

export async function updateSchoolYear(yearId: string, data: Partial<SchoolYearItem>): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, ...data } : y));
  return saveSchoolYearsList(updated);
}

// ─── 3. Trimestres / Semestres ────────────────────────────────────────────────
export async function fetchAcademicTermsList(): Promise<AcademicTerm[]> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'academic_terms_list')
      .maybeSingle();

    if (!error && Array.isArray(data?.data)) {
      try { localStorage.setItem('gesco_academic_terms', JSON.stringify(data.data)); } catch {}
      return data.data;
    }
  } catch {
    // Supabase failure
  }

  try {
    const cached = localStorage.getItem('gesco_academic_terms');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return DEFAULT_TERMS;
}

export async function saveAcademicTermsList(terms: AcademicTerm[]): Promise<{ error?: string }> {
  try {
    try { localStorage.setItem('gesco_academic_terms', JSON.stringify(terms)); } catch {}
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'academic_terms_list', data: terms, updated_at: new Date().toISOString() });

    if (error) {
      console.warn('[settingsService] saveAcademicTermsList error:', error.message);
    }
    broadcastDataChange('school_settings', 'update', { key: 'academic_terms_list', data: terms });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement des trimestres.' };
  }
}

// ─── 4. Configuration Générale ────────────────────────────────────────────────
export async function fetchGeneralConfig(): Promise<GeneralConfig> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'general_config')
      .maybeSingle();

    if (!error && data?.data) {
      const merged = { ...DEFAULT_GENERAL_CONFIG, ...data.data };
      try { localStorage.setItem('gesco_general_config', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {
    // Supabase failure
  }

  try {
    const cached = localStorage.getItem('gesco_general_config');
    if (cached) return { ...DEFAULT_GENERAL_CONFIG, ...JSON.parse(cached) };
  } catch {}

  return DEFAULT_GENERAL_CONFIG;
}

export async function updateGeneralConfig(config: GeneralConfig): Promise<{ error?: string }> {
  try {
    try { localStorage.setItem('gesco_general_config', JSON.stringify(config)); } catch {}
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'general_config', data: config, updated_at: new Date().toISOString() });

    if (error) {
      console.warn('[settingsService] updateGeneralConfig error:', error.message);
    }
    broadcastDataChange('school_settings', 'update', { key: 'general_config', data: config });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement de la configuration générale.' };
  }
}
