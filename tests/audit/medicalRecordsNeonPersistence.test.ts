import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: [] as any[], error: '' }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'medical_records') throw new Error(`Unexpected table ${table}`);
      return {
        select: () => {
          const query: any = {
            key: '', value: '',
            eq(key: string, value: string) { query.key = key; query.value = value; return query; },
            async maybeSingle() { return db.error ? { data: null, error: { message: db.error } } : { data: db.rows.find((r) => r[query.key] === query.value) || null, error: null }; },
          };
          return query;
        },
        insert: (row: any) => ({ select: () => ({ async single() {
          if (db.error) return { data: null, error: { message: db.error } };
          db.rows.push(row);
          return { data: { id: row.id }, error: null };
        } }) }),
        update: (changes: any) => ({ eq: (key: string, value: string) => ({ select: () => ({ async single() {
          if (db.error) return { data: null, error: { message: db.error } };
          const row = db.rows.find((r) => r[key] === value);
          if (!row) return { data: null, error: { message: 'not found' } };
          Object.assign(row, changes);
          return { data: { id: row.id }, error: null };
        } }) }) }),
      };
    },
  },
}));

import { clearMedicalRecordsCache, createMedicalRecord, getMedicalRecord, updateMedicalRecord } from '../../src/services/students/medicalRecordsService';

describe('Neon medical records', () => {
  beforeEach(() => { db.rows = []; db.error = ''; clearMedicalRecordsCache(); });

  it('keeps medical details after memory is cleared and preserves unchanged fields on update', async () => {
    const created = await createMedicalRecord({ studentId: 'student-1', emergencyPhone: '0701020304', allergies: 'arachides', notes: 'Suivi médical' });
    expect(created.success).toBe(true);
    expect(db.rows[0]).toMatchObject({ emergency_contact: '0701020304', data: { notes: 'Suivi médical' } });
    clearMedicalRecordsCache();
    expect((await getMedicalRecord('student-1')).data?.notes).toBe('Suivi médical');
    expect((await updateMedicalRecord(created.data!.id!, { treatments: 'Traitement A' })).success).toBe(true);
    clearMedicalRecordsCache();
    expect((await getMedicalRecord('student-1')).data).toMatchObject({ allergies: 'arachides', treatments: 'Traitement A', notes: 'Suivi médical' });
  });

  it('never reports success when Neon rejects a write or read', async () => {
    db.error = 'permission denied';
    expect((await createMedicalRecord({ studentId: 'student-1', emergencyPhone: '0701020304' })).success).toBe(false);
    expect((await getMedicalRecord('student-1')).success).toBe(false);
    expect(db.rows).toHaveLength(0);
  });
});
