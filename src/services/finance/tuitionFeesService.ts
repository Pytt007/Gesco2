import { TuitionFeeSchedule, TuitionFeeInput, TuitionLevelCode } from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

const levelNamesMap: Record<TuitionLevelCode, string> = {
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

const defaultLevelOrder: TuitionLevelCode[] = ['PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

export const defaultFeeTariffs: Record<TuitionLevelCode, { registrationFee: number; tuitionFee: number; levelName: string }> = {
  GARDERIE: { registrationFee: 0, tuitionFee: 0, levelName: 'Garderie' },
  PS:       { registrationFee: 0, tuitionFee: 0, levelName: 'Petite Section (PS)' },
  MS:       { registrationFee: 0, tuitionFee: 0, levelName: 'Moyenne Section (MS)' },
  GS:       { registrationFee: 0, tuitionFee: 0, levelName: 'Grande Section (GS)' },
  CP1:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Préparatoire 1 (CP1)' },
  CP2:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Préparatoire 2 (CP2)' },
  CE1:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Élémentaire 1 (CE1)' },
  CE2:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Élémentaire 2 (CE2)' },
  CM1:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Moyen 1 (CM1)' },
  CM2:      { registrationFee: 0, tuitionFee: 0, levelName: 'Cours Moyen 2 (CM2)' },
};

export function normalizeLevelCode(code?: string): TuitionLevelCode {
  if (!code) return 'CP1';
  const clean = code.trim().toUpperCase().replace(/^LVL-/, '').replace(/^LEVEL-/, '');
  if (clean in levelNamesMap) {
    return clean as TuitionLevelCode;
  }
  const found = defaultLevelOrder.find((l) => clean === l || clean.includes(l) || l.includes(clean));
  return found || 'CP1';
}

const localFeeSchedulesStore: Map<string, TuitionFeeSchedule> = new Map();

export function clearFeeSchedulesStore() {
  localFeeSchedulesStore.clear();
}

async function syncFeeSchedulesFromSupabase(): Promise<TuitionFeeSchedule[]> {
  const { data, error } = await supabase.from('tuition_fee_schedules').select('data');
  if (error) throw new Error(error.message);
  localFeeSchedulesStore.clear();
  for (const row of data || []) localFeeSchedulesStore.set(row.data.id, row.data);
  return Array.from(localFeeSchedulesStore.values());
}
async function persistFeeSchedulesToSupabase(records: TuitionFeeSchedule[]) {
  const { error } = await supabase.from('tuition_fee_schedules').upsert(records.map(data => ({ id: data.id, data })));
  if (error) throw new Error(error.message);
  for (const record of records) localFeeSchedulesStore.set(record.id, record);
}

export const tuitionFeesService = {
  /**
   * Obtient l'ensemble des tarifs par niveau pour une année scolaire donnée
   */
  async getSchedulesByYear(academicYearId: string): Promise<TuitionFeeSchedule[]> {
    if (!academicYearId) return [];

    await syncFeeSchedulesFromSupabase();

    let localList = Array.from(localFeeSchedulesStore.values())
      .filter((s) => s.academicYearId === academicYearId && s.status === 'ACTIVE')
      .sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));

    return localList;
  },

  /**
   * Trouve le tarif configuré pour un niveau spécifique (supporte 'lvl-cp1', 'CP1', etc.)
   */
  async getScheduleByLevel(levelCode: string, academicYearId: string): Promise<TuitionFeeSchedule | null> {
    const list = await this.getSchedulesByYear(academicYearId);
    const normalized = normalizeLevelCode(levelCode);
    return list.find((s) => s.levelCode === normalized || s.levelCode === levelCode || s.id === levelCode) || null;
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
    if (!Number.isFinite(input.registrationFee) || !Number.isFinite(input.tuitionFee) || input.registrationFee < 0 || input.tuitionFee < 0) {
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

    await persistFeeSchedulesToSupabase([record]);

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

    await persistFeeSchedulesToSupabase([updated]);

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
    await persistFeeSchedulesToSupabase([existing]);

    return { success: true, data: true, message: 'Tarif archivé.' };
  },

  /**
   * Supprime définitivement une grille tarifaire
   */
  async deleteSchedule(id: string): Promise<ServiceResponse<boolean>> {
    await syncFeeSchedulesFromSupabase();
    const existing = localFeeSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    const { error } = await supabase.from('tuition_fee_schedules').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    localFeeSchedulesStore.delete(id);

    return { success: true, data: true, message: 'Tarif supprimé avec succès.' };
  },

  /**
   * Réinitialise les tarifs aux valeurs officielles par défaut
   */
  async resetToDefaultSchedules(academicYearId: string): Promise<ServiceResponse<TuitionFeeSchedule[]>> {
    await syncFeeSchedulesFromSupabase();
    const now = new Date().toISOString();
    const generated: TuitionFeeSchedule[] = defaultLevelOrder.map((code) => {
      const item = defaultFeeTariffs[code];
      const reg = item.registrationFee;
      const tui = item.tuitionFee;
      return {
        id: `fee-${academicYearId}-${code.toLowerCase()}`,
        academicYearId,
        levelCode: code,
        levelName: item.levelName,
        registrationFee: reg,
        tuitionFee: tui,
        totalAnnualFee: reg + tui,
        allowFixedDiscount: true,
        allowPercentDiscount: true,
        maxDiscountPercent: 30,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
    });

    Array.from(localFeeSchedulesStore.values())
      .filter((s) => s.academicYearId === academicYearId)
      .forEach((s) => localFeeSchedulesStore.delete(s.id));

    const { error } = await supabase.rpc('replace_tuition_fees', { p_year: academicYearId, p_records: generated });
    if (error) return { success: false, error: error.message };
    await syncFeeSchedulesFromSupabase();

    return { success: true, data: generated, message: 'Grille tarifaire remise à zéro. Configurez les montants avant les inscriptions.' };
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
      duplicatedSchedules.push(duplicated);
    }

    await persistFeeSchedulesToSupabase(duplicatedSchedules);

    return {
      success: true,
      data: duplicatedSchedules,
      message: `${duplicatedSchedules.length} tarifs dupliqués vers la nouvelle année scolaire avec succès.`,
    };
  },
};
