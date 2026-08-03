// ─────────────────────────────────────────────────────────────────────────────
// GESCO — GradeEntryPage (src/pages/GradeEntryPage.tsx)
// Orchestrateur Officiel de l'Architecture Produit Validée
// Écran 1 (SessionsHubView) ➔ Écran 2 (CreateSessionWizardModal) ➔ Écran 3 (SessionDetailView)
// ➔ Écran 4 (GradeEntryWorkspaceView 85% HAUTEUR) ➔ Écran 5 (SessionResultsView)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { SessionsHubView } from '../components/academic/results/SessionsHubView';
import { CreateSessionWizardModal } from '../components/academic/results/CreateSessionWizardModal';
import { SessionDetailView } from '../components/academic/results/SessionDetailView';
import { GradeEntryWorkspaceView } from '../components/academic/results/GradeEntryWorkspaceView';
import { SessionResultsView } from '../components/academic/results/SessionResultsView';
import { AssessmentSession } from '../services/academic/sessions';
import { SubjectHeader } from '../components/academic/results/GradeEntryGrid';
import { useToast } from '../context/ToastContext';

type WorkflowStep = 'HUB' | 'DETAIL' | 'WORKSPACE' | 'RESULTS';

export function GradeEntryPage() {
  const { addNotification } = useToast();

  const [viewStep, setViewStep] = useState<WorkflowStep>('HUB');
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Matières standards de l'Academic Engine
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

  const handleSelectSession = (session: AssessmentSession) => {
    setSelectedSession(session);
    setViewStep('DETAIL');
  };

  const handleStartGradeEntry = (subjectId?: string) => {
    if (subjectId) setSelectedSubjectId(subjectId);
    setViewStep('WORKSPACE');
  };

  const handleCreateSuccess = () => {
    addNotification('success', 'Nouvelle session d\'évaluation ouverte avec succès !');
    setViewStep('HUB');
  };

  return (
    <div>
      {/* ── ÉCRAN 1 : ACCUEIL DU MODULE & HUB SESSIONS ─────────────────── */}
      {viewStep === 'HUB' && (
        <SessionsHubView
          onSelectSession={handleSelectSession}
          onOpenCreateModal={() => setShowCreateModal(true)}
        />
      )}

      {/* ── ÉCRAN 3 : FICHE DE SESSION (TABLEAU DE BORD) ───────────────── */}
      {viewStep === 'DETAIL' && selectedSession && (
        <SessionDetailView
          session={selectedSession}
          subjects={subjects}
          onBack={() => setViewStep('HUB')}
          onStartGradeEntry={handleStartGradeEntry}
          onViewResults={() => setViewStep('RESULTS')}
        />
      )}

      {/* ── ÉCRAN 4 : WORKSPACE DÉDIÉ À LA SAISIE TABLEUR (85% SURFACE) ── */}
      {viewStep === 'WORKSPACE' && selectedSession && (
        <GradeEntryWorkspaceView
          session={selectedSession}
          subjects={subjects}
          initialSubjectId={selectedSubjectId}
          onBack={() => setViewStep('DETAIL')}
          onFinishEntry={() => setViewStep('RESULTS')}
        />
      )}

      {/* ── ÉCRAN 5 : RÉSULTATS & DÉLIBÉRATION ──────────────────────────── */}
      {viewStep === 'RESULTS' && selectedSession && (
        <SessionResultsView
          session={selectedSession}
          subjects={subjects}
          onBack={() => setViewStep('DETAIL')}
          onEditGrades={() => setViewStep('WORKSPACE')}
        />
      )}

      {/* ── ÉCRAN 2 : MODAL GUIDÉ DE CRÉATION DE SESSION ────────────────── */}
      <CreateSessionWizardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

export default GradeEntryPage;
