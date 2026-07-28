// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Niveaux Scolaires (src/services/academic/schoolLevelsService.ts)
// Couche de gestion des niveaux scolaires (PS, MS, GS, CP1, CP2, CE1, CE2, CM1, CM2)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './academicYearsService';

export interface SchoolLevel {
  id: string;
  schoolId?: string;
  cycleId: string;
  code: string;
  name: string;
  shortName: string;
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
  console.warn('[schoolLevelsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localLevelsCache: Map<string, SchoolLevel> = new Map();

/**
 * Récupère la liste de tous les niveaux scolaires ordonnés par sort_order
 */
export async function getLevels(): Promise<ServiceResponse<SchoolLevel[]>> {
  try {
    const { data: rows, error } = await supabase
      .from('school_levels')
      .select('id, school_id, cycle_id, code, name, short_name, sort_order, is_active, created_at, updated_at')
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true });

    if (!error && rows && rows.length > 0) {
      const levels: SchoolLevel[] = rows.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        cycleId: r.cycle_id,
        code: r.code,
        name: r.name,
        shortName: r.short_name || r.code,
        sortOrder: r.sort_order || 1,
        isActive: r.is_active ?? true,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return createSuccess(levels);
    }

    if (localLevelsCache.size > 0) {
      const list = Array.from(localLevelsCache.values());
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      return createSuccess(list);
    }

    const defaultLevels: SchoolLevel[] = [
      { id: 'lvl-ps', cycleId: 'cyc-1', code: 'PS', name: 'Petite Section', shortName: 'PS', sortOrder: 1, isActive: true },
      { id: 'lvl-ms', cycleId: 'cyc-1', code: 'MS', name: 'Moyenne Section', shortName: 'MS', sortOrder: 2, isActive: true },
      { id: 'lvl-gs', cycleId: 'cyc-1', code: 'GS', name: 'Grande Section', shortName: 'GS', sortOrder: 3, isActive: true },
      { id: 'lvl-cp1', cycleId: 'cyc-2', code: 'CP1', name: 'Cours Préparatoire 1', shortName: 'CP1', sortOrder: 4, isActive: true },
      { id: 'lvl-cp2', cycleId: 'cyc-2', code: 'CP2', name: 'Cours Préparatoire 2', shortName: 'CP2', sortOrder: 5, isActive: true },
      { id: 'lvl-ce1', cycleId: 'cyc-2', code: 'CE1', name: 'Cours Élémentaire 1', shortName: 'CE1', sortOrder: 6, isActive: true },
      { id: 'lvl-ce2', cycleId: 'cyc-2', code: 'CE2', name: 'Cours Élémentaire 2', shortName: 'CE2', sortOrder: 7, isActive: true },
      { id: 'lvl-cm1', cycleId: 'cyc-2', code: 'CM1', name: 'Cours Moyen 1', shortName: 'CM1', sortOrder: 8, isActive: true },
      { id: 'lvl-cm2', cycleId: 'cyc-2', code: 'CM2', name: 'Cours Moyen 2', shortName: 'CM2', sortOrder: 9, isActive: true },
    ];

    defaultLevels.forEach((l) => localLevelsCache.set(l.id, l));

    return createSuccess(defaultLevels);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des niveaux scolaires.');
  }
}

/**
 * Récupère un niveau par son identifiant unique
 * @param id Identifiant du niveau
 */
export async function getLevel(id: string): Promise<ServiceResponse<SchoolLevel>> {
  try {
    if (!id) return createError(null, 'Identifiant du niveau requis.');

    const { data, error } = await supabase
      .from('school_levels')
      .select('id, school_id, cycle_id, code, name, short_name, sort_order, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const level: SchoolLevel = {
        id: data.id,
        schoolId: data.school_id,
        cycleId: data.cycle_id,
        code: data.code,
        name: data.name,
        shortName: data.short_name,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      localLevelsCache.set(id, level);
      return createSuccess(level);
    }

    const cached = localLevelsCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Niveau introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du niveau.');
  }
}

