// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Module Gestion des Élèves (src/pages/StudentsPage.tsx)
// Design System SaaS Premium : Wizard 4 Étapes, Drawer Fiche Latéral & Table Unifiée
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { useToast } from '../context/ToastContext';
import { useStudents, useMedicalRecord, useStudentDocuments, useStudentHistory } from '../hooks/students';
import { useStudentParents } from '../hooks/parents/useStudentParents';
import { listParents } from '../services/parents/parentsService';
import { studentFinancialEnrollmentService } from '../services/finance/studentFinancialEnrollmentService';
import { canteenEnrollmentService } from '../services/canteen/canteenEnrollmentService';
import { transportEnrollmentService } from '../services/transport/transportEnrollmentService';
import { Student } from '../types';
import { exportStudentsToExcel, downloadExcel } from '../utils/exportUtils';
import {
  Plus, Search, Download, Upload, X, Save, Eye, FileText, HeartPulse,
  History, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2,
  DollarSign, UtensilsCrossed, Bus, UserCheck, Image, Phone, MapPin, Check,
  Filter, SlidersHorizontal, AlertCircle, Edit2, RotateCcw, Trash2,
  Users, AlertTriangle, CreditCard
} from 'lucide-react';
import { GRADES } from '../constants/config';

const STATUS_BADGE: Record<string, React.ReactNode> = {
  'Actif': <span className="badge badge-success">Actif</span>,
  'Inactif': <span className="badge badge-neutral">Inactif</span>,
  'Archivé': <span className="badge badge-warning">Archivé</span>,
};

const FEES_BADGE: Record<string, React.ReactNode> = {
  'Payé': <span className="badge badge-success">Payé</span>,
  'En retard': <span className="badge badge-danger">En retard</span>,
  'Partiel': <span className="badge badge-warning">Partiel</span>,
  'En attente': <span className="badge badge-neutral">En attente</span>,
};

