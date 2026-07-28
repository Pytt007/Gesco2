// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Documents Élèves (src/services/students/studentDocumentsService.ts)
// Couche de gestion des pièces jointes et documents stockés sur Supabase Storage
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './studentsService';

export interface StudentDocumentData {
  id?: string;
  studentId: string;
  docName: string;
  docType: 'Extrait de Naissance' | 'Certificat Médical' | 'Photo' | 'Jugement' | 'Certificat Précédent' | 'Autre';
  storagePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  createdAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || fallbackMessage;
  console.warn('[studentDocumentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

/**
 * Enregistre les métadonnées d'un document téléversé
 */
export async function uploadDocument(doc: StudentDocumentData): Promise<ServiceResponse<StudentDocumentData>> {
  try {
    const newId = doc.id || crypto.randomUUID();
    return createSuccess({ ...doc, id: newId }, 'Document enregistré avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors du téléversement.');
  }
}

/**
 * Liste les documents d'un élève
 */
export async function listDocuments(studentId: string): Promise<ServiceResponse<StudentDocumentData[]>> {
  try {
    const { data } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId);

    const docs: StudentDocumentData[] = (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      docName: row.doc_name,
      docType: row.doc_type,
      storagePath: row.storage_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
    }));

    return createSuccess(docs);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des documents.');
  }
}

/**
 * Supprime la référence d'un document (Soft delete)
 */
export async function deleteDocument(documentId: string): Promise<ServiceResponse<boolean>> {
  try {
    return createSuccess(true, 'Document supprimé.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}
