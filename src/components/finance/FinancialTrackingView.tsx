import React, { useState } from 'react';
import { useFinancialTracking } from '../../hooks/finance/useFinancialTracking';
import { StudentFinancialEnrollment, TuitionLevelCode } from '../../services/finance/types';
import { FinancialStatementModal } from './FinancialStatementModal';
import { PaymentRecordingModal } from './PaymentRecordingModal';
import { ReceiptModal } from './ReceiptModal';
import { useTuitionPayment } from '../../hooks/finance/useTuitionPayment';
import {
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Eye,
  PlusCircle,
  TrendingUp,
  X,
} from 'lucide-react';

const LEVEL_OPTIONS: { code: TuitionLevelCode | 'ALL'; name: string }[] = [
  { code: 'ALL', name: 'Tous les niveaux' },
  { code: 'PS', name: 'Petite Section (PS)' },
  { code: 'MS', name: 'Moyenne Section (MS)' },
  { code: 'GS', name: 'Grande Section (GS)' },
  { code: 'CP1', name: 'CP1' },
  { code: 'CP2', name: 'CP2' },
  { code: 'CE1', name: 'CE1' },
  { code: 'CE2', name: 'CE2' },
  { code: 'CM1', name: 'CM1' },
  { code: 'CM2', name: 'CM2' },
];

