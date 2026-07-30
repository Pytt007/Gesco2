// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Module Structure Académique & Classes (src/pages/AcademicPage.tsx)
// Design System SaaS Premium : Wizard 4 Étapes, Table Unifiée & KPIs
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
  ArrowRightLeft, ChevronLeft, ChevronRight, School, Building, Download, FileText, Clock, UserCheck,
  CheckCircle2
} from 'lucide-react';

const STATUS_BADGES: Record<string, React.ReactNode> = {
  Active: <span className="badge badge-success">Active</span>,
  Préparation: <span className="badge badge-neutral">Préparation</span>,
  Clôturée: <span className="badge badge-warning">Clôturée</span>,
  Actif: <span className="badge badge-success">Actif</span>,
  Transféré: <span className="badge badge-neutral">Transféré</span>,
  Archivé: <span className="badge badge-warning">Archivé</span>,
};

interface AcademicPageProps {
  onNavigate?: (view: string) => void;
}

export default function AcademicPage({ onNavigate }: AcademicPageProps) {
  const { addNotification } = useToast();

  const [activeTab, setActiveTab] = useState<'CLASSES' | 'YEARS' | 'LEVELS' | 'ASSIGNMENTS'>('CLASSES');

  const yearsHook = useAcademicYears();
  const cyclesHook = useSchoolCycles();
  const levelsHook = useSchoolLevels();
  const classroomsHook = useClassrooms({ pageSize: 15 });
  const assignmentsHook = useStudentAssignments();

  const [teachersList, setTeachersList] = useState<any[]>([]);

  useEffect(() => {
    getStaffMembers({ role: 'ENSEIGNANT' }).then((res) => {
      if (res.success && res.data) {
        setTeachersList(res.data.staffMembers);
      }
    });
  }, []);

  // Modales & Forms
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
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

  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassForm({
      name: '',
      academicYearId: yearsHook.years[0]?.id || '',
      levelId: levelsHook.levels[0]?.id || '',
      roomName: '',
      mainTeacherId: '',
      mainTeacherName: '',
      capacity: 35,
      isActive: true,
    });
    setWizardStep(1);
    setShowClassModal(true);
  };

  const handleOpenEditClass = (c: Classroom) => {
    setEditingClass(c);
    setClassForm(c);
    setWizardStep(1);
    setShowClassModal(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name?.trim()) {
      addNotification('error', 'Le nom de la classe est obligatoire.');
      return;
    }

    if (editingClass) {
      const ok = await classroomsHook.update(editingClass.id, classForm);
      if (ok) {
        addNotification('success', 'Classe mise à jour avec succès.');
        setShowClassModal(false);
      }
    } else {
      const created = await classroomsHook.create(classForm);
      if (created) {
        addNotification('success', 'Nouvelle classe créée avec succès.');
        setWizardStep(4);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── HEADER ET STATISTIQUES UNIFIÉS ─────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Structure Académique & Classes
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Organisation des cycles, niveaux, classes, enseignants titulaires et capacités
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleOpenAddClass}>
              <Plus size={16} /> Nouvelle Classe
            </button>
          </div>
        </div>

        {/* CARTES STATISTIQUES CLASSES (STYLE DASHBOARD DYNAMIQUE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Total Classes - Royal Blue */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Global</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Classes</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{classroomsHook.totalCount}</div>
          </div>

          {/* Classes Actives - Émeraude */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Actives</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Classes Actives</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{(classroomsHook.classrooms || []).filter((c) => c.isActive).length}</div>
          </div>

          {/* Capacité Globale - Violet */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Capacité</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Capacité Globale</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>
              {(classroomsHook.classrooms || []).reduce((acc, c) => acc + (c.capacity || 35), 0)} Places
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRE D'ACTIONS & FILTRES UNIFIÉE ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 260 }}>
            <div className="search-bar-wrapper" style={{ flex: 1 }}>
              <Search size={16} className="search-bar-icon" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Rechercher une classe, salle, enseignant..."
                value={classroomsHook.searchQuery}
                onChange={(e) => classroomsHook.setSearchQuery(e.target.value)}
              />
              {classroomsHook.searchQuery && (
                <button className="search-bar-clear" onClick={() => classroomsHook.setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <button className="btn btn-outline btn-sm" onClick={classroomsHook.refresh} title="Actualiser" disabled={classroomsHook.loading}>
            <RefreshCw size={14} className={classroomsHook.loading ? 'spin' : ''} /> Actualiser
          </button>
      </div>

      {/* ── TABLEAU DE DONNÉES PREMIUM UNIFIÉ ─────────────────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nom de la Classe</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Enseignant Titulaire</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Capacité & Effectif</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classroomsHook.loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                    <div style={{ marginTop: '8px' }}>Chargement des classes...</div>
                  </td>
                </tr>
              ) : (classroomsHook.classrooms || []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Aucune classe trouvée.
                  </td>
                </tr>
              ) : (
                (classroomsHook.classrooms || []).map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Salle : {c.roomName || 'Non attribuée'}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        👨‍🏫 {c.mainTeacherName || 'Non attribué'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                        {c.assignedCount || 0} / {c.capacity || 35} Élèves
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {c.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span>}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => handleOpenEditClass(c)}>
                          <Edit2 size={15} color="#0ea5e9" />
                        </button>
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
          <span style={{ color: '#64748b' }}>Page {classroomsHook.page} sur {classroomsHook.totalPages || 1} ({classroomsHook.totalCount} classes)</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline btn-sm" disabled={classroomsHook.page <= 1} onClick={() => classroomsHook.setPage(classroomsHook.page - 1)}>
              <ChevronLeft size={14} /> Précédent
            </button>
            <button className="btn btn-outline btn-sm" disabled={classroomsHook.page >= classroomsHook.totalPages} onClick={() => classroomsHook.setPage(classroomsHook.page + 1)}>
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── ASSISTANT WIZARD 4 ÉTAPES CRÉATION CLASSE ─────────────────────── */}
      {showClassModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingClass ? 'Modifier la Classe' : 'Nouvelle Classe'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assistant étape par étape</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowClassModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { step: 1, label: '1. Identité' },
                { step: 2, label: '2. Enseignant & Salle' },
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

            <div style={{ padding: '20px' }}>
              {wizardStep === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Nom de la Classe *</label>
                    <input type="text" className="form-input" value={classForm.name || ''} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="ex: CP1 A" />
                  </div>
                  <div>
                    <label className="form-label">Niveau Académique</label>
                    <select className="form-select" value={classForm.levelId || ''} onChange={(e) => setClassForm({ ...classForm, levelId: e.target.value })}>
                      {levelsHook.levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Capacité Maximale</label>
                    <input type="number" className="form-input" value={classForm.capacity || 35} onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label">Enseignant Titulaire</label>
                    <select
                      className="form-select"
                      value={classForm.mainTeacherId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const teacherObj = teachersList.find((t) => t.id === selectedId);
                        setClassForm({
                          ...classForm,
                          mainTeacherId: selectedId,
                          mainTeacherName: teacherObj ? `${teacherObj.lastName} ${teacherObj.firstName}` : '',
                        });
                      }}
                    >
                      <option value="">Sélectionner un enseignant...</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Nom / Numéro de la Salle</label>
                    <input type="text" className="form-input" value={classForm.roomName || ''} onChange={(e) => setClassForm({ ...classForm, roomName: e.target.value })} placeholder="ex: Salle B-10" />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Résumé de la Classe</h5>
                  <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Nom :</strong> {classForm.name}</div>
                    <div><strong>Salle :</strong> {classForm.roomName || 'Non attribuée'}</div>
                    <div><strong>Titulaire :</strong> {classForm.mainTeacherName || 'Non attribué'}</div>
                    <div><strong>Capacité :</strong> {classForm.capacity} élèves</div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Classe Enregistrée !</h4>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              {wizardStep > 1 && wizardStep < 4 ? (
                <button className="btn btn-outline" onClick={() => setWizardStep((prev) => (prev - 1) as any)}>Précédent</button>
              ) : <div />}

              {wizardStep < 3 ? (
                <button className="btn btn-primary" onClick={() => setWizardStep((prev) => (prev + 1) as any)}>Suivant</button>
              ) : wizardStep === 3 ? (
                <button className="btn btn-success" onClick={handleSaveClass} disabled={classroomsHook.saving}>
                  {classroomsHook.saving ? 'Enregistrement...' : 'Valider & Créer'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowClassModal(false)}>Fermer</button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