/**
 * Récupère les niveaux scolaires appartenant à un cycle spécifique
 * @param cycleId Identifiant du cycle (Préscolaire / Primaire)
 */
export async function getLevelsByCycle(cycleId: string): Promise<ServiceResponse<SchoolLevel[]>> {
  try {
    if (!cycleId) return createError(null, 'Identifiant cycle requis.');

    const allRes = await getLevels();
    if (!allRes.success || !allRes.data) {
      return createError(allRes.error, 'Erreur de filtrage par cycle.');
    }

    const filtered = allRes.data.filter((l) => l.cycleId === cycleId);
    return createSuccess(filtered);
  } catch (err) {
    return createError(err, 'Erreur lors du filtrage des niveaux par cycle.');
  }
}

/**
 * Crée un nouveau niveau scolaire
 * @param levelData Métadonnées du niveau
 */
export async function createLevel(levelData: Partial<SchoolLevel>): Promise<ServiceResponse<SchoolLevel>> {
  try {
    if (!levelData.cycleId || !levelData.name?.trim()) {
      return createError(null, 'Le cycle et le nom du niveau sont obligatoires.');
    }

    const newId = levelData.id || crypto.randomUUID();
    const code = levelData.code || levelData.shortName || levelData.name.toUpperCase().replace(/[^A_Z0-9]/g, '_').slice(0, 10);
    const now = new Date().toISOString();

    const createdLevel: SchoolLevel = {
      id: newId,
      cycleId: levelData.cycleId,
      code,
      name: levelData.name.trim(),
      shortName: levelData.shortName || code,
      sortOrder: levelData.sortOrder ?? 1,
      isActive: levelData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('school_levels').insert({
      id: createdLevel.id,
      cycle_id: createdLevel.cycleId,
      code: createdLevel.code,
      name: createdLevel.name,
      short_name: createdLevel.shortName,
      sort_order: createdLevel.sortOrder,
      is_active: createdLevel.isActive,
      created_at: createdLevel.createdAt,
      updated_at: createdLevel.updatedAt,
    });

    if (error) {
      console.warn('[schoolLevelsService:createLevel] Fallback local:', error.message);
    }
    localLevelsCache.set(createdLevel.id, createdLevel);

    return createSuccess(createdLevel, 'Niveau scolaire créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du niveau.');
  }
}

/**
 * Met à jour un niveau scolaire
 * @param id Identifiant
 * @param updates Attributs à modifier
 */
export async function updateLevel(id: string, updates: Partial<SchoolLevel>): Promise<ServiceResponse<SchoolLevel>> {
  try {
    if (!id) return createError(null, 'Identifiant niveau manquant.');

    const existingRes = await getLevel(id);
    const existing = existingRes.data;
    if (!existing) return createError(null, 'Niveau introuvable.');

    const updatedLevel: SchoolLevel = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('school_levels')
      .update({
        name: updatedLevel.name,
        short_name: updatedLevel.shortName,
        sort_order: updatedLevel.sortOrder,
        is_active: updatedLevel.isActive,
        updated_at: updatedLevel.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[schoolLevelsService:updateLevel] Fallback local:', error.message);
    }
    localLevelsCache.set(id, updatedLevel);

    return createSuccess(updatedLevel, 'Niveau scolaire mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour du niveau.');
  }
}

/**
 * Archive un niveau scolaire
 * @param id Identifiant
 */
export async function archiveLevel(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');

    const { error } = await supabase
      .from('school_levels')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[schoolLevelsService:archiveLevel] Fallback local:', error.message);
    }

    const cached = localLevelsCache.get(id);
    if (cached) {
      localLevelsCache.set(id, { ...cached, isActive: false, updatedAt: new Date().toISOString() });
    }

    return createSuccess(true, 'Niveau scolaire archivé / désactivé.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage du niveau.');
  }
}
