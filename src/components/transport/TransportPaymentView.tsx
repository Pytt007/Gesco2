import React, { useState, useEffect } from 'react';
import { useTransportPayment } from '../../hooks/transport/useTransportPayment';
import {
  TransportEnrollment, RecordTransportPaymentInput, TransportPaymentMode, TransportReceiptData,
} from '../../services/transport/types';
import { TRANSPORT_PAYMENT_MODE_LABELS } from '../../services/transport/transportPaymentService';
import { useSchoolYear } from '../../context/SchoolYearContext';
import { documentEngineEnterprise, pdfRenderer } from '../../services/documents';
import {
  Search, Bus, CheckCircle2, DollarSign, CreditCard, Printer, Download,
  RotateCcw, Clock, X, TrendingUp, MapPin, AlertCircle,
} from 'lucide-react';

// ─── Modal Reçu ───────────────────────────────────────────────────────────────

const TransportReceiptModal: React.FC<{
  isOpen: boolean;
  receipt: TransportReceiptData | null;
  onClose: () => void;
  onNewPayment: () => void;
}> = ({ isOpen, receipt, onClose, onNewPayment }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = async () => {
    const sectionsHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #4f46e5; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">INFORMATIONS PASSAGER / ÉLÈVE</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Nom & Prénoms :</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${receipt.studentName}</td>
            <td style="padding: 4px 0; color: #64748b;">Matricule :</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${receipt.matricule}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Classe :</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${receipt.className}</td>
            <td style="padding: 4px 0; color: #64748b;">Ligne de Navette :</td>
            <td style="padding: 4px 0; font-weight: bold; color: #4f46e5;">${receipt.lineName}</td>
          </tr>
        </table>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">DÉTAILS DU RÈGLEMENT TRANSPORT</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #dcfce7;">
            <td style="padding: 8px 0; color: #374151;">Date du règlement :</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${new Date(receipt.paymentDate).toLocaleDateString('fr-FR')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dcfce7;">
            <td style="padding: 8px 0; color: #374151;">Mode de paiement :</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${receipt.paymentModeLabel}</td>
          </tr>
          ${receipt.periodLabel ? `
          <tr style="border-bottom: 1px solid #dcfce7;">
            <td style="padding: 8px 0; color: #374151;">Période couverte :</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${receipt.periodLabel}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: bold; color: #16a34a;">MONTANT ENCAISSÉ :</td>
            <td style="padding: 10px 0 0 0; font-size: 18px; font-weight: 900; color: #16a34a; text-align: right;">${receipt.amountPaid.toLocaleString('fr-FR')} FCFA</td>
          </tr>
        </table>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="color: #64748b;">Tarif Annuel Navette : ${receipt.annualRate.toLocaleString('fr-FR')} FCFA</td>
            <td style="color: #16a34a; font-weight: bold; text-align: center;">Total Payé : ${receipt.totalPaidAfter.toLocaleString('fr-FR')} FCFA</td>
            <td style="color: ${receipt.remainingBalance === 0 ? '#16a34a' : '#ef4444'}; font-weight: bold; text-align: right;">
              Solde : ${receipt.remainingBalance === 0 ? 'SOLDÉ' : receipt.remainingBalance.toLocaleString('fr-FR') + ' FCFA'}
            </td>
          </tr>
        </table>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px;">
        <div style="text-align: center; width: 200px;">
          <p style="margin: 0; font-weight: bold; color: #475569;">Signature du Parent / Payeur</p>
          <div style="height: 50px;"></div>
        </div>
        <div style="text-align: center; width: 200px;">
          <p style="margin: 0; font-weight: bold; color: #4f46e5;">La Caisse GESCO</p>
          <div style="height: 50px;"></div>
          <p style="margin: 0; color: #94a3b8;">Cachet Officiel</p>
        </div>
      </div>
    `;

    const doc = await documentEngineEnterprise.compileDocument({
      documentType: 'REÇU',
      title: `REÇU NAVETTE N° ${receipt.receiptNumber}`,
      subtitle: `ATTESTATION DE PAIEMENT TRANSPORT — ${receipt.lineName}`,
      meta: {
        MATRICULE: receipt.matricule,
        DATE: new Date(receipt.paymentDate).toLocaleDateString('fr-FR'),
        LIGNE: receipt.lineName,
      },
      data: receipt,
      sectionsHtml,
    });

    pdfRenderer.printHtml(doc.fullHtml);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', padding: 16 }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
        <div style={{ padding: '24px 24px 0', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: '16px 16px 0 0', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>Paiement enregistré avec succès</h5>
          <p style={{ color: '#15803d', fontSize: '0.875rem', margin: '0 0 20px' }}>Reçu N° {receipt.receiptNumber}</p>
        </div>
        <div style={{ padding: '24px', borderTop: '2px dashed #86efac' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '1.75rem', marginBottom: 4 }}>🚌</div>
            <h6 style={{ fontWeight: 700, margin: 0 }}>{receipt.schoolName}</h6>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0' }}>{receipt.schoolAddress} · {receipt.schoolPhone}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Année scolaire : {receipt.academicYear}</p>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <h6 style={{ fontWeight: 700, color: '#334155', marginBottom: 10, fontSize: '0.8125rem', textTransform: 'uppercase' }}>Élève</h6>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.875rem' }}>
              <div><span style={{ color: '#64748b' }}>Nom :</span> <strong>{receipt.studentName}</strong></div>
              <div><span style={{ color: '#64748b' }}>Matricule :</span> <strong>{receipt.matricule}</strong></div>
              <div><span style={{ color: '#64748b' }}>Classe :</span> <strong>{receipt.className}</strong></div>
              <div><span style={{ color: '#64748b' }}>Responsable :</span> <strong>{receipt.parentSponsorName}</strong></div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <h6 style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 10, fontSize: '0.8125rem', textTransform: 'uppercase' }}>Paiement Transport</h6>
            <div style={{ fontSize: '0.8125rem', color: '#334155', display: 'grid', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> Ligne : <strong>{receipt.lineName} ({receipt.zone})</strong></div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Date</span><strong>{new Date(receipt.paymentDate).toLocaleDateString('fr-FR')}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Mode</span><strong>{receipt.paymentModeLabel}</strong></div>
              {receipt.periodLabel && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Période</span><strong>{receipt.periodLabel}</strong></div>}
              <div style={{ borderTop: '1px dashed #bfdbfe', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#2563eb', fontSize: '1.125rem' }}>
                <span>Montant payé</span><span>{receipt.amountPaid.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Total annuel</span><span>{receipt.netAmountDue.toLocaleString('fr-FR')} FCFA</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Total payé</span><span style={{ color: '#16a34a', fontWeight: 600 }}>{receipt.totalPaidAfter.toLocaleString('fr-FR')} FCFA</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ color: receipt.remainingBalance === 0 ? '#16a34a' : '#ef4444' }}>Reste à payer</span>
                <span style={{ color: receipt.remainingBalance === 0 ? '#16a34a' : '#ef4444' }}>
                  {receipt.remainingBalance === 0 ? '✅ Soldé' : `${receipt.remainingBalance.toLocaleString('fr-FR')} FCFA`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Printer size={15} /> Imprimer</button>
          <button className="btn btn-outline-primary text-sm fw-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={15} /> PDF</button>
          <button className="btn btn-success fw-semibold ms-auto text-sm" onClick={onNewPayment} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RotateCcw size={15} /> Nouveau paiement</button>
          <button className="btn btn-outline-secondary text-sm" onClick={onClose}><X size={15} /></button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Paiement ────────────────────────────────────────────────────────────

const PAYMENT_MODES: TransportPaymentMode[] = ['CASH', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'TRANSFER', 'CHECK'];

const TransportPaymentModal: React.FC<{
  isOpen: boolean;
  enrollment: TransportEnrollment;
  onClose: () => void;
  onSubmit: (input: RecordTransportPaymentInput) => Promise<any>;
  isSubmitting: boolean;
}> = ({ isOpen, enrollment, onClose, onSubmit, isSubmitting }) => {
  const [amount, setAmount] = useState(String(enrollment.remainingBalance));
  const [periodNumber, setPeriodNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<TransportPaymentMode>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
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

  const pendingPeriods = enrollment.periods.filter((p) => p.status !== 'PAID');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: 500, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={20} color="white" />
            <div>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'white' }}>Paiement transport</h5>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>{enrollment.studentName} · {enrollment.lineName}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ enrollmentId: enrollment.id, amount: parseFloat(amount) || 0, periodNumber: periodNumber ? parseInt(periodNumber) : undefined, paymentDate, paymentMode, referenceNumber: referenceNumber || undefined, remarks: remarks || undefined }); }}>
          <div style={{ padding: 24, display: 'grid', gap: 16 }}>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.8125rem' }}>
                <div><span style={{ color: '#64748b' }}>Total :</span> <strong>{enrollment.netAmountDue.toLocaleString('fr-FR')} F</strong></div>
                <div><span style={{ color: '#64748b' }}>Payé :</span> <strong style={{ color: '#16a34a' }}>{enrollment.totalPaid.toLocaleString('fr-FR')} F</strong></div>
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: '#64748b' }}>Reste :</span>
                  <strong style={{ color: '#ef4444', marginLeft: 6, fontSize: '1rem' }}>{enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</strong>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label fw-semibold text-sm">Montant payé (FCFA) *</label>
              <input type="number" className="form-control form-control-lg" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={enrollment.remainingBalance} step={1000} required style={{ fontWeight: 700, fontSize: '1.125rem', textAlign: 'right' }} />
            </div>

            {pendingPeriods.length > 0 && (
              <div>
                <label className="form-label fw-semibold text-sm">Période concernée (optionnel)</label>
                <select className="form-select" value={periodNumber} onChange={(e) => setPeriodNumber(e.target.value)}>
                  <option value="">Non spécifiée</option>
                  {pendingPeriods.map((p) => <option key={p.number} value={p.number}>{p.label} — {p.amountDue.toLocaleString('fr-FR')} FCFA</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label fw-semibold text-sm">Date *</label>
                <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm">Mode de paiement *</label>
                <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as TransportPaymentMode)} required>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{TRANSPORT_PAYMENT_MODE_LABELS[m]}</option>)}
                </select>
              </div>
            </div>

            {paymentMode !== 'CASH' && (
              <div>
                <label className="form-label fw-semibold text-sm">Référence</label>
                <input type="text" className="form-control" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="TXN-XXXXXX" />
              </div>
            )}
            <div>
              <label className="form-label fw-semibold text-sm">Remarques</label>
              <textarea className="form-control" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>Annuler</button>
            <button type="submit" className="btn btn-primary fw-semibold" disabled={isSubmitting}>
              {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" />...</> : <><CheckCircle2 size={15} className="me-2" />Valider</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Vue principale Paiement Transport ────────────────────────────────────────

export const TransportPaymentView: React.FC = () => {
  const { schoolYear } = useSchoolYear();
  const academicYearId = schoolYear || 'ay-2026';
  const {
    searchQuery, searchResults, selectedEnrollment, paymentHistory,
    receipt, isReceiptOpen, isPaymentModalOpen, isSearching, isSubmitting,
    handleSearch, handleSelectEnrollment, handleOpenPaymentModal, handleClosePaymentModal,
    handleSubmitPayment, handleCloseReceipt, handleNewPayment,
  } = useTransportPayment(academicYearId);

  const pct = selectedEnrollment && selectedEnrollment.netAmountDue > 0
    ? Math.min(100, Math.round((selectedEnrollment.totalPaid / selectedEnrollment.netAmountDue) * 100))
    : 0;
  const isPaid = selectedEnrollment?.remainingBalance === 0;
  const isPartial = (selectedEnrollment?.totalPaid ?? 0) > 0 && !isPaid;

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Paiement Transport</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
          Enregistrez un paiement transport en moins de 30 secondes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Gauche */}
        <div>
          <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="card-body p-4">
              <h6 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} color="#2563eb" /> Rechercher un élève
              </h6>
              <div className="search-bar-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input type="text" className="search-bar-input" placeholder="Nom, matricule, classe, ligne..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
                {searchQuery && (
                  <button className="search-bar-clear" onClick={() => handleSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {isSearching && <p className="text-muted text-xs mt-2">Recherche...</p>}
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
                            {e.lineName} · {e.matricule} · {e.remainingBalance === 0 ? 'Soldé' : `${e.remainingBalance.toLocaleString('fr-FR')} F restants`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedEnrollment && (
            <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div className="card-body p-4">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                    {selectedEnrollment.studentName.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{selectedEnrollment.studentName}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>{selectedEnrollment.matricule} · {selectedEnrollment.className}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Bus size={12} /> {selectedEnrollment.lineName}</p>
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

        {/* Droite */}
        <div>
          {selectedEnrollment ? (
            <>
              {/* Situation */}
              <div className="card mb-4" style={{ borderRadius: 12, border: `2px solid ${isPaid ? '#86efac' : isPartial ? '#fde68a' : '#fca5a5'}` }}>
                <div className="card-body p-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h6 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bus size={16} /> Situation transport
                    </h6>
                    <span style={{ background: isPaid ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fef2f2', color: isPaid ? '#16a34a' : isPartial ? '#d97706' : '#dc2626', border: `1px solid ${isPaid ? '#86efac' : isPartial ? '#fde68a' : '#fca5a5'}`, borderRadius: 20, padding: '4px 12px', fontSize: '0.8125rem', fontWeight: 600 }}>
                      {isPaid ? '🟢 Soldé' : isPartial ? '🟡 Paiement partiel' : '🔴 Impayé'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {[
                      { label: 'Total annuel', val: selectedEnrollment.netAmountDue, color: '#0f172a' },
                      { label: 'Montant payé', val: selectedEnrollment.totalPaid, color: '#16a34a' },
                      { label: 'Reste à payer', val: selectedEnrollment.remainingBalance, color: isPaid ? '#16a34a' : '#ef4444' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: 'white', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.7rem', color: '#64748b' }}>{item.label}</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: item.color }}>{item.val.toLocaleString('fr-FR')}</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>FCFA</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#475569', marginBottom: 4 }}>
                      <span>Progression</span><span style={{ fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isPaid ? '#16a34a' : '#2563eb', borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Périodes */}
              <div className="card mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div className="card-body p-4">
                  <h6 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#2563eb" /> Périodes de paiement
                  </h6>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {selectedEnrollment.periods.map((p) => {
                      const pPct = p.amountDue > 0 ? Math.round((p.amountPaid / p.amountDue) * 100) : 0;
                      const pColor = p.status === 'PAID' ? '#16a34a' : p.status === 'PARTIAL' ? '#d97706' : '#94a3b8';
                      return (
                        <div key={p.number} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${pColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: pColor, background: p.status === 'PAID' ? '#f0fdf4' : 'white' }}>
                            P{p.number}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: 600 }}>{p.label}</span>
                              <span style={{ color: pColor, fontWeight: 600 }}>{pPct}%</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.amountPaid.toLocaleString('fr-FR')} / {p.amountDue.toLocaleString('fr-FR')} FCFA</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bouton paiement */}
              {!isPaid ? (
                <button
                  className="btn btn-primary btn-lg fw-bold w-100 mb-4"
                  style={{ borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14 }}
                  onClick={handleOpenPaymentModal}
                >
                  <CreditCard size={20} /> Enregistrer un paiement transport
                </button>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16 }}>
                  <CheckCircle2 size={24} color="#16a34a" style={{ marginBottom: 6 }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>Transport soldé ✅</p>
                </div>
              )}

              {/* Historique */}
              {paymentHistory.length > 0 && (
                <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div className="card-body p-4">
                    <h6 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={16} color="#2563eb" /> Historique des paiements
                    </h6>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {paymentHistory.map((ph) => (
                        <div key={ph.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{ph.receiptNumber}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{new Date(ph.paymentDate).toLocaleDateString('fr-FR')} · {TRANSPORT_PAYMENT_MODE_LABELS[ph.paymentMode as TransportPaymentMode]}</p>
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
              <Bus size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>Recherchez un élève inscrit au transport</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>Tapez son nom, matricule, classe ou ligne dans la barre de recherche.</p>
            </div>
          )}
        </div>
      </div>

      {selectedEnrollment && isPaymentModalOpen && (
        <TransportPaymentModal isOpen={isPaymentModalOpen} enrollment={selectedEnrollment} onClose={handleClosePaymentModal} onSubmit={handleSubmitPayment} isSubmitting={isSubmitting} />
      )}
      <TransportReceiptModal isOpen={isReceiptOpen} receipt={receipt} onClose={handleCloseReceipt} onNewPayment={handleNewPayment} />
    </div>
  );
};
