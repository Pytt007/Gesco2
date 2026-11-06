import { TransportVehicle, TransportVehicleInput, TransportDriver, TransportDriverInput } from './types';
import { ServiceResponse } from '../academic/academicYearsService';
import { readRows, insertRow, updateRow, deleteRow, ok, failure } from '../common/remoteRows';

// Compatibility for callers that used to clear an in-memory cache.
export function clearTransportVehiclesStore() {}
export function clearTransportDriversStore() {}
const vehicleFromRow = (r: any): TransportVehicle => ({
  id: r.id, name: r.name, brand: r.brand || '', model: r.model || '',
  licensePlate: r.license_plate, capacity: Number(r.capacity),
  createdAt: r.created_at, updatedAt: r.updated_at,
});
const driverFromRow = (r: any): TransportDriver => ({
  id: r.id, name: r.name, phone: r.phone, createdAt: r.created_at, updatedAt: r.updated_at,
});
function vehicleFields(input: Partial<TransportVehicleInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Le nom du véhicule est obligatoire.');
    row.name = input.name.trim();
  }
  if (input.licensePlate !== undefined) {
    if (!input.licensePlate.trim()) throw new Error("L'immatriculation est obligatoire.");
    row.license_plate = input.licensePlate.trim().toUpperCase();
  }
  if (input.capacity !== undefined) {
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) throw new Error('La capacité doit être un entier supérieur à 0.');
    row.capacity = input.capacity;
  }
  if (input.brand !== undefined) row.brand = input.brand.trim();
  if (input.model !== undefined) row.model = input.model.trim();
  return row;
}
function driverFields(input: Partial<TransportDriverInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('Le nom du chauffeur est obligatoire.');
    row.name = input.name.trim();
  }
  if (input.phone !== undefined) {
    if (!input.phone.trim()) throw new Error('Le numéro de téléphone est obligatoire.');
    row.phone = input.phone.trim();
  }
  if (input.licenseNumber !== undefined) row.license_number = input.licenseNumber.trim();
  return row;
}
export const transportVehicleService = {
  async getAll(): Promise<TransportVehicle[]> {
    return (await readRows('transport_vehicles')).map(vehicleFromRow);
  },
  async create(input: TransportVehicleInput): Promise<ServiceResponse<TransportVehicle>> {
    try { return ok(vehicleFromRow(await insertRow('transport_vehicles', vehicleFields(input))), 'Véhicule enregistré.'); }
    catch (error) { return failure(error); }
  },
  async update(id: string, input: Partial<TransportVehicleInput>): Promise<ServiceResponse<TransportVehicle>> {
    try { return ok(vehicleFromRow(await updateRow('transport_vehicles', id, { ...vehicleFields(input), updated_at: new Date().toISOString() })), 'Véhicule mis à jour.'); }
    catch (error) { return failure(error); }
  },
  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try { await deleteRow('transport_vehicles', id); return ok(true, 'Véhicule supprimé.'); }
    catch (error) { return failure(error); }
  },
};
export const transportDriverService = {
  async getAll(): Promise<TransportDriver[]> {
    return (await readRows('transport_drivers')).map(driverFromRow);
  },
  async create(input: TransportDriverInput): Promise<ServiceResponse<TransportDriver>> {
    try { return ok(driverFromRow(await insertRow('transport_drivers', driverFields(input))), 'Chauffeur enregistré.'); }
    catch (error) { return failure(error); }
  },
  async update(id: string, input: Partial<TransportDriverInput>): Promise<ServiceResponse<TransportDriver>> {
    try { return ok(driverFromRow(await updateRow('transport_drivers', id, { ...driverFields(input), updated_at: new Date().toISOString() })), 'Chauffeur mis à jour.'); }
    catch (error) { return failure(error); }
  },
  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try { await deleteRow('transport_drivers', id); return ok(true, 'Chauffeur supprimé.'); }
    catch (error) { return failure(error); }
  },
};
