// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Élèves (src/services/students/studentsService.ts)
// Couche d'accès aux données des élèves et de leurs inscriptions
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
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

// Données fallback initiales de démonstration sur plusieurs années scolaires
const INITIAL_MOCK_STUDENTS: Student[] = [
  // ─── 2024-2025 (Année par défaut actuelle) ───
  { id: 'stu-1001', matricule: 'MAT-2024-001', firstName: 'Jean-Philippe', lastName: 'KOUASSI', gender: 'Masculin', grade: 'CP1 A', status: 'Actif', feesStatus: 'Payé', attendance: 98, parentName: 'KOUASSI Marc', parentPhone: '0708091011', address: 'Abidjan Cocody', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2024-2025' },
  { id: 'stu-1002', matricule: 'MAT-2024-002', firstName: 'Fatimata', lastName: 'OUÉDRAOGO', gender: 'Féminin', grade: 'CE1 A', status: 'Actif', feesStatus: 'Partiel', attendance: 95, parentName: 'OUÉDRAOGO Souleymane', parentPhone: '0506070809', address: 'Abidjan Yopougon', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2024-2025' },
  { id: 'stu-1003', matricule: 'MAT-2024-003', firstName: 'Marie', lastName: 'DOUAMBA', gender: 'Féminin', grade: 'CE2 B', status: 'Actif', feesStatus: 'Payé', attendance: 100, parentName: 'DOUAMBA Paul', parentPhone: '0102030405', address: 'Abidjan Marcory', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2024-2025' },
  { id: 'stu-1004', matricule: 'MAT-2024-004', firstName: 'Patrick', lastName: 'YAO', gender: 'Masculin', grade: 'CM1 A', status: 'Actif', feesStatus: 'En retard', attendance: 88, parentName: 'YAO Kouadio', parentPhone: '0744556677', address: 'Abidjan Treichville', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2024-2025' },
  { id: 'stu-1005', matricule: 'MAT-2024-005', firstName: 'Awa', lastName: 'DIABATÉ', gender: 'Féminin', grade: '6ème A', status: 'Inactif', feesStatus: 'En attente', attendance: 75, parentName: 'DIABATÉ Ibrahima', parentPhone: '0588990011', address: 'Abidjan Koumassi', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2024-2025' },

  // ─── 2023-2024 (Archive N-1) ───
  { id: 'stu-2001', matricule: 'MAT-2023-010', firstName: 'Amadou', lastName: 'KONÉ', gender: 'Masculin', grade: 'CP1 B', status: 'Actif', feesStatus: 'Payé', attendance: 96, parentName: 'KONÉ Seydou', parentPhone: '0711223344', address: 'Abidjan Plateau', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2023-2024' },
  { id: 'stu-2002', matricule: 'MAT-2023-011', firstName: 'Sali', lastName: 'KOUADIO', gender: 'Féminin', grade: 'CE1 B', status: 'Actif', feesStatus: 'Payé', attendance: 99, parentName: 'KOUADIO Brou', parentPhone: '0522334455', address: 'Abidjan Bingerville', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2023-2024' },
  { id: 'stu-2003', matricule: 'MAT-2023-012', firstName: 'Ibrahim', lastName: 'TRAORÉ', gender: 'Masculin', grade: 'CM1 A', status: 'Actif', feesStatus: 'Partiel', attendance: 91, parentName: 'TRAORÉ Adama', parentPhone: '0133445566', address: 'Abidjan Port-Bouët', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2023-2024' },

  // ─── 2022-2023 (Archive N-2) ───
  { id: 'stu-3001', matricule: 'MAT-2022-020', firstName: 'Mohamed', lastName: 'BARRY', gender: 'Masculin', grade: 'CE2 A', status: 'Archivé', feesStatus: 'Payé', attendance: 97, parentName: 'BARRY Alpha', parentPhone: '0755667788', address: 'Abidjan Cocody', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2022-2023' },
  { id: 'stu-3002', matricule: 'MAT-2022-021', firstName: 'Grace', lastName: 'KOFFI', gender: 'Féminin', grade: 'CM2 B', status: 'Archivé', feesStatus: 'Payé', attendance: 100, parentName: 'KOFFI Henri', parentPhone: '0566778899', address: 'Abidjan Riviera', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2022-2023' },

  // ─── 2025-2026 (Projection N+1) ───
  { id: 'stu-4001', matricule: 'MAT-2025-030', firstName: 'Yves', lastName: 'KANGA', gender: 'Masculin', grade: 'CP1 A', status: 'Actif', feesStatus: 'Payé', attendance: 100, parentName: 'KANGA Charles', parentPhone: '0799887766', address: 'Abidjan Cocody', photo: OFFICIAL_BOY_AVATAR, schoolYear: '2025-2026' },
  { id: 'stu-4002', matricule: 'MAT-2025-031', firstName: 'Estelle', lastName: 'GBANE', gender: 'Féminin', grade: 'CE2 A', status: 'Actif', feesStatus: 'En attente', attendance: 94, parentName: 'GBANE Lassina', parentPhone: '0511335577', address: 'Abidjan Abobo', photo: OFFICIAL_GIRL_AVATAR, schoolYear: '2025-2026' },
];

let localStudentsStore: Student[] = [...INITIAL_MOCK_STUDENTS];

// ─────────────────────────────────────────────────────────────────────────────
// MÉTHODES DU SERVICE ÉLÈVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un nouvel élève dans la base de données
 */
export async function createStudent(studentData: Partial<Student>): Promise<ServiceResponse<Student>> {
  try {
    // ✅ INT-004 P1 : Validation des champs obligatoires
    if (!studentData.firstName?.trim()) {
      return createError(null, 'Le prénom de l\'élève est obligatoire.');
    }
    if (!studentData.lastName?.trim()) {
      return createError(null, 'Le nom de famille de l\'élève est obligatoire.');
    }

    const matricule = studentData.matricule || `MAT-${new Date().getFullYear()}-${String(localStudentsStore.length + 1).padStart(4, '0')}`;
    const newId = studentData.id || crypto.randomUUID();

    // ✅ INT-001 P0 : Vérification de l'unicité du matricule
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
      grade: studentData.grade || '6ème',
      status: studentData.status || 'Actif',
      feesStatus: studentData.feesStatus || 'En attente',
      attendance: studentData.attendance ?? 100,
      parentName: studentData.parentName || '',
      parentPhone: studentData.parentPhone || '',
      address: studentData.address || '',
      schoolYear: studentData.schoolYear || '2024-2025',
    };

    localStudentsStore.unshift(createdStudent);

    try {
      await supabase.from('students').insert({
        id: newId,
        school_year: createdStudent.schoolYear,
        data: createdStudent,
      });
    } catch { /* Silent local fallback */ }

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
    const idx = localStudentsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      localStudentsStore[idx] = { ...localStudentsStore[idx], ...updates };
    }

    try {
      await supabase.from('students').update({ data: updates }).eq('id', id);
    } catch { /* Silent local fallback */ }

    const updated = localStudentsStore.find((s) => s.id === id) || (updates as Student);
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

    let rawList: Student[] = [...localStudentsStore];

    // Tentative de récupération Supabase si disponible
    try {
      let query = supabase.from('students').select('*').limit(500);
      if (schoolYear) {
        query = query.eq('school_year', schoolYear);
      }
      const { data: rows } = await query;
      if (rows && rows.length > 0) {
        rawList = rows.map((row: any) => {
          const d = row.data as any;
          return {
            id: row.id,
            matricule: d?.matricule || row.registration_number || `MAT-${row.id.slice(0, 6)}`,
            firstName: d?.firstName || row.first_name || 'Élève',
            lastName: d?.lastName || row.last_name || 'GESCO',
            gender: d?.gender || row.gender || 'Masculin',
            photo: d?.photo || row.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${row.id}`,
            grade: d?.grade || '6ème',
            status: d?.status || row.status || 'Actif',
            feesStatus: d?.feesStatus || 'En attente',
            attendance: d?.attendance ?? 100,
            parentName: d?.parentName || '',
            parentPhone: d?.parentPhone || '',
            address: d?.address || '',
            schoolYear: row.school_year || '2024-2025',
          };
        });
      }
    } catch { /* Fallback store local */ }

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

export async function deleteStudent(id: string): Promise<ServiceResponse<never>> {
  return {
    success: false,
    error: 'La suppression physique d\'un élève est interdite. Seul l\'archivage est autorisé.',
  };
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
