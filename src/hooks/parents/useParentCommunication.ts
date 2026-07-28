// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook useParentCommunication (src/hooks/parents/useParentCommunication.ts)
// Coordonnées de contact, canal WhatsApp et destinataires de notifications
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import {
  getPrimaryEmail,
  getPrimaryPhone,
  getWhatsAppNumber,
  getNotificationRecipients,
  NotificationRecipient,
} from '../../services/parents/parentCommunicationService';

export interface UseParentCommunicationOptions {
  parentId?: string;
  studentId?: string;
}

export function useParentCommunication(options: UseParentCommunicationOptions = {}) {
  const { parentId, studentId } = options;

  const [primaryEmail, setPrimaryEmail] = useState<string | null>(null);
  const [primaryPhone, setPrimaryPhone] = useState<string | null>(null);
  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(null);
  const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunicationData = useCallback(async () => {
    if (!parentId && !studentId) return;
    setLoading(true);
    setError(null);
    try {
      if (parentId) {
        const [emailRes, phoneRes, waRes] = await Promise.all([
          getPrimaryEmail(parentId),
          getPrimaryPhone(parentId),
          getWhatsAppNumber(parentId),
        ]);
        setPrimaryEmail(emailRes.data || null);
        setPrimaryPhone(phoneRes.data || null);
        setWhatsAppNumber(waRes.data || null);
      }

      if (studentId) {
        const recipientsRes = await getNotificationRecipients(studentId);
        if (recipientsRes.success && recipientsRes.data) {
          setNotificationRecipients(recipientsRes.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données de communication.');
    } finally {
      setLoading(false);
    }
  }, [parentId, studentId]);

  useEffect(() => {
    fetchCommunicationData();
  }, [fetchCommunicationData]);

  return {
    primaryEmail,
    primaryPhone,
    whatsAppNumber,
    notificationRecipients,
    loading,
    error,
    refresh: fetchCommunicationData,
  };
}
