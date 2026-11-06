// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Documents Personnel RH (src/services/staff/staffDocumentsService.ts)
// Couche de gestion des documents administratifs RH (Contrats, Diplômes, CNI, CV)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './staffService';

export type StaffDocType = 'Contrat' | 'Diplôme' | 'CNI' | 'CV' | 'Photo' | 'Attestation' | 'Autre';

export interface StaffDocumentData {
  id?: string;
  staffId: string;
  docName: string;
  docType: StaffDocType;
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
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[staffDocumentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

/**
 * Enregistre les métadonnées d'un document RH dans Neon.
 * @param doc Métadonnées du document
 */
export async function uploadDocument(doc: StaffDocumentData): Promise<ServiceResponse<StaffDocumentData>> {
  try {
    if (!doc.staffId || !doc.docName || !doc.storagePath) {
      return createError(null, 'Informations de document incomplètes.');
    }

    const newId = doc.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdDoc: StaffDocumentData = {
      ...doc,
      id: newId,
      createdAt: now,
    };

    const { data, error } = await supabase.from('staff_documents').insert({
      id: createdDoc.id,
      staff_id: createdDoc.staffId,
      document_type: createdDoc.docType || 'Autre',
      file_name: createdDoc.docName,
      file_url: createdDoc.storagePath,
      data: createdDoc,
    }).select('id').single();
    if (error || data?.id !== newId) throw new Error(error?.message || 'Enregistrement du document RH non confirmé par Neon.');

    return createSuccess(createdDoc, 'Référence du document RH enregistrée.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'enregistrement du document.');
  }
}

/**
 * Liste tous les documents administratifs associés à un membre du personnel
 * @param staffId Identifiant de l'employé
 */
export async function listDocuments(staffId: string): Promise<ServiceResponse<StaffDocumentData[]>> {
  try {
    if (!staffId) return createError(null, 'Identifiant employé requis.');

    const { data, error } = await supabase
      .from('staff_documents')
      .select('*')
      .eq('staff_id', staffId)
      .eq('is_deleted', false);

    if (error) throw new Error(error.message);
    const docs: StaffDocumentData[] = (data || []).map((row: any) => ({
        ...(row.data || {}),
        id: row.id,
        staffId: row.staff_id,
        docName: row.file_name,
        docType: row.document_type,
        storagePath: row.file_url,
        createdAt: row.created_at,
      }));
    return createSuccess(docs);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des documents RH.');
  }
}

/**
 * Supprime la référence d'un document RH (Soft Delete)
 * @param documentId Identifiant unique du document
 */
export async function deleteDocument(documentId: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!documentId) return createError(null, 'Identifiant document requis.');

    const { data, error } = await supabase
      .from('staff_documents')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', documentId).select('id').single();
    if (error || data?.id !== documentId) throw new Error(error?.message || 'Archivage du document RH non confirmé par Neon.');

    return createSuccess(true, 'Document RH supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression du document.');
  }
}
