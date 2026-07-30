// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Module Gestion des Parents & Responsables Légaux (src/pages/ParentsPage.tsx)
// Design System SaaS Premium : Wizard 4 Étapes, Drawer Fiche Latéral & Table Unifiée
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
  Download, CheckCircle2, ChevronLeft, ChevronRight
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
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
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

  const handleOpenAdd = () => {
    setEditingParent(null);
    setForm(emptyForm());
    setWizardStep(1);
    setShowAddModal(true);
  };

  const handleOpenEdit = (parent: Parent) => {
    setEditingParent(parent);
    setForm(parent);
    setWizardStep(1);
    setShowAddModal(true);
  };

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
      }
    } else {
      const created = await create(form);
      if (created) {
        addNotification('success', 'Nouveau responsable légal créé avec succès.');
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
              Parents & Responsables Légaux
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Gestion des tuteurs, contacts d'urgence et suivi des liaisons avec les élèves
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Nouveau Responsable
            </button>
          </div>
        </div>

        {/* CARTES STATISTIQUES PARENTS (STYLE DASHBOARD DYNAMIQUE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Total Responsables - Royal Blue */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Global</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Responsables</span>
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
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Parents Actifs</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{(parents || []).filter((p) => p.status === 'Actif').length}</div>
          </div>

          {/* Contacts WhatsApp - Cyan */}
          <div className="card-hover" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(6, 182, 212, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>WhatsApp</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={15} color="#ffffff" />
              </div>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Contacts WhatsApp</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{(parents || []).filter((p) => Boolean(p.whatsapp)).length}</div>
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
                placeholder="Rechercher un parent (Nom, Téléphone, Email...)"
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
              style={{ width: 140, height: 38, borderRadius: 10, fontSize: '0.875rem' }}
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

      {/* ── TABLEAU DE DONNÉES PREMIUM UNIFIÉ ─────────────────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Responsable Légal</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Lien / Profession</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Contact Principal</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                    <div style={{ marginTop: '8px' }}>Chargement de la liste...</div>
                  </td>
                </tr>
              ) : (parents || []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Aucun parent trouvé.
                  </td>
                </tr>
              ) : (
                (parents || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.lastName} {p.firstName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.city || 'Abidjan'} · {p.address || ''}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-info" style={{ fontWeight: 600 }}>{p.relationshipType || 'Parent'}</span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{p.profession || 'Non spécifié'}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={13} color="#2563eb" /> {p.phonePrimary}
                      </div>
                      {p.email && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={13} color="#64748b" /> {p.email}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {STATUS_BADGES[p.status] || <span className="badge badge-neutral">{p.status}</span>}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" title="Voir Dossier" onClick={() => setSelectedParentId(p.id)}>
                          <Eye size={15} color="#4f46e5" />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => handleOpenEdit(p)}>
                          <Edit2 size={15} color="#0ea5e9" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Archiver / Supprimer"
                          onClick={async () => {
                            if (window.confirm(`Voulez-vous vraiment archiver le responsable ${p.lastName} ${p.firstName} ?`)) {
                              const ok = await archive(p.id);
                              if (ok) addNotification('success', `Le responsable ${p.lastName} ${p.firstName} a été archivé.`);
                            }
                          }}
                        >
                          <Trash2 size={15} color="#ef4444" />
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
          <span style={{ color: '#64748b' }}>Page {page} sur {totalPages || 1} ({totalCount} responsables)</span>
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

      {/* ── ASSISTANT WIZARD 4 ÉTAPES DE CRÉATION ──────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingParent ? 'Modifier le Responsable' : 'Nouveau Responsable Légal'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assistant étape par étape</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { step: 1, label: '1. Identité' },
                { step: 2, label: '2. Contacts' },
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
                    <label className="form-label">Nom *</label>
                    <input type="text" className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="ex: KOUASSI" />
                  </div>
                  <div>
                    <label className="form-label">Prénom(s) *</label>
                    <input type="text" className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="ex: Charles" />
                  </div>
                  <div>
                    <label className="form-label">Lien de Parente</label>
                    <select className="form-select" value={form.relationshipType || 'Père'} onChange={(e) => setForm({ ...form, relationshipType: e.target.value as any })}>
                      <option value="Père">Père</option>
                      <option value="Mère">Mère</option>
                      <option value="Tuteur">Tuteur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Profession</label>
                    <input type="text" className="form-input" value={form.profession || ''} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="ex: Ingénieur" />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label">Téléphone Principal *</label>
                    <input type="text" className="form-input" value={form.phonePrimary || ''} onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })} placeholder="+225 07..." />
                  </div>
                  <div>
                    <label className="form-label">Numéro WhatsApp</label>
                    <input type="text" className="form-input" value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+225 05..." />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="parent@domaine.ci" />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Résumé de la Saisie</h5>
                  <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Nom & Prénom :</strong> {form.lastName} {form.firstName}</div>
                    <div><strong>Lien :</strong> {form.relationshipType}</div>
                    <div><strong>Téléphone :</strong> {form.phonePrimary}</div>
                    <div><strong>Email :</strong> {form.email || 'Non renseigné'}</div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Responsable Enregistré !</h4>
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
                <button className="btn btn-success" onClick={handleSaveParent} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Valider & Enregistrer'}
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
