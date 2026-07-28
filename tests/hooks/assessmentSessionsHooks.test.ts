// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests des Hooks React Sessions d'Évaluation
// Fichier : tests/hooks/assessmentSessionsHooks.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssessmentSessions } from '../../src/hooks/academic/sessions/useAssessmentSessions';
import { useAssessmentSession } from '../../src/hooks/academic/sessions/useAssessmentSession';
import { clearSessionsCache, createSession } from '../../src/services/academic/sessions';

describe('Assessment Sessions Hooks Layer', () => {
  beforeEach(() => {
    clearSessionsCache();
  });

  describe('useAssessmentSessions', () => {
    it('initialise l\'état réactif, la liste, les filtres et les actions CRUD', async () => {
      const { result } = renderHook(() => useAssessmentSessions());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.sessions).toBeDefined();

      let createOk = false;
      await act(async () => {
        createOk = await result.current.create({
          academicYearId: 'ay-2026',
          classroomId: 'cls-hook-1',
          assessmentTypeId: 'MONTHLY',
          title: 'Session Hook Test',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
        });
      });
      expect(createOk).toBe(true);

      const targetId = result.current.sessions[0].id;

      let updateOk = false;
      await act(async () => {
        updateOk = await result.current.update(targetId, { title: 'Session Hook Modifiée' });
      });
      expect(updateOk).toBe(true);

      let lockOk = false;
      await act(async () => {
        lockOk = await result.current.lock(targetId);
      });
      expect(lockOk).toBe(true);

      let unlockOk = false;
      await act(async () => {
        unlockOk = await result.current.unlock(targetId);
      });
      expect(unlockOk).toBe(true);

      let publishOk = false;
      await act(async () => {
        publishOk = await result.current.publish(targetId);
      });
      expect(publishOk).toBe(true);

      let dupOk = false;
      await act(async () => {
        dupOk = await result.current.duplicate(targetId, 'cls-hook-2', 'Session Dupliquée');
      });
      expect(dupOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await result.current.archive(targetId);
      });
      expect(archiveOk).toBe(true);
    });

    it('met à jour les filtres, la recherche et la pagination', async () => {
      const { result } = renderHook(() => useAssessmentSessions());

      act(() => {
        result.current.setSearchQuery('Composition');
        result.current.setStatusFilter('OPEN');
        result.current.setClassroomIdFilter('cls-1');
        result.current.setAcademicYearIdFilter('ay-2026');
        result.current.setAssessmentTypeIdFilter('MONTHLY');
        result.current.setPage(1);
        result.current.setPageSize(10);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.searchQuery).toBe('Composition');
      expect(result.current.statusFilter).toBe('OPEN');
      expect(result.current.classroomIdFilter).toBe('cls-1');
    });
  });

  describe('useAssessmentSession', () => {
    it('charge les détails d\'une session individuelle et exécute les actions', async () => {
      const createRes = await createSession({
        academicYearId: 'ay-2026',
        classroomId: 'cls-single-1',
        assessmentTypeId: 'IEP',
        title: 'Session Individuelle',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
      });
      const id = createRes.data!.id;

      const { result } = renderHook(() => useAssessmentSession(id));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.session).toBeDefined();
      expect(result.current.session?.title).toBe('Session Individuelle');

      let updateOk = false;
      await act(async () => {
        updateOk = await result.current.update({ description: 'Description mise à jour' });
      });
      expect(updateOk).toBe(true);

      let lockOk = false;
      await act(async () => {
        lockOk = await result.current.lock();
      });
      expect(lockOk).toBe(true);

      let unlockOk = false;
      await act(async () => {
        unlockOk = await result.current.unlock();
      });
      expect(unlockOk).toBe(true);

      let publishOk = false;
      await act(async () => {
        publishOk = await result.current.publish();
      });
      expect(publishOk).toBe(true);

      let dupOk = false;
      await act(async () => {
        dupOk = await result.current.duplicate('cls-single-2', 'Titre Copie');
      });
      expect(dupOk).toBe(true);

      let archiveOk = false;
      await act(async () => {
        archiveOk = await result.current.archive();
      });
      expect(archiveOk).toBe(true);
    });

    it('gère proprement les échecs et réponses d\'erreur dans useAssessmentSessions', async () => {
      const { result } = renderHook(() => useAssessmentSessions());

      let createFail = false;
      await act(async () => {
        createFail = await result.current.create({});
      });
      expect(createFail).toBe(false);
      expect(result.current.error).toBeDefined();

      let updateFail = false;
      await act(async () => {
        updateFail = await result.current.update('id-invalide', { title: 'X' });
      });
      expect(updateFail).toBe(false);

      let lockFail = false;
      await act(async () => {
        lockFail = await result.current.lock('');
      });
      expect(lockFail).toBe(false);

      let unlockFail = false;
      await act(async () => {
        unlockFail = await result.current.unlock('');
      });
      expect(unlockFail).toBe(false);

      let publishFail = false;
      await act(async () => {
        publishFail = await result.current.publish('');
      });
      expect(publishFail).toBe(false);

      let archiveFail = false;
      await act(async () => {
        archiveFail = await result.current.archive('');
      });
      expect(archiveFail).toBe(false);

      let dupFail = false;
      await act(async () => {
        dupFail = await result.current.duplicate('');
      });
      expect(dupFail).toBe(false);
    });

    it('gère proprement un identifiant de session indéfini et les erreurs dans useAssessmentSession', async () => {
      const { result } = renderHook(() => useAssessmentSession(undefined));
      expect(result.current.session).toBeNull();
      expect(result.current.loading).toBe(false);

      const updateNoId = await result.current.update({ title: 'X' });
      expect(updateNoId).toBe(false);

      const lockNoId = await result.current.lock();
      expect(lockNoId).toBe(false);

      const unlockNoId = await result.current.unlock();
      expect(unlockNoId).toBe(false);

      const publishNoId = await result.current.publish();
      expect(publishNoId).toBe(false);

      const archiveNoId = await result.current.archive();
      expect(archiveNoId).toBe(false);

      const dupNoId = await result.current.duplicate();
      expect(dupNoId).toBe(false);
    });

    it('gère les erreurs de chargement pour un ID inexistant dans useAssessmentSession', async () => {
      const { result } = renderHook(() => useAssessmentSession('id-inconnu-99'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeDefined();

      let updateErr = false;
      await act(async () => {
        updateErr = await result.current.update({ title: 'Err' });
      });
      expect(updateErr).toBe(false);
    });
  });
});
