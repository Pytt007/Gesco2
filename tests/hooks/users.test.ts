import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../../src/hooks/users/usePermissions';
import {
  createAccount,
  deleteAccount,
  updateAccountRole,
  updateAccountStatus,
  isLastActiveAdmin,
  clearUserAccountsStore,
} from '../../src/services/auth/authService';

describe('Users & Roles Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearUserAccountsStore();
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

  describe('Protection du Dernier Administrateur Actif (P2-09)', () => {
    it('interdit la suppression du dernier administrateur actif', async () => {
      await createAccount('admin1', 'Secret123!', 'ADMIN_GENERALE', 'Super Admin 1');
      const { fetchUserAccounts } = await import('../../src/services/auth/authService');
      const accounts = await fetchUserAccounts();
      const admin1 = accounts.find((u) => u.username === 'admin1')!;

      expect(await isLastActiveAdmin(admin1.id)).toBe(true);

      const delRes = await deleteAccount(admin1.id);
      expect(delRes.error).toContain('Impossible de supprimer le dernier compte administrateur actif');
    });

    it('interdit la rétrogradation du rôle du dernier administrateur actif', async () => {
      await createAccount('admin_solo', 'Secret123!', 'ADMIN_GENERALE', 'Solo Admin');
      const { fetchUserAccounts } = await import('../../src/services/auth/authService');
      const accounts = await fetchUserAccounts();
      const solo = accounts.find((u) => u.username === 'admin_solo')!;

      const roleRes = await updateAccountRole(solo.id, 'COMPTABLE');
      expect(roleRes.error).toContain('Impossible de rétrograder le dernier administrateur actif');
    });

    it('interdit la désactivation du dernier administrateur actif', async () => {
      await createAccount('admin_unique', 'Secret123!', 'ADMIN_GENERALE', 'Unique Admin');
      const { fetchUserAccounts } = await import('../../src/services/auth/authService');
      const accounts = await fetchUserAccounts();
      const unique = accounts.find((u) => u.username === 'admin_unique')!;

      const statusRes = await updateAccountStatus(unique.id, 'INACTIF');
      expect(statusRes.error).toContain('Impossible de désactiver ou archiver le dernier administrateur actif');
    });

    it('autorise la suppression ou la rétrogradation lorsqu’un autre administrateur actif est présent', async () => {
      await createAccount('admin_a', 'Secret123!', 'ADMIN_GENERALE', 'Admin A');
      await createAccount('admin_b', 'Secret123!', 'ADMIN_GENERALE', 'Admin B');
      const { fetchUserAccounts } = await import('../../src/services/auth/authService');
      const accounts = await fetchUserAccounts();
      const adminA = accounts.find((u) => u.username === 'admin_a')!;
      const adminB = accounts.find((u) => u.username === 'admin_b')!;

      expect(await isLastActiveAdmin(adminA.id)).toBe(false);

      // Rétrograder Admin A -> succès car Admin B est toujours actif
      const roleRes = await updateAccountRole(adminA.id, 'COMPTABLE');
      expect(roleRes.error).toBeUndefined();

      // Maintenant Admin B est le seul admin actif restant
      expect(await isLastActiveAdmin(adminB.id)).toBe(true);

      // La suppression d'Admin B doit maintenant être bloquée
      const delBRes = await deleteAccount(adminB.id);
      expect(delBRes.error).toContain('Impossible de supprimer le dernier compte administrateur actif');
    });
  });
});
