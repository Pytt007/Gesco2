// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Paramètres
// Service métier gérant les 5 volets de configuration du système
// Persistance Neon : les erreurs serveur sont retournées au formulaire.
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

// Revisions prevent a stale form from silently overwriting another user's edit.
const revisions = new WeakMap<object, number>();
const lastRevision = new Map<string, number>();
export const settingsRevision = (value: object) => revisions.get(value);
function remember<T extends object>(key:string,value:T,revision:number):T{revisions.set(value,revision);lastRevision.set(key,revision);return value;}
async function saveSetting(key:string,value:object,expected?:number){
 const revision=expected??lastRevision.get(key)??0;
 const {data,error}=await supabase.rpc('save_setting',{p_id:key,p_data:value,p_revision:revision});
 if(error)throw new Error(error.message);
 if(typeof data!=='number')throw new Error('Enregistrement non confirmé par le serveur.');
 remember(key,value,data);
}

// ─── 1. Informations Établissement ───────────────────────────────────────────
export async function fetchSchoolInfo(): Promise<SchoolInfo> {
  const { data, error } = await supabase.from('school_settings').select('data,revision').eq('id', 'school_info').maybeSingle();
  if (error) throw new Error(error.message);
  return remember('school_info',{ ...DEFAULT_SCHOOL_INFO, ...data?.data },data?.revision??0);
}

export async function updateSchoolInfo(info: SchoolInfo, expectedRevision?: number): Promise<{ error?: string }> {
  try {
    
    await saveSetting('school_info', info, expectedRevision);
    try { localStorage.setItem('gesco_school_info', JSON.stringify(info)); } catch {}
    window.dispatchEvent(new CustomEvent('gesco_school_info_updated', { detail: info }));
    broadcastDataChange('school_settings', 'update', { key: 'school_info', data: info });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de la mise à jour des paramètres.' };
  }
}

// ─── 2. Années Scolaires ──────────────────────────────────────────────────────
export async function fetchSchoolYearsList(): Promise<SchoolYearItem[]> {
  const { data, error } = await supabase.from('school_settings').select('data,revision').eq('id', 'school_years_list').maybeSingle();
  if (error) throw new Error(error.message);
  return remember('school_years_list',data?.data ?? [...DEFAULT_SCHOOL_YEARS],data?.revision??0);
}

export async function saveSchoolYearsList(years: SchoolYearItem[], expectedRevision?: number): Promise<{ error?: string }> {
  try {

    await saveSetting('school_years_list', years, expectedRevision);
    try { localStorage.setItem('gesco_school_years', JSON.stringify(years)); } catch {}
    window.dispatchEvent(new CustomEvent('gesco_school_years_updated', { detail: years }));
    broadcastDataChange('school_settings', 'update', { key: 'school_years_list', data: years });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement des années scolaires.' };
  }
}

export async function setActiveSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const target=years.find(y=>y.id===yearId);
  if(!target)return {error:'Année scolaire introuvable.'};
  if(target.isClosed||target.isArchived)return {error:'Cette année est clôturée ou archivée.'};
  const updated = years.map((y) => ({
    ...y,
    isActive: y.id === yearId,
    status: y.id === yearId ? ('Active' as const) : y.isArchived ? ('Archivée' as const) : y.isClosed ? ('Clôturée' as const) : ('Préparation' as const),
  }));
  return saveSchoolYearsList(updated, settingsRevision(years));
}

export async function closeSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, isClosed: true, isActive: false, status: 'Clôturée' as const } : y));
  return saveSchoolYearsList(updated, settingsRevision(years));
}

export async function archiveSchoolYear(yearId: string): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, isArchived: true, isClosed: true, isActive: false, status: 'Archivée' as const } : y));
  return saveSchoolYearsList(updated, settingsRevision(years));
}

export async function updateSchoolYear(yearId: string, data: Partial<SchoolYearItem>): Promise<{ error?: string }> {
  const years = await fetchSchoolYearsList();
  const updated = years.map((y) => (y.id === yearId ? { ...y, ...data } : y));
  return saveSchoolYearsList(updated, settingsRevision(years));
}

// ─── 3. Trimestres / Semestres ────────────────────────────────────────────────
export async function fetchAcademicTermsList(): Promise<AcademicTerm[]> {
  const { data, error } = await supabase.from('school_settings').select('data,revision').eq('id', 'academic_terms_list').maybeSingle();
  if (error) throw new Error(error.message);
  return remember('academic_terms_list',data?.data ?? [...DEFAULT_TERMS],data?.revision??0);
}

export async function saveAcademicTermsList(terms: AcademicTerm[], expectedRevision?: number): Promise<{ error?: string }> {
  try {
    await saveSetting('academic_terms_list', terms, expectedRevision);
    try { localStorage.setItem('gesco_academic_terms', JSON.stringify(terms)); } catch {}
    broadcastDataChange('school_settings', 'update', { key: 'academic_terms_list', data: terms });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement des trimestres.' };
  }
}

// ─── 4. Configuration Générale ────────────────────────────────────────────────
export async function fetchGeneralConfig(): Promise<GeneralConfig> {
  const { data, error } = await supabase.from('school_settings').select('data,revision').eq('id', 'general_config').maybeSingle();
  if (error) throw new Error(error.message);
  return remember('general_config',{ ...DEFAULT_GENERAL_CONFIG, ...data?.data },data?.revision??0);
}

export async function updateGeneralConfig(config: GeneralConfig, expectedRevision?: number): Promise<{ error?: string }> {
  try {
    await saveSetting('general_config', config, expectedRevision);
    try { localStorage.setItem('gesco_general_config', JSON.stringify(config)); } catch {}
    broadcastDataChange('school_settings', 'update', { key: 'general_config', data: config });
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l\'enregistrement de la configuration générale.' };
  }
}
