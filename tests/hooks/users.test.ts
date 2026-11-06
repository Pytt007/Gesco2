import '../helpers/databaseSetup';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { database, request } from '../helpers/postgres';
import { usePermissions } from '../../src/hooks/users/usePermissions';
import { createAccount, deleteAccount, updateAccountRole, updateAccountStatus, isLastActiveAdmin } from '../../src/services/auth/authService';

describe('Users and server-enforced roles',()=>{
  it('exposes the documented permissions',()=>{
    const {result}=renderHook(()=>usePermissions('ADMIN_GENERALE'));
    expect(result.current.allPermissions).toHaveLength(14);
    expect(result.current.checkPermission('DASHBOARD')).toBe(true);
    expect(result.current.checkPermission('SETTINGS','FINANCE')).toBe(false);
    expect(result.current.checkPermission('SCOLARITY','FINANCE')).toBe(true);
  });
  it('rejects short passwords before creating an identity',async()=>{
    expect((await createAccount('admin','Secret123!','ADMIN_GENERALE','Test')).error).toContain('12 caractères');
  });
  it.each(['delete','demote','suspend'])('protects the last active admin: %s',async action=>{
    expect(await isLastActiveAdmin('test-admin')).toBe(true);
    const result = action==='delete'?await deleteAccount('test-admin'):action==='demote'?await updateAccountRole('test-admin','FINANCE'):await updateAccountStatus('test-admin','SUSPENDU');
    expect(result.error).toContain('dernier administrateur');
  });
  it('enforces the same rule when a caller bypasses the service',async()=>{
    const result=await request("UPDATE profiles SET role='FINANCE' WHERE id='test-admin'");
    expect(result.error?.message).toContain('dernier administrateur');
  });
  it('permits demotion when another active administrator exists',async()=>{
    const db=await database();
    await db.exec(`INSERT INTO neon_auth."user" VALUES ('second-admin'); INSERT INTO profiles(id,username,full_name,role) VALUES ('second-admin','second-admin','Second','ADMIN_GENERALE');`);
    expect(await isLastActiveAdmin('second-admin')).toBe(false);
    expect((await updateAccountRole('second-admin','FINANCE')).error).toBeUndefined();
    expect(await isLastActiveAdmin('test-admin')).toBe(true);
    expect((await deleteAccount('test-admin')).error).toContain('dernier administrateur');
  });
});
