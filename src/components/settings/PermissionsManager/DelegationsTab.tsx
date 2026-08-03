// ─────────────────────────────────────────────────────────────────────────────
// GESCO — IAM / DelegationsTab.tsx
// Gestion des Délégations de Pouvoir et des Permissions Temporelles
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Users, Clock, Plus, ShieldAlert, CheckCircle2, XCircle, Calendar,
  ArrowRight, ShieldCheck, UserCheck, AlertTriangle
} from 'lucide-react';
import { usePermissionContext } from '../../../context/PermissionContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { MODULES_META } from '../../../constants/rbac';
import type { ModuleId } from '../../../types/permissions';

export default function DelegationsTab() {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();
  const {
    delegations,
    temporaryPermissions,
    roles,
    createDelegation,
    revokeDelegation,
    grantTemporaryPermission,
    revokeTemporaryPermission,
  } = usePermissionContext();

  const [activeSubTab, setActiveSubTab] = useState<'DELEGATIONS' | 'TEMP_PERMS'>('DELEGATIONS');

  // Modals
  const [showAddDelegationModal, setShowAddDelegationModal] = useState(false);
  const [showAddTempPermModal, setShowAddTempPermModal] = useState(false);

  // Forms
  const [delegForm, setDelegForm] = useState({
    delegateeId: 'user_secr_1',
    delegateeName: 'Secrétaire Principale',
    roleId: 'DIRECTEUR',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    reason: 'Congés du Directeur — Délégation temporaire de signature',
  });

  const [tempForm, setTempForm] = useState({
    userId: 'user_cais_1',
    userName: 'Caissier Principal',
    moduleId: 'STUDENTS' as ModuleId,
    action: 'edit',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    reason: 'Campagne de réinscription des élèves',
  });

  const adminId = currentUser?.id || 'admin';
  const adminName = currentUser?.fullName || 'Administrateur';

  const handleCreateDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    const roleDef = roles.find((r) => r.id === delegForm.roleId);
    createDelegation(
      {
        delegatorId: adminId,
        delegatorName: adminName,
        delegateeId: delegForm.delegateeId,
        delegateeName: delegForm.delegateeName,
        roleId: delegForm.roleId,
        roleLabel: roleDef?.label || delegForm.roleId,
        startDate: new Date(delegForm.startDate).toISOString(),
        endDate: new Date(delegForm.endDate).toISOString(),
        reason: delegForm.reason,
      },
      adminId,
      adminName
    );
    setShowAddDelegationModal(false);
    addNotification('success', `Délégation créée pour ${delegForm.delegateeName}.`);
  };

  const handleCreateTempPerm = (e: React.FormEvent) => {
    e.preventDefault();
    grantTemporaryPermission(
      {
        userId: tempForm.userId,
        userName: tempForm.userName,
        moduleId: tempForm.moduleId,
        action: tempForm.action,
        startDate: new Date(tempForm.startDate).toISOString(),
        endDate: new Date(tempForm.endDate).toISOString(),
        grantedBy: adminId,
        grantedByName: adminName,
        reason: tempForm.reason,
      },
      adminId,
      adminName
    );
    setShowAddTempPermModal(false);
    addNotification('success', `Permission temporaire accordée à ${tempForm.userName}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Sub-tabs header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, padding: 4, background: '#f1f5f9', borderRadius: 12 }}>
          <button
            className={`btn btn-sm ${activeSubTab === 'DELEGATIONS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('DELEGATIONS')}
            style={{ borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserCheck size={15} /> Délégations de Pouvoir ({delegations.filter((d) => d.status === 'ACTIVE').length})
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'TEMP_PERMS' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('TEMP_PERMS')}
            style={{ borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Clock size={15} /> Permissions Temporelles ({temporaryPermissions.filter((p) => p.status === 'ACTIVE').length})
          </button>
        </div>

        {activeSubTab === 'DELEGATIONS' ? (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddDelegationModal(true)}
            style={{ borderRadius: 10, padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Plus size={15} /> Nouvelle Délégation
          </button>
        ) : (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddTempPermModal(true)}
            style={{ borderRadius: 10, padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Plus size={15} /> Accorder Permission Temporelle
          </button>
        )}
      </div>

      {/* Vue Délégations */}
      {activeSubTab === 'DELEGATIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {delegations.length === 0 ? (
            <div className="card p-5" style={{ textAlign: 'center', color: '#94a3b8', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <UserCheck size={36} style={{ marginBottom: 8, opacity: 0.5 }} />
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>Aucune délégation active</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
                Les délégations permettent de transférer temporairement les droits d'un responsable.
              </p>
            </div>
          ) : (
            delegations.map((del) => (
              <div
                key={del.id}
                className="card shadow-sm"
                style={{
                  borderRadius: 14,
                  border: del.status === 'ACTIVE' ? '1px solid #86efac' : '1px solid #e2e8f0',
                  padding: '16px 20px',
                  background: del.status === 'ACTIVE' ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>{del.delegatorName}</span>
                      <ArrowRight size={14} color="#64748b" />
                      <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#2563eb' }}>{del.delegateeName}</span>
                      <span
                        className="badge"
                        style={{
                          background: del.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: del.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                          borderRadius: 999,
                          padding: '3px 10px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                        }}
                      >
                        {del.status === 'ACTIVE' ? 'ACTIF' : del.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 4 }}>
                      Rôle délégué : <strong>{del.roleLabel}</strong> — <em>"{del.reason}"</em>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Du {new Date(del.startDate).toLocaleDateString('fr-FR')} au {new Date(del.endDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {del.status === 'ACTIVE' && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => revokeDelegation(del.id, adminId, adminName)}
                      style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vue Permissions Temporelles */}
      {activeSubTab === 'TEMP_PERMS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {temporaryPermissions.length === 0 ? (
            <div className="card p-5" style={{ textAlign: 'center', color: '#94a3b8', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <Clock size={36} style={{ marginBottom: 8, opacity: 0.5 }} />
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>Aucune permission temporelle</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
                Accordez des accès d'action spécifiques sur une période définie.
              </p>
            </div>
          ) : (
            temporaryPermissions.map((perm) => (
              <div
                key={perm.id}
                className="card shadow-sm"
                style={{
                  borderRadius: 14,
                  border: perm.status === 'ACTIVE' ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  padding: '16px 20px',
                  background: perm.status === 'ACTIVE' ? '#eff6ff' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>{perm.userName}</span>
                      <span
                        className="badge"
                        style={{
                          background: perm.status === 'ACTIVE' ? '#dbeafe' : '#f1f5f9',
                          color: perm.status === 'ACTIVE' ? '#1d4ed8' : '#475569',
                          borderRadius: 999,
                          padding: '3px 10px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                        }}
                      >
                        {perm.status === 'ACTIVE' ? 'ACTIF' : perm.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 4 }}>
                      Permission : <code>{perm.moduleId}.{perm.action}</code> — <em>"{perm.reason}"</em>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                      Accordé par : {perm.grantedByName} — Valide du {new Date(perm.startDate).toLocaleDateString('fr-FR')} au {new Date(perm.endDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {perm.status === 'ACTIVE' && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => revokeTemporaryPermission(perm.id, adminId, adminName)}
                      style={{ borderRadius: 8, fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Nouvelle Délégation */}
      {showAddDelegationModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddDelegationModal(false)}>
          <div className="modal" style={{ maxWidth: 440, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Créer une Délégation de Pouvoir</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDelegationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDelegation}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Bénéficiaire (Délégué) *</label>
                  <input
                    className="form-input"
                    value={delegForm.delegateeName}
                    onChange={(e) => setDelegForm({ ...delegForm, delegateeName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle Délégué *</label>
                  <select
                    className="form-select"
                    value={delegForm.roleId}
                    onChange={(e) => setDelegForm({ ...delegForm, roleId: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Date Début</label>
                    <input
                      type="date"
                      className="form-input"
                      value={delegForm.startDate}
                      onChange={(e) => setDelegForm({ ...delegForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Date Fin</label>
                    <input
                      type="date"
                      className="form-input"
                      value={delegForm.endDate}
                      onChange={(e) => setDelegForm({ ...delegForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Motif / Justification *</label>
                  <input
                    className="form-input"
                    value={delegForm.reason}
                    onChange={(e) => setDelegForm({ ...delegForm, reason: e.target.value })}
                    placeholder="ex: Remplacement durant congés"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDelegationModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider la Délégation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Permission Temporelle */}
      {showAddTempPermModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddTempPermModal(false)}>
          <div className="modal" style={{ maxWidth: 440, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Permission Temporelle</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTempPermModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTempPerm}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Utilisateur *</label>
                  <input
                    className="form-input"
                    value={tempForm.userName}
                    onChange={(e) => setTempForm({ ...tempForm, userName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Module</label>
                    <select
                      className="form-select"
                      value={tempForm.moduleId}
                      onChange={(e) => setTempForm({ ...tempForm, moduleId: e.target.value as ModuleId })}
                    >
                      {MODULES_META.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Action</label>
                    <input
                      className="form-input"
                      value={tempForm.action}
                      onChange={(e) => setTempForm({ ...tempForm, action: e.target.value })}
                      placeholder="ex: edit, create"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Date Début</label>
                    <input
                      type="date"
                      className="form-input"
                      value={tempForm.startDate}
                      onChange={(e) => setTempForm({ ...tempForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Date Fin</label>
                    <input
                      type="date"
                      className="form-input"
                      value={tempForm.endDate}
                      onChange={(e) => setTempForm({ ...tempForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Motif *</label>
                  <input
                    className="form-input"
                    value={tempForm.reason}
                    onChange={(e) => setTempForm({ ...tempForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTempPermModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Accorder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
