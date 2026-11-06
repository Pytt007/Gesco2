import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rows: { student_documents: [] as any[], staff_documents: [] as any[], staff_contracts: [] as any[] },
  error: '',
}));

vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (name: keyof typeof db.rows) => {
      const rows = db.rows[name];
      return {
        select: () => {
          const predicates: Array<[string, any]> = [];
          const selected: any = {
            eq(key: string, value: any) { predicates.push([key, value]); return selected; },
            order() { return Promise.resolve({ data: rows.filter((r) => predicates.every(([k, v]) => r[k] === v)), error: db.error ? { message: db.error } : null }); },
            maybeSingle: async () => ({ data: rows.find((r) => predicates.every(([k, v]) => r[k] === v)) || null, error: db.error ? { message: db.error } : null }),
            then(resolve: any) { return Promise.resolve({ data: rows.filter((r) => predicates.every(([k, v]) => r[k] === v)), error: db.error ? { message: db.error } : null }).then(resolve); },
          };
          return selected;
        },
        insert: (row: any) => ({ select: () => ({ single: async () => {
          if (db.error) return { data: null, error: { message: db.error } };
          rows.push(name === 'staff_documents' ? { is_deleted: false, ...row } : row);
          return { data: { id: row.id }, error: null };
        } }) }),
        update: (changes: any) => ({ eq: (key: string, value: string) => ({ select: () => ({ single: async () => {
          if (db.error) return { data: null, error: { message: db.error } };
          const row = rows.find((r) => r[key] === value);
          if (!row) return { data: null, error: { message: 'not found' } };
          Object.assign(row, changes);
          return { data: { id: row.id }, error: null };
        } }) }) }),
      };
    },
  },
}));

import * as studentDocs from '../../src/services/students/studentDocumentsService';
import * as staffDocs from '../../src/services/staff/staffDocumentsService';
import { createContract, getContractHistory, updateContract } from '../../src/services/staff/staffContractsService';

describe('Neon document metadata and contracts', () => {
  beforeEach(() => { db.rows.student_documents = []; db.rows.staff_documents = []; db.rows.staff_contracts = []; db.error = ''; });

  it('keeps student and staff document metadata in the database', async () => {
    const student = await studentDocs.uploadDocument({ studentId: 'student-1', docName: 'Acte', docType: 'Extrait de Naissance', storagePath: 'https://files.example/acte.pdf' });
    const staff = await staffDocs.uploadDocument({ staffId: 'staff-1', docName: 'CV', docType: 'CV', storagePath: 'https://files.example/cv.pdf' });
    expect(student.success && staff.success).toBe(true);
    expect((await studentDocs.listDocuments('student-1')).data?.[0].docName).toBe('Acte');
    expect((await staffDocs.listDocuments('staff-1')).data?.[0].docName).toBe('CV');
    expect((await studentDocs.deleteDocument(student.data!.id!)).success).toBe(true);
    expect((await staffDocs.deleteDocument(staff.data!.id!)).success).toBe(true);
    expect((await studentDocs.listDocuments('student-1')).data).toHaveLength(0);
    expect((await staffDocs.listDocuments('staff-1')).data).toHaveLength(0);
  });

  it('reloads a contract and never invents an employee or salary on update', async () => {
    const created = await createContract({ staffId: 'staff-1', startDate: '2026-09-14', baseSalary: 200000 });
    expect(created.success).toBe(true);
    expect(db.rows.staff_contracts[0]).toMatchObject({ staff_id: 'staff-1', salary: 200000 });
    const updated = await updateContract(created.data!.id, { baseSalary: 210000 });
    expect(updated.data).toMatchObject({ staffId: 'staff-1', baseSalary: 210000 });
    expect((await getContractHistory('staff-1')).data?.[0].baseSalary).toBe(210000);
  });

  it('rejects failed writes instead of returning a local success', async () => {
    db.error = 'permission denied';
    expect((await studentDocs.uploadDocument({ studentId: 's', docName: 'Acte', docType: 'Extrait de Naissance', storagePath: 'url' })).success).toBe(false);
    expect((await staffDocs.uploadDocument({ staffId: 's', docName: 'CV', docType: 'CV', storagePath: 'url' })).success).toBe(false);
    expect((await createContract({ staffId: 's', startDate: '2026-09-14' })).success).toBe(false);
  });
});
