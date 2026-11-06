import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [] as any[],
  failWrite: false,
  from: vi.fn(),
}));

vi.mock('../../src/services/common/supabaseClient', () => ({ supabase: { from: state.from } }));
vi.mock('../../src/services/academic/classroomsService', () => ({ getClassroom: async () => ({ success: true, data: { name: 'CP1 A' } }) }));

import { attendanceService, clearAttendanceStore } from '../../src/services/attendance';

const studentId = 'student-1';
const classId = 'class-1';
const yearId = 'year-1';
const date = '2026-10-01';
const item = { studentId, matricule: 'MAT-1', firstName: 'Awa', lastName: 'Koné', status: 'ABSENT' as const, observation: 'Malade' };

function query(table: string) {
  let result: any;
  let write: any[] | undefined;
  let selectedIds: string[] | undefined;
  let selectedDate: string | undefined;
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: string) => { if (field === 'date') selectedDate = value; return chain; }),
    in: vi.fn((_field: string, ids: string[]) => { selectedIds = ids; return chain; }),
    upsert: vi.fn((rows: any[]) => { write = rows; return chain; }),
    then: (resolve: (value: unknown) => unknown) => {
      if (write) {
        if (state.failWrite) return Promise.resolve({ data: null, error: { message: 'Neon indisponible' } }).then(resolve);
        state.rows = write.map(row => ({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
        result = { data: write.map(row => ({ student_id: row.student_id })), error: null };
      } else if (table === 'student_class_assignments') result = { data: [{ student_id: studentId }], error: null };
      else if (table === 'students') result = { data: [{ id: studentId, matricule: 'MAT-1', data: { firstName: 'Awa', lastName: 'Koné' } }], error: null };
      else result = { data: state.rows.filter(row => (!selectedIds || selectedIds.includes(row.student_id)) && (!selectedDate || selectedDate === row.date)), error: null };
      return Promise.resolve(result).then(resolve);
    },
  };
  return chain;
}

beforeEach(() => {
  state.rows = [];
  state.failWrite = false;
  state.from.mockReset();
  state.from.mockImplementation(query);
  clearAttendanceStore();
});

describe('Présences enregistrées dans Neon', () => {
  it('refuse une feuille incomplète ou une date future', async () => {
    expect((await attendanceService.saveAttendanceSheet({ academicYearId: yearId, classId: '', date, items: [item] })).success).toBe(false);
    expect((await attendanceService.saveAttendanceSheet({ academicYearId: yearId, classId, date: '2099-01-01', items: [item] })).success).toBe(false);
    expect((await attendanceService.saveAttendanceSheet({ academicYearId: yearId, classId, date, items: [] })).success).toBe(false);
  });

  it('ne confirme pas une écriture refusée par Neon', async () => {
    state.failWrite = true;
    const result = await attendanceService.saveAttendanceSheet({ academicYearId: yearId, classId, date, items: [item] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Neon indisponible');
    expect(state.rows).toHaveLength(0);
  });

  it('relit la présence et son historique depuis Neon après effacement de la mémoire locale', async () => {
    const saved = await attendanceService.saveAttendanceSheet({ academicYearId: yearId, classId, date, items: [item] });
    expect(saved.success).toBe(true);
    expect(state.rows).toHaveLength(1);
    clearAttendanceStore();
    const loaded = await attendanceService.getAttendanceSheet(classId, date, yearId);
    expect(loaded.items[0]).toMatchObject({ studentId, status: 'ABSENT', observation: 'Malade' });
    const history = await attendanceService.getAttendanceHistory({ classId, academicYearId: yearId });
    expect(history).toHaveLength(1);
    expect(history[0].items[0].status).toBe('ABSENT');
  });
});
