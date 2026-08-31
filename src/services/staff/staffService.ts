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

// Données initiales vierges
const INITIAL_STAFF: StaffMember[] = [];
const localStaffCache: Map<string, StaffMember> = new Map(INITIAL_STAFF.map(s => [s.id, s]));

/**
 * Charge le personnel depuis Supabase
 */
async function syncStaffFromSupabase(): Promise<StaffMember[]> {
  try {
    // 1. Tenter la lecture dans school_settings (données riches complètes)
    const { data: settingsRow } = await supabase
      .from('school_settings')
      .select('data')
      .eq('id', 'staff_members_data')
      .maybeSingle();

    let fullList: StaffMember[] = [];
    if (settingsRow?.data && Array.isArray(settingsRow.data)) {
      fullList = settingsRow.data;
    }

    // Chargement paginé sans limite arbitraire (toutes les pages de 500 lignes)
    const PAGE_SIZE_STAFF = 500;
    let staffOffset = 0;
    let allStaffRows: any[] = [];
    let staffFetching = true;
    while (staffFetching) {
      const { data: dbRows, error: dbErr } = await supabase
        .from('staff_members')
        .select('*')
        .range(staffOffset, staffOffset + PAGE_SIZE_STAFF - 1);
      if (dbErr || !Array.isArray(dbRows) || dbRows.length === 0) {
        staffFetching = false;
      } else {
        allStaffRows = allStaffRows.concat(dbRows);
        staffOffset += PAGE_SIZE_STAFF;
        if (dbRows.length < PAGE_SIZE_STAFF) staffFetching = false;
      }
    }

    if (!allStaffRows.length) {
      staffFetching = false; // already false, for clarity
    }

    if (Array.isArray(allStaffRows) && allStaffRows.length > 0) {
      for (const row of allStaffRows) {
        const existingIdx = fullList.findIndex((m) => m.id === row.id);
        const mappedRole: StaffRole =
          row.role === 'TEACHER' ? 'Enseignant' :
          row.role === 'DIRECTOR' ? 'Directeur' :
          (row.role as StaffRole) || 'Enseignant';

        const mapped: StaffMember = {
          id: row.id,
          employeeNumber: `EMP-${row.id.slice(0, 6)}`,
          firstName: row.first_name || '',
          lastName: row.last_name || '',
          gender: 'Masculin',
          role: mappedRole,
          phonePrimary: row.phone || '',
          email: row.email || '',
          baseSalary: row.base_salary || 200000,
          hireDate: row.hire_date || new Date().toISOString().split('T')[0],
          status: row.status === 'ACTIVE' ? 'Actif' : 'Inactif',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          fullList[existingIdx] = { ...mapped, ...fullList[existingIdx] };
        } else {
          fullList.push(mapped);
        }
      }
    }

    // Mettre à jour le cache local
    localStaffCache.clear();
    for (const item of fullList) {
      localStaffCache.set(item.id, item);
    }
    return fullList;
  } catch (err) {
    console.warn('[staffService] syncStaffFromSupabase warning:', err);
    return Array.from(localStaffCache.values());
  }
}

