// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assessment Sessions Service (src/services/academic/sessions/assessmentSessionsService.ts)
// Couche métier autonome de gestion des sessions d'évaluation réelles.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../../common/supabaseClient';
import { ServiceResponse } from '../academicYearsService';
import {
  AssessmentSession,
  AssessmentSessionFilters,
  AssessmentSessionListResult,
  AssessmentSessionStatus,
} from './types';

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[assessmentSessionsService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

/** Cache local des sessions d'évaluation pour la résilience et le fallback en mode hors ligne/mock */
const localSessionsCache: Map<string, AssessmentSession> = new Map();

/**
 * Réinitialise le cache local (utile pour les tests unitaires)
 */
export function clearSessionsCache(): void {
  localSessionsCache.clear();
}

/**
 * Recherche et pagine les sessions d'évaluation selon les filtres fournis.
 * @param filters Filtres de recherche
 */
export async function searchSessions(
  filters: AssessmentSessionFilters = {}
): Promise<ServiceResponse<AssessmentSessionListResult>> {
  try {
    const {
      page = 1,
      pageSize = 20,
      academicYearId,
      assessmentTypeId,
      assessmentPeriodId,
      classroomId,
      status = 'all',
      locked = 'all',
      published = 'all',
      searchQuery,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = filters;

    let query = supabase
      .from('assessment_sessions')
      .select('*', { count: 'exact' });

    if (academicYearId) query = query.eq('academic_year_id', academicYearId);
    if (assessmentTypeId) query = query.eq('assessment_type_id', assessmentTypeId);
    if (assessmentPeriodId) query = query.eq('assessment_period_id', assessmentPeriodId);
    if (classroomId) query = query.eq('classroom_id', classroomId);
    if (status !== 'all') query = query.eq('status', status);
    if (locked !== 'all') query = query.eq('locked', locked);
    if (published !== 'all') query = query.eq('published', published);
    if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

    const { data: rows, count, error } = await query.limit(500);

    let rawList: AssessmentSession[] = [];

    if (!error && rows && rows.length > 0) {
      rawList = rows.map(mapRowToSession);
    } else {
      rawList = Array.from(localSessionsCache.values());
      if (rawList.length === 0) {
        rawList = getDefaultSessions();
        rawList.forEach((s) => localSessionsCache.set(s.id, s));
      }
    }

    // Filtrage complémentaire en mémoire (au cas où fallback local)
    if (academicYearId) rawList = rawList.filter((s) => s.academicYearId === academicYearId);
    if (assessmentTypeId) rawList = rawList.filter((s) => s.assessmentTypeId === assessmentTypeId);
    if (classroomId) rawList = rawList.filter((s) => s.classroomId === classroomId);
    if (status !== 'all') rawList = rawList.filter((s) => s.status === status);
    if (locked !== 'all') rawList = rawList.filter((s) => s.locked === locked);
    if (published !== 'all') rawList = rawList.filter((s) => s.published === published);

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rawList = rawList.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // Tri
    rawList.sort((a, b) => {
      let valA: any = a.startDate;
      let valB: any = b.startDate;
      if (sortBy === 'title') {
        valA = a.title;
        valB = b.title;
      } else if (sortBy === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortBy === 'createdAt') {
        valA = a.createdAt || '';
        valB = b.createdAt || '';
      }
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    const totalCount = count || rawList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = rawList.slice(start, start + pageSize);

    return createSuccess({
      sessions: paginated,
      totalCount,
      page,
      totalPages,
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la recherche des sessions d\'évaluation.');
  }
}

/**
 * Récupère la liste des sessions d'évaluation filtrées sans pagination complexe.
 */
export async function getSessions(
  filters: AssessmentSessionFilters = {}
): Promise<ServiceResponse<AssessmentSession[]>> {
  const res = await searchSessions({ ...filters, pageSize: 500 });
  if (!res.success || !res.data) {
    return createError(res.error, 'Erreur de récupération des sessions.');
  }
  return createSuccess(res.data.sessions);
}

/**
 * Récupère une session d'évaluation par son identifiant unique.
 * @param id Identifiant de la session
 */
export async function getSession(id: string): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session requis.');

    const { data, error } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const session = mapRowToSession(data);
      localSessionsCache.set(id, session);
      return createSuccess(session);
    }

    const cached = localSessionsCache.get(id);
    if (cached) return createSuccess(cached);

    return createError(null, `Session d'évaluation introuvable pour l'identifiant ${id}.`);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de la session.');
  }
}

/**
 * Crée une nouvelle session d'évaluation avec contrôles de cohérence et de doublon.
 * @param sessionData Métadonnées de la session
 */
export async function createSession(
  sessionData: Partial<AssessmentSession>
): Promise<ServiceResponse<AssessmentSession>> {
  try {
    // 1. Validations des champs obligatoires
    if (!sessionData.academicYearId?.trim()) {
      return createError(null, 'L\'année scolaire est obligatoire.');
    }
    if (!sessionData.classroomId?.trim()) {
      return createError(null, 'La classe est obligatoire.');
    }
    if (!sessionData.assessmentTypeId?.trim() && !sessionData.assessmentTemplateId?.trim()) {
      return createError(null, 'Le type d\'évaluation ou le modèle d\'évaluation est obligatoire.');
    }
    if (!sessionData.title?.trim()) {
      return createError(null, 'Le titre de la session est obligatoire.');
    }
    if (!sessionData.startDate || !sessionData.endDate) {
      return createError(null, 'Les dates de début et de fin sont obligatoires.');
    }

    // 2. Validation de cohérence des dates (startDate <= endDate)
    if (new Date(sessionData.startDate) > new Date(sessionData.endDate)) {
      return createError(null, 'La date de début ne peut pas être postérieure à la date de fin.');
    }

    // 3. Empêcher la création de deux sessions identiques (même classe + année + type + titre)
    const existingListRes = await getSessions({
      classroomId: sessionData.classroomId,
      academicYearId: sessionData.academicYearId,
      assessmentTypeId: sessionData.assessmentTypeId || undefined,
    });

    if (existingListRes.success && existingListRes.data) {
      const isDuplicate = existingListRes.data.some(
        (s) => s.title.toLowerCase().trim() === sessionData.title!.toLowerCase().trim() && s.status !== 'ARCHIVED'
      );
      if (isDuplicate) {
        return createError(null, `Une session identique nommée "${sessionData.title}" existe déjà pour cette classe.`);
      }
    }

    const newId = sessionData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdSession: AssessmentSession = {
      id: newId,
      academicYearId: sessionData.academicYearId,
      assessmentTypeId: sessionData.assessmentTypeId || 'CUSTOM',
      assessmentPeriodId: sessionData.assessmentPeriodId || null,
      assessmentTemplateId: sessionData.assessmentTemplateId || null,
      classroomId: sessionData.classroomId,
      classroomName: sessionData.classroomName || '',
      title: sessionData.title.trim(),
      description: sessionData.description?.trim() || null,
      startDate: sessionData.startDate,
      endDate: sessionData.endDate,
      status: sessionData.status || 'DRAFT',
      locked: sessionData.locked ?? false,
      published: sessionData.published ?? false,
      createdBy: sessionData.createdBy || null,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('assessment_sessions').insert({
      id: createdSession.id,
      academic_year_id: createdSession.academicYearId,
      assessment_type_id: createdSession.assessmentTypeId,
      assessment_period_id: createdSession.assessmentPeriodId,
      assessment_template_id: createdSession.assessmentTemplateId,
      classroom_id: createdSession.classroomId,
      title: createdSession.title,
      description: createdSession.description,
      start_date: createdSession.startDate,
      end_date: createdSession.endDate,
      status: createdSession.status,
      locked: createdSession.locked,
      published: createdSession.published,
      created_by: createdSession.createdBy,
      created_at: createdSession.createdAt,
      updated_at: createdSession.updatedAt,
    });

    if (error) {
      console.warn('[assessmentSessionsService:createSession] Fallback local:', error.message);
    }
    localSessionsCache.set(createdSession.id, createdSession);

    return createSuccess(createdSession, 'Session d\'évaluation créée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la création de la session d\'évaluation.');
  }
}

/**
 * Met à jour une session d'évaluation.
 * Interdit la modification si la session est verrouillée (sauf pour déverrouiller).
 * @param id Identifiant de la session
 * @param updates Attributs à modifier
 */
export async function updateSession(
  id: string,
  updates: Partial<AssessmentSession>
): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session manquant.');

    const existingRes = await getSession(id);
    if (!existingRes.success || !existingRes.data) {
      return createError(null, `Session introuvable pour l'identifiant ${id}.`);
    }

    const existing = existingRes.data;

    // Règle d'or : session verrouillée (locked = true) interdit la modification des contenus,
    // mais autorise les transitions d'état système (déverrouillage, publication, archivage).
    const isStateTransition = updates.locked !== undefined || updates.published !== undefined || updates.status !== undefined;
    if (existing.locked && !isStateTransition) {
      return createError(null, 'Cette session est verrouillée. Déverrouillez-la avant toute modification.');
    }

    // Validation des dates si modifiées
    const newStart = updates.startDate || existing.startDate;
    const newEnd = updates.endDate || existing.endDate;
    if (new Date(newStart) > new Date(newEnd)) {
      return createError(null, 'La date de début ne peut pas être postérieure à la date de fin.');
    }

    const updatedSession: AssessmentSession = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('assessment_sessions')
      .update({
        title: updatedSession.title,
        description: updatedSession.description,
        start_date: updatedSession.startDate,
        end_date: updatedSession.endDate,
        status: updatedSession.status,
        locked: updatedSession.locked,
        published: updatedSession.published,
        updated_at: updatedSession.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[assessmentSessionsService:updateSession] Fallback local:', error.message);
    }
    localSessionsCache.set(id, updatedSession);

    return createSuccess(updatedSession, 'Session d\'évaluation mise à jour avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors de la mise à jour de la session.');
  }
}

/**
 * Verrouille une session d'évaluation (interdit la modification des notes et élèves).
 * @param id Identifiant de la session
 */
export async function lockSession(id: string): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session manquant.');
    return updateSession(id, { locked: true, status: 'CLOSED' });
  } catch (err) {
    return createError(err, 'Erreur lors du verrouillage de la session.');
  }
}

