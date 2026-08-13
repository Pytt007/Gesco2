import {
  LevelCategory,
  ReportCardValidation,
  IncompleteStudentInfo,
  IncompleteReason,
  StudentReportCardItem,
  ClassReportCardsResult,
} from './types';
import * as assessmentResultsService from '../results/assessmentResultsService';
import { documentEngine } from '../../documents/documentEngine';
import { pdfRenderer } from '../../documents/pdfRenderer';
import { CompiledDocument } from '../../documents/types';
import { supabase } from '../../common/supabaseClient';

/**
 * Service de gestion et de génération automatique des Bulletins Scolaires GESCO
 */
export const reportCardsService = {
  /**
   * Mappe automatiquement le niveau scolaire de la classe vers la catégorie de bulletin
   * Préscolaire -> Bulletin Préscolaire
   * CP -> Bulletin CP
   * CE -> Bulletin CE
   * CM -> Bulletin CM
   */
  resolveLevelCategory(levelCode: string): LevelCategory {
    const code = (levelCode || '').toUpperCase().trim();
    if (['MAT', 'TPS', 'PS', 'MS', 'GS', 'PRE'].some((p) => code.includes(p))) {
      return 'PRESCHOOL';
    }
    if (code.includes('CP')) return 'CP';
    if (code.includes('CE')) return 'CE';
    if (code.includes('CM')) return 'CM';
    return 'CP'; // Défaut primaire
  },

  /**
   * Obtient le code du modèle de bulletin correspondant au niveau
   */
  getTemplateCodeForLevel(levelCategory: LevelCategory): string {
    switch (levelCategory) {
      case 'PRESCHOOL':
        return 'BULLETIN_PRESCHOOL';
      case 'CP':
        return 'BULLETIN_CP';
      case 'CE':
        return 'BULLETIN_CE';
      case 'CM':
        return 'BULLETIN_CM';
      default:
        return 'BULLETIN_STANDARD';
    }
  },

  /**
   * Valide automatiquement si tous les résultats de la classe sont prêts pour la génération
   */
  async validateClassReportCards(sessionId: string): Promise<ReportCardValidation> {
    if (!sessionId) {
      return {
        isReadyForGeneration: false,
        totalStudents: 0,
        readyCount: 0,
        incompleteCount: 0,
        incompleteStudents: [],
      };
    }

    const res = await assessmentResultsService.getResultsBySession(sessionId);
    const results = (res && res.data) ? res.data : [];

    if (results.length === 0) {
      return {
        isReadyForGeneration: false,
        totalStudents: 0,
        readyCount: 0,
        incompleteCount: 0,
        incompleteStudents: [],
      };
    }

    const incompleteStudents: IncompleteStudentInfo[] = [];
    let readyCount = 0;

    results.forEach((r) => {
      const reasons: IncompleteReason[] = [];
      const reasonLabels: string[] = [];

      if (!r.isCompleted || r.correctionStatus === 'NOT_STARTED') {
        reasons.push('MISSING_SCORES');
        reasonLabels.push('Notes non totalement saisies');
      }
      if (r.total === null || r.average === null) {
        reasons.push('CALCULATION_PENDING');
        reasonLabels.push('Calculs de moyenne en attente');
      }
      if (r.rank === null) {
        reasons.push('RANK_MISSING');
        reasonLabels.push('Rang non attribué');
      }
      if (!r.appreciation) {
        reasons.push('APPRECIATION_MISSING');
        reasonLabels.push('Appréciation manquante');
      }
      if (!r.decision) {
        reasons.push('DECISION_MISSING');
        reasonLabels.push('Décision pédagogique en attente');
      }

      if (reasons.length > 0) {
        incompleteStudents.push({
          studentId: r.studentId,
          studentName: r.studentName || `Élève ${r.studentId}`,
          matricule: `MAT-2026-${r.studentId.substring(0, 4).toUpperCase()}`,
          reasons,
          reasonLabels,
        });
      } else {
        readyCount++;
      }
    });

    return {
      isReadyForGeneration: incompleteStudents.length === 0,
      totalStudents: results.length,
      readyCount,
      incompleteCount: incompleteStudents.length,
      incompleteStudents,
    };
  },

  /**
   * Action unique : Génère automatiquement tous les bulletins de la classe (Jusqu'à 100 élèves)
   */
  async generateClassReportCards(
    sessionId: string,
    classroomId: string,
    levelCode: string = 'CP1',
    generatedBy: string = 'Direction Péda'
  ): Promise<ClassReportCardsResult> {
    const levelCategory = this.resolveLevelCategory(levelCode);
    const templateCode = this.getTemplateCodeForLevel(levelCategory);

    // Charger les résultats réels ou générer les bulletins de la classe
    const res = await assessmentResultsService.getResultsBySession(sessionId);
    let results = (res && res.data) ? res.data : [];

    // Si pas de données réelles, retourner un résultat vide
    if (results.length === 0) {
      return {
        sessionId,
        classroomId,
        classroomName: levelCode,
        levelCategory,
        generatedCount: 0,
        reportCards: [],
        combinedHtml: '<div style="text-align: center; padding: 40px; color: #64748b; font-family: sans-serif;">Aucun résultat d\'évaluation trouvé pour cette classe et cette session.</div>',
      };
    }

    const reportCards: StudentReportCardItem[] = [];
    const htmlPages: string[] = [];

    for (const r of results) {
      const studentName = r.studentName || `Élève ${r.studentId}`;
      const matricule = `MAT-2026-${(reportCards.length + 1).toString().padStart(3, '0')}`;

      // Génération via Document Engine
      const { compiled, historyRecord } = await documentEngine.generateDocument({
        templateId: templateCode,
        documentType: 'BULLETIN',
        entityType: 'STUDENT',
        entityId: r.studentId,
        generatedBy,
        data: {
          studentName,
          matricule,
          className: levelCode,
          average: r.average,
          rank: r.rank ? `${r.rank}${r.rank === 1 ? 'er' : 'ème'}` : 'N.C',
          totalStudents: results.length,
          appreciation: r.appreciation,
          mention: r.mention,
          decision: r.decision,
          subjects: r.scores.map((s) => ({
            name: s.subjectId === 'math' ? 'Mathématiques' : s.subjectId === 'fr' ? 'Français' : 'Sciences',
            score: s.score,
            maxScore: s.maxScore || 20,
            coeff: (s as any).coeff || 1,
            appreciation: s.appreciation,
          })),
        },
      });

      reportCards.push({
        studentId: r.studentId,
        studentName,
        matricule,
        total: r.total,
        average: r.average,
        rank: r.rank,
        appreciation: r.appreciation,
        decision: r.decision,
        isReady: true,
        documentId: historyRecord.id,
        checksum: compiled.checksum,
        pdfUrl: historyRecord.pdfUrl || undefined,
        generatedAt: historyRecord.generatedAt,
      });

      htmlPages.push(compiled.fullHtml);
    }

    const combinedHtml = htmlPages.join('<div style="page-break-after: always;"></div>\n');

    return {
      sessionId,
      classroomId,
      classroomName: levelCode,
      levelCategory,
      generatedCount: reportCards.length,
      reportCards,
      combinedHtml,
    };
  },

  /**
   * Génère l'aperçu en direct du bulletin d'un élève
   */
  async previewStudentReportCard(
    sessionId: string,
    studentId: string,
    levelCode: string = 'CP1'
  ): Promise<CompiledDocument> {
    const levelCategory = this.resolveLevelCategory(levelCode);
    const templateCode = this.getTemplateCodeForLevel(levelCategory);

    // Tenter de charger les vraies données de l'élève
    const res = await assessmentResultsService.getResultsBySession(sessionId);
    const result = res?.data?.find((r: any) => r.studentId === studentId);

    return documentEngine.previewDocument({
      templateId: templateCode,
      documentType: 'BULLETIN',
      entityType: 'STUDENT',
      entityId: studentId,
      generatedBy: 'Consultation',
      data: {
        studentName: result?.studentName || '—',
        matricule: '—',
        className: levelCode,
        average: result?.average ?? 0,
        rank: result?.rank ? `${result.rank}${result.rank === 1 ? 'er' : 'ème'}` : '—',
        totalStudents: res?.data?.length ?? 0,
        appreciation: result?.appreciation || '—',
        decision: result?.decision || '—',
      },
    });
  },

  /**
   * Télécharge les bulletins de toute la classe sous forme de fichier HTML/PDF groupé
   */
  downloadClassSet(result: ClassReportCardsResult): void {
    const blob = new Blob([result.combinedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bulletins_${result.classroomName}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Lance l'impression de toute la classe
   */
  printClassSet(result: ClassReportCardsResult): void {
    pdfRenderer.printHtml(result.combinedHtml);
  },
};
