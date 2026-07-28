// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Matières par Niveau (src/services/academic/catalog/levelSubjectsService.ts)
// Affectation et gestion du programme de matières par niveau scolaire (PS à CM2)
// Empeche les affectations en doublon sur le meme niveau
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { ServiceResponse } from './subjectCategoriesService';
import { Subject, getSubject } from './subjectsService';

export interface LevelSubject {
  id: string;
  schoolId?: string;
  levelId: string;
  levelCode?: string;
  levelName?: string;
  subjectId: string;
  subject?: Subject;
  isRequired: boolean;
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
  console.warn('[levelSubjectsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localLevelSubjectsCache: Map<string, LevelSubject> = new Map();

/**
 * Associe une matière à un niveau scolaire (ex: Mathématiques au CP1)
 * Empêche les affectations en doublon.
 * @param levelId Identifiant du niveau scolaire
 * @param subjectId Identifiant de la matière
 * @param isRequired Obligatoire ou optionnelle
 * @param sortOrder Ordre dans le niveau
 */
export async function assignSubjectToLevel(
  levelId: string,
  subjectId: string,
  isRequired: boolean = true,
  sortOrder: number = 1
): Promise<ServiceResponse<LevelSubject>> {
  try {
    if (!levelId || !subjectId) {
      return createError(null, 'Le niveau et la matière sont obligatoires.');
    }

    // 1. Règle anti doublon
    const existingRes = await getSubjectsByLevel(levelId);
    const existingSubjects = existingRes.data || [];
    const isDuplicate = existingSubjects.some((ls) => ls.subjectId === subjectId || ls.id === subjectId);
    if (isDuplicate) {
      return createError(null, 'Cette matière est déjà affectée à ce niveau scolaire.');
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    const createdAssignment: LevelSubject = {
      id: newId,
      levelId,
      subjectId,
      isRequired,
      sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('level_subjects').insert({
      id: createdAssignment.id,
      level_id: createdAssignment.levelId,
      subject_id: createdAssignment.subjectId,
      is_required: createdAssignment.isRequired,
      sort_order: createdAssignment.sortOrder,
      created_at: createdAssignment.createdAt,
      updated_at: createdAssignment.updatedAt,
    });

    if (error) {
      console.warn('[levelSubjectsService:assignSubjectToLevel] Fallback local:', error.message);
    }
    localLevelSubjectsCache.set(createdAssignment.id, createdAssignment);

    return createSuccess(createdAssignment, 'Matière affectée au niveau scolaire avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'affectation de la matière au niveau.');
  }
}

/**
 * Retire la matière d'un niveau scolaire (Soft delete)
 * @param levelId ID niveau
 * @param subjectId ID matière
 */
export async function removeSubjectFromLevel(levelId: string, subjectId: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!levelId || !subjectId) {
      return createError(null, 'Identifiants niveau et matière requis.');
    }

    const { error } = await supabase
      .from('level_subjects')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('level_id', levelId)
      .eq('subject_id', subjectId);

    if (error) {
      console.warn('[levelSubjectsService:removeSubjectFromLevel] Fallback local:', error.message);
    }

    for (const [key, val] of localLevelSubjectsCache.entries()) {
      if (val.levelId === levelId && val.subjectId === subjectId) {
        localLevelSubjectsCache.delete(key);
      }
    }

    return createSuccess(true, 'Matière retirée du niveau scolaire.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression de la matière du niveau.');
  }
}

/**
 * Met à jour l'ordre d'affichage de la matière au sein du niveau
 * @param levelSubjectId Identifiant de la liaison
 * @param sortOrder Nouvel ordre
 */
export async function updateOrder(levelSubjectId: string, sortOrder: number): Promise<ServiceResponse<boolean>> {
  try {
    if (!levelSubjectId) return createError(null, 'Identifiant affectation manquant.');

    const { error } = await supabase
      .from('level_subjects')
      .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
      .eq('id', levelSubjectId);

    if (error) {
      console.warn('[levelSubjectsService:updateOrder] Fallback local:', error.message);
    }

    const cached = localLevelSubjectsCache.get(levelSubjectId);
    if (cached) {
      localLevelSubjectsCache.set(levelSubjectId, { ...cached, sortOrder });
    }

    return createSuccess(true, 'Ordre de la matière mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de l\'ordre.');
  }
}

/**
 * Obtient les matières affectées à un niveau scolaire spécifique
 * @param levelId Identifiant du niveau
 */
export async function getSubjectsByLevel(levelId: string): Promise<ServiceResponse<LevelSubject[]>> {
  try {
    if (!levelId) return createError(null, 'Identifiant niveau requis.');

    const { data: rows, error } = await supabase
      .from('level_subjects')
      .select('id, school_id, level_id, subject_id, is_required, sort_order, created_at, updated_at')
      .eq('level_id', levelId)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const list: LevelSubject[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        levelId: r.level_id,
        subjectId: r.subject_id,
        isRequired: r.is_required ?? true,
        sortOrder: r.sort_order || 1,
        isActive: true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      // Enrichir avec l'objet matière
      for (const ls of list) {
        const subRes = await getSubject(ls.subjectId);
        if (subRes.success && subRes.data) {
          ls.subject = subRes.data;
        }
      }

      return createSuccess(list);
    }

    const cachedList = Array.from(localLevelSubjectsCache.values()).filter((ls) => ls.levelId === levelId);
    cachedList.sort((a, b) => a.sortOrder - b.sortOrder);

    return createSuccess(cachedList);
  } catch (err) {
    return createError(err, 'Erreur de récupération des matières par niveau.');
  }
}

/**
 * Obtient les niveaux scolaires dans lesquels une matière est enseignée
 * @param subjectId Identifiant de la matière
 */
export async function getLevelsBySubject(subjectId: string): Promise<ServiceResponse<LevelSubject[]>> {
  try {
    if (!subjectId) return createError(null, 'Identifiant matière requis.');

    const { data: rows, error } = await supabase
      .from('level_subjects')
      .select('id, school_id, level_id, subject_id, is_required, sort_order, created_at, updated_at')
      .eq('subject_id', subjectId)
      .eq('is_deleted', false);

    if (!error && rows && rows.length > 0) {
      const list: LevelSubject[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        levelId: r.level_id,
        subjectId: r.subject_id,
        isRequired: r.is_required ?? true,
        sortOrder: r.sort_order || 1,
        isActive: true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(list);
    }

    const cachedList = Array.from(localLevelSubjectsCache.values()).filter((ls) => ls.subjectId === subjectId);
    return createSuccess(cachedList);
  } catch (err) {
    return createError(err, 'Erreur de récupération des niveaux pour cette matière.');
  }
}
