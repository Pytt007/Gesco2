// ─────────────────────────────────────────────────────────────────────────────
// GESCO — IAM / ApprovalsTab.tsx
// Queue des demandes d'approbation pour les actions sensibles
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck,
  FileCheck, Send, ArrowRight
} from 'lucide-react';
import { usePermissionContext } from '../../../context/PermissionContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import type { ApprovalActionType } from '../../../types/iam';

export default function ApprovalsTab() {
  const { currentUser } = useAuth();
  const { addNotification } = useToast();
  const { approvalRequests, processApprovalRequest, submitApprovalRequest } = usePermissionContext();

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [showDemoRequestModal, setShowDemoRequestModal] = useState(false);

  const [demoReqForm, setDemoReqForm] = useState({
    actionType: 'EDIT_PUBLISHED_GRADES' as ApprovalActionType,
    label: 'Modification des notes publiées de 6ème A',
    details: 'Correction d\'une erreur de saisie en Mathématiques (Note passée de 08 à 14/20 pour l\'élève KONÉ Aminata)',
  });

  const adminId = currentUser?.id || 'admin';
  const adminName = currentUser?.fullName || 'Administrateur';

  const filteredRequests = approvalRequests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleApprove = (id: string) => {
    processApprovalRequest(id, 'APPROVED', adminId, adminName);
    addNotification('success', 'Demande d\'approbation validée.');
  };

  const handleReject = (id: string, customReason?: string) => {
    const reason = customReason || 'Refusé par l\'administrateur';
    processApprovalRequest(id, 'REJECTED', adminId, adminName, reason);
    addNotification('error', 'Demande d\'approbation refusée.');
  };

  const handleCreateDemoReq = (e: React.FormEvent) => {
    e.preventDefault();
    submitApprovalRequest(
      {
        actionType: demoReqForm.actionType,
        label: demoReqForm.label,
        requesterId: adminId,
        requesterName: adminName,
        details: demoReqForm.details,
      },
      adminId,
      adminName
    );
    setShowDemoRequestModal(false);
    addNotification('success', 'Nouvelle demande d\'approbation soumise.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header & Filtres */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, padding: 4, background: '#f1f5f9', borderRadius: 12 }}>
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus(status)}
              style={{ borderRadius: 8, fontSize: '0.78125rem', fontWeight: 700 }}
            >
              {status === 'PENDING' && `En Attente (${approvalRequests.filter((r) => r.status === 'PENDING').length})`}
              {status === 'APPROVED' && 'Validées'}
              {status === 'REJECTED' && 'Refusées'}
              {status === 'ALL' && 'Toutes'}
            </button>
          ))}
        </div>

        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowDemoRequestModal(true)}
          style={{ borderRadius: 10, padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Send size={15} /> Simuler une Demande
        </button>
      </div>

      {/* Queue de validation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredRequests.length === 0 ? (
          <div className="card p-5" style={{ textAlign: 'center', color: '#94a3b8', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
            <FileCheck size={36} style={{ marginBottom: 8, opacity: 0.5 }} />
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>Aucune demande dans ce statut</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
              Les modifications de notes publiées, annulations de paiements et suppressions nécessitent une approbation.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="card shadow-sm"
              style={{
                borderRadius: 14,
                border: req.status === 'PENDING' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                padding: '16px 20px',
                background: req.status === 'PENDING' ? '#fffbeb' : '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#0f172a' }}>{req.label}</span>
                    <span
                      className="badge"
                      style={{
                        background:
                          req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                        color:
                          req.status === 'PENDING' ? '#92400e' : req.status === 'APPROVED' ? '#15803d' : '#b91c1c',
                        borderRadius: 999,
                        padding: '3px 10px',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                      }}
                    >
                      {req.status === 'PENDING' ? '⏳ En Attente' : req.status === 'APPROVED' ? '✓ Validé' : '✕ Refusé'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                    {req.details}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8, display: 'flex', gap: 16 }}>
                    <span>Demandé par : <strong>{req.requesterName}</strong></span>
                    <span>Date : {new Date(req.createdAt).toLocaleString('fr-FR')}</span>
                    {req.reviewedByName && (
                      <span>Traité par : <strong>{req.reviewedByName}</strong></span>
                    )}
                  </div>

                  {req.rejectionReason && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4, fontWeight: 700 }}>
                      Motif du refus : {req.rejectionReason}
                    </div>
                  )}
                </div>

                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-success text-white fw-bold"
                      onClick={() => handleApprove(req.id)}
                      style={{ borderRadius: 8, padding: '6px 14px', fontSize: '0.78125rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <CheckCircle2 size={14} /> Valider
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleReject(req.id)}
                      style={{ borderRadius: 8, padding: '6px 14px', fontSize: '0.78125rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <XCircle size={14} /> Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Simuler Demande */}
      {showDemoRequestModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDemoRequestModal(false)}>
          <div className="modal" style={{ maxWidth: 440, borderRadius: 16 }}>
            <div className="modal-header">
              <h3>Nouvelle Demande d'Approbation</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDemoRequestModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDemoReq}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Type d'Action Sensible *</label>
                  <select
                    className="form-select"
                    value={demoReqForm.actionType}
                    onChange={(e) => setDemoReqForm({ ...demoReqForm, actionType: e.target.value as ApprovalActionType })}
                  >
                    <option value="EDIT_PUBLISHED_GRADES">Modification de notes publiées</option>
                    <option value="VALIDATE_BULLETINS">Validation globale des bulletins</option>
                    <option value="DELETE_STUDENT_PERMANENT">Suppression définitive d'un élève</option>
                    <option value="CANCEL_PAYMENT">Annulation d'un paiement encaissé</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Titre de la demande *</label>
                  <input
                    className="form-input"
                    value={demoReqForm.label}
                    onChange={(e) => setDemoReqForm({ ...demoReqForm, label: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Justification / Détails *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={demoReqForm.details}
                    onChange={(e) => setDemoReqForm({ ...demoReqForm, details: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDemoRequestModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Soumettre</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
