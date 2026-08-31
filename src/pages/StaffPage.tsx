// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Module Gestion du Personnel & Enseignants (src/pages/StaffPage.tsx)
// Design System SaaS Premium : Wizard 4 Étapes, Table Unifiée & KPIs
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useStaff } from '../hooks/staff';
import { StaffMember } from '../services/staff/staffService';
import { downloadExcel } from '../utils/exportUtils';
import {
  Users, Search, Plus, Eye, Edit2, Trash2, RotateCcw, X, Save,
  Briefcase, Phone, Mail, Award, CheckCircle2, RefreshCw, Download,
  DollarSign, FileText, ChevronLeft, ChevronRight, UserCheck, GraduationCap
} from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const ROLE_BADGES: Record<string, React.ReactNode> = {
  TEACHER: <span className="badge badge-info">Enseignant</span>,
  ADMINISTRATIVE: <span className="badge badge-neutral">Administratif</span>,
  SUPPORT: <span className="badge badge-neutral">Support / Service</span>,
  DRIVER: <span className="badge badge-warning">Chauffeur</span>,
  COOK: <span className="badge badge-warning">Cuisinier</span>,
};

const STATUS_BADGES: Record<string, React.ReactNode> = {
  Actif: <span className="badge badge-success">Actif</span>,
  Inactif: <span className="badge badge-neutral">Inactif</span>,
  'En congé': <span className="badge badge-warning">En congé</span>,
  'Arrêt maladie': <span className="badge badge-danger">Arrêt maladie</span>,
  'Contrat terminé': <span className="badge badge-neutral">Contrat terminé</span>,
  Archivé: <span className="badge badge-warning">Archivé</span>,
};

