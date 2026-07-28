/**
 * GESCO — Hook Transport : Lignes, Véhicules, Chauffeurs
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TransportLine,
  TransportLineInput,
  TransportLineStatus,
  TransportVehicle,
  TransportVehicleInput,
  TransportDriver,
  TransportDriverInput,
} from '../../services/transport/types';
import { transportLineService } from '../../services/transport/transportLineService';
import { transportVehicleService, transportDriverService } from '../../services/transport/transportVehicleDriverService';
import { useToast } from '../../context/ToastContext';

export function useTransportLines(academicYearId: string = 'ay-2026') {
  const [lines, setLines] = useState<TransportLine[]>([]);
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [drivers, setDrivers] = useState<TransportDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [linesData, vehiclesData, driversData] = await Promise.all([
        transportLineService.getLinesByYear(academicYearId),
        transportVehicleService.getAll(),
        transportDriverService.getAll(),
      ]);
      setLines(linesData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch {
      setError('Erreur lors du chargement des données transport.');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Lignes ──────────────────────────────────────────────────────────────────

  const createLine = useCallback(async (input: TransportLineInput) => {
    const result = await transportLineService.createLine(input);
    if (result.success) {
      showToast(result.message || 'Ligne créée.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur lors de la création.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const updateLine = useCallback(async (id: string, input: Partial<TransportLineInput>) => {
    const result = await transportLineService.updateLine(id, input);
    if (result.success) {
      showToast(result.message || 'Ligne mise à jour.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur lors de la mise à jour.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const setLineStatus = useCallback(async (id: string, status: TransportLineStatus) => {
    const result = await transportLineService.setStatus(id, status);
    if (result.success) {
      showToast(result.message || 'Statut mis à jour.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  // ── Véhicules ────────────────────────────────────────────────────────────────

  const createVehicle = useCallback(async (input: TransportVehicleInput) => {
    const result = await transportVehicleService.create(input);
    if (result.success) {
      showToast(result.message || 'Véhicule enregistré.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const updateVehicle = useCallback(async (id: string, input: Partial<TransportVehicleInput>) => {
    const result = await transportVehicleService.update(id, input);
    if (result.success) {
      showToast(result.message || 'Véhicule mis à jour.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const deleteVehicle = useCallback(async (id: string) => {
    const result = await transportVehicleService.delete(id);
    if (result.success) {
      showToast('Véhicule supprimé.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  // ── Chauffeurs ───────────────────────────────────────────────────────────────

  const createDriver = useCallback(async (input: TransportDriverInput) => {
    const result = await transportDriverService.create(input);
    if (result.success) {
      showToast(result.message || 'Chauffeur enregistré.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const updateDriver = useCallback(async (id: string, input: Partial<TransportDriverInput>) => {
    const result = await transportDriverService.update(id, input);
    if (result.success) {
      showToast('Chauffeur mis à jour.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  const deleteDriver = useCallback(async (id: string) => {
    const result = await transportDriverService.delete(id);
    if (result.success) {
      showToast('Chauffeur supprimé.', 'success');
      await fetchAll();
    } else {
      showToast(result.error || 'Erreur.', 'error');
    }
    return result;
  }, [fetchAll, showToast]);

  return {
    lines, vehicles, drivers,
    loading, error, fetchAll,
    createLine, updateLine, setLineStatus,
    createVehicle, updateVehicle, deleteVehicle,
    createDriver, updateDriver, deleteDriver,
  };
}
