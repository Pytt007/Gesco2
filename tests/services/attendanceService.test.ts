import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attendanceService, clearAttendanceStore } from '../../src/services/attendance';

describe('Attendance Service & Validation Layer (P2-13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAttendanceStore();
  });

  describe('saveAttendanceSheet validation', () => {
    it('rejects missing classId or date', async () => {
      const res = await attendanceService.saveAttendanceSheet({
        academicYearId: 'ay-2026',
        classId: '',
        date: '2026-03-01',
        items: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Classe et date obligatoires');
    });

    it('rejects invalid date formats', async () => {
      const res = await attendanceService.saveAttendanceSheet({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        date: '01-03-2026',
        items: [{ studentId: 'st-1', matricule: 'M-01', firstName: 'Jean', lastName: 'Koffi', status: 'PRESENT' }],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Format de date invalide');
    });

    it('rejects future dates beyond today', async () => {
      const res = await attendanceService.saveAttendanceSheet({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        date: '2099-12-31',
        items: [{ studentId: 'st-1', matricule: 'M-01', firstName: 'Jean', lastName: 'Koffi', status: 'PRESENT' }],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('date future');
    });

    it('rejects empty items list', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await attendanceService.saveAttendanceSheet({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        date: todayStr,
        items: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('au moins un élève');
    });

    it('successfully saves and updates an attendance sheet for valid dates', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const items = [
        { studentId: 'st-1', matricule: 'M-01', firstName: 'Jean', lastName: 'Koffi', status: 'PRESENT' as const },
        { studentId: 'st-2', matricule: 'M-02', firstName: 'Marie', lastName: 'Amani', status: 'ABSENT' as const },
        { studentId: 'st-3', matricule: 'M-03', firstName: 'Paul', lastName: 'Yao', status: 'ABSENT_JUSTIFIED' as const, observation: 'Certificat médical' },
      ];

      const saveRes = await attendanceService.saveAttendanceSheet({
        academicYearId: 'ay-2026',
        classId: 'cls-6a',
        date: todayStr,
        items,
        createdBy: 'Professeur Titulaire',
      });

      expect(saveRes.success).toBe(true);
      expect(saveRes.data?.items.length).toBe(3);

      const history = await attendanceService.getAttendanceHistory({ classId: 'cls-6a', date: todayStr });
      expect(history.length).toBe(1);
      expect(history[0].items[1].status).toBe('ABSENT');
    });
  });

  describe('calculateStats', () => {
    it('calculates stats and presence rate accurately using stats calculation service', () => {
      const items = [
        { studentId: 'st-1', matricule: 'M-01', firstName: 'A', lastName: 'A', status: 'PRESENT' as const },
        { studentId: 'st-2', matricule: 'M-02', firstName: 'B', lastName: 'B', status: 'PRESENT' as const },
        { studentId: 'st-3', matricule: 'M-03', firstName: 'C', lastName: 'C', status: 'ABSENT' as const },
        { studentId: 'st-4', matricule: 'M-04', firstName: 'D', lastName: 'D', status: 'ABSENT_JUSTIFIED' as const },
      ];

      const stats = attendanceService.calculateStats(items);
      expect(stats.totalStudents).toBe(4);
      expect(stats.presentCount).toBe(2);
      expect(stats.absentCount).toBe(1);
      expect(stats.justifiedCount).toBe(1);
      expect(stats.presenceRate).toBe(50);
    });

    it('handles empty items list safely without division by zero', () => {
      const stats = attendanceService.calculateStats([]);
      expect(stats.totalStudents).toBe(0);
      expect(stats.presentCount).toBe(0);
      expect(stats.presenceRate).toBe(0);
    });
  });
});
