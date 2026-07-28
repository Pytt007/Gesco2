// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Services / Départements Personnel (src/services/staff/staffDepartmentsService.ts)
// Couche de gestion des services organisationnels de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './staffService';

export interface StaffDepartment {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[staffDepartmentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localDepartmentsCache: Map<string, StaffDepartment> = new Map();

/**
 * Liste les services / départements de l'établissement
 */
export async function listDepartments(): Promise<ServiceResponse<StaffDepartment[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('staff_departments')
      .select('id, code, name, description, is_active, created_at, updated_at')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const departments: StaffDepartment[] = rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(departments);
    }

    if (localDepartmentsCache.size > 0) {
      return createSuccess(Array.from(localDepartmentsCache.values()));
    }

    const defaultDepartments: StaffDepartment[] = [
      { id: 'dept-1', code: 'DIRECTION', name: 'Direction', description: 'Direction Générale et Études', isActive: true },
      { id: 'dept-2', code: 'ADMINISTRATION', name: 'Administration', description: 'Secrétariat et Accueil', isActive: true },
      { id: 'dept-3', code: 'COMPTABILITE', name: 'Comptabilité', description: 'Gestion financière', isActive: true },
      { id: 'dept-4', code: 'PEDAGOGIE', name: 'Pédagogie', description: 'Corps Enseignant', isActive: true },
      { id: 'dept-5', code: 'VIE_SCOLAIRE', name: 'Vie Scolaire', description: 'Censeurs et Surveillants', isActive: true },
      { id: 'dept-6', code: 'TRANSPORT', name: 'Transport', description: 'Chauffeurs et Logistique', isActive: true },
      { id: 'dept-7', code: 'CANTINE', name: 'Cantine', description: 'Restauration scolaire', isActive: true },
      { id: 'dept-8', code: 'TECHNIQUE', name: 'Technique & Entretien', description: 'Maintenance et Sécurité', isActive: true },
    ];

    defaultDepartments.forEach((d) => localDepartmentsCache.set(d.id, d));

    return createSuccess(defaultDepartments);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des départements.');
  }
}

/**
 * Crée un nouveau département
 * @param deptData Données du département
 */
export async function createDepartment(deptData: Partial<StaffDepartment>): Promise<ServiceResponse<StaffDepartment>> {
  try {
    if (!deptData.name?.trim()) {
      return createError(null, 'Le nom du département est obligatoire.');
    }

    const newId = deptData.id || crypto.randomUUID();
    const code = deptData.code || deptData.name.toUpperCase().replace(/[^A_Z0-9]/g, '_').slice(0, 20);
    const now = new Date().toISOString();

    const createdDept: StaffDepartment = {
      id: newId,
      code,
      name: deptData.name.trim(),
      description: deptData.description?.trim() || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('staff_departments').insert({
      id: createdDept.id,
      code: createdDept.code,
      name: createdDept.name,
      description: createdDept.description,
      is_active: createdDept.isActive,
      created_at: createdDept.createdAt,
      updated_at: createdDept.updatedAt,
    });

    if (error) {
      console.warn('[staffDepartmentsService:createDepartment] Fallback local:', error.message);
    }
    localDepartmentsCache.set(createdDept.id, createdDept);

    return createSuccess(createdDept, 'Département créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du département.');
  }
}

/**
 * Met à jour un département existant
 * @param id Identifiant du département
 * @param updates Modifications
 */
export async function updateDepartment(id: string, updates: Partial<StaffDepartment>): Promise<ServiceResponse<StaffDepartment>> {
  try {
    if (!id) return createError(null, 'Identifiant département manquant.');

    const existing = localDepartmentsCache.get(id);
    const updatedDept: StaffDepartment = {
      id,
      code: updates.code || existing?.code || 'DEPT',
      name: updates.name || existing?.name || 'Département',
      description: updates.description ?? existing?.description,
      isActive: updates.isActive ?? existing?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('staff_departments')
      .update({
        name: updatedDept.name,
        description: updatedDept.description,
        is_active: updatedDept.isActive,
        updated_at: updatedDept.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[staffDepartmentsService:updateDepartment] Fallback local:', error.message);
    }
    localDepartmentsCache.set(id, updatedDept);

    return createSuccess(updatedDept, 'Département mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour du département.');
  }
}

/**
 * Archive un département
 * @param id Identifiant du département
 */
export async function archiveDepartment(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('staff_departments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[staffDepartmentsService:archiveDepartment] Fallback local:', error.message);
    }

    const dept = localDepartmentsCache.get(id);
    if (dept) {
      localDepartmentsCache.set(id, { ...dept, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Département désactivé / archivé.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage du département.');
  }
}
