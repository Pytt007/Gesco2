/**
 * GESCO — Service Présence du Personnel
 */

import {
  StaffAttendanceSheet,
  StaffAttendanceSheetInput,
  StaffAttendanceItem,
  StaffAttendanceStats,
  StaffAttendanceHistoryFilter,
  StaffAttendanceStatus,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Membres du personnel de démonstration (Vierge par défaut) ───────────────

const DEMO_STAFF_ROSTER: { id: string; matricule: string; firstName: string; lastName: string; role: string; phone: string; photoUrl?: string }[] = [];

// ─── Stockage Local (Feuilles de présence personnel) ─────────────────────────

const staffAttendanceStore: Map<string, StaffAttendanceSheet> = new Map(); // Clef : `date`

function initDemoData() {
  // Application 100% vierge
}



// ─── Service ─────────────────────────────────────────────────────────────────

export const staffAttendanceService = {

  /**
   * Récupère la liste des rôles / fonctions disponibles
   */
  getRoles(): string[] {
    const roles = new Set(DEMO_STAFF_ROSTER.map((s) => s.role));
    return Array.from(roles);
  },

  /**
   * Récupère la feuille de présence du personnel pour une date donnée.
   * Par défaut : tout le monde est marqué "Présent".
   */
  async getStaffAttendanceSheet(
    date: string,
    academicYearId: string = 'ay-2026'
  ): Promise<StaffAttendanceSheet> {
    initDemoData();

    if (staffAttendanceStore.has(date)) {
      return staffAttendanceStore.get(date)!;
    }

    // Initialisation automatique par défaut (Tout le personnel à "PRESENT")
    const defaultItems: StaffAttendanceItem[] = DEMO_STAFF_ROSTER.map((st) => ({
      staffId: st.id,
      matricule: st.matricule,
      firstName: st.firstName,
      lastName: st.lastName,
      role: st.role,
      phone: st.phone,
      status: 'PRESENT',
    }));

    const newSheet: StaffAttendanceSheet = {
      id: `sheet-staff-${date}`,
      academicYearId,
      date,
      items: defaultItems,
      createdBy: 'Responsable RH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return newSheet;
  },

  /**
   * Enregistre ou met à jour la feuille de présence du personnel (Règle d'unicité par date)
   */
  async saveStaffAttendanceSheet(input: StaffAttendanceSheetInput): Promise<ServiceResponse<StaffAttendanceSheet>> {
    initDemoData();

    if (!input.date) {
      return { success: false, error: 'La date est obligatoire.' };
    }

    const sheet: StaffAttendanceSheet = {
      id: staffAttendanceStore.has(input.date) ? staffAttendanceStore.get(input.date)!.id : `sheet-staff-${Date.now()}`,
      academicYearId: input.academicYearId || 'ay-2026',
      date: input.date,
      items: input.items,
      createdBy: input.createdBy || 'Responsable RH',
      createdAt: staffAttendanceStore.has(input.date) ? staffAttendanceStore.get(input.date)!.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    staffAttendanceStore.set(input.date, sheet);
    return {
      success: true,
      data: sheet,
      message: `Feuille de présence du personnel du ${input.date} enregistrée avec succès.`,
    };
  },

  /**
   * Récupère l'historique de présence avec filtres
   */
  async getStaffAttendanceHistory(filter: StaffAttendanceHistoryFilter = {}): Promise<StaffAttendanceSheet[]> {
    initDemoData();
    let sheets = Array.from(staffAttendanceStore.values());

    if (filter.date) {
      sheets = sheets.filter((s) => s.date === filter.date);
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      sheets = sheets.filter((s) =>
        s.items.some(
          (i) =>
            i.firstName.toLowerCase().includes(q) ||
            i.lastName.toLowerCase().includes(q) ||
            i.role.toLowerCase().includes(q) ||
            i.matricule.toLowerCase().includes(q)
        )
      );
    }

    return sheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * Calcul des statistiques du personnel (6 KPIs)
   */
  calculateStats(items: StaffAttendanceItem[]): StaffAttendanceStats {
    const totalStaff = items.length;
    const presentCount = items.filter((i) => i.status === 'PRESENT').length;
    const lateCount = items.filter((i) => i.status === 'LATE').length;
    const leaveCount = items.filter((i) => i.status === 'ON_LEAVE').length;
    const absentCount = items.filter((i) => i.status === 'ABSENT').length;
    const sickCount = items.filter((i) => i.status === 'SICK_LEAVE').length;

    // Le taux de présence inclut les présents et les retards
    const presenceRate = totalStaff > 0 ? Math.round(((presentCount + lateCount) / totalStaff) * 100) : 0;

    return {
      totalStaff,
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      sickCount,
      presenceRate,
    };
  },
};