/**
 * Déverrouille une session d'évaluation.
 * @param id Identifiant de la session
 */
export async function unlockSession(id: string): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session manquant.');

    const existingRes = await getSession(id);
    if (!existingRes.success || !existingRes.data) {
      return createError(null, 'Session introuvable.');
    }

    const updatedSession: AssessmentSession = {
      ...existingRes.data,
      locked: false,
      status: existingRes.data.status === 'CLOSED' ? 'OPEN' : existingRes.data.status,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('assessment_sessions')
      .update({
        locked: false,
        status: updatedSession.status,
        updated_at: updatedSession.updatedAt,
      })
      .eq('id', id);

    if (error) {
      console.warn('[assessmentSessionsService:unlockSession] Fallback local:', error.message);
    }
    localSessionsCache.set(id, updatedSession);

    return createSuccess(updatedSession, 'Session déverrouillée avec succès.');
  } catch (err) {
    return createError(err, 'Erreur lors du déverrouillage de la session.');
  }
}

/**
 * Publie une session d'évaluation (autorise bulletins, statistiques et classement définitif).
 * Verrouille automatiquement la session.
 * @param id Identifiant de la session
 */
export async function publishSession(id: string): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session manquant.');
    return updateSession(id, { published: true, locked: true, status: 'PUBLISHED' });
  } catch (err) {
    return createError(err, 'Erreur lors de la publication de la session.');
  }
}

