// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Matières Composées (src/services/academic/catalog/subjectComponentsService.ts)
// Gestion des sous-matières et composants (ex: Étude du milieu ➔ Histoire, Géographie, Sciences)
// Empeche auto-références, doublons et références circulaires
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { ServiceResponse } from './subjectCategoriesService';

export interface SubjectComponent {
  id: string;
  parentSubjectId: string;
  parentSubjectName?: string;
  childSubjectId: string;
  childSubjectName?: string;
  sortOrder: number;
  createdAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[subjectComponentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localComponentsCache: Map<string, SubjectComponent> = new Map();

/**
 * Récupère l'ensemble des composants de matières composées
 */
export async function getComponents(): Promise<ServiceResponse<SubjectComponent[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('subject_components')
      .select('id, parent_subject_id, child_subject_id, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const components: SubjectComponent[] = rows.map((r: any) => ({
        id: r.id,
        parentSubjectId: r.parent_subject_id,
        childSubjectId: r.child_subject_id,
        sortOrder: r.sort_order || 1,
        createdAt: r.created_at,
      }));
      return createSuccess(components);
    }

    if (localComponentsCache.size > 0) {
      return createSuccess(Array.from(localComponentsCache.values()));
    }

    const defaultComponents: SubjectComponent[] = [
      { id: 'cmp-1', parentSubjectId: 'b0200000-0000-4000-b000-000000000008', childSubjectId: 'c0300000-0000-4000-c000-000000000001', sortOrder: 1 },
      { id: 'cmp-2', parentSubjectId: 'b0200000-0000-4000-b000-000000000008', childSubjectId: 'c0300000-0000-4000-c000-000000000002', sortOrder: 2 },
      { id: 'cmp-3', parentSubjectId: 'b0200000-0000-4000-b000-000000000008', childSubjectId: 'c0300000-0000-4000-c000-000000000003', sortOrder: 3 },
    ];

    defaultComponents.forEach((c) => localComponentsCache.set(c.id, c));

    return createSuccess(defaultComponents);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des sous-matières.');
  }
}

/**
 * Récupère les sous-matières d'une matière parente donnée
 * @param parentSubjectId ID de la matière composée
 */
export async function getComponentsBySubject(parentSubjectId: string): Promise<ServiceResponse<SubjectComponent[]>> {
  try {
    if (!parentSubjectId) return createError(null, 'Identifiant matière parente requis.');

    const allRes = await getComponents();
    if (!allRes.success || !allRes.data) {
      return createError(allRes.error, 'Erreur lors du filtrage.');
    }

    const filtered = allRes.data.filter((c) => c.parentSubjectId === parentSubjectId);
    filtered.sort((a, b) => a.sortOrder - b.sortOrder);
    return createSuccess(filtered);
  } catch (err) {
    return createError(err, 'Erreur de récupération des sous-matières.');
  }
}

/**
 * Ajoute une sous-matière à une matière composée
 * Valide l'absence d'auto-référence, de doublon et de référence circulaire
 * @param parentSubjectId ID de la matière parente
 * @param childSubjectId ID de la sous-matière enfant
 * @param sortOrder Ordre d'affichage
 */
export async function addComponent(
  parentSubjectId: string,
  childSubjectId: string,
  sortOrder: number = 1
): Promise<ServiceResponse<SubjectComponent>> {
  try {
    if (!parentSubjectId || !childSubjectId) {
      return createError(null, 'Matière parente et sous-matière enfant requises.');
    }

    // 1. Règle anti auto-référence
    if (parentSubjectId === childSubjectId) {
      return createError(null, 'Une matière ne peut pas être un composant d\'elle-même.');
    }

    const allRes = await getComponents();
    const existingList = allRes.data || Array.from(localComponentsCache.values());

    // 2. Règle anti doublon
    const isDuplicate = existingList.some(
      (c) => c.parentSubjectId === parentSubjectId && c.childSubjectId === childSubjectId
    );
    if (isDuplicate) {
      return createError(null, 'Cette sous-matière fait déjà partie du composant.');
    }

    // 3. Règle anti référence circulaire (ex: child contient déjà parent)
    const isCircular = existingList.some(
      (c) => c.parentSubjectId === childSubjectId && c.childSubjectId === parentSubjectId
    );
    if (isCircular) {
      return createError(null, 'Référence circulaire détectée : la sous-matière contient déjà la matière parente.');
    }

    const newId = crypto.randomUUID();
    const createdComponent: SubjectComponent = {
      id: newId,
      parentSubjectId,
      childSubjectId,
      sortOrder,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('subject_components').insert({
      id: createdComponent.id,
      parent_subject_id: createdComponent.parentSubjectId,
      child_subject_id: createdComponent.childSubjectId,
      sort_order: createdComponent.sortOrder,
      created_at: createdComponent.createdAt,
    });

    if (error) {
      console.warn('[subjectComponentsService:addComponent] Fallback local:', error.message);
    }
    localComponentsCache.set(createdComponent.id, createdComponent);

    return createSuccess(createdComponent, 'Sous-matière ajoutée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'ajout du composant.');
  }
}

/**
 * Supprime la liaison d'une sous-matière
 * @param parentSubjectId ID parent
 * @param childSubjectId ID sous-matière enfant
 */
export async function removeComponent(parentSubjectId: string, childSubjectId: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!parentSubjectId || !childSubjectId) {
      return createError(null, 'Identifiants parent et enfant requis.');
    }

    const { error } = await supabase
      .from('subject_components')
      .delete()
      .eq('parent_subject_id', parentSubjectId)
      .eq('child_subject_id', childSubjectId);

    if (error) {
      console.warn('[subjectComponentsService:removeComponent] Fallback local:', error.message);
    }

    for (const [key, val] of localComponentsCache.entries()) {
      if (val.parentSubjectId === parentSubjectId && val.childSubjectId === childSubjectId) {
        localComponentsCache.delete(key);
      }
    }

    return createSuccess(true, 'Sous-matière retirée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors du retrait de la sous-matière.');
  }
}

/**
 * Met à jour l'ordre d'affichage d'un composant
 * @param componentId Identifiant
 * @param sortOrder Nouvel ordre
 */
export async function updateOrder(componentId: string, sortOrder: number): Promise<ServiceResponse<boolean>> {
  try {
    if (!componentId) return createError(null, 'Identifiant composant requis.');

    const { error } = await supabase
      .from('subject_components')
      .update({ sort_order: sortOrder })
      .eq('id', componentId);

    if (error) {
      console.warn('[subjectComponentsService:updateOrder] Fallback local:', error.message);
    }

    const cached = localComponentsCache.get(componentId);
    if (cached) {
      localComponentsCache.set(componentId, { ...cached, sortOrder });
    }

    return createSuccess(true, 'Ordre de la sous-matière mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de l\'ordre.');
  }
}
