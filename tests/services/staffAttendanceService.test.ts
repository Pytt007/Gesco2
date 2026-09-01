import { describe, it, expect, beforeEach, vi } from 'vitest';
import { staffAttendanceService, clearStaffAttendanceStore } from '../../src/services/staffAttendance';

describe('Staff Attendance Service & Validation Layer (P2-19)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearStaffAttendanceStore();
  });

  describe('saveStaffAttendanceSheet validation', () => {
    it('rejects missing date', async () => {
      const res = await staffAttendanceService.saveStaffAttendanceSheet({
        academicYearId: 'ay-2026',
        date: '',
        items: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('La date est obligatoire');
    });

    it('rejects invalid date formats', async () => {
      const res = await staffAttendanceService.saveStaffAttendanceSheet({
        academicYearId: 'ay-2026',
        date: '01/03/2026',
        items: [{ staffId: 'stf-01', matricule: 'EMP-01', firstName: 'Jean', lastName: 'Koffi', role: 'Enseignant', phone: '07070707', status: 'PRESENT' }],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Format de date invalide');
    });

    it('rejects future dates', async () => {
      const res = await staffAttendanceService.saveStaffAttendanceSheet({
        academicYearId: 'ay-2026',
        date: '2099-01-01',
        items: [{ staffId: 'stf-01', matricule: 'EMP-01', firstName: 'Jean', lastName: 'Koffi', role: 'Enseignant', phone: '07070707', status: 'PRESENT' }],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('date future');
    });

    it('rejects empty staff list', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await staffAttendanceService.saveStaffAttendanceSheet({
        academicYearId: 'ay-2026',
        date: todayStr,
        items: [],
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('au moins un employé');
    });

    it('successfully saves staff attendance sheet for valid dates and records arrival time for late staff', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const items = [
        { staffId: 'stf-01', matricule: 'EMP-01', firstName: 'Paul', lastName: 'Kouassi', role: 'Enseignant', phone: '01010101', status: 'PRESENT' as const },
        { staffId: 'stf-02', matricule: 'EMP-02', firstName: 'Marie', lastName: 'N\'Guessan', role: 'Comptable', phone: '02020202', status: 'LATE' as const, arrivalTime: '08:25' },
        { staffId: 'stf-03', matricule: 'EMP-03', firstName: 'Marc', lastName: 'Yao', role: 'Chauffeur', phone: '03030303', status: 'ON_LEAVE' as const, observation: 'Congé annuel' },
        { staffId: 'stf-04', matricule: 'EMP-04', firstName: 'Claire', lastName: 'Bamba', role: 'Secrétaire', phone: '04040404', status: 'ABSENT' as const },
        { staffId: 'stf-05', matricule: 'EMP-05', firstName: 'David', lastName: 'Konan', role: 'Agent', phone: '05050505', status: 'SICK_LEAVE' as const, observation: 'Arrêt maladie' },
      ];

      const saveRes = await staffAttendanceService.saveStaffAttendanceSheet({
        academicYearId: 'ay-2026',
        date: todayStr,
        items,
        createdBy: 'Direction RH',
      });

      expect(saveRes.success).toBe(true);
      expect(saveRes.data?.items.length).toBe(5);

      const history = await staffAttendanceService.getStaffAttendanceHistory({ date: todayStr });
      expect(history.length).toBe(1);
      expect(history[0].items[1].arrivalTime).toBe('08:25');
    });
  });

  describe('calculateStats', () => {
    it('calculates all 6 KPIs and presence rate accurately', () => {
      const items = [
        { staffId: 'stf-01', matricule: 'EMP-01', firstName: 'A', lastName: 'A', role: 'R', phone: 'P', status: 'PRESENT' as const },
        { staffId: 'stf-02', matricule: 'EMP-02', firstName: 'B', lastName: 'B', role: 'R', phone: 'P', status: 'LATE' as const },
        { staffId: 'stf-03', matricule: 'EMP-03', firstName: 'C', lastName: 'C', role: 'R', phone: 'P', status: 'ON_LEAVE' as const },
        { staffId: 'stf-04', matricule: 'EMP-04', firstName: 'D', lastName: 'D', role: 'R', phone: 'P', status: 'ABSENT' as const },
        { staffId: 'stf-05', matricule: 'EMP-05', firstName: 'E', lastName: 'E', role: 'R', phone: 'P', status: 'SICK_LEAVE' as const },
      ];

      const stats = staffAttendanceService.calculateStats(items);
      expect(stats.totalStaff).toBe(5);
      expect(stats.presentCount).toBe(1);
      expect(stats.lateCount).toBe(1);
      expect(stats.leaveCount).toBe(1);
      expect(stats.absentCount).toBe(1);
      expect(stats.sickCount).toBe(1);
      // Présents + Retards = 2 / 5 = 40%
      expect(stats.presenceRate).toBe(40);
    });

    it('handles empty staff list safely without division by zero', () => {
      const stats = staffAttendanceService.calculateStats([]);
      expect(stats.totalStaff).toBe(0);
      expect(stats.presenceRate).toBe(0);
    });
  });
});
