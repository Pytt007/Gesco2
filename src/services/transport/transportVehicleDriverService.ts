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

// ─── Données de démo ──────────────────────────────────────────────────────────

function initDemoVehicles() {
  if (vehicleStore.size > 0) return;

  const demos: TransportVehicle[] = [
    {
      id: 'veh-001', name: 'Bus 01', brand: 'Mercedes', model: 'Sprinter 516',
      licensePlate: 'CI-1234-AB', capacity: 25,
      createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'veh-002', name: 'Bus 02', brand: 'Toyota', model: 'Coaster',
      licensePlate: 'CI-5678-CD', capacity: 30,
      createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'veh-003', name: 'Minibus 01', brand: 'Hyundai', model: 'H350',
      licensePlate: 'CI-9012-EF', capacity: 18,
      createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    },
  ];
  demos.forEach((v) => vehicleStore.set(v.id, v));
}

function initDemoDrivers() {
  if (driverStore.size > 0) return;

  const demos: TransportDriver[] = [
    { id: 'drv-001', name: 'KOUAMÉ Brou Félix', phone: '0701234567', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
    { id: 'drv-002', name: 'BAMBA Souleymane', phone: '0709876543', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
    { id: 'drv-003', name: 'YAO Kouassi Jean', phone: '0705556666', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
  ];
  demos.forEach((d) => driverStore.set(d.id, d));
}

// ─── Service Véhicules ────────────────────────────────────────────────────────

export const transportVehicleService = {

  async getAll(): Promise<TransportVehicle[]> {
    initDemoVehicles();

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
    initDemoVehicles();

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
    initDemoDrivers();

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
    initDemoDrivers();

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
