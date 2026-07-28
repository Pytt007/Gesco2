import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAcademicYears } from '../../src/hooks/academic/useAcademicYears';
import { useAcademicYear } from '../../src/hooks/academic/useAcademicYear';
import { useSchoolCycles } from '../../src/hooks/academic/useSchoolCycles';
import { useSchoolLevels } from '../../src/hooks/academic/useSchoolLevels';
import { useClassrooms } from '../../src/hooks/academic/useClassrooms';
import { useClassroom } from '../../src/hooks/academic/useClassroom';
import { useStudentAssignments } from '../../src/hooks/academic/useStudentAssignments';
import { useStudentAssignment } from '../../src/hooks/academic/useStudentAssignment';

describe('Academic Module Hooks Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAcademicYears & useAcademicYear', () => {
    it('initializes reactive state, list, current year and CRUD actions', async () => {
      const { result: listHook } = renderHook(() => useAcademicYears());

      await act(async () => {
        await listHook.current.refresh();
      });

      expect(listHook.current.academicYears.length).toBeGreaterThan(0);
      expect(listHook.current.currentAcademicYear).toBeDefined();

      let createOk = false;
      await act(async () => {
        createOk = await listHook.current.create({
          name: '2028-2029',
          startDate: '2028-09-15',
          endDate: '2029-06-30',
        });
      });
      expect(createOk).toBe(true);

      const targetId = listHook.current.academicYears[0].id;

      let updateListOk = false;
      await act(async () => {
        updateListOk = await listHook.current.update(targetId, { name: '2028-2029 Mod' });
      });
      expect(updateListOk).toBe(true);

      let activateListOk = false;
      await act(async () => {
        activateListOk = await listHook.current.activate(targetId);
      });
      expect(activateListOk).toBe(true);

      let archiveListOk = false;
      await act(async () => {
        archiveListOk = await listHook.current.archive(targetId);
      });
      expect(archiveListOk).toBe(true);

      const { result: singleHook } = renderHook(() => useAcademicYear(targetId));

      await act(async () => {
        await singleHook.current.refresh();
      });

      expect(singleHook.current.academicYear).toBeDefined();

      let updateOk = false;
      await act(async () => {
        updateOk = await singleHook.current.update({ name: '2028-2029 Rev' });
      });
      expect(updateOk).toBe(true);

      let activateOk = false;
      await act(async () => {
        activateOk = await singleHook.current.activate();
      });
      expect(activateOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await singleHook.current.archive();
      });
      expect(archiveOk).toBe(true);
    });
  });

  describe('useSchoolCycles & useSchoolLevels', () => {
    it('manages cycles and levels list, search, cycle filtering and CRUD', async () => {
      const { result: cycleHook } = renderHook(() => useSchoolCycles());

      await act(async () => {
        await cycleHook.current.refresh();
      });

      expect(cycleHook.current.cycles.length).toBeGreaterThan(0);

      let createCycOk = false;
      await act(async () => {
        createCycOk = await cycleHook.current.createCycle({ name: 'Supérieur', code: 'SUP', sortOrder: 4 });
      });
      expect(createCycOk).toBe(true);

      const targetCycId = cycleHook.current.cycles[0].id;

      let updateCycOk = false;
      await act(async () => {
        updateCycOk = await cycleHook.current.updateCycle(targetCycId, { name: 'Préscolaire Rev' });
      });
      expect(updateCycOk).toBe(true);

      let archiveCycOk = false;
      await act(async () => {
        archiveCycOk = await cycleHook.current.archiveCycle(targetCycId);
      });
      expect(archiveCycOk).toBe(true);

      const { result: levelHook } = renderHook(() => useSchoolLevels('cyc-1'));

      await act(async () => {
        await levelHook.current.refresh();
      });

      expect(levelHook.current.levels.length).toBeGreaterThan(0);

      act(() => {
        levelHook.current.setSelectedCycleId('cyc-2');
        levelHook.current.setSearchQuery('Section');
      });

      let createLvlOk = false;
      await act(async () => {
        createLvlOk = await levelHook.current.createLevel({
          cycleId: 'cyc-1',
          name: 'Toute Petite Section',
          code: 'TPS',
          shortName: 'TPS',
          sortOrder: 0,
        });
      });
      expect(createLvlOk).toBe(true);

      const targetLvlId = levelHook.current.rawLevels[0].id;

      let updateLvlOk = false;
      await act(async () => {
        updateLvlOk = await levelHook.current.updateLevel(targetLvlId, { name: 'PS Rev' });
      });
      expect(updateLvlOk).toBe(true);

      let archiveLvlOk = false;
      await act(async () => {
        archiveLvlOk = await levelHook.current.archiveLevel(targetLvlId);
      });
      expect(archiveLvlOk).toBe(true);
    });
  });

  describe('useClassrooms & useClassroom', () => {
    it('manages classrooms search, filters, pagination and single classroom details', async () => {
      const { result: classroomsHook } = renderHook(() => useClassrooms());

      await act(async () => {
        await classroomsHook.current.refresh();
      });

      expect(classroomsHook.current.classrooms.length).toBeGreaterThan(0);

      act(() => {
        classroomsHook.current.setSearchQuery('CP1');
        classroomsHook.current.setAcademicYearFilter('ay-2026');
        classroomsHook.current.setLevelFilter('lvl-cp1');
        classroomsHook.current.setPage(1);
        classroomsHook.current.setSortBy('name');
        classroomsHook.current.setSortOrder('desc');
      });

      let createOk = false;
      await act(async () => {
        createOk = await classroomsHook.current.createClassroom({
          academicYearId: 'ay-2026',
          levelId: 'lvl-cp1',
          name: 'CP1 D',
          roomName: 'Salle 104',
          capacity: 35,
        });
      });
      expect(createOk).toBe(true);

      const classId = classroomsHook.current.classrooms[0].id;

      let updateListOk = false;
      await act(async () => {
        updateListOk = await classroomsHook.current.updateClassroom(classId, { capacity: 42 });
      });
      expect(updateListOk).toBe(true);

      let archiveListOk = false;
      await act(async () => {
        archiveListOk = await classroomsHook.current.archiveClassroom(classId);
      });
      expect(archiveListOk).toBe(true);

      let restoreListOk = false;
      await act(async () => {
        restoreListOk = await classroomsHook.current.restoreClassroom(classId);
      });
      expect(restoreListOk).toBe(true);

      const { result: singleClassHook } = renderHook(() => useClassroom(classId));

      await act(async () => {
        await singleClassHook.current.refresh();
      });

      expect(singleClassHook.current.classroom).toBeDefined();

      let updateOk = false;
      await act(async () => {
        updateOk = await singleClassHook.current.update({ capacity: 40 });
      });
      expect(updateOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await singleClassHook.current.archive();
      });
      expect(archiveOk).toBe(true);

      let restoreOk = false;
      await act(async () => {
        restoreOk = await singleClassHook.current.restore();
      });
      expect(restoreOk).toBe(true);
    });
  });

  describe('useStudentAssignments & useStudentAssignment', () => {
    it('manages student class assignments, transfers and single student active assignment', async () => {
      const studentId = 'std-hook-academic-1';
      const yearId = 'ay-2026';
      const classId = 'cls-1';

      const { result: assignmentsHook } = renderHook(() => useStudentAssignments());

      await act(async () => {
        await assignmentsHook.current.refresh();
      });

      act(() => {
        assignmentsHook.current.setClassroomIdFilter(classId);
        assignmentsHook.current.setAcademicYearIdFilter(yearId);
      });

      let assignOk = false;
      await act(async () => {
        assignOk = await assignmentsHook.current.assignStudent(studentId, classId, yearId);
      });
      expect(assignOk).toBe(true);

      let transferListOk = false;
      await act(async () => {
        transferListOk = await assignmentsHook.current.transferStudent(studentId, 'cls-2', yearId);
      });
      expect(transferListOk).toBe(true);

      const { result: singleAssignmentHook } = renderHook(() => useStudentAssignment(studentId, yearId));

      await act(async () => {
        await singleAssignmentHook.current.refresh();
      });

      expect(singleAssignmentHook.current.assignment).toBeDefined();
      const assignmentId = singleAssignmentHook.current.assignment!.id;

      let transferOk = false;
      await act(async () => {
        transferOk = await singleAssignmentHook.current.transfer('cls-1');
      });
      expect(transferOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await assignmentsHook.current.archiveAssignment(assignmentId);
      });
      expect(archiveOk).toBe(true);

      let restoreOk = false;
      await act(async () => {
        restoreOk = await assignmentsHook.current.restoreAssignment(assignmentId);
      });
      expect(restoreOk).toBe(true);
    });
  });
});
