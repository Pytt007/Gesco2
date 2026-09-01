import {
  TransportLine,
  TransportLineInput,
  TransportLineStatus,
  TransportStop,
  TransportStopInput,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { transportVehicleService, transportDriverService } from './transportVehicleDriverService';
import { supabase } from '../common/supabaseClient';

// ─── Stockage local & Synchro Supabase ─────────────────────────────────────────

const lineStore: Map<string, TransportLine> = new Map();

export function clearTransportLineStore() {
  lineStore.clear();
  enrollmentCountByLine.clear();
}

// Compteur d'inscriptions par ligne (mis à jour par le service d'inscription)
const enrollmentCountByLine: Map<string, number> = new Map();

async function syncLinesFromSupabase(): Promise<TransportLine[]> {
  try {
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'transport_lines_data')
      .maybeSingle();

    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      lineStore.clear();
      for (const item of settingsRow.data) {
        lineStore.set(item.id, item);
        enrollmentCountByLine.set(item.id, item.enrolledCount || 0);
      }
      return settingsRow.data;
    }
  } catch (err) {
    console.warn('[transportLineService] Supabase sync error:', err);
  }
  return Array.from(lineStore.values());
}

async function persistLinesToSupabase() {
  try {
    const list = Array.from(lineStore.values());
    await supabase
      .from('school_settings')
      .upsert({
        id: 'transport_lines_data',
        data: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[transportLineService] Supabase persist error:', err);
  }
}

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
    persistLinesToSupabase();
  }
}

// ─── Service Lignes ───────────────────────────────────────────────────────────

