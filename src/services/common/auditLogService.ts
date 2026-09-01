/**
 * GESCO — Service Centralisé d'Audit et de Traçabilité Administrative
 * Enregistre toutes les actions critiques (suppressions, annulations, créations)
 * en base Supabase (table audit_logs) avec réplication locale.
 */

import { supabase } from './supabaseClient';

export type AuditModule = 'FINANCE' | 'PEDAGOGY' | 'CANTEEN' | 'TRANSPORT' | 'SETTINGS' | 'SYSTEM';
export type AuditSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';

export interface AuditLogInput {
  action: string;
  module: AuditModule;
  details: string;
  severity?: AuditSeverity;
  user?: string;
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

const STORAGE_KEY = 'gesco_audit_logs';
let inMemoryAuditLogs: AuditLogItem[] = [];

export function clearAuditLogs(): void {
  inMemoryAuditLogs = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function getStoredLogs(): AuditLogItem[] {
  if (inMemoryAuditLogs.length > 0) return [...inMemoryAuditLogs];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryAuditLogs = [...parsed];
        return parsed;
      }
    }
  } catch {
    // Ignorer
  }
  return [];
}

function saveStoredLogs(logs: AuditLogItem[]): void {
  inMemoryAuditLogs = logs.slice(0, 500);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryAuditLogs));
  } catch {
    // Ignorer
  }
}

export const auditLogService = {
  /**
   * Enregistre un événement critique dans le journal d'audit
   */
  async log(input: AuditLogInput): Promise<AuditLogItem> {
    const now = new Date();
    const id = `audit-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`;
    const user = input.user || 'Direction GESCO';
    const role = input.role || 'Administrateur';
    const severity = input.severity || 'INFO';

    const item: AuditLogItem = {
      id,
      timestamp: now.toISOString(),
      user,
      role,
      action: input.action,
      module: input.module,
      severity,
      details: input.details,
      ipAddress: '127.0.0.1',
    };

    // 1. Sauvegarde locale immédiate
    const current = getStoredLogs();
    saveStoredLogs([item, ...current]);

    // 2. Persistance dans la table PostgreSQL Supabase `audit_logs`
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert({
          id: item.id,
          user_name: item.user,
          role: item.role,
          action: item.action,
          module: item.module,
          severity: item.severity,
          details: item.details,
          created_at: item.timestamp,
        });
      } catch (err) {
        console.warn('[auditLogService] Supabase insert fallback:', err);
      }
    }

    return item;
  },

  /**
   * Récupère les entrées du journal d'audit avec filtres
   */
  async getLogs(filterOrLimit: AuditLogFilter | number = 200): Promise<AuditLogItem[]> {
    const filter: AuditLogFilter = typeof filterOrLimit === 'number'
      ? { limit: filterOrLimit }
      : (filterOrLimit || {});
    const limit = filter.limit || 200;

    let items: AuditLogItem[] = [];

    if (supabase) {
      try {
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter.module && filter.module !== 'ALL') {
          query = query.eq('module', filter.module);
        }
        if (filter.severity && filter.severity !== 'ALL') {
          query = query.eq('severity', filter.severity);
        }
        if (filter.startDate) {
          query = query.gte('created_at', `${filter.startDate}T00:00:00`);
        }
        if (filter.endDate) {
          query = query.lte('created_at', `${filter.endDate}T23:59:59`);
        }
        if (filter.user) {
          query = query.ilike('user_name', `%${filter.user}%`);
        }

        query = query.limit(limit);

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          items = data.map((d: any) => ({
            id: d.id,
            timestamp: d.created_at || new Date().toISOString(),
            user: d.user_name || d.user_email || d.user_id || 'Administrateur',
            role: d.role || 'Admin',
            action: d.action || 'Action',
            module: (d.module || 'SYSTEM').toUpperCase() as AuditModule,
            ipAddress: d.ip_address || '',
            severity: (d.severity || 'INFO').toUpperCase() as AuditSeverity,
            details: d.details || d.description || '',
          }));
          saveStoredLogs(items);
        }
      } catch {
        // Fallback local
      }
    }

    if (items.length === 0) {
      items = getStoredLogs();
    }

    return items.filter((log) => {
      if (filter.module && filter.module !== 'ALL' && log.module !== filter.module) return false;
      if (filter.severity && filter.severity !== 'ALL' && log.severity !== filter.severity) return false;
      if (filter.user && !log.user.toLowerCase().includes(filter.user.toLowerCase())) return false;
      if (filter.startDate && log.timestamp < `${filter.startDate}T00:00:00`) return false;
      if (filter.endDate && log.timestamp > `${filter.endDate}T23:59:59`) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matches = log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.user.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).slice(0, limit);
  },
};
