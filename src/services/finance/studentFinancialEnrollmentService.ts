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

const localFinancialEnrollmentsStore: Map<string, StudentFinancialEnrollment> = new Map();

export function clearFinancialEnrollmentsStore() {
  localFinancialEnrollmentsStore.clear();
}


/**
 * Génère automatiquement les 8 échéances réparties pour un solde donné
 */
export function generateDefaultInstallments(
  netTotalDue: number,
  registrationFee: number,
  customs?: { number: number; amountDue: number; label?: string }[]
): EnrollmentInstallmentItem[] {
  if (customs && customs.length > 0) {
    return customs.map((c) => ({
      number: c.number,
      label: c.label || `Échéance ${c.number}`,
      amountDue: c.amountDue,
      amountPaid: 0,
      status: 'PENDING' as const,
    }));
  }

  const count = 8;
  const netTuition = Math.max(0, netTotalDue - registrationFee);
  const basePerInstallment = Math.floor(netTuition / count);
  const remainder = netTuition - basePerInstallment * count;

  const items: EnrollmentInstallmentItem[] = [];

  for (let i = 1; i <= count; i++) {
    // Échéance 1 inclut les frais d'inscription + sa quote-part de scolarité + le reliquat de répartition
    const isFirst = i === 1;
    const dueAmount = isFirst
      ? registrationFee + basePerInstallment + remainder
      : basePerInstallment;

    items.push({
      number: i,
      label: `Échéance ${i}`,
      dueDate: `2026-0${Math.min(9, i + 1)}-05`,
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
  async getEnrollmentsByYear(academicYearId: string = '2024-2025'): Promise<StudentFinancialEnrollment[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('student_financial_enrollments')
          .select('*, enrollment_installments(*)')
          .eq('academic_year_id', academicYearId)
          .eq('status', 'ACTIVE');

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id,
            studentName: d.student_name,
            matricule: d.matricule,
            academicYearId: d.academic_year_id,
            classroomId: d.classroom_id,
            className: d.class_name,
            levelCode: d.level_code as TuitionLevelCode,
            registrationFee: Number(d.registration_fee || 0),
            tuitionFee: Number(d.tuition_fee || 0),
            totalAnnualFee: Number(d.registration_fee || 0) + Number(d.tuition_fee || 0),
            discountType: d.discount_type as DiscountType,
            discountValue: Number(d.discount_value || 0),
            discountAmount: Number(d.discount_amount || 0),
            netTotalDue: Number(d.net_total_due || 0),
            totalPaid: Number(d.total_paid || 0),
            remainingBalance: Number(d.remaining_balance || 0),
            installmentsCount: Array.isArray(d.enrollment_installments) ? d.enrollment_installments.length : 8,
            installments: Array.isArray(d.enrollment_installments)
              ? d.enrollment_installments.map((i: any) => ({
                  id: i.id,
                  number: i.installment_number,
                  label: i.installment_label,
                  dueDate: i.due_date,
                  amountDue: Number(i.amount_due || 0),
                  amountPaid: Number(i.amount_paid || 0),
                  status: i.status || 'PENDING',
                }))
              : [],
            status: d.status || 'ACTIVE',
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch {
      // Fallback
    }

    return Array.from(localFinancialEnrollmentsStore.values()).filter(
      (e) => (e.academicYearId === academicYearId || !academicYearId) && e.status === 'ACTIVE'
    );
  },



  /**
   * Obtient le dossier financier d'un élève pour une année scolaire
   */
  async getEnrollmentByStudent(studentId: string, academicYearId: string = 'ay-2026'): Promise<StudentFinancialEnrollment | null> {
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
    let className = 'Classe';
    let levelCode: TuitionLevelCode = input.levelCode || 'CP1';
    try {
      const clsRes = await getClassroom(input.classroomId);
      if (clsRes.success && clsRes.data) {
        className = clsRes.data.name;
        levelCode = input.levelCode || (clsRes.data.levelCode as TuitionLevelCode) || 'CP1';
      }
    } catch { /* Fallback */ }

    // 4. Récupération automatique des tarifs selon l'année scolaire et le niveau
    const feeSchedule = await tuitionFeesService.getScheduleByLevel(levelCode, input.academicYearId);

    if (!feeSchedule) {
      return {
        success: false,
        error: `Aucun tarif configuré pour le niveau ${levelCode} sur l'année scolaire sélectionnée.`,
      };
    }

    const registrationFee = feeSchedule.registrationFee;
    const tuitionFee = feeSchedule.tuitionFee;
    const totalAnnualFee = feeSchedule.totalAnnualFee;

    // 5. Validation des valeurs de remise
    if (input.discountValue < 0) {
      return { success: false, error: 'La remise ne peut pas être négative.' };
    }

    let discountAmount = 0;
    if (input.discountType === 'FIXED') {
      discountAmount = input.discountValue;
    } else if (input.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((tuitionFee * input.discountValue) / 100);
    }

    if (discountAmount > totalAnnualFee) {
      return { success: false, error: 'Le montant de la remise ne peut pas dépasser le total annuel.' };
    }

    const netTotalDue = Math.max(0, totalAnnualFee - discountAmount);

    // 6. Génération automatique des 8 échéances
    const installments = generateDefaultInstallments(netTotalDue, registrationFee, input.customInstallments);

    // 7. Assemblage du dossier financier
    let studentName = `ÉLÈVE ${input.studentId}`;
    let matricule = `MAT-2026-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const studentRes = await getStudentById(input.studentId);
      if (studentRes.success && studentRes.data) {
        studentName = `${studentRes.data.lastName} ${studentRes.data.firstName}`;
        matricule = studentRes.data.matricule;
      }
    } catch { /* Fallback */ }

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
      discountValue: input.discountValue,
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

    localFinancialEnrollmentsStore.set(id, record);

    return {
      success: true,
      data: record,
      message: 'Dossier financier créé et 8 échéances générées avec succès.',
    };
  },

  /**
   * Modification d'un dossier financier existant (Ajustement de remises ou échéances)
   */
  async updateEnrollment(
    id: string,
    input: Partial<FinancialEnrollmentInput>
  ): Promise<ServiceResponse<StudentFinancialEnrollment>> {
    const existing = localFinancialEnrollmentsStore.get(id);
    if (!existing) {
      return { success: false, error: 'Dossier financier introuvable.' };
    }

    const discountType = input.discountType ?? existing.discountType;
    const discountValue = input.discountValue !== undefined ? input.discountValue : existing.discountValue;

    if (discountValue < 0) {
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

    const installments = generateDefaultInstallments(netTotalDue, existing.registrationFee, input.customInstallments);

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

    localFinancialEnrollmentsStore.set(id, updated);
    return { success: true, data: updated, message: 'Dossier financier mis à jour.' };
  },

  /**
   * Archivage d'un dossier financier
   */
  async archiveEnrollment(id: string): Promise<ServiceResponse<boolean>> {
    const existing = localFinancialEnrollmentsStore.get(id);
    if (!existing) {
      return { success: false, error: 'Dossier financier introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    localFinancialEnrollmentsStore.set(id, existing);

    return { success: true, data: true, message: 'Dossier financier archivé.' };
  },
};
