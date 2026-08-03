// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Personnel & RH (src/services/staff/staffService.ts)
// Couche de gestion centralisée des membres du personnel de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type StaffRole =
  | 'Directeur'
  | 'Directeur des Études'
  | 'Enseignant'
  | 'Comptable'
  | 'Secrétaire'
  | 'Censeur'
  | 'Surveillant'
  | 'Chauffeur'
  | 'Cuisinier'
  | 'Agent d\'entretien'
  | 'Autre';

export type StaffStatus =
  | 'Actif'
  | 'Inactif'
  | 'Suspendu'
  | 'Archivé'
  | 'En congé'
  | 'Arrêt maladie'
  | 'Contrat terminé';

export interface StaffMember {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: 'Masculin' | 'Féminin';
  role: StaffRole;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionTitle?: string;
  positionName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  phonePrimary: string;
  phoneSecondary?: string;
  address?: string;
  cityDistrict?: string;
  neighborhood?: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  avatarUrl?: string;
  baseSalary?: number;
  hireDate: string;
  status: StaffStatus;
  contractType?: 'CDI' | 'CDD' | 'Vacataire' | 'Stage' | 'Prestation';
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface StaffFilters {
  searchQuery?: string;
  name?: string;
  firstName?: string;
  employeeNumber?: string;
  positionId?: string;
  departmentId?: string;
  contractType?: string;
  role?: string;
  status?: StaffStatus | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'lastName' | 'firstName' | 'employeeNumber' | 'hireDate' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface StaffListResult {
  staffMembers: StaffMember[];
  staff?: StaffMember[];
  totalCount: number;
  page: number;
  totalPages: number;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[staffService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

const INITIAL_STAFF: StaffMember[] = [
  { id: 'stf-001', employeeNumber: 'EMP-2026-001', firstName: 'Marc', lastName: 'KOUASSI', gender: 'Masculin', role: 'Enseignant', phonePrimary: '0708091011', email: 'marc.kouassi@gesco.ci', baseSalary: 250000, hireDate: '2022-09-01', status: 'Actif' },
  { id: 'stf-002', employeeNumber: 'EMP-2026-002', firstName: 'Bakary', lastName: 'KONÉ', gender: 'Masculin', role: 'Enseignant', phonePrimary: '0506070809', email: 'bakary.kone@gesco.ci', baseSalary: 275000, hireDate: '2023-09-01', status: 'Actif' },
  { id: 'stf-003', employeeNumber: 'EMP-2026-003', firstName: 'Souleymane', lastName: 'OUÉDRAOGO', gender: 'Masculin', role: 'Enseignant', phonePrimary: '0102030405', email: 'souleymane.o@gesco.ci', baseSalary: 300000, hireDate: '2021-09-01', status: 'Actif' },
];

const localStaffCache: Map<string, StaffMember> = new Map(INITIAL_STAFF.map(s => [s.id, s]));

/**
 * Crée un nouveau membre du personnel avec contrôles d'unicité (Tél, Email) et validation salaire
 */
export async function createStaff(staffData: Partial<StaffMember>): Promise<ServiceResponse<StaffMember>> {
  try {
    if (!staffData.firstName?.trim() || !staffData.lastName?.trim()) {
      return createError(null, 'Le prénom et le nom sont obligatoires.');
    }
    if (!staffData.phonePrimary?.trim()) {
      return createError(null, 'Le téléphone principal est obligatoire.');
    }

    const phone = staffData.phonePrimary.trim();
    const email = staffData.email?.trim().toLowerCase();

    // ANOMALIE-MAJ-04 FIX: Contrôle d'unicité du Téléphone et de l'Email
    for (const member of localStaffCache.values()) {
      if (member.phonePrimary === phone) {
        return createError(null, `Un membre du personnel possède déjà le numéro de téléphone ${phone} (${member.lastName} ${member.firstName}).`);
      }
      if (email && member.email?.toLowerCase() === email) {
        return createError(null, `L'adresse email ${email} est déjà utilisée par un autre membre du personnel.`);
      }
    }

    // Validation Salaire
    if (staffData.baseSalary !== undefined && staffData.baseSalary < 0) {
      return createError(null, 'Le salaire de base ne peut pas être négatif.');
    }

    const newId = staffData.id || crypto.randomUUID();
    const created: StaffMember = {
      id: newId,
      employeeNumber: staffData.employeeNumber || `EMP-2026-${String(localStaffCache.size + 1).padStart(3, '0')}`,
      firstName: staffData.firstName.trim(),
      lastName: staffData.lastName.trim(),
      middleName: staffData.middleName?.trim() || '',
      gender: staffData.gender || 'Masculin',
      role: staffData.role || 'Enseignant',
      phonePrimary: phone,
      phoneSecondary: staffData.phoneSecondary?.trim() || '',
      email: email || '',
      address: staffData.address?.trim() || '',
      cityDistrict: staffData.cityDistrict?.trim() || 'Abidjan',
      avatarUrl: staffData.avatarUrl?.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
      baseSalary: staffData.baseSalary ?? 200000,
      hireDate: staffData.hireDate || new Date().toISOString().split('T')[0],
      status: staffData.status || 'Actif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStaffCache.set(newId, created);
    return createSuccess(created, 'Membre du personnel créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur de création du membre du personnel.');
  }
}

/**
 * Met à jour un membre du personnel
 */
export async function updateStaff(id: string, updates: Partial<StaffMember>): Promise<ServiceResponse<StaffMember>> {
  try {
    const cached = localStaffCache.get(id);
    if (!cached) return createError(null, 'Employé introuvable.');

    if (updates.baseSalary !== undefined && updates.baseSalary < 0) {
      return createError(null, 'Le salaire de base ne peut pas être négatif.');
    }

    const updated = { ...cached, ...updates, updatedAt: new Date().toISOString() };
    localStaffCache.set(id, updated);
    return createSuccess(updated, 'Mise à jour réussie.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour.');
  }
}

export async function archiveStaff(id: string): Promise<ServiceResponse<boolean>> {
  const cached = localStaffCache.get(id);
  if (cached) localStaffCache.set(id, { ...cached, status: 'Archivé' });
  return createSuccess(true, 'Archivé.');
}

export async function restoreStaff(id: string): Promise<ServiceResponse<boolean>> {
  const cached = localStaffCache.get(id);
  if (cached) localStaffCache.set(id, { ...cached, status: 'Actif' });
  return createSuccess(true, 'Restauré.');
}

export async function getStaffById(id: string): Promise<ServiceResponse<StaffMember>> {
  const cached = localStaffCache.get(id);
  if (cached) return createSuccess(cached);
  return createError(null, 'Introuvable.');
}

export async function listStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  try {
    const { page = 1, pageSize = 50, searchQuery, role = 'all', status = 'all', sortBy = 'lastName', sortOrder = 'asc' } = filters;
    let rawList = Array.from(localStaffCache.values());

    if (role && role !== 'all') {
      rawList = rawList.filter((s) => s.role === role || s.role?.toLowerCase().includes(role.toLowerCase()));
    }

    if (status !== 'all') {
      rawList = rawList.filter((s) => s.status === status);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.employeeNumber.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.phonePrimary.includes(q)
      );
    }

    // ANOMALIE-MIN-01 FIX: Tri par rôle/fonction
    rawList.sort((a, b) => {
      let valA = a.lastName;
      let valB = b.lastName;
      if (sortBy === 'firstName') { valA = a.firstName; valB = b.firstName; }
      else if (sortBy === 'employeeNumber') { valA = a.employeeNumber; valB = b.employeeNumber; }
      else if (sortBy === 'hireDate') { valA = a.hireDate; valB = b.hireDate; }
      else if (sortBy === 'role') { valA = a.role; valB = b.role; }
      const comp = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comp : -comp;
    });

    const totalCount = rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = rawList.slice(start, start + pageSize);

    return createSuccess({
      staffMembers: paginated,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors du chargement.');
  }
}

export const getStaffMembers = listStaff;

export async function getStaffByEmployeeNumber(empNum: string): Promise<ServiceResponse<StaffMember>> {
  if (!empNum) return { success: false, error: 'Matricule d\'employé obligatoire' };
  const res = await listStaff({});
  const found = (res.data?.staffMembers || []).find((s) => s.employeeNumber === empNum);
  if (!found) return { success: false, error: 'Employé non trouvé' };
  return createSuccess(found);
}

export async function searchStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  return listStaff(filters);
}
