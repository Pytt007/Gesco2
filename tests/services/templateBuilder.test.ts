import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  blockService,
  templateValidator,
  layoutEngine,
  previewEngine,
  templateBuilder,
  BlockCode,
} from '../../src/services/documents/builder';
import { useDocumentBlocks, useTemplateBuilder } from '../../src/hooks/documents';

describe('Template Builder Module Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Block Service & Catalog (blockService)', () => {
    it('provides all 22 default blocks in the catalog', async () => {
      const blocks = await blockService.getBlocks();
      expect(blocks.length).toBe(22);

      const requiredCodes: BlockCode[] = [
        'LOGO',
        'HEADER',
        'SCHOOL_INFORMATION',
        'STUDENT_INFORMATION',
        'PARENT_INFORMATION',
        'CLASS_INFORMATION',
        'ASSESSMENT_INFORMATION',
        'RESULTS_TABLE',
        'AVERAGE',
        'RANK',
        'MENTION',
        'APPRECIATION',
        'DECISION',
        'SIGNATURES',
        'DIRECTOR_SIGNATURE',
        'TEACHER_SIGNATURE',
        'STAMP',
        'QR_CODE',
        'FOOTER',
        'CUSTOM_TEXT',
        'CUSTOM_TABLE',
        'CUSTOM_IMAGE',
      ];

      requiredCodes.forEach((code) => {
        const found = blockService.getBlockByCode(code);
        expect(found).toBeDefined();
        expect(found?.code).toBe(code);
      });
    });

    it('filters blocks by category and retrieves mandatory blocks', () => {
      const headerBlocks = blockService.getBlocksByCategory('HEADER');
      expect(headerBlocks.length).toBeGreaterThan(0);
      expect(headerBlocks.every((b) => b.category === 'HEADER')).toBe(true);

      const mandatory = blockService.getMandatoryBlocks();
      expect(mandatory.length).toBeGreaterThan(0);
      expect(mandatory.some((b) => b.code === 'HEADER')).toBe(true);

      const byId = blockService.getBlockById('blk-logo');
      expect(byId?.code).toBe('LOGO');
    });
  });

  describe('Template Validator (templateValidator)', () => {
    it('validates a correct template without errors', async () => {
      const validBlocks = await templateBuilder.getTemplateBlocks('tmpl-valid-test');
      const result = templateValidator.validateTemplate(validBlocks, 'BULLETIN');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing mandatory blocks for a given document type', () => {
      const incompleteBlocks = [
        templateBuilder.createInMemoryBlock('t-1', 'HEADER', 10),
        templateBuilder.createInMemoryBlock('t-1', 'FOOTER', 20),
      ];

      const result = templateValidator.validateTemplate(incompleteBlocks, 'BULLETIN');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === 'MISSING_MANDATORY' && e.blockCode === 'RESULTS_TABLE')).toBe(true);
    });

    it('detects prohibited duplicates of single-instance blocks', () => {
      const duplicateBlocks = [
        templateBuilder.createInMemoryBlock('t-2', 'HEADER', 10),
        templateBuilder.createInMemoryBlock('t-2', 'HEADER', 15),
        templateBuilder.createInMemoryBlock('t-2', 'SCHOOL_INFORMATION', 20),
        templateBuilder.createInMemoryBlock('t-2', 'STUDENT_INFORMATION', 30),
        templateBuilder.createInMemoryBlock('t-2', 'RESULTS_TABLE', 40),
        templateBuilder.createInMemoryBlock('t-2', 'SIGNATURES', 50),
        templateBuilder.createInMemoryBlock('t-2', 'FOOTER', 60),
      ];

      const result = templateValidator.validateTemplate(duplicateBlocks, 'BULLETIN');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === 'DUPLICATE' && e.blockCode === 'HEADER')).toBe(true);
    });

    it('detects inconsistent order (e.g. FOOTER before HEADER)', () => {
      const badOrderBlocks = [
        templateBuilder.createInMemoryBlock('t-3', 'FOOTER', 5),
        templateBuilder.createInMemoryBlock('t-3', 'HEADER', 10),
        templateBuilder.createInMemoryBlock('t-3', 'SCHOOL_INFORMATION', 20),
        templateBuilder.createInMemoryBlock('t-3', 'STUDENT_INFORMATION', 30),
        templateBuilder.createInMemoryBlock('t-3', 'RESULTS_TABLE', 40),
        templateBuilder.createInMemoryBlock('t-3', 'SIGNATURES', 50),
      ];

      const result = templateValidator.validateTemplate(badOrderBlocks, 'BULLETIN');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === 'INCONSISTENT_ORDER')).toBe(true);
    });

    it('detects invalid configuration values (e.g. negative font size or width)', () => {
      const invalidCfgBlock = templateBuilder.createInMemoryBlock('t-4', 'HEADER', 10, { fontSize: '-10px', width: '-50px' });
      const blocks = [
        invalidCfgBlock,
        templateBuilder.createInMemoryBlock('t-4', 'SCHOOL_INFORMATION', 20),
        templateBuilder.createInMemoryBlock('t-4', 'STUDENT_INFORMATION', 30),
        templateBuilder.createInMemoryBlock('t-4', 'RESULTS_TABLE', 40),
        templateBuilder.createInMemoryBlock('t-4', 'SIGNATURES', 50),
        templateBuilder.createInMemoryBlock('t-4', 'FOOTER', 60),
      ];

      const result = templateValidator.validateTemplate(blocks, 'BULLETIN');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === 'INVALID_CONFIGURATION')).toBe(true);
    });
  });

  describe('Layout Engine (layoutEngine)', () => {
    it('generates CSS inline styles from block configuration', () => {
      const block = templateBuilder.createInMemoryBlock('t-layout', 'HEADER', 10, {
        fontSize: '20px',
        color: '#ff0000',
        width: '100%',
        alignment: 'center',
        padding: '10px',
      });

      const css = layoutEngine.generateBlockStyles(block);
      expect(css).toContain('font-size: 20px;');
      expect(css).toContain('color: #ff0000;');
      expect(css).toContain('width: 100%;');
      expect(css).toContain('text-align: center;');
    });

    it('evaluates showCondition for conditional display', () => {
      const blockWithCondition = templateBuilder.createInMemoryBlock('t-cond', 'AVERAGE', 10, {
        showCondition: 'average >= 10',
      });

      expect(layoutEngine.shouldDisplayBlock(blockWithCondition, { average: 15 })).toBe(true);
      expect(layoutEngine.shouldDisplayBlock(blockWithCondition, { average: 8 })).toBe(false);
    });
  });

  describe('Preview Engine (previewEngine)', () => {
    it('renders content for various block types and assembles full HTML', () => {
      const blocks = [
        templateBuilder.createInMemoryBlock('t-prev', 'LOGO', 5),
        templateBuilder.createInMemoryBlock('t-prev', 'HEADER', 10),
        templateBuilder.createInMemoryBlock('t-prev', 'SCHOOL_INFORMATION', 20),
        templateBuilder.createInMemoryBlock('t-prev', 'STUDENT_INFORMATION', 30),
        templateBuilder.createInMemoryBlock('t-prev', 'PARENT_INFORMATION', 35),
        templateBuilder.createInMemoryBlock('t-prev', 'RESULTS_TABLE', 40),
        templateBuilder.createInMemoryBlock('t-prev', 'AVERAGE', 45),
        templateBuilder.createInMemoryBlock('t-prev', 'RANK', 46),
        templateBuilder.createInMemoryBlock('t-prev', 'MENTION', 47),
        templateBuilder.createInMemoryBlock('t-prev', 'APPRECIATION', 48),
        templateBuilder.createInMemoryBlock('t-prev', 'DECISION', 49),
        templateBuilder.createInMemoryBlock('t-prev', 'SIGNATURES', 50),
        templateBuilder.createInMemoryBlock('t-prev', 'STAMP', 55),
        templateBuilder.createInMemoryBlock('t-prev', 'QR_CODE', 60),
        templateBuilder.createInMemoryBlock('t-prev', 'FOOTER', 70),
        templateBuilder.createInMemoryBlock('t-prev', 'CUSTOM_TEXT', 80, { customText: 'Note particulière' }),
        templateBuilder.createInMemoryBlock('t-prev', 'CUSTOM_TABLE', 85),
        templateBuilder.createInMemoryBlock('t-prev', 'CUSTOM_IMAGE', 90),
      ];

      const html = previewEngine.buildHtmlPreview(blocks, {
        studentName: 'YAPO Marc',
        average: 17,
        rank: '1er',
        decision: 'ADMIS',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('YAPO Marc');
      expect(html).toContain('17');
      expect(html).toContain('ADMIS');
      expect(html).toContain('Note particulière');
    });
  });

  describe('Template Builder Engine Core (templateBuilder)', () => {
    it('performs CRUD operations: add, move, duplicate, toggle, configure, remove', async () => {
      const tmplId = 'tmpl-crud-test';

      // 1. Get initial blocks
      const initial = await templateBuilder.getTemplateBlocks(tmplId);
      expect(initial.length).toBe(7);

      // 2. Add block
      const added = await templateBuilder.addBlock(tmplId, 'CUSTOM_TEXT', 25, { customText: 'Texte test' });
      expect(added.blockCode).toBe('CUSTOM_TEXT');

      const afterAdd = await templateBuilder.getTemplateBlocks(tmplId);
      expect(afterAdd.length).toBe(8);

      // 3. Move block
      const moved = await templateBuilder.moveBlock(tmplId, added.id, 1);
      expect(moved[0].id).toBe(added.id);

      // 4. Duplicate block
      const duplicated = await templateBuilder.duplicateBlock(tmplId, added.id);
      expect(duplicated.id).not.toBe(added.id);

      // 5. Toggle visibility
      const toggled = await templateBuilder.toggleBlockVisibility(tmplId, added.id, false);
      expect(toggled.visible).toBe(false);

      // 6. Configure block
      const reconfigured = await templateBuilder.configureBlock(tmplId, added.id, { fontSize: '18px' });
      expect(reconfigured.configuration.fontSize).toBe('18px');

      // 7. Remove block
      const removeSuccess = await templateBuilder.removeBlock(tmplId, added.id);
      expect(removeSuccess).toBe(true);

      const afterRemove = await templateBuilder.getTemplateBlocks(tmplId);
      expect(afterRemove.some((b) => b.id === added.id)).toBe(false);
    });

    it('validates template and builds dynamic HTML preview', async () => {
      const tmplId = 'tmpl-prev-test';
      const valResult = await templateBuilder.validateTemplate(tmplId, 'BULLETIN');
      expect(valResult.isValid).toBe(true);

      const html = await templateBuilder.buildPreview(tmplId, { studentName: 'EKOUE Paul' });
      expect(html).toContain('EKOUE Paul');
    });
  });

  describe('Template Builder React Hooks Layer', () => {
    it('useDocumentBlocks loads catalog and handles category filter', async () => {
      const { result } = renderHook(() => useDocumentBlocks('HEADER'));
      await vi.waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.blocks.length).toBeGreaterThan(0);
      expect(result.current.blocks.every((b) => b.category === 'HEADER')).toBe(true);
    });

    it('useTemplateBuilder manages template editing actions reactively', async () => {
      const { result } = renderHook(() => useTemplateBuilder('tmpl-hook-test', 'BULLETIN'));
      await vi.waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.blocks.length).toBeGreaterThan(0);
      expect(result.current.htmlPreview).toContain('<!DOCTYPE html>');
      expect(result.current.validation.isValid).toBe(true);

      // Add a block reactively
      let addedBlock: any = null;
      await act(async () => {
        addedBlock = await result.current.addBlock('CUSTOM_TEXT', 15, { customText: 'Hook Test' });
      });

      expect(result.current.blocks.some((b) => b.blockCode === 'CUSTOM_TEXT')).toBe(true);

      // Move block
      await act(async () => {
        await result.current.moveBlock(addedBlock.id, 1);
      });

      // Duplicate block
      await act(async () => {
        await result.current.duplicateBlock(addedBlock.id);
      });

      // Toggle visibility
      await act(async () => {
        await result.current.toggleVisibility(addedBlock.id, false);
      });

      // Configure block
      await act(async () => {
        await result.current.configureBlock(addedBlock.id, { fontSize: '20px' });
      });

      // Set active block
      act(() => {
        result.current.setActiveBlockId(addedBlock.id);
      });
      expect(result.current.activeBlockId).toBe(addedBlock.id);

      // Refresh preview
      await act(async () => {
        await result.current.refreshPreview({ studentName: 'Hook Preview' });
      });
      expect(result.current.htmlPreview).toContain('Hook Preview');

      // Remove block
      await act(async () => {
        await result.current.removeBlock(addedBlock.id);
      });
    });
  });
});