export default function StaffPage() {
  const { addNotification } = useToast();
  const confirm = useConfirm();

  const {
    staffMembers: staff = [],
    totalCount = 0,
    page,
    totalPages,
    loading,
    saving,
    searchQuery,
    roleFilter,
    statusFilter,
    setSearchQuery,
    setRoleFilter,
    setStatusFilter,
    setPage,
    refresh,
    create,
    update,
    archive,
    restore,
    remove,
  } = useStaff({ pageSize: 15 });

  // Synchronisation temps réel automatique
  useRealtimeSync({
    tables: ['staff_members', 'school_settings'],
    onDataChange: () => refresh(),
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const detailStaff = useMemo(() => staff.find((s) => s.id === selectedStaffId), [staff, selectedStaffId]);

  const emptyForm = (): Partial<StaffMember> => ({
    firstName: '',
    lastName: '',
    role: 'Enseignant',
    jobTitle: 'Enseignant Titulaire',
    phone: '',
    email: '',
    baseSalary: 250000,
    status: 'Actif',
  });

  const [form, setForm] = useState<Partial<StaffMember>>(emptyForm());

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setForm(emptyForm());
    setWizardStep(1);
    setShowAddModal(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setForm(member);
    setWizardStep(1);
    setShowAddModal(true);
  };

  const handleSaveStaff = async () => {
    if (!form.firstName?.trim() && !form.lastName?.trim()) {
      addNotification('error', 'Veuillez renseigner au moins le nom ou le prénom.');
      return;
    }

    const payload = {
      ...form,
      firstName: form.firstName?.trim() || form.lastName?.trim() || 'Employé',
      lastName: form.lastName?.trim() || '',
      phone: form.phone?.trim() || '—',
    };

    if (editingStaff) {
      const ok = await update(editingStaff.id, payload);
      if (ok) {
        addNotification('success', 'Fiche employé mise à jour avec succès.');
        setShowAddModal(false);
      }
    } else {
      const created = await create(payload);
      if (created) {
        addNotification('success', 'Nouveau membre du personnel créé avec succès.');
        setWizardStep(4);
      }
    }
  };

  const handleExport = () => {
    const data = (staff || []).map((s) => ({
      'Matricule': s.matricule || s.id,
      'Nom': s.lastName,
      'Prénom': s.firstName,
      'Rôle': s.role,
      'Téléphone': s.phone,
      'Salaire de base': s.baseSalary || 0,
      'Statut': s.status,
    }));
    downloadExcel(data, 'Personnel', 'personnel_gesco');
    addNotification('info', 'Exportation du personnel générée.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── HEADER ET STATISTIQUES UNIFIÉS ─────────────────────────────────── */}
      <div className="card shadow-sm p-4" style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Personnel & Ressources Humaines
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Gestion des enseignants, employés administratifs, contrats et présences RH
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} /> Exporter Excel
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Nouvel Employé
            </button>
          </div>
        </div>

        {/* CARTES STATISTIQUES PERSONNEL (STYLE DASHBOARD DYNAMIQUE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Total Personnel - Royal Blue */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Global</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Personnel</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{totalCount}</div>
          </div>

          {/* Enseignants - Cyan */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(6, 182, 212, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Corps Prof.</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Enseignants</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{(staff || []).filter((s) => s.role === 'TEACHER').length}</div>
          </div>

          {/* Actifs - Émeraude */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>En Poste</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Personnel Actif</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{(staff || []).filter((s) => s.status === 'Actif').length}</div>
          </div>
        </div>
      </div>

      {/* ── BARRE D'ACTIONS & FILTRES UNIFIÉE ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          
          <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap', minWidth: 'min(100%, 280px)' }}>
            <div className="search-bar-wrapper" style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
              <Search size={16} className="search-bar-icon" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Rechercher un employé (Nom, Téléphone, Email...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-bar-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              className="form-select"
              style={{ minWidth: 150, flex: '1 1 150px', height: 38, borderRadius: 10, fontSize: '0.875rem' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Tous les rôles</option>
              <option value="TEACHER">Enseignants</option>
              <option value="ADMINISTRATIVE">Administratif</option>
              <option value="DRIVER">Chauffeurs</option>
              <option value="COOK">Cuisiniers</option>
              <option value="SUPPORT">Support</option>
            </select>

            <select
              className="form-select"
              style={{ minWidth: 130, flex: '1 1 130px', height: 38, borderRadius: 10, fontSize: '0.875rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous statuts</option>
              <option value="Actif">Actifs</option>
              <option value="Inactif">Inactifs</option>
              <option value="En congé">En congé</option>
              <option value="Archivé">Archivés</option>
            </select>
          </div>

          <button className="btn btn-outline btn-sm" onClick={refresh} title="Actualiser" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualiser
          </button>
      </div>

      {/* ── TABLEAU DE DONNÉES PREMIUM UNIFIÉ ─────────────────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employé</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fonction / Rôle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Salaire de base</th>
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
              ) : (staff || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Aucun membre du personnel trouvé.
                  </td>
                </tr>
              ) : (
                (staff || []).map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.lastName} {s.firstName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Matricule : {s.matricule || s.id.slice(0, 8)}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {ROLE_BADGES[s.role] || <span className="badge badge-neutral">{s.role}</span>}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{s.jobTitle || ''}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={13} color="#2563eb" /> {s.phone}
                      </div>
                      {s.email && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={13} color="#64748b" /> {s.email}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {s.baseSalary ? `${s.baseSalary.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {STATUS_BADGES[s.status] || <span className="badge badge-neutral">{s.status}</span>}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Voir Dossier" onClick={() => setSelectedStaffId(s.id)}>
                          <Eye size={15} color="#4f46e5" />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => handleOpenEdit(s)}>
                          <Edit2 size={15} color="#0ea5e9" />
                        </button>
                        {s.status === 'Archivé' ? (
                          <>
                            <button className="btn btn-ghost btn-sm" title="Restaurer" onClick={async () => {
                              const ok = await restore(s.id);
                              if (ok) addNotification('success', `L'employé ${s.lastName} ${s.firstName} a été réactivé.`);
                            }}>
                              <RotateCcw size={15} color="#10b981" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Supprimer définitivement"
                              onClick={async () => {
                                const isConfirmed = await confirm({
                                  title: "Supprimer le membre du personnel",
                                  message: `Voulez-vous vraiment supprimer définitivement l'employé ${s.lastName} ${s.firstName} ? Cette action est irréversible.`,
                                  confirmText: 'Oui, supprimer définitivement',
                                  cancelText: 'Annuler',
                                  variant: 'danger',
                                });
                                if (isConfirmed) {
                                  const ok = await remove(s.id);
                                  if (ok) addNotification('success', `L'employé ${s.lastName} ${s.firstName} a été supprimé avec succès.`);
                                }
                              }}
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Supprimer"
                            onClick={async () => {
                              const isConfirmed = await confirm({
                                title: "Supprimer le membre du personnel",
                                message: `Voulez-vous vraiment supprimer définitivement l'employé ${s.lastName} ${s.firstName} ?`,
                                confirmText: 'Oui, supprimer',
                                cancelText: 'Annuler',
                                variant: 'danger',
                              });
                              if (isConfirmed) {
                                const ok = await remove(s.id);
                                if (ok) addNotification('success', `L'employé ${s.lastName} ${s.firstName} a été supprimé avec succès.`);
                              }
                            }}
                          >
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface-hover, #f8fafc)', borderTop: '1px solid var(--border)', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--text-secondary, #64748b)' }}>Page {page} sur {totalPages || 1} ({totalCount} employés)</span>
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

      {/* ── ASSISTANT WIZARD 4 ÉTAPES CRÉATION/MODIFICATION ───────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingStaff ? 'Modifier la Fiche Employé' : 'Nouveau Membre du Personnel'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assistant d'ajout étape par étape</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { step: 1, label: '1. Identité' },
                { step: 2, label: '2. Poste & Salaire' },
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
                  <div>
                    <label className="form-label">Nom</label>
                    <input type="text" className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="ex: KOUASSI" />
                  </div>
                  <div>
                    <label className="form-label">Prénom(s)</label>
                    <input type="text" className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="ex: Eugénie" />
                  </div>
                  <div>
                    <label className="form-label">Téléphone</label>
                    <input type="text" className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 07..." />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="employe@ecole.ci" />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label">Rôle / Categorie</label>
                    <select className="form-select" value={form.role || 'TEACHER'} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                      <option value="TEACHER">Enseignant</option>
                      <option value="ADMINISTRATIVE">Administratif</option>
                      <option value="DRIVER">Chauffeur</option>
                      <option value="COOK">Cuisinier</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Intitulé du Poste</label>
                    <input type="text" className="form-input" value={form.jobTitle || ''} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="ex: Enseignant CP1" />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Salaire de Base Mensuel (FCFA)</label>
                    <input type="number" className="form-input" value={form.baseSalary || 250000} onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Résumé du Dossier Employé</h5>
                  <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Nom & Prénom :</strong> {form.lastName} {form.firstName}</div>
                    <div><strong>Téléphone :</strong> {form.phone}</div>
                    <div><strong>Poste :</strong> {form.jobTitle}</div>
                    <div><strong>Salaire :</strong> {form.baseSalary?.toLocaleString()} FCFA</div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Employé Enregistré !</h4>
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
                <button className="btn btn-success" onClick={handleSaveStaff} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Valider & Enregistrer'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowAddModal(false)}>Fermer</button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── POPUP MODAL CENTRAL DOSSIER EMPLOYE ────────────────────────────── */}
      {detailStaff && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem' }}>
                  {detailStaff.firstName.charAt(0)}{detailStaff.lastName.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>{detailStaff.lastName} {detailStaff.firstName}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Matricule : {detailStaff.matricule || detailStaff.id}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStaffId(null)}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>FONCTION & STATUT</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: 4 }}>{detailStaff.role} ({detailStaff.jobTitle || 'Non renseigné'})</div>
                <div style={{ marginTop: 6 }}>
                  {STATUS_BADGES[detailStaff.status] || <span className="badge badge-neutral">{detailStaff.status}</span>}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CONTACT & REMUNERATION</div>
                <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} color="#2563eb" /> {detailStaff.phone}
                </div>
                {detailStaff.email && (
                  <div style={{ fontSize: '0.875rem', color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} color="#64748b" /> {detailStaff.email}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
                  Salaire de base : {detailStaff.baseSalary ? `${detailStaff.baseSalary.toLocaleString('fr-FR')} FCFA` : 'Non renseigné'}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedStaffId(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
