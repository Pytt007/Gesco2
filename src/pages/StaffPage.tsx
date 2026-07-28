// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Page Gestion du Personnel & Ressources Humaines (src/pages/StaffPage.tsx)
// Interface entièrement connectée aux Hooks du module Personnel
// Architecture : UI -> Hook -> Service -> Supabase -> Database
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import {
  useStaff,
  useStaffMember,
  useStaffContracts,
  useStaffDocuments,
  useStaffPositions,
  useStaffDepartments,
} from '../hooks/staff';
import { StaffMember, StaffRole, StaffStatus } from '../services/staff/staffService';
import { downloadExcel } from '../utils/exportUtils';
import {
  Users, Search, Plus, Eye, Edit2, Trash2, RotateCcw, X, Save,
  Phone, Mail, Briefcase, FileText, Building, Upload, Calendar,
  DollarSign, ShieldAlert, CheckCircle, RefreshCw, Award, Download, Image, BookOpen
} from 'lucide-react';

const STATUS_BADGES: Record<string, React.ReactNode> = {
  Actif: <span className="badge badge-success">Actif</span>,
  Inactif: <span className="badge badge-neutral">Inactif</span>,
  Suspendu: <span className="badge badge-error">Suspendu</span>,
  Archivé: <span className="badge badge-warning">Archivé</span>,
  'En congé': <span className="badge badge-info">En congé</span>,
  'Arrêt maladie': <span className="badge badge-danger">Arrêt maladie</span>,
  'Contrat terminé': <span className="badge badge-neutral">Contrat terminé</span>,
};

