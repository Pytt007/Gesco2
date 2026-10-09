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
import { listStaff } from '../staff/staffService';

import { statsCalculationService } from '../stats';

const sheetKey = (academicYearId: string, date: string) => `staff_attendance:${academicYearId}:${date}`;

export function clearStaffAttendanceStore(): void {
  // Conservé pour les anciens appels ; Neon est la seule source de vérité.
}

async function readSheet(academicYearId: string, date: string): Promise<StaffAttendanceSheet | null> {
  const { data, error } = await supabase.from('school_settings').select('data')
    .eq('id', sheetKey(academicYearId, date)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!data.data || typeof data.data !== 'object' || Array.isArray(data.data)) throw new Error('Feuille de présence Neon invalide.');
  return data.data as StaffAttendanceSheet;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const staffAttendanceService = {

  /**
   * Récupère la liste des rôles / fonctions disponibles
   */
  getRoles(): string[] {
    return ['Enseignant', 'Directeur', 'Comptable', 'Secrétaire', 'Surveillant', 'Chauffeur', 'Cuisinier', 'Agent d\'entretien'];
  },

  /**
   * Récupère la feuille de présence du personnel pour une date donnée.
   * Par défaut : tout le personnel actif est marqué "Présent".
   */
  async getStaffAttendanceSheet(
    date: string,
    academicYearId: string
  ): Promise<StaffAttendanceSheet> {
    if (!academicYearId) throw new Error('Année scolaire requise.');
    const saved = await readSheet(academicYearId, date);
    if (saved) return saved;

    const staffRes = await listStaff({ pageSize: 500 });
    if (!staffRes.success || !staffRes.data) throw new Error(staffRes.error || 'Lecture du personnel impossible.');
    const defaultItems: StaffAttendanceItem[] = staffRes.data.staffMembers.map((st) => ({
        staffId: st.id,
        matricule: st.employeeNumber || `EMP-${st.id.slice(0, 6)}`,
        firstName: st.firstName,
        lastName: st.lastName,
        role: st.role || 'Personnel',
        phone: st.phonePrimary || '',
        status: 'PRESENT',
      }));

    const newSheet: StaffAttendanceSheet = {
      id: `sheet-staff-${date}`,
      academicYearId,
      date,
      items: defaultItems,
      createdBy: 'Administration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return newSheet;
  },

  /**
   * Enregistre ou met à jour la feuille de présence du personnel (Règle d'unicité par date)
   */
  async saveStaffAttendanceSheet(input: StaffAttendanceSheetInput): Promise<ServiceResponse<StaffAttendanceSheet>> {
    if (!input.date) {
      return { success: false, error: 'La date est obligatoire.' };
    }
    if (!input.academicYearId) return { success: false, error: 'Année scolaire requise.' };

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
      return { success: false, error: 'La feuille de présence doit contenir au moins un employé.' };
    }

    const validStatuses: StaffAttendanceStatus[] = ['PRESENT', 'LATE', 'ON_LEAVE', 'ABSENT', 'SICK_LEAVE'];
    input.items.forEach((item) => {
      if (!validStatuses.includes(item.status)) {
        item.status = 'PRESENT';
      }
      if (item.status === 'LATE' && item.arrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.arrivalTime)) {
        item.arrivalTime = undefined;
      }
    });

    let previous: StaffAttendanceSheet | null;
    try {
      previous = await readSheet(input.academicYearId, input.date);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Lecture Neon impossible.' };
    }

    const sheet: StaffAttendanceSheet = {
      id: previous?.id || `sheet-staff-${crypto.randomUUID()}`,
      academicYearId: input.academicYearId,
      date: input.date,
      items: input.items,
      createdBy: input.createdBy || 'Administration',
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const id = sheetKey(input.academicYearId, input.date);
      const { data, error } = await supabase.from('school_settings').upsert({
        id, data: sheet, updated_at: sheet.updatedAt,
      }).select('id').single();
      if (error || data?.id !== id) throw new Error(error?.message || 'Enregistrement de la feuille non confirmé par Neon.');
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Écriture Neon impossible.' };
    }
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
    const sheets: StaffAttendanceSheet[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('school_settings').select('data')
        .like('id', 'staff_attendance:%').range(offset, offset + 499);
      if (error) throw new Error(error.message);
      if (!Array.isArray(data)) throw new Error('Historique de présence Neon invalide.');
      for (const row of data) {
        if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) throw new Error('Feuille de présence Neon invalide.');
        sheets.push(row.data as StaffAttendanceSheet);
      }
      if (data.length < 500) break;
    }
    let filteredSheets = sheets;

    if (filter.date) {
      filteredSheets = filteredSheets.filter((s) => s.date === filter.date);
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      filteredSheets = filteredSheets.filter((s) =>
        s.items.some(
          (i) =>
            i.firstName.toLowerCase().includes(q) ||
            i.lastName.toLowerCase().includes(q) ||
            i.role.toLowerCase().includes(q) ||
            i.matricule.toLowerCase().includes(q)
        )
      );
    }

    return filteredSheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    const presenceRate = statsCalculationService.calculateAttendanceRate(presentCount + lateCount, totalStaff, 0);

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
