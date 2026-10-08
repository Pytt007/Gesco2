// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Personnel & RH (src/services/staff/staffService.ts)
// Couche de gestion centralisée des membres du personnel de l'établissement
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';

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

const localStaffCache: Map<string, StaffMember> = new Map();

/**
 * Charge le personnel depuis Neon. Le cache n'est jamais une source de secours.
 */
async function syncStaffFromNeon(): Promise<StaffMember[]> {
  const allStaffRows: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('staff_members').select('*').range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Réponse Neon invalide pour le personnel.');
    allStaffRows.push(...data);
    if (data.length < pageSize) break;
  }

  const staff = allStaffRows.map((row): StaffMember => {
    const details = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};
    const mappedRole: StaffRole = row.role === 'TEACHER' ? 'Enseignant'
      : row.role === 'DIRECTOR' ? 'Directeur' : (row.role as StaffRole) || 'Enseignant';
    return {
      ...details,
      id: row.id,
      employeeNumber: details.employeeNumber || `EMP-${row.id.slice(0, 6)}`,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      gender: details.gender || 'Masculin',
      role: details.role || mappedRole,
      phonePrimary: details.phonePrimary || row.phone || '',
      email: row.email || '',
      baseSalary: row.base_salary ?? 0,
      hireDate: row.hire_date || details.hireDate || '',
      status: details.status || (row.status === 'ACTIVE' ? 'Actif' : 'Inactif'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
  localStaffCache.clear();
  for (const member of staff) localStaffCache.set(member.id, member);
  return staff;
}

async function persistStaffToNeon(member: StaffMember): Promise<void> {
  const rawRole = String(member.role || '').toUpperCase();
  const sqlRole =
    rawRole.includes('TEACHER') || rawRole.includes('ENSEIGN') ? 'TEACHER' :
    rawRole.includes('DIRECTOR') || rawRole.includes('DIRECT') ? 'DIRECTOR' :
    rawRole.includes('DRIVER') || rawRole.includes('CHAUFF') ? 'DRIVER' :
    rawRole.includes('COOK') || rawRole.includes('CUISIN') ? 'COOK' : 'STAFF';

  const { data, error } = await supabase.from('staff_members').upsert({
    id: member.id,
    first_name: member.firstName,
    last_name: member.lastName,
    email: member.email || null,
    phone: member.phonePrimary || member.phone || null,
    role: sqlRole,
    specialty: member.jobTitle || member.positionTitle || null,
    hire_date: member.hireDate || new Date().toISOString().split('T')[0],
    base_salary: member.baseSalary ?? 0,
    status: member.status === 'Actif' ? 'ACTIVE' : 'INACTIVE',
    data: member,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id').single();
  if (error) throw new Error(error.message);
  if (data?.id !== member.id) throw new Error('Enregistrement du personnel non confirmé par Neon.');

  localStaffCache.set(member.id, member);
  broadcastDataChange('staff_members', 'update', member);
}

/**
 * Crée un nouveau membre du personnel avec contrôles d'unicité (Tél, Email) et validation salaire
 */
export async function createStaff(staffData: Partial<StaffMember>): Promise<ServiceResponse<StaffMember>> {
  try {
    if (!staffData.firstName?.trim() && !staffData.lastName?.trim()) {
      return createError(null, 'Veuillez renseigner au moins le prénom ou le nom.');
    }

    // Synchroniser d'abord pour avoir la liste à jour
    await syncStaffFromNeon();

    const phone = (staffData.phonePrimary || staffData.phone || '').trim();
    const email = staffData.email?.trim().toLowerCase();

    // Contrôle d'unicité du Téléphone et de l'Email UNIQUEMENT s'ils sont renseignés
    if (phone && phone !== '—' && phone !== '-') {
      for (const member of localStaffCache.values()) {
        const existingPhone = (member.phonePrimary || member.phone || '').trim();
        if (existingPhone && existingPhone === phone) {
          return createError(null, `Un membre du personnel possède déjà le numéro de téléphone ${phone} (${member.lastName} ${member.firstName}).`);
        }
      }
    }
    if (email) {
      for (const member of localStaffCache.values()) {
        if (member.email?.toLowerCase() === email) {
          return createError(null, `L'adresse email ${email} est déjà utilisée par un autre membre du personnel.`);
        }
      }
    }

    // Validation Salaire
    if (staffData.baseSalary !== undefined && Number(staffData.baseSalary) < 0) {
      return createError(null, 'Le salaire de base ne peut pas être négatif.');
    }

    const newId = staffData.id || crypto.randomUUID();
    const cleanFirstName = (staffData.firstName?.trim() || staffData.lastName?.trim() || 'Employé');
    const cleanLastName = (staffData.lastName?.trim() || '');
    const cleanTitle = (staffData.jobTitle || staffData.positionTitle || '').trim();

    const created: StaffMember = {
      id: newId,
      employeeNumber: staffData.employeeNumber || `EMP-${new Date().getFullYear()}-${String(localStaffCache.size + 1).padStart(3, '0')}`,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      middleName: staffData.middleName?.trim() || '',
      gender: staffData.gender || 'Masculin',
      role: staffData.role || 'Enseignant',
      departmentId: staffData.departmentId || '',
      departmentName: staffData.departmentName || '',
      positionId: staffData.positionId || '',
      positionTitle: cleanTitle,
      jobTitle: cleanTitle,
      phonePrimary: phone,
      phone: phone,
      phoneSecondary: staffData.phoneSecondary?.trim() || '',
      email: email || '',
      address: staffData.address?.trim() || '',
      cityDistrict: staffData.cityDistrict?.trim() || 'Abidjan',
      avatarUrl: staffData.avatarUrl?.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newId)}`,
      baseSalary: staffData.baseSalary !== undefined ? Number(staffData.baseSalary) : 200000,
      hireDate: staffData.hireDate || new Date().toISOString().split('T')[0],
      status: staffData.status || 'Actif',
      contractType: staffData.contractType || 'CDI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistStaffToNeon(created);

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
    await syncStaffFromNeon();
    const cached = localStaffCache.get(id);
    if (!cached) return createError(null, 'Employé introuvable.');

    if (updates.baseSalary !== undefined && updates.baseSalary < 0) {
      return createError(null, 'Le salaire de base ne peut pas être négatif.');
    }

    const updated = { ...cached, ...updates, updatedAt: new Date().toISOString() };
    await persistStaffToNeon(updated);

    return createSuccess(updated, 'Mise à jour réussie.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour.');
  }
}

export async function archiveStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  try {
    await syncStaffFromNeon();
    const cached = localStaffCache.get(id);
    if (!cached) return createError(null, 'Introuvable.');
    const updated = { ...cached, status: 'Archivé' as StaffStatus, archivedAt: new Date().toISOString() };
    await persistStaffToNeon(updated);
    return createSuccess(true, 'Archivé.');
  } catch (err) { return createError(err, 'Archivage impossible.'); }
}

export async function restoreStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  try {
    await syncStaffFromNeon();
    const cached = localStaffCache.get(id);
    if (!cached) return createError(null, 'Introuvable.');
    const updated = { ...cached, status: 'Actif' as StaffStatus };
    await persistStaffToNeon(updated);
    return createSuccess(true, 'Restauré.');
  } catch (err) { return createError(err, 'Restauration impossible.'); }
}

export async function deleteStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  try {
    await syncStaffFromNeon();
    if (!localStaffCache.has(id)) return createError(null, 'Employé introuvable.');
    const { data, error } = await supabase.from('staff_members').delete().eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
    if (data?.id !== id) throw new Error('Suppression du personnel non confirmée par Neon.');
    localStaffCache.delete(id);
    broadcastDataChange('staff', 'delete', { id });
    return createSuccess(true, 'Membre du personnel supprimé.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}

export async function getStaffById(id: string): Promise<ServiceResponse<StaffMember>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  try {
    await syncStaffFromNeon();
    const cached = localStaffCache.get(id);
    if (cached) return createSuccess(cached);
    return createError(null, 'Introuvable.');
  } catch (err) { return createError(err, 'Chargement impossible.'); }
}

export async function listStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  try {
    const { page = 1, pageSize = 50, searchQuery, role = 'all', status = 'all', sortBy = 'lastName', sortOrder = 'asc' } = filters;
    
    // Toujours synchroniser avec Neon.
    const list = await syncStaffFromNeon();
    let rawList = [...list];

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

    // Tri par rôle/fonction/nom
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
  const res = await listStaff({ status: 'all' });
  const found = (res.data?.staffMembers || []).find((s) => s.employeeNumber === empNum);
  if (!found) return { success: false, error: 'Employé non trouvé' };
  return createSuccess(found);
}

export async function searchStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  return listStaff(filters);
}
