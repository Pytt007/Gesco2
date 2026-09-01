import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLevels,
  getLevel,
  createLevel,
  updateLevel,
  archiveLevel,
  deleteLevel,
  clearLevelsCache,
} from '../../src/services/academic/schoolLevelsService';
import * as classroomsService from '../../src/services/academic/classroomsService';

describe('School Levels Service & Referential Integrity (P2-22)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearLevelsCache();
  });

  it('retrieves default school levels ordered by sortOrder', async () => {
    const res = await getLevels();
    expect(res.success).toBe(true);
    expect(res.data?.length).toBeGreaterThanOrEqual(10);
    expect(res.data?.[0].code).toBe('GARDERIE');
  });

  it('creates a new level with normalized code and rejects duplicate codes', async () => {
    const created = await createLevel({
      cycleId: 'cyc-2',
      code: 'CM3',
      name: 'Cours Moyen 3',
      shortName: 'CM3',
      sortOrder: 10,
    });

    expect(created.success).toBe(true);
    expect(created.data?.code).toBe('CM3');

    // Tentative de doublon avec le même code
    const duplicate = await createLevel({
      cycleId: 'cyc-2',
      code: 'CM3',
      name: 'Autre Cours Moyen 3',
    });

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('existe déjà');
  });

  it('blocks archiving and deletion if active classrooms are linked to the level', async () => {
    // Mock de getClassrooms avec une classe rattachée au CP1
    vi.spyOn(classroomsService, 'getClassrooms').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'cls-cp1a',
          name: 'CP1 A',
          levelId: 'lvl-cp1',
          levelCode: 'CP1',
          academicYearId: 'ay-2026',
          capacity: 30,
          isActive: true,
        },
      ],
    } as any);

    const archiveRes = await archiveLevel('lvl-cp1');
    expect(archiveRes.success).toBe(false);
    expect(archiveRes.error).toContain('classe(s) active(s) y sont rattachées');

    const deleteRes = await deleteLevel('lvl-cp1');
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('classe(s) y sont rattachées');
  });

  it('allows archiving and deletion when no classrooms are linked to the level', async () => {
    // Créer un niveau isolé
    const customLevel = await createLevel({
      id: 'lvl-isolated',
      cycleId: 'cyc-test',
      code: 'TEST_ISO',
      name: 'Niveau Isolé',
    });
    expect(customLevel.success).toBe(true);

    vi.spyOn(classroomsService, 'getClassrooms').mockResolvedValue({
      success: true,
      data: [],
    } as any);

    const archiveRes = await archiveLevel('lvl-isolated');
    expect(archiveRes.success).toBe(true);

    const deleteRes = await deleteLevel('lvl-isolated');
    expect(deleteRes.success).toBe(true);

    const getRes = await getLevel('lvl-isolated');
    expect(getRes.success).toBe(false);
  });
});
