import { useState, useEffect, useCallback } from 'react';
import {
  TemplateBlock,
  BlockCode,
  BlockConfiguration,
  ValidationResult,
  templateBuilder,
} from '../../services/documents/builder';
import { DocumentType } from '../../services/documents';

/**
 * Hook React pour l'édition dynamique de modèles dans le Template Builder
 */
export function useTemplateBuilder(templateId?: string, documentType: DocumentType = 'BULLETIN') {
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const loadedBlocks = await templateBuilder.getTemplateBlocks(templateId);
      setBlocks(loadedBlocks);

      const valResult = await templateBuilder.validateTemplate(templateId, documentType);
      setValidation(valResult);

      const preview = await templateBuilder.buildPreview(templateId);
      setHtmlPreview(preview);
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [templateId, documentType]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const addBlock = useCallback(
    async (blockCode: BlockCode, displayOrder?: number, customConfig?: BlockConfiguration) => {
      if (!templateId) return null;
      const newBlock = await templateBuilder.addBlock(templateId, blockCode, displayOrder, customConfig);
      await loadTemplate();
      return newBlock;
    },
    [templateId, loadTemplate]
  );

  const removeBlock = useCallback(
    async (blockId: string) => {
      if (!templateId) return false;
      const ok = await templateBuilder.removeBlock(templateId, blockId);
      if (ok) await loadTemplate();
      return ok;
    },
    [templateId, loadTemplate]
  );

  const moveBlock = useCallback(
    async (blockId: string, newOrder: number) => {
      if (!templateId) return;
      await templateBuilder.moveBlock(templateId, blockId, newOrder);
      await loadTemplate();
    },
    [templateId, loadTemplate]
  );

  const duplicateBlock = useCallback(
    async (blockId: string) => {
      if (!templateId) return null;
      const dup = await templateBuilder.duplicateBlock(templateId, blockId);
      await loadTemplate();
      return dup;
    },
    [templateId, loadTemplate]
  );

  const toggleVisibility = useCallback(
    async (blockId: string, visible?: boolean) => {
      if (!templateId) return;
      await templateBuilder.toggleBlockVisibility(templateId, blockId, visible);
      await loadTemplate();
    },
    [templateId, loadTemplate]
  );

  const configureBlock = useCallback(
    async (blockId: string, config: Partial<BlockConfiguration>) => {
      if (!templateId) return;
      await templateBuilder.configureBlock(templateId, blockId, config);
      await loadTemplate();
    },
    [templateId, loadTemplate]
  );

  const refreshPreview = useCallback(
    async (sampleData: Record<string, any> = {}) => {
      if (!templateId) return;
      const preview = await templateBuilder.buildPreview(templateId, sampleData);
      setHtmlPreview(preview);
    },
    [templateId]
  );

  return {
    blocks,
    loading,
    htmlPreview,
    validation,
    activeBlockId,
    setActiveBlockId,
    addBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    toggleVisibility,
    configureBlock,
    refreshPreview,
    refreshTemplate: loadTemplate,
  };
}
