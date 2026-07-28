import React, { useState, useEffect } from 'react';
import { PaymentMode, EnrollmentInstallmentItem } from '../../services/finance/types';
import { PAYMENT_MODE_LABELS } from '../../services/finance/tuitionPaymentService';
import { X, DollarSign, Calendar, CreditCard, ShieldCheck } from 'lucide-react';

interface PaymentRecordingModalProps {
  isOpen: boolean;
  studentName: string;
  remainingBalance: number;
  selectedInstallment?: EnrollmentInstallmentItem | null;
  onClose: () => void;
  onConfirm: (data: {
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    referenceNumber?: string;
    remarks?: string;
    confirmOverpayment?: boolean;
  }) => Promise<boolean>;
}

export const PaymentRecordingModal: React.FC<PaymentRecordingModalProps> = ({
  isOpen,
  studentName,
  remainingBalance,
  selectedInstallment,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [showOverpaymentWarning, setShowOverpaymentWarning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (selectedInstallment) {
      const dueLeft = Math.max(0, selectedInstallment.amountDue - selectedInstallment.amountPaid);
      setAmount(dueLeft > 0 ? dueLeft.toString() : selectedInstallment.amountDue.toString());
    } else {
      setAmount(remainingBalance > 0 ? remainingBalance.toString() : '50000');
    }
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('CASH');
    setReferenceNumber('');
    setRemarks('');
    setShowOverpaymentWarning(false);
    setError(null);
  }, [selectedInstallment, remainingBalance, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, forceConfirmOverpayment: boolean = false) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Le montant du versement doit être supérieur à zéro.');
      return;
    }

    if (numericAmount > remainingBalance && !forceConfirmOverpayment && !showOverpaymentWarning) {
      setShowOverpaymentWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onConfirm({
        amount: numericAmount,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        confirmOverpayment: forceConfirmOverpayment || showOverpaymentWarning,
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement du versement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1060,
        padding: '16px',
      }}
    >
      <div
        className="card shadow-lg"
        style={{ width: '100%', maxWidth: '520px', borderRadius: '12px', overflow: 'hidden' }}
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
          <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#ffffff' }}>
            Enregistrer un versement — {studentName}
          </h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} style={{ padding: '20px' }}>
          {error && (
            <div className="alert alert-danger p-2 mb-3 text-sm" style={{ borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {showOverpaymentWarning && (
            <div
              className="alert alert-warning p-3 mb-3 text-sm"
              style={{ borderRadius: '8px', borderLeft: '4px solid #d97706' }}
            >
              <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Dépassement du solde dû (Trop-perçu)</strong>
              Le montant saisit ({Number(amount).toLocaleString('fr-FR')} FCFA) est supérieur au reste à payer ({remainingBalance.toLocaleString('fr-FR')} FCFA).
              Confirmez-vous l'enregistrement de ce trop-perçu ?
              <div className="mt-2" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-warning fw-bold text-xs"
                  onClick={(e) => handleSubmit(e, true)}
                >
                  Oui, confirmer le trop-perçu
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-xs"
                  onClick={() => setShowOverpaymentWarning(false)}
                >
                  Modifier le montant
                </button>
              </div>
            </div>
          )}

          {selectedInstallment && (
            <div className="alert alert-info p-2 mb-3 text-xs fw-semibold" style={{ borderRadius: '6px' }}>
              Paiement pré-rempli pour : {selectedInstallment.label} (Reste dû sur l'échéance : {(selectedInstallment.amountDue - selectedInstallment.amountPaid).toLocaleString('fr-FR')} FCFA)
            </div>
          )}

          {/* Montant */}
          <div className="mb-3">
            <label className="form-label text-sm fw-semibold">Montant du versement (FCFA)</label>
            <input
              type="number"
              min="1"
              className="form-input text-base fw-bold text-primary"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 50000"
              required
              autoFocus
            />
          </div>

          {/* Date & Mode de paiement */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label text-sm fw-semibold">Date du règlement</label>
              <input
                type="date"
                className="form-input text-sm"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="col-6">
              <label className="form-label text-sm fw-semibold">Mode de paiement</label>
              <select
                className="form-select text-sm fw-semibold"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              >
                {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Référence transaction */}
          <div className="mb-3">
            <label className="form-label text-sm fw-semibold">Référence / N° Transaction (Optionnel)</label>
            <input
              type="text"
              className="form-input text-sm"
              placeholder="Ex: TXN-998823 ou N° Chèque"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Observation */}
          <div className="mb-4">
            <label className="form-label text-sm fw-semibold">Observation (Optionnel)</label>
            <input
              type="text"
              className="form-input text-sm"
              placeholder="Ex: Versement partiel Échéance 2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary text-sm" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-success text-sm fw-bold" disabled={submitting}>
              {submitting ? 'Validation...' : '✓ Valider le versement (&lt; 30s)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
