import { useState, useEffect, useCallback } from 'react';
import {
  ReportCardValidation,
  ClassReportCardsResult,
  reportCardsService,
} from '../../../services/academic/reports';
import { CompiledDocument } from '../../../services/documents/types';

/**
 * Hook React pour la gestion et la génération des bulletins scolaires
 */
export function useReportCards(sessionId?: string, classroomId?: string, levelCode: string = 'CP1') {
  const [validation, setValidation] = useState<ReportCardValidation>({
    isReadyForGeneration: false,
    totalStudents: 0,
    readyCount: 0,
    incompleteCount: 0,
    incompleteStudents: [],
  });
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<ClassReportCardsResult | null>(null);
  const [selectedStudentPreview, setSelectedStudentPreview] = useState<CompiledDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vérification automatique des prérequis lors du changement de session
  const checkValidation = useCallback(async () => {
    if (!sessionId) {
      setValidation({
        isReadyForGeneration: false,
        totalStudents: 0,
        readyCount: 0,
        incompleteCount: 0,
        incompleteStudents: [],
      });
      return;
    }

    setLoadingValidation(true);
    setError(null);
    try {
      const val = await reportCardsService.validateClassReportCards(sessionId);
      setValidation(val);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification des bulletins');
    } finally {
      setLoadingValidation(false);
    }
  }, [sessionId]);

  useEffect(() => {
    checkValidation();
  }, [checkValidation]);

  // Action unique : Générer les bulletins de la classe
  const generateReportCards = useCallback(
    async (userRole: string = 'Direction Péda') => {
      if (!sessionId || !classroomId) return null;

      setGenerating(true);
      setError(null);
      try {
        const result = await reportCardsService.generateClassReportCards(sessionId, classroomId, levelCode, userRole);
        setGeneratedResult(result);
        return result;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la génération des bulletins');
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [sessionId, classroomId, levelCode]
  );

  // Prévisualiser un bulletin individuel
  const previewStudent = useCallback(
    async (studentId: string) => {
      if (!sessionId) return null;
      try {
        const doc = await reportCardsService.previewStudentReportCard(sessionId, studentId, levelCode);
        setSelectedStudentPreview(doc);
        return doc;
      } catch {
        return null;
      }
    },
    [sessionId, levelCode]
  );

  // Imprimer toute la classe
  const printClassSet = useCallback(() => {
    if (generatedResult) {
      reportCardsService.printClassSet(generatedResult);
    }
  }, [generatedResult]);

  // Télécharger toute la classe
  const downloadClassSet = useCallback(() => {
    if (generatedResult) {
      reportCardsService.downloadClassSet(generatedResult);
    }
  }, [generatedResult]);

  return {
    validation,
    loadingValidation,
    generating,
    generatedResult,
    selectedStudentPreview,
    setSelectedStudentPreview,
    error,
    checkValidation,
    generateReportCards,
    previewStudent,
    printClassSet,
    downloadClassSet,
  };
}
