import React, { useState, useMemo, useEffect } from 'react';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { CanteenEnrollment, CanteenLevelCode, CanteenKPIs } from '../../services/canteen/types';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Users, CheckCircle2, AlertCircle, XCircle, DollarSign,
  TrendingUp, Search, Filter, UtensilsCrossed,
} from 'lucide-react';

const LEVEL_ORDER: CanteenLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

function computeKPIs(enrollments: CanteenEnrollment[]): CanteenKPIs {
  return {
    totalEnrolled: enrollments.length,
    upToDate: enrollments.filter((e) => e.remainingBalance === 0).length,
    partial: enrollments.filter((e) => e.totalPaid > 0 && e.remainingBalance > 0).length,
    unpaid: enrollments.filter((e) => e.totalPaid === 0).length,
    totalCollected: enrollments.reduce((s, e) => s + e.totalPaid, 0),
    totalRemaining: enrollments.reduce((s, e) => s + e.remainingBalance, 0),
    recoveryRate: enrollments.length > 0
      ? Math.round((enrollments.reduce((s, e) => s + e.totalPaid, 0) / enrollments.reduce((s, e) => s + e.netAmountDue, 0)) * 100)
      : 0,
  };
}

export const CanteenTrackingView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const academicYearId = schoolYear || 'ay-2026';

  const [enrollments, setEnrollments] = useState<CanteenEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<CanteenLevelCode | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await canteenEnrollmentService.getEnrollmentsByYear(academicYearId);
      setEnrollments(data);
      setLoading(false);
    };
    load();
  }, [academicYearId]);

  const kpis = useMemo(() => computeKPIs(enrollments), [enrollments]);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const q = search.toLowerCase();
      if (q && !e.studentName.toLowerCase().includes(q) && !e.matricule.toLowerCase().includes(q) && !e.className.toLowerCase().includes(q)) return false;
      if (filterLevel !== 'ALL' && e.levelCode !== filterLevel) return false;
      if (filterStatus === 'PAID' && e.remainingBalance !== 0) return false;
      if (filterStatus === 'PARTIAL' && !(e.totalPaid > 0 && e.remainingBalance > 0)) return false;
      if (filterStatus === 'UNPAID' && e.totalPaid !== 0) return false;
      return true;
    });
  }, [enrollments, search, filterLevel, filterStatus]);

  const kpiCards = [
    { label: 'Élèves inscrits', value: kpis.totalEnrolled, icon: <Users size={15} color="#ffffff" />, tag: 'Subscribers', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', shadow: 'rgba(37, 99, 235, 0.25)' },
    { label: 'À jour', value: kpis.upToDate, icon: <CheckCircle2 size={15} color="#ffffff" />, tag: 'Soldé', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
    { label: 'Paiement partiel', value: kpis.partial, icon: <AlertCircle size={15} color="#ffffff" />, tag: 'Acompte', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249, 115, 22, 0.25)' },
    { label: 'Impayé', value: kpis.unpaid, icon: <XCircle size={15} color="#ffffff" />, tag: 'Relance', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.25)' },
    { label: 'Total encaissé', value: `${kpis.totalCollected.toLocaleString('fr-FR')} F`, icon: <DollarSign size={15} color="#ffffff" />, tag: 'Encaissé', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', shadow: 'rgba(20, 184, 166, 0.25)' },
    { label: 'Reste à encaisser', value: `${kpis.totalRemaining.toLocaleString('fr-FR')} F`, icon: <TrendingUp size={15} color="#ffffff" />, tag: 'Reste', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', shadow: 'rgba(139, 92, 246, 0.25)' },
    { label: 'Recouvrement', value: `${kpis.recoveryRate}%`, icon: <TrendingUp size={15} color="#ffffff" />, tag: 'Ratio', gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', shadow: 'rgba(79, 70, 229, 0.25)' },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
          Suivi cantine
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Tableau de bord de la situation financière de la cantine.
        </p>
      </div>

      {/* KPIs (STYLE DASHBOARD DYNAMIQUE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: 24 }}>
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="card-hover"
            style={{
              background: k.gradient,
              borderRadius: '14px',
              padding: '1.25rem',
              color: '#ffffff',
              boxShadow: `0 6px 20px ${k.shadow}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>
                {k.tag}
              </span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {k.icon}
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{k.label}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Barre de recouvrement */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Taux de recouvrement global</span>
            <span style={{ fontWeight: 700, color: '#16a34a' }}>{kpis.recoveryRate}%</span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${kpis.recoveryRate}%`, background: kpis.recoveryRate === 100 ? '#16a34a' : 'linear-gradient(90deg,#0ea5e9,#6366f1)', borderRadius: 99, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="#64748b" />
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Rechercher élève, matricule, classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30, borderRadius: 8 }}
            />
          </div>
          <select className="form-select form-select-sm" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as any)} style={{ minWidth: 140, height: 38, borderRadius: 10 }}>
            <option value="ALL">Tous niveaux</option>
            {LEVEL_ORDER.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ minWidth: 160, height: 38, borderRadius: 10 }}>
            <option value="ALL">Tous statuts</option>
            <option value="PAID">🟢 À jour</option>
            <option value="PARTIAL">🟡 Partiel</option>
            <option value="UNPAID">🔴 Impayé</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                {['Photo', 'Matricule', 'Nom', 'Classe', 'Responsable', 'Total annuel', 'Payé', 'Reste', 'Progression', 'Statut'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 14px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: i >= 5 && i <= 7 ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-5 text-muted">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5">
                    <UtensilsCrossed size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>Aucun élève inscrit à la cantine.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const pct = e.netAmountDue > 0 ? Math.round((e.totalPaid / e.netAmountDue) * 100) : 0;
                  const isPaid = e.remainingBalance === 0;
                  const isPartial = e.totalPaid > 0 && e.remainingBalance > 0;
                  const statusLabel = isPaid ? '🟢 À jour' : isPartial ? '🟡 Partiel' : '🔴 Impayé';
                  const statusColor = isPaid ? '#16a34a' : isPartial ? '#d97706' : '#dc2626';
                  const statusBg = isPaid ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fef2f2';
                  const statusBorder = isPaid ? '#86efac' : isPartial ? '#fde68a' : '#fca5a5';

                  return (
                    <tr key={e.id}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                          {e.studentName.charAt(0)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>{e.matricule}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{e.studentName}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#64748b' }}>{e.className}</td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#64748b' }}>{e.parentSponsor || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.8125rem', fontWeight: 500 }}>
                        {e.netAmountDue.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
                        {e.totalPaid.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.8125rem', color: isPaid ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                        {e.remainingBalance.toLocaleString('fr-FR')}
                      </td>
                      <td style={{ padding: '10px 14px', minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isPaid ? '#16a34a' : '#0ea5e9', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.8125rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} élève{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span>
            <span>Total encaissé : <strong style={{ color: '#0ea5e9' }}>{filtered.reduce((s, e) => s + e.totalPaid, 0).toLocaleString('fr-FR')} FCFA</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
