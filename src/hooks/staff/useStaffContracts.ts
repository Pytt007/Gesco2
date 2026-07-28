// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useStaffContracts (src/hooks/staff/useStaffContracts.ts)
// Chargement du contrat actif, historique des contrats, renouvellement et résiliation
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentContract,
  getContractHistory,
  createContract as createContractService,
  updateContract as updateContractService,
  renewContract as renewContractService,
  terminateContract as terminateContractService,
  StaffContract,
} from '../../services/staff/staffContractsService';

export function useStaffContracts(staffId?: string) {
  const [currentContract, setCurrentContract] = useState<StaffContract | null>(null);
  const [contractHistory, setContractHistory] = useState<StaffContract[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchContractsData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, historyRes] = await Promise.all([
        getCurrentContract(id),
        getContractHistory(id),
      ]);

      if (currentRes.success) {
        setCurrentContract(currentRes.data || null);
      }
      if (historyRes.success && historyRes.data) {
        setContractHistory(historyRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des contrats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staffId) {
      fetchContractsData(staffId);
    }
  }, [staffId, fetchContractsData]);

  const createContract = useCallback(
    async (contractData: Partial<StaffContract>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await createContractService(contractData);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la création du contrat.');
          setSaving(false);
          return false;
        }
        setSuccess('Contrat de travail enregistré avec succès.');
        if (staffId) await fetchContractsData(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la création du contrat.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchContractsData]
  );

  const updateContract = useCallback(
    async (contractId: string, updates: Partial<StaffContract>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await updateContractService(contractId, updates);
        if (!res.success) {
          setError(res.error || 'Erreur de mise à jour du contrat.');
          setSaving(false);
          return false;
        }
        setSuccess('Contrat mis à jour.');
        if (staffId) await fetchContractsData(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur de mise à jour.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchContractsData]
  );

  const renewContract = useCallback(
    async (contractId: string, newEndDate: string, newSalary?: number): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await renewContractService(contractId, newEndDate, newSalary);
        if (!res.success) {
          setError(res.error || 'Erreur lors du renouvellement.');
          setSaving(false);
          return false;
        }
        setSuccess('Contrat renouvelé avec succès.');
        if (staffId) await fetchContractsData(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors du renouvellement.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchContractsData]
  );

  const terminateContract = useCallback(
    async (contractId: string, terminationDate: string, reason?: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await terminateContractService(contractId, terminationDate, reason);
        if (!res.success) {
          setError(res.error || 'Erreur lors de la résiliation.');
          setSaving(false);
          return false;
        }
        setSuccess('Contrat résilié.');
        if (staffId) await fetchContractsData(staffId);
        setSaving(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la résiliation.');
        setSaving(false);
        return false;
      }
    },
    [staffId, fetchContractsData]
  );

  return {
    currentContract,
    contractHistory,
    loading,
    saving,
    error,
    success,
    refresh: () => staffId && fetchContractsData(staffId),
    createContract,
    updateContract,
    renewContract,
    terminateContract,
  };
}
