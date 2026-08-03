import React, { useState } from 'react';
import { useAttendance } from '../hooks/attendance/useAttendance';
import { useAcademicYears, useClassrooms } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { attendanceService } from '../services/attendance/attendanceService';
import { DatePicker } from '../components/ui/date-picker';
import {
  Calendar, Users, CheckCircle2, AlertCircle, XCircle,
  Search, Save, Download, Printer, CheckCheck, X,
  History, Clock, FileText, Filter, UserCheck, RefreshCw,
  Sparkles, Check, ChevronRight, ShieldCheck, ArrowRight
} from 'lucide-react';

const FALLBACK_CLASSES = [
  { id: 'cls-1', name: 'CP1 A' },
  { id: 'cls-2', name: 'CE1 A' },
  { id: 'cls-3', name: 'CE2 B' },
  { id: 'cls-4', name: 'CM2 A' },
  { id: 'cls-5', name: '6ème A' },
];

export default function AttendancePage() {
  const { schoolYear } = useSchoolYear();
  const confirm = useConfirm();
  const { addNotification } = useToast();
  const { academicYears } = useAcademicYears();
  const classroomsHook = useClassrooms();
  
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');
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

  const availableClasses = classroomsHook.classrooms.length > 0 
    ? classroomsHook.classrooms 
    : FALLBACK_CLASSES;

  const selectedClassName = availableClasses.find((c) => c.id === selectedClassId)?.name || 'Classe';

  const handleSaveSheetWithConfirm = async () => {
    const ok = await confirm({
      title: "Validation de la feuille d'appel",
      message: `Enregistrer la feuille de présence du ${selectedDate} pour la classe ${selectedClassName} (${stats.presentCount} présent(s), ${stats.absentCount} absent(s)) ?`,
      confirmText: 'Valider et enregistrer',
      cancelText: 'Vérifier',
      variant: 'info',
    });
    if (ok) {
      await saveSheet();
      addNotification('success', `Feuille de présence enregistrée pour la classe ${selectedClassName}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── HEADER ET ACTIONS UNIFIÉS ────────────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Présences des Élèves
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Appel quotidien par classe, statistiques de fréquentation et suivi de l'assiduité
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={printSheet} style={{ fontWeight: 600 }}>
              <Printer size={15} /> Imprimer / PDF
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportExcel} style={{ fontWeight: 600 }}>
              <Download size={15} /> Exporter Excel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveSheetWithConfirm} 
              disabled={saving}
              style={{ fontWeight: 700 }}
            >
              {saving ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Enregistrement...</>
              ) : (
                <><Save size={16} /> Enregistrer la feuille</>
              )}
            </button>
          </div>
        </div>

        {/* ── SÉLECTION DU CONTEXTE (ANNÉE, CLASSE, DATE) ────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: '1.5rem',
          padding: '16px 24px',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
        }}>
          {/* Année Scolaire Active (Lecture seule) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 700, color: '#047857' }}>
            <span>🟢</span>
            <span>Année scolaire active :</span>
            <span style={{ fontWeight: 900, color: '#065f46' }}>{schoolYear}</span>
          </div>

          {/* Classe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={16} color="#2563eb" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Classe :</span>
            <select
              className="form-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                fontWeight: 700,
                borderRadius: '10px',
                minWidth: '180px',
                padding: '8px 14px',
                fontSize: '0.875rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                height: '42px'
              }}
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>Classe {c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={16} color="#2563eb" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Date :</span>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>

          {/* Raccourcis Tout présent / Tout absent */}
          {activeTab === 'APPEL' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={markAllPresent} style={{ color: '#16a34a', fontWeight: 700, borderRadius: '10px', padding: '8px 14px', height: '42px' }}>
                <CheckCheck size={16} /> Tout Présent
              </button>
              <button className="btn btn-ghost" onClick={markAllAbsent} style={{ color: '#dc2626', fontWeight: 700, borderRadius: '10px', padding: '8px 14px', height: '42px' }}>
                <X size={16} /> Tout Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ONGLETS NATIONAUX DE NAVIGATION ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'APPEL' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('APPEL')}
          style={{ fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <UserCheck size={16} /> Appel du Jour ({selectedClassName})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'HISTORIQUE' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('HISTORIQUE')}
          style={{ fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={16} /> Historique des Feuilles ({history.length})
        </button>
      </div>

      {activeTab === 'APPEL' && (
        <>
          {/* ── CARTES STATISTIQUES KPIS SAAS GRADIENTS ───────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            
            {/* Total Élèves - Royal Blue */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Inscrits</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Élèves</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.totalStudents}</div>
            </div>

            {/* Présents - Émeraude */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Actifs</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Présents</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.presentCount}</div>
            </div>

            {/* Absents Justifiés - Ambre */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Motivés</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Justifiés</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.justifiedCount}</div>
            </div>

            {/* Absents - Rose/Rouge */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Manquants</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Absents</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.absentCount}</div>
            </div>

            {/* Taux de Présence - Violet */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Taux Global</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Assiduité</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.presenceRate}%</div>
            </div>

          </div>

          {/* ── BARRE DE RECHERCHE UNIFIÉE SAAS ─────────────────────────────── */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="search-bar-wrapper" style={{ flex: 1 }}>
              <Search size={16} className="search-bar-icon" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Rechercher un élève par Nom, Prénom ou Matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-bar-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ── TABLEAU DE LA FEUILLE D'APPEL SAAS ──────────────────────────── */}
          <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>Matricule</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Élève</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '340px' }}>Statut de Présence</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Observation / Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                        <div style={{ marginTop: '8px' }}>Chargement de la feuille de présence...</div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        Aucun élève trouvé dans cette classe.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.studentId} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', fontSize: '0.8125rem' }}>
                          {item.matricule}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8125rem', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)' }}>
                              {item.firstName[0]}{item.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {item.lastName} {item.firstName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Classe : {selectedClassName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Boutons de Choix de Statut Moderne */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            
                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'PRESENT' ? 'btn-success' : 'btn-outline-secondary'}`}
                              onClick={() => setStudentStatus(item.studentId, 'PRESENT')}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px' }}
                            >
                              🟢 Présent
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'ABSENT_JUSTIFIED' ? 'btn-warning' : 'btn-outline-secondary'}`}
                              onClick={() => setStudentStatus(item.studentId, 'ABSENT_JUSTIFIED')}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px' }}
                            >
                              🟡 Justifié
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${item.status === 'ABSENT' ? 'btn-danger' : 'btn-outline-secondary'}`}
                              onClick={() => setStudentStatus(item.studentId, 'ABSENT')}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px' }}
                            >
                              🔴 Absent
                            </button>

                          </div>
                        </td>

                        {/* Input Observation */}
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="text"
                            className="form-input form-input-sm"
                            placeholder="Remarque (ex: Retard 15 min, Mot médical...)"
                            value={item.observation || ''}
                            onChange={(e) => setStudentObservation(item.studentId, e.target.value)}
                            style={{ borderRadius: '8px', fontSize: '0.8125rem' }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pied de Table & Bouton de Validation */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Total : {filteredItems.length} élève{filteredItems.length > 1 ? 's' : ''} dans la classe {selectedClassName}
              </span>
              
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSheetWithConfirm} 
                disabled={saving}
                style={{ fontWeight: 700 }}
              >
                {saving ? 'Enregistrement...' : <><Save size={16} /> Valider la feuille d'appel</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ONGLET HISTORIQUE DES FEUILLES SAAS ──────────────────────────────── */}
      {activeTab === 'HISTORIQUE' && (
        <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Classe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Effectif</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Présents</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Absents</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Assiduité</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Auteur</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Aucun historique d'appel trouvé.
                    </td>
                  </tr>
                ) : (
                  history.map((sheet) => {
                    const sheetStats = attendanceService.calculateStats(sheet.items);
                    return (
                      <tr key={sheet.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="#2563eb" /> {sheet.date}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                          Classe {sheet.className}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                          {sheetStats.totalStudents} élèves
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {sheetStats.presentCount} Présents
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                            {sheetStats.absentCount} Absents
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-info" style={{ fontWeight: 700 }}>
                            {sheetStats.presenceRate}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8125rem' }}>
                          👤 {sheet.createdBy}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setSelectedDate(sheet.date);
                              setActiveTab('APPEL');
                              addNotification('info', `Feuille du ${sheet.date} chargée pour consultation`);
                            }}
                            style={{ fontWeight: 600 }}
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
