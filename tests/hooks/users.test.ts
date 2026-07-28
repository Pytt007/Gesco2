import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../../src/hooks/users/usePermissions';

describe('Users & Roles Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePermissions', () => {
    it('returns all system permissions and checks role rights', () => {
      const { result } = renderHook(() => usePermissions('ADMIN_GENERALE'));
      expect(result.current.allPermissions.length).toBe(14);
      expect(result.current.checkPermission('DASHBOARD')).toBe(true);
      expect(result.current.checkPermission('SETTINGS', 'FINANCE')).toBe(false);
      expect(result.current.checkPermission('SCOLARITY', 'FINANCE')).toBe(true);
    });
  });
});
