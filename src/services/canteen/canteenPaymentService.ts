import {
  CanteenPaymentRecord,
  CanteenReceiptData,
  RecordCanteenPaymentInput,
  CanteenPaymentMode,
} from './types';
import { canteenEnrollmentService } from './canteenEnrollmentService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';
import { generateSecureReceiptNumber } from '../finance/receiptSequenceService';

export const CANTEEN_PAYMENT_MODE_LABELS: Record<CanteenPaymentMode, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  WAVE: 'Wave',
  TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
};

const STORAGE_KEY_CANTEEN_PAYMENTS = 'gesco_canteen_payments_store';
const STORAGE_KEY_CANTEEN_OUTBOX = 'gesco_canteen_offline_outbox';

function loadPersistedCanteenPayments(): Map<string, CanteenPaymentRecord> {
  const store = new Map<string, CanteenPaymentRecord>();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_PAYMENTS);
      if (raw) {
        const parsed: CanteenPaymentRecord[] = JSON.parse(raw);
        parsed.forEach((p) => store.set(p.id, p));
      }
    }
  } catch { /* Silent */ }
  return store;
}

function persistCanteenPayments(store: Map<string, CanteenPaymentRecord>) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CANTEEN_PAYMENTS, JSON.stringify(Array.from(store.values())));
    }
  } catch { /* Silent */ }
}

function loadPersistedCanteenOutbox(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_CANTEEN_OUTBOX);
      if (raw) return JSON.parse(raw);
    }
  } catch { /* Silent */ }
  return [];
}

function persistCanteenOutbox(queue: string[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CANTEEN_OUTBOX, JSON.stringify(queue));
    }
  } catch { /* Silent */ }
}

let localCanteenPaymentsStore: Map<string, CanteenPaymentRecord> = loadPersistedCanteenPayments();
let offlineCanteenOutboxQueue: string[] = loadPersistedCanteenOutbox();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    canteenPaymentService.syncPendingPayments().catch((err) => {
      console.warn('[canteenPaymentService] Échec sync automatique hors-ligne:', err);
    });
  });
}

export function clearCanteenPaymentsStore(): void {
  localCanteenPaymentsStore.clear();
  offlineCanteenOutboxQueue = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_CANTEEN_PAYMENTS);
      localStorage.removeItem(STORAGE_KEY_CANTEEN_OUTBOX);
    }
  } catch { /* Silent */ }
}

export const canteenPaymentService = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getPendingSyncCount(): number {
    return offlineCanteenOutboxQueue.length;
  },

  getPendingPayments(): CanteenPaymentRecord[] {
    return offlineCanteenOutboxQueue
      .map((id) => localCanteenPaymentsStore.get(id))
      .filter((p): p is CanteenPaymentRecord => Boolean(p));
  },

  async syncPendingPayments(): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
    if (offlineCanteenOutboxQueue.length === 0) {
      return { syncedCount: 0, failedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const remainingQueue: string[] = [];

    for (const paymentId of offlineCanteenOutboxQueue) {
      const payment = localCanteenPaymentsStore.get(paymentId);
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
            notes: `CANTINE | Reçu: ${payment.receiptNumber}`,
            received_by: null,
          });

          if (error) {
            failedCount++;
            remainingQueue.push(paymentId);
            errors.push(error.message);
          } else {
            payment.status = 'VALIDATED';
            payment.updatedAt = new Date().toISOString();
            localCanteenPaymentsStore.set(paymentId, payment);
            syncedCount++;
          }
        } else {
          payment.status = 'VALIDATED';
          payment.updatedAt = new Date().toISOString();
          localCanteenPaymentsStore.set(paymentId, payment);
          syncedCount++;
        }
      } catch (err: any) {
        failedCount++;
        remainingQueue.push(paymentId);
        errors.push(err?.message || 'Erreur sync cantine');
      }
    }

    offlineCanteenOutboxQueue = remainingQueue;
    persistCanteenOutbox(offlineCanteenOutboxQueue);
    persistCanteenPayments(localCanteenPaymentsStore);

    return { syncedCount, failedCount, errors };
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
    const totalPaidBefore = enrollment.totalPaid;
    const isOnlineMode = this.isOnline();

    let initialStatus: 'VALIDATED' | 'CANCELLED' | 'PENDING_SYNC' = 'VALIDATED';

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
      status: initialStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mise à jour du solde de l'inscription
    canteenEnrollmentService.applyPayment(input.enrollmentId, input.amount, input.periodNumber);

    let remoteInserted = false;

    // Persistance Supabase — enregistrement dans tuition_payments (type=CANTEEN)
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
          notes: `CANTINE | Inscription: ${input.enrollmentId} | Reçu: ${receiptNumber}`,
          received_by: null,
        });

        if (!error) {
          remoteInserted = true;
        }
      } catch (dbErr) {
        console.warn('[canteenPaymentService] Supabase fallback:', dbErr);
      }
    }

    if (!isOnlineMode || (!remoteInserted && supabase)) {
      payment.status = 'PENDING_SYNC';
      if (!offlineCanteenOutboxQueue.includes(id)) {
        offlineCanteenOutboxQueue.push(id);
        persistCanteenOutbox(offlineCanteenOutboxQueue);
      }
    }

    localCanteenPaymentsStore.set(id, payment);
    persistCanteenPayments(localCanteenPaymentsStore);

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
      academicYear: enrollment.academicYearId || schoolSettings?.academicYear || '',
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
      .filter((p) => p.enrollmentId === enrollmentId && p.status !== 'CANCELLED')
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
    persistCanteenPayments(localCanteenPaymentsStore);

    return { success: true, data: true, message: 'Paiement cantine annulé.' };
  },
};
