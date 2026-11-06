import {
  StudentFinancialEnrollment,
  FinancialEnrollmentInput,
  EnrollmentInstallmentItem,
  TuitionLevelCode,
  DiscountType,
} from './types';
import { tuitionFeesService } from './tuitionFeesService';
import { ServiceResponse } from '../academic/academicYearsService';
import { getStudentById } from '../students/studentsService';
import { getClassroom } from '../academic/classroomsService';
import { supabase } from '../common/supabaseClient';

export function clearFinancialEnrollmentsStore() { /* No browser persistence. */ }
async function loadEnrollment(id: string): Promise<StudentFinancialEnrollment | null> {
  const { data, error } = await supabase.from('student_financial_enrollments').select('data').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.data || null;
}

/**
 * Génère automatiquement les échéances réparties pour un solde donné
 */
export function generateDefaultInstallments(
  netTotalDue: number,
  registrationFee: number,
  customs?: { number: number; amountDue: number; label?: string; dueDate?: string }[],
  academicYear?: string
): EnrollmentInstallmentItem[] {
  let startYear = new Date().getFullYear();
  if (academicYear) {
    const parts = academicYear.split(/[-/]/);
    const parsed = parseInt(parts[0], 10);
    if (!isNaN(parsed) && parsed > 2000) {
      startYear = parsed;
    }
  }

  // 1. Si des échéances personnalisées ont été configurées (ex: 1 seule échéance comptant)
  if (customs && customs.length > 0) {
    const nonZeroCustoms = customs.filter((c, idx) => c.amountDue > 0 || (customs.length === 1 && idx === 0));
    const finalCustoms = nonZeroCustoms.length > 0 ? nonZeroCustoms : [customs[0]];

    return finalCustoms.map((c, idx) => ({
      number: idx + 1,
      label: c.label || (finalCustoms.length === 1 ? 'Paiement Unique (Comptant)' : `Échéance ${idx + 1}`),
      dueDate: c.dueDate || new Date(Date.UTC(startYear, 9 + idx, 5)).toISOString().slice(0, 10),
      amountDue: c.amountDue,
      amountPaid: 0,
      status: 'PENDING' as const,
    }));
  }

  // 2. Si pas d'échéances personnalisées
  const netTuition = Math.max(0, netTotalDue - registrationFee);

  // Si la scolarité restante est de 0 (ex: seulement inscription ou déjà soldé)
  if (netTuition <= 0) {
    return [
      {
        number: 1,
        label: registrationFee > 0 ? 'Frais d’inscription' : 'Paiement Unique (Comptant)',
        dueDate: `${startYear}-10-05`,
        amountDue: netTotalDue > 0 ? netTotalDue : registrationFee,
        amountPaid: 0,
        status: 'PENDING' as const,
      },
    ];
  }

  const count = 8;
  const basePerInstallment = Math.floor(netTuition / count);
  const remainder = netTuition - basePerInstallment * count;
  const months = ['10', '11', '12', '01', '02', '03', '04', '05'];
  const items: EnrollmentInstallmentItem[] = [];

  for (let i = 1; i <= count; i++) {
    const isFirst = i === 1;
    const dueAmount = isFirst
      ? registrationFee + basePerInstallment + remainder
      : basePerInstallment;

    if (dueAmount <= 0 && i > 1) continue; // Ne pas créer d'échéances fantômes à 0 FCFA

    const monthIndex = i - 1;
    const yearForMonth = monthIndex >= 3 ? startYear + 1 : startYear;

    items.push({
      number: items.length + 1,
      label: `Échéance ${items.length + 1}`,
      dueDate: `${yearForMonth}-${months[monthIndex]}-05`,
      amountDue: dueAmount,
      amountPaid: 0,
      status: 'PENDING' as const,
    });
  }

  return items;
}

