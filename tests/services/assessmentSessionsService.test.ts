// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests du Service Sessions d'Évaluation (assessmentSessionsService)
// Fichier : tests/services/assessmentSessionsService.test.ts
// Couverture ciblée : ≥ 90%
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  updateSession,
  lockSession,
  unlockSession,
  publishSession,
  archiveSession,
  duplicateSession,
  getSession,
  getSessions,
  searchSessions,
  getSessionsByClass,
  getSessionsByYear,
  getSessionsByType,
  getSessionsByPeriod,
  getChronologicalSessions,
  clearSessionsCache,
  AssessmentSession,
} from '../../src/services/academic/sessions';

describe('Assessment Sessions Service Layer', () => {
  beforeEach(() => {
    clearSessionsCache();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CRÉATION & VALIDATIONS (createSession)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createSession — Création et Validations', () => {
    it('crée avec succès une session d\'évaluation valide', async () => {
      const res = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Mensuelle Octobre',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.title).toBe('Composition Mensuelle Octobre');
      expect(res.data?.status).toBe('DRAFT');
      expect(res.data?.locked).toBe(false);
      expect(res.data?.published).toBe(false);
    });

    it('rejette la création si l\'année scolaire est manquante', async () => {
      const res = await createSession({
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Mensuelle',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('année scolaire');
    });

    it('rejette la création si la classe est manquante', async () => {
      const res = await createSession({
        academicYearId: 'ay-2026',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Mensuelle',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('classe');
    });

    it('rejette la création si le type ou le modèle est manquant', async () => {
      const res = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: '',
        assessmentTemplateId: '',
        title: 'Composition Mensuelle',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('type d\'évaluation ou le modèle');
    });

    it('rejette la création si le titre est manquant', async () => {
      const res = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: '',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('titre');
    });

    it('rejette la création si les dates sont incohérentes (startDate > endDate)', async () => {
      const res = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Incohérente',
        startDate: '2026-10-10',
        endDate: '2026-10-05',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('date de début ne peut pas être postérieure');
    });

    it('empêche la création d\'une session en doublon (même classe, année, type et titre)', async () => {
      await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Doublon',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const resDuplicate = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Doublon',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(resDuplicate.success).toBe(false);
      expect(resDuplicate.error).toContain('session identique');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MISE À JOUR & RÈGLES DE VERROUILLAGE (updateSession)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateSession & Verrouillage', () => {
    it('met à jour une session non verrouillée', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session à Modifier',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const id = createRes.data!.id;

      const updateRes = await updateSession(id, {
        title: 'Session Titre Modifié',
        description: 'Description ajoutée',
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.title).toBe('Session Titre Modifié');
      expect(updateRes.data?.description).toBe('Description ajoutée');
    });

    it('interdit la modification d\'une session verrouillée (locked = true)', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Verrouillée',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const id = createRes.data!.id;
      await lockSession(id);

      const updateRes = await updateSession(id, { title: 'Titre Interdit' });

      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain('session est verrouillée');
    });

    it('autorise le déverrouillage explicite d\'une session', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session à Déverrouiller',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const id = createRes.data!.id;
      await lockSession(id);

      const unlockRes = await unlockSession(id);

      expect(unlockRes.success).toBe(true);
      expect(unlockRes.data?.locked).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PUBLICATION, ARCHIVAGE & DUPLICATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Workflow — Publication, Archivage et Duplication', () => {
    it('publie une session et la verrouille automatiquement', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session à Publier',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const id = createRes.data!.id;
      const pubRes = await publishSession(id);

      expect(pubRes.success).toBe(true);
      expect(pubRes.data?.published).toBe(true);
      expect(pubRes.data?.locked).toBe(true);
      expect(pubRes.data?.status).toBe('PUBLISHED');
    });

    it('archive une session et la passe au statut ARCHIVED', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session à Archiver',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const id = createRes.data!.id;
      const archRes = await archiveSession(id);

      expect(archRes.success).toBe(true);
      expect(archRes.data?.status).toBe('ARCHIVED');
      expect(archRes.data?.locked).toBe(true);
    });

    it('duplique une session vers une autre classe avec statut DRAFT', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'IEP',
        title: 'Composition IEP Source',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
      });

      const id = createRes.data!.id;
      const dupRes = await duplicateSession(id, 'cls-2', 'Composition IEP Cible');

      expect(dupRes.success).toBe(true);
      expect(dupRes.data?.classroomId).toBe('cls-2');
      expect(dupRes.data?.title).toBe('Composition IEP Cible');
      expect(dupRes.data?.status).toBe('DRAFT');
      expect(dupRes.data?.locked).toBe(false);
      expect(dupRes.data?.published).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. RECHERCHE, FILTRES ET HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Recherche, Filtres et Helpers', () => {
    beforeEach(async () => {
      await createSession({
        id: 's-1',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Composition Octobre A',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        status: 'OPEN',
      });

      await createSession({
        id: 's-2',
        academicYearId: 'ay-2026',
        classroomId: 'cls-2',
        assessmentTypeId: 'IEP',
        title: 'Examen Blanc 1 B',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        status: 'DRAFT',
      });
    });

    it('recherche des sessions par mot-clé textuel', async () => {
      const res = await searchSessions({ searchQuery: 'Examen' });
      expect(res.success).toBe(true);
      expect(res.data?.sessions.length).toBe(1);
      expect(res.data?.sessions[0].title).toContain('Examen');
    });

    it('filtre les sessions par classe, année et type', async () => {
      const byClass = await getSessionsByClass('cls-1');
      expect(byClass.success).toBe(true);
      expect(byClass.data?.length).toBeGreaterThanOrEqual(1);

      const byYear = await getSessionsByYear('ay-2026');
      expect(byYear.success).toBe(true);
      expect(byYear.data?.length).toBeGreaterThanOrEqual(2);

      const byType = await getSessionsByType('IEP');
      expect(byType.success).toBe(true);
      expect(byType.data?.length).toBeGreaterThanOrEqual(1);
    });

    it('filtre et trie les sessions par statut, verrouillage, publication et critères de tri', async () => {
      const resSortedTitle = await searchSessions({ sortBy: 'title', sortOrder: 'asc' });
      expect(resSortedTitle.success).toBe(true);

      const resSortedStatus = await searchSessions({ sortBy: 'status', sortOrder: 'desc' });
      expect(resSortedStatus.success).toBe(true);

      const resSortedCreatedAt = await searchSessions({ sortBy: 'createdAt', sortOrder: 'asc' });
      expect(resSortedCreatedAt.success).toBe(true);

      const resSortedEndDate = await searchSessions({ sortBy: 'endDate', sortOrder: 'asc' });
      expect(resSortedEndDate.success).toBe(true);

      const resFilteredLocked = await searchSessions({ locked: false, published: false, status: 'OPEN' });
      expect(resFilteredLocked.success).toBe(true);
    });

    it('filtre avec précision par période d\'évaluation et trie chronologiquement (P2-04)', async () => {
      await createSession({
        id: 's-t1',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        assessmentPeriodId: 'period-trim1',
        title: 'Session Trimestre 1',
        startDate: '2026-09-15',
        endDate: '2026-09-20',
      });

      await createSession({
        id: 's-t2',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        assessmentPeriodId: 'period-trim2',
        title: 'Session Trimestre 2',
        startDate: '2027-01-10',
        endDate: '2027-01-15',
      });

      const periodRes = await getSessionsByPeriod('ay-2026', 'period-trim1');
      expect(periodRes.success).toBe(true);
      expect(periodRes.data?.length).toBe(1);
      expect(periodRes.data?.[0].assessmentPeriodId).toBe('period-trim1');

      const chronoRes = await getChronologicalSessions('ay-2026', 'cls-1');
      expect(chronoRes.success).toBe(true);
      const dates = chronoRes.data?.map((s) => s.startDate) || [];
      expect(dates).toEqual([...dates].sort());
    });

    it('gère correctement les paramètres d\'erreur et IDs inexistants', async () => {
      const notFound = await getSession('id-invalide');
      expect(notFound.success).toBe(false);

      const updateNotFound = await updateSession('id-invalide', { title: 'Test' });
      expect(updateNotFound.success).toBe(false);

      const unlockNotFound = await unlockSession('');
      expect(unlockNotFound.success).toBe(false);

      const dupNotFound = await duplicateSession('id-inexistant');
      expect(dupNotFound.success).toBe(false);
    });
  });
});
