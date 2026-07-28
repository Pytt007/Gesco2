import React, { useState, useEffect } from 'react';
import { StudentFinancialEnrollment, TuitionPaymentRecord } from '../../services/finance/types';
import { tuitionPaymentService, PAYMENT_MODE_LABELS } from '../../services/finance/tuitionPaymentService';
import { Printer, Download, X, FileText } from 'lucide-react';

interface FinancialStatementModalProps {
  isOpen: boolean;
  enrollment: StudentFinancialEnrollment | null;
  onClose: () => void;
  onPrint: (enrollment: StudentFinancialEnrollment) => void;
  onDownloadPdf: (enrollment: StudentFinancialEnrollment) => void;
}

export const FinancialStatementModal: React.FC<FinancialStatementModalProps> = ({
  isOpen,
  enrollment,
  onClose,
  onPrint,
  onDownloadPdf,
}) => {
  const [payments, setPayments] = useState<TuitionPaymentRecord[]>([]);

  useEffect(() => {
    if (enrollment) {
      tuitionPaymentService.getPaymentsByEnrollment(enrollment.id).then(setPayments);
    }
  }, [enrollment]);

  if (!isOpen || !enrollment) return null;

  const progress = Math.min(100, Math.round((enrollment.totalPaid / (enrollment.netTotalDue || 1)) * 100));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1070,
        padding: '16px',
      }}
    >
      <div
        className="card shadow-lg"
        style={{ width: '100%', maxWidth: '720px', borderRadius: '12px', overflow: 'hidden' }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Relevé Financier — {enrollment.studentName}
          </h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', backgroundColor: '#ffffff', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Signalétique Élève */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div className="row g-2 text-sm">
              <div className="col-6"><strong>Élève :</strong> {enrollment.studentName}</div>
              <div className="col-6"><strong>Matricule :</strong> {enrollment.matricule}</div>
              <div className="col-6"><strong>Classe :</strong> {enrollment.className}</div>
              <div className="col-6"><strong>Responsable :</strong> {enrollment.parentSponsor || 'Parent d’Élève'}</div>
            </div>
          </div>

          {/* Synthèse des chiffres */}
          <div className="row g-2 mb-4 text-center">
            <div className="col-4">
              <div className="p-2 rounded border bg-light">
                <span className="text-xs text-muted display-block">Net Dû</span>
                <strong style={{ color: '#0f172a' }}>{enrollment.netTotalDue.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>
            <div className="col-4">
              <div className="p-2 rounded border bg-success-subtle border-success">
                <span className="text-xs text-success display-block fw-semibold">Total Payé</span>
                <strong style={{ color: '#15803d' }}>{enrollment.totalPaid.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>
            <div className="col-4">
              <div className="p-2 rounded border bg-danger-subtle border-danger">
                <span className="text-xs text-danger display-block fw-semibold">Reste à Payer</span>
                <strong style={{ color: '#dc2626' }}>{enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>
          </div>

          {/* Progression */}
          <div className="mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              <span>Progression globale ({enrollment.remainingBalance <= 0 ? '🟢 Soldé' : enrollment.totalPaid > 0 ? '🟡 Partiel' : '🔴 Impayé'})</span>
              <span>{progress}%</span>
            </div>
            <div className="progress" style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e2e8f0' }}>
              <div className="progress-bar bg-success" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Table des versements */}
          <h6 className="fw-bold mb-2 text-sm" style={{ color: '#1e293b' }}>
            Historique des Règlements ({payments.length})
          </h6>
          <div className="table-responsive border rounded mb-4">
            <table className="table table-sm align-middle mb-0 text-xs">
              <thead className="bg-light">
                <tr>
                  <th>N° Reçu</th>
                  <th>Date</th>
                  <th className="text-end">Montant</th>
                  <th>Mode</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-3 text-muted">
                      Aucun versement enregistré.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ opacity: p.status === 'CANCELLED' ? 0.5 : 1 }}>
                      <td className="fw-bold text-primary">{p.receiptNumber}</td>
                      <td>{p.paymentDate}</td>
                      <td className="text-end fw-bold text-success">{p.amount.toLocaleString('fr-FR')} FCFA</td>
                      <td>{PAYMENT_MODE_LABELS[p.paymentMode]}</td>
                      <td className="text-center">
                        <span className={`badge ${p.status === 'VALIDATED' ? 'bg-success' : 'bg-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary text-sm" onClick={onClose}>
              Fermer
            </button>
            <button className="btn btn-outline-primary text-sm" onClick={() => onPrint(enrollment)}>
              <Printer size={16} /> Imprimer le relevé
            </button>
            <button className="btn btn-primary text-sm" onClick={() => onDownloadPdf(enrollment)}>
              <Download size={16} /> Télécharger PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
