/**
 * GESCO — Service Véhicules & Chauffeurs Transport
 */

import {
  TransportVehicle,
  TransportVehicleInput,
  TransportDriver,
  TransportDriverInput,
} from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { supabase } from '../common/supabaseClient';

// ─── Stockage local ───────────────────────────────────────────────────────────

const vehicleStore: Map<string, TransportVehicle> = new Map();
const driverStore: Map<string, TransportDriver> = new Map();

export function clearTransportVehiclesStore() { vehicleStore.clear(); }
export function clearTransportDriversStore()  { driverStore.clear(); }



// ─── Service Véhicules ────────────────────────────────────────────────────────

export const transportVehicleService = {

  async getAll(): Promise<TransportVehicle[]> {

    try {
      if (supabase) {
        const { data, error } = await supabase.from('transport_vehicles').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id, name: d.name, brand: d.brand, model: d.model,
            licensePlate: d.license_plate, capacity: Number(d.capacity),
            createdAt: d.created_at, updatedAt: d.updated_at,
          }));
        }
      }
    } catch { /* Fallback local */ }

    return Array.from(vehicleStore.values());
  },

  async create(input: TransportVehicleInput): Promise<ServiceResponse<TransportVehicle>> {

    if (!input.name.trim()) return { success: false, error: 'Le nom du véhicule est obligatoire.' };
    if (!input.licensePlate.trim()) return { success: false, error: "L'immatriculation est obligatoire." };
    if (input.capacity <= 0) return { success: false, error: 'La capacité doit être supérieure à 0.' };

    // Immatriculation unique
    const existing = Array.from(vehicleStore.values());
    if (existing.some((v) => v.licensePlate.toLowerCase() === input.licensePlate.trim().toLowerCase())) {
      return { success: false, error: `L'immatriculation ${input.licensePlate} est déjà enregistrée.` };
    }

    const id = `veh-${Date.now()}`;
    const vehicle: TransportVehicle = {
      id,
      name: input.name.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      licensePlate: input.licensePlate.trim().toUpperCase(),
      capacity: Number(input.capacity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vehicleStore.set(id, vehicle);
    return { success: true, data: vehicle, message: 'Véhicule enregistré avec succès.' };
  },

  async update(id: string, input: Partial<TransportVehicleInput>): Promise<ServiceResponse<TransportVehicle>> {
    const existing = vehicleStore.get(id);
    if (!existing) return { success: false, error: 'Véhicule introuvable.' };

    if (input.capacity !== undefined && input.capacity <= 0) {
      return { success: false, error: 'La capacité doit être supérieure à 0.' };
    }

    // Immatriculation unique (hors lui-même)
    if (input.licensePlate) {
      const all = Array.from(vehicleStore.values());
      if (all.some((v) => v.id !== id && v.licensePlate.toLowerCase() === input.licensePlate!.trim().toLowerCase())) {
        return { success: false, error: `L'immatriculation ${input.licensePlate} est déjà utilisée.` };
      }
    }

    const updated: TransportVehicle = {
      ...existing,
      ...input,
      licensePlate: (input.licensePlate || existing.licensePlate).toUpperCase(),
      updatedAt: new Date().toISOString(),
    };
    vehicleStore.set(id, updated);
    return { success: true, data: updated, message: 'Véhicule mis à jour.' };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    if (!vehicleStore.has(id)) return { success: false, error: 'Véhicule introuvable.' };
    vehicleStore.delete(id);
    return { success: true, data: true, message: 'Véhicule supprimé.' };
  },
};

// ─── Service Chauffeurs ───────────────────────────────────────────────────────

export const transportDriverService = {

  async getAll(): Promise<TransportDriver[]> {

    try {
      if (supabase) {
        const { data, error } = await supabase.from('transport_drivers').select('*');
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id, name: d.name, phone: d.phone,
            createdAt: d.created_at, updatedAt: d.updated_at,
          }));
        }
      }
    } catch { /* Fallback local */ }

    return Array.from(driverStore.values());
  },

  async create(input: TransportDriverInput): Promise<ServiceResponse<TransportDriver>> {

    if (!input.name.trim()) return { success: false, error: 'Le nom du chauffeur est obligatoire.' };
    if (!input.phone.trim()) return { success: false, error: 'Le numéro de téléphone est obligatoire.' };

    const id = `drv-${Date.now()}`;
    const driver: TransportDriver = {
      id,
      name: input.name.trim(),
      phone: input.phone.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    driverStore.set(id, driver);
    return { success: true, data: driver, message: 'Chauffeur enregistré avec succès.' };
  },

  async update(id: string, input: Partial<TransportDriverInput>): Promise<ServiceResponse<TransportDriver>> {
    const existing = driverStore.get(id);
    if (!existing) return { success: false, error: 'Chauffeur introuvable.' };

    const updated: TransportDriver = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    driverStore.set(id, updated);
    return { success: true, data: updated, message: 'Chauffeur mis à jour.' };
  },

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    if (!driverStore.has(id)) return { success: false, error: 'Chauffeur introuvable.' };
    driverStore.delete(id);
    return { success: true, data: true, message: 'Chauffeur supprimé.' };
  },
};
