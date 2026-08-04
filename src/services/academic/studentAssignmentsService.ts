// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Affectations Élèves / Classes (src/services/academic/studentAssignmentsService.ts)
// Couche de gestion des affectations d'élèves dans les classes et des transferts
// Applique la règle : UN SEUL AFFECTATION ACTIVE PAR ÉLÈVE ET PAR ANNÉE SCOLAIRE
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './academicYearsService';
import { getClassroom } from './classroomsService';

export type AssignmentStatus = 'Actif' | 'Transféré' | 'Archivé';

export interface StudentAssignment {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName?: string;
  classroomId: string;
  classroomName?: string;
  academicYearId: string;
  academicYearName?: string;
  assignmentDate: string;
  exitDate?: string;
  status: AssignmentStatus;
  createdAt?: string;
  updatedAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[studentAssignmentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const INITIAL_ASSIGNMENTS: StudentAssignment[] = [
  { id: 'asg-01', studentId: 'stu-1001', classroomId: 'cls-1', academicYearId: 'ay-2026', assignmentDate: '2026-09-01', status: 'Actif' },
  { id: 'asg-02', studentId: 'stu-1002', classroomId: 'cls-1', academicYearId: 'ay-2026', assignmentDate: '2026-09-01', status: 'Actif' },
  { id: 'asg-03', studentId: 'stu-1003', classroomId: 'cls-2', academicYearId: 'ay-2026', assignmentDate: '2026-09-01', status: 'Actif' },
  { id: 'asg-04', studentId: 'stu-1004', classroomId: 'cls-3', academicYearId: 'ay-2026', assignmentDate: '2026-09-01', status: 'Actif' },
];

const localAssignmentsCache: Map<string, StudentAssignment> = new Map(INITIAL_ASSIGNMENTS.map(a => [a.id, a]));

export async function getAssignments(): Promise<ServiceResponse<StudentAssignment[]>> {
  return createSuccess(Array.from(localAssignmentsCache.values()));
}

export async function getAssignmentsByClass(classroomId: string): Promise<ServiceResponse<StudentAssignment[]>> {
  if (!classroomId?.trim()) return createError(null, 'Identifiant classe manquant.');
  const list = Array.from(localAssignmentsCache.values()).filter((a) => a.classroomId === classroomId);
  return createSuccess(list);
}

export async function getAssignmentsByYear(academicYearId: string): Promise<ServiceResponse<StudentAssignment[]>> {
  if (!academicYearId?.trim()) return createError(null, 'Identifiant année manquant.');
  const list = Array.from(localAssignmentsCache.values()).filter((a) => a.academicYearId === academicYearId);
  return createSuccess(list);
}

export async function getClassroomAssignments(classroomId: string): Promise<ServiceResponse<StudentAssignment[]>> {
  return getAssignmentsByClass(classroomId);
}

export async function getStudentAssignment(studentId: string, academicYearId: string): Promise<ServiceResponse<StudentAssignment | null>> {
  try {
    if (!studentId || !academicYearId) {
      return createError(null, 'Identifiant élève et année scolaire requis.');
    }

    for (const a of localAssignmentsCache.values()) {
      if (a.studentId === studentId && a.academicYearId === academicYearId && a.status === 'Actif') {
        return createSuccess(a);
      }
    }

    return createSuccess(null);
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche de l\'affectation de l\'élève.');
  }
}

export async function assignStudent(
  studentId: string,
  classroomId: string,
  academicYearId: string,
  assignmentDate?: string,
  ignoreCapacity: boolean = false
): Promise<ServiceResponse<StudentAssignment>> {
  try {
    if (!studentId || !classroomId || !academicYearId) {
      return createError(null, 'Élève, classe et année scolaire sont obligatoires.');
    }

    const classRes = await getClassroom(classroomId);
    if (classRes.success && classRes.data && !ignoreCapacity) {
      const cls = classRes.data;
      const currentActive = Array.from(localAssignmentsCache.values()).filter(
        (a) => a.classroomId === classroomId && a.status === 'Actif'
      ).length;

      if (currentActive >= cls.capacity) {
        return createError(
          null,
          `La classe ${cls.name} a atteint sa capacité maximale (${cls.capacity} élèves). Affectation impossible.`
        );
      }
    }

    const existingRes = await getStudentAssignment(studentId, academicYearId);
    if (existingRes.success && existingRes.data) {
      await archiveAssignment(existingRes.data.id);
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const date = assignmentDate || new Date().toISOString().split('T')[0];

    const createdAssignment: StudentAssignment = {
      id: newId,
      studentId,
      classroomId,
      academicYearId,
      assignmentDate: date,
      status: 'Actif',
      createdAt: now,
      updatedAt: now,
    };

    localAssignmentsCache.set(createdAssignment.id, createdAssignment);
    return createSuccess(createdAssignment, 'Élève affecté à la classe avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'affectation de l\'élève.');
  }
}

export async function transferStudent(
  studentId: string,
  newClassroomId: string,
  academicYearId: string,
  transferDate?: string
): Promise<ServiceResponse<StudentAssignment>> {
  try {
    const existingRes = await getStudentAssignment(studentId, academicYearId);
    if (existingRes.success && existingRes.data) {
      const date = transferDate || new Date().toISOString().split('T')[0];
      const cached = localAssignmentsCache.get(existingRes.data.id);
      if (cached) {
        localAssignmentsCache.set(existingRes.data.id, {
          ...cached,
          status: 'Transféré',
          exitDate: date,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return assignStudent(studentId, newClassroomId, academicYearId, transferDate);
  } catch (err) {
    return createError(err, 'Erreur lors du transfert de l\'élève.');
  }
}

export async function archiveAssignment(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant affectation manquant.');
    const cached = localAssignmentsCache.get(id);
    if (cached) {
      localAssignmentsCache.set(id, { ...cached, status: 'Archivé', updatedAt: new Date().toISOString() });
    }
    return createSuccess(true, 'Affectation archivée.');
  } catch (err) {
    return createError(err, 'Erreur d\'archivage.');
  }
}

export async function restoreAssignment(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant affectation manquant.');
    const cached = localAssignmentsCache.get(id);
    if (cached) {
      localAssignmentsCache.set(id, { ...cached, status: 'Actif', updatedAt: new Date().toISOString() });
    }
    return createSuccess(true, 'Affectation restaurée.');
  } catch (err) {
    return createError(err, 'Erreur de restauration.');
  }
}

export async function getStudentAssignments(studentId: string): Promise<ServiceResponse<StudentAssignment[]>> {
  try {
    const assignments = Array.from(localAssignmentsCache.values()).filter((a) => a.studentId === studentId);
    return createSuccess(assignments);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de l\'historique d\'affectations.');
  }
}
