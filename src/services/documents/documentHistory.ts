import { GeneratedDocument } from './types';
import { supabase } from '../common/supabaseClient';

// Stockage mémoire local de secours en cas d'absence de Supabase ou environnement de test
const memoryHistoryStore: GeneratedDocument[] = [];

/**
 * Service d'Historisation et de Traçabilité des Documents Générés (Document History)
 */
export const documentHistoryService = {
  /**
   * Enregistre un document généré dans l'historique (Supabase ou Fallback local)
   */
  async logGeneration(entry: Omit<GeneratedDocument, 'id' | 'generatedAt'>): Promise<GeneratedDocument> {
    const id = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const generatedAt = new Date().toISOString();

    const record: GeneratedDocument = {
      id,
      ...entry,
      generatedAt,
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('generated_documents')
          .insert({
            id: record.id,
            template_id: record.templateId,
            document_type: record.documentType,
            entity_type: record.entityType,
            entity_id: record.entityId,
            generated_by: record.generatedBy,
            generated_at: record.generatedAt,
            pdf_url: record.pdfUrl || null,
            checksum: record.checksum,
          })
          .select()
          .single();

        if (!error && data) {
          memoryHistoryStore.unshift(record);
          return record;
        }
      }
    } catch {
      // Fallback mémoire
    }

    memoryHistoryStore.unshift(record);
    return record;
  },

  /**
   * Récupère l'historique des documents générés avec filtres optionnels
   */
  async getHistory(filters?: {
    entityType?: string;
    entityId?: string;
    documentType?: string;
  }): Promise<GeneratedDocument[]> {
    try {
      if (supabase) {
        let query = supabase.from('generated_documents').select('*').order('generated_at', { ascending: false });

        if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
        if (filters?.entityId) query = query.eq('entity_id', filters.entityId);
        if (filters?.documentType) query = query.eq('document_type', filters.documentType);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            templateId: d.template_id,
            documentType: d.document_type,
            entityType: d.entity_type,
            entityId: d.entity_id,
            generatedBy: d.generated_by,
            generatedAt: d.generated_at,
            pdfUrl: d.pdf_url,
            checksum: d.checksum,
          }));
        }
      }
    } catch {
      // Fallback mémoire
    }

    let filtered = [...memoryHistoryStore];
    if (filters?.entityType) filtered = filtered.filter((d) => d.entityType === filters.entityType);
    if (filters?.entityId) filtered = filtered.filter((d) => d.entityId === filters.entityId);
    if (filters?.documentType) filtered = filtered.filter((d) => d.documentType === filters.documentType);

    return filtered;
  },

  /**
   * Récupère un document historisé par son ID
   */
  async getById(id: string): Promise<GeneratedDocument | null> {
    const list = await this.getHistory();
    return list.find((d) => d.id === id) || null;
  },

  /**
   * Recherche un document historisé par son empreinte (checksum)
   */
  async getByChecksum(checksum: string): Promise<GeneratedDocument | null> {
    const list = await this.getHistory();
    return list.find((d) => d.checksum === checksum) || null;
  },
};