export const FinancialTrackingView: React.FC = () => {
  const {
    filteredEnrollments,
    kpis,
    alerts,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    exportExcel,
    printStatement,
    downloadStatementPDF,
    refresh,
  } = useFinancialTracking('ay-2026');

  const { recordPayment, printReceipt, downloadReceiptPDF, activeReceipt, setActiveReceipt } =
    useTuitionPayment('ay-2026');

  // Modales
  const [statementEnrollment, setStatementEnrollment] = useState<StudentFinancialEnrollment | null>(null);
  const [paymentEnrollment, setPaymentEnrollment] = useState<StudentFinancialEnrollment | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpenPayment = (enrollment: StudentFinancialEnrollment) => {
    setPaymentEnrollment(enrollment);
  };

  const handleConfirmPaymentModal = async (data: any) => {
    if (!paymentEnrollment) return false;
    const res = await recordPayment({
      enrollmentId: paymentEnrollment.id,
      ...data,
    });

    if (res) {
      setSuccessMsg(`✅ Paiement enregistré avec succès pour ${paymentEnrollment.studentName}`);
      refresh();
      setTimeout(() => setSuccessMsg(null), 4000);
      return true;
    }
    return false;
  };

  return (
    <div className="container-fluid p-4">
      {/* En-tête principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Suivi des paiements
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Tableau de suivi financier global des élèves, indicateurs de recouvrement et génération de relevés.
          </p>
        </div>

        {/* Boutons d'exportation globaux */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline-success text-sm fw-semibold" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} /> Exporter Excel
          </button>

          <button className="btn btn-outline-secondary text-sm fw-semibold" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Imprimer la vue
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success p-3 mb-4 text-sm fw-semibold" style={{ borderRadius: '8px' }}>
          {successMsg}
        </div>
      )}

      {/* Cartes KPI (7 Indicateurs de suivi - Style Dashboard Dynamique) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Élèves - Royal Blue */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Effectif</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Élèves</span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.totalStudents}</div>
        </div>

        {/* Soldés - Émeraude */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Payé</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Soldés</span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.paidStudents}</div>
        </div>

        {/* Partiels - Orange Amber */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Acompte</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Partiels</span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.partialStudents}</div>
        </div>

        {/* Impayés - Rouge */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Relance</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Impayés</span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.unpaidStudents}</div>
        </div>

        {/* Total Encaissé - Sarcelle */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(20, 184, 166, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Encaissé</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Total Encaissé</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.totalCollected.toLocaleString('fr-FR')} F</div>
        </div>

        {/* Reste à Encaisser - Crimson */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(190, 18, 60, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Reste</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Reste à Encaisser</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.totalRemaining.toLocaleString('fr-FR')} F</div>
        </div>

        {/* Taux Recouvrement - Violet */}
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(79, 70, 229, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff' }}>Ratio</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#ffffff" />
            </div>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Recouvrement</span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif", marginTop: '4px' }}>{kpis.recoveryRate}%</div>
        </div>
      </div>

      {/* Bannière d'Alertes Financières */}
      {alerts.length > 0 && (
        <div className="alert alert-warning p-3 mb-4 shadow-sm" style={{ borderRadius: '10px', borderLeft: '5px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={18} style={{ color: '#d97706' }} />
            <strong style={{ fontSize: '0.9375rem', color: '#92400e' }}>
              Alertes Financières Automatiques ({alerts.length} dossier(s) à attention particulière)
            </strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', color: '#78350f' }}>
            {alerts.slice(0, 3).map((alt, idx) => (
              <li key={idx}>
                <strong>{alt.studentName}</strong> ({alt.className}) : {alt.message}
              </li>
            ))}
            {alerts.length > 3 && (
              <li style={{ fontStyle: 'italic', marginTop: '2px' }}>
                et {alerts.length - 3} autre(s) élève(s) avec solde impayé important...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Barre de Recherche et Filtres Multicritères */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', backgroundColor: '#ffffff' }}
      >
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            {/* Recherche texte */}
            <div className="col-12 col-md-4">
              <div className="search-bar-wrapper">
                <Search size={16} className="search-bar-icon" />
                <input
                  type="text"
                  className="search-bar-input"
                  placeholder="Recherche par Nom, Prénom, Matricule ou Responsable..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                />
                {filters.search && (
                  <button className="search-bar-clear" onClick={() => updateFilter('search', '')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre Niveau */}
            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="form-select text-sm fw-semibold"
                value={filters.levelCode || 'ALL'}
                onChange={(e) => updateFilter('levelCode', e.target.value)}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Statut */}
            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="form-select text-sm fw-semibold"
                value={filters.status || 'ALL'}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PAID">🟢 Soldé</option>
                <option value="PARTIAL">🟡 Paiement partiel</option>
                <option value="UNPAID">🔴 Impayé</option>
              </select>
            </div>

            {/* Reinitialiser */}
            <div className="col-12 col-md-2 text-end">
              <button className="btn btn-outline-secondary text-sm w-100" onClick={resetFilters}>
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des Élèves */}
      <div
        className="card shadow-sm mb-4"
        style={{ borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 14px' }}>Matricule</th>
                <th style={{ padding: '12px 14px' }}>Nom & Prénom</th>
                <th style={{ padding: '12px 14px' }}>Classe</th>
                <th style={{ padding: '12px 14px' }}>Responsable Payeur</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Montant Total</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Montant Payé</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Reste à Payer</th>
                <th style={{ padding: '12px 14px', width: '120px' }}>Progression</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Statut</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    Aucun dossier financier correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enr) => {
                  const progress = Math.min(100, Math.round((enr.totalPaid / (enr.netTotalDue || 1)) * 100));
                  return (
                    <tr key={enr.id}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2563eb' }}>{enr.matricule}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{enr.studentName}</td>
                      <td style={{ padding: '10px 14px' }}>{enr.className}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{enr.parentSponsor || 'Parent d’Élève'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {enr.netTotalDue.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                        {enr.totalPaid.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: enr.remainingBalance > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                        {enr.remainingBalance.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="progress flex-fill" style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0' }}>
                            <div className="progress-bar bg-success" style={{ width: `${progress}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {enr.remainingBalance <= 0 ? (
                          <span className="badge bg-success-subtle text-success text-xs">🟢 Soldé</span>
                        ) : enr.totalPaid > 0 ? (
                          <span className="badge bg-warning-subtle text-warning text-xs">🟡 Partiel</span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger text-xs">🔴 Impayé</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm btn-outline-primary p-1"
                            title="Voir le relevé financier"
                            onClick={() => setStatementEnrollment(enr)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success p-1"
                            title="Enregistrer un versement"
                            onClick={() => handleOpenPayment(enr)}
                          >
                            <PlusCircle size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary p-1"
                            title="Imprimer le relevé"
                            onClick={() => printStatement(enr)}
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-dark p-1"
                            title="Télécharger PDF"
                            onClick={() => downloadStatementPDF(enr)}
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale d'Affichage du Relevé Financier */}
      <FinancialStatementModal
        isOpen={!!statementEnrollment}
        enrollment={statementEnrollment}
        onClose={() => setStatementEnrollment(null)}
        onPrint={printStatement}
        onDownloadPdf={downloadStatementPDF}
      />

      {/* Modale d'Enregistrement de Versement Direct */}
      {paymentEnrollment && (
        <PaymentRecordingModal
          isOpen={!!paymentEnrollment}
          studentName={paymentEnrollment.studentName}
          remainingBalance={paymentEnrollment.remainingBalance}
          onClose={() => setPaymentEnrollment(null)}
          onConfirm={handleConfirmPaymentModal}
        />
      )}

      {/* Modale Reçu Officiel après Paiement Direct */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        onPrint={printReceipt}
        onDownloadPdf={downloadReceiptPDF}
        onNewPayment={() => {
          setActiveReceipt(null);
        }}
      />
    </div>
  );
};
