import React, { useState } from 'react';
import { useStaffAttendance } from '../hooks/staffAttendance/useStaffAttendance';
import { staffAttendanceService } from '../services/staffAttendance/staffAttendanceService';
import { StaffAttendanceStatus } from '../services/staffAttendance/types';
import { useAcademicYears } from '../hooks/academic';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { DatePicker } from '../components/ui/date-picker';
import {
  Calendar, Users, CheckCircle2, Clock, AlertTriangle,
  XCircle, Ban, Search, Save, Download, Printer, CheckCheck,
  History, Briefcase, Phone, Filter, ShieldAlert, X
} from 'lucide-react';

const STATUS_BUTTONS: { key: StaffAttendanceStatus; label: string; activeClass: string; outlineClass: string }[] = [
  { key: 'PRESENT', label: '🟢 Présent', activeClass: 'btn-success', outlineClass: 'btn-outline-secondary' },
  { key: 'LATE', label: '🟡 Retard', activeClass: 'btn-warning', outlineClass: 'btn-outline-secondary' },
  { key: 'ON_LEAVE', label: '🟠 Congé', activeClass: 'btn-info', outlineClass: 'btn-outline-secondary' },
  { key: 'ABSENT', label: '🔴 Absent', activeClass: 'btn-danger', outlineClass: 'btn-outline-secondary' },
  { key: 'SICK_LEAVE', label: '⚫ Maladie', activeClass: 'btn-neutral', outlineClass: 'btn-outline-secondary' },
];

export default function StaffAttendancePage() {
  const { schoolYear } = useSchoolYear();
  const confirm = useConfirm();
  const { addNotification } = useToast();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');
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

  const handleSaveSheetWithConfirm = async () => {
    const ok = await confirm({
      title: "Validation de la feuille de présence RH",
      message: `Enregistrer le pointage du personnel pour la date du ${selectedDate} (${stats.presentCount} présent(s), ${stats.lateCount} retard(s), ${stats.absentCount} absent(s)) ?`,
      confirmText: 'Valider et enregistrer',
      cancelText: 'Vérifier',
      variant: 'info',
    });
    if (ok) {
      await saveSheet();
      addNotification('success', `Feuille de pointage du personnel enregistrée pour le ${selectedDate}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── HEADER ET ACTIONS UNIFIÉS ────────────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Présence du Personnel & RH
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Pointage quotidien des enseignants, administratifs et agents de service
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

        {/* ── SÉLECTION DE LA DATE ET DU ROLE ───────────────────────────────── */}
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

          {/* Role / Fonction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Filter size={16} color="#2563eb" />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Fonction :</span>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                fontWeight: 700,
                borderRadius: '10px',
                minWidth: '220px',
                padding: '8px 14px',
                fontSize: '0.875rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                height: '42px'
              }}
            >
              <option value="ALL">Toutes les fonctions</option>
              {rolesList.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {activeTab === 'APPEL' && (
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-ghost" onClick={markAllPresent} style={{ color: '#16a34a', fontWeight: 700, borderRadius: '10px', padding: '8px 14px', height: '42px' }}>
                <CheckCheck size={16} /> Tout le monde Présent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ONGLETS DE NAVIGATION ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'APPEL' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('APPEL')}
          style={{ fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Briefcase size={16} /> Pointage du Personnel ({selectedDate})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'HISTORIQUE' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('HISTORIQUE')}
          style={{ fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <History size={16} /> Historique Pointages ({history.length})
        </button>
      </div>

      {activeTab === 'APPEL' && (
        <>
          {/* ── CARTES STATISTIQUES KPIS GRADIENTS ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            
            {/* Total Personnel - Royal Blue */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Global</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Personnel</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.totalStaff}</div>
            </div>

            {/* Présents - Émeraude */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>À l'heure</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Présents</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.presentCount}</div>
            </div>

            {/* Retards - Ambre */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Différés</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Retards</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.lateCount}</div>
            </div>

            {/* Congés - Cyan */}
            <div className="card-hover" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(6, 182, 212, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Autorisés</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Congés</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{stats.leaveCount}</div>
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
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Assiduité</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={15} color="#ffffff" />
                </div>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Taux Présence</span>
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
                placeholder="Rechercher un membre par Nom, Prénom ou Fonction..."
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

          {/* ── TABLEAU DE POINTAGE SAAS ────────────────────────────────────── */}
          <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employé / Enseignant</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '380px' }}>Statut du Pointage</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Heure Arrivée</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Motif / Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                        <div style={{ marginTop: '8px' }}>Chargement des membres...</div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        Aucun employé trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.staffId} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8125rem', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)' }}>
                              {item.firstName[0]}{item.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {item.lastName} {item.firstName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.role} · {item.phone || 'Sans contact'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Boutons de Choix de Statut RH */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {STATUS_BUTTONS.map((btn) => (
                              <button
                                key={btn.key}
                                type="button"
                                className={`btn btn-sm ${item.status === btn.key ? btn.activeClass : btn.outlineClass}`}
                                onClick={() => setStatus(item.staffId, btn.key)}
                                style={{ padding: '5px 8px', fontSize: '0.725rem', fontWeight: 700, borderRadius: '6px' }}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* Heure d'arrivée */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="time"
                            className="form-input form-input-sm"
                            value={item.arrivalTime || ''}
                            onChange={(e) => setArrivalTime(item.staffId, e.target.value)}
                            disabled={item.status === 'ABSENT' || item.status === 'ON_LEAVE'}
                            style={{ borderRadius: '8px', fontSize: '0.8125rem', textAlign: 'center', padding: '4px 6px' }}
                          />
                        </td>

                        {/* Input Observation */}
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="text"
                            className="form-input form-input-sm"
                            placeholder="Observation (ex: Retard bouchons, Autorisation spéciale...)"
                            value={item.observation || ''}
                            onChange={(e) => setObservation(item.staffId, e.target.value)}
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
                Total : {filteredItems.length} employé{filteredItems.length > 1 ? 's' : ''} enregistré{filteredItems.length > 1 ? 's' : ''} pour la date du {selectedDate}
              </span>
              
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSheetWithConfirm} 
                disabled={saving}
                style={{ fontWeight: 700 }}
              >
                {saving ? 'Enregistrement...' : <><Save size={16} /> Enregistrer le pointage RH</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ONGLET HISTORIQUE DES POINTAGES SAAS ─────────────────────────────── */}
      {activeTab === 'HISTORIQUE' && (
        <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date Pointage</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Personnel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Présents</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Retards</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Absents</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Taux Présence</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Responsable RH</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Aucun historique de pointage RH enregistré.
                    </td>
                  </tr>
                ) : (
                  history.map((sheet) => {
                    const sheetStats = staffAttendanceService.calculateStats(sheet.items);
                    return (
                      <tr key={sheet.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="#2563eb" /> {sheet.date}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                          {sheetStats.totalStaff} employés
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {sheetStats.presentCount} Présents
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                            {sheetStats.lateCount} Retards
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
                              addNotification('info', `Pointage du ${sheet.date} chargé pour consultation`);
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
