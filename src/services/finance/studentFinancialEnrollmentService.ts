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

const STORAGE_KEY_FINANCIAL_ENROLLMENTS = 'gesco_financial_enrollments_store';

function loadPersistedFinancialEnrollments(): Map<string, StudentFinancialEnrollment> {
  const store = new Map<string, StudentFinancialEnrollment>();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_FINANCIAL_ENROLLMENTS);
      if (raw) {
        const parsed: StudentFinancialEnrollment[] = JSON.parse(raw);
        parsed.forEach((e) => {
          if (Array.isArray(e.installments)) {
            const nonZero = e.installments.filter((i) => i.amountDue > 0 || i.amountPaid > 0);
            if (nonZero.length > 0 && nonZero.length < e.installments.length) {
              e.installments = nonZero;
              e.installments.forEach((i, idx) => { i.number = idx + 1; });
              e.installmentsCount = nonZero.length;
            }
          }
          store.set(e.id, e);
        });
      }
    }
  } catch {}
  return store;
}

function persistFinancialEnrollments(store: Map<string, StudentFinancialEnrollment>) {
  try {
    if (typeof localStorage !== 'undefined') {
      const list = Array.from(store.values());
      localStorage.setItem(STORAGE_KEY_FINANCIAL_ENROLLMENTS, JSON.stringify(list));
    }
  } catch {}
}

const localFinancialEnrollmentsStore: Map<string, StudentFinancialEnrollment> = loadPersistedFinancialEnrollments();

export function clearFinancialEnrollmentsStore() {
  localFinancialEnrollmentsStore.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_FINANCIAL_ENROLLMENTS);
    }
  } catch {}
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
      dueDate: c.dueDate || `${startYear}-${String(10 + (idx % 12)).padStart(2, '0')}-05`,
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

    const inMemoryList = Array.from(localFinancialEnrollmentsStore.values()).filter(
      (e) => (e.academicYearId === academicYearId || !academicYearId) && e.status === 'ACTIVE'
    );
    inMemoryList.forEach((e) => {
      if (Array.isArray(e.installments) && e.installments.length > 1) {
        const nonZero = e.installments.filter((i) => i.amountDue > 0 || i.amountPaid > 0);
        if (nonZero.length > 0 && nonZero.length < e.installments.length) {
          e.installments = nonZero;
          e.installments.forEach((i, idx) => { i.number = idx + 1; });
          e.installmentsCount = nonZero.length;
        }
      }
    });
    return inMemoryList;
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

    // 4. Récupération des tarifs officiels configurés
    const schedules = await tuitionFeesService.getSchedulesByYear(input.academicYearId);
    const schedule = schedules.find((s) => s.levelCode === levelCode);

    const registrationFee = schedule ? schedule.registrationFee : 50000;
    const tuitionFee = schedule ? schedule.tuitionFee : 120000;
    const totalAnnualFee = registrationFee + tuitionFee;

    // 5. Calcul de la remise éventuelle
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

    // 6. Génération des échéances réparties
    const installments = generateDefaultInstallments(
      netTotalDue,
      registrationFee,
      input.customInstallments,
      input.academicYearId
    );

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
    persistFinancialEnrollments(localFinancialEnrollmentsStore);

    return {
      success: true,
      data: record,
      message: `Dossier financier créé et ${installments.length} échéance(s) configurée(s) avec succès.`,
    };
  },

  /**
   * Sauvegarde directe d'un dossier financier (synchronisation mémoire + localStorage)
   */
  saveEnrollment(enrollment: StudentFinancialEnrollment) {
    localFinancialEnrollmentsStore.set(enrollment.id, enrollment);
    persistFinancialEnrollments(localFinancialEnrollmentsStore);
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

    localFinancialEnrollmentsStore.set(id, updated);
    persistFinancialEnrollments(localFinancialEnrollmentsStore);
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
    persistFinancialEnrollments(localFinancialEnrollmentsStore);

    return { success: true, data: true, message: 'Dossier financier archivé.' };
  },
};
