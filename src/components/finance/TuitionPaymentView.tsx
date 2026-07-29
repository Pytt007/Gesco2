import React, { useState, useMemo } from 'react';
import { useTuitionPayment } from '../../hooks/finance/useTuitionPayment';
import { EnrollmentInstallmentItem, TuitionPaymentRecord, PaymentMode } from '../../services/finance/types';
import { PAYMENT_MODE_LABELS } from '../../services/finance/tuitionPaymentService';
import { PaymentRecordingModal } from './PaymentRecordingModal';
import { ReceiptModal } from './ReceiptModal';
import {
  Search,
  DollarSign,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Printer,
  FileText,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAcademicYears } from '../../hooks/academic';

export const TuitionPaymentView: React.FC = () => {
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>('ay-2026');

  const {
    enrollments,
    selectedEnrollment,
    paymentsHistory,
    activeReceipt,
    loading,
    error,
    recording,
    setSelectedEnrollmentId,
    setActiveReceipt,
    recordPayment,
    cancelPayment,
    printReceipt,
    downloadReceiptPDF,
  } = useTuitionPayment(selectedYearId);

  const [search, setSearch] = useState<string>('');
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [selectedInstallment, setSelectedInstallment] = useState<EnrollmentInstallmentItem | null>(null);
  const [cancelModalPayment, setCancelModalPayment] = useState<TuitionPaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase()) ||
      e.className.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectInstallment = (inst: EnrollmentInstallmentItem) => {
    setSelectedInstallment(inst);
    setPaymentModalOpen(true);
  };

  const handleOpenGeneralPayment = () => {
    setSelectedInstallment(null);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (data: {
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    referenceNumber?: string;
    remarks?: string;
    confirmOverpayment?: boolean;
  }) => {
    if (!selectedEnrollment) return false;

    const res = await recordPayment({
      enrollmentId: selectedEnrollment.id,
      ...data,
    });

    if (res) {
      setSuccessMessage(`✅ Paiement de ${data.amount.toLocaleString('fr-FR')} FCFA enregistré avec succès.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    }
    return false;
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalPayment || !cancelReason.trim()) return;

    const ok = await cancelPayment(cancelModalPayment.id, cancelReason.trim(), 'Direction Péda');
    if (ok) {
      setSuccessMessage(`Paiement ${cancelModalPayment.receiptNumber} annulé avec traçabilité d'audit.`);
      setCancelModalPayment(null);
      setCancelReason('');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Calcul du pourcentage payé et du badge de statut
  const percentagePaid = selectedEnrollment
    ? Math.min(100, Math.round((selectedEnrollment.totalPaid / (selectedEnrollment.netTotalDue || 1)) * 100))
    : 0;

  const statusBadge = useMemo(() => {
    if (!selectedEnrollment) return null;
    if (selectedEnrollment.remainingBalance <= 0) {
      return <span className="badge bg-success-subtle text-success fw-bold px-3 py-2" style={{ borderRadius: '20px', fontSize: '0.875rem' }}>🟢 Soldé</span>;
    }
    if (selectedEnrollment.totalPaid > 0) {
      return <span className="badge bg-warning-subtle text-warning fw-bold px-3 py-2" style={{ borderRadius: '20px', fontSize: '0.875rem' }}>🟡 Paiement partiel</span>;
    }
    return <span className="badge bg-danger-subtle text-danger fw-bold px-3 py-2" style={{ borderRadius: '20px', fontSize: '0.875rem' }}>🔴 Impayé</span>;
  }, [selectedEnrollment]);

  return (
    <div className="container-fluid p-4">
      {/* En-tête principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Paiement de la scolarité
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Enregistrement ultra-rapide des versements (&lt; 30 secondes), impression directe du reçu officiel et traçabilité d'audit.
          </p>
        </div>

        {selectedEnrollment && (
          <button
            className="btn btn-success text-sm fw-bold px-3"
            onClick={handleOpenGeneralPayment}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={16} /> Enregistrer un versement (&lt; 30s)
          </button>
        )}
      </div>

      {/* Barre de recherche d'élève & Sélection */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', backgroundColor: '#ffffff' }}
      >
        <div className="card-body p-3" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-bar-wrapper" style={{ flex: 1, minWidth: '280px' }}>
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              className="search-bar-input"
              placeholder="Rechercher élève par Nom, Prénom, Matricule ou Classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-bar-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Élève sélectionné :</span>
            <select
              className="form-select text-sm fw-bold"
              style={{ width: '280px' }}
              value={selectedEnrollment ? selectedEnrollment.id : ''}
              onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            >
              {filteredEnrollments.map((enr) => (
                <option key={enr.id} value={enr.id}>
                  {enr.studentName} ({enr.matricule}) - {enr.className}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger p-3 mb-4 text-sm" style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success p-3 mb-4 text-sm" style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {selectedEnrollment ? (
        <>
          {/* Fiche Élève Signalétique & Situation Financière */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-5">
              <div className="card p-3 shadow-sm h-100" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem' }}>
                    {selectedEnrollment.studentName.charAt(0)}
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{selectedEnrollment.studentName}</h5>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      Matricule : <strong>{selectedEnrollment.matricule}</strong> | Classe : <strong>{selectedEnrollment.className}</strong>
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                      Responsable payeur : <strong>{selectedEnrollment.parentSponsor || 'Parent d’Élève'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-7">
              <div className="card p-3 shadow-sm h-100" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h6 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                    Situation Financière
                  </h6>
                  {statusBadge}
                </div>

                <div className="row g-2 text-center mb-3">
                  <div className="col-4">
                    <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '6px' }}>
                      <span className="text-xs text-muted display-block">Total Annuel</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>
                        {selectedEnrollment.netTotalDue.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  </div>

                  <div className="col-4">
                    <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                      <span className="text-xs text-success display-block fw-semibold">Montant Payé</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#15803d' }}>
                        {selectedEnrollment.totalPaid.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  </div>

                  <div className="col-4">
                    <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                      <span className="text-xs text-danger display-block fw-semibold">Reste à Payer</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#dc2626' }}>
                        {selectedEnrollment.remainingBalance.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Barre de progression pourcentage payé */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    <span>Progression des réglements</span>
                    <span>{percentagePaid}% Payé</span>
                  </div>
                  <div className="progress" style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e2e8f0' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${percentagePaid}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau des Échéances */}
          <div
            className="card shadow-sm mb-4"
            style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}
          >
            <div className="card-header bg-light p-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>
                Échéancier des Versements (Cliquer sur une échéance pour régler)
              </h6>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-sm">
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>N°</th>
                    <th style={{ padding: '10px 14px' }}>Libellé</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Montant Prévu</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Montant Payé</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Reste</th>
                    <th style={{ padding: '10px 14px' }}>Date Prévue</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Statut</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEnrollment.installments.map((inst) => {
                    const dueLeft = Math.max(0, inst.amountDue - inst.amountPaid);
                    return (
                      <tr key={inst.number} style={{ cursor: 'pointer' }} onClick={() => handleSelectInstallment(inst)}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>N° {inst.number}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{inst.label}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                          {inst.amountDue.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                          {inst.amountPaid.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: dueLeft > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                          {dueLeft.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{inst.dueDate || 'Selon calendrier'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {inst.status === 'PAID' ? (
                            <span className="badge bg-success-subtle text-success text-xs">🟢 Payé</span>
                          ) : inst.status === 'PARTIAL' ? (
                            <span className="badge bg-warning-subtle text-warning text-xs">🟡 Partiel</span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger text-xs">🔴 En attente</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            className="btn btn-sm btn-outline-success text-xs fw-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectInstallment(inst);
                            }}
                          >
                            Régler
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historique des Versements */}
          <div
            className="card shadow-sm mb-4"
            style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}
          >
            <div className="card-header bg-light p-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>
                Historique des Versements de l'Élève ({paymentsHistory.length})
              </h6>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-sm">
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>N° Reçu</th>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Montant</th>
                    <th style={{ padding: '10px 14px' }}>Mode de règlement</th>
                    <th style={{ padding: '10px 14px' }}>Référence</th>
                    <th style={{ padding: '10px 14px' }}>Utilisateur</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Statut</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-muted">
                        Aucun versement enregistré pour cet élève.
                      </td>
                    </tr>
                  ) : (
                    paymentsHistory.map((pay) => (
                      <tr key={pay.id} style={{ opacity: pay.status === 'CANCELLED' ? 0.6 : 1 }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563eb' }}>
                          {pay.receiptNumber}
                        </td>
                        <td style={{ padding: '10px 14px' }}>{pay.paymentDate}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                          {pay.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge bg-light text-dark">{PAYMENT_MODE_LABELS[pay.paymentMode]}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8125rem', color: '#64748b' }}>
                          {pay.referenceNumber || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8125rem' }}>{pay.recordedBy}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {pay.status === 'VALIDATED' ? (
                            <span className="badge bg-success-subtle text-success text-xs">Validé</span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger text-xs" title={`Motif: ${pay.cancellationReason}`}>
                              Annulé ({pay.cancelledBy})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {pay.status === 'VALIDATED' && (
                            <button
                              className="btn btn-sm btn-outline-danger text-xs"
                              onClick={() => setCancelModalPayment(pay)}
                              title="Annuler avec motif (Audit)"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5 text-muted">
          Aucun élève trouvé ou sélectionné.
        </div>
      )}

      {/* Modale de Saisie d'un Versement */}
      {selectedEnrollment && (
        <PaymentRecordingModal
          isOpen={paymentModalOpen}
          studentName={selectedEnrollment.studentName}
          remainingBalance={selectedEnrollment.remainingBalance}
          selectedInstallment={selectedInstallment}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Modale d'Impression du Reçu Officiel */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        onPrint={printReceipt}
        onDownloadPdf={downloadReceiptPDF}
        onNewPayment={() => {
          setActiveReceipt(null);
          handleOpenGeneralPayment();
        }}
      />

      {/* Modale d'Annulation avec Traçabilité d'Audit */}
      {cancelModalPayment && (
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
            zIndex: 1080,
            padding: '16px',
          }}
        >
          <div className="card shadow-lg" style={{ width: '100%', maxWidth: '480px', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', backgroundColor: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
                Annuler le versement {cancelModalPayment.receiptNumber}
              </h5>
              <button onClick={() => setCancelModalPayment(null)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                &times;
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '16px' }}>
                Conformément aux règles d'audit financier GESCO, la suppression directe est interdite. L'annulation sera tracée avec motif.
              </p>
              <div className="mb-3">
                <label className="form-label text-sm fw-semibold">Motif de l'annulation (Requis pour l'audit)</label>
                <textarea
                  className="form-input text-sm"
                  rows={3}
                  placeholder="Ex: Erreur sur le mode de paiement ou doublon..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-secondary text-sm" onClick={() => setCancelModalPayment(null)}>
                  Abandonner
                </button>
                <button
                  className="btn btn-danger text-sm fw-bold"
                  disabled={!cancelReason.trim()}
                  onClick={handleConfirmCancel}
                >
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
