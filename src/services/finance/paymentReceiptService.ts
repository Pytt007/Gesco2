import {
  ReceiptData,
  PaymentReceiptFilter,
  TuitionPaymentRecord,
  StudentFinancialEnrollment,
} from './types';
import { tuitionPaymentService, PAYMENT_MODE_LABELS } from './tuitionPaymentService';
import { studentFinancialEnrollmentService } from './studentFinancialEnrollmentService';
import { qrCodeService } from '../documents/qrCodeService';
import { ServiceResponse } from '../academic/academicYearsService';

const localReceiptsCache: Map<string, ReceiptData> = new Map();

export function clearPaymentReceiptsStore() {
  localReceiptsCache.clear();
}

export const paymentReceiptService = {
  /**
   * Construit et enregistre les données d'un reçu officiel lors d'un versement
   */
  async buildReceipt(
    payment: TuitionPaymentRecord,
    enrollment: StudentFinancialEnrollment
  ): Promise<ReceiptData> {
    const existing = localReceiptsCache.get(payment.receiptNumber);
    if (existing) {
      return existing;
    }

    const modeLabel = PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode;
    const totalPaidBefore = Math.max(0, enrollment.totalPaid - payment.amount);
    const statusLabel = enrollment.remainingBalance <= 0 ? 'SOLDÉ' : enrollment.totalPaid > 0 ? 'PARTIEL' : 'IMPAYÉ';

    const payloadText = `GESCO-REC|${payment.receiptNumber}|${enrollment.studentId}|${payment.amount}|${payment.paymentDate}`;
    const checksum = await qrCodeService.generateChecksum(payloadText);
    const qrCodeUrl = qrCodeService.generateQRCodeDataURL({
      documentId: payment.receiptNumber,
      documentType: 'RECEIPT',
      entityId: enrollment.studentId,
      schoolId: 'sch-01',
      checksum,
      createdAt: payment.paymentDate,
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Reçu Officiel de Paiement ${payment.receiptNumber}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; color: #0f172a; line-height: 1.4; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .school-name { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
          .receipt-title { background: #2563eb; color: #ffffff; padding: 6px 12px; font-weight: 800; border-radius: 6px; font-size: 14px; display: inline-block; margin-top: 6px; }
          .section-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #f8fafc; }
          .section-title { font-weight: 700; color: #1e293b; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 4px 6px; }
          .amount-banner { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 12px; text-align: center; margin: 16px 0; }
          .footer-signatures { display: flex; justify-content: space-between; margin-top: 24px; text-align: center; font-size: 11px; }
          .stamp-box { border: 2px dashed #94a3b8; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #2563eb; font-weight: bold; font-size: 10px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="school-name">ÉTABLISSEMENT GESCO</div>
            <div style="color: #64748b; font-size: 11px;">Excellence & Discipline | Abidjan, Côte d'Ivoire</div>
            <div style="color: #64748b; font-size: 11px;">Tél: +225 07 00 00 00 00 | Année Scolaire ${enrollment.academicYearId || ''}</div>
          </div>
          <div style="text-align: right;">
            <div class="receipt-title">REÇU DE PAIEMENT</div>
            <div style="font-weight: 800; color: #2563eb; margin-top: 4px; font-size: 14px;">${payment.receiptNumber}</div>
            <div style="color: #64748b; font-size: 11px;">Date : ${payment.paymentDate}</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">1. SIGNALÉTIQUE ÉLÈVE & RESPONSABLE PAYEUR</div>
          <table class="info-table">
            <tr>
              <td><strong>Nom & Prénom :</strong> ${enrollment.studentName}</td>
              <td><strong>Matricule :</strong> ${enrollment.matricule}</td>
            </tr>
            <tr>
              <td><strong>Classe :</strong> ${enrollment.className}</td>
              <td><strong>Responsable Payeur :</strong> ${enrollment.parentSponsor || 'Parent d’Élève'} (${enrollment.parentPhone || 'N/A'})</td>
            </tr>
          </table>
        </div>

        <div class="section-box">
          <div class="section-title">2. DÉTAILS DU VERSEMENT</div>
          <table class="info-table">
            <tr>
              <td><strong>Mode de Règlement :</strong> ${modeLabel}</td>
              <td><strong>Référence / N° Trans. :</strong> ${payment.referenceNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td colSpan="2"><strong>Observation :</strong> ${payment.remarks || 'Aucune observation'}</td>
            </tr>
          </table>
        </div>

        <div class="amount-banner">
          <div style="font-size: 11px; font-weight: 700; color: #166534;">MONTANT DU VERSEMENT REÇU</div>
          <div style="font-size: 24px; font-weight: 800; color: #15803d; margin: 4px 0;">${payment.amount.toLocaleString('fr-FR')} FCFA</div>
          <div style="font-size: 11px; color: #475569;">Enregistré par : ${payment.recordedBy}</div>
        </div>

        <div class="section-box">
          <div class="section-title">3. SITUATION FINANCIÈRE DE L'ÉLÈVE APPRÈS VERSEMENT</div>
          <table class="info-table">
            <tr>
              <td><strong>Montant Total Net :</strong> ${enrollment.netTotalDue.toLocaleString('fr-FR')} FCFA</td>
              <td><strong>Total Déjà Payé :</strong> ${enrollment.totalPaid.toLocaleString('fr-FR')} FCFA</td>
            </tr>
            <tr>
              <td><strong>Reste à Payer :</strong> <span style="color:#dc2626; font-weight:bold;">${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</span></td>
              <td><strong>Statut Global :</strong> <span style="color:#16a34a; font-weight:bold;">${statusLabel}</span></td>
            </tr>
          </table>
        </div>

        <div class="footer-signatures">
          <div style="width: 30%;">
            <div>Signature de l'Élève / Parent</div>
            <div style="height: 40px;"></div>
            <div style="color: #64748b;">(Lu et approuvé)</div>
          </div>
          <div style="width: 30%;">
            <div class="stamp-box">Cachet Officiel</div>
          </div>
          <div style="width: 30%;">
            <div>Signature du Gestionnaire / Directeur</div>
            <div style="height: 40px;"></div>
            <div style="font-weight: bold; color: #0f172a;">${payment.recordedBy}</div>
          </div>
        </div>

        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
          <div>Authenticité d'origine GESCO | Empreinte : ${checksum}</div>
          <img src="${qrCodeUrl}" width="60" height="60" alt="QR Code d'Authenticité" />
        </div>
      </body>
      </html>
    `;

    const receiptObj: ReceiptData = {
      id: payment.id,
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      schoolName: 'ÉTABLISSEMENT GESCO',
      schoolAddress: "Abidjan, Côte d'Ivoire",
      schoolPhone: '+225 07 00 00 00 00',
      academicYear: enrollment.academicYearId || payment.academicYearId || '',
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      parentSponsorName: enrollment.parentSponsor || 'Parent d’Élève',
      parentSponsorPhone: enrollment.parentPhone || 'N/A',
      paymentDate: payment.paymentDate,
      amountPaid: payment.amount,
      paymentModeLabel: modeLabel,
      referenceNumber: payment.referenceNumber,
      remarks: payment.remarks,
      totalAnnualFee: enrollment.netTotalDue,
      totalPaidBefore,
      remainingBalance: enrollment.remainingBalance,
      statusLabel,
      recordedBy: payment.recordedBy,
      checksum,
      qrCodeUrl,
      htmlContent,
      status: payment.status,
      cancellationReason: payment.cancellationReason,
      cancelledBy: payment.cancelledBy,
    };

    localReceiptsCache.set(payment.receiptNumber, receiptObj);
    return receiptObj;
  },

  /**
   * Récupère la liste de tous les reçus officiels émis
   */
  async getAllReceipts(academicYearId?: string): Promise<ReceiptData[]> {
    const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId || '');
    const result: ReceiptData[] = [];

    for (const enrollment of enrollments) {
      const payments = await tuitionPaymentService.getPaymentsByEnrollment(enrollment.id);
      for (const pay of payments) {
        const receipt = await this.buildReceipt(pay, enrollment);
        result.push(receipt);
      }
    }

    return result.sort((a, b) => b.receiptNumber.localeCompare(a.receiptNumber));
  },

  /**
   * Filtre multicritères sur l'historique des reçus
   */
  filterReceipts(receipts: ReceiptData[], filters: PaymentReceiptFilter): ReceiptData[] {
    return receipts.filter((r) => {
      // 1. Recherche par Numéro de reçu, Élève, Matricule ou Responsable
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchesNo = r.receiptNumber.toLowerCase().includes(q);
        const matchesName = r.studentName.toLowerCase().includes(q);
        const matchesMat = r.matricule.toLowerCase().includes(q);
        const matchesSponsor = r.parentSponsorName.toLowerCase().includes(q);
        const matchesClass = r.className.toLowerCase().includes(q);
        if (!matchesNo && !matchesName && !matchesMat && !matchesSponsor && !matchesClass) {
          return false;
        }
      }

      // 2. Filtre Classe
      if (filters.className && filters.className !== 'ALL' && r.className !== filters.className) {
        return false;
      }

      // 3. Filtre Statut
      if (filters.status && filters.status !== 'ALL' && r.status !== filters.status) {
        return false;
      }

      // 4. Filtre Plage de Dates
      if (filters.startDate && r.paymentDate < filters.startDate) {
        return false;
      }
      if (filters.endDate && r.paymentDate > filters.endDate) {
        return false;
      }

      return true;
    });
  },

  /**
   * Annule un reçu validé avec traçabilité d'audit au lieu d'une suppression physique
   */
  async cancelReceipt(
    receiptNumber: string,
    cancelledBy: string = 'Direction',
    reason: string = 'Erreur de saisie'
  ): Promise<ServiceResponse<boolean>> {
    const receipts = await this.getAllReceipts();
    const receipt = receipts.find((r) => r.receiptNumber === receiptNumber);

    if (!receipt || !receipt.paymentId) {
      return { success: false, error: 'Reçu introuvable.' };
    }

    // Appel du service d'annulation avec traçabilité
    const res = await tuitionPaymentService.cancelPayment(receipt.paymentId, cancelledBy, reason);
    if (res.success) {
      receipt.status = 'CANCELLED';
      receipt.cancellationReason = reason;
      receipt.cancelledBy = cancelledBy;
      localReceiptsCache.set(receiptNumber, receipt);
    }
    return res;
  },
};
