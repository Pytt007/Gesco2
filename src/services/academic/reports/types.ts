/**
 * Types pour le module Bulletins Scolaires GESCO
 */

export type LevelCategory = 'PRESCHOOL' | 'CP' | 'CE' | 'CM';

export type IncompleteReason =
  | 'MISSING_SCORES'
  | 'CALCULATION_PENDING'
  | 'RANK_MISSING'
  | 'APPRECIATION_MISSING'
  | 'DECISION_MISSING';

export interface IncompleteStudentInfo {
  studentId: string;
  studentName: string;
  matricule: string;
  reasons: IncompleteReason[];
  reasonLabels: string[];
}

export interface ReportCardValidation {
  isReadyForGeneration: boolean;
  totalStudents: number;
  readyCount: number;
  incompleteCount: number;
  incompleteStudents: IncompleteStudentInfo[];
}

export interface StudentReportCardItem {
  studentId: string;
  studentName: string;
  matricule: string;
  photoUrl?: string;
  total: number | null;
  average: number | null;
  rank: number | string | null;
  appreciation: string | null;
  decision: string | null;
  isReady: boolean;
  documentId?: string;
  checksum?: string;
  pdfUrl?: string;
  generatedAt?: string;
}

export interface ClassReportCardStats {
  classAverage: number;
  highestAverage: number;
  lowestAverage: number;
  successRate: number; // % d'élèves ayant la moyenne (>= 10 ou >= 5 selon barème)
}

export interface ClassReportCardsResult {
  sessionId: string;
  classroomId: string;
  classroomName: string;
  levelCategory: LevelCategory;
  generatedCount: number;
  reportCards: StudentReportCardItem[];
  combinedHtml: string;
  stats?: ClassReportCardStats;
}
