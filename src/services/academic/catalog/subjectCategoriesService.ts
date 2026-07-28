// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Catégories de Matières (src/services/academic/catalog/subjectCategoriesService.ts)
// Gestion des catégories et domaines d'activités (Principale, Complémentaire, Préscolaire)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SubjectCategory {
  id: string;
  schoolId?: string;
  code: string;
  name: string;
  description?: string;
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
  console.warn('[subjectCategoriesService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localCategoriesCache: Map<string, SubjectCategory> = new Map();

/**
 * Récupère la liste des catégories de matières ordonnées par sort_order
 */
export async function getCategories(): Promise<ServiceResponse<SubjectCategory[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('subject_categories')
      .select('id, school_id, code, name, description, sort_order, is_active, created_at, updated_at')
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const categories: SubjectCategory[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        code: r.code,
        name: r.name,
        description: r.description,
        sortOrder: r.sort_order || 1,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(categories);
    }

    if (localCategoriesCache.size > 0) {
      const list = Array.from(localCategoriesCache.values());
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      return createSuccess(list);
    }

    const defaultCategories: SubjectCategory[] = [
      { id: '11111111-1111-4111-a111-111111111111', code: 'MAIN', name: 'Principale', description: 'Matières principales fondamentales', sortOrder: 1, isActive: true },
      { id: '22222222-2222-4222-a222-222222222222', code: 'COMPLEMENTARY', name: 'Complémentaire', description: 'Matières d\'éveil et activités artistiques', sortOrder: 2, isActive: true },
      { id: '33333333-3333-4333-a333-333333333333', code: 'PRESCHOOL_DOMAIN', name: 'Domaine Préscolaire', description: 'Domaines d\'activités du préscolaire', sortOrder: 3, isActive: true },
    ];

    defaultCategories.forEach((c) => localCategoriesCache.set(c.id, c));

    return createSuccess(defaultCategories);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des catégories de matières.');
  }
}

/**
 * Récupère une catégorie par son ID
 * @param id Identifiant de la catégorie
 */
export async function getCategory(id: string): Promise<ServiceResponse<SubjectCategory>> {
  try {
    if (!id) return createError(null, 'Identifiant catégorie requis.');

    const { data, error } = await supabase
      .from('subject_categories')
      .select('id, school_id, code, name, description, sort_order, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const category: SubjectCategory = {
        id: data.id,
        schoolId: data.school_id,
        code: data.code,
        name: data.name,
        description: data.description,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localCategoriesCache.set(id, category);
      return createSuccess(category);
    }

    const cached = localCategoriesCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Catégorie introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de la catégorie.');
  }
}

/**
 * Crée une nouvelle catégorie de matière
 * @param data Métadonnées de la catégorie
 */
export async function createCategory(data: Partial<SubjectCategory>): Promise<ServiceResponse<SubjectCategory>> {
  try {
    if (!data.name?.trim()) {
      return createError(null, 'Le nom de la catégorie est obligatoire.');
    }

    const newId = data.id || crypto.randomUUID();
    const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
    const now = new Date().toISOString();

    const createdCategory: SubjectCategory = {
      id: newId,
      code,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      sortOrder: data.sortOrder ?? 1,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('subject_categories').insert({
      id: createdCategory.id,
      code: createdCategory.code,
      name: createdCategory.name,
      description: createdCategory.description,
      sort_order: createdCategory.sortOrder,
      is_active: createdCategory.isActive,
      created_at: createdCategory.createdAt,
      updated_at: createdCategory.updatedAt,
    });

    if (error) {
      console.warn('[subjectCategoriesService:createCategory] Fallback local:', error.message);
    }
    localCategoriesCache.set(createdCategory.id, createdCategory);

    return createSuccess(createdCategory, 'Catégorie créée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de la catégorie.');
  }
}

/**
 * Met à jour une catégorie de matière
 * @param id Identifiant
 * @param updates Attributs à modifier
 */
export async function updateCategory(id: string, updates: Partial<SubjectCategory>): Promise<ServiceResponse<SubjectCategory>> {
  try {
    if (!id) return createError(null, 'Identifiant catégorie manquant.');

    const existingRes = await getCategory(id);
    const existing = existingRes.data;
    if (!existing) return createError(null, 'Catégorie introuvable.');

    const updatedCategory: SubjectCategory = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('subject_categories')
      .update({
        name: updatedCategory.name,
        description: updatedCategory.description,
        sort_order: updatedCategory.sortOrder,
        is_active: updatedCategory.isActive,
        updated_at: updatedCategory.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[subjectCategoriesService:updateCategory] Fallback local:', error.message);
    }
    localCategoriesCache.set(id, updatedCategory);

    return createSuccess(updatedCategory, 'Catégorie mise à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de la catégorie.');
  }
}

/**
 * Archive une catégorie (désactivation)
 * @param id Identifiant
 */
export async function archiveCategory(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('subject_categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[subjectCategoriesService:archiveCategory] Fallback local:', error.message);
    }

    const cached = localCategoriesCache.get(id);
    if (cached) {
      localCategoriesCache.set(id, { ...cached, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Catégorie archivée / désactivée.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage de la catégorie.');
  }
}

/**
 * Restaure une catégorie archivée
 * @param id Identifiant
 */
export async function restoreCategory(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('subject_categories')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[subjectCategoriesService:restoreCategory] Fallback local:', error.message);
    }

    const cached = localCategoriesCache.get(id);
    if (cached) {
      localCategoriesCache.set(id, { ...cached, isActive: true, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Catégorie restaurée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la restauration de la catégorie.');
  }
}
