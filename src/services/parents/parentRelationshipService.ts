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

// Neon is authoritative; this cache is only retained for legacy clear calls.

const localRelationshipsCache: Map<string, StudentParentRelationship> = new Map();

export function clearRelationshipsStore(): void {
  localRelationshipsCache.clear();
}

function relationRow(relation: StudentParentRelationship) {
  return {
    id: relation.id,
    student_id: relation.studentId,
    parent_id: relation.parentId,
    data: relation,
    updated_at: relation.updatedAt || new Date().toISOString(),
  };
}

async function loadRelationships(filters: { studentId?: string; parentId?: string } = {}): Promise<StudentParentRelationship[]> {
  const rows: StudentParentRelationship[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('student_parent_links').select('id,student_id,parent_id,data');
    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.parentId) query = query.eq('parent_id', filters.parentId);
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Réponse Neon invalide pour les liens de parenté.');
    for (const row of data) {
      if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) throw new Error('Lien de parenté Neon invalide.');
      rows.push({ ...row.data, id: row.id, studentId: row.student_id, parentId: row.parent_id } as StudentParentRelationship);
    }
    if (data.length < 500) break;
  }
  localRelationshipsCache.clear();
  for (const relation of rows) localRelationshipsCache.set(relation.id, relation);
  return rows;
}

async function writeRelationships(relations: StudentParentRelationship[]): Promise<void> {
  if (relations.length === 0) return;
  const { data, error } = await supabase.from('student_parent_links')
    .upsert(relations.map(relationRow), { onConflict: 'id' }).select('id');
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.length !== relations.length ||
      relations.some((relation) => !data.some((row) => row.id === relation.id))) {
    throw new Error('Enregistrement des liens de parenté non confirmé par Neon.');
  }
  for (const relation of relations) localRelationshipsCache.set(relation.id, relation);
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

    const studentRels = await loadRelationships({ studentId });

    const existingRel = studentRels.find((rel) => rel.parentId === parentId);
    if (existingRel) {
      return createError(null, 'Cet élève est déjà lié à ce responsable légal.');
    }

    // Si c'est le 1er parent lié à l'élève : activer par défaut isPrimary, isPayer et isEmergencyContact
    const isFirstParent = studentRels.length === 0;
    const finalPrimary = isFirstParent ? true : isPrimary;
    const finalPayer = isFirstParent ? true : isPayer;
    const finalEmergency = isEmergencyContact ?? true;

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

    const changed = studentRels.filter((rel) => (finalPrimary && rel.isPrimary) || (finalPayer && rel.isPayer))
      .map((rel) => ({ ...rel,
        isPrimary: finalPrimary ? false : rel.isPrimary,
        isPayer: finalPayer ? false : rel.isPayer,
        isFinancialEmergencyContact: finalPayer ? false : rel.isFinancialEmergencyContact,
        updatedAt: now,
      }));
    await writeRelationships([...changed, relationship]);

    return createSuccess(relationship, 'Élève associé avec succès au responsable légal.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'association.');
  }
}

export async function setPayerParent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    const relations = await loadRelationships({ studentId });
    if (!relations.some((rel) => rel.parentId === parentId)) return createError(null, 'Responsable introuvable pour cet élève.');
    await writeRelationships(relations.map((rel) => ({
      ...rel, isPayer: rel.parentId === parentId,
      isFinancialEmergencyContact: rel.parentId === parentId,
      updatedAt: new Date().toISOString(),
    })));
    return createSuccess(true, 'Responsable payeur unique mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la définition du responsable payeur.');
  }
}

export async function setPrimaryParent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    const relations = await loadRelationships({ studentId });
    if (!relations.some((rel) => rel.parentId === parentId)) return createError(null, 'Responsable introuvable pour cet élève.');
    await writeRelationships(relations.map((rel) => ({
      ...rel, isPrimary: rel.parentId === parentId, updatedAt: new Date().toISOString(),
    })));
    return createSuccess(true, 'Responsable principal mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la définition du responsable principal.');
  }
}

