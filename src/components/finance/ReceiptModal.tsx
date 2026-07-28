import React from 'react';
import { ReceiptData } from '../../services/finance/types';
import { CheckCircle2, Printer, Download, PlusCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onPrint: (htmlContent: string) => void;
  onDownloadPdf: (htmlContent: string, receiptNo: string) => void;
  onNewPayment: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  receipt,
  onClose,
  onPrint,
  onDownloadPdf,
  onNewPayment,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1070,
        padding: '16px',
      }}
    >
      <div
        className="card shadow-lg"
        style={{ width: '100%', maxWidth: '620px', borderRadius: '12px', overflow: 'hidden' }}
      >
        {/* Bandeau supérieur vert de succès */}
        <div
          style={{
            padding: '20px',
            backgroundColor: '#166534',
            color: '#ffffff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <CheckCircle2 size={44} style={{ margin: '0 auto 8px auto', display: 'block', color: '#86efac' }} />
          <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem', color: '#ffffff' }}>
            Paiement enregistré avec succès !
          </h4>
          <span style={{ fontSize: '0.875rem', color: '#bbf7d0', display: 'block', marginTop: '4px' }}>
            N° de Reçu Officiel : <strong>{receipt.receiptNumber}</strong>
          </span>
        </div>

        {/* Corps du Reçu */}
        <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            <div className="row g-2" style={{ fontSize: '0.875rem' }}>
              <div className="col-6">
                <span className="text-xs text-muted display-block">Élève :</span>
                <strong style={{ color: '#0f172a' }}>{receipt.studentName}</strong>
              </div>
              <div className="col-6">
                <span className="text-xs text-muted display-block">Matricule :</span>
                <strong style={{ color: '#0f172a' }}>{receipt.matricule}</strong>
              </div>
              <div className="col-6 mt-2">
                <span className="text-xs text-muted display-block">Classe :</span>
                <strong style={{ color: '#0f172a' }}>{receipt.className}</strong>
              </div>
              <div className="col-6 mt-2">
                <span className="text-xs text-muted display-block">Date du règlement :</span>
                <strong style={{ color: '#0f172a' }}>{receipt.paymentDate}</strong>
              </div>
              <div className="col-6 mt-2">
                <span className="text-xs text-muted display-block">Mode de Paiement :</span>
                <strong style={{ color: '#2563eb' }}>{receipt.paymentModeLabel}</strong>
              </div>
              <div className="col-6 mt-2">
                <span className="text-xs text-muted display-block">Référence :</span>
                <strong style={{ color: '#0f172a' }}>{receipt.referenceNumber || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Encadré du montant versé */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '10px',
              border: '2px solid #22c55e',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 600, display: 'block' }}>
              MONTANT VERSE
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
              {receipt.amountPaid.toLocaleString('fr-FR')} FCFA
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#475569', display: 'block', marginTop: '4px' }}>
              Solde Restant à Payer : <strong style={{ color: '#dc2626' }}>{receipt.remainingBalance.toLocaleString('fr-FR')} FCFA</strong>
            </span>
          </div>

          {/* Boutons d'action rapides */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline-primary text-sm"
              onClick={() => onPrint(receipt.htmlContent)}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Imprimer le reçu
            </button>

            <button
              className="btn btn-outline-secondary text-sm"
              onClick={() => onDownloadPdf(receipt.htmlContent, receipt.receiptNumber)}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> Télécharger PDF
            </button>

            <button
              className="btn btn-success text-sm"
              onClick={onNewPayment}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} /> Nouveau paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
