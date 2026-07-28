/**
 * GESCO — Types du module Présence du Personnel
 */

export type StaffAttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ON_LEAVE'
  | 'ABSENT'
  | 'SICK_LEAVE';

export interface StaffAttendanceItem {
  staffId: string;
  matricule: string;
  firstName: string;
  lastName: string;
  role: string;        // Ex: Enseignant Mathématiques, Comptable, Directeur...
  phone: string;
  photoUrl?: string;
  status: StaffAttendanceStatus;
  arrivalTime?: string; // Format "HH:mm" (utilisé si LATE)
  observation?: string; // Libellé (Mission, Formation, Certificat...)
}

export interface StaffAttendanceSheet {
  id: string;
  academicYearId: string;
  date: string; // Format ISO YYYY-MM-DD
  items: StaffAttendanceItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAttendanceSheetInput {
  academicYearId: string;
  date: string;
  items: StaffAttendanceItem[];
  createdBy?: string;
}

export interface StaffAttendanceStats {
  totalStaff: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  sickCount: number;
  presenceRate: number; // %
}

export interface StaffAttendanceHistoryFilter {
  date?: string;
  staffId?: string;
  role?: string;
  searchQuery?: string;
}
