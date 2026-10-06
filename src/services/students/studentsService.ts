// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Élèves (src/services/students/studentsService.ts)
// Couche d'accès aux données des élèves et de leurs inscriptions
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';
import { auditLogService } from '../common/auditLogService';
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

function rowToStudent(row: any): Student {
  return { ...row.data, id: row.id, matricule: row.matricule };
}
async function syncStudentsFromSupabase(): Promise<Student[]> {
  const all: Student[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('students').select('*').order('id').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    all.push(...(data || []).map(rowToStudent));
    if (!data || data.length < 500) return all;
  }
}

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

    const newId = studentData.id || crypto.randomUUID();
    const matricule = studentData.matricule || `MAT-${new Date().getFullYear()}-${newId.slice(0, 8).toUpperCase()}`;

    const createdStudent: Student = {
      ...studentData,
      id: newId,
      matricule,
      firstName: studentData.firstName.trim(),
      lastName: studentData.lastName.trim(),
      gender: studentData.gender || 'Masculin',
      photo: studentData.photo || (studentData.gender === 'Féminin' ? OFFICIAL_GIRL_AVATAR : OFFICIAL_BOY_AVATAR),
      grade: studentData.grade || '',
      status: studentData.status || 'Actif',
      feesStatus: studentData.feesStatus || 'En attente',
      attendance: studentData.attendance ?? 100,
      parentName: studentData.parentName || '',
      parentPhone: studentData.parentPhone || '',
      address: studentData.address || '',
      schoolYear: studentData.schoolYear || '',
    };

    const { error } = await supabase.from('students').insert({
      id: newId, matricule, data: createdStudent,
    });
    if (error) throw new Error(error.message);

    broadcastDataChange('students', 'insert', createdStudent);

    // Traçabilité d'audit
    auditLogService.log({
      action: 'CREATION_ELEVE',
      module: 'PEDAGOGY',
      details: `Création de l'élève ${createdStudent.lastName} ${createdStudent.firstName} (Matricule: ${createdStudent.matricule}, Classe: ${createdStudent.grade})`,
      severity: 'INFO',
    });

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
    const { data, error } = await supabase.rpc('patch_student', { p_id: id, p_updates: updates });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Élève introuvable ou modification non autorisée.');
    const updated = rowToStudent(data);
    broadcastDataChange('students', 'update');
    return createSuccess(updated, 'Élève mis à jour avec succès.');
  } catch (err) { return createError(err, 'Erreur lors de la mise à jour.'); }
}
export async function archiveStudent(id: string): Promise<ServiceResponse<boolean>> {
  const result = await updateStudent(id, { status: 'Archivé' });
  return result.success ? createSuccess(true) : { success: false, error: result.error };
}
export async function restoreStudent(id: string): Promise<ServiceResponse<boolean>> {
  const result = await updateStudent(id, { status: 'Actif' });
  return result.success ? createSuccess(true) : { success: false, error: result.error };
}

/**
 * Récupère un élève par son ID
 */
export async function getStudentById(id: string): Promise<ServiceResponse<Student>> {
  try {
    const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    const student = data ? rowToStudent(data) : null;
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
    const { data, error } = await supabase.from('students').select('*').ilike('matricule', matricule).maybeSingle();
    if (error) throw new Error(error.message);
    const student = data ? rowToStudent(data) : null;
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
      rawList = yearFiltered;
    }

    if (filters.classId) rawList = rawList.filter(s => s.classId === filters.classId);

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
    rawList = rawList.filter((s): s is Student => Boolean(s && typeof s === 'object'));
    rawList.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortBy === 'matricule') {
        valA = a.matricule || '';
        valB = b.matricule || '';
      } else {
        valA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
        valB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
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
    const { data, error } = await supabase.from('students').delete().eq('id', id).select('id').single();
    if (error || !data) throw new Error(error?.message || 'Suppression refusée.');
    broadcastDataChange('students', 'delete', { id });

    // Traçabilité d'audit
    auditLogService.log({
      action: 'SUPPRESSION_ELEVE',
      module: 'PEDAGOGY',
      details: `Suppression définitive de l'élève ID: ${id}`,
      severity: 'WARNING',
    });

    return createSuccess(true, 'Élève supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}

export async function createEnrollment(input: EnrollmentData): Promise<ServiceResponse<EnrollmentData>> {
  try {
    const enrollment = { ...input, id: input.id || crypto.randomUUID() };
    const { error } = await supabase.from('student_enrollments').insert({
      id: enrollment.id, student_id: input.studentId, school_year_id: input.schoolYearId, data: enrollment,
    });
    if (error) throw new Error(error.message);
    return createSuccess(enrollment);
  } catch (error) { return createError(error, 'Inscription non enregistrée.'); }
}
export async function updateEnrollment(id: string, updates: Partial<EnrollmentData>): Promise<ServiceResponse<boolean>> {
  const { error } = await supabase.rpc('patch_student_enrollment', { p_id: id, p_updates: updates });
  return error ? createError(error, 'Modification refusée.') : createSuccess(true);
}
export async function getCurrentEnrollment(studentId: string, schoolYearId: string): Promise<ServiceResponse<EnrollmentData>> {
  const { data, error } = await supabase.from('student_enrollments').select('data').eq('student_id', studentId).eq('school_year_id', schoolYearId).maybeSingle();
  return error || !data ? createError(error, 'Inscription introuvable.') : createSuccess(data.data);
}
export async function getEnrollmentHistory(studentId: string): Promise<ServiceResponse<EnrollmentData[]>> {
  const { data, error } = await supabase.from('student_enrollments').select('data').eq('student_id', studentId).order('created_at');
  return error ? createError(error, 'Historique indisponible.') : createSuccess((data || []).map(row => row.data));
}