export const studentFinancialEnrollmentService = {
  /**
   * Obtient tous les dossiers financiers pour une année scolaire
   */
  async getEnrollmentsByYear(academicYearId = ''): Promise<StudentFinancialEnrollment[]> {
    let query = supabase.from('student_financial_enrollments').select('data').eq('status', 'ACTIVE');
    if (academicYearId) query = query.eq('academic_year_id', academicYearId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(row => row.data as StudentFinancialEnrollment);
  },

  /**
   * Obtient le dossier financier d'un élève pour une année scolaire
   */
  async getEnrollmentByStudent(studentId: string, academicYearId = ''): Promise<StudentFinancialEnrollment | null> {
    const list = await this.getEnrollmentsByYear(academicYearId);
    return list.find((e) => e.studentId === studentId) || null;
  },

  /**
   * Inscription financière automatique d'un élève
   */
  async createEnrollment(input: FinancialEnrollmentInput): Promise<ServiceResponse<StudentFinancialEnrollment>> {
    // 1. Validation de l'élève et de la classe
    if (!input.studentId) {
      return { success: false, error: 'Identifiant élève requis.' };
    }
    if (!input.academicYearId) {
      return { success: false, error: 'Année scolaire requise.' };
    }
    if (!input.classroomId) {
      return { success: false, error: 'Classe requise.' };
    }

    // 2. Empêcher l'élève d'être inscrit deux fois financièrement sur la même année
    const existing = await this.getEnrollmentByStudent(input.studentId, input.academicYearId);
    if (existing) {
      return { success: false, error: 'Cet élève possède déjà un dossier financier pour cette année scolaire.' };
    }

    // 3. Résolution des informations de classe et niveau
    let clsRes;
    try { clsRes = await getClassroom(input.classroomId); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Lecture de la classe impossible.' }; }
    if (!clsRes.success || !clsRes.data) {
      return { success: false, error: clsRes.error || 'Classe introuvable dans Neon.' };
    }
    const className = clsRes.data.name;
    const levelCode = input.levelCode || (clsRes.data.levelCode as TuitionLevelCode);
    if (!levelCode) return { success: false, error: 'Niveau scolaire de la classe manquant.' };

    // 4. Récupération des tarifs officiels configurés
    const schedules = await tuitionFeesService.getSchedulesByYear(input.academicYearId);
    const schedule = schedules.find((s) => s.levelCode === levelCode);

    if (!schedule) return { success: false, error: 'Configurez les tarifs de ce niveau avant de créer le dossier.' };
    const registrationFee = schedule.registrationFee;
    const tuitionFee = schedule.tuitionFee;
    const totalAnnualFee = registrationFee + tuitionFee;

    const discountValue = input.discountValue ?? 0;
    if (!Number.isFinite(discountValue) || discountValue < 0) return { success: false, error: 'Remise invalide.' };

    // 5. Calcul de la remise éventuelle
    let discountAmount = 0;
    if (input.discountType === 'FIXED') {
      discountAmount = discountValue;
    } else if (input.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((tuitionFee * discountValue) / 100);
    }

    if (discountAmount > totalAnnualFee) {
      return { success: false, error: 'Le montant de la remise ne peut pas dépasser le total annuel.' };
    }

    const netTotalDue = Math.max(0, totalAnnualFee - discountAmount);

    // 6. Génération des échéances réparties
    const installments = generateDefaultInstallments(
      netTotalDue,
      registrationFee,
      input.customInstallments,
      input.academicYearId
    );

    // 7. Assemblage du dossier financier
    let studentRes;
    try { studentRes = await getStudentById(input.studentId); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Lecture de l’élève impossible.' }; }
    if (!studentRes.success || !studentRes.data) {
      return { success: false, error: studentRes.error || 'Élève introuvable dans Neon.' };
    }
    const studentName = `${studentRes.data.lastName} ${studentRes.data.firstName}`;
    const matricule = studentRes.data.matricule;
    if (!matricule) return { success: false, error: 'Matricule de l’élève manquant.' };

    const id = `fin-${input.studentId}-${input.academicYearId}`;

    const record: StudentFinancialEnrollment = {
      id,
      studentId: input.studentId,
      studentName,
      matricule,
      academicYearId: input.academicYearId,
      classroomId: input.classroomId,
      className,
      levelCode,
      registrationFee,
      tuitionFee,
      totalAnnualFee,
      discountType: input.discountType,
      discountValue,
      discountAmount,
      netTotalDue,
      totalPaid: 0,
      remainingBalance: netTotalDue,
      installmentsCount: installments.length,
      installments,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try { await this.saveEnrollment(record); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Enregistrement refusé.' }; }

    return {
      success: true,
      data: record,
      message: `Dossier financier créé et ${installments.length} échéance(s) configurée(s) avec succès.`,
    };
  },

  /**
   * Sauvegarde directe d'un dossier financier (synchronisation mémoire + localStorage)
   */
  async saveEnrollment(enrollment: StudentFinancialEnrollment): Promise<StudentFinancialEnrollment> {
    const { data, error } = await supabase.rpc('save_financial_enrollment', { p_data: enrollment });
    if (error || !data) throw new Error(error?.message || 'Dossier non enregistré.');
    return data as StudentFinancialEnrollment;
  },

  /**
   * Modification d'un dossier financier existant (Ajustement de remises ou échéances)
   */
  async updateEnrollment(
    id: string,
    input: Partial<FinancialEnrollmentInput>
  ): Promise<ServiceResponse<StudentFinancialEnrollment>> {
    const existing = await loadEnrollment(id);
    if (!existing) {
      return { success: false, error: 'Dossier financier introuvable.' };
    }

    const discountType = input.discountType ?? existing.discountType;
    const discountValue = input.discountValue !== undefined ? input.discountValue : existing.discountValue;

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return { success: false, error: 'La remise ne peut pas être négative.' };
    }

    let discountAmount = 0;
    if (discountType === 'FIXED') {
      discountAmount = discountValue;
    } else if (discountType === 'PERCENTAGE') {
      discountAmount = Math.round((existing.tuitionFee * discountValue) / 100);
    }

    if (discountAmount > existing.totalAnnualFee) {
      return { success: false, error: 'Le montant de la remise ne peut pas dépasser le total annuel.' };
    }

    const netTotalDue = Math.max(0, existing.totalAnnualFee - discountAmount);
    const remainingBalance = Math.max(0, netTotalDue - existing.totalPaid);

    const installments = generateDefaultInstallments(
      netTotalDue,
      existing.registrationFee,
      input.customInstallments,
      existing.academicYearId
    );

    const updated: StudentFinancialEnrollment = {
      ...existing,
      discountType,
      discountValue,
      discountAmount,
      netTotalDue,
      remainingBalance,
      installments,
      updatedAt: new Date().toISOString(),
    };

    try { await this.saveEnrollment(updated); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Modification refusée.' }; }
    return { success: true, data: updated, message: 'Dossier financier mis à jour.' };
  },

  /**
   * Archivage d'un dossier financier
   */
  async archiveEnrollment(id: string): Promise<ServiceResponse<boolean>> {
    const existing = await loadEnrollment(id);
    if (!existing) {
      return { success: false, error: 'Dossier financier introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    try { await this.saveEnrollment(existing); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Archivage refusé.' }; }

    return { success: true, data: true, message: 'Dossier financier archivé.' };
  },
};
