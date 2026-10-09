/** Journal d'audit stocké dans Neon. Les champs d'identité viennent du serveur. */
import { supabase } from './supabaseClient';

export type AuditModule = 'FINANCE' | 'PEDAGOGY' | 'CANTEEN' | 'TRANSPORT' | 'SETTINGS' | 'SYSTEM';
export type AuditSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';

export interface AuditLogInput {
  action: string;
  module: AuditModule;
  details: string;
  severity?: AuditSeverity;
  user?: string; // Legacy callers; ignored because the server determines the actor.
  role?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: AuditModule;
  ipAddress?: string;
  severity: AuditSeverity;
  details: string;
}

export interface AuditLogFilter {
  limit?: number;
  module?: AuditModule | 'ALL';
  severity?: AuditSeverity | 'ALL';
  search?: string;
  startDate?: string;
  endDate?: string;
  user?: string;
}

type AuditRow = { id: string; actor_id: string; action: string; data: Record<string, any>; created_at: string };

function mapRow(row: AuditRow): AuditLogItem {
  const data = row.data || {};
  return {
    id: row.id,
    timestamp: row.created_at,
    user: data.user || row.actor_id,
    role: data.role || '',
    action: row.action,
    module: data.module || 'SYSTEM',
    severity: data.severity || 'INFO',
    details: data.details || '',
  };
}

// Retained for old callers and tests; server audit history cannot be cleared from the browser.
export function clearAuditLogs(): void {}

export const auditLogService = {
  async log(input: AuditLogInput): Promise<AuditLogItem> {
    if (!input.action.trim()) throw new Error('Action d’audit requise.');
    const { data, error } = await supabase.rpc('append_audit_log', {
      p_action: input.action,
      p_data: { module: input.module, severity: input.severity || 'INFO', details: input.details },
    });
    if (error || !data) throw new Error(error?.message || 'Journal d’audit non confirmé par Neon.');
    return mapRow(data as AuditRow);
  },

  async getLogs(filterOrLimit: AuditLogFilter | number = 200): Promise<AuditLogItem[]> {
    const filter: AuditLogFilter = typeof filterOrLimit === 'number' ? { limit: filterOrLimit } : filterOrLimit;
    const limit = Math.min(Math.max(filter.limit || 200, 1), 1000);
    const { data, error } = await supabase.from('audit_logs').select('id,actor_id,action,data,created_at')
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => mapRow(row as AuditRow)).filter((log: AuditLogItem) => {
      if (filter.module && filter.module !== 'ALL' && log.module !== filter.module) return false;
      if (filter.severity && filter.severity !== 'ALL' && log.severity !== filter.severity) return false;
      if (filter.user && !log.user.toLowerCase().includes(filter.user.toLowerCase())) return false;
      if (filter.startDate && log.timestamp < `${filter.startDate}T00:00:00`) return false;
      if (filter.endDate && log.timestamp > `${filter.endDate}T23:59:59`) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (![log.action, log.details, log.user].some(value => value.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  },
};
