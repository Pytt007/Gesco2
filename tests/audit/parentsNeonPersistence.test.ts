import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ parents: [] as any[], writeError: '' }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'parents') return {
        select: () => ({
          range: async (start: number, end: number) => ({ data: db.parents.slice(start, end + 1), error: null }),
          eq: (_key: string, id: string) => ({ maybeSingle: async () => ({ data: db.parents.find((r) => r.id === id) || null, error: null }) }),
        }),
        insert: (row: any) => ({ select: () => ({ single: async () => {
          if (db.writeError) return { data: null, error: { message: db.writeError } };
          db.parents.push(row);
          return { data: { id: row.id }, error: null };
        } }) }),
        upsert: (row: any) => ({ select: () => ({ single: async () => {
          if (db.writeError) return { data: null, error: { message: db.writeError } };
          const index = db.parents.findIndex((r) => r.id === row.id);
          if (index >= 0) db.parents[index] = row; else db.parents.push(row);
          return { data: { id: row.id }, error: null };
        } }) }),
      };
      if (table === 'student_parent_links') return {
        select: () => ({ range: async () => ({ data: [], error: null }) }),
      };
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));
vi.mock('../../src/services/common/realtimeSyncService', () => ({ broadcastDataChange: () => {} }));

import { clearParentsStore, createParent, getParentById, listParents, updateParent } from '../../src/services/parents/parentsService';

describe('Neon parent records', () => {
  beforeEach(() => { db.parents = []; db.writeError = ''; clearParentsStore(); });

  it('reloads complete contact information after clearing memory', async () => {
    const created = await createParent({ firstName: 'Awa', lastName: 'Test', phonePrimary: '0701020304', whatsapp: '0701020304', city: 'Bouaké' });
    expect(created.success).toBe(true);
    clearParentsStore();
    const listed = await listParents();
    expect(listed.data?.parents[0]).toMatchObject({ city: 'Bouaké', whatsapp: '0701020304', phonePrimary: '0701020304' });
    expect((await getParentById(created.data!.id)).data?.city).toBe('Bouaké');
    const updated = await updateParent(created.data!.id, { status: 'Archivé' });
    expect(updated.success).toBe(true);
    clearParentsStore();
    expect((await getParentById(created.data!.id)).data?.status).toBe('Archivé');
  });

  it('does not claim success after Neon rejects a parent write', async () => {
    db.writeError = 'permission denied';
    const result = await createParent({ firstName: 'Awa', lastName: 'Test', phonePrimary: '0701020304' });
    expect(result).toMatchObject({ success: false, error: 'permission denied' });
    expect(db.parents).toHaveLength(0);
  });
});