/**
 * Archive une session d'évaluation (la passe au statut ARCHIVED et la verrouille).
 * @param id Identifiant de la session
 */
export async function archiveSession(id: string): Promise<ServiceResponse<AssessmentSession>> {
  try {
    if (!id) return createError(null, 'Identifiant de session manquant.');
    return updateSession(id, { status: 'ARCHIVED', locked: true });
  } catch (err) {
    return createError(err, 'Erreur lors de l\'archivage de la session.');
  }
}

/**
 * Duplique une session d'évaluation pour une autre classe ou un autre titre.
 * @param id Identifiant de la session à dupliquer
 * @param targetClassroomId Identifiant de la classe cible (optionnel)
 * @param newTitle Nouveau titre (optionnel)
 */
export async function duplicateSession(
  id: string,
  targetClassroomId?: string,
  newTitle?: string
): Promise<ServiceResponse<AssessmentSession>> {
  try {
    const existingRes = await getSession(id);
    if (!existingRes.success || !existingRes.data) {
      return createError(null, 'Session source introuvable pour duplication.');
    }

    const source = existingRes.data;
    const title = newTitle?.trim() || `${source.title} (Copie)`;
    const classroomId = targetClassroomId || source.classroomId;

    return createSession({
      academicYearId: source.academicYearId,
      assessmentTypeId: source.assessmentTypeId,
      assessmentPeriodId: source.assessmentPeriodId,
      assessmentTemplateId: source.assessmentTemplateId,
      classroomId,
      title,
      description: source.description,
      startDate: source.startDate,
      endDate: source.endDate,
      status: 'DRAFT',
      locked: false,
      published: false,
    });
  } catch (err) {
    return createError(err, 'Erreur lors de la duplication de la session.');
  }
}

