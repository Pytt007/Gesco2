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

function mapContract(row: any): StaffContract {
  const details = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};
  return {
    ...details,
    id: row.id,
    staffId: row.staff_id,
    contractType: row.contract_type,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    baseSalary: Number(row.salary ?? 0),
    workScheduleType: details.workScheduleType || 'Temps Plein',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function saveContract(contract: StaffContract, create: boolean): Promise<void> {
  const row = {
    id: contract.id, staff_id: contract.staffId, contract_type: contract.contractType,
    start_date: contract.startDate, end_date: contract.endDate || null,
    status: contract.status, salary: contract.baseSalary, data: contract,
    updated_at: contract.updatedAt || new Date().toISOString(),
  };
  const mutation = create ? supabase.from('staff_contracts').insert(row) :
    supabase.from('staff_contracts').update(row).eq('id', contract.id);
  const { data, error } = await mutation.select('id').single();
  if (error || data?.id !== contract.id) throw new Error(error?.message || 'Enregistrement du contrat non confirmé par Neon.');
}

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
      baseSalary: contractData.baseSalary ?? 0,
      workScheduleType: contractData.workScheduleType || 'Temps Plein',
      status: 'ACTIF',
      observations: contractData.observations?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    await saveContract(createdContract, true);

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

    const { data: row, error: readError } = await supabase.from('staff_contracts').select('*').eq('id', contractId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) return createError(null, 'Contrat introuvable.');
    const existing = mapContract(row);
    const updated: StaffContract = {
      ...existing, ...updates,
      id: contractId,
      staffId: existing.staffId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await saveContract(updated, false);

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

    const result = await updateContract(contractId, {
      status: 'RÉSILIÉ', endDate: terminationDate,
      observations: reason ? `Résiliation: ${reason}` : 'Résiliation de contrat',
    });
    if (!result.success) return createError(result.error, 'Résiliation impossible.');

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

    const history = await getContractHistory(staffId);
    if (!history.success || !history.data) return createError(history.error, 'Lecture du contrat impossible.');
    return createSuccess(history.data.find((contract) => contract.status === 'ACTIF' || contract.status === 'RENOUVELÉ') || null);
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

    if (error) throw new Error(error.message);
    return createSuccess((data || []).map(mapContract));
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de l\'historique des contrats.');
  }
}
