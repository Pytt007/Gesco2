// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Documents Élèves (src/services/students/studentDocumentsService.ts)
// Métadonnées des documents élèves conservées dans Neon.
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
    if (!doc.studentId || !doc.docName?.trim() || !doc.docType || !doc.storagePath?.trim()) {
      return createError(null, 'Informations de document incomplètes.');
    }
    const newId = doc.id || crypto.randomUUID();
    const record = { ...doc, id: newId, createdAt: new Date().toISOString() };
    const { data, error } = await supabase.from('student_documents').insert({
      id: newId, student_id: doc.studentId, document_type: doc.docType,
      file_name: doc.docName, file_url: doc.storagePath, data: record,
    }).select('id').single();
    if (error || data?.id !== newId) throw new Error(error?.message || 'Enregistrement du document non confirmé par Neon.');
    return createSuccess(record, 'Référence du document enregistrée.');
  } catch (err) {
    return createError(err, 'Erreur lors du téléversement.');
  }
}

/**
 * Liste les documents d'un élève
 */
export async function listDocuments(studentId: string): Promise<ServiceResponse<StudentDocumentData[]>> {
  try {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId);
    if (error) throw new Error(error.message);

    const docs: StudentDocumentData[] = (data || []).filter((row: any) => row.data?.isDeleted !== true).map((row: any) => ({
      ...(row.data || {}),
      id: row.id,
      studentId: row.student_id,
      docName: row.file_name,
      docType: row.document_type,
      storagePath: row.file_url,
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
    if (!documentId) return createError(null, 'Identifiant document requis.');
    const { data: row, error: readError } = await supabase.from('student_documents').select('id,data').eq('id', documentId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) return createError(null, 'Document introuvable.');
    const { data, error } = await supabase.from('student_documents')
      .update({ data: { ...(row.data || {}), isDeleted: true }, updated_at: new Date().toISOString() })
      .eq('id', documentId).select('id').single();
    if (error || data?.id !== documentId) throw new Error(error?.message || 'Suppression du document non confirmée par Neon.');
    return createSuccess(true, 'Référence du document archivée.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}
