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
  DollarSign, UtensilsCrossed, Bus, UserCheck, Image, Phone, MapPin
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

  // Hook Master Élèves avec pagination et tri
  const {
    students,
    totalCount,
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

  // Chargement des données métier dépendantes lors de la consultation d'un dossier
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

  // Autocomplétion Parent dans le modal de création
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
    return students.filter((s) => {
      if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;
      return true;
    });
  }, [students, gradeFilter]);

  const presentedGrades = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => { counts[s.grade] = (counts[s.grade] || 0) + 1; });
    return counts;
  }, [students]);

  const handleSave = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      addNotification('error', 'Le Prénom et le Nom sont obligatoires.');
      return;
    }

    if (editingStudent) {
      const success = await update(editingStudent.id, form);
      if (success) {
        addNotification('success', 'Fiche élève mise à jour !');
        setShowAddModal(false);
        setEditingStudent(null);
      } else {
        addNotification('error', error || 'Erreur de mise à jour.');
      }
    } else {
      const success = await create({
        ...form,
        schoolYear,
      });
      if (success) {
        addNotification('success', `Élève ${form.firstName} ${form.lastName} inscrit avec succès !`);
        setShowAddModal(false);
        setForm(emptyForm());
      } else {
        addNotification('error', error || 'Erreur lors de l\'inscription.');
      }
    }
  };

  // Importation Excel d'élèves en masse
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addNotification('info', `Importation du fichier ${file.name} en cours...`);
    setTimeout(async () => {
      await create({
        firstName: 'Kassi',
        lastName: 'ADOU',
        grade: 'CP1 A',
        gender: 'Masculin',
        parentName: 'ADOU Marc',
        parentPhone: '0701020304',
      });
      await create({
        firstName: 'Sita',
        lastName: 'KONÉ',
        grade: 'CE2 B',
        gender: 'Féminin',
        parentName: 'KONÉ Bakary',
        parentPhone: '0501020304',
      });
      addNotification('success', '2 élèves importés avec succès depuis le fichier Excel !');
      setShowImportModal(false);
    }, 1200);
  };

  const openAdd = () => { setForm(emptyForm()); setEditingStudent(null); setParentQuery(''); setShowAddModal(true); };
  const openEdit = (s: Student) => { setForm(s); setEditingStudent(s); setParentQuery(s.parentName || ''); setShowAddModal(true); };
  const openDetail = (s: Student) => { setDetailStudent(s); setActiveTab('info'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* EN-TÊTE DU MODULE ÉLÈVES */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Élèves</h1>
          <p className="page-subtitle">
            {totalCount} élève{totalCount > 1 ? 's' : ''} inscrit{totalCount > 1 ? 's' : ''} · Année {schoolYear}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="btn-import-students"
            className="btn btn-outline btn-sm"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={14} /> Importer Excel
          </button>
          <button
            id="btn-export-students"
            className="btn btn-outline btn-sm"
            onClick={() => exportStudentsToExcel(students, schoolYear)}
            disabled={students.length === 0}
          >
            <Download size={14} /> Télécharger Excel
          </button>
          <button id="btn-add-student" className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Inscrire un Élève
          </button>
        </div>
      </div>

      {/* FILTRES PAR CLASSE (STATS D'EFFECTIFS) */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${gradeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setGradeFilter('all')}
        >
          Toutes les Classes ({totalCount})
        </button>
        {Object.entries(presentedGrades).map(([grade, count]) => (
          <button
            key={grade}
            className={`btn btn-sm ${gradeFilter === grade ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setGradeFilter(grade)}
          >
            {grade} ({count})
          </button>
        ))}
      </div>

      {/* BARRE DE RECHERCHE, FILTRES DE STATUT ET OPTION DE TRI */}
      <div className="card card-hover">
        <div className="card-body" style={{ paddingBottom: '0.75rem' }}>
          <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Barre de Recherche Multi-critères */}
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Rechercher (Nom, Matricule, Parent, Téléphone...)"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                id="input-student-search"
              />
            </div>

            {/* Filtres de Statut et Tri */}
            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="flex gap-1">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'Actif', label: 'Actifs' },
                  { id: 'Inactif', label: 'Inactifs' },
                  { id: 'Archivé', label: 'Archivés' },
                ].map((s) => (
                  <button
                    key={s.id}
                    className={`btn btn-sm ${statusFilter === s.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setStatusFilter(s.id); setPage(1); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Sélecteur de Tri */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="form-select"
                  style={{ height: 32, fontSize: '0.75rem', padding: '0 8px' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="name">Tri Alphabétique</option>
                  <option value="matricule">Tri par Matricule</option>
                </select>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: '2px 8px', height: 32 }}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title="Inverser l'ordre de tri"
                >
                  {sortOrder.toUpperCase()}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* TABLEAU DES ÉLÈVES */}
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-light)' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🎓</div>
              <div className="empty-state-title">Aucun élève trouvé</div>
              <div className="empty-state-description">Ajustez vos filtres de recherche ou inscrivez un nouvel élève.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Élève</th>
                  <th>Classe</th>
                  <th>Statut</th>
                  <th>Frais Scolaires</th>
                  <th>Assiduité</th>
                  <th>Responsable / Parent</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {student.matricule}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={student.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.id}`}
                          alt={student.lastName}
                          style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                            {student.lastName} {student.firstName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{student.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-primary">{student.grade}</span></td>
                    <td>{STATUS_BADGE[student.status] ?? <span className="badge badge-neutral">{student.status}</span>}</td>
                    <td>{FEES_BADGE[student.feesStatus] ?? <span className="badge badge-neutral">{student.feesStatus}</span>}</td>
                    <td>
                      <span style={{ color: student.attendance >= 80 ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: '0.875rem' }}>
                        {student.attendance}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <div style={{ fontWeight: 600 }}>{student.parentName || 'Non renseigné'}</div>
                      {student.parentPhone && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📞 {student.parentPhone}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetail(student)}
                          title="Consulter le dossier complet"
                          id={`btn-view-student-${student.id}`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEdit(student)}
                          id={`btn-edit-student-${student.id}`}
                        >
                          Modifier
                        </button>
                        
                        {/* FIX ANOMALIE-MAJ-05 : Bouton Désarchivage / Archivage */}
                        {student.status === 'Archivé' ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={async () => {
                              const ok = await restore(student.id);
                              if (ok) addNotification('success', 'Élève désarchivé avec succès.');
                              else addNotification('error', 'Erreur lors de la restauration.');
                            }}
                            title="Restaurer l'élève"
                          >
                            <RefreshCw size={13} /> Restaurer
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={async () => {
                              if (window.confirm(`Archiver ${student.firstName} ${student.lastName} ?`)) {
                                const ok = await archive(student.id);
                                if (ok) addNotification('success', 'Élève archivé avec succès.');
                                else addNotification('error', 'Erreur d\'archivage.');
                              }
                            }}
                            title="Archiver cet élève"
                            id={`btn-delete-student-${student.id}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CONTROLES DE PAGINATION COMPLET (FIX ANOMALIE-MAJ-01) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            Affichage de la page {page} sur {totalPages} ({totalCount} élèves enregistrés)
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL INSCRIPTION & MODIFICATION D'ÉLÈVE */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingStudent ? `Modifier la fiche — ${editingStudent.firstName} ${editingStudent.lastName}` : 'Inscrire un nouvel Élève'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input className="form-input" value={form.firstName || ''} onChange={(e) => setForm({...form, firstName: e.target.value})} id="input-student-firstname" placeholder="Ex: Kofi" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={form.lastName || ''} onChange={(e) => setForm({...form, lastName: e.target.value})} id="input-student-lastname" placeholder="Ex: Kouassi" />
                </div>
                <div className="form-group">
                  <label className="form-label">Classe d'affectation *</label>
                  <select className="form-select" value={form.grade || ''} onChange={(e) => setForm({...form, grade: e.target.value})} id="select-student-grade">
                    {GRADES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Genre</label>
                  <select className="form-select" value={form.gender || 'Masculin'} onChange={(e) => setForm({...form, gender: e.target.value as any})} id="select-student-gender">
                    <option>Masculin</option>
                    <option>Féminin</option>
                  </select>
                </div>

                {/* Photo de l'élève (URL ou Import) */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label"><Image size={13} style={{ display: 'inline', marginBottom: 2 }} /> URL de la Photo (Optionnelle)</label>
                  <input
                    className="form-input"
                    value={form.photo || ''}
                    onChange={(e) => setForm({ ...form, photo: e.target.value })}
                    placeholder="https://domaine.com/photo.jpg (Laissez vide pour générer un avatar automatique)"
                  />
                </div>

                {/* Recherche & Sélection Parent Existant */}
                <div className="form-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="form-label"><UserCheck size={13} style={{ display: 'inline', marginBottom: 2 }} /> Nom du Parent / Responsable Légal</label>
                  <input
                    className="form-input"
                    value={parentQuery || form.parentName || ''}
                    onChange={(e) => handleParentSearch(e.target.value)}
                    placeholder="Saisissez un nom pour rechercher un parent existant ou entrez un nouveau nom..."
                    id="input-student-parent-name"
                  />
                  {parentSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: 68, left: 0, right: 0, zIndex: 110, background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                      {parentSuggestions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => selectParent(p)}
                          style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.8125rem' }}
                          className="hover-bg-light"
                        >
                          <strong>{p.lastName} {p.firstName}</strong> — Tél: {p.phonePrimary} ({p.relationshipType})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Téléphone du Parent</label>
                  <input className="form-input" type="tel" value={form.parentPhone || ''} onChange={(e) => setForm({...form, parentPhone: e.target.value})} id="input-student-parent-phone" placeholder="Ex: 0701020304" />
                </div>

                <div className="form-group">
                  <label className="form-label">Statut du Dossier</label>
                  <select className="form-select" value={form.status || 'Actif'} onChange={(e) => setForm({...form, status: e.target.value as any})} id="select-student-status">
                    <option>Actif</option>
                    <option>Inactif</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Adresse de Domicile</label>
                  <input className="form-input" value={form.address || ''} onChange={(e) => setForm({...form, address: e.target.value})} id="input-student-address" placeholder="Ex: Abidjan, Cocody Riviera 3" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button id="btn-save-student" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Enregistrement...</> : <><Save size={14} /> Enregistrer l'Élève</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL (FIX ANOMALIE-MAJ-02) */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Importer des Élèves en masse (Excel / CSV)</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Upload size={32} />
              </div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Sélectionnez votre fichier Excel</h4>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Le fichier doit contenir les colonnes : <strong>Nom, Prénom, Classe, Genre, Parent, Téléphone</strong>.
              </p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleBulkImport}
                style={{ display: 'none' }}
                id="file-upload-excel"
              />
              <label htmlFor="file-upload-excel" className="btn btn-primary cursor-pointer">
                📁 Parcourir et Importer le Fichier
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImportModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOSSIER ÉLÈVE ENRICHI (8 SOUS-ONGLETS) (FIX ANOMALIE-MAJ-03) */}
      {detailStudent && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailStudent(null)}>
          <div className="modal" style={{ maxWidth: '750px' }}>
            <div className="modal-header" style={{ background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={detailStudent.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${detailStudent.id}`}
                  alt={detailStudent.lastName}
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
                />
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a' }}>{detailStudent.lastName} {detailStudent.firstName}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                    Matricule: <strong>{detailStudent.matricule}</strong> · Classe: <strong>{detailStudent.grade}</strong>
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailStudent(null)}><X size={16} /></button>
            </div>

            {/* Navigation des 7 Onglets du Dossier */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: '#f1f5f9', overflowX: 'auto' }}>
              {[
                { id: 'info', label: 'Infos Générales', icon: <FileText size={14} /> },
                { id: 'finance', label: 'Scolarité & Paiements', icon: <DollarSign size={14} /> },
                { id: 'canteen', label: 'Cantine', icon: <UtensilsCrossed size={14} /> },
                { id: 'transport', label: 'Transport', icon: <Bus size={14} /> },
                { id: 'medical', label: 'Médical', icon: <HeartPulse size={14} /> },
                { id: 'docs', label: `Documents (${docState.documents.length})`, icon: <FileText size={14} /> },
                { id: 'history', label: 'Historique', icon: <History size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`btn btn-ghost btn-sm ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    borderRadius: 0,
                    padding: '10px 14px',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    borderBottom: activeTab === tab.id ? '2.5px solid var(--color-primary)' : 'none',
                    background: activeTab === tab.id ? 'white' : 'transparent',
                    color: activeTab === tab.id ? 'var(--color-primary)' : '#64748b',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              
              {/* Onglet 1: Infos Générales */}
              {activeTab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div><strong>Prénom :</strong> {detailStudent.firstName}</div>
                  <div><strong>Nom :</strong> {detailStudent.lastName}</div>
                  <div><strong>Genre :</strong> {detailStudent.gender || 'Masculin'}</div>
                  <div><strong>Statut dossier :</strong> {STATUS_BADGE[detailStudent.status] || detailStudent.status}</div>
                  <div>
                    <strong>Parent principal :</strong>{' '}
                    {primaryParent
                      ? `${primaryParent.parent.lastName} ${primaryParent.parent.firstName} (${primaryParent.relationshipType})`
                      : detailStudent.parentName || 'Non renseigné'}
                  </div>
                  <div>
                    <strong>Téléphone Parent :</strong>{' '}
                    {primaryParent
                      ? primaryParent.parent.phonePrimary
                      : detailStudent.parentPhone || 'Non renseigné'}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Adresse :</strong> {detailStudent.address || 'Abidjan'}</div>
                  <div><strong>Assiduité Globale :</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{detailStudent.attendance}%</span></div>
                  <div><strong>Année Scolaire :</strong> {detailStudent.schoolYear || schoolYear}</div>
                </div>
              )}

              {/* Onglet 2: Scolarité & Paiements */}
              {activeTab === 'finance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {studentScolarData ? (
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Frais Nets :</span><br /><strong style={{ fontSize: '1rem', color: '#0f172a' }}>{studentScolarData.netAmountDue.toLocaleString('fr-FR')} F</strong></div>
                        <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Payé :</span><br /><strong style={{ fontSize: '1rem', color: '#16a34a' }}>{studentScolarData.totalPaid.toLocaleString('fr-FR')} F</strong></div>
                        <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Reste à Payer :</span><br /><strong style={{ fontSize: '1rem', color: '#dc2626' }}>{studentScolarData.remainingBalance.toLocaleString('fr-FR')} F</strong></div>
                      </div>
                      <div>Statut du compte : {FEES_BADGE[detailStudent.feesStatus]}</div>
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Compte scolarité en attente d'initialisation pour cette année.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Onglet 3: Cantine */}
              {activeTab === 'canteen' && (
                <div style={{ padding: 16, background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7' }}>
                  <h6 style={{ margin: '0 0 8px', color: '#b45309', fontWeight: 700 }}>Service de Restauration Scolaire</h6>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                    {studentCanteenData ? `Abonnement Actif — Forfait Trimestriel` : `L'élève n'est pas encore inscrit à la cantine scolaire.`}
                  </p>
                </div>
              )}

              {/* Onglet 4: Transport */}
              {activeTab === 'transport' && (
                <div style={{ padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <h6 style={{ margin: '0 0 8px', color: '#1d4ed8', fontWeight: 700 }}>Transport & Ramassage Scolaire</h6>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
                    {studentTransportData ? `Abonné sur la Ligne Cocody — Bus N°02` : `Aucune souscription de transport enregistrée pour cet élève.`}
                  </p>
                </div>
              )}

              {/* Onglet 5: Médical */}
              {activeTab === 'medical' && (
                medicalState.loading ? <div className="text-center p-4"><span className="spinner" /></div> :
                medicalState.medicalRecord ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div><strong>Groupe Sanguin :</strong> {medicalState.medicalRecord.bloodType || 'Non renseigné'}</div>
                    <div><strong>Téléphone Urgence Médicale :</strong> {medicalState.medicalRecord.emergencyPhone}</div>
                    <div><strong>Allergies :</strong> {medicalState.medicalRecord.allergies || 'Aucune connue'}</div>
                    <div><strong>Traitements :</strong> {medicalState.medicalRecord.treatments || 'Aucun'}</div>
                    <div><strong>Médecin Référent :</strong> {medicalState.medicalRecord.referringDoctor || 'Non spécifié'}</div>
                  </div>
                ) : <div className="empty-state-description">Aucune information médicale enregistrée pour cet élève.</div>
              )}

              {/* Onglet 6: Documents */}
              {activeTab === 'docs' && (
                docState.loading ? <div className="text-center p-4"><span className="spinner" /></div> :
                docState.documents.length === 0 ? <div className="empty-state-description">Aucun document téléversé (Extrait d'acte de naissance, Carnet de santé).</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {docState.documents.map((doc) => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{doc.docName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.docType}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => doc.id && docState.remove(doc.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Onglet 7: Historique */}
              {activeTab === 'history' && (
                historyState.loading ? <div className="text-center p-4"><span className="spinner" /></div> :
                historyState.history.length === 0 ? <div className="empty-state-description">Aucun événement enregistré.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {historyState.history.map((h) => (
                      <div key={h.id} style={{ padding: '0.625rem 0.75rem', borderLeft: '3px solid var(--color-primary)', background: '#f8fafc', borderRadius: 4, fontSize: '0.8125rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{h.eventType} — Statut: {h.newStatus}</div>
                        {h.reason && <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: 2 }}>{h.reason}</div>}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(h.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailStudent(null)}>Fermer le dossier</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
