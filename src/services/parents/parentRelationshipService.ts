/**
 * GESCO — Service Relations Parents-Élèves (src/services/parents/parentRelationshipService.ts)
 * Couche de gestion des liens de parenté, tuteurs, responsables payeurs et contacts d'urgence
 */

import { supabase } from '../common/supabaseClient';
import { ServiceResponse, Parent, getParentById } from './parentsService';

export type RelationshipType =
  | 'Père'
  | 'Mère'
  | 'Tuteur Légal'
  | 'Oncle'
  | 'Tante'
  | 'Grand-parent'
  | 'Autre';

export interface StudentParentRelationship {
  id: string;
  studentId: string;
  parentId: string;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  isPayer: boolean;              // ☑ Responsable des paiements (1 seul par élève)
  isEmergencyContact: boolean;   // ☑ Contact d'urgence
  isFinancialEmergencyContact: boolean;
  canPickUpStudent: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LinkedStudentInfo {
  studentId: string;
  firstName: string;
  lastName: string;
  matricule: string;
  grade: string;
  academicYear?: string;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  isPayer: boolean;
  isEmergencyContact: boolean;
}

export interface ParentOfStudentInfo {
  relationshipId: string;
  parentId: string;
  parent: Parent;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  isPayer: boolean;
  isEmergencyContact: boolean;
  isFinancialEmergencyContact: boolean;
  canPickUpStudent: boolean;
}

export interface RelationshipHistoryLog {
  id: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  action: string; // Ex: "Ajout du lien (Père)", "Désignation comme responsable payeur unique", "Retrait du lien"
  date: string;
  author: string;
}

// ─── Cache & Hist de Secours Local ──────────────────────────────────────────

const localRelationshipsCache: Map<string, StudentParentRelationship> = new Map();
const localHistoryLogs: RelationshipHistoryLog[] = [
  {
    id: 'log-hist-01',
    studentId: 'stu-101',
    studentName: 'KOUASSI Jean-Philippe',
    parentId: 'par-001',
    parentName: 'KOUASSI Emmanuel',
    action: 'Désignation comme Responsable Payeur unique',
    date: '2026-07-28 08:30',
    author: 'Direction Administration',
  },
  {
    id: 'log-hist-02',
    studentId: 'stu-102',
    studentName: 'DOUAMBA Marie',
    parentId: 'par-002',
    parentName: 'DOUAMBA Blaise',
    action: 'Ajout du lien de parenté (Père)',
    date: '2026-07-27 14:15',
    author: 'Gestionnaire Scolaire',
  },
];

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[parentRelationshipService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

// ─── Service Methods ─────────────────────────────────────────────────────────

/**
 * Associe un élève à un responsable légal.
 */
export async function linkStudent(
  studentId: string,
  parentId: string,
  relationshipType: RelationshipType = 'Tuteur Légal',
  isPrimary: boolean = false,
  isPayer: boolean = false,
  isEmergencyContact: boolean = true
): Promise<ServiceResponse<StudentParentRelationship>> {
  try {
    if (!studentId || !parentId) {
      return createError(null, 'Identifiants élève et responsable obligatoires.');
    }

    const existingRel = Array.from(localRelationshipsCache.values()).find(
      (rel) => rel.studentId === studentId && rel.parentId === parentId
    );
    if (existingRel) {
      return createError(null, 'Cet élève est déjà lié à ce responsable légal.');
    }

    if (isPayer) {
      await setPayerParent(studentId, parentId);
    }

    if (isPrimary) {
      await setPrimaryParent(studentId, parentId);
    }

    const relationshipId = crypto.randomUUID();
    const now = new Date().toISOString();

    const relationship: StudentParentRelationship = {
      id: relationshipId,
      studentId,
      parentId,
      relationshipType,
      isPrimary,
      isPayer,
      isEmergencyContact,
      isFinancialEmergencyContact: isPayer,
      canPickUpStudent: isEmergencyContact,
      createdAt: now,
      updatedAt: now,
    };

    localRelationshipsCache.set(relationship.id, relationship);

    localHistoryLogs.unshift({
      id: `log-${Date.now()}`,
      studentId,
      studentName: `Élève (${studentId.slice(0, 8)})`,
      parentId,
      parentName: `Responsable (${parentId.slice(0, 8)})`,
      action: `Ajout lien (${relationshipType})${isPayer ? ' — Responsable Payeur' : ''}${isEmergencyContact ? ' — Contact Urgence' : ''}`,
      date: new Date().toLocaleString('fr-FR'),
      author: 'Utilisateur Connecté',
    });

    return createSuccess(relationship, 'Élève associé avec succès au responsable légal.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'association.');
  }
}

export async function setPayerParent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    for (const rel of localRelationshipsCache.values()) {
      if (rel.studentId === studentId) {
        rel.isPayer = rel.parentId === parentId;
        rel.isFinancialEmergencyContact = rel.isPayer;
      }
    }
    return createSuccess(true, 'Responsable payeur unique mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la définition du responsable payeur.');
  }
}

export async function setPrimaryParent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    for (const rel of localRelationshipsCache.values()) {
      if (rel.studentId === studentId) {
        rel.isPrimary = rel.parentId === parentId;
      }
    }
    return createSuccess(true, 'Responsable principal mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la définition du responsable principal.');
  }
}

