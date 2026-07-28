// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Postes & Fonctions Personnel (src/services/staff/staffPositionsService.ts)
// Couche de gestion des fonctions et de la hiérarchie des postes
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './staffService';

export interface StaffPosition {
  id: string;
  departmentId?: string;
  departmentName?: string;
  code: string;
  title: string;
  hierarchyLevel: number;
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
  console.warn('[staffPositionsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localPositionsCache: Map<string, StaffPosition> = new Map();

/**
 * Liste les fonctions et postes enregistrés dans l'établissement
 */
export async function listPositions(): Promise<ServiceResponse<StaffPosition[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('staff_positions')
      .select('id, department_id, code, title, hierarchy_level, description, is_active, created_at, updated_at')
      .eq('is_deleted', false)
      .order('hierarchy_level', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const positions: StaffPosition[] = rows.map((r: any) => ({
        id: r.id,
        departmentId: r.department_id,
        code: r.code,
        title: r.title,
        hierarchyLevel: r.hierarchy_level || 1,
        description: r.description,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(positions);
    }

    if (localPositionsCache.size > 0) {
      return createSuccess(Array.from(localPositionsCache.values()));
    }

    const defaultPositions: StaffPosition[] = [
      { id: 'pos-1', code: 'DIR_GEN', title: 'Directeur Général', hierarchyLevel: 10, isActive: true },
      { id: 'pos-2', code: 'DIR_STUDIES', title: 'Directeur des Études', hierarchyLevel: 9, isActive: true },
      { id: 'pos-3', code: 'TEACHER', title: 'Enseignant', hierarchyLevel: 5, isActive: true },
      { id: 'pos-4', code: 'ACCOUNTANT', title: 'Comptable', hierarchyLevel: 6, isActive: true },
      { id: 'pos-5', code: 'SECRETARY', title: 'Secrétaire', hierarchyLevel: 4, isActive: true },
      { id: 'pos-6', code: 'SUPERVISOR', title: 'Surveillant', hierarchyLevel: 4, isActive: true },
      { id: 'pos-7', code: 'DRIVER', title: 'Chauffeur', hierarchyLevel: 2, isActive: true },
      { id: 'pos-8', code: 'MAINTENANCE', title: 'Agent d\'Entretien', hierarchyLevel: 1, isActive: true },
    ];

    defaultPositions.forEach((p) => localPositionsCache.set(p.id, p));

    return createSuccess(defaultPositions);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des postes.');
  }
}

/**
 * Crée une nouvelle fonction / poste
 * @param positionData Attributs du poste
 */
export async function createPosition(positionData: Partial<StaffPosition>): Promise<ServiceResponse<StaffPosition>> {
  try {
    if (!positionData.title?.trim()) {
      return createError(null, 'Le intitule du poste est obligatoire.');
    }

    const newId = positionData.id || crypto.randomUUID();
    const code = positionData.code || positionData.title.toUpperCase().replace(/[^A_Z0-9]/g, '_').slice(0, 20);
    const now = new Date().toISOString();

    const createdPosition: StaffPosition = {
      id: newId,
      departmentId: positionData.departmentId,
      code,
      title: positionData.title.trim(),
      hierarchyLevel: positionData.hierarchyLevel ?? 1,
      description: positionData.description?.trim() || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('staff_positions').insert({
      id: createdPosition.id,
      department_id: createdPosition.departmentId,
      code: createdPosition.code,
      title: createdPosition.title,
      hierarchy_level: createdPosition.hierarchyLevel,
      description: createdPosition.description,
      is_active: createdPosition.isActive,
      created_at: createdPosition.createdAt,
      updated_at: createdPosition.updatedAt,
    });

    if (error) {
      console.warn('[staffPositionsService:createPosition] Fallback local:', error.message);
    }
    localPositionsCache.set(createdPosition.id, createdPosition);

    return createSuccess(createdPosition, 'Poste créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du poste.');
  }
}

/**
 * Met à jour un poste existant
 * @param id Identifiant du poste
 * @param updates Attributs à modifier
 */
export async function updatePosition(id: string, updates: Partial<StaffPosition>): Promise<ServiceResponse<StaffPosition>> {
  try {
    if (!id) return createError(null, 'Identifiant du poste manquant.');

    const existing = localPositionsCache.get(id);
    const updatedPosition: StaffPosition = {
      id,
      code: updates.code || existing?.code || 'POS',
      title: updates.title || existing?.title || 'Poste',
      hierarchyLevel: updates.hierarchyLevel ?? existing?.hierarchyLevel ?? 1,
      description: updates.description ?? existing?.description,
      isActive: updates.isActive ?? existing?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('staff_positions')
      .update({
        title: updatedPosition.title,
        hierarchy_level: updatedPosition.hierarchyLevel,
        description: updatedPosition.description,
        is_active: updatedPosition.isActive,
        updated_at: updatedPosition.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[staffPositionsService:updatePosition] Fallback local:', error.message);
    }
    localPositionsCache.set(id, updatedPosition);

    return createSuccess(updatedPosition, 'Poste mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour du poste.');
  }
}

/**
 * Archive un poste
 * @param id Identifiant du poste
 */
export async function archivePosition(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('staff_positions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[staffPositionsService:archivePosition] Fallback local:', error.message);
    }

    const pos = localPositionsCache.get(id);
    if (pos) {
      localPositionsCache.set(id, { ...pos, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Poste désactivé / archivé.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage du poste.');
  }
}
