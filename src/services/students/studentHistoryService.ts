// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Historique Statut Élève (src/services/students/studentHistoryService.ts)
// Couche de consultation du journal des changements de statut et transferts
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../common/supabaseClient';
import { ServiceResponse } from './studentsService';

export interface StudentStatusHistoryItem {
  id: string;
  studentId: string;
  previousStatus?: string;
  newStatus: string;
  eventType: string;
  reason?: string;
  changedBy?: string;
  createdAt: string;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || fallbackMessage;
  console.warn('[studentHistoryService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

/**
 * Récupère l'historique des changements de statut d'un élève
 */
export async function getStudentHistory(studentId: string): Promise<ServiceResponse<StudentStatusHistoryItem[]>> {
  try {
    const { data } = await supabase
      .from('student_status_history')
      .select('*')
      .eq('student_id', studentId);

    const history: StudentStatusHistoryItem[] = (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      eventType: row.event_type,
      reason: row.reason,
      changedBy: row.changed_by,
      createdAt: row.created_at,
    }));

    if (history.length === 0) {
      return createSuccess([
        {
          id: `hist-init-${studentId}`,
          studentId,
          previousStatus: 'Création',
          newStatus: 'Actif',
          eventType: 'Inscription',
          reason: 'Inscription initiale dans l\'établissement',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    return createSuccess(history);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de l\'historique de statut.');
  }
}

/**
 * Enregistre un événement dans l'historique d'un élève
 */
export async function logStudentEvent(
  studentId: string,
  eventType: string,
  newStatus: string,
  previousStatus?: string,
  reason?: string
): Promise<ServiceResponse<boolean>> {
  try {
    await supabase.from('student_status_history').insert({
      id: crypto.randomUUID(),
      student_id: studentId,
      event_type: eventType,
      new_status: newStatus,
      previous_status: previousStatus,
      reason,
      created_at: new Date().toISOString(),
    });
    return createSuccess(true);
  } catch (err) {
    return createError(err, 'Erreur lors de l\'enregistrement de l\'historique.');
  }
}
