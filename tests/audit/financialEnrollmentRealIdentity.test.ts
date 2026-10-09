import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ student: true, classroom: true, writes: 0, saved: null as any }));
vi.mock('../../src/services/common/supabaseClient', () => ({ supabase: {
  from: () => ({ select: () => {
    const query: any = { eq: () => query, then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve) };
    return query;
  } }),
  rpc: async (_name: string, args: any) => { state.writes++; state.saved = args.p_data; return { data: args.p_data, error: null }; },
} }));
vi.mock('../../src/services/academic/classroomsService', () => ({
  getClassroom: async () => state.classroom
    ? { success: true, data: { name: 'CM1 A', levelCode: 'CM1' } }
    : { success: false, error: 'Classe absente' },
}));
vi.mock('../../src/services/students/studentsService', () => ({
  getStudentById: async () => state.student
    ? { success: true, data: { firstName: 'Awa', lastName: 'Traoré', matricule: 'G-001' } }
    : { success: false, error: 'Élève absent' },
}));
vi.mock('../../src/services/finance/tuitionFeesService', () => ({
  tuitionFeesService: { getSchedulesByYear: async () => [{ levelCode: 'CM1', registrationFee: 10000, tuitionFee: 90000 }] },
}));

import { studentFinancialEnrollmentService } from '../../src/services/finance/studentFinancialEnrollmentService';

const input = { studentId: 'student-1', academicYearId: 'year-1', classroomId: 'class-1', discountType: 'NONE' as const, discountValue: 0 };

describe('Financial enrollment identity', () => {
  beforeEach(() => { state.student = true; state.classroom = true; state.writes = 0; state.saved = null; });

  it('saves the actual student, matricule and class', async () => {
    const result = await studentFinancialEnrollmentService.createEnrollment(input);
    expect(result.success).toBe(true);
    expect(state.writes).toBe(1);
    expect(state.saved).toMatchObject({ studentName: 'Traoré Awa', matricule: 'G-001', className: 'CM1 A', levelCode: 'CM1' });
  });

  it('refuses to create a dossier when the student or class cannot be read', async () => {
    state.classroom = false;
    expect((await studentFinancialEnrollmentService.createEnrollment(input)).success).toBe(false);
    state.classroom = true;
    state.student = false;
    expect((await studentFinancialEnrollmentService.createEnrollment(input)).success).toBe(false);
    expect(state.writes).toBe(0);
  });
});