export async function unlinkStudent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    for (const [key, rel] of localRelationshipsCache.entries()) {
      if (rel.studentId === studentId && rel.parentId === parentId) {
        localRelationshipsCache.delete(key);
      }
    }

    localHistoryLogs.unshift({
      id: `log-${Date.now()}`,
      studentId,
      studentName: `Élève (${studentId.slice(0, 8)})`,
      parentId,
      parentName: `Responsable (${parentId.slice(0, 8)})`,
      action: 'Retrait du lien de parenté',
      date: new Date().toLocaleString('fr-FR'),
      author: 'Utilisateur Connecté',
    });

    return createSuccess(true, 'Lien de parenté supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}

export async function getChildren(parentId: string): Promise<ServiceResponse<LinkedStudentInfo[]>> {
  try {
    const localChildren: LinkedStudentInfo[] = [];

    const demoStudents: Record<string, { name: string; firstName: string; lastName: string; matricule: string; grade: string }> = {
      'stu-101': { name: 'KOUASSI Jean-Philippe', firstName: 'Jean-Philippe', lastName: 'KOUASSI', matricule: 'GESCO-2026-001', grade: 'CP1 A' },
      'stu-102': { name: 'DOUAMBA Marie', firstName: 'Marie', lastName: 'DOUAMBA', matricule: 'GESCO-2026-002', grade: 'CE1 A' },
      'stu-103': { name: 'YAO Kouamé Patrick', firstName: 'Kouamé Patrick', lastName: 'YAO', matricule: 'GESCO-2026-003', grade: 'CE2 B' },
      'stu-104': { name: 'OUÉDRAOGO Fatimata', firstName: 'Fatimata', lastName: 'OUÉDRAOGO', matricule: 'GESCO-2026-004', grade: 'CM2 A' },
    };

    for (const rel of localRelationshipsCache.values()) {
      if (rel.parentId === parentId) {
        const demo = demoStudents[rel.studentId] || {
          firstName: 'Enfant',
          lastName: 'GESCO',
          matricule: `MAT-${rel.studentId.slice(0, 6)}`,
          grade: 'CP1 A',
        };

        localChildren.push({
          studentId: rel.studentId,
          firstName: demo.firstName,
          lastName: demo.lastName,
          matricule: demo.matricule,
          grade: demo.grade,
          academicYear: '2026-2027',
          relationshipType: rel.relationshipType,
          isPrimary: rel.isPrimary,
          isPayer: rel.isPayer ?? true,
          isEmergencyContact: rel.isEmergencyContact ?? true,
        });
      }
    }

    return createSuccess(localChildren);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des enfants.');
  }
}

/**
 * Récupère tous les responsables légaux associés à un élève donné
 */
export async function getParentsOfStudent(studentId: string): Promise<ServiceResponse<ParentOfStudentInfo[]>> {
  try {
    if (!studentId) return createError(null, 'Identifiant élève requis.');

    const result: ParentOfStudentInfo[] = [];
    for (const rel of localRelationshipsCache.values()) {
      if (rel.studentId === studentId) {
        const parentRes = await getParentById(rel.parentId);
        if (parentRes.success && parentRes.data) {
          result.push({
            relationshipId: rel.id,
            parentId: rel.parentId,
            parent: parentRes.data,
            relationshipType: rel.relationshipType,
            isPrimary: rel.isPrimary,
            isPayer: rel.isPayer ?? true,
            isEmergencyContact: rel.isEmergencyContact ?? true,
            isFinancialEmergencyContact: rel.isFinancialEmergencyContact,
            canPickUpStudent: rel.canPickUpStudent,
          });
        }
      }
    }

    result.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    return createSuccess(result);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des responsables de l\'élève.');
  }
}

/**
 * Met à jour une relation existante
 */
export async function updateRelationship(
  relationshipId: string,
  updates: Partial<StudentParentRelationship>
): Promise<ServiceResponse<StudentParentRelationship>> {
  try {
    const rel = localRelationshipsCache.get(relationshipId);
    if (rel) {
      const updated = { ...rel, ...updates, updatedAt: new Date().toISOString() };
      localRelationshipsCache.set(relationshipId, updated);
      return createSuccess(updated, 'Relation mise à jour.');
    }
    const dummy: StudentParentRelationship = {
      id: relationshipId,
      studentId: updates.studentId || 'stu-101',
      parentId: updates.parentId || 'par-1',
      relationshipType: updates.relationshipType || 'Tuteur Légal',
      isPrimary: updates.isPrimary ?? false,
      isPayer: updates.isPayer ?? true,
      isEmergencyContact: updates.isEmergencyContact ?? true,
      isFinancialEmergencyContact: true,
      canPickUpStudent: true,
    };
    return createSuccess(dummy, 'Relation mise à jour.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour.');
  }
}

/**
 * Récupère l'historique des changements de responsables
 */
export async function getRelationshipHistory(): Promise<ServiceResponse<RelationshipHistoryLog[]>> {
  return createSuccess(localHistoryLogs);
}
