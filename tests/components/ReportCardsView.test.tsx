import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { reportCardsService } from '../../src/services/academic/reports/reportCardsService';
import { useReportCards } from '../../src/hooks/academic/reports/useReportCards';
import ReportCardsPage from '../../src/pages/ReportCardsPage';
import { ToastProvider } from '../../src/context/ToastContext';

describe('Report Cards Module Layer (Bulletins Scolaires)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Report Cards Service & Level Mapping (reportCardsService)', () => {
    it('automatically maps school level codes to level categories (Préscolaire, CP, CE, CM)', () => {
      expect(reportCardsService.resolveLevelCategory('PS')).toBe('PRESCHOOL');
      expect(reportCardsService.resolveLevelCategory('MATER NELLE')).toBe('PRESCHOOL');
      expect(reportCardsService.resolveLevelCategory('CP1')).toBe('CP');
      expect(reportCardsService.resolveLevelCategory('CP2')).toBe('CP');
      expect(reportCardsService.resolveLevelCategory('CE1')).toBe('CE');
      expect(reportCardsService.resolveLevelCategory('CE2')).toBe('CE');
      expect(reportCardsService.resolveLevelCategory('CM1')).toBe('CM');
      expect(reportCardsService.resolveLevelCategory('CM2')).toBe('CM');
    });

    it('resolves correct template codes based on level category', () => {
      expect(reportCardsService.getTemplateCodeForLevel('PRESCHOOL')).toBe('BULLETIN_PRESCHOOL');
      expect(reportCardsService.getTemplateCodeForLevel('CP')).toBe('BULLETIN_CP');
      expect(reportCardsService.getTemplateCodeForLevel('CE')).toBe('BULLETIN_CE');
      expect(reportCardsService.getTemplateCodeForLevel('CM')).toBe('BULLETIN_CM');
    });

    it('validates class readiness before allowing report cards generation', async () => {
      const validation = await reportCardsService.validateClassReportCards('sess-101');
      expect(validation.isReadyForGeneration).toBe(true);
      expect(validation.totalStudents).toBeGreaterThan(0);
      expect(validation.incompleteCount).toBe(0);
    });

    it('batch generates class report cards up to 100 students with QR Codes and history', async () => {
      const result = await reportCardsService.generateClassReportCards('sess-202', 'cls-cm2', 'CM2', 'Direction Péda');

      expect(result.sessionId).toBe('sess-202');
      expect(result.levelCategory).toBe('CM');
      expect(result.generatedCount).toBeGreaterThan(0);
      expect(result.reportCards.length).toBe(result.generatedCount);
      expect(result.combinedHtml).toContain('<!DOCTYPE html>');
      expect(result.combinedHtml).toContain('CM2');

      // Each student item has checksum and ready status
      result.reportCards.forEach((st) => {
        expect(st.isReady).toBe(true);
        expect(st.checksum).toContain('GESCO-SHA256-');
        expect(st.documentId).toBeDefined();
      });
    });

    it('previews individual student report card dynamically', async () => {
      const compiled = await reportCardsService.previewStudentReportCard('sess-303', 'st-99', 'CP1');
      expect(compiled.title).toBe('BULLETIN DE NOTES');
      expect(compiled.fullHtml).toContain('KOUASSI Jean');
      expect(compiled.checksum).toBeDefined();
    });
  });

  describe('Report Cards React Hook Layer (useReportCards)', () => {
    it('manages validation state and batch generation flow reactively', async () => {
      const { result } = renderHook(() => useReportCards('sess-hook-1', 'cls-cp1', 'CP1'));

      await vi.waitFor(() => expect(result.current.loadingValidation).toBe(false));

      expect(result.current.validation.isReadyForGeneration).toBe(true);
      expect(result.current.validation.totalStudents).toBeGreaterThan(0);

      // Trigger generation
      let genResult: any = null;
      await act(async () => {
        genResult = await result.current.generateReportCards('Professeur Main');
      });

      expect(genResult).toBeDefined();
      expect(result.current.generatedResult?.generatedCount).toBeGreaterThan(0);

      // Trigger individual preview
      await act(async () => {
        await result.current.previewStudent('st-01');
      });

      expect(result.current.selectedStudentPreview).toBeDefined();
    });
  });

  describe('Report Cards Page UI Component Layer (ReportCardsPage)', () => {
    it('renders title, multi-criteria selector, incomplete warning button or generation button', async () => {
      render(
        <ToastProvider>
          <ReportCardsPage />
        </ToastProvider>
      );

      expect(screen.getByText('Bulletins scolaires')).toBeInTheDocument();
      expect(screen.getByText(/Session d'Évaluation/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Nombre d'élèves")).toBeInTheDocument();
        expect(screen.getByText('Bulletins prêts')).toBeInTheDocument();
      });

      // Assert either incomplete button ("Voir les élèves concernés") or generate button is present
      const actionBtn = screen.getByRole('button', { name: /(Voir les élèves concernés|📄 Générer les bulletins)/i });
      expect(actionBtn).toBeInTheDocument();
    });
  });
});
