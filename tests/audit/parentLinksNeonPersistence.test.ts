import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ links: [] as any[], events: [] as any[], error: '' }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'student_parent_links') {
        return {
          select: () => {
            let predicates: Array<[string, string]> = [];
            const query: any = {
              eq(key: string, value: string) { predicates.push([key, value]); return query; },
              range(start: number, end: number) {
                if (db.error) return Promise.resolve({ data: null, error: { message: db.error } });
                return Promise.resolve({ data: db.links.filter((r) => predicates.every(([k, v]) => r[k] === v)).slice(start, end + 1), error: null });
              },
              maybeSingle() { return Promise.resolve({ data: db.links.find((r) => predicates.every(([k, v]) => r[k] === v)) || null, error: null }); },
            };
            return query;
          },
          upsert: (rows: any[]) => ({ select: async () => {
            if (db.error) return { data: null, error: { message: db.error } };
            for (const row of rows) {
              const old = db.links.findIndex((r) => r.id === row.id);
              if (old >= 0) db.links[old] = row; else db.links.push(row);
            }
            return { data: rows.map((r) => ({ id: r.id })), error: null };
          } }),
        };
      }
      if (table === 'parent_link_events') return {
        select: () => ({ order: () => ({ range: async () => ({ data: db.events, error: null }) }) }),
      };
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));
vi.mock('../../src/services/parents/parentsService', () => ({ getParentById: async (id: string) => ({ success: true, data: { id, firstName: 'A', lastName: 'B' } }) }));
vi.mock('../../src/services/students/studentsService', () => ({ getStudentById: async () => ({ success: true, data: { firstName: 'Élève', lastName: 'Test' } }) }));

import { clearRelationshipsStore, getParentsOfStudent, linkStudent, setPayerParent } from '../../src/services/parents/parentRelationshipService';

describe('Neon parent–student links', () => {
  beforeEach(() => { db.links = []; db.events = []; db.error = ''; clearRelationshipsStore(); });

  it('reloads family links after clearing memory and keeps one payer', async () => {
    expect((await linkStudent('student-1', 'parent-1', 'Père')).success).toBe(true);
    expect((await linkStudent('student-1', 'parent-2', 'Mère')).success).toBe(true);
    clearRelationshipsStore();
    expect((await getParentsOfStudent('student-1')).data).toHaveLength(2);
    expect((await setPayerParent('student-1', 'parent-2')).success).toBe(true);
    clearRelationshipsStore();
    const parents = (await getParentsOfStudent('student-1')).data || [];
    expect(parents.filter((p) => p.isPayer).map((p) => p.parentId)).toEqual(['parent-2']);
  });

  it('does not claim a link was saved after Neon refuses it', async () => {
    db.error = 'permission denied';
    const result = await linkStudent('student-1', 'parent-1');
    expect(result).toMatchObject({ success: false, error: 'permission denied' });
    expect(db.links).toHaveLength(0);
  });
});
