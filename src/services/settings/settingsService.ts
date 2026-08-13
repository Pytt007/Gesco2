// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Paramètres
// Service métier gérant les 5 volets de configuration du système
// Persistance hybride robuste (localStorage + Supabase avec tolérance de panne schema)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
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
    const cached = localStorage.getItem('gesco_school_info');
    let localInfo = cached ? JSON.parse(cached) : null;
    if (localInfo?.name === "GESCO — Complexe Scolaire d'Excellence") {
      localStorage.removeItem('gesco_school_info');
      localInfo = null;
    }

    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_info')
      .maybeSingle();

    if (!error && data?.data) {
      const merged = { ...DEFAULT_SCHOOL_INFO, ...data.data };
      localStorage.setItem('gesco_school_info', JSON.stringify(merged));
      return merged;
    }
    if (localInfo) return { ...DEFAULT_SCHOOL_INFO, ...localInfo };
  } catch {
    const cached = localStorage.getItem('gesco_school_info');
    if (cached) return { ...DEFAULT_SCHOOL_INFO, ...JSON.parse(cached) };
  }
  return DEFAULT_SCHOOL_INFO;
}

export async function updateSchoolInfo(info: SchoolInfo): Promise<{ error?: string }> {
  try {
    localStorage.setItem('gesco_school_info', JSON.stringify(info));
    window.dispatchEvent(new CustomEvent('gesco_school_info_updated', { detail: info }));
    await supabase
      .from('school_settings')
      .upsert({ id: 'school_info', data: info, updated_at: new Date().toISOString() });
    return {};
  } catch {
    localStorage.setItem('gesco_school_info', JSON.stringify(info));
    window.dispatchEvent(new CustomEvent('gesco_school_info_updated', { detail: info }));
    return {};
  }
}

// ─── 2. Années Scolaires ──────────────────────────────────────────────────────
export async function fetchSchoolYearsList(): Promise<SchoolYearItem[]> {
  try {
    const cached = localStorage.getItem('gesco_school_years');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const hasLegacyMock = parsed.some((y: any) => y.id === 'sy-2022' || y.id === 'sy-2023' || y.id === 'sy-2024');
        if (hasLegacyMock) {
          localStorage.removeItem('gesco_school_years');
        } else if (parsed.length > 0) {
          return parsed;
        }
      }
    }

    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_years_list')
      .maybeSingle();

    if (!error && Array.isArray(data?.data)) {
      localStorage.setItem('gesco_school_years', JSON.stringify(data.data));
      return data.data;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_SCHOOL_YEARS;
}

export async function saveSchoolYearsList(years: SchoolYearItem[]): Promise<{ error?: string }> {
  try {
    localStorage.setItem('gesco_school_years', JSON.stringify(years));
    window.dispatchEvent(new CustomEvent('gesco_school_years_updated', { detail: years }));
    await supabase
      .from('school_settings')
      .upsert({ id: 'school_years_list', data: years, updated_at: new Date().toISOString() });
    return {};
  } catch {
    localStorage.setItem('gesco_school_years', JSON.stringify(years));
    window.dispatchEvent(new CustomEvent('gesco_school_years_updated', { detail: years }));
    return {};
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
    const cached = localStorage.getItem('gesco_academic_terms');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const hasLegacyMock = parsed.some((t: any) => t.id === 'term-1' || t.name === '1er Trimestre');
        if (hasLegacyMock) {
          localStorage.removeItem('gesco_academic_terms');
        } else if (parsed.length > 0) {
          return parsed;
        }
      }
    }

    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'academic_terms_list')
      .maybeSingle();

    if (!error && Array.isArray(data?.data)) {
      localStorage.setItem('gesco_academic_terms', JSON.stringify(data.data));
      return data.data;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_TERMS;
}

export async function saveAcademicTermsList(terms: AcademicTerm[]): Promise<{ error?: string }> {
  try {
    localStorage.setItem('gesco_academic_terms', JSON.stringify(terms));
    await supabase
      .from('school_settings')
      .upsert({ id: 'academic_terms_list', data: terms, updated_at: new Date().toISOString() });
    return {};
  } catch {
    localStorage.setItem('gesco_academic_terms', JSON.stringify(terms));
    return {};
  }
}

// ─── 4. Configuration Générale ────────────────────────────────────────────────
export async function fetchGeneralConfig(): Promise<GeneralConfig> {
  try {
    const cached = localStorage.getItem('gesco_general_config');
    if (cached) return { ...DEFAULT_GENERAL_CONFIG, ...JSON.parse(cached) };

    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'general_config')
      .maybeSingle();

    if (!error && data?.data) {
      const merged = { ...DEFAULT_GENERAL_CONFIG, ...data.data };
      localStorage.setItem('gesco_general_config', JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_GENERAL_CONFIG;
}

export async function updateGeneralConfig(config: GeneralConfig): Promise<{ error?: string }> {
  try {
    localStorage.setItem('gesco_general_config', JSON.stringify(config));
    await supabase
      .from('school_settings')
      .upsert({ id: 'general_config', data: config, updated_at: new Date().toISOString() });
    return {};
  } catch {
    localStorage.setItem('gesco_general_config', JSON.stringify(config));
    return {};
  }
}
