import React, { useState } from 'react';
import { useAttendance } from '../hooks/attendance/useAttendance';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import { AttendanceStatus } from '../services/attendance/types';
import {
  Calendar, Users, CheckCircle2, AlertCircle, XCircle,
  Search, Save, Download, Printer, CheckCheck, X,
  History, Clock, FileText, Filter, UserCheck, RefreshCw,
} from 'lucide-react';

const MOCK_CLASSES = [
  { id: 'cls-1', name: 'CP1 A' },
  { id: 'cls-2', name: 'CE1 A' },
  { id: 'cls-3', name: 'CE2 B' },
  { id: 'cls-4', name: 'CM2 A' },
  { id: 'cls-5', name: '6ème A' },
];

export default function AttendancePage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear?.id || 'ay-2026');
  const [activeTab, setActiveTab] = useState<'APPEL' | 'HISTORIQUE'>('APPEL');

  const {
    selectedClassId,
    setSelectedClassId,
    selectedDate,
    setSelectedDate,
    filteredItems,
    history,
    stats,
    searchQuery,
    setSearchQuery,
    loading,
    saving,
    markAllPresent,
    markAllAbsent,
    setStudentStatus,
    setStudentObservation,
    saveSheet,
    exportExcel,
    printSheet,
  } = useAttendance(selectedYearId);

  const selectedClassName = MOCK_CLASSES.find((c) => c.id === selectedClassId)?.name || 'Classe';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* En-tête de page */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Présences des élèves
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Feuille d'appel quotidienne par classe, statistiques de présence et suivi des justifications.
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
          <UserCheck size={16} /> Appel du jour ({selectedClassName})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'HISTORIQUE' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('HISTORIQUE')}
          style={{ fontWeight: 600, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={16} /> Historique des présences ({history.length})
        </button>
      </div>

      {/* SÉLECTION DU CONTEXTE (Année, Classe, Date) */}
      <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div className="card-body p-3" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Année */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#2563eb" />
              <select
                className="form-select form-select-sm fw-semibold"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                style={{ width: 140 }}
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.name} {ay.isCurrent ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Classe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} color="#2563eb" />
              <select
                className="form-select form-select-sm fw-semibold"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={{ width: 150 }}
              >
                {MOCK_CLASSES.map((c) => (
                  <option key={c.id} value={c.id}>Classe {c.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#2563eb" />
              <input
                type="date"
                className="form-control form-control-sm fw-semibold"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 160 }}
              />
            </div>
          </div>

          {/* Actions rapides Tout présent / Tout absent */}
          {activeTab === 'APPEL' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline-success fw-semibold" onClick={markAllPresent} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCheck size={14} /> Tout Présent
              </button>
              <button className="btn btn-sm btn-outline-danger fw-semibold" onClick={markAllAbsent} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={14} /> Tout Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'APPEL' && (
        <>
          {/* STATISTIQUES (5 CARTES KPI) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Users size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b', lineHeight: 1 }}>{stats.totalStudents}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Total Élèves</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#16a34a', lineHeight: 1 }}>{stats.presentCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Présents 🟢</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#d97706', lineHeight: 1 }}>{stats.justifiedCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Absents Justifiés 🟡</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <XCircle size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#dc2626', lineHeight: 1 }}>{stats.absentCount}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Absents 🔴</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#0369a1', lineHeight: 1 }}>{stats.presenceRate}%</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: 600 }}>Taux de Présence</p>
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
                placeholder="Recherche rapide d'un élève par Nom, Prénom ou Matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>
          </div>

          {/* TABLEAU DE LA FEUILLE D'APPEL */}
          <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    {['Matricule', 'Élève', 'Statut de Présence', 'Observation / Remarque'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', width: i === 2 ? '340px' : 'auto' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">Chargement de la feuille de présence...</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">Aucun élève trouvé.</td></tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.studentId}>
                        <td style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', width: 160 }}>
                          {item.matricule}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', color: '#475569' }}>
                              {item.firstName[0]}{item.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                                {item.lastName} {item.firstName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Boutons de Choix de Statut */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'PRESENT' ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => setStudentStatus(item.studentId, 'PRESENT')}
                              style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, padding: '4px 8px' }}
                            >
                              🟢 Présent
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'ABSENT_JUSTIFIED' ? 'btn-warning text-dark' : 'btn-outline-warning'}`}
                              onClick={() => setStudentStatus(item.studentId, 'ABSENT_JUSTIFIED')}
                              style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, padding: '4px 8px' }}
                            >
                              🟡 Justifié
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'ABSENT' ? 'btn-danger' : 'btn-outline-danger'}`}
                              onClick={() => setStudentStatus(item.studentId, 'ABSENT')}
                              style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, padding: '4px 8px' }}
                            >
                              🔴 Absent
                            </button>
                          </div>
                        </td>

                        {/* Observation */}
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Observation (ex: Malade, Retard 10min...)"
                            value={item.observation || ''}
                            onChange={(e) => setStudentObservation(item.studentId, e.target.value)}
                            style={{ borderRadius: 8, fontSize: '0.8125rem' }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {filteredItems.length} élève{filteredItems.length > 1 ? 's' : ''} dans la classe {selectedClassName}
              </span>
              <button className="btn btn-primary fw-semibold text-sm" onClick={saveSheet} disabled={saving} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? 'Enregistrement...' : <><Save size={15} /> Valider l'appel</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ONGLET HISTORIQUE DES FEUILLES */}
      {activeTab === 'HISTORIQUE' && (
        <div className="card" style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  {['Date', 'Classe', 'Effectif Total', 'Présents', 'Absents', 'Taux de Présence', 'Auteur', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">Aucun historique enregistré pour cette classe.</td></tr>
                ) : (
                  history.map((sheet) => {
                    const sheetStats = attendanceService.calculateStats(sheet.items);
                    return (
                      <tr key={sheet.id}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                          {sheet.date}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {sheet.className}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{sheetStats.totalStudents} élèves</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>{sheetStats.presentCount} 🟢</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>{sheetStats.absentCount} 🔴</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                            {sheetStats.presenceRate}%
                          </span>
                        </td>
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
