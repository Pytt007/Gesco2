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
import { generateSecureReceiptNumber } from '../finance/receiptSequenceService';

// ─────────────────────────────────────────────────────────────────────────────

export const TRANSPORT_PAYMENT_MODE_LABELS: Record<TransportPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

const STORAGE_KEY_TRANSPORT_PAYMENTS = 'gesco_transport_payments_store';
const STORAGE_KEY_TRANSPORT_OUTBOX = 'gesco_transport_offline_outbox';

function loadPersistedTransportPayments(): Map<string, TransportPaymentRecord> {
  const store = new Map<string, TransportPaymentRecord>();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_TRANSPORT_PAYMENTS);
      if (raw) {
        const parsed: TransportPaymentRecord[] = JSON.parse(raw);
        parsed.forEach((p) => store.set(p.id, p));
      }
    }
  } catch { /* Silent */ }
  return store;
}

function persistTransportPayments(store: Map<string, TransportPaymentRecord>) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TRANSPORT_PAYMENTS, JSON.stringify(Array.from(store.values())));
    }
  } catch { /* Silent */ }
}

function loadPersistedTransportOutbox(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_TRANSPORT_OUTBOX);
      if (raw) return JSON.parse(raw);
    }
  } catch { /* Silent */ }
  return [];
}

function persistTransportOutbox(queue: string[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TRANSPORT_OUTBOX, JSON.stringify(queue));
    }
  } catch { /* Silent */ }
}

let paymentStore: Map<string, TransportPaymentRecord> = loadPersistedTransportPayments();
let offlineTransportOutboxQueue: string[] = loadPersistedTransportOutbox();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    transportPaymentService.syncPendingPayments().catch((err) => {
      console.warn('[transportPaymentService] Échec sync automatique hors-ligne:', err);
    });
  });
}

export function clearTransportPaymentsStore(): void {
  paymentStore.clear();
  offlineTransportOutboxQueue = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TRANSPORT_PAYMENTS);
      localStorage.removeItem(STORAGE_KEY_TRANSPORT_OUTBOX);
    }
  } catch { /* Silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export const transportPaymentService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getPendingSyncCount(): number {
    return offlineTransportOutboxQueue.length;
  },

  getPendingPayments(): TransportPaymentRecord[] {
    return offlineTransportOutboxQueue
      .map((id) => paymentStore.get(id))
      .filter((p): p is TransportPaymentRecord => Boolean(p));
  },

  async syncPendingPayments(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    if (offlineTransportOutboxQueue.length === 0) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const remainingQueue: string[] = [];

    for (const paymentId of offlineTransportOutboxQueue) {
      const payment = paymentStore.get(paymentId);
      if (!payment) continue;

      try {
        if (supabase) {
          const { error } = await supabase.from('tuition_payments').insert({
            id: crypto.randomUUID(),
            receipt_number: payment.receiptNumber,
            student_id: null,
            amount: payment.amount,
            payment_method: payment.paymentMode || 'CASH',
            payment_date: payment.paymentDate || new Date().toISOString(),
            payer_name: 'Parent',
            notes: `TRANSPORT | Reçu: ${payment.receiptNumber}`,
            received_by: null,
          });

          if (error) {
            failedCount++;
            remainingQueue.push(paymentId);
            errors.push(error.message);
          } else {
            payment.status = 'VALIDATED';
            payment.updatedAt = new Date().toISOString();
            paymentStore.set(paymentId, payment);
            syncedCount++;
          }
        } else {
          payment.status = 'VALIDATED';
          payment.updatedAt = new Date().toISOString();
          paymentStore.set(paymentId, payment);
          syncedCount++;
        }
      } catch (err: any) {
        failedCount++;
        remainingQueue.push(paymentId);
        errors.push(err?.message || 'Erreur sync transport');
      }
    }

    offlineTransportOutboxQueue = remainingQueue;
    persistTransportOutbox(offlineTransportOutboxQueue);
    persistTransportPayments(paymentStore);

    return { syncedCount, failedCount, errors };
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
    const totalPaidBefore = enrollment.totalPaid;
    const isOnlineMode = this.isOnline();

    let initialStatus: 'VALIDATED' | 'CANCELLED' | 'PENDING_SYNC' = 'VALIDATED';

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
      status: initialStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mise à jour du solde
    transportEnrollmentService.applyPayment(input.enrollmentId, input.amount, input.periodNumber);

    let remoteInserted = false;

    // Persistance Supabase — enregistrement dans tuition_payments (type=TRANSPORT)
    if (isOnlineMode && supabase) {
      try {
        const { error } = await supabase.from('tuition_payments').insert({
          id: crypto.randomUUID(),
          receipt_number: receiptNumber,
          student_id: null,
          amount: input.amount,
          payment_method: input.paymentMode || 'CASH',
          payment_date: new Date().toISOString(),
          payer_name: enrollment.parentSponsor || enrollment.studentName || null,
          notes: `TRANSPORT | Inscription: ${input.enrollmentId} | Reçu: ${receiptNumber}`,
          received_by: null,
        });

        if (!error) {
          remoteInserted = true;
        }
      } catch (dbErr) {
        console.warn('[transportPaymentService] Supabase fallback:', dbErr);
      }
    }

    if (!isOnlineMode || (!remoteInserted && supabase)) {
      payment.status = 'PENDING_SYNC';
      if (!offlineTransportOutboxQueue.includes(id)) {
        offlineTransportOutboxQueue.push(id);
        persistTransportOutbox(offlineTransportOutboxQueue);
      }
    }

    paymentStore.set(id, payment);
    persistTransportPayments(paymentStore);

    const newTotalPaid = totalPaidBefore + input.amount;
    const newBalance = Math.max(0, enrollment.netAmountDue - newTotalPaid);
    const statusLabel = newBalance === 0 ? 'Soldé' : newTotalPaid > 0 ? 'Paiement partiel' : 'Impayé';

    const receipt: TransportReceiptData = {
      receiptNumber,
      schoolName: schoolSettings?.name || 'École Privée GESCO',
      schoolAddress: schoolSettings?.address || "Abidjan, Côte d'Ivoire",
      schoolPhone: schoolSettings?.phone || '+225 00 00 00 00',
      academicYear: enrollment.academicYearId || schoolSettings?.academicYear || '',
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
      .filter((p) => p.enrollmentId === enrollmentId && p.status !== 'CANCELLED')
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
    persistTransportPayments(paymentStore);

    return { success: true, data: true, message: 'Paiement annulé.' };
  },
};
