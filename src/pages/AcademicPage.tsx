// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Page Structure Académique (src/pages/AcademicPage.tsx)
// Interface de gestion des Années Scolaires, Cycles, Niveaux, Classes & Affectations
// Entièrement connectée aux Hooks du module Structure Académique
// Architecture : UI -> Hook -> Service -> Supabase -> Database
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import {
  useAcademicYears,
  useAcademicYear,
  useSchoolCycles,
  useSchoolLevels,
  useClassrooms,
  useClassroom,
  useStudentAssignments,
  useStudentAssignment,
} from '../hooks/academic';
import { AcademicYear } from '../services/academic/academicYearsService';
import { SchoolCycle } from '../services/academic/schoolCyclesService';
import { SchoolLevel } from '../services/academic/schoolLevelsService';
import { Classroom } from '../services/academic/classroomsService';
import { StudentAssignment } from '../services/academic/studentAssignmentsService';
import { getStaffMembers } from '../services/staff/staffService';
import { downloadExcel } from '../utils/exportUtils';
import {
  BookOpen, Calendar, Layers, GraduationCap, Users, Search, Plus, Edit2,
  Trash2, RotateCcw, X, Save, CheckCircle, AlertCircle, RefreshCw, Eye,
  ArrowRightLeft, ChevronLeft, ChevronRight, School, Building, Download, FileText, Clock, UserCheck
} from 'lucide-react';

const STATUS_BADGES: Record<string, React.ReactNode> = {
  Active: <span className="badge badge-success">Active</span>,
  Préparation: <span className="badge badge-neutral">Préparation</span>,
  Clôturée: <span className="badge badge-warning">Clôturée</span>,
  Actif: <span className="badge badge-success">Actif</span>,
  Transféré: <span className="badge badge-neutral">Transféré</span>,
  Archivé: <span className="badge badge-warning">Archivé</span>,
};

// Liste des matières et coefficients par niveau
const SUBJECTS_BY_LEVEL: Record<string, { code: string; name: string; coef: number }[]> = {
  DEFAULT: [
    { code: 'FR', name: 'Français & Expression Écrite', coef: 4 },
    { code: 'MATH', name: 'Mathématiques & Calcul', coef: 4 },
    { code: 'EDHC', name: 'Éducation aux Droits de l\'Homme', coef: 2 },
    { code: 'ST', name: 'Sciences & Technologies', coef: 2 },
    { code: 'HG', name: 'Histoire & Géographie', coef: 2 },
    { code: 'EPS', name: 'Éducation Physique & Sportive', coef: 1 },
  ],
};

interface AcademicPageProps {
  onNavigate?: (view: string) => void;
}

