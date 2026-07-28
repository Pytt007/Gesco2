import React, { useState } from 'react';
import { useStaffAttendance } from '../hooks/staffAttendance/useStaffAttendance';
import { staffAttendanceService } from '../services/staffAttendance/staffAttendanceService';
import { StaffAttendanceStatus } from '../services/staffAttendance/types';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import {
  Calendar, Users, CheckCircle2, Clock, AlertTriangle,
  XCircle, Ban, Search, Save, Download, Printer, CheckCheck,
  History, Briefcase, Phone, Filter, ShieldAlert,
} from 'lucide-react';

const STATUS_BUTTONS: { key: StaffAttendanceStatus; label: string; activeClass: string; outlineClass: string }[] = [
  { key: 'PRESENT', label: '🟢 Présent', activeClass: 'btn-success', outlineClass: 'btn-outline-success' },
  { key: 'LATE', label: '🟡 Retard', activeClass: 'btn-warning text-dark', outlineClass: 'btn-outline-warning' },
  { key: 'ON_LEAVE', label: '🟠 Congé', activeClass: 'btn-info text-white', outlineClass: 'btn-outline-info' },
  { key: 'ABSENT', label: '🔴 Absent', activeClass: 'btn-danger', outlineClass: 'btn-outline-danger' },
  { key: 'SICK_LEAVE', label: '⚫ Arrêt maladie', activeClass: 'btn-secondary', outlineClass: 'btn-outline-secondary' },
];

export default function StaffAttendancePage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear?.id || 'ay-2026');
  const [activeTab, setActiveTab] = useState<'APPEL' | 'HISTORIQUE'>('APPEL');

  const rolesList = staffAttendanceService.getRoles();

  const {
    selectedDate,
    setSelectedDate,
    filteredItems,
    history,
    stats,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    loading,
    saving,
    markAllPresent,
    setStatus,
    setArrivalTime,
    setObservation,
    saveSheet,
    exportExcel,
    printSheet,
  } = useStaffAttendance(selectedYearId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* En-tête de page */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Présence du personnel
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Enregistrement de la présence quotidienne des enseignants et des employés administratifs.
          </p>
        </div>

        {/* Boutons d'exportation */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={printSheet} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <Download size={15} /> Exporter Excel
          </button>
          <button className="btn btn-primary fw-semibold text-sm" onClick={saveSheet} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1" /> Enregistrement...</> : <><Save size={15} /> Enregistrer la feuille</>}
          </button>
        </div>
      </div>

      {/* ONGLETS : Appel du jour vs Historique */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        <button
          className={`btn btn-sm ${activeTab === 'APPEL' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('APPEL')}
          style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Briefcase size={16} /> Appel du personnel ({selectedDate})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'HISTORIQUE' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('HISTORIQUE')}
          style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={16} /> Historique ({history.length})
        </button>
      </div>

      {/* SÉLECTION DE LA DATE ET RECHERCHE */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#2563eb" />
              <input
                type="date"
                className="form-control form-control-sm fw-semibold"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 160 }}
              />
            </div>

            {/* Filtre par fonction */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={15} color="#64748b" />
              <select
                className="form-select form-select-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: 220 }}
              >
                <option value="ALL">Toutes les fonctions</option>
                {rolesList.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {activeTab === 'APPEL' && (
            <button className="btn btn-sm btn-outline-success fw-semibold" onClick={markAllPresent} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCheck size={14} /> Tout le monde Présent
            </button>
          )}
        </div>
      </div>

      {activeTab === 'APPEL' && (
        <>
          {/* STATISTIQUES DU PERSONNEL (6 CARTES KPI) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Users size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#1e293b', lineHeight: 1 }}>{stats.totalStaff}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Personnel</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#16a34a', lineHeight: 1 }}>{stats.presentCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Présents 🟢</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#d97706', lineHeight: 1 }}>{stats.lateCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Retards 🟡</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#0284c7', lineHeight: 1 }}>{stats.leaveCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Congés 🟠</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <XCircle size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#dc2626', lineHeight: 1 }}>{stats.absentCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Absents 🔴</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <Ban size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#475569', lineHeight: 1 }}>{stats.sickCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Maladie ⚫</p>
                </div>
              </div>
            </div>
          </div>

          {/* RECHERCHE INSTANTANÉE */}
          <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Rechercher par Nom, Prénom, Fonction ou Téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>
          </div>

          {/* TABLEAU DE LA FEUILLE D'APPEL DU PERSONNEL */}
          <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    {['Personnel', 'Fonction / Téléphone', 'Statut de Présence', 'Heure / Observation'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', width: i === 2 ? '420px' : 'auto' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">Chargement du personnel...</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">Aucun membre du personnel trouvé.</td></tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.staffId}>
                        {/* Employé */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>
                              {item.firstName[0]}{item.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                                {item.lastName} {item.firstName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.matricule}</div>
                            </div>
                          </div>
                        </td>

                        {/* Fonction & Tél */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#334155' }}>{item.role}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> {item.phone}
                          </div>
                        </td>

                        {/* 5 Choix de Statut */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {STATUS_BUTTONS.map((btn) => {
                              const isActive = item.status === btn.key;
                              return (
                                <button
                                  key={btn.key}
                                  type="button"
                                  className={`btn btn-sm ${isActive ? btn.activeClass : btn.outlineClass}`}
                                  onClick={() => setStatus(item.staffId, btn.key)}
                                  style={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: 6, padding: '3px 7px' }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Heure d'arrivée si Retard & Observation */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {item.status === 'LATE' && (
                              <input
                                type="time"
                                className="form-control form-control-sm"
                                value={item.arrivalTime || '08:15'}
                                onChange={(e) => setArrivalTime(item.staffId, e.target.value)}
                                style={{ width: 100, borderRadius: 8, fontSize: '0.8125rem' }}
                                title="Heure d'arrivée"
                              />
                            )}
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Observation (ex: Mission, Formation...)"
                              value={item.observation || ''}
                              onChange={(e) => setObservation(item.staffId, e.target.value)}
                              style={{ borderRadius: 8, fontSize: '0.8125rem' }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {filteredItems.length} membre{filteredItems.length > 1 ? 's' : ''} du personnel au {selectedDate}
              </span>
              <button className="btn btn-primary fw-semibold text-sm" onClick={saveSheet} disabled={saving} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? 'Enregistrement...' : <><Save size={15} /> Valider la feuille de présence</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ONGLET HISTORIQUE DES FEUILLES DU PERSONNEL */}
      {activeTab === 'HISTORIQUE' && (
        <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  {['Date', 'Effectif Total', 'Présents 🟢', 'Retards 🟡', 'Congés 🟠', 'Absents 🔴', 'Arrêt Maladie ⚫', 'Auteur', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-5 text-muted">Aucun historique enregistré.</td></tr>
                ) : (
                  history.map((sheet) => {
                    const sheetStats = staffAttendanceService.calculateStats(sheet.items);
                    return (
                      <tr key={sheet.id}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                          {sheet.date}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{sheetStats.totalStaff} employés</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{sheetStats.presentCount}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#d97706' }}>{sheetStats.lateCount}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{sheetStats.leaveCount}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>{sheetStats.absentCount}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>{sheetStats.sickCount}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: '#64748b' }}>
                          {sheet.createdBy}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setSelectedDate(sheet.date);
                              setActiveTab('APPEL');
                            }}
                            style={{ borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Consulter / Modifier
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
