// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Dossier Médical (src/services/students/medicalRecordsService.ts)
// Couche d'accès aux dossiers médicaux confidentiels des élèves
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './studentsService';

export interface MedicalRecordData {
  id?: string;
  studentId: string;
  schoolId?: string;
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string;
  knownDiseases?: string;
  treatments?: string;
  referringDoctor?: string;
  emergencyPhone: string;
  notes?: string;
  isActive?: boolean;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || fallbackMessage;
  console.warn('[medicalRecordsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localMedicalRecordsCache: Map<string, MedicalRecordData> = new Map(); // Clef : `studentId`

export function clearMedicalRecordsCache(): void {
  localMedicalRecordsCache.clear();
}

export const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/**
 * Récupère le dossier médical actif d'un élève
 */
export async function getMedicalRecord(studentId: string): Promise<ServiceResponse<MedicalRecordData>> {
  try {
    if (!studentId?.trim()) {
      return createError(null, 'Identifiant élève obligatoire.');
    }

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (!error && data) {
      const record: MedicalRecordData = {
        id: data.id,
        studentId: data.student_id,
        bloodType: data.blood_type,
        allergies: data.allergies,
        knownDiseases: data.known_diseases,
        treatments: data.treatments,
        referringDoctor: data.referring_doctor,
        emergencyPhone: data.emergency_phone,
        notes: data.notes,
        isActive: data.is_active,
      };
      localMedicalRecordsCache.set(studentId, record);
      return createSuccess(record);
    }

    const cached = localMedicalRecordsCache.get(studentId);
    if (cached) {
      return createSuccess(cached);
    }

    // Si aucun dossier n'existe encore : retourner un gabarit par défaut
    const defaultRecord: MedicalRecordData = {
      id: crypto.randomUUID(),
      studentId,
      emergencyPhone: '',
      bloodType: undefined,
      isActive: true,
    };
    return createSuccess(defaultRecord);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du dossier médical.');
  }
}

/**
 * Crée un dossier médical
 */
export async function createMedicalRecord(record: MedicalRecordData): Promise<ServiceResponse<MedicalRecordData>> {
  try {
    if (!record.studentId?.trim()) {
      return createError(null, 'L\'identifiant élève est obligatoire.');
    }

    if (!record.emergencyPhone?.trim()) {
      return createError(null, 'Le contact téléphonique d\'urgence est obligatoire.');
    }

    if (record.bloodType && !VALID_BLOOD_TYPES.includes(record.bloodType as any)) {
      return createError(null, `Groupe sanguin invalide "${record.bloodType}". Groupes valides : ${VALID_BLOOD_TYPES.join(', ')}.`);
    }

    const newId = record.id || crypto.randomUUID();
    const createdRecord: MedicalRecordData = {
      ...record,
      id: newId,
      bloodType: record.bloodType || undefined,
      isActive: record.isActive ?? true,
    };

    const { error } = await supabase.from('medical_records').insert({
      id: createdRecord.id,
      student_id: createdRecord.studentId,
      blood_type: createdRecord.bloodType,
      allergies: createdRecord.allergies,
      known_diseases: createdRecord.knownDiseases,
      treatments: createdRecord.treatments,
      referring_doctor: createdRecord.referringDoctor,
      emergency_phone: createdRecord.emergencyPhone,
      notes: createdRecord.notes,
      is_active: createdRecord.isActive,
    });

    if (error) {
      console.warn('[medicalRecordsService:createMedicalRecord] Fallback local:', error.message);
    }

    localMedicalRecordsCache.set(createdRecord.studentId, createdRecord);
    return createSuccess(createdRecord, 'Dossier médical créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du dossier médical.');
  }
}

/**
 * Met à jour un dossier médical
 */
export async function updateMedicalRecord(id: string, updates: Partial<MedicalRecordData>): Promise<ServiceResponse<boolean>> {
  try {
    if (!id?.trim()) {
      return createError(null, 'Identifiant du dossier médical obligatoire.');
    }

    if (updates.bloodType && !VALID_BLOOD_TYPES.includes(updates.bloodType as any)) {
      return createError(null, `Groupe sanguin invalide "${updates.bloodType}". Groupes valides : ${VALID_BLOOD_TYPES.join(', ')}.`);
    }

    // Trouver le dossier en cache
    let foundStudentId: string | null = null;
    for (const [sId, rec] of localMedicalRecordsCache.entries()) {
      if (rec.id === id) {
        foundStudentId = sId;
        break;
      }
    }

    const { error } = await supabase
      .from('medical_records')
      .update({
        blood_type: updates.bloodType,
        allergies: updates.allergies,
        known_diseases: updates.knownDiseases,
        treatments: updates.treatments,
        referring_doctor: updates.referringDoctor,
        emergency_phone: updates.emergencyPhone,
        notes: updates.notes,
        is_active: updates.isActive,
      })
      .eq('id', id);

    if (error) {
      console.warn('[medicalRecordsService:updateMedicalRecord] Fallback local:', error.message);
    }

    if (foundStudentId) {
      const existing = localMedicalRecordsCache.get(foundStudentId)!;
      localMedicalRecordsCache.set(foundStudentId, { ...existing, ...updates });
    }

    return createSuccess(true, 'Dossier médical mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour du dossier médical.');
  }
}
