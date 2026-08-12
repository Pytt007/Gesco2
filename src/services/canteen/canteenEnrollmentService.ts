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

/** Données de démonstration — Vierge par défaut */
function initDemoCanteenEnrollments() {
  // Application 100% vierge
}


/**
 * Génère les périodes de paiement réparties uniformément
 */
export function generateDefaultPeriods(
  netAmountDue: number,
  periodsCount: number = 3
): CanteenPeriod[] {
  const base = Math.floor(netAmountDue / periodsCount);
  const remainder = netAmountDue - base * periodsCount;

  return Array.from({ length: periodsCount }, (_, i) => ({
    number: i + 1,
    label: `Période ${i + 1}`,
    amountDue: i === 0 ? base + remainder : base,
    amountPaid: 0,
    status: 'PENDING' as const,
    dueDate: `2026-${String(10 + i).padStart(2, '0')}-01`,
  }));
}

export const canteenEnrollmentService = {
  /**
   * Récupère toutes les inscriptions cantine pour une année scolaire
   */
  async getEnrollmentsByYear(academicYearId: string = 'ay-2026'): Promise<CanteenEnrollment[]> {
    initDemoCanteenEnrollments();

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('canteen_enrollments')
          .select('*, canteen_periods(*)')
          .eq('academic_year_id', academicYearId);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id,
            studentName: d.student_name,
            matricule: d.matricule,
            photoUrl: d.photo_url,
            className: d.class_name,
            levelCode: d.level_code as CanteenLevelCode,
            parentSponsor: d.parent_sponsor,
            parentPhone: d.parent_phone,
            academicYearId: d.academic_year_id,
            annualRate: Number(d.annual_rate || 0),
            periodsCount: Number(d.periods_count || 3),
            discountType: d.discount_type as CanteenDiscountType,
            discountValue: Number(d.discount_value || 0),
            discountAmount: Number(d.discount_amount || 0),
            netAmountDue: Number(d.net_amount_due || 0),
            totalPaid: Number(d.total_paid || 0),
            remainingBalance: Number(d.remaining_balance || 0),
            periods: Array.isArray(d.canteen_periods)
              ? d.canteen_periods.map((p: any) => ({
                  number: p.period_number,
                  label: p.period_label || `Période ${p.period_number}`,
                  amountDue: Number(p.amount_due || 0),
                  amountPaid: Number(p.amount_paid || 0),
                  status: p.status || 'PENDING',
                  dueDate: p.due_date,
                }))
              : [],
            subscriptionStatus: d.subscription_status as CanteenSubscriptionStatus,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch {
      // Fallback local
    }

    return Array.from(localCanteenEnrollmentsStore.values()).filter(
      (e) => e.academicYearId === academicYearId
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
    return { success: true, data: record, message: 'Inscription cantine enregistrée avec succès.' };
  },

  /**
   * Met à jour le solde après un paiement
   */
  applyPayment(enrollmentId: string, amount: number, periodNumber?: number): boolean {
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
