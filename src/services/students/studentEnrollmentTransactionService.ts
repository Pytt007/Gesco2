import { Student } from '../../types';
import { TuitionPaymentRecord, StudentFinancialEnrollment } from '../finance/types';
import { tuitionPaymentService } from '../finance/tuitionPaymentService';
import { supabase } from '../common/supabaseClient';

export interface CompleteStudentRegistrationInput {
  requestId?: string;
  student: {
    firstName: string; lastName: string; gender: 'Masculin' | 'Féminin';
    birthDate?: string; birthPlace?: string; nationality?: string; photo?: string;
    address?: string; specialSituation?: string; documents?: string[];
  };
  parents: {
    father?: { firstName: string; lastName: string; profession?: string; phone: string; email?: string; address?: string };
    mother?: { firstName: string; lastName: string; profession?: string; phone: string; email?: string; address?: string };
    guardian?: { firstName: string; lastName: string; relationshipType?: string; profession?: string; phone: string; email?: string; address?: string };
    emergencyContact?: { name: string; phone: string; relationship?: string };
    financialPayer: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  };
  payment: {
    registrationFee: number; tuitionFee: number; canteenFee?: number; transportFee?: number;
    otherFees?: number; discountType: 'FIXED' | 'PERCENTAGE';
    discountValue: number; paidAmount: number;
    paymentMode: 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'WAVE' | 'TRANSFER' | 'CHECK';
    paymentReference?: string; remarks?: string;
    customInstallments?: { number: number; amountDue: number; label?: string; dueDate?: string }[];
  };
  assignment: {
    schoolYear: string; levelId?: string; classId: string; className: string;
    allowCapacityOverflow?: boolean;
  };
  recordedBy?: string;
}

export interface StudentRegistrationResult {
  success: boolean; student?: Student; matricule?: string;
  receiptHtml?: string; receiptNumber?: string; error?: string;
}

type RegistrationResponse = {
  student: Student; enrollment: StudentFinancialEnrollment; payment: TuitionPaymentRecord | null;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c] || c);

/** The SQL function commits every registration record together or rolls all of them back. */
export async function executeStudentRegistrationTransaction(input: CompleteStudentRegistrationInput): Promise<StudentRegistrationResult> {
  if (!input.student.firstName?.trim() || !input.student.lastName?.trim()) {
    return { success: false, error: 'Le nom et le prénom de l\'élève sont obligatoires.' };
  }
  if (!input.assignment.schoolYear) return { success: false, error: 'Année scolaire requise.' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, error: 'Connexion Internet requise pour confirmer une inscription.' };
  }
  try {
    const { data, error } = await supabase.rpc('create_complete_student_enrollment', {
      p_request_id: input.requestId || crypto.randomUUID(), p_payload: input,
    });
    if (error || !data?.student || !data?.enrollment) {
      throw new Error(error?.message || 'Le serveur n\'a pas confirmé l\'inscription. Vérifiez la migration Neon 015.');
    }
    const result = data as RegistrationResponse;
    const receiptNumber = result.payment?.receiptNumber || '';
    let receiptHtml = '';
    if (result.payment) {
      try {
        const receipt = await tuitionPaymentService.generateReceiptData(result.payment, result.enrollment);
        receiptHtml = receipt.htmlContent || '';
      } catch {
        receiptHtml = `<div style="font-family:sans-serif;padding:24px"><h2>Reçu d'inscription</h2><p>N° ${escapeHtml(receiptNumber)}</p><p>Élève : ${escapeHtml(result.enrollment.studentName)}</p><p>Montant : ${escapeHtml(result.payment.amount)} FCFA</p></div>`;
      }
    }
    return { success: true, student: result.student, matricule: result.student.matricule, receiptHtml, receiptNumber };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Inscription non confirmée.' };
  }
}
