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
    { label: 'Lignes actives', value: String(kpis.activeLines), icon: <Bus size={15} color="#ffffff" />, tag: 'Réseau', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', shadow: 'rgba(37, 99, 235, 0.25)' },
    { label: 'Élèves inscrits', value: String(kpis.totalEnrolled), icon: <Users size={15} color="#ffffff" />, tag: 'Passagers', gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', shadow: 'rgba(14, 165, 233, 0.25)' },
    { label: 'Soldés', value: String(kpis.paidStudents), icon: <CheckCircle2 size={15} color="#ffffff" />, tag: 'Payé', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.25)' },
    { label: 'Paiement partiel', value: String(kpis.partialStudents), icon: <AlertCircle size={15} color="#ffffff" />, tag: 'Acompte', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249, 115, 22, 0.25)' },
    { label: 'Impayés', value: String(kpis.unpaidStudents), icon: <XCircle size={15} color="#ffffff" />, tag: 'Relance', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.25)' },
    { label: 'Total encaissé', value: `${kpis.totalCollected.toLocaleString('fr-FR')} F`, icon: <DollarSign size={15} color="#ffffff" />, tag: 'Encaissé', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', shadow: 'rgba(20, 184, 166, 0.25)' },
    { label: 'Recouvrement', value: `${kpis.recoveryRate}%`, icon: <TrendingUp size={15} color="#ffffff" />, tag: 'Ratio', gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', shadow: 'rgba(79, 70, 229, 0.25)' },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Suivi transport</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Tableau de bord de la situation financière du transport scolaire.
        </p>
      </div>

      {/* KPIs (STYLE DASHBOARD DYNAMIQUE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: 22 }}>
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
