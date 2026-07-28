// ─────────────────────────────────────────────────────────────────────────────
// GESCO — GradeEntryPage (src/pages/GradeEntryPage.tsx)
// Page principale de saisie des notes et suivi de correction pour enseignants.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from 'react';
import { SessionSelector } from '../components/academic/results/SessionSelector';
import { CorrectionProgressCard } from '../components/academic/results/CorrectionProgressCard';
import { GradeEntryGrid, SubjectHeader, StudentRowData } from '../components/academic/results/GradeEntryGrid';
import { useAssessmentResults, useCorrectionProgress } from '../hooks/academic/results';
import { useToast } from '../context/ToastContext';
import { AssessmentSession } from '../services/academic/sessions';
import { BookOpen, RefreshCw, CheckCircle, Save, Award } from 'lucide-react';

export default function GradeEntryPage() {
  const { addNotification } = useToast();

  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [levelCode, setLevelCode] = useState<string>('CP1');

  const sessionId = selectedSession?.id;

  const {
    results,
    loading: loadingResults,
    saveStudentDraft,
    validateStudent,
    publishSessionResults,
    refresh: refreshResults,
  } = useAssessmentResults(sessionId);

  const {
    progress,
    loading: loadingProgress,
    refresh: refreshProgress,
  } = useCorrectionProgress(sessionId);

  // Définition des matières par défaut de la classe
  const subjects: SubjectHeader[] = useMemo(
    () => [
      { id: 'math', code: 'MATH', name: 'Mathématiques', maxScore: 20 },
      { id: 'fr', code: 'FR', name: 'Français (Lecture/Écriture)', maxScore: 20 },
      { id: 'hist_geo', code: 'HG', name: 'Histoire - Géographie', maxScore: 20 },
      { id: 'sciences', code: 'SCI', name: 'Sciences & Technologie', maxScore: 20 },
      { id: 'eps', code: 'EPS', name: 'Éducation Physique', maxScore: 20 },
    ],
    []
  );

  // Conversion des résultats en lignes élèves pour la grille
  const studentRows: StudentRowData[] = useMemo(() => {
    if (results.length > 0) {
      return results.map((r, idx) => ({
        studentId: r.studentId,
        matricule: `MAT-2026-${(idx + 1).toString().padStart(3, '0')}`,
        firstName: r.studentName ? r.studentName.split(' ')[0] : `Élève`,
        lastName: r.studentName ? r.studentName.split(' ').slice(1).join(' ') : `${r.studentId}`,
        scores: r.scores.reduce((acc, s) => {
          acc[s.subjectId] = { score: s.score, absenceStatus: s.absenceStatus };
          return acc;
        }, {} as Record<string, { score: number | null; absenceStatus: any }>),
        total: r.total,
        average: r.average,
        appreciation: r.appreciation,
        status: r.correctionStatus,
        decision: r.decision,
        isPublished: r.published,
      }));
    }

    // Échantillon par défaut si aucun résultat n'existe encore
    return [
      {
        studentId: 'st-001',
        matricule: 'MAT-2026-001',
        firstName: 'Jean',
        lastName: 'KOUASSI',
        scores: {
          math: { score: 16, absenceStatus: 'PRESENT' },
          fr: { score: 14, absenceStatus: 'PRESENT' },
          hist_geo: { score: 15, absenceStatus: 'PRESENT' },
          sciences: { score: 17, absenceStatus: 'PRESENT' },
          eps: { score: 18, absenceStatus: 'PRESENT' },
        },
        total: 80,
        average: 16,
        appreciation: 'Très Bon travail',
        status: 'COMPLETED',
        decision: 'PASSE',
      },
      {
        studentId: 'st-002',
        matricule: 'MAT-2026-002',
        firstName: 'Marie',
        lastName: 'KONAN',
        scores: {
          math: { score: 11, absenceStatus: 'PRESENT' },
          fr: { score: 12, absenceStatus: 'PRESENT' },
          hist_geo: { score: 10, absenceStatus: 'PRESENT' },
          sciences: { score: 13, absenceStatus: 'PRESENT' },
          eps: { score: 14, absenceStatus: 'PRESENT' },
        },
        total: 60,
        average: 12,
        appreciation: 'Travail satisfaisant',
        status: 'IN_PROGRESS',
        decision: 'PASSE',
      },
      {
        studentId: 'st-003',
        matricule: 'MAT-2026-003',
        firstName: 'Awa',
        lastName: 'DIABATÉ',
        scores: {
          math: { score: null, absenceStatus: 'PRESENT' },
          fr: { score: null, absenceStatus: 'PRESENT' },
          hist_geo: { score: null, absenceStatus: 'PRESENT' },
          sciences: { score: null, absenceStatus: 'PRESENT' },
          eps: { score: null, absenceStatus: 'PRESENT' },
        },
        total: null,
        average: null,
        appreciation: null,
        status: 'NOT_STARTED',
        decision: 'EN_ATTENTE',
      },
    ];
  }, [results]);

  const handleSessionSelect = useCallback(
    (session: AssessmentSession | null, classroomId: string, lCode: string) => {
      setSelectedSession(session);
      setSelectedClassroomId(classroomId);
      setLevelCode(lCode);
    },
    []
  );

  const handleSaveScores = useCallback(
    async (studentId: string, scoresInput: any[]) => {
      if (!sessionId) return false;
      const ok = await saveStudentDraft(studentId, scoresInput, levelCode, selectedSession?.assessmentTypeId || 'MONTHLY');
      if (ok) {
        refreshProgress();
      } else {
        addNotification('error', 'Erreur lors du recalcul des notes');
      }
      return ok;
    },
    [sessionId, saveStudentDraft, levelCode, selectedSession, refreshProgress, addNotification]
  );

  const handleValidateAll = useCallback(async () => {
    if (results.length === 0) return;
    let count = 0;
    for (const r of results) {
      if (r.correctionStatus === 'COMPLETED') {
        const ok = await validateStudent(r.id, 'Direction Péda');
        if (ok) count++;
      }
    }
    addNotification('success', `${count} copie(s) validée(s) par la direction`);
    refreshProgress();
  }, [results, validateStudent, addNotification, refreshProgress]);

  const handlePublishAll = useCallback(async () => {
    if (results.length === 0) return;
    const firstResult = results[0];
    const ok = await publishSessionResults(firstResult.id);
    if (ok) {
      addNotification('success', 'Résultats de la session publiés avec succès !');
      refreshProgress();
      refreshResults();
    } else {
      addNotification('error', 'Impossible de publier : vérifiez que toutes les copies sont validées.');
    }
  }, [results, publishSessionResults, addNotification, refreshProgress, refreshResults]);

  return (
    <div className="container-fluid p-4">
      {/* En-tête de la page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Saisie des Notes & Correction
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Espace enseignant : Saisie ultra-rapide, recalcul réactif et suivi des validations
          </p>
        </div>

        <button className="btn btn-outline-secondary btn-sm" onClick={() => { refreshResults(); refreshProgress(); }}>
          <RefreshCw size={14} style={{ marginRight: 4 }} />
          Actualiser
        </button>
      </div>

      {/* 1. Sélecteur de session */}
      <SessionSelector onSessionSelect={handleSessionSelect} selectedSessionId={sessionId} />

      {/* 2. Carte de progression des corrections */}
      {sessionId && (
        <CorrectionProgressCard
          progress={progress}
          loading={loadingProgress}
          onValidateAll={handleValidateAll}
          onPublishAll={handlePublishAll}
          isLocked={selectedSession?.locked}
          isPublished={selectedSession?.published}
        />
      )}

      {/* 3. Grille Tableur Excel de Saisie des Notes */}
      {sessionId ? (
        <GradeEntryGrid
          sessionId={sessionId}
          subjects={subjects}
          students={studentRows}
          onSaveScores={handleSaveScores}
          isLocked={selectedSession?.locked}
          isPublished={selectedSession?.published}
        />
      ) : (
        <div className="card text-center p-5 shadow-sm">
          <BookOpen size={48} className="text-muted mx-auto mb-3" style={{ opacity: 0.5 }} />
          <h4 className="fw-semibold mb-2">Aucune session sélectionnée</h4>
          <p className="text-muted text-sm">
            Veuillez choisir une Année Scolaire, une Classe et une Session d'Évaluation dans le sélecteur ci-dessus pour démarrer la saisie.
          </p>
        </div>
      )}
    </div>
  );
}
