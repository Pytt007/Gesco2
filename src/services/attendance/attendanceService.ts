/**
 * GESCO — Service Présences des élèves
 */

import {
  AttendanceSheet,
  AttendanceSheetInput,
  AttendanceRecordItem,
  AttendanceStats,
  AttendanceHistoryFilter,
  AttendanceStatus,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';
import { getClassroom } from '../academic/classroomsService';

import { statsCalculationService } from '../stats';

// ─── Stockage Local (Feuilles de présence) ────────────────────────────────────

const attendanceStore: Map<string, AttendanceSheet> = new Map(); // Clef : `classId_date`

export function clearAttendanceStore(): void {
  attendanceStore.clear();
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const attendanceService = {

  /**
   * Récupère la feuille de présence pour une classe et une date donnée.
   */
  async getAttendanceSheet(
    classId: string,
    date: string,
    academicYearId: string = 'ay-2026'
  ): Promise<AttendanceSheet> {
    const key = `${classId}_${date}`;

    if (attendanceStore.has(key)) {
      return attendanceStore.get(key)!;
    }

    // Récupération des vrais élèves de la classe depuis Supabase
    let roster: any[] = [];
    try {
      const { data: rows, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId);
      if (!error && Array.isArray(rows)) {
        roster = rows.map((row: any) => ({
          id: row.id,
          matricule: row.matricule || row.registration_number || `MAT-${row.id.slice(0, 6)}`,
          firstName: row.first_name || 'Élève',
          lastName: row.last_name || '',
        }));
      }
    } catch { /* Fallback roster vide */ }

    let className = 'Classe';
    try {
      const clsRes = await getClassroom(classId);
      if (clsRes.success && clsRes.data) {
        className = clsRes.data.name;
      }
    } catch { /* Fallback */ }

    const defaultItems: AttendanceRecordItem[] = roster.map((st) => ({
      studentId: st.id,
      matricule: st.matricule,
      firstName: st.firstName,
      lastName: st.lastName,
      status: 'PRESENT',
    }));

    const newSheet: AttendanceSheet = {
      id: `sheet-${classId}-${date}`,
      academicYearId,
      classId,
      className,
      date,
      items: defaultItems,
      createdBy: 'Enseignant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return newSheet;
  },


  /**
   * Enregistre ou met à jour la feuille de présence (Une seule feuille par classe et jour)
   */
  async saveAttendanceSheet(input: AttendanceSheetInput): Promise<ServiceResponse<AttendanceSheet>> {
    if (!input.classId || !input.date) {
      return { success: false, error: 'Classe et date obligatoires.' };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date) || isNaN(Date.parse(input.date))) {
      return { success: false, error: 'Format de date invalide. Utilisez AAAA-MM-JJ.' };
    }

    const sheetDate = new Date(input.date + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (sheetDate.getTime() > today.getTime()) {
      return { success: false, error: 'Impossible d\'enregistrer une feuille de présence pour une date future.' };
    }

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      return { success: false, error: 'La feuille de présence doit contenir au moins un élève.' };
    }

    const validStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'ABSENT_JUSTIFIED'];
    input.items.forEach((item) => {
      if (!validStatuses.includes(item.status)) {
        item.status = 'PRESENT';
      }
    });

    const key = `${input.classId}_${input.date}`;
    let className = 'Classe';
    try {
      const clsRes = await getClassroom(input.classId);
      if (clsRes.success && clsRes.data) {
        className = clsRes.data.name;
      }
    } catch { /* Fallback */ }

    const sheet: AttendanceSheet = {
      id: attendanceStore.has(key) ? attendanceStore.get(key)!.id : `sheet-${Date.now()}`,
      academicYearId: input.academicYearId || 'ay-2026',
      classId: input.classId,
      className,
      date: input.date,
      items: input.items,
      createdBy: input.createdBy || 'Enseignant',
      createdAt: attendanceStore.has(key) ? attendanceStore.get(key)!.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    attendanceStore.set(key, sheet);

    try {
      if (supabase && input.items && input.items.length > 0) {
        let resolvedClassId: string | null = null;
        if (input.classId) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.classId);
          if (isUUID) {
            resolvedClassId = input.classId;
          } else {
            try {
              const { data: clsRow } = await supabase.from('classes').select('id').limit(1).maybeSingle();
              if (clsRow) resolvedClassId = clsRow.id;
            } catch {}
          }
        }

        const rowsToInsert = input.items.map((item) => {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.studentId);
          return {
            id: crypto.randomUUID(),
            student_id: isUUID ? item.studentId : null,
            class_id: resolvedClassId,
            date: input.date,
            status: item.status || 'PRESENT',
            reason: item.observation || null,
            is_justified: item.status === 'ABSENT_JUSTIFIED',
            recorded_by: null,
          };
        });

        await supabase.from('student_attendance').insert(rowsToInsert);
      }
    } catch (err) {
      console.warn('[attendanceService] Supabase insert fallback:', err);
    }

    return {
      success: true,
      data: sheet,
      message: `Feuille de présence de la classe ${className} du ${input.date} enregistrée avec succès.`,
    };
  },

  /**
   * Récupère l'historique des feuilles de présence avec filtres
   */
  async getAttendanceHistory(filter: AttendanceHistoryFilter = {}): Promise<AttendanceSheet[]> {
    let sheets = Array.from(attendanceStore.values());

    if (filter.academicYearId) {
      sheets = sheets.filter((s) => s.academicYearId === filter.academicYearId);
    }

    if (filter.classId && filter.classId !== 'ALL') {
      sheets = sheets.filter((s) => s.classId === filter.classId);
    }

    if (filter.date) {
      sheets = sheets.filter((s) => s.date === filter.date);
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      sheets = sheets.filter(
        (s) =>
          s.className.toLowerCase().includes(q) ||
          s.items.some(
            (i) =>
              i.firstName.toLowerCase().includes(q) ||
              i.lastName.toLowerCase().includes(q) ||
              i.matricule.toLowerCase().includes(q)
          )
      );
    }

    return sheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * Calcul des statistiques de présence
   */
  calculateStats(items: AttendanceRecordItem[]): AttendanceStats {
    const totalStudents = items.length;
    const presentCount = items.filter((i) => i.status === 'PRESENT').length;
    const absentCount = items.filter((i) => i.status === 'ABSENT').length;
    const justifiedCount = items.filter((i) => i.status === 'ABSENT_JUSTIFIED').length;
    const presenceRate = statsCalculationService.calculateAttendanceRate(presentCount, totalStudents, 0);

    return {
      totalStudents,
      presentCount,
      absentCount,
      justifiedCount,
      presenceRate,
    };
  },
};
