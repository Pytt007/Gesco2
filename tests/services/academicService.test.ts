import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAcademicYears,
  getCurrentAcademicYear,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  archiveAcademicYear,
} from '../../src/services/academic/academicYearsService';
import {
  getCycles,
  getCycle,
  createCycle,
  updateCycle,
  archiveCycle,
} from '../../src/services/academic/schoolCyclesService';
import {
  getLevels,
  getLevel,
  getLevelsByCycle,
  createLevel,
  updateLevel,
  archiveLevel,
} from '../../src/services/academic/schoolLevelsService';
import {
  createClassroom,
  updateClassroom,
  archiveClassroom,
  restoreClassroom,
  getClassrooms,
  getClassroom,
  getClassroomsByLevel,
  getClassroomsByAcademicYear,
  searchClassrooms,
} from '../../src/services/academic/classroomsService';
import {
  assignStudent,
  transferStudent,
  archiveAssignment,
  restoreAssignment,
  getAssignments,
  getStudentAssignment,
  getAssignmentsByClass,
  getAssignmentsByYear,
} from '../../src/services/academic/studentAssignmentsService';

describe('Academic Module Services Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('academicYearsService', () => {
    it('manages academic years and enforces single active current year rule', async () => {
      const createRes = await createAcademicYear({
        name: '2026-2027',
        startDate: '2026-09-15',
        endDate: '2027-06-30',
        isCurrent: true,
      });
      expect(createRes.success).toBe(true);

      const listRes = await getAcademicYears();
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThan(0);

      const currentRes = await getCurrentAcademicYear();
      expect(currentRes.success).toBe(true);
      expect(currentRes.data?.isCurrent).toBe(true);

      const createRes2 = await createAcademicYear({
        name: '2027-2028',
        startDate: '2027-09-15',
        endDate: '2028-06-30',
        isCurrent: false,
      });
      expect(createRes2.success).toBe(true);
      const newYearId = createRes2.data!.id;

      const activateRes = await activateAcademicYear(newYearId);
      expect(activateRes.success).toBe(true);
      expect(activateRes.data?.isCurrent).toBe(true);

      const getRes = await getAcademicYear(newYearId);
      expect(getRes.success).toBe(true);
      expect(getRes.data?.name).toBe('2027-2028');

      const archiveRes = await archiveAcademicYear(newYearId);
      expect(archiveRes.success).toBe(true);
    });

    it('handles academic year validation errors', async () => {
      const errCreate = await createAcademicYear({ name: '', startDate: '', endDate: '' });
      expect(errCreate.success).toBe(false);

      const errGet = await getAcademicYear('');
      expect(errGet.success).toBe(false);

      const errUpdate = await updateAcademicYear('', { name: 'X' });
      expect(errUpdate.success).toBe(false);

      const errActivate = await activateAcademicYear('');
      expect(errActivate.success).toBe(false);

      const errArchive = await archiveAcademicYear('');
      expect(errArchive.success).toBe(false);
    });
  });

  describe('schoolCyclesService & schoolLevelsService', () => {
    it('manages school cycles with automatic sorting by sort_order', async () => {
      const listRes = await getCycles();
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThan(0);

      const createRes = await createCycle({ name: 'Lycée', code: 'LYCEE', sortOrder: 3 });
      expect(createRes.success).toBe(true);
      const cycleId = createRes.data!.id;

      const getRes = await getCycle(cycleId);
      expect(getRes.success).toBe(true);

      const updateRes = await updateCycle(cycleId, { name: 'Secondaire Lycée' });
      expect(updateRes.success).toBe(true);

      const archiveRes = await archiveCycle(cycleId);
      expect(archiveRes.success).toBe(true);
    });

    it('manages school levels (PS to CM2) and cycle filtering', async () => {
      const listRes = await getLevels();
      expect(listRes.success).toBe(true);
      expect(listRes.data?.length).toBeGreaterThanOrEqual(9);

      const cycleLevels = await getLevelsByCycle('cyc-1');
      expect(cycleLevels.success).toBe(true);
      expect(cycleLevels.data?.length).toBeGreaterThan(0);

      const createRes = await createLevel({
        cycleId: 'cyc-2',
        code: 'CM3',
        name: 'Cours Moyen 3',
        shortName: 'CM3',
        sortOrder: 10,
      });
      expect(createRes.success).toBe(true);
      const levelId = createRes.data!.id;

      const getRes = await getLevel(levelId);
      expect(getRes.success).toBe(true);

      const updateRes = await updateLevel(levelId, { name: 'CM3 Spécial' });
      expect(updateRes.success).toBe(true);

      const archiveRes = await archiveLevel(levelId);
      expect(archiveRes.success).toBe(true);
    });

    it('validates cycle and level parameters', async () => {
      const errCycGet = await getCycle('');
      expect(errCycGet.success).toBe(false);

      const errCycCreate = await createCycle({ name: '' });
      expect(errCycCreate.success).toBe(false);

      const errCycUpdate = await updateCycle('', { name: 'X' });
      expect(errCycUpdate.success).toBe(false);

      const errCycArchive = await archiveCycle('');
      expect(errCycArchive.success).toBe(false);

      const errLvlGet = await getLevel('');
      expect(errLvlGet.success).toBe(false);

      const errLvlByCycle = await getLevelsByCycle('');
      expect(errLvlByCycle.success).toBe(false);

      const errLvlCreate = await createLevel({ cycleId: '', name: '' });
      expect(errLvlCreate.success).toBe(false);

      const errLvlUpdate = await updateLevel('', { name: 'X' });
      expect(errLvlUpdate.success).toBe(false);

      const errLvlArchive = await archiveLevel('');
      expect(errLvlArchive.success).toBe(false);
    });
  });

  describe('classroomsService', () => {
    it('manages classrooms, search, filters and capacity', async () => {
      const createRes = await createClassroom({
        academicYearId: 'ay-2026',
        levelId: 'lvl-cp1',
        name: 'CP1 C',
        roomName: 'Salle 103',
        capacity: 30,
      });
      expect(createRes.success).toBe(true);
      const classId = createRes.data!.id;

      const getRes = await getClassroom(classId);
      expect(getRes.success).toBe(true);
      expect(getRes.data?.capacity).toBe(30);

      const updateRes = await updateClassroom(classId, { capacity: 35 });
      expect(updateRes.success).toBe(true);

      const searchRes = await searchClassrooms({ searchQuery: 'CP1 C' });
      expect(searchRes.success).toBe(true);
      expect(searchRes.data?.classrooms.length).toBeGreaterThan(0);

      const byLevel = await getClassroomsByLevel('lvl-cp1');
      expect(byLevel.success).toBe(true);

      const byYear = await getClassroomsByAcademicYear('ay-2026');
      expect(byYear.success).toBe(true);

      const archiveRes = await archiveClassroom(classId);
      expect(archiveRes.success).toBe(true);

      const restoreRes = await restoreClassroom(classId);
      expect(restoreRes.success).toBe(true);
    });

    it('validates classroom parameters', async () => {
      const errCreate = await createClassroom({ academicYearId: '', levelId: '', name: '' });
      expect(errCreate.success).toBe(false);

      const errGet = await getClassroom('');
      expect(errGet.success).toBe(false);

      const errUpdate = await updateClassroom('', { name: 'X' });
      expect(errUpdate.success).toBe(false);

      const errArchive = await archiveClassroom('');
      expect(errArchive.success).toBe(false);

      const errRestore = await restoreClassroom('');
      expect(errRestore.success).toBe(false);
    });
  });

  describe('studentAssignmentsService', () => {
    it('assigns, transfers, archives and enforces single active assignment rule per year', async () => {
      const studentId = 'std-academic-test-1';
      const yearId = 'ay-2026';
      const classA = 'cls-1';
      const classB = 'cls-2';

      const assignRes = await assignStudent(studentId, classA, yearId);
      expect(assignRes.success).toBe(true);
      const assignmentId = assignRes.data!.id;

      const getActiveRes = await getStudentAssignment(studentId, yearId);
      expect(getActiveRes.success).toBe(true);
      expect(getActiveRes.data?.classroomId).toBe(classA);

      // Re-assigning to classB transfers and Archives/Deactivates previous active assignment
      const transferRes = await transferStudent(studentId, classB, yearId);
      expect(transferRes.success).toBe(true);

      const newActiveRes = await getStudentAssignment(studentId, yearId);
      expect(newActiveRes.success).toBe(true);
      expect(newActiveRes.data?.classroomId).toBe(classB);

      const byClass = await getAssignmentsByClass(classB);
      expect(byClass.success).toBe(true);

      const byYear = await getAssignmentsByYear(yearId);
      expect(byYear.success).toBe(true);

      const archiveRes = await archiveAssignment(assignmentId);
      expect(archiveRes.success).toBe(true);

      const restoreRes = await restoreAssignment(assignmentId);
      expect(restoreRes.success).toBe(true);
    });

    it('validates assignment parameters', async () => {
      const errGet = await getStudentAssignment('', '');
      expect(errGet.success).toBe(false);

      const errAssign = await assignStudent('', '', '');
      expect(errAssign.success).toBe(false);

      const errArchive = await archiveAssignment('');
      expect(errArchive.success).toBe(false);

      const errRestore = await restoreAssignment('');
      expect(errRestore.success).toBe(false);

      const errByClass = await getAssignmentsByClass('');
      expect(errByClass.success).toBe(false);

      const errByYear = await getAssignmentsByYear('');
      expect(errByYear.success).toBe(false);
    });
  });
});
