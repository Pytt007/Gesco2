// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests du Service Saisie des Notes & Résultats (assessmentResultsService)
// Fichier : tests/services/assessmentResultsService.test.ts
// Couverture ciblée : ≥ 90%
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDraft,
  submitForValidation,
  validateResult,
  publishResult,
  getResult,
  getResults,
  getResultsByClass,
  getStudentResults,
  getResultsBySession,
  getCorrectionProgress,
  clearResultsCache,
  validateScoreInput,
} from '../../src/services/academic/results';
import { createSession, clearSessionsCache, lockSession } from '../../src/services/academic/sessions';

describe('Assessment Results Service & Engine Integration Layer', () => {
  beforeEach(() => {
    clearResultsCache();
    clearSessionsCache();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SAISIE DE NOTES & VALIDATIONS DE BORNES (validateScoreInput)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Validation des Notes (validateScoreInput)', () => {
    it('valide une note conforme au barème', () => {
      const res = validateScoreInput({ subjectId: 'math', score: 15.5, maxScore: 20 });
      expect(res.success).toBe(true);
    });

    it('rejette une note négative (score < 0)', () => {
      const res = validateScoreInput({ subjectId: 'math', score: -2.5, maxScore: 20 });
      expect(res.success).toBe(false);
      expect(res.error).toContain('négative');
    });

    it('rejette une note supérieure au barème (score > maxScore)', () => {
      const res = validateScoreInput({ subjectId: 'math', score: 25, maxScore: 20 });
      expect(res.success).toBe(false);
      expect(res.error).toContain('dépasse le barème');
    });

    it('autorise une note null en cas d\'absence motivée ou non', () => {
      const resAbsent = validateScoreInput({ subjectId: 'math', score: null, absenceStatus: 'ABSENT' });
      expect(resAbsent.success).toBe(true);

      const resExcused = validateScoreInput({ subjectId: 'math', score: null, absenceStatus: 'EXCUSED_ABSENT' });
      expect(resExcused.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SAUVEGARDE BROUILLON & RECALCUL AUTOMATIQUE DE L'ACADEMIC ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('saveDraft & Chaîne Academic Engine (Calculation -> Ranking -> Appreciation -> Decision)', () => {
    it('enregistre les notes d\'un élève et déclenche le recalcul automatique', async () => {
      await createSession({
        id: 'session-2026',
        academicYearId: 'ay-2026',
        classroomId: 'cls-cp1',
        assessmentTypeId: 'MONTHLY',
        title: 'Compo Octobre',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      // Élève 1 : Bonnes notes
      const resE1 = await saveDraft(
        'session-2026',
        'student-1',
        [
          { subjectId: 'math', score: 18, maxScore: 20 },
          { subjectId: 'fr', score: 16, maxScore: 20 },
        ],
        'CP1',
        'MONTHLY'
      );

      expect(resE1.success).toBe(true);
      expect(resE1.data?.average).toBe(17);
      expect(resE1.data?.rank).toBe(1);
      expect(resE1.data?.formattedRank).toBe('1er');
      expect(resE1.data?.appreciation).toBeDefined();
      expect(resE1.data?.decision).toBe('PASSE'); // règle CP1 (Passage)

      // Élève 2 : Notes moyennes
      const resE2 = await saveDraft(
        'session-2026',
        'student-2',
        [
          { subjectId: 'math', score: 10, maxScore: 20 },
          { subjectId: 'fr', score: 12, maxScore: 20 },
        ],
        'CP1',
        'MONTHLY'
      );

      expect(resE2.success).toBe(true);
      expect(resE2.data?.average).toBe(11);
      expect(resE2.data?.rank).toBe(2);
      expect(resE2.data?.formattedRank).toBe('2ème');

      // Vérifier que le rang de l'élève 1 reste 1er
      const updatedE1 = await getResult(resE1.data!.id);
      expect(updatedE1.data?.rank).toBe(1);
    });

    it('interdit la modification des notes sur une session verrouillée', async () => {
      const sessRes = await createSession({
        id: 'session-locked',
        academicYearId: 'ay-2026',
        classroomId: 'cls-cp1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Verrouillée',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      await lockSession(sessRes.data!.id);

      const res = await saveDraft(
        'session-locked',
        'student-1',
        [{ subjectId: 'math', score: 15 }]
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('verrouillée');
    });

    it('gère correctement les absences (ABSENT / EXCUSED_ABSENT)', async () => {
      await createSession({
        id: 'session-absent',
        academicYearId: 'ay-2026',
        classroomId: 'cls-cp1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Absence',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const res = await saveDraft(
        'session-absent',
        'student-absent',
        [
          { subjectId: 'math', score: null, absenceStatus: 'ABSENT' },
          { subjectId: 'fr', score: null, absenceStatus: 'EXCUSED_ABSENT' },
        ]
      );

      expect(res.success).toBe(true);
      expect(res.data?.scores[0].absenceStatus).toBe('ABSENT');
      expect(res.data?.scores[0].score).toBeNull();
      expect(res.data?.scores[1].absenceStatus).toBe('EXCUSED_ABSENT');
      expect(res.data?.scores[1].score).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WORKFLOW DE SOUMISSION, VALIDATION ET PUBLICATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Workflow — Soumission, Validation et Publication', () => {
    it('soumet un résultat pour validation puis le valide par la direction', async () => {
      await createSession({
        id: 'session-workflow',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Workflow',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const draftRes = await saveDraft('session-workflow', 'student-wf-1', [
        { subjectId: 'math', score: 14 },
      ]);

      const resultId = draftRes.data!.id;

      // 1. Soumission
      const submitRes = await submitForValidation(resultId);
      expect(submitRes.success).toBe(true);
      expect(submitRes.data?.correctionStatus).toBe('COMPLETED');
      expect(submitRes.data?.isCompleted).toBe(true);

      // 2. Validation
      const validateRes = await validateResult(resultId, 'M. le Directeur');
      expect(validateRes.success).toBe(true);
      expect(validateRes.data?.correctionStatus).toBe('VALIDATED');
      expect(validateRes.data?.validatedBy).toBe('M. le Directeur');
    });

    it('refuse la publication si certaines copies de la session ne sont pas validées', async () => {
      await createSession({
        id: 'session-pub-check',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Pub Check',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      // Élève 1 : Validé
      const r1 = await saveDraft('session-pub-check', 'student-1', [{ subjectId: 'math', score: 15 }]);
      await validateResult(r1.data!.id);

      // Élève 2 : Non validé (Brouillon/IN_PROGRESS)
      await saveDraft('session-pub-check', 'student-2', [{ subjectId: 'math', score: 12 }]);

      // Tentative de publication sur l'élève 1
      const pubRes = await publishResult(r1.data!.id);

      expect(pubRes.success).toBe(false);
      expect(pubRes.error).toContain('pas encore validées');
    });

    it('autorise la publication lorsque toutes les copies sont validées', async () => {
      await createSession({
        id: 'session-pub-ok',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Pub OK',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const r1 = await saveDraft('session-pub-ok', 'student-1', [{ subjectId: 'math', score: 15 }]);
      await validateResult(r1.data!.id);

      const pubRes = await publishResult(r1.data!.id);
      expect(pubRes.success).toBe(true);
      expect(pubRes.data?.published).toBe(true);
      expect(pubRes.data?.correctionStatus).toBe('PUBLISHED');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PROGRESSION DES CORRECTIONS (getCorrectionProgress)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getCorrectionProgress — Calcul d\'avancement des corrections', () => {
    it('calcule exactement le nombre d\'élèves corrigés, en cours et le pourcentage', async () => {
      await createSession({
        id: 'session-prog',
        academicYearId: 'ay-2026',
        classroomId: 'cls-cp2a',
        assessmentTypeId: 'MONTHLY',
        title: 'Progression CP2 A',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      // 2 élèves complétés / validés
      const r1 = await saveDraft('session-prog', 'st-1', [{ subjectId: 'math', score: 14 }]);
      await validateResult(r1.data!.id);

      const r2 = await saveDraft('session-prog', 'st-2', [{ subjectId: 'math', score: 16 }]);
      await submitForValidation(r2.data!.id);

      // 1 élève en cours (au moins 1 matière non notée)
      await saveDraft('session-prog', 'st-3', [
        { subjectId: 'math', score: 10 },
        { subjectId: 'fr', score: null, absenceStatus: 'PRESENT' },
      ]);

      const progRes = await getCorrectionProgress('session-prog');

      expect(progRes.success).toBe(true);
      expect(progRes.data?.totalStudents).toBe(3);
      expect(progRes.data?.completedCount).toBe(2);
      expect(progRes.data?.inProgressCount).toBe(1);
      expect(progRes.data?.percentage).toBe(67); // (2/3) * 100 ~ 67%
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FONCTIONS DE CONSULTATION ET ERREURS AUX BORNES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Consultation et Gestion d\'Erreurs aux Bornes', () => {
    it('récupère les résultats par classe, par élève et globaux', async () => {
      await createSession({
        id: 'sess-query',
        academicYearId: 'ay-2026',
        classroomId: 'cls-q',
        assessmentTypeId: 'MONTHLY',
        title: 'Query Session',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const r1 = await saveDraft('sess-query', 'st-q1', [{ subjectId: 'math', score: 12 }]);
      const resultId = r1.data!.id;

      const byClass = await getResultsByClass('sess-query');
      expect(byClass.success).toBe(true);
      expect(byClass.data?.length).toBeGreaterThanOrEqual(1);

      const byStudent = await getStudentResults('st-q1');
      expect(byStudent.success).toBe(true);
      expect(byStudent.data?.length).toBeGreaterThanOrEqual(1);

      const allRes = await getResults({});
      expect(allRes.success).toBe(true);
    });

    it('gère les identifiants invalides et les tentatives de modification non autorisées', async () => {
      const getErr = await getResult('');
      expect(getErr.success).toBe(false);

      const draftNoSession = await saveDraft('', 'st-1', []);
      expect(draftNoSession.success).toBe(false);

      const subErr = await submitForValidation('id-invalide');
      expect(subErr.success).toBe(false);

      const valErr = await validateResult('id-invalide');
      expect(valErr.success).toBe(false);

      const pubErr = await publishResult('id-invalide');
      expect(pubErr.success).toBe(false);

      const progErr = await getCorrectionProgress('');
      expect(progErr.success).toBe(false);
    });
  });
});
