import {
  CanteenEnrollment,
  CanteenEnrollmentInput,
  CanteenPeriod,
  CanteenLevelCode,
  CanteenDiscountType,
  CanteenSubscriptionStatus,
} from './types';
import { canteenFeesService } from './canteenFeesService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const localCanteenEnrollmentsStore: Map<string, CanteenEnrollment> = new Map();

export function clearCanteenEnrollmentsStore() {
  localCanteenEnrollmentsStore.clear();
}

async function syncEnrollmentsFromSupabase(): Promise<CanteenEnrollment[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'canteen_enrollments_data')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      localCanteenEnrollmentsStore.clear();
      for (const item of settingsRow.data) {
        localCanteenEnrollmentsStore.set(item.id, item);
      }
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[canteenEnrollmentService] Supabase sync error:', err);
  }
  return Array.from(localCanteenEnrollmentsStore.values());
}

async function persistEnrollmentsToSupabase() {
  try {
    const list = Array.from(localCanteenEnrollmentsStore.values());
    await supabase
      .from('school_settings')
      .upsert({
        id: 'canteen_enrollments_data',
        data: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[canteenEnrollmentService] Supabase persist error:', err);
  }
}

export const canteenEnrollmentService = {
  /**
   * Récupère toutes les inscriptions cantine pour une année scolaire
   */
  async getEnrollmentsByYear(academicYearId: string = 'ay-2026'): Promise<CanteenEnrollment[]> {
    await syncEnrollmentsFromSupabase();

    return Array.from(localCanteenEnrollmentsStore.values()).filter(
      (e) => !academicYearId || e.academicYearId === academicYearId
    );
  },

  /**
   * Récupère l'inscription cantine d'un élève par studentId
   */
  async getEnrollmentByStudent(
    studentId: string,
    academicYearId: string = 'ay-2026'
  ): Promise<CanteenEnrollment | null> {
    const list = await this.getEnrollmentsByYear(academicYearId);
    return list.find((e) => e.studentId === studentId) || null;
  },

  /**
   * Inscrire un élève à la cantine
   */
  async createEnrollment(input: CanteenEnrollmentInput): Promise<ServiceResponse<CanteenEnrollment>> {
    if (!input.studentId || !input.academicYearId) {
      return { success: false, error: 'Élève et année scolaire requis.' };
    }

    await syncEnrollmentsFromSupabase();

    // Empêcher double inscription
    const existing = await this.getEnrollmentByStudent(input.studentId, input.academicYearId);
    if (existing) {
      return { success: false, error: 'Cet élève est déjà inscrit à la cantine pour cette année scolaire.' };
    }

    // Récupération automatique du tarif
    const schedule = await canteenFeesService.getScheduleByLevel(input.academicYearId, input.levelCode);
    if (!schedule) {
      return {
        success: false,
        error: `Aucun tarif cantine configuré pour le niveau ${input.levelCode}.`,
      };
    }

    const annualRate = schedule.annualRate;
    const periodsCount = schedule.periodsCount;

    // Calcul de la remise
    let discountAmount = 0;
    if (input.discountType === 'FIXED') {
      discountAmount = input.discountValue;
    } else if (input.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((annualRate * input.discountValue) / 100);
    }

    if (discountAmount > annualRate) {
      return { success: false, error: 'La remise ne peut pas dépasser le tarif annuel.' };
    }

    const netAmountDue = Math.max(0, annualRate - discountAmount);
    const periods = generateDefaultPeriods(netAmountDue, periodsCount);

    const id = `ct-${input.studentId}-${input.academicYearId}-${Date.now()}`;

    const record: CanteenEnrollment = {
      id,
      studentId: input.studentId,
      studentName: input.studentName,
      matricule: input.matricule,
      photoUrl: input.photoUrl,
      className: input.className,
      levelCode: input.levelCode,
      parentSponsor: input.parentSponsor,
      parentPhone: input.parentPhone,
      academicYearId: input.academicYearId,
      annualRate,
      periodsCount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount,
      netAmountDue,
      totalPaid: 0,
      remainingBalance: netAmountDue,
      periods,
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localCanteenEnrollmentsStore.set(id, record);
    await persistEnrollmentsToSupabase();

    return { success: true, data: record, message: 'Inscription cantine enregistrée avec succès.' };
  },

  /**
   * Met à jour le solde après un paiement
   */
  async applyPayment(enrollmentId: string, amount: number, periodNumber?: number): Promise<boolean> {
    await syncEnrollmentsFromSupabase();
    const enrollment = localCanteenEnrollmentsStore.get(enrollmentId);
    if (!enrollment) return false;

    enrollment.totalPaid = Math.min(enrollment.netAmountDue, enrollment.totalPaid + amount);
    enrollment.remainingBalance = Math.max(0, enrollment.netAmountDue - enrollment.totalPaid);

    // Mise à jour de la période si spécifiée
    if (periodNumber !== undefined) {
      const period = enrollment.periods.find((p) => p.number === periodNumber);
      if (period) {
        period.amountPaid = Math.min(period.amountDue, period.amountPaid + amount);
        if (period.amountPaid >= period.amountDue) {
          period.status = 'PAID';
        } else if (period.amountPaid > 0) {
          period.status = 'PARTIAL';
        }
      }
    }

    // Mise à jour statut abonnement
    if (enrollment.remainingBalance === 0) {
      enrollment.subscriptionStatus = 'ACTIVE';
    } else if (enrollment.totalPaid === 0) {
      enrollment.subscriptionStatus = 'SUSPENDED';
    } else {
      enrollment.subscriptionStatus = 'ACTIVE';
    }

    enrollment.updatedAt = new Date().toISOString();
    localCanteenEnrollmentsStore.set(enrollmentId, enrollment);
    await persistEnrollmentsToSupabase();
    return true;
  },

  /**
   * Recherche des inscriptions par nom/matricule/classe
   */
  async search(query: string, academicYearId: string = 'ay-2026'): Promise<CanteenEnrollment[]> {
    const list = await this.getEnrollmentsByYear(academicYearId);
    const q = query.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (e) =>
        e.studentName.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        e.className.toLowerCase().includes(q) ||
        (e.parentSponsor || '').toLowerCase().includes(q)
    );
  },
};
