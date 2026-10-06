import { beforeEach, describe, expect, it, vi } from 'vitest';

// Production regression contracts for the defects found in the audit.
// All database and auth operations are simulated; production is never touched.
const mock = vi.hoisted(() => ({ from: vi.fn(), signIn: vi.fn(), getSession: vi.fn() }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: { from: mock.from, auth: { signInWithPassword: mock.signIn, getSession: mock.getSession } },
  createIsolatedClient: vi.fn(),
  usernameToEmail: (u: string) => `${u}@gesco-v1.local`,
  emailToUsername: (e: string) => e.split('@')[0],
}));
vi.mock('../../src/services/common/realtimeSyncService', () => ({ broadcastDataChange: vi.fn() }));
vi.mock('../../src/services/common/auditLogService', () => ({ auditLogService: { log: vi.fn() } }));
vi.mock('../../src/services/auth/sessionTimeoutService', () => ({
  sessionTimeoutService: { isSessionExpired: () => false, recordUserActivity: vi.fn() },
}));

function failedQuery() {
  const result = { data: null, error: { message: 'Audit: database unavailable', code: 'FETCH_ERROR' } };
  const chain: any = {};
  for (const method of ['select', 'eq', 'range', 'insert', 'upsert', 'update', 'delete', 'order', 'limit']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  mock.from.mockImplementation(failedQuery);
  mock.signIn.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Unavailable' } });
  mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe('Production persistence and authentication contracts', () => {
  it('does not announce student creation when all remote writes fail', async () => {
    const service = await import('../../src/services/students/studentsService');
    const result = await service.createStudent({ firstName: 'Audit', lastName: 'Synthetic', matricule: 'AUDIT-ONLY' });
    expect(mock.from).toHaveBeenCalledWith('students');
    expect(result.success).toBe(false);
  });

  it('a successful student creation must survive a fresh module instance', async () => {
    const rows: any[] = [];
    mock.from.mockImplementation((table: string) => {
      expect(table).toBe('students');
      const query: any = {};
      let result: any = { data: rows, error: null };
      query.insert = (row: any) => { rows.push(structuredClone(row)); result = { data: null, error: null }; return query; };
      for (const method of ['select', 'order', 'range']) query[method] = () => query;
      query.then = (resolve: any) => Promise.resolve(result).then(resolve);
      return query;
    });
    const before = await import('../../src/services/students/studentsService');
    const created = await before.createStudent({ firstName: 'Audit', lastName: 'Synthetic', matricule: 'AUDIT-REFRESH' });
    expect(created.success).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.firstName).toBe('Audit');
    vi.resetModules(); // Model loss of module memory on page refresh.
    const after = await import('../../src/services/students/studentsService');
    const loaded = await after.listStudents();
    expect(loaded.data?.students.some(s => s.id === created.data?.id)).toBe(true);
  });

  it('returns an error when saving settings is refused by the server', async () => {
    const service = await import('../../src/services/settings/settingsService');
    const result = await service.saveSchoolYearsList([]);
    expect(result.error).toBeTruthy();
    expect(localStorage.getItem('gesco_school_years')).toBeNull();
  });

  it('does not accept a built-in account after the auth server rejects login', async () => {
    const auth = await import('../../src/services/auth/authService');
    await expect(auth.loginWithPassword('admin', 'admin')).rejects.toThrow();
  });

  it('rejects unknown roles instead of promoting them to administrator', async () => {
    const auth = await import('../../src/services/auth/authService');
    expect(() => auth.normalizeUserRole(undefined)).toThrow();
    expect(() => auth.normalizeUserRole('UNTRUSTED')).toThrow();
  });

  it('does not restore a privileged session from arbitrary browser storage', async () => {
    localStorage.setItem('gesco_auth_session', JSON.stringify({
      id: 'audit-fake-id', username: 'audit', role: 'ADMIN_GENERALE',
    }));
    const auth = await import('../../src/services/auth/authService');
    const result = await auth.fetchCurrentSession();
    expect(result.data.session).toBeNull();
  });
});
