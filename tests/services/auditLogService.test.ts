import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ rows: [] as any[], failWrite: false, failRead: false, rpc: vi.fn(), from: vi.fn() }));
vi.mock('../../src/services/common/supabaseClient', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));

import { auditLogService, clearAuditLogs } from '../../src/services/common/auditLogService';

beforeEach(() => {
  mock.rows = [];
  mock.failWrite = false;
  mock.failRead = false;
  mock.rpc.mockReset();
  mock.from.mockReset();
  mock.rpc.mockImplementation(async (_name: string, args: any) => {
    if (mock.failWrite) return { data: null, error: { message: 'Neon indisponible' } };
    const row = { id: `audit-${mock.rows.length + 1}`, actor_id: 'auth-user-1', action: args.p_action,
      data: { ...args.p_data, user: 'Admin réel', role: 'ADMIN_GENERALE' }, created_at: '2026-10-07T12:00:00Z' };
    mock.rows.unshift(row);
    return { data: row, error: null };
  });
  mock.from.mockImplementation(() => {
    const chain: any = { select: () => chain, order: () => chain, limit: () => chain,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(mock.failRead
        ? { data: null, error: { message: 'Lecture Neon refusée' } }
        : { data: mock.rows, error: null }).then(resolve) };
    return chain;
  });
  clearAuditLogs();
  localStorage.clear();
});

describe('Journal d’audit Neon', () => {
  it('attend la confirmation du serveur et utilise son identité horodatée', async () => {
    const item = await auditLogService.log({ action: 'CANCEL_PAYMENT', module: 'FINANCE', severity: 'WARNING',
      details: 'Double saisie', user: 'Utilisateur usurpé', role: 'ADMIN_GENERALE' });
    expect(mock.rpc).toHaveBeenCalledWith('append_audit_log', { p_action: 'CANCEL_PAYMENT',
      p_data: { module: 'FINANCE', severity: 'WARNING', details: 'Double saisie' } });
    expect(item).toMatchObject({ user: 'Admin réel', role: 'ADMIN_GENERALE', action: 'CANCEL_PAYMENT' });
    expect(localStorage.length).toBe(0);
  });

  it('ne simule aucune sauvegarde si Neon refuse l’écriture', async () => {
    mock.failWrite = true;
    await expect(auditLogService.log({ action: 'DELETE_STUDENT', module: 'PEDAGOGY', details: 'Test' })).rejects.toThrow('Neon indisponible');
    expect(mock.rows).toHaveLength(0);
  });

  it('relit les événements depuis Neon et signale les erreurs de lecture', async () => {
    await auditLogService.log({ action: 'PAYMENT', module: 'FINANCE', severity: 'SUCCESS', details: 'Reçu 1' });
    await auditLogService.log({ action: 'ASSIGN_BUS', module: 'TRANSPORT', details: 'Ligne 1' });
    clearAuditLogs();
    const logs = await auditLogService.getLogs({ module: 'FINANCE', search: 'Reçu' });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('PAYMENT');
    mock.failRead = true;
    await expect(auditLogService.getLogs()).rejects.toThrow('Lecture Neon refusée');
  });
});
