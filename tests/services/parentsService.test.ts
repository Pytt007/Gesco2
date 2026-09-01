import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
  getParentById,
  listParents,
  searchParents,
  isValidPhoneNumber,
  normalizePhoneNumber,
  clearParentsStore,
} from '../../src/services/parents/parentsService';
import {
  linkStudent,
  unlinkStudent,
  getChildren,
  getParentsOfStudent,
  setPrimaryParent,
  setPayerParent,
  updateRelationship,
  clearRelationshipsStore,
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
    clearParentsStore();
    clearRelationshipsStore();
  });

  describe('Phone Validation & Normalization (P2-05)', () => {
    it('validates 10-digit Ivorian phone numbers and standard international numbers', () => {
      expect(isValidPhoneNumber('0701020304')).toBe(true);
      expect(isValidPhoneNumber('01 02 03 04 05')).toBe(true);
      expect(isValidPhoneNumber('+225 07 01 02 03 04')).toBe(true);
      expect(isValidPhoneNumber('+33 6 12 34 56 78')).toBe(true);

      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('12345')).toBe(false); // Too short
      expect(isValidPhoneNumber('0701ABC0304')).toBe(false); // Letters
    });

    it('normalizes local 10-digit and international phone numbers', () => {
      expect(normalizePhoneNumber('07 01 02 03 04')).toBe('+2250701020304');
      expect(normalizePhoneNumber('+225 07-01-02-03-04')).toBe('+2250701020304');
      expect(normalizePhoneNumber('00225 07 01 02 03 04')).toBe('+2250701020304');
    });

    it('detects duplicate phone numbers across different formatting', async () => {
      const p1 = await createParent({
        firstName: 'Michel',
        lastName: 'Gomez',
        phonePrimary: '+225 07 01 02 03 04',
      });
      expect(p1.success).toBe(true);

      const p2 = await createParent({
        firstName: 'Mireille',
        lastName: 'Gomez',
        phonePrimary: '07 01 02 03 04',
      });
      expect(p2.success).toBe(false);
      expect(p2.error).toContain('existe déjà');
    });
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
      await createParent({ firstName: 'Jean', lastName: 'Kouassi', phonePrimary: '+225 0708091011' });
      const res = await listParents({ page: 1, pageSize: 10 });
      expect(res.success).toBe(true);
      expect(res.data?.parents).toBeDefined();
      expect(res.data?.page).toBe(1);

      const searchRes = await searchParents({ searchQuery: 'Kouassi' });
      expect(searchRes.success).toBe(true);
      expect(Array.isArray(searchRes.data?.parents)).toBe(true);
    });
  });

  describe('parentRelationshipService Business Rules (P2-05)', () => {
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

    it('prevents duplicate relationship link between same student and parent', async () => {
      const parentRes = await createParent({
        firstName: 'Nathalie',
        lastName: 'Brou',
        phonePrimary: '+225 0808080808',
      });
      const parentId = parentRes.data!.id;
      const studentId = 'stu-dup-link';

      const link1 = await linkStudent(studentId, parentId, 'Mère', true);
      expect(link1.success).toBe(true);

      const link2 = await linkStudent(studentId, parentId, 'Mère', false);
      expect(link2.success).toBe(false);
      expect(link2.error).toContain('déjà lié');
    });

    it('enforces single primary guardian rule per student', async () => {
      const p1 = await createParent({ firstName: 'Parent1', lastName: 'P1', phonePrimary: '+225 0101111111' });
      const p2 = await createParent({ firstName: 'Parent2', lastName: 'P2', phonePrimary: '+225 0202222222' });
      const studentId = 'stu-test-primary-rule';

      await linkStudent(studentId, p1.data!.id, 'Père', true);
      await linkStudent(studentId, p2.data!.id, 'Mère', true);

      const parentsRes = await getParentsOfStudent(studentId);
      expect(parentsRes.success).toBe(true);

      const primaryParents = parentsRes.data?.filter((p) => p.isPrimary);
      expect(primaryParents?.length).toBe(1);
      expect(primaryParents?.[0].parentId).toBe(p2.data!.id);
    });

    it('enforces single payer guardian rule per student', async () => {
      const p1 = await createParent({ firstName: 'Pay1', lastName: 'P1', phonePrimary: '+225 0505111111' });
      const p2 = await createParent({ firstName: 'Pay2', lastName: 'P2', phonePrimary: '+225 0606222222' });
      const studentId = 'stu-test-payer-rule';

      await linkStudent(studentId, p1.data!.id, 'Père', false, true);
      await linkStudent(studentId, p2.data!.id, 'Mère', false, true);

      const parentsRes = await getParentsOfStudent(studentId);
      expect(parentsRes.success).toBe(true);

      const payerParents = parentsRes.data?.filter((p) => p.isPayer);
      expect(payerParents?.length).toBe(1);
      expect(payerParents?.[0].parentId).toBe(p2.data!.id);
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
      const parentRes = await createParent({ firstName: 'Unlink', lastName: 'Test', phonePrimary: '+225 0909090909' });
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
