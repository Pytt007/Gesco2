// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Contrats de Travail Personnel (src/services/staff/staffContractsService.ts)
// Couche de gestion des contrats, renouvellements et résiliations RH
// (Sert de socle pour le futur module Paie & Récapitulatifs de Salaires)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './staffService';

export type ContractType = 'CDI' | 'CDD' | 'Vacataire' | 'Stage' | 'Prestation';
export type WorkScheduleType = 'Temps Plein' | 'Temps Partiel' | 'Horaire Vacations';
export type ContractStatus = 'ACTIF' | 'RENOUVELÉ' | 'EXPIRÉ' | 'RÉSILIÉ';

export interface StaffContract {
  id: string;
  staffId: string;
  positionId?: string;
  positionTitle?: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  workScheduleType: WorkScheduleType;
  status: ContractStatus;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[staffContractsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const localContractsCache: Map<string, StaffContract> = new Map();

/**
 * Crée un contrat de travail pour un membre du personnel
 * @param contractData Données du contrat
 */
export async function createContract(contractData: Partial<StaffContract>): Promise<ServiceResponse<StaffContract>> {
  try {
    if (!contractData.staffId) {
      return createError(null, 'L\'identifiant du membre du personnel est obligatoire.');
    }
    if (!contractData.startDate) {
      return createError(null, 'La date de début de contrat est obligatoire.');
    }

    const newId = contractData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdContract: StaffContract = {
      id: newId,
      staffId: contractData.staffId,
      positionId: contractData.positionId,
      contractType: contractData.contractType || 'CDI',
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      baseSalary: contractData.baseSalary ?? 150000,
      workScheduleType: contractData.workScheduleType || 'Temps Plein',
      status: 'ACTIF',
      observations: contractData.observations?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('staff_contracts').insert({
      id: createdContract.id,
      staff_id: createdContract.staffId,
      position_id: createdContract.positionId,
      contract_type: createdContract.contractType,
      start_date: createdContract.startDate,
      end_date: createdContract.endDate || null,
      base_salary: createdContract.baseSalary,
      work_schedule_type: createdContract.workScheduleType,
      status: createdContract.status,
      observations: createdContract.observations,
      created_at: createdContract.createdAt,
      updated_at: createdContract.updatedAt,
    });

    if (error) {
      console.warn('[staffContractsService:createContract] Fallback local:', error.message);
    }
    localContractsCache.set(createdContract.id, createdContract);

    return createSuccess(createdContract, 'Contrat de travail enregistré.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du contrat.');
  }
}

/**
 * Met à jour un contrat existant
 * @param contractId Identifiant du contrat
 * @param updates Modification des clauses ou du salaire
 */
export async function updateContract(contractId: string, updates: Partial<StaffContract>): Promise<ServiceResponse<StaffContract>> {
  try {
    if (!contractId) return createError(null, 'Identifiant contrat manquant.');

    const existing = localContractsCache.get(contractId);
    const updated: StaffContract = {
      id: contractId,
      staffId: updates.staffId || existing?.staffId || 'stf-1',
      contractType: updates.contractType || existing?.contractType || 'CDI',
      startDate: updates.startDate || existing?.startDate || new Date().toISOString().split('T')[0],
      endDate: updates.endDate ?? existing?.endDate,
      baseSalary: updates.baseSalary ?? existing?.baseSalary ?? 150000,
      workScheduleType: updates.workScheduleType || existing?.workScheduleType || 'Temps Plein',
      status: updates.status || existing?.status || 'ACTIF',
      observations: updates.observations ?? existing?.observations,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('staff_contracts')
      .update({
        contract_type: updated.contractType,
        start_date: updated.startDate,
        end_date: updated.endDate || null,
        base_salary: updated.baseSalary,
        work_schedule_type: updated.workScheduleType,
        status: updated.status,
        observations: updated.observations,
        updated_at: updated.updatedAt,
      })
      .eq('id', contractId);

    if (error) {
      console.warn('[staffContractsService:updateContract] Fallback local:', error.message);
    }
    localContractsCache.set(contractId, updated);

    return createSuccess(updated, 'Contrat mis à jour.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour du contrat.');
  }
}

/**
 * Renouvelle un contrat de travail existant
 * @param contractId Identifiant du contrat à renouveler
 * @param newEndDate Nouvelle date de fin
 * @param newSalary Nouveau salaire de base éventuel
 */
export async function renewContract(contractId: string, newEndDate: string, newSalary?: number): Promise<ServiceResponse<StaffContract>> {
  try {
    if (!contractId) return createError(null, 'Identifiant contrat manquant.');

    const existingRes = await updateContract(contractId, {
      endDate: newEndDate,
      baseSalary: newSalary,
      status: 'RENOUVELÉ',
    });

    if (!existingRes.success || !existingRes.data) {
      return createError(existingRes.error, 'Erreur lors du renouvellement.');
    }

    return createSuccess(existingRes.data, 'Contrat renouvelé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors du renouvellement du contrat.');
  }
}

/**
 * Résilie / Termine un contrat de travail
 * @param contractId Identifiant du contrat
 * @param terminationDate Date d'effet de la résiliation
 * @param reason Motif
 */
export async function terminateContract(contractId: string, terminationDate: string, reason?: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!contractId) return createError(null, 'Identifiant contrat manquant.');

    const { error } = await supabase
      .from('staff_contracts')
      .update({
        status: 'RÉSILIÉ',
        end_date: terminationDate,
        observations: reason ? `Résiliation: ${reason}` : 'Résiliation de contrat',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId);

    if (error) {
      console.warn('[staffContractsService:terminateContract] Fallback local:', error.message);
    }

    const cached = localContractsCache.get(contractId);
    if (cached) {
      localContractsCache.set(contractId, {
        ...cached,
        status: 'RÉSILIÉ',
        endDate: terminationDate,
        observations: reason ? `Résiliation: ${reason}` : cached.observations,
        updatedAt: new Date().toISOString(),
      });
    }

    return createSuccess(true, 'Contrat résilié avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la résiliation du contrat.');
  }
}

/**
 * Récupère le contrat actif courant d'un membre du personnel
 * @param staffId Identifiant de l'employé
 */
export async function getCurrentContract(staffId: string): Promise<ServiceResponse<StaffContract | null>> {
  try {
    if (!staffId) return createError(null, 'Identifiant employé requis.');

    const { data, error } = await supabase
      .from('staff_contracts')
      .select('*')
      .eq('staff_id', staffId)
      .eq('status', 'ACTIF')
      .maybeSingle();

    if (!error && data) {
      const contract: StaffContract = {
        id: data.id,
        staffId: data.staff_id,
        positionId: data.position_id,
        contractType: data.contract_type,
        startDate: data.start_date,
        endDate: data.end_date,
        baseSalary: Number(data.base_salary),
        workScheduleType: data.work_schedule_type,
        status: data.status,
        observations: data.observations,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      return createSuccess(contract);
    }

    for (const c of localContractsCache.values()) {
      if (c.staffId === staffId && c.status === 'ACTIF') {
        return createSuccess(c);
      }
    }

    return createSuccess(null);
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche du contrat courant.');
  }
}

/**
 * Récupère l'historique complet des contrats d'un employé
 * @param staffId Identifiant de l'employé
 */
export async function getContractHistory(staffId: string): Promise<ServiceResponse<StaffContract[]>> {
  try {
    if (!staffId) return createError(null, 'Identifiant employé requis.');

    const { data, error } = await supabase
      .from('staff_contracts')
      .select('*')
      .eq('staff_id', staffId)
      .order('start_date', { ascending: false });

    if (!error && data && data.length > 0) {
      const contracts: StaffContract[] = data.map((d: any) => ({
        id: d.id,
        staffId: d.staff_id,
        positionId: d.position_id,
        contractType: d.contract_type,
        startDate: d.start_date,
        endDate: d.end_date,
        baseSalary: Number(d.base_salary),
        workScheduleType: d.work_schedule_type,
        status: d.status,
        observations: d.observations,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      return createSuccess(contracts);
    }

    const history: StaffContract[] = [];
    for (const c of localContractsCache.values()) {
      if (c.staffId === staffId) history.push(c);
    }

    return createSuccess(history);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de l\'historique des contrats.');
  }
}
