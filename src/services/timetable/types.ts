/**
 * GESCO — Types du module Emploi du Temps
 */

export type DayOfWeek = 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI';

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: 'LUNDI', label: 'Lundi' },
  { key: 'MARDI', label: 'Mardi' },
  { key: 'MERCREDI', label: 'Mercredi' },
  { key: 'JEUDI', label: 'Jeudi' },
  { key: 'VENDREDI', label: 'Vendredi' },
];

export interface StandardTimeSlot {
  id: string;
  startTime: string; // "07:30"
  endTime: string;   // "08:30"
  label: string;     // "07h30-08h30"
}

export const STANDARD_TIME_SLOTS: StandardTimeSlot[] = [
  { id: 'slot-1', startTime: '07:30', endTime: '08:30', label: '07h30 - 08h30' },
  { id: 'slot-2', startTime: '08:30', endTime: '09:30', label: '08h30 - 09h30' },
  { id: 'slot-3', startTime: '09:30', endTime: '10:30', label: '09h30 - 10h30' },
  { id: 'slot-4', startTime: '10:30', endTime: '11:30', label: '10h30 - 11h30' },
  { id: 'slot-5', startTime: '11:30', endTime: '12:30', label: '11h30 - 12h30' },
  { id: 'slot-6', startTime: '13:30', endTime: '14:30', label: '13h30 - 14h30' },
  { id: 'slot-7', startTime: '14:30', endTime: '15:30', label: '14h30 - 15h30' },
  { id: 'slot-8', startTime: '15:30', endTime: '16:30', label: '15h30 - 16h30' },
];

export interface ScheduleSlotRecord {
  id: string;
  academicYearId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  teacherId: string;
  teacherName: string;
  room?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSlotInput {
  academicYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  room?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ClassItem {
  id: string;
  name: string;
  level: string;
}

export interface TeacherItem {
  id: string;
  name: string;
  subjectName?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  color: string;
}

export type TimetableDisplayMode = 'BY_CLASS' | 'BY_TEACHER';
