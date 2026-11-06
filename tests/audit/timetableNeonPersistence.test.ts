import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: [] as any[], readError: '', writeError: '' }));

vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'timetable_slots') throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          eq: (column: string, value: string) => ({
            range: (start: number, end: number) => db.readError
              ? Promise.resolve({ data: null, error: { message: db.readError } })
              : Promise.resolve({ data: db.rows.filter((r) => r[column] === value).slice(start, end + 1), error: null }),
            maybeSingle: () => db.readError
              ? Promise.resolve({ data: null, error: { message: db.readError } })
              : Promise.resolve({ data: db.rows.find((r) => r[column] === value) || null, error: null }),
          }),
        }),
        insert: (row: any) => ({ select: () => ({ single: () => {
          if (db.writeError) return Promise.resolve({ data: null, error: { message: db.writeError } });
          db.rows.push(row);
          return Promise.resolve({ data: { id: row.id }, error: null });
        } }) }),
        update: (row: any) => ({ eq: (_column: string, id: string) => ({ select: () => ({ single: () => {
          if (db.writeError) return Promise.resolve({ data: null, error: { message: db.writeError } });
          const index = db.rows.findIndex((r) => r.id === id);
          if (index < 0) return Promise.resolve({ data: null, error: null });
          db.rows[index] = { ...db.rows[index], ...row };
          return Promise.resolve({ data: { id }, error: null });
        } }) }) }),
        delete: () => ({ eq: (_column: string, id: string) => ({ select: () => ({ single: () => {
          if (db.writeError) return Promise.resolve({ data: null, error: { message: db.writeError } });
          const index = db.rows.findIndex((r) => r.id === id);
          if (index < 0) return Promise.resolve({ data: null, error: null });
          db.rows.splice(index, 1);
          return Promise.resolve({ data: { id }, error: null });
        } }) }) }),
      };
    },
  },
}));
vi.mock('../../src/services/academic/classroomsService', () => ({ getClassroom: async () => ({ success: true, data: { name: '6A' } }) }));
vi.mock('../../src/services/staff/staffService', () => ({ listStaff: async () => ({ data: { staffMembers: [] } }) }));
vi.mock('../../src/services/academic/catalog/subjectsService', () => ({ getSubjects: async () => ({ data: [] }) }));

import { clearTimetableStore, timetableService } from '../../src/services/timetable/timetableService';

const input = {
  academicYearId: 'year-real-id', classId: 'class-6a', subjectId: 'math', teacherId: 'teacher-1',
  dayOfWeek: 'LUNDI' as const, startTime: '08:00', endTime: '09:00',
};

describe('Neon timetable persistence', () => {
  beforeEach(() => { db.rows = []; db.readError = ''; db.writeError = ''; clearTimetableStore(); });

  it('reloads a confirmed course after the memory cache is cleared', async () => {
    const created = await timetableService.addSlot(input);
    expect(created.success).toBe(true);
    clearTimetableStore();
    const loaded = await timetableService.getScheduleByClass('class-6a', 'year-real-id');
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ id: created.data?.id, dayOfWeek: 'MONDAY' });
  });

  it('does not report success when Neon rejects the write', async () => {
    db.writeError = 'permission denied';
    const result = await timetableService.addSlot(input);
    expect(result).toMatchObject({ success: false, error: 'permission denied' });
    expect(db.rows).toHaveLength(0);
  });

  it('does not substitute local data after a Neon read failure', async () => {
    expect((await timetableService.addSlot(input)).success).toBe(true);
    db.readError = 'database unavailable';
    await expect(timetableService.getScheduleByClass('class-6a', 'year-real-id')).rejects.toThrow('database unavailable');
  });

  it('confirms edits and deletion in Neon before reporting success', async () => {
    const created = await timetableService.addSlot(input);
    const id = created.data!.id;
    const updated = await timetableService.updateSlot(id, { ...input, startTime: '09:00', endTime: '10:00' });
    expect(updated.success).toBe(true);
    clearTimetableStore();
    expect((await timetableService.getScheduleByClass('class-6a', 'year-real-id'))[0].startTime).toBe('09:00');
    expect((await timetableService.deleteSlot(id)).success).toBe(true);
    clearTimetableStore();
    expect(await timetableService.getScheduleByClass('class-6a', 'year-real-id')).toEqual([]);
  });
});
