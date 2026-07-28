// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests Unitaires du Catalogue Pédagogique (Services Layer)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  getSubjects,
  getSubject,
  searchSubjects,
  createSubject,
  updateSubject,
  archiveSubject,
  restoreSubject,
  getSubjectsByCategory,
  getMainSubjects,
  getComplementarySubjects,
  getPreschoolDomains,
  getComponents,
  getComponentsBySubject,
  addComponent,
  removeComponent,
  updateComponentOrder,
  assignSubjectToLevel,
  removeSubjectFromLevel,
  updateLevelSubjectOrder,
  getSubjectsByLevel,
  getLevelsBySubject,
} from '../../src/services/academic/catalog';

describe('Pedagogical Catalog Module Services Layer', () => {

  describe('subjectCategoriesService', () => {
    it('retrieves default subject categories sorted by sortOrder', async () => {
      const res = await getCategories();
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThanOrEqual(3);
    });

    it('creates, reads, updates, archives and restores a category', async () => {
      const createRes = await createCategory({
        code: 'TEST_CAT',
        name: 'Catégorie Test',
        description: 'Description de test',
        sortOrder: 10,
      });
      expect(createRes.success).toBe(true);
      expect(createRes.data?.name).toBe('Catégorie Test');
      const catId = createRes.data!.id;

      const getRes = await getCategory(catId);
      expect(getRes.success).toBe(true);
      expect(getRes.data?.code).toBe('TEST_CAT');

      const updateRes = await updateCategory(catId, { name: 'Catégorie Modifiée' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('Catégorie Modifiée');

      const archiveRes = await archiveCategory(catId);
      expect(archiveRes.success).toBe(true);

      const restoreRes = await restoreCategory(catId);
      expect(restoreRes.success).toBe(true);
    });

    it('validates mandatory category parameters', async () => {
      const res = await createCategory({ name: '' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('obligatoire');
    });
  });

  describe('subjectsService', () => {
    it('manages subjects search, filters, category helpers and CRUD', async () => {
      const mainRes = await getMainSubjects();
      expect(mainRes.success).toBe(true);

      const compRes = await getComplementarySubjects();
      expect(compRes.success).toBe(true);

      const preRes = await getPreschoolDomains();
      expect(preRes.success).toBe(true);

      const createRes = await createSubject({
        categoryId: '11111111-1111-4111-a111-111111111111',
        code: 'TEST_SUBJ',
        name: 'Matière Test',
        shortName: 'TEST',
        isComposite: false,
        isGraded: true,
      });
      expect(createRes.success).toBe(true);
      const subId = createRes.data!.id;

      const searchRes = await searchSubjects({ searchQuery: 'Matière Test' });
      expect(searchRes.success).toBe(true);
      expect(searchRes.data?.subjects.length).toBeGreaterThanOrEqual(1);

      const updateRes = await updateSubject(subId, { name: 'Matière Test Mise à Jour' });
      expect(updateRes.success).toBe(true);

      const archiveRes = await archiveSubject(subId);
      expect(archiveRes.success).toBe(true);

      const restoreRes = await restoreSubject(subId);
      expect(restoreRes.success).toBe(true);
    });

    it('validates mandatory subject parameters', async () => {
      const res = await createSubject({ name: 'Sans Categorie' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('obligatoires');
    });
  });

  describe('subjectComponentsService', () => {
    it('prevents self-reference, duplicate and circular components', async () => {
      const parentId = 'b0200000-0000-4000-b000-000000000008'; // EDM
      const childId = 'c0300000-0000-4000-c000-000000000001';  // Histoire

      // Self reference
      const selfRes = await addComponent(parentId, parentId, 1);
      expect(selfRes.success).toBe(false);
      expect(selfRes.error).toContain('elle-même');

      // Add valid component
      const newChildId = 'c0300000-0000-4000-c000-000000000099';
      const addRes = await addComponent(parentId, newChildId, 5);
      expect(addRes.success).toBe(true);

      // Duplicate
      const dupRes = await addComponent(parentId, newChildId, 5);
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain('déjà');

      // Circular reference
      const circRes = await addComponent(newChildId, parentId, 1);
      expect(circRes.success).toBe(false);
      expect(circRes.error).toContain('circulaire');

      // Order update & remove
      const orderRes = await updateComponentOrder(addRes.data!.id, 10);
      expect(orderRes.success).toBe(true);

      const removeRes = await removeComponent(parentId, newChildId);
      expect(removeRes.success).toBe(true);
    });
  });

  describe('levelSubjectsService', () => {
    it('assigns, queries and removes subjects from school levels preventing duplicates', async () => {
      const levelId = '00000000-0000-4000-a000-000000000104'; // CP1
      const subjectId = 'b0200000-0000-4000-b000-000000000001'; // Lecture

      const assignRes = await assignSubjectToLevel(levelId, subjectId, true, 1);
      expect(assignRes.success).toBe(true);

      // Duplicate assignment check
      const dupAssign = await assignSubjectToLevel(levelId, subjectId, true, 2);
      expect(dupAssign.success).toBe(false);
      expect(dupAssign.error).toContain('déjà affectée');

      const byLevelRes = await getSubjectsByLevel(levelId);
      expect(byLevelRes.success).toBe(true);

      const bySubjectRes = await getLevelsBySubject(subjectId);
      expect(bySubjectRes.success).toBe(true);

      const orderRes = await updateLevelSubjectOrder(assignRes.data!.id, 2);
      expect(orderRes.success).toBe(true);

      const removeRes = await removeSubjectFromLevel(levelId, subjectId);
      expect(removeRes.success).toBe(true);
    });
  });
});
