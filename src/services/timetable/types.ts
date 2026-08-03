// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Timetable Types
// Créneaux horaires continus de 07h30 à 18h30 avec support des cours sur-mesure
// ─────────────────────────────────────────────────────────────────────────────

export type DayOfWeek =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
  | 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI';

export type TimetableDisplayMode = 'BY_CLASS' | 'BY_TEACHER';

export interface StandardTimeSlot {
  id: string;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
  label: string;
}

export interface ClassItem {
  id: string;
  name: string;
  level?: string;
}

export interface TeacherItem {
  id: string;
  name: string;
  subjectName?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  color?: string;
}

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Lundi', short: 'Lun' },
  { key: 'TUESDAY', label: 'Mardi', short: 'Mar' },
  { key: 'WEDNESDAY', label: 'Mercredi', short: 'Mer' },
  { key: 'THURSDAY', label: 'Jeudi', short: 'Jeu' },
  { key: 'FRIDAY', label: 'Vendredi', short: 'Ven' },
  { key: 'SATURDAY', label: 'Samedi', short: 'Sam' },
];

export const STANDARD_TIME_SLOTS: StandardTimeSlot[] = [
  { id: 'slot-1', startTime: '07:30', endTime: '08:30', label: '07h30 - 08h30' },
  { id: 'slot-2', startTime: '08:30', endTime: '09:30', label: '08h30 - 09h30' },
  { id: 'slot-3', startTime: '09:30', endTime: '10:30', label: '09h30 - 10h30' },
  { id: 'slot-4', startTime: '10:30', endTime: '11:30', label: '10h30 - 11h30' },
  { id: 'slot-5', startTime: '11:30', endTime: '12:30', label: '11h30 - 12h30' },
  { id: 'slot-6', startTime: '12:30', endTime: '13:30', label: '12h30 - 13h30' },
  { id: 'slot-7', startTime: '13:30', endTime: '14:30', label: '13h30 - 14h30' },
  { id: 'slot-8', startTime: '14:30', endTime: '15:30', label: '14h30 - 15h30' },
  { id: 'slot-9', startTime: '15:30', endTime: '16:30', label: '15h30 - 16h30' },
  { id: 'slot-10', startTime: '16:30', endTime: '17:30', label: '16h30 - 17h30' },
  { id: 'slot-11', startTime: '17:30', endTime: '18:30', label: '17h30 - 18h30' },
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
  className?: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  teacherId: string;
  teacherName?: string;
  room?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface TimetableState {
  academicYearId: string;
  classId?: string;
  teacherId?: string;
  slots: ScheduleSlotRecord[];
}
