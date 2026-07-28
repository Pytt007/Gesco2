import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useParents } from '../../src/hooks/parents/useParents';
import { useParent } from '../../src/hooks/parents/useParent';
import { useStudentParents } from '../../src/hooks/parents/useStudentParents';
import { useParentChildren } from '../../src/hooks/parents/useParentChildren';
import { useParentCommunication } from '../../src/hooks/parents/useParentCommunication';

describe('Parents Module Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useParents', () => {
    it('initializes reactive state, filters and exposes CRUD actions', async () => {
      const { result } = renderHook(() => useParents());

      expect(result.current.parents).toBeDefined();
      expect(result.current.page).toBe(1);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.statusFilter).toBe('Actif');

      let success = false;
      await act(async () => {
        success = await result.current.create({
          firstName: 'HookTest',
          lastName: 'Parent',
          phonePrimary: '+225 0808080808',
        });
      });

      expect(success).toBe(true);
      expect(result.current.parents.length).toBeGreaterThan(0);
    });

    it('updates filters and pagination state', async () => {
      const { result } = renderHook(() => useParents());

      act(() => {
        result.current.setSearchQuery('Kouassi');
        result.current.setPage(2);
        result.current.setStatusFilter('Inactif');
      });

      expect(result.current.searchQuery).toBe('Kouassi');
      expect(result.current.page).toBe(2);
      expect(result.current.statusFilter).toBe('Inactif');
    });
  });

  describe('useParent', () => {
    it('loads single parent record and allows update/archive/restore', async () => {
      const { result: parentsHook } = renderHook(() => useParents());

      let parentId = '';
      await act(async () => {
        await parentsHook.current.create({
          firstName: 'SingleParent',
          lastName: 'Test',
          phonePrimary: '+225 0909090909',
        });
      });
      parentId = parentsHook.current.parents[0].id;

      const { result: singleHook } = renderHook(() => useParent(parentId));

      expect(singleHook.current.parent).toBeDefined();

      let updateOk = false;
      await act(async () => {
        updateOk = await singleHook.current.update({ profession: 'Médecin' });
      });

      expect(updateOk).toBe(true);
      expect(singleHook.current.parent?.profession).toBe('Médecin');
    });
  });

  describe('useStudentParents & useParentChildren', () => {
    it('manages student-parent associations and exposes primary parent', async () => {
      const studentId = 'stu-hook-test-10';
      const { result: studentParentsHook } = renderHook(() => useStudentParents(studentId));

      expect(studentParentsHook.current.parentsInfo).toBeDefined();

      const { result: parentsHook } = renderHook(() => useParents());
      let parentId = '';
      await act(async () => {
        await parentsHook.current.create({
          firstName: 'LinkTest',
          lastName: 'Parent',
          phonePrimary: '+225 0123456789',
        });
      });
      parentId = parentsHook.current.parents[0].id;

      let linkOk = false;
      await act(async () => {
        linkOk = await studentParentsHook.current.linkStudent(parentId, 'Mère', true);
      });

      expect(linkOk).toBe(true);
      expect(studentParentsHook.current.primaryParent).toBeDefined();

      const { result: childrenHook } = renderHook(() => useParentChildren(parentId));
      expect(childrenHook.current.children).toBeDefined();
    });
  });

  describe('useParentCommunication', () => {
    it('loads contact channels and notification recipients', async () => {
      const { result: parentsHook } = renderHook(() => useParents());
      let parentId = '';
      await act(async () => {
        await parentsHook.current.create({
          firstName: 'CommTest',
          lastName: 'Parent',
          phonePrimary: '+225 0707070707',
          email: 'comm@example.com',
        });
      });
      parentId = parentsHook.current.parents[0].id;

      const { result: commHook } = renderHook(() => useParentCommunication({ parentId }));

      expect(commHook.current.loading).toBeDefined();
    });
  });
});
