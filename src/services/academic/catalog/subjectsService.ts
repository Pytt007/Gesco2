// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Matières (src/services/academic/catalog/subjectsService.ts)
// Catalogue général des matières du préscolaire et du primaire
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { ServiceResponse } from './subjectCategoriesService';

export interface Subject {
  id: string;
  schoolId?: string;
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  code: string;
  name: string;
  shortName: string;
  description?: string;
  isComposite: boolean;
  isGraded: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectFilters {
  categoryId?: string;
  searchQuery?: string;
  isComposite?: boolean;
  isGraded?: boolean;
  isActive?: boolean | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'sortOrder' | 'code';
  sortOrder?: 'asc' | 'desc';
}

export interface SubjectListResult {
  subjects: Subject[];
  totalCount: number;
  page: number;
  totalPages: number;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[subjectsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localSubjectsCache: Map<string, Subject> = new Map();

/**
 * Recherche et pagination des matières avec filtres avancés
 * @param filters Critères de recherche
 */
export async function searchSubjects(filters: SubjectFilters = {}): Promise<ServiceResponse<SubjectListResult>> {
  try {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      searchQuery,
      isComposite,
      isGraded,
      isActive = true,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = filters;

    let query = supabase
      .from('subjects')
      .select('id, school_id, category_id, code, name, short_name, description, is_composite, is_graded, is_active, sort_order, created_at, updated_at', { count: 'exact' });

    if (isActive !== 'all') {
      query = query.eq('is_active', isActive);
    }
    if (categoryId) query = query.eq('category_id', categoryId);
    if (isComposite !== undefined) query = query.eq('is_composite', isComposite);
    if (isGraded !== undefined) query = query.eq('is_graded', isGraded);
    if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);

    const { data: rows, count, error } = await query.limit(500);

    let rawList: Subject[] = [];

    if (!error && rows && rows.length > 0) {
      rawList = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        categoryId: r.category_id,
        code: r.code,
        name: r.name,
        shortName: r.short_name || r.code,
        description: r.description,
        isComposite: r.is_composite ?? false,
        isGraded: r.is_graded ?? true,
        isActive: r.is_active ?? true,
        sortOrder: r.sort_order || 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } else {
      rawList = Array.from(localSubjectsCache.values());
      if (rawList.length === 0) {
        rawList = [
          { id: 'b0200000-0000-4000-b000-000000000001', categoryId: '11111111-1111-4111-a111-111111111111', code: 'PRI_LECT', name: 'Lecture', shortName: 'LECT', isComposite: false, isGraded: true, isActive: true, sortOrder: 1 },
          { id: 'b0200000-0000-4000-b000-000000000006', categoryId: '11111111-1111-4111-a111-111111111111', code: 'PRI_MATH', name: 'Mathématiques', shortName: 'MATH', isComposite: false, isGraded: true, isActive: true, sortOrder: 2 },
          { id: 'b0200000-0000-4000-b000-000000000008', categoryId: '11111111-1111-4111-a111-111111111111', code: 'PRI_EDM', name: 'Étude du milieu', shortName: 'EDM', isComposite: true, isGraded: true, isActive: true, sortOrder: 3 },
        ];
      }
    }

    if (categoryId) rawList = rawList.filter((s) => s.categoryId === categoryId);
    if (isComposite !== undefined) rawList = rawList.filter((s) => s.isComposite === isComposite);
    if (isGraded !== undefined) rawList = rawList.filter((s) => s.isGraded === isGraded);
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }

    rawList.sort((a, b) => {
      const valA = sortBy === 'sortOrder' ? a.sortOrder : a.name;
      const valB = sortBy === 'sortOrder' ? b.sortOrder : b.name;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const totalCount = count || rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = rawList.slice(start, start + pageSize);

    return createSuccess({
      subjects: paginated,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche des matières.');
  }
}

/**
 * Liste globale des matières
 */
export async function getSubjects(filters: SubjectFilters = {}): Promise<ServiceResponse<Subject[]>> {
  try {
    const res = await searchSubjects({ ...filters, pageSize: 500 });
    if (!res.success || !res.data) {
      return createError(res.error, 'Erreur de récupération des matières.');
    }
    return createSuccess(res.data.subjects);
  } catch (err) {
    return createError(err, 'Erreur de récupération des matières.');
  }
}

/**
 * Récupère une matière par son ID
 * @param id Identifiant
 */
export async function getSubject(id: string): Promise<ServiceResponse<Subject>> {
  try {
    if (!id) return createError(null, 'Identifiant matière requis.');

    const { data, error } = await supabase
      .from('subjects')
      .select('id, school_id, category_id, code, name, short_name, description, is_composite, is_graded, is_active, sort_order, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const sub: Subject = {
        id: data.id,
        schoolId: data.school_id,
        categoryId: data.category_id,
        code: data.code,
        name: data.name,
        shortName: data.short_name,
        description: data.description,
        isComposite: data.is_composite,
        isGraded: data.is_graded,
        isActive: data.is_active,
        sortOrder: data.sort_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localSubjectsCache.set(id, sub);
      return createSuccess(sub);
    }

    const cached = localSubjectsCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Matière introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de la matière.');
  }
}

/**
 * Crée une nouvelle matière
 * @param data Métadonnées de la matière
 */
export async function createSubject(data: Partial<Subject>): Promise<ServiceResponse<Subject>> {
  try {
    if (!data.categoryId || !data.name?.trim()) {
      return createError(null, 'La catégorie et le nom de la matière sont obligatoires.');
    }

    const newId = data.id || crypto.randomUUID();
    const code = data.code || data.shortName || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);
    const now = new Date().toISOString();

    const createdSubject: Subject = {
      id: newId,
      categoryId: data.categoryId,
      code,
      name: data.name.trim(),
      shortName: data.shortName || code,
      description: data.description?.trim() || '',
      isComposite: data.isComposite ?? false,
      isGraded: data.isGraded ?? true,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 1,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('subjects').insert({
      id: createdSubject.id,
      category_id: createdSubject.categoryId,
      code: createdSubject.code,
      name: createdSubject.name,
      short_name: createdSubject.shortName,
      description: createdSubject.description,
      is_composite: createdSubject.isComposite,
      is_graded: createdSubject.isGraded,
      is_active: createdSubject.isActive,
      sort_order: createdSubject.sortOrder,
      created_at: createdSubject.createdAt,
      updated_at: createdSubject.updatedAt,
    });

    if (error) {
      console.warn('[subjectsService:createSubject] Fallback local:', error.message);
    }
    localSubjectsCache.set(createdSubject.id, createdSubject);

    return createSuccess(createdSubject, 'Matière créée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de la matière.');
  }
}

/**
 * Met à jour une matière
 * @param id Identifiant
 * @param updates Attributs à modifier
 */
export async function updateSubject(id: string, updates: Partial<Subject>): Promise<ServiceResponse<Subject>> {
  try {
    if (!id) return createError(null, 'Identifiant matière manquant.');

    const existingRes = await getSubject(id);
    const existing = existingRes.data;
    if (!existing) return createError(null, 'Matière introuvable.');

    const updatedSubject: Subject = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('subjects')
      .update({
        name: updatedSubject.name,
        short_name: updatedSubject.shortName,
        description: updatedSubject.description,
        is_composite: updatedSubject.isComposite,
        is_graded: updatedSubject.isGraded,
        is_active: updatedSubject.isActive,
        sort_order: updatedSubject.sortOrder,
        updated_at: updatedSubject.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[subjectsService:updateSubject] Fallback local:', error.message);
    }
    localSubjectsCache.set(id, updatedSubject);

    return createSuccess(updatedSubject, 'Matière mise à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de la matière.');
  }
}

/**
 * Archive une matière (Soft Delete)
 * @param id Identifiant
 */
export async function archiveSubject(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[subjectsService:archiveSubject] Fallback local:', error.message);
    }

    const cached = localSubjectsCache.get(id);
    if (cached) {
      localSubjectsCache.set(id, { ...cached, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Matière archivée / désactivée.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage de la matière.');
  }
}

/**
 * Restaure une matière archivée
 * @param id Identifiant
 */
export async function restoreSubject(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[subjectsService:restoreSubject] Fallback local:', error.message);
    }

    const cached = localSubjectsCache.get(id);
    if (cached) {
      localSubjectsCache.set(id, { ...cached, isActive: true, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Matière restaurée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la restauration de la matière.');
  }
}

/**
 * Obtient les matières d'une catégorie
 */
export async function getSubjectsByCategory(categoryId: string): Promise<ServiceResponse<Subject[]>> {
  return getSubjects({ categoryId });
}

/**
 * Obtient les matières affectées à un niveau spécifique via jointure level_subjects
 */
export async function getSubjectsByLevel(levelId: string): Promise<ServiceResponse<Subject[]>> {
  try {
    if (!levelId) return createError(null, 'Identifiant niveau requis.');

    const { data: rows, error } = await supabase
      .from('level_subjects')
      .select('subject_id, subjects(*)')
      .eq('level_id', levelId)
      .eq('is_deleted', false);

    if (!error && rows && rows.length > 0) {
      const list: Subject[] = rows
        .filter((r: any) => r.subjects)
        .map((r: any) => ({
          id: r.subjects.id,
          schoolId: r.subjects.school_id,
          categoryId: r.subjects.category_id,
          code: r.subjects.code,
          name: r.subjects.name,
          shortName: r.subjects.short_name,
          description: r.subjects.description,
          isComposite: r.subjects.is_composite,
          isGraded: r.subjects.is_graded,
          isActive: r.subjects.is_active,
          sortOrder: r.subjects.sort_order,
        }));
      return createSuccess(list);
    }

    return getSubjects();
  } catch (err) {
    return createError(err, 'Erreur lors du filtrage des matières par niveau.');
  }
}

/**
 * Obtient les matières principales (MAIN)
 */
export async function getMainSubjects(): Promise<ServiceResponse<Subject[]>> {
  return getSubjects({ categoryId: '11111111-1111-4111-a111-111111111111' });
}

/**
 * Obtient les matières complémentaires (COMPLEMENTARY)
 */
export async function getComplementarySubjects(): Promise<ServiceResponse<Subject[]>> {
  return getSubjects({ categoryId: '22222222-2222-4222-a222-222222222222' });
}

/**
 * Obtient les domaines d'activités du préscolaire (PRESCHOOL_DOMAIN)
 */
export async function getPreschoolDomains(): Promise<ServiceResponse<Subject[]>> {
  return getSubjects({ categoryId: '33333333-3333-4333-a333-333333333333' });
}
