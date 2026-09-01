import { describe, it, expect, beforeEach, vi } from 'vitest';
import { timetableService, clearTimetableStore } from '../../src/services/timetable';

describe('Timetable Service & Conflict Detection (P2-11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearTimetableStore();
  });

  describe('addSlot', () => {
    it('successfully adds a valid schedule slot', async () => {
      const res = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        room: 'Salle 101',
        dayOfWeek: 'LUNDI',
        startTime: '08:00',
        endTime: '10:00',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.room).toBe('Salle 101');
      expect(res.data?.dayOfWeek).toBe('MONDAY');
    });

    it('rejects invalid time ranges (end before start or out of operating hours)', async () => {
      const inv1 = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '08:00',
      });
      expect(inv1.success).toBe(false);
      expect(inv1.error).toContain('postérieure');

      const inv2 = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '05:00',
        endTime: '07:00',
      });
      expect(inv2.success).toBe(false);
      expect(inv2.error).toContain('06h00 et 22h00');
    });

    it('detects and blocks Class conflicts on overlapping time slots', async () => {
      await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '10:00',
      });

      const conflict = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-francais',
        teacherId: 'tch-02',
        dayOfWeek: 'LUNDI',
        startTime: '09:00',
        endTime: '11:00',
      });

      expect(conflict.success).toBe(false);
      expect(conflict.error).toContain('Conflit de classe');
    });

    it('detects and blocks Teacher conflicts across different classes', async () => {
      await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MARDI',
        startTime: '08:00',
        endTime: '10:00',
      });

      const conflict = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6b',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MARDI',
        startTime: '09:00',
        endTime: '11:00',
      });

      expect(conflict.success).toBe(false);
      expect(conflict.error).toContain("Conflit d'enseignant");
    });

    it('detects and blocks Room conflicts across different classes and teachers', async () => {
      await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        room: 'Labo Info',
        dayOfWeek: 'MERCREDI',
        startTime: '14:00',
        endTime: '16:00',
      });

      const conflict = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-5a',
        subjectId: 'sub-physique',
        teacherId: 'tch-02',
        room: 'labo info', // Case-insensitive match
        dayOfWeek: 'MERCREDI',
        startTime: '15:00',
        endTime: '17:00',
      });

      expect(conflict.success).toBe(false);
      expect(conflict.error).toContain('Conflit de salle');
      expect(conflict.error?.toLowerCase()).toContain('labo info');
    });
  });

  describe('updateSlot', () => {
    it('updates a slot without creating false self-conflict', async () => {
      const added = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        room: 'Salle 101',
        dayOfWeek: 'JEUDI',
        startTime: '08:00',
        endTime: '10:00',
      });

      const updated = await timetableService.updateSlot(added.data!.id, {
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        room: 'Salle 102',
        dayOfWeek: 'JEUDI',
        startTime: '08:00',
        endTime: '10:00',
      });

      expect(updated.success).toBe(true);
      expect(updated.data?.room).toBe('Salle 102');
    });

    it('detects room conflict on update', async () => {
      await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6b',
        subjectId: 'sub-anglais',
        teacherId: 'tch-02',
        room: 'Salle 201',
        dayOfWeek: 'VENDREDI',
        startTime: '10:00',
        endTime: '12:00',
      });

      const slot2 = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-histoire',
        teacherId: 'tch-03',
        room: 'Salle 101',
        dayOfWeek: 'VENDREDI',
        startTime: '10:00',
        endTime: '12:00',
      });

      const updateConflict = await timetableService.updateSlot(slot2.data!.id, {
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-histoire',
        teacherId: 'tch-03',
        room: 'Salle 201',
        dayOfWeek: 'VENDREDI',
        startTime: '10:00',
        endTime: '12:00',
      });

      expect(updateConflict.success).toBe(false);
      expect(updateConflict.error).toContain('Conflit de salle');
    });

    it('rejects missing required fields, invalid time formats and excessive/too short durations', async () => {
      // 1. Champs obligatoires
      const resMissing = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: '',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '10:00',
      });
      expect(resMissing.success).toBe(false);
      expect(resMissing.error).toContain('champs obligatoires');

      // 2. Format d'heure invalide
      const resBadFormat = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '8:00',
        endTime: '10:00',
      });
      expect(resBadFormat.success).toBe(false);
      expect(resBadFormat.error).toContain('Format d\'heure invalide');

      // 3. Durée trop courte (< 15 min)
      const resTooShort = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '08:10',
      });
      expect(resTooShort.success).toBe(false);
      expect(resTooShort.error).toContain('durée minimale');

      // 4. Durée excessive (> 4 heures)
      const resTooLong = await timetableService.addSlot({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        subjectId: 'sub-math',
        teacherId: 'tch-01',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '13:00',
      });
      expect(resTooLong.success).toBe(false);
      expect(resTooLong.error).toContain('durée maximale');
    });
  });
});
