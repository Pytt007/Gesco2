import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStudents } from '../../src/hooks/students/useStudents';
import { useMedicalRecord } from '../../src/hooks/students/useMedicalRecord';
import { useStudentDocuments } from '../../src/hooks/students/useStudentDocuments';

describe('Students Module Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useStudents', () => {
    it('initializes with default filters and exposes reactive state', async () => {
      const { result } = renderHook(() => useStudents());
      expect(result.current.students).toBeDefined();
      expect(result.current.page).toBe(1);
    });
  });

  describe('useMedicalRecord & useStudentDocuments', () => {
    it('loads medical record state for a student', async () => {
      const { result } = renderHook(() => useMedicalRecord('stu-100'));
      expect(result.current.loading).toBeDefined();
    });

    it('loads student documents state', async () => {
      const { result } = renderHook(() => useStudentDocuments('stu-100'));
      expect(result.current.documents).toBeDefined();
    });
  });
});
