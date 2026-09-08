import {
  CanteenEnrollment,
  CanteenEnrollmentInput,
  CanteenPeriod,
  CanteenLevelCode,
  CanteenDiscountType,
  CanteenSubscriptionStatus,
} from './types';
import { canteenFeesService, normalizeCanteenLevelCode } from './canteenFeesService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const localCanteenEnrollmentsStore: Map<string, CanteenEnrollment> = new Map();

function generateDefaultPeriods(netAmountDue: number, periodsCount: number = 3): CanteenPeriod[] {
  const count = Math.max(1, periodsCount);
  const baseAmount = Math.floor(netAmountDue / count);
  const remainder = netAmountDue - baseAmount * count;

  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    label: `Période ${i + 1}`,
    amountDue: i === 0 ? baseAmount + remainder : baseAmount,
    amountPaid: 0,
    status: 'PENDING' as const,
  }));
}

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

    // Normalisation et récupération automatique du tarif
    const normLevel = normalizeCanteenLevelCode(input.levelCode);
    const schedule = await canteenFeesService.getScheduleByLevel(input.academicYearId, normLevel);
    if (!schedule) {
      return {
        success: false,
        error: `Aucun tarif cantine configuré pour le niveau ${normLevel}.`,
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

    let periods: CanteenPeriod[];
    if (input.customPeriods && input.customPeriods.length > 0) {
      periods = input.customPeriods.map((p, idx) => ({
        number: p.number || idx + 1,
        label: p.label || `Période ${idx + 1}`,
        amountDue: Number(p.amountDue) || 0,
        amountPaid: 0,
        status: 'PENDING' as const,
        dueDate: p.dueDate,
      }));
    } else if (schedule.customPeriods && schedule.customPeriods.length > 0) {
      periods = schedule.customPeriods.map((p, idx) => ({
        number: p.number || idx + 1,
        label: p.label || `Période ${idx + 1}`,
        amountDue: Number(p.amountDue) || 0,
        amountPaid: 0,
        status: 'PENDING' as const,
        dueDate: p.dueDate,
      }));
    } else {
      periods = generateDefaultPeriods(netAmountDue, periodsCount);
    }

    const id = `ct-${input.studentId}-${input.academicYearId}-${Date.now()}`;

    const record: CanteenEnrollment = {
      id,
      studentId: input.studentId,
      studentName: input.studentName,
      matricule: input.matricule,
      photoUrl: input.photoUrl,
      className: input.className,
      levelCode: normLevel,
      parentSponsor: input.parentSponsor,
      parentPhone: input.parentPhone,
      academicYearId: input.academicYearId,
      annualRate,
      periodsCount: periods.length,
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

  /**
   * Met à jour une inscription cantine (remise, échéances personnalisées, contacts)
   */
  async updateEnrollment(
    enrollmentId: string,
    updates: {
      discountType?: CanteenDiscountType;
      discountValue?: number;
      customPeriods?: { number: number; label: string; dueDate?: string; amountDue: number }[];
      parentSponsor?: string;
      parentPhone?: string;
    }
  ): Promise<ServiceResponse<CanteenEnrollment>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = localCanteenEnrollmentsStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription cantine introuvable.' };

    const discountType = updates.discountType ?? enrollment.discountType;
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : enrollment.discountValue;

    let discountAmount = 0;
    if (discountType === 'FIXED') {
      discountAmount = discountValue;
    } else if (discountType === 'PERCENTAGE') {
      discountAmount = Math.round((enrollment.annualRate * discountValue) / 100);
    }
    const netAmountDue = Math.max(0, enrollment.annualRate - discountAmount);

    enrollment.discountType = discountType;
    enrollment.discountValue = discountValue;
    enrollment.discountAmount = discountAmount;
    enrollment.netAmountDue = netAmountDue;

    if (updates.parentSponsor !== undefined) enrollment.parentSponsor = updates.parentSponsor;
    if (updates.parentPhone !== undefined) enrollment.parentPhone = updates.parentPhone;

    if (updates.customPeriods && updates.customPeriods.length > 0) {
      let paidPool = enrollment.totalPaid;
      enrollment.periods = updates.customPeriods.map((p, idx) => {
        const amtDue = Number(p.amountDue) || 0;
        const amtPaid = Math.min(amtDue, Math.max(0, paidPool));
        paidPool = Math.max(0, paidPool - amtPaid);
        const status: 'PAID' | 'PARTIAL' | 'PENDING' = amtPaid >= amtDue && amtDue > 0 ? 'PAID' : amtPaid > 0 ? 'PARTIAL' : 'PENDING';
        return {
          number: p.number || idx + 1,
          label: p.label || `Période ${idx + 1}`,
          amountDue: amtDue,
          amountPaid: amtPaid,
          status,
          dueDate: p.dueDate,
        };
      });
      enrollment.periodsCount = enrollment.periods.length;
    }

    enrollment.remainingBalance = Math.max(0, netAmountDue - enrollment.totalPaid);
    enrollment.updatedAt = new Date().toISOString();

    localCanteenEnrollmentsStore.set(enrollmentId, enrollment);
    await persistEnrollmentsToSupabase();

    return { success: true, data: enrollment, message: 'Inscription cantine mise à jour avec succès.' };
  },

  /**
   * Supprime définitivement une inscription cantine
   */
  async deleteEnrollment(enrollmentId: string): Promise<ServiceResponse<boolean>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = localCanteenEnrollmentsStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription cantine introuvable.' };

    localCanteenEnrollmentsStore.delete(enrollmentId);
    await persistEnrollmentsToSupabase();

    return { success: true, data: true, message: 'Inscription cantine supprimée avec succès.' };
  },

  /**
   * Annule une inscription cantine
   */
  async cancelEnrollment(enrollmentId: string): Promise<ServiceResponse<CanteenEnrollment>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = localCanteenEnrollmentsStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription cantine introuvable.' };

    enrollment.subscriptionStatus = 'CANCELLED';
    enrollment.updatedAt = new Date().toISOString();

    localCanteenEnrollmentsStore.set(enrollmentId, enrollment);
    await persistEnrollmentsToSupabase();

    return { success: true, data: enrollment, message: 'Inscription cantine annulée avec succès.' };
  },
};
