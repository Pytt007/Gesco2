import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  studentName: string;
  matricule?: string;
  serviceType: 'transport' | 'cantine';
  totalPaid?: number;
  loading?: boolean;
}

export const ConfirmDeleteEnrollmentModal: React.FC<ConfirmDeleteEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Supprimer l'inscription",
  studentName,
  matricule,
  serviceType,
  totalPaid = 0,
  loading = false,
}) => {
  if (!isOpen) return null;

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
        className="card shadow-xl border-0"
        style={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          animation: 'fadeInScale 0.18s ease-out',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            background: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h6 style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '1.0625rem' }}>
                {title}
              </h6>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#b91c1c' }}>
                Action irréversible
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-link text-muted p-0"
            onClick={onClose}
            disabled={loading}
            style={{ textDecoration: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.9375rem', color: '#334155', margin: '0 0 16px' }}>
            Êtes-vous sûr de vouloir supprimer l'inscription {serviceType === 'transport' ? 'au transport' : 'à la cantine'} de :
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
              {studentName}
            </div>
            {matricule && (
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                Matricule : {matricule}
              </div>
            )}
          </div>

          {serviceType === 'transport' && (
            <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: 12 }}>
              💡 <em>La suppression libérera automatiquement la place occupée dans le véhicule de la navette.</em>
            </p>
          )}

          {totalPaid > 0 && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.8125rem',
                color: '#9f1239',
              }}
            >
              <strong>⚠️ Attention :</strong> Cet élève a déjà réglé un montant de{' '}
              <strong>{totalPaid.toLocaleString('fr-FR')} FCFA</strong>. En supprimant cette inscription, son dossier sera clôturé.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-outline-secondary fw-semibold"
              style={{ borderRadius: 10, padding: '8px 18px', fontSize: '0.875rem' }}
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-danger fw-semibold"
              style={{ borderRadius: 10, padding: '8px 20px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Confirmer la suppression
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
