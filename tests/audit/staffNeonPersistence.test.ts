import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  rows: [] as Record<string, any>[],
  failWrite: false,
  failRead: false,
}));

vi.mock('../../src/services/common/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'staff_members') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          range: async (start: number, end: number) => database.failRead
            ? { data: null, error: { message: 'Neon indisponible' } }
            : { data: database.rows.slice(start, end + 1), error: null },
        }),
        upsert: (row: Record<string, any>) => ({
          select: () => ({
            single: async () => {
              if (database.failWrite) return { data: null, error: { message: 'Écriture refusée' } };
              const index = database.rows.findIndex((item) => item.id === row.id);
              if (index < 0) database.rows.push({ ...row });
              else database.rows[index] = { ...row };
              return { data: { id: row.id }, error: null };
            },
          }),
        }),
      };
    },
  },
}));

vi.mock('../../src/services/common/realtimeSyncService', () => ({ broadcastDataChange: vi.fn() }));

import { createStaff, listStaff, updateStaff } from '../../src/services/staff/staffService';

beforeEach(() => {
  database.rows = [];
  database.failWrite = false;
  database.failRead = false;
});

describe('personnel conservé dans Neon', () => {
  it('relit tous les champs saisis depuis la ligne distante', async () => {
    const saved = await createStaff({ firstName: 'Awa', lastName: 'Koné', phonePrimary: '0102030405', phoneSecondary: '0607080910', address: 'Abidjan' });
    expect(saved.success).toBe(true);
    expect(database.rows[0].data.phoneSecondary).toBe('0607080910');

    const listed = await listStaff();
    expect(listed.success).toBe(true);
    expect(listed.data?.staffMembers[0]).toMatchObject({ firstName: 'Awa', phoneSecondary: '0607080910', address: 'Abidjan' });
  });

  it('ne confirme ni création ni modification si Neon refuse l’écriture', async () => {
    database.failWrite = true;
    expect((await createStaff({ firstName: 'Awa' })).success).toBe(false);
    expect(database.rows).toHaveLength(0);

    database.failWrite = false;
    const saved = await createStaff({ firstName: 'Awa' });
    database.failWrite = true;
    expect((await updateStaff(saved.data!.id, { address: 'Bouaké' })).success).toBe(false);
    expect(database.rows[0].data.address).not.toBe('Bouaké');
  });

  it('ne remplace pas un échec de lecture par le cache navigateur', async () => {
    await createStaff({ firstName: 'Awa' });
    database.failRead = true;
    expect((await listStaff()).success).toBe(false);
  });

  it('ne fabrique pas de prénom, salaire, ville, genre ou contrat absents', async () => {
    const saved = await createStaff({ lastName: 'Koné' });
    expect(saved.success).toBe(true);
    expect(database.rows[0]).toMatchObject({
      first_name: '',
      last_name: 'Koné',
      base_salary: 0,
      hire_date: null,
    });
    expect(database.rows[0].data).toMatchObject({
      firstName: '',
      lastName: 'Koné',
      baseSalary: 0,
      cityDistrict: '',
    });
    expect(database.rows[0].data.gender).toBeUndefined();
    expect(database.rows[0].data.contractType).toBeUndefined();
  });
});
