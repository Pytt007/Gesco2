// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Années Scolaires (src/services/academic/academicYearsService.ts)
// Gestion des années scolaires et bascule automatique de l'année courante
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type AcademicYearStatus = 'Préparation' | 'Active' | 'Clôturée';

export interface AcademicYear {
  id: string;
  schoolId?: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYearStatus;
  createdAt?: string;
  updatedAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[academicYearsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

// Les paramètres et le module pédagogique partagent la même source d'années.
import { fetchSchoolYearsList, saveSchoolYearsList, setActiveSchoolYear, closeSchoolYear } from '../settings/settingsService';
import type { SchoolYearItem } from '../../types';
const mapYear = (y: SchoolYearItem): AcademicYear => ({ id:y.id,name:y.label,startDate:y.startDate,endDate:y.endDate,isCurrent:y.isActive,status:y.isActive?'Active':y.isClosed?'Clôturée':'Préparation' });
export async function getAcademicYears(): Promise<ServiceResponse<AcademicYear[]>> {
 try { return createSuccess((await fetchSchoolYearsList()).filter(y=>!y.isArchived).map(mapYear)); }
 catch(e){return createError(e,'Chargement des années impossible.');}
}
export async function getAcademicYear(id:string):Promise<ServiceResponse<AcademicYear>> {
 const result=await getAcademicYears(); if(!result.success)return createError(result.error,'Chargement impossible.');
 const year=result.data?.find(y=>y.id===id); return year?createSuccess(year):createError(null,'Année scolaire introuvable.');
}
export async function getCurrentAcademicYear():Promise<ServiceResponse<AcademicYear>> {
 const result=await getAcademicYears(); if(!result.success)return createError(result.error,'Chargement impossible.');
 const year=result.data?.find(y=>y.isCurrent);return year?createSuccess(year):createError(null,'Aucune année scolaire active. Configurez les paramètres.');
}
export async function createAcademicYear(input:Partial<AcademicYear>):Promise<ServiceResponse<AcademicYear>> {
 try {
  if(!input.name?.trim()||!input.startDate||(input.endDate && input.startDate>=input.endDate))throw new Error('Libellé et dates valides requis.');
  const years=await fetchSchoolYearsList();
  const year:SchoolYearItem={id:input.id||crypto.randomUUID(),label:input.name.trim(),startDate:input.startDate,endDate:input.endDate||'',isActive:!!input.isCurrent,isClosed:input.status==='Clôturée'};
  const result=await saveSchoolYearsList([...years.map(y=>year.isActive?{...y,isActive:false}:y),year]);
  if(result.error)throw new Error(result.error);return createSuccess(mapYear(year),'Année enregistrée.');
 }catch(e){return createError(e,'Enregistrement impossible.');}
}
export async function updateAcademicYear(id:string,input:Partial<AcademicYear>):Promise<ServiceResponse<AcademicYear>> {
 try{
  const years=await fetchSchoolYearsList(),existing=years.find(y=>y.id===id);if(!existing)throw new Error('Année introuvable.');
  const year={...existing,label:input.name?.trim()??existing.label,startDate:input.startDate??existing.startDate,endDate:input.endDate??existing.endDate,isActive:input.isCurrent??existing.isActive,isClosed:input.status?input.status==='Clôturée':existing.isClosed};
  if(!year.label||!year.startDate||(year.endDate && year.startDate>=year.endDate))throw new Error('Libellé et dates valides requis.');
  const result=await saveSchoolYearsList(years.map(y=>y.id===id?year:year.isActive?{...y,isActive:false}:y));if(result.error)throw new Error(result.error);
  return createSuccess(mapYear(year),'Année enregistrée.');
 }catch(e){return createError(e,'Enregistrement impossible.');}
}
export async function activateAcademicYear(id:string):Promise<ServiceResponse<AcademicYear>> {
 try { const r=await setActiveSchoolYear(id);if(r.error)throw new Error(r.error);return getAcademicYear(id); }catch(e){return createError(e,'Activation impossible.');}
}
export async function archiveAcademicYear(id:string):Promise<ServiceResponse<boolean>> {
 try { const r=await closeSchoolYear(id);if(r.error)throw new Error(r.error);return createSuccess(true); }catch(e){return createError(e,'Clôture impossible.');}
}
