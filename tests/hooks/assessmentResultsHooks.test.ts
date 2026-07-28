// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests des Hooks React Résultats d'Évaluation & Saisie des Notes
// Fichier : tests/hooks/assessmentResultsHooks.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssessmentResults } from '../../src/hooks/academic/results/useAssessmentResults';
import { useAssessmentResult } from '../../src/hooks/academic/results/useAssessmentResult';
import { useCorrectionProgress } from '../../src/hooks/academic/results/useCorrectionProgress';
import { clearResultsCache, saveDraft, validateResult } from '../../src/services/academic/results';
import { createSession, clearSessionsCache } from '../../src/services/academic/sessions';

describe('Assessment Results Hooks Layer', () => {
  beforeEach(() => {
    clearResultsCache();
    clearSessionsCache();
  });

  describe('useAssessmentResults', () => {
    it('initialise la liste des résultats, sauvegarde les brouillons et gère le workflow', async () => {
      await createSession({
        id: 'sess-hk-1',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Session Hook Results',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const { result } = renderHook(() => useAssessmentResults('sess-hk-1'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.loading).toBe(false);

      let saveOk = false;
      await act(async () => {
        saveOk = await result.current.saveStudentDraft(
          'st-hk-1',
          [{ subjectId: 'math', score: 16, maxScore: 20 }],
          'CP1',
          'MONTHLY'
        );
      });
      expect(saveOk).toBe(true);
      expect(result.current.results.length).toBe(1);

      const targetResultId = result.current.results[0].id;

      let submitOk = false;
      await act(async () => {
        submitOk = await result.current.submitStudent(targetResultId);
      });
      expect(submitOk).toBe(true);

      let validateOk = false;
      await act(async () => {
        validateOk = await result.current.validateStudent(targetResultId, 'Directeur');
      });
      expect(validateOk).toBe(true);

      let publishOk = false;
      await act(async () => {
        publishOk = await result.current.publishSessionResults(targetResultId);
      });
      expect(publishOk).toBe(true);
    });

    it('gère proprement une session indéfinie ou invalide', async () => {
      const { result } = renderHook(() => useAssessmentResults(undefined));
      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);

      const saveNoSess = await result.current.saveStudentDraft('st-1', []);
      expect(saveNoSess).toBe(false);
    });
  });

  describe('useAssessmentResult', () => {
    it('charge un résultat individuel, permet la saisie de notes et valide', async () => {
      await createSession({
        id: 'sess-single-hk',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Single Result Session',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const draftRes = await saveDraft('sess-single-hk', 'st-indiv-1', [{ subjectId: 'math', score: 15 }]);
      const resultId = draftRes.data!.id;

      const { result } = renderHook(() => useAssessmentResult(resultId));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.result).toBeDefined();
      expect(result.current.result?.studentId).toBe('st-indiv-1');

      let saveScoresOk = false;
      await act(async () => {
        saveScoresOk = await result.current.saveScores([{ subjectId: 'math', score: 18 }]);
      });
      expect(saveScoresOk).toBe(true);

      let submitOk = false;
      await act(async () => {
        submitOk = await result.current.submit();
      });
      expect(submitOk).toBe(true);

      let valOk = false;
      await act(async () => {
        valOk = await result.current.validate('Conseil');
      });
      expect(valOk).toBe(true);

      let pubOk = false;
      await act(async () => {
        pubOk = await result.current.publish();
      });
      expect(pubOk).toBe(true);
    });

    it('gère proprement un resultId indéfini ou inexistant', async () => {
      const { result } = renderHook(() => useAssessmentResult(undefined));
      expect(result.current.result).toBeNull();

      const saveErr = await result.current.saveScores([]);
      expect(saveErr).toBe(false);

      const subErr = await result.current.submit();
      expect(subErr).toBe(false);

      const valErr = await result.current.validate();
      expect(valErr).toBe(false);

      const pubErr = await result.current.publish();
      expect(pubErr).toBe(false);
    });
  });

  describe('useCorrectionProgress', () => {
    it('calcule la progression des corrections pour une session donnée', async () => {
      await createSession({
        id: 'sess-prog-hk',
        academicYearId: 'ay-2026',
        classroomId: 'cls-1',
        assessmentTypeId: 'MONTHLY',
        title: 'Progression Session',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      const r1 = await saveDraft('sess-prog-hk', 'st-1', [{ subjectId: 'math', score: 15 }]);
      await validateResult(r1.data!.id);

      const { result } = renderHook(() => useCorrectionProgress('sess-prog-hk'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBeDefined();
      expect(result.current.progress?.totalStudents).toBe(1);
      expect(result.current.progress?.percentage).toBe(100);
    });

    it('gère une session indéfinie', async () => {
      const { result } = renderHook(() => useCorrectionProgress(undefined));
      expect(result.current.progress).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});