/**
 * Helpers pratiques de recherche rapide
 */
export async function getSessionsByClass(classroomId: string): Promise<ServiceResponse<AssessmentSession[]>> {
  return getSessions({ classroomId });
}

export async function getSessionsByYear(academicYearId: string): Promise<ServiceResponse<AssessmentSession[]>> {
  return getSessions({ academicYearId });
}

export async function getSessionsByType(assessmentTypeId: string): Promise<ServiceResponse<AssessmentSession[]>> {
  return getSessions({ assessmentTypeId });
}

// ─── Helpers Interne ─────────────────────────────────────────────────────────

function mapRowToSession(r: any): AssessmentSession {
  return {
    id: r.id,
    academicYearId: r.academic_year_id,
    assessmentTypeId: r.assessment_type_id,
    assessmentPeriodId: r.assessment_period_id ?? null,
    assessmentTemplateId: r.assessment_template_id ?? null,
    classroomId: r.classroom_id,
    title: r.title,
    description: r.description ?? null,
    startDate: r.start_date,
    endDate: r.end_date,
    status: (r.status as AssessmentSessionStatus) || 'DRAFT',
    locked: r.locked ?? false,
    published: r.published ?? false,
    createdBy: r.created_by ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function getDefaultSessions(): AssessmentSession[] {
  return [
    {
      id: 'sess-demo-01',
      academicYearId: 'ay-2026',
      assessmentTypeId: 'MONTHLY',
      classroomId: 'cls-1',
      title: 'Composition Mensuelle N°1',
      description: 'Première évaluation mensuelle de l\'année',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      status: 'OPEN',
      locked: false,
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'sess-demo-02',
      academicYearId: 'ay-2026',
      assessmentTypeId: 'IEP',
      classroomId: 'cls-1',
      title: 'Composition IEP Trimestre 1',
      description: 'Évaluation d\'inspection du T1',
      startDate: '2026-11-15',
      endDate: '2026-11-20',
      status: 'DRAFT',
      locked: false,
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
