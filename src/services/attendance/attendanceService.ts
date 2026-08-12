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

// ─── Élèves de démonstration par classe ──────────────────────────────────────

const MOCK_CLASS_STUDENTS: Record<string, { id: string; matricule: string; firstName: string; lastName: string; photoUrl?: string }[]> = {
  'cls-1': [
    { id: 'stu-101', matricule: 'GESCO-2026-001', firstName: 'Jean-Philippe', lastName: 'KOUASSI' },
    { id: 'stu-102', matricule: 'GESCO-2026-002', firstName: 'Marie', lastName: 'DOUAMBA' },
    { id: 'stu-103', matricule: 'GESCO-2026-003', firstName: 'Kouamé Patrick', lastName: 'YAO' },
    { id: 'stu-104', matricule: 'GESCO-2026-004', firstName: 'Fatimata', lastName: 'OUÉDRAOGO' },
    { id: 'stu-105', matricule: 'GESCO-2026-005', firstName: 'Brou Emmanuel', lastName: 'KONAN' },
    { id: 'stu-106', matricule: 'GESCO-2026-006', firstName: 'Eugénie', lastName: 'TANO' },
    { id: 'stu-107', matricule: 'GESCO-2026-007', firstName: 'Charles', lastName: 'BEDI' },
    { id: 'stu-108', matricule: 'GESCO-2026-008', firstName: 'Awa', lastName: 'DIABATÉ' },
  ],
  'cls-2': [
    { id: 'stu-201', matricule: 'GESCO-2026-020', firstName: 'Sékou', lastName: 'TRAORÉ' },
    { id: 'stu-202', matricule: 'GESCO-2026-021', firstName: 'Amina', lastName: 'KONE' },
    { id: 'stu-203', matricule: 'GESCO-2026-022', firstName: 'Brice', lastName: 'N\'GORAN' },
    { id: 'stu-204', matricule: 'GESCO-2026-023', firstName: 'Clarisse', lastName: 'BAMBA' },
  ],
};

const CLASS_NAMES: Record<string, string> = {
  'cls-1': 'CP1 A',
  'cls-2': 'CE1 A',
  'cls-3': 'CE2 B',
  'cls-4': 'CM2 A',
  'cls-5': '6ème A',
};

// ─── Stockage Local (Feuilles de présence) ────────────────────────────────────

const attendanceStore: Map<string, AttendanceSheet> = new Map(); // Clef : `classId_date`

function initDemoAttendance() {
  if (attendanceStore.size > 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const demoSheet: AttendanceSheet = {
    id: `sheet-demo-cp1a-${todayStr}`,
    academicYearId: 'ay-2026',
    classId: 'cls-1',
    className: 'CP1 A',
    date: todayStr,
    items: MOCK_CLASS_STUDENTS['cls-1'].map((st, idx) => ({
      studentId: st.id,
      matricule: st.matricule,
      firstName: st.firstName,
      lastName: st.lastName,
      status: idx === 3 ? 'ABSENT_JUSTIFIED' : idx === 6 ? 'ABSENT' : 'PRESENT',
      observation: idx === 3 ? 'Certificat médical transmis' : idx === 6 ? 'Absence non motivée' : undefined,
    })),
    createdBy: 'Enseignant CP1 A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  attendanceStore.set(`cls-1_${todayStr}`, demoSheet);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const attendanceService = {

  /**
   * Récupère la feuille de présence pour une classe et une date donnée.
   * Si aucune feuille n'existe encore, initialise automatiquement tous les élèves à "PRESENT".
   */
  async getAttendanceSheet(
    classId: string,
    date: string,
    academicYearId: string = 'ay-2026'
  ): Promise<AttendanceSheet> {
    initDemoAttendance();
    const key = `${classId}_${date}`;

    if (attendanceStore.has(key)) {
      return attendanceStore.get(key)!;
    }

    // Génération automatique par défaut (Tous les élèves marqués "Présent")
    const roster = MOCK_CLASS_STUDENTS[classId] || MOCK_CLASS_STUDENTS['cls-1'];
    const className = CLASS_NAMES[classId] || 'CP1 A';

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
    initDemoAttendance();

    if (!input.classId || !input.date) {
      return { success: false, error: 'Classe et date obligatoires.' };
    }

    const key = `${input.classId}_${input.date}`;
    const className = CLASS_NAMES[input.classId] || 'Classe';

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
        const rowsToInsert = input.items.map((item) => {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.studentId);
          return {
            id: crypto.randomUUID(),
            student_id: isUUID ? item.studentId : null,
            class_id: input.classId || null,
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
    initDemoAttendance();
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
    const presenceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return {
      totalStudents,
      presentCount,
      absentCount,
      justifiedCount,
      presenceRate,
    };
  },
};
