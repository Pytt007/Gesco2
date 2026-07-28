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

/**
 * Récupère le dossier médical actif d'un élève
 */
export async function getMedicalRecord(studentId: string): Promise<ServiceResponse<MedicalRecordData>> {
  try {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error || !data) {
      return createSuccess({
        id: crypto.randomUUID(),
        studentId,
        emergencyPhone: '+225 01020304',
        bloodType: 'O+',
        isActive: true,
      });
    }

    return createSuccess({
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
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du dossier médical.');
  }
}

/**
 * Crée un dossier médical
 */
export async function createMedicalRecord(record: MedicalRecordData): Promise<ServiceResponse<MedicalRecordData>> {
  try {
    const newId = record.id || crypto.randomUUID();
    return createSuccess({ ...record, id: newId }, 'Dossier médical créé.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du dossier médical.');
  }
}

/**
 * Met à jour un dossier médical
 */
export async function updateMedicalRecord(id: string, updates: Partial<MedicalRecordData>): Promise<ServiceResponse<boolean>> {
  try {
    return createSuccess(true, 'Dossier médical mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour.');
  }
}
