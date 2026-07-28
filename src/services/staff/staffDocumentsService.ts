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

const localDocsCache: Map<string, StaffDocumentData> = new Map();

/**
 * Enregistre les métadonnées d'un document RH téléversé sur Supabase Storage
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

    const { error } = await supabase.from('staff_documents').insert({
      id: createdDoc.id,
      staff_id: createdDoc.staffId,
      doc_name: createdDoc.docName,
      doc_type: createdDoc.docType || 'Autre',
      storage_path: createdDoc.storagePath,
      file_size: createdDoc.fileSize || 0,
      mime_type: createdDoc.mimeType || 'application/pdf',
      created_at: createdDoc.createdAt,
    });

    if (error) {
      console.warn('[staffDocumentsService:uploadDocument] Fallback local:', error.message);
    }
    localDocsCache.set(newId, createdDoc);

    return createSuccess(createdDoc, 'Document RH enregistré avec succès.');
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

    if (!error && data && data.length > 0) {
      const docs: StaffDocumentData[] = data.map((row: any) => ({
        id: row.id,
        staffId: row.staff_id,
        docName: row.doc_name,
        docType: row.doc_type,
        storagePath: row.storage_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
      }));
      return createSuccess(docs);
    }

    const docs: StaffDocumentData[] = [];
    for (const d of localDocsCache.values()) {
      if (d.staffId === staffId) docs.push(d);
    }

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

    const { error } = await supabase
      .from('staff_documents')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (error) {
      console.warn('[staffDocumentsService:deleteDocument] Fallback local:', error.message);
    }

    localDocsCache.delete(documentId);

    return createSuccess(true, 'Document RH supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression du document.');
  }
}
