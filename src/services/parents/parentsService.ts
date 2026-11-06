// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Parents & Responsables Légaux (src/services/parents/parentsService.ts)
// Couche de gestion centralisée des fiches parents / tuteurs
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES ET INTERFACES DU SERVICE PARENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  relationshipType?: string;
  profession?: string;
  email?: string;
  phonePrimary: string;
  phoneSecondary?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp' | 'sms';
  receiveNotifications?: boolean;
  status: 'Actif' | 'Inactif' | 'Archivé';
  childrenCount?: number;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface ParentFilters {
  searchQuery?: string;
  name?: string;
  firstName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  associatedStudentId?: string;
  status?: 'Actif' | 'Inactif' | 'Archivé' | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'firstName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ParentListResult {
  parents: Parent[];
  totalCount: number;
  page: number;
  totalPages: number;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[parentsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[\s.\-_/()]/g, '');
  if (cleaned.startsWith('00225')) {
    cleaned = '+225' + cleaned.slice(5);
  }
  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    return `+225${cleaned}`;
  }
  if (/^225\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export function isValidPhoneNumber(phone?: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim().replace(/[\s.\-_/()]/g, '');
  if (!cleaned) return false;
  
  if (/^\+\d{8,15}$/.test(cleaned)) {
    return true;
  }
  if (/^\d{8,15}$/.test(cleaned)) {
    return true;
  }
  return false;
}

let localParentsStore: Parent[] = [];

export function clearParentsStore(): void {
  localParentsStore = [];
}

function mapParent(row: any): Parent {
  const details = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};
  return {
    ...details,
    id: row.id,
    firstName: row.first_name || details.firstName || '',
    lastName: row.last_name || details.lastName || '',
    phonePrimary: row.phone || details.phonePrimary || '',
    email: row.email || details.email || '',
    profession: row.profession || details.profession || '',
    address: row.address || details.address || '',
    status: details.status || 'Actif',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncParentsFromNeon(): Promise<Parent[]> {
  const rows: Parent[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('parents').select('*').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Réponse Neon invalide pour les responsables.');
    rows.push(...data.map(mapParent));
    if (data.length < 500) break;
  }
  localParentsStore = rows;
  return rows;
}

async function persistParent(parent: Parent, create = false): Promise<void> {
  const row = {
    id: parent.id,
    first_name: parent.firstName,
    last_name: parent.lastName,
    phone: parent.phonePrimary || null,
    email: parent.email || null,
    profession: parent.profession || null,
    address: parent.address || null,
    data: parent,
    updated_at: new Date().toISOString(),
  };
  const mutation = create
    ? supabase.from('parents').insert(row)
    : supabase.from('parents').upsert(row, { onConflict: 'id' });
  const { data, error } = await mutation.select('id').single();
  if (error || data?.id !== parent.id) throw new Error(error?.message || 'Enregistrement du responsable non confirmé par Neon.');
  localParentsStore = [parent, ...localParentsStore.filter((item) => item.id !== parent.id)];
}

/**
 * Crée un nouveau responsable légal
 */
export async function createParent(parentData: Partial<Parent>): Promise<ServiceResponse<Parent>> {
  try {
    if (!parentData.firstName?.trim() && !parentData.lastName?.trim()) {
      return createError(null, 'Veuillez renseigner au moins le prénom ou le nom du responsable.');
    }

    await syncParentsFromNeon();
    const rawPhone = (parentData.phonePrimary || '').trim();
    if (rawPhone && rawPhone !== '—' && rawPhone !== '-') {
      if (!isValidPhoneNumber(rawPhone)) {
        return createError(null, 'Le format du numéro de téléphone principal est invalide.');
      }
      const normPrimary = normalizePhoneNumber(rawPhone);
      const existingParent = localParentsStore.find((p) => {
        const pNormPrimary = normalizePhoneNumber(p.phonePrimary);
        const pNormSecondary = normalizePhoneNumber(p.phoneSecondary);
        return pNormPrimary === normPrimary || (pNormSecondary && pNormSecondary === normPrimary);
      });

      if (existingParent && existingParent.id !== parentData.id) {
        return createError(
          null,
          `Un responsable avec le numéro de téléphone ${rawPhone} existe déjà (${existingParent.lastName} ${existingParent.firstName}).`
        );
      }
    }

    if (parentData.phoneSecondary && parentData.phoneSecondary.trim() !== '—' && !isValidPhoneNumber(parentData.phoneSecondary)) {
      return createError(null, 'Le format du numéro de téléphone secondaire est invalide.');
    }
    if (parentData.whatsapp && parentData.whatsapp.trim() !== '—' && !isValidPhoneNumber(parentData.whatsapp)) {
      return createError(null, 'Le format du numéro WhatsApp est invalide.');
    }

    const newId = parentData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdParent: Parent = {
      id: newId,
      firstName: parentData.firstName?.trim() || '',
      lastName: parentData.lastName?.trim() || '',
      relationshipType: parentData.relationshipType || 'Tuteur Légal',
      profession: parentData.profession?.trim() || '',
      email: parentData.email?.trim() || '',
      phonePrimary: rawPhone,
      phoneSecondary: parentData.phoneSecondary?.trim() || '',
      whatsapp: parentData.whatsapp?.trim() || rawPhone,
      address: parentData.address?.trim() || '',
      city: parentData.city?.trim() || '',
      preferredContactMethod: parentData.preferredContactMethod || 'phone',
      receiveNotifications: parentData.receiveNotifications ?? true,
      status: 'Actif',
      childrenCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await persistParent(createdParent, true);

    broadcastDataChange('parents', 'insert', createdParent);
    return createSuccess(createdParent, 'Responsable légal créé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création du responsable légal.');
  }
}

/**
 * Met à jour la fiche d'un responsable légal
 */
export async function updateParent(id: string, updates: Partial<Parent>): Promise<ServiceResponse<Parent>> {
  try {
    if (!id) return createError(null, 'Identifiant du responsable légal manquant.');
    await syncParentsFromNeon();
    const current = localParentsStore.find((parent) => parent.id === id);
    if (!current) return createError(null, 'Responsable légal introuvable.');

    if (updates.phonePrimary !== undefined) {
      if (!updates.phonePrimary?.trim()) {
        return createError(null, 'Le numéro de téléphone principal ne peut pas être vide.');
      }
      if (!isValidPhoneNumber(updates.phonePrimary)) {
        return createError(null, 'Le format du numéro de téléphone principal est invalide.');
      }
      const normPrimary = normalizePhoneNumber(updates.phonePrimary);
      const existing = localParentsStore.find(
        (p) =>
          p.id !== id &&
          (normalizePhoneNumber(p.phonePrimary) === normPrimary ||
            (p.phoneSecondary && normalizePhoneNumber(p.phoneSecondary) === normPrimary))
      );
      if (existing) {
        return createError(
          null,
          `Un responsable avec le numéro de téléphone ${updates.phonePrimary} existe déjà (${existing.lastName} ${existing.firstName}).`
        );
      }
    }

    if (updates.phoneSecondary && !isValidPhoneNumber(updates.phoneSecondary)) {
      return createError(null, 'Le format du numéro de téléphone secondaire est invalide.');
    }
    if (updates.whatsapp && !isValidPhoneNumber(updates.whatsapp)) {
      return createError(null, 'Le format du numéro WhatsApp est invalide.');
    }

    const updated: Parent = {
      ...current, ...updates, id: current.id, createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await persistParent(updated);
    broadcastDataChange('parents', 'update', updated);
    return createSuccess(updated, 'Fiche du responsable légal mise à jour.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour.');
  }
}

/**
 * Archive un responsable légal
 */
export async function archiveParent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');
    const result = await updateParent(id, { status: 'Archivé', archivedAt: new Date().toISOString() });
    if (!result.success) return createError(null, result.error || 'Archivage impossible.');
    broadcastDataChange('parents', 'update', { id, status: 'Archivé' });
    return createSuccess(true, 'Responsable légal archivé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage.');
  }
}

/**
 * Restaure un responsable légal archivé
 */
export async function restoreParent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    if (!id) return createError(null, 'Identifiant manquant.');
    const result = await updateParent(id, { status: 'Actif', archivedAt: undefined });
    if (!result.success) return createError(null, result.error || 'Restauration impossible.');
    broadcastDataChange('parents', 'update', { id, status: 'Actif' });
    return createSuccess(true, 'Responsable légal restauré avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la restauration.');
  }
}

