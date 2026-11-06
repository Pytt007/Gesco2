import {
  CanteenPaymentRecord,
  CanteenReceiptData,
  RecordCanteenPaymentInput,
  CanteenPaymentMode,
} from './types';
import { canteenEnrollmentService } from './canteenEnrollmentService';
import { ServiceResponse } from '../academic/academicYearsService';
import { cancelModulePayment, readModulePayments, recordModulePayment } from '../common/modulePayments';
import { failure } from '../common/remoteRows';
import { generateSecureReceiptNumber } from '../finance/receiptSequenceService';
import { fetchSchoolInfo } from '../settings/settingsService';

export const CANTEEN_PAYMENT_MODE_LABELS: Record<CanteenPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

// Kept for callers that previously reset the browser-only cache.
export function clearCanteenPaymentsStore(): void {}

export const canteenPaymentService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getPendingSyncCount(): number {
    return 0;
  },

  getPendingPayments(): CanteenPaymentRecord[] {
    return [];
  },

  async syncPendingPayments(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  },

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
    if (!this.isOnline()) return { success: false, error: 'Connexion Internet requise pour enregistrer un paiement.' };

    // Récupération de l'inscription
    const enrollments = await canteenEnrollmentService.getEnrollmentsByYear(schoolSettings?.academicYear);
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

    const receiptNumber = await generateSecureReceiptNumber('CANT');
    const id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

    let updatedBalance;
    try {
      updatedBalance = await recordModulePayment('CANTEEN', payment);
    } catch (error) {
      return failure(error);
    }

    const newTotalPaid = updatedBalance.totalPaid;
    const newBalance = updatedBalance.remainingBalance;
    const statusLabel = newBalance === 0 ? 'Soldé' : newTotalPaid > 0 ? 'Paiement partiel' : 'Impayé';

    // Génération du reçu
    let realSchoolName = schoolSettings?.name;
    let realSchoolAddress = schoolSettings?.address;
    let realSchoolPhone = schoolSettings?.phone;
    let realAcademicYear = schoolSettings?.academicYear || enrollment.academicYearId || '2026-2027';

    if (!realSchoolName || !realSchoolPhone) {
      try {
        const info = await fetchSchoolInfo();
        if (info.name) realSchoolName = info.name;
        if (info.address || info.city) realSchoolAddress = [info.address, info.city, info.country].filter(Boolean).join(' - ');
        if (info.phone) realSchoolPhone = info.phone;
      } catch {}
    }

    const periodLabel = input.periodNumber ? `Période ${input.periodNumber}` : undefined;
    const receipt: CanteenReceiptData = {
      receiptNumber,
      schoolName: realSchoolName || 'Groupe Scolaire Les SCHTROUMPFS',
      schoolAddress: realSchoolAddress || 'BP - Bassam, Côte d\'Ivoire',
      schoolPhone: realSchoolPhone || '0709570047',
      academicYear: realAcademicYear,
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      parentSponsorName: enrollment.parentSponsor || 'Parent d’Élève',
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
    return (await readModulePayments<CanteenPaymentRecord>('CANTEEN', enrollmentId))
      .filter((p) => p.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  /**
   * Annule un paiement cantine
   */
  async cancelPayment(paymentId: string, reason: string): Promise<ServiceResponse<boolean>> {
    try {
      await cancelModulePayment('CANTEEN', paymentId, reason);
      return { success: true, data: true, message: 'Paiement cantine annulé.' };
    } catch (error) {
      return failure(error);
    }
  },
};
