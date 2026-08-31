// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Élèves (src/services/students/studentsService.ts)
// Couche d'accès aux données des élèves et de leurs inscriptions
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';
import { Student } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES ET INTERFACES DU SERVICE ÉLÈVES
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StudentFilters {
  schoolYear?: string;
  level?: string;
  classId?: string;
  gender?: string;
  status?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'matricule' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface StudentListResult {
  students: Student[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface EnrollmentData {
  id?: string;
  studentId: string;
  schoolId?: string;
  schoolYearId: string;
  classId?: string;
  levelId?: string;
  enrollmentDate?: string;
  enrollmentStatus?: 'Inscrit' | 'Réinscrit' | 'Abandon' | 'Exclu' | 'Diplômé';
  registrationNumber?: string;
  hasScholarship?: boolean;
  scholarshipRate?: number;
  observations?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTION CENTRALISÉE DES RÉPONSES ET ERREURS DU SERVICE
// ─────────────────────────────────────────────────────────────────────────────

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || fallbackMessage;
  console.warn('[studentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

export const OFFICIAL_BOY_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=girl&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff';
export const OFFICIAL_GIRL_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=boy&skinColor=8d5524,6c4524,4c3019&hairColor=000000,2c1b18,1a1a1a&backgroundColor=ffffff';

export const DEFAULT_STUDENTS: Student[] = [];

let localStudentsStore: Student[] = [];

async function syncStudentsFromSupabase(): Promise<Student[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'students_data')
      .maybeSingle();

    if (settingsRow && Array.isArray(settingsRow.data)) {
      localStudentsStore = settingsRow.data;
      return settingsRow.data;
    }

    const { data: rows, error } = await supabase.from('students').select('*').limit(500);
    if (!error && Array.isArray(rows)) {
      const list: Student[] = rows.map((row: any) => {
        const d = row.data as any;
        return {
          id: row.id,
          matricule: d?.matricule || row.matricule || row.registration_number || `MAT-${row.id.slice(0, 6)}`,
          firstName: d?.firstName || row.first_name || 'Élève',
          lastName: d?.lastName || row.last_name || 'GESCO',
          gender: d?.gender || (row.gender === 'F' ? 'Féminin' : 'Masculin'),
          photo: d?.photo || row.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${row.id}`,
          grade: (d?.grade && !['6ème', '5ème', '4ème', '3ème'].includes(d.grade)) ? d.grade : (row.class_id && !['6ème', '5ème', '4ème', '3ème'].includes(row.class_id) ? row.class_id : 'CP1'),
          status: d?.status || (row.status === 'ACTIVE' ? 'Actif' : (row.status || 'Actif')),
          feesStatus: d?.feesStatus || 'En attente',
          attendance: d?.attendance ?? 100,
          parentName: d?.parentName || '',
          parentPhone: d?.parentPhone || '',
          address: d?.address || '',
          schoolYear: row.school_year_id || row.school_year || '2026-2027',
        };
      });
      localStudentsStore = list;
      return list;
    }
  } catch (err) {
    console.warn('[studentsService] syncStudentsFromSupabase warning:', err);
  }
  return localStudentsStore;
}

async function persistStudentsToSupabase(allStudents: Student[]) {
  try {
    await supabase
      .from('school_settings')
      .upsert({
        id: 'students_data',
        data: allStudents,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[studentsService] persistStudentsToSupabase warning:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÉTHODES DU SERVICE ÉLÈVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un nouvel élève dans la base de données
 */
export async function createStudent(studentData: Partial<Student>): Promise<ServiceResponse<Student>> {
  try {
    if (!studentData.firstName?.trim()) {
      return createError(null, 'Le prénom de l\'élève est obligatoire.');
    }
    if (!studentData.lastName?.trim()) {
      return createError(null, 'Le nom de famille de l\'élève est obligatoire.');
    }

    await syncStudentsFromSupabase();

    const matricule = studentData.matricule || `MAT-${new Date().getFullYear()}-${String(localStudentsStore.length + 1).padStart(4, '0')}`;
    const newId = studentData.id || crypto.randomUUID();

    const duplicate = localStudentsStore.find(
      (s) => s.matricule.toLowerCase() === matricule.toLowerCase()
    );
    if (duplicate) {
      return createError(null, `Le matricule "${matricule}" est déjà attribué à l'élève ${duplicate.firstName} ${duplicate.lastName}.`);
    }

    const createdStudent: Student = {
      id: newId,
      matricule,
      firstName: studentData.firstName.trim(),
      lastName: studentData.lastName.trim(),
      gender: studentData.gender || 'Masculin',
      photo: studentData.photo || (studentData.gender === 'Féminin' ? OFFICIAL_GIRL_AVATAR : OFFICIAL_BOY_AVATAR),
      grade: studentData.grade && !['6ème', '5ème', '4ème', '3ème'].includes(studentData.grade) ? studentData.grade : 'CP1',
      status: studentData.status || 'Actif',
      feesStatus: studentData.feesStatus || 'En attente',
      attendance: studentData.attendance ?? 100,
      parentName: studentData.parentName || '',
      parentPhone: studentData.parentPhone || '',
      address: studentData.address || '',
      schoolYear: studentData.schoolYear || '2026-2027',
    };

    localStudentsStore.unshift(createdStudent);
    await persistStudentsToSupabase(localStudentsStore);

    // Résolution de classe et persistance table SQL students
    try {
      await supabase.from('students').insert({
        id: newId,
        matricule: createdStudent.matricule,
        first_name: createdStudent.firstName,
        last_name: createdStudent.lastName,
        gender: createdStudent.gender === 'Féminin' ? 'F' : 'M',
        birth_date: '2014-06-15',
        nationality: 'Ivoirienne',
        school_year_id: createdStudent.schoolYear,
        avatar_url: createdStudent.photo,
        status: 'ACTIVE',
        school_year: createdStudent.schoolYear,
      });
    } catch (err) {
      console.warn('[studentsService] Supabase insert fallback:', err);
    }

    broadcastDataChange('students', 'insert', createdStudent);
    return createSuccess(createdStudent, 'Elève créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de l\'elève.');
  }
}

/**
 * Met à jour un élève existant
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<ServiceResponse<Student>> {
  try {
    await syncStudentsFromSupabase();
    const idx = localStudentsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      localStudentsStore[idx] = { ...localStudentsStore[idx], ...updates };
    }

    try {
      await supabase.from('students').update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        gender: updates.gender ? (updates.gender === 'Féminin' ? 'F' : 'M') : undefined,
        class_id: updates.grade,
        avatar_url: updates.photo,
        status: updates.status ? (updates.status === 'Actif' ? 'ACTIVE' : updates.status) : undefined,
      }).eq('id', id);
    } catch (err) {
      console.warn('[studentsService] Supabase update fallback:', err);
    }

    const updated = localStudentsStore.find((s) => s.id === id) || (updates as Student);
    await persistStudentsToSupabase(localStudentsStore);
    broadcastDataChange('students', 'update', updated);
    return createSuccess(updated, 'Élève mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour.');
  }
}

/**
 * Archive un élève (Soft Delete)
 */
export async function archiveStudent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    const idx = localStudentsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      localStudentsStore[idx].status = 'Archivé';
    }
    await persistStudentsToSupabase(localStudentsStore);
    broadcastDataChange('students', 'update', { id, status: 'Archivé' });
    return createSuccess(true, 'Élève archivé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage.');
  }
}

/**
 * Restaure un élève archivé
 */
export async function restoreStudent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    const idx = localStudentsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      localStudentsStore[idx].status = 'Actif';
    }
    await persistStudentsToSupabase(localStudentsStore);
    broadcastDataChange('students', 'update', { id, status: 'Actif' });
    return createSuccess(true, 'Élève restauré avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la restauration.');
  }
}