/**
 * Récupère un parent par son ID
 */
export async function getParentById(id: string): Promise<ServiceResponse<Parent>> {
  try {
    const { data, error } = await supabase.from('parents').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    const parent = data ? mapParent(data) : null;
    if (parent) return createSuccess(parent);
    return createError(null, 'Responsable légal introuvable.');
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération.');
  }
}

/**
 * Liste des responsables avec filtres, recherche multi-critères (Nom, Tél, Email, Enfants) et tri
 */
export async function listParents(filters: ParentFilters = {}): Promise<ServiceResponse<ParentListResult>> {
  try {
    const {
      page = 1,
      pageSize = 15,
      searchQuery,
      status = 'all',
      sortBy = 'name',
      sortOrder = 'asc',
    } = filters;

    let rawList: Parent[] = await syncParentsFromNeon();
    if (rawList.length > 0) {
      const counts = new Map<string, number>();
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('student_parent_links').select('parent_id').range(offset, offset + 499);
        if (error) throw new Error(error.message);
        if (!Array.isArray(data)) throw new Error('Réponse Neon invalide pour les liens parent–élève.');
        for (const row of data) counts.set(row.parent_id, (counts.get(row.parent_id) || 0) + 1);
        if (data.length < 500) break;
      }
      rawList = rawList.map((parent) => ({ ...parent, childrenCount: counts.get(parent.id) || 0 }));
    }

    // Filtre de statut
    if (status !== 'all') {
      rawList = rawList.filter((p) => p.status === status);
    }

    // ANOMALIE-MAJ-04 FIX: Recherche multi-critères (Nom, Prénom, Téléphone, Email)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter((p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.phonePrimary.includes(q) ||
        (p.phoneSecondary && p.phoneSecondary.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    }

    // Tri
    rawList.sort((a, b) => {
      let valA = `${a.lastName} ${a.firstName}`;
      let valB = `${b.lastName} ${b.firstName}`;
      if (sortBy === 'firstName') {
        valA = `${a.firstName} ${a.lastName}`;
        valB = `${b.firstName} ${b.lastName}`;
      } else if (sortBy === 'createdAt') {
        valA = a.createdAt || '';
        valB = b.createdAt || '';
      }
      const comp = valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comp : -comp;
    });

    const totalCount = rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = rawList.slice(start, start + pageSize);

    return createSuccess({
      parents: paginated,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors du chargement des responsables légaux.');
  }
}

export async function searchParents(filters: ParentFilters): Promise<ServiceResponse<ParentListResult>> {
  return listParents(filters);
}

export async function deleteParent(id: string): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase.from('parents').delete().eq('id', id).select('id').single();
    if (error || data?.id !== id) throw new Error(error?.message || 'Suppression du responsable non confirmée par Neon.');
    localParentsStore = localParentsStore.filter((parent) => parent.id !== id);
    broadcastDataChange('parents', 'delete', { id });
    return createSuccess(true, 'Responsable supprimé avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la suppression.');
  }
}
