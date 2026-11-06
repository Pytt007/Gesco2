import '../helpers/databaseSetup';
import { describe, it, expect } from 'vitest';
import { studentFinancialEnrollmentService as enrollments } from '../../src/services/finance/studentFinancialEnrollmentService';
import { tuitionPaymentService as payments } from '../../src/services/finance/tuitionPaymentService';

const input={studentId:'st-001',academicYearId:'ay-2026',classroomId:'cls-1',discountType:'FIXED' as const,discountValue:0};
describe('Financial enrollment confirmed by PostgreSQL',()=>{
  it('creates a zero balance and zero installment after a full discount',async()=>{
    const result=await enrollments.createEnrollment({...input,discountValue:360000});
    expect(result.success).toBe(true);
    expect(result.data?.netTotalDue).toBe(0);
    expect(result.data?.installments.map(i=>i.amountDue)).toEqual([0]);
  });
  it('returns the server allocation and installment count after editing a paid enrollment',async()=>{
    const created=await enrollments.createEnrollment(input);
    expect(created.success).toBe(true);
    const id=created.data!.id;
    expect((await payments.recordPayment({enrollmentId:id,amount:100000,paymentMode:'CASH',paymentDate:'2026-10-01'})).success).toBe(true);
    const updated=await enrollments.updateEnrollment(id,{customInstallments:[{number:1,amountDue:360000}]});
    expect(updated.success).toBe(true);
    expect(updated.data).toMatchObject({installmentsCount:1,totalPaid:100000,remainingBalance:260000});
    expect(updated.data?.installments[0]).toMatchObject({amountPaid:100000,status:'PARTIAL'});
  });
});
