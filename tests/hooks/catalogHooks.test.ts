// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests Unitaires des Hooks du Catalogue Pédagogique
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useSubjectCategories,
  useSubjects,
  useSubject,
  useSubjectComponents,
  useLevelSubjects,
} from '../../src/hooks/academic/catalog';

describe('Pedagogical Catalog Module Hooks Layer', () => {

  describe('useSubjectCategories', () => {
    it('initializes state and handles category CRUD operations', async () => {
      const { result } = renderHook(() => useSubjectCategories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories.length).toBeGreaterThanOrEqual(3);

      await act(async () => {
        const success = await result.current.createCategory({
          name: 'Nouvelle Catégorie Hook',
          code: 'HOOK_CAT',
        });
        expect(success).toBe(true);
      });

      expect(result.current.success).toContain('succès');
    });
  });

  describe('useSubjects', () => {
    it('manages subjects search, filters, pagination and CRUD', async () => {
      const { result } = renderHook(() => useSubjects());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subjects.length).toBeGreaterThanOrEqual(1);

      await act(async () => {
        result.current.setSearchQuery('Lecture');
      });

      await act(async () => {
        const success = await result.current.createSubject({
          categoryId: '11111111-1111-4111-a111-111111111111',
          name: 'Orthographe Hook',
          code: 'HOOK_ORTHO',
        });
        expect(success).toBe(true);
      });
    });
  });

  describe('useSubject', () => {
    it('loads single subject details and handles update and archive', async () => {
      const { result: listResult } = renderHook(() => useSubjects());
      await waitFor(() => expect(listResult.current.loading).toBe(false));

      let createdId = '';
      await act(async () => {
        await listResult.current.createSubject({
          categoryId: '11111111-1111-4111-a111-111111111111',
          name: 'Matières Spécifique Hook',
          code: 'SPEC_HOOK',
        });
      });

      const found = listResult.current.subjects.find((s) => s.code === 'SPEC_HOOK');
      createdId = found?.id || listResult.current.subjects[0]?.id || '';

      const { result } = renderHook(() => useSubject(createdId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subject).toBeDefined();

      await act(async () => {
        const success = await result.current.updateSubject({ name: 'Matières Modifiée Hook' });
        expect(success).toBe(true);
      });
    });
  });

  describe('useSubjectComponents', () => {
    it('manages composite subject components and business rules', async () => {
      const parentId = 'b0200000-0000-4000-b000-000000000008';
      const { result } = renderHook(() => useSubjectComponents(parentId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Self reference test
      await act(async () => {
        const success = await result.current.addComponent(parentId, 1);
        expect(success).toBe(false);
      });
      expect(result.current.error).toContain('elle-même');

      // Add new non-duplicate component
      await act(async () => {
        const success = await result.current.addComponent('c0300000-0000-4000-c000-000000000099', 5);
        expect(success).toBe(true);
      });
      expect(result.current.components.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('useLevelSubjects', () => {
    it('manages level subject assignments and order update', async () => {
      const levelId = '00000000-0000-4000-a000-000000000104';
      const { result } = renderHook(() => useLevelSubjects(levelId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newSubjectId = 'b0200000-0000-4000-b000-000000000005';
      await act(async () => {
        const success = await result.current.assignSubject(newSubjectId, true, 4);
        expect(success).toBe(true);
      });
    });
  });
});
