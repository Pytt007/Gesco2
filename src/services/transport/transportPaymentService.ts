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
import { supabase } from '../common/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────

export const TRANSPORT_PAYMENT_MODE_LABELS: Record<TransportPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

const paymentStore: Map<string, TransportPaymentRecord> = new Map();
let receiptCounter = 1;

function generateReceiptNumber(): string {
  return `TRP-${new Date().getFullYear()}-${String(receiptCounter++).padStart(6, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export const transportPaymentService = {

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
    const allEnrollments = await transportEnrollmentService.getEnrollmentsByYear('ay-2026');
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

    const receiptNumber = generateReceiptNumber();
    const id = `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const totalPaidBefore = enrollment.totalPaid;

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

    paymentStore.set(id, payment);

    // Mise à jour du solde
    transportEnrollmentService.applyPayment(input.enrollmentId, input.amount, input.periodNumber);

    // Persistance Supabase — enregistrement dans tuition_payments (type=TRANSPORT)
    try {
      if (supabase) {
        const year = new Date().getFullYear();
        const ts = Date.now().toString().slice(-7);
        const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const receiptNb = `TRP-${year}-${ts}${rand}`;
        await supabase.from('tuition_payments').insert({
          id: crypto.randomUUID(),
          receipt_number: receiptNb,
          student_id: null,
          amount: input.amount,
          payment_method: input.paymentMode || 'CASH',
          payment_date: new Date().toISOString(),
          payer_name: enrollment.parentSponsor || enrollment.studentName || null,
          notes: `TRANSPORT | Inscription: ${input.enrollmentId} | Reçu: ${receiptNumber}`,
          received_by: null,
        });
      }
    } catch (dbErr) {
      console.warn('[transportPaymentService] Supabase fallback:', dbErr);
    }

    const newTotalPaid = totalPaidBefore + input.amount;
    const newBalance = Math.max(0, enrollment.netAmountDue - newTotalPaid);
    const statusLabel = newBalance === 0 ? 'Soldé' : newTotalPaid > 0 ? 'Paiement partiel' : 'Impayé';

    const receipt: TransportReceiptData = {
      receiptNumber,
      schoolName: schoolSettings?.name || 'École Privée GESCO',
      schoolAddress: schoolSettings?.address || "Abidjan, Côte d'Ivoire",
      schoolPhone: schoolSettings?.phone || '+225 00 00 00 00',
      academicYear: schoolSettings?.academicYear || '2026-2027',
      studentName: enrollment.studentName,
      matricule: enrollment.matricule,
      className: enrollment.className,
      parentSponsorName: enrollment.parentSponsor || '—',
      lineName: enrollment.lineName,
      zone: enrollment.zone,
      paymentDate: input.paymentDate,
      amountPaid: input.amount,
      paymentModeLabel: TRANSPORT_PAYMENT_MODE_LABELS[input.paymentMode],
      periodLabel: input.periodNumber ? `Période ${input.periodNumber}` : undefined,
      netAmountDue: enrollment.netAmountDue,
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
    return Array.from(paymentStore.values())
      .filter((p) => p.enrollmentId === enrollmentId && p.status === 'VALIDATED')
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  /**
   * Annule un paiement
   */
  async cancelPayment(paymentId: string): Promise<ServiceResponse<boolean>> {
    const payment = paymentStore.get(paymentId);
    if (!payment) return { success: false, error: 'Paiement introuvable.' };
    if (payment.status === 'CANCELLED') return { success: false, error: 'Ce paiement est déjà annulé.' };

    payment.status = 'CANCELLED';
    payment.updatedAt = new Date().toISOString();
    paymentStore.set(paymentId, payment);

    return { success: true, data: true, message: 'Paiement annulé.' };
  },
};
