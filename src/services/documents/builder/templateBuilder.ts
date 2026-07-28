import { TemplateBlock, BlockCode, BlockConfiguration, ValidationResult } from './types';
import { DocumentType } from '../types';
import { blockService } from './blockService';
import { templateValidator } from './templateValidator';
import { previewEngine } from './previewEngine';
import { supabase } from '../../common/supabaseClient';

// Stockage mémoire local des blocs de modèles par templateId
const templateBlocksStore: Record<string, TemplateBlock[]> = {};

/**
 * Service principal de construction de modèles (Template Builder Engine)
 */
export const templateBuilder = {
  /**
   * Récupère tous les blocs associés à un modèle ordonnés par displayOrder
   */
  async getTemplateBlocks(templateId: string): Promise<TemplateBlock[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('template_blocks')
          .select('*, document_blocks(*)')
          .eq('template_id', templateId)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const loadedBlocks: TemplateBlock[] = data.map((d: any) => ({
            id: d.id,
            templateId: d.template_id,
            blockId: d.block_id,
            blockCode: d.document_blocks?.code || 'CUSTOM_TEXT',
            blockName: d.document_blocks?.name || 'Bloc',
            displayOrder: d.display_order,
            visible: d.visible,
            configuration: d.configuration || {},
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          templateBlocksStore[templateId] = loadedBlocks;
          return loadedBlocks;
        }
      }
    } catch {
      // Fallback local
    }

    if (!templateBlocksStore[templateId]) {
      // Initialiser avec des blocs par défaut
      templateBlocksStore[templateId] = [
        this.createInMemoryBlock(templateId, 'HEADER', 10),
        this.createInMemoryBlock(templateId, 'SCHOOL_INFORMATION', 20),
        this.createInMemoryBlock(templateId, 'STUDENT_INFORMATION', 30),
        this.createInMemoryBlock(templateId, 'RESULTS_TABLE', 40),
        this.createInMemoryBlock(templateId, 'SIGNATURES', 50),
        this.createInMemoryBlock(templateId, 'QR_CODE', 60),
        this.createInMemoryBlock(templateId, 'FOOTER', 70),
      ];
    }

    return [...templateBlocksStore[templateId]].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Définit l'ensemble des blocs d'un modèle (Remplace les anciens)
   */
  async setTemplateBlocks(templateId: string, blocks: TemplateBlock[]): Promise<TemplateBlock[]> {
    const sorted = [...blocks].sort((a, b) => a.displayOrder - b.displayOrder);
    templateBlocksStore[templateId] = sorted;
    return sorted;
  },

  /**
   * Ajoute un bloc au modèle à un ordre donné
   */
  async addBlock(
    templateId: string,
    blockCode: BlockCode,
    displayOrder?: number,
    customConfig?: BlockConfiguration
  ): Promise<TemplateBlock> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const order = displayOrder !== undefined ? displayOrder : (currentBlocks.length + 1) * 10;

    const newBlock = this.createInMemoryBlock(templateId, blockCode, order, customConfig);
    currentBlocks.push(newBlock);

    await this.setTemplateBlocks(templateId, currentBlocks);
    return newBlock;
  },

  /**
   * Supprime un bloc du modèle
   */
  async removeBlock(templateId: string, templateBlockId: string): Promise<boolean> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const initialLength = currentBlocks.length;

    const updated = currentBlocks.filter((b) => b.id !== templateBlockId);
    if (updated.length === initialLength) return false;

    await this.setTemplateBlocks(templateId, updated);
    return true;
  },

  /**
   * Déplace / Réordonne un bloc au sein du modèle
   */
  async moveBlock(templateId: string, templateBlockId: string, newOrder: number): Promise<TemplateBlock[]> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const target = currentBlocks.find((b) => b.id === templateBlockId);
    if (!target) {
      throw new Error(`Bloc de modèle introuvable : ${templateBlockId}`);
    }

    target.displayOrder = newOrder;
    target.updatedAt = new Date().toISOString();

    const sorted = [...currentBlocks].sort((a, b) => a.displayOrder - b.displayOrder);
    await this.setTemplateBlocks(templateId, sorted);
    return sorted;
  },

  /**
   * Duplique un bloc existant
   */
  async duplicateBlock(templateId: string, templateBlockId: string): Promise<TemplateBlock> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const source = currentBlocks.find((b) => b.id === templateBlockId);
    if (!source) {
      throw new Error(`Bloc à dupliquer introuvable : ${templateBlockId}`);
    }

    const duplicated: TemplateBlock = {
      ...source,
      id: `tblk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      displayOrder: source.displayOrder + 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    currentBlocks.push(duplicated);
    await this.setTemplateBlocks(templateId, currentBlocks);
    return duplicated;
  },

  /**
   * Active ou désactive l'affichage d'un bloc
   */
  async toggleBlockVisibility(templateId: string, templateBlockId: string, visible?: boolean): Promise<TemplateBlock> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const target = currentBlocks.find((b) => b.id === templateBlockId);
    if (!target) {
      throw new Error(`Bloc introuvable : ${templateBlockId}`);
    }

    target.visible = visible !== undefined ? visible : !target.visible;
    target.updatedAt = new Date().toISOString();

    await this.setTemplateBlocks(templateId, currentBlocks);
    return target;
  },

  /**
   * Met à jour la configuration d'un bloc
   */
  async configureBlock(
    templateId: string,
    templateBlockId: string,
    newConfig: Partial<BlockConfiguration>
  ): Promise<TemplateBlock> {
    const currentBlocks = await this.getTemplateBlocks(templateId);
    const target = currentBlocks.find((b) => b.id === templateBlockId);
    if (!target) {
      throw new Error(`Bloc introuvable : ${templateBlockId}`);
    }

    target.configuration = {
      ...target.configuration,
      ...newConfig,
    };
    target.updatedAt = new Date().toISOString();

    await this.setTemplateBlocks(templateId, currentBlocks);
    return target;
  },

  /**
   * Valide le modèle de document en fonction des règles métiers (Ordre, Blocs obligatoires, Doublons, Conf)
   */
  async validateTemplate(templateId: string, documentType: DocumentType = 'BULLETIN'): Promise<ValidationResult> {
    const blocks = await this.getTemplateBlocks(templateId);
    return templateValidator.validateTemplate(blocks, documentType);
  },

  /**
   * Génère la prévisualisation HTML dynamique du modèle
   */
  async buildPreview(templateId: string, data: Record<string, any> = {}): Promise<string> {
    const blocks = await this.getTemplateBlocks(templateId);
    return previewEngine.buildHtmlPreview(blocks, data);
  },

  /**
   * Utilitaire interne de création d'instance mémoire de bloc
   */
  createInMemoryBlock(
    templateId: string,
    blockCode: BlockCode,
    order: number,
    customConfig?: BlockConfiguration
  ): TemplateBlock {
    const catalogBlock = blockService.getBlockByCode(blockCode);
    const blockId = catalogBlock ? catalogBlock.id : `blk-${blockCode.toLowerCase()}`;
    const blockName = catalogBlock ? catalogBlock.name : blockCode;
    const defaultConfig = catalogBlock ? catalogBlock.defaultConfiguration : {};

    return {
      id: `tblk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      templateId,
      blockId,
      blockCode,
      blockName,
      displayOrder: order,
      visible: true,
      configuration: { ...defaultConfig, ...customConfig },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};
