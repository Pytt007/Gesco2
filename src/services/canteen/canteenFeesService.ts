import {
  CanteenFeeSchedule,
  CanteenFeeInput,
  CanteenLevelCode,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const levelNamesMap: Record<CanteenLevelCode, string> = {
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

const defaultLevelOrder: CanteenLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

// Stockage local mémoire
const localCanteenSchedulesStore: Map<string, CanteenFeeSchedule> = new Map();

export function clearCanteenSchedulesStore() {
  localCanteenSchedulesStore.clear();
}

/** Données par défaut pour l'année 2026-2027 */
function initDefaultCanteenSchedules(yearId: string = 'ay-2026') {
  if (localCanteenSchedulesStore.size > 0) return;

  const defaultRates: Record<CanteenLevelCode, number> = {
    PS: 120000,
    MS: 120000,
    GS: 120000,
    CP1: 130000,
    CP2: 130000,
    CE1: 135000,
    CE2: 135000,
    CM1: 140000,
    CM2: 140000,
  };

  defaultLevelOrder.forEach((lvl) => {
    const id = `canteen-${yearId}-${lvl.toLowerCase()}`;
    localCanteenSchedulesStore.set(id, {
      id,
      academicYearId: yearId,
      levelCode: lvl,
      levelName: levelNamesMap[lvl],
      annualRate: defaultRates[lvl],
      periodsCount: 3,
      totalAmount: defaultRates[lvl],
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });
}

export const canteenFeesService = {
  /**
   * Récupère tous les tarifs cantine pour une année scolaire
   */
  async getSchedulesByYear(academicYearId: string = 'ay-2026'): Promise<CanteenFeeSchedule[]> {
    initDefaultCanteenSchedules(academicYearId);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('canteen_fee_schedules')
          .select('*')
          .eq('academic_year_id', academicYearId)
          .eq('status', 'ACTIVE');

        if (!error && data && data.length > 0) {
          return data
            .map((d: any) => ({
              id: d.id,
              academicYearId: d.academic_year_id,
              levelCode: d.level_code as CanteenLevelCode,
              levelName: d.level_name || levelNamesMap[d.level_code as CanteenLevelCode] || d.level_code,
              annualRate: Number(d.annual_rate || 0),
              periodsCount: Number(d.periods_count || 3),
              totalAmount: Number(d.annual_rate || 0),
              status: d.status || 'ACTIVE',
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }))
            .sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));
        }
      }
    } catch {
      // Fallback local
    }

    const list = Array.from(localCanteenSchedulesStore.values()).filter(
      (s) => s.academicYearId === academicYearId && s.status === 'ACTIVE'
    );
    return list.sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));
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
    return { success: true, data: record, message: 'Tarif cantine créé avec succès.' };
  },

  /**
   * Modifie un tarif cantine
   */
  async updateSchedule(id: string, input: Partial<CanteenFeeInput>): Promise<ServiceResponse<CanteenFeeSchedule>> {
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
    return { success: true, data: updated, message: 'Tarif cantine mis à jour avec succès.' };
  },

  /**
   * Archive un tarif cantine
   */
  async archiveSchedule(id: string): Promise<ServiceResponse<boolean>> {
    const existing = localCanteenSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    localCanteenSchedulesStore.set(id, existing);

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

    const sourceTariffs = await this.getSchedulesByYear(sourceYearId);
    if (sourceTariffs.length === 0) {
      return { success: false, error: "Aucun tarif cantine trouvé pour l'année source." };
    }

    const duplicated: CanteenFeeSchedule[] = [];
    for (const src of sourceTariffs) {
      const newId = `canteen-${targetYearId}-${src.levelCode.toLowerCase()}`;
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

    return {
      success: true,
      data: duplicated,
      message: `${duplicated.length} tarifs cantine dupliqués avec succès.`,
    };
  },
};
