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

// ─── Stockage local & Synchro Supabase ─────────────────────────────────────────

const enrollmentStore: Map<string, TransportEnrollment> = new Map();

export function clearTransportEnrollmentStore() { enrollmentStore.clear(); }

async function syncEnrollmentsFromSupabase(): Promise<TransportEnrollment[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'transport_enrollments_data')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      enrollmentStore.clear();
      for (const item of settingsRow.data) {
        enrollmentStore.set(item.id, item);
      }
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[transportEnrollmentService] Supabase sync error:', err);
  }
  return Array.from(enrollmentStore.values());
}

async function persistEnrollmentsToSupabase() {
  try {
    const list = Array.from(enrollmentStore.values());
    await supabase
      .from('school_settings')
      .upsert({
        id: 'transport_enrollments_data',
        data: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[transportEnrollmentService] Supabase persist error:', err);
  }
}

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
    await syncEnrollmentsFromSupabase();

    return Array.from(enrollmentStore.values()).filter((e) => !academicYearId || e.academicYearId === academicYearId);
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

    await syncEnrollmentsFromSupabase();

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

    let periods: TransportPeriod[];
    if (input.customPeriods && input.customPeriods.length > 0) {
      periods = input.customPeriods.map((p, idx) => ({
        number: p.number || idx + 1,
        label: p.label || `Période ${idx + 1}`,
        amountDue: Number(p.amountDue) || 0,
        amountPaid: 0,
        status: 'PENDING' as const,
        dueDate: p.dueDate,
      }));
    } else if (line.customPeriods && line.customPeriods.length > 0) {
      // Hériter des périodes personnalisées de la ligne
      periods = line.customPeriods.map((p, idx) => ({
        number: p.number || idx + 1,
        label: p.label || `Période ${idx + 1}`,
        amountDue: Number(p.amountDue) || 0,
        amountPaid: 0,
        status: 'PENDING' as const,
        dueDate: p.dueDate,
      }));
    } else {
      periods = generateTransportPeriods(netAmountDue, line.periodsCount);
    }

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
      periodsCount: periods.length,
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
    await persistEnrollmentsToSupabase();

    // Mise à jour du compteur de la ligne
    updateLineEnrollmentCount(line.id, +1);

    return { success: true, data: record, message: 'Inscription transport enregistrée avec succès.' };
  },

  /**
   * Applique un paiement sur l'inscription
   */
  async applyPayment(enrollmentId: string, amount: number, periodNumber?: number): Promise<boolean> {
    await syncEnrollmentsFromSupabase();
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
    await persistEnrollmentsToSupabase();
    return true;
  },

  /**
   * Annule une inscription et libère la place dans le véhicule
   */
  async cancelEnrollment(enrollmentId: string): Promise<ServiceResponse<TransportEnrollment>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = enrollmentStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription transport introuvable.' };

    if (enrollment.status === 'CANCELLED') {
      return { success: false, error: 'Cette inscription est déjà annulée.' };
    }

    enrollment.status = 'CANCELLED';
    enrollment.updatedAt = new Date().toISOString();
    enrollmentStore.set(enrollmentId, enrollment);
    await persistEnrollmentsToSupabase();

    // Libérer la place sur la ligne
    updateLineEnrollmentCount(enrollment.lineId, -1);

    return { success: true, data: enrollment, message: 'Inscription transport annulée et place libérée.' };
  },

  /**
   * Met à jour une inscription existante (changement de ligne, remise, échéancier personnalisé, contacts)
   */
  async updateEnrollment(
    enrollmentId: string,
    updates: {
      lineId?: string;
      discountType?: TransportDiscountType;
      discountValue?: number;
      customPeriods?: { number: number; label: string; dueDate?: string; amountDue: number }[];
      parentSponsor?: string;
      parentPhone?: string;
    }
  ): Promise<ServiceResponse<TransportEnrollment>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = enrollmentStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription transport introuvable.' };

    let newLine = updates.lineId && updates.lineId !== enrollment.lineId
      ? transportLineService.getById(updates.lineId)
      : null;

    if (updates.lineId && updates.lineId !== enrollment.lineId) {
      if (!newLine) return { success: false, error: 'Nouvelle ligne de transport introuvable.' };
      if (newLine.status !== 'ACTIVE') return { success: false, error: `La ligne "${newLine.name}" n'est pas active.` };
      if (newLine.availableSeats <= 0) return { success: false, error: `La ligne "${newLine.name}" n'a plus de place disponible.` };

      // Libérer la place sur l'ancienne ligne
      updateLineEnrollmentCount(enrollment.lineId, -1);
      // Réserver la place sur la nouvelle ligne
      updateLineEnrollmentCount(newLine.id, +1);

      enrollment.lineId = newLine.id;
      enrollment.lineName = newLine.name;
      enrollment.zone = newLine.zone;
      enrollment.annualFee = newLine.annualFee;
    }

    const currentAnnualFee = newLine ? newLine.annualFee : enrollment.annualFee;
    const discountType = updates.discountType ?? enrollment.discountType;
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : enrollment.discountValue;

    let discountAmount = 0;
    if (discountType === 'FIXED') {
      discountAmount = discountValue;
    } else if (discountType === 'PERCENTAGE') {
      discountAmount = Math.round((currentAnnualFee * discountValue) / 100);
    }
    const netAmountDue = Math.max(0, currentAnnualFee - discountAmount);

    enrollment.discountType = discountType;
    enrollment.discountValue = discountValue;
    enrollment.discountAmount = discountAmount;
    enrollment.netAmountDue = netAmountDue;

    if (updates.parentSponsor !== undefined) enrollment.parentSponsor = updates.parentSponsor;
    if (updates.parentPhone !== undefined) enrollment.parentPhone = updates.parentPhone;

    // Gestion des périodes / échéances
    if (updates.customPeriods && updates.customPeriods.length > 0) {
      let paidPool = enrollment.totalPaid;
      enrollment.periods = updates.customPeriods.map((p, idx) => {
        const amtDue = Number(p.amountDue) || 0;
        const amtPaid = Math.min(amtDue, Math.max(0, paidPool));
        paidPool = Math.max(0, paidPool - amtPaid);
        const status: TransportPeriod['status'] = amtPaid >= amtDue && amtDue > 0 ? 'PAID' : amtPaid > 0 ? 'PARTIAL' : 'PENDING';
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

    enrollmentStore.set(enrollmentId, enrollment);
    await persistEnrollmentsToSupabase();

    return { success: true, data: enrollment, message: 'Inscription transport mise à jour avec succès.' };
  },

  /**
   * Supprime définitivement une inscription et libère la place
   */
  async deleteEnrollment(enrollmentId: string): Promise<ServiceResponse<boolean>> {
    await syncEnrollmentsFromSupabase();
    const enrollment = enrollmentStore.get(enrollmentId);
    if (!enrollment) return { success: false, error: 'Inscription transport introuvable.' };

    if (enrollment.status !== 'CANCELLED') {
      updateLineEnrollmentCount(enrollment.lineId, -1);
    }

    enrollmentStore.delete(enrollmentId);
    await persistEnrollmentsToSupabase();

    return { success: true, data: true, message: 'Inscription transport supprimée avec succès.' };
  },
};
