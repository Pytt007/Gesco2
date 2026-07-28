import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
  getParentById,
  listParents,
  searchParents,
} from '../../src/services/parents/parentsService';
import {
  linkStudent,
  unlinkStudent,
  getChildren,
  getParentsOfStudent,
  setPrimaryParent,
  updateRelationship,
} from '../../src/services/parents/parentRelationshipService';
import {
  getPrimaryEmail,
  getPrimaryPhone,
  getWhatsAppNumber,
  getNotificationRecipients,
} from '../../src/services/parents/parentCommunicationService';

describe('Parents Module Services Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('parentsService CRUD & Search', () => {
    it('createParent creates parent with homogeneous ServiceResponse format', async () => {
      const res = await createParent({
        firstName: 'Paul',
        lastName: 'Kouamé',
        phonePrimary: '+225 0707070707',
        email: 'paul.kouame@example.com',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.firstName).toBe('Paul');
      expect(res.data?.status).toBe('Actif');
    });

    it('createParent rejects missing required fields', async () => {
      const res = await createParent({ firstName: '', lastName: '' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('obligatoire');
    });

    it('updateParent updates existing parent properties', async () => {
      const createRes = await createParent({
        firstName: 'Awa',
        lastName: 'Traoré',
        phonePrimary: '+225 0101010101',
      });
      const parentId = createRes.data!.id;

      const updateRes = await updateParent(parentId, { profession: 'Avocate' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.profession).toBe('Avocate');
    });

    it('archiveParent and restoreParent manage soft delete state', async () => {
      const createRes = await createParent({
        firstName: 'Sékou',
        lastName: 'Koné',
        phonePrimary: '+225 0202020202',
      });
      const parentId = createRes.data!.id;

      const archiveRes = await archiveParent(parentId);
      expect(archiveRes.success).toBe(true);

      const parentRes = await getParentById(parentId);
      expect(parentRes.data?.status).toBe('Archivé');

      const restoreRes = await restoreParent(parentId);
      expect(restoreRes.success).toBe(true);

      const restoredParent = await getParentById(parentId);
      expect(restoredParent.data?.status).toBe('Actif');
    });

    it('listParents and searchParents return paginated results', async () => {
      const res = await listParents({ page: 1, pageSize: 10 });
      expect(res.success).toBe(true);
      expect(res.data?.parents).toBeDefined();
      expect(res.data?.page).toBe(1);

      const searchRes = await searchParents({ searchQuery: 'Kouassi' });
      expect(searchRes.success).toBe(true);
      expect(Array.isArray(searchRes.data?.parents)).toBe(true);
    });
  });

  describe('parentRelationshipService Business Rules', () => {
    it('linkStudent connects parent and student', async () => {
      const parentRes = await createParent({
        firstName: 'Adama',
        lastName: 'Bamba',
        phonePrimary: '+225 0303030303',
      });
      const parentId = parentRes.data!.id;
      const studentId = 'stu-test-1';

      const linkRes = await linkStudent(studentId, parentId, 'Père', true);
      expect(linkRes.success).toBe(true);
      expect(linkRes.data?.isPrimary).toBe(true);
    });

    it('enforces single primary guardian rule per student', async () => {
      const p1 = await createParent({ firstName: 'Parent1', lastName: 'P1', phonePrimary: '+225 11111111' });
      const p2 = await createParent({ firstName: 'Parent2', lastName: 'P2', phonePrimary: '+225 22222222' });
      const studentId = 'stu-test-primary-rule';

      await linkStudent(studentId, p1.data!.id, 'Père', true);
      await linkStudent(studentId, p2.data!.id, 'Mère', true);

      const parentsRes = await getParentsOfStudent(studentId);
      expect(parentsRes.success).toBe(true);

      const primaryParents = parentsRes.data?.filter((p) => p.isPrimary);
      expect(primaryParents?.length).toBe(1);
      expect(primaryParents?.[0].parentId).toBe(p2.data!.id);
    });

    it('allows a parent to be linked to multiple children', async () => {
      const parentRes = await createParent({
        firstName: 'Fatou',
        lastName: 'Sylla',
        phonePrimary: '+225 0404040404',
      });
      const parentId = parentRes.data!.id;

      await linkStudent('stu-child-1', parentId, 'Mère', true);
      await linkStudent('stu-child-2', parentId, 'Mère', false);

      const childrenRes = await getChildren(parentId);
      expect(childrenRes.success).toBe(true);
      expect(childrenRes.data?.length).toBe(2);
    });

    it('unlinkStudent removes relationship link', async () => {
      const parentRes = await createParent({ firstName: 'Unlink', lastName: 'Test', phonePrimary: '+225 9999' });
      const parentId = parentRes.data!.id;
      const studentId = 'stu-unlink-test';

      await linkStudent(studentId, parentId, 'Tuteur Légal');
      const unlinkRes = await unlinkStudent(studentId, parentId);
      expect(unlinkRes.success).toBe(true);
    });
  });

  describe('parentCommunicationService Helpers', () => {
    it('retrieves contact info and notification recipients', async () => {
      const parentRes = await createParent({
        firstName: 'Clarisse',
        lastName: 'Yao',
        phonePrimary: '+225 0505050505',
        whatsapp: '+225 0505050505',
        email: 'clarisse.yao@example.com',
        preferredContactMethod: 'whatsapp',
      });
      const parentId = parentRes.data!.id;
      const studentId = 'stu-comm-test';

      await linkStudent(studentId, parentId, 'Mère', true);

      const emailRes = await getPrimaryEmail(parentId);
      expect(emailRes.data).toBe('clarisse.yao@example.com');

      const phoneRes = await getPrimaryPhone(parentId);
      expect(phoneRes.data).toBe('+225 0505050505');

      const waRes = await getWhatsAppNumber(parentId);
      expect(waRes.data).toBe('+225 0505050505');

      const recipientsRes = await getNotificationRecipients(studentId);
      expect(recipientsRes.success).toBe(true);
      expect(recipientsRes.data?.length).toBeGreaterThan(0);
      expect(recipientsRes.data?.[0].preferredChannel).toBe('whatsapp');
    });
  });
});
