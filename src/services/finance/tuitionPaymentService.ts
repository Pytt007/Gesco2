import {
  TuitionPaymentRecord,
  RecordPaymentInput,
  ReceiptData,
  PaymentMode,
  StudentFinancialEnrollment,
} from './types';
import { studentFinancialEnrollmentService } from './studentFinancialEnrollmentService';
import { qrCodeService } from '../documents/qrCodeService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const localPaymentsStore: Map<string, TuitionPaymentRecord> = new Map();
let receiptCounter = 1001;

export function clearTuitionPaymentsStore() {
  localPaymentsStore.clear();
  receiptCounter = 1001;
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement',
  CHECK: 'Chèque',
};

export const tuitionPaymentService = {
  /**
   * Récupère la liste des versements effectués pour un dossier financier
   */
  async getPaymentsByEnrollment(enrollmentId: string): Promise<TuitionPaymentRecord[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('tuition_payments')
          .select('*')
          .eq('enrollment_id', enrollmentId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            enrollmentId: d.enrollment_id,
            receiptNumber: d.receipt_number,
            amount: Number(d.amount || 0),
            paymentDate: d.payment_date,
            paymentMode: d.payment_mode as PaymentMode,
            referenceNumber: d.reference_number,
            remarks: d.remarks,
            recordedBy: d.recorded_by || 'Comptabilité',
            status: d.status || 'VALIDATED',
            cancellationReason: d.cancellation_reason,
            cancelledBy: d.cancelled_by,
            cancelledAt: d.cancelled_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch {
      // Fallback local
    }

    return Array.from(localPaymentsStore.values()).filter((p) => p.enrollmentId === enrollmentId);
  },

  /**
   * Enregistre un versement rapide (< 30 sec) et met à jour automatiquement la situation financière
   */
  async recordPayment(
    input: RecordPaymentInput
  ): Promise<ServiceResponse<{ payment: TuitionPaymentRecord; receipt: ReceiptData }>> {
    // 1. Validations de base
    if (!input.enrollmentId) {
      return { success: false, error: 'Identifiant de dossier financier requis.' };
    }

    if (input.amount <= 0) {
      return { success: false, error: 'Le montant du versement doit être supérieur à zéro.' };
    }

    // 2. Chargement du dossier financier de l'élève
    // ✅ INT-005 P1 : Utiliser l'année scolaire depuis l'input, sinon fallback
    const academicYearId = input.academicYearId || 'ay-2026';
    const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear(academicYearId);
    const enrollment = enrollments.find((e) => e.id === input.enrollmentId);

    if (!enrollment) {
      return { success: false, error: 'Dossier financier introuvable.' };
    }

    if (enrollment.status === 'ARCHIVED') {
      return { success: false, error: 'Impossible d’enregistrer un versement sur un dossier financier archivé.' };
    }

    // 3. Contrôle du dépassement du solde restant (trop-perçu)
    if (input.amount > enrollment.remainingBalance && !input.confirmOverpayment) {
      return {
        success: false,
        error: `Le montant saisit (${input.amount.toLocaleString('fr-FR')} FCFA) dépasse le solde restant à payer (${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA). Veuillez confirmer explicitement la prise en compte de ce trop-perçu.`,
      };
    }

    // 4. Numéro de reçu — ✅ INT-003 P0 : Tentative de séquence Supabase pour unicité garantie
    let receiptNumber: string;
    try {
      const { data: seqRow } = await supabase
        .from('receipt_sequences')
        .select('next_value')
        .eq('year', new Date().getFullYear())
        .single();
      if (seqRow?.next_value) {
        receiptNumber = `REC-${new Date().getFullYear()}-${String(seqRow.next_value).padStart(6, '0')}`;
      } else {
        receiptNumber = `REC-${new Date().getFullYear()}-${String(receiptCounter++).padStart(6, '0')}`;
      }
    } catch {
      // Fallback sur compteur local si la table de séquence n'existe pas encore
      receiptNumber = `REC-${new Date().getFullYear()}-${String(receiptCounter++).padStart(6, '0')}`;
    }
    const paymentId = `pay-${Date.now()}`;
    const recordedBy = input.recordedBy || 'Comptabilité GESCO';

    const paymentRecord: TuitionPaymentRecord = {
      id: paymentId,
      enrollmentId: input.enrollmentId,
      receiptNumber,
      amount: Number(input.amount),
      paymentDate: input.paymentDate || new Date().toISOString().split('T')[0],
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      recordedBy,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localPaymentsStore.set(paymentId, paymentRecord);

    // 5. Mise à jour de la répartition du solde sur les 8 échéances
    let remainingPaymentToDistribute = input.amount;
    const updatedInstallments = enrollment.installments.map((inst) => {
      if (remainingPaymentToDistribute <= 0) return inst;

      const unpaidOnInstallment = Math.max(0, inst.amountDue - inst.amountPaid);
      if (unpaidOnInstallment <= 0) return inst;

      const paymentForThisInst = Math.min(remainingPaymentToDistribute, unpaidOnInstallment);
      remainingPaymentToDistribute -= paymentForThisInst;

      const newPaid = inst.amountPaid + paymentForThisInst;
      const status = newPaid >= inst.amountDue ? ('PAID' as const) : ('PARTIAL' as const);

      return {
        ...inst,
        amountPaid: newPaid,
        status,
      };
    });

    const newTotalPaid = enrollment.totalPaid + input.amount;
    const newRemainingBalance = Math.max(0, enrollment.netTotalDue - newTotalPaid);

    // Mise à jour du dossier financier en mémoire
    enrollment.totalPaid = newTotalPaid;
    enrollment.remainingBalance = newRemainingBalance;
    enrollment.installments = updatedInstallments;
    enrollment.updatedAt = new Date().toISOString();

    // 6. Génération du reçu officiel avec QR Code
    const receipt = await this.generateReceiptData(paymentRecord, enrollment);

    return {
      success: true,
      data: { payment: paymentRecord, receipt },
      message: '✅ Paiement enregistré avec succès.',
    };
  },

  /**
   * Génère les données officielles et l'empreinte QR Code d'un reçu
   */
  async generateReceiptData(
    payment: TuitionPaymentRecord,
    enrollment: StudentFinancialEnrollment
  ): Promise<ReceiptData> {
    const modeLabel = PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode;

    const payloadText = `GESCO-PAY|${payment.receiptNumber}|${enrollment.studentId}|${payment.amount}|${payment.paymentDate}`;
    const checksum = await qrCodeService.generateChecksum(payloadText);
    const qrCodeUrl = await qrCodeService.generateQRCodeDataURL({
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
        <title>Reçu de Paiement ${payment.receiptNumber}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .receipt-no { color: #2563eb; font-weight: 700; font-size: 1.2rem; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .amount-box { background-color: #f0fdf4; border: 2px solid #22c55e; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin:0;">ÉTABLISSEMENT GESCO</h2>
          <p style="margin:4px 0 0 0; font-size:14px; color:#64748b;">Reçu officiel de paiement des frais de scolarité</p>
          <div class="receipt-no">N° Reçu : ${payment.receiptNumber}</div>
        </div>

        <table class="info-table">
          <tr><td><strong>Élève :</strong> ${enrollment.studentName}</td><td><strong>Matricule :</strong> ${enrollment.matricule}</td></tr>
          <tr><td><strong>Classe :</strong> ${enrollment.className}</td><td><strong>Année Scolaire :</strong> 2026-2027</td></tr>
          <tr><td><strong>Responsable Payeur :</strong> ${enrollment.parentSponsor || 'Parent d’Élève'}</td><td><strong>Date du Versement :</strong> ${payment.paymentDate}</td></tr>
          <tr><td><strong>Mode de Règlement :</strong> ${modeLabel}</td><td><strong>Référence :</strong> ${payment.referenceNumber || 'N/A'}</td></tr>
        </table>

        <div class="amount-box">
          <span style="font-size:14px; color:#166534; font-weight:600;">MONTANT VERSE</span>
          <div style="font-size:28px; font-weight:800; color:#15803d;">${payment.amount.toLocaleString('fr-FR')} FCFA</div>
        </div>

        <p style="font-size:14px;"><strong>Solde Restant à Payer :</strong> ${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</p>

        <div class="footer">
          <div>
            <span style="font-size:12px; color:#64748b; display:block;">Signé par : ${payment.recordedBy}</span>
            <span style="font-size:11px; color:#94a3b8;">Empriente : ${checksum}</span>
          </div>
          <img src="${qrCodeUrl}" width="80" height="80" alt="QR Code d'Authenticité" />
        </div>
      </body>
      </html>
    `;

    return {
      receiptNumber: payment.receiptNumber,
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      academicYear: '2026-2027',
      parentSponsor: enrollment.parentSponsor || 'Parent d’Élève',
      paymentDate: payment.paymentDate,
      amountPaid: payment.amount,
      paymentModeLabel: modeLabel,
      referenceNumber: payment.referenceNumber,
      remainingBalance: enrollment.remainingBalance,
      checksum,
      qrCodeUrl,
      htmlContent,
    };
  },

  /**
   * Annule un versement avec traçabilité d'audit au lieu d'une suppression sauvage
   */
  async cancelPayment(
    paymentId: string,
    cancelledBy: string = 'Direction',
    reason: string = 'Erreur de saisie'
  ): Promise<ServiceResponse<boolean>> {
    const payment = localPaymentsStore.get(paymentId);
    if (!payment) {
      return { success: false, error: 'Paiement introuvable.' };
    }

    if (payment.status === 'CANCELLED') {
      return { success: false, error: 'Ce paiement a déjà été annulé.' };
    }

    // 1. Marquage comme annulé dans l'historique
    payment.status = 'CANCELLED';
    payment.cancellationReason = reason;
    payment.cancelledBy = cancelledBy;
    payment.cancelledAt = new Date().toISOString();
    payment.updatedAt = new Date().toISOString();
    localPaymentsStore.set(paymentId, payment);

    // 2. Ajustement en retour du solde du dossier financier
    const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear('ay-2026');
    const enrollment = enrollments.find((e) => e.id === payment.enrollmentId);

    if (enrollment) {
      enrollment.totalPaid = Math.max(0, enrollment.totalPaid - payment.amount);
      enrollment.remainingBalance = Math.max(0, enrollment.netTotalDue - enrollment.totalPaid);

      // Re-génération et ajustement des échéances
      let paidRemaining = enrollment.totalPaid;
      enrollment.installments = enrollment.installments.map((inst) => {
        if (paidRemaining <= 0) {
          return { ...inst, amountPaid: 0, status: 'PENDING' as const };
        }
        const paidForInst = Math.min(paidRemaining, inst.amountDue);
        paidRemaining -= paidForInst;
        const status = paidForInst >= inst.amountDue ? ('PAID' as const) : ('PARTIAL' as const);
        return { ...inst, amountPaid: paidForInst, status };
      });
    }

    return { success: true, data: true, message: 'Paiement annulé avec succès avec traçabilité d’audit.' };
  },
};
