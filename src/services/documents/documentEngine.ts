import {
  DocumentGenerationOptions,
  CompiledDocument,
  PDFRenderResult,
  DocumentTemplate,
  TemplateSection,
  GeneratedDocument,
} from './types';
import { templateEngine } from './templateEngine';
import { pdfRenderer } from './pdfRenderer';
import { documentHistoryService } from './documentHistory';
import { supabase } from '../common/supabaseClient';

// Stockage mémoire local des modèles pour personnalisation et versionning sans Supabase
const templatesStore: DocumentTemplate[] = [...templateEngine.getDefaultTemplates()];
const sectionsStore: Record<string, TemplateSection[]> = {};

function validateGenerationOptions(options: DocumentGenerationOptions): void {
  if (!options) {
    throw new Error('Options de génération manquantes.');
  }
  if (!options.documentType) {
    throw new Error('Le type de document est obligatoire.');
  }
  if (!options.entityId) {
    throw new Error("L'identifiant de l'entité cible est obligatoire.");
  }
  if (!options.entityType) {
    throw new Error("Le type d'entité cible est obligatoire.");
  }
  if (!options.data || typeof options.data !== 'object') {
    throw new Error('Les données du document sont obligatoires.');
  }
}

/**
 * GESCO Document Engine
 * Orchestrateur central de génération, versionning, rendu PDF, QR Code et historisation des documents.
 */
export const documentEngine = {
  /**
   * Génère un document complet (Compilation + Rendu PDF + Historisation dans Database)
   */
  async generateDocument(options: DocumentGenerationOptions): Promise<{
    compiled: CompiledDocument;
    pdfResult: PDFRenderResult;
    historyRecord: GeneratedDocument;
  }> {
    validateGenerationOptions(options);

    // 1. Charger le modèle et les sections
    const template = await this.getTemplateById(options.templateId || '');
    const sections = template ? await this.getTemplateSections(template.id) : undefined;

    // 2. Compiler le document (Template Engine + QR Code)
    const compiled = templateEngine.compileDocument(options, template || undefined, sections);

    // 3. Rendu PDF (PDF Renderer)
    const pdfResult = await pdfRenderer.renderToPDF(compiled);

    // 4. Historiser dans la base de données (Document History)
    const historyRecord = await documentHistoryService.logGeneration({
      templateId: template ? template.id : 'tmpl-default',
      documentType: options.documentType,
      entityType: options.entityType,
      entityId: options.entityId,
      generatedBy: options.generatedBy,
      pdfUrl: pdfResult.dataUrl.substring(0, 100) + '...',
      checksum: compiled.checksum,
    });

    return {
      compiled,
      pdfResult,
      historyRecord,
    };
  },

  /**
   * Génère un aperçu en direct d'un document (Compilation sans historisation)
   */
  async previewDocument(options: DocumentGenerationOptions): Promise<CompiledDocument> {
    validateGenerationOptions(options);
    const template = await this.getTemplateById(options.templateId || '');
    const sections = template ? await this.getTemplateSections(template.id) : undefined;
    return templateEngine.compileDocument(options, template || undefined, sections);
  },

  /**
   * Génère et télécharge directement le document au format PDF / HTML
   */
  async downloadPDF(options: DocumentGenerationOptions, fileName?: string): Promise<void> {
    validateGenerationOptions(options);
    const { compiled } = await this.generateDocument(options);
    pdfRenderer.downloadDocument(compiled, fileName);
  },

  /**
   * Génère et ouvre la boîte de dialogue d'impression du navigateur
   */
  async print(options: DocumentGenerationOptions): Promise<void> {
    validateGenerationOptions(options);
    const { compiled } = await this.generateDocument(options);
    pdfRenderer.printHtml(compiled.fullHtml);
  },

  /**
   * Duplique un modèle existant pour création d'une version personnalisée sans supprimer l'ancien
   */
  async duplicateTemplate(templateId: string, newCode: string, newName: string): Promise<DocumentTemplate> {
    const existing = await this.getTemplateById(templateId);
    if (!existing) {
      throw new Error(`Modèle introuvable : ${templateId}`);
    }

    const newTemplate: DocumentTemplate = {
      ...existing,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: newCode,
      name: newName,
      version: 1, // Nouvelle ligne personnalisée commence à V1
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Dupliquer les sections
    const existingSections = await this.getTemplateSections(existing.id);
    const newSections = existingSections.map((s) => ({
      ...s,
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      templateId: newTemplate.id,
    }));

    templatesStore.push(newTemplate);
    sectionsStore[newTemplate.id] = newSections;

    return newTemplate;
  },

  /**
   * Versionne un modèle existant (Incrémente le numéro de version)
   */
  async createTemplateVersion(templateId: string, changes: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const existing = await this.getTemplateById(templateId);
    if (!existing) {
      throw new Error(`Modèle introuvable : ${templateId}`);
    }

    const updatedTemplate: DocumentTemplate = {
      ...existing,
      ...changes,
      version: existing.version + 1, // Incrément de version
      updatedAt: new Date().toISOString(),
    };

    const idx = templatesStore.findIndex((t) => t.id === templateId);
    if (idx !== -1) {
      templatesStore[idx] = updatedTemplate;
    }

    return updatedTemplate;
  },

  /**
   * Archive / Désactive un modèle de document sans le supprimer définitivement
   */
  async archiveTemplate(templateId: string): Promise<boolean> {
    const template = await this.getTemplateById(templateId);
    if (!template) return false;

    template.isActive = false;
    template.updatedAt = new Date().toISOString();
    return true;
  },

  /**
   * Récupère la liste de tous les modèles disponibles
   */
  async getTemplates(): Promise<DocumentTemplate[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('document_templates').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            category: d.category,
            description: d.description,
            version: d.version,
            schoolId: d.school_id,
            isDefault: d.is_default,
            isActive: d.is_active,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch {
      // Fallback local
    }
    return [...templatesStore];
  },

  /**
   * Récupère un modèle par son ID
   */
  async getTemplateById(id: string): Promise<DocumentTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id || t.code === id) || null;
  },

  /**
   * Récupère les sections ordonnées associées à un modèle
   */
  async getTemplateSections(templateId: string): Promise<TemplateSection[]> {
    if (sectionsStore[templateId]) {
      return sectionsStore[templateId];
    }
    const tmpl = await this.getTemplateById(templateId);
    const docType: any = tmpl ? (tmpl.category === 'FINANCE' ? 'SCHOOL_RECEIPT' : tmpl.category === 'ACADEMIC' ? 'BULLETIN' : 'CERTIFICATE') : 'BULLETIN';
    return templateEngine.getDefaultSections(templateId, docType);
  },
};
