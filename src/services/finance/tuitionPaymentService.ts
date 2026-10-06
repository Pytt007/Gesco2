import {
  TuitionPaymentRecord,
  RecordPaymentInput,
  ReceiptData,
  PaymentMode,
  StudentFinancialEnrollment,
} from './types';
import { qrCodeService } from '../documents/qrCodeService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';
import { fetchSchoolInfo } from '../settings/settingsService';

export function clearTuitionPaymentsStore() { /* No browser persistence. */ }

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

export const tuitionPaymentService = {
  /**
   * Vérifie si le client est connecté au réseau
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  /**
   * Retourne le nombre d'encaissements en attente de synchronisation distante
   */
  getPendingSyncCount(): number { return 0; },
  getPendingPayments(): TuitionPaymentRecord[] { return []; },
  async syncPendingPayments(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  },
  async getPaymentsByEnrollment(enrollmentId: string): Promise<TuitionPaymentRecord[]> {
    const { data, error } = await supabase.from('tuition_payments').select('data').eq('enrollment_id', enrollmentId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => row.data as TuitionPaymentRecord);
  },
  async recordPayment(input: RecordPaymentInput): Promise<ServiceResponse<{ payment: TuitionPaymentRecord; receipt: ReceiptData }>> {
    if (!this.isOnline()) return { success: false, error: 'Connexion Internet requise : aucun paiement n’a été enregistré.' };
    if (!input.enrollmentId || !Number.isFinite(input.amount) || input.amount <= 0) return { success: false, error: 'Dossier et montant positif requis.' };
    try {
      // One transaction locks the enrollment, checks the balance, allocates a receipt,
      // saves the payment and updates all installments. No partial local success.
      const { data, error } = await supabase.rpc('record_tuition_payment', {
        p_request_id: input.requestId || crypto.randomUUID(), p_input: input,
      });
      if (error || !data?.payment || !data?.enrollment) throw new Error(error?.message || 'Le serveur n’a pas confirmé le paiement.');
      // A printing failure must never turn a committed payment into a failed write.
      let receipt: ReceiptData;
      try { receipt = await this.generateReceiptData(data.payment, data.enrollment); }
      catch {
        receipt = { receiptNumber: data.payment.receiptNumber, academicYear: data.enrollment.academicYearId,
          studentName: data.enrollment.studentName, matricule: data.enrollment.matricule,
          className: data.enrollment.className, paymentDate: data.payment.paymentDate,
          amountPaid: data.payment.amount, paymentModeLabel: PAYMENT_MODE_LABELS[data.payment.paymentMode as PaymentMode] };
      }
      return { success: true, data: { payment: data.payment, receipt }, message: 'Paiement enregistré.' };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Paiement non confirmé.' }; }
  },

  /**
   * Génère les données officielles et l'empreinte QR Code d'un reçu
   */
  async generateReceiptData(
    payment: TuitionPaymentRecord,
    enrollment: StudentFinancialEnrollment
  ): Promise<ReceiptData> {
    const modeLabel = PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode;

    let schoolInfo: any = {};
    try {
      schoolInfo = await fetchSchoolInfo();
    } catch {
      schoolInfo = {};
    }

    const schoolName = schoolInfo.name || 'Groupe Scolaire Les SCHTROUMPFS';
    const schoolAddress = [schoolInfo.address, schoolInfo.city, schoolInfo.country].filter(Boolean).join(' - ') || 'BP - Bassam, Côte d\'Ivoire';
    const schoolPhone = schoolInfo.phone || '0709570047';
    const schoolEmail = schoolInfo.email || '';
    const schoolLogo = schoolInfo.logoUrl || '';
    const academicYear = enrollment.academicYearId || payment.academicYearId || '2026-2027';

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
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
          .receipt-no { color: #2563eb; font-weight: 800; font-size: 1.15rem; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .info-table td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
          .amount-box { background-color: #f0fdf4; border: 2px solid #22c55e; padding: 14px; text-align: center; border-radius: 8px; margin: 18px 0; }
          .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 26px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
          .stamp-box { border: 2px dashed #94a3b8; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #2563eb; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 8px;">
            ${schoolLogo ? `<img src="${schoolLogo}" style="height: 48px; max-width: 90px; object-fit: contain;" alt="Logo" />` : ''}
            <div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #1e293b;">${schoolName}</h2>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${schoolAddress} · Tél : ${schoolPhone}${schoolEmail ? ` · ${schoolEmail}` : ''}</p>
            </div>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
            Reçu Officiel de Paiement — Frais de Scolarité
          </div>
          <div class="receipt-no" style="margin-top: 4px;">N° Reçu : ${payment.receiptNumber}</div>
        </div>

        <table class="info-table">
          <tr>
            <td><strong>Élève :</strong> ${enrollment.studentName}</td>
            <td><strong>Matricule :</strong> ${enrollment.matricule}</td>
          </tr>
          <tr>
            <td><strong>Classe :</strong> ${enrollment.className}</td>
            <td><strong>Année Scolaire :</strong> ${academicYear}</td>
          </tr>
          <tr>
            <td><strong>Responsable Payeur :</strong> ${enrollment.parentSponsor || 'Parent d’Élève'}${enrollment.parentPhone ? ` (${enrollment.parentPhone})` : ''}</td>
            <td><strong>Date du Versement :</strong> ${payment.paymentDate}</td>
          </tr>
          <tr>
            <td><strong>Mode de Règlement :</strong> ${modeLabel}</td>
            <td><strong>Référence :</strong> ${payment.referenceNumber || 'N/A'}</td>
          </tr>
        </table>

        <div class="amount-box">
          <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">MONTANT VERSÉ</span>
          <div style="font-size: 26px; font-weight: 800; color: #15803d; margin: 4px 0;">${payment.amount.toLocaleString('fr-FR')} FCFA</div>
          <div style="font-size: 12px; color: #475569;">
            Solde Restant à Payer : <strong style="color: ${enrollment.remainingBalance <= 0 ? '#16a34a' : '#dc2626'};">${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 24px; text-align: center; font-size: 11px;">
          <div style="width: 32%;">
            <div style="font-weight: 600; color: #475569;">Signature du Parent / Payeur</div>
            <div style="height: 38px;"></div>
            <div style="color: #94a3b8; font-size: 10px;">(Lu et approuvé)</div>
          </div>
          <div style="width: 32%;">
            <div class="stamp-box">Cachet Officiel</div>
          </div>
          <div style="width: 32%;">
            <div style="font-weight: 600; color: #1e293b;">La Caisse — ${schoolName}</div>
            <div style="height: 38px;"></div>
            <div style="color: #64748b; font-size: 11px; font-weight: 600;">${payment.recordedBy || 'Le Gestionnaire'}</div>
          </div>
        </div>

        <div class="footer">
          <div>
            <span style="font-size: 11px; color: #64748b; display: block;">Enregistré par : ${payment.recordedBy}</span>
            <span style="font-size: 10px; color: #94a3b8;">Empreinte numérique : ${checksum}</span>
          </div>
          <img src="${qrCodeUrl}" width="70" height="70" alt="QR Code d'Authenticité" />
        </div>
      </body>
      </html>
    `;

    return {
      receiptNumber: payment.receiptNumber,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolLogoUrl: schoolLogo || undefined,
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      academicYear,
      parentSponsor: enrollment.parentSponsor || 'Parent d’Élève',
      parentSponsorName: enrollment.parentSponsor || 'Parent d’Élève',
      parentSponsorPhone: enrollment.parentPhone || '',
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
  async cancelPayment(paymentId: string, _cancelledBy = 'Direction', reason = 'Erreur de saisie'): Promise<ServiceResponse<boolean>> {
    const { error } = await supabase.rpc('cancel_tuition_payment', { p_id: paymentId, p_reason: reason });
    return error ? { success: false, error: error.message } : { success: true, data: true, message: 'Paiement annulé.' };
  },
};
