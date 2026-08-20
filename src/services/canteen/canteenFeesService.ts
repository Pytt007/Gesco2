import {
  CanteenFeeSchedule,
  CanteenFeeInput,
  CanteenLevelCode,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const levelNamesMap: Record<CanteenLevelCode, string> = {
  GARDERIE: 'Garderie',
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

const defaultLevelOrder: CanteenLevelCode[] = ['GARDERIE', 'PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

// Stockage local mémoire et synchro Supabase
const localCanteenSchedulesStore: Map<string, CanteenFeeSchedule> = new Map();

export function clearCanteenSchedulesStore() {
  localCanteenSchedulesStore.clear();
}

async function syncSchedulesFromSupabase(): Promise<CanteenFeeSchedule[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'canteen_fee_schedules')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      localCanteenSchedulesStore.clear();
      for (const item of settingsRow.data) {
        localCanteenSchedulesStore.set(item.id, item);
      }
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[canteenFeesService] Supabase sync error:', err);
  }
  return Array.from(localCanteenSchedulesStore.values());
}

async function persistSchedulesToSupabase() {
  try {
    const list = Array.from(localCanteenSchedulesStore.values());
    await supabase
      .from('school_settings')
      .upsert({
        id: 'canteen_fee_schedules',
        data: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[canteenFeesService] Supabase persist error:', err);
  }
}

export const canteenFeesService = {
  /**
   * Récupère tous les tarifs cantine pour une année scolaire
   */
  async getSchedulesByYear(academicYearId: string): Promise<CanteenFeeSchedule[]> {
    if (!academicYearId) return [];

    await syncSchedulesFromSupabase();

    return Array.from(localCanteenSchedulesStore.values())
      .filter((s) => s.academicYearId === academicYearId && s.status === 'ACTIVE')
      .sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));
  },

  /**
   * Récupère le tarif cantine d'un niveau pour une année scolaire
   */
  async getScheduleByLevel(academicYearId: string, levelCode: CanteenLevelCode): Promise<CanteenFeeSchedule | null> {
    const list = await this.getSchedulesByYear(academicYearId);
    return list.find((s) => s.levelCode === levelCode) || null;
  },

  /**
   * Crée un tarif cantine pour un niveau
   */
  async createSchedule(input: CanteenFeeInput): Promise<ServiceResponse<CanteenFeeSchedule>> {
    if (!input.academicYearId) {
      return { success: false, error: "L'année scolaire est obligatoire." };
    }
    if (input.annualRate < 0) {
      return { success: false, error: 'Le tarif annuel ne peut pas être négatif.' };
    }

    await syncSchedulesFromSupabase();

    const existingList = await this.getSchedulesByYear(input.academicYearId);
    if (existingList.some((s) => s.levelCode === input.levelCode)) {
      return { success: false, error: `Un tarif cantine existe déjà pour le niveau ${input.levelCode} sur cette année scolaire.` };
    }

    const periodsCount = input.periodsCount ?? 3;
    const id = `canteen-${input.academicYearId}-${input.levelCode.toLowerCase()}-${Date.now()}`;
    const levelName = input.levelName || levelNamesMap[input.levelCode] || input.levelCode;

    const record: CanteenFeeSchedule = {
      id,
      academicYearId: input.academicYearId,
      levelCode: input.levelCode,
      levelName,
      annualRate: Number(input.annualRate),
      periodsCount,
      totalAmount: Number(input.annualRate),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localCanteenSchedulesStore.set(id, record);
    await persistSchedulesToSupabase();

    return { success: true, data: record, message: 'Tarif cantine créé avec succès.' };
  },

  /**
   * Modifie un tarif cantine
   */
  async updateSchedule(id: string, input: Partial<CanteenFeeInput>): Promise<ServiceResponse<CanteenFeeSchedule>> {
    await syncSchedulesFromSupabase();
    const existing = localCanteenSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    if (input.annualRate !== undefined && input.annualRate < 0) {
      return { success: false, error: 'Le tarif annuel ne peut pas être négatif.' };
    }

    const annualRate = input.annualRate !== undefined ? Number(input.annualRate) : existing.annualRate;
    const periodsCount = input.periodsCount !== undefined ? input.periodsCount : existing.periodsCount;

    const updated: CanteenFeeSchedule = {
      ...existing,
      annualRate,
      periodsCount,
      totalAmount: annualRate,
      updatedAt: new Date().toISOString(),
    };

    localCanteenSchedulesStore.set(id, updated);
    await persistSchedulesToSupabase();

    return { success: true, data: updated, message: 'Tarif cantine mis à jour avec succès.' };
  },

  /**
   * Archive un tarif cantine
   */
  async archiveSchedule(id: string): Promise<ServiceResponse<boolean>> {
    await syncSchedulesFromSupabase();
    const existing = localCanteenSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    localCanteenSchedulesStore.set(id, existing);
    await persistSchedulesToSupabase();

    return { success: true, data: true, message: 'Tarif cantine archivé.' };
  },

  /**
   * Duplique les tarifs cantine de l'année précédente
   */
  async duplicatePreviousYearSchedules(
    sourceYearId: string,
    targetYearId: string
  ): Promise<ServiceResponse<CanteenFeeSchedule[]>> {
    if (!sourceYearId || !targetYearId) {
      return { success: false, error: 'Année source et année cible obligatoires.' };
    }

    await syncSchedulesFromSupabase();
    const sourceTariffs = await this.getSchedulesByYear(sourceYearId);
    if (sourceTariffs.length === 0) {
      return { success: false, error: "Aucun tarif cantine trouvé pour l'année source." };
    }

    const duplicated: CanteenFeeSchedule[] = [];
    for (const src of sourceTariffs) {
      const newId = `canteen-${targetYearId}-${src.levelCode.toLowerCase()}-${Date.now()}`;
      const copy: CanteenFeeSchedule = {
        ...src,
        id: newId,
        academicYearId: targetYearId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localCanteenSchedulesStore.set(newId, copy);
      duplicated.push(copy);
    }

    await persistSchedulesToSupabase();

    return {
      success: true,
      data: duplicated,
      message: `${duplicated.length} tarifs cantine dupliqués avec succès.`,
    };
  },
};
