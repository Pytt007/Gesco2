// ─────────────────────────────────────────────────────────────────────────────
// GESCO — IAM / AuditTab.tsx
// Visualiseur du Journal d'Audit IAM (Connexions, Rôles, Delegations, Approbations...)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  FileText, Search, Download, Filter, ShieldCheck, UserCheck, Clock, CheckCircle2
} from 'lucide-react';
import { usePermissionContext } from '../../../context/PermissionContext';
import type { IAMAuditCategory } from '../../../types/iam';

export default function AuditTab() {
  const { iamAuditLogs, exportCSV } = usePermissionContext();

  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const filteredLogs = iamAuditLogs.filter((entry) => {
    const matchQuery =
      !query.trim() ||
      entry.detail.toLowerCase().includes(query.toLowerCase()) ||
      entry.userName.toLowerCase().includes(query.toLowerCase()) ||
      entry.category.toLowerCase().includes(query.toLowerCase());

    const matchCat = filterCategory === 'ALL' || entry.category === filterCategory;

    return matchQuery && matchCat;
  });

  const getCategoryBadge = (cat: IAMAuditCategory) => {
    switch (cat) {
      case 'ROLE_CREATE':
      case 'ROLE_UPDATE':
      case 'ROLE_DELETE':
        return { label: 'Rôles', bg: '#ede9fe', color: '#5b21b6' };
      case 'PERMISSION_CHANGE':
        return { label: 'Permissions', bg: '#dcfce7', color: '#15803d' };
      case 'DELEGATION_GRANT':
      case 'DELEGATION_REVOKE':
        return { label: 'Délégation', bg: '#eff6ff', color: '#1d4ed8' };
      case 'TEMP_PERMISSION_GRANT':
        return { label: 'Perm. Temp.', bg: '#fef3c7', color: '#92400e' };
      case 'APPROVAL_SUBMIT':
      case 'APPROVAL_DECISION':
        return { label: 'Approbation', bg: '#fce7f3', color: '#9d174d' };
      default:
        return { label: cat, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header avec barre de recherche & filtres */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par utilisateur, action ou détail..."
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', width: '100%', color: '#0f172a' }}
            />
          </div>

          <select
            className="form-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: 180, borderRadius: 10, height: 38, fontSize: '0.8125rem' }}
          >
            <option value="ALL">Toutes catégories</option>
            <option value="ROLE_CREATE">Création Rôles</option>
            <option value="PERMISSION_CHANGE">Modif. Permissions</option>
            <option value="DELEGATION_GRANT">Délégations</option>
            <option value="TEMP_PERMISSION_GRANT">Permissions Temp.</option>
            <option value="APPROVAL_DECISION">Approbations</option>
          </select>
        </div>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={exportCSV}
          style={{ borderRadius: 10, padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Download size={15} /> Exporter Journal CSV
        </button>
      </div>

      {/* Table du Journal d'Audit */}
      <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['Horodatage', 'Catégorie', 'Utilisateur', 'Détail de l\'action', 'IP / Session'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    <FileText size={32} style={{ marginBottom: 6, opacity: 0.5 }} />
                    <div>Aucun enregistrement d'audit ne correspond à vos filtres.</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getCategoryBadge(log.category);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                        {log.userName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {log.detail}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.71875rem' }}>
                        {log.ipAddress || '127.0.0.1 (Local)'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