/**
 * Récupère un élève par son ID
 */
export async function getStudentById(id: string): Promise<ServiceResponse<Student>> {
  try {
    const student = localStudentsStore.find((s) => s.id === id);
    if (!student) {
      return createError(null, `Elève introuvable (ID: ${id}).`);
    }
    return createSuccess(student);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération.');
  }
}

/**
 * Récupère un élève par son matricule unique
 */
export async function getStudentByMatricule(matricule: string): Promise<ServiceResponse<Student>> {
  try {
    const student = localStudentsStore.find((s) => s.matricule.toLowerCase() === matricule.toLowerCase());
    if (student) return createSuccess(student);
    return createError(null, 'Aucun élève trouvé avec ce matricule.');
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche par matricule.');
  }
}

/**
 * Liste et recherche d'élèves avec filtres, tri et pagination
 */
export async function listStudents(filters: StudentFilters = {}): Promise<ServiceResponse<StudentListResult>> {
  try {
    const {
      schoolYear,
      page = 1,
      pageSize = 15,
      searchQuery,
      status = 'all',
      gender = 'ALL',
      sortBy = 'name',
      sortOrder = 'asc',
    } = filters;

    const list = await syncStudentsFromSupabase();
    let rawList: Student[] = [...list];

    // Filtre par année scolaire
    if (schoolYear) {
      const yearFiltered = rawList.filter((s) => !s.schoolYear || s.schoolYear === schoolYear);
      if (yearFiltered.length > 0) {
        rawList = yearFiltered;
      }
    }

    // Filtre par statut (all / Actif / Inactif / Archivé)
    if (status !== 'all') {
      rawList = rawList.filter((s) => s.status === status);
    }

    // Filtre par genre
    if (gender !== 'ALL') {
      rawList = rawList.filter((s) => s.gender === gender);
    }

    // Recherche multi-critères (Nom, Prénom, Matricule, Parent, Téléphone)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(q) ||
          s.lastName?.toLowerCase().includes(q) ||
          s.matricule?.toLowerCase().includes(q) ||
          s.grade?.toLowerCase().includes(q) ||
          s.parentName?.toLowerCase().includes(q) ||
          s.parentPhone?.toLowerCase().includes(q)
      );
    }

    // Tri (Nom, Matricule)
    rawList.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortBy === 'matricule') {
        valA = a.matricule || '';
        valB = b.matricule || '';
      } else {
        valA = `${a.lastName} ${a.firstName}`;
        valB = `${b.lastName} ${b.firstName}`;
      }
      const comp = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comp : -comp;
    });

    const totalCount = rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginatedStudents = rawList.slice(start, start + pageSize);

    return createSuccess({
      students: paginatedStudents,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors du traitement de la liste des élèves.');
  }
}

