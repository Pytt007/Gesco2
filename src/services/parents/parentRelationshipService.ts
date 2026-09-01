/**
 * GESCO — Service Relations Parents-Élèves (src/services/parents/parentRelationshipService.ts)
 * Couche de gestion des liens de parenté, tuteurs, responsables payeurs et contacts d'urgence
 */

import { supabase } from '../common/supabaseClient';
import { ServiceResponse, Parent, getParentById } from './parentsService';
import { getStudentById } from '../students/studentsService';

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
const localHistoryLogs: RelationshipHistoryLog[] = [];

export function clearRelationshipsStore(): void {
  localRelationshipsCache.clear();
  localHistoryLogs.length = 0;
}


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

    const studentRels = Array.from(localRelationshipsCache.values()).filter(
      (rel) => rel.studentId === studentId
    );

    const existingRel = studentRels.find((rel) => rel.parentId === parentId);
    if (existingRel) {
      return createError(null, 'Cet élève est déjà lié à ce responsable légal.');
    }

    // Si c'est le 1er parent lié à l'élève : activer par défaut isPrimary, isPayer et isEmergencyContact
    const isFirstParent = studentRels.length === 0;
    const finalPrimary = isFirstParent ? true : isPrimary;
    const finalPayer = isFirstParent ? true : isPayer;
    const finalEmergency = isEmergencyContact ?? true;

    if (finalPayer) {
      await setPayerParent(studentId, parentId);
    }

    if (finalPrimary) {
      await setPrimaryParent(studentId, parentId);
    }

    const relationshipId = crypto.randomUUID();
    const now = new Date().toISOString();

    const relationship: StudentParentRelationship = {
      id: relationshipId,
      studentId,
      parentId,
      relationshipType,
      isPrimary: finalPrimary,
      isPayer: finalPayer,
      isEmergencyContact: finalEmergency,
      isFinancialEmergencyContact: finalPayer,
      canPickUpStudent: finalEmergency,
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
      action: `Ajout lien (${relationshipType})${finalPayer ? ' — Responsable Payeur' : ''}${finalEmergency ? ' — Contact Urgence' : ''}`,
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
    let wasPrimary = false;
    let wasPayer = false;

    for (const [key, rel] of localRelationshipsCache.entries()) {
      if (rel.studentId === studentId && rel.parentId === parentId) {
        wasPrimary = rel.isPrimary;
        wasPayer = rel.isPayer;
        localRelationshipsCache.delete(key);
      }
    }

    // Réassigner isPrimary et/ou isPayer au premier parent restant si nécessaire
    const remainingRels = Array.from(localRelationshipsCache.values()).filter(
      (rel) => rel.studentId === studentId
    );

    if (remainingRels.length > 0) {
      if (wasPrimary && !remainingRels.some((r) => r.isPrimary)) {
        remainingRels[0].isPrimary = true;
      }
      if (wasPayer && !remainingRels.some((r) => r.isPayer)) {
        remainingRels[0].isPayer = true;
        remainingRels[0].isFinancialEmergencyContact = true;
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

export interface FamilyUnitValidation {
  studentId: string;
  hasParents: boolean;
  parentCount: number;
  hasPrimary: boolean;
  hasPayer: boolean;
  hasEmergencyContact: boolean;
  isValid: boolean;
  issues: string[];
}

/**
 * Valide la cohérence de l'unité familiale pour un élève
 */
export async function validateStudentFamilyUnit(studentId: string): Promise<ServiceResponse<FamilyUnitValidation>> {
  try {
    if (!studentId) return createError(null, 'Identifiant élève requis.');

    const rels = Array.from(localRelationshipsCache.values()).filter(
      (r) => r.studentId === studentId
    );

    const hasParents = rels.length > 0;
    const hasPrimary = rels.some((r) => r.isPrimary);
    const hasPayer = rels.some((r) => r.isPayer);
    const hasEmergencyContact = rels.some((r) => r.isEmergencyContact);

    const issues: string[] = [];
    if (!hasParents) issues.push('Aucun responsable légal rattaché.');
    if (hasParents && !hasPrimary) issues.push('Aucun responsable principal désigné.');
    if (hasParents && !hasPayer) issues.push('Aucun responsable financier désigné.');
    if (hasParents && !hasEmergencyContact) issues.push('Aucun contact d\'urgence désigné.');

    const isValid = hasParents && hasPrimary && hasPayer && hasEmergencyContact;

    return createSuccess({
      studentId,
      hasParents,
      parentCount: rels.length,
      hasPrimary,
      hasPayer,
      hasEmergencyContact,
      isValid,
      issues,
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la validation de l\'unité familiale.');
  }
}

export async function getChildren(parentId: string): Promise<ServiceResponse<LinkedStudentInfo[]>> {
  try {
    const localChildren: LinkedStudentInfo[] = [];

    for (const rel of localRelationshipsCache.values()) {
      if (rel.parentId === parentId) {
        let firstName = 'Élève';
        let lastName = '';
        let matricule = `MAT-${rel.studentId.slice(0, 6)}`;
        let grade = 'Classe';

        try {
          const stRes = await getStudentById(rel.studentId);
          if (stRes.success && stRes.data) {
            firstName = stRes.data.firstName;
            lastName = stRes.data.lastName;
            matricule = stRes.data.matricule || matricule;
            grade = stRes.data.className || (stRes.data as any).level || stRes.data.grade || grade;
          }
        } catch { /* Fallback */ }

        localChildren.push({
          studentId: rel.studentId,
          firstName,
          lastName,
          matricule,
          grade,
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
    if (!rel) {
      return createError(null, 'Relation introuvable.');
    }
    const updated = { ...rel, ...updates, updatedAt: new Date().toISOString() };
    localRelationshipsCache.set(relationshipId, updated);
    return createSuccess(updated, 'Relation mise à jour.');
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
