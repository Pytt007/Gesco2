/**
 * GESCO — Service Paiements Transport
 */

import {
  TransportPaymentRecord,
  TransportReceiptData,
  RecordTransportPaymentInput,
  TransportPaymentMode,
} from './types';
import { transportEnrollmentService } from './transportEnrollmentService';
import { ServiceResponse } from '../academic/academicYearsService';
import { cancelModulePayment, readModulePayments, recordModulePayment } from '../common/modulePayments';
import { failure } from '../common/remoteRows';
import { generateSecureReceiptNumber } from '../finance/receiptSequenceService';
import { fetchSchoolInfo } from '../settings/settingsService';

// ─────────────────────────────────────────────────────────────────────────────

export const TRANSPORT_PAYMENT_MODE_LABELS: Record<TransportPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

// Kept for callers that previously reset the browser-only cache.
export function clearTransportPaymentsStore(): void {}

// ─────────────────────────────────────────────────────────────────────────────

export const transportPaymentService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getPendingSyncCount(): number {
    return 0;
  },

  getPendingPayments(): TransportPaymentRecord[] {
    return [];
  },

  async syncPendingPayments(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  },

  /**
   * Enregistre un paiement transport et génère le reçu
   */
  async recordPayment(
    input: RecordTransportPaymentInput,
    schoolSettings?: { name?: string; address?: string; phone?: string; academicYear?: string }
  ): Promise<ServiceResponse<{ payment: TransportPaymentRecord; receipt: TransportReceiptData }>> {

    if (!input.enrollmentId) return { success: false, error: 'Identifiant inscription requis.' };
    if (!input.amount || input.amount <= 0) return { success: false, error: 'Le montant doit être supérieur à 0.' };
    if (!input.paymentDate) return { success: false, error: 'La date de paiement est obligatoire.' };
    if (!input.paymentMode) return { success: false, error: 'Le mode de paiement est obligatoire.' };

    // Récupération de l'inscription
    const allEnrollments = await transportEnrollmentService.getEnrollmentsByYear(schoolSettings?.academicYear);
    const enrollment = allEnrollments.find((e) => e.id === input.enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription transport introuvable.' };

    if (enrollment.remainingBalance <= 0) {
      return { success: false, error: 'Cet élève a déjà soldé son transport pour cette année scolaire.' };
    }

    if (input.amount > enrollment.remainingBalance) {
      return {
        success: false,
        error: `Le montant saisi (${input.amount.toLocaleString('fr-FR')} FCFA) dépasse le reste à payer (${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA).`,
      };
    }

    const receiptNumber = await generateSecureReceiptNumber('TRP');
    const id = `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!this.isOnline()) return { success: false, error: 'Connexion Internet requise pour enregistrer un paiement.' };

    const payment: TransportPaymentRecord = {
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
      updatedBalance = await recordModulePayment('TRANSPORT', payment);
    } catch (error) {
      return failure(error);
    }

    const newTotalPaid = updatedBalance.totalPaid;
    const newBalance = updatedBalance.remainingBalance;
    const statusLabel = newBalance === 0 ? 'Soldé' : newTotalPaid > 0 ? 'Paiement partiel' : 'Impayé';

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

    const receipt: TransportReceiptData = {
      receiptNumber,
      schoolName: realSchoolName || 'Groupe Scolaire Les SCHTROUMPFS',
      schoolAddress: realSchoolAddress || 'BP - Bassam, Côte d\'Ivoire',
      schoolPhone: realSchoolPhone || '0709570047',
      academicYear: realAcademicYear,
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      parentSponsorName: enrollment.parentSponsor || 'Parent d’Élève',
      lineName: enrollment.lineName,
      zone: enrollment.zone,
      paymentDate: input.paymentDate,
      amountPaid: input.amount,
      paymentModeLabel: TRANSPORT_PAYMENT_MODE_LABELS[input.paymentMode],
      periodLabel: input.periodNumber ? `Période ${input.periodNumber}` : undefined,
      netAmountDue: enrollment.netAmountDue,
      annualRate: enrollment.netAmountDue,
      totalPaidAfter: newTotalPaid,
      remainingBalance: newBalance,
      statusLabel,
      recordedBy: input.recordedBy || 'Gestionnaire',
    };

    return {
      success: true,
      data: { payment, receipt },
      message: 'Paiement transport enregistré avec succès.',
    };
  },

  /**
   * Historique des paiements d'une inscription
   */
  async getPaymentsByEnrollment(enrollmentId: string): Promise<TransportPaymentRecord[]> {
    return (await readModulePayments<TransportPaymentRecord>('TRANSPORT', enrollmentId))
      .filter((p) => p.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  /**
   * Annule un paiement
   */
  async cancelPayment(paymentId: string): Promise<ServiceResponse<boolean>> {
    try {
      await cancelModulePayment('TRANSPORT', paymentId);
      return { success: true, data: true, message: 'Paiement annulé.' };
    } catch (error) {
      return failure(error);
    }
  },
};
