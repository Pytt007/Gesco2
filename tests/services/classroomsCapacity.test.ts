import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createClassroom,
  updateClassroom,
  getClassroom,
} from '../../src/services/academic/classroomsService';
import {
  assignStudent,
  transferStudent,
  getStudentAssignment,
} from '../../src/services/academic/studentAssignmentsService';

describe('Classrooms Capacity & Student Transfer Integrity (P2-16)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Classroom Capacity Validation', () => {
    it('rejects zero or negative capacity on classroom creation', async () => {
      const resZero = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cp1',
        name: 'CP1 Invalid Zero',
        capacity: 0,
      });
      expect(resZero.success).toBe(false);
      expect(resZero.error).toContain('capacité de la classe doit être un nombre supérieur à 0');

      const resNeg = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cp1',
        name: 'CP1 Invalid Neg',
        capacity: -10,
      });
      expect(resNeg.success).toBe(false);
      expect(resNeg.error).toContain('capacité de la classe doit être un nombre supérieur à 0');
    });

    it('rejects zero or negative capacity on classroom update', async () => {
      const created = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-ce1',
        name: 'CE1 Test Cap',
        capacity: 25,
      });
      expect(created.success).toBe(true);

      const updateRes = await updateClassroom(created.data!.id, {
        capacity: 0,
      });
      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain('capacité de la classe doit être un nombre supérieur à 0');
    });
  });

  describe('Capacity Enforcement on Assignment & Transfer', () => {
    it('blocks assignStudent when classroom capacity is reached', async () => {
      // Créer une classe avec une capacité de 2
      const clsRes = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-ce2',
        name: 'CE2 Mini Class',
        capacity: 2,
      });
      const clsId = clsRes.data!.id;

      // 1ère affectation
      const a1 = await assignStudent('stu-01', clsId, 'ay-2026');
      expect(a1.success).toBe(true);

      // 2ème affectation (saturation)
      const a2 = await assignStudent('stu-02', clsId, 'ay-2026');
      expect(a2.success).toBe(true);

      // 3ème affectation (surcapacité)
      const a3 = await assignStudent('stu-03', clsId, 'ay-2026');
      expect(a3.success).toBe(false);
      expect(a3.error).toContain('atteint sa capacité maximale (2 élèves)');
    });

    it('preserves source assignment status if transfer fails due to destination class overcapacity', async () => {
      // Classe source (capacité 10)
      const sourceCls = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cm1',
        name: 'CM1 Source',
        capacity: 10,
      });

      // Classe cible (capacité 1)
      const targetCls = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cm1',
        name: 'CM1 Pleine',
        capacity: 1,
      });

      // Remplir la classe cible
      await assignStudent('stu-occupant', targetCls.data!.id, 'ay-2026');

      // Affecter l'élève à la classe source
      await assignStudent('stu-transfer-candidate', sourceCls.data!.id, 'ay-2026');

      // Vérifier que l'élève est bien actif dans la classe source
      const initCheck = await getStudentAssignment('stu-transfer-candidate', 'ay-2026');
      expect(initCheck.data?.classroomId).toBe(sourceCls.data!.id);
      expect(initCheck.data?.status).toBe('Actif');

      // Tenter de transférer vers la classe cible saturée
      const transferRes = await transferStudent('stu-transfer-candidate', targetCls.data!.id, 'ay-2026');
      expect(transferRes.success).toBe(false);
      expect(transferRes.error).toContain('atteint sa capacité maximale');

      // Vérifier que l'élève est TOUJOURS actif dans la classe source
      const afterFailCheck = await getStudentAssignment('stu-transfer-candidate', 'ay-2026');
      expect(afterFailCheck.data?.classroomId).toBe(sourceCls.data!.id);
      expect(afterFailCheck.data?.status).toBe('Actif');
    });

    it('successfully transfers student when destination class has capacity', async () => {
      const srcCls = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cm2',
        name: 'CM2 Alpha',
        capacity: 10,
      });

      const destCls = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cm2',
        name: 'CM2 Beta',
        capacity: 10,
      });

      await assignStudent('stu-valid-transfer', srcCls.data!.id, 'ay-2026');

      const transferRes = await transferStudent('stu-valid-transfer', destCls.data!.id, 'ay-2026');
      expect(transferRes.success).toBe(true);

      const afterTransferCheck = await getStudentAssignment('stu-valid-transfer', 'ay-2026');
      expect(afterTransferCheck.data?.classroomId).toBe(destCls.data!.id);
      expect(afterTransferCheck.data?.status).toBe('Actif');
    });
  });
});
