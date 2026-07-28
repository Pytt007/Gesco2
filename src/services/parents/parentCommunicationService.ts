// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Service Communication Parents (src/services/parents/parentCommunicationService.ts)
// Couche utilitaire pour les canaux de communication et destinataires de notifications
// (Re-exploité par les futurs modules Communication et Paiements)
// ─────────────────────────────────────────────────────────────────────────────

import { ServiceResponse, getParentById } from './parentsService';
import { getParentsOfStudent } from './parentRelationshipService';

export interface NotificationRecipient {
  parentId: string;
  fullName: string;
  studentId: string;
  studentName?: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  preferredChannel: 'phone' | 'email' | 'whatsapp' | 'sms';
  isPrimaryGuardian: boolean;
}

function createSuccess<T>(data: T, message?: string): ServiceResponse<T> {
  return { success: true, data, message };
}

function createError<T>(error: any, fallbackMessage: string): ServiceResponse<T> {
  const errMsg = error?.message || error?.details || (typeof error === 'string' ? error : fallbackMessage);
  console.warn('[parentCommunicationService Warning]:', errMsg);
  return { success: false, error: errMsg };
}

/**
 * Récupère l'adresse email principale d'un responsable légal
 * @param parentId Identifiant du parent
 */
export async function getPrimaryEmail(parentId: string): Promise<ServiceResponse<string | null>> {
  try {
    if (!parentId) return createError(null, 'Identifiant parent requis.');

    const res = await getParentById(parentId);
    if (!res.success || !res.data) {
      return createError(res.error, 'Responsable légal introuvable.');
    }

    const email = res.data.email?.trim() || null;
    return createSuccess(email);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération de l\'adresse email.');
  }
}

/**
 * Récupère le numéro de téléphone principal d'un responsable légal
 * @param parentId Identifiant du parent
 */
export async function getPrimaryPhone(parentId: string): Promise<ServiceResponse<string | null>> {
  try {
    if (!parentId) return createError(null, 'Identifiant parent requis.');

    const res = await getParentById(parentId);
    if (!res.success || !res.data) {
      return createError(res.error, 'Responsable légal introuvable.');
    }

    const phone = res.data.phonePrimary?.trim() || null;
    return createSuccess(phone);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du numéro de téléphone.');
  }
}

/**
 * Récupère le numéro WhatsApp d'un responsable légal
 * @param parentId Identifiant du parent
 */
export async function getWhatsAppNumber(parentId: string): Promise<ServiceResponse<string | null>> {
  try {
    if (!parentId) return createError(null, 'Identifiant parent requis.');

    const res = await getParentById(parentId);
    if (!res.success || !res.data) {
      return createError(res.error, 'Responsable légal introuvable.');
    }

    const whatsapp = res.data.whatsapp?.trim() || res.data.phonePrimary?.trim() || null;
    return createSuccess(whatsapp);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération du numéro WhatsApp.');
  }
}

/**
 * Récupère la liste des destinataires de notifications enregistrés pour un élève
 * (Filtre sur les responsables actifs ayant activé les notifications)
 * Utilisé par les modules Communication et Rappels de Paiement
 * @param studentId Identifiant de l'élève
 */
export async function getNotificationRecipients(studentId: string): Promise<ServiceResponse<NotificationRecipient[]>> {
  try {
    if (!studentId) return createError(null, 'Identifiant élève requis.');

    const parentsRes = await getParentsOfStudent(studentId);
    if (!parentsRes.success || !parentsRes.data) {
      return createError(parentsRes.error, 'Aucun responsable trouvé pour cet élève.');
    }

    const recipients: NotificationRecipient[] = [];

    for (const item of parentsRes.data) {
      const parent = item.parent;
      if (parent.status === 'Actif' && parent.receiveNotifications !== false) {
        recipients.push({
          parentId: parent.id,
          fullName: `${parent.lastName} ${parent.firstName}`,
          studentId,
          email: parent.email,
          phone: parent.phonePrimary,
          whatsapp: parent.whatsapp || parent.phonePrimary,
          preferredChannel: parent.preferredContactMethod || 'phone',
          isPrimaryGuardian: item.isPrimary,
        });
      }
    }

    return createSuccess(recipients);
  } catch (err) {
    return createError(err, 'Erreur lors de la récupération des destinataires de notification.');
  }
}
