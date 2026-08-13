/**
 * GESCO — Service Inscriptions Transport
 */

import {
  TransportEnrollment,
  TransportEnrollmentInput,
  TransportPeriod,
  TransportDiscountType,
} from './types';
import { transportLineService, updateLineEnrollmentCount } from './transportLineService';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Stockage local ───────────────────────────────────────────────────────────

const enrollmentStore: Map<string, TransportEnrollment> = new Map();

export function clearTransportEnrollmentStore() { enrollmentStore.clear(); }



// ─── Génération des périodes ──────────────────────────────────────────────────

export function generateTransportPeriods(netAmount: number, count: number): TransportPeriod[] {
  const base = Math.floor(netAmount / count);
  const rem = netAmount - base * count;
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    label: `Période ${i + 1}`,
    amountDue: i === 0 ? base + rem : base,
    amountPaid: 0,
    status: 'PENDING' as const,
    dueDate: `2026-${String(10 + i).padStart(2, '0')}-01`,
  }));
}

// ─── Service Inscriptions ─────────────────────────────────────────────────────

export const transportEnrollmentService = {

  async getEnrollmentsByYear(academicYearId: string = 'ay-2026'): Promise<TransportEnrollment[]> {

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('transport_enrollments')
          .select('*, transport_periods(*)')
          .eq('academic_year_id', academicYearId);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id,
            studentName: d.student_name,
            matricule: d.matricule,
            photoUrl: d.photo_url,
            className: d.class_name,
            levelCode: d.level_code,
            parentSponsor: d.parent_sponsor,
            parentPhone: d.parent_phone,
            lineId: d.line_id,
            lineName: d.line_name,
            zone: d.zone,
            academicYearId: d.academic_year_id,
            annualFee: Number(d.annual_fee || 0),
            periodsCount: Number(d.periods_count || 3),
            discountType: d.discount_type as TransportDiscountType,
            discountValue: Number(d.discount_value || 0),
            discountAmount: Number(d.discount_amount || 0),
            netAmountDue: Number(d.net_amount_due || 0),
            totalPaid: Number(d.total_paid || 0),
            remainingBalance: Number(d.remaining_balance || 0),
            periods: Array.isArray(d.transport_periods)
              ? d.transport_periods.map((p: any) => ({
                  number: p.period_number,
                  label: p.period_label,
                  amountDue: Number(p.amount_due || 0),
                  amountPaid: Number(p.amount_paid || 0),
                  status: p.status,
                  dueDate: p.due_date,
                }))
              : [],
            status: d.status,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch { /* Fallback local */ }

    return Array.from(enrollmentStore.values()).filter((e) => e.academicYearId === academicYearId);
  },

  async getEnrollmentsByLine(lineId: string, academicYearId: string = 'ay-2026'): Promise<TransportEnrollment[]> {
    const all = await this.getEnrollmentsByYear(academicYearId);
    return all.filter((e) => e.lineId === lineId);
  },

  async getEnrollmentByStudent(studentId: string, academicYearId: string = 'ay-2026'): Promise<TransportEnrollment | null> {
    const all = await this.getEnrollmentsByYear(academicYearId);
    return all.find((e) => e.studentId === studentId) || null;
  },

  async search(query: string, academicYearId: string = 'ay-2026'): Promise<TransportEnrollment[]> {
    const all = await this.getEnrollmentsByYear(academicYearId);
    const q = query.toLowerCase().trim();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.studentName.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        e.className.toLowerCase().includes(q) ||
        e.lineName.toLowerCase().includes(q) ||
        (e.parentSponsor || '').toLowerCase().includes(q)
    );
  },

  /**
   * Inscrire un élève au transport
   */
  async createEnrollment(input: TransportEnrollmentInput): Promise<ServiceResponse<TransportEnrollment>> {

    if (!input.studentId || !input.academicYearId) {
      return { success: false, error: 'Élève et année scolaire requis.' };
    }

    // Double inscription
    const existing = await this.getEnrollmentByStudent(input.studentId, input.academicYearId);
    if (existing) {
      return { success: false, error: 'Cet élève est déjà inscrit au transport pour cette année scolaire.' };
    }

    // Récupération de la ligne
    const line = transportLineService.getById(input.lineId);
    if (!line) {
      return { success: false, error: 'Ligne de transport introuvable.' };
    }
    if (line.status !== 'ACTIVE') {
      return { success: false, error: `La ligne "${line.name}" n'est pas active (statut : ${line.status}).` };
    }
    if (line.availableSeats <= 0) {
      return { success: false, error: `La ligne "${line.name}" n'a plus de places disponibles.` };
    }

    // Calcul remise
    let discountAmount = 0;
    if (input.discountType === 'FIXED') {
      discountAmount = input.discountValue;
    } else if (input.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((line.annualFee * input.discountValue) / 100);
    }
    if (discountAmount > line.annualFee) {
      return { success: false, error: 'La remise ne peut pas dépasser le tarif annuel.' };
    }

    const netAmountDue = Math.max(0, line.annualFee - discountAmount);
    const periods = generateTransportPeriods(netAmountDue, line.periodsCount);

    const id = `te-${input.studentId}-${input.academicYearId}-${Date.now()}`;

    const record: TransportEnrollment = {
      id,
      studentId: input.studentId,
      studentName: input.studentName,
      matricule: input.matricule,
      photoUrl: input.photoUrl,
      className: input.className,
      levelCode: input.levelCode,
      parentSponsor: input.parentSponsor,
      parentPhone: input.parentPhone,
      lineId: line.id,
      lineName: line.name,
      zone: line.zone,
      academicYearId: input.academicYearId,
      annualFee: line.annualFee,
      periodsCount: line.periodsCount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount,
      netAmountDue,
      totalPaid: 0,
      remainingBalance: netAmountDue,
      periods,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    enrollmentStore.set(id, record);

    // Mise à jour du compteur de la ligne
    updateLineEnrollmentCount(line.id, +1);

    return { success: true, data: record, message: 'Inscription transport enregistrée avec succès.' };
  },

  /**
   * Applique un paiement sur l'inscription
   */
  applyPayment(enrollmentId: string, amount: number, periodNumber?: number): boolean {
    const enrollment = enrollmentStore.get(enrollmentId);
    if (!enrollment) return false;

    enrollment.totalPaid = Math.min(enrollment.netAmountDue, enrollment.totalPaid + amount);
    enrollment.remainingBalance = Math.max(0, enrollment.netAmountDue - enrollment.totalPaid);

    if (periodNumber !== undefined) {
      const period = enrollment.periods.find((p) => p.number === periodNumber);
      if (period) {
        period.amountPaid = Math.min(period.amountDue, period.amountPaid + amount);
        period.status = period.amountPaid >= period.amountDue ? 'PAID' : period.amountPaid > 0 ? 'PARTIAL' : 'PENDING';
      }
    }

    enrollment.updatedAt = new Date().toISOString();
    enrollmentStore.set(enrollmentId, enrollment);
    return true;
  },
};