export async function unlinkStudent(studentId: string, parentId: string): Promise<ServiceResponse<boolean>> {
  try {
    const relations = await loadRelationships({ studentId });
    const target = relations.find((rel) => rel.parentId === parentId);
    if (!target) return createError(null, 'Lien de parenté introuvable.');
    const { data, error } = await supabase.from('student_parent_links').delete()
      .eq('id', target.id).select('id').single();
    if (error || data?.id !== target.id) throw new Error(error?.message || 'Suppression du lien non confirmée par Neon.');
    localRelationshipsCache.delete(target.id);

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

    const rels = await loadRelationships({ studentId });

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
    const relations = await loadRelationships({ parentId });
    for (const rel of relations) {
        let firstName = 'Élève';
        let lastName = '';
        let matricule = `MAT-${rel.studentId.slice(0, 6)}`;
        let grade = 'Classe';

        const stRes = await getStudentById(rel.studentId);
        if (!stRes.success || !stRes.data) throw new Error(stRes.error || 'Lecture de l’élève impossible.');
        firstName = stRes.data.firstName;
        lastName = stRes.data.lastName;
        matricule = stRes.data.matricule || matricule;
        grade = stRes.data.className || (stRes.data as any).level || stRes.data.grade || grade;

        localChildren.push({
          studentId: rel.studentId,
          firstName,
          lastName,
          matricule,
          grade,
          relationshipType: rel.relationshipType,
          isPrimary: rel.isPrimary,
          isPayer: rel.isPayer ?? true,
          isEmergencyContact: rel.isEmergencyContact ?? true,
        });
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
    const relations = await loadRelationships({ studentId });
    for (const rel of relations) {
        const parentRes = await getParentById(rel.parentId);
        if (!parentRes.success || !parentRes.data) throw new Error(parentRes.error || 'Lecture du responsable impossible.');
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
    const { data: row, error: readError } = await supabase.from('student_parent_links')
      .select('id,student_id,parent_id,data').eq('id', relationshipId).maybeSingle();
    if (readError) throw new Error(readError.message);
    const rel = row ? { ...row.data, id: row.id, studentId: row.student_id, parentId: row.parent_id } as StudentParentRelationship : null;
    if (!rel) {
      return createError(null, 'Relation introuvable.');
    }
    const updated = {
      ...rel, ...updates, id: rel.id, studentId: rel.studentId, parentId: rel.parentId,
      isFinancialEmergencyContact: updates.isPayer === undefined ? (updates.isFinancialEmergencyContact ?? rel.isFinancialEmergencyContact) : updates.isPayer,
      createdAt: rel.createdAt, updatedAt: new Date().toISOString(),
    };
    const peers = (updated.isPrimary && !rel.isPrimary) || (updated.isPayer && !rel.isPayer)
      ? (await loadRelationships({ studentId: rel.studentId })).filter((item) => item.id !== rel.id)
        .map((item) => ({
          ...item,
          isPrimary: updated.isPrimary && !rel.isPrimary ? false : item.isPrimary,
          isPayer: updated.isPayer && !rel.isPayer ? false : item.isPayer,
          isFinancialEmergencyContact: updated.isPayer && !rel.isPayer ? false : item.isFinancialEmergencyContact,
          updatedAt: new Date().toISOString(),
        }))
      : [];
    await writeRelationships([...peers, updated]);
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
  try {
    const rows: RelationshipHistoryLog[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('parent_link_events').select('id,student_id,parent_id,action,created_at')
        .order('created_at', { ascending: false }).range(offset, offset + 499);
      if (error) throw new Error(error.message);
      if (!Array.isArray(data)) throw new Error('Historique Neon invalide.');
      for (const row of data) rows.push({
        id: row.id,
        studentId: row.student_id,
        studentName: `Élève (${row.student_id.slice(0, 8)})`,
        parentId: row.parent_id,
        parentName: `Responsable (${row.parent_id.slice(0, 8)})`,
        action: row.action,
        date: new Date(row.created_at).toLocaleString('fr-FR'),
        author: 'Utilisateur connecté',
      });
      if (data.length < 500) break;
    }
    return createSuccess(rows);
  } catch (error) {
    return createError(error, 'Erreur lors de la lecture de l’historique des liens.');
  }
}
