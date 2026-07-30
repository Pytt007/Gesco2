import React, { useState } from 'react';
import { useCanteenPayment } from '../../hooks/canteen/useCanteenPayment';
import { CanteenEnrollment, RecordCanteenPaymentInput, CanteenPaymentMode, CanteenReceiptData } from '../../services/canteen/types';
import { CANTEEN_PAYMENT_MODE_LABELS } from '../../services/canteen/canteenPaymentService';
import { useSchoolYear } from '../../context/SchoolYearContext';
import {
  Search, User, CheckCircle2, AlertCircle, DollarSign,
  CreditCard, Printer, Download, RotateCcw, Clock, X, TrendingUp, UtensilsCrossed,
} from 'lucide-react';

// ─── Composant Reçu Cantine ─────────────────────────────────────────────────

interface CanteenReceiptModalProps {
  isOpen: boolean;
  receipt: CanteenReceiptData | null;
  onClose: () => void;
  onNewPayment: () => void;
}

const CanteenReceiptModal: React.FC<CanteenReceiptModalProps> = ({ isOpen, receipt, onClose, onNewPayment }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => window.print();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
        {/* Header succès */}
        <div style={{ padding: '24px 24px 0', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: '16px 16px 0 0', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>Paiement enregistré avec succès</h5>
          <p style={{ color: '#15803d', fontSize: '0.875rem', margin: '0 0 20px' }}>Reçu N° {receipt.receiptNumber}</p>
        </div>

        {/* Corps du reçu */}
        <div style={{ padding: '24px', borderTop: '2px dashed #86efac' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🍽️</div>
            <h6 style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>{receipt.schoolName}</h6>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0' }}>{receipt.schoolAddress} · {receipt.schoolPhone}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Année scolaire : {receipt.academicYear}</p>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
            <h6 style={{ fontWeight: 700, color: '#334155', marginBottom: 10, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Élève
            </h6>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.875rem' }}>
              <div><span style={{ color: '#64748b' }}>Nom :</span> <strong>{receipt.studentName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Matricule :</span> <strong>{receipt.matricule}</strong></div>
              <div><span style={{ color: '#64748b' }}>Classe :</span> <strong>{receipt.className}</strong></div>
              <div><span style={{ color: '#64748b' }}>Responsable :</span> <strong>{receipt.parentSponsorName}</strong></div>
            </div>
          </div>

          <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
            <h6 style={{ fontWeight: 700, color: '#0369a1', marginBottom: 10, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paiement Cantine
            </h6>
            <div style={{ display: 'grid', gap: 8, fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date</span>
                <strong>{new Date(receipt.paymentDate).toLocaleDateString('fr-FR')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mode</span>
                <strong>{receipt.paymentModeLabel}</strong>
              </div>
              {receipt.periodLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Période</span>
                  <strong>{receipt.periodLabel}</strong>
                </div>
              )}
              <div style={{ borderTop: '1px dashed #bae6fd', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0ea5e9', fontSize: '1.125rem' }}>
                <span>Montant payé</span>
                <span>{receipt.amountPaid.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total annuel</span>
                <span>{receipt.annualRate.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total payé</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{receipt.totalPaidAfter.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ color: receipt.remainingBalance === 0 ? '#16a34a' : '#ef4444' }}>Reste à payer</span>
                <span style={{ color: receipt.remainingBalance === 0 ? '#16a34a' : '#ef4444' }}>
                  {receipt.remainingBalance === 0 ? '✅ Soldé' : `${receipt.remainingBalance.toLocaleString('fr-FR')} FCFA`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} /> Imprimer
          </button>
          <button className="btn btn-outline-primary text-sm fw-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Télécharger PDF
          </button>
          <button className="btn btn-success fw-semibold ms-auto text-sm" onClick={onNewPayment} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={15} /> Nouveau paiement
          </button>
          <button className="btn btn-outline-secondary text-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de saisie du paiement ─────────────────────────────────────────────

interface CanteenPaymentModalProps {
  isOpen: boolean;
  enrollment: CanteenEnrollment;
  onClose: () => void;
  onSubmit: (input: RecordCanteenPaymentInput) => Promise<any>;
  isSubmitting: boolean;
}

const PAYMENT_MODES: CanteenPaymentMode[] = ['CASH', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'TRANSFER', 'CHECK'];

const CanteenPaymentModal: React.FC<CanteenPaymentModalProps> = ({ isOpen, enrollment, onClose, onSubmit, isSubmitting }) => {
  const [amount, setAmount] = useState<string>('');
  const [periodNumber, setPeriodNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<CanteenPaymentMode>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setAmount(String(enrollment.remainingBalance));
      setPeriodNumber('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('CASH');
      setReferenceNumber('');
      setRemarks('');
    }
  }, [isOpen, enrollment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      enrollmentId: enrollment.id,
      amount: parseFloat(amount) || 0,
      periodNumber: periodNumber ? parseInt(periodNumber) : undefined,
      paymentDate,
      paymentMode,
      referenceNumber: referenceNumber || undefined,
      remarks: remarks || undefined,
    });
  };

  const pendingPeriods = enrollment.periods.filter((p) => p.status !== 'PAID');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 500, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={20} color="#0ea5e9" />
            <div>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Enregistrer un paiement cantine</h5>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{enrollment.studentName}</p>
            </div>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={isSubmitting} style={{ borderRadius: 8 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'grid', gap: 16 }}>
            <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.8125rem' }}>
                <div><span style={{ color: '#64748b' }}>Total annuel :</span> <strong>{enrollment.netAmountDue.toLocaleString('fr-FR')} F</strong></div>
                <div><span style={{ color: '#64748b' }}>Payé :</span> <strong style={{ color: '#16a34a' }}>{enrollment.totalPaid.toLocaleString('fr-FR')} F</strong></div>
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: '#64748b' }}>Reste à payer :</span>
                  <strong style={{ color: '#ef4444', marginLeft: 6, fontSize: '1rem' }}>
                    {enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label fw-semibold text-sm">Montant payé (FCFA) *</label>
              <input
                type="number"
                className="form-control form-control-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
                max={enrollment.remainingBalance}
                step={1000}
                required
                style={{ fontWeight: 700, fontSize: '1.125rem', textAlign: 'right' }}
              />
            </div>

            {pendingPeriods.length > 0 && (
              <div>
                <label className="form-label fw-semibold text-sm">Période concernée (optionnel)</label>
                <select className="form-select" value={periodNumber} onChange={(e) => setPeriodNumber(e.target.value)}>
                  <option value="">Non spécifiée</option>
                  {pendingPeriods.map((p) => (
                    <option key={p.number} value={p.number}>
                      {p.label} — {p.amountDue.toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Date du paiement *</label>
                <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Mode de paiement *</label>
                <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as CanteenPaymentMode)} required>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>{CANTEEN_PAYMENT_MODE_LABELS[m]}</option>
                  ))}
                </select>
              </div>
            </div>

            {paymentMode !== 'CASH' && (
              <div>
                <label className="form-label fw-semibold text-sm">Référence transaction</label>
                <input type="text" className="form-control" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Ex : TXN-123456" />
              </div>
            )}

            <div>
              <label className="form-label fw-semibold text-sm">Remarques</label>
              <textarea className="form-control" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Observations..." />
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>Annuler</button>
            <button type="submit" className="btn btn-primary fw-semibold" disabled={isSubmitting}>
              {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement...</> : <><CheckCircle2 size={15} className="me-2" />Valider le paiement</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Vue principale Paiement Cantine ─────────────────────────────────────────

export const CanteenPaymentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const academicYearId = schoolYear?.id || 'ay-2026';

  const {
    searchQuery, searchResults, selectedEnrollment, paymentHistory,
    receipt, isReceiptOpen, isPaymentModalOpen, isSearching, isSubmitting,
    handleSearch, handleSelectEnrollment, handleOpenPaymentModal, handleClosePaymentModal,
    handleSubmitPayment, handleCloseReceipt, handleNewPayment,
  } = useCanteenPayment(academicYearId);

  const paymentPercent = selectedEnrollment
    ? Math.min(100, Math.round((selectedEnrollment.totalPaid / selectedEnrollment.netAmountDue) * 100))
    : 0;

  const statusInfo = selectedEnrollment
    ? selectedEnrollment.remainingBalance === 0
      ? { label: '🟢 À jour', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' }
      : selectedEnrollment.totalPaid > 0
        ? { label: '🟡 Paiement partiel', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
        : { label: '🔴 Impayé', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
    : null;

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
          Paiement Cantine
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Enregistrez un paiement cantine en moins de 30 secondes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Colonne gauche : Recherche + fiche */}
        <div>
          {/* Recherche */}
          <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-4">
              <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} color="#0ea5e9" /> Rechercher un élève
              </h6>
              <div className="search-bar-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input
                  type="text"
                  className="search-bar-input"
                  placeholder="Nom, matricule, classe..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-bar-clear" onClick={() => handleSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {isSearching && <p className="text-muted text-xs mt-2">Recherche en cours...</p>}
              {searchResults.length > 0 && (
                <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 12, background: '#ffffff', overflow: 'hidden', padding: '0 12px' }}>
                  <div className="gesco-dot-list">
                    {searchResults.map((e) => (
                      <div
                        key={e.id}
                        className="gesco-dot-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectEnrollment(e)}
                      >
                        <div className="gesco-dot-bullet" style={{ backgroundColor: e.remainingBalance === 0 ? '#10b981' : '#ef4444' }} />
                        <div className="gesco-dot-content">
                          <div className="gesco-dot-title">{e.studentName}</div>
                          <div className="gesco-dot-subtitle">
                            {e.matricule} — {e.className} · {e.remainingBalance === 0 ? 'Soldé' : `${e.remainingBalance.toLocaleString('fr-FR')} F restants`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fiche élève */}
          {selectedEnrollment && (
            <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-4">
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem', flexShrink: 0 }}>
                    {selectedEnrollment.studentName.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{selectedEnrollment.studentName}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedEnrollment.matricule}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedEnrollment.className}</p>
                  </div>
                </div>
                {selectedEnrollment.parentSponsor && (
                  <div style={{ fontSize: '0.8125rem', color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                    <strong>Responsable :</strong> {selectedEnrollment.parentSponsor}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : Situation cantine + historique */}
        <div>
          {selectedEnrollment ? (
            <>
              {/* Situation financière */}
              {statusInfo && (
                <div className="card mb-4" style={{ borderRadius: 12, border: `2px solid ${statusInfo.border}`, background: statusInfo.bg }}>
                  <div className="card-body p-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h6 style={{ fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UtensilsCrossed size={16} /> Situation cantine
                      </h6>
                      <span style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}`, borderRadius: 20, padding: '4px 12px', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                      {[
                        { label: 'Tarif annuel', value: selectedEnrollment.netAmountDue, color: '#0f172a' },
                        { label: 'Montant payé', value: selectedEnrollment.totalPaid, color: '#16a34a' },
                        { label: 'Reste à payer', value: selectedEnrollment.remainingBalance, color: selectedEnrollment.remainingBalance > 0 ? '#ef4444' : '#16a34a' },
                      ].map((item) => (
                        <div key={item.label} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#64748b' }}>{item.label}</p>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: item.color }}>
                            {item.value.toLocaleString('fr-FR')}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>FCFA</p>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569', marginBottom: 4 }}>
                        <span>Progression</span>
                        <span style={{ fontWeight: 600 }}>{paymentPercent}%</span>
                      </div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${paymentPercent}%`, background: paymentPercent === 100 ? '#16a34a' : '#0ea5e9', borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Périodes */}
              <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div className="card-body p-4">
                  <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#0ea5e9" /> Périodes de paiement
                  </h6>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {selectedEnrollment.periods.map((p) => {
                      const pct = p.amountDue > 0 ? Math.round((p.amountPaid / p.amountDue) * 100) : 0;
                      const pColor = p.status === 'PAID' ? '#16a34a' : p.status === 'PARTIAL' ? '#d97706' : '#94a3b8';
                      return (
                        <div key={p.number} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.status === 'PAID' ? '#f0fdf4' : p.status === 'PARTIAL' ? '#fffbeb' : '#f8fafc', border: `2px solid ${pColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: pColor }}>
                            P{p.number}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: 600 }}>{p.label}</span>
                              <span style={{ color: pColor, fontWeight: 600 }}>{pct}%</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {p.amountPaid.toLocaleString('fr-FR')} / {p.amountDue.toLocaleString('fr-FR')} FCFA
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bouton paiement */}
              {selectedEnrollment.remainingBalance > 0 ? (
                <button
                  className="btn btn-primary btn-lg fw-bold w-100 mb-4"
                  style={{ borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px' }}
                  onClick={handleOpenPaymentModal}
                >
                  <CreditCard size={20} /> Enregistrer un paiement cantine
                </button>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '16px', textAlign: 'center', marginBottom: 16 }}>
                  <CheckCircle2 size={24} color="#16a34a" style={{ marginBottom: 6 }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>Cantine soldée ✅</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#15803d' }}>Tous les paiements sont à jour.</p>
                </div>
              )}

              {/* Historique paiements */}
              {paymentHistory.length > 0 && (
                <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div className="card-body p-4">
                    <h6 style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={16} color="#0ea5e9" /> Historique des paiements
                    </h6>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {paymentHistory.map((ph) => (
                        <div key={ph.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{ph.receiptNumber}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                              {new Date(ph.paymentDate).toLocaleDateString('fr-FR')} · {CANTEEN_PAYMENT_MODE_LABELS[ph.paymentMode as CanteenPaymentMode]}
                            </p>
                          </div>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{ph.amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <UtensilsCrossed size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Recherchez un élève inscrit à la cantine</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>Tapez son nom, matricule ou classe dans la barre de recherche.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedEnrollment && isPaymentModalOpen && (
        <CanteenPaymentModal
          isOpen={isPaymentModalOpen}
          enrollment={selectedEnrollment}
          onClose={handleClosePaymentModal}
          onSubmit={handleSubmitPayment}
          isSubmitting={isSubmitting}
        />
      )}
      <CanteenReceiptModal
        isOpen={isReceiptOpen}
        receipt={receipt}
        onClose={handleCloseReceipt}
        onNewPayment={handleNewPayment}
      />
    </div>
  );
};
