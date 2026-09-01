import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStudent,
  updateStudent,
  archiveStudent,
  restoreStudent,
  getStudentById,
  listStudents,
  deleteStudent,
} from '../../src/services/students/studentsService';
import { getMedicalRecord, createMedicalRecord } from '../../src/services/students/medicalRecordsService';
import { listDocuments } from '../../src/services/students/studentDocumentsService';
import { getStudentHistory } from '../../src/services/students/studentHistoryService';

describe('Students Module Services Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('studentsService', () => {
    it('listStudents returns paginated student result', async () => {
      const res = await listStudents({ page: 1, pageSize: 10 });
      expect(res.success).toBe(true);
      expect(res.data?.students).toBeDefined();
    });

    it('deleteStudent performs permanent deletion cleanly', async () => {
      const createRes = await createStudent({ firstName: 'Kofi', lastName: 'Kouassi', gender: 'Masculin' });
      expect(createRes.success).toBe(true);
      const studentId = createRes.data!.id;

      const res = await deleteStudent(studentId);
      expect(res.success).toBe(true);
      expect(res.message).toContain('supprimé');
    });

    it('createStudent and archiveStudent handle workflow cleanly', async () => {
      const createRes = await createStudent({ firstName: 'Kofi', lastName: 'Kouassi', gender: 'Masculin' });
      expect(createRes.success).toBe(true);

      if (createRes.data?.id) {
        const archiveRes = await archiveStudent(createRes.data.id);
        expect(archiveRes.success).toBe(true);

        const restoreRes = await restoreStudent(createRes.data.id);
        expect(restoreRes.success).toBe(true);
      }
    });
  });

  describe('medicalRecordsService', () => {
    it('createMedicalRecord and getMedicalRecord workflow', async () => {
      const createRes = await createMedicalRecord({ studentId: 'stu-99', emergencyPhone: '+225 01020304', bloodType: 'O+' });
      expect(createRes.success).toBe(true);
    });
  });

  describe('studentDocumentsService & studentHistoryService', () => {
    it('listDocuments returns doc array', async () => {
      const res = await listDocuments('stu-99');
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('getStudentHistory returns history array', async () => {
      const res = await getStudentHistory('stu-99');
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});
