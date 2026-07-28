// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Paramètres
// Service métier gérant les 5 volets de configuration du système
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { SchoolInfo, SchoolYearItem, AcademicTerm, GeneralConfig } from '../../types';

const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  name: 'GESCO — Complexe Scolaire d\'Excellence',
  logoUrl: '/logo-dark.png',
  address: 'Avenue de l\'Éducation, Quartier Résidentiel',
  phone: '+225 07 00 00 00 00',
  email: 'contact@gesco-ecole.ci',
  city: 'Abidjan',
  country: 'Côte d\'Ivoire',
  currency: 'FCFA',
  language: 'Français (FR)',
};

const DEFAULT_SCHOOL_YEARS: SchoolYearItem[] = [
  { id: 'sy-2022', label: '2022-2023', startDate: '2022-09-15', endDate: '2023-06-30', isActive: false, isClosed: true },
  { id: 'sy-2023', label: '2023-2024', startDate: '2023-09-15', endDate: '2024-06-30', isActive: false, isClosed: true },
  { id: 'sy-2024', label: '2024-2025', startDate: '2024-09-15', endDate: '2025-06-30', isActive: true,  isClosed: false },
  { id: 'sy-2025', label: '2025-2026', startDate: '2025-09-15', endDate: '2026-06-30', isActive: false, isClosed: false },
];

const DEFAULT_TERMS: AcademicTerm[] = [
  { id: 'term-1', name: '1er Trimestre', sequenceOrder: 1, startDate: '2024-09-15', endDate: '2024-12-20', isClosed: true },
  { id: 'term-2', name: '2ème Trimestre', sequenceOrder: 2, startDate: '2025-01-06', endDate: '2025-04-11', isClosed: false },
  { id: 'term-3', name: '3ème Trimestre', sequenceOrder: 3, startDate: '2025-04-28', endDate: '2025-06-30', isClosed: false },
];

const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  numberingPrefixStudent: 'MAT-STU-',
  numberingPrefixStaff: 'MAT-STF-',
  timezone: 'GMT+0 (Abidjan / Dakar)',
  dateFormat: 'DD/MM/YYYY',
  enableEmailAlerts: true,
  enableSmsAlerts: false,
};

// ─── 1. Informations Établissement ───────────────────────────────────────────
export async function fetchSchoolInfo(): Promise<SchoolInfo> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_info')
      .single();

    if (!error && data?.data) {
      return { ...DEFAULT_SCHOOL_INFO, ...data.data };
    }
  } catch {
    // Fallback aux valeurs par défaut si la table/clé n'existe pas encore
  }
  return DEFAULT_SCHOOL_INFO;
}

export async function updateSchoolInfo(info: SchoolInfo): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'school_info', data: info, updated_at: new Date().toISOString() });

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de la mise à jour des informations' };
  }
}

// ─── 2. Années Scolaires ──────────────────────────────────────────────────────
export async function fetchSchoolYearsList(): Promise<SchoolYearItem[]> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'school_years_list')
      .single();

    if (!error && Array.isArray(data?.data)) {
      return data.data;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_SCHOOL_YEARS;
}

export async function saveSchoolYearsList(years: SchoolYearItem[]): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'school_years_list', data: years, updated_at: new Date().toISOString() });

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function setActiveSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => ({
    ...y,
    isActive: y.id === yearId,
  }));
  return saveSchoolYearsList(updated);
}

export async function closeSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, isClosed: true, isActive: false } : y));
  return saveSchoolYearsList(updated);
}

// ─── 3. Trimestres / Semestres ────────────────────────────────────────────────
export async function fetchAcademicTermsList(): Promise<AcademicTerm[]> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'academic_terms_list')
      .single();

    if (!error && Array.isArray(data?.data)) {
      return data.data;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_TERMS;
}

export async function saveAcademicTermsList(terms: AcademicTerm[]): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'academic_terms_list', data: terms, updated_at: new Date().toISOString() });

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── 4. Configuration Générale ────────────────────────────────────────────────
export async function fetchGeneralConfig(): Promise<GeneralConfig> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'general_config')
      .single();

    if (!error && data?.data) {
      return { ...DEFAULT_GENERAL_CONFIG, ...data.data };
    }
  } catch {
    // Fallback
  }
  return DEFAULT_GENERAL_CONFIG;
}

export async function updateGeneralConfig(config: GeneralConfig): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .upsert({ id: 'general_config', data: config, updated_at: new Date().toISOString() });

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}