async function persistStaffToSupabase(member: StaffMember, allMembers?: StaffMember[]) {
  const currentList = allMembers || Array.from(localStaffCache.values());

  // 1. Sauvegarder dans school_settings (garantit tous les champs personnalisés)
  try {
    await supabase
      .from('school_settings')
      .upsert({
        id: 'staff_members_data',
        data: currentList,
        updated_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn('[staffService] school_settings persist warning:', e);
  }

  try {
    await supabase.from('staff_members').upsert({
      id: member.id,
      first_name: member.firstName,
      last_name: member.lastName,
      email: member.email || null,
      phone: member.phonePrimary || null,
      role: member.role === 'Enseignant' ? 'TEACHER' : member.role === 'Directeur' ? 'DIRECTOR' : 'STAFF',
      specialty: member.jobTitle || member.positionTitle || null,
      hire_date: member.hireDate || new Date().toISOString().split('T')[0],
      base_salary: member.baseSalary ?? 0,
      status: member.status === 'Actif' ? 'ACTIVE' : 'INACTIVE',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[staffService] staff_members SQL persist warning:', e);
  }

  // Diffuser en temps réel aux autres utilisateurs
  broadcastDataChange('staff_members', 'update', member);
}

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

    // Synchroniser d'abord pour avoir la liste à jour
    await syncStaffFromSupabase();

    const phone = staffData.phonePrimary.trim();
    const email = staffData.email?.trim().toLowerCase();

    // Contrôle d'unicité du Téléphone et de l'Email
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
      employeeNumber: staffData.employeeNumber || `EMP-${new Date().getFullYear()}-${String(localStaffCache.size + 1).padStart(3, '0')}`,
      firstName: staffData.firstName.trim(),
      lastName: staffData.lastName.trim(),
      middleName: staffData.middleName?.trim() || '',
      gender: staffData.gender || 'Masculin',
      role: staffData.role || 'Enseignant',
      departmentId: staffData.departmentId || '',
      departmentName: staffData.departmentName || '',
      positionId: staffData.positionId || '',
      positionTitle: staffData.positionTitle || '',
      phonePrimary: phone,
      phoneSecondary: staffData.phoneSecondary?.trim() || '',
      email: email || '',
      address: staffData.address?.trim() || '',
      cityDistrict: staffData.cityDistrict?.trim() || 'Abidjan',
      avatarUrl: staffData.avatarUrl?.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
      baseSalary: staffData.baseSalary ?? 200000,
      hireDate: staffData.hireDate || new Date().toISOString().split('T')[0],
      status: staffData.status || 'Actif',
      contractType: staffData.contractType || 'CDI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStaffCache.set(newId, created);
    await persistStaffToSupabase(created);

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
    await syncStaffFromSupabase();
    const cached = localStaffCache.get(id);
    if (!cached) return createError(null, 'Employé introuvable.');

    if (updates.baseSalary !== undefined && updates.baseSalary < 0) {
      return createError(null, 'Le salaire de base ne peut pas être négatif.');
    }

    const updated = { ...cached, ...updates, updatedAt: new Date().toISOString() };
    localStaffCache.set(id, updated);
    await persistStaffToSupabase(updated);

    return createSuccess(updated, 'Mise à jour réussie.');
  } catch (err) {
    return createError(err, 'Erreur de mise à jour.');
  }
}

export async function archiveStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  await syncStaffFromSupabase();
  const cached = localStaffCache.get(id);
  if (cached) {
    const updated = { ...cached, status: 'Archivé' as StaffStatus, archivedAt: new Date().toISOString() };
    localStaffCache.set(id, updated);
    await persistStaffToSupabase(updated);
  }
  return createSuccess(true, 'Archivé.');
}

export async function restoreStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  await syncStaffFromSupabase();
  const cached = localStaffCache.get(id);
  if (cached) {
    const updated = { ...cached, status: 'Actif' as StaffStatus };
    localStaffCache.set(id, updated);
    await persistStaffToSupabase(updated);
  }
  return createSuccess(true, 'Restauré.');
}

export async function deleteStaff(id: string): Promise<ServiceResponse<boolean>> {
  if (!id?.trim()) return createError(null, 'Identifiant manquant.');
  try {
    await syncStaffFromSupabase();
    localStaffCache.delete(id);
    try {
      await supabase.from('staff_members').delete().eq('id', id);
    } catch (err) {
      console.warn('[staffService:deleteStaff] Supabase delete fallback:', err);
    }
    const currentList = Array.from(localStaffCache.values());
    await persistStaffToSupabase({ id } as any, currentList);
    broadcastDataChange('staff', 'delete', { id });
    return createSuccess(true, 'Membre du personnel supprimé.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}

export async function getStaffById(id: string): Promise<ServiceResponse<StaffMember>> {
  await syncStaffFromSupabase();
  const cached = localStaffCache.get(id);
  if (cached) return createSuccess(cached);
  return createError(null, 'Introuvable.');
}

export async function listStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  try {
    const { page = 1, pageSize = 50, searchQuery, role = 'all', status = 'all', sortBy = 'lastName', sortOrder = 'asc' } = filters;
    
    // Toujours synchroniser avec Supabase
    const list = await syncStaffFromSupabase();
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
  const res = await listStaff({});
  const found = (res.data?.staffMembers || []).find((s) => s.employeeNumber === empNum);
  if (!found) return { success: false, error: 'Employé non trouvé' };
  return createSuccess(found);
}

export async function searchStaff(filters: StaffFilters = {}): Promise<ServiceResponse<StaffListResult>> {
  return listStaff(filters);
}
