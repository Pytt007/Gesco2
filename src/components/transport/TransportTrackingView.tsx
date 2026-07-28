import React, { useState, useMemo, useEffect } from 'react';
import { transportEnrollmentService } from '../../services/transport/transportEnrollmentService';
import { transportLineService } from '../../services/transport/transportLineService';
import { TransportEnrollment, TransportLine, TransportKPIs } from '../../services/transport/types';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Users, CheckCircle2, AlertCircle, XCircle, DollarSign,
  TrendingUp, Search, Filter, Bus,
} from 'lucide-react';

function computeKPIs(lines: TransportLine[], enrollments: TransportEnrollment[]): TransportKPIs {
  const totalCapacity = lines.reduce((s, l) => s + l.vehicleCapacity, 0);
  const totalEnrolled = lines.reduce((s, l) => s + l.enrolledCount, 0);
  return {
    totalLines: lines.length,
    activeLines: lines.filter((l) => l.status === 'ACTIVE').length,
    totalCapacity,
    totalEnrolled,
    availableSeats: totalCapacity - totalEnrolled,
    overallOccupancyRate: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0,
    paidStudents: enrollments.filter((e) => e.remainingBalance === 0).length,
    partialStudents: enrollments.filter((e) => e.totalPaid > 0 && e.remainingBalance > 0).length,
    unpaidStudents: enrollments.filter((e) => e.totalPaid === 0).length,
    totalCollected: enrollments.reduce((s, e) => s + e.totalPaid, 0),
    totalRemaining: enrollments.reduce((s, e) => s + e.remainingBalance, 0),
    recoveryRate: enrollments.length > 0
      ? Math.round((enrollments.reduce((s, e) => s + e.totalPaid, 0) / Math.max(1, enrollments.reduce((s, e) => s + e.netAmountDue, 0))) * 100)
      : 0,
  };
}

export const TransportTrackingView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const academicYearId = schoolYear?.id || 'ay-2026';

  const [enrollments, setEnrollments] = useState<TransportEnrollment[]>([]);
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLineId, setFilterLineId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [e, l] = await Promise.all([
        transportEnrollmentService.getEnrollmentsByYear(academicYearId),
        transportLineService.getLinesByYear(academicYearId),
      ]);
      setEnrollments(e);
      setLines(l);
      setLoading(false);
    };
    load();
  }, [academicYearId]);

  const kpis = useMemo(() => computeKPIs(lines, enrollments), [lines, enrollments]);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const q = search.toLowerCase();
      if (q && !e.studentName.toLowerCase().includes(q) && !e.matricule.toLowerCase().includes(q) && !e.className.toLowerCase().includes(q) && !e.lineName.toLowerCase().includes(q)) return false;
      if (filterLineId !== 'ALL' && e.lineId !== filterLineId) return false;
      if (filterStatus === 'PAID' && e.remainingBalance !== 0) return false;
      if (filterStatus === 'PARTIAL' && !(e.totalPaid > 0 && e.remainingBalance > 0)) return false;
      if (filterStatus === 'UNPAID' && e.totalPaid !== 0) return false;
      return true;
    });
  }, [enrollments, search, filterLineId, filterStatus]);

  const kpiCards = [
    { label: 'Lignes actives', value: kpis.activeLines, icon: <Bus size={20} />, color: '#2563eb', bg: '#eff6ff', fmt: (v: number) => String(v) },
    { label: 'Élèves inscrits', value: kpis.totalEnrolled, icon: <Users size={20} />, color: '#0ea5e9', bg: '#f0f9ff', fmt: (v: number) => String(v) },
    { label: 'Soldés', value: kpis.paidStudents, icon: <CheckCircle2 size={20} />, color: '#16a34a', bg: '#f0fdf4', fmt: (v: number) => String(v) },
    { label: 'Paiement partiel', value: kpis.partialStudents, icon: <AlertCircle size={20} />, color: '#d97706', bg: '#fffbeb', fmt: (v: number) => String(v) },
    { label: 'Impayés', value: kpis.unpaidStudents, icon: <XCircle size={20} />, color: '#dc2626', bg: '#fef2f2', fmt: (v: number) => String(v) },
    { label: 'Total encaissé', value: kpis.totalCollected, icon: <DollarSign size={20} />, color: '#0369a1', bg: '#e0f2fe', fmt: (v: number) => `${v.toLocaleString('fr-FR')} F` },
    { label: 'Recouvrement', value: kpis.recoveryRate, icon: <TrendingUp size={20} />, color: '#16a34a', bg: '#f0fdf4', fmt: (v: number) => `${v}%` },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Suivi transport</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Tableau de bord de la situation financière du transport scolaire.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 22 }}>
        {kpiCards.map((k) => (
          <div key={k.label} className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-3" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                {k.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.0625rem', color: k.color, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{k.fmt(k.value)}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barre recouvrement */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Taux de recouvrement global</span>
            <span style={{ fontWeight: 700, color: '#16a34a' }}>{kpis.recoveryRate}%</span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${kpis.recoveryRate}%`, background: kpis.recoveryRate === 100 ? '#16a34a' : 'linear-gradient(90deg,#2563eb,#6366f1)', borderRadius: 99, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="#64748b" />
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" className="form-control form-control-sm" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30, borderRadius: 8 }} />
          </div>
          <select className="form-select form-select-sm" value={filterLineId} onChange={(e) => setFilterLineId(e.target.value)} style={{ width: 160 }}>
            <option value="ALL">Toutes les lignes</option>
            {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ width: 160 }}>
            <option value="ALL">Tous statuts</option>
            <option value="PAID">🟢 Soldé</option>
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
                {['Photo', 'Matricule', 'Nom', 'Classe', 'Ligne', 'Responsable', 'Total', 'Payé', 'Reste', 'Progression', 'Statut'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 12px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: [6, 7, 8].includes(i) ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-5 text-muted">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-5">
                    <Bus size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>Aucun élève inscrit au transport.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const pct = e.netAmountDue > 0 ? Math.round((e.totalPaid / e.netAmountDue) * 100) : 0;
                  const isPaid = e.remainingBalance === 0;
                  const isPartial = e.totalPaid > 0 && e.remainingBalance > 0;
                  const statusLabel = isPaid ? '🟢 Soldé' : isPartial ? '🟡 Partiel' : '🔴 Impayé';
                  const statusColor = isPaid ? '#16a34a' : isPartial ? '#d97706' : '#dc2626';
                  const statusBg = isPaid ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fef2f2';
                  const statusBorder = isPaid ? '#86efac' : isPartial ? '#fde68a' : '#fca5a5';
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                          {e.studentName.charAt(0)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>{e.matricule}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{e.studentName}</td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8125rem', color: '#64748b' }}>{e.className}</td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8125rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Bus size={12} color="#2563eb" />{e.lineName}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8125rem', color: '#64748b' }}>{e.parentSponsor || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8125rem' }}>{e.netAmountDue.toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>{e.totalPaid.toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8125rem', color: isPaid ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{e.remainingBalance.toLocaleString('fr-FR')}</td>
                      <td style={{ padding: '10px 12px', minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isPaid ? '#16a34a' : '#2563eb', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
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
            <span>Encaissé : <strong style={{ color: '#2563eb' }}>{filtered.reduce((s, e) => s + e.totalPaid, 0).toLocaleString('fr-FR')} FCFA</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
