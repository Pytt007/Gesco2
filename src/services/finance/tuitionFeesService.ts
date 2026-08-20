import { TuitionFeeSchedule, TuitionFeeInput, TuitionLevelCode } from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const levelNamesMap: Record<TuitionLevelCode, string> = {
  PS: 'Petite Section (PS)',
  MS: 'Moyenne Section (MS)',
  GS: 'Grande Section (GS)',
  CP1: 'Cours Préparatoire 1 (CP1)',
  CP2: 'Cours Préparatoire 2 (CP2)',
  CE1: 'Cours Élémentaire 1 (CE1)',
  CE2: 'Cours Élémentaire 2 (CE2)',
  CM1: 'Cours Moyen 1 (CM1)',
  CM2: 'Cours Moyen 2 (CM2)',
};

const defaultLevelOrder: TuitionLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

const localFeeSchedulesStore: Map<string, TuitionFeeSchedule> = new Map();

export function clearFeeSchedulesStore() {
  localFeeSchedulesStore.clear();
}

async function syncFeeSchedulesFromSupabase(): Promise<TuitionFeeSchedule[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'tuition_fee_schedules')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      localFeeSchedulesStore.clear();
      for (const item of settingsRow.data) {
        localFeeSchedulesStore.set(item.id, item);
      }
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[tuitionFeesService] Supabase sync error:', err);
  }
  return Array.from(localFeeSchedulesStore.values());
}

