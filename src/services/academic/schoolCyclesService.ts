// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Cycles Pédagogiques (src/services/academic/schoolCyclesService.ts)
// Couche de gestion des cycles scolaires (Préscolaire, Primaire)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './academicYearsService';

export interface SchoolCycle {
  id: string;
  schoolId?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[schoolCyclesService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localCyclesCache: Map<string, SchoolCycle> = new Map();

/**
 * Récupère la liste des cycles pédagogiques ordonnés par sort_order
 */
export async function getCycles(): Promise<ServiceResponse<SchoolCycle[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('school_cycles')
      .select('id, school_id, code, name, sort_order, is_active, created_at, updated_at')
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const cycles: SchoolCycle[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        code: r.code,
        name: r.name,
        sortOrder: r.sort_order || 1,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(cycles);
    }

    if (localCyclesCache.size > 0) {
      const list = Array.from(localCyclesCache.values());
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      return createSuccess(list);
    }

    const defaultCycles: SchoolCycle[] = [
      { id: 'cyc-1', code: 'PRESCHOOL', name: 'Préscolaire', sortOrder: 1, isActive: true },
      { id: 'cyc-2', code: 'PRIMARY', name: 'Primaire', sortOrder: 2, isActive: true },
    ];

    defaultCycles.forEach((c) => localCyclesCache.set(c.id, c));

    return createSuccess(defaultCycles);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des cycles scolaires.');
  }
}

/**
 * Récupère un cycle par son ID
 * @param id Identifiant du cycle
 */
export async function getCycle(id: string): Promise<ServiceResponse<SchoolCycle>> {
  try {
    if (!id) return createError(null, 'Identifiant du cycle requis.');

    const { data, error } = await supabase
      .from('school_cycles')
      .select('id, school_id, code, name, sort_order, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const cycle: SchoolCycle = {
        id: data.id,
        schoolId: data.school_id,
        code: data.code,
        name: data.name,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localCyclesCache.set(id, cycle);
      return createSuccess(cycle);
    }

    const cached = localCyclesCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Cycle introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du cycle.');
  }
}

/**
 * Crée un nouveau cycle pédagogique
 * @param cycleData Métadonnées du cycle
 */
export async function createCycle(cycleData: Partial<SchoolCycle>): Promise<ServiceResponse<SchoolCycle>> {
  try {
    if (!cycleData.name?.trim()) {
      return createError(null, 'Le nom du cycle est obligatoire.');
    }

    const newId = cycleData.id || crypto.randomUUID();
    const code = cycleData.code || cycleData.name.toUpperCase().replace(/[^A_Z0-9]/g, '_').slice(0, 20);
    const now = new Date().toISOString();

    const createdCycle: SchoolCycle = {
      id: newId,
      code,
      name: cycleData.name.trim(),
      sortOrder: cycleData.sortOrder ?? 1,
      isActive: cycleData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('school_cycles').insert({
      id: createdCycle.id,
      code: createdCycle.code,
      name: createdCycle.name,
      sort_order: createdCycle.sortOrder,
      is_active: createdCycle.isActive,
      created_at: createdCycle.createdAt,
      updated_at: createdCycle.updatedAt,
    });

    if (error) {
      console.warn('[schoolCyclesService:createCycle] Fallback local:', error.message);
    }
    localCyclesCache.set(createdCycle.id, createdCycle);

    return createSuccess(createdCycle, 'Cycle créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du cycle.');
  }
}

/**
 * Met à jour un cycle
 * @param id Identifiant du cycle
 * @param updates Attributs à modifier
 */
export async function updateCycle(id: string, updates: Partial<SchoolCycle>): Promise<ServiceResponse<SchoolCycle>> {
  try {
    if (!id) return createError(null, 'Identifiant cycle manquant.');

    const existingRes = await getCycle(id);
    const existing = existingRes.data;
    if (!existing) return createError(null, 'Cycle introuvable.');

    const updatedCycle: SchoolCycle = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('school_cycles')
      .update({
        name: updatedCycle.name,
        sort_order: updatedCycle.sortOrder,
        is_active: updatedCycle.isActive,
        updated_at: updatedCycle.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[schoolCyclesService:updateCycle] Fallback local:', error.message);
    }
    localCyclesCache.set(id, updatedCycle);

    return createSuccess(updatedCycle, 'Cycle mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour du cycle.');
  }
}

/**
 * Archive un cycle
 * @param id Identifiant
 */
export async function archiveCycle(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('school_cycles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[schoolCyclesService:archiveCycle] Fallback local:', error.message);
    }

    const cached = localCyclesCache.get(id);
    if (cached) {
      localCyclesCache.set(id, { ...cached, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Cycle archivé / désactivé.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage du cycle.');
  }
}
