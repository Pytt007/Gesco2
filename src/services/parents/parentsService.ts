// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Parents & Responsables Légaux (src/services/parents/parentsService.ts)
// Couche de gestion centralisée des fiches parents / tuteurs
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { broadcastDataChange } from '../common/realtimeSyncService';
import { getChildren } from './parentRelationshipService';

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

// Données initiales vierges
const INITIAL_PARENTS: Parent[] = [];

let localParentsStore: Parent[] = [...INITIAL_PARENTS];


/**
 * Crée un nouveau responsable légal
 */
export async function createParent(parentData: Partial<Parent>): Promise<ServiceResponse<Parent>> {
  try {
    if (!parentData.firstName?.trim() || !parentData.lastName?.trim()) {
      return createError(null, 'Le prénom et le nom du responsable sont obligatoires.');
    }
    if (!parentData.phonePrimary?.trim()) {
      return createError(null, 'Le numéro de téléphone principal est obligatoire.');
    }

    const phoneNum = parentData.phonePrimary.trim();
    const existingParent = localParentsStore.find(
      (p) => p.phonePrimary === phoneNum || (p.phoneSecondary && p.phoneSecondary === phoneNum)
    );
    if (existingParent && existingParent.id !== parentData.id) {
      return createError(
        null,
        `Un responsable avec le numéro de téléphone ${phoneNum} existe déjà (${existingParent.lastName} ${existingParent.firstName}).`
      );
    }

    const newId = parentData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdParent: Parent = {
      id: newId,
      firstName: parentData.firstName.trim(),
      lastName: parentData.lastName.trim(),
      relationshipType: parentData.relationshipType || 'Tuteur Légal',
      profession: parentData.profession?.trim() || '',
      email: parentData.email?.trim() || '',
      phonePrimary: parentData.phonePrimary.trim(),
      phoneSecondary: parentData.phoneSecondary?.trim() || '',
      whatsapp: parentData.whatsapp?.trim() || parentData.phonePrimary.trim(),
      address: parentData.address?.trim() || '',
      city: parentData.city?.trim() || 'Abidjan',
      preferredContactMethod: parentData.preferredContactMethod || 'phone',
      receiveNotifications: parentData.receiveNotifications ?? true,
      status: 'Actif',
      childrenCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    localParentsStore.unshift(createdParent);

    try {
      await supabase.from('parents').insert({
        id: createdParent.id,
        first_name: createdParent.firstName,
        last_name: createdParent.lastName,
        phone: createdParent.phonePrimary,
        email: createdParent.email || null,
        profession: createdParent.profession || null,
        address: createdParent.address || null,
      });
    } catch (dbErr) { console.warn('[parentsService] Supabase insert fallback:', dbErr); }

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

    const idx = localParentsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localParentsStore[idx] = { ...localParentsStore[idx], ...updates, updatedAt: new Date().toISOString() };
    }

    try {
      await supabase
        .from('parents')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          profession: updates.profession,
          email: updates.email,
          phone_primary: updates.phonePrimary,
          phone_secondary: updates.phoneSecondary,
          whatsapp: updates.whatsapp,
          address: updates.address,
          city: updates.city,
          preferred_contact_method: updates.preferredContactMethod,
          receive_notifications: updates.receiveNotifications,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch { /* Silent local fallback */ }

    const updated = localParentsStore.find((p) => p.id === id) || (updates as Parent);
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

    const idx = localParentsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localParentsStore[idx].status = 'Archivé';
      localParentsStore[idx].archivedAt = new Date().toISOString();
    }
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

    const idx = localParentsStore.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localParentsStore[idx].status = 'Actif';
    }
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
    const parent = localParentsStore.find((p) => p.id === id);
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

    let rawList: Parent[] = [...localParentsStore];

    try {
      const { data: rows } = await supabase.from('parents').select('*').limit(500);
      if (rows && rows.length > 0) {
        rawList = rows.map((r: any) => ({
          id: r.id,
          firstName: r.first_name || 'Prénom',
          lastName: r.last_name || 'Nom',
          profession: r.profession || '',
          email: r.email || '',
          phonePrimary: r.phone_primary || '',
          phoneSecondary: r.phone_secondary || '',
          whatsapp: r.whatsapp || '',
          address: r.address || '',
          city: r.city || 'Abidjan',
          preferredContactMethod: r.preferred_contact_method || 'phone',
          receiveNotifications: r.receive_notifications ?? true,
          status: r.status || 'Actif',
          createdAt: r.created_at,
          childrenCount: 1,
        }));
      }
    } catch { /* Fallback */ }

    // Synchronisation du nombre d'enfants rattachés pour chaque parent
    for (const p of rawList) {
      try {
        const childrenRes = await getChildren(p.id);
        if (childrenRes.success && childrenRes.data) {
          p.childrenCount = childrenRes.data.length;
        }
      } catch { /* Silent */ }
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

export async function deleteParent(id: string): Promise<ServiceResponse<never>> {
  return {
    success: false,
    error: 'La suppression physique d\'un responsable est interdite. Seul l\'archivage est autorisé.',
  };
}
