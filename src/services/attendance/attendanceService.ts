/** Présences des élèves : Neon est la seule source de vérité. */
import type { AttendanceSheet, AttendanceSheetInput, AttendanceRecordItem, AttendanceStats, AttendanceHistoryFilter, AttendanceStatus } from './types';
import type { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';
import { getClassroom } from '../academic/classroomsService';
import { statsCalculationService } from '../stats';

type RosterStudent = { id: string; matricule: string; firstName: string; lastName: string };
type AttendanceRow = { student_id: string; date: string; status: AttendanceStatus; reason?: string | null; data?: Record<string, any>; created_at?: string; updated_at?: string };

// Kept for callers of the old facade; there is no client-side attendance store.
export function clearAttendanceStore(): void {}

async function readRoster(classId: string, academicYearId?: string): Promise<RosterStudent[]> {
  let assignmentsQuery = supabase.from('student_class_assignments').select('student_id').eq('classroom_id', classId).eq('status', 'Actif');
  if (academicYearId) assignmentsQuery = assignmentsQuery.eq('academic_year_id', academicYearId);
  const { data: assignments, error: assignmentError } = await assignmentsQuery;
  if (assignmentError) throw new Error(assignmentError.message);
  const ids = [...new Set((assignments || []).map((row: any) => row.student_id as string))];
  if (!ids.length) return [];
  const { data: students, error: studentError } = await supabase.from('students').select('id,matricule,data').in('id', ids);
  if (studentError) throw new Error(studentError.message);
  if (!students || students.length !== ids.length) throw new Error('La liste des élèves est incomplète. Actualisez avant de saisir les présences.');
  return students.map((row: any) => ({ id: row.id, matricule: row.matricule, firstName: row.data?.firstName || '', lastName: row.data?.lastName || '' }));
}

async function readAttendance(studentIds: string[], date?: string): Promise<AttendanceRow[]> {
  if (!studentIds.length) return [];
  let query = supabase.from('student_attendance').select('student_id,date,status,reason,data,created_at,updated_at').in('student_id', studentIds);
  if (date) query = query.eq('date', date);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as AttendanceRow[];
}

async function classNameFor(classId: string): Promise<string> {
  const result = await getClassroom(classId);
  if (!result.success || !result.data) throw new Error(result.error || 'Classe introuvable.');
  return result.data.name;
}

function buildSheet(classId: string, className: string, date: string, academicYearId: string, roster: RosterStudent[], rows: AttendanceRow[]): AttendanceSheet {
  const byStudent = new Map(rows.map(row => [row.student_id, row]));
  const items: AttendanceRecordItem[] = roster.map(student => {
    const row = byStudent.get(student.id);
    return { studentId: student.id, matricule: student.matricule, firstName: student.firstName, lastName: student.lastName,
      status: row?.status || 'PRESENT', observation: row?.reason || undefined };
  });
  const first = rows[0];
  return { id: `sheet-${classId}-${date}`, academicYearId, classId, className, date, items,
    createdBy: first?.data?.createdBy || 'Enseignant', createdAt: first?.created_at || new Date().toISOString(),
    updatedAt: first?.updated_at || new Date().toISOString() };
}

export const attendanceService = {
  async getAttendanceSheet(classId: string, date: string, academicYearId = ''): Promise<AttendanceSheet> {
    if (!classId) return buildSheet('', '', date, academicYearId, [], []);
    const [roster, className] = await Promise.all([readRoster(classId, academicYearId), classNameFor(classId)]);
    const rows = await readAttendance(roster.map(student => student.id), date);
    return buildSheet(classId, className, date, academicYearId, roster, rows);
  },

  async saveAttendanceSheet(input: AttendanceSheetInput): Promise<ServiceResponse<AttendanceSheet>> {
    try {
      if (!input.classId || !input.date) throw new Error('Classe et date obligatoires.');
      if (!input.academicYearId) throw new Error('Activez une année scolaire avant de saisir les présences.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) throw new Error('Format de date invalide. Utilisez AAAA-MM-JJ.');
      const today = new Date().toISOString().slice(0, 10);
      if (input.date > today) throw new Error('Impossible d\'enregistrer une feuille de présence pour une date future.');
      if (!Array.isArray(input.items) || !input.items.length) throw new Error('La feuille de présence doit contenir au moins un élève.');
      const validStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'ABSENT_JUSTIFIED'];
      if (input.items.some(item => !validStatuses.includes(item.status))) throw new Error('Statut de présence invalide.');

      const [roster, className] = await Promise.all([readRoster(input.classId, input.academicYearId), classNameFor(input.classId)]);
      const rosterIds = new Set(roster.map(student => student.id));
      const enteredIds = input.items.map(item => item.studentId);
      if (rosterIds.size !== enteredIds.length || new Set(enteredIds).size !== enteredIds.length || enteredIds.some(id => !rosterIds.has(id))) {
        throw new Error('La liste des élèves a changé. Actualisez la feuille avant de l\'enregistrer.');
      }
      const rows = input.items.map(item => ({ student_id: item.studentId, date: input.date, status: item.status,
        reason: item.observation || null, data: { classId: input.classId, academicYearId: input.academicYearId, createdBy: input.createdBy || 'Enseignant' } }));
      const { data, error } = await supabase.from('student_attendance').upsert(rows, { onConflict: 'student_id,date' }).select('student_id');
      if (error || !data || data.length !== rows.length) throw new Error(error?.message || 'Enregistrement des présences non confirmé par Neon.');
      const sheet = buildSheet(input.classId, className, input.date, input.academicYearId, roster,
        input.items.map(item => ({ student_id: item.studentId, date: input.date, status: item.status, reason: item.observation, data: { createdBy: input.createdBy } })));
      return { success: true, data: sheet, message: `Feuille de présence de la classe ${className} du ${input.date} enregistrée avec succès.` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getAttendanceHistory(filter: AttendanceHistoryFilter = {}): Promise<AttendanceSheet[]> {
    if (!filter.classId || filter.classId === 'ALL') return [];
    const [roster, className] = await Promise.all([readRoster(filter.classId, filter.academicYearId), classNameFor(filter.classId)]);
    const rows = await readAttendance(roster.map(student => student.id), filter.date);
    const dates = [...new Set(rows.map(row => row.date))];
    return dates.map(date => buildSheet(filter.classId!, className, date, filter.academicYearId || '', roster, rows.filter(row => row.date === date)))
      .filter(sheet => !filter.studentId || sheet.items.some(item => item.studentId === filter.studentId))
      .filter(sheet => { const q = filter.searchQuery?.toLowerCase().trim(); return !q || sheet.className.toLowerCase().includes(q) || sheet.items.some(item => [item.firstName, item.lastName, item.matricule].some(value => value.toLowerCase().includes(q))); })
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  calculateStats(items: AttendanceRecordItem[]): AttendanceStats {
    const totalStudents = items.length;
    const presentCount = items.filter(item => item.status === 'PRESENT').length;
    const absentCount = items.filter(item => item.status === 'ABSENT').length;
    const justifiedCount = items.filter(item => item.status === 'ABSENT_JUSTIFIED').length;
    return { totalStudents, presentCount, absentCount, justifiedCount,
      presenceRate: statsCalculationService.calculateAttendanceRate(presentCount, totalStudents, 0) };
  },
};
