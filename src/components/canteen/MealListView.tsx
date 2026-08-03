import React, { useState, useMemo } from 'react';
import { canteenEnrollmentService } from '../../services/canteen/canteenEnrollmentService';
import { CanteenEnrollment, CanteenLevelCode, DailyMealEntry } from '../../services/canteen/types';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  UtensilsCrossed, Users, CheckCircle2, AlertCircle, XCircle,
  Calendar, Filter, Download, Printer, RefreshCw,
} from 'lucide-react';

const LEVEL_ORDER: CanteenLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

function getMealStatus(enrollment: CanteenEnrollment): 'AUTHORIZED' | 'SUSPENDED' | 'NOT_ENROLLED' {
  if (enrollment.subscriptionStatus === 'ACTIVE') return 'AUTHORIZED';
  if (enrollment.subscriptionStatus === 'SUSPENDED') return 'SUSPENDED';
  return 'NOT_ENROLLED';
}

export const MealListView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const academicYearId = schoolYear || 'ay-2026';

  const [entries, setEntries] = useState<CanteenEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterLevel, setFilterLevel] = useState<CanteenLevelCode | 'ALL'>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await canteenEnrollmentService.getEnrollmentsByYear(academicYearId);
      setEntries(data);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadEntries();
  }, [academicYearId]);

  const classes = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.className));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterLevel !== 'ALL' && e.levelCode !== filterLevel) return false;
      if (filterClass !== 'ALL' && e.className !== filterClass) return false;
      return true;
    });
  }, [entries, filterLevel, filterClass]);

  const authorized = filtered.filter((e) => e.subscriptionStatus === 'ACTIVE').length;
  const suspended = filtered.filter((e) => e.subscriptionStatus === 'SUSPENDED').length;
  const total = filtered.length;

  const statusConfig = {
    ACTIVE: { label: 'Autorisé', icon: <CheckCircle2 size={16} />, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    SUSPENDED: { label: 'Suspendu', icon: <AlertCircle size={16} />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    NOT_ENROLLED: { label: 'Non inscrit', icon: <XCircle size={16} />, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
    ARCHIVED: { label: 'Archivé', icon: <XCircle size={16} />, color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Liste des repas du jour
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Élèves autorisés à déjeuner — {new Date(filterDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline-secondary text-sm fw-semibold"
            onClick={loadEntries}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          <button
            className="btn btn-outline-primary text-sm fw-semibold"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
          >
            <Printer size={14} /> Imprimer
          </button>
        </div>
      </div>

      {/* KPIs Colorés SaaS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Élèves inscrits', value: total, icon: <Users size={20} color="#ffffff" />, gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', shadow: 'rgba(2, 132, 199, 0.3)' },
          { label: 'Autorisés', value: authorized, icon: <CheckCircle2 size={20} color="#ffffff" />, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.3)' },
          { label: 'Suspendus', value: suspended, icon: <AlertCircle size={20} color="#ffffff" />, gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249, 115, 22, 0.3)' },
          { label: 'Non inscrits', value: 0, icon: <XCircle size={20} color="#ffffff" />, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(239, 68, 68, 0.3)' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card shadow-sm card-hover"
            style={{
              borderRadius: 14,
              background: kpi.gradient,
              color: '#ffffff',
              border: 'none',
              boxShadow: `0 8px 20px -4px ${kpi.shadow}`,
            }}
          >
            <div className="card-body p-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {kpi.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="#64748b" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#0ea5e9" />
            <label className="text-sm fw-semibold" style={{ color: '#334155', margin: 0 }}>Date :</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: 160, borderRadius: 8 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="text-sm fw-semibold" style={{ color: '#334155', margin: 0 }}>Niveau :</label>
            <select
              className="form-select form-select-sm"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as CanteenLevelCode | 'ALL')}
              style={{ width: 120, borderRadius: 8 }}
            >
              <option value="ALL">Tous</option>
              {LEVEL_ORDER.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="text-sm fw-semibold" style={{ color: '#334155', margin: 0 }}>Classe :</label>
            <select
              className="form-select form-select-sm"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ width: 150, borderRadius: 8 }}
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(filterLevel !== 'ALL' || filterClass !== 'ALL') && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => { setFilterLevel('ALL'); setFilterClass('ALL'); }}
              style={{ borderRadius: 6 }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Photo</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Matricule</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Nom et prénom</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Classe</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                  Statut cantine
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <UtensilsCrossed size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>Aucun élève inscrit à la cantine pour ces filtres.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const cfg = statusConfig[e.subscriptionStatus] || statusConfig.NOT_ENROLLED;
                  return (
                    <tr key={e.id}>
                      <td style={{ padding: '10px 16px' }}>
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt={e.studentName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                            {e.studentName.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        {e.matricule}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{e.studentName}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                        {e.className}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                          borderRadius: 20, padding: '4px 12px', fontSize: '0.8125rem', fontWeight: 600
                        }}>
                          {cfg.icon} {cfg.label}
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
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569' }}>
            <span><strong>{total}</strong> élève{total > 1 ? 's' : ''} inscrit{total > 1 ? 's' : ''}</span>
            <span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ {authorized} autorisé{authorized > 1 ? 's' : ''}</span>
              {suspended > 0 && <span style={{ color: '#d97706', fontWeight: 600, marginLeft: 12 }}>⚠️ {suspended} suspendu{suspended > 1 ? 's' : ''}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