export const transportLineService = {

  /**
   * Récupère toutes les lignes pour une année scolaire
   */
  async getLinesByYear(academicYearId: string = 'ay-2026'): Promise<TransportLine[]> {
    await syncLinesFromSupabase();

    return Array.from(lineStore.values())
      .filter((l) => (!academicYearId || l.academicYearId === academicYearId) && l.status !== 'ARCHIVED')
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
    const initialStops: TransportStop[] = (input.stops || []).map((s, idx) => ({
      id: `stop-${Date.now()}-${idx}`,
      lineId: id,
      name: s.name.trim(),
      orderIndex: s.orderIndex ?? (idx + 1),
      pickupTime: s.pickupTime,
      dropoffTime: s.dropoffTime,
      zone: s.zone || input.zone.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

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
      stops: initialStops,
      academicYearId: input.academicYearId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    lineStore.set(id, line);
    enrollmentCountByLine.set(id, 0);
    await persistLinesToSupabase();
    return { success: true, data: line, message: 'Ligne de transport créée avec succès.' };
  },

  /**
   * Modifie une ligne de transport
   */
  async updateLine(id: string, input: Partial<TransportLineInput>): Promise<ServiceResponse<TransportLine>> {
    await syncLinesFromSupabase();
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
    await persistLinesToSupabase();
    return { success: true, data: updated, message: 'Ligne mise à jour avec succès.' };
  },

  /**
   * Change le statut d'une ligne (Suspendre / Réactiver / Archiver)
   */
  async setStatus(id: string, status: TransportLineStatus): Promise<ServiceResponse<TransportLine>> {
    await syncLinesFromSupabase();
    const existing = lineStore.get(id);
    if (!existing) return { success: false, error: 'Ligne introuvable.' };

    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    lineStore.set(id, updated);
    await persistLinesToSupabase();

    const labels: Record<TransportLineStatus, string> = {
      ACTIVE: 'Ligne réactivée.',
      SUSPENDED: 'Ligne suspendue.',
      OUT_OF_SERVICE: 'Ligne mise hors service.',
      ARCHIVED: 'Ligne archivée.',
    };
    return { success: true, data: updated, message: labels[status] };
  },

  /**
   * Récupère les arrêts d'une ligne ordonnés par orderIndex
   */
  async getStops(lineId: string): Promise<ServiceResponse<TransportStop[]>> {
    await syncLinesFromSupabase();
    const line = lineStore.get(lineId);
    if (!line) return { success: false, error: 'Ligne introuvable.' };

    const stops = (line.stops || []).sort((a, b) => a.orderIndex - b.orderIndex);
    return { success: true, data: stops };
  },

  /**
   * Ajoute un arrêt sur une ligne de transport
   */
  async addStop(lineId: string, input: TransportStopInput): Promise<ServiceResponse<TransportStop>> {
    await syncLinesFromSupabase();
    const line = lineStore.get(lineId);
    if (!line) return { success: false, error: 'Ligne introuvable.' };

    if (!input.name?.trim()) {
      return { success: false, error: "Le nom de l'arrêt est obligatoire." };
    }

    if (input.orderIndex !== undefined && input.orderIndex <= 0) {
      return { success: false, error: "L'ordre de passage doit être un nombre strictement positif (> 0)." };
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (input.pickupTime && !timeRegex.test(input.pickupTime)) {
      return { success: false, error: "Format d'heure de ramassage invalide (format attendu : HH:MM)." };
    }
    if (input.dropoffTime && !timeRegex.test(input.dropoffTime)) {
      return { success: false, error: "Format d'heure de dépose invalide (format attendu : HH:MM)." };
    }

    const currentStops = line.stops || [];
    const nextOrder = input.orderIndex ?? (currentStops.length > 0 ? Math.max(...currentStops.map((s) => s.orderIndex)) + 1 : 1);

    const newStop: TransportStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lineId,
      name: input.name.trim(),
      orderIndex: nextOrder,
      pickupTime: input.pickupTime,
      dropoffTime: input.dropoffTime,
      zone: input.zone?.trim() || line.zone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    line.stops = [...currentStops, newStop].sort((a, b) => a.orderIndex - b.orderIndex);
    line.updatedAt = new Date().toISOString();
    lineStore.set(lineId, line);
    await persistLinesToSupabase();

    return { success: true, data: newStop, message: 'Arrêt ajouté avec succès.' };
  },

  /**
   * Modifie un arrêt existant
   */
  async updateStop(lineId: string, stopId: string, updates: Partial<TransportStopInput>): Promise<ServiceResponse<TransportStop>> {
    await syncLinesFromSupabase();
    const line = lineStore.get(lineId);
    if (!line) return { success: false, error: 'Ligne introuvable.' };

    const currentStops = line.stops || [];
    const stopIndex = currentStops.findIndex((s) => s.id === stopId);
    if (stopIndex === -1) return { success: false, error: 'Arrêt introuvable sur cette ligne.' };

    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, error: "Le nom de l'arrêt ne peut pas être vide." };
    }

    if (updates.orderIndex !== undefined && updates.orderIndex <= 0) {
      return { success: false, error: "L'ordre de passage doit être un nombre strictement positif (> 0)." };
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (updates.pickupTime && !timeRegex.test(updates.pickupTime)) {
      return { success: false, error: "Format d'heure de ramassage invalide (format attendu : HH:MM)." };
    }
    if (updates.dropoffTime && !timeRegex.test(updates.dropoffTime)) {
      return { success: false, error: "Format d'heure de dépose invalide (format attendu : HH:MM)." };
    }

    const existingStop = currentStops[stopIndex];
    const updatedStop: TransportStop = {
      ...existingStop,
      name: updates.name?.trim() ?? existingStop.name,
      orderIndex: updates.orderIndex ?? existingStop.orderIndex,
      pickupTime: updates.pickupTime ?? existingStop.pickupTime,
      dropoffTime: updates.dropoffTime ?? existingStop.dropoffTime,
      zone: updates.zone?.trim() ?? existingStop.zone,
      updatedAt: new Date().toISOString(),
    };

    currentStops[stopIndex] = updatedStop;
    line.stops = currentStops.sort((a, b) => a.orderIndex - b.orderIndex);
    line.updatedAt = new Date().toISOString();
    lineStore.set(lineId, line);
    await persistLinesToSupabase();

    return { success: true, data: updatedStop, message: 'Arrêt mis à jour avec succès.' };
  },

  /**
   * Supprime un arrêt d'une ligne
   */
  async removeStop(lineId: string, stopId: string): Promise<ServiceResponse<boolean>> {
    await syncLinesFromSupabase();
    const line = lineStore.get(lineId);
    if (!line) return { success: false, error: 'Ligne introuvable.' };

    const currentStops = line.stops || [];
    const filtered = currentStops.filter((s) => s.id !== stopId);
    if (filtered.length === currentStops.length) {
      return { success: false, error: 'Arrêt introuvable.' };
    }

    line.stops = filtered;
    line.updatedAt = new Date().toISOString();
    lineStore.set(lineId, line);
    await persistLinesToSupabase();

    return { success: true, data: true, message: 'Arrêt supprimé avec succès.' };
  },
};
