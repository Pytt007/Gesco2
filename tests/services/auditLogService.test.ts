import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditLogService, clearAuditLogs } from '../../src/services/common/auditLogService';

describe('Audit Log Service & Traceability (P2-15)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAuditLogs();
  });

  it('records audit events with timestamps, module, severity and details', async () => {
    const item = await auditLogService.log({
      action: 'CANCEL_PAYMENT',
      module: 'FINANCE',
      severity: 'WARNING',
      user: 'Comptable Principal',
      role: 'Comptable',
      details: 'Annulation du reçu REC-2026-0001 pour motif de double saisie',
    });

    expect(item.id).toBeDefined();
    expect(item.action).toBe('CANCEL_PAYMENT');
    expect(item.module).toBe('FINANCE');
    expect(item.severity).toBe('WARNING');
    expect(item.user).toBe('Comptable Principal');

    const logs = await auditLogService.getLogs(10);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('CANCEL_PAYMENT');
  });

  it('filters audit logs by module, severity and search keywords', async () => {
    await auditLogService.log({
      action: 'UPDATE_STUDENT_STATUS',
      module: 'PEDAGOGY',
      severity: 'INFO',
      user: 'Directeur des Études',
      details: 'Changement de statut élève ID 101',
    });

    await auditLogService.log({
      action: 'CANCEL_TRANSACTION',
      module: 'FINANCE',
      severity: 'DANGER',
      user: 'Super Administrateur',
      details: 'Suppression transaction frauduleuse',
    });

    await auditLogService.log({
      action: 'ASSIGN_BUS_DRIVER',
      module: 'TRANSPORT',
      severity: 'SUCCESS',
      user: 'Responsable Logistique',
      details: 'Affectation chauffeur ligne 04',
    });

    // 1. Filtre par module
    const financeLogs = await auditLogService.getLogs({ module: 'FINANCE' });
    expect(financeLogs.length).toBe(1);
    expect(financeLogs[0].module).toBe('FINANCE');

    // 2. Filtre par sévérité
    const dangerLogs = await auditLogService.getLogs({ severity: 'DANGER' });
    expect(dangerLogs.length).toBe(1);
    expect(dangerLogs[0].action).toBe('CANCEL_TRANSACTION');

    // 3. Recherche textuelle
    const searchLogs = await auditLogService.getLogs({ search: 'chauffeur' });
    expect(searchLogs.length).toBe(1);
    expect(searchLogs[0].module).toBe('TRANSPORT');

    // 4. Filtre par utilisateur
    const userLogs = await auditLogService.getLogs({ user: 'Directeur' });
    expect(userLogs.length).toBe(1);
    expect(userLogs[0].module).toBe('PEDAGOGY');
  });

  it('supports legacy numeric limit parameter and clearAuditLogs isolation', async () => {
    for (let i = 1; i <= 5; i++) {
      await auditLogService.log({
        action: `ACTION_${i}`,
        module: 'SYSTEM',
        details: `Détail ${i}`,
      });
    }

    const limited = await auditLogService.getLogs(3);
    expect(limited.length).toBe(3);

    clearAuditLogs();
    const afterClear = await auditLogService.getLogs();
    expect(afterClear.length).toBe(0);
  });
});