export default function AcademicPage({ onNavigate }: AcademicPageProps) {
  const { addNotification } = useToast();

  const [activeTab, setActiveTab] = useState<'CLASSES' | 'YEARS' | 'LEVELS' | 'ASSIGNMENTS'>('CLASSES');

  // ─── HOOKS ──────────────────────────────────────────────────────────────────
  const yearsHook = useAcademicYears();
  const cyclesHook = useSchoolCycles();
  const levelsHook = useSchoolLevels();
  const classroomsHook = useClassrooms({ pageSize: 15 });
  const assignmentsHook = useStudentAssignments();

  // Liste des enseignants pour l'affectation du titulaire
  const [teachersList, setTeachersList] = useState<any[]>([]);

  useEffect(() => {
    getStaffMembers({ role: 'ENSEIGNANT' }).then((res) => {
      if (res.success && res.data) {
        setTeachersList(res.data.staffMembers);
      }
    });
  }, []);

  // ─── ÉTATS MODAUX & FORMULAIRES ─────────────────────────────────────────────
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [classForm, setClassForm] = useState<Partial<Classroom>>({
    name: '',
    academicYearId: '',
    levelId: '',
    roomName: '',
    mainTeacherId: '',
    mainTeacherName: '',
    capacity: 35,
    isActive: true,
  });

  const [showYearModal, setShowYearModal] = useState<boolean>(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearForm, setYearForm] = useState<Partial<AcademicYear>>({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    status: 'Préparation',
  });

  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);
  const [editingLevel, setEditingLevel] = useState<SchoolLevel | null>(null);
  const [levelForm, setLevelForm] = useState<Partial<SchoolLevel>>({
    name: '',
    code: '',
    shortName: '',
    cycleId: '',
    sortOrder: 1,
    isActive: true,
  });

  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    classroomId: '',
    academicYearId: '',
    assignmentDate: new Date().toISOString().split('T')[0],
    isTransfer: false,
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectedClassHook = useClassroom(selectedClassId || undefined);

  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleSaveClassroom = async () => {
    if (!classForm.name?.trim() || !classForm.academicYearId || !classForm.levelId) {
      addNotification('error', 'Le nom de la classe, l\'année scolaire et le niveau sont obligatoires.');
      return;
    }

    if (editingClass) {
      const ok = await classroomsHook.updateClassroom(editingClass.id, classForm);
      if (ok) {
        addNotification('success', 'Classe mise à jour avec succès.');
        setShowClassModal(false);
      } else {
        addNotification('error', classroomsHook.error || 'Erreur lors de la mise à jour.');
      }
    } else {
      const ok = await classroomsHook.createClassroom(classForm);
      if (ok) {
        addNotification('success', 'Classe créée avec succès.');
        setShowClassModal(false);
      } else {
        addNotification('error', classroomsHook.error || 'Erreur lors de la création.');
      }
    }
  };

  const handleSaveYear = async () => {
    if (!yearForm.name?.trim() || !yearForm.startDate || !yearForm.endDate) {
      addNotification('error', 'Le libellé, la date de début et la date de fin sont obligatoires.');
      return;
    }

    if (editingYear) {
      const ok = await yearsHook.update(editingYear.id, yearForm);
      if (ok) {
        addNotification('success', 'Année scolaire mise à jour.');
        setShowYearModal(false);
      } else {
        addNotification('error', yearsHook.error || 'Erreur de mise à jour.');
      }
    } else {
      const ok = await yearsHook.create(yearForm);
      if (ok) {
        addNotification('success', 'Année scolaire créée avec succès.');
        setShowYearModal(false);
      } else {
        addNotification('error', yearsHook.error || 'Erreur de création.');
      }
    }
  };

  const handleSaveLevel = async () => {
    if (!levelForm.name?.trim() || !levelForm.cycleId) {
      addNotification('error', 'Le cycle et le nom du niveau sont obligatoires.');
      return;
    }

    if (editingLevel) {
      const ok = await levelsHook.updateLevel(editingLevel.id, levelForm);
      if (ok) {
        addNotification('success', 'Niveau mis à jour.');
        setShowLevelModal(false);
      } else {
        addNotification('error', levelsHook.error || 'Erreur de mise à jour.');
      }
    } else {
      const ok = await levelsHook.createLevel(levelForm);
      if (ok) {
        addNotification('success', 'Niveau créé avec succès.');
        setShowLevelModal(false);
      } else {
        addNotification('error', levelsHook.error || 'Erreur de création.');
      }
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignForm.studentId?.trim() || !assignForm.classroomId || !assignForm.academicYearId) {
      addNotification('error', 'Veuillez saisir l\'ID élève, la classe et l\'année scolaire.');
      return;
    }

    if (assignForm.isTransfer) {
      const ok = await assignmentsHook.transferStudent(
        assignForm.studentId.trim(),
        assignForm.classroomId,
        assignForm.academicYearId,
        assignForm.assignmentDate
      );
      if (ok) {
        addNotification('success', 'Élève transféré vers la nouvelle classe.');
        setShowAssignModal(false);
      } else {
        addNotification('error', assignmentsHook.error || 'Erreur lors du transfert.');
      }
    } else {
      const ok = await assignmentsHook.assignStudent(
        assignForm.studentId.trim(),
        assignForm.classroomId,
        assignForm.academicYearId,
        assignForm.assignmentDate
      );
      if (ok) {
        addNotification('success', 'Élève affecté avec succès.');
        setShowAssignModal(false);
      } else {
        addNotification('error', assignmentsHook.error || 'Erreur lors de l\'affectation.');
      }
    }
  };

  // Exportation Excel de la liste de la classe
  const exportClassToExcel = (cls: Classroom) => {
    const classAssignments = assignmentsHook.assignments.filter((a) => a.classroomId === cls.id && a.status === 'Actif');
    const data = classAssignments.map((a, index) => ({
      'N°': index + 1,
      'Identifiant Élève': a.studentId,
      'Classe': cls.name,
      'Date d\'affectation': a.assignmentDate,
      'Statut': a.status,
    }));

    downloadExcel(data, `Classe_${cls.name}`, `GESCO_Liste_${cls.name}_2026-2027`);
  };

  return (
    <div className="gesco-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* EN-TÊTE PAGE */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Structure Académique & Classes</h1>
          <p className="page-subtitle">
            Gestion des Années Scolaires, Cycles, Niveaux, Classes et Affectations d'Élèves
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              classroomsHook.refresh();
              yearsHook.refresh();
              cyclesHook.refresh();
              levelsHook.refresh();
              assignmentsHook.refresh();
            }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>

          {activeTab === 'CLASSES' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingClass(null);
                setClassForm({
                  name: '',
                  academicYearId: yearsHook.currentAcademicYear?.id || 'ay-2026',
                  levelId: levelsHook.levels[0]?.id || 'lvl-cp1',
                  roomName: '',
                  mainTeacherId: '',
                  mainTeacherName: 'Enseignant non désigné',
                  capacity: 35,
                  isActive: true,
                });
                setShowClassModal(true);
              }}
            >
              <Plus size={14} /> Ajouter une Classe
            </button>
          )}

          {activeTab === 'YEARS' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingYear(null);
                setYearForm({
                  name: '',
                  startDate: '',
                  endDate: '',
                  isCurrent: false,
                  status: 'Préparation',
                });
                setShowYearModal(true);
              }}
            >
              <Plus size={14} /> Nouvelle Année Scolaire
            </button>
          )}

          {activeTab === 'LEVELS' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingLevel(null);
                setLevelForm({
                  name: '',
                  code: '',
                  shortName: '',
                  cycleId: cyclesHook.cycles[0]?.id || '',
                  sortOrder: levelsHook.levels.length + 1,
                  isActive: true,
                });
                setShowLevelModal(true);
              }}
            >
              <Plus size={14} /> Ajouter un Niveau
            </button>
          )}

          {activeTab === 'ASSIGNMENTS' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setAssignForm({
                  studentId: '',
                  classroomId: classroomsHook.classrooms[0]?.id || '',
                  academicYearId: yearsHook.currentAcademicYear?.id || 'ay-2026',
                  assignmentDate: new Date().toISOString().split('T')[0],
                  isTransfer: false,
                });
                setShowAssignModal(true);
              }}
            >
              <Plus size={14} /> Nouvelle Affectation
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION ONGLET */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
        <button
          className={`btn btn-sm ${activeTab === 'CLASSES' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('CLASSES')}
        >
          <BookOpen size={14} /> Classes ({classroomsHook.totalCount})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'YEARS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('YEARS')}
        >
          <Calendar size={14} /> Années Scolaires ({yearsHook.academicYears.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'LEVELS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('LEVELS')}
        >
          <Layers size={14} /> Cycles & Niveaux ({levelsHook.levels.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'ASSIGNMENTS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('ASSIGNMENTS')}
        >
          <GraduationCap size={14} /> Affectations Élèves ({assignmentsHook.assignments.length})
        </button>
      </div>

      {/* CONTENU ONGLET 1 : CLASSES */}
      {activeTab === 'CLASSES' && (
        <>
          <div className="card card-hover">
            <div className="card-body" style={{ paddingBottom: '0.75rem' }}>
              <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 240px', position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher une classe (CP1 A, CM2, Salle, Titulaire...)"
                    style={{ paddingLeft: '2.25rem' }}
                    value={classroomsHook.searchQuery}
                    onChange={(e) => {
                      classroomsHook.setSearchQuery(e.target.value);
                      classroomsHook.setPage(1);
                    }}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ width: 180 }}
                  value={classroomsHook.academicYearFilter || ''}
                  onChange={(e) => {
                    classroomsHook.setAcademicYearFilter(e.target.value || undefined);
                    classroomsHook.setPage(1);
                  }}
                >
                  <option value="">Toutes les années</option>
                  {yearsHook.academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Courante)' : ''}</option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{ width: 180 }}
                  value={classroomsHook.levelFilter || ''}
                  onChange={(e) => {
                    classroomsHook.setLevelFilter(e.target.value || undefined);
                    classroomsHook.setPage(1);
                  }}
                >
                  <option value="">Tous les niveaux</option>
                  {levelsHook.rawLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tableau des Classes */}
            <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-light)' }}>
              {classroomsHook.loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
              ) : classroomsHook.classrooms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏫</div>
                  <div className="empty-state-title">Aucune classe enregistrée</div>
                  <div className="empty-state-description">Créez votre première classe en cliquant sur "Ajouter une Classe".</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nom de la Classe</th>
                      <th>Niveau</th>
                      <th>Enseignant Titulaire</th>
                      <th>Salle</th>
                      <th>Effectif / Capacité</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classroomsHook.classrooms.map((cls) => {
                      const levelObj = levelsHook.rawLevels.find((l) => l.id === cls.levelId);
                      const assignedCount = assignmentsHook.assignments.filter(
                        (a) => a.classroomId === cls.id && a.status === 'Actif'
                      ).length;
                      const remainingSeats = Math.max(0, cls.capacity - assignedCount);
                      const isFull = assignedCount >= cls.capacity;

                      return (
                        <tr key={cls.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{cls.name}</td>
                          <td><span className="badge badge-neutral">{levelObj?.name || cls.levelId}</span></td>
                          
                          {/* FIX ANOMALIE-MAJ-01 : Titulaire de classe */}
                          <td style={{ fontSize: '0.8125rem' }}>
                            <span style={{ fontWeight: 600, color: '#2563eb' }}>
                              👤 {cls.mainTeacherName || 'Enseignant non désigné'}
                            </span>
                          </td>

                          <td style={{ fontSize: '0.8125rem' }}>{cls.roomName || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{assignedCount} / {cls.capacity} élèves</span>
                              <span style={{ fontSize: '0.725rem', color: isFull ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                                {isFull ? '⚠️ Capacité atteinte' : `${remainingSeats} places disponibles`}
                              </span>
                            </div>
                          </td>
                          <td>{cls.isActive ? STATUS_BADGES.Actif : STATUS_BADGES.Archivé}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Fiche détaillée & Matières"
                                onClick={() => setSelectedClassId(cls.id)}
                              >
                                <Eye size={14} color="#2563eb" />
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setEditingClass(cls);
                                  setClassForm(cls);
                                  setShowClassModal(true);
                                }}
                              >
                                Modifier
                              </button>
                              {cls.isActive ? (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--color-danger)' }}
                                  onClick={async () => {
                                    if (window.confirm(`Archiver la classe ${cls.name} ?`)) {
                                      const ok = await classroomsHook.archiveClassroom(cls.id);
                                      if (ok) addNotification('success', 'Classe archivée.');
                                    }
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--color-success)' }}
                                  onClick={async () => {
                                    const ok = await classroomsHook.restoreClassroom(cls.id);
                                    if (ok) addNotification('success', 'Classe restaurée.');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {classroomsHook.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Page {classroomsHook.page} sur {classroomsHook.totalPages} ({classroomsHook.totalCount} classes)
                </span>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" disabled={classroomsHook.page <= 1} onClick={() => classroomsHook.setPage(classroomsHook.page - 1)}>
                    <ChevronLeft size={14} /> Précédent
                  </button>
                  <button className="btn btn-outline btn-sm" disabled={classroomsHook.page >= classroomsHook.totalPages} onClick={() => classroomsHook.setPage(classroomsHook.page + 1)}>
                    Suivant <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* CONTENU ONGLET 2, 3 ET 4 */}
      {activeTab === 'YEARS' && (
        <div className="card">
          <div className="card-body">
            <h3>Années Scolaires</h3>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {yearsHook.academicYears.map((y) => (
                  <tr key={y.id}>
                    <td style={{ fontWeight: 700 }}>{y.name}</td>
                    <td>{y.startDate}</td>
                    <td>{y.endDate}</td>
                    <td>{y.isCurrent ? <span className="badge badge-success">Active (Courante)</span> : <span className="badge badge-neutral">{y.status}</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditingYear(y); setYearForm(y); setShowYearModal(true); }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LEVELS' && (
        <div className="card">
          <div className="card-body">
            <h3>Cycles et Niveaux</h3>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Ordre</th>
                  <th>Code</th>
                  <th>Nom du Niveau</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {levelsHook.levels.map((l) => (
                  <tr key={l.id}>
                    <td>#{l.sortOrder}</td>
                    <td style={{ fontWeight: 700 }}>{l.code}</td>
                    <td>{l.name}</td>
                    <td><span className="badge badge-success">Actif</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ASSIGNMENTS' && (
        <div className="card">
          <div className="card-body">
            <h3>Registre des Affectations Élèves</h3>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Classe</th>
                  <th>Date d'affectation</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsHook.assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>{a.studentId}</td>
                    <td>{a.classroomId}</td>
                    <td>{a.assignmentDate}</td>
                    <td><span className="badge badge-success">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / MODIFICATION CLASSE (FIX ANOMALIE-MAJ-01) */}
      {showClassModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowClassModal(false)}>
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>{editingClass ? `Modifier la classe ${editingClass.name}` : 'Ajouter une nouvelle Classe'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowClassModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nom de la Classe *</label>
                <input className="form-input" value={classForm.name || ''} onChange={(e) => setClassForm({...classForm, name: e.target.value})} placeholder="Ex: CP1 A" />
              </div>
              <div className="form-group">
                <label className="form-label">Niveau Scolaire *</label>
                <select className="form-select" value={classForm.levelId || ''} onChange={(e) => setClassForm({...classForm, levelId: e.target.value})}>
                  {levelsHook.rawLevels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name} ({lvl.code})</option>)}
                </select>
              </div>

              {/* Sélection Enseignant Titulaire */}
              <div className="form-group">
                <label className="form-label"><UserCheck size={13} style={{ display: 'inline', marginBottom: 2 }} /> Enseignant Principal / Titulaire</label>
                <select
                  className="form-select"
                  value={classForm.mainTeacherId || ''}
                  onChange={(e) => {
                    const found = teachersList.find((t) => t.id === e.target.value);
                    setClassForm({
                      ...classForm,
                      mainTeacherId: e.target.value,
                      mainTeacherName: found ? `${found.lastName} ${found.firstName}` : 'Enseignant non désigné',
                    });
                  }}
                >
                  <option value="">-- Non désigné --</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>{t.lastName} {t.firstName} ({t.specialty || 'Général'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Salle de classe (optionnel)</label>
                <input className="form-input" value={classForm.roomName || ''} onChange={(e) => setClassForm({...classForm, roomName: e.target.value})} placeholder="Ex: Salle 101" />
              </div>
              <div className="form-group">
                <label className="form-label">Capacité maximale (élèves)</label>
                <input className="form-input" type="number" value={classForm.capacity || 35} onChange={(e) => setClassForm({...classForm, capacity: Number(e.target.value)})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowClassModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveClassroom} disabled={classroomsHook.saving}>
                <Save size={14} /> Enregistrer la classe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE DÉTAILLÉE DE LA CLASSE + MATIÈRES & EXPORT (FIX ANOMALIE-MAJ-04 & 05 & MIN-01) */}
      {selectedClassId && selectedClassHook.classroom && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedClassId(null)}>
          <div className="modal" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Fiche Classe — {selectedClassHook.classroom.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Salle: <strong>{selectedClassHook.classroom.roomName || 'Non assignée'}</strong> · Titulaire: <strong>{selectedClassHook.classroom.mainTeacherName || 'Non désigné'}</strong>
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClassId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Boutons Raccourcis Export & Emploi du temps */}
              <div className="flex gap-2" style={{ justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportClassToExcel(selectedClassHook.classroom!)}
                  >
                    <Download size={13} /> Liste Excel
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => window.print()}
                  >
                    <FileText size={13} /> Imprimer Registre (PDF)
                  </button>
                </div>
                {onNavigate && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setSelectedClassId(null); onNavigate('TIMETABLE'); }}
                  >
                    <Clock size={13} /> Emploi du Temps
                  </button>
                )}
              </div>

              {/* Matières & Coefficients du Niveau */}
              <div>
                <h5 style={{ margin: '0 0 8px', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                  Matières & Coefficients (Programme Officiel du Niveau)
                </h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#f1f5f9' }}>
                      <tr>
                        <th style={{ fontSize: '0.75rem' }}>Code</th>
                        <th style={{ fontSize: '0.75rem' }}>Intitulé de la Matière</th>
                        <th style={{ fontSize: '0.75rem', textAlign: 'center' }}>Coefficient</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SUBJECTS_BY_LEVEL.DEFAULT.map((sub) => (
                        <tr key={sub.code}>
                          <td style={{ fontWeight: 700, fontSize: '0.75rem', color: '#2563eb' }}>{sub.code}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{sub.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8125rem' }}>{sub.coef}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedClassId(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANNÉE SCOLAIRE */}
      {showYearModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowYearModal(false)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editingYear ? 'Modifier l\'Année Scolaire' : 'Nouvelle Année Scolaire'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowYearModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Libellé (ex: 2026-2027) *</label>
                <input className="form-input" value={yearForm.name || ''} onChange={(e) => setYearForm({...yearForm, name: e.target.value})} placeholder="2026-2027" />
              </div>
              <div className="form-group">
                <label className="form-label">Date Début *</label>
                <input className="form-input" type="date" value={yearForm.startDate || ''} onChange={(e) => setYearForm({...yearForm, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Date Fin *</label>
                <input className="form-input" type="date" value={yearForm.endDate || ''} onChange={(e) => setYearForm({...yearForm, endDate: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowYearModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveYear} disabled={yearsHook.saving}>
                <Save size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AFFECTATION */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{assignForm.isTransfer ? 'Transférer un Élève' : 'Affecter un Élève dans une Classe'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAssignModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Identifiant ou Matricule Élève *</label>
                <input className="form-input" value={assignForm.studentId || ''} onChange={(e) => setAssignForm({...assignForm, studentId: e.target.value})} placeholder="Ex: MAT-2026-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Classe de destination *</label>
                <select className="form-select" value={assignForm.classroomId || ''} onChange={(e) => setAssignForm({...assignForm, classroomId: e.target.value})}>
                  {classroomsHook.classrooms.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} ({cls.roomName || 'Sans salle'})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveAssignment} disabled={assignmentsHook.saving}>
                <Save size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
