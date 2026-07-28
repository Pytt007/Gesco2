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

// Stockage mémoire local de secours
const localFeeSchedulesStore: Map<string, TuitionFeeSchedule> = new Map();

export function clearFeeSchedulesStore() {
  localFeeSchedulesStore.clear();
}

// Initialisation de données par défaut pour l'année courante 2026-2027
function initDefaultSchedules(yearId: string = 'ay-2026') {
  if (localFeeSchedulesStore.size > 0) return;

  const defaultTariffs: Record<TuitionLevelCode, { reg: number; tui: number }> = {
    PS: { reg: 50000, tui: 250000 },
    MS: { reg: 50000, tui: 250000 },
    GS: { reg: 50000, tui: 250000 },
    CP1: { reg: 60000, tui: 300000 },
    CP2: { reg: 60000, tui: 300000 },
    CE1: { reg: 65000, tui: 320000 },
    CE2: { reg: 65000, tui: 320000 },
    CM1: { reg: 70000, tui: 350000 },
    CM2: { reg: 70000, tui: 350000 },
  };

  defaultLevelOrder.forEach((lvl, idx) => {
    const id = `fee-${yearId}-${lvl.toLowerCase()}`;
    const t = defaultTariffs[lvl];
    localFeeSchedulesStore.set(id, {
      id,
      academicYearId: yearId,
      levelCode: lvl,
      levelName: levelNamesMap[lvl],
      registrationFee: t.reg,
      tuitionFee: t.tui,
      totalAnnualFee: t.reg + t.tui,
      allowFixedDiscount: true,
      allowPercentDiscount: true,
      maxDiscountPercent: 30,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });
}

export const tuitionFeesService = {
  /**
   * Obtient l'ensemble des tarifs par niveau pour une année scolaire donnée
   */
  async getSchedulesByYear(academicYearId: string = 'ay-2026'): Promise<TuitionFeeSchedule[]> {
    initDefaultSchedules(academicYearId);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('tuition_fee_schedules')
          .select('*')
          .eq('academic_year_id', academicYearId)
          .eq('status', 'ACTIVE');

        if (!error && data && data.length > 0) {
          return data
            .map((d: any) => ({
              id: d.id,
              academicYearId: d.academic_year_id,
              levelCode: d.level_code as TuitionLevelCode,
              levelName: d.level_name || levelNamesMap[d.level_code as TuitionLevelCode] || d.level_code,
              registrationFee: Number(d.registration_fee || 0),
              tuitionFee: Number(d.tuition_fee || 0),
              totalAnnualFee: Number(d.registration_fee || 0) + Number(d.tuition_fee || 0),
              allowFixedDiscount: Boolean(d.allow_fixed_discount ?? true),
              allowPercentDiscount: Boolean(d.allow_percent_discount ?? true),
              maxDiscountPercent: d.max_discount_percent ? Number(d.max_discount_percent) : 30,
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

    const list = Array.from(localFeeSchedulesStore.values()).filter(
      (s) => s.academicYearId === academicYearId && s.status === 'ACTIVE'
    );

    return list.sort((a, b) => defaultLevelOrder.indexOf(a.levelCode) - defaultLevelOrder.indexOf(b.levelCode));
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
    return { success: true, data: record, message: 'Tarif créé avec succès.' };
  },

  /**
   * Modifie les tarifs d'un niveau existant
   */
  async updateSchedule(id: string, input: Partial<TuitionFeeInput>): Promise<ServiceResponse<TuitionFeeSchedule>> {
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
    return { success: true, data: updated, message: 'Tarif mis à jour avec succès.' };
  },

  /**
   * Archive une grille tarifaire de niveau
   */
  async archiveSchedule(id: string): Promise<ServiceResponse<boolean>> {
    const existing = localFeeSchedulesStore.get(id);
    if (!existing) {
      return { success: false, error: 'Tarif introuvable.' };
    }

    existing.status = 'ARCHIVED';
    existing.updatedAt = new Date().toISOString();
    localFeeSchedulesStore.set(id, existing);

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

    const sourceTariffs = await this.getSchedulesByYear(sourceYearId);
    if (sourceTariffs.length === 0) {
      return { success: false, error: 'Aucun tarif trouvé pour l’année source sélectionnée.' };
    }

    const duplicatedSchedules: TuitionFeeSchedule[] = [];

    for (const src of sourceTariffs) {
      const newId = `fee-${targetYearId}-${src.levelCode.toLowerCase()}`;
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

    return {
      success: true,
      data: duplicatedSchedules,
      message: `${duplicatedSchedules.length} tarifs dupliqués vers la nouvelle année scolaire avec succès.`,
    };
  },
};
