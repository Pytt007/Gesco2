/**
 * GESCO — Types du module Présences des élèves
 */

export type AttendanceStatus = 'PRESENT' | 'ABSENT_JUSTIFIED' | 'ABSENT';

export interface AttendanceRecordItem {
  studentId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  status: AttendanceStatus;
  observation?: string;
}

export interface AttendanceSheet {
  id: string;
  academicYearId: string;
  classId: string;
  className: string;
  date: string; // ISO Date YYYY-MM-DD
  items: AttendanceRecordItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSheetInput {
  academicYearId: string;
  classId: string;
  date: string;
  items: AttendanceRecordItem[];
  createdBy?: string;
}

export interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
  presenceRate: number; // %
}

export interface AttendanceHistoryFilter {
  academicYearId?: string;
  classId?: string;
  date?: string;
  studentId?: string;
  searchQuery?: string;
}
