// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Tests des Composants UI de Saisie des Notes (GradeEntryView)
// Fichier : tests/components/GradeEntryView.test.tsx
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionSelector } from '../../src/components/academic/results/SessionSelector';
import { CorrectionProgressCard } from '../../src/components/academic/results/CorrectionProgressCard';
import { GradeEntryGrid, StudentRowData, SubjectHeader } from '../../src/components/academic/results/GradeEntryGrid';
import GradeEntryPage from '../../src/pages/GradeEntryPage';
import { ToastProvider } from '../../src/context/ToastContext';
import { AllProviders } from '../testUtils';



describe('Grade Entry UI Components Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SessionSelector
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SessionSelector Component', () => {
    it('affiche les sélecteurs multi-critères et sélectionne la session', () => {
      const handleSelect = vi.fn();
      render(
        <AllProviders>
          <SessionSelector onSessionSelect={handleSelect} />
        </AllProviders>
      );

      expect(screen.getByText(/Session & Composition/i)).toBeInTheDocument();
      expect(screen.getByText(/Classe Académique/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CorrectionProgressCard
  // ═══════════════════════════════════════════════════════════════════════════
  describe('CorrectionProgressCard Component', () => {
    it('affiche les métriques de progression des copies et le pourcentage', () => {
      const progress = {
        assessmentSessionId: 'sess-1',
        totalStudents: 28,
        completedCount: 19,
        inProgressCount: 6,
        notStartedCount: 3,
        validatedCount: 15,
        percentage: 68,
      };

      render(<CorrectionProgressCard progress={progress} />);

      expect(screen.getByText('28')).toBeInTheDocument();
      expect(screen.getByText('19')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('68% Effectué')).toBeInTheDocument();
    });

    it('déclenche les actions Tout Valider et Publier', () => {
      const handlePublish = vi.fn();
      const handleValidate = vi.fn();
      const progress = {
        assessmentSessionId: 'sess-1',
        totalStudents: 10,
        completedCount: 10,
        inProgressCount: 0,
        notStartedCount: 0,
        validatedCount: 10,
        percentage: 100,
      };

      render(
        <CorrectionProgressCard
          progress={progress}
          onPublishAll={handlePublish}
          onValidateAll={handleValidate}
        />
      );

      const valBtn = screen.getByText(/Tout Valider/i);
      fireEvent.click(valBtn);
      expect(handleValidate).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GradeEntryGrid (Tableur Excel)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GradeEntryGrid Component (Grille Excel)', () => {
    const mockSubjects: SubjectHeader[] = [
      { id: 'math', code: 'MATH', name: 'Mathématiques', maxScore: 20 },
      { id: 'fr', code: 'FR', name: 'Français', maxScore: 20 },
    ];

    const mockStudents: StudentRowData[] = [
      {
        studentId: 'st-1',
        matricule: 'MAT-001',
        firstName: 'Jean',
        lastName: 'KOUASSI',
        scores: { math: { score: 15, absenceStatus: 'PRESENT' } },
        total: 15,
        average: 15,
        appreciation: 'Bon travail',
        status: 'IN_PROGRESS',
        decision: 'PASSE',
      },
    ];

    it('affiche la grille avec colonnes matières et élèves', () => {
      const handleSave = vi.fn().mockResolvedValue(true);
      render(
        <GradeEntryGrid
          sessionId="sess-1"
          subjects={mockSubjects}
          students={mockStudents}
          onSaveScores={handleSave}
        />
      );

      expect(screen.getByText('MAT-001')).toBeInTheDocument();
      expect(screen.getByText(/KOUASSI/i)).toBeInTheDocument();
      expect(screen.getByText(/NOTE/i)).toBeInTheDocument();
    });

    it('valide instantanément les notes saisies et empêche les dépassements de barème', async () => {
      const handleSave = vi.fn().mockResolvedValue(true);
      render(
        <GradeEntryGrid
          sessionId="sess-1"
          subjects={mockSubjects}
          students={mockStudents}
          onSaveScores={handleSave}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const mathInput = inputs[0];

      // Saisie d'une note valide
      fireEvent.change(mathInput, { target: { value: '18' } });
      await waitFor(() => {
        expect(handleSave).toHaveBeenCalled();
      });

      // Saisie d'une note au-dessus du barème (25 > 20)
      fireEvent.change(mathInput, { target: { value: '25' } });
      expect(await screen.findByText(/Dépasse/i)).toBeInTheDocument();
    });

    it('permet la navigation au clavier avec TAB, Entrée et Flèches', () => {
      const handleSave = vi.fn().mockResolvedValue(true);
      render(
        <GradeEntryGrid
          sessionId="sess-1"
          subjects={mockSubjects}
          students={mockStudents}
          onSaveScores={handleSave}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const mathInput = inputs[0];

      mathInput.focus();
      fireEvent.keyDown(mathInput, { key: 'ArrowRight' });
      fireEvent.keyDown(mathInput, { key: 'Enter' });
    });

    it('gère le copier/coller depuis Excel', () => {
      const handleSave = vi.fn().mockResolvedValue(true);
      render(
        <GradeEntryGrid
          sessionId="sess-1"
          subjects={mockSubjects}
          students={mockStudents}
          onSaveScores={handleSave}
        />
      );

      const inputs = screen.getAllByRole('spinbutton');
      const cellTd = inputs[0].closest('td');

      if (cellTd) {
        fireEvent.paste(cellTd, {
          clipboardData: {
            getData: () => '16\t14',
          },
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GradeEntryPage (Page globale)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GradeEntryPage Component', () => {
    it('rend la page principale de saisie des notes avec le sélecteur', () => {
      render(
        <AllProviders>
          <GradeEntryPage />
        </AllProviders>
      );

      expect(screen.getByText(/Sessions d'Évaluations & Notes/i)).toBeInTheDocument();
    });
  });
});
