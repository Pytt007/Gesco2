// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Page Gestion des Parents & Responsables Légaux (src/pages/ParentsPage.tsx)
// Interface complète avec Recherche, Fiche Parent, Choix du type de responsable,
// Enfants liés, Responsable Payeur unique, Contact d'Urgence et Historique.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import {
  useParents,
  useParent,
  useParentChildren,
  useParentCommunication,
  useStudentParents,
} from '../hooks/parents';
import { Parent } from '../services/parents/parentsService';
import {
  RelationshipType,
  getRelationshipHistory,
  RelationshipHistoryLog,
} from '../services/parents/parentRelationshipService';
import { studentFinancialEnrollmentService } from '../services/finance/studentFinancialEnrollmentService';
import {
  Users, Search, Plus, Eye, Edit2, Trash2, RotateCcw, X, Save,
  Phone, Mail, MessageSquare, UserCheck, ShieldAlert, GraduationCap,
  RefreshCw, DollarSign, AlertCircle, History, ExternalLink, CheckSquare, Square,
} from 'lucide-react';

const STATUS_BADGES: Record<string, React.ReactNode> = {
  Actif: <span className="badge badge-success">Actif</span>,
  Inactif: <span className="badge badge-neutral">Inactif</span>,
  Archivé: <span className="badge badge-warning">Archivé</span>,
};

interface ParentsPageProps {
  onNavigate?: (view: string) => void;
}