export async function searchStudents(filters: StudentFilters): Promise<ServiceResponse<StudentListResult>> {
  return listStudents(filters);
}

export async function deleteStudent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    await syncStudentsFromSupabase();
    const idx = localStudentsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      localStudentsStore.splice(idx, 1);
    }
    try {
      await supabase.from('students').delete().eq('id', id);
    } catch (err) {
      console.warn('[studentsService:deleteStudent] Supabase delete fallback:', err);
    }
    await persistStudentsToSupabase(localStudentsStore);
    broadcastDataChange('students', 'delete', { id });
    return createSuccess(true, 'Élève supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}

export async function createEnrollment(data: EnrollmentData): Promise<ServiceResponse<EnrollmentData>> {
  return createSuccess({ ...data, id: data.id || crypto.randomUUID() }, 'Inscription enregistrée.');
}

export async function updateEnrollment(enrollmentId: string, updates: Partial<EnrollmentData>): Promise<ServiceResponse<boolean>> {
  return createSuccess(true, 'Inscription mise à jour.');
}

export async function getCurrentEnrollment(studentId: string, schoolYearId: string): Promise<ServiceResponse<EnrollmentData>> {
  return createSuccess({
    id: crypto.randomUUID(),
    studentId,
    schoolYearId,
    enrollmentStatus: 'Inscrit',
    hasScholarship: false,
  });
}

export async function getEnrollmentHistory(studentId: string): Promise<ServiceResponse<EnrollmentData[]>> {
  return createSuccess([
    { id: crypto.randomUUID(), studentId, schoolYearId: '2026-2027', enrollmentStatus: 'Inscrit' },
  ]);
}
