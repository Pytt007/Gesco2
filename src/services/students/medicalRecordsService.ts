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

    if (error) throw new Error(error.message);
    if (data) {
      const details = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : {};
      const record: MedicalRecordData = {
        ...details,
        id: data.id,
        studentId: data.student_id,
        bloodType: data.blood_type || details.bloodType,
        allergies: data.allergies || details.allergies,
        knownDiseases: data.chronic_conditions || details.knownDiseases,
        treatments: data.medications || details.treatments,
        emergencyPhone: data.emergency_contact || details.emergencyPhone || '',
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

    const { data, error } = await supabase.from('medical_records').insert({
      id: createdRecord.id,
      student_id: createdRecord.studentId,
      blood_type: createdRecord.bloodType || null,
      allergies: createdRecord.allergies || null,
      chronic_conditions: createdRecord.knownDiseases || null,
      medications: createdRecord.treatments || null,
      emergency_contact: createdRecord.emergencyPhone,
      data: createdRecord,
    }).select('id').single();
    if (error || data?.id !== createdRecord.id) throw new Error(error?.message || 'Enregistrement médical non confirmé par Neon.');

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

    const { data: existing, error: readError } = await supabase
      .from('medical_records')
      .select('*').eq('id', id).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) return createError(null, 'Dossier médical introuvable.');
    const current = (await getMedicalRecord(existing.student_id));
    if (!current.success || !current.data) throw new Error(current.error || 'Lecture du dossier médical impossible.');
    const merged: MedicalRecordData = { ...current.data, ...updates, id, studentId: existing.student_id };
    const { data, error } = await supabase.from('medical_records').update({
      blood_type: merged.bloodType || null,
      allergies: merged.allergies || null,
      chronic_conditions: merged.knownDiseases || null,
      medications: merged.treatments || null,
      emergency_contact: merged.emergencyPhone,
      data: merged,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id').single();
    if (error || data?.id !== id) throw new Error(error?.message || 'Mise à jour médicale non confirmée par Neon.');
    localMedicalRecordsCache.set(merged.studentId, merged);

    return createSuccess(true, 'Dossier médical mis à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour du dossier médical.');
  }
}