export default function StudentsPage() {
  const { schoolYear } = useSchoolYear();
  const { addNotification } = useToast();

  const {
    students = [],
    totalCount = 0,
    page,
    totalPages,
    loading,
    saving,
    error,
    create,
    update,
    archive,
    restore,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    setPage,
    refresh
  } = useStudents({ schoolYear });

  const [gradeFilter, setGradeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'finance' | 'canteen' | 'transport' | 'medical' | 'docs' | 'history'>('info');

  // Parents auto-complete
  const [parentQuery, setParentQuery] = useState('');
  const [parentSuggestions, setParentSuggestions] = useState<any[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);

  // Sub-data pour le dossier élève détaillé
  const [studentScolarData, setStudentScolarData] = useState<any>(null);
  const [studentCanteenData, setStudentCanteenData] = useState<any>(null);
  const [studentTransportData, setStudentTransportData] = useState<any>(null);

  const medicalState = useMedicalRecord(detailStudent?.id);
  const docState = useStudentDocuments(detailStudent?.id);
  const historyState = useStudentHistory(detailStudent?.id);
  const { primaryParent } = useStudentParents(detailStudent?.id);

  const emptyForm = (): Partial<Student> => ({
    firstName: '',
    lastName: '',
    grade: GRADES[0],
    gender: 'Masculin',
    status: 'Actif',
    feesStatus: 'En attente',
    attendance: 100,
    parentName: '',
    parentPhone: '',
    address: '',
    photo: '',
  });

  const [form, setForm] = useState<Partial<Student>>(emptyForm());

  useEffect(() => {
    if (detailStudent) {
      studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026').then((list) => {
        const found = list.find((e) => e.studentId === detailStudent.id || e.studentName.toLowerCase().includes(detailStudent.lastName.toLowerCase()));
        setStudentScolarData(found || null);
      });

      canteenEnrollmentService.getEnrollmentsByYear('ay-2026').then((list) => {
        const found = list.find((e) => e.studentId === detailStudent.id);
        setStudentCanteenData(found || null);
      });

      transportEnrollmentService.getEnrollmentsByYear('ay-2026').then((list) => {
        const found = list.find((e) => e.studentId === detailStudent.id);
        setStudentTransportData(found || null);
      });
    }
  }, [detailStudent]);

  const handleParentSearch = async (val: string) => {
    setParentQuery(val);
    setForm((prev) => ({ ...prev, parentName: val }));
    if (!val.trim()) {
      setParentSuggestions([]);
      return;
    }
    setIsSearchingParent(true);
    try {
      const res = await listParents({ searchQuery: val, pageSize: 5 });
      if (res.data?.parents) {
        setParentSuggestions(res.data.parents);
      }
    } finally {
      setIsSearchingParent(false);
    }
  };

  const selectParent = (parent: any) => {
    setForm((prev) => ({
      ...prev,
      parentName: `${parent.lastName} ${parent.firstName}`,
      parentPhone: parent.phonePrimary,
      address: prev.address || parent.address,
    }));
    setParentQuery(`${parent.lastName} ${parent.firstName}`);
    setParentSuggestions([]);
  };

  const filteredStudents = useMemo(() => {
    let res = students;
    if (gradeFilter !== 'all') {
      res = res.filter((s) => s.grade === gradeFilter);
    }
    return res;
  }, [students, gradeFilter]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setForm(emptyForm());
    setParentQuery('');
    setWizardStep(1);
    setShowAddModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setForm(student);
    setParentQuery(student.parentName || '');
    setWizardStep(1);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.grade) {
      addNotification('error', 'Le nom, le prénom et la classe sont obligatoires.');
      return;
    }

    if (editingStudent) {
      const ok = await update(editingStudent.id, form);
      if (ok) {
        addNotification('success', 'Élève mis à jour avec succès.');
        setShowAddModal(false);
      }
    } else {
      const created = await create(form);
      if (created) {
        addNotification('success', 'Élève inscrit avec succès.');
        setWizardStep(4);
      }
    }
  };

  const handleExport = () => {
    const buffer = exportStudentsToExcel(filteredStudents);
    downloadExcel(buffer, `eleves_gesco_${schoolYear}.xlsx`);
    addNotification('info', 'Exportation Excel générée.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── HEADER ET STATISTIQUES UNIFIÉS ─────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Gestion des Élèves
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Inscriptions, dossiers scolaires, suivi médical et parcours des élèves
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} /> Exporter Excel
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Nouvel Élève
            </button>
          </div>
        </div>

        {/* CARTES STATISTIQUES ÉLÈVES (STYLE DASHBOARD DYNAMIQUE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Total Inscrits - Royal Blue */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Global</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Inscrits</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{totalCount}</div>
          </div>

          {/* Actifs - Émeraude */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Actifs</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Élèves Actifs</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{filteredStudents.filter((s) => s.status === 'Actif').length}</div>
          </div>

          {/* Scolarité à jour - Cyan */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(6, 182, 212, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Scolarité</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Scolarité à Jour</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{filteredStudents.filter((s) => s.feesStatus === 'Payé').length}</div>
          </div>

          {/* En Retard - Rouge */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Alerte</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>En Retard</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{filteredStudents.filter((s) => s.feesStatus === 'En retard').length}</div>
          </div>
        </div>
      </div>

      {/* ── BARRE D'ACTIONS & FILTRES UNIFIÉE ─────────────────────────────── */}
      <div className="card shadow-sm p-3" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', background: '#ffffff' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 260 }}>
            {/* Recherche */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher un élève (Nom, Prénom, Matricule...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, height: 38, borderRadius: 10, fontSize: '0.875rem' }}
              />
            </div>

            {/* Filtre Classe */}
            <select
              className="form-select"
              style={{ width: 140, height: 38, borderRadius: 10, fontSize: '0.875rem' }}
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">Toutes classes</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Filtre Statut */}
            <select
              className="form-select"
              style={{ width: 130, height: 38, borderRadius: 10, fontSize: '0.875rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous statuts</option>
              <option value="Actif">Actifs</option>
              <option value="Inactif">Inactifs</option>
              <option value="Archivé">Archivés</option>
            </select>
          </div>

          <button className="btn btn-outline btn-sm" onClick={refresh} title="Actualiser" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── TABLEAU DE DONNÉES PREMIUM UNIFIÉ ─────────────────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Élève</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Classe</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Parent / Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Scolarité</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                    <div style={{ marginTop: '8px' }}>Chargement de la liste...</div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Aucun élève trouvé.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={st.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.id}`}
                          alt={st.lastName}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#eef2ff' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{st.lastName} {st.firstName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Matricule : {st.matricule || st.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>{st.grade}</span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{st.parentName || 'Non renseigné'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{st.parentPhone || '—'}</div>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {FEES_BADGE[st.feesStatus] || <span className="badge badge-neutral">{st.feesStatus}</span>}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {STATUS_BADGE[st.status] || <span className="badge badge-neutral">{st.status}</span>}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Voir Dossier" onClick={() => setDetailStudent(st)}>
                          <Eye size={15} color="#4f46e5" />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => handleOpenEdit(st)}>
                          <Edit2 size={15} color="#0ea5e9" />
                        </button>
                        {st.status === 'Archivé' ? (
                          <button className="btn btn-ghost btn-sm" title="Restaurer" onClick={() => restore(st.id)}>
                            <RotateCcw size={15} color="#10b981" />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" title="Archiver" onClick={() => archive(st.id)}>
                            <Trash2 size={15} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION UNIFIÉE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
          <span style={{ color: '#64748b' }}>Page {page} sur {totalPages || 1} ({totalCount} élèves au total)</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={14} /> Précédent
            </button>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── DRAWER LATÉRAL DOSSIER ÉLÈVE DÉTAILLÉ ─────────────────────────── */}
      {detailStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '580px', height: '100%', background: '#ffffff', boxShadow: '-10px 0 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', animation: 'slideLeft 0.2s ease-out' }}>
            
            {/* Header Drawer */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={detailStudent.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${detailStudent.id}`} alt="" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>{detailStudent.lastName} {detailStudent.firstName}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Classe : {detailStudent.grade}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailStudent(null)}><X size={18} /></button>
            </div>

            {/* Onglets Dossier */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', overflowX: 'auto' }}>
              {(['info', 'finance', 'canteen', 'transport', 'medical', 'docs', 'history'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === t ? '2px solid #4f46e5' : 'none',
                    fontWeight: activeTab === t ? 700 : 500,
                    color: activeTab === t ? '#4f46e5' : '#64748b',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t === 'info' ? 'Informations' : t === 'finance' ? 'Scolarité' : t === 'canteen' ? 'Cantine' : t === 'transport' ? 'Transport' : t === 'medical' ? 'Santé' : t === 'docs' ? 'Documents' : 'Historique'}
                </button>
              ))}
            </div>

            {/* Contenu de l'Onglet actif */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {activeTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>RESPONSABLE PAYEUR / PARENT</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: 4 }}>{detailStudent.parentName || 'Non renseigné'}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 2 }}>📞 {detailStudent.parentPhone || '—'}</div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ADRESSE & ÉTAT CIVIL</div>
                    <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: 4 }}>Genre : {detailStudent.gender}</div>
                    <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: 2 }}>Adresse : {detailStudent.address || 'Abidjan'}</div>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div>
                  {studentScolarData ? (
                    <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontWeight: 700, color: '#166534' }}>Dossier Scolarité</div>
                      <div style={{ fontSize: '0.875rem', marginTop: 6 }}>Netteté dûe : {studentScolarData.netAmountDue?.toLocaleString()} FCFA</div>
                      <div style={{ fontSize: '0.875rem' }}>Montant Encaissé : {studentScolarData.totalPaid?.toLocaleString()} FCFA</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626', marginTop: 4 }}>Reste à payer : {studentScolarData.remainingBalance?.toLocaleString()} FCFA</div>
                    </div>
                  ) : <p style={{ color: '#94a3b8' }}>Aucune inscription financière trouvée pour cette année.</p>}
                </div>
              )}

              {activeTab === 'canteen' && (
                <div>
                  {studentCanteenData ? (
                    <div style={{ padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a' }}>
                      <div style={{ fontWeight: 700, color: '#92400e' }}>Abonnement Cantine</div>
                      <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Formule : {studentCanteenData.mealPlan}</div>
                      <div style={{ fontSize: '0.875rem' }}>Statut : {studentCanteenData.status}</div>
                    </div>
                  ) : <p style={{ color: '#94a3b8' }}>Élève non inscrit à la cantine.</p>}
                </div>
              )}

              {activeTab === 'transport' && (
                <div>
                  {studentTransportData ? (
                    <div style={{ padding: 16, background: '#fff7ed', borderRadius: 12, border: '1px solid #ffedd5' }}>
                      <div style={{ fontWeight: 700, color: '#9a3412' }}>Abonnement Transport</div>
                      <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Ligne : {studentTransportData.lineName || 'Circuit N°1'}</div>
                      <div style={{ fontSize: '0.875rem' }}>Arrêt : {studentTransportData.stopName || 'Point principal'}</div>
                    </div>
                  ) : <p style={{ color: '#94a3b8' }}>Élève non inscrit au transport.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ASSISTANT DE CRÉATION WIZARD 4 ÉTAPES ─────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '640px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            {/* Header Wizard & Stepper */}
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingStudent ? 'Modifier le dossier Élève' : 'Inscription d\'un Nouvel Élève'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assistant d'inscription étape par étape</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            {/* Stepper Progress Indicator */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { step: 1, label: '1. Identité' },
                { step: 2, label: '2. Parent & Contact' },
                { step: 3, label: '3. Résumé' },
                { step: 4, label: '4. Validation' },
              ].map((st) => (
                <div
                  key={st.step}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: wizardStep === st.step ? 700 : 500,
                    color: wizardStep === st.step ? '#4f46e5' : '#94a3b8',
                    borderBottom: wizardStep === st.step ? '2px solid #4f46e5' : 'none',
                    background: wizardStep === st.step ? '#eef2ff' : 'none',
                  }}
                >
                  {st.label}
                </div>
              ))}
            </div>

            {/* Corps de l'Étape */}
            <div style={{ padding: '20px' }}>
              {wizardStep === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label">Nom de l'Élève *</label>
                    <input type="text" className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="ex: KOUASSI" />
                  </div>
                  <div>
                    <label className="form-label">Prénom(s) *</label>
                    <input type="text" className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="ex: Jean-Philippe" />
                  </div>
                  <div>
                    <label className="form-label">Classe d'Affectation *</label>
                    <select className="form-select" value={form.grade || GRADES[0]} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Genre *</label>
                    <select className="form-select" value={form.gender || 'Masculin'} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="Masculin">Masculin</option>
                      <option value="Féminin">Féminin</option>
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    <label className="form-label">Nom du Parent / Responsables Légaux</label>
                    <input type="text" className="form-input" value={parentQuery} onChange={(e) => handleParentSearch(e.target.value)} placeholder="Taper le nom du parent..." />
                    {parentSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: 68, left: 0, right: 0, zIndex: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'var(--shadow-md)' }}>
                        {parentSuggestions.map((p) => (
                          <div key={p.id} onClick={() => selectParent(p)} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.8125rem' }}>
                            <strong>{p.lastName} {p.firstName}</strong> ({p.phonePrimary})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Téléphone Principal du Parent</label>
                    <input type="text" className="form-input" value={form.parentPhone || ''} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="ex: +225 07 00 00 00 00" />
                  </div>
                  <div>
                    <label className="form-label">Adresse Domicile</label>
                    <input type="text" className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ex: Cocody Angré" />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Résumé de la Saisie</h5>
                  <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Élève :</strong> {form.lastName} {form.firstName}</div>
                    <div><strong>Classe :</strong> {form.grade}</div>
                    <div><strong>Genre :</strong> {form.gender}</div>
                    <div><strong>Parent :</strong> {form.parentName || 'Non lié'}</div>
                    <div><strong>Téléphone :</strong> {form.parentPhone || '—'}</div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Inscription Validée !</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>Le dossier élève a été enregistré avec succès.</p>
                </div>
              )}
            </div>

            {/* Footer Navigation Wizard */}
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              {wizardStep > 1 && wizardStep < 4 ? (
                <button className="btn btn-outline" onClick={() => setWizardStep((prev) => (prev - 1) as any)}>Précédent</button>
              ) : <div />}

              {wizardStep < 3 ? (
                <button className="btn btn-primary" onClick={() => setWizardStep((prev) => (prev + 1) as any)}>Suivant</button>
              ) : wizardStep === 3 ? (
                <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Valider & Inscrire'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowAddModal(false)}>Fermer</button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
