/**
 * GESCO — Service Lignes de Transport
 */

import {
  TransportLine,
  TransportLineInput,
  TransportLineStatus,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { transportVehicleService, transportDriverService } from './transportVehicleDriverService';
import { supabase } from '../common/supabaseClient';

// ─── Stockage local ───────────────────────────────────────────────────────────

const lineStore: Map<string, TransportLine> = new Map();

export function clearTransportLineStore() { lineStore.clear(); }

// Compteur d'inscriptions par ligne (mis à jour par le service d'inscription)
const enrollmentCountByLine: Map<string, number> = new Map();

export function updateLineEnrollmentCount(lineId: string, delta: number) {
  const current = enrollmentCountByLine.get(lineId) ?? 0;
  const next = Math.max(0, current + delta);
  enrollmentCountByLine.set(lineId, next);

  // Recalcul des métriques de la ligne
  const line = lineStore.get(lineId);
  if (line) {
    line.enrolledCount = next;
    line.availableSeats = Math.max(0, line.vehicleCapacity - next);
    line.occupancyRate = line.vehicleCapacity > 0 ? Math.round((next / line.vehicleCapacity) * 100) : 0;
    line.updatedAt = new Date().toISOString();
    lineStore.set(lineId, line);
  }
}

// ─── Service Lignes ───────────────────────────────────────────────────────────

export const transportLineService = {

  /**
   * Récupère toutes les lignes pour une année scolaire
   */
  async getLinesByYear(academicYearId: string = 'ay-2026'): Promise<TransportLine[]> {

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('transport_lines')
          .select('*')
          .eq('academic_year_id', academicYearId)
          .neq('status', 'ARCHIVED');

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            zone: d.zone,
            vehicleId: d.vehicle_id,
            vehicleName: d.vehicle_name,
            vehicleLicensePlate: d.vehicle_license_plate,
            vehicleCapacity: Number(d.vehicle_capacity || 0),
            driverId: d.driver_id,
            driverName: d.driver_name,
            driverPhone: d.driver_phone,
            annualFee: Number(d.annual_fee || 0),
            periodsCount: Number(d.periods_count || 3),
            enrolledCount: Number(d.enrolled_count || 0),
            availableSeats: Number(d.vehicle_capacity || 0) - Number(d.enrolled_count || 0),
            occupancyRate: d.vehicle_capacity > 0
              ? Math.round((Number(d.enrolled_count) / Number(d.vehicle_capacity)) * 100)
              : 0,
            academicYearId: d.academic_year_id,
            status: d.status as TransportLineStatus,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      }
    } catch { /* Fallback local */ }

    return Array.from(lineStore.values())
      .filter((l) => l.academicYearId === academicYearId && l.status !== 'ARCHIVED')
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Récupère une ligne par son ID
   */
  getById(id: string): TransportLine | null {
    return lineStore.get(id) || null;
  },

  /**
   * Crée une nouvelle ligne de transport
   */
  async createLine(input: TransportLineInput): Promise<ServiceResponse<TransportLine>> {
    if (!input.name.trim()) {
      return { success: false, error: 'Le nom de la ligne est obligatoire.' };
    }
    if (!input.zone.trim()) {
      return { success: false, error: 'La zone desservie est obligatoire.' };
    }
    if (!input.vehicleId) {
      return { success: false, error: 'Un véhicule doit être sélectionné.' };
    }
    if (!input.driverId) {
      return { success: false, error: 'Un chauffeur doit être sélectionné.' };
    }
    if (input.annualFee < 0) {
      return { success: false, error: 'Le tarif annuel ne peut pas être négatif.' };
    }

    // Nom unique par année scolaire
    const existing = await this.getLinesByYear(input.academicYearId);
    if (existing.some((l) => l.name.toLowerCase() === input.name.trim().toLowerCase())) {
      return { success: false, error: `Une ligne nommée "${input.name}" existe déjà pour cette année scolaire.` };
    }

    // Résolution véhicule & chauffeur
    const allVehicles = await transportVehicleService.getAll();
    const vehicle = allVehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) return { success: false, error: 'Véhicule introuvable.' };

    const allDrivers = await transportDriverService.getAll();
    const driver = allDrivers.find((d) => d.id === input.driverId);
    if (!driver) return { success: false, error: 'Chauffeur introuvable.' };

    const id = `line-${Date.now()}`;
    const line: TransportLine = {
      id,
      name: input.name.trim(),
      zone: input.zone.trim(),
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleLicensePlate: vehicle.licensePlate,
      vehicleCapacity: vehicle.capacity,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      annualFee: Number(input.annualFee),
      periodsCount: input.periodsCount ?? 3,
      enrolledCount: 0,
      availableSeats: vehicle.capacity,
      occupancyRate: 0,
      academicYearId: input.academicYearId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    lineStore.set(id, line);
    enrollmentCountByLine.set(id, 0);
    return { success: true, data: line, message: 'Ligne de transport créée avec succès.' };
  },

  /**
   * Modifie une ligne de transport
   */
  async updateLine(id: string, input: Partial<TransportLineInput>): Promise<ServiceResponse<TransportLine>> {
    const existing = lineStore.get(id);
    if (!existing) return { success: false, error: 'Ligne introuvable.' };

    if (input.annualFee !== undefined && input.annualFee < 0) {
      return { success: false, error: 'Le tarif annuel ne peut pas être négatif.' };
    }

    // Vérifier la capacité si on change de véhicule
    let vehicleData = { id: existing.vehicleId, name: existing.vehicleName, licensePlate: existing.vehicleLicensePlate, capacity: existing.vehicleCapacity };
    if (input.vehicleId && input.vehicleId !== existing.vehicleId) {
      const allVehicles = await transportVehicleService.getAll();
      const newVehicle = allVehicles.find((v) => v.id === input.vehicleId);
      if (!newVehicle) return { success: false, error: 'Véhicule introuvable.' };
      if (newVehicle.capacity < existing.enrolledCount) {
        return { success: false, error: `La capacité du véhicule (${newVehicle.capacity}) est inférieure au nombre d'élèves déjà inscrits (${existing.enrolledCount}).` };
      }
      vehicleData = { id: newVehicle.id, name: newVehicle.name, licensePlate: newVehicle.licensePlate, capacity: newVehicle.capacity };
    }

    let driverData = { id: existing.driverId, name: existing.driverName, phone: existing.driverPhone };
    if (input.driverId && input.driverId !== existing.driverId) {
      const allDrivers = await transportDriverService.getAll();
      const newDriver = allDrivers.find((d) => d.id === input.driverId);
      if (!newDriver) return { success: false, error: 'Chauffeur introuvable.' };
      driverData = { id: newDriver.id, name: newDriver.name, phone: newDriver.phone };
    }

    const enrolledCount = existing.enrolledCount;
    const newCapacity = vehicleData.capacity;

    const updated: TransportLine = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      zone: input.zone?.trim() ?? existing.zone,
      vehicleId: vehicleData.id,
      vehicleName: vehicleData.name,
      vehicleLicensePlate: vehicleData.licensePlate,
      vehicleCapacity: newCapacity,
      driverId: driverData.id,
      driverName: driverData.name,
      driverPhone: driverData.phone,
      annualFee: input.annualFee !== undefined ? Number(input.annualFee) : existing.annualFee,
      periodsCount: input.periodsCount ?? existing.periodsCount,
      availableSeats: Math.max(0, newCapacity - enrolledCount),
      occupancyRate: newCapacity > 0 ? Math.round((enrolledCount / newCapacity) * 100) : 0,
      updatedAt: new Date().toISOString(),
    };

    lineStore.set(id, updated);
    return { success: true, data: updated, message: 'Ligne mise à jour avec succès.' };
  },

  /**
   * Change le statut d'une ligne (Suspendre / Réactiver / Archiver)
   */
  async setStatus(id: string, status: TransportLineStatus): Promise<ServiceResponse<TransportLine>> {
    const existing = lineStore.get(id);
    if (!existing) return { success: false, error: 'Ligne introuvable.' };

    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    lineStore.set(id, updated);

    const labels: Record<TransportLineStatus, string> = {
      ACTIVE: 'Ligne réactivée.',
      SUSPENDED: 'Ligne suspendue.',
      OUT_OF_SERVICE: 'Ligne mise hors service.',
      ARCHIVED: 'Ligne archivée.',
    };
    return { success: true, data: updated, message: labels[status] };
  },
};