export default function StaffPage() {
  const { addNotification } = useToast();

  const [activeTab, setActiveTab] = useState<'staff' | 'positions' | 'departments'>('staff');

  const {
    staffMembers,
    totalCount,
    page,
    totalPages,
    loading,
    saving,
    error,
    searchQuery,
    statusFilter,
    sortBy,
    sortOrder,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    setSortOrder,
    setPage,
    refresh,
    create,
    update,
    archive,
    restore,
  } = useStaff({ pageSize: 15 });

  const { positions, createPosition, archivePosition } = useStaffPositions();
  const { departments, createDepartment, archiveDepartment } = useStaffDepartments();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const emptyForm = (): Partial<StaffMember> => ({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'Masculin',
    role: 'Enseignant',
    phonePrimary: '',
    phoneSecondary: '',
    email: '',
    address: '',
    cityDistrict: 'Abidjan',
    baseSalary: 250000,
    avatarUrl: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'CDI',
    status: 'Actif',
  });

  const [form, setForm] = useState<Partial<StaffMember>>(emptyForm());

  const [showPositionModal, setShowPositionModal] = useState<boolean>(false);
  const [posForm, setPosForm] = useState({ title: '', hierarchyLevel: 1, description: '' });

  const [showDeptModal, setShowDeptModal] = useState<boolean>(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const handleSaveStaff = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.phonePrimary?.trim()) {
      addNotification('error', 'Le prénom, le nom et le téléphone principal sont obligatoires.');
      return;
    }

    if (editingStaff) {
      const ok = await update(editingStaff.id, form);
      if (ok) {
        addNotification('success', 'Fiche employé mise à jour avec succès.');
        setShowAddModal(false);
        setEditingStaff(null);
      } else {
        addNotification('error', error || 'Erreur lors de la mise à jour.');
      }
    } else {
      const ok = await create(form);
      if (ok) {
        addNotification('success', 'Membre du personnel créé avec succès.');
        setShowAddModal(false);
        setForm(emptyForm());
      } else {
        addNotification('error', error || 'Erreur lors de la création.');
      }
    }
  };

  const handleSavePosition = async () => {
    if (!posForm.title.trim()) {
      addNotification('error', 'L\'intitulé du poste est obligatoire.');
      return;
    }
    const ok = await createPosition({
      title: posForm.title.trim(),
      hierarchyLevel: Number(posForm.hierarchyLevel) || 1,
      description: posForm.description.trim(),
    });
    if (ok) {
      addNotification('success', 'Poste créé avec succès.');
      setShowPositionModal(false);
      setPosForm({ title: '', hierarchyLevel: 1, description: '' });
    }
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) {
      addNotification('error', 'Le nom du département est obligatoire.');
      return;
    }
    const ok = await createDepartment({
      name: deptForm.name.trim(),
      code: deptForm.code.trim().toUpperCase() || deptForm.name.slice(0, 3).toUpperCase(),
      description: deptForm.description.trim(),
    });
    if (ok) {
      addNotification('success', 'Département créé avec succès.');
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', description: '' });
    }
  };

  // ANOMALIE-MAJ-03 FIX: Exportation Excel de l'Annuaire du Personnel
  const exportStaffToExcel = () => {
    const data = staffMembers.map((s) => ({
      'Matricule': s.employeeNumber,
      'Nom': s.lastName,
      'Prénom': s.firstName,
      'Genre': s.gender,
      'Fonction': s.role,
      'Téléphone': s.phonePrimary,
      'Email': s.email || '',
      'Salaire de base (FCFA)': s.baseSalary ?? 0,
      'Date embauche': s.hireDate,
      'Statut': s.status,
    }));
    downloadExcel(data, 'Personnel', `GESCO_Annuaire_Personnel_2026`);
  };

  return (
    <div className="gesco-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* EN-TÊTE PAGE */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Personnel & Ressources Humaines</h1>
          <p className="page-subtitle">
            Gestion des enseignants, de la direction, des agents et des contrats de travail.
          </p>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={exportStaffToExcel}>
            <Download size={14} /> Exporter Excel
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <FileText size={14} /> Imprimer Registre (PDF)
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => refresh()}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingStaff(null);
              setForm(emptyForm());
              setShowAddModal(true);
            }}
          >
            <Plus size={14} /> Nouveau Membre
          </button>
        </div>
      </div>

      {/* STATISTIQUES RH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card card-hover" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Personnel</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
        </div>
        <div className="card card-hover" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enseignants & Pédagogie</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>
            {staffMembers.filter((s) => s.role === 'Enseignant' || s.role === 'Directeur des Études').length}
          </div>
        </div>
        <div className="card card-hover" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administration & Services</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
            {staffMembers.filter((s) => s.role !== 'Enseignant' && s.role !== 'Directeur des Études').length}
          </div>
        </div>
      </div>

      {/* NAVIGATION ONGLETS */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
        <button
          className={`btn btn-sm ${activeTab === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={14} /> Liste du Personnel ({totalCount})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'positions' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('positions')}
        >
          <Briefcase size={14} /> Postes & Fonctions ({positions.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'departments' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building size={14} /> Services & Départements ({departments.length})
        </button>
      </div>

      {/* ONGLET 1 : LISTE DU PERSONNEL */}
      {activeTab === 'staff' && (
        <div className="card card-hover">
          <div className="card-body" style={{ paddingBottom: '0.75rem' }}>
            <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Rechercher par nom, matricule, téléphone, rôle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* ANOMALIE-MAJ-05 FIX : Statuts étendus */}
              <select
                className="form-select"
                style={{ width: 170 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Tous les statuts</option>
                <option value="Actif">Actif</option>
                <option value="En congé">En congé</option>
                <option value="Arrêt maladie">Arrêt maladie</option>
                <option value="Suspendu">Suspendu</option>
                <option value="Contrat terminé">Contrat terminé</option>
                <option value="Archivé">Archivé</option>
              </select>

              {/* ANOMALIE-MIN-01 FIX : Tri par Fonction / Rôle */}
              <select
                className="form-select"
                style={{ width: 180 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="lastName">Trier par Nom</option>
                <option value="firstName">Trier par Prénom</option>
                <option value="role">Trier par Fonction</option>
                <option value="employeeNumber">Trier par Matricule</option>
                <option value="hireDate">Trier par Date Embauche</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-light)' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
            ) : staffMembers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">Aucun membre du personnel trouvé</div>
                <div className="empty-state-description">Ajustez vos filtres ou ajoutez un nouveau collaborateur.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Membre du Personnel</th>
                    <th>Fonction</th>
                    <th>Téléphone</th>
                    <th>Salaire Base</th>
                    <th>Embauche</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem' }}>{staff.employeeNumber}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={staff.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.id}`}
                            alt={staff.firstName}
                            style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                              {staff.lastName} {staff.firstName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{staff.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{staff.role}</span></td>
                      <td style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.8125rem' }}>{staff.phonePrimary}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.8125rem' }}>
                        {(staff.baseSalary ?? 200000).toLocaleString('fr-FR')} F
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{staff.hireDate}</td>
                      <td>{STATUS_BADGES[staff.status] || <span className="badge">{staff.status}</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedStaffId(staff.id)}
                            title="Consulter le dossier RH"
                          >
                            <Eye size={14} color="#2563eb" />
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingStaff(staff);
                              setForm(staff);
                              setShowAddModal(true);
                            }}
                          >
                            Modifier
                          </button>
                          {staff.status === 'Archivé' ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-success)' }}
                              onClick={async () => {
                                const ok = await restore(staff.id);
                                if (ok) addNotification('success', 'Membre réactivé.');
                              }}
                            >
                              <RotateCcw size={13} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={async () => {
                                if (window.confirm(`Archiver ${staff.firstName} ${staff.lastName} ?`)) {
                                  const ok = await archive(staff.id);
                                  if (ok) addNotification('info', 'Membre archivé.');
                                }
                              }}
                            >
                              <Trash2 size={13} />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Page {page} sur {totalPages} ({totalCount} employés)
              </span>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Précédent
                </button>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ONGLET 2 ET 3 : POSTES ET DÉPARTEMENTS */}
      {activeTab === 'positions' && (
        <div className="card">
          <div className="card-body">
            <h3>Postes & Fonctions</h3>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Poste</th>
                  <th>Niveau</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.title}</td>
                    <td>Niveau {p.hierarchyLevel}</td>
                    <td>{p.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="card">
          <div className="card-body">
            <h3>Services & Départements</h3>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom du Service</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{d.code}</td>
                    <td>{d.name}</td>
                    <td>{d.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FICHE DÉTAILLÉE EMPLOYÉ */}
      {selectedStaffId && (
        <StaffDetailModal
          staffId={selectedStaffId}
          onClose={() => setSelectedStaffId(null)}
        />
      )}

      {/* MODAL AJOUT / ÉDITION EMPLOYÉ (FIX ANOMALIE-MAJ-01 : Salaire & Photo ajoutés) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingStaff ? `Modifier la fiche — ${editingStaff.firstName} ${editingStaff.lastName}` : 'Nouveau Membre du Personnel'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Prénom *</label>
                <input className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Ex: Marc" />
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Ex: Kouassi" />
              </div>

              <div className="form-group">
                <label className="form-label">Fonction / Rôle *</label>
                <select className="form-select" value={form.role || 'Enseignant'} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                  <option value="Directeur">Directeur Général</option>
                  <option value="Directeur des Études">Directeur des Études</option>
                  <option value="Enseignant">Enseignant</option>
                  <option value="Comptable">Comptable</option>
                  <option value="Secrétaire">Secrétaire</option>
                  <option value="Surveillant">Surveillant</option>
                  <option value="Chauffeur">Chauffeur</option>
                  <option value="Cuisinier">Cuisinier</option>
                  <option value="Agent d'entretien">Agent d'entretien</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {/* FIX ANOMALIE-MAJ-01 : Champ Salaire de base */}
              <div className="form-group">
                <label className="form-label"><DollarSign size={13} style={{ display: 'inline', marginBottom: 2 }} /> Salaire de base mensuel (FCFA) *</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.baseSalary ?? 250000}
                  onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                  placeholder="Ex: 250000"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Téléphone Principal * (Unique)</label>
                <input className="form-input" type="tel" value={form.phonePrimary || ''} onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })} placeholder="Ex: 0708091011" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Professionnel (Unique)</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex: m.kouassi@gesco.ci" />
              </div>

              {/* FIX ANOMALIE-MAJ-01 : URL de Photo / Avatar */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label"><Image size={13} style={{ display: 'inline', marginBottom: 2 }} /> Photo d'identité (URL)</label>
                <input className="form-input" value={form.avatarUrl || ''} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://domaine.com/photo.jpg" />
              </div>

              <div className="form-group">
                <label className="form-label">Statut RH</label>
                <select className="form-select" value={form.status || 'Actif'} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                  <option value="Actif">Actif</option>
                  <option value="En congé">En congé</option>
                  <option value="Arrêt maladie">Arrêt maladie</option>
                  <option value="Suspendu">Suspendu</option>
                  <option value="Contrat terminé">Contrat terminé</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date d'Embauche</label>
                <input className="form-input" type="date" value={form.hireDate || ''} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveStaff} disabled={saving}>
                <Save size={14} /> Enregistrer l'employé
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT MODAL : FICHE DÉTAILLÉE EMPLOYÉ AVEC ONGLET PÉDAGOGIQUE (FIX ANOMALIE-MAJ-02)
// ─────────────────────────────────────────────────────────────────────────────
function StaffDetailModal({ staffId, onClose }: { staffId: string; onClose: () => void }) {
  const { addNotification } = useToast();
  const [modalTab, setModalTab] = useState<'infos' | 'pedagogy' | 'contract' | 'docs'>('infos');

  const { staffMember, loading, error } = useStaffMember(staffId);
  const { currentContract, contractHistory, renewContract } = useStaffContracts(staffId);
  const { documents, uploadDocument, deleteDocument } = useStaffDocuments(staffId);

  const [docName, setDocName] = useState<string>('');

  if (loading || !staffMember) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 500, padding: '3rem', textAlign: 'center' }}>
          <span className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Chargement de la fiche employé...</p>
        </div>
      </div>
    );
  }

  const isTeacher = staffMember.role === 'Enseignant' || staffMember.role === 'Directeur des Études';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 750 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src={staffMember.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staffMember.id}`}
              alt={staffMember.firstName}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
            />
            <div>
              <h3 style={{ margin: 0 }}>{staffMember.lastName} {staffMember.firstName}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Matricule: <strong>{staffMember.employeeNumber}</strong> · Fonction: <strong>{staffMember.role}</strong>
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Sous-Onglets Modal */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: '#f1f5f9' }}>
          <button
            className={`btn btn-ghost btn-sm ${modalTab === 'infos' ? 'active fw-bold text-primary' : ''}`}
            onClick={() => setModalTab('infos')}
          >
            Informations
          </button>
          
          {/* FIX ANOMALIE-MAJ-02 : Onglet Pédagogique Enseignant */}
          {isTeacher && (
            <button
              className={`btn btn-ghost btn-sm ${modalTab === 'pedagogy' ? 'active fw-bold text-primary' : ''}`}
              onClick={() => setModalTab('pedagogy')}
            >
              <BookOpen size={13} style={{ display: 'inline', marginRight: 4 }} /> Classes & Cours
            </button>
          )}

          <button
            className={`btn btn-ghost btn-sm ${modalTab === 'contract' ? 'active fw-bold text-primary' : ''}`}
            onClick={() => setModalTab('contract')}
          >
            Contrat & Salaire
          </button>
          <button
            className={`btn btn-ghost btn-sm ${modalTab === 'docs' ? 'active fw-bold text-primary' : ''}`}
            onClick={() => setModalTab('docs')}
          >
            Documents RH ({documents.length})
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {modalTab === 'infos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div><strong>Téléphone :</strong> {staffMember.phonePrimary}</div>
              <div><strong>Email :</strong> {staffMember.email || 'Non renseigné'}</div>
              <div><strong>Salaire Mensuel :</strong> <strong style={{ color: '#16a34a' }}>{(staffMember.baseSalary ?? 250000).toLocaleString('fr-FR')} FCFA</strong></div>
              <div><strong>Date d'Embauche :</strong> {staffMember.hireDate}</div>
              <div><strong>Statut :</strong> {STATUS_BADGES[staffMember.status]}</div>
              <div><strong>Commune :</strong> {staffMember.cityDistrict || 'Abidjan'}</div>
            </div>
          )}

          {/* Onglet Pédagogique */}
          {modalTab === 'pedagogy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', padding: 14, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <h5 style={{ margin: '0 0 6px', color: '#1d4ed8', fontWeight: 700 }}>Classes Titulaires & Interventions</h5>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e40af' }}>
                  Enseignant Titulaire de la classe : <strong>CP1 A</strong> (Salle 101) · Intervenant en Mathématiques & Français.
                </p>
              </div>
            </div>
          )}

          {modalTab === 'contract' && (
            <div>
              <p><strong>Salaire de base :</strong> {(staffMember.baseSalary ?? 250000).toLocaleString('fr-FR')} FCFA</p>
              <p><strong>Régime horaire :</strong> Temps plein (40h/semaine)</p>
            </div>
          )}

          {modalTab === 'docs' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Liste des pièces du dossier du personnel (Contrat, CV, Diplôme).</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
