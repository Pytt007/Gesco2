import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: { rpc: state.rpc, from: state.from },
}));

import { executeStudentRegistrationTransaction, CompleteStudentRegistrationInput } from '../../src/services/students/studentEnrollmentTransactionService';
import { tuitionPaymentService } from '../../src/services/finance/tuitionPaymentService';

const input: CompleteStudentRegistrationInput = {
  requestId: '12345678-1234-4234-8234-123456789abc',
  student: { firstName: 'Awa', lastName: 'Traoré', gender: 'Féminin' },
  parents: { financialPayer: 'MOTHER', mother: { firstName: 'Fatou', lastName: 'Traoré', phone: '+2250102030405' } },
  payment: { registrationFee: 10000, tuitionFee: 50000, discountAmount: 0,
    discountType: 'FIXED', discountValue: 0, paidAmount: 10000, paymentMode: 'CASH' },
  assignment: { schoolYear: '2026-2027', levelId: 'lvl-cp1', classId: '', className: 'Non affecté' },
};

describe('atomic student registration contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.rpc.mockReset();
    state.from.mockReset();
  });

  it('never falls back to separate writes when Neon rejects the transaction', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'Capacité maximale atteinte' } });
    const result = await executeStudentRegistrationTransaction(input);
    expect(result).toMatchObject({ success: false, error: 'Capacité maximale atteinte' });
    expect(state.rpc).toHaveBeenCalledWith('create_complete_student_enrollment', {
      p_request_id: input.requestId, p_payload: input,
    });
    expect(state.from).not.toHaveBeenCalled();
  });

  it('returns only the student and receipt acknowledged by Neon', async () => {
    const student = { id: input.requestId, firstName: 'Awa', lastName: 'Traoré', matricule: 'MAT-2026-1234' };
    const enrollment = { id: 'fin-1', studentName: 'Traoré Awa', academicYearId: '2026-2027' };
    const payment = { id: 'pay-1', amount: 10000, receiptNumber: 'REC-2026-00000001' };
    state.rpc.mockResolvedValue({ data: { student, enrollment, payment }, error: null });
    vi.spyOn(tuitionPaymentService, 'generateReceiptData').mockResolvedValue({ htmlContent: '<p>Reçu</p>' } as any);
    const result = await executeStudentRegistrationTransaction(input);
    expect(result).toMatchObject({ success: true, student, matricule: student.matricule,
      receiptNumber: payment.receiptNumber, receiptHtml: '<p>Reçu</p>' });
    expect(state.from).not.toHaveBeenCalled();
  });
});