export default function ParentsPage({ onNavigate }: ParentsPageProps) {
  const { addNotification } = useToast();

  const {
    parents,
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
  } = useParents({ pageSize: 15 });

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);

  const emptyForm = (): Partial<Parent> => ({
    firstName: '',
    lastName: '',
    relationshipType: 'Père',
    profession: '',
    phonePrimary: '',
    phoneSecondary: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Abidjan',
    preferredContactMethod: 'phone',
    receiveNotifications: true,
    status: 'Actif',
  });

  const [form, setForm] = useState<Partial<Parent>>(emptyForm());

  const handleSaveParent = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.phonePrimary?.trim()) {
      addNotification('error', 'Le prénom, le nom et le téléphone principal sont obligatoires.');
      return;
    }

    if (editingParent) {
      const ok = await update(editingParent.id, form);
      if (ok) {
        addNotification('success', 'Fiche responsable mise à jour avec succès.');
        setShowAddModal(false);
        setEditingParent(null);
      } else {
        addNotification('error', error || 'Erreur de mise à jour.');
      }
    } else {
      const ok = await create(form);
      if (ok) {
        addNotification('success', 'Responsable légal inscrit avec succès.');
        setShowAddModal(false);
        setForm(emptyForm());
      } else {
        addNotification('error', error || 'Erreur lors de la création du responsable.');
      }
    }
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingParent(null);
    setShowAddModal(true);
  };

  const openEdit = (p: Parent) => {
    setForm(p);
    setEditingParent(p);
    setShowAddModal(true);
  };

  // FIX ANOMALIE-MAJ-05 : Avertissement sécurité lors de l'archivage
  const handleArchiveParent = async (p: Parent) => {
    const childrenCount = p.childrenCount || 0;
    const warningMsg = childrenCount > 0
      ? `⚠️ Ce responsable est actuellement lié à ${childrenCount} élève(s). Voulez-vous vraiment l'archiver ?`
      : `Archiver le responsable ${p.firstName} ${p.lastName} ?`;

    if (window.confirm(warningMsg)) {
      const ok = await archive(p.id);
      if (ok) addNotification('success', 'Responsable archivé avec succès.');
      else addNotification('error', 'Erreur lors de l\'archivage.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* En-tête de page */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Parents & Responsables Légaux</h1>
          <p className="page-subtitle">
            {totalCount} responsable{totalCount !== 1 ? 's' : ''} enregistré{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistoryModal(true)} title="Historique des changements">
            <History size={14} /> Historique des changements
          </button>
          <button className="btn btn-outline btn-sm" onClick={refresh} title="Actualiser la liste">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button id="btn-add-parent" className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Ajouter un Responsable
          </button>
        </div>
      </div>

      {/* Barre de Recherche par Nom, Prénom, Téléphone, Email */}
      <div className="card card-hover">
        <div className="card-body" style={{ paddingBottom: '0.75rem' }}>
          <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, prénom, téléphone ou email..."
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                id="input-parent-search"
              />
            </div>

            {/* Filtres de statut */}
            <div className="flex gap-2">
              {(['all', 'Actif', 'Inactif', 'Archivé'] as const).map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'all' ? 'Tous' : st}
                </button>
              ))}
            </div>

            {/* Tri */}
            <div className="flex gap-2" style={{ marginLeft: 'auto', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trier par :</span>
              <select
                className="form-select"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="name">Nom</option>
                <option value="firstName">Prénom</option>
                <option value="createdAt">Date de création</option>
              </select>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des responsables */}
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border-light)' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="spinner" />
              <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Chargement des responsables légaux...
              </p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <ShieldAlert size={32} style={{ color: 'var(--color-danger)' }} />
              <div className="empty-state-title" style={{ color: 'var(--color-danger)' }}>
                Erreur de chargement
              </div>
              <div className="empty-state-description">{error}</div>
            </div>
          ) : parents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
              <div className="empty-state-title">Aucun responsable légal trouvé</div>
              <div className="empty-state-description">
                {searchQuery
                  ? 'Aucun résultat ne correspond à votre recherche.'
                  : 'Inscrivez le premier responsable légal en cliquant sur "Ajouter un Responsable".'}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Responsable</th>
                  <th>Type</th>
                  <th>Enfants Liés</th>
                  <th>Profession</th>
                  <th>Téléphone Principal</th>
                  <th>Email</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.lastName} {p.firstName}
                      </div>
                      {p.city && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.city}</div>}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {p.relationshipType || 'Tuteur Légal'}
                      </span>
                    </td>

                    {/* FIX ANOMALIE-MAJ-01 : Colonne Enfants Liés */}
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {p.childrenCount ?? 1} enfant(s)
                      </span>
                    </td>

                    <td style={{ fontSize: '0.8125rem' }}>{p.profession || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb' }}>{p.phonePrimary}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.email || '—'}</td>
                    <td>{STATUS_BADGES[p.status] ?? <span className="badge badge-neutral">{p.status}</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedParentId(p.id)}
                          title="Fiche responsable & Enfants"
                          id={`btn-view-parent-${p.id}`}
                        >
                          <Eye size={14} color="#2563eb" />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEdit(p)}
                          id={`btn-edit-parent-${p.id}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        {p.status === 'Archivé' ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-success)' }}
                            onClick={async () => {
                              const ok = await restore(p.id);
                              if (ok) addNotification('success', 'Responsable réactivé.');
                            }}
                            title="Réactiver le responsable"
                          >
                            <RotateCcw size={13} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleArchiveParent(p)}
                            title="Archiver le responsable"
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
              Page {page} sur {totalPages} ({totalCount} éléments)
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

      {/* Modal Ajout / Modification Responsable Légal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3>{editingParent ? `Modifier — ${editingParent.firstName} ${editingParent.lastName}` : 'Nouveau Responsable Légal'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    className="form-input"
                    value={form.firstName || ''}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    className="form-input"
                    value={form.lastName || ''}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>

                {/* FIX ANOMALIE-MAJ-02 : Type de responsable par défaut */}
                <div className="form-group">
                  <label className="form-label">Type de Responsable *</label>
                  <select
                    className="form-select"
                    value={form.relationshipType || 'Père'}
                    onChange={(e) => setForm({ ...form, relationshipType: e.target.value })}
                  >
                    <option value="Père">Père</option>
                    <option value="Mère">Mère</option>
                    <option value="Tuteur Légal">Tuteur Légal</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Profession</label>
                  <input
                    className="form-input"
                    value={form.profession || ''}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Téléphone Principal * (Unique)</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="Ex: 0708123456"
                    value={form.phonePrimary || ''}
                    onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone Secondaire</label>
                  <input
                    className="form-input"
                    type="tel"
                    value={form.phoneSecondary || ''}
                    onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Adresse de résidence</label>
                  <input
                    className="form-input"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveParent} disabled={saving}>
                {saving ? 'Enregistrement...' : <><Save size={14} /> Enregistrer le responsable</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && (
        <HistoryModal onClose={() => setShowHistoryModal(false)} />
      )}

      {/* Modal Fiche Détaillée Responsable + Enfants Liés + Payeur Unique */}
      {selectedParentId && (
        <ParentDetailModal
          parentId={selectedParentId}
          onClose={() => setSelectedParentId(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
  const [historyLogs, setHistoryLogs] = useState<RelationshipHistoryLog[]>([]);

  useEffect(() => {
    getRelationshipHistory().then((res) => {
      if (res.success && res.data) setHistoryLogs(res.data);
    });
  }, []);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="#2563eb" /> Historique des changements de responsables
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ fontSize: '0.8125rem' }}>Date & Heure</th>
                  <th style={{ fontSize: '0.8125rem' }}>Élève</th>
                  <th style={{ fontSize: '0.8125rem' }}>Responsable</th>
                  <th style={{ fontSize: '0.8125rem' }}>Action effectuée</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{log.date}</td>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{log.studentName}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{log.parentName}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 600 }}>{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function ParentDetailModal({
  parentId,
  onClose,
  onNavigate,
}: {
  parentId: string;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}) {
  const { addNotification } = useToast();
  const [activeTab, setActiveTab] = useState<'info' | 'children'>('info');

  const { parent, loading: parentLoading, error: parentError } = useParent(parentId);
  const { children, loading: childrenLoading, refresh: refreshChildren } = useParentChildren(parentId);

  const [selectedChildId, setSelectedChildId] = useState<string>('stu-101');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('Père');
  const [isPayer, setIsPayer] = useState<boolean>(true);
  const [isEmergencyContact, setIsEmergencyContact] = useState<boolean>(true);
  const [financeSummaries, setFinanceSummaries] = useState<Record<string, string>>({});

  const { linkStudent, unlinkStudent, saving: linkSaving, error: linkError } = useStudentParents(selectedChildId);

  const mockAvailableStudents = [
    { id: 'stu-101', name: 'KOUASSI Jean-Philippe (CP1 A)' },
    { id: 'stu-102', name: 'DOUAMBA Marie (CE1 A)' },
    { id: 'stu-103', name: 'YAO Kouamé Patrick (CE2 B)' },
    { id: 'stu-104', name: 'OUÉDRAOGO Fatimata (CM2 A)' },
  ];

  // FIX ANOMALIE-MAJ-03 : Chargement situation financière des enfants liés
  useEffect(() => {
    studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026').then((list) => {
      const summaries: Record<string, string> = {};
      list.forEach((e) => {
        summaries[e.studentId] = e.remainingBalance === 0
          ? 'Payé (0 F reste)'
          : `Reste : ${e.remainingBalance.toLocaleString('fr-FR')} F`;
      });
      setFinanceSummaries(summaries);
    });
  }, []);

  const handleLinkChild = async () => {
    const ok = await linkStudent(parentId, relationshipType, false, isPayer, isEmergencyContact);
    if (ok) {
      addNotification('success', 'Enfant associé au responsable !');
      refreshChildren();
    } else {
      addNotification('error', linkError || 'Erreur lors de l\'association.');
    }
  };

  if (parentLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '640px', padding: '3rem', textAlign: 'center' }}>
          <span className="spinner" />
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Chargement de la fiche responsable...</p>
        </div>
      </div>
    );
  }

  if (parentError || !parent) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: '480px', textAlign: 'center', padding: '2rem' }}>
          <ShieldAlert size={36} style={{ color: 'var(--color-danger)', margin: '0 auto 0.75rem' }} />
          <h3>Erreur de chargement</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{parentError || 'Fiche introuvable.'}</p>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ marginTop: '1rem' }}>Fermer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2563eb' }}>
              {parent.firstName[0]}{parent.lastName[0]}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{parent.lastName} {parent.firstName}</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {parent.profession ? `${parent.profession} — ` : ''}Tél : {parent.phonePrimary}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1rem' }}>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'info' ? 'active fw-bold text-primary' : ''}`}
            style={{ borderRadius: 0, borderBottom: activeTab === 'info' ? '2px solid #2563eb' : 'none' }}
            onClick={() => setActiveTab('info')}
          >
            <UserCheck size={14} /> Fiche & Coordonnées
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'children' ? 'active fw-bold text-primary' : ''}`}
            style={{ borderRadius: 0, borderBottom: activeTab === 'children' ? '2px solid #2563eb' : 'none' }}
            onClick={() => setActiveTab('children')}
          >
            <GraduationCap size={14} /> Enfants Liés ({children.length})
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div><strong>Nom complet :</strong> {parent.lastName} {parent.firstName}</div>
              <div><strong>Profession :</strong> {parent.profession || 'Non renseignée'}</div>
              <div><strong>Téléphone Principal :</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{parent.phonePrimary}</span></div>
              <div><strong>Téléphone Secondaire :</strong> {parent.phoneSecondary || 'Aucun'}</div>
              <div><strong>Email :</strong> {parent.email || 'Aucun'}</div>
              <div><strong>WhatsApp :</strong> {parent.whatsapp || parent.phonePrimary}</div>
              <div><strong>Adresse :</strong> {parent.address || 'Non renseignée'}</div>
              <div><strong>Ville :</strong> {parent.city || 'Abidjan'}</div>
              <div><strong>Notifications SMS / WhatsApp :</strong> {parent.receiveNotifications ? 'Activées 🟢' : 'Désactivées 🔴'}</div>
              <div><strong>Statut dossier :</strong> {STATUS_BADGES[parent.status]}</div>
            </div>
          )}

          {activeTab === 'children' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Formulaire d'association */}
              <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} color="#2563eb" /> Ajouter un enfant à ce responsable
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Choisir l'élève *</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                    >
                      {mockAvailableStudents.map((st) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Type de Responsable *</label>
                    <select
                      className="form-select form-select-sm"
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                    >
                      <option value="Père">Père</option>
                      <option value="Mère">Mère</option>
                      <option value="Tuteur Légal">Tuteur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPayer}
                      onChange={(e) => setIsPayer(e.target.checked)}
                    />
                    ☑ Responsable des paiements (Payeur unique)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isEmergencyContact}
                      onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    />
                    ☑ Contact d'urgence
                  </label>
                </div>

                <button className="btn btn-primary btn-sm fw-semibold" onClick={handleLinkChild} disabled={linkSaving}>
                  {linkSaving ? 'Association...' : 'Lier l\'enfant'}
                </button>
              </div>

              {/* Liste des enfants associés avec situation financière (FIX ANOMALIE-MAJ-03) */}
              <div>
                <h6 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem', color: '#334155' }}>
                  Liste des enfants rattachés ({children.length})
                </h6>

                {childrenLoading ? (
                  <div className="text-center p-4"><span className="spinner" /></div>
                ) : children.length === 0 ? (
                  <div className="empty-state-description text-center py-3">Aucun enfant n'est actuellement lié à ce responsable.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {children.map((child) => (
                      <div
                        key={child.studentId}
                        style={{
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          background: 'white',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#475569' }}>
                            {child.firstName[0]}{child.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                              {child.lastName} {child.firstName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {child.matricule} · Classe : <strong>{child.grade}</strong> · Scolarité : <strong style={{ color: '#2563eb' }}>{financeSummaries[child.studentId] || 'Solde OK'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.725rem', fontWeight: 600 }}>
                            {child.relationshipType}
                          </span>
                          {child.isPayer && (
                            <span className="badge badge-success" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                              💰 Payeur
                            </span>
                          )}
                          {child.isEmergencyContact && (
                            <span className="badge badge-primary" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                              🚨 Urgence
                            </span>
                          )}

                          {onNavigate && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => { onClose(); onNavigate('STUDENTS'); }}
                              style={{ borderRadius: 6, fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Voir la fiche complète de l'élève"
                            >
                              <ExternalLink size={12} /> Fiche élève
                            </button>
                          )}

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={async () => {
                              if (window.confirm(`Retirer ${child.firstName} ${child.lastName} de ce responsable ?`)) {
                                const ok = await unlinkStudent(child.studentId);
                                if (ok) {
                                  addNotification('success', 'Enfant retiré avec succès.');
                                  refreshChildren();
                                }
                              }
                            }}
                            title="Retirer cet enfant"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
