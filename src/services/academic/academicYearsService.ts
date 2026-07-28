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

const localYearsCache: Map<string, AcademicYear> = new Map();

/**
 * Récupère l'ensemble des années scolaires de l'établissement
 */
export async function getAcademicYears(): Promise<ServiceResponse<AcademicYear[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('academic_years')
      .select('id, school_id, name, start_date, end_date, is_current, status, created_at, updated_at')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false });

    if (!error && rows && rows.length > 0) {
      const years: AcademicYear[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        name: r.name,
        startDate: r.start_date,
        endDate: r.end_date,
        isCurrent: r.is_current ?? false,
        status: r.status || 'Active',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(years);
    }

    if (localYearsCache.size > 0) {
      return createSuccess(Array.from(localYearsCache.values()));
    }

    const defaultYears: AcademicYear[] = [
      {
        id: 'ay-2026',
        name: '2026-2027',
        startDate: '2026-09-15',
        endDate: '2027-06-30',
        isCurrent: true,
        status: 'Active',
      },
      {
        id: 'ay-2025',
        name: '2025-2026',
        startDate: '2025-09-15',
        endDate: '2026-06-30',
        isCurrent: false,
        status: 'Clôturée',
      },
    ];

    defaultYears.forEach((y) => localYearsCache.set(y.id, y));

    return createSuccess(defaultYears);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des années scolaires.');
  }
}

/**
 * Récupère l'année scolaire active courante
 */
export async function getCurrentAcademicYear(): Promise<ServiceResponse<AcademicYear>> {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, school_id, name, start_date, end_date, is_current, status, created_at, updated_at')
      .eq('is_current', true)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!error && data) {
      const year: AcademicYear = {
        id: data.id,
        schoolId: data.school_id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        isCurrent: true,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localYearsCache.set(year.id, year);
      return createSuccess(year);
    }

    for (const y of localYearsCache.values()) {
      if (y.isCurrent) return createSuccess(y);
    }

    const fallbackCurrent: AcademicYear = {
      id: 'ay-2026',
      name: '2026-2027',
      startDate: '2026-09-15',
      endDate: '2027-06-30',
      isCurrent: true,
      status: 'Active',
    };
    return createSuccess(fallbackCurrent);
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche de l\'année scolaire courante.');
  }
}

/**
 * Récupère une année scolaire par son identifiant unique
 * @param id Identifiant de l'année scolaire
 */
export async function getAcademicYear(id: string): Promise<ServiceResponse<AcademicYear>> {
  try {
    if (!id) return createError(null, 'Identifiant année scolaire requis.');

    const { data, error } = await supabase
      .from('academic_years')
      .select('id, school_id, name, start_date, end_date, is_current, status, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const year: AcademicYear = {
        id: data.id,
        schoolId: data.school_id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        isCurrent: data.is_current,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localYearsCache.set(id, year);
      return createSuccess(year);
    }

    const cached = localYearsCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Année scolaire introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur de récupération de l\'année scolaire.');
  }
}

/**
 * Crée une nouvelle année scolaire
 * @param yearData Métadonnées de l'année scolaire
 */
export async function createAcademicYear(yearData: Partial<AcademicYear>): Promise<ServiceResponse<AcademicYear>> {
  try {
    if (!yearData.name?.trim() || !yearData.startDate || !yearData.endDate) {
      return createError(null, 'Le libellé, la date de début et la date de fin sont obligatoires.');
    }

    const newId = yearData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdYear: AcademicYear = {
      id: newId,
      name: yearData.name.trim(),
      startDate: yearData.startDate,
      endDate: yearData.endDate,
      isCurrent: yearData.isCurrent ?? false,
      status: yearData.status || 'Préparation',
      createdAt: now,
      updatedAt: now,
    };

    if (createdYear.isCurrent) {
      await deactivateAllAcademicYears();
    }

    const { error } = await supabase.from('academic_years').insert({
      id: createdYear.id,
      name: createdYear.name,
      start_date: createdYear.startDate,
      end_date: createdYear.endDate,
      is_current: createdYear.isCurrent,
      status: createdYear.status,
      created_at: createdYear.createdAt,
      updated_at: createdYear.updatedAt,
    });

    if (error) {
      console.warn('[academicYearsService:createAcademicYear] Fallback local:', error.message);
    }
    localYearsCache.set(createdYear.id, createdYear);

    return createSuccess(createdYear, 'Année scolaire créée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de l\'année scolaire.');
  }
}

/**
 * Met à jour une année scolaire
 * @param id Identifiant de l'année scolaire
 * @param updates Attributs à modifier
 */
export async function updateAcademicYear(id: string, updates: Partial<AcademicYear>): Promise<ServiceResponse<AcademicYear>> {
  try {
    if (!id) return createError(null, 'Identifiant année scolaire manquant.');

    const existingRes = await getAcademicYear(id);
    const existing = existingRes.data;
    if (!existing) return createError(null, 'Année scolaire introuvable.');

    if (updates.isCurrent && !existing.isCurrent) {
      await deactivateAllAcademicYears();
    }

    const updatedYear: AcademicYear = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('academic_years')
      .update({
        name: updatedYear.name,
        start_date: updatedYear.startDate,
        end_date: updatedYear.endDate,
        is_current: updatedYear.isCurrent,
        status: updatedYear.status,
        updated_at: updatedYear.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[academicYearsService:updateAcademicYear] Fallback local:', error.message);
    }
    localYearsCache.set(id, updatedYear);

    return createSuccess(updatedYear, 'Année scolaire mise à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de l\'année scolaire.');
  }
}

/**
 * Active une année scolaire (Désactive automatiquement toute autre année courante)
 * @param id Identifiant de l'année scolaire à activer
 */
export async function activateAcademicYear(id: string): Promise<ServiceResponse<AcademicYear>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    await deactivateAllAcademicYears();

    const updateRes = await updateAcademicYear(id, {
      isCurrent: true,
      status: 'Active',
    });

    if (!updateRes.success || !updateRes.data) {
      return createError(updateRes.error, 'Erreur lors de l\'activation de l\'année scolaire.');
    }

    return createSuccess(updateRes.data, 'Année scolaire activée comme année courante.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'activation de l\'année scolaire.');
  }
}

/**
 * Archive une année scolaire
 * @param id Identifiant
 */
export async function archiveAcademicYear(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('academic_years')
      .update({
        status: 'Clôturée',
        is_current: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.warn('[academicYearsService:archiveAcademicYear] Fallback local:', error.message);
    }

    const cached = localYearsCache.get(id);
    if (cached) {
      localYearsCache.set(id, { ...cached, isCurrent: false, status: 'Clôturée', updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Année scolaire clôturée / archivée.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage de l\'année scolaire.');
  }
}

/**
 * Helper interne pour désactiver toutes les années scolaires courantes
 */
async function deactivateAllAcademicYears(): Promise<void> {
  try {
    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('is_current', true);

    for (const [key, val] of localYearsCache.entries()) {
      localYearsCache.set(key, { ...val, isCurrent: false });
    }
  } catch (err) {
    console.warn('[academicYearsService:deactivateAll] Warning:', err);
  }
}
