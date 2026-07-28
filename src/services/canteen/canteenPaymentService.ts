import {
  CanteenPaymentRecord,
  CanteenReceiptData,
  RecordCanteenPaymentInput,
  CanteenPaymentMode,
} from './types';
import { canteenEnrollmentService } from './canteenEnrollmentService';
import { ServiceResponse } from '../academic/academicYearsService';

export const CANTEEN_PAYMENT_MODE_LABELS: Record<CanteenPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

const localCanteenPaymentsStore: Map<string, CanteenPaymentRecord> = new Map();
let receiptCounter = 1;

function generateReceiptNumber(): string {
  const num = String(receiptCounter++).padStart(6, '0');
  return `CANT-${new Date().getFullYear()}-${num}`;
}

export const canteenPaymentService = {
  /**
   * Enregistre un paiement cantine
   */
  async recordPayment(
    input: RecordCanteenPaymentInput,
    schoolSettings?: { name?: string; address?: string; phone?: string; academicYear?: string }
  ): Promise<ServiceResponse<{ payment: CanteenPaymentRecord; receipt: CanteenReceiptData }>> {
    // Validation
    if (!input.enrollmentId) {
      return { success: false, error: 'Identifiant inscription requis.' };
    }
    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Le montant doit être supérieur à 0.' };
    }
    if (!input.paymentDate) {
      return { success: false, error: 'La date de paiement est obligatoire.' };
    }
    if (!input.paymentMode) {
      return { success: false, error: 'Le mode de paiement est obligatoire.' };
    }

    // Récupération de l'inscription
    const enrollments = await canteenEnrollmentService.getEnrollmentsByYear('ay-2026');
    const enrollment = enrollments.find((e) => e.id === input.enrollmentId);
    if (!enrollment) {
      return { success: false, error: 'Inscription cantine introuvable.' };
    }

    // Vérifier si déjà soldé
    if (enrollment.remainingBalance <= 0) {
      return { success: false, error: 'Cet élève a déjà soldé sa cantine pour cette année scolaire.' };
    }

    // Empêcher surpaiement
    if (input.amount > enrollment.remainingBalance) {
      return {
        success: false,
        error: `Le montant saisi (${input.amount.toLocaleString('fr-FR')} FCFA) dépasse le reste à payer (${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA).`,
      };
    }

    const receiptNumber = generateReceiptNumber();
    const id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const totalPaidBefore = enrollment.totalPaid;

    // Création du paiement
    const payment: CanteenPaymentRecord = {
      id,
      enrollmentId: input.enrollmentId,
      receiptNumber,
      amount: input.amount,
      periodNumber: input.periodNumber,
      paymentDate: input.paymentDate,
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNumber,
      remarks: input.remarks,
      recordedBy: input.recordedBy || 'Gestionnaire',
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localCanteenPaymentsStore.set(id, payment);

    // Mise à jour du solde de l'inscription
    canteenEnrollmentService.applyPayment(input.enrollmentId, input.amount, input.periodNumber);

    const newTotalPaid = totalPaidBefore + input.amount;
    const newBalance = Math.max(0, enrollment.netAmountDue - newTotalPaid);
    const statusLabel = newBalance === 0 ? 'Soldé' : newTotalPaid > 0 ? 'Paiement partiel' : 'Impayé';

    // Génération du reçu
    const periodLabel = input.periodNumber ? `Période ${input.periodNumber}` : undefined;
    const receipt: CanteenReceiptData = {
      receiptNumber,
      schoolName: schoolSettings?.name || 'École Privée GESCO',
      schoolAddress: schoolSettings?.address || 'Abidjan, Côte d\'Ivoire',
      schoolPhone: schoolSettings?.phone || '+225 00 00 00 00',
      academicYear: schoolSettings?.academicYear || '2026-2027',
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      parentSponsorName: enrollment.parentSponsor || '-',
      paymentDate: input.paymentDate,
      amountPaid: input.amount,
      paymentModeLabel: CANTEEN_PAYMENT_MODE_LABELS[input.paymentMode],
      periodLabel,
      annualRate: enrollment.netAmountDue,
      totalPaidAfter: newTotalPaid,
      remainingBalance: newBalance,
      statusLabel,
      recordedBy: input.recordedBy || 'Gestionnaire',
    };

    return {
      success: true,
      data: { payment, receipt },
      message: 'Paiement cantine enregistré avec succès.',
    };
  },

  /**
   * Récupère l'historique des paiements d'une inscription cantine
   */
  async getPaymentsByEnrollment(enrollmentId: string): Promise<CanteenPaymentRecord[]> {
    return Array.from(localCanteenPaymentsStore.values())
      .filter((p) => p.enrollmentId === enrollmentId && p.status === 'VALIDATED')
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  /**
   * Annule un paiement cantine
   */
  async cancelPayment(paymentId: string, reason: string): Promise<ServiceResponse<boolean>> {
    const payment = localCanteenPaymentsStore.get(paymentId);
    if (!payment) {
      return { success: false, error: 'Paiement introuvable.' };
    }
    if (payment.status === 'CANCELLED') {
      return { success: false, error: 'Ce paiement est déjà annulé.' };
    }

    payment.status = 'CANCELLED';
    payment.updatedAt = new Date().toISOString();
    localCanteenPaymentsStore.set(paymentId, payment);

    return { success: true, data: true, message: 'Paiement cantine annulé.' };
  },
};