async function persistFeeSchedulesToSupabase() {
  try {
    const list = Array.from(localFeeSchedulesStore.values());
    await supabase
      .from('school_settings')
      .upsert({
        id: 'tuition_fee_schedules',
        data: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[tuitionFeesService] Supabase persist error:', err);
  }
}

export const tuitionFeesService = {
  /**
   * Obtient l'ensemble des tarifs par niveau pour une année scolaire donnée
   */
  async getSchedulesByYear(academicYearId: string): Promise<TuitionFeeSchedule[]> {
    if (!academicYearId) return [];

    await syncFeeSchedulesFromSupabase();

    const localList = Array.from(localFeeSchedulesStore.values())
      .filter((s) => s.academicYearId === academicYearId && s.status === 'ACTIVE')
      .sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));

    if (localList.length > 0) {
      return localList;
    }

    // Default schedules if empty for initial setup
    const defaults = defaultLevelOrder.map((code) => {
      const isPrimary = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'].includes(code);
      const reg = isPrimary ? 50000 : 40000;
      const tui = isPrimary ? 250000 : 200000;
      const schedule: TuitionFeeSchedule = {
        id: `fee-${academicYearId}-${code.toLowerCase()}`,
        academicYearId,
        levelCode: code,
        levelName: levelNamesMap[code],
        registrationFee: reg,
        tuitionFee: tui,
        totalAnnualFee: reg + tui,
        allowFixedDiscount: true,
        allowPercentDiscount: true,
        maxDiscountPercent: 30,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localFeeSchedulesStore.set(schedule.id, schedule);
      return schedule;
    });

    await persistFeeSchedulesToSupabase();
    return defaults;
  },

  /**
   * Crée une nouvelle grille tarifaire pour un niveau et une année scolaire
   */
  async createSchedule(input: TuitionFeeInput): Promise<ServiceResponse<TuitionFeeSchedule>> {
    // 1. Validation de l'année scolaire
    if (!input.academicYearId) {
      return { success: false, error: 'L’année scolaire est obligatoire.' };
    }

    // 2. Validation des montants (Empêcher montant négatif)
    if (input.registrationFee < 0 || input.tuitionFee < 0) {
      return { success: false, error: 'Les frais ne peuvent pas être négatifs.' };
    }

    await syncFeeSchedulesFromSupabase();

    // 3. Empêcher les niveaux en double pour une même année scolaire
    const existingList = await this.getSchedulesByYear(input.academicYearId);
    if (existingList.some((s) => s.levelCode === input.levelCode)) {
      return { success: false, error: `Un tarif existe déjà pour le niveau ${input.levelCode} sur cette année scolaire.` };
    }

    const totalAnnualFee = Number(input.registrationFee) + Number(input.tuitionFee);
    const id = `fee-${input.academicYearId}-${input.levelCode.toLowerCase()}-${Date.now()}`;
    const levelName = input.levelName || levelNamesMap[input.levelCode] || input.levelCode;

    const record: TuitionFeeSchedule = {
      id,
      academicYearId: input.academicYearId,
      levelCode: input.levelCode,
      levelName,
      registrationFee: Number(input.registrationFee),
      tuitionFee: Number(input.tuitionFee),
      totalAnnualFee,
      allowFixedDiscount: input.allowFixedDiscount ?? true,
      allowPercentDiscount: input.allowPercentDiscount ?? true,
      maxDiscountPercent: input.maxDiscountPercent ?? 30,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localFeeSchedulesStore.set(id, record);
    await persistFeeSchedulesToSupabase();

    return { success: true, data: record, message: 'Tarif créé avec succès.' };
  },

  /**
   * Modifie les tarifs d'un niveau existant
   */
  async updateSchedule(id: string, input: Partial<TuitionFeeInput>): Promise<ServiceResponse<TuitionFeeSchedule>> {
    await syncFeeSchedulesFromSupabase();
    const existing = localFeeSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    if (input.registrationFee !== undefined && input.registrationFee < 0) {
      return { success: false, error: 'Le montant des frais d’inscription ne peut pas être négatif.' };
    }
    if (input.tuitionFee !== undefined && input.tuitionFee < 0) {
      return { success: false, error: 'Le montant des frais de scolarité ne peut pas être négatif.' };
    }

    const reg = input.registrationFee !== undefined ? Number(input.registrationFee) : existing.registrationFee;
    const tui = input.tuitionFee !== undefined ? Number(input.tuitionFee) : existing.tuitionFee;

    const updated: TuitionFeeSchedule = {
      ...existing,
      ...input,
      registrationFee: reg,
      tuitionFee: tui,
      totalAnnualFee: reg + tui,
      updatedAt: new Date().toISOString(),
    };

    localFeeSchedulesStore.set(id, updated);
    await persistFeeSchedulesToSupabase();

    return { success: true, data: updated, message: 'Tarif mis à jour avec succès.' };
  },

  /**
   * Archive une grille tarifaire de niveau
   */
  async archiveSchedule(id: string): Promise<ServiceResponse<boolean>> {
    await syncFeeSchedulesFromSupabase();
    const existing = localFeeSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    localFeeSchedulesStore.set(id, existing);
    await persistFeeSchedulesToSupabase();

    return { success: true, data: true, message: 'Tarif archivé.' };
  },

  /**
   * Duplique les tarifs de l'année précédente vers une nouvelle année scolaire
   */
  async duplicatePreviousYearSchedules(
    sourceYearId: string,
    targetYearId: string
  ): Promise<ServiceResponse<TuitionFeeSchedule[]>> {
    if (!sourceYearId || !targetYearId) {
      return { success: false, error: 'Année source et année cible obligatoires.' };
    }

    await syncFeeSchedulesFromSupabase();
    const sourceTariffs = await this.getSchedulesByYear(sourceYearId);
    if (sourceTariffs.length === 0) {
      return { success: false, error: 'Aucun tarif trouvé pour l’année source sélectionnée.' };
    }

    const duplicatedSchedules: TuitionFeeSchedule[] = [];

    for (const src of sourceTariffs) {
      const newId = `fee-${targetYearId}-${src.levelCode.toLowerCase()}-${Date.now()}`;
      const duplicated: TuitionFeeSchedule = {
        ...src,
        id: newId,
        academicYearId: targetYearId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localFeeSchedulesStore.set(newId, duplicated);
      duplicatedSchedules.push(duplicated);
    }

    await persistFeeSchedulesToSupabase();

    return {
      success: true,
      data: duplicatedSchedules,
      message: `${duplicatedSchedules.length} tarifs dupliqués vers la nouvelle année scolaire avec succès.`,
    };
  },
};
