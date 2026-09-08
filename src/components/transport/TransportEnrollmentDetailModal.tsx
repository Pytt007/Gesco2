import React from 'react';
import {
  TransportEnrollment,
} from '../../services/transport/types';
import {
  X, Bus, User, Phone, DollarSign, Calendar, CheckCircle2,
  AlertCircle, Edit2, Trash2, ShieldAlert
} from 'lucide-react';

interface TransportEnrollmentDetailModalProps {
  isOpen: boolean;
  enrollment: TransportEnrollment | null;
  onClose: () => void;
  onEdit?: (enrollment: TransportEnrollment) => void;
  onDelete?: (enrollment: TransportEnrollment) => void;
}

export const TransportEnrollmentDetailModal: React.FC<TransportEnrollmentDetailModalProps> = ({
  isOpen,
  enrollment,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !enrollment) return null;

  const isPaid = enrollment.remainingBalance === 0;
  const isPartial = enrollment.totalPaid > 0 && enrollment.remainingBalance > 0;
  const pct = enrollment.netAmountDue > 0
    ? Math.round((enrollment.totalPaid / enrollment.netAmountDue) * 100)
    : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card shadow-2xl border-0"
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '92vh',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInScale 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
              }}
            >
              {enrollment.studentName.charAt(0)}
            </div>
            <div>
              <h5 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: '#ffffff' }}>
                {enrollment.studentName}
              </h5>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.8125rem', color: '#bfdbfe', marginTop: 3 }}>
                <span>{enrollment.matricule}</span>
                <span>•</span>
                <span>{enrollment.className}</span>
                {enrollment.levelCode && <span>({enrollment.levelCode})</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm text-white p-1"
            onClick={onClose}
            style={{ opacity: 0.8 }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'grid', gap: 18 }}>
          {/* Ligne assignée */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Bus size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                  Ligne de Navette
                </span>
                <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '1rem' }}>
                  {enrollment.lineName}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>
                  Zone : {enrollment.zone || 'Non spécifiée'}
                </div>
              </div>
            </div>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                  color: isPaid ? '#166534' : isPartial ? '#92400e' : '#991b1b',
                  border: `1px solid ${isPaid ? '#86efac' : isPartial ? '#fde68a' : '#fca5a5'}`,
                }}
              >
                {isPaid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {isPaid ? 'Soldé' : isPartial ? 'Partiel' : 'Impayé'}
              </span>
            </div>
          </div>

          {/* Synthèse financière */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tarif annuel</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {enrollment.annualFee.toLocaleString('fr-FR')} F
              </div>
            </div>
            {enrollment.discountAmount > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Remise</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                  – {enrollment.discountAmount.toLocaleString('fr-FR')} F
                </div>
              </div>
            )}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Net à payer</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', marginTop: 2 }}>
                {enrollment.netAmountDue.toLocaleString('fr-FR')} F
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Déjà payé</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', marginTop: 2 }}>
                {enrollment.totalPaid.toLocaleString('fr-FR')} F
              </div>
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600 }}>Reste dû</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#c2410c', marginTop: 2 }}>
                {enrollment.remainingBalance.toLocaleString('fr-FR')} F
              </div>
            </div>
          </div>

          {/* Barre progression */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Progression du règlement</span>
              <span style={{ fontWeight: 700, color: isPaid ? '#16a34a' : '#2563eb' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: isPaid ? '#16a34a' : 'linear-gradient(90deg, #2563eb, #6366f1)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Échéancier personnalisé détaillé */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} color="#2563eb" /> Échéancier ({enrollment.periods.length} échéance{enrollment.periods.length > 1 ? 's' : ''})
              </h6>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.8125rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>#</th>
                    <th style={{ padding: '8px 12px' }}>Libellé</th>
                    <th style={{ padding: '8px 12px' }}>Date limite</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Montant dû</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Payé</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Reste</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollment.periods.map((p) => {
                    const pReste = Math.max(0, p.amountDue - p.amountPaid);
                    const pPaid = p.status === 'PAID';
                    const pPart = p.status === 'PARTIAL';
                    return (
                      <tr key={p.number}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#64748b' }}>{p.number}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{p.label}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {p.dueDate ? new Date(p.dueDate).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {p.amountDue.toLocaleString('fr-FR')} F
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          {p.amountPaid.toLocaleString('fr-FR')} F
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: pReste > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                          {pReste.toLocaleString('fr-FR')} F
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              background: pPaid ? '#dcfce7' : pPart ? '#fef3c7' : '#f1f5f9',
                              color: pPaid ? '#166534' : pPart ? '#92400e' : '#475569',
                            }}
                          >
                            {pPaid ? 'Soldé' : pPart ? 'Partiel' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact Parent */}
          {(enrollment.parentSponsor || enrollment.parentPhone) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: '0.8125rem', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#334155' }}>
                <User size={13} /> Responsable / Tuteur : {enrollment.parentSponsor || 'Non renseigné'}
              </div>
              {enrollment.parentPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Phone size={13} /> Téléphone : {enrollment.parentPhone}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {onDelete && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm fw-semibold"
                style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { onClose(); onDelete(enrollment); }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm fw-semibold"
                style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { onClose(); onEdit(enrollment); }}
              >
                <Edit2 size={14} /> Modifier
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm fw-semibold"
            style={{ borderRadius: 8, padding: '6px 16px' }}
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
