// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Classes / Classrooms (src/services/academic/classroomsService.ts)
// Couche de gestion des classes (PS A, CP1 B, CM2 A) et des capacités d'accueil
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './academicYearsService';

export interface Classroom {
  id: string;
  schoolId?: string;
  academicYearId: string;
  academicYearName?: string;
  levelId: string;
  levelCode?: string;
  levelName?: string;
  name: string;
  roomName?: string;
  mainTeacherId?: string;
  mainTeacherName?: string;
  capacity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassroomFilters {
  academicYearId?: string;
  schoolYearId?: string;
  levelId?: string;
  searchQuery?: string;
  isActive?: boolean | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'capacity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ClassroomListResult {
  classrooms: Classroom[];
  totalCount: number;
  page: number;
  totalPages: number;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[classroomsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

// Données initiales vierges
const INITIAL_CLASSES: Classroom[] = [];

const localClassroomsCache: Map<string, Classroom> = new Map(INITIAL_CLASSES.map(c => [c.id, c]));


/**
 * Recherche et pagination des classes avec filtres
 */
export async function searchClassrooms(filters: ClassroomFilters = {}): Promise<ServiceResponse<ClassroomListResult>> {
  try {
    const {
      page = 1,
      pageSize = 20,
      academicYearId,
      levelId,
      searchQuery,
      isActive = true,
      sortBy = 'name',
      sortOrder = 'asc',
    } = filters;

    let rawList: Classroom[] = Array.from(localClassroomsCache.values());

    try {
      // Priorité à la table 'classes' native du schéma de production
      const { data: rows, error } = await supabase
        .from('classes')
        .select('*')
        .limit(500);

      if (!error && rows && rows.length > 0) {
        rawList = rows.map((r: any) => ({
          id: r.id,
          schoolId: r.school_id,
          academicYearId: r.school_year_id || r.academic_year_id,
          levelId: r.level_id,
          name: r.name,
          roomName: r.room || r.room_name || '',
          mainTeacherId: r.main_teacher_id,
          mainTeacherName: r.main_teacher_name || 'Enseignant non désigné',
          capacity: r.capacity || 35,
          isActive: r.status ? r.status === 'ACTIVE' : (r.is_active ?? true),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch { /* Fallback */ }

    if (isActive !== 'all') {
      rawList = rawList.filter((c) => c.isActive === (isActive === true));
    }
    if (academicYearId) rawList = rawList.filter((c) => c.academicYearId === academicYearId);
    if (levelId) rawList = rawList.filter((c) => c.levelId === levelId);
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.roomName && c.roomName.toLowerCase().includes(q)) ||
        (c.mainTeacherName && c.mainTeacherName.toLowerCase().includes(q))
      );
    }

    rawList.sort((a, b) => {
      const valA = sortBy === 'capacity' ? a.capacity : a.name;
      const valB = sortBy === 'capacity' ? b.capacity : b.name;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const totalCount = rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = rawList.slice(start, start + pageSize);

    return createSuccess({
      classrooms: paginated,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche des classes.');
  }
}

export async function getClassrooms(filters: ClassroomFilters = {}): Promise<ServiceResponse<Classroom[]>> {
  try {
    const res = await searchClassrooms({ ...filters, pageSize: 500 });
    if (!res.success || !res.data) {
      return createError(res.error, 'Erreur de récupération des classes.');
    }
    return createSuccess(res.data.classrooms);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des classes.');
  }
}

export async function getClassroom(id: string): Promise<ServiceResponse<Classroom>> {
  try {
    if (!id) return createError(null, 'Identifiant classe requis.');

    const cached = localClassroomsCache.get(id);
    if (cached) return createSuccess(cached);

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const cls: Classroom = {
          id: data.id,
          academicYearId: data.school_year_id || '2024-2025',
          levelId: data.level_id || 'lvl-cp1',
          name: data.name,
          roomName: data.room || '',
          mainTeacherId: data.main_teacher_id || '',
          mainTeacherName: 'Enseignant',
          capacity: data.capacity || 35,
          isActive: data.status === 'ACTIVE',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        localClassroomsCache.set(id, cls);
        return createSuccess(cls);
      }
    } catch { /* Fallback */ }

    // Recherche dans la liste globale
    const allRes = await getClassrooms();
    if (allRes.success && allRes.data) {
      const found = allRes.data.find((c) => c.id === id || c.name === id);
      if (found) {
        localClassroomsCache.set(found.id, found);
        return createSuccess(found);
      }
    }

    return createError(null, `Classe introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de la classe.');
  }
}

export async function getClassroomsByLevel(levelId: string): Promise<ServiceResponse<Classroom[]>> {
  return getClassrooms({ levelId });
}

export async function getClassroomsByAcademicYear(academicYearId: string): Promise<ServiceResponse<Classroom[]>> {
  return getClassrooms({ academicYearId });
}

/**
 * Crée une nouvelle classe avec contrôle d'unicité du nom par année scolaire
 */
export async function createClassroom(classroomData: Partial<Classroom>): Promise<ServiceResponse<Classroom>> {
  try {
    if (!classroomData.academicYearId || !classroomData.levelId || !classroomData.name?.trim()) {
      return createError(null, 'L\'année scolaire, le niveau et le nom de la classe sont obligatoires.');
    }

    if (classroomData.capacity !== undefined && (typeof classroomData.capacity !== 'number' || isNaN(classroomData.capacity) || classroomData.capacity <= 0)) {
      return createError(null, 'La capacité de la classe doit être un nombre supérieur à 0.');
    }

    const className = classroomData.name.trim();

    // ANOMALIE-MAJ-02 FIX: Contrôle d'unicité du nom de classe par année scolaire
    const existing = Array.from(localClassroomsCache.values()).find(
      (c) => c.academicYearId === classroomData.academicYearId && c.name.toLowerCase() === className.toLowerCase()
    );
    if (existing) {
      return createError(null, `Une classe nommée "${className}" existe déjà pour cette année scolaire.`);
    }

    const newId = classroomData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdClass: Classroom = {
      id: newId,
      academicYearId: classroomData.academicYearId,
      levelId: classroomData.levelId,
      name: className,
      roomName: classroomData.roomName?.trim() || '',
      mainTeacherId: classroomData.mainTeacherId || '',
      mainTeacherName: classroomData.mainTeacherName || 'Enseignant non désigné',
      capacity: classroomData.capacity ?? 35,
      isActive: classroomData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    localClassroomsCache.set(createdClass.id, createdClass);

    try {
      await supabase.from('classes').insert({
        id: createdClass.id,
        name: createdClass.name,
        level_id: createdClass.levelId,
        school_year_id: createdClass.academicYearId,
        capacity: createdClass.capacity,
        main_teacher_id: createdClass.mainTeacherId || null,
        room: createdClass.roomName,
        status: createdClass.isActive ? 'ACTIVE' : 'INACTIVE',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.warn('[classroomsService] Supabase insert fallback:', err);
    }

    return createSuccess(createdClass, 'Classe créée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de la classe.');
  }
}

/**
 * Met à jour une classe existante avec contrôle d'unicité
 */
export async function updateClassroom(id: string, updates: Partial<Classroom>): Promise<ServiceResponse<Classroom>> {
  try {
    if (!id) return createError(null, 'Identifiant classe requis.');

    const cached = localClassroomsCache.get(id);
    if (!cached) return createError(null, 'Classe introuvable.');

    if (updates.capacity !== undefined && (typeof updates.capacity !== 'number' || isNaN(updates.capacity) || updates.capacity <= 0)) {
      return createError(null, 'La capacité de la classe doit être un nombre supérieur à 0.');
    }

    if (updates.name && updates.name.trim() !== cached.name) {
      const className = updates.name.trim();
      const existing = Array.from(localClassroomsCache.values()).find(
        (c) => c.id !== id && c.academicYearId === (updates.academicYearId || cached.academicYearId) && c.name.toLowerCase() === className.toLowerCase()
      );
      if (existing) {
        return createError(null, `Une classe nommée "${className}" existe déjà pour cette année scolaire.`);
      }
    }

    const updated: Classroom = {
      ...cached,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    localClassroomsCache.set(id, updated);

    try {
      await supabase.from('classes').update({
        name: updated.name,
        level_id: updated.levelId,
        school_year_id: updated.academicYearId,
        capacity: updated.capacity,
        main_teacher_id: updated.mainTeacherId || null,
        room: updated.roomName,
        status: updated.isActive ? 'ACTIVE' : 'INACTIVE',
        updated_at: updated.updatedAt,
      }).eq('id', id);
    } catch (err) {
      console.warn('[classroomsService] Supabase update fallback:', err);
    }

    return createSuccess(updated, 'Classe mise à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de la classe.');
  }
}

export async function archiveClassroom(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');
    const cached = localClassroomsCache.get(id);
    if (cached) {
      localClassroomsCache.set(id, { ...cached, isActive: false, updatedAt: new Date().toISOString() });
    }
    return createSuccess(true, 'Classe archivée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage.');
  }
}

export async function restoreClassroom(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');
    const cached = localClassroomsCache.get(id);
    if (cached) {
      localClassroomsCache.set(id, { ...cached, isActive: true, updatedAt: new Date().toISOString() });
    }
    return createSuccess(true, 'Classe restaurée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la restauration.');
  }
}
